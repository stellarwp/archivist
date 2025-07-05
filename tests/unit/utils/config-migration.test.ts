import { describe, expect, it } from 'bun:test';
import { isLegacyConfig, migrateLegacyConfig } from '../../../src/utils/config-migration';

describe('config-migration', () => {
  describe('isLegacyConfig', () => {
    it('should identify legacy config format', () => {
      const legacyConfig = {
        sources: [
          {
            url: 'https://example.com',
            depth: 1,
          },
        ],
        output: {
          directory: './archive',
          format: 'markdown',
          fileNaming: 'url-based',
        },
        crawl: {
          maxConcurrency: 3,
          delay: 1000,
          userAgent: 'Archivist/1.0',
          timeout: 30000,
        },
      };

      expect(isLegacyConfig(legacyConfig)).toBe(true);
    });

    it('should identify new config format', () => {
      const newConfig = {
        archives: [
          {
            name: 'Test Archive',
            sources: 'https://example.com',
            output: {
              directory: './archive',
              format: 'markdown',
              fileNaming: 'url-based',
            },
          },
        ],
        crawl: {
          maxConcurrency: 3,
          delay: 1000,
          userAgent: 'Archivist/1.0',
          timeout: 30000,
        },
      };

      expect(isLegacyConfig(newConfig)).toBe(false);
    });

    it('should handle invalid configs', () => {
      expect(isLegacyConfig({})).toBe(false);
      expect(isLegacyConfig(null)).toBe(false);
      expect(isLegacyConfig(undefined)).toBe(false);
      expect(isLegacyConfig({ random: 'config' })).toBe(false);
    });
  });

  describe('migrateLegacyConfig', () => {
    it('should migrate simple legacy config', () => {
      const legacyConfig = {
        sources: [
          {
            url: 'https://example.com',
            name: 'Example',
            depth: 1,
          },
        ],
        output: {
          directory: './archive',
          format: 'markdown' as const,
          fileNaming: 'url-based' as const,
        },
        crawl: {
          maxConcurrency: 3,
          delay: 1000,
          userAgent: 'Archivist/1.0',
          timeout: 30000,
        },
        pure: {
          apiKey: 'test-key',
        },
      };

      const migrated = migrateLegacyConfig(legacyConfig);

      expect(migrated.archives).toHaveLength(1);
      expect(migrated.archives[0]?.name).toBe('Default Archive');
      expect(migrated.archives[0]?.output).toEqual(legacyConfig.output);
      // Check that sources are properly mapped with depth preserved
      expect(migrated.archives[0]?.sources).toEqual([
        {
          url: 'https://example.com',
          name: 'Example',
          depth: 1,
        },
      ]);
      expect(migrated.crawl).toEqual(legacyConfig.crawl);
      expect(migrated.pure).toEqual(legacyConfig.pure);
    });

    it('should handle legacy config without pure section', () => {
      const legacyConfig = {
        sources: [
          {
            url: 'https://example.com',
            depth: 0,
          },
        ],
        output: {
          directory: './out',
          format: 'json' as const,
          fileNaming: 'hash-based' as const,
        },
        crawl: {
          maxConcurrency: 1,
          delay: 2000,
          userAgent: 'Test/1.0',
          timeout: 10000,
        },
      };

      const migrated = migrateLegacyConfig(legacyConfig);

      expect(migrated.pure).toEqual({});
    });

    it('should preserve all source properties', () => {
      const legacyConfig = {
        sources: [
          {
            url: 'https://example.com/docs',
            name: 'Documentation',
            depth: 2,
          },
          {
            url: 'https://example.com/api',
            name: 'API Reference',
            depth: 1,
          },
        ],
        output: {
          directory: './docs-archive',
          format: 'markdown' as const,
          fileNaming: 'title-based' as const,
        },
        crawl: {
          maxConcurrency: 5,
          delay: 500,
          userAgent: 'DocCrawler/1.0',
          timeout: 60000,
        },
        pure: {
          apiKey: 'api-key-123',
        },
      };

      const migrated = migrateLegacyConfig(legacyConfig);

      // Sources should be preserved with depth values
      expect(migrated.archives[0]?.sources).toEqual([
        {
          url: 'https://example.com/docs',
          name: 'Documentation',
          depth: 2,
        },
        {
          url: 'https://example.com/api',
          name: 'API Reference',
          depth: 1,
        },
      ]);
    });

    it('should migrate selector to linkSelector in sources', () => {
      const legacyConfig = {
        sources: [
          {
            url: 'https://example.com',
            name: 'Example',
            depth: 1,
            selector: '.content a',
          },
        ],
        output: {
          directory: './archive',
          format: 'markdown' as const,
          fileNaming: 'url-based' as const,
        },
        crawl: {
          maxConcurrency: 3,
          delay: 1000,
          userAgent: 'Archivist/1.0',
          timeout: 30000,
        },
      };

      const migrated = migrateLegacyConfig(legacyConfig);

      expect(migrated.archives[0]?.sources).toEqual([
        {
          url: 'https://example.com',
          name: 'Example',
          depth: 1,
          linkSelector: '.content a',
        },
      ]);
    });
  });
});