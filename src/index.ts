// Export DI container and services
export { appContainer, initializeContainer, resetContainer } from './di/container';
export { ConfigService } from './services/config.service';
export { StateService } from './services/state.service';
export { LoggerService } from './services/logger.service';
export { HttpService } from './services/http.service';
export { PureMdClient } from './services/pure-md';
export { LinkDiscoverer } from './services/link-discoverer';
export { ArchiveCrawlerService } from './services/archive-crawler.service';
export { WebCrawlerService } from './services/web-crawler.service';

// Export existing functionality for backward compatibility
export { WebCrawler } from './crawler';
export type { ArchivistConfig, ArchiveConfig, SourceConfig } from '../archivist.config';