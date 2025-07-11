// Explorer strategy mock responses
import { htmlPage, generateLinks } from './base';

export function linkPage(): Response {
  return htmlPage('Link Page', `
    <h1>Links</h1>
    ${generateLinks([
      { href: '/article/1', text: 'Article 1', className: 'article-link' },
      { href: '/article/2', text: 'Article 2', className: 'article-link' },
      { href: '/page/1', text: 'Page 1', className: 'page-link' },
      { href: '/admin/dashboard', text: 'Admin' }
    ])}
  `);
}

export function categoriesPage(): Response {
  return htmlPage('Categories', `
    <h1>Categories</h1>
    ${generateLinks([
      { href: '/category/tech', text: 'Technology', className: 'category-link' },
      { href: '/category/science', text: 'Science', className: 'category-link' },
      { href: '/other/link', text: 'Other Link' }
    ])}
  `);
}

export function categoryPage(category: string): Response {
  return htmlPage(`Category: ${category}`, `
    <h1>Category: ${category}</h1>
    <p>Posts in ${category} category</p>
  `);
}