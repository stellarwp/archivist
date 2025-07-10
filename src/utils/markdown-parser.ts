import type { PageContent } from './content-formatter';

/**
 * Parses markdown content to extract structured information.
 * Extracts title, links, and metadata from markdown text.
 * 
 * @param {string} markdown - Raw markdown content
 * @param {string} url - Source URL of the content
 * @returns {PageContent} Structured page content object
 */
export function parseMarkdownContent(markdown: string, url: string): PageContent {
  // Extract title from first H1 or from URL
  const titleMatch = markdown.match(/^#\s+(.+)$/m);
  const title = titleMatch?.[1]?.trim() || extractTitleFromUrl(url);
  
  // Extract all links from markdown
  const links: string[] = [];
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let match;
  
  while ((match = linkRegex.exec(markdown)) !== null) {
    const href = match[2];
    if (href) {
      if (href.startsWith('http://') || href.startsWith('https://')) {
        links.push(href);
      } else if (!href.startsWith('#') && !href.startsWith('mailto:')) {
        // Relative link - make it absolute
        try {
          const absoluteUrl = new URL(href, url).href;
          links.push(absoluteUrl);
        } catch {}
      }
    }
  }

  // Also extract plain URLs
  const plainUrlRegex = /(?<!\()https?:\/\/[^\s<>"{}|\\^\[\]`]+/g;
  while ((match = plainUrlRegex.exec(markdown)) !== null) {
    const plainUrl = match[0];
    if (!links.includes(plainUrl)) {
      links.push(plainUrl);
    }
  }

  return {
    url,
    title,
    content: markdown.trim(),
    metadata: {
      crawledAt: new Date().toISOString(),
      contentLength: markdown.length,
      links: [...new Set(links)],
    },
  };
}

/**
 * Extracts a human-readable title from a URL.
 * Converts URL path segments into title case.
 * 
 * @param {string} url - URL to extract title from
 * @returns {string} Extracted title or 'Untitled' as fallback
 */
function extractTitleFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/').filter(Boolean);
    
    if (pathParts.length > 0) {
      // Get the last meaningful part
      const lastPart = pathParts[pathParts.length - 1] || '';
      // Remove file extension if present
      const title = lastPart.replace(/\.[^.]+$/, '');
      // Convert kebab-case or snake_case to Title Case
      return title
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());
    }
    
    return urlObj.hostname.replace(/^www\./, '');
  } catch {
    return 'Untitled';
  }
}