import { singleton } from 'tsyringe';
import { join } from 'path';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs';
import { ConfigService } from './config.service';
import { StateService, type ArchiveState } from './state.service';
import { LoggerService } from './logger.service';
import { PureMdClient } from './pure-md';
import { LinkDiscoverer } from './link-discoverer';
import { HttpService } from './http.service';
import type { ArchiveConfig, SourceConfig } from '../config/schema';
import { formatContent } from '../utils/content-formatter';
import { generateFileName } from '../utils/file-naming';
import { extractLinksFromPage } from '../utils/link-extractor';
import { shouldIncludeUrl } from '../utils/pattern-matcher';
import { StrategyFactory as SourceStrategyFactory } from '../strategies/strategy-factory';

/**
 * Information about pagination discovery process
 * @interface PaginationInfo
 */
interface PaginationInfo {
  /** The original source URL that was paginated */
  sourceUrl: string;
  /** Number of pages discovered during pagination */
  pagesDiscovered: number;
  /** Map of page URLs to their discovered links */
  linksPerPage: Map<string, string[]>;
}

/**
 * Service responsible for crawling web archives and collecting content.
 * Handles URL discovery, content extraction, and result persistence.
 * 
 * @class ArchiveCrawlerService
 * @singleton
 */
@singleton()
export class ArchiveCrawlerService {
  /** Stores information about the last pagination operation */
  private lastPaginationInfo: PaginationInfo | null = null;
  
  /**
   * Creates an instance of ArchiveCrawlerService
   * @param {ConfigService} configService - Service for accessing configuration
   * @param {StateService} stateService - Service for managing crawl state
   * @param {LoggerService} logger - Service for logging
   * @param {PureMdClient} pureMdClient - Client for Pure.md content extraction
   * @param {LinkDiscoverer} linkDiscoverer - Service for discovering links on pages
   * @param {HttpService} httpService - Service for making HTTP requests
   */
  constructor(
    private configService: ConfigService,
    private stateService: StateService,
    private logger: LoggerService,
    private pureMdClient: PureMdClient,
    private linkDiscoverer: LinkDiscoverer,
    private httpService: HttpService
  ) {}
  
  /**
   * Collects all URLs from a source based on its configuration.
   * Handles different strategies (explorer, pagination) and applies filtering.
   * 
   * @param {string} sourceUrl - The starting URL to collect from
   * @param {SourceConfig} source - Configuration for how to collect URLs
   * @returns {Promise<string[]>} Array of discovered URLs after filtering
   */
  async collectUrlsFromSource(sourceUrl: string, source: SourceConfig): Promise<string[]> {
    this.lastPaginationInfo = null;
    
    // Normalize source to object form
    const sourceConfig = typeof source === 'string' ? { url: source } : source;
    
    // Use strategy to collect URLs
    const strategy = SourceStrategyFactory.getStrategy(sourceConfig.strategy || 'explorer');
    const result = await strategy.execute(sourceUrl, {
      ...sourceConfig,
      linkSelector: sourceConfig.linkSelector,
      pagination: sourceConfig.pagination,
    });
    
    // Track pagination info if this was a pagination strategy
    if (sourceConfig.strategy === 'pagination' && sourceConfig.pagination) {
      const pagesDiscovered = result.urls.length > 1 ? 
        Math.ceil(result.urls.length / 10) : // Estimate pages based on URL count
        1;
      
      this.lastPaginationInfo = {
        sourceUrl,
        pagesDiscovered,
        linksPerPage: new Map(),
      };
    }
    
    // Filter URLs based on patterns
    const filteredUrls = result.urls.filter((url: string) => 
      shouldIncludeUrl(url, sourceConfig.includePatterns, sourceConfig.excludePatterns)
    );
    
    // Handle depth-based crawling
    if (sourceConfig.depth && sourceConfig.depth > 0) {
      const depthUrls = await this.discoverUrlsWithDepth(
        sourceUrl,
        sourceConfig.depth,
        sourceConfig.includePatterns,
        sourceConfig.excludePatterns
      );
      
      // Merge and deduplicate
      const allUrls = new Set([...filteredUrls, ...depthUrls]);
      return Array.from(allUrls);
    }
    
    return filteredUrls;
  }
  
  /**
   * Discovers URLs by crawling to a specified depth.
   * Uses breadth-first search to explore links.
   * 
   * @private
   * @param {string} startUrl - The URL to start crawling from
   * @param {number} maxDepth - Maximum depth to crawl (0 = only start URL)
   * @param {string[]} [includePatterns] - Patterns that URLs must match to be included
   * @param {string[]} [excludePatterns] - Patterns that exclude URLs from being crawled
   * @returns {Promise<string[]>} Array of discovered URLs
   */
  private async discoverUrlsWithDepth(
    startUrl: string,
    maxDepth: number,
    includePatterns?: string[],
    excludePatterns?: string[]
  ): Promise<string[]> {
    const visited = new Set<string>();
    const toVisit: { url: string; depth: number }[] = [{ url: startUrl, depth: 0 }];
    const discovered = new Set<string>();
    
    while (toVisit.length > 0) {
      const { url, depth } = toVisit.shift()!;
      
      if (visited.has(url) || depth > maxDepth) {
        continue;
      }
      
      visited.add(url);
      
      try {
        const links = await this.linkDiscoverer.discover(url);
        
        for (const link of links) {
          if (shouldIncludeUrl(link, includePatterns, excludePatterns)) {
            discovered.add(link);
            
            if (depth < maxDepth) {
              toVisit.push({ url: link, depth: depth + 1 });
            }
          }
        }
      } catch (error) {
        this.logger.warn(`Failed to discover links from ${url}: ${error}`);
      }
    }
    
    return Array.from(discovered);
  }
  
