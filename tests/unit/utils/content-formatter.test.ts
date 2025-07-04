import { describe, expect, it } from 'bun:test';
import {
  formatAsMarkdown,
  formatAsJson,
  formatAsHtml,
  type PageContent,
} from '../../../src/utils/content-formatter';

describe('content-formatter', () => {
  const mockPageContent: PageContent = {
    url: 'https://example.com/test',
    title: 'Test Page',
    content: 'This is test content.\n\nWith multiple paragraphs.',
    metadata: {
      crawledAt: '2024-01-01T12:00:00.000Z',
      contentLength: 42,
      links: ['https://example.com/link1', 'https://example.com/link2'],
    },
  };

  describe('formatAsMarkdown', () => {
    it('should format page content as markdown', () => {
      const result = formatAsMarkdown(mockPageContent);
      
      expect(result).toContain('# Test Page');
      expect(result).toContain('**URL:** https://example.com/test');
      expect(result).toContain('**Crawled:** 2024-01-01T12:00:00.000Z');
      expect(result).toContain('**Content Length:** 42 characters');
      expect(result).toContain('**Links Found:** 2');
      expect(result).toContain('This is test content.');
      expect(result).toContain('## Links');
      expect(result).toContain('- https://example.com/link1');
      expect(result).toContain('- https://example.com/link2');
    });

    it('should handle empty links array', () => {
      const contentNoLinks = { ...mockPageContent, metadata: { ...mockPageContent.metadata, links: [] } };
      const result = formatAsMarkdown(contentNoLinks);
      
      expect(result).toContain('**Links Found:** 0');
      expect(result).toContain('## Links\n\n');
    });
  });

  describe('formatAsJson', () => {
    it('should format page content as JSON', () => {
      const result = formatAsJson(mockPageContent);
      const parsed = JSON.parse(result);
      
      expect(parsed).toEqual(mockPageContent);
    });

    it('should produce pretty-printed JSON', () => {
      const result = formatAsJson(mockPageContent);
      
      expect(result).toContain('  "url":');
      expect(result).toContain('  "title":');
      expect(result.split('\n').length).toBeGreaterThan(10);
    });
  });

  describe('formatAsHtml', () => {
    it('should format page content as HTML', () => {
      const result = formatAsHtml(mockPageContent);
      
      expect(result).toContain('<!DOCTYPE html>');
      expect(result).toContain('<title>Test Page</title>');
      expect(result).toContain('<meta name="source-url" content="https://example.com/test">');
      expect(result).toContain('<meta name="crawled-at" content="2024-01-01T12:00:00.000Z">');
      expect(result).toContain('<h1>Test Page</h1>');
      expect(result).toContain('This is test content.<br>');
      expect(result).toContain('<h2>Links</h2>');
      expect(result).toContain('<li><a href="https://example.com/link1">');
    });

    it('should escape HTML content properly', () => {
      const contentWithHtml = {
        ...mockPageContent,
        content: 'Content with <script>alert("xss")</script> tags',
      };
      const result = formatAsHtml(contentWithHtml);
      
      expect(result).toContain('Content with <script>alert("xss")</script> tags');
    });

    it('should convert newlines to br tags', () => {
      const result = formatAsHtml(mockPageContent);
      
      expect(result).toContain('This is test content.<br>\n<br>\nWith multiple paragraphs.');
    });
  });
});