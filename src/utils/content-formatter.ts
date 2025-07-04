import * as cheerio from 'cheerio';

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

export function htmlToMarkdown($: cheerio.CheerioAPI, url: string): PageContent {
  const title = $('title').text() || 'Untitled';
  
  // Remove script and style elements
  $('script, style, noscript').remove();
  
  // Extract all links
  const links: string[] = [];
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (href) {
      try {
        const absoluteUrl = new URL(href, url).href;
        links.push(absoluteUrl);
      } catch {}
    }
  });
  
  // Convert to text with basic formatting
  let content = '';
  
  // Process headings
  $('h1, h2, h3, h4, h5, h6').each((_, el) => {
    const level = parseInt(el.tagName[1]);
    const text = $(el).text().trim();
    if (text) {
      content += '\n' + '#'.repeat(level) + ' ' + text + '\n\n';
    }
    $(el).replaceWith('');
  });
  
  // Process paragraphs
  $('p').each((_, el) => {
    const text = $(el).text().trim();
    if (text) {
      content += text + '\n\n';
    }
  });
  
  // Process lists
  $('ul, ol').each((_, list) => {
    $(list).find('li').each((i, li) => {
      const text = $(li).text().trim();
      if (text) {
        const prefix = list.tagName === 'ol' ? `${i + 1}. ` : '- ';
        content += prefix + text + '\n';
      }
    });
    content += '\n';
  });
  
  // Add remaining text
  const remainingText = $('body').text().trim();
  if (remainingText && !content.includes(remainingText)) {
    content += '\n' + remainingText;
  }
  
  return {
    url,
    title,
    content: content.trim(),
    metadata: {
      crawledAt: new Date().toISOString(),
      contentLength: content.length,
      links: [...new Set(links)],
    },
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