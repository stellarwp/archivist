import type { StrategyResult } from '../types/source-strategy';

/**
 * Abstract base class for source crawling strategies.
 * Provides common functionality for all strategy implementations.
 * 
 * @abstract
 * @class BaseStrategy
 */
export abstract class BaseStrategy {
  /** Strategy type identifier */
  abstract type: string;
  
  /**
   * Executes the strategy to collect URLs from a source.
   * Must be implemented by subclasses.
   * 
   * @abstract
   * @param {string} sourceUrl - The source URL to process
   * @param {any} config - Strategy-specific configuration
   * @returns {Promise<StrategyResult>} Result containing discovered URLs
   */
  abstract execute(sourceUrl: string, config: any): Promise<StrategyResult>;
  
  /**
   * Normalizes a URL by resolving it against a base URL.
   * Handles relative URLs and invalid URL formats.
   * 
   * @protected
   * @param {string} base - Base URL for resolution
   * @param {string} url - URL to normalize (can be relative)
   * @returns {string} Absolute URL or original if normalization fails
   */
  protected normalizeUrl(base: string, url: string): string {
    try {
      return new URL(url, base).href;
    } catch {
      return url;
    }
  }
  
  /**
   * Logs debug information if debug mode is enabled.
   * 
   * @protected
   * @param {any} config - Configuration object with debug flag
   * @param {...any} args - Arguments to log
   * @returns {void}
   */
  protected debug(config: any, ...args: any[]) {
    // Check if debug is enabled in the crawl config passed through
    if (config.debug) {
      console.log(`[DEBUG] [${this.type}]`, new Date().toISOString(), ...args);
    }
  }
}