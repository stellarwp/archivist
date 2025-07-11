// Base utilities for generating mock responses

export function htmlPage(title: string, content: string): Response {
  return new Response(`
    <!DOCTYPE html>
    <html>
    <head><title>${title}</title></head>
    <body>
      ${content}
    </body>
    </html>
  `, { headers: { 'Content-Type': 'text/html' } });
}

export function generateLinks(items: Array<{href: string, text: string, className?: string}>): string {
  return items.map(item => 
    `<a href="${item.href}"${item.className ? ` class="${item.className}"` : ''}>${item.text}</a>`
  ).join('\n');
}

export function generateArticleLinks(items: Array<{href: string, text: string}>): string {
  return items.map(item => 
    `<article><a href="${item.href}">${item.text}</a></article>`
  ).join('\n');
}

export function contentPage(type: string, id: string): Response {
  return htmlPage(
    `${type} ${id}`,
    `<h1>${type} ${id}</h1>\n<p>This is the content of ${type.toLowerCase()} ${id}.</p>`
  );
}