import type { ArchivistConfig } from '../archivist.config';
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

export class WebCrawler {
  private config: ArchivistConfig;
  private queue: Set<string> = new Set();
  private visited: Set<string> = new Set();
  private results: PageContent[] = [];
  private pureClient: PureMdClient;

  constructor(config: ArchivistConfig) {
    this.config = config;
    this.pureClient = new PureMdClient({
      apiKey: config.pure.apiKey,
    });
  }

  async crawl(): Promise<PageContent[]> {
    // Add initial URLs to queue
    for (const source of this.config.sources) {
      this.queue.add(source.url);
    }

    const concurrencyLimit = this.config.crawl.maxConcurrency;
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
      await new Promise(resolve => setTimeout(resolve, this.config.crawl.delay));
    }

    try {
      // Use Pure.md to fetch content
      const markdownContent = await this.pureClient.fetchContent(url);
      
      // Parse the markdown content
      const pageContent = parseMarkdownContent(markdownContent, url);
      
      // Apply selector filtering if needed (would require additional processing)
      const source = this.config.sources.find(s => s.url === url);
      
      this.results.push(pageContent);

      // Add linked pages to queue if depth allows
      if (source?.depth && source.depth > 0) {
        const currentDepth = this.getDepth(url, source.url);
        if (currentDepth < source.depth) {
          for (const link of pageContent.metadata.links) {
            if (this.isSameDomain(link, url) && !this.visited.has(link)) {
              this.queue.add(link);
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

  async save(): Promise<void> {
    const outputDir = this.config.output.directory;
    await Bun.$`mkdir -p ${outputDir}`;

    for (const page of this.results) {
      let filename: string;
      
      switch (this.config.output.fileNaming) {
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
      
      switch (this.config.output.format) {
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
      config: this.config,
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
  }
}