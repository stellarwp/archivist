import { serve } from 'bun';
import * as explorer from './mock-responses/explorer';
import * as pagination from './mock-responses/pagination';
import * as content from './mock-responses/content';

interface MockServerResult {
  url: string;
  stop: () => void;
}

interface Route {
  pattern: RegExp;
  handler: (match: RegExpMatchArray, searchParams: URLSearchParams) => Response;
}

export async function startMockServer(): Promise<MockServerResult> {
  // Define routes with patterns and handlers
  const routes: Route[] = [
    // Explorer strategy pages
    { pattern: /^\/link-page$/, handler: () => explorer.linkPage() },
    { pattern: /^\/categories$/, handler: () => explorer.categoriesPage() },
    { pattern: /^\/category\/(.+)$/, handler: (match) => explorer.categoryPage(match[1]) },

    // Pagination strategy pages
    { pattern: /^\/posts$/, handler: (_, params) => pagination.postsWithQueryParam(params.get('page') || '0') },
    { pattern: /^\/blog\/page\/(\d+)$/, handler: (match) => pagination.blogWithNextLink(parseInt(match[1])) },
    { pattern: /^\/archive$/, handler: (_, params) => pagination.archiveWithParam(params.get('p') || '0') },
    { pattern: /^\/shop\/electronics$/, handler: (_, params) => pagination.shopElectronics(params) },
    { pattern: /^\/docs\/guides$/, handler: (_, params) => pagination.docsGuides(params) },
    { pattern: /^\/news\/latest$/, handler: (_, params) => pagination.newsWithLoadMore(params) },
    { pattern: /^\/gallery\/photos$/, handler: (_, params) => pagination.galleryPhotos(params) },
    { 
      pattern: /^\/blog\/(\d{4})\/(\d{2})(\/page\/(\d+))?$/, 
      handler: (match) => pagination.blogArchiveByDate(match[1], match[2], match[4])
    },

    // Content pages
    { pattern: /^\/article\/(\d+)$/, handler: (match) => content.articlePage(match[1]) },
    { pattern: /^\/post\/(\d+)$/, handler: (match) => content.postPage(match[1]) },
    { pattern: /^\/blog\/post\/(\d+)$/, handler: (match) => content.blogPostPage(match[1]) },
    { pattern: /^\/archive\/post\/(\d+)$/, handler: (match) => content.archivePostPage(match[1]) },
    { pattern: /^\/product\/(\d+)$/, handler: (match) => content.productPage(match[1]) },
    { pattern: /^\/photo\/(\d+)$/, handler: (match) => content.photoPage(match[1]) },
    { pattern: /^\/news\/article\/(\d+)$/, handler: (match) => content.newsArticlePage(match[1]) },
    { pattern: /^\/docs\/guide\/(\d+)$/, handler: (match) => content.docsGuidePage(match[1]) },
    { 
      pattern: /^\/blog\/(\d{4})\/(\d{2})\/post\/(\d+)$/, 
      handler: (match) => content.blogDatePostPage(match[1], match[2], match[3])
    },

    // Static pages
    { pattern: /^\/about$/, handler: () => content.aboutPage() },
  ];

  const server = serve({
    port: 0, // Random available port
    fetch(request: Request) {
      const url = new URL(request.url);
      
      // Try each route pattern
      for (const route of routes) {
        const match = url.pathname.match(route.pattern);
        if (match) {
          return route.handler(match, url.searchParams);
        }
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