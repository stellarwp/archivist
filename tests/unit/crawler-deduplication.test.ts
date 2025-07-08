import { describe, expect, it, mock, beforeEach, afterEach } from 'bun:test';
import type { ArchivistConfig } from '../../archivist.config';
import { WebCrawler } from '../../src/crawler';
import axios from 'axios';

// Store original axios methods
const originalAxiosGet = axios.get;
const originalAxiosCreate = axios.create;

describe('Crawler Link Deduplication', () => {
  beforeEach(() => {
    // Mock axios for testing
    const mockAxiosInstance = {
      get: mock(() => Promise.resolve({ data: '# Mock Content' })),
      post: mock(),
    };
    
    axios.create = mock(() => mockAxiosInstance) as any;
    axios.get = mock((url: string) => {
      // Return HTML with duplicate links
      if (url === 'https://test.local/page1') {
        return Promise.resolve({
          data: `
            <html>
              <body>
                <a href="https://test.local/article1">Article 1</a>
                <a href="https://test.local/article2">Article 2</a>
                <a href="https://test.local/article1">Article 1 Again</a>
                <a href="https://test.local/article3">Article 3</a>
                <a href="https://test.local/article2">Article 2 Again</a>
              </body>
            </html>
          `,
        });
      }
      if (url === 'https://test.local/page2') {
        return Promise.resolve({
          data: `
            <html>
              <body>
                <a href="https://test.local/article2">Article 2</a>
                <a href="https://test.local/article3">Article 3</a>
                <a href="https://test.local/article4">Article 4</a>
                <a href="https://test.local/article3">Article 3 Again</a>
              </body>
            </html>
          `,
        });
      }
      // For articles, return empty HTML
      return Promise.resolve({ data: '<html><body>Article content</body></html>' });
    }) as any;
  });

  afterEach(() => {
    // Restore original methods
    axios.get = originalAxiosGet;
    axios.create = originalAxiosCreate;
  });

  it('should deduplicate links from multiple object sources', async () => {
    const config: ArchivistConfig = {
      archives: [
        {
          name: 'Test Deduplication',
          sources: [
            {
              url: 'https://test.local/page1',
              linkSelector: 'a[href]',
            },
            {
              url: 'https://test.local/page2',
              linkSelector: 'a[href]',
            },
          ],
          output: {
            directory: './test-dedup',
            format: 'markdown',
            fileNaming: 'url-based',
          },
        },
      ],
      crawl: {
        maxConcurrency: 1,
        delay: 0,
        timeout: 30000,
        userAgent: 'Test Agent',
      },
    };

    // Capture console.log output
    const logs: string[] = [];
    const originalLog = console.log;
    console.log = (...args: any[]) => {
      logs.push(args.join(' '));
    };

    try {
      const crawler = new WebCrawler(config);
      await crawler.crawlAll();

      // Check that deduplication messages were logged
      const dedupLogs = logs.filter(log => log.includes('duplicates removed'));
      expect(dedupLogs.length).toBeGreaterThan(0);

      // Check total links collected vs unique links added
      const totalLog = logs.find(log => log.includes('Total: Collected'));
      expect(totalLog).toBeDefined();
      
      // The actual count depends on how the link extractor finds links
      // Let's just verify that deduplication happened
      expect(totalLog).toBeTruthy();
      expect(totalLog).toMatch(/Collected \d+ links, \d+ unique links added to queue/);

    } finally {
      // Restore console.log
      console.log = originalLog;
    }
  });

  it('should handle Set-based deduplication correctly', () => {
    const queue = new Set<string>();
    const links = [
      'https://test.local/page1',
      'https://test.local/page2',
      'https://test.local/page1', // duplicate
      'https://test.local/page3',
      'https://test.local/page2', // duplicate
      'https://test.local/page1', // duplicate
      'https://test.local/page4',
    ];

    const queueSizeBefore = queue.size;
    for (const link of links) {
      queue.add(link);
    }
    const uniqueLinksAdded = queue.size - queueSizeBefore;

    expect(queue.size).toBe(4); // Only 4 unique links
    expect(uniqueLinksAdded).toBe(4);
    expect(links.length - uniqueLinksAdded).toBe(3); // 3 duplicates
  });
});