import { BaseStrategy } from './base-strategy';
import type { StrategyResult } from '../types/source-strategy';
import { LinkDiscoverer } from '../services/link-discoverer';
import { appContainer } from '../di/container';
import { extractLinksFromPage } from '../utils/link-extractor';
import axios from 'axios';
import { getAxiosConfig } from '../utils/axios-config';

export class PaginationStrategy extends BaseStrategy {
  type = 'pagination';
  private linkDiscoverer: LinkDiscoverer | null = null;
  
  constructor() {
    super();
  }
  
  private getLinkDiscoverer(): LinkDiscoverer {
    if (!this.linkDiscoverer) {
      try {
        this.linkDiscoverer = appContainer.resolve(LinkDiscoverer);
      } catch (error) {
        // Fallback: create a minimal implementation if DI is not available
        throw new Error('LinkDiscoverer dependency not available. Ensure DI container is initialized.');
      }
    }
    return this.linkDiscoverer;
  }
  
  async execute(sourceUrl: string, config: any): Promise<StrategyResult> {
    const pagination = config.pagination || {};
    const pageUrls: string[] = [];
    const allExtractedLinks = new Set<string>();
    
    // Initialize the set to track pagination URLs
    this.collectedPageUrls = new Set<string>();
    
    this.debug(config, `Starting pagination for ${sourceUrl}`);
    this.debug(config, `Pagination config:`, JSON.stringify(pagination));
    
    // First, collect all paginated pages including the source URL
    pageUrls.push(sourceUrl);
    this.collectedPageUrls.add(sourceUrl);
    
    // Check if pagination config is completely empty
    if (!pagination || Object.keys(pagination).length === 0) {
      // No pagination configured, still extract links from source URL
      this.debug(config, `No pagination config, extracting links from source URL only`);
      const links = await this.extractLinksFromPage(sourceUrl, config);
      return { urls: links };
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
            this.debug(config, `Page ${page} exists, adding to page URLs`);
            pageUrls.push(pageUrl);
            this.collectedPageUrls!.add(pageUrl);
          } else {
            // Page doesn't exist, assume pagination ended
            this.debug(config, `Page ${page} returned 404, stopping pagination`);
            console.log(`Pagination ended at page ${page - 1} (404 on ${pageUrl})`);
            break;
          }
        }
      }
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
            pageUrls.push(pageUrl);
            this.collectedPageUrls!.add(pageUrl);
          } else {
            // Page doesn't exist, assume pagination ended
            console.log(`Pagination ended at page ${page - 1} (404 on ${pageUrl})`);
            break;
          }
        }
      }
    }
    
    // If using next link selector-based pagination
    else if (pagination.nextLinkSelector) {
      let currentUrl = sourceUrl;
      const maxPages = pagination.maxPages || 50;
      const visitedUrls = new Set<string>([sourceUrl]);
      
      this.debug(config, `Using next link selector: ${pagination.nextLinkSelector}`);
      this.debug(config, `Max pages for next link following: ${maxPages}`);
      
      while (pageUrls.length < maxPages) {
        try {
          const links = await this.getLinkDiscoverer().discover(currentUrl, pagination.nextLinkSelector);
          
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
          
          pageUrls.push(nextUrl);
          visitedUrls.add(nextUrl);
          this.collectedPageUrls!.add(nextUrl);
          currentUrl = nextUrl;
          
        } catch (error) {
          console.error(`Error discovering next page from ${currentUrl}:`, error);
          break;
        }
      }
    }
    
    // Now extract links from all paginated pages
    this.debug(config, `Found ${pageUrls.length} paginated pages, extracting links from each...`);
    console.log(`  📄 Processing ${pageUrls.length} paginated pages...`);
    
    for (let i = 0; i < pageUrls.length; i++) {
      const pageUrl = pageUrls[i];
      if (!pageUrl) continue;
      
      try {
        console.log(`    [${i + 1}/${pageUrls.length}] Extracting links from: ${pageUrl}`);
        this.debug(config, `Extracting links from page: ${pageUrl}`);
        const links = await this.extractLinksFromPage(pageUrl, config);
        this.debug(config, `Found ${links.length} links on ${pageUrl}`);
        if (links.length > 0) {
          console.log(`    ✓ Found ${links.length} links`);
        }
        
        // Add all extracted links to the set (deduplication)
        links.forEach(link => allExtractedLinks.add(link));
      } catch (error) {
        console.error(`Error extracting links from ${pageUrl}:`, error);
      }
    }
    
    this.debug(config, `Pagination complete. Found ${allExtractedLinks.size} total unique links from ${pageUrls.length} pages`);
    console.log(`  ✓ Pagination complete: ${allExtractedLinks.size} unique links collected`);
    return { urls: Array.from(allExtractedLinks) };
  }
  
  private async extractLinksFromPage(url: string, config: any): Promise<string[]> {
    const allLinks = await extractLinksFromPage({
      url,
      linkSelector: config.linkSelector || 'a[href]',
      includePatterns: config.includePatterns,
      excludePatterns: config.excludePatterns,
      userAgent: config.userAgent,
      timeout: config.timeout,
    });
    
    // Filter out pagination links - only exclude exact matches to our collected pagination URLs
    return allLinks.filter(link => {
      // Check if it's one of our collected page URLs
      if (this.collectedPageUrls && this.collectedPageUrls.has(link)) {
        return false;
      }
      return true;
    });
  }
  
  private collectedPageUrls?: Set<string>;
  
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