import type { AxiosRequestConfig } from 'axios';

/**
 * Get axios configuration with Bun 1.1 compatibility fixes
 */
export function getAxiosConfig(baseConfig: AxiosRequestConfig = {}): AxiosRequestConfig {
  const config = { ...baseConfig };
  
  // Workaround for Bun 1.1.0 not supporting brotli decompression
  if (process.versions.bun && process.versions.bun.startsWith('1.1.')) {
    // Prevent axios from accepting brotli-encoded responses
    config.headers = {
      ...config.headers,
      'Accept-Encoding': 'gzip, deflate',
    };
  }
  
  return config;
}