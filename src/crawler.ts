import type { ArchivistConfig, Archive, Source } from '../archivist.config';
import { PureMdClient } from './services/pure-md';
import { parseMarkdownContent } from './utils/markdown-parser';
import type { PageContent } from './utils/content-formatter';
import { 
  formatAsMarkdown, 
  formatAsJson, 
  formatAsHtml 
} from './utils/content-formatter';
import { 
  urlToFilename, 
  titleToFilename, 
  hashFilename 
} from './utils/file-naming';
import { extractLinksFromPage } from './utils/link-extractor';

export class WebCrawler {
  private config: ArchivistConfig;
  private pureClient: PureMdClient;

  constructor(config: ArchivistConfig) {
    this.config = config;
    this.pureClient = new PureMdClient({
      apiKey: config.pure.apiKey,
    });
  }

  async crawlAll(): Promise<void> {
    for (const archive of this.config.archives) {
      console.log(`\nProcessing archive: ${archive.name}`);
      console.log('='.repeat(50));
      
      const crawler = new ArchiveCrawler(
        archive,
        this.config.crawl,
        this.pureClient
      );
      
      await crawler.crawl();
      await crawler.save();
    }
  }
}

class ArchiveCrawler {
  private archive: Archive;
  private crawlConfig: ArchivistConfig['crawl'];
  private queue: Set<string> = new Set();
  private visited: Set<string> = new Set();
  private results: PageContent[] = [];
  private pureClient: PureMdClient;
  private sourceMap: Map<string, Source> = new Map();

  constructor(
    archive: Archive,
    crawlConfig: ArchivistConfig['crawl'],
    pureClient: PureMdClient
  ) {
    this.archive = archive;
    this.crawlConfig = crawlConfig;
    this.pureClient = pureClient;
  }

  async crawl(): Promise<PageContent[]> {
    // Normalize sources to array and add to queue
    const sources = Array.isArray(this.archive.sources) 
      ? this.archive.sources 
      : [this.archive.sources];
    
    // Process sources - some might be link collection pages
    for (const source of sources) {
      if (typeof source === 'string') {
        // Simple URL - add directly to queue
        this.queue.add(source);
        this.sourceMap.set(source, source);
      } else {
        // Object source - check if it has link collection settings
        if (source.linkSelector || source.followPattern) {
          // This is a link collection page
          console.log(`Collecting links from: ${source.url}`);
          const links = await extractLinksFromPage({
            url: source.url,
            linkSelector: source.linkSelector,
            followPattern: source.followPattern
          });
          
          console.log(`Found ${links.length} links to crawl`);
          
          // Add collected links to queue
          for (const link of links) {
            this.queue.add(link);
            // Store the source configuration for these links
            this.sourceMap.set(link, source);
          }
          
          // If depth is 0, we don't crawl the collection page itself
          if (source.depth === 0) {
            continue;
          }
        }
        
        // Add the source URL itself to queue (unless it was just for link collection)
        this.queue.add(source.url);
        this.sourceMap.set(source.url, source);
      }
    }

    const concurrencyLimit = this.crawlConfig.maxConcurrency;
    const activeRequests: Promise<void>[] = [];

    while (this.queue.size > 0 || activeRequests.length > 0) {
      // Start new requests up to concurrency limit
      while (this.queue.size > 0 && activeRequests.length < concurrencyLimit) {
        const urlIterator = this.queue.values().next();
        if (urlIterator.done || !urlIterator.value) break;
        
        const url = urlIterator.value;
        this.queue.delete(url);
        
        if (!this.visited.has(url)) {
          this.visited.add(url);
          const request = this.crawlPage(url).catch(err => {
            console.error(`Error crawling ${url}:`, err.message);
          });
          activeRequests.push(request);
        }
      }

      // Wait for at least one request to complete
      if (activeRequests.length > 0) {
        await Promise.race(activeRequests);
        // Remove completed requests
        for (let i = activeRequests.length - 1; i >= 0; i--) {
          if (await Promise.race([activeRequests[i], Promise.resolve('pending')]) !== 'pending') {
            activeRequests.splice(i, 1);
          }
        }
      }
    }

    return this.results;
  }

