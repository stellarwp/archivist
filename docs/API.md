# Archivist API Documentation

This document provides comprehensive API documentation for using Archivist programmatically.

## Table of Contents

- [Getting Started](#getting-started)
- [Core Services](#core-services)
- [Utility Functions](#utility-functions)
- [Strategies](#strategies)
- [Types and Interfaces](#types-and-interfaces)
- [Examples](#examples)

## Getting Started

### Installation

```bash
npm install @stellarwp/archivist
# or
bun add @stellarwp/archivist
```

### Basic Usage

```typescript
import { initializeContainer, appContainer } from '@stellarwp/archivist';
import { WebCrawlerService, ConfigService } from '@stellarwp/archivist';

// Initialize dependency injection container
initializeContainer();

// Get services from container
const configService = appContainer.resolve(ConfigService);
const webCrawler = appContainer.resolve(WebCrawlerService);
```

## Core Services

### WebCrawlerService

The main service for orchestrating web crawling operations across multiple archives.

```typescript
class WebCrawlerService {
  /**
   * Collects URLs from all configured archives without crawling them.
   * Saves collected URLs to a JSON file for review.
   */
  async collectAllUrls(): Promise<void>

  /**
   * Displays all collected URLs to the console in a formatted list.
   * Shows total count and pagination statistics.
   */
  displayCollectedUrls(): void

  /**
   * Crawls all collected URLs and saves results for each archive.
   * Processes archives sequentially to avoid overwhelming target servers.
   * 
   * @param options.clean - Whether to clean output directories before saving
   */
  async crawlAll(options?: { clean?: boolean }): Promise<void>

  /**
   * Generates a summary report of collected links from the saved JSON file.
   * Includes breakdown by archive, strategies used, and pagination statistics.
   */
  getCollectedLinksReport(): string
}
```

### ArchiveCrawlerService

Handles crawling individual archives, including URL discovery and content extraction.

```typescript
class ArchiveCrawlerService {
  /**
   * Collects all URLs from a source based on its configuration.
   * Handles different strategies (explorer, pagination) and applies filtering.
   * 
   * @param sourceUrl - The starting URL to collect from
   * @param source - Configuration for how to collect URLs
   * @returns Array of discovered URLs after filtering
   */
  async collectUrlsFromSource(sourceUrl: string, source: SourceConfig): Promise<string[]>

  /**
   * Crawls all URLs in the archive's queue.
   * Processes URLs in batches respecting concurrency limits and delays.
   * 
   * @param archive - Configuration for the archive being crawled
   * @param archiveState - Current state of the crawl operation
   */
  async crawlUrls(archive: ArchiveConfig, archiveState: ArchiveState): Promise<void>

  /**
   * Saves crawl results to the file system.
   * Creates output directory, saves individual files, and generates metadata.
   * 
   * @param archive - Configuration for the archive
   * @param archiveState - State containing crawl results
   * @param options.clean - Whether to clean the output directory first
   * @returns Path to the generated metadata file
   */
  async saveResults(archive: ArchiveConfig, archiveState: ArchiveState, options?: { clean?: boolean }): Promise<string>

  /**
   * Returns information about the last pagination operation.
   * Used for debugging and progress reporting.
   */
  getLastPaginationInfo(): PaginationInfo | null
}
```

### ConfigService

Service for managing and accessing application configuration.

```typescript
class ConfigService {
  /**
   * Initializes the configuration service with loaded config.
   * Must be called before any other methods.
   * 
   * @param config - The configuration object
   * @param configPath - Optional path to the config file
   */
  initialize(config: ArchivistConfig, configPath?: string): void

  /**
   * Returns the complete configuration object.
   * @throws Error if configuration not initialized
   */
  getConfig(): ArchivistConfig

  /**
   * Returns all configured archives.
   */
  getArchives(): ArchiveConfig[]

  /**
   * Returns crawl-specific configuration with defaults.
   */
  getCrawlConfig(): CrawlConfig

  /**
   * Returns the Pure.md API key from config or environment.
   * Checks config first, then falls back to PURE_API_KEY env variable.
   */
  getPureApiKey(): string | undefined

  /**
   * Updates configuration with partial updates.
   * Useful for CLI overrides and runtime modifications.
   */
  updateConfig(updates: Partial<ArchivistConfig>): void

  // Helper methods
  isDebugMode(): boolean
  getUserAgent(): string
  getMaxConcurrency(): number
  getDelay(): number
  getTimeout(): number
}
```

### StateService

Service for managing crawl state across the application.

```typescript
class StateService {
  /**
   * Initializes state for a new archive.
   * Creates the archive state if it doesn't exist.
   */
  initializeArchive(archiveName: string): void

  /**
   * Retrieves the state for a specific archive.
   */
  getArchiveState(archiveName: string): ArchiveState | undefined

  /**
   * Adds URLs collected during the discovery phase.
   * Tracks which archive and source they came from.
   */
  addCollectedUrls(
    archiveName: string, 
    sourceUrl: string, 
    strategy: string, 
    urls: string[],
    paginationPages?: number
  ): void

  /**
   * Returns all URLs collected during discovery phase.
   */
  getAllCollectedUrls(): CollectedUrlInfo[]

  /**
   * Calculates total number of URLs across all archives.
   */
  getTotalUrlCount(): number

  /**
   * Calculates statistics about pagination discovery.
   */
  getPaginationStats(): { totalPages: number; totalLinks: number }

  /**
   * Adds a URL to the crawl queue for an archive.
   * Prevents duplicates and already visited URLs.
   */
  addToQueue(archiveName: string, url: string): void

  /**
   * Marks a URL as visited and removes it from the queue.
   */
  markVisited(archiveName: string, url: string): void

  /**
   * Adds a crawl result to the archive's results.
   */
  addResult(archiveName: string, result: CrawlResult): void

  /**
   * Persists current state to a JSON file.
   * Supports multi-threading by using thread IDs.
   */
  saveStateToFile(threadId?: number | string): void

  /**
   * Saves a consolidated links file for user review.
   */
  saveCollectedLinksFile(outputPath?: string): void
}
```

### LoggerService

Service for consistent logging and output formatting.

```typescript
class LoggerService {
  /**
   * Logs an informational message.
   */
  info(message: string): void

  /**
   * Logs a warning message.
   */
  warn(message: string): void

  /**
   * Logs an error message.
   */
  error(message: string): void

  /**
   * Logs a debug message (only in debug mode).
   */
  debug(message: string): void

  /**
   * Creates a section header for better output organization.
   */
  section(title: string): void

  /**
   * Shows progress information during crawling.
   */
  progress(current: number, total: number, message?: string): void
}
```

## Utility Functions

### Content Formatting

```typescript
/**
 * Formats page content into the specified output format.
 * 
 * @param page - The page content to format
 * @param format - Output format: 'markdown' | 'json' | 'html'
 * @returns Formatted content as a string
 */
export function formatContent(page: PageContent, format?: OutputFormat): string

/**
 * Formats page content as Markdown with metadata header.
 */
export function formatAsMarkdown(page: PageContent): string

/**
 * Formats page content as pretty-printed JSON.
 */
export function formatAsJson(page: PageContent): string

/**
 * Formats page content as a self-contained HTML document.
 */
export function formatAsHtml(page: PageContent): string
```

### File Naming

```typescript
/**
 * Generates a filename for saving crawled content.
 * Supports multiple naming strategies to avoid conflicts.
 * 
 * @param url - The URL of the page
 * @param title - The title of the page
 * @param strategy - 'url-based' | 'title-based' | 'hash-based'
 * @returns Generated filename with .md extension
 */
export function generateFileName(url: string, title: string, strategy?: FileNamingStrategy): string

/**
 * Sanitizes a string to be used as a filename.
 * Removes special characters, converts to lowercase, and limits length.
 */
export function sanitizeFilename(name: string): string

/**
 * Converts a URL into a descriptive filename.
 * Uses hostname and path components to create readable names.
 */
export function urlToFilename(url: string): string

/**
 * Creates a filename from page title with URL hash for uniqueness.
 * Combines sanitized title with first 8 characters of URL hash.
 */
export function titleToFilename(title: string, url: string): string

/**
 * Generates a hash-based filename from URL.
 * Uses SHA256 hash truncated to 16 characters for uniqueness.
 */
export function hashFilename(url: string): string
```

### Pattern Matching

```typescript
/**
 * Tests if a URL should be included based on include/exclude patterns.
 * Supports both minimatch glob patterns and regular expressions.
 * 
 * @param url - URL to test
 * @param includePatterns - Patterns that URLs must match to be included
 * @param excludePatterns - Patterns that exclude URLs from results
 * @returns true if URL should be included
 */
export function shouldIncludeUrl(
  url: string,
  includePatterns?: string[],
  excludePatterns?: string[]
): boolean

/**
 * Tests if a URL matches a pattern.
 * Supports both minimatch glob patterns and regular expressions.
 */
export function matchesPattern(url: string, pattern: string): boolean

/**
 * Converts common glob patterns to more specific ones if needed.
 * This helps users write simpler patterns.
 */
export function normalizePattern(pattern: string): string
```

### Link Extraction

```typescript
/**
 * Extracts all links from a web page with optional filtering.
 * Uses LinkDiscoverer service with fallback to direct implementation.
 * 
 * @param options - Options for link extraction
 * @returns Array of discovered absolute URLs
 */
export async function extractLinksFromPage(options: LinkExtractionOptions): Promise<string[]>

interface LinkExtractionOptions {
  url: string;
  linkSelector?: string;
  includePatterns?: string[];
  excludePatterns?: string[];
  userAgent?: string;
  timeout?: number;
}
```

### Markdown Parsing

```typescript
/**
 * Parses markdown content to extract structured information.
 * Extracts title, links, and metadata from markdown text.
 * 
 * @param markdown - Raw markdown content
 * @param url - Source URL of the content
 * @returns Structured page content object
 */
export function parseMarkdownContent(markdown: string, url: string): PageContent
```

## Strategies

### Creating Custom Strategies

```typescript
import { BaseStrategy } from '@stellarwp/archivist';
import type { StrategyResult } from '@stellarwp/archivist';

export class CustomStrategy extends BaseStrategy {
  type = 'custom';
  
  async execute(sourceUrl: string, config: any): Promise<StrategyResult> {
    // Custom URL discovery logic
    const urls = await this.discoverUrls(sourceUrl, config);
    
    return {
      urls: urls
    };
  }
  
  private async discoverUrls(url: string, config: any): Promise<string[]> {
    // Implementation
    return [];
  }
}

// Register the strategy
import { StrategyFactory } from '@stellarwp/archivist';
StrategyFactory.registerStrategy('custom', () => new CustomStrategy());
```

### Built-in Strategies

#### ExplorerStrategy
Default strategy that extracts all links from a single page.

```typescript
{
  "strategy": "explorer",
  "linkSelector": "a[href]",
  "includePatterns": ["*/docs/*"],
  "excludePatterns": ["*.pdf"]
}
```

#### PaginationStrategy
Handles paginated content across multiple pages.

```typescript
{
  "strategy": "pagination",
  "pagination": {
    "pagePattern": "https://blog.example.com/page/{page}",
    "startPage": 1,
    "maxPages": 10
  }
}
```

## Types and Interfaces

### Configuration Types

```typescript
interface ArchivistConfig {
  archives: ArchiveConfig[];
  crawl?: CrawlConfig;
  pure?: {
    apiKey?: string;
  };
}

interface ArchiveConfig {
  name: string;
  sources: SourceConfig | SourceConfig[];
  output: OutputConfig;
}

type SourceConfig = string | {
  url: string;
  name?: string;
  depth?: number;
  linkSelector?: string;
  includePatterns?: string[];
  excludePatterns?: string[];
  strategy?: 'explorer' | 'pagination';
  pagination?: PaginationConfig;
};

interface OutputConfig {
  directory: string;
  format?: 'markdown' | 'json' | 'html';
  fileNaming?: 'url-based' | 'title-based' | 'hash-based';
}

interface CrawlConfig {
  maxConcurrency?: number;
  delay?: number;
  userAgent?: string;
  timeout?: number;
  debug?: boolean;
}
```

### State Types

```typescript
interface CrawlResult {
  url: string;
  title: string;
  content: string;
  contentLength: number;
  links: string[];
  metadata?: any;
}

interface ArchiveState {
  archiveName: string;
  queue: string[];
  visited: string[];
  results: CrawlResult[];
  sourceMap: Map<string, SourceConfig>;
  paginationInfo: PaginationInfo[];
}

interface PaginationInfo {
  sourceUrl: string;
  pagesDiscovered: number;
  linksPerPage: Map<string, string[]>;
}
```

## Examples

### Basic Crawling

```typescript
import { initializeContainer, appContainer } from '@stellarwp/archivist';
import { WebCrawlerService, ConfigService } from '@stellarwp/archivist';

async function crawlWebsite() {
  // Initialize DI container
  initializeContainer();
  
  // Get services
  const configService = appContainer.resolve(ConfigService);
  const webCrawler = appContainer.resolve(WebCrawlerService);
  
  // Configure
  configService.initialize({
    archives: [{
      name: "Documentation",
      sources: {
        url: "https://docs.example.com",
        depth: 2,
        includePatterns: ["*/api/*", "*/guides/*"],
        excludePatterns: ["*.pdf", "*/deprecated/*"]
      },
      output: {
        directory: "./docs-archive",
        format: "markdown",
        fileNaming: "url-based"
      }
    }],
    crawl: {
      maxConcurrency: 3,
      delay: 1000,
      userAgent: "MyBot/1.0"
    }
  });
  
  // Collect and crawl
  await webCrawler.collectAllUrls();
  console.log(webCrawler.getCollectedLinksReport());
  
  await webCrawler.crawlAll({ clean: true });
}
```

### Custom Strategy Implementation

```typescript
import { BaseStrategy, StrategyFactory, appContainer } from '@stellarwp/archivist';
import { HttpService } from '@stellarwp/archivist';

class SitemapStrategy extends BaseStrategy {
  type = 'sitemap';
  
  async execute(sourceUrl: string, config: any): Promise<StrategyResult> {
    const httpService = appContainer.resolve(HttpService);
    
    // Fetch sitemap
    const response = await httpService.get(sourceUrl);
    const urls = this.parseSitemap(response.data);
    
    return { urls };
  }
  
  private parseSitemap(xml: string): string[] {
    // Parse XML and extract URLs
    const urlRegex = /<loc>(.*?)<\/loc>/g;
    const urls: string[] = [];
    let match;
    
    while ((match = urlRegex.exec(xml)) !== null) {
      urls.push(match[1]);
    }
    
    return urls;
  }
}

// Register and use
StrategyFactory.registerStrategy('sitemap', () => new SitemapStrategy());

// In config
{
  "sources": {
    "url": "https://example.com/sitemap.xml",
    "strategy": "sitemap"
  }
}
```

### Direct Service Usage

```typescript
import { initializeContainer, appContainer } from '@stellarwp/archivist';
import { ArchiveCrawlerService, StateService } from '@stellarwp/archivist';

async function crawlSpecificUrls(urls: string[]) {
  initializeContainer();
  
  const archiveCrawler = appContainer.resolve(ArchiveCrawlerService);
  const stateService = appContainer.resolve(StateService);
  
  // Initialize archive state
  const archiveName = "Custom Archive";
  stateService.initializeArchive(archiveName);
  
  // Add URLs to queue
  for (const url of urls) {
    stateService.addToQueue(archiveName, url);
  }
  
  // Get archive configuration
  const archive = {
    name: archiveName,
    sources: urls[0],
    output: {
      directory: "./custom-output",
      format: "json" as const,
      fileNaming: "hash-based" as const
    }
  };
  
  // Crawl
  const archiveState = stateService.getArchiveState(archiveName)!;
  await archiveCrawler.crawlUrls(archive, archiveState);
  
  // Save results
  const metadataPath = await archiveCrawler.saveResults(archive, archiveState);
  console.log(`Results saved to: ${metadataPath}`);
}
```

### Error Handling

```typescript
import { WebCrawlerService } from '@stellarwp/archivist';

async function safeCrawl() {
  try {
    const webCrawler = appContainer.resolve(WebCrawlerService);
    
    await webCrawler.collectAllUrls();
    
    const totalUrls = webCrawler.getTotalUrlCount();
    if (totalUrls > 1000) {
      console.warn(`Large number of URLs detected: ${totalUrls}`);
      // Implement your logic here
    }
    
    await webCrawler.crawlAll();
  } catch (error) {
    if (error.message.includes('Pure.md')) {
      console.error('Pure.md API error. Check your API key.');
    } else if (error.message.includes('timeout')) {
      console.error('Request timeout. Consider increasing the timeout setting.');
    } else {
      console.error('Crawling failed:', error);
    }
  }
}
```