import { describe, expect, it, mock, beforeEach, afterEach } from 'bun:test';
import { extractLinksFromPage } from '../../src/utils/link-extractor';
import axios from 'axios';
import { readFileSync } from 'fs';
import { join } from 'path';

// Store original axios.get
const originalAxiosGet = axios.get;

// Load mock HTML fixture
const fixturesPath = join(__dirname, '../fixtures');
const apiDocsHtml = readFileSync(join(fixturesPath, 'api-documentation.html'), 'utf-8');

describe('Pattern Matching Integration', () => {
  beforeEach(() => {
    // Mock axios.get
    axios.get = mock(() => Promise.resolve({ data: apiDocsHtml })) as any;
  });

  afterEach(() => {
    // Restore original axios.get
    axios.get = originalAxiosGet;
  });

  describe('minimatch patterns', () => {
    it('should filter links using glob patterns for API versions', async () => {
      const result = await extractLinksFromPage({
        url: 'https://example.com/docs',
        includePatterns: ['*/v1/*'],
      });

      expect(result).toContain('https://api.example.com/v1/users');
      expect(result).toContain('https://api.example.com/v1/posts');
      expect(result).toContain('https://api.example.com/v1/comments');
      expect(result).not.toContain('https://api.example.com/v2/users');
      expect(result).not.toContain('https://api.example.com/v2/posts');
    });

    it('should exclude admin and internal URLs using glob patterns', async () => {
      const result = await extractLinksFromPage({
        url: 'https://example.com/docs',
        excludePatterns: ['*/admin/*', '*/internal/*'],
      });

      expect(result).toContain('https://api.example.com/v1/users');
      expect(result).toContain('https://docs.example.com/guide/getting-started');
      expect(result).not.toContain('https://api.example.com/admin/dashboard');
      expect(result).not.toContain('https://api.example.com/admin/users');
      expect(result).not.toContain('https://api.example.com/internal/metrics');
    });

    it('should filter by file extension using glob patterns', async () => {
      const result = await extractLinksFromPage({
        url: 'https://example.com/docs',
        includePatterns: ['*.pdf', '*.json'],
      });

      expect(result).toContain('https://cdn.example.com/downloads/api-spec.pdf');
      expect(result).toContain('https://cdn.example.com/downloads/postman-collection.json');
      expect(result).not.toContain('https://cdn.example.com/downloads/sdk-java.zip');
      expect(result).not.toContain('https://cdn.example.com/images/architecture.png');
    });

    it('should match documentation paths using double wildcard', async () => {
      const result = await extractLinksFromPage({
        url: 'https://example.com/docs',
        includePatterns: ['**/guide/**', '**/tutorials/**'],
      });

      expect(result).toContain('https://docs.example.com/guide/getting-started');
      expect(result).toContain('https://docs.example.com/guide/authentication');
      expect(result).toContain('https://docs.example.com/tutorials/quickstart');
      expect(result).toContain('https://docs.example.com/tutorials/advanced');
      expect(result).not.toContain('https://docs.example.com/reference/api');
      expect(result).not.toContain('https://api.example.com/v1/users');
    });

    it('should use brace expansion for multiple extensions', async () => {
      const result = await extractLinksFromPage({
        url: 'https://example.com/docs',
        includePatterns: ['*.{png,jpg,mp4}'],
      });

      expect(result).toContain('https://cdn.example.com/images/architecture.png');
      expect(result).toContain('https://cdn.example.com/videos/tutorial.mp4');
      expect(result).not.toContain('https://cdn.example.com/downloads/api-spec.pdf');
    });

    it('should exclude deprecated paths', async () => {
      const result = await extractLinksFromPage({
        url: 'https://example.com/docs',
        excludePatterns: ['*/deprecated/*'],
      });

      expect(result).not.toContain('https://api.example.com/deprecated/old-api');
      expect(result).toContain('https://api.example.com/v1/users');
    });
  });

  describe('regex patterns (backward compatibility)', () => {
    it('should filter using regex patterns for API endpoints', async () => {
      const result = await extractLinksFromPage({
        url: 'https://example.com/docs',
        includePatterns: ['https://api\\.example\\.com/v\\d+/.*'],
      });

      expect(result).toContain('https://api.example.com/v1/users');
      expect(result).toContain('https://api.example.com/v2/users');
      expect(result).toContain('https://api.example.com/v1/posts');
      expect(result).not.toContain('https://api.example.com/admin/dashboard');
      expect(result).not.toContain('https://docs.example.com/guide/getting-started');
    });

    it('should exclude using regex with anchors', async () => {
      const result = await extractLinksFromPage({
        url: 'https://example.com/docs',
        excludePatterns: ['.*\\.(pdf|zip|mp4)$'],
      });

      expect(result).not.toContain('https://cdn.example.com/downloads/api-spec.pdf');
      expect(result).not.toContain('https://cdn.example.com/downloads/sdk-java.zip');
      expect(result).not.toContain('https://cdn.example.com/videos/tutorial.mp4');
      expect(result).toContain('https://cdn.example.com/images/architecture.png');
      expect(result).toContain('https://api.example.com/v1/users');
    });

    it('should match using regex alternation', async () => {
      const result = await extractLinksFromPage({
        url: 'https://example.com/docs',
        includePatterns: ['.*(github|stackoverflow|twitter)\\.com.*'],
      });

      expect(result).toContain('https://github.com/example/api-client');
      expect(result).toContain('https://stackoverflow.com/questions/tagged/example-api');
      expect(result).toContain('https://twitter.com/exampleapi');
      expect(result).not.toContain('https://blog.example.com/category/api');
    });
  });

  describe('mixed patterns', () => {
    it('should handle mix of minimatch and regex patterns', async () => {
      const result = await extractLinksFromPage({
        url: 'https://example.com/docs',
        includePatterns: [
          '*/v1/*',                                    // minimatch
          'https://docs\\.example\\.com/.*',         // regex
        ],
        excludePatterns: [
          '*.pdf',                                     // minimatch
          '.*/(admin|internal)/.*',                    // regex
        ],
      });

      expect(result).toContain('https://api.example.com/v1/users');
      expect(result).toContain('https://api.example.com/v1/posts');
      expect(result).toContain('https://docs.example.com/guide/getting-started');
      expect(result).toContain('https://docs.example.com/tutorials/quickstart');
      expect(result).not.toContain('https://api.example.com/v2/users');
      expect(result).not.toContain('https://api.example.com/admin/dashboard');
      expect(result).not.toContain('https://api.example.com/internal/metrics');
      expect(result).not.toContain('https://cdn.example.com/downloads/api-spec.pdf');
    });
  });

  describe('complex scenarios', () => {
    it('should handle API versioning with complex patterns', async () => {
      const result = await extractLinksFromPage({
        url: 'https://example.com/docs',
        includePatterns: ['https://api.example.com/**'],
        excludePatterns: ['*/deprecated/*', '*/admin/*', '*/internal/*'],
      });

      expect(result).toContain('https://api.example.com/v1/users');
      expect(result).toContain('https://api.example.com/v2/posts');
      expect(result).not.toContain('https://api.example.com/deprecated/old-api');
      expect(result).not.toContain('https://api.example.com/admin/dashboard');
      expect(result).not.toContain('https://docs.example.com/guide/getting-started');
    });

    it('should filter documentation by type', async () => {
      const result = await extractLinksFromPage({
        url: 'https://example.com/docs',
        includePatterns: ['https://docs.example.com/**'],
        excludePatterns: ['*/reference/*'],
      });

      expect(result).toContain('https://docs.example.com/guide/getting-started');
      expect(result).toContain('https://docs.example.com/tutorials/quickstart');
      expect(result).not.toContain('https://docs.example.com/reference/api');
      expect(result).not.toContain('https://docs.example.com/reference/webhooks');
    });

    it('should collect only downloadable resources', async () => {
      const result = await extractLinksFromPage({
        url: 'https://example.com/docs',
        includePatterns: ['https://cdn.example.com/downloads/*'],
      });

      expect(result).toContain('https://cdn.example.com/downloads/sdk-java.zip');
      expect(result).toContain('https://cdn.example.com/downloads/sdk-python.zip');
      expect(result).toContain('https://cdn.example.com/downloads/api-spec.pdf');
      expect(result).toContain('https://cdn.example.com/downloads/postman-collection.json');
      expect(result).not.toContain('https://cdn.example.com/images/architecture.png');
      expect(result).not.toContain('https://api.example.com/v1/users');
    });
  });
});