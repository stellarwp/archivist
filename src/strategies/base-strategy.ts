import type { StrategyResult } from '../types/source-strategy';

export abstract class BaseStrategy {
  abstract type: string;
  
  abstract execute(sourceUrl: string, config: any): Promise<StrategyResult>;
  
  protected normalizeUrl(base: string, url: string): string {
    try {
      return new URL(url, base).href;
    } catch {
      return url;
    }
  }
  
  protected debug(config: any, ...args: any[]) {
    // Check if debug is enabled in the crawl config passed through
    if (config.debug) {
      console.log(`[DEBUG] [${this.type}]`, new Date().toISOString(), ...args);
    }
  }
}