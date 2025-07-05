import axios from 'axios';
import * as cheerio from 'cheerio';

export interface ScraperOptions {
  selector?: string;
  userAgent: string;
  timeout: number;
}

export interface ScrapedContent {
  url: string;
  title: string;
  content: string;
  links: string[];
  metadata: {
    crawledAt: string;
    contentLength: number;
  };
}

export class ContentScraper {
  constructor(private options: ScraperOptions) {}

  async scrapeContent(url: string): Promise<ScrapedContent> {
    try {
      // Fetch the HTML content
      const response = await axios.get(url, {
        headers: {
          'User-Agent': this.options.userAgent,
        },
        timeout: this.options.timeout,
      });

      const html = response.data;
      const $ = cheerio.load(html);

      // Extract title
      const title = this.extractTitle($, url);

      // Extract content
      const content = this.extractContent($, this.options.selector);

      // Extract links
      const links = this.extractLinks($, url);

      return {
        url,
        title,
        content,
        links,
        metadata: {
          crawledAt: new Date().toISOString(),
          contentLength: content.length,
        },
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to scrape ${url}: ${error.message}`);
      }
      throw error;
    }
  }

  private extractTitle($: cheerio.CheerioAPI, url: string): string {
    // Try to find title in order of preference
    const title = $('title').text().trim() ||
                  $('h1').first().text().trim() ||
                  $('meta[property="og:title"]').attr('content')?.trim() ||
                  $('meta[name="title"]').attr('content')?.trim() ||
                  '';

    if (title) {
      return title;
    }

    // Fallback to URL-based title
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      const lastPart = pathParts[pathParts.length - 1] || urlObj.hostname;
      return lastPart.replace(/[-_]/g, ' ').replace(/\.\w+$/, '');
    } catch {
      return 'Untitled';
    }
  }

  private extractContent($: cheerio.CheerioAPI, selector?: string): string {
    // Remove script and style elements
    $('script, style, noscript').remove();

    let contentElement;

    if (selector) {
      // Use custom selector if provided
      contentElement = $(selector);
    } else {
      // Try to find main content using common selectors
      const contentSelectors = [
        'main',
        'article',
        '[role="main"]',
        '#content',
        '.content',
        '#main',
        '.main',
        'body',
      ];

      for (const sel of contentSelectors) {
        const element = $(sel);
        if (element.length > 0) {
          contentElement = element.first();
          break;
        }
      }
    }

    if (!contentElement || contentElement.length === 0) {
      contentElement = $('body');
    }

    // Extract text content
    const textContent = contentElement
      .clone()
      .find('script, style, noscript')
      .remove()
      .end()
      .text()
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .join('\n');

    // Also preserve important structural elements as markdown
    const markdownContent = this.convertToMarkdown($, contentElement);

    // Return markdown if it has more structure, otherwise plain text
    return markdownContent.length > textContent.length * 0.8 ? markdownContent : textContent;
  }

  private convertToMarkdown($: cheerio.CheerioAPI, element: cheerio.Cheerio<any>): string {
    const lines: string[] = [];

    element.find('*').each((_, el) => {
      const $el = $(el);
      const tagName = el.tagName.toLowerCase();

      switch (tagName) {
        case 'h1':
          lines.push(`# ${$el.text().trim()}`);
          break;
        case 'h2':
          lines.push(`## ${$el.text().trim()}`);
          break;
        case 'h3':
          lines.push(`### ${$el.text().trim()}`);
          break;
        case 'h4':
          lines.push(`#### ${$el.text().trim()}`);
          break;
        case 'h5':
          lines.push(`##### ${$el.text().trim()}`);
          break;
        case 'h6':
          lines.push(`###### ${$el.text().trim()}`);
          break;
        case 'p':
          const text = $el.text().trim();
          if (text) lines.push(text);
          break;
        case 'ul':
        case 'ol':
          $el.find('li').each((i, li) => {
            const prefix = tagName === 'ol' ? `${i + 1}.` : '-';
            lines.push(`${prefix} ${$(li).text().trim()}`);
          });
          break;
        case 'code':
          if ($el.parent().is('pre')) {
            lines.push('```');
            lines.push($el.text());
            lines.push('```');
          } else {
            // Inline code handled in text
          }
          break;
        case 'blockquote':
          const quoteText = $el.text().trim();
          if (quoteText) {
            lines.push(quoteText.split('\n').map(line => `> ${line}`).join('\n'));
          }
          break;
      }
    });

    return lines.filter(line => line.trim()).join('\n\n');
  }

  private extractLinks($: cheerio.CheerioAPI, baseUrl: string): string[] {
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

      try {
        // Convert relative URLs to absolute
        const absoluteUrl = new URL(href, baseUrl).toString();
        
        // Only add http(s) URLs
        if (absoluteUrl.startsWith('http://') || absoluteUrl.startsWith('https://')) {
          links.add(absoluteUrl);
        }
      } catch {
        // Invalid URL, skip it
      }
    });

    return Array.from(links);
  }
}