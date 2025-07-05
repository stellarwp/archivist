import { describe, expect, it, beforeEach, afterEach } from 'bun:test';
import { ContentScraper } from '../../../src/services/content-scraper';

// Manual test for content scraper without mocking axios
// to avoid conflicts with other tests
describe('ContentScraper', () => {
  describe('structure and configuration', () => {
    it('should create instance with proper options', () => {
      const scraper = new ContentScraper({
        userAgent: 'Test/1.0',
        timeout: 5000,
      });
      
      expect(scraper).toBeDefined();
      // @ts-ignore - accessing private property for testing
      expect(scraper.options.userAgent).toBe('Test/1.0');
      // @ts-ignore
      expect(scraper.options.timeout).toBe(5000);
    });

    it('should handle optional selector', () => {
      const scraper = new ContentScraper({
        selector: 'article',
        userAgent: 'Test/1.0',
        timeout: 5000,
      });
      
      expect(scraper).toBeDefined();
      // @ts-ignore
      expect(scraper.options.selector).toBe('article');
    });
  });

  describe('error handling', () => {
    it('should throw meaningful error for invalid URLs', async () => {
      const scraper = new ContentScraper({
        userAgent: 'Test/1.0',
        timeout: 100, // Very short timeout
      });
      
      await expect(scraper.scrapeContent('not-a-valid-url'))
        .rejects
        .toThrow();
    });
  });

  // Integration test with real website (example.com)
  describe.skip('integration with example.com', () => {
    it('should scrape example.com successfully', async () => {
      const scraper = new ContentScraper({
        userAgent: 'Archivist-Test/1.0',
        timeout: 10000,
      });
      
      const result = await scraper.scrapeContent('https://example.com');
      
      expect(result.url).toBe('https://example.com');
      expect(result.title).toBe('Example Domain');
      expect(result.content).toContain('Example Domain');
      expect(result.content).toContain('This domain is for use in illustrative examples');
      expect(result.links).toContain('https://www.iana.org/domains/example');
      expect(result.metadata.crawledAt).toBeDefined();
      expect(result.metadata.contentLength).toBeGreaterThan(0);
    });
  });
});