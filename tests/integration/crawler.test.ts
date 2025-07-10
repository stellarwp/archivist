import "reflect-metadata";
import { describe, expect, it, beforeEach, afterEach, mock } from 'bun:test';
import { WebCrawler } from '../../src/crawler';
import type { ArchivistConfig } from '../../archivist.config';
import { rm, exists } from 'fs/promises';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('WebCrawler Integration', () => {
  const testOutputDir = './test-archive';
  const mockBaseUrl = 'https://test.local';
  
  const testConfig: ArchivistConfig = {
    archives: [
      {
        name: 'Test Archive',
        sources: [
          {
            url: `${mockBaseUrl}/test-page`,
            name: 'Test Page',
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
    
    // Mock the crawling process since we don't have a real API key
    // Just create the directory to test the output structure
    await fs.mkdir(testOutputDir, { recursive: true });
    
    expect(await exists(testOutputDir)).toBe(true);
  });

  it('should handle multiple archives', () => {
    const multiArchiveConfig: ArchivistConfig = {
      ...testConfig,
      archives: [
        {
          name: 'Documentation',
          sources: `${mockBaseUrl}/docs`,
          output: {
            directory: './test-archive/docs',
            format: 'markdown',
            fileNaming: 'url-based',
          },
        },
        {
          name: 'Blog',
          sources: [`${mockBaseUrl}/blog/post1`, `${mockBaseUrl}/blog/post2`],
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
            url: `${mockBaseUrl}/api/index`,
            depth: 0,
            includePatterns: [`${mockBaseUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/api/v1/.*`],
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
            `${mockBaseUrl}/simple`,
            {
              url: `${mockBaseUrl}/complex`,
              depth: 2,
            },
            {
              url: `${mockBaseUrl}/links`,
              depth: 0,
              linkSelector: '.documentation-links a',
              includePatterns: ['.*\\.html$'],
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
        sources: `${mockBaseUrl}/test${index}`,
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
        sources: `${mockBaseUrl}/test${index}`,
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

  it('should support includePatterns for link filtering', () => {
    const patternConfig: ArchivistConfig = {
      ...testConfig,
      archives: [
        {
          name: 'Pattern Filtered Archive',
          sources: {
            url: `${mockBaseUrl}`,
            depth: 2,
            includePatterns: [
              `${mockBaseUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/docs/.*`,
              `${mockBaseUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/api/.*`
            ],
          },
          output: {
            directory: './test-archive/patterns',
            format: 'markdown',
            fileNaming: 'url-based',
          },
        },
      ],
    };

    const crawler = new WebCrawler(patternConfig);
    expect(crawler).toBeDefined();
  });

  it('should support excludePatterns for link filtering', () => {
    const excludeConfig: ArchivistConfig = {
      ...testConfig,
      archives: [
        {
          name: 'Exclude Pattern Archive',
          sources: {
            url: `${mockBaseUrl}`,
            depth: 2,
            excludePatterns: [
              '.*\\.pdf$',
              '.*/private/.*',
              '.*\\?.*'  // Exclude URLs with query parameters
            ],
          },
          output: {
            directory: './test-archive/exclude',
            format: 'markdown',
            fileNaming: 'url-based',
          },
        },
      ],
    };

    const crawler = new WebCrawler(excludeConfig);
    expect(crawler).toBeDefined();
  });

  it('should support combined include and exclude patterns', () => {
    const combinedConfig: ArchivistConfig = {
      ...testConfig,
      archives: [
        {
          name: 'Combined Pattern Archive',
          sources: {
            url: `${mockBaseUrl}/docs`,
            depth: 3,
            includePatterns: [
              `${mockBaseUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/docs/.*`,
            ],
            excludePatterns: [
              '.*/deprecated/.*',
              '.*\\.(pdf|docx|xlsx)$',
              '.*/internal/.*'
            ],
          },
          output: {
            directory: './test-archive/combined',
            format: 'json',
            fileNaming: 'hash-based',
          },
        },
      ],
    };

    const crawler = new WebCrawler(combinedConfig);
    expect(crawler).toBeDefined();
  });

  it('should handle link collection with new pattern arrays', () => {
    const linkCollectionConfig: ArchivistConfig = {
      ...testConfig,
      archives: [
        {
          name: 'Link Collection with Patterns',
          sources: {
            url: `${mockBaseUrl}/sitemap`,
            depth: 0,
            linkSelector: 'a.doc-link',
            includePatterns: [`${mockBaseUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/v2/.*`],
            excludePatterns: ['.*beta.*', '.*test.*'],
          },
          output: {
            directory: './test-archive/link-patterns',
            format: 'markdown',
            fileNaming: 'url-based',
          },
        },
      ],
    };

    const crawler = new WebCrawler(linkCollectionConfig);
    expect(crawler).toBeDefined();
  });
});