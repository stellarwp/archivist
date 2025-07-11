import 'reflect-metadata';
import { describe, expect, it, beforeEach, afterEach, mock, spyOn } from 'bun:test';
import { PaginationStrategy } from '../../../src/strategies/pagination-strategy';
import axios from 'axios';
import { initializeContainer, resetContainer } from '../../../src/di/container';

// Store original axios methods
const originalHead = axios.head;
const originalGet = axios.get;
const originalCreate = axios.create;

describe('PaginationStrategy 404 Handling', () => {
  let strategy: PaginationStrategy;
  let consoleErrorSpy: any;
  
  beforeEach(() => {
    // Suppress console.error for expected errors
    consoleErrorSpy = spyOn(console, 'error').mockImplementation(() => {});
    // Don't mock extractLinksFromPage globally - it affects other tests
    // Mock axios.create to return a mock instance with proper HTML
    const mockAxiosInstance = {
      get: mock((url: string) => {
        // Return HTML with appropriate links based on URL
        const pageNum = url.match(/page[/=](\d+)/)?.[1] || 
                       url.match(/\?page=(\d+)/)?.[1] || '0';
        const linkHref = `/article-${pageNum}`;
        
        return Promise.resolve({ 
          data: `<html><body><a href="${linkHref}">Article</a></body></html>` 
        });
      }),
      head: mock(() => Promise.resolve({ status: 200 })),
      post: mock(),
      defaults: {},
      interceptors: {
        request: { use: mock() },
        response: { use: mock() }
      }
    };
    
    axios.create = mock(() => mockAxiosInstance) as any;
    
    // Also mock axios.get in case it's used directly
    axios.get = mockAxiosInstance.get as any;
    
    // Initialize DI container after mocking
    initializeContainer();
    
    // Create strategy after DI initialization
    strategy = new PaginationStrategy();
  });
  
  afterEach(() => {
    // Restore all mocks
    mock.restore();
    // Restore original methods
    axios.head = originalHead;
    axios.get = originalGet;
    axios.create = originalCreate;
    // Reset DI container
    resetContainer();
    // Restore console.error
    consoleErrorSpy?.mockRestore();
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
    
    // Should have extracted links from pages 1, 2, 3 (stops at 4 due to 404)
    // Pattern-based pagination doesn't process the base URL
    expect(result.urls).toHaveLength(3);
    expect(result.urls).toContain('https://example.com/article-1'); // from page 1
    expect(result.urls).toContain('https://example.com/article-2'); // from page 2
    expect(result.urls).toContain('https://example.com/article-3'); // from page 3
    
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
    
    // Should have extracted links from pages 1-4 since page 4 succeeded on retry
    expect(result.urls).toHaveLength(4);
    expect(result.urls).toContain('https://example.com/article-4'); // from page 4
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
    
    // Should have extracted links from pages 1, 2 (stops at page 3 due to 404)
    expect(result.urls).toHaveLength(2);
    expect(result.urls).toContain('https://example.com/article-1'); // from page 1
    expect(result.urls).toContain('https://example.com/article-2'); // from page 2
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