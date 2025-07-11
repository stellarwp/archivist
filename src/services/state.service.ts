import { singleton } from 'tsyringe';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import type { ArchiveConfig, SourceConfig } from '../config/schema';

/**
 * Result of crawling a single URL
 * @interface CrawlResult
 */
export interface CrawlResult {
  /** The URL that was crawled */
  url: string;
  /** Extracted title from the page */
  title: string;
  /** Extracted content in markdown format */
  content: string;
  /** Length of the content in characters */
  contentLength: number;
  /** Links found on the page */
  links: string[];
  /** Optional metadata about the crawl */
  metadata?: any;
}

/**
 * State for a single archive during crawling
 * @interface ArchiveState
 */
export interface ArchiveState {
  /** Name of the archive */
  archiveName: string;
  /** URLs waiting to be crawled */
  queue: string[];
  /** URLs that have been visited */
  visited: string[];
  /** Results from crawled URLs */
  results: CrawlResult[];
  /** Map of URLs to their source configuration */
  sourceMap: Map<string, SourceConfig>;
  /** Information about pagination discovery */
  paginationInfo: {
    sourceUrl: string;
    pagesDiscovered: number;
    linksPerPage: Map<string, string[]>;
  }[];
}

/**
 * Global state for the entire crawl operation
 * @interface GlobalCrawlState
 */
export interface GlobalCrawlState {
  /** Map of archive names to their states */
  archives: Map<string, ArchiveState>;
  /** URLs collected during the discovery phase */
  collectedUrls: {
    archiveName: string;
    sourceUrl: string;
    strategy: string;
    urls: string[];
    paginationPages?: number;
  }[];
  /** When the crawl operation started */
  startTime: Date;
  /** Path to the configuration file */
  configPath?: string;
}

/**
 * Service for managing crawl state across the application.
 * Handles state persistence, URL tracking, and result collection.
 * 
 * @class StateService
 * @singleton
 */
@singleton()
export class StateService {
  /** The global crawl state */
  private state: GlobalCrawlState = {
    archives: new Map(),
    collectedUrls: [],
    startTime: new Date(),
  };
  
  /** Directory for storing state files */
  private stateDir: string = '.archivist-state';
  
  /**
   * Creates an instance of StateService
   */
  constructor() {
    this.ensureStateDirectory();
  }
  
  /**
   * Ensures the state directory exists for storing state files.
   * 
   * @private
   * @returns {void}
   */
  private ensureStateDirectory(): void {
    if (!existsSync(this.stateDir)) {
      mkdirSync(this.stateDir, { recursive: true });
    }
  }
  
  /**
   * Initializes state for a new archive.
   * Creates the archive state if it doesn't exist.
   * 
   * @param {string} archiveName - Name of the archive to initialize
   * @returns {void}
   */
  initializeArchive(archiveName: string): void {
    if (!this.state.archives.has(archiveName)) {
      this.state.archives.set(archiveName, {
        archiveName,
        queue: [],
        visited: [],
        results: [],
        sourceMap: new Map(),
        paginationInfo: [],
      });
    }
  }
  
  /**
   * Retrieves the state for a specific archive.
   * 
   * @param {string} archiveName - Name of the archive
   * @returns {ArchiveState | undefined} Archive state or undefined if not found
   */
  getArchiveState(archiveName: string): ArchiveState | undefined {
    return this.state.archives.get(archiveName);
  }
  
  /**
   * Adds URLs collected during the discovery phase.
   * Tracks which archive and source they came from.
   * 
   * @param {string} archiveName - Name of the archive
   * @param {string} sourceUrl - The source URL these were collected from
   * @param {string} strategy - Strategy used for collection (explorer/pagination)
   * @param {string[]} urls - Array of discovered URLs
   * @param {number} [paginationPages] - Number of pagination pages discovered
   * @returns {void}
   */
  addCollectedUrls(
    archiveName: string, 
    sourceUrl: string, 
    strategy: string, 
    urls: string[],
    paginationPages?: number
  ): void {
    this.state.collectedUrls.push({
      archiveName,
      sourceUrl,
      strategy,
      urls,
      paginationPages,
    });
  }
  
  /**
   * Returns all URLs collected during discovery phase.
   * 
   * @returns {Array} Array of collected URL information
   */
  getAllCollectedUrls(): typeof this.state.collectedUrls {
    return this.state.collectedUrls;
  }
  
  /**
   * Calculates total number of URLs across all archives.
   * 
   * @returns {number} Total URL count
   */
  getTotalUrlCount(): number {
    return this.state.collectedUrls.reduce((sum, item) => sum + item.urls.length, 0);
  }
  
