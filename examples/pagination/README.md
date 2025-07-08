# Pagination Strategy Examples

This directory contains example configurations for various pagination strategies supported by Archivist.

## Examples Overview

### 1. Blog Archive (`blog-archive.json`)
- **Pattern**: URL pattern-based pagination
- **Use Case**: Blog posts organized by page numbers
- **Strategy**: Uses `pagePattern` with `{page}` placeholder
- **Features**: Include/exclude patterns for filtering content

### 2. E-commerce Products (`ecommerce-products.json`)
- **Pattern**: Query parameter pagination
- **Use Case**: Product listings with page parameters
- **Strategy**: Uses `pageParam` for different categories
- **Features**: Multiple archives for different product categories

### 3. Forum Archive (`forum-archive.json`)
- **Pattern**: Offset-based pagination
- **Use Case**: Forum topics with offset pagination
- **Strategy**: Uses `pageParam` with `pageIncrement`
- **Features**: Multiple categories with different limits

### 4. Documentation Hybrid (`documentation-hybrid.json`)
- **Pattern**: Mixed strategies
- **Use Case**: Complex documentation site
- **Strategy**: Combines explorer and multiple pagination types
- **Features**: Different strategies for different sections

### 5. News & Infinite Scroll (`news-infinite-scroll.json`)
- **Pattern**: Next link following
- **Use Case**: News sites and galleries with infinite scroll
- **Strategy**: Uses `nextLinkSelector` with multiple fallbacks
- **Features**: Complex selectors for various implementations

## Common Pagination Patterns

### URL Pattern-Based
```json
"pagination": {
  "pagePattern": "https://example.com/posts/page/{page}",
  "startPage": 1,
  "maxPages": 50
}
```

### Query Parameter-Based
```json
"pagination": {
  "pageParam": "page",
  "startPage": 1,
  "maxPages": 100
}
```

### Offset-Based
```json
"pagination": {
  "pageParam": "offset",
  "startPage": 0,
  "maxPages": 50,
  "pageIncrement": 20
}
```

### Next Link Following
```json
"pagination": {
  "nextLinkSelector": "a.next, a[rel='next'], .load-more",
  "maxPages": 100
}
```

## Tips for Pagination

1. **Start Small**: Test with low `maxPages` values first
2. **Inspect Elements**: Use browser DevTools to find correct selectors
3. **Multiple Selectors**: Use comma-separated selectors for fallbacks
4. **Rate Limiting**: Adjust `delay` to respect server limits
5. **Pattern Testing**: Test patterns in browser console first

## Selector Examples

### Common Next Link Selectors
- `a.next-page`
- `a[rel='next']`
- `.pagination a:last-child`
- `a:contains('Next')`
- `button.load-more`
- `.load-more-link`

### Common Page Number Selectors
- `.pagination a`
- `.page-numbers a`
- `nav.pagination li a`
- `.pager a`

### Infinite Scroll Fallbacks
- `noscript a`
- `[data-next-url]`
- `.infinite-scroll-next`
- `#load-more-trigger`

## Running Examples

1. Set your Pure.md API key:
   ```bash
   export PURE_API_KEY=your_api_key_here
   ```

2. Run an example:
   ```bash
   archivist crawl --config examples/pagination/blog-archive.json
   ```

3. Check the output in the specified directory

## Customization

Feel free to modify these examples for your specific needs:
- Adjust `maxPages` based on site size
- Modify selectors to match your target site
- Change output formats and naming strategies
- Add include/exclude patterns for filtering