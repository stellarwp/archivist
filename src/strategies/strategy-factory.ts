import { BaseStrategy } from './base-strategy';
import { ExplorerStrategy } from './explorer-strategy';
import { PaginationStrategy } from './pagination-strategy';
import type { SourceStrategyType } from '../types/source-strategy';

export class StrategyFactory {
  private static strategies: Map<SourceStrategyType, () => BaseStrategy> = new Map<SourceStrategyType, () => BaseStrategy>([
    ['explorer', () => new ExplorerStrategy()],
    ['pagination', () => new PaginationStrategy()],
  ]);
  
  private static instances: Map<SourceStrategyType, BaseStrategy> = new Map();
  
  static getStrategy(type: SourceStrategyType): BaseStrategy {
    // Check if we already have an instance
    let instance = this.instances.get(type);
    if (instance) {
      return instance;
    }
    
    // Create new instance
    const strategyFactory = this.strategies.get(type);
    if (!strategyFactory) {
      throw new Error(`Unknown strategy type: ${type}`);
    }
    
    instance = strategyFactory();
    this.instances.set(type, instance);
    return instance;
  }
  
  static registerStrategy(type: SourceStrategyType, strategyFactory: () => BaseStrategy): void {
    this.strategies.set(type, strategyFactory);
  }
  
  static clearInstances(): void {
    this.instances.clear();
  }
}