  /**
   * Returns information about the last pagination operation.
   * Used for debugging and progress reporting.
   * 
   * @returns {PaginationInfo | null} Pagination info or null if no pagination occurred
   */
  getLastPaginationInfo(): PaginationInfo | null {
    return this.lastPaginationInfo;
  }
  
  /**
   * Crawls all URLs in the archive's queue.
   * Processes URLs in batches respecting concurrency limits and delays.
   * 
   * @param {ArchiveConfig} archive - Configuration for the archive being crawled
   * @param {ArchiveState} archiveState - Current state of the crawl operation
   * @returns {Promise<void>}
   */
  async crawlUrls(archive: ArchiveConfig, archiveState: ArchiveState): Promise<void> {
    const crawlConfig = this.configService.getCrawlConfig();
    const delay = crawlConfig.delay || 1000;
    const maxConcurrency = crawlConfig.maxConcurrency || 3;
    
    let processed = 0;
    const total = archiveState.queue.length;
    
    // Process URLs in batches
    while (archiveState.queue.length > 0) {
      const batch = archiveState.queue.splice(0, maxConcurrency);
      
      const promises = batch.map(async (url) => {
        try {
          processed++;
          this.logger.progress(processed, total, `Crawling: ${url}`);
          
          const content = await this.fetchPageContent(url);
          const links = await extractLinksFromPage({ url });
          
          this.stateService.markVisited(archive.name, url);
          this.stateService.addResult(archive.name, {
            url,
            title: this.extractTitle(content),
            content,
            contentLength: content.length,
            links,
          });
        } catch (error) {
          this.logger.error(`Failed to crawl ${url}: ${error}`);
          this.stateService.markVisited(archive.name, url);
        }
      });
      
      await Promise.all(promises);
      
      // Delay between batches
      if (archiveState.queue.length > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  /**
   * Fetches content from a URL using Pure.md API.
   * Falls back to placeholder content if extraction fails.
   * 
   * @private
   * @param {string} url - The URL to fetch content from
   * @returns {Promise<string>} Extracted content or placeholder text
   */
  private async fetchPageContent(url: string): Promise<string> {
    try {
      return await this.pureMdClient.fetchContent(url);
    } catch (error) {
      this.logger.warn(`Pure.md failed for ${url}, returning placeholder`);
      return `# Content Extraction Failed\n\nUnable to extract content from ${url}`;
    }
  }
  
  /**
   * Extracts the title from markdown content.
   * Looks for the first H1 heading in the content.
   * 
   * @private
   * @param {string} content - Markdown content to extract title from
   * @returns {string} Extracted title or 'Untitled' if not found
   */
  private extractTitle(content: string): string {
    const titleMatch = content.match(/^#\s+(.+)$/m);
    return titleMatch?.[1] || 'Untitled';
  }
  
  /**
   * Saves crawl results to the file system.
   * Creates output directory, saves individual files, and generates metadata.
   * 
   * @param {ArchiveConfig} archive - Configuration for the archive
   * @param {ArchiveState} archiveState - State containing crawl results
   * @param {Object} options - Save options
   * @param {boolean} [options.clean] - Whether to clean the output directory first
   * @returns {Promise<string>} Path to the generated metadata file
   */
  async saveResults(archive: ArchiveConfig, archiveState: ArchiveState, options: { clean?: boolean } = {}): Promise<string> {
    // Clean directory if requested
    if (options.clean && existsSync(archive.output.directory)) {
      this.logger.info(`  Cleaning output directory: ${archive.output.directory}`);
      rmSync(archive.output.directory, { recursive: true, force: true });
    }
    
    // Create output directory
    mkdirSync(archive.output.directory, { recursive: true });
    
    // Save individual files
    for (const result of archiveState.results) {
      const fileName = generateFileName(
        result.url,
        result.title,
        archive.output.fileNaming as 'url-based' | 'title-based' | 'hash-based' || 'url-based'
      );
      
      const formattedContent = formatContent(result, archive.output.format || 'markdown');
      const filePath = join(archive.output.directory, fileName);
      
      writeFileSync(filePath, formattedContent);
    }
    
    // Save metadata
    const metadata = {
      archiveName: archive.name,
      crawledAt: new Date().toISOString(),
      totalPages: archiveState.results.length,
      results: archiveState.results.map(r => ({
        url: r.url,
        title: r.title,
        contentLength: r.contentLength,
        linksCount: r.links.length,
      })),
    };
    
    const metadataPath = join(archive.output.directory, 'archivist-metadata.json');
    writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
    
    return metadataPath;
  }
}