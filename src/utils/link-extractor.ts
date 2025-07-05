import axios from 'axios';

export interface LinkExtractionOptions {
  url: string;
  linkSelector?: string;
  followPattern?: string;
}

export async function extractLinksFromPage(options: LinkExtractionOptions): Promise<string[]> {
  const { url, linkSelector, followPattern } = options;
  
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
      
      // Convert relative URLs to absolute
      try {
        const absoluteUrl = new URL(href, url).toString();
        
        // Apply follow pattern if specified
        if (followPattern) {
          const pattern = new RegExp(followPattern);
          if (!pattern.test(absoluteUrl)) {
            continue;
          }
        }
        
        // Skip anchors, mailto, and non-http(s) links
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
      console.log(`Note: CSS selector support (${linkSelector}) is simplified. Consider using followPattern for more precise filtering.`);
    }
    
    // Remove duplicates
    return [...new Set(links)];
  } catch (error) {
    console.error(`Failed to extract links from ${url}:`, error);
    return [];
  }
}