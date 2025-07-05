import type { ArchivistConfig } from '../../archivist.config';

interface LegacyConfig {
  sources: Array<{
    url: string;
    name?: string;
    depth?: number;
    selector?: string;
  }>;
  output: {
    directory: string;
    format: 'markdown' | 'html' | 'json';
    fileNaming: 'url-based' | 'title-based' | 'hash-based';
  };
  crawl: {
    maxConcurrency: number;
    delay: number;
    userAgent: string;
    timeout: number;
  };
  pure?: {
    apiKey?: string;
  };
}

export function isLegacyConfig(config: any): config is LegacyConfig {
  if (!config || typeof config !== 'object') {
    return false;
  }
  return !!(config.sources && config.output && !config.archives);
}

export function migrateLegacyConfig(legacy: LegacyConfig): ArchivistConfig {
  console.log('Migrating legacy configuration format to new format...');
  
  // Map legacy sources to new format
  const mappedSources = legacy.sources.map(source => {
    const { selector, depth, ...rest } = source;
    const newSource: any = {
      ...rest,
      depth: depth ?? 0, // Provide default depth if not specified
    };
    if (selector) {
      newSource.linkSelector = selector;
    }
    return newSource;
  });
  
  return {
    archives: [{
      name: 'Default Archive',
      sources: mappedSources,
      output: legacy.output,
    }],
    crawl: legacy.crawl,
    pure: legacy.pure || {},
  };
}