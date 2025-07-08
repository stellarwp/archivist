import { describe, expect, it } from 'bun:test';
import { matchesPattern, shouldIncludeUrl, normalizePattern } from '../../../src/utils/pattern-matcher';

describe('pattern-matcher', () => {
  describe('matchesPattern', () => {
    describe('minimatch patterns', () => {
      it('should match simple glob patterns', () => {
        expect(matchesPattern('https://example.com/api/users', '*/api/*')).toBe(true);
        expect(matchesPattern('https://example.com/api/users', '*/api/*')).toBe(true);
        expect(matchesPattern('https://example.com/docs/guide.html', '*.html')).toBe(true);
        expect(matchesPattern('https://example.com/blog/post', '*/blog/*')).toBe(true);
      });

      it('should match double wildcard patterns', () => {
        expect(matchesPattern('https://example.com/api/v1/users/123', '**/users/*')).toBe(true);
        expect(matchesPattern('https://example.com/deep/path/api/users/456', '**/users/*')).toBe(true);
        expect(matchesPattern('https://example.com/api/v1/posts', '**/api/**')).toBe(true);
      });

      it('should match file extensions', () => {
        expect(matchesPattern('https://example.com/docs/guide.pdf', '*.pdf')).toBe(true);
        expect(matchesPattern('https://example.com/assets/image.jpg', '*.jpg')).toBe(true);
        expect(matchesPattern('https://example.com/script.js', '*.js')).toBe(true);
      });

      it('should match exact URLs', () => {
        expect(matchesPattern('https://example.com/exact', 'https://example.com/exact')).toBe(true);
        expect(matchesPattern('https://example.com/exact', 'https://example.com/other')).toBe(false);
      });

      it('should handle case insensitive matching', () => {
        expect(matchesPattern('https://EXAMPLE.COM/API/USERS', '*/api/*')).toBe(true);
        expect(matchesPattern('https://example.com/API/users', '*/API/*')).toBe(true);
      });

      it('should match patterns with braces', () => {
        expect(matchesPattern('https://example.com/file.jpg', '*.{jpg,png,gif}')).toBe(true);
        expect(matchesPattern('https://example.com/file.png', '*.{jpg,png,gif}')).toBe(true);
        expect(matchesPattern('https://example.com/file.pdf', '*.{jpg,png,gif}')).toBe(false);
      });

      it('should match negation patterns', () => {
        expect(matchesPattern('https://example.com/public/file', '*/public/*')).toBe(true);
        expect(matchesPattern('https://example.com/private/file', '*/public/*')).toBe(false);
      });

      it('should match question mark patterns', () => {
        expect(matchesPattern('https://example.com/v1', 'https://example.com/v?')).toBe(true);
        expect(matchesPattern('https://example.com/v2', 'https://example.com/v?')).toBe(true);
        expect(matchesPattern('https://example.com/v10', 'https://example.com/v?')).toBe(false);
      });
    });

    describe('regex patterns', () => {
      it('should match regex patterns with anchors', () => {
        expect(matchesPattern('https://example.com/api/users', '^https://example\\.com/api/.*')).toBe(true);
        expect(matchesPattern('https://example.com/api/users', '.*\\.com/api/users$')).toBe(true);
        expect(matchesPattern('https://other.com/api/users', '^https://example\\.com/.*')).toBe(false);
      });

      it('should match regex character classes', () => {
        expect(matchesPattern('https://example.com/api/v1', '/api/v\\d+')).toBe(true);
        expect(matchesPattern('https://example.com/api/v2', '/api/v\\d+')).toBe(true);
        expect(matchesPattern('https://example.com/api/va', '/api/v\\d+')).toBe(false);
      });

      it('should match regex word boundaries', () => {
        expect(matchesPattern('https://example.com/test', '\\btest\\b')).toBe(true);
        expect(matchesPattern('https://example.com/testing', '\\btest\\b')).toBe(false);
      });

      it('should match regex alternation', () => {
        expect(matchesPattern('https://example.com/api/users', '/(api|admin)/.*')).toBe(true);
        expect(matchesPattern('https://example.com/admin/users', '/(api|admin)/.*')).toBe(true);
        expect(matchesPattern('https://example.com/public/users', '/(api|admin)/.*')).toBe(false);
      });

      it('should match regex quantifiers', () => {
        expect(matchesPattern('https://example.com/file.txt', '\\.txt$')).toBe(true);
        expect(matchesPattern('https://example.com/path/', '/path/+')).toBe(true);
        expect(matchesPattern('https://example.com/abc123', '[a-z]+\\d+')).toBe(true);
      });
    });

    describe('invalid patterns', () => {
      it('should handle invalid regex gracefully', () => {
        expect(matchesPattern('https://example.com', '[')).toBe(false);
        expect(matchesPattern('https://example.com', '(')).toBe(false);
        expect(matchesPattern('https://example.com', '\\')).toBe(false);
      });
    });
  });

  describe('shouldIncludeUrl', () => {
    it('should include all URLs when no patterns provided', () => {
      expect(shouldIncludeUrl('https://example.com/anything')).toBe(true);
      expect(shouldIncludeUrl('https://example.com/other')).toBe(true);
    });

    it('should respect include patterns with minimatch', () => {
      const includePatterns = ['*/api/*', '*/docs/*'];
      expect(shouldIncludeUrl('https://example.com/api/users', includePatterns)).toBe(true);
      expect(shouldIncludeUrl('https://example.com/docs/guide', includePatterns)).toBe(true);
      expect(shouldIncludeUrl('https://example.com/blog/post', includePatterns)).toBe(false);
    });

    it('should respect exclude patterns with minimatch', () => {
      const excludePatterns = ['*.pdf', '*/private/*', '*/admin/*'];
      expect(shouldIncludeUrl('https://example.com/public/doc.html', undefined, excludePatterns)).toBe(true);
      expect(shouldIncludeUrl('https://example.com/file.pdf', undefined, excludePatterns)).toBe(false);
      expect(shouldIncludeUrl('https://example.com/private/data', undefined, excludePatterns)).toBe(false);
      expect(shouldIncludeUrl('https://example.com/admin/panel', undefined, excludePatterns)).toBe(false);
    });

    it('should combine include and exclude patterns', () => {
      const includePatterns = ['*/api/*'];
      const excludePatterns = ['*/api/private/*', '*.pdf'];
      
      expect(shouldIncludeUrl('https://example.com/api/public/users', includePatterns, excludePatterns)).toBe(true);
      expect(shouldIncludeUrl('https://example.com/api/private/data', includePatterns, excludePatterns)).toBe(false);
      expect(shouldIncludeUrl('https://example.com/api/doc.pdf', includePatterns, excludePatterns)).toBe(false);
      expect(shouldIncludeUrl('https://example.com/other/page', includePatterns, excludePatterns)).toBe(false);
    });

    it('should work with regex patterns for backward compatibility', () => {
      const includePatterns = ['^https://example\\.com/api/.*'];
      const excludePatterns = ['.*\\.pdf$', '.*/test/.*'];
      
      expect(shouldIncludeUrl('https://example.com/api/users', includePatterns, excludePatterns)).toBe(true);
      expect(shouldIncludeUrl('https://example.com/api/test/data', includePatterns, excludePatterns)).toBe(false);
      expect(shouldIncludeUrl('https://example.com/api/doc.pdf', includePatterns, excludePatterns)).toBe(false);
    });

    it('should handle mixed minimatch and regex patterns', () => {
      const includePatterns = ['*/api/*', '^https://example\\.com/docs/.*'];
      const excludePatterns = ['*.pdf', '.*\\/v1\\/.*'];
      
      expect(shouldIncludeUrl('https://example.com/api/v2/users', includePatterns, excludePatterns)).toBe(true);
      expect(shouldIncludeUrl('https://example.com/docs/guide', includePatterns, excludePatterns)).toBe(true);
      expect(shouldIncludeUrl('https://example.com/api/v1/users', includePatterns, excludePatterns)).toBe(false);
      expect(shouldIncludeUrl('https://example.com/docs/guide.pdf', includePatterns, excludePatterns)).toBe(false);
    });
  });

  describe('normalizePattern', () => {
    it('should normalize path patterns', () => {
      expect(normalizePattern('/api/users')).toBe('**/api/users');
      expect(normalizePattern('api/users')).toBe('**/api/users');
      expect(normalizePattern('users')).toBe('**/users');
    });

    it('should leave URL patterns unchanged', () => {
      expect(normalizePattern('https://example.com/api/*')).toBe('https://example.com/api/*');
      expect(normalizePattern('http://example.com/*')).toBe('http://example.com/*');
    });

    it('should leave wildcard patterns unchanged', () => {
      expect(normalizePattern('*/api/*')).toBe('*/api/*');
      expect(normalizePattern('**/api/**')).toBe('**/api/**');
      expect(normalizePattern('*.pdf')).toBe('*.pdf');
    });
  });
});