  /**
   * Calculates statistics about pagination discovery.
   * 
   * @returns {{ totalPages: number; totalLinks: number }} Pagination statistics
   */
  getPaginationStats(): { totalPages: number; totalLinks: number } {
    let totalPages = 0;
    let totalLinks = 0;
    
    for (const item of this.state.collectedUrls) {
      if (item.paginationPages) {
        totalPages += item.paginationPages;
      }
      totalLinks += item.urls.length;
    }
    
    return { totalPages, totalLinks };
  }
  
  /**
   * Persists current state to a JSON file.
   * Supports multi-threading by using thread IDs.
   * 
   * @param {number | string} [threadId='main'] - Thread identifier
   * @returns {void}
   */
  saveStateToFile(threadId: number | string = 'main'): void {
    const statePath = join(this.stateDir, `state-${threadId}.json`);
    const stateData = {
      ...this.state,
      archives: Array.from(this.state.archives.entries()).map(([name, state]) => ({
        name,
        state: {
          ...state,
          sourceMap: Array.from(state.sourceMap.entries()),
        },
      })),
    };
    
    writeFileSync(statePath, JSON.stringify(stateData, null, 2));
  }
  
  // Load state from file
  loadStateFromFile(threadId: number | string = 'main'): void {
    const statePath = join(this.stateDir, `state-${threadId}.json`);
    
    if (existsSync(statePath)) {
      const stateData = JSON.parse(readFileSync(statePath, 'utf-8'));
      
      this.state = {
        ...stateData,
        archives: new Map(
          stateData.archives.map((item: any) => [
            item.name,
            {
              ...item.state,
              sourceMap: new Map(item.state.sourceMap),
            },
          ])
        ),
        startTime: new Date(stateData.startTime),
      };
    }
  }
  
  // Save collected URLs for a specific thread (maintains order)
  saveThreadUrls(threadId: number, archiveName: string, urls: string[]): void {
    const urlsPath = join(this.stateDir, `urls-thread-${threadId}-${archiveName}.json`);
    const urlData = {
      threadId,
      archiveName,
      urls,
      timestamp: new Date().toISOString(),
    };
    
    writeFileSync(urlsPath, JSON.stringify(urlData, null, 2));
  }
  
  // Merge thread URL files in correct order
  mergeThreadUrls(archiveName: string, threadCount: number): string[] {
    const mergedUrls: string[] = [];
    
    // Read URLs from each thread in order
    for (let i = 0; i < threadCount; i++) {
      const urlsPath = join(this.stateDir, `urls-thread-${i}-${archiveName}.json`);
      
      if (existsSync(urlsPath)) {
        const urlData = JSON.parse(readFileSync(urlsPath, 'utf-8'));
        mergedUrls.push(...urlData.urls);
      }
    }
    
    return mergedUrls;
  }
  
  // Save a consolidated links file for user review
  saveCollectedLinksFile(outputPath: string = 'collected-links.json'): void {
    const linksData = {
      timestamp: new Date().toISOString(),
      summary: {
        totalArchives: this.state.archives.size,
        totalUrls: this.getTotalUrlCount(),
        paginationStats: this.getPaginationStats(),
      },
      archives: this.state.collectedUrls.map(item => ({
        archive: item.archiveName,
        source: item.sourceUrl,
        strategy: item.strategy,
        paginationPages: item.paginationPages,
        urlCount: item.urls.length,
        urls: item.urls,
      })),
    };
    
    writeFileSync(outputPath, JSON.stringify(linksData, null, 2));
  }
  
  /**
   * Adds a URL to the crawl queue for an archive.
   * Prevents duplicates and already visited URLs.
   * 
   * @param {string} archiveName - Name of the archive
   * @param {string} url - URL to add to queue
   * @returns {void}
   */
  addToQueue(archiveName: string, url: string): void {
    const state = this.getArchiveState(archiveName);
    if (state && !state.queue.includes(url) && !state.visited.includes(url)) {
      state.queue.push(url);
    }
  }
  
  /**
   * Marks a URL as visited and removes it from the queue.
   * 
   * @param {string} archiveName - Name of the archive
   * @param {string} url - URL to mark as visited
   * @returns {void}
   */
  markVisited(archiveName: string, url: string): void {
    const state = this.getArchiveState(archiveName);
    if (state) {
      const index = state.queue.indexOf(url);
      if (index > -1) {
        state.queue.splice(index, 1);
      }
      if (!state.visited.includes(url)) {
        state.visited.push(url);
      }
    }
  }
  
  /**
   * Adds a crawl result to the archive's results.
   * 
   * @param {string} archiveName - Name of the archive
   * @param {CrawlResult} result - Result to add
   * @returns {void}
   */
  addResult(archiveName: string, result: CrawlResult): void {
    const state = this.getArchiveState(archiveName);
    if (state) {
      state.results.push(result);
    }
  }
  
  /**
   * Clears all state data and resets to initial state.
   * 
   * @returns {void}
   */
  clearState(): void {
    this.state = {
      archives: new Map(),
      collectedUrls: [],
      startTime: new Date(),
    };
  }
}