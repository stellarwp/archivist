# Archivist Usage Guide

## Quick Start

1. Install dependencies:
   ```bash
   bun install
   ```

2. Set up your Pure.md API key (optional but recommended):
   ```bash
   export PURE_API_KEY=your_api_key_here
   ```

3. Initialize configuration:
   ```bash
   bun run archive init
   ```

4. Edit `archivist.config.json` with your URLs

5. Run the crawler:
   ```bash
   bun run archive crawl
   ```

## Example Configurations

### Single Page Archive
```json
{
  "sources": [
    {
      "url": "https://docs.example.com/api-reference",
      "name": "API Documentation"
    }
  ],
  "output": {
    "directory": "./archive/api-docs",
    "format": "markdown",
    "fileNaming": "title-based"
  }
}
```

### Multi-Page Documentation Site
```json
{
  "sources": [
    {
      "url": "https://docs.example.com",
      "name": "Example Docs",
      "depth": 2
    }
  ],
  "output": {
    "directory": "./archive/example-docs",
    "format": "markdown",
    "fileNaming": "url-based"
  },
  "crawl": {
    "maxConcurrency": 5,
    "delay": 500
  }
}
```

### Multiple Sources
```json
{
  "sources": [
    {
      "url": "https://blog.example.com/post-1",
      "name": "Blog Post 1"
    },
    {
      "url": "https://blog.example.com/post-2",
      "name": "Blog Post 2"
    },
    {
      "url": "https://docs.example.com",
      "name": "Documentation",
      "depth": 1
    }
  ],
  "output": {
    "directory": "./archive/mixed-content",
    "format": "json"
  }
}
```

## CLI Options

### Crawl Command
```bash
# Use default config
bun run archive crawl

# Specify config file
bun run archive crawl --config ./custom-config.json

# Override output directory
bun run archive crawl --output ./my-archive

# Override format
bun run archive crawl --format json

# Provide Pure.md API key
bun run archive crawl --pure-key your_key_here
```

## Output Formats

### Markdown (default)
Creates clean markdown files with metadata headers:
```markdown
# Page Title

**URL:** https://example.com/page  
**Crawled:** 2024-01-01T12:00:00Z  
**Content Length:** 5432 characters  
**Links Found:** 23

---

Page content here...

---

## Links

- https://example.com/link1
- https://example.com/link2
```

### JSON
Structured data format:
```json
{
  "url": "https://example.com/page",
  "title": "Page Title",
  "content": "Page content...",
  "metadata": {
    "crawledAt": "2024-01-01T12:00:00Z",
    "contentLength": 5432,
    "links": ["https://example.com/link1", "..."]
  }
}
```

### HTML
Self-contained HTML with metadata:
```html
<!DOCTYPE html>
<html>
<head>
  <title>Page Title</title>
  <meta name="source-url" content="https://example.com/page">
  <meta name="crawled-at" content="2024-01-01T12:00:00Z">
</head>
<body>
  <!-- Content with links preserved -->
</body>
</html>
```

## File Naming Strategies

- **url-based**: `example-com-docs-api.md`
- **title-based**: `api-reference-guide-a1b2c3d4.md`
- **hash-based**: `f47ac10b58cc4372.md`

## Rate Limiting

Without API key:
- 6 requests per minute

With API key:
- Starter: 60 requests per minute
- Business: 3000 requests per minute

Configure delays to respect rate limits:
```json
{
  "crawl": {
    "delay": 10000  // 10 seconds between requests
  }
}
```

## GitHub Actions

The workflow runs daily at 2 AM UTC:
```yaml
on:
  schedule:
    - cron: '0 2 * * *'
```

Manual trigger with custom config:
```bash
gh workflow run archive.yml -f config_path=./production.config.json
```

## Troubleshooting

### Rate Limit Errors
- Add/verify your Pure.md API key
- Increase the `delay` in crawl settings
- Reduce `maxConcurrency`

### Missing Content
- Check if the site requires authentication
- Verify the URL is accessible
- Try without the `selector` option first

### Large Sites
- Use `depth: 0` to crawl only specific pages
- Increase `timeout` for slow sites
- Use hash-based naming to avoid filename conflicts