import { describe, expect, it, mock, beforeEach } from 'bun:test';
import axios from 'axios';
import { PureMdClient } from '../../../src/services/pure-md';

// Mock axios
mock.module('axios', () => ({
  default: {
    create: mock(() => ({
      get: mock(),
      post: mock(),
    })),
    isAxiosError: mock((error: any) => error.isAxiosError === true),
  },
}));

describe('PureMdClient', () => {
  let client: PureMdClient;
  let mockAxiosInstance: any;

  beforeEach(() => {
    mockAxiosInstance = {
      get: mock(),
      post: mock(),
    };
    (axios.create as any).mockReturnValue(mockAxiosInstance);
  });

  describe('constructor', () => {
    it('should initialize with default config', () => {
      client = new PureMdClient();
      expect(axios.create).toHaveBeenCalledWith({
        baseURL: 'https://pure.md',
        headers: {},
        timeout: 30000,
      });
    });

    it('should use provided API key', () => {
      client = new PureMdClient({ apiKey: 'test-key' });
      expect(axios.create).toHaveBeenCalledWith({
        baseURL: 'https://pure.md',
        headers: { 'x-puremd-api-token': 'test-key' },
        timeout: 30000,
      });
    });

    it('should use custom base URL', () => {
      client = new PureMdClient({ baseUrl: 'https://custom.pure.md' });
      expect(axios.create).toHaveBeenCalledWith({
        baseURL: 'https://custom.pure.md',
        headers: {},
        timeout: 30000,
      });
    });
  });

  describe('fetchContent', () => {
    beforeEach(() => {
      client = new PureMdClient();
    });

    it('should fetch content successfully', async () => {
      const mockContent = '# Test Content\n\nThis is markdown content.';
      mockAxiosInstance.get.mockResolvedValue({ data: mockContent });

      const result = await client.fetchContent('https://example.com');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/https%3A%2F%2Fexample.com');
      expect(result).toBe(mockContent);
    });

    it('should handle rate limit errors', async () => {
      const error = {
        isAxiosError: true,
        response: { status: 429, statusText: 'Too Many Requests' },
      };
      mockAxiosInstance.get.mockRejectedValue(error);

      await expect(client.fetchContent('https://example.com')).rejects.toThrow(
        'Rate limit exceeded. Please wait before making more requests.'
      );
    });

    it('should handle other API errors', async () => {
      const error = {
        isAxiosError: true,
        response: { status: 404, statusText: 'Not Found' },
      };
      mockAxiosInstance.get.mockRejectedValue(error);

      await expect(client.fetchContent('https://example.com')).rejects.toThrow(
        'Pure.md API error: 404 Not Found'
      );
    });

    it('should handle non-axios errors', async () => {
      const error = new Error('Network error');
      mockAxiosInstance.get.mockRejectedValue(error);

      await expect(client.fetchContent('https://example.com')).rejects.toThrow('Network error');
    });
  });

  describe('extractData', () => {
    it('should require API key', async () => {
      client = new PureMdClient();
      
      await expect(client.extractData('https://example.com', {})).rejects.toThrow(
        'API key required for data extraction'
      );
    });

    it('should extract data with default options', async () => {
      client = new PureMdClient({ apiKey: 'test-key' });
      const mockData = { title: 'Test', content: 'Content' };
      mockAxiosInstance.post.mockResolvedValue({ data: mockData });

      const result = await client.extractData('https://example.com', {});

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/https%3A%2F%2Fexample.com',
        {
          prompt: 'Extract the main content and metadata',
          model: 'meta/llama-3.1-8b',
        }
      );
      expect(result).toEqual(mockData);
    });

    it('should use custom prompt and model', async () => {
      client = new PureMdClient({ apiKey: 'test-key' });
      mockAxiosInstance.post.mockResolvedValue({ data: {} });

      await client.extractData('https://example.com', {
        prompt: 'Custom prompt',
        model: 'custom/model',
      });

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/https%3A%2F%2Fexample.com',
        {
          prompt: 'Custom prompt',
          model: 'custom/model',
        }
      );
    });
  });

  describe('searchAndFetch', () => {
    it('should require API key', async () => {
      client = new PureMdClient();
      
      await expect(client.searchAndFetch('test query')).rejects.toThrow(
        'API key required for search'
      );
    });

    it('should search successfully', async () => {
      client = new PureMdClient({ apiKey: 'test-key' });
      const mockResults = '# Search Results\n\nContent here';
      mockAxiosInstance.get.mockResolvedValue({ data: mockResults });

      const result = await client.searchAndFetch('test query');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/search', {
        params: { q: 'test query' },
      });
      expect(result).toBe(mockResults);
    });
  });
});