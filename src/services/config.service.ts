import { singleton } from 'tsyringe';
import type { ArchivistConfig } from '../../archivist.config';
import { resolvePureApiKey } from '../utils/pure-api-key';

@singleton()
export class ConfigService {
  private config: ArchivistConfig | null = null;
  private configPath: string | null = null;
  
  initialize(config: ArchivistConfig, configPath?: string): void {
    this.config = config;
    this.configPath = configPath || null;
  }
  
  getConfig(): ArchivistConfig {
    if (!this.config) {
      throw new Error('Configuration not initialized. Call ConfigService.initialize() first.');
    }
    return this.config;
  }
  
  getConfigPath(): string | null {
    return this.configPath;
  }
  
  getArchives() {
    return this.getConfig().archives;
  }
  
  getCrawlConfig() {
    return this.getConfig().crawl || {};
  }
  
  getPureApiKey(): string | undefined {
    const config = this.getConfig();
    return resolvePureApiKey(config);
  }
  
  isDebugMode(): boolean {
    return this.getCrawlConfig().debug || false;
  }
  
  getUserAgent(): string {
    return this.getCrawlConfig().userAgent || 'Archivist/0.1.0-beta.6';
  }
  
  getMaxConcurrency(): number {
    return this.getCrawlConfig().maxConcurrency || 3;
  }
  
  getDelay(): number {
    return this.getCrawlConfig().delay || 1000;
  }
  
  getTimeout(): number {
    return this.getCrawlConfig().timeout || 30000;
  }
  
  // Update config (useful for CLI overrides)
  updateConfig(updates: Partial<ArchivistConfig>): void {
    if (!this.config) {
      throw new Error('Configuration not initialized');
    }
    this.config = { ...this.config, ...updates };
  }
}