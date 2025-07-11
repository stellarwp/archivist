import "reflect-metadata";
import { describe, expect, it, beforeEach, afterEach, spyOn } from 'bun:test';
import { readFileSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { WebCrawler } from '../../src/crawler';
import { startMockServer } from '../helpers/mock-server';
import type { ArchivistConfig } from '../../archivist.config';

describe('Source Strategies Integration', () => {
  let mockServerUrl: string;
  let stopServer: () => void;
  let consoleErrorSpy: any;
  const testOutputDir = join(__dirname, '../test-output');
  
  beforeEach(async () => {
    // Start mock server
    const { url, stop } = await startMockServer();
    mockServerUrl = url;
    stopServer = stop;
    
    // Clean up any existing test output
    if (existsSync(testOutputDir)) {
      rmSync(testOutputDir, { recursive: true, force: true });
    }
    
    // Suppress console.error for expected 404 errors
    consoleErrorSpy = spyOn(console, 'error').mockImplementation(() => {});
  });
  
  afterEach(() => {
    stopServer();
    // Clean up test output
    if (existsSync(testOutputDir)) {
      rmSync(testOutputDir, { recursive: true, force: true });
    }
    // Restore console.error
    consoleErrorSpy?.mockRestore();
  });
  
  describe('Explorer Strategy', () => {
    it('should extract links from a page using explorer strategy', async () => {
      const config: ArchivistConfig = {
        archives: [{
          name: 'Explorer Test',
          sources: {
            url: `${mockServerUrl}/link-page`,
            strategy: 'explorer',
            linkSelector: 'a.article-link',
            includePatterns: ['/article/'],
          },
          output: {
            directory: testOutputDir,
            format: 'json',
            fileNaming: 'url-based',
          },
        }],
        crawl: {
          maxConcurrency: 1,
          delay: 100,
          userAgent: 'Archivist Test',
          timeout: 5000,
        },
      };
      
      const crawler = new WebCrawler(config);
      await crawler.crawlAll();
      
      // Check that files were created
      const metadataPath = join(testOutputDir, 'archivist-metadata.json');
      expect(existsSync(metadataPath)).toBe(true);
      
      const metadata = JSON.parse(readFileSync(metadataPath, 'utf-8'));
      expect(metadata.archiveName).toBe('Explorer Test');
      expect(metadata.results.length).toBeGreaterThan(0);
      
      // Verify that only article links were crawled
      const crawledUrls = metadata.results.map((r: any) => r.url);
      for (const url of crawledUrls) {
        expect(url).toContain('/article/');
      }
    });
  });
  
  describe('Pagination Strategy', () => {
    it('should follow pagination using pattern-based approach', async () => {
      const config: ArchivistConfig = {
        archives: [{
          name: 'Pagination Pattern Test',
          sources: {
            url: `${mockServerUrl}/posts`,
            strategy: 'pagination',
            pagination: {
              pagePattern: `${mockServerUrl}/posts?page={page}`,
              startPage: 1,
              maxPages: 3,
            },
          },
          output: {
            directory: testOutputDir,
            format: 'json',
            fileNaming: 'url-based',
          },
        }],
        crawl: {
          maxConcurrency: 1,
          delay: 100,
          userAgent: 'Archivist Test',
          timeout: 5000,
        },
      };
      
      const crawler = new WebCrawler(config);
      await crawler.crawlAll();
      
      const metadataPath = join(testOutputDir, 'archivist-metadata.json');
      const metadata = JSON.parse(readFileSync(metadataPath, 'utf-8'));
      
      // Should have crawled posts extracted from paginated pages
      // Pattern-based pagination extracts from pages 1-3 (3 posts per page = 9 posts)
      expect(metadata.results.length).toBeGreaterThanOrEqual(9);
      
      const crawledUrls = metadata.results.map((r: any) => r.url);
      // Check that we have posts from different pages
      expect(crawledUrls).toContain(`${mockServerUrl}/post/4`); // From page 1
      expect(crawledUrls).toContain(`${mockServerUrl}/post/7`); // From page 2
      expect(crawledUrls).toContain(`${mockServerUrl}/post/10`); // From page 3
    });
    
    it('should follow pagination using next link selector', async () => {
      const config: ArchivistConfig = {
        archives: [{
          name: 'Pagination Next Link Test',
          sources: {
            url: `${mockServerUrl}/blog/page/1`,
            strategy: 'pagination',
            pagination: {
              nextLinkSelector: 'a.next-page',
              maxPages: 3,
            },
          },
          output: {
            directory: testOutputDir,
            format: 'json',
            fileNaming: 'url-based',
          },
        }],
        crawl: {
          maxConcurrency: 1,
          delay: 100,
          userAgent: 'Archivist Test',
          timeout: 5000,
        },
      };
      
      const crawler = new WebCrawler(config);
      await crawler.crawlAll();
      
      const metadataPath = join(testOutputDir, 'archivist-metadata.json');
      const metadata = JSON.parse(readFileSync(metadataPath, 'utf-8'));
      
      // Should have followed the pagination chain and extracted blog posts
      // Next link pagination extracts posts + next page links
      const crawledUrls = metadata.results.map((r: any) => r.url);
      
      // Should have at least 8 results (posts + next page links)
      expect(metadata.results.length).toBeGreaterThanOrEqual(8);
      
      // Should contain blog posts from pages 1-3
      expect(crawledUrls.filter(url => url.includes('/blog/post/')).length).toBeGreaterThanOrEqual(6);
      
      // Verify blog posts were crawled from different pages
      expect(crawledUrls).toContain(`${mockServerUrl}/blog/post/1`);  // From page 1
      expect(crawledUrls).toContain(`${mockServerUrl}/blog/post/4`); // From page 2
      expect(crawledUrls).toContain(`${mockServerUrl}/blog/post/6`); // From page 2
    }, 10000); // 10 second timeout
  });
  
  describe('Mixed Strategies', () => {
    it('should handle multiple sources with different strategies', async () => {
      const config: ArchivistConfig = {
        archives: [{
          name: 'Mixed Strategies Test',
          sources: [
            // Simple string source
            `${mockServerUrl}/about`,
            // Explorer strategy source
            {
              url: `${mockServerUrl}/categories`,
              strategy: 'explorer',
              linkSelector: 'a.category-link',
            },
            // Pagination strategy source
            {
              url: `${mockServerUrl}/archive`,
              strategy: 'pagination',
              pagination: {
                pageParam: 'p',
                maxPages: 2,
              },
            },
          ],
          output: {
            directory: testOutputDir,
            format: 'json',
            fileNaming: 'url-based',
          },
        }],
        crawl: {
          maxConcurrency: 2,
          delay: 100,
          userAgent: 'Archivist Test',
          timeout: 5000,
        },
      };
      
      const crawler = new WebCrawler(config);
      await crawler.crawlAll();
      
      const metadataPath = join(testOutputDir, 'archivist-metadata.json');
      const metadata = JSON.parse(readFileSync(metadataPath, 'utf-8'));
      
      const crawledUrls = metadata.results.map((r: any) => r.url);
      
      // Should have crawled:
      // - About page (1)
      // - Category pages from explorer strategy (2)
      // - Archive posts from pagination strategy (2 pages × 3 posts = 6)
      // Total: 1 + 2 + 6 = 9
      expect(crawledUrls).toContain(`${mockServerUrl}/about`);
      expect(crawledUrls).toContain(`${mockServerUrl}/category/tech`);
      expect(crawledUrls).toContain(`${mockServerUrl}/category/science`);
      expect(crawledUrls.some((url: string) => url.includes('/archive/post/'))).toBe(true);
      expect(metadata.results.length).toBeGreaterThanOrEqual(9);
    });
  });
  
  describe('Advanced Pagination Examples', () => {
    it('should handle e-commerce pagination with custom page parameter', async () => {
      const config: ArchivistConfig = {
        archives: [{
          name: 'E-commerce Products',
          sources: {
            url: `${mockServerUrl}/shop/electronics`,
            strategy: 'pagination',
            pagination: {
              pageParam: 'p',
              startPage: 1,
              maxPages: 3,
            },
          },
          output: {
            directory: testOutputDir,
            format: 'json',
            fileNaming: 'url-based',
          },
        }],
        crawl: {
          maxConcurrency: 1,
          delay: 50,
          userAgent: 'Archivist Test',
          timeout: 5000,
        },
      };
      
      const crawler = new WebCrawler(config);
      await crawler.crawlAll();
      
      const metadataPath = join(testOutputDir, 'archivist-metadata.json');
      const metadata = JSON.parse(readFileSync(metadataPath, 'utf-8'));
      
      // Pagination strategy extracts product links from pages
      // 4 pages (source + 3 paginated) × 4 products per page = 16 products
      // Plus navigation links
      expect(metadata.results.length).toBeGreaterThanOrEqual(12);
      const urls = metadata.results.map((r: any) => r.url);
      expect(urls).toContain(`${mockServerUrl}/product/1`);  // From page 1
      expect(urls).toContain(`${mockServerUrl}/product/5`); // From page 2
      expect(urls).toContain(`${mockServerUrl}/product/9`); // From page 3
    });
    
    it('should handle documentation with section-based pagination', async () => {
      const config: ArchivistConfig = {
        archives: [{
          name: 'Documentation Guides',
          sources: {
            url: `${mockServerUrl}/docs/guides`,
            strategy: 'pagination',
            pagination: {
              pageParam: 'section',
              startPage: 1,
              maxPages: 3,
            },
          },
          output: {
            directory: testOutputDir,
            format: 'markdown',
            fileNaming: 'url-based',
          },
        }],
        crawl: {
          maxConcurrency: 1,
          delay: 50,
          userAgent: 'Archivist Test',
          timeout: 5000,
        },
      };
      
      const crawler = new WebCrawler(config);
      await crawler.crawlAll();
      
      const metadataPath = join(testOutputDir, 'archivist-metadata.json');
      const metadata = JSON.parse(readFileSync(metadataPath, 'utf-8'));
      
      // Should have extracted guide links from all sections
      // 4 pages (source + 3 sections) × 3 guides per page = 12 guides
      // Plus navigation links
      expect(metadata.results.length).toBeGreaterThanOrEqual(9);
      const urls = metadata.results.map((r: any) => r.url);
      expect(urls).toContain(`${mockServerUrl}/docs/guide/1`);  // From source
      expect(urls).toContain(`${mockServerUrl}/docs/guide/4`);  // From section 1
      expect(urls).toContain(`${mockServerUrl}/docs/guide/7`); // From section 2
    });
    
    it('should handle load more button pagination', async () => {
      const config: ArchivistConfig = {
        archives: [{
          name: 'News Articles',
          sources: {
            url: `${mockServerUrl}/news/latest`,
            strategy: 'pagination',
            pagination: {
              nextLinkSelector: 'a.load-more-link',
              maxPages: 3,
            },
          },
          output: {
            directory: testOutputDir,
            format: 'markdown',
            fileNaming: 'title-based',
          },
        }],
        crawl: {
          maxConcurrency: 1,
          delay: 50,
          userAgent: 'Archivist Test',
          timeout: 5000,
        },
      };
      
      const crawler = new WebCrawler(config);
      await crawler.crawlAll();
      
      const metadataPath = join(testOutputDir, 'archivist-metadata.json');
      const metadata = JSON.parse(readFileSync(metadataPath, 'utf-8'));
      
      // Should follow load more links and extract article links
      // With maxPages: 3, it will load: 4, 8, 12 articles (increments of 4)
      // Total unique articles: 12 (since each page shows cumulative articles)
      // However, the load more link itself is not extracted as a result
      expect(metadata.results.length).toBeGreaterThanOrEqual(10);
      const urls = metadata.results.map((r: any) => r.url);
      expect(urls).toContain(`${mockServerUrl}/news/article/1`);
      expect(urls).toContain(`${mockServerUrl}/news/article/8`);  // With maxPages: 3, loads up to 8 articles
    });
    
    it('should handle infinite scroll with fallback links', async () => {
      const config: ArchivistConfig = {
        archives: [{
          name: 'Photo Gallery',
          sources: {
            url: `${mockServerUrl}/gallery/photos`,
            strategy: 'pagination',
            pagination: {
              nextLinkSelector: '#infinite-scroll-next, .next-batch',
              maxPages: 3,
            },
          },
          output: {
            directory: testOutputDir,
            format: 'json',
            fileNaming: 'hash-based',
          },
        }],
        crawl: {
          maxConcurrency: 1,
          delay: 50,
          userAgent: 'Archivist Test',
          timeout: 5000,
        },
      };
      
      const crawler = new WebCrawler(config);
      await crawler.crawlAll();
      
      const metadataPath = join(testOutputDir, 'archivist-metadata.json');
      const metadata = JSON.parse(readFileSync(metadataPath, 'utf-8'));
      
      // Should extract photo links from all batches
      // The pagination extracts links during discovery phase
      // With next link pagination, we get 8 unique photo links
      expect(metadata.results.length).toBeGreaterThanOrEqual(8);
      const urls = metadata.results.map((r: any) => r.url);
      expect(urls).toContain(`${mockServerUrl}/photo/1`);  // From batch 1
      expect(urls).toContain(`${mockServerUrl}/photo/4`); // From batch 2
      expect(urls).toContain(`${mockServerUrl}/photo/6`); // From batch 2
    });
    
    it('should handle complex pattern with path segments', async () => {
      const config: ArchivistConfig = {
        archives: [{
          name: 'Blog Archive by Date',
          sources: {
            url: `${mockServerUrl}/blog/2024/01`,
            strategy: 'pagination',
            pagination: {
              pagePattern: `${mockServerUrl}/blog/2024/01/page/{page}`,
              startPage: 1,
              maxPages: 3,
            },
          },
          output: {
            directory: testOutputDir,
            format: 'markdown',
            fileNaming: 'url-based',
          },
        }],
        crawl: {
          maxConcurrency: 2,
          delay: 50,
          userAgent: 'Archivist Test',
          timeout: 5000,
        },
      };
      
      const crawler = new WebCrawler(config);
      await crawler.crawlAll();
      
      const metadataPath = join(testOutputDir, 'archivist-metadata.json');
      const metadata = JSON.parse(readFileSync(metadataPath, 'utf-8'));
      
      // Should extract blog posts from paginated pages
      // 3 paginated pages × 3 posts per page = 9 posts
      expect(metadata.results.length).toBeGreaterThanOrEqual(9);
      const urls = metadata.results.map((r: any) => r.url);
      expect(urls).toContain(`${mockServerUrl}/blog/2024/01/post/4`);  // From page 1
      expect(urls).toContain(`${mockServerUrl}/blog/2024/01/post/10`); // From page 3
    });
  });
});