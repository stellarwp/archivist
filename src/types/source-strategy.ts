export type SourceStrategyType = 'explorer' | 'pagination';

export interface PaginationConfig {
  startPage?: number;
  maxPages?: number;
  pageParam?: string;
  pagePattern?: string;
  nextLinkSelector?: string;
}

export interface StrategyResult {
  urls: string[];
  nextPageUrl?: string;
}

export interface SourceStrategy {
  type: SourceStrategyType;
  execute(sourceUrl: string, config: any): Promise<StrategyResult>;
}