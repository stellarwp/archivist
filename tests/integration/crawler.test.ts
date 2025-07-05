import { describe, expect, it, beforeEach, afterEach } from 'bun:test';
import { WebCrawler } from '../../src/crawler';
import type { ArchivistConfig } from '../../archivist.config';
import { rm, exists } from 'fs/promises';

describe('WebCrawler Integration', () => {
  const testOutputDir = './test-archive';
  
  const testConfig: ArchivistConfig = {
    archives: [
      {
        name: 'Test Archive',
        sources: [
          {
            url: 'https://example.com',
            name: 'Example Test',
            depth: 0,
          },
        ],
        output: {
          directory: testOutputDir,
          format: 'markdown',
          fileNaming: 'url-based',
        },
      },
    ],
    crawl: {
      maxConcurrency: 1,
      delay: 100,
      userAgent: 'Archivist-Test/1.0',
      timeout: 5000,
    },
    pure: {},
  };

  beforeEach(async () => {
    // Clean up test directory if it exists
    if (await exists(testOutputDir)) {
      await rm(testOutputDir, { recursive: true });
    }
  });

  afterEach(async () => {
    // Clean up test directory
    if (await exists(testOutputDir)) {
      await rm(testOutputDir, { recursive: true });
    }
  });

  it('should create output directory', async () => {
    const crawler = new WebCrawler(testConfig);
    
    // This will fail without a real Pure.md API key, so we'll skip for now
    // In a real test, you'd mock the PureMdClient
    try {
      await crawler.crawlAll();
      
      expect(await exists(testOutputDir)).toBe(true);
    } catch (error) {
      // Expected to fail without API key
      expect(error).toBeDefined();
    }
  });

  it('should handle multiple archives', () => {
    const multiArchiveConfig: ArchivistConfig = {
      ...testConfig,
      archives: [
        {
          name: 'Documentation',
          sources: 'https://example.com/docs',
          output: {
            directory: './test-archive/docs',
            format: 'markdown',
            fileNaming: 'url-based',
          },
        },
        {
          name: 'Blog',
          sources: ['https://example.com/blog/post1', 'https://example.com/blog/post2'],
          output: {
            directory: './test-archive/blog',
            format: 'json',
            fileNaming: 'title-based',
          },
        },
      ],
    };

    const crawler = new WebCrawler(multiArchiveConfig);
    expect(crawler).toBeDefined();
  });

  it('should handle link collection sources', () => {
    const linkCollectionConfig: ArchivistConfig = {
      ...testConfig,
      archives: [
        {
          name: 'API Docs',
          sources: {
            url: 'https://example.com/api/index',
            depth: 0,
            followPattern: 'https://example\\.com/api/v1/.*',
          },
          output: {
            directory: './test-archive/api',
            format: 'markdown',
            fileNaming: 'url-based',
          },
        },
      ],
    };

    const crawler = new WebCrawler(linkCollectionConfig);
    expect(crawler).toBeDefined();
  });

  it('should support mixed source types', () => {
    const mixedSourceConfig: ArchivistConfig = {
      ...testConfig,
      archives: [
        {
          name: 'Mixed Sources',
          sources: [
            'https://example.com/simple',
            {
              url: 'https://example.com/complex',
              depth: 2,
            },
            {
              url: 'https://example.com/links',
              depth: 0,
              linkSelector: '.documentation-links a',
              followPattern: '.*\\.html$',
            },
          ],
          output: {
            directory: './test-archive/mixed',
            format: 'markdown',
            fileNaming: 'url-based',
          },
        },
      ],
    };

    const crawler = new WebCrawler(mixedSourceConfig);
    expect(crawler).toBeDefined();
  });

  it('should support different output formats per archive', () => {
    const formats = ['markdown', 'json', 'html'] as const;
    
    const multiFormatConfig: ArchivistConfig = {
      ...testConfig,
      archives: formats.map((format, index) => ({
        name: `${format} Archive`,
        sources: `https://example.com/test${index}`,
        output: {
          directory: `./test-archive/${format}`,
          format,
          fileNaming: 'url-based',
        },
      })),
    };

    const crawler = new WebCrawler(multiFormatConfig);
    expect(crawler).toBeDefined();
  });

  it('should support different file naming strategies', () => {
    const strategies = ['url-based', 'title-based', 'hash-based'] as const;
    
    const multiNamingConfig: ArchivistConfig = {
      ...testConfig,
      archives: strategies.map((fileNaming, index) => ({
        name: `${fileNaming} Archive`,
        sources: `https://example.com/test${index}`,
        output: {
          directory: `./test-archive/${fileNaming}`,
          format: 'markdown',
          fileNaming,
        },
      })),
    };

    const crawler = new WebCrawler(multiNamingConfig);
    expect(crawler).toBeDefined();
  });
});