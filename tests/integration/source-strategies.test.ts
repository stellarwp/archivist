import { describe, expect, it, beforeEach, afterEach } from 'bun:test';
import { readFileSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { WebCrawler } from '../../src/crawler';
import { startMockServer } from '../helpers/mock-server';
import type { ArchivistConfig } from '../../archivist.config';

describe('Source Strategies Integration', () => {
  let mockServerUrl: string;
  let stopServer: () => void;
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
  });
  
  afterEach(() => {
    stopServer();
    // Clean up test output
    if (existsSync(testOutputDir)) {
      rmSync(testOutputDir, { recursive: true, force: true });
    }
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
      
      // Should have crawled 4 pages: original + 3 pagination pages
      expect(metadata.results.length).toBe(4);
      
      const crawledUrls = metadata.results.map((r: any) => r.url);
      expect(crawledUrls).toContain(`${mockServerUrl}/posts`);
      expect(crawledUrls).toContain(`${mockServerUrl}/posts?page=1`);
      expect(crawledUrls).toContain(`${mockServerUrl}/posts?page=2`);
      expect(crawledUrls).toContain(`${mockServerUrl}/posts?page=3`);
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
              maxPages: 5,
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
      
      // Should have followed the pagination chain
      expect(metadata.results.length).toBeGreaterThan(1);
      
      const crawledUrls = metadata.results.map((r: any) => r.url);
      expect(crawledUrls[0]).toBe(`${mockServerUrl}/blog/page/1`);
      
      // Verify sequential pages were crawled
      for (let i = 1; i < crawledUrls.length; i++) {
        expect(crawledUrls[i]).toMatch(/\/blog\/page\/\d+$/);
      }
    });
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
      
      // Should have crawled URLs from all three sources
      expect(crawledUrls).toContain(`${mockServerUrl}/about`);
      expect(crawledUrls.some((url: string) => url.includes('/archive'))).toBe(true);
      expect(metadata.results.length).toBeGreaterThan(3);
    });
  });
});