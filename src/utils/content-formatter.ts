/**
 * Represents the content of a crawled page
 * @interface PageContent
 */
export interface PageContent {
  /** The URL of the page */
  url: string;
  /** Title extracted from the page */
  title: string;
  /** Main content of the page */
  content: string;
  /** Optional content length in characters */
  contentLength?: number;
  /** Optional array of links found on the page */
  links?: string[];
  /** Optional metadata about the crawl */
  metadata?: {
    /** When the page was crawled */
    crawledAt: string;
    /** Length of the content */
    contentLength: number;
    /** Links found on the page */
    links: string[];
  };
}

/**
 * Formats page content into the specified output format.
 * Normalizes the page data and delegates to specific formatters.
 * 
 * @param {PageContent} page - The page content to format
 * @param {'markdown' | 'json' | 'html'} [format='markdown'] - Output format
 * @returns {string} Formatted content as a string
 */
export function formatContent(page: PageContent, format: 'markdown' | 'json' | 'html' = 'markdown'): string {
  // Normalize the page data
  const normalizedPage: PageContent = {
    ...page,
    metadata: page.metadata || {
      crawledAt: new Date().toISOString(),
      contentLength: page.contentLength || page.content.length,
      links: page.links || [],
    }
  };
  
  switch (format) {
    case 'json':
      return formatAsJson(normalizedPage);
    case 'html':
      return formatAsHtml(normalizedPage);
    case 'markdown':
    default:
      return formatAsMarkdown(normalizedPage);
  }
}

/**
 * Formats page content as Markdown with metadata header.
 * Includes URL, crawl timestamp, content length, and links.
 * 
 * @param {PageContent} page - The page content to format
 * @returns {string} Markdown formatted content
 */
export function formatAsMarkdown(page: PageContent): string {
  const metadata = page.metadata || {
    crawledAt: new Date().toISOString(),
    contentLength: page.content.length,
    links: []
  };
  
  return `# ${page.title}

**URL:** ${page.url}  
**Crawled:** ${metadata.crawledAt}  
**Content Length:** ${metadata.contentLength} characters  
**Links Found:** ${metadata.links.length}

---

${page.content}

---

## Links

${metadata.links.map(link => `- ${link}`).join('\n')}
`;
}

/**
 * Formats page content as pretty-printed JSON.
 * 
 * @param {PageContent} page - The page content to format
 * @returns {string} JSON formatted content
 */
export function formatAsJson(page: PageContent): string {
  return JSON.stringify(page, null, 2);
}

/**
 * Formats page content as a self-contained HTML document.
 * Includes metadata in both meta tags and visible content.
 * 
 * @param {PageContent} page - The page content to format
 * @returns {string} HTML formatted content
 */
export function formatAsHtml(page: PageContent): string {
  const metadata = page.metadata || {
    crawledAt: new Date().toISOString(),
    contentLength: page.content.length,
    links: []
  };
  
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${page.title}</title>
  <meta name="source-url" content="${page.url}">
  <meta name="crawled-at" content="${metadata.crawledAt}">
</head>
<body>
  <h1>${page.title}</h1>
  <p><strong>Source:</strong> <a href="${page.url}">${page.url}</a></p>
  <p><strong>Crawled:</strong> ${metadata.crawledAt}</p>
  <hr>
  <div class="content">
    ${page.content.replace(/\n/g, '<br>\n')}
  </div>
  <hr>
  <h2>Links</h2>
  <ul>
    ${metadata.links.map(link => `<li><a href="${link}">${link}</a></li>`).join('\n')}
  </ul>
</body>
</html>`;
}