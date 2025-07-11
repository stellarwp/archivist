import { singleton } from 'tsyringe';
import type { ArchivistConfig } from '../config/schema';
import { resolvePureApiKey } from '../utils/pure-api-key';

/**
 * Service for managing and accessing application configuration.
 * Provides centralized access to all configuration settings.
 * 
 * @class ConfigService
 * @singleton
 */
@singleton()
export class ConfigService {
  /** The loaded configuration object */
  private config: ArchivistConfig | null = null;
  /** Path to the configuration file */
  private configPath: string | null = null;
  
  /**
   * Initializes the configuration service with loaded config.
   * Must be called before any other methods.
   * 
   * @param {ArchivistConfig} config - The configuration object
   * @param {string} [configPath] - Optional path to the config file
   * @returns {void}
   */
  initialize(config: ArchivistConfig, configPath?: string): void {
    this.config = config;
    this.configPath = configPath || null;
  }
  
  /**
   * Returns the complete configuration object.
   * 
   * @returns {ArchivistConfig} The configuration object
   * @throws {Error} If configuration not initialized
   */
  getConfig(): ArchivistConfig {
    if (!this.config) {
      throw new Error('Configuration not initialized. Call ConfigService.initialize() first.');
    }
    return this.config;
  }
  
  /**
   * Returns the path to the configuration file.
   * 
   * @returns {string | null} Config file path or null if not set
   */
  getConfigPath(): string | null {
    return this.configPath;
  }
  
  /**
   * Returns all configured archives.
   * 
   * @returns {ArchiveConfig[]} Array of archive configurations
   */
  getArchives() {
    return this.getConfig().archives;
  }
  
  /**
   * Returns crawl-specific configuration.
   * 
   * @returns {CrawlConfig} Crawl configuration with defaults
   */
  getCrawlConfig() {
    return this.getConfig().crawl || {};
  }
  
  /**
   * Returns the Pure.md API key from config or environment.
   * Checks config first, then falls back to environment variable.
   * 
   * @returns {string | undefined} API key or undefined if not set
   */
  getPureApiKey(): string | undefined {
    const config = this.getConfig();
    return resolvePureApiKey(config);
  }
  
  /**
   * Checks if debug mode is enabled.
   * 
   * @returns {boolean} True if debug mode is enabled
   */
  isDebugMode(): boolean {
    return this.getCrawlConfig().debug || false;
  }
  
  /**
   * Returns the user agent string for HTTP requests.
   * 
   * @returns {string} User agent string with default fallback
   */
  getUserAgent(): string {
    return this.getCrawlConfig().userAgent || 'Archivist/0.1.0-beta.6';
  }
  
  /**
   * Returns maximum concurrent requests allowed.
   * 
   * @returns {number} Max concurrency with default of 3
   */
  getMaxConcurrency(): number {
    return this.getCrawlConfig().maxConcurrency || 3;
  }
  
  /**
   * Returns delay between requests in milliseconds.
   * 
   * @returns {number} Delay in ms with default of 1000
   */
  getDelay(): number {
    return this.getCrawlConfig().delay || 1000;
  }
  
  /**
   * Returns HTTP request timeout in milliseconds.
   * 
   * @returns {number} Timeout in ms with default of 30000
   */
  getTimeout(): number {
    return this.getCrawlConfig().timeout || 30000;
  }
  
  /**
   * Updates configuration with partial updates.
   * Useful for CLI overrides and runtime modifications.
   * 
   * @param {Partial<ArchivistConfig>} updates - Partial config to merge
   * @returns {void}
   * @throws {Error} If configuration not initialized
   */
  updateConfig(updates: Partial<ArchivistConfig>): void {
    if (!this.config) {
      throw new Error('Configuration not initialized');
    }
    this.config = { ...this.config, ...updates };
  }
}