import { BaseStrategy } from './base-strategy';
import type { StrategyResult } from '../types/source-strategy';
import { LinkDiscoverer } from '../services/link-discoverer';
import { appContainer } from '../di/container';
import { extractLinksFromPage } from '../utils/link-extractor';
import axios from 'axios';
import { getAxiosConfig } from '../utils/axios-config';
import { PaginationStopDetector, type PaginationStopConfig } from '../utils/pagination-stop-detector';

/**
 * Strategy for handling paginated content.
 * Discovers and extracts links from multiple pages following pagination patterns.
 * 
 * @class PaginationStrategy
 * @extends BaseStrategy
 */
export class PaginationStrategy extends BaseStrategy {
  /** Strategy type identifier */
  type = 'pagination';
  /** Cached LinkDiscoverer instance */
  private linkDiscoverer: LinkDiscoverer | null = null;
  
  /**
   * Creates an instance of PaginationStrategy
   */
  constructor() {
    super();
  }
  
  /**
   * Gets or creates a LinkDiscoverer instance.
   * Uses dependency injection with fallback error handling.
   * 
   * @private
   * @returns {LinkDiscoverer} LinkDiscoverer instance
   * @throws {Error} If LinkDiscoverer cannot be resolved
   */
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
  
  /**
   * Executes the pagination strategy to discover links across multiple pages.
   * Supports pattern-based, query parameter, and next link pagination.
   * 
   * @param {string} sourceUrl - Starting URL for pagination
   * @param {Object} config - Configuration with pagination settings
   * @param {Object} [config.pagination] - Pagination configuration
   * @param {string} [config.pagination.pagePattern] - URL pattern with {page} placeholder
   * @param {string} [config.pagination.pageParam] - Query parameter name for page number
   * @param {number} [config.pagination.startPage] - First page number
   * @param {number} [config.pagination.maxPages] - Maximum pages to crawl
   * @param {string} [config.pagination.nextLinkSelector] - CSS selector for next page link
   * @param {Object} [config.pagination.stopConditions] - Conditions for stopping pagination
   * @returns {Promise<StrategyResult>} Result containing all discovered content links
   */
  async execute(sourceUrl: string, config: any): Promise<StrategyResult> {
    const pagination = config.pagination || {};
    const pageUrls: string[] = [];
    const allExtractedLinks = new Set<string>();
    
    // Initialize the set to track pagination URLs
    this.collectedPageUrls = new Set<string>();
    
    // Initialize stop detector with custom config if provided
    const stopDetector = new PaginationStopDetector(pagination.stopConditions);
    
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
          const { exists, status, content } = await this.checkPageWithContent(pageUrl);
          
          if (exists) {
            this.debug(config, `Page ${page} exists, adding to page URLs`);
            pageUrls.push(pageUrl);
            this.collectedPageUrls!.add(pageUrl);
            
            // Extract links to check stop conditions early
            try {
              const links = await this.extractLinksFromPage(pageUrl, config);
              const stopCheck = stopDetector.shouldStop(page, pageUrl, links, content, status);
              
              if (stopCheck.shouldStop) {
                console.log(`  ⚠️  ${stopCheck.reason}`);
                break;
              }
              
              // Add extracted links to avoid re-fetching later
              links.forEach(link => allExtractedLinks.add(link));
            } catch (error) {
              this.debug(config, `Error pre-extracting links from page ${page}: ${error}`);
            }
          } else {
            // Page doesn't exist
            const stopCheck = stopDetector.shouldStop(page, pageUrl, [], content, status);
            
            if (stopCheck.shouldStop) {
              console.log(`  ⚠️  ${stopCheck.reason}`);
              break;
            }
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
          const { exists, status, content } = await this.checkPageWithContent(pageUrl);
          
          if (exists) {
            pageUrls.push(pageUrl);
            this.collectedPageUrls!.add(pageUrl);
            
            // Extract links to check stop conditions early
            try {
              const links = await this.extractLinksFromPage(pageUrl, config);
              const stopCheck = stopDetector.shouldStop(page, pageUrl, links, content, status);
              
              if (stopCheck.shouldStop) {
                console.log(`  ⚠️  ${stopCheck.reason}`);
                break;
              }
              
              // Add extracted links to avoid re-fetching later
              links.forEach(link => allExtractedLinks.add(link));
            } catch (error) {
              this.debug(config, `Error pre-extracting links from page ${page}: ${error}`);
            }
          } else {
            // Page doesn't exist
            const stopCheck = stopDetector.shouldStop(page, pageUrl, [], content, status);
            
            if (stopCheck.shouldStop) {
              console.log(`  ⚠️  ${stopCheck.reason}`);
              break;
            }
          }
        }
      }
    }
    
    // If using next link selector-based pagination
    else if (pagination.nextLinkSelector) {
      let currentUrl = sourceUrl;
      const maxPages = pagination.maxPages || 50;
      const visitedUrls = new Set<string>([sourceUrl]);
      let pageNumber = 1;
      
      this.debug(config, `Using next link selector: ${pagination.nextLinkSelector}`);
      this.debug(config, `Max pages for next link following: ${maxPages}`);
      
      while (pageUrls.length < maxPages) {
        try {
          // First extract all links from current page for stop detection
          const allPageLinks = await this.extractLinksFromPage(currentUrl, config);
          allPageLinks.forEach(link => allExtractedLinks.add(link));
          
          // Check stop conditions
          const stopCheck = stopDetector.shouldStop(pageNumber, currentUrl, allPageLinks);
          if (stopCheck.shouldStop) {
            console.log(`  ⚠️  ${stopCheck.reason}`);
            break;
          }
          
          // Now look for next page link
          const links = await this.getLinkDiscoverer().discover(currentUrl, pagination.nextLinkSelector);
          
          if (links.length === 0) {
            this.debug(config, `No next link found on ${currentUrl}`);
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
            this.debug(config, `All next links already visited from ${currentUrl}`);
            break;
          }
          
          pageUrls.push(nextUrl);
          visitedUrls.add(nextUrl);
          this.collectedPageUrls!.add(nextUrl);
          currentUrl = nextUrl;
          pageNumber++;
          
        } catch (error) {
          console.error(`Error discovering next page from ${currentUrl}:`, error);
          break;
        }
      }
    }
    
    // Now extract links from any paginated pages we haven't processed yet
    this.debug(config, `Found ${pageUrls.length} paginated pages`);
    
    // Only process pages we haven't already extracted links from
    for (let i = 0; i < pageUrls.length; i++) {
      const pageUrl = pageUrls[i];
      if (!pageUrl || this.collectedPageUrls?.has(pageUrl)) continue;
      
      try {
        this.debug(config, `Extracting remaining links from page: ${pageUrl}`);
        const links = await this.extractLinksFromPage(pageUrl, config);
        this.debug(config, `Found ${links.length} links on ${pageUrl}`);
        
        // Add all extracted links to the set (deduplication)
        links.forEach(link => allExtractedLinks.add(link));
      } catch (error) {
        console.error(`Error extracting links from ${pageUrl}:`, error);
      }
    }
    
    // Log stop detector stats
    const stats = stopDetector.getStats();
    this.debug(config, `Pagination complete. Found ${allExtractedLinks.size} total unique links from ${pageUrls.length} pages`);
    this.debug(config, `Stop detector stats:`, JSON.stringify(stats));
    
    console.log(`  ✓ Pagination complete: ${allExtractedLinks.size} unique links collected from ${pageUrls.length} pages`);
    if (stats.error404Count > 0) {
      console.log(`    - Encountered ${stats.error404Count} 404 errors`);
    }
    if (stats.averageNewLinksPerPage < 5) {
      console.log(`    - Average new links per page: ${stats.averageNewLinksPerPage.toFixed(1)}`);
    }
    
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
    const { exists } = await this.checkPageWithContent(url, retries);
    return exists;
  }

  private async checkPageWithContent(url: string, retries: number = 1): Promise<{
    exists: boolean;
    status?: number;
    content?: string;
  }> {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        // First try HEAD request to check existence
        const headResponse = await axios.head(url, {
          ...getAxiosConfig(),
          timeout: 5000, // Shorter timeout for HEAD requests
          validateStatus: (status) => status < 500, // Don't throw on 4xx errors
        });
        
        if (headResponse.status === 404) {
          if (attempt < retries) {
            // Wait a bit before retry
            await new Promise(resolve => setTimeout(resolve, 1000));
            continue;
          }
          return { exists: false, status: 404 };
        }
        
        // If page exists, fetch content for error detection
        if (headResponse.status >= 200 && headResponse.status < 400) {
          try {
            const contentResponse = await axios.get(url, {
              ...getAxiosConfig(),
              timeout: 10000,
              maxContentLength: 100000, // Limit content size for error detection
            });
            
            return {
              exists: true,
              status: contentResponse.status,
              content: contentResponse.data
            };
          } catch (contentError) {
            // If we can't get content, still report page exists
            return { exists: true, status: headResponse.status };
          }
        }
        
        return { exists: false, status: headResponse.status };
      } catch (error) {
        // Network errors or timeouts
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }
        // After retries, assume page doesn't exist
        console.error(`Error checking page existence for ${url}:`, error);
        return { exists: false };
      }
    }
    
    return { exists: false };
  }
}