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
  - **includePatterns** - Array of regex patterns - only links matching at least one will be followed
  - **excludePatterns** - Array of regex patterns - links matching any of these will be excluded

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
        "includePatterns": ["https://docs\\.example\\.com/api/v1/.*"]
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
- Only links matching the `includePatterns` regex will be crawled
- All matched links will be crawled and archived

## Enhanced Pattern Filtering (v0.1.0-beta.3+)

Control which links are followed during crawling with include and exclude patterns:

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

Pattern behavior:
- **includePatterns**: Array of regex patterns - links must match at least one to be followed
- **excludePatterns**: Array of regex patterns - links matching any of these are excluded
- Patterns are applied to the full URL
- Both arrays are optional - omit for no filtering

## CLI Reference

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

# Run tests
bun test

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