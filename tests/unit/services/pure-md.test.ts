import { describe, expect, it, mock, beforeEach, afterEach } from 'bun:test';
import axios from 'axios';
import { PureMdClient } from '../../../src/services/pure-md';
import { getAxiosConfig } from '../../../src/utils/axios-config';

// Store original axios methods
const originalAxiosCreate = axios.create;
const originalAxiosIsAxiosError = axios.isAxiosError;

describe('PureMdClient', () => {
  let client: PureMdClient;
  let mockAxiosInstance: any;

  beforeEach(() => {
    mockAxiosInstance = {
      get: mock(),
      post: mock(),
    };
    
    // Mock axios.create and isAxiosError
    axios.create = mock(() => mockAxiosInstance) as any;
    axios.isAxiosError = mock((error: any) => error?.isAxiosError === true) as any;
  });

  afterEach(() => {
    // Restore original axios methods
    axios.create = originalAxiosCreate;
    axios.isAxiosError = originalAxiosIsAxiosError;
  });

  describe('constructor', () => {
    it('should initialize with default config', () => {
      client = new PureMdClient();
      expect((axios.create as any)).toHaveBeenCalledWith(getAxiosConfig({
        baseURL: 'https://pure.md',
        headers: {},
        timeout: 30000,
      }));
    });

    it('should use provided API key', () => {
      client = new PureMdClient({ apiKey: 'test-key' });
      expect((axios.create as any)).toHaveBeenCalledWith(getAxiosConfig({
        baseURL: 'https://pure.md',
        headers: { 'x-puremd-api-token': 'test-key' },
        timeout: 30000,
      }));
    });

    it('should use custom base URL', () => {
      client = new PureMdClient({ baseUrl: 'https://custom.pure.md' });
      expect((axios.create as any)).toHaveBeenCalledWith(getAxiosConfig({
        baseURL: 'https://custom.pure.md',
        headers: {},
        timeout: 30000,
      }));
    });
  });

  describe('fetchContent', () => {
    beforeEach(() => {
      client = new PureMdClient();
    });

    it('should fetch content successfully', async () => {
      const mockContent = '# Test Content\n\nThis is markdown content.';
      mockAxiosInstance.get.mockResolvedValue({ data: mockContent });

      const result = await client.fetchContent('https://test.local');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/https://test.local');
      expect(result).toBe(mockContent);
    });

    it('should handle rate limit errors', async () => {
      const error = {
        isAxiosError: true,
        response: { status: 429, statusText: 'Too Many Requests' },
      };
      mockAxiosInstance.get.mockRejectedValue(error);

      await expect(client.fetchContent('https://test.local')).rejects.toThrow(
        'Rate limit exceeded. Please wait before making more requests.'
      );
    });

    it('should handle other API errors', async () => {
      const error = {
        isAxiosError: true,
        response: { status: 404, statusText: 'Not Found' },
      };
      mockAxiosInstance.get.mockRejectedValue(error);

      await expect(client.fetchContent('https://test.local')).rejects.toThrow(
        'Pure.md API error: 404 Not Found'
      );
    });

    it('should handle non-axios errors', async () => {
      const error = new Error('Network error');
      mockAxiosInstance.get.mockRejectedValue(error);

      await expect(client.fetchContent('https://test.local')).rejects.toThrow('Network error');
    });
  });

  describe('extractData', () => {
    it('should require API key', async () => {
      client = new PureMdClient();
      
      await expect(client.extractData('https://test.local', {})).rejects.toThrow(
        'API key required for data extraction'
      );
    });

    it('should extract data with default options', async () => {
      client = new PureMdClient({ apiKey: 'test-key' });
      const mockData = { title: 'Test', content: 'Content' };
      mockAxiosInstance.post.mockResolvedValue({ data: mockData });

      const result = await client.extractData('https://test.local', {});

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/https://test.local',
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

      await client.extractData('https://test.local', {
        prompt: 'Custom prompt',
        model: 'custom/model',
      });

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/https://test.local',
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