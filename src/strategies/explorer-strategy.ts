import { BaseStrategy } from './base-strategy';
import type { StrategyResult } from '../types/source-strategy';
import { extractLinksFromPage } from '../utils/link-extractor';

/**
 * Strategy for exploring a single page and extracting all links.
 * Default strategy that extracts links from a page using CSS selectors.
 * 
 * @class ExplorerStrategy
 * @extends BaseStrategy
 */
export class ExplorerStrategy extends BaseStrategy {
  /** Strategy type identifier */
  type = 'explorer';
  
  /**
   * Executes the explorer strategy to extract links from a single page.
   * 
   * @param {string} sourceUrl - URL to extract links from
   * @param {Object} config - Configuration options
   * @param {string} [config.linkSelector='a[href]'] - CSS selector for links
   * @param {string[]} [config.includePatterns] - Patterns links must match
   * @param {string[]} [config.excludePatterns] - Patterns that exclude links
   * @returns {Promise<StrategyResult>} Result containing discovered links
   */
  async execute(sourceUrl: string, config: any): Promise<StrategyResult> {
    const links = await extractLinksFromPage({
      url: sourceUrl,
      linkSelector: config.linkSelector || 'a[href]',
      includePatterns: config.includePatterns,
      excludePatterns: config.excludePatterns,
    });
    
    return {
      urls: links,
    };
  }
}