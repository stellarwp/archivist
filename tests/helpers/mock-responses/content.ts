// Content pages mock responses
import { contentPage, htmlPage } from './base';

export function articlePage(id: string): Response {
  return contentPage('Article', id);
}

export function postPage(id: string): Response {
  return contentPage('Post', id);
}

export function blogPostPage(id: string): Response {
  return contentPage('Blog Post', id);
}

export function archivePostPage(id: string): Response {
  return contentPage('Archive Post', id);
}

export function productPage(id: string): Response {
  return contentPage('Product', id);
}

export function photoPage(id: string): Response {
  return contentPage('Photo', id);
}

export function newsArticlePage(id: string): Response {
  return contentPage('News Article', id);
}

export function docsGuidePage(id: string): Response {
  return contentPage('Guide', id);
}

export function blogDatePostPage(year: string, month: string, id: string): Response {
  return htmlPage(
    `Blog Post ${id} - ${year}/${month}`,
    `<h1>Blog Post ${id} - ${year}/${month}</h1>\n<p>This is the content of blog post ${id} from ${year}/${month}.</p>`
  );
}

export function aboutPage(): Response {
  return htmlPage('About', '<h1>About Us</h1>\n<p>This is the about page.</p>');
}