  private async crawlPage(url: string): Promise<void> {
    console.log(`Crawling: ${url}`);
    
    // Add delay between requests
    if (this.visited.size > 1) {
      await new Promise(resolve => setTimeout(resolve, this.crawlConfig.delay));
    }

    try {
      // Use Pure.md to fetch content
      const markdownContent = await this.pureClient.fetchContent(url);
      
      // Parse the markdown content
      const pageContent = parseMarkdownContent(markdownContent, url);
      
      // Find the source configuration for this URL
      const source = this.findSourceForUrl(url);
      
      this.results.push(pageContent);

      // Add linked pages to queue if depth allows
      const depth = this.getSourceDepth(source);
      if (depth > 0) {
        const sourceUrl = typeof source === 'string' ? source : source.url;
        const currentDepth = this.getDepth(url, sourceUrl);
        if (currentDepth < depth) {
          for (const link of pageContent.metadata.links) {
            if (this.isSameDomain(link, url) && !this.visited.has(link)) {
              this.queue.add(link);
              // Inherit source configuration for child pages
              if (!this.sourceMap.has(link)) {
                this.sourceMap.set(link, source);
              }
            }
          }
        }
      }
    } catch (error) {
      throw error;
    }
  }

  private getDepth(currentUrl: string, sourceUrl: string): number {
    // Simple depth calculation based on path segments
    const current = new URL(currentUrl);
    const source = new URL(sourceUrl);
    
    if (current.hostname !== source.hostname) return Infinity;
    
    const currentParts = current.pathname.split('/').filter(Boolean);
    const sourceParts = source.pathname.split('/').filter(Boolean);
    
    return currentParts.length - sourceParts.length;
  }

  private isSameDomain(url1: string, url2: string): boolean {
    try {
      const u1 = new URL(url1);
      const u2 = new URL(url2);
      return u1.hostname === u2.hostname;
    } catch {
      return false;
    }
  }

  private findSourceForUrl(url: string): Source | undefined {
    // First check if we have an exact match
    if (this.sourceMap.has(url)) {
      return this.sourceMap.get(url);
    }
    
    // Otherwise find the source that this URL originated from
    for (const [sourceUrl, source] of this.sourceMap.entries()) {
      if (this.isSameDomain(url, sourceUrl)) {
        return source;
      }
    }
    
    return undefined;
  }

  private getSourceDepth(source: Source | undefined): number {
    if (!source) return 0;
    if (typeof source === 'string') return 0;
    return source.depth ?? 0;
  }

  async save(): Promise<void> {
    const outputDir = this.archive.output.directory;
    await Bun.$`mkdir -p ${outputDir}`;

    for (const page of this.results) {
      let filename: string;
      
      switch (this.archive.output.fileNaming) {
        case 'title-based':
          filename = titleToFilename(page.title, page.url);
          break;
        case 'hash-based':
          filename = hashFilename(page.url);
          break;
        default:
          filename = urlToFilename(page.url);
      }

      let content: string;
      let extension: string;
      
      switch (this.archive.output.format) {
        case 'json':
          content = formatAsJson(page);
          extension = 'json';
          break;
        case 'html':
          content = formatAsHtml(page);
          extension = 'html';
          break;
        default:
          content = formatAsMarkdown(page);
          extension = 'md';
      }

      const filepath = `${outputDir}/${filename}.${extension}`;
      await Bun.write(filepath, content);
      console.log(`Saved: ${filepath}`);
    }

    // Save metadata file
    const metadata = {
      crawledAt: new Date().toISOString(),
      archiveName: this.archive.name,
      sources: this.archive.sources,
      outputConfig: this.archive.output,
      results: this.results.map(r => ({
        url: r.url,
        title: r.title,
        contentLength: r.metadata.contentLength,
        linksCount: r.metadata.links.length,
      })),
    };
    
    await Bun.write(
      `${outputDir}/archivist-metadata.json`, 
      JSON.stringify(metadata, null, 2)
    );
    
    console.log(`\nArchive '${this.archive.name}' saved to: ${outputDir}`);
  }
}