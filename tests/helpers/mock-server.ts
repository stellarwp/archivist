import { serve } from 'bun';

interface MockServerResult {
  url: string;
  stop: () => void;
}

export async function startMockServer(): Promise<MockServerResult> {
  const server = serve({
    port: 0, // Random available port
    fetch(request: Request) {
      const url = new URL(request.url);
      
      // Link discovery page
      if (url.pathname === '/link-page') {
        return new Response(`
          <!DOCTYPE html>
          <html>
          <head><title>Link Page</title></head>
          <body>
            <h1>Links</h1>
            <a href="/article/1" class="article-link">Article 1</a>
            <a href="/article/2" class="article-link">Article 2</a>
            <a href="/page/1" class="page-link">Page 1</a>
            <a href="/admin/dashboard">Admin</a>
          </body>
          </html>
        `, { headers: { 'Content-Type': 'text/html' } });
      }
      
      // Article pages
      if (url.pathname.startsWith('/article/')) {
        const id = url.pathname.split('/')[2];
        return new Response(`
          <!DOCTYPE html>
          <html>
          <head><title>Article ${id}</title></head>
          <body>
            <h1>Article ${id}</h1>
            <p>This is the content of article ${id}.</p>
          </body>
          </html>
        `, { headers: { 'Content-Type': 'text/html' } });
      }
      
      // Posts with query parameter pagination
      if (url.pathname === '/posts') {
        const page = url.searchParams.get('page') || '0';
        return new Response(`
          <!DOCTYPE html>
          <html>
          <head><title>Posts - Page ${page}</title></head>
          <body>
            <h1>Posts - Page ${page}</h1>
            <article>Post content for page ${page}</article>
          </body>
          </html>
        `, { headers: { 'Content-Type': 'text/html' } });
      }
      
      // Blog with next link pagination
      if (url.pathname.startsWith('/blog/page/')) {
        const pageNum = parseInt(url.pathname.split('/')[3] || '1');
        const hasNext = pageNum < 5;
        
        return new Response(`
          <!DOCTYPE html>
          <html>
          <head><title>Blog - Page ${pageNum}</title></head>
          <body>
            <h1>Blog - Page ${pageNum}</h1>
            <article>Blog post ${pageNum}</article>
            ${hasNext ? `<a href="/blog/page/${pageNum + 1}" class="next-page">Next</a>` : ''}
          </body>
          </html>
        `, { headers: { 'Content-Type': 'text/html' } });
      }
      
      // Categories page
      if (url.pathname === '/categories') {
        return new Response(`
          <!DOCTYPE html>
          <html>
          <head><title>Categories</title></head>
          <body>
            <h1>Categories</h1>
            <a href="/category/tech" class="category-link">Technology</a>
            <a href="/category/science" class="category-link">Science</a>
            <a href="/other/link">Other Link</a>
          </body>
          </html>
        `, { headers: { 'Content-Type': 'text/html' } });
      }
      
      // Archive with parameter pagination
      if (url.pathname === '/archive') {
        const page = url.searchParams.get('p') || '0';
        return new Response(`
          <!DOCTYPE html>
          <html>
          <head><title>Archive - Page ${page}</title></head>
          <body>
            <h1>Archive - Page ${page}</h1>
            <p>Archive content for page ${page}</p>
          </body>
          </html>
        `, { headers: { 'Content-Type': 'text/html' } });
      }
      
      // About page
      if (url.pathname === '/about') {
        return new Response(`
          <!DOCTYPE html>
          <html>
          <head><title>About</title></head>
          <body>
            <h1>About Us</h1>
            <p>This is the about page.</p>
          </body>
          </html>
        `, { headers: { 'Content-Type': 'text/html' } });
      }
      
      // Category pages
      if (url.pathname.startsWith('/category/')) {
        const category = url.pathname.split('/')[2];
        return new Response(`
          <!DOCTYPE html>
          <html>
          <head><title>Category: ${category}</title></head>
          <body>
            <h1>Category: ${category}</h1>
            <p>Posts in ${category} category</p>
          </body>
          </html>
        `, { headers: { 'Content-Type': 'text/html' } });
      }
      
      // Default 404
      return new Response('Not Found', { status: 404 });
    },
  });
  
  return {
    url: `http://localhost:${server.port}`,
    stop: () => server.stop(),
  };
}