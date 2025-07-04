import { describe, expect, it } from 'bun:test';
import {
  sanitizeFilename,
  urlToFilename,
  titleToFilename,
  hashFilename,
} from '../../../src/utils/file-naming';

describe('file-naming utils', () => {
  describe('sanitizeFilename', () => {
    it('should replace special characters with hyphens', () => {
      expect(sanitizeFilename('hello/world')).toBe('hello-world');
      expect(sanitizeFilename('test@file#name')).toBe('test-file-name');
      expect(sanitizeFilename('spaces in name')).toBe('spaces-in-name');
    });

    it('should lowercase the filename', () => {
      expect(sanitizeFilename('UPPERCASE')).toBe('uppercase');
      expect(sanitizeFilename('MixedCase')).toBe('mixedcase');
    });

    it('should remove leading and trailing hyphens', () => {
      expect(sanitizeFilename('--test--')).toBe('test');
      expect(sanitizeFilename('///test///')).toBe('test');
    });

    it('should limit filename length to 100 characters', () => {
      const longName = 'a'.repeat(150);
      expect(sanitizeFilename(longName).length).toBe(100);
    });
  });

  describe('urlToFilename', () => {
    it('should convert URL to filename', () => {
      expect(urlToFilename('https://example.com')).toBe('example-com');
      expect(urlToFilename('https://www.example.com')).toBe('example-com');
      expect(urlToFilename('https://example.com/path/to/page')).toBe('example-com-path-to-page');
    });

    it('should handle URLs with query parameters', () => {
      expect(urlToFilename('https://example.com/page?param=value')).toBe('example-com-page');
    });

    it('should handle URLs with fragments', () => {
      expect(urlToFilename('https://example.com/page#section')).toBe('example-com-page');
    });
  });

  describe('titleToFilename', () => {
    it('should combine title and URL hash', () => {
      const result = titleToFilename('My Page Title', 'https://example.com/page');
      expect(result).toMatch(/^my-page-title-[a-f0-9]{8}$/);
    });

    it('should sanitize the title', () => {
      const result = titleToFilename('Title with Special!@# Chars', 'https://example.com');
      expect(result).toMatch(/^title-with-special-chars-[a-f0-9]{8}$/);
    });
  });

  describe('hashFilename', () => {
    it('should generate consistent hash for same URL', () => {
      const url = 'https://example.com/page';
      expect(hashFilename(url)).toBe(hashFilename(url));
    });

    it('should generate different hashes for different URLs', () => {
      expect(hashFilename('https://example.com/page1')).not.toBe(hashFilename('https://example.com/page2'));
    });

    it('should return 16-character hash', () => {
      expect(hashFilename('https://example.com').length).toBe(16);
    });
  });
});