import { BaseStrategy } from './base-strategy';
import { ExplorerStrategy } from './explorer-strategy';
import { PaginationStrategy } from './pagination-strategy';
import type { SourceStrategyType } from '../types/source-strategy';

/**
 * Factory for creating and managing source crawling strategies.
 * Implements singleton pattern for strategy instances.
 * 
 * @class StrategyFactory
 */
export class StrategyFactory {
  /** Registry of strategy factory functions */
  private static strategies: Map<SourceStrategyType, () => BaseStrategy> = new Map<SourceStrategyType, () => BaseStrategy>([
    ['explorer', () => new ExplorerStrategy()],
    ['pagination', () => new PaginationStrategy()],
  ]);
  
  /** Cache of strategy instances for reuse */
  private static instances: Map<SourceStrategyType, BaseStrategy> = new Map();
  
  /**
   * Gets a strategy instance by type.
   * Returns cached instance if available, otherwise creates new one.
   * 
   * @static
   * @param {SourceStrategyType} type - Type of strategy to get
   * @returns {BaseStrategy} Strategy instance
   * @throws {Error} If strategy type is unknown
   */
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
  
  /**
   * Registers a new strategy type with its factory function.
   * Allows extending the system with custom strategies.
   * 
   * @static
   * @param {SourceStrategyType} type - Strategy type identifier
   * @param {() => BaseStrategy} strategyFactory - Factory function that creates strategy instance
   * @returns {void}
   */
  static registerStrategy(type: SourceStrategyType, strategyFactory: () => BaseStrategy): void {
    this.strategies.set(type, strategyFactory);
  }
  
  /**
   * Clears all cached strategy instances.
   * Useful for testing or resetting state.
   * 
   * @static
   * @returns {void}
   */
  static clearInstances(): void {
    this.instances.clear();
  }
}