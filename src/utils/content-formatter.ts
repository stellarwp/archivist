export interface PageContent {
  url: string;
  title: string;
  content: string;
  metadata: {
    crawledAt: string;
    contentLength: number;
    links: string[];
  };
}

export function formatAsMarkdown(page: PageContent): string {
  return `# ${page.title}

**URL:** ${page.url}  
**Crawled:** ${page.metadata.crawledAt}  
**Content Length:** ${page.metadata.contentLength} characters  
**Links Found:** ${page.metadata.links.length}

---

${page.content}

---

## Links

${page.metadata.links.map(link => `- ${link}`).join('\n')}
`;
}

export function formatAsJson(page: PageContent): string {
  return JSON.stringify(page, null, 2);
}

export function formatAsHtml(page: PageContent): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${page.title}</title>
  <meta name="source-url" content="${page.url}">
  <meta name="crawled-at" content="${page.metadata.crawledAt}">
</head>
<body>
  <h1>${page.title}</h1>
  <p><strong>Source:</strong> <a href="${page.url}">${page.url}</a></p>
  <p><strong>Crawled:</strong> ${page.metadata.crawledAt}</p>
  <hr>
  <div class="content">
    ${page.content.replace(/\n/g, '<br>\n')}
  </div>
  <hr>
  <h2>Links</h2>
  <ul>
    ${page.metadata.links.map(link => `<li><a href="${link}">${link}</a></li>`).join('\n')}
  </ul>
</body>
</html>`;
}