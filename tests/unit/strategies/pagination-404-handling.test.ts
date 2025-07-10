import { describe, expect, it, beforeEach, afterEach, mock } from 'bun:test';
import { PaginationStrategy } from '../../../src/strategies/pagination-strategy';
import axios from 'axios';

// Store original axios methods
const originalHead = axios.head;
const originalGet = axios.get;
const originalCreate = axios.create;

describe('PaginationStrategy 404 Handling', () => {
  let strategy: PaginationStrategy;
  
  beforeEach(() => {
    // Mock extractLinksFromPage function
    mock.module('../../../src/utils/link-extractor', () => ({
      extractLinksFromPage: mock(async ({ url }: { url: string }) => {
        // Return a unique link for each page based on URL
        const pageNum = url.match(/page[/=](\d+)/)?.[1] || 
                       url.match(/\?page=(\d+)/)?.[1] || '0';
        return [`/article-${pageNum}`];
      }),
    }));
    
    // Mock axios.create to return a mock instance
    const mockAxiosInstance = {
      get: mock(() => Promise.resolve({ data: '<html><body></body></html>' })),
      head: mock(() => Promise.resolve({ status: 200 })),
    };
    
    axios.create = mock(() => mockAxiosInstance) as any;
    
    // Create strategy after mocking
    strategy = new PaginationStrategy();
  });
  
  afterEach(() => {
    // Restore original methods
    axios.head = originalHead;
    axios.get = originalGet;
    axios.create = originalCreate;
  });
  
  it('should stop pagination when encountering 404 after retry', async () => {
    let callCount = 0;
    const pageStatuses: Record<string, number> = {
      'https://example.com/?page=1': 200,
      'https://example.com/?page=2': 200,
      'https://example.com/?page=3': 200,
      'https://example.com/?page=4': 404, // This will trigger retry
    };
    
    // Mock axios.head
    axios.head = mock((url: string) => {
      callCount++;
      const status = pageStatuses[url] || 404;
      return Promise.resolve({ status });
    }) as any;
    
    const config = {
      pagination: {
        pageParam: 'page',
        startPage: 1,
        maxPages: 4,
      },
    };
    
    const result = await strategy.execute('https://example.com', config);
    
    // Should have extracted links from base URL + pages 1, 2, 3 (stops at 4 due to 404)
    // Each page has one link, so we should have 4 unique links
    expect(result.urls).toHaveLength(4);
    expect(result.urls).toContain('/article-0'); // from base URL
    expect(result.urls).toContain('/article-1'); // from page 1
    expect(result.urls).toContain('/article-2'); // from page 2
    expect(result.urls).toContain('/article-3'); // from page 3
    
    // Should have tried page 4 twice (initial + 1 retry)
    const page4Calls = (axios.head as any).mock.calls.filter(
      (call: any[]) => call[0] === 'https://example.com/?page=4'
    ).length;
    expect(page4Calls).toBe(2);
  });
  
  it('should continue if 404 is temporary (succeeds on retry)', async () => {
    let page4Attempts = 0;
    
    // Mock axios.head
    axios.head = mock((url: string) => {
      if (url === 'https://example.com/?page=4') {
        page4Attempts++;
        // First attempt returns 404, second attempt returns 200
        return Promise.resolve({ status: page4Attempts === 1 ? 404 : 200 });
      }
      return Promise.resolve({ status: 200 });
    }) as any;
    
    const config = {
      pagination: {
        pageParam: 'page',
        startPage: 1,
        maxPages: 4,
      },
    };
    
    const result = await strategy.execute('https://example.com', config);
    
    // Should have extracted links from all pages since page 4 succeeded on retry
    expect(result.urls).toHaveLength(5); // 5 unique links from 5 pages
    expect(result.urls).toContain('/article-4'); // from page 4
    expect(page4Attempts).toBe(2); // Should have retried once
  });
  
  it('should handle pattern-based pagination with 404', async () => {
    const pageStatuses: Record<string, number> = {
      'https://example.com/page/1': 200,
      'https://example.com/page/2': 200,
      'https://example.com/page/3': 404,
    };
    
    axios.head = mock((url: string) => {
      const status = pageStatuses[url] || 404;
      return Promise.resolve({ status });
    }) as any;
    
    const config = {
      pagination: {
        pagePattern: 'https://example.com/page/{page}',
        startPage: 1,
        maxPages: 4,
      },
    };
    
    const result = await strategy.execute('https://example.com', config);
    
    // Should have extracted links from base + pages 1, 2 (stops at page 3)
    expect(result.urls).toHaveLength(3); // 3 unique links
    expect(result.urls).toContain('/article-0'); // from base
    expect(result.urls).toContain('/article-1'); // from page 1
    expect(result.urls).toContain('/article-2'); // from page 2
  });
  
  it('should handle network errors as non-existent pages after retry', async () => {
    let attempts = 0;
    
    axios.head = mock((url: string) => {
      if (url === 'https://example.com/?page=3') {
        attempts++;
        // Always throw network error
        throw new Error('Network error');
      }
      return Promise.resolve({ status: 200 });
    }) as any;
    
    const config = {
      pagination: {
        pageParam: 'page',
        startPage: 1,
        maxPages: 4,
      },
    };
    
    const result = await strategy.execute('https://example.com', config);
    
    // Should have extracted links from base + pages 1, 2 (stops at page 3)
    expect(result.urls).toHaveLength(3); // 3 unique links
    expect(attempts).toBe(2); // Should have retried once
  });
});