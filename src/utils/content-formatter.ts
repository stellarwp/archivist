export interface PageContent {
  url: string;
  title: string;
  content: string;
  contentLength?: number;
  links?: string[];
  metadata?: {
    crawledAt: string;
    contentLength: number;
    links: string[];
  };
}

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

export function formatAsJson(page: PageContent): string {
  return JSON.stringify(page, null, 2);
}

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