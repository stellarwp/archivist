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
  private baseUrl: string;

  constructor(config: PureMdConfig = {}) {
    this.apiKey = config.apiKey || process.env.PURE_API_KEY;
    this.baseUrl = config.baseUrl || 'https://pure.md';
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {};
    if (this.apiKey) {
      headers['x-puremd-api-token'] = this.apiKey;
    }
    return headers;
  }

  async fetchContent(url: string): Promise<string> {
    const response = await fetch(`${this.baseUrl}/${encodeURIComponent(url)}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please wait before making more requests.');
      }
      throw new Error(`Pure.md API error: ${response.status} ${response.statusText}`);
    }

    return await response.text();
  }

  async extractData(url: string, options: PureMdExtractOptions): Promise<any> {
    if (!this.apiKey) {
      throw new Error('API key required for data extraction. Set PURE_API_KEY environment variable or provide it in config.');
    }

    const response = await fetch(`${this.baseUrl}/${encodeURIComponent(url)}`, {
      method: 'POST',
      headers: {
        ...this.getHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: options.prompt || 'Extract the main content and metadata',
        model: options.model || 'meta/llama-3.1-8b',
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please wait before making more requests.');
      }
      throw new Error(`Pure.md API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  async searchAndFetch(query: string): Promise<string> {
    if (!this.apiKey) {
      throw new Error('API key required for search. Set PURE_API_KEY environment variable or provide it in config.');
    }

    const response = await fetch(`${this.baseUrl}/search?q=${encodeURIComponent(query)}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please wait before making more requests.');
      }
      throw new Error(`Pure.md API error: ${response.status} ${response.statusText}`);
    }

    return await response.text();
  }
}