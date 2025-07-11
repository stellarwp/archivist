/**
 * Utilities for detecting when to stop pagination crawling
 */

export interface PaginationStopConfig {
  /** Number of consecutive pages with no new links before stopping (default: 3) */
  consecutiveEmptyPages?: number;
  /** Number of 404 errors before stopping (default: 2) */
  max404Errors?: number;
  /** Error page keywords to detect (case-insensitive) */
  errorKeywords?: string[];
  /** Minimum new links per page to continue (default: 1) */
  minNewLinksPerPage?: number;
}

export const DEFAULT_STOP_CONFIG: Required<PaginationStopConfig> = {
  consecutiveEmptyPages: 3,
  max404Errors: 2,
  errorKeywords: [
    'page not found',
    'error 404',
    '404 error',
    'not found',
    'page does not exist',
    'no results found',
    'end of results',
    'no more pages',
    'invalid page',
    'page unavailable'
  ],
  minNewLinksPerPage: 1
};

export class PaginationStopDetector {
  private config: Required<PaginationStopConfig>;
  private consecutiveEmptyCount = 0;
  private error404Count = 0;
  private seenLinks = new Set<string>();
  private pageHistory: Array<{
    pageNumber: number;
    url: string;
    newLinksCount: number;
    totalLinks: number;
    hadError: boolean;
  }> = [];

  constructor(config?: PaginationStopConfig) {
    this.config = { ...DEFAULT_STOP_CONFIG, ...config };
  }

  /**
   * Check if pagination should stop based on the page results
   */
  shouldStop(
    pageNumber: number,
    pageUrl: string,
    discoveredLinks: string[],
    pageContent?: string,
    httpStatus?: number
  ): { shouldStop: boolean; reason?: string } {
    // Check for 404 errors
    if (httpStatus === 404) {
      this.error404Count++;
      this.pageHistory.push({
        pageNumber,
        url: pageUrl,
        newLinksCount: 0,
        totalLinks: 0,
        hadError: true
      });

      if (this.error404Count >= this.config.max404Errors) {
        return {
          shouldStop: true,
          reason: `Stopping: Reached ${this.error404Count} consecutive 404 errors`
        };
      }
    }

    // Check for error page content
    if (pageContent && this.isErrorPage(pageContent)) {
      return {
        shouldStop: true,
        reason: 'Stopping: Detected error page content'
      };
    }

    // Track new vs seen links
    const newLinks = discoveredLinks.filter(link => !this.seenLinks.has(link));
    discoveredLinks.forEach(link => this.seenLinks.add(link));

    // Record page history
    this.pageHistory.push({
      pageNumber,
      url: pageUrl,
      newLinksCount: newLinks.length,
      totalLinks: discoveredLinks.length,
      hadError: false
    });

    // Check for consecutive pages with no new links
    if (newLinks.length < this.config.minNewLinksPerPage) {
      this.consecutiveEmptyCount++;
      
      if (this.consecutiveEmptyCount >= this.config.consecutiveEmptyPages) {
        return {
          shouldStop: true,
          reason: `Stopping: ${this.consecutiveEmptyCount} consecutive pages with fewer than ${this.config.minNewLinksPerPage} new links`
        };
      }
    } else {
      // Reset counter if we found new links
      this.consecutiveEmptyCount = 0;
    }

    // Check for declining trend in new links
    if (this.hasSignificantDecline()) {
      return {
        shouldStop: true,
        reason: 'Stopping: Significant decline in new links discovered'
      };
    }

    return { shouldStop: false };
  }

  /**
   * Check if page content contains error indicators
   */
  private isErrorPage(content: string): boolean {
    const lowerContent = content.toLowerCase();
    return this.config.errorKeywords.some(keyword => 
      lowerContent.includes(keyword.toLowerCase())
    );
  }

  /**
   * Check if there's a significant declining trend in new links
   */
  private hasSignificantDecline(): boolean {
    if (this.pageHistory.length < 5) return false;

    const recentPages = this.pageHistory.slice(-5);
    const nonErrorPages = recentPages.filter(p => !p.hadError);
    
    if (nonErrorPages.length < 3) return false;

    // Check if new links are consistently decreasing
    let decliningCount = 0;
    for (let i = 1; i < nonErrorPages.length; i++) {
      const current = nonErrorPages[i];
      const previous = nonErrorPages[i - 1];
      if (current && previous && current.newLinksCount < previous.newLinksCount) {
        decliningCount++;
      }
    }

    // If 80% or more of recent pages show decline, stop
    return decliningCount >= Math.floor(nonErrorPages.length * 0.8);
  }

  /**
   * Get statistics about the pagination crawl
   */
  getStats() {
    return {
      totalPages: this.pageHistory.length,
      totalUniqueLinks: this.seenLinks.size,
      error404Count: this.error404Count,
      averageNewLinksPerPage: this.pageHistory.length > 0
        ? this.pageHistory.reduce((sum, p) => sum + (p?.newLinksCount || 0), 0) / this.pageHistory.length
        : 0,
      pageHistory: this.pageHistory
    };
  }

  /**
   * Reset the detector state
   */
  reset() {
    this.consecutiveEmptyCount = 0;
    this.error404Count = 0;
    this.seenLinks.clear();
    this.pageHistory = [];
  }
}