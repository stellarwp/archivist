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
    
    // Add the source URL itself to the results
    urls.push(sourceUrl);
    
    // Check if pagination config is completely empty
    if (!pagination || Object.keys(pagination).length === 0) {
      // No pagination configured, return just the source URL
      return { urls };
    }
    
    // If using pattern-based pagination
    if (pagination.pagePattern) {
      const startPage = pagination.startPage || 1;
      const maxPages = pagination.maxPages || 10;
      
      for (let page = startPage; page <= startPage + maxPages - 1; page++) {
        const pageUrl = this.buildPageUrl(sourceUrl, pagination.pagePattern, pagination.pageParam, page);
        if (pageUrl && pageUrl !== sourceUrl) {
          urls.push(pageUrl);
        }
      }
      
      return { urls };
    }
    
    // If using page parameter without pattern (but not if nextLinkSelector is specified)
    if ((pagination.pageParam || pagination.maxPages) && !pagination.nextLinkSelector) {
      const startPage = pagination.startPage || 1;
      const maxPages = pagination.maxPages || 10;
      const pageParam = pagination.pageParam || 'page';
      
      for (let page = startPage; page <= startPage + maxPages - 1; page++) {
        const pageUrl = this.buildPageUrl(sourceUrl, '', pageParam, page);
        if (pageUrl && pageUrl !== sourceUrl) {
          urls.push(pageUrl);
        }
      }
      
      return { urls };
    }
    
    // If using next link selector-based pagination
    if (pagination.nextLinkSelector) {
      let currentUrl = sourceUrl;
      const maxPages = pagination.maxPages || 50;
      const visitedUrls = new Set<string>([sourceUrl]);
      
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
}