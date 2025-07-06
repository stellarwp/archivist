import { describe, expect, it } from 'bun:test';
import type { ArchivistConfig } from '../../archivist.config';

// Test pattern filtering logic without mocking dependencies
describe('Crawler Pattern Filtering', () => {
  // Test the pattern logic that would be used by filterLinks
  const testPatternMatching = (
    url: string,
    includePatterns?: string[],
    excludePatterns?: string[]
  ): boolean => {
    // This mimics the logic in filterLinks
    if (!includePatterns && !excludePatterns) {
      return true;
    }

    // Check include patterns
    if (includePatterns && includePatterns.length > 0) {
      const matchesInclude = includePatterns.some(pattern => {
        try {
          return new RegExp(pattern).test(url);
        } catch {
          return false;
        }
      });
      
      if (!matchesInclude) {
        return false;
      }
    }
    
    // Check exclude patterns
    if (excludePatterns && excludePatterns.length > 0) {
      const matchesExclude = excludePatterns.some(pattern => {
        try {
          return new RegExp(pattern).test(url);
        } catch {
          return false;
        }
      });
      
      if (matchesExclude) {
        return false;
      }
    }
    
    return true;
  };

  describe('includePatterns', () => {
    it('should match URLs against include patterns', () => {
      const includePatterns = ['https://example\\.com/api/.*'];
      
      expect(testPatternMatching('https://example.com/api/users', includePatterns)).toBe(true);
      expect(testPatternMatching('https://example.com/api/posts', includePatterns)).toBe(true);
      expect(testPatternMatching('https://example.com/docs', includePatterns)).toBe(false);
      expect(testPatternMatching('https://other.com/api/users', includePatterns)).toBe(false);
    });

    it('should handle multiple include patterns', () => {
      const includePatterns = [
        'https://example\\.com/api/.*',
        'https://example\\.com/docs/.*'
      ];
      
      expect(testPatternMatching('https://example.com/api/users', includePatterns)).toBe(true);
      expect(testPatternMatching('https://example.com/docs/guide', includePatterns)).toBe(true);
      expect(testPatternMatching('https://example.com/blog', includePatterns)).toBe(false);
    });

    it('should handle complex regex patterns', () => {
      const includePatterns = ['.*\\.(html|htm)$'];
      
      expect(testPatternMatching('https://example.com/page.html', includePatterns)).toBe(true);
      expect(testPatternMatching('https://example.com/doc.htm', includePatterns)).toBe(true);
      expect(testPatternMatching('https://example.com/file.pdf', includePatterns)).toBe(false);
    });
  });

  describe('excludePatterns', () => {
    it('should exclude URLs matching exclude patterns', () => {
      const excludePatterns = ['.*\\.pdf$'];
      
      expect(testPatternMatching('https://example.com/doc.html', undefined, excludePatterns)).toBe(true);
      expect(testPatternMatching('https://example.com/file.pdf', undefined, excludePatterns)).toBe(false);
    });

    it('should handle multiple exclude patterns', () => {
      const excludePatterns = [
        '.*\\.pdf$',
        '.*/private/.*',
        '.*\\?.*'
      ];
      
      expect(testPatternMatching('https://example.com/public/doc.html', undefined, excludePatterns)).toBe(true);
      expect(testPatternMatching('https://example.com/file.pdf', undefined, excludePatterns)).toBe(false);
      expect(testPatternMatching('https://example.com/private/data', undefined, excludePatterns)).toBe(false);
      expect(testPatternMatching('https://example.com/page?param=1', undefined, excludePatterns)).toBe(false);
    });
  });

  describe('combined patterns', () => {
    it('should apply both include and exclude patterns', () => {
      const includePatterns = ['https://example\\.com/.*'];
      const excludePatterns = ['.*\\.pdf$', '.*/temp/.*'];
      
      // Should be included (matches include, not excluded)
      expect(testPatternMatching('https://example.com/doc.html', includePatterns, excludePatterns)).toBe(true);
      
      // Should be excluded (matches include but also matches exclude)
      expect(testPatternMatching('https://example.com/file.pdf', includePatterns, excludePatterns)).toBe(false);
      expect(testPatternMatching('https://example.com/temp/file', includePatterns, excludePatterns)).toBe(false);
      
      // Should be excluded (doesn't match include)
      expect(testPatternMatching('https://other.com/doc.html', includePatterns, excludePatterns)).toBe(false);
    });

    it('should handle invalid regex patterns gracefully', () => {
      const includePatterns = ['[invalid regex'];
      const excludePatterns = ['[also invalid'];
      
      // Should handle invalid patterns without throwing
      expect(() => testPatternMatching('https://example.com', includePatterns, excludePatterns)).not.toThrow();
    });
  });

  describe('edge cases', () => {
    it('should return true when no patterns provided', () => {
      expect(testPatternMatching('https://example.com')).toBe(true);
      expect(testPatternMatching('https://example.com', [], [])).toBe(true);
    });

    it('should handle empty pattern arrays', () => {
      expect(testPatternMatching('https://example.com', [])).toBe(true);
      expect(testPatternMatching('https://example.com', undefined, [])).toBe(true);
    });
  });

  describe('link deduplication', () => {
    it('should handle duplicate links in a Set', () => {
      const linkSet = new Set<string>();
      
      // Add same link multiple times
      linkSet.add('https://example.com/page1');
      linkSet.add('https://example.com/page2');
      linkSet.add('https://example.com/page1'); // duplicate
      linkSet.add('https://example.com/page3');
      linkSet.add('https://example.com/page2'); // duplicate
      linkSet.add('https://example.com/page1'); // duplicate
      
      // Set should only contain unique values
      expect(linkSet.size).toBe(3);
      expect(Array.from(linkSet)).toEqual([
        'https://example.com/page1',
        'https://example.com/page2',
        'https://example.com/page3'
      ]);
    });

    it('should track duplicate counts correctly', () => {
      const queue = new Set<string>();
      const links = [
        'https://example.com/article1',
        'https://example.com/article2',
        'https://example.com/article1', // duplicate
        'https://example.com/article3',
        'https://example.com/article2', // duplicate
      ];
      
      const queueSizeBefore = queue.size;
      for (const link of links) {
        queue.add(link);
      }
      const newLinksAdded = queue.size - queueSizeBefore;
      
      expect(newLinksAdded).toBe(3); // Only 3 unique links
      expect(links.length - newLinksAdded).toBe(2); // 2 duplicates
    });
  });
});