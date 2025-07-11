import "reflect-metadata";
import { describe, expect, it, beforeEach, afterEach, spyOn } from 'bun:test';
import { readFileSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { WebCrawler } from '../../src/crawler';
import { startMockServer } from '../helpers/mock-server';
import type { ArchivistConfig } from '../../src/config/schema';

describe('Pagination Stop Detection Integration', () => {
  let mockServerUrl: string;
  let stopServer: () => void;
  let consoleLogSpy: any;
  let consoleErrorSpy: any;
  const testOutputDir = join(__dirname, '../test-output-pagination-stop');
  
  beforeEach(async () => {
    // Start mock server
    const { url, stop } = await startMockServer();
    mockServerUrl = url;
    stopServer = stop;
    
    // Clean up any existing test output
    if (existsSync(testOutputDir)) {
      rmSync(testOutputDir, { recursive: true, force: true });
    }
    
    // Spy on console to capture stop messages
    consoleLogSpy = spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = spyOn(console, 'error').mockImplementation(() => {});
  });
  
  afterEach(() => {
    stopServer();
    // Clean up test output
    if (existsSync(testOutputDir)) {
      rmSync(testOutputDir, { recursive: true, force: true });
    }
    // Restore console
    consoleLogSpy?.mockRestore();
    consoleErrorSpy?.mockRestore();
  });
  
  describe('Consecutive Empty Pages', () => {
    it.skip('should stop after 3 consecutive pages with no new links', async () => {
      const config: ArchivistConfig = {
        archives: [{
          name: 'Empty Pages Test',
          sources: {
            url: `${mockServerUrl}/blog/empty-pages/page/1`,
            strategy: 'pagination',
            linkSelector: 'a[href*="/article/"]',
            pagination: {
              pagePattern: `${mockServerUrl}/blog/empty-pages/page/{page}`,
              startPage: 1,
              maxPages: 10,
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
          delay: 10,
          userAgent: 'Archivist Test',
          timeout: 5000,
        },
      };
      
      const crawler = new WebCrawler(config);
      await crawler.crawlAll();
      
      // Check console logs for stop message
      const stopMessage = consoleLogSpy.mock.calls.find((call: any[]) => 
        call[0]?.includes && call[0].includes('Stopping:')
      );
      expect(stopMessage).toBeDefined();
      
      // Verify metadata
      const metadataPath = join(testOutputDir, 'archivist-metadata.json');
      const metadata = JSON.parse(readFileSync(metadataPath, 'utf-8'));
      
      // The crawler extracts links during pagination now, so we get all links
      // from pages that were checked before stopping
      expect(metadata.results.length).toBeGreaterThan(0);
      
      // Should have stopped early (not crawled all 10 pages worth)
      expect(metadata.results.length).toBeLessThan(20); // Would be 20 if all 10 pages crawled
    });
    
    it('should continue if pages have new links', async () => {
      // This test uses regular pagination that should not trigger stop
      const config: ArchivistConfig = {
        archives: [{
          name: 'Normal Pagination Test',
          sources: {
            url: `${mockServerUrl}/posts`,
            strategy: 'pagination',
            pagination: {
              pageParam: 'page',
              startPage: 0,
              maxPages: 3,
            },
          },
          output: {
            directory: testOutputDir,
            format: 'json',
            fileNaming: 'url-based',
          },
        }],
      };
      
      const crawler = new WebCrawler(config);
      await crawler.crawlAll();
      
      // Should NOT have stop message for consecutive empty pages
      const stopMessage = consoleLogSpy.mock.calls.find((call: any[]) => 
        call[0]?.includes('consecutive pages with fewer than')
      );
      expect(stopMessage).toBeUndefined();
    });
  });
  
  describe('404 Error Handling', () => {
    it('should stop after 2 consecutive 404 errors', async () => {
      const config: ArchivistConfig = {
        archives: [{
          name: '404 Test',
          sources: {
            url: `${mockServerUrl}/blog/404-test/page/1`,
            strategy: 'pagination',
            linkSelector: 'a[href*="/article/"]',
            pagination: {
              pagePattern: `${mockServerUrl}/blog/404-test/page/{page}`,
              startPage: 1,
              maxPages: 10,
            },
          },
          output: {
            directory: testOutputDir,
            format: 'json',
            fileNaming: 'url-based',
          },
        }],
      };
      
      const crawler = new WebCrawler(config);
      await crawler.crawlAll();
      
      // Check for stop message
      const stopMessage = consoleLogSpy.mock.calls.find((call: any[]) => 
        call[0]?.includes && call[0].includes('404 errors')
      );
      expect(stopMessage).toBeDefined();
      
      // Should have crawled some articles before stopping
      const metadataPath = join(testOutputDir, 'archivist-metadata.json');
      const metadata = JSON.parse(readFileSync(metadataPath, 'utf-8'));
      
      // Should have stopped early due to 404s
      expect(metadata.results.length).toBeGreaterThan(0);
      expect(metadata.results.length).toBeLessThan(30); // Would be more if all pages crawled
    });
  });
  
  describe('Error Page Content Detection', () => {
    it('should stop when detecting error page keywords', async () => {
      const config: ArchivistConfig = {
        archives: [{
          name: 'Error Content Test',
          sources: {
            url: `${mockServerUrl}/blog/error-content/page/1`,
            strategy: 'pagination',
            linkSelector: 'a[href*="/article/"]',
            pagination: {
              pagePattern: `${mockServerUrl}/blog/error-content/page/{page}`,
              startPage: 1,
              maxPages: 10,
            },
          },
          output: {
            directory: testOutputDir,
            format: 'json',
            fileNaming: 'url-based',
          },
        }],
      };
      
      const crawler = new WebCrawler(config);
      await crawler.crawlAll();
      
      // Check for stop message
      const stopMessage = consoleLogSpy.mock.calls.find((call: any[]) => 
        call[0]?.includes && call[0].includes('error page content')
      );
      expect(stopMessage).toBeDefined();
      
      // Should have crawled some articles before stopping
      const metadataPath = join(testOutputDir, 'archivist-metadata.json');
      const metadata = JSON.parse(readFileSync(metadataPath, 'utf-8'));
      
      // Should have stopped early due to error content
      expect(metadata.results.length).toBeGreaterThan(0);
      expect(metadata.results.length).toBeLessThan(30);
    });
  });
  
  describe('Declining Links Trend', () => {
    it.skip('should detect and stop on significant declining trend', async () => {
      const config: ArchivistConfig = {
        archives: [{
          name: 'Declining Links Test',
          sources: {
            url: `${mockServerUrl}/blog/declining/page/1`,
            strategy: 'pagination',
            linkSelector: 'a[href*="/article/"]',
            pagination: {
              pagePattern: `${mockServerUrl}/blog/declining/page/{page}`,
              startPage: 1,
              maxPages: 10,
            },
          },
          output: {
            directory: testOutputDir,
            format: 'json',
            fileNaming: 'url-based',
          },
        }],
      };
      
      const crawler = new WebCrawler(config);
      await crawler.crawlAll();
      
      // Could stop for declining trend OR consecutive empty pages
      const stopMessage = consoleLogSpy.mock.calls.find((call: any[]) => 
        call[0]?.includes && call[0].includes('Stopping:')
      );
      expect(stopMessage).toBeDefined();
      
      // Should have crawled some articles but not all
      const metadataPath = join(testOutputDir, 'archivist-metadata.json');
      const metadata = JSON.parse(readFileSync(metadataPath, 'utf-8'));
      
      // Should have stopped before page 10
      expect(metadata.results.length).toBeGreaterThan(0);
      expect(metadata.results.length).toBeLessThan(50);
    });
  });
  
  describe('Custom Stop Conditions', () => {
    it('should respect custom stop condition configuration', async () => {
      const config: ArchivistConfig = {
        archives: [{
          name: 'Custom Conditions Test',
          sources: {
            url: `${mockServerUrl}/blog/custom-stop/page/1`,
            strategy: 'pagination',
            linkSelector: 'a[href*="/article/"]',
            pagination: {
              pagePattern: `${mockServerUrl}/blog/custom-stop/page/{page}`,
              startPage: 1,
              maxPages: 10,
              stopConditions: {
                consecutiveEmptyPages: 2, // More strict than default
                max404Errors: 1, // More strict than default
                minNewLinksPerPage: 3, // More strict than default
              },
            },
          },
          output: {
            directory: testOutputDir,
            format: 'json',
            fileNaming: 'url-based',
          },
        }],
      };
      
      const crawler = new WebCrawler(config);
      await crawler.crawlAll();
      
      // Should stop early due to strict conditions
      const stopMessage = consoleLogSpy.mock.calls.find((call: any[]) => 
        call[0]?.includes && call[0].includes('Stopping:')
      );
      expect(stopMessage).toBeDefined();
      
      // Should have crawled very few articles due to strict conditions
      const metadataPath = join(testOutputDir, 'archivist-metadata.json');
      const metadata = JSON.parse(readFileSync(metadataPath, 'utf-8'));
      
      // Should stop early with strict conditions
      expect(metadata.results.length).toBeGreaterThan(0);
      expect(metadata.results.length).toBeLessThan(10);
    });
    
    it('should use custom error keywords', async () => {
      const config: ArchivistConfig = {
        archives: [{
          name: 'Custom Error Keywords Test',
          sources: {
            url: `${mockServerUrl}/blog/mixed-signals/page/1`,
            strategy: 'pagination',
            linkSelector: 'a[href*="/article/"]',
            pagination: {
              pagePattern: `${mockServerUrl}/blog/mixed-signals/page/{page}`,
              startPage: 1,
              maxPages: 10,
              stopConditions: {
                errorKeywords: ['end of the archive', 'no posts found'],
              },
            },
          },
          output: {
            directory: testOutputDir,
            format: 'json',
            fileNaming: 'url-based',
          },
        }],
      };
      
      const crawler = new WebCrawler(config);
      await crawler.crawlAll();
      
      // Should detect custom error keywords on page 5
      const stopMessage = consoleLogSpy.mock.calls.find((call: any[]) => 
        call[0]?.includes('Stopping: Detected error page content')
      );
      expect(stopMessage).toBeDefined();
    });
  });
  
  describe('Pagination Statistics', () => {
    it.skip('should report accurate pagination statistics', async () => {
      const config: ArchivistConfig = {
        archives: [{
          name: 'Stats Test',
          sources: {
            url: `${mockServerUrl}/blog/empty-pages/page/1`,
            strategy: 'pagination',
            linkSelector: 'a[href*="/article/"]',
            pagination: {
              pagePattern: `${mockServerUrl}/blog/empty-pages/page/{page}`,
              startPage: 1,
              maxPages: 10,
            },
          },
          output: {
            directory: testOutputDir,
            format: 'json',
            fileNaming: 'url-based',
          },
        }],
      };
      
      const crawler = new WebCrawler(config);
      await crawler.crawlAll();
      
      // Check for statistics in logs
      const statsLog = consoleLogSpy.mock.calls.find((call: any[]) => 
        call[0]?.includes && (call[0].includes('Average new links per page:') || call[0].includes('Pagination complete:'))
      );
      expect(statsLog).toBeDefined();
      
      // Check for 404 count if present
      const errorLog = consoleLogSpy.mock.calls.find((call: any[]) => 
        call[0]?.includes('Encountered') && call[0]?.includes('404 errors')
      );
      // This test shouldn't have 404s
      expect(errorLog).toBeUndefined();
    });
  });
});