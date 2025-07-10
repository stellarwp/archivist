import type { ArchivistConfig, Archive, Source } from '../archivist.config';
import { PureMdClient } from './services/pure-md';
import { LinkDiscoverer } from './services/link-discoverer';
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
import { shouldIncludeUrl } from './utils/pattern-matcher';
import { StrategyFactory } from './strategies/strategy-factory';
import type { SourceStrategyType } from './types/source-strategy';
import { resolvePureApiKey } from './utils/pure-api-key';

export class WebCrawler {
  private config: ArchivistConfig;
  private pureClient: PureMdClient;

  constructor(config: ArchivistConfig) {
    this.config = config;
    this.pureClient = new PureMdClient({
      apiKey: config.pure?.apiKey,
    });
  }

  async crawlAll(): Promise<void> {
    for (const archive of this.config.archives) {
      console.log(`\nProcessing archive: ${archive.name}`);
      console.log('='.repeat(50));
      
      const crawler = new ArchiveCrawler(
        archive,
        this.config,
        this.pureClient
      );
      
      const results = await crawler.crawl();
      await crawler.save();
      
      console.log(`\n✅ Archive completed: ${results.length} pages processed`);
    }
  }

  async collectAllUrls(): Promise<string[]> {
    const allUrls: string[] = [];
    
    for (const archive of this.config.archives) {
      console.log(`\nCollecting URLs for archive: ${archive.name}`);
      console.log('-'.repeat(40));
      
      const crawler = new ArchiveCrawler(
        archive,
        this.config,
        this.pureClient
      );
      
      const urls = await crawler.collectUrls();
      allUrls.push(...urls);
      
      console.log(`Found ${urls.length} URLs in ${archive.name}`);
    }
    
    // Remove duplicates
    const uniqueUrls = Array.from(new Set(allUrls));
    if (uniqueUrls.length < allUrls.length) {
      console.log(`\nRemoved ${allUrls.length - uniqueUrls.length} duplicate URLs across archives`);
    }
    
    return uniqueUrls;
  }
}

class ArchiveCrawler {
  private archive: Archive;
  private config: ArchivistConfig;
  private crawlConfig: ArchivistConfig['crawl'];
  private queue: Set<string> = new Set();
  private visited: Set<string> = new Set();
  private results: PageContent[] = [];
  private pureClient: PureMdClient;
  private linkDiscoverer: LinkDiscoverer;
  private sourceMap: Map<string, Source> = new Map();

  private debug(...args: any[]) {
    if (this.crawlConfig.debug) {
      console.log('[DEBUG]', new Date().toISOString(), ...args);
    }
  }

  constructor(
    archive: Archive,
    config: ArchivistConfig,
    pureClient: PureMdClient
  ) {
    this.archive = archive;
    this.config = config;
    this.crawlConfig = config.crawl;
    this.pureClient = pureClient;
    this.linkDiscoverer = new LinkDiscoverer({
      userAgent: config.crawl.userAgent,
      timeout: config.crawl.timeout,
    });
  }

