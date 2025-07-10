import { createHash } from 'crypto';

export function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
    .substring(0, 100);
}

export function urlToFilename(url: string): string {
  const urlObj = new URL(url);
  const pathParts = urlObj.pathname.split('/').filter(Boolean);
  const hostname = urlObj.hostname.replace(/^www\./, '');
  
  if (pathParts.length === 0) {
    return sanitizeFilename(hostname);
  }
  
  return sanitizeFilename(`${hostname}-${pathParts.join('-')}`);
}

export function titleToFilename(title: string, url: string): string {
  const sanitizedTitle = sanitizeFilename(title);
  const urlHash = createHash('md5').update(url).digest('hex').substring(0, 8);
  
  return `${sanitizedTitle}-${urlHash}`;
}

export function hashFilename(url: string): string {
  return createHash('sha256').update(url).digest('hex').substring(0, 16);
}

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