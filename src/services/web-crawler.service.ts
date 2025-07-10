import { singleton } from 'tsyringe';
import { ConfigService } from './config.service';
import { StateService } from './state.service';
import { LoggerService } from './logger.service';
import { ArchiveCrawlerService } from './archive-crawler.service';
import type { ArchiveConfig } from '../../archivist.config';
import { readFileSync } from 'fs';

@singleton()
export class WebCrawlerService {
  constructor(
    private configService: ConfigService,
    private stateService: StateService,
    private logger: LoggerService,
    private archiveCrawler: ArchiveCrawlerService
  ) {}

  async collectAllUrls(): Promise<void> {
    const archives = this.configService.getArchives();
    
    this.logger.info(`\nCollecting URLs from ${archives.length} archive(s)...`);
    
    for (const archive of archives) {
      await this.collectArchiveUrls(archive);
    }
    
    // Save collected URLs to file
    this.stateService.saveCollectedLinksFile('collected-links.json');
  }
  
  private async collectArchiveUrls(archive: ArchiveConfig): Promise<void> {
    this.logger.section(`Collecting URLs for archive: ${archive.name}`);
    
    const archiveName = archive.name;
    this.stateService.initializeArchive(archiveName);
    
    // Normalize sources to array
    const sources = Array.isArray(archive.sources) ? archive.sources : [archive.sources];
    
    for (const source of sources) {
      if (typeof source === 'string') {
        // Simple URL source
        this.logger.info(`  Collecting from ${source}`);
        const urls = await this.archiveCrawler.collectUrlsFromSource(source, {
          url: source,
          depth: 1
        });
        
        this.stateService.addCollectedUrls(archiveName, source, 'simple', urls);
        this.logger.info(`  → Found ${urls.length} URLs`);
      } else {
        // Source with configuration
        const strategy = source.strategy || 'explorer';
        this.logger.info(`  Collecting from ${source.url} (${strategy} strategy)`);
        
        const urls = await this.archiveCrawler.collectUrlsFromSource(source.url, source);
        const paginationInfo = this.archiveCrawler.getLastPaginationInfo();
        
        this.stateService.addCollectedUrls(
          archiveName, 
          source.url, 
          strategy, 
          urls,
          paginationInfo?.pagesDiscovered
        );
        
        if (paginationInfo) {
          this.logger.info(`  → Found ${urls.length} URLs across ${paginationInfo.pagesDiscovered} pages`);
        } else {
          this.logger.info(`  → Found ${urls.length} URLs`);
        }
      }
    }
  }
  
  displayCollectedUrls(): void {
    const collectedUrls = this.stateService.getAllCollectedUrls();
    const totalUrls = this.stateService.getTotalUrlCount();
    const paginationStats = this.stateService.getPaginationStats();
    
    this.logger.info(`\nFound ${totalUrls} URLs to crawl:`);
    this.logger.info('='.repeat(50));
    
    let urlIndex = 1;
    for (const item of collectedUrls) {
      // Display URLs in order
      for (const url of item.urls) {
        console.log(`${urlIndex.toString().padStart(4)}. ${url}`);
        urlIndex++;
      }
    }
    
    this.logger.info('='.repeat(50));
    this.logger.info(`\nTotal URLs to be processed: ${totalUrls}`);
    
    if (paginationStats.totalPages > 0) {
      this.logger.info(`Pagination pages discovered: ${paginationStats.totalPages}`);
    }
  }
  
  async promptForConfirmation(): Promise<boolean> {
    // This method is kept for backward compatibility
    // but the actual prompting is now handled in the CLI layer
    return true;
  }
  
  async crawlAll(): Promise<void> {
    const archives = this.configService.getArchives();
    const collectedUrls = this.stateService.getAllCollectedUrls();
    
    // Group URLs by archive
    const urlsByArchive = new Map<string, string[]>();
    for (const item of collectedUrls) {
      if (!urlsByArchive.has(item.archiveName)) {
        urlsByArchive.set(item.archiveName, []);
      }
      urlsByArchive.get(item.archiveName)!.push(...item.urls);
    }
    
    // Crawl each archive
    for (const archive of archives) {
      const urls = urlsByArchive.get(archive.name) || [];
      if (urls.length === 0) continue;
      
      this.logger.section(`Crawling archive: ${archive.name}`);
      this.logger.info(`Processing ${urls.length} URLs...`);
      
      // Initialize archive state
      this.stateService.initializeArchive(archive.name);
      const archiveState = this.stateService.getArchiveState(archive.name)!;
      
      // Add all URLs to queue
      for (const url of urls) {
        this.stateService.addToQueue(archive.name, url);
      }
      
      // Crawl all URLs
      await this.archiveCrawler.crawlUrls(archive, archiveState);
      
      // Save results
      const metadataPath = await this.archiveCrawler.saveResults(archive, archiveState);
      this.logger.info(`\n✓ Archive saved to: ${metadataPath}`);
    }
    
    this.logger.info('\n✨ All archives completed!');
  }
  
  getCollectedLinksReport(): string {
    try {
      const linksData = JSON.parse(readFileSync('collected-links.json', 'utf-8'));
      const report = [];
      
      report.push(`\nCollected Links Summary`);
      report.push('='.repeat(50));
      report.push(`Total Archives: ${linksData.summary.totalArchives}`);
      report.push(`Total URLs: ${linksData.summary.totalUrls}`);
      
      if (linksData.summary.paginationStats.totalPages > 0) {
        report.push(`Pagination Pages: ${linksData.summary.paginationStats.totalPages}`);
      }
      
      report.push('\nBreakdown by Archive:');
      report.push('-'.repeat(50));
      
      for (const archive of linksData.archives) {
        report.push(`\n${archive.archive}:`);
        report.push(`  Source: ${archive.source}`);
        report.push(`  Strategy: ${archive.strategy}`);
        report.push(`  URL Count: ${archive.urlCount}`);
        if (archive.paginationPages) {
          report.push(`  Pagination Pages: ${archive.paginationPages}`);
        }
      }
      
      return report.join('\n');
    } catch (error) {
      return 'No collected links file found.';
    }
  }
}