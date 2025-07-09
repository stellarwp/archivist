# @stellarwp/archivist

[![Tests](https://github.com/stellarwp/archivist/actions/workflows/test.yml/badge.svg)](https://github.com/stellarwp/archivist/actions/workflows/test.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A Bun-based TypeScript tool for archiving web content to use as LLM context. Uses Pure.md API to extract clean markdown from websites with intelligent file naming.

## Features

- 🕷️ **Concurrent Web Crawling** - Configurable depth and concurrency limits
- 📝 **Multiple Output Formats** - Markdown, HTML, or JSON
- 🏷️ **Smart File Naming** - URL-based, title-based, or hash-based strategies
- ⚡ **Built with Bun** - Fast performance and modern TypeScript support
- 🧹 **Clean Content Extraction** - Powered by Pure.md API
- 🤖 **GitHub Actions Ready** - Automated scheduled archiving
- 🧪 **Well Tested** - Comprehensive test suite included

## Prerequisites

- [Bun](https://bun.sh) v1.0 or higher
- Pure.md API key (optional for basic usage, required for advanced features)

## Installation

### Global Installation

```bash
# Install globally with npm
npm install -g @stellarwp/archivist

# Or install globally with Bun
bun add -g @stellarwp/archivist
```

### As a Project Dependency

```bash
# Add to your project with npm
npm install @stellarwp/archivist

# Or add with Bun
bun add @stellarwp/archivist
```

### Development

```bash
git clone https://github.com/stellarwp/archivist.git
cd archivist
bun install
```

## Usage

### When Installed Globally

```bash
# Initialize configuration
archivist init

# Run the crawler
archivist crawl

# View help
archivist --help
```

### When Installed as a Dependency

When using Bun, the binary is not added to PATH automatically. You have several options:

```bash
# Option 1: Use bun run
bun run archivist init
bun run archivist crawl

# Option 2: Use bunx
bunx archivist init
bunx archivist crawl

# Option 3: Add to package.json scripts
# In your package.json:
{
  "scripts": {
    "archive": "archivist crawl",
    "archive:init": "archivist init"
  }
}
# Then run:
bun run archive
```

### When Using npm

With npm, the binary is automatically available:

```bash
# Via npx
npx archivist init
npx archivist crawl

# Or if installed globally
archivist init
archivist crawl
```

## Quick Start

1. **Set up your Pure.md API key** (optional but recommended):
   ```bash
   export PURE_API_KEY=your_api_key_here
   ```

2. **Initialize configuration**:
   ```bash
   # Global installation
   archivist init
   
   # As dependency with Bun
   bun run archivist init
   
   # As dependency with npm
   npx archivist init
   ```

3. **Edit `archivist.config.json`** with your URLs

4. **Run the crawler**:
   ```bash
   # Global installation
   archivist crawl
   
   # As dependency with Bun
   bun run archivist crawl
   
   # As dependency with npm
   npx archivist crawl
   ```

## Configuration

### Basic Configuration

```json
{
  "archives": [
    {
      "name": "Example Site Archive",
      "sources": [
        {
          "url": "https://example.com",
          "name": "Example Site",
          "depth": 1
        }
      ],
      "output": {
        "directory": "./archive/example",
        "format": "markdown",
        "fileNaming": "url-based"
      }
    }
  ],
  "crawl": {
    "maxConcurrency": 3,
    "delay": 1000,
    "userAgent": "Archivist/1.0",
    "timeout": 30000
  },
  "pure": {
    "apiKey": "your-api-key-here"
  }
}
```

### Configuration Options

#### Archives
Each archive in the `archives` array has:
- **name** - Name for this archive group
- **sources** - Single source or array of sources to crawl
- **output** - Output configuration for this archive

#### Sources
Sources can be:
- A simple URL string: `"https://example.com"`
- An object with options:
  - **url** - Starting URL to crawl or collect links from
  - **name** - Optional friendly name for the source
  - **depth** - How many levels deep to crawl (0 = don't crawl the source page itself)
  - **linkSelector** - CSS selector to find links to crawl (simplified support, primarily for link collection)
  - **includePatterns** - Array of patterns (minimatch or regex) - only links matching at least one will be followed
  - **excludePatterns** - Array of patterns (minimatch or regex) - links matching any of these will be excluded
  - **strategy** - Source crawling strategy: `"explorer"` (default) or `"pagination"`
  - **pagination** - Configuration for pagination strategy (see [Source Strategies](#source-strategies))

#### Output
- **directory** - Where to save archived files
- **format** - Output format: `markdown`, `html`, or `json`
- **fileNaming** - Naming strategy: `url-based`, `title-based`, or `hash-based`

#### Crawl (global settings)
- **maxConcurrency** - Maximum parallel requests
- **delay** - Delay between requests in milliseconds
- **userAgent** - User agent string for requests
- **timeout** - Request timeout in milliseconds

#### Pure (global settings)
- **apiKey** - Your Pure.md API key

## Usage Examples

For more complete examples, check out the [examples directory](./examples/).

### Single Archive with Multiple Sources

```json
{
  "archives": [
    {
      "name": "API Documentation",
      "sources": [
        "https://docs.example.com/api-reference",
        "https://docs.example.com/tutorials"
      ],
      "output": {
        "directory": "./archive/api-docs",
        "format": "markdown",
        "fileNaming": "title-based"
      }
    }
  ],
  "crawl": {
    "maxConcurrency": 3,
    "delay": 1000
  }
}
```

### Multiple Archives with Different Configurations

```json
{
  "archives": [
    {
      "name": "Documentation Site",
      "sources": {
        "url": "https://docs.example.com",
        "depth": 2
      },
      "output": {
        "directory": "./archive/docs",
        "format": "markdown",
        "fileNaming": "url-based"
      }
    },
    {
      "name": "Blog Posts",
      "sources": "https://blog.example.com",
      "output": {
        "directory": "./archive/blog",
        "format": "json",
        "fileNaming": "title-based"
      }
    }
  ],
  "crawl": {
    "maxConcurrency": 5,
    "delay": 500
  }
}
```

### Complex Multi-Archive Setup

```json
{
  "archives": [
    {
      "name": "Technical Documentation",
      "sources": [
        {
          "url": "https://docs.example.com/api",
          "depth": 2
        },
        {
          "url": "https://docs.example.com/guides",
          "depth": 1
        }
      ],
      "output": {
        "directory": "./archive/technical",
        "format": "markdown",
        "fileNaming": "url-based"
      }
    },
    {
      "name": "Blog Archive",
      "sources": [
        "https://blog.example.com/2024/01",
        "https://blog.example.com/2024/02",
        "https://blog.example.com/2024/03"
      ],
      "output": {
        "directory": "./archive/blog-2024",
        "format": "json",
        "fileNaming": "title-based"
      }
    }
  ],
  "crawl": {
    "maxConcurrency": 3,
    "delay": 2000,
    "userAgent": "Archivist/1.0"
  },
  "pure": {
    "apiKey": "your-api-key"
  }
}
```

### Link Collection Example

Use a page as a link collector to crawl all documentation pages:

```json
{
  "archives": [
    {
      "name": "API Reference",
      "sources": {
        "url": "https://docs.example.com/api/index",
        "depth": 0,
        "includePatterns": ["*/api/v1/*"]
      },
      "output": {
        "directory": "./archive/api-reference",
        "format": "markdown"
      }
    }
  ]
}
```

In this example:
- The index page at `/api/index` is used only to collect links
- `depth: 0` means the index page itself won't be archived
- Only links matching the `includePatterns` pattern will be crawled
- All matched links will be crawled and archived

## Enhanced Pattern Filtering

Control which links are followed during crawling with include and exclude patterns. Archivist supports both **minimatch glob patterns** (recommended) and **regular expressions** (for backward compatibility).

### Minimatch Patterns (Recommended)

Use familiar glob patterns like those used in `.gitignore` files:

```json
{
  "archives": [
    {
      "name": "Filtered Documentation",
      "sources": {
        "url": "https://docs.example.com",
        "depth": 2,
        "includePatterns": [
          "*/api/*",              // Match any URL with /api/ in the path
          "**/guide/**",          // Match /guide/ at any depth
          "*.html",               // Match HTML files
          "*.{md,mdx}"            // Match .md or .mdx files
        ],
        "excludePatterns": [
          "*.pdf",                // Exclude PDF files
          "*/private/*",          // Exclude /private/ paths
          "**/test/**",           // Exclude /test/ at any depth
          "*/v1/*"                // Exclude version 1 API
        ]
      },
      "output": {
        "directory": "./archive/filtered-docs"
      }
    }
  ]
}
```

Common minimatch patterns:
- `*` - Matches any string except path separators
- `**` - Matches any string including path separators
- `?` - Matches any single character
- `[abc]` - Matches any character in the brackets
- `{a,b,c}` - Matches any of the comma-separated patterns
- `*.ext` - Matches files with the specified extension

### Regular Expression Patterns (Backward Compatible)

For more complex matching, use regular expressions:

```json
{
  "archives": [
    {
      "name": "Filtered Documentation",
      "sources": {
        "url": "https://docs.example.com",
        "depth": 2,
        "includePatterns": [
          "https://docs\\.example\\.com/api/.*",
          "https://docs\\.example\\.com/guides/.*"
        ],
        "excludePatterns": [
          ".*\\.pdf$",
          ".*/archive/.*",
          ".*/deprecated/.*"
        ]
      },
      "output": {
        "directory": "./archive/filtered-docs"
      }
    }
  ]
}
```

### Pattern Examples

#### Filter by file type:
```json
"includePatterns": ["*.{html,htm,md,mdx}"],
"excludePatterns": ["*.{pdf,zip,mp4,avi}"]
```

#### Filter by API version:
```json
"includePatterns": ["*/v2/*", "*/v3/*"],
"excludePatterns": ["*/v1/*", "*/beta/*", "*/deprecated/*"]
```

#### Filter by domain:
```json
"includePatterns": ["https://docs.example.com/**", "https://api.example.com/**"],
"excludePatterns": ["https://blog.example.com/**"]
```

#### Complex filtering:
```json
"includePatterns": [
  "**/api/v[2-3]/*",                    // Minimatch: v2 or v3 API
  "^https://docs\\.example\\.com/.*"    // Regex: docs subdomain only
],
"excludePatterns": [
  "*/internal/*",                       // Minimatch: exclude internal
  ".*\\.(pdf|zip)$"                     // Regex: exclude downloads
]
```

Pattern behavior:
- **includePatterns**: Array of patterns - links must match at least one to be followed
- **excludePatterns**: Array of patterns - links matching any of these are excluded
- Patterns are applied to the full URL
- Both arrays are optional - omit for no filtering
- Minimatch patterns are detected automatically - use regex syntax for regex patterns

## Source Strategies

Archivist supports different strategies for processing sources, allowing you to handle various website structures including paginated content.

### Explorer Strategy (Default)

The explorer strategy extracts all links from a page at once. This is the default behavior and ideal for:
- Site indexes and sitemaps
- Category pages with article listings
- Navigation pages
- Any page where all links are visible on a single page

```json
{
  "sources": {
    "url": "https://docs.example.com/index",
    "strategy": "explorer",
    "linkSelector": "a.doc-link",
    "includePatterns": ["*/api/*", "*/guides/*"]
  }
}
```

### Pagination Strategy

The pagination strategy follows paginated content across multiple pages. Perfect for:
- Blog archives with numbered pages
- API documentation with paginated endpoints
- Forum threads
- Search results
- Any content split across multiple pages

#### Pattern-Based Pagination

Use when page URLs follow a predictable pattern:

```json
{
  "sources": {
    "url": "https://blog.example.com/posts",
    "strategy": "pagination",
    "pagination": {
      "pagePattern": "https://blog.example.com/posts/page/{page}",
      "startPage": 1,
      "maxPages": 10
    }
  }
}
```

#### Query Parameter Pagination

Use when pagination uses URL query parameters:

```json
{
  "sources": {
    "url": "https://forum.example.com/topics",
    "strategy": "pagination",
    "pagination": {
      "pageParam": "page",
      "startPage": 1,
      "maxPages": 20
    }
  }
}
```

#### Next Link Pagination

Use when pages have "Next" or "Older Posts" links:

```json
{
  "sources": {
    "url": "https://news.example.com/archive",
    "strategy": "pagination",
    "pagination": {
      "nextLinkSelector": "a.next-page, a[rel='next']",
      "maxPages": 50
    }
  }
}
```

### Pagination Configuration Options

- **pagePattern** - URL pattern with `{page}` placeholder for page numbers
- **pageParam** - Query parameter name for page numbers (default: "page")
- **startPage** - First page number (default: 1)
- **maxPages** - Maximum pages to crawl (default: 10 for patterns, 50 for next links)
- **nextLinkSelector** - CSS selector for finding next page links

### Complete Examples

#### Blog with Numbered Pages

```json
{
  "archives": [{
    "name": "Tech Blog Archive",
    "sources": {
      "url": "https://techblog.example.com",
      "strategy": "pagination",
      "pagination": {
        "pagePattern": "https://techblog.example.com/page/{page}",
        "startPage": 1,
        "maxPages": 25
      },
      "includePatterns": ["*/2024/*", "*/2023/*"],
      "excludePatterns": ["*/draft/*"]
    },
    "output": {
      "directory": "./archive/blog",
      "format": "markdown"
    }
  }]
}
```

#### API Documentation with Query Parameters

```json
{
  "archives": [{
    "name": "API Reference",
    "sources": {
      "url": "https://api.example.com/docs/endpoints",
      "strategy": "pagination",
      "pagination": {
        "pageParam": "offset",
        "startPage": 0,
        "maxPages": 10
      }
    },
    "output": {
      "directory": "./archive/api-docs",
      "format": "json"
    }
  }]
}
```

#### Forum with Next Links

```json
{
  "archives": [{
    "name": "Support Forum",
    "sources": {
      "url": "https://forum.example.com/category/help",
      "strategy": "pagination",
      "pagination": {
        "nextLinkSelector": "a.pagination-next",
        "maxPages": 100
      }
    },
    "output": {
      "directory": "./archive/forum",
      "format": "markdown"
    }
  }]
}
```

#### Mixed Strategies

```json
{
  "archives": [{
    "name": "Complete Documentation",
    "sources": [
      {
        "url": "https://docs.example.com/index",
        "strategy": "explorer",
        "linkSelector": "nav a"
      },
      {
        "url": "https://docs.example.com/changelog",
        "strategy": "pagination",
        "pagination": {
          "pageParam": "page",
          "maxPages": 5
        }
      }
    ],
    "output": {
      "directory": "./archive/docs"
    }
  }]
}
```

### Additional Pagination Examples

#### E-commerce Category Pages

```json
{
  "archives": [{
    "name": "Product Catalog",
    "sources": {
      "url": "https://shop.example.com/category/electronics",
      "strategy": "pagination",
      "pagination": {
        "pageParam": "p",
        "startPage": 1,
        "maxPages": 50,
        "perPageParam": "per_page"
      }
    },
    "output": {
      "directory": "./archive/products",
      "format": "json"
    }
  }]
}
```

#### Search Results with Offset

```json
{
  "archives": [{
    "name": "Search Results Archive",
    "sources": {
      "url": "https://search.example.com/results?q=javascript",
      "strategy": "pagination",
      "pagination": {
        "pageParam": "start",
        "startPage": 0,
        "maxPages": 20,
        "pageIncrement": 10
      }
    },
    "output": {
      "directory": "./archive/search-results"
    }
  }]
}
```

#### Forum Threads with Offset-Based Pagination

```json
{
  "archives": [{
    "name": "Forum Archive",
    "sources": {
      "url": "https://forum.example.com/category/general",
      "strategy": "pagination",
      "pagination": {
        "pageParam": "offset",
        "startPage": 0,
        "maxPages": 100,
        "pageIncrement": 20
      },
      "includePatterns": ["*/topic/*"],
      "excludePatterns": ["*/user/*", "*/admin/*"]
    },
    "output": {
      "directory": "./archive/forum"
    }
  }]
}
```

#### News Site with Load More Button

```json
{
  "archives": [{
    "name": "News Archive",
    "sources": {
      "url": "https://news.example.com/latest",
      "strategy": "pagination",
      "pagination": {
        "nextLinkSelector": "a.load-more-link, button.load-more[onclick*='href']",
        "maxPages": 50
      }
    },
    "output": {
      "directory": "./archive/news",
      "format": "markdown"
    }
  }]
}
```

#### Infinite Scroll Gallery

```json
{
  "archives": [{
    "name": "Photo Gallery",
    "sources": {
      "url": "https://gallery.example.com/photos",
      "strategy": "pagination",
      "pagination": {
        "nextLinkSelector": "#infinite-scroll-next, .next-batch, noscript a[href*='batch']",
        "maxPages": 100
      }
    },
    "output": {
      "directory": "./archive/gallery",
      "format": "json"
    }
  }]
}
```

#### Documentation with Section-Based Navigation

```json
{
  "archives": [{
    "name": "API Documentation",
    "sources": {
      "url": "https://api.example.com/docs/reference",
      "strategy": "pagination",
      "pagination": {
        "pageParam": "section",
        "startPage": 1,
        "maxPages": 10
      }
    },
    "output": {
      "directory": "./archive/api-docs"
    }
  }]
}
```

#### Blog with Date-Based URLs

```json
{
  "archives": [{
    "name": "Blog Archive 2024",
    "sources": {
      "url": "https://blog.example.com/2024/01",
      "strategy": "pagination",
      "pagination": {
        "pagePattern": "https://blog.example.com/2024/01/page/{page}",
        "startPage": 1,
        "maxPages": 25
      },
      "includePatterns": ["*/2024/01/*"],
      "excludePatterns": ["*/tag/*", "*/author/*"]
    },
    "output": {
      "directory": "./archive/blog-2024-01"
    }
  }]
}
```

#### Hybrid Pagination (Multiple Selectors)

```json
{
  "archives": [{
    "name": "Complex Site Archive",
    "sources": {
      "url": "https://complex.example.com/content",
      "strategy": "pagination",
      "pagination": {
        "nextLinkSelector": "a.next, a[rel='next'], .pagination a:last-child, button.more",
        "maxPages": 75
      }
    },
    "output": {
      "directory": "./archive/complex-site"
    }
  }]
}
```

### Pagination Tips and Best Practices

1. **Choose the Right Strategy**:
   - Use `pagePattern` when URLs follow a predictable pattern
   - Use `pageParam` for query parameter-based pagination
   - Use `nextLinkSelector` for following "Next" or "Load More" links

2. **Selector Optimization**:
   - Use specific selectors to avoid false matches
   - Combine multiple selectors with commas for fallbacks
   - Test selectors in browser DevTools first

3. **Performance Considerations**:
   - Set appropriate `maxPages` limits to avoid infinite loops
   - Use `delay` between requests to respect rate limits
   - Adjust `maxConcurrency` based on site capacity

4. **Common Patterns**:
   - Offset pagination: `pageParam: "offset"` with `pageIncrement`
   - Page numbers: `pageParam: "page"` or `pageParam: "p"`
   - Load more buttons: `nextLinkSelector: "button.load-more, a.load-more"`
   - Infinite scroll: Look for hidden fallback links or noscript tags

5. **Debugging**:
   - Start with small `maxPages` values during testing
   - Use browser DevTools to inspect pagination elements
   - Check for JavaScript-rendered pagination links

## CLI Reference

### Pre-Crawl Confirmation

As of v0.1.0-beta.7, Archivist will always collect and display all URLs before crawling, giving you a chance to review and confirm. This includes:
- Executing all pagination strategies to discover paginated pages
- Following depth settings to discover linked content
- Applying include/exclude patterns
- Showing the complete list of URLs that will be processed

```
Collecting URLs from 1 archive(s)...

Collecting URLs for archive: Tech Blog Archive
----------------------------------------
  Collecting from https://techblog.example.com (pagination strategy)
  → Found 150 URLs

Found 150 URLs to crawl:
==================================================
   1. https://techblog.example.com/post/1
   2. https://techblog.example.com/post/2
   ...
 150. https://techblog.example.com/post/150
==================================================

Total URLs to be processed: 150

Do you want to proceed with the crawl? (yes/no): 
```

This helps you:
- Verify the correct URLs are being targeted
- Avoid accidentally crawling too many pages
- Check that your patterns and strategies are working correctly
- Cancel if something looks wrong

### Commands

```bash
# Initialize a new configuration file
archivist init

# Run the crawler with default config
archivist crawl

# Specify a custom config file
archivist crawl --config ./custom-config.json

# Override output directory
archivist crawl --output ./my-archive

# Override output format
archivist crawl --format json

# Provide Pure.md API key via CLI
archivist crawl --pure-key your_key_here

# Enable debug logging
archivist crawl --debug

# Dry run - only collect and display URLs without crawling
archivist crawl --dry-run

# Skip confirmation prompt
archivist crawl --no-confirm
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

Structured data format for programmatic use:

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

- **url-based** - Creates descriptive names from the URL path: `example-com-docs-api.md`
- **title-based** - Uses the page title with a hash: `api-reference-guide-a1b2c3d4.md`
- **hash-based** - Uses only a content hash: `f47ac10b58cc4372.md`

## Content Extraction

### Pure.md Integration (Recommended)

This tool uses [Pure.md](https://pure.md) API for clean content extraction when available:

- No HTML parsing needed
- Automatic removal of ads, navigation, and clutter
- Clean markdown output
- Better handling of dynamic content

### Link Discovery Fallback (v0.1.0-beta.3+)

When Pure.md is unavailable or fails, Archivist uses Cheerio for link discovery only:

- Discovers all links on a page for crawling
- Useful for pagination and finding all content pages
- No content extraction - Pure.md remains the only content extractor
- Pages without successful Pure.md extraction show placeholder content
- Ensures comprehensive crawling even when content extraction fails

### Getting an API Key

1. Visit [Pure.md](https://pure.md)
2. Sign up for an account
3. Generate an API key from your dashboard

### Rate Limits

- **Anonymous**: 6 requests/minute
- **Starter Plan**: 60 requests/minute
- **Business Plan**: 3000 requests/minute

Configure delays to respect rate limits:

```json
{
  "crawl": {
    "delay": 10000  // 10 seconds between requests
  }
}
```

## GitHub Actions

Archivist can be used as a GitHub Action for automated archiving without needing to install dependencies.

### Using as a GitHub Action

```yaml
- uses: stellarwp/archivist@action
  with:
    config-file: './archivist.config.json'
    pure-api-key: ${{ secrets.PURE_API_KEY }}
```

**Note**: The GitHub Action requires a JSON config file instead of TypeScript.

See the [GitHub Action documentation](docs/github-action.md) for detailed usage and examples.

### Using via Workflow

The project also includes example workflows for automated archiving:

```yaml
on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM UTC
  workflow_dispatch:

jobs:
  archive:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: stellarwp/archivist@action
        with:
          config-file: './archivist.config.json'
          pure-api-key: ${{ secrets.PURE_API_KEY }}
```

## Development

For detailed development setup, working with forks, creating custom branches, and contributing guidelines, see our [Development Guide](DEVELOPMENT.md).

### Quick Start for Developers

```bash
# Clone and setup
git clone https://github.com/stellarwp/archivist.git
cd archivist
bun install

# Run tests (includes TypeScript type checking)
bun test

# Run only TypeScript type checking
bun run test:types

# Run tests without type checking  
bun run test:only

# Run in development mode
bun run dev
```

### Project Structure

```
archivist/
├── src/
│   ├── cli.ts              # CLI entry point
│   ├── crawler.ts          # Main crawler logic
│   ├── services/
│   │   └── pure-md.ts      # Pure.md API client
│   └── utils/
│       ├── content-formatter.ts  # Output formatting
│       ├── file-naming.ts       # File naming strategies
│       └── markdown-parser.ts   # Markdown parsing
├── tests/
│   ├── unit/               # Unit tests
│   └── integration/        # Integration tests
├── .github/workflows/
│   └── archive.yml         # GitHub Actions workflow
├── archivist.config.ts     # Configuration schema
└── package.json            # Dependencies
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

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Pure.md](https://pure.md) for the excellent content extraction API
- [Bun](https://bun.sh) for the fast JavaScript runtime
- The open-source community for inspiration and tools