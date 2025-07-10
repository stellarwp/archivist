import { singleton } from 'tsyringe';
import { join } from 'path';
import { mkdirSync, writeFileSync } from 'fs';
import { ConfigService } from './config.service';
import { StateService, type ArchiveState } from './state.service';
import { LoggerService } from './logger.service';
import { PureMdClient } from './pure-md';
import { LinkDiscoverer } from './link-discoverer';
import { HttpService } from './http.service';
import type { ArchiveConfig, SourceConfig } from '../../archivist.config';
import { formatContent } from '../utils/content-formatter';
import { generateFileName } from '../utils/file-naming';
import { extractLinksFromPage } from '../utils/link-extractor';
import { shouldIncludeUrl } from '../utils/pattern-matcher';
import { StrategyFactory as SourceStrategyFactory } from '../strategies/strategy-factory';

interface PaginationInfo {
  sourceUrl: string;
  pagesDiscovered: number;
  linksPerPage: Map<string, string[]>;
}

@singleton()
export class ArchiveCrawlerService {
  private lastPaginationInfo: PaginationInfo | null = null;
  
  constructor(
    private configService: ConfigService,
    private stateService: StateService,
    private logger: LoggerService,
    private pureMdClient: PureMdClient,
    private linkDiscoverer: LinkDiscoverer,
    private httpService: HttpService
  ) {}
  
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
  
  getLastPaginationInfo(): PaginationInfo | null {
    return this.lastPaginationInfo;
  }
  
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
  
  private async fetchPageContent(url: string): Promise<string> {
    try {
      return await this.pureMdClient.fetchContent(url);
    } catch (error) {
      this.logger.warn(`Pure.md failed for ${url}, returning placeholder`);
      return `# Content Extraction Failed\n\nUnable to extract content from ${url}`;
    }
  }
  
  private extractTitle(content: string): string {
    const titleMatch = content.match(/^#\s+(.+)$/m);
    return titleMatch?.[1] || 'Untitled';
  }
  
  async saveResults(archive: ArchiveConfig, archiveState: ArchiveState): Promise<string> {
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