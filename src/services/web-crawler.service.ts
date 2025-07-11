import { singleton } from 'tsyringe';
import { ConfigService } from './config.service';
import { StateService } from './state.service';
import { LoggerService } from './logger.service';
import { ArchiveCrawlerService } from './archive-crawler.service';
import type { ArchiveConfig } from '../config/schema';
import { readFileSync } from 'fs';

/**
 * Main service orchestrating the web crawling process.
 * Coordinates URL collection, crawling, and result saving across multiple archives.
 * 
 * @class WebCrawlerService
 * @singleton
 */
@singleton()
export class WebCrawlerService {
  /**
   * Creates an instance of WebCrawlerService
   * @param {ConfigService} configService - Service for accessing configuration
   * @param {StateService} stateService - Service for managing crawl state
   * @param {LoggerService} logger - Service for logging
   * @param {ArchiveCrawlerService} archiveCrawler - Service for crawling individual archives
   */
  constructor(
    private configService: ConfigService,
    private stateService: StateService,
    private logger: LoggerService,
    private archiveCrawler: ArchiveCrawlerService
  ) {}

  /**
   * Collects URLs from all configured archives without crawling them.
   * Saves collected URLs to a JSON file for review.
   * 
   * @returns {Promise<void>}
   */
  async collectAllUrls(): Promise<void> {
    const archives = this.configService.getArchives();
    
    this.logger.info(`\nCollecting URLs from ${archives.length} archive(s)...`);
    
    for (const archive of archives) {
      await this.collectArchiveUrls(archive);
    }
    
    // Save collected URLs to file
    this.stateService.saveCollectedLinksFile('collected-links.json');
  }
  
  /**
   * Collects URLs from a single archive based on its source configuration.
   * Handles both simple URL sources and complex source configurations.
   * 
   * @private
   * @param {ArchiveConfig} archive - Archive configuration to collect URLs from
   * @returns {Promise<void>}
   */
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
  
  /**
   * Displays all collected URLs to the console in a formatted list.
   * Shows total count and pagination statistics.
   * 
   * @returns {void}
   */
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
  
  /**
   * @deprecated Kept for backward compatibility. Confirmation is now handled in CLI layer.
   * @returns {Promise<boolean>} Always returns true
   */
  async promptForConfirmation(): Promise<boolean> {
    // This method is kept for backward compatibility
    // but the actual prompting is now handled in the CLI layer
    return true;
  }
  
  /**
   * Crawls all collected URLs and saves results for each archive.
   * Processes archives sequentially to avoid overwhelming target servers.
   * 
   * @param {Object} options - Crawl options
   * @param {boolean} [options.clean] - Whether to clean output directories before saving
   * @returns {Promise<void>}
   */
  async crawlAll(options: { clean?: boolean } = {}): Promise<void> {
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
      
      // Save results (pass clean option)
      const metadataPath = await this.archiveCrawler.saveResults(archive, archiveState, { clean: options.clean });
      this.logger.info(`\n✓ Archive saved to: ${metadataPath}`);
    }
    
    this.logger.info('\n✨ All archives completed!');
  }
  
  /**
   * Generates a summary report of collected links from the saved JSON file.
   * Includes breakdown by archive, strategies used, and pagination statistics.
   * 
   * @returns {string} Formatted report or error message if file not found
   */
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