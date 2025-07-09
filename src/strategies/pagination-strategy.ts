import { BaseStrategy } from './base-strategy';
import type { StrategyResult } from '../types/source-strategy';
import { LinkDiscoverer } from '../services/link-discoverer';
import { getAxiosConfig } from '../utils/axios-config';
import axios from 'axios';

export class PaginationStrategy extends BaseStrategy {
  type = 'pagination';
  private linkDiscoverer: LinkDiscoverer;
  
  constructor() {
    super();
    const axiosInstance = axios.create(getAxiosConfig());
    this.linkDiscoverer = new LinkDiscoverer(axiosInstance);
  }
  
  async execute(sourceUrl: string, config: any): Promise<StrategyResult> {
    const pagination = config.pagination || {};
    const urls: string[] = [];
    
    this.debug(config, `Starting pagination for ${sourceUrl}`);
    this.debug(config, `Pagination config:`, JSON.stringify(pagination));
    
    // Add the source URL itself to the results
    urls.push(sourceUrl);
    
    // Check if pagination config is completely empty
    if (!pagination || Object.keys(pagination).length === 0) {
      // No pagination configured, return just the source URL
      this.debug(config, `No pagination config, returning source URL only`);
      return { urls };
    }
    
    // If using pattern-based pagination
    if (pagination.pagePattern) {
      const startPage = pagination.startPage || 1;
      const maxPages = pagination.maxPages || 10;
      
      this.debug(config, `Using pattern-based pagination: ${pagination.pagePattern}`);
      this.debug(config, `Pages: ${startPage} to ${startPage + maxPages - 1}`);
      
      for (let page = startPage; page <= startPage + maxPages - 1; page++) {
        const pageUrl = this.buildPageUrl(sourceUrl, pagination.pagePattern, pagination.pageParam, page);
        this.debug(config, `Checking page ${page}: ${pageUrl}`);
        
        if (pageUrl && pageUrl !== sourceUrl) {
          // Check if the page exists before adding it
          const exists = await this.checkPageExists(pageUrl);
          if (exists) {
            this.debug(config, `Page ${page} exists, adding to URLs`);
            urls.push(pageUrl);
          } else {
            // Page doesn't exist, assume pagination ended
            this.debug(config, `Page ${page} returned 404, stopping pagination`);
            console.log(`Pagination ended at page ${page - 1} (404 on ${pageUrl})`);
            break;
          }
        }
      }
      
      return { urls };
    }
    
    // If using page parameter without pattern (but not if nextLinkSelector is specified)
    else if ((pagination.pageParam || pagination.maxPages) && !pagination.nextLinkSelector && !pagination.pagePattern) {
      const startPage = pagination.startPage || 1;
      const maxPages = pagination.maxPages || 10;
      const pageParam = pagination.pageParam || 'page';
      
      for (let page = startPage; page <= startPage + maxPages - 1; page++) {
        const pageUrl = this.buildPageUrl(sourceUrl, '', pageParam, page);
        if (pageUrl && pageUrl !== sourceUrl) {
          // Check if the page exists before adding it
          const exists = await this.checkPageExists(pageUrl);
          if (exists) {
            urls.push(pageUrl);
          } else {
            // Page doesn't exist, assume pagination ended
            console.log(`Pagination ended at page ${page - 1} (404 on ${pageUrl})`);
            break;
          }
        }
      }
      
      return { urls };
    }
    
    // If using next link selector-based pagination
    else if (pagination.nextLinkSelector) {
      let currentUrl = sourceUrl;
      const maxPages = pagination.maxPages || 50;
      const visitedUrls = new Set<string>([sourceUrl]);
      
      this.debug(config, `Using next link selector: ${pagination.nextLinkSelector}`);
      this.debug(config, `Max pages for next link following: ${maxPages}`);
      
      while (urls.length < maxPages) {
        try {
          const links = await this.linkDiscoverer.discover(currentUrl, pagination.nextLinkSelector);
          
          if (links.length === 0) {
            break;
          }
          
          // Find the next page URL
          let nextUrl: string | null = null;
          for (const link of links) {
            const normalizedLink = this.normalizeUrl(currentUrl, link);
            if (!visitedUrls.has(normalizedLink)) {
              nextUrl = normalizedLink;
              break;
            }
          }
          
          if (!nextUrl) {
            break;
          }
          
          urls.push(nextUrl);
          visitedUrls.add(nextUrl);
          currentUrl = nextUrl;
          
        } catch (error) {
          console.error(`Error discovering next page from ${currentUrl}:`, error);
          break;
        }
      }
      
      return { urls };
    }
    
    // Default: just return the source URL
    this.debug(config, `Pagination complete. Found ${urls.length} total URLs`);
    return { urls: [sourceUrl] };
  }
  
  private buildPageUrl(baseUrl: string, pattern: string, pageParam: string, pageNumber: number): string {
    // Handle pattern-based URLs like "example.com/page/{page}"
    if (pattern.includes('{page}')) {
      return pattern.replace('{page}', pageNumber.toString());
    }
    
    // Handle query parameter-based URLs
    try {
      const url = new URL(baseUrl);
      url.searchParams.set(pageParam, pageNumber.toString());
      return url.href;
    } catch {
      // Fallback to simple concatenation
      const separator = baseUrl.includes('?') ? '&' : '?';
      return `${baseUrl}${separator}${pageParam}=${pageNumber}`;
    }
  }
  
  private async checkPageExists(url: string, retries: number = 1): Promise<boolean> {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await axios.head(url, {
          ...getAxiosConfig(),
          timeout: 5000, // Shorter timeout for HEAD requests
          validateStatus: (status) => status < 500, // Don't throw on 4xx errors
        });
        
        if (response.status === 404) {
          if (attempt < retries) {
            // Wait a bit before retry
            await new Promise(resolve => setTimeout(resolve, 1000));
            continue;
          }
          return false;
        }
        
        // Any 2xx or 3xx status means the page exists
        return response.status >= 200 && response.status < 400;
      } catch (error) {
        // Network errors or timeouts
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }
        // After retries, assume page doesn't exist
        console.error(`Error checking page existence for ${url}:`, error);
        return false;
      }
    }
    
    return false;
  }
}