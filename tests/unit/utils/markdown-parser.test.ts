import { describe, expect, it } from 'bun:test';
import { parseMarkdownContent } from '../../../src/utils/markdown-parser';

describe('markdown-parser', () => {
  const testUrl = 'https://test.local/page';

  describe('parseMarkdownContent', () => {
    it('should extract title from H1', () => {
      const markdown = '# Main Title\n\nSome content';
      const result = parseMarkdownContent(markdown, testUrl);
      expect(result.title).toBe('Main Title');
    });

    it('should fallback to URL-based title when no H1', () => {
      const markdown = 'Some content without heading';
      const result = parseMarkdownContent(markdown, testUrl);
      expect(result.title).toBe('Page');
    });

    it('should extract markdown links', () => {
      const markdown = `
Some text with [a link](https://test.local/link1) and
[another link](https://test.local/link2).
`;
      const result = parseMarkdownContent(markdown, testUrl);
      expect(result.metadata.links).toContain('https://test.local/link1');
      expect(result.metadata.links).toContain('https://test.local/link2');
    });

    it('should extract plain URLs', () => {
      const markdown = `
Check out https://test.local/direct and
also visit https://test.local/another
`;
      const result = parseMarkdownContent(markdown, testUrl);
      expect(result.metadata.links).toContain('https://test.local/direct');
      expect(result.metadata.links).toContain('https://test.local/another');
    });

    it('should convert relative links to absolute', () => {
      const markdown = '[Relative Link](/relative/path)';
      const result = parseMarkdownContent(markdown, testUrl);
      expect(result.metadata.links).toContain('https://test.local/relative/path');
    });

    it('should ignore anchor and mailto links', () => {
      const markdown = `
[Section](#section)
[Email](mailto:test@test.local)
[External](https://external.com)
`;
      const result = parseMarkdownContent(markdown, testUrl);
      expect(result.metadata.links).toHaveLength(1);
      expect(result.metadata.links[0]).toBe('https://external.com');
    });

    it('should deduplicate links', () => {
      const markdown = `
[Link 1](https://test.local/same)
[Link 2](https://test.local/same)
https://test.local/same
`;
      const result = parseMarkdownContent(markdown, testUrl);
      expect(result.metadata.links).toHaveLength(1);
      expect(result.metadata.links[0]).toBe('https://test.local/same');
    });

    it('should set metadata correctly', () => {
      const markdown = '# Test\n\nContent here';
      const result = parseMarkdownContent(markdown, testUrl);
      
      expect(result.url).toBe(testUrl);
      expect(result.content).toBe(markdown.trim());
      expect(result.metadata.contentLength).toBe(markdown.trim().length);
      expect(result.metadata.crawledAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });
});