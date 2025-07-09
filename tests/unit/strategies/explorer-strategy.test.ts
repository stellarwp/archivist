import { describe, expect, it, beforeEach, spyOn } from 'bun:test';
import { ExplorerStrategy } from '../../../src/strategies/explorer-strategy';
import * as linkExtractor from '../../../src/utils/link-extractor';

describe('ExplorerStrategy', () => {
  let strategy: ExplorerStrategy;
  
  beforeEach(() => {
    strategy = new ExplorerStrategy();
  });
  
  it('should have type "explorer"', () => {
    expect(strategy.type).toBe('explorer');
  });
  
  it('should extract links using link extractor', async () => {
    const mockLinks = [
      'https://example.com/page1',
      'https://example.com/page2', 
      'https://example.com/page3',
    ];
    
    const spy = spyOn(linkExtractor, 'extractLinksFromPage').mockResolvedValue(mockLinks);
    
    const config = {
      linkSelector: 'a.custom-link',
      includePatterns: ['/page\\d+'],
      excludePatterns: ['/admin'],
    };
    
    const result = await strategy.execute('https://example.com', config);
    
    expect(result.urls).toEqual(mockLinks);
    expect(spy).toHaveBeenCalledWith({
      url: 'https://example.com',
      linkSelector: 'a.custom-link',
      includePatterns: ['/page\\d+'],
      excludePatterns: ['/admin'],
    });
    
    spy.mockRestore();
  });
  
  it('should use default link selector if not provided', async () => {
    const mockLinks = ['https://example.com/page1'];
    
    const spy = spyOn(linkExtractor, 'extractLinksFromPage').mockResolvedValue(mockLinks);
    
    const result = await strategy.execute('https://example.com', {});
    
    expect(result.urls).toEqual(mockLinks);
    expect(spy).toHaveBeenCalledWith({
      url: 'https://example.com',
      linkSelector: 'a[href]',
      includePatterns: undefined,
      excludePatterns: undefined,
    });
    
    spy.mockRestore();
  });
});