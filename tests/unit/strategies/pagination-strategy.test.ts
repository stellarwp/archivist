import { describe, expect, it, beforeEach, afterEach, mock } from 'bun:test';
import { PaginationStrategy } from '../../../src/strategies/pagination-strategy';

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
    
    strategy = new PaginationStrategy();
  });
  
  afterEach(() => {
    mock.restore();
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
      
      expect(result.urls).toEqual([
        'https://example.com/posts',
        'https://example.com/posts/page/1',
        'https://example.com/posts/page/2',
        'https://example.com/posts/page/3',
      ]);
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
      
      expect(result.urls).toEqual([
        'https://example.com/posts',
        'https://example.com/posts?p=1',
        'https://example.com/posts?p=2',
        'https://example.com/posts?p=3',
      ]);
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
      
      expect(result.urls).toEqual([
        'https://example.com/posts?category=tech',
        'https://example.com/posts?category=tech&page=1',
        'https://example.com/posts?category=tech&page=2',
      ]);
    });
    
    it('should use default values when pageParam is specified', async () => {
      const config = {
        pagination: {
          pageParam: 'page', // Explicitly set to trigger pagination
        },
      };
      
      const result = await strategy.execute('https://example.com/posts', config);
      
      // Default: startPage=1, maxPages=10, pageParam='page'
      expect(result.urls).toHaveLength(11); // source + 10 pages
      expect(result.urls[0]).toBe('https://example.com/posts');
      expect(result.urls[1]).toBe('https://example.com/posts?page=1');
      expect(result.urls[10]).toBe('https://example.com/posts?page=10');
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
          maxPages: 10,
        },
      };
      
      const result = await strategy.execute('https://example.com/page1', config);
      
      expect(result.urls).toEqual([
        'https://example.com/page1',
        'https://example.com/page2',
        'https://example.com/page3',
      ]);
      
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
      
      expect(result.urls).toHaveLength(3);
      expect(mockLinkDiscoverer.discover).toHaveBeenCalledTimes(2); // Initial + 2 more to reach limit
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
      
      expect(result.urls).toEqual([
        'https://example.com/posts/page1',
        'https://example.com/page2',
        'https://example.com/page3',
      ]);
    });
    
    it('should avoid infinite loops with circular links', async () => {
      // Mock circular links
      mockLinkDiscoverer.discover
        .mockResolvedValueOnce(['https://example.com/page2'])
        .mockResolvedValueOnce(['https://example.com/page1']); // Back to page1
      
      const config = {
        pagination: {
          nextLinkSelector: 'a.next',
          maxPages: 10,
        },
      };
      
      const result = await strategy.execute('https://example.com/page1', config);
      
      expect(result.urls).toEqual([
        'https://example.com/page1',
        'https://example.com/page2',
      ]);
    });
  });
  
  describe('fallback behavior', () => {
    it('should return only source URL when no pagination config provided', async () => {
      const result = await strategy.execute('https://example.com/posts', {});
      
      expect(result.urls).toEqual(['https://example.com/posts']);
    });
    
    it('should return only source URL when pagination config is empty', async () => {
      const config = {
        pagination: {},
      };
      
      const result = await strategy.execute('https://example.com/posts', config);
      
      expect(result.urls).toEqual(['https://example.com/posts']);
    });
  });
});