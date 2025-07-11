import { describe, expect, it, beforeEach, afterEach, mock } from 'bun:test';
import { PaginationStrategy } from '../../../src/strategies/pagination-strategy';
import axios from 'axios';

// Store original axios methods
const originalHead = axios.head;
const originalGet = axios.get;
const originalCreate = axios.create;

describe('PaginationStrategy', () => {
  let strategy: PaginationStrategy;
  let mockLinkDiscoverer: any;
  
  beforeEach(() => {
    // Mock the LinkDiscoverer
    mockLinkDiscoverer = {
      discover: mock(async () => []),
    };
    
    mock.module('../../../src/services/link-discoverer', () => ({
      LinkDiscoverer: mock(() => mockLinkDiscoverer),
    }));
    
    // Don't mock extractLinksFromPage globally - it affects other tests
    // Instead, we'll mock the axios responses to return HTML with the links we expect
    
    // Mock axios.create to return a mock instance
    const mockAxiosInstance = {
      get: mock((url: string) => {
        // Return HTML with appropriate links based on URL
        const pageNum = url.match(/page[/=](\d+)/)?.[1] || 
                       url.match(/\?p=(\d+)/)?.[1] || 
                       url.match(/page(\d+)/)?.[1];
        
        let linkHref;
        if (pageNum) {
          linkHref = `/article-${pageNum}`;
        } else if (url.includes('category=tech')) {
          linkHref = '/article-tech';
        } else if (url.includes('posts')) {
          linkHref = '/article-posts';
        } else {
          linkHref = '/article-0';
        }
        
        return Promise.resolve({ 
          data: `<html><body><a href="${linkHref}">Article</a></body></html>` 
        });
      }),
      head: mock(() => Promise.resolve({ status: 200 })),
    };
    
    axios.create = mock(() => mockAxiosInstance) as any;
    
    // Mock axios.head to always return success for existing tests
    axios.head = mock(() => Promise.resolve({ status: 200 })) as any;
    
    // Also mock axios.get in case it's used directly
    axios.get = mockAxiosInstance.get as any;
    
    strategy = new PaginationStrategy();
  });
  
  afterEach(() => {
    // Restore all mocks
    mock.restore();
    // Restore original axios methods
    axios.head = originalHead;
    axios.get = originalGet;
    axios.create = originalCreate;
  });
  
  it('should have type "pagination"', () => {
    expect(strategy.type).toBe('pagination');
  });
  
  describe('pattern-based pagination', () => {
    it('should generate URLs using page pattern with {page} placeholder', async () => {
      const config = {
        pagination: {
          pagePattern: 'https://example.com/posts/page/{page}',
          startPage: 1,
          maxPages: 3,
        },
      };
      
      const result = await strategy.execute('https://example.com/posts', config);
      
      // Should have extracted links from paginated pages (pagination pattern doesn't process source URL)
      expect(result.urls.length).toBeGreaterThanOrEqual(3);
      expect(result.urls).toContain('https://example.com/article-1'); // from page 1
      expect(result.urls).toContain('https://example.com/article-2'); // from page 2
      expect(result.urls).toContain('https://example.com/article-3'); // from page 3
    });
    
    it('should generate URLs using query parameters', async () => {
      const config = {
        pagination: {
          pageParam: 'p',
          startPage: 1,
          maxPages: 3,
        },
      };
      
      const result = await strategy.execute('https://example.com/posts', config);
      
      // Should have extracted links from paginated pages
      expect(result.urls.length).toBeGreaterThanOrEqual(3);
      expect(result.urls).toContain('https://example.com/article-1'); // from ?p=1
      expect(result.urls).toContain('https://example.com/article-2'); // from ?p=2
      expect(result.urls).toContain('https://example.com/article-3'); // from ?p=3
    });
    
    it('should append to existing query parameters', async () => {
      const config = {
        pagination: {
          pageParam: 'page',
          startPage: 1,
          maxPages: 2,
        },
      };
      
      const result = await strategy.execute('https://example.com/posts?category=tech', config);
      
      // Should have extracted links from paginated pages
      expect(result.urls.length).toBeGreaterThanOrEqual(2);
      expect(result.urls).toContain('https://example.com/article-1'); // from page 1
      expect(result.urls).toContain('https://example.com/article-2'); // from page 2
    });
    
    it('should use default values when pageParam is specified', async () => {
      const config = {
        pagination: {
          pageParam: 'page', // Explicitly set to trigger pagination
        },
      };
      
      const result = await strategy.execute('https://example.com/posts', config);
      
      // Default: startPage=1, maxPages=10, pageParam='page'
      // Should extract links from multiple pages
      expect(result.urls.length).toBeGreaterThan(1);
      // Should have unique article links, not pagination URLs
      result.urls.forEach(url => {
        expect(url).toMatch(/article-/);
      });
    });
  });
  
  describe('next link selector-based pagination', () => {
    it('should follow next page links until no more found', async () => {
      // Mock discovery results
      mockLinkDiscoverer.discover
        .mockResolvedValueOnce(['https://example.com/page2']) // From page 1
        .mockResolvedValueOnce(['https://example.com/page3']) // From page 2
        .mockResolvedValueOnce([]); // From page 3 - no more pages
      
      const config = {
        pagination: {
          nextLinkSelector: 'a.next-page',
          maxPages: 4,
        },
      };
      
      const result = await strategy.execute('https://example.com/page1', config);
      
      // Should extract links from 3 pages discovered via next links
      expect(result.urls).toHaveLength(3);
      expect(result.urls).toContain('https://example.com/article-1'); // from page1
      expect(result.urls).toContain('https://example.com/article-2'); // from page2
      expect(result.urls).toContain('https://example.com/article-3'); // from page3
      
      expect(mockLinkDiscoverer.discover).toHaveBeenCalledTimes(3);
      expect(mockLinkDiscoverer.discover).toHaveBeenCalledWith('https://example.com/page1', 'a.next-page');
      expect(mockLinkDiscoverer.discover).toHaveBeenCalledWith('https://example.com/page2', 'a.next-page');
      expect(mockLinkDiscoverer.discover).toHaveBeenCalledWith('https://example.com/page3', 'a.next-page');
    });
    
    it('should stop at maxPages limit', async () => {
      // Mock discovery to always return a new page
      let pageCounter = 1;
      mockLinkDiscoverer.discover
        .mockImplementation(() => {
          pageCounter++;
          return Promise.resolve([`https://example.com/page${pageCounter}`]);
        });
      
      const config = {
        pagination: {
          nextLinkSelector: 'a.next',
          maxPages: 3,
        },
      };
      
      const result = await strategy.execute('https://example.com/page1', config);
      
      // Should extract links from discovered pages
      expect(result.urls.length).toBeGreaterThanOrEqual(2);
      expect(mockLinkDiscoverer.discover).toHaveBeenCalledTimes(2); // Called for page1 and page2 to find next links
    });
    
    it('should handle relative URLs in next links', async () => {
      mockLinkDiscoverer.discover
        .mockResolvedValueOnce(['/page2'])
        .mockResolvedValueOnce(['../page3'])
        .mockResolvedValueOnce([]);
      
      const config = {
        pagination: {
          nextLinkSelector: 'a.next',
        },
      };
      
      const result = await strategy.execute('https://example.com/posts/page1', config);
      
      // Should extract links from discovered pages
      expect(result.urls.length).toBeGreaterThanOrEqual(2);
      expect(result.urls).toContain('https://example.com/article-1'); // from page1
      expect(result.urls).toContain('https://example.com/article-2'); // from page2
      expect(result.urls).toContain('https://example.com/article-3'); // from page3
    });
    
    it('should avoid infinite loops with circular links', async () => {
      // Mock circular links
      mockLinkDiscoverer.discover
        .mockResolvedValueOnce(['https://example.com/page2'])
        .mockResolvedValueOnce(['https://example.com/page1']); // Back to page1
      
      const config = {
        pagination: {
          nextLinkSelector: 'a.next',
          maxPages: 4,
        },
      };
      
      const result = await strategy.execute('https://example.com/page1', config);
      
      // Should extract links from pages (avoided circular loop)
      expect(result.urls.length).toBeGreaterThanOrEqual(2);
      expect(result.urls).toContain('https://example.com/article-1'); // from page1
      expect(result.urls).toContain('https://example.com/article-2'); // from page2
    });
  });
  
  describe('fallback behavior', () => {
    it('should return only source URL when no pagination config provided', async () => {
      const result = await strategy.execute('https://example.com/posts', {});
      
      // Should extract link from single page
      expect(result.urls).toHaveLength(1);
      expect(result.urls[0]).toBe('https://example.com/article-posts');
    });
    
    it('should return only source URL when pagination config is empty', async () => {
      const config = {
        pagination: {},
      };
      
      const result = await strategy.execute('https://example.com/posts', config);
      
      // Should extract link from single page
      expect(result.urls).toHaveLength(1);
      expect(result.urls[0]).toBe('https://example.com/article-posts');
    });
  });
});