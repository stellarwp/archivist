import { describe, expect, it, mock, beforeEach, afterEach } from 'bun:test';
import { extractLinksFromPage } from '../../../src/utils/link-extractor';
import axios from 'axios';
import { readFileSync } from 'fs';
import { join } from 'path';

// Store original axios.get
const originalAxiosGet = axios.get;

// Load mock HTML fixtures
const fixturesPath = join(__dirname, '../../fixtures');
const simplePage = readFileSync(join(fixturesPath, 'simple-page.html'), 'utf-8');
const docsPage = readFileSync(join(fixturesPath, 'documentation-page.html'), 'utf-8');
const blogPage = readFileSync(join(fixturesPath, 'blog-page.html'), 'utf-8');
const apiIndex = readFileSync(join(fixturesPath, 'api-index.html'), 'utf-8');

// Mock responses
const mockResponses: Record<string, string> = {
  'https://test.local/index': simplePage,
  'https://test.local/docs': docsPage,
  'https://test.local/blog': blogPage,
  'https://test.local/api': apiIndex,
};

describe('link-extractor', () => {
  beforeEach(() => {
    // Mock axios.get for this test suite
    axios.get = mock((url: string) => {
      if (mockResponses[url]) {
        return Promise.resolve({ data: mockResponses[url] });
      }
      return Promise.reject(new Error('Not found'));
    }) as any;
  });

  afterEach(() => {
    // Restore original axios.get
    axios.get = originalAxiosGet;
  });

  describe('extractLinksFromPage', () => {
    it('should extract all HTTP/HTTPS links from a page', async () => {
      const result = await extractLinksFromPage({
        url: 'https://test.local/index',
        userAgent: 'Test/1.0',
        timeout: 5000,
      });

      expect(result).toContain('https://test.local/external');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should convert relative URLs to absolute', async () => {
      const result = await extractLinksFromPage({
        url: 'https://test.local/index',
        userAgent: 'Test/1.0',
        timeout: 5000,
      });

      // Check that relative URLs are converted to absolute
      expect(result).toContain('https://test.local/page1');
      expect(result).toContain('https://test.local/page2');
      expect(result).toContain('https://test.local/article/1');
    });

    it('should filter links based on includePatterns', async () => {
      const result = await extractLinksFromPage({
        url: 'https://test.local/api',
        userAgent: 'Test/1.0',
        timeout: 5000,
        includePatterns: ['/api/v1/.*'],
      });

      expect(result).toContain('https://test.local/api/v1/users');
      expect(result).toContain('https://test.local/api/v1/posts');
      expect(result).toContain('https://test.local/api/v1/comments');
      expect(result).not.toContain('https://test.local/api/v2/graphql');
      expect(result).not.toContain('https://test.local/api/webhooks');
    });

    it('should filter links with includePatterns', async () => {
      const result = await extractLinksFromPage({
        url: 'https://test.local/docs',
        userAgent: 'Test/1.0',
        timeout: 5000,
        includePatterns: ['.*\\.html$'],
      });

      expect(result).toContain('https://test.local/docs/getting-started.html');
      expect(result).toContain('https://test.local/docs/api-reference.html');
      expect(result).toContain('https://test.local/docs/tutorials.html');
      expect(result).toContain('https://test.local/docs/faq.html');
      expect(result).not.toContain('https://test.local/blog');
      expect(result).not.toContain('https://test.local/about');
    });

    it('should filter links with excludePatterns', async () => {
      const result = await extractLinksFromPage({
        url: 'https://test.local/api',
        userAgent: 'Test/1.0',
        timeout: 5000,
        excludePatterns: ['.*deprecated.*', '.*\\.pdf$'],
      });

      expect(result).not.toContain('https://test.local/api/deprecated/old-endpoints');
      expect(result).not.toContain('https://test.local/downloads/api-client.pdf');
      expect(result).toContain('https://test.local/api/v1/users');
      expect(result).toContain('https://test.local/api/authentication');
    });

    it('should support both includePatterns and excludePatterns', async () => {
      const result = await extractLinksFromPage({
        url: 'https://test.local/api',
        userAgent: 'Test/1.0',
        timeout: 5000,
        includePatterns: ['/api/.*'],
        excludePatterns: ['.*deprecated.*'],
      });

      expect(result).toContain('https://test.local/api/v1/users');
      expect(result).toContain('https://test.local/api/v1/posts');
      expect(result).not.toContain('https://test.local/api/deprecated/old-endpoints');
      expect(result).not.toContain('https://test.local/downloads/api-client.pdf');
    });

    it('should remove duplicate links', async () => {
      // Add a mock response with duplicate links
      const duplicatesHtml = `
        <!DOCTYPE html>
        <html>
        <body>
          <a href="/page1">Link 1</a>
          <a href="/page1">Link 1 again</a>
          <a href="https://test.local/page1">Link 1 absolute</a>
          <a href="/page2">Link 2</a>
        </body>
        </html>
      `;
      
      axios.get = mock(() => Promise.resolve({ data: duplicatesHtml })) as any;

      const result = await extractLinksFromPage({
        url: 'https://test.local/test',
        userAgent: 'Test/1.0',
        timeout: 5000,
      });

      // Count occurrences of each link
      const linkCounts = result.reduce((acc, link) => {
        acc[link] = (acc[link] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Each link should appear only once
      Object.values(linkCounts).forEach(count => {
        expect(count).toBe(1);
      });
    });

    it('should handle errors gracefully', async () => {
      const result = await extractLinksFromPage({
        url: 'https://test.local/nonexistent',
        userAgent: 'Test/1.0',
        timeout: 5000,
      });

      expect(result).toEqual([]);
    });

    it('should handle pages with no links', async () => {
      const noLinksHtml = `
        <!DOCTYPE html>
        <html>
        <body>
          <h1>Page with no links</h1>
          <p>Just text content</p>
        </body>
        </html>
      `;
      
      axios.get = mock(() => Promise.resolve({ data: noLinksHtml })) as any;

      const result = await extractLinksFromPage({
        url: 'https://test.local/nolinks',
        userAgent: 'Test/1.0',
        timeout: 5000,
      });

      expect(result).toEqual([]);
    });

    it('should handle malformed URLs gracefully', async () => {
      const malformedHtml = `
        <!DOCTYPE html>
        <html>
        <body>
          <a href="://broken">Broken protocol</a>
          <a href="//incomplete.com/path">Protocol-relative</a>
          <a href="javascript:void(0)">JavaScript</a>
          <a href="mailto:test@test.com">Email</a>
          <a href="/valid/path">Valid relative</a>
        </body>
        </html>
      `;
      
      axios.get = mock(() => Promise.resolve({ data: malformedHtml })) as any;

      const result = await extractLinksFromPage({
        url: 'https://test.local/malformed',
        userAgent: 'Test/1.0',
        timeout: 5000,
      });

      expect(result).toContain('https://test.local/valid/path');
      expect(result).not.toContain('://broken');
      expect(result).not.toContain('javascript:void(0)');
      expect(result).not.toContain('mailto:test@test.com');
    });
  });
});