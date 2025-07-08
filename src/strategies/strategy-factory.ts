import { BaseStrategy } from './base-strategy';
import { ExplorerStrategy } from './explorer-strategy';
import { PaginationStrategy } from './pagination-strategy';
import type { SourceStrategyType } from '../types/source-strategy';

export class StrategyFactory {
  private static strategies: Map<SourceStrategyType, BaseStrategy> = new Map([
    ['explorer', new ExplorerStrategy()],
    ['pagination', new PaginationStrategy()],
  ]);
  
  static getStrategy(type: SourceStrategyType): BaseStrategy {
    const strategy = this.strategies.get(type);
    if (!strategy) {
      throw new Error(`Unknown strategy type: ${type}`);
    }
    return strategy;
  }
  
  static registerStrategy(type: SourceStrategyType, strategy: BaseStrategy): void {
    this.strategies.set(type, strategy);
  }
}