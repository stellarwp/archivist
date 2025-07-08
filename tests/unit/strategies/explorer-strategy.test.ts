import { describe, expect, it, beforeEach, afterEach, mock } from 'bun:test';
import { ExplorerStrategy } from '../../../src/strategies/explorer-strategy';
import * as linkExtractor from '../../../src/utils/link-extractor';

describe('ExplorerStrategy', () => {
  let strategy: ExplorerStrategy;
  
  beforeEach(() => {
    strategy = new ExplorerStrategy();
  });
  
  afterEach(() => {
    mock.restore();
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
    
    mock.module('../../../src/utils/link-extractor', () => ({
      extractLinksFromPage: mock(async () => mockLinks),
    }));
    
    const config = {
      linkSelector: 'a.custom-link',
      includePatterns: ['/page\\d+'],
      excludePatterns: ['/admin'],
    };
    
    const result = await strategy.execute('https://example.com', config);
    
    expect(result.urls).toEqual(mockLinks);
  });
  
  it('should use default link selector if not provided', async () => {
    const mockLinks = ['https://example.com/page1'];
    
    mock.module('../../../src/utils/link-extractor', () => ({
      extractLinksFromPage: mock(async () => mockLinks),
    }));
    
    const result = await strategy.execute('https://example.com', {});
    
    expect(result.urls).toEqual(mockLinks);
  });
});