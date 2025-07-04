import axios, { type AxiosInstance, type AxiosError } from 'axios';

export interface PureMdConfig {
  apiKey?: string;
  baseUrl?: string;
}

export interface PureMdExtractOptions {
  prompt?: string;
  model?: string;
}

export class PureMdClient {
  private apiKey?: string;
  private axios: AxiosInstance;

  constructor(config: PureMdConfig = {}) {
    this.apiKey = config.apiKey || process.env.PURE_API_KEY;
    
    this.axios = axios.create({
      baseURL: config.baseUrl || 'https://pure.md',
      headers: this.apiKey ? {
        'x-puremd-api-token': this.apiKey
      } : {},
      timeout: 30000,
    });
  }

  async fetchContent(url: string): Promise<string> {
    try {
      const response = await this.axios.get(`/${encodeURIComponent(url)}`);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        if (axiosError.response?.status === 429) {
          throw new Error('Rate limit exceeded. Please wait before making more requests.');
        }
        throw new Error(`Pure.md API error: ${axiosError.response?.status} ${axiosError.response?.statusText}`);
      }
      throw error;
    }
  }

  async extractData(url: string, options: PureMdExtractOptions): Promise<any> {
    if (!this.apiKey) {
      throw new Error('API key required for data extraction. Set PURE_API_KEY environment variable or provide it in config.');
    }

    try {
      const response = await this.axios.post(`/${encodeURIComponent(url)}`, {
        prompt: options.prompt || 'Extract the main content and metadata',
        model: options.model || 'meta/llama-3.1-8b',
      });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        if (axiosError.response?.status === 429) {
          throw new Error('Rate limit exceeded. Please wait before making more requests.');
        }
        throw new Error(`Pure.md API error: ${axiosError.response?.status} ${axiosError.response?.statusText}`);
      }
      throw error;
    }
  }

  async searchAndFetch(query: string): Promise<string> {
    if (!this.apiKey) {
      throw new Error('API key required for search. Set PURE_API_KEY environment variable or provide it in config.');
    }

    try {
      const response = await this.axios.get('/search', {
        params: { q: query }
      });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        if (axiosError.response?.status === 429) {
          throw new Error('Rate limit exceeded. Please wait before making more requests.');
        }
        throw new Error(`Pure.md API error: ${axiosError.response?.status} ${axiosError.response?.statusText}`);
      }
      throw error;
    }
  }
}