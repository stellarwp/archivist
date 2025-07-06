import { describe, expect, it, mock, beforeEach, afterEach } from 'bun:test';
import { extractLinksFromPage } from '../../../src/utils/link-extractor';
import axios from 'axios';

// Store original axios.get
const originalAxiosGet = axios.get;

// Mock responses
const mockResponses: Record<string, string> = {
  'https://example.com/index': `
    <!DOCTYPE html>
    <html>
    <body>
      <h1>Documentation Index</h1>
      <div class="links">
        <a href="https://example.com/api/users">Users API</a>
        <a href="https://example.com/api/posts">Posts API</a>
        <a href="https://example.com/guides/intro">Introduction</a>
        <a href="/api/comments">Comments API</a>
        <a href="mailto:support@example.com">Contact</a>
        <a href="#section">Jump to section</a>
        <a href="https://external.com/resource">External Link</a>
      </div>
    </body>
    </html>
  `,
  'https://example.com/blog': `
    <!DOCTYPE html>
    <html>
    <body>
      <div class="blog-posts">
        <a href="https://example.com/blog/post-1.html">Post 1</a>
        <a href="https://example.com/blog/post-2.html">Post 2</a>
        <a href="https://example.com/blog/draft.html">Draft Post</a>
        <a href="https://example.com/about">About</a>
      </div>
    </body>
    </html>
  `,
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
      const links = await extractLinksFromPage({
        url: 'https://example.com/index',
      });

      expect(links).toContain('https://example.com/api/users');
      expect(links).toContain('https://example.com/api/posts');
      expect(links).toContain('https://example.com/guides/intro');
      expect(links).toContain('https://example.com/api/comments'); // Relative URL converted
      expect(links).toContain('https://external.com/resource');
      
      // Should not contain these
      expect(links).not.toContain('mailto:support@example.com');
      expect(links).not.toContain('#section');
    });

    it('should convert relative URLs to absolute', async () => {
      const links = await extractLinksFromPage({
        url: 'https://example.com/index',
      });

      // Check that relative URL was converted
      expect(links).toContain('https://example.com/api/comments');
    });

    it('should filter links based on includePatterns', async () => {
      const links = await extractLinksFromPage({
        url: 'https://example.com/index',
        includePatterns: ['https://example\\.com/api/.*'],
      });

      expect(links).toContain('https://example.com/api/users');
      expect(links).toContain('https://example.com/api/posts');
      expect(links).toContain('https://example.com/api/comments');
      
      // Should not contain non-matching links
      expect(links).not.toContain('https://example.com/guides/intro');
      expect(links).not.toContain('https://external.com/resource');
    });

    it('should filter links with includePatterns', async () => {
      const links = await extractLinksFromPage({
        url: 'https://example.com/blog',
        includePatterns: ['.*\\.html$'],
      });

      expect(links).toContain('https://example.com/blog/post-1.html');
      expect(links).toContain('https://example.com/blog/post-2.html');
      expect(links).toContain('https://example.com/blog/draft.html');
      
      // Should not contain non-HTML links
      expect(links).not.toContain('https://example.com/about');
    });

    it('should filter links with excludePatterns', async () => {
      const links = await extractLinksFromPage({
        url: 'https://example.com/blog',
        excludePatterns: ['.*draft.*'],
      });

      expect(links).toContain('https://example.com/blog/post-1.html');
      expect(links).toContain('https://example.com/blog/post-2.html');
      expect(links).toContain('https://example.com/about');
      
      // Should not contain draft links
      expect(links).not.toContain('https://example.com/blog/draft.html');
    });

    it('should support both includePatterns and excludePatterns', async () => {
      const links = await extractLinksFromPage({
        url: 'https://example.com/index',
        includePatterns: ['https://example\\.com/.*'],
        excludePatterns: ['.*guides.*'],
      });

      expect(links).toContain('https://example.com/api/users');
      expect(links).toContain('https://example.com/api/posts');
      expect(links).toContain('https://example.com/api/comments');
      
      // Should not contain guides or external links
      expect(links).not.toContain('https://example.com/guides/intro');
      expect(links).not.toContain('https://external.com/resource');
    });

    it('should remove duplicate links', async () => {
      // Temporarily override mock for this specific test
      const currentMock = axios.get;
      axios.get = mock(() => Promise.resolve({
        data: `
          <a href="https://example.com/page">Link 1</a>
          <a href="https://example.com/page">Link 2</a>
          <a href="https://example.com/page">Link 3</a>
        `,
      })) as any;

      const links = await extractLinksFromPage({
        url: 'https://example.com/test',
      });

      // Should only have one instance
      expect(links).toEqual(['https://example.com/page']);
      
      // Restore the mock
      axios.get = currentMock;
    });

    it('should handle errors gracefully', async () => {
      const links = await extractLinksFromPage({
        url: 'https://example.com/nonexistent',
      });

      expect(links).toEqual([]);
    });

    it('should handle pages with no links', async () => {
      // Temporarily override mock for this specific test
      const currentMock = axios.get;
      axios.get = mock(() => Promise.resolve({
        data: '<html><body><p>No links here</p></body></html>',
      })) as any;

      const links = await extractLinksFromPage({
        url: 'https://example.com/nolinks',
      });

      expect(links).toEqual([]);
      
      // Restore the mock
      axios.get = currentMock;
    });

    it('should handle malformed URLs gracefully', async () => {
      // Temporarily override mock for this specific test
      const currentMock = axios.get;
      axios.get = mock(() => Promise.resolve({
        data: `
          <a href="https://example.com/valid">Valid Link</a>
          <a href="javascript:void(0)">JS Link</a>
          <a href="://broken">Broken Link</a>
          <a href="">Empty Link</a>
        `,
      })) as any;

      const links = await extractLinksFromPage({
        url: 'https://example.com/mixed',
      });

      // Should only contain valid URLs
      expect(links).toEqual(['https://example.com/valid']);
      
      // Restore the mock
      axios.get = currentMock;
    });
  });
});