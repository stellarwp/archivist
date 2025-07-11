import { describe, expect, it, mock, beforeEach, afterEach } from 'bun:test';
import { extractLinksFromPage } from '../../../src/utils/link-extractor';
import { appContainer } from '../../../src/di/container';
import { LinkDiscoverer } from '../../../src/services/link-discoverer';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load mock HTML fixtures
const fixturesPath = join(__dirname, '../../fixtures');
const simplePage = readFileSync(join(fixturesPath, 'simple-page.html'), 'utf-8');
const docsPage = readFileSync(join(fixturesPath, 'documentation-page.html'), 'utf-8');
const blogPage = readFileSync(join(fixturesPath, 'blog-page.html'), 'utf-8');
const apiIndex = readFileSync(join(fixturesPath, 'api-index.html'), 'utf-8');

// Mock link discoverer
const mockLinkDiscoverer = {
  discoverLinks: mock(async (url: string, options?: any) => {
    const htmlContent = mockResponses[url];
    if (!htmlContent) {
      throw new Error('Not found');
    }
    
    // Parse the HTML content to extract links
    const links: string[] = [];
    const linkRegex = /<a\s+(?:[^>]*?\s+)?href=(["'])(.*?)\1/gi;
    let match;
    
    while ((match = linkRegex.exec(htmlContent)) !== null) {
      const href = match[2];
      if (href) {
        try {
          const absoluteUrl = new URL(href, url).toString();
          if (absoluteUrl.startsWith('http://') || absoluteUrl.startsWith('https://')) {
            // Apply filters if provided
            if (options?.includePatterns || options?.excludePatterns) {
              const shouldInclude = options.includePatterns 
                ? options.includePatterns.some((pattern: string) => new RegExp(pattern).test(absoluteUrl))
                : true;
              const shouldExclude = options.excludePatterns
                ? options.excludePatterns.some((pattern: string) => new RegExp(pattern).test(absoluteUrl))
                : false;
                
              if (shouldInclude && !shouldExclude) {
                links.push(absoluteUrl);
              }
            } else {
              links.push(absoluteUrl);
            }
          }
        } catch {
          // Invalid URL, skip
        }
      }
    }
    
    // Remove duplicates
    const uniqueLinks = Array.from(new Set(links));
    
    return {
      url,
      links: uniqueLinks,
      crawledAt: new Date().toISOString(),
    };
  }),
};

// Mock responses
const mockResponses: Record<string, string> = {
  'https://test.local/index': simplePage,
  'https://test.local/docs': docsPage,
  'https://test.local/blog': blogPage,
  'https://test.local/api': apiIndex,
  'https://test.local/test': `
    <!DOCTYPE html>
    <html>
    <body>
      <a href="/page1">Link 1</a>
      <a href="/page1">Link 1 again</a>
      <a href="https://test.local/page1">Link 1 absolute</a>
      <a href="/page2">Link 2</a>
    </body>
    </html>
  `,
  'https://test.local/nolinks': `
    <!DOCTYPE html>
    <html>
    <body>
      <h1>Page with no links</h1>
      <p>Just text content</p>
    </body>
    </html>
  `,
  'https://test.local/malformed': `
    <!DOCTYPE html>
    <html>
    <body>
      <a href="javascript:void(0)">JavaScript link</a>
      <a href="mailto:test@example.com">Email link</a>
      <a href="/valid/path">Valid relative link</a>
      <a href="">Empty href</a>
      <a>No href attribute</a>
    </body>
    </html>
  `,
};

describe('link-extractor', () => {
  beforeEach(() => {
    // Clear existing instances
    appContainer.clearInstances();
    
    // Register the mock as an instance
    appContainer.registerInstance(LinkDiscoverer, mockLinkDiscoverer as any);
  });

  afterEach(() => {
    // Clear all mocks
    mock.restore();
    // Clear container instances
    appContainer.clearInstances();
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
      const result = await extractLinksFromPage({
        url: 'https://test.local/nolinks',
        userAgent: 'Test/1.0',
        timeout: 5000,
      });

      expect(result).toEqual([]);
    });

    it('should handle malformed URLs gracefully', async () => {
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