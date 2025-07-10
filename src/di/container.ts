import 'reflect-metadata';
import { container } from 'tsyringe';
import { ConfigService } from '../services/config.service';
import { StateService } from '../services/state.service';
import { LoggerService } from '../services/logger.service';
import { HttpService } from '../services/http.service';
import { PureMdClient } from '../services/pure-md';
import { LinkDiscoverer } from '../services/link-discoverer';
import { ArchiveCrawlerService } from '../services/archive-crawler.service';
import { WebCrawlerService } from '../services/web-crawler.service';

// Export the global container instance
export const appContainer = container;

// Initialize the container
export function initializeContainer(): void {
  // Register singleton services
  appContainer.registerSingleton(ConfigService);
  appContainer.registerSingleton(StateService);
  appContainer.registerSingleton(LoggerService);
  appContainer.registerSingleton(HttpService);
  appContainer.registerSingleton(PureMdClient);
  appContainer.registerSingleton(LinkDiscoverer);
  appContainer.registerSingleton(ArchiveCrawlerService);
  appContainer.registerSingleton(WebCrawlerService);
}

// Helper function to reset container for testing
export function resetContainer(): void {
  appContainer.clearInstances();
}