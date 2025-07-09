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
      
      // Individual post pages
      if (url.pathname.startsWith('/post/')) {
        const id = url.pathname.split('/')[2];
        return new Response(`
          <!DOCTYPE html>
          <html>
          <head><title>Post ${id}</title></head>
          <body>
            <h1>Post ${id}</h1>
            <p>This is the content of post ${id}.</p>
          </body>
          </html>
        `, { headers: { 'Content-Type': 'text/html' } });
      }
      
      // Individual blog post pages
      if (url.pathname.startsWith('/blog/post/')) {
        const id = url.pathname.split('/')[3];
        return new Response(`
          <!DOCTYPE html>
          <html>
          <head><title>Blog Post ${id}</title></head>
          <body>
            <h1>Blog Post ${id}</h1>
            <p>This is the content of blog post ${id}.</p>
          </body>
          </html>
        `, { headers: { 'Content-Type': 'text/html' } });
      }
      
      // Posts with query parameter pagination
      if (url.pathname === '/posts') {
        const page = url.searchParams.get('page') || '0';
        const pageNum = parseInt(page);
        const startId = pageNum * 10 + 1;
        return new Response(`
          <!DOCTYPE html>
          <html>
          <head><title>Posts - Page ${page}</title></head>
          <body>
            <h1>Posts - Page ${page}</h1>
            <div class="posts">
              ${Array.from({length: 10}, (_, i) => {
                const id = startId + i;
                return `<article><a href="/post/${id}">Post ${id}</a></article>`;
              }).join('\n              ')}
            </div>
          </body>
          </html>
        `, { headers: { 'Content-Type': 'text/html' } });
      }
      
      // Blog with next link pagination
      if (url.pathname.startsWith('/blog/page/')) {
        const pageNum = parseInt(url.pathname.split('/')[3] || '1');
        const hasNext = pageNum < 5;
        const startId = (pageNum - 1) * 10 + 1;
        
        return new Response(`
          <!DOCTYPE html>
          <html>
          <head><title>Blog - Page ${pageNum}</title></head>
          <body>
            <h1>Blog - Page ${pageNum}</h1>
            <div class="blog-posts">
              ${Array.from({length: 10}, (_, i) => {
                const id = startId + i;
                return `<article><a href="/blog/post/${id}">Blog Post ${id}</a></article>`;
              }).join('\n              ')}
            </div>
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
        const pageNum = parseInt(page);
        const startId = pageNum * 5 + 1;
        return new Response(`
          <!DOCTYPE html>
          <html>
          <head><title>Archive - Page ${page}</title></head>
          <body>
            <h1>Archive - Page ${page}</h1>
            <div class="archive-posts">
              ${Array.from({length: 5}, (_, i) => {
                const id = startId + i;
                return `<article><a href="/archive/post/${id}">Archived Post ${id}</a></article>`;
              }).join('\n              ')}
            </div>
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
      
      // E-commerce category with query parameters
      if (url.pathname === '/shop/electronics') {
        const page = parseInt(url.searchParams.get('p') || '1');
        const perPage = parseInt(url.searchParams.get('per_page') || '20');
        const startId = (page - 1) * perPage + 1;
        return new Response(`
          <!DOCTYPE html>
          <html>
          <head><title>Electronics - Page ${page}</title></head>
          <body>
            <h1>Electronics Category - Page ${page}</h1>
            <p>Showing ${((page-1) * perPage) + 1}-${page * perPage} of 523 products</p>
            <div class="products">
              ${Array.from({length: perPage}, (_, i) => {
                const id = startId + i;
                return `<div class="product"><a href="/product/${id}">Product ${id}</a></div>`;
              }).join('\n              ')}
            </div>
            <div class="pagination">
              ${page > 1 ? `<a href="/shop/electronics?p=${page-1}" class="prev">Previous</a>` : ''}
              <a href="/shop/electronics?p=${page+1}" class="next">Next</a>
            </div>
          </body>
          </html>
        `, { headers: { 'Content-Type': 'text/html' } });
      }
      
      // Documentation with hybrid pagination
      if (url.pathname === '/docs/guides') {
        const section = url.searchParams.get('section') || '1';
        const sectionNum = parseInt(section);
        const startId = (sectionNum - 1) * 5 + 1;
        return new Response(`
          <!DOCTYPE html>
          <html>
          <head><title>Documentation Guides - Section ${section}</title></head>
          <body>
            <h1>Developer Guides - Section ${section}</h1>
            <div class="guides">
              ${Array.from({length: 5}, (_, i) => {
                const id = startId + i;
                return `<article><a href="/docs/guide/${id}">Guide ${id}: ${['Getting Started', 'API Reference', 'Best Practices', 'Advanced Topics', 'Troubleshooting'][i % 5]}</a></article>`;
              }).join('\n              ')}
            </div>
            <nav class="pagination">
              <a href="/docs/guides?section=1" ${section === '1' ? 'class="active"' : ''}>1</a>
              <a href="/docs/guides?section=2" ${section === '2' ? 'class="active"' : ''}>2</a>
              <a href="/docs/guides?section=3" ${section === '3' ? 'class="active"' : ''}>3</a>
              ${section !== '3' ? `<a href="/docs/guides?section=${parseInt(section)+1}" rel="next">Next Section →</a>` : ''}
            </nav>
          </body>
          </html>
        `, { headers: { 'Content-Type': 'text/html' } });
      }
      
      // News with load more button
      if (url.pathname === '/news/latest') {
        const loaded = parseInt(url.searchParams.get('loaded') || '5');
        const hasMore = loaded < 30;
        return new Response(`
          <!DOCTYPE html>
          <html>
          <head><title>Latest News</title></head>
          <body>
            <h1>Latest News</h1>
            <div class="news-articles">
              ${Array.from({length: loaded}, (_, i) => {
                const id = i + 1;
                return `<article><a href="/news/article/${id}">News Article ${id}</a></article>`;
              }).join('\n              ')}
            </div>
            ${hasMore ? `
              <button onclick="window.location.href='/news/latest?loaded=${loaded + 5}'">Load More</button>
              <a href="/news/latest?loaded=${loaded + 5}" class="load-more-link">Load More Articles</a>
            ` : '<p>No more articles</p>'}
          </body>
          </html>
        `, { headers: { 'Content-Type': 'text/html' } });
      }
      
      // Gallery with infinite scroll fallback
      if (url.pathname === '/gallery/photos') {
        const batch = parseInt(url.searchParams.get('batch') || '1');
        const hasMore = batch < 5;
        const startId = (batch - 1) * 10 + 1;
        return new Response(`
          <!DOCTYPE html>
          <html>
          <head><title>Photo Gallery - Batch ${batch}</title></head>
          <body>
            <h1>Photo Gallery - Batch ${batch}</h1>
            <div class="photos">
              ${Array.from({length: 10}, (_, i) => {
                const id = startId + i;
                return `<div class="photo"><a href="/photo/${id}">Photo ${id}</a></div>`;
              }).join('\n              ')}
            </div>
            <noscript>
              ${hasMore ? `<a href="/gallery/photos?batch=${batch + 1}" class="next-batch">Next Batch</a>` : ''}
            </noscript>
            <div style="display:none;">
              ${hasMore ? `<a href="/gallery/photos?batch=${batch + 1}" id="infinite-scroll-next">Load More</a>` : ''}
            </div>
          </body>
          </html>
        `, { headers: { 'Content-Type': 'text/html' } });
      }
      
      // Blog date-based URLs
      if (url.pathname.match(/^\/blog\/\d{4}\/\d{2}(\/page\/\d+)?$/)) {
        const match = url.pathname.match(/^\/blog\/(\d{4})\/(\d{2})(\/page\/(\d+))?$/);
        const year = match?.[1];
        const month = match?.[2];
        const page = match?.[4] || '0';
        const pageNum = parseInt(page);
        const startId = pageNum * 8 + 1;
        
        return new Response(`
          <!DOCTYPE html>
          <html>
          <head><title>Blog Archive - ${year}/${month} ${page !== '0' ? `Page ${page}` : ''}</title></head>
          <body>
            <h1>Blog Archive - ${year}/${month} ${page !== '0' ? `Page ${page}` : ''}</h1>
            <div class="archive-posts">
              ${Array.from({length: 8}, (_, i) => {
                const id = startId + i;
                return `<article><a href="/blog/${year}/${month}/post/${id}">Post ${id} - ${year}/${month}</a></article>`;
              }).join('\n              ')}
            </div>
          </body>
          </html>
        `, { headers: { 'Content-Type': 'text/html' } });
      }
      
      // Archive post pages
      if (url.pathname.startsWith('/archive/post/')) {
        const id = url.pathname.split('/')[3];
        return new Response(`
          <!DOCTYPE html>
          <html>
          <head><title>Archive Post ${id}</title></head>
          <body>
            <h1>Archive Post ${id}</h1>
            <p>This is the content of archive post ${id}.</p>
          </body>
          </html>
        `, { headers: { 'Content-Type': 'text/html' } });
      }
      
      // Product pages
      if (url.pathname.startsWith('/product/')) {
        const id = url.pathname.split('/')[2];
        return new Response(`
          <!DOCTYPE html>
          <html>
          <head><title>Product ${id}</title></head>
          <body>
            <h1>Product ${id}</h1>
            <p>This is the description of product ${id}.</p>
          </body>
          </html>
        `, { headers: { 'Content-Type': 'text/html' } });
      }
      
      // Photo pages
      if (url.pathname.startsWith('/photo/')) {
        const id = url.pathname.split('/')[2];
        return new Response(`
          <!DOCTYPE html>
          <html>
          <head><title>Photo ${id}</title></head>
          <body>
            <h1>Photo ${id}</h1>
            <p>This is photo ${id}.</p>
          </body>
          </html>
        `, { headers: { 'Content-Type': 'text/html' } });
      }
      
      // News article pages
      if (url.pathname.startsWith('/news/article/')) {
        const id = url.pathname.split('/')[3];
        return new Response(`
          <!DOCTYPE html>
          <html>
          <head><title>News Article ${id}</title></head>
          <body>
            <h1>News Article ${id}</h1>
            <p>This is the content of news article ${id}.</p>
          </body>
          </html>
        `, { headers: { 'Content-Type': 'text/html' } });
      }
      
      // Documentation guide pages
      if (url.pathname.startsWith('/docs/guide/')) {
        const id = url.pathname.split('/')[3];
        return new Response(`
          <!DOCTYPE html>
          <html>
          <head><title>Guide ${id}</title></head>
          <body>
            <h1>Guide ${id}</h1>
            <p>This is the content of guide ${id}.</p>
          </body>
          </html>
        `, { headers: { 'Content-Type': 'text/html' } });
      }
      
      // Blog year/month post pages
      if (url.pathname.match(/^\/blog\/\d{4}\/\d{2}\/post\/\d+$/)) {
        const parts = url.pathname.split('/');
        const year = parts[2];
        const month = parts[3];
        const id = parts[5];
        return new Response(`
          <!DOCTYPE html>
          <html>
          <head><title>Blog Post ${id} - ${year}/${month}</title></head>
          <body>
            <h1>Blog Post ${id} - ${year}/${month}</h1>
            <p>This is the content of blog post ${id} from ${year}/${month}.</p>
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