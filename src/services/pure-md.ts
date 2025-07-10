import { singleton } from 'tsyringe';
import axios, { type AxiosInstance, type AxiosError } from 'axios';
import { ConfigService } from './config.service';
import { HttpService } from './http.service';
import { LoggerService } from './logger.service';

export interface PureMdConfig {
  apiKey?: string;
  baseUrl?: string;
}

export interface PureMdExtractOptions {
  prompt?: string;
  model?: string;
}

@singleton()
export class PureMdClient {
  private apiKey?: string;
  private axios!: AxiosInstance;
  private baseUrl: string = 'https://pure.md';

  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
    private logger: LoggerService
  ) {
    this.initializeClient();
  }
  
  private initializeClient(): void {
    try {
      this.apiKey = this.configService.getPureApiKey();
    } catch {
      // Config not yet initialized
      this.logger.debug('PureMdClient: Config not yet initialized');
    }
    
    const headers = this.apiKey ? {
      'x-puremd-api-token': this.apiKey
    } : {};
    
    this.axios = this.httpService.createInstance({
      baseURL: this.baseUrl,
      headers,
      timeout: 30000,
    });
  }
  
  // Re-initialize when config changes
  updateConfig(): void {
    this.initializeClient();
  }

  async fetchContent(url: string): Promise<string> {
    try {
      const response = await this.axios.get(`/${url}`);
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
      const response = await this.axios.post(`/${url}`, {
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