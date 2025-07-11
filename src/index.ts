/**
 * @module @stellarwp/archivist
 * @description Web content archiver built with Bun and TypeScript
 */

// Import reflect-metadata at the very beginning
import 'reflect-metadata';

// Export DI container and services
export { appContainer, initializeContainer, resetContainer } from './di/container';

// Export core services
export { ConfigService } from './services/config.service';
export { StateService, type CrawlResult, type ArchiveState, type GlobalCrawlState } from './services/state.service';
export { LoggerService } from './services/logger.service';
export { HttpService } from './services/http.service';
export { PureMdClient } from './services/pure-md';
export { LinkDiscoverer } from './services/link-discoverer';
export { ArchiveCrawlerService } from './services/archive-crawler.service';
export { WebCrawlerService } from './services/web-crawler.service';

// Export strategies
export { BaseStrategy } from './strategies/base-strategy';
export { ExplorerStrategy } from './strategies/explorer-strategy';
export { PaginationStrategy } from './strategies/pagination-strategy';
export { StrategyFactory } from './strategies/strategy-factory';

// Export utilities
export { formatContent, formatAsMarkdown, formatAsJson, formatAsHtml, type PageContent } from './utils/content-formatter';
export { generateFileName, sanitizeFilename, urlToFilename, titleToFilename, hashFilename } from './utils/file-naming';
export { shouldIncludeUrl, matchesPattern, normalizePattern } from './utils/pattern-matcher';
export { extractLinksFromPage, type LinkExtractionOptions } from './utils/link-extractor';
export { parseMarkdownContent } from './utils/markdown-parser';
export { resolvePureApiKey } from './utils/pure-api-key';
export { getAxiosConfig } from './utils/axios-config';

// Export types
export type { StrategyResult, SourceStrategyType } from './types/source-strategy';
export type { ArchivistConfig, ArchiveConfig, SourceConfig, OutputConfig, CrawlConfig, PaginationConfig } from './config/schema';

// Export existing functionality for backward compatibility
export { WebCrawler } from './crawler';

// Export version info
export { VERSION, DEFAULT_USER_AGENT } from './version';