# Pre-Crawl Confirmation Example

This example demonstrates the new pre-crawl confirmation feature introduced in v0.1.0-beta.7.

## Features Demonstrated

1. **URL Collection**: All URLs are collected from pagination before crawling
2. **Confirmation Prompt**: User is asked to confirm before proceeding
3. **Pattern Filtering**: Shows how include/exclude patterns affect collected URLs

## Usage

### Normal Run (with confirmation)
```bash
archivist crawl --config examples/pre-crawl-confirmation.json
```

This will:
1. Collect all URLs from the paginated news site
2. Apply include patterns (only `/article/*` and `/story/*`)
3. Apply exclude patterns (skip `/author/*` and `/tag/*`)
4. Display all collected URLs
5. Ask for confirmation before proceeding

### Dry Run (collection only)
```bash
archivist crawl --config examples/pre-crawl-confirmation.json --dry-run
```

This will:
1. Collect and display all URLs
2. Ask for confirmation
3. Exit without crawling (even if you say yes)

### Skip Confirmation
```bash
archivist crawl --config examples/pre-crawl-confirmation.json --no-confirm
```

This will:
1. Collect and display all URLs
2. Immediately proceed with crawling (no prompt)

## Expected Output

```
Collecting URLs from 1 archive(s)...

Collecting URLs for archive: News Site with Confirmation
----------------------------------------
  Collecting from https://example.com/news (pagination strategy)
  → Found 150 URLs

Found 150 URLs to crawl:
==================================================
   1. https://example.com/news/article/breaking-news-today
   2. https://example.com/news/story/local-events
   3. https://example.com/news/article/tech-update
   ...
 150. https://example.com/news/story/weekend-roundup
==================================================

Total URLs to be processed: 150

Do you want to proceed with the crawl? (yes/no): 
```

## Benefits

1. **Verification**: Verify your patterns are working correctly
2. **Safety**: Avoid accidentally crawling too many pages
3. **Transparency**: See exactly what will be crawled
4. **Control**: Cancel if something looks wrong

## Configuration Notes

- `maxPages: 10` - Limits pagination to 10 pages
- `includePatterns` - Only crawls article and story URLs
- `excludePatterns` - Skips author and tag pages
- `delay: 2000` - 2 second delay between requests