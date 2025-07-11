// Pagination strategy mock responses
import { htmlPage, generateArticleLinks } from './base';

const ITEMS_PER_PAGE = 3; // Reduced from 10 to 3

export function postsWithQueryParam(page: string): Response {
  const pageNum = parseInt(page);
  const startId = pageNum * ITEMS_PER_PAGE + 1;
  
  const posts = Array.from({ length: ITEMS_PER_PAGE }, (_, i) => ({
    href: `/post/${startId + i}`,
    text: `Post ${startId + i}`
  }));

  return htmlPage(`Posts - Page ${page}`, `
    <h1>Posts - Page ${page}</h1>
    <div class="posts">
      ${generateArticleLinks(posts)}
    </div>
  `);
}

export function blogWithNextLink(pageNum: number): Response {
  const hasNext = pageNum < 3; // Reduced from 4 to 3 pages total
  const startId = (pageNum - 1) * ITEMS_PER_PAGE + 1;
  
  const posts = Array.from({ length: ITEMS_PER_PAGE }, (_, i) => ({
    href: `/blog/post/${startId + i}`,
    text: `Blog Post ${startId + i}`
  }));

  return htmlPage(`Blog - Page ${pageNum}`, `
    <h1>Blog - Page ${pageNum}</h1>
    <div class="blog-posts">
      ${generateArticleLinks(posts)}
    </div>
    ${hasNext ? `<a href="/blog/page/${pageNum + 1}" class="next-page">Next</a>` : ''}
  `);
}

export function archiveWithParam(page: string): Response {
  const pageNum = parseInt(page);
  const startId = pageNum * ITEMS_PER_PAGE + 1;
  
  const posts = Array.from({ length: ITEMS_PER_PAGE }, (_, i) => ({
    href: `/archive/post/${startId + i}`,
    text: `Archived Post ${startId + i}`
  }));

  return htmlPage(`Archive - Page ${page}`, `
    <h1>Archive - Page ${page}</h1>
    <div class="archive-posts">
      ${generateArticleLinks(posts)}
    </div>
  `);
}

export function shopElectronics(searchParams: URLSearchParams): Response {
  const page = parseInt(searchParams.get('p') || '1');
  const perPage = 4; // Reduced from 20
  const startId = (page - 1) * perPage + 1;
  const totalProducts = 12; // Reduced from 523
  
  const products = Array.from({ length: perPage }, (_, i) => {
    const id = startId + i;
    return `<div class="product"><a href="/product/${id}">Product ${id}</a></div>`;
  });

  return htmlPage(`Electronics - Page ${page}`, `
    <h1>Electronics Category - Page ${page}</h1>
    <p>Showing ${((page-1) * perPage) + 1}-${Math.min(page * perPage, totalProducts)} of ${totalProducts} products</p>
    <div class="products">
      ${products.join('\n')}
    </div>
    <div class="pagination">
      ${page > 1 ? `<a href="/shop/electronics?p=${page-1}" class="prev">Previous</a>` : ''}
      ${page * perPage < totalProducts ? `<a href="/shop/electronics?p=${page+1}" class="next">Next</a>` : ''}
    </div>
  `);
}

export function docsGuides(searchParams: URLSearchParams): Response {
  const section = searchParams.get('section') || '1';
  const sectionNum = parseInt(section);
  const startId = (sectionNum - 1) * 3 + 1; // 3 guides per section
  const guideTypes = ['Getting Started', 'API Reference', 'Best Practices'];
  
  const guides = Array.from({ length: 3 }, (_, i) => ({
    href: `/docs/guide/${startId + i}`,
    text: `Guide ${startId + i}: ${guideTypes[i % 3]}`
  }));

  return htmlPage(`Documentation Guides - Section ${section}`, `
    <h1>Developer Guides - Section ${section}</h1>
    <div class="guides">
      ${generateArticleLinks(guides)}
    </div>
    <nav class="pagination">
      ${Array.from({ length: 3 }, (_, i) => {
        const pageNum = i + 1;
        return `<a href="/docs/guides?section=${pageNum}" ${section === pageNum.toString() ? 'class="active"' : ''}>${pageNum}</a>`;
      }).join('\n')}
      ${sectionNum < 3 ? `<a href="/docs/guides?section=${sectionNum + 1}" rel="next">Next Section →</a>` : ''}
    </nav>
  `);
}

export function newsWithLoadMore(searchParams: URLSearchParams): Response {
  const loaded = parseInt(searchParams.get('loaded') || '4');
  const maxArticles = 12; // Reduced from 30
  const hasMore = loaded < maxArticles;
  
  const articles = Array.from({ length: loaded }, (_, i) => ({
    href: `/news/article/${i + 1}`,
    text: `News Article ${i + 1}`
  }));

  return htmlPage('Latest News', `
    <h1>Latest News</h1>
    <div class="news-articles">
      ${generateArticleLinks(articles)}
    </div>
    ${hasMore ? `
      <button onclick="window.location.href='/news/latest?loaded=${loaded + 4}'">Load More</button>
      <a href="/news/latest?loaded=${loaded + 4}" class="load-more-link">Load More Articles</a>
    ` : '<p>No more articles</p>'}
  `);
}

export function galleryPhotos(searchParams: URLSearchParams): Response {
  const batch = parseInt(searchParams.get('batch') || '1');
  const photosPerBatch = 3; // Reduced from 10
  const maxBatches = 4; // Reduced from 5
  const hasMore = batch < maxBatches;
  const startId = (batch - 1) * photosPerBatch + 1;
  
  const photos = Array.from({ length: photosPerBatch }, (_, i) => {
    const id = startId + i;
    return `<div class="photo"><a href="/photo/${id}">Photo ${id}</a></div>`;
  });

  return htmlPage(`Photo Gallery - Batch ${batch}`, `
    <h1>Photo Gallery - Batch ${batch}</h1>
    <div class="photos">
      ${photos.join('\n')}
    </div>
    <noscript>
      ${hasMore ? `<a href="/gallery/photos?batch=${batch + 1}" class="next-batch">Next Batch</a>` : ''}
    </noscript>
    <div style="display:none;">
      ${hasMore ? `<a href="/gallery/photos?batch=${batch + 1}" id="infinite-scroll-next">Load More</a>` : ''}
    </div>
  `);
}

export function blogArchiveByDate(year: string, month: string, page?: string): Response {
  const pageNum = parseInt(page || '0');
  const postsPerPage = 3; // Reduced from 8
  const startId = pageNum * postsPerPage + 1;
  
  const posts = Array.from({ length: postsPerPage }, (_, i) => ({
    href: `/blog/${year}/${month}/post/${startId + i}`,
    text: `Post ${startId + i} - ${year}/${month}`
  }));

  return htmlPage(
    `Blog Archive - ${year}/${month} ${page ? `Page ${page}` : ''}`,
    `
      <h1>Blog Archive - ${year}/${month} ${page ? `Page ${page}` : ''}</h1>
      <div class="archive-posts">
        ${generateArticleLinks(posts)}
      </div>
    `
  );
}