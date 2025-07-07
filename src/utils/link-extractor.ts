import { LinkDiscoverer } from '../services/link-discoverer';

export interface LinkExtractionOptions {
  url: string;
  linkSelector?: string;
  includePatterns?: string[];
  excludePatterns?: string[];
  userAgent?: string;
  timeout?: number;
}

export async function extractLinksFromPage(options: LinkExtractionOptions): Promise<string[]> {
  const { url, linkSelector, includePatterns, excludePatterns, userAgent = 'Archivist/1.0', timeout = 30000 } = options;
  
  try {
    // Use LinkDiscoverer to extract links with proper Cheerio parsing
    const linkDiscoverer = new LinkDiscoverer({
      userAgent,
      timeout,
    });
    
    const discovered = await linkDiscoverer.discoverLinks(url, {
      includePatterns,
      excludePatterns,
    });
    
    // If linkSelector is provided, notify that it's not used with the new implementation
    if (linkSelector && linkSelector !== 'a[href]') {
      console.log(`Note: CSS selector support (${linkSelector}) is simplified. Consider using includePatterns/excludePatterns for more precise filtering.`);
    }
    
    return discovered.links;
  } catch (error) {
    console.error(`Failed to extract links from ${url}:`, error);
    return [];
  }
}