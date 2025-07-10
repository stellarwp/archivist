import { createHash } from 'crypto';

/**
 * Sanitizes a string to be used as a filename.
 * Removes special characters, converts to lowercase, and limits length.
 * 
 * @param {string} name - The string to sanitize
 * @returns {string} Sanitized filename string
 */
export function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
    .substring(0, 100);
}

/**
 * Converts a URL into a descriptive filename.
 * Uses hostname and path components to create readable names.
 * 
 * @param {string} url - The URL to convert
 * @returns {string} Filename derived from URL structure
 */
export function urlToFilename(url: string): string {
  const urlObj = new URL(url);
  const pathParts = urlObj.pathname.split('/').filter(Boolean);
  const hostname = urlObj.hostname.replace(/^www\./, '');
  
  if (pathParts.length === 0) {
    return sanitizeFilename(hostname);
  }
  
  return sanitizeFilename(`${hostname}-${pathParts.join('-')}`);
}

/**
 * Creates a filename from page title with URL hash for uniqueness.
 * Combines sanitized title with first 8 characters of URL hash.
 * 
 * @param {string} title - The page title
 * @param {string} url - The page URL (used for hash)
 * @returns {string} Filename combining title and hash
 */
export function titleToFilename(title: string, url: string): string {
  const sanitizedTitle = sanitizeFilename(title);
  const urlHash = createHash('md5').update(url).digest('hex').substring(0, 8);
  
  return `${sanitizedTitle}-${urlHash}`;
}

/**
 * Generates a hash-based filename from URL.
 * Uses SHA256 hash truncated to 16 characters for uniqueness.
 * 
 * @param {string} url - The URL to hash
 * @returns {string} Hash-based filename
 */
export function hashFilename(url: string): string {
  return createHash('sha256').update(url).digest('hex').substring(0, 16);
}

/**
 * Generates a filename for saving crawled content.
 * Supports multiple naming strategies to avoid conflicts.
 * 
 * @param {string} url - The URL of the page
 * @param {string} title - The title of the page
 * @param {'url-based' | 'title-based' | 'hash-based'} [strategy='url-based'] - Naming strategy to use
 * @returns {string} Generated filename with .md extension
 */
export function generateFileName(url: string, title: string, strategy: 'url-based' | 'title-based' | 'hash-based' = 'url-based'): string {
  let baseName: string;
  
  switch (strategy) {
    case 'title-based':
      baseName = titleToFilename(title, url);
      break;
    case 'hash-based':
      baseName = hashFilename(url);
      break;
    case 'url-based':
    default:
      baseName = urlToFilename(url);
      break;
  }
  
  return `${baseName}.md`;
}