  async crawl(): Promise<PageContent[]> {
    // Normalize sources to array and add to queue
    const sources = Array.isArray(this.archive.sources) 
      ? this.archive.sources 
      : [this.archive.sources];
    
    // Track total links collected for logging
    let totalLinksCollected = 0;
    let uniqueLinksAdded = 0;

    // Process sources - some might be link collection pages
    for (const source of sources) {
      if (typeof source === 'string') {
        // Simple URL - add directly to queue
        this.queue.add(source);
        this.sourceMap.set(source, source);
      } else {
        // Object source - use strategy to determine how to process
        const strategyType = (source.strategy || 'explorer') as SourceStrategyType;
        const strategy = StrategyFactory.getStrategy(strategyType);
        
        console.log(`Processing ${source.url} with ${strategyType} strategy`);
        
        const result = await strategy.execute(source.url, { ...source, debug: this.crawlConfig.debug });
        
        if (result.urls.length > 0) {
          console.log(`Found ${result.urls.length} URLs from ${source.url}`);
          totalLinksCollected += result.urls.length;
          
          // Add collected URLs to queue (Set automatically handles duplicates)
          const queueSizeBefore = this.queue.size;
          for (const url of result.urls) {
            this.queue.add(url);
            // Store the source configuration for these URLs
            if (!this.sourceMap.has(url)) {
              this.sourceMap.set(url, source);
            }
          }
          const newLinksAdded = this.queue.size - queueSizeBefore;
          uniqueLinksAdded += newLinksAdded;
          
          if (newLinksAdded < result.urls.length) {
            console.log(`  Added ${newLinksAdded} unique URLs (${result.urls.length - newLinksAdded} duplicates removed)`);
          }
        }
      }
    }

    if (totalLinksCollected > 0) {
      console.log(`Total: Collected ${totalLinksCollected} links, ${uniqueLinksAdded} unique links added to queue`);
    }

    const concurrencyLimit = this.crawlConfig.maxConcurrency;
    const activeRequests = new Set<Promise<void>>();
    
    this.debug(`Starting crawl with concurrency limit: ${concurrencyLimit}`);
    this.debug(`Initial queue size: ${this.queue.size}`);

    while (this.queue.size > 0 || activeRequests.size > 0) {
      this.debug(`Loop iteration - Queue: ${this.queue.size}, Active: ${activeRequests.size}`);
      
      // Start new requests up to concurrency limit
      while (this.queue.size > 0 && activeRequests.size < concurrencyLimit) {
        const urlIterator = this.queue.values().next();
        if (urlIterator.done || !urlIterator.value) break;
        
        const url = urlIterator.value;
        this.queue.delete(url);
        
        if (!this.visited.has(url)) {
          this.visited.add(url);
          this.debug(`Starting request for: ${url}`);
          
          const request = this.crawlPage(url)
            .catch(err => {
              console.error(`Error crawling ${url}:`, err.message);
              this.debug(`Request failed for: ${url} - ${err.message}`);
            })
            .finally(() => {
              // Remove from active requests when complete
              this.debug(`Request completed for: ${url}`);
              activeRequests.delete(request);
              this.debug(`Active requests after removal: ${activeRequests.size}`);
            });
          activeRequests.add(request);
          this.debug(`Active requests after addition: ${activeRequests.size}`);
        } else {
          this.debug(`Skipping already visited URL: ${url}`);
        }
      }

      // Wait for at least one request to complete
      if (activeRequests.size > 0) {
        this.debug(`Waiting for one of ${activeRequests.size} requests to complete...`);
        await Promise.race(activeRequests);
        this.debug(`At least one request completed, continuing loop`);
      }
    }
    
    this.debug(`Crawl complete - Visited: ${this.visited.size} URLs`);

    return this.results;
  }

