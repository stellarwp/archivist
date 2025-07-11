// Pagination stop scenario mock responses
import { htmlPage, generateArticleLinks } from './base';

// Consecutive empty pages scenario
export function consecutiveEmptyPages(pageNum: number): Response {
  // Pages 1-3 have links, pages 4-6 have no links
  if (pageNum <= 3) {
    const links = Array.from({ length: 2 }, (_, i) => ({
      href: `/article/page${pageNum}-${i + 1}`,
      text: `Article ${pageNum}-${i + 1}`
    }));
    
    return htmlPage(`Blog - Page ${pageNum}`, `
      <h1>Blog - Page ${pageNum}</h1>
      <div class="posts">
        ${generateArticleLinks(links)}
      </div>
      <a href="/blog/empty-pages/page/${pageNum + 1}" class="next-page">Next Page</a>
    `);
  }
  
  // Empty pages (no article links, only navigation)
  return htmlPage(`Blog - Page ${pageNum}`, `
    <h1>Blog - Page ${pageNum}</h1>
    <div class="posts">
      <p>No posts found on this page.</p>
    </div>
    ${pageNum < 10 ? `<a href="/blog/empty-pages/page/${pageNum + 1}" class="next-page">Next Page</a>` : ''}
  `);
}

// 404 errors scenario
export function pageWith404s(pageNum: number): Response {
  // Pages 1-2 exist, pages 3-4 return 404, page 5 exists
  if (pageNum === 3 || pageNum === 4) {
    return new Response('Page Not Found', { status: 404 });
  }
  
  const links = Array.from({ length: 3 }, (_, i) => ({
    href: `/article/404test-${pageNum}-${i + 1}`,
    text: `Article ${pageNum}-${i + 1}`
  }));
  
  return htmlPage(`Blog - Page ${pageNum}`, `
    <h1>Blog - Page ${pageNum}</h1>
    <div class="posts">
      ${generateArticleLinks(links)}
    </div>
  `);
}

// Error page content detection scenario
export function errorPageContent(pageNum: number): Response {
  // Pages 1-2 have content, page 3 shows error message
  if (pageNum <= 2) {
    const links = Array.from({ length: 3 }, (_, i) => ({
      href: `/article/error-${pageNum}-${i + 1}`,
      text: `Article ${pageNum}-${i + 1}`
    }));
    
    return htmlPage(`Blog - Page ${pageNum}`, `
      <h1>Blog - Page ${pageNum}</h1>
      <div class="posts">
        ${generateArticleLinks(links)}
      </div>
    `);
  }
  
  // Error page with keywords
  return htmlPage(`Error - Page Not Found`, `
    <h1>Error 404</h1>
    <div class="error-message">
      <p>Sorry, this page does not exist.</p>
      <p>The page you're looking for was not found.</p>
    </div>
  `);
}

// Declining links trend scenario
export function decliningLinks(pageNum: number): Response {
  // Gradually decreasing number of links per page
  const linkCounts = [10, 8, 6, 4, 2, 1, 0, 0];
  const linkCount = linkCounts[pageNum - 1] || 0;
  
  const links = Array.from({ length: linkCount }, (_, i) => ({
    href: `/article/declining-${pageNum}-${i + 1}`,
    text: `Article ${pageNum}-${i + 1}`
  }));
  
  return htmlPage(`Blog - Page ${pageNum}`, `
    <h1>Blog - Page ${pageNum}</h1>
    <div class="posts">
      ${linkCount > 0 ? generateArticleLinks(links) : '<p>No new articles this week.</p>'}
    </div>
    ${pageNum < 10 ? `<a href="/blog/declining/page/${pageNum + 1}" class="next-page">Next Page</a>` : ''}
  `);
}

// Mixed signals scenario (for testing priority)
export function mixedSignals(pageNum: number): Response {
  // Page 1: Normal
  // Page 2: Few links
  // Page 3: 404
  // Page 4: No links
  // Page 5: Error content
  
  if (pageNum === 3) {
    return new Response('Not Found', { status: 404 });
  }
  
  if (pageNum === 5) {
    return htmlPage(`End of Archive`, `
      <h1>No More Pages</h1>
      <div class="message">
        <p>You've reached the end of the archive.</p>
        <p>No posts found beyond this point.</p>
      </div>
    `);
  }
  
  const linksByPage: Record<number, number> = {
    1: 5,
    2: 1,
    4: 0,
  };
  
  const linkCount = linksByPage[pageNum] ?? 3;
  const links = Array.from({ length: linkCount }, (_, i) => ({
    href: `/article/mixed-${pageNum}-${i + 1}`,
    text: `Article ${pageNum}-${i + 1}`
  }));
  
  return htmlPage(`Blog - Page ${pageNum}`, `
    <h1>Blog - Page ${pageNum}</h1>
    <div class="posts">
      ${linkCount > 0 ? generateArticleLinks(links) : '<p>This page is empty.</p>'}
    </div>
  `);
}

// Custom configuration test scenario
export function customStopConditions(pageNum: number): Response {
  // Designed to test custom stop conditions:
  // - Stop after 2 consecutive empty pages (not 3)
  // - Stop after 1 404 error (not 2)
  // - Minimum 3 new links per page (not 1)
  
  if (pageNum === 4) {
    return new Response('Not Found', { status: 404 });
  }
  
  const linksByPage: Record<number, number> = {
    1: 5,  // Good
    2: 2,  // Below threshold of 3
    3: 1,  // Below threshold
    5: 4,  // Would be good but should stop at 404
  };
  
  const linkCount = linksByPage[pageNum] ?? 0;
  const links = Array.from({ length: linkCount }, (_, i) => ({
    href: `/article/custom-${pageNum}-${i + 1}`,
    text: `Article ${pageNum}-${i + 1}`
  }));
  
  return htmlPage(`Blog - Page ${pageNum}`, `
    <h1>Blog - Page ${pageNum}</h1>
    <div class="posts">
      ${linkCount > 0 ? generateArticleLinks(links) : '<p>No articles on this page.</p>'}
    </div>
  `);
}