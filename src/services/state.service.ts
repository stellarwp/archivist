import { singleton } from 'tsyringe';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import type { ArchiveConfig, SourceConfig } from '../../archivist.config';

export interface CrawlResult {
  url: string;
  title: string;
  content: string;
  contentLength: number;
  links: string[];
  metadata?: any;
}

export interface ArchiveState {
  archiveName: string;
  queue: string[];
  visited: string[];
  results: CrawlResult[];
  sourceMap: Map<string, SourceConfig>;
  // For pagination tracking
  paginationInfo: {
    sourceUrl: string;
    pagesDiscovered: number;
    linksPerPage: Map<string, string[]>;
  }[];
}

export interface GlobalCrawlState {
  archives: Map<string, ArchiveState>;
  collectedUrls: {
    archiveName: string;
    sourceUrl: string;
    strategy: string;
    urls: string[];
    paginationPages?: number;
  }[];
  startTime: Date;
  configPath?: string;
}

@singleton()
export class StateService {
  private state: GlobalCrawlState = {
    archives: new Map(),
    collectedUrls: [],
    startTime: new Date(),
  };
  
  private stateDir: string = '.archivist-state';
  
  constructor() {
    this.ensureStateDirectory();
  }
  
  private ensureStateDirectory(): void {
    if (!existsSync(this.stateDir)) {
      mkdirSync(this.stateDir, { recursive: true });
    }
  }
  
  // Initialize state for an archive
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
  
  // Get archive state
  getArchiveState(archiveName: string): ArchiveState | undefined {
    return this.state.archives.get(archiveName);
  }
  
  // Add collected URLs from source discovery
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
  
  // Get all collected URLs
  getAllCollectedUrls(): typeof this.state.collectedUrls {
    return this.state.collectedUrls;
  }
  
  // Get total URL count across all archives
  getTotalUrlCount(): number {
    return this.state.collectedUrls.reduce((sum, item) => sum + item.urls.length, 0);
  }
  
  // Get pagination statistics
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
  
  // Save state to file (for multi-threading support)
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
  
  // Add URL to queue
  addToQueue(archiveName: string, url: string): void {
    const state = this.getArchiveState(archiveName);
    if (state && !state.queue.includes(url) && !state.visited.includes(url)) {
      state.queue.push(url);
    }
  }
  
  // Mark URL as visited
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
  
  // Add crawl result
  addResult(archiveName: string, result: CrawlResult): void {
    const state = this.getArchiveState(archiveName);
    if (state) {
      state.results.push(result);
    }
  }
  
  // Clear state
  clearState(): void {
    this.state = {
      archives: new Map(),
      collectedUrls: [],
      startTime: new Date(),
    };
  }
}