  private async crawlPage(url: string): Promise<void> {
    const progress = `[${this.visited.size + 1}/${this.queue.size + this.visited.size}]`;
    console.log(`${progress} Crawling: ${url}`);
    
    // Add delay between requests
    if (this.visited.size > 1) {
      await new Promise(resolve => setTimeout(resolve, this.crawlConfig.delay));
    }

    // Find the source configuration for this URL
    const source = this.findSourceForUrl(url);
    let pageContent: PageContent;

    try {
      // Try to get content with Pure.md
      if (this.pureClient && resolvePureApiKey(this.config)) {
        try {
          const markdownContent = await this.pureClient.fetchContent(url);
          pageContent = parseMarkdownContent(markdownContent, url);
          console.log(`  ✓ Content extracted successfully (${pageContent.content.length} chars)`);
        } catch (pureMdError) {
          // If Pure.md fails, just discover links with Cheerio
          console.log(`  ⚠ Pure.md extraction failed, discovering links only`);
          const discovered = await this.linkDiscoverer.discoverLinks(url);
          
          // Create minimal page content with discovered links
          pageContent = {
            url: discovered.url,
            title: `Page at ${url}`,
            content: `[Content not available - Pure.md extraction failed]`,
            metadata: {
              crawledAt: discovered.crawledAt,
              contentLength: 0,
              links: discovered.links,
            },
          };
        }
      } else {
        // No Pure.md API key, just discover links
        console.log(`  ℹ No Pure.md API key, discovering links only`);
        const discovered = await this.linkDiscoverer.discoverLinks(url);
        
        pageContent = {
          url: discovered.url,
          title: `Page at ${url}`,
          content: `[Content not available - Pure.md API key required]`,
          metadata: {
            crawledAt: discovered.crawledAt,
            contentLength: 0,
            links: discovered.links,
          },
        };
      }
      
      this.results.push(pageContent);

      // Add linked pages to queue if depth allows
      const depth = this.getSourceDepth(source);
      if (depth > 0 && source) {
        const sourceUrl = typeof source === 'string' ? source : source.url;
        const currentDepth = this.getDepth(url, sourceUrl);
        if (currentDepth < depth) {
          // Apply include/exclude patterns to discovered links
          let filteredLinks = pageContent.metadata.links;
          
          if (typeof source !== 'string' && (source.includePatterns || source.excludePatterns)) {
            filteredLinks = this.filterLinks(
              pageContent.metadata.links, 
              source.includePatterns,
              source.excludePatterns
            );
          }
          
          for (const link of filteredLinks) {
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

  private filterLinks(
    links: string[], 
    includePatterns?: string[], 
    excludePatterns?: string[]
  ): string[] {
    if (!includePatterns && !excludePatterns) {
      return links;
    }

    return links.filter(link => shouldIncludeUrl(link, includePatterns, excludePatterns));
  }

  async collectUrls(): Promise<string[]> {
    // This method simulates the full crawl process to collect all URLs
    // without actually fetching content from Pure.md
    
    // Reset queues
    this.queue = new Set();
    this.visited = new Set();
    this.sourceMap = new Map();
    
    // Normalize sources to array
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
        // Object source - use strategy to determine how to process
        const strategyType = (source.strategy || 'explorer') as SourceStrategyType;
        const strategy = StrategyFactory.getStrategy(strategyType);
        
        console.log(`  Collecting from ${source.url} (${strategyType} strategy)`);
        
        try {
          const result = await strategy.execute(source.url, { ...source, debug: this.crawlConfig.debug });
          
          if (result.urls.length > 0) {
            console.log(`  → Found ${result.urls.length} URLs`);
            
            // Add collected URLs to queue
            for (const url of result.urls) {
              this.queue.add(url);
              // Store the source configuration for these URLs
              if (!this.sourceMap.has(url)) {
                this.sourceMap.set(url, source);
              }
            }
          }
        } catch (error) {
          console.error(`  → Error collecting from ${source.url}:`, error);
        }
      }
    }
    
    // Now simulate the crawl to handle depth traversal
    const collectedUrls = new Set<string>();
    const processedForDepth = new Set<string>();
    
    // Add all queued URLs to collected
    for (const url of this.queue) {
      collectedUrls.add(url);
    }
    
    console.log(`  → Initial queue size: ${this.queue.size}, processing depth...`);
    
    // Process depth if needed (discover links from pages)
    let iterations = 0;
    const maxIterations = 1000; // Safety limit
    while (this.queue.size > 0 && iterations < maxIterations) {
      iterations++;
      const url = this.queue.values().next().value;
      if (!url) break;
      
      this.queue.delete(url);
      
      // Skip if already processed for depth
      if (processedForDepth.has(url)) continue;
      processedForDepth.add(url);
      
      // Find the source configuration for this URL
      const source = this.findSourceForUrl(url);
      const depth = this.getSourceDepth(source);
      
      if (depth > 0 && source) {
        try {
          // Add delay between requests during collection
          if (processedForDepth.size > 1) {
            await new Promise(resolve => setTimeout(resolve, this.crawlConfig.delay));
          }
          
          console.log(`    → Discovering links from: ${url}`);
          
          // Discover links from this page
          const discovered = await this.linkDiscoverer.discoverLinks(url);
          
          const sourceUrl = typeof source === 'string' ? source : source.url;
          const currentDepth = this.getDepth(url, sourceUrl);
          
          if (currentDepth < depth) {
            // Apply include/exclude patterns to discovered links
            let filteredLinks = discovered.links;
            
            if (typeof source !== 'string' && (source.includePatterns || source.excludePatterns)) {
              filteredLinks = this.filterLinks(
                discovered.links, 
                source.includePatterns,
                source.excludePatterns
              );
            }
            
            // Add filtered links to queue and collected URLs
            for (const link of filteredLinks) {
              if (this.isSameDomain(link, url)) {
                collectedUrls.add(link);
                if (!processedForDepth.has(link)) {
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
          // Ignore link discovery errors during collection
          this.debug(`Failed to discover links from ${url}:`, error);
        }
      }
    }
    
    if (iterations >= maxIterations) {
      console.warn(`  ⚠ Warning: Reached max iterations limit (${maxIterations}) during URL collection`);
    }
    
    console.log(`  → Collection complete: ${collectedUrls.size} URLs found`);
    return Array.from(collectedUrls);
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