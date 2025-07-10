import { singleton } from 'tsyringe';
import axios, { type AxiosInstance } from 'axios';
import * as cheerio from 'cheerio';
import { shouldIncludeUrl } from '../utils/pattern-matcher';
import { ConfigService } from './config.service';
import { HttpService } from './http.service';
import { LoggerService } from './logger.service';

export interface LinkDiscoveryOptions {
  userAgent: string;
  timeout: number;
}

export interface DiscoveredLinks {
  url: string;
  links: string[];
  crawledAt: string;
}

export interface LinkFilterOptions {
  includePatterns?: string[];
  excludePatterns?: string[];
}

@singleton()
export class LinkDiscoverer {
  private axiosInstance: AxiosInstance;
  
  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
    private logger: LoggerService
  ) {
    this.axiosInstance = this.httpService.instance;
  }

  async discover(url: string, selector: string = 'a[href]'): Promise<string[]> {
    try {
      this.logger.debug(`Discovering links from ${url} with selector: ${selector}`);
      
      const response = await this.axiosInstance.get(url);
      const html = response.data;
      const $ = cheerio.load(html);
      
      const links: string[] = [];
      $(selector).each((_, el) => {
        const href = $(el).attr('href');
        if (href) {
          try {
            const absoluteUrl = new URL(href, url).toString();
            if (absoluteUrl.startsWith('http://') || absoluteUrl.startsWith('https://')) {
              links.push(absoluteUrl);
            }
          } catch {
            // Invalid URL, skip
          }
        }
      });
      
      this.logger.debug(`Discovered ${links.length} links from ${url}`);
      return links;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to discover links from ${url}: ${error.message}`);
      }
      throw error;
    }
  }

  async discoverLinks(url: string, filterOptions?: LinkFilterOptions): Promise<DiscoveredLinks> {
    try {
      this.logger.debug(`Discovering links from ${url}`, { filterOptions });
      
      const response = await this.axiosInstance.get(url);
      const html = response.data;
      const $ = cheerio.load(html);

      // Extract all links
      const links = this.extractLinks($, url, filterOptions);

      this.logger.debug(`Extracted ${links.length} links from ${url}`);

      return {
        url,
        links,
        crawledAt: new Date().toISOString(),
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to discover links from ${url}: ${error.message}`);
      }
      throw error;
    }
  }

  private extractLinks($: cheerio.CheerioAPI, baseUrl: string, filterOptions?: LinkFilterOptions): string[] {
    const links = new Set<string>();

    $('a[href]').each((_, el) => {
      const href = $(el).attr('href');
      if (!href) return;

      // Skip empty hrefs, anchors, javascript:, and mailto:
      if (!href || 
          href === '' || 
          href.startsWith('#') || 
          href.startsWith('javascript:') || 
          href.startsWith('mailto:')) {
        return;
      }

      // Skip malformed URLs that start with :// or other invalid patterns
      if (href.startsWith('://') || href.startsWith('//')) {
        return;
      }

      try {
        // Convert relative URLs to absolute
        const absoluteUrl = new URL(href, baseUrl).toString();
        
        // Only add http(s) URLs
        if (absoluteUrl.startsWith('http://') || absoluteUrl.startsWith('https://')) {
          // Apply pattern filtering if provided
          if (this.shouldIncludeLink(absoluteUrl, filterOptions)) {
            links.add(absoluteUrl);
          }
        }
      } catch {
        // Invalid URL, skip it
      }
    });

    return Array.from(links);
  }

  private shouldIncludeLink(url: string, filterOptions?: LinkFilterOptions): boolean {
    if (!filterOptions) {
      return true;
    }

    const { includePatterns, excludePatterns } = filterOptions;
    return shouldIncludeUrl(url, includePatterns, excludePatterns);
  }
}