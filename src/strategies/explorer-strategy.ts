import { BaseStrategy } from './base-strategy';
import type { StrategyResult } from '../types/source-strategy';
import { extractLinksFromPage } from '../utils/link-extractor';

export class ExplorerStrategy extends BaseStrategy {
  type = 'explorer';
  
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