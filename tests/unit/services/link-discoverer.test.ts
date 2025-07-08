import { describe, expect, it, beforeEach, afterEach } from 'bun:test';
import { LinkDiscoverer } from '../../../src/services/link-discoverer';

// Test for link discoverer without mocking axios
// to avoid conflicts with other tests
describe('LinkDiscoverer', () => {
  describe('structure and configuration', () => {
    it('should create instance with proper options', () => {
      const discoverer = new LinkDiscoverer({
        userAgent: 'Test/1.0',
        timeout: 5000,
      });
      
      expect(discoverer).toBeDefined();
      expect(discoverer).toBeInstanceOf(LinkDiscoverer);
      
      // Check if methods exist
      expect(typeof discoverer.discover).toBe('function');
      expect(typeof discoverer.discoverLinks).toBe('function');
      
      // @ts-ignore - accessing private property for testing
      expect(discoverer.options).toBeDefined();
      // @ts-ignore
      expect(discoverer.options.userAgent).toBe('Test/1.0');
      // @ts-ignore
      expect(discoverer.options.timeout).toBe(5000);
    });
  });

  describe('error handling', () => {
    it('should throw meaningful error for invalid URLs', async () => {
      const discoverer = new LinkDiscoverer({
        userAgent: 'Test/1.0',
        timeout: 100, // Very short timeout
      });
      
      expect(discoverer).toBeDefined();
      expect(typeof discoverer.discoverLinks).toBe('function');
      
      if (typeof discoverer.discoverLinks === 'function') {
        await expect(discoverer.discoverLinks('not-a-valid-url'))
          .rejects
          .toThrow();
      } else {
        // If method doesn't exist in this environment, skip the test
        expect(true).toBe(true);
      }
    });
  });

});