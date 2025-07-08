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
}