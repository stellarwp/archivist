import { appContainer } from '../di/container';
import { LinkDiscoverer } from '../services/link-discoverer';
import { DEFAULT_USER_AGENT } from '../version';

/**
 * Options for link extraction from a web page
 * @interface LinkExtractionOptions
 */
export interface LinkExtractionOptions {
  /** URL to extract links from */
  url: string;
  /** CSS selector for finding links (default: 'a[href]') */
  linkSelector?: string;
  /** Patterns that links must match to be included */
  includePatterns?: string[];
  /** Patterns that exclude links from results */
  excludePatterns?: string[];
  /** User agent string for HTTP requests */
  userAgent?: string;
  /** Request timeout in milliseconds */
  timeout?: number;
}

/**
 * Extracts all links from a web page with optional filtering.
 * Uses LinkDiscoverer service with fallback to direct implementation.
 * 
 * @param {LinkExtractionOptions} options - Options for link extraction
 * @returns {Promise<string[]>} Array of discovered absolute URLs
 */
export async function extractLinksFromPage(options: LinkExtractionOptions): Promise<string[]> {
  const { url, linkSelector, includePatterns, excludePatterns, userAgent = DEFAULT_USER_AGENT, timeout = 30000 } = options;
  
  try {
    // Get LinkDiscoverer instance from container
    const linkDiscoverer = appContainer.resolve(LinkDiscoverer);
    
    // Ensure we have the discoverLinks method
    if (!linkDiscoverer || typeof linkDiscoverer.discoverLinks !== 'function') {
      // Fallback: import and use discover method directly
      const axios = (await import('axios')).default;
      const cheerio = await import('cheerio');
      const { shouldIncludeUrl } = await import('./pattern-matcher');
      
      const response = await axios.get(url, {
        headers: { 'User-Agent': userAgent },
        timeout,
      });
      
      const $ = cheerio.load(response.data);
      const links = new Set<string>();
      
      $(linkSelector || 'a[href]').each((_, el) => {
        const href = $(el).attr('href');
        if (href) {
          try {
            const absoluteUrl = new URL(href, url).toString();
            if ((absoluteUrl.startsWith('http://') || absoluteUrl.startsWith('https://')) &&
                shouldIncludeUrl(absoluteUrl, includePatterns, excludePatterns)) {
              links.add(absoluteUrl);
            }
          } catch {
            // Invalid URL, skip
          }
        }
      });
      
      return Array.from(links);
    }
    
    // Use the discoverLinks method
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