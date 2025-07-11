import 'reflect-metadata';
import { describe, expect, it, beforeEach } from 'bun:test';
import { PaginationStopDetector } from '../../../src/utils/pagination-stop-detector';

describe('PaginationStopDetector', () => {
  let detector: PaginationStopDetector;
  
  beforeEach(() => {
    detector = new PaginationStopDetector();
  });
  
  describe('Consecutive Empty Pages', () => {
    it('should stop after 3 consecutive pages with no new links', () => {
      // Page 1: 5 new links
      let result = detector.shouldStop(1, 'http://example.com/page/1', 
        ['link1', 'link2', 'link3', 'link4', 'link5']);
      expect(result.shouldStop).toBe(false);
      
      // Page 2: 3 new links
      result = detector.shouldStop(2, 'http://example.com/page/2', 
        ['link6', 'link7', 'link8']);
      expect(result.shouldStop).toBe(false);
      
      // Page 3: 0 new links (all seen before)
      result = detector.shouldStop(3, 'http://example.com/page/3', 
        ['link1', 'link2']); // Already seen
      expect(result.shouldStop).toBe(false);
      
      // Page 4: 0 new links
      result = detector.shouldStop(4, 'http://example.com/page/4', 
        ['link3', 'link4']); // Already seen
      expect(result.shouldStop).toBe(false);
      
      // Page 5: 0 new links - should trigger stop
      result = detector.shouldStop(5, 'http://example.com/page/5', 
        ['link5', 'link6']); // Already seen
      expect(result.shouldStop).toBe(true);
      expect(result.reason).toContain('3 consecutive pages');
    });
    
    it('should reset counter when new links are found', () => {
      // Pages 1-2: No new links
      detector.shouldStop(1, 'http://example.com/page/1', []);
      detector.shouldStop(2, 'http://example.com/page/2', []);
      
      // Page 3: New links - should reset counter
      let result = detector.shouldStop(3, 'http://example.com/page/3', 
        ['new1', 'new2']);
      expect(result.shouldStop).toBe(false);
      
      // Pages 4-5: No new links
      detector.shouldStop(4, 'http://example.com/page/4', ['new1']); // Already seen
      detector.shouldStop(5, 'http://example.com/page/5', ['new2']); // Already seen
      
      // Page 6: No new links - should not stop yet (only 3 consecutive)
      result = detector.shouldStop(6, 'http://example.com/page/6', []);
      expect(result.shouldStop).toBe(true);
    });
  });
  
  describe('404 Error Handling', () => {
    it('should stop after 2 404 errors', () => {
      // Page 1: Normal
      let result = detector.shouldStop(1, 'http://example.com/page/1', 
        ['link1', 'link2'], undefined, 200);
      expect(result.shouldStop).toBe(false);
      
      // Page 2: 404
      result = detector.shouldStop(2, 'http://example.com/page/2', 
        [], undefined, 404);
      expect(result.shouldStop).toBe(false);
      
      // Page 3: Another 404 - should trigger stop
      result = detector.shouldStop(3, 'http://example.com/page/3', 
        [], undefined, 404);
      expect(result.shouldStop).toBe(true);
      expect(result.reason).toContain('2 consecutive 404 errors');
    });
  });
  
  describe('Error Page Content Detection', () => {
    it('should detect default error keywords', () => {
      const errorContent = `
        <h1>Page Not Found</h1>
        <p>Sorry, the page you are looking for does not exist.</p>
      `;
      
      const result = detector.shouldStop(1, 'http://example.com/page/1', 
        [], errorContent, 200);
      expect(result.shouldStop).toBe(true);
      expect(result.reason).toContain('Detected error page content');
    });
    
    it('should detect various error patterns', () => {
      const errorPatterns = [
        'error 404',
        '404 Error',
        'page does not exist',
        'no results found',
        'end of results',
        'no more pages',
        'invalid page',
        'page unavailable'
      ];
      
      for (const pattern of errorPatterns) {
        const newDetector = new PaginationStopDetector();
        const result = newDetector.shouldStop(1, 'http://example.com', 
          [], `<p>${pattern}</p>`, 200);
        expect(result.shouldStop).toBe(true);
      }
    });
  });
  
  describe('Custom Configuration', () => {
    it('should respect custom consecutive empty pages threshold', () => {
      const customDetector = new PaginationStopDetector({
        consecutiveEmptyPages: 2
      });
      
      // Page 1: No new links
      customDetector.shouldStop(1, 'http://example.com/page/1', []);
      
      // Page 2: No new links - should trigger stop (custom threshold is 2)
      const result = customDetector.shouldStop(2, 'http://example.com/page/2', []);
      expect(result.shouldStop).toBe(true);
      expect(result.reason).toContain('2 consecutive pages');
    });
    
    it('should respect custom 404 error threshold', () => {
      const customDetector = new PaginationStopDetector({
        max404Errors: 1
      });
      
      // Page 1: 404 - should trigger stop immediately (custom threshold is 1)
      const result = customDetector.shouldStop(1, 'http://example.com/page/1', 
        [], undefined, 404);
      expect(result.shouldStop).toBe(true);
      expect(result.reason).toContain('1 consecutive 404 errors');
    });
    
    it('should respect custom minimum links per page', () => {
      const customDetector = new PaginationStopDetector({
        minNewLinksPerPage: 3
      });
      
      // Page 1: 2 new links - below threshold
      const result = customDetector.shouldStop(1, 'http://example.com/page/1', 
        ['link1', 'link2']);
      expect(result.shouldStop).toBe(false); // First page, no consecutive count yet
      
      // Page 2: 2 new links - below threshold
      customDetector.shouldStop(2, 'http://example.com/page/2', 
        ['link3', 'link4']);
      
      // Page 3: 1 new link - should trigger stop
      const result3 = customDetector.shouldStop(3, 'http://example.com/page/3', 
        ['link5']);
      expect(result3.shouldStop).toBe(true);
      expect(result3.reason).toContain('fewer than 3 new links');
    });
    
    it('should use custom error keywords', () => {
      const customDetector = new PaginationStopDetector({
        errorKeywords: ['custom error', 'special 404']
      });
      
      // Should not detect default keywords
      let result = customDetector.shouldStop(1, 'http://example.com', 
        [], 'page not found', 200);
      expect(result.shouldStop).toBe(false);
      
      // Should detect custom keywords
      result = customDetector.shouldStop(2, 'http://example.com', 
        [], 'This is a custom error page', 200);
      expect(result.shouldStop).toBe(true);
      expect(result.reason).toContain('Detected error page content');
    });
  });
  
  describe('Statistics', () => {
    it('should track statistics correctly', () => {
      // Page 1: 2 new links
      detector.shouldStop(1, 'http://example.com/page/1', ['link1', 'link2']);
      // Page 2: 1 new link
      detector.shouldStop(2, 'http://example.com/page/2', ['link3']);
      // Page 3: 404 error
      detector.shouldStop(3, 'http://example.com/page/3', [], undefined, 404);
      // Page 4: 2 new links
      detector.shouldStop(4, 'http://example.com/page/4', ['link4', 'link5']);
      
      const stats = detector.getStats();
      // Total pages includes all calls to shouldStop
      expect(stats.totalPages).toBe(4);
      expect(stats.totalUniqueLinks).toBe(5);
      expect(stats.error404Count).toBe(1);
      // Average is (2 + 1 + 0 + 2) / 4 = 1.25
      expect(stats.averageNewLinksPerPage).toBeCloseTo(1.25);
      expect(stats.pageHistory).toHaveLength(4);
    });
  });
  
  describe('Declining Trend Detection', () => {
    it('should detect significant declining trend', () => {
      // Start with many links, then decline
      detector.shouldStop(1, 'http://example.com/page/1', 
        Array.from({length: 10}, (_, i) => `link${i}`));
      detector.shouldStop(2, 'http://example.com/page/2', 
        Array.from({length: 8}, (_, i) => `link${10+i}`));
      detector.shouldStop(3, 'http://example.com/page/3', 
        Array.from({length: 5}, (_, i) => `link${18+i}`));
      detector.shouldStop(4, 'http://example.com/page/4', 
        Array.from({length: 2}, (_, i) => `link${23+i}`));
      
      // Page 5: Should detect declining trend
      const result = detector.shouldStop(5, 'http://example.com/page/5', 
        ['link25']);
      expect(result.shouldStop).toBe(true);
      expect(result.reason).toContain('Significant decline');
    });
  });
});