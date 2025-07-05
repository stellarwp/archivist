import axios from 'axios';

export interface LinkExtractionOptions {
  url: string;
  linkSelector?: string;
  includePatterns?: string[];
  excludePatterns?: string[];
}

export async function extractLinksFromPage(options: LinkExtractionOptions): Promise<string[]> {
  const { url, linkSelector, includePatterns, excludePatterns } = options;
  
  try {
    // Fetch the HTML content
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Archivist/1.0'
      }
    });
    
    const html = response.data;
    const links: string[] = [];
    
    // Extract all href attributes using a simple regex
    // This is a basic approach - in production you might want to use a proper HTML parser
    const hrefRegex = /href\s*=\s*["']([^"']+)["']/gi;
    let match;
    
    while ((match = hrefRegex.exec(html)) !== null) {
      const href = match[1];
      
      // Skip empty hrefs
      if (!href || href === '') {
        continue;
      }
      
      // Skip javascript:, mailto:, and anchor links
      if (href.startsWith('javascript:') || 
          href.startsWith('mailto:') || 
          href.startsWith('#')) {
        continue;
      }
      
      // Skip malformed URLs that start with :// or other invalid patterns
      if (href.startsWith('://') || href.startsWith('//')) {
        continue;
      }
      
      // Convert relative URLs to absolute
      try {
        const absoluteUrl = new URL(href, url).toString();
        
        // Apply include/exclude patterns
        if (includePatterns && includePatterns.length > 0) {
          // Must match at least one include pattern
          const matchesInclude = includePatterns.some(pattern => {
            try {
              return new RegExp(pattern).test(absoluteUrl);
            } catch {
              console.warn(`Invalid include pattern: ${pattern}`);
              return false;
            }
          });
          
          if (!matchesInclude) {
            continue;
          }
        }
        
        if (excludePatterns && excludePatterns.length > 0) {
          // Must not match any exclude pattern
          const matchesExclude = excludePatterns.some(pattern => {
            try {
              return new RegExp(pattern).test(absoluteUrl);
            } catch {
              console.warn(`Invalid exclude pattern: ${pattern}`);
              return false;
            }
          });
          
          if (matchesExclude) {
            continue;
          }
        }
        
        // Skip non-http(s) links
        if (absoluteUrl.startsWith('http://') || absoluteUrl.startsWith('https://')) {
          links.push(absoluteUrl);
        }
      } catch {
        // Invalid URL, skip it
      }
    }
    
    // If linkSelector is provided, try to be more specific
    // Note: This is a simplified approach. For better selector support,
    // consider using a proper HTML parser like cheerio
    if (linkSelector) {
      console.log(`Note: CSS selector support (${linkSelector}) is simplified. Consider using includePatterns/excludePatterns for more precise filtering.`);
    }
    
    // Remove duplicates
    return [...new Set(links)];
  } catch (error) {
    console.error(`Failed to extract links from ${url}:`, error);
    return [];
  }
}