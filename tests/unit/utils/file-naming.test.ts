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
      expect(urlToFilename('https://test.local')).toBe('test-local');
      expect(urlToFilename('https://www.test.local')).toBe('test-local');
      expect(urlToFilename('https://test.local/path/to/page')).toBe('test-local-path-to-page');
    });

    it('should handle URLs with query parameters', () => {
      expect(urlToFilename('https://test.local/page?param=value')).toBe('test-local-page');
    });

    it('should handle URLs with fragments', () => {
      expect(urlToFilename('https://test.local/page#section')).toBe('test-local-page');
    });
  });

  describe('titleToFilename', () => {
    it('should combine title and URL hash', () => {
      const result = titleToFilename('My Page Title', 'https://test.local/page');
      expect(result).toMatch(/^my-page-title-[a-f0-9]{8}$/);
    });

    it('should sanitize the title', () => {
      const result = titleToFilename('Title with Special!@# Chars', 'https://test.local');
      expect(result).toMatch(/^title-with-special-chars-[a-f0-9]{8}$/);
    });
  });

  describe('hashFilename', () => {
    it('should generate consistent hash for same URL', () => {
      const url = 'https://test.local/page';
      expect(hashFilename(url)).toBe(hashFilename(url));
    });

    it('should generate different hashes for different URLs', () => {
      expect(hashFilename('https://test.local/page1')).not.toBe(hashFilename('https://test.local/page2'));
    });

    it('should return 16-character hash', () => {
      expect(hashFilename('https://test.local').length).toBe(16);
    });
  });
});