import { test, expect, describe, beforeEach, afterEach } from 'bun:test';
import { resolvePureApiKey } from '../../../src/utils/pure-api-key';

describe('resolvePureApiKey', () => {
  let originalEnv: string | undefined;

  beforeEach(() => {
    // Save original env var
    originalEnv = process.env.PURE_API_KEY;
  });

  afterEach(() => {
    // Restore original env var
    if (originalEnv === undefined) {
      delete process.env.PURE_API_KEY;
    } else {
      process.env.PURE_API_KEY = originalEnv;
    }
  });

  test('should prioritize config.pure.apiKey over environment variable', () => {
    process.env.PURE_API_KEY = 'env-key';
    
    const result = resolvePureApiKey({
      pure: { apiKey: 'config-key' }
    });
    
    expect(result).toBe('config-key');
  });

  test('should handle direct apiKey in config object', () => {
    process.env.PURE_API_KEY = 'env-key';
    
    const result = resolvePureApiKey({
      apiKey: 'direct-key'
    });
    
    expect(result).toBe('direct-key');
  });

  test('should fall back to environment variable when no config key', () => {
    process.env.PURE_API_KEY = 'env-key';
    
    const result = resolvePureApiKey({
      pure: {}
    });
    
    expect(result).toBe('env-key');
  });

  test('should return undefined when no key available', () => {
    delete process.env.PURE_API_KEY;
    
    const result = resolvePureApiKey({
      pure: {}
    });
    
    expect(result).toBeUndefined();
  });

  test('should handle undefined config', () => {
    process.env.PURE_API_KEY = 'env-key';
    
    const result = resolvePureApiKey(undefined);
    
    expect(result).toBe('env-key');
  });

  test('should handle config without pure section', () => {
    process.env.PURE_API_KEY = 'env-key';
    
    const result = resolvePureApiKey({});
    
    expect(result).toBe('env-key');
  });
});