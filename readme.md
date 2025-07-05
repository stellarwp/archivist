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

```bash
# Install from NPM
npm install -g @stellarwp/archivist
# or
bun add -g @stellarwp/archivist

# Or clone for development
git clone https://github.com/stellarwp/archivist.git
cd archivist
bun install
```

## Quick Start

1. **Set up your Pure.md API key** (optional but recommended):
   ```bash
   export PURE_API_KEY=your_api_key_here
   ```

2. **Initialize configuration**:
   ```bash
   archivist init
   ```

3. **Edit `archivist.config.json`** with your URLs

4. **Run the crawler**:
   ```bash
   archivist crawl
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
          "depth": 1,
          "selector": ".main-content"
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
  - **linkSelector** - CSS selector to find links to crawl (simplified support)
  - **followPattern** - Regex pattern to filter which links to follow

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
          "depth": 2,
          "selector": ".content"
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
        "followPattern": "https://docs\\.example\\.com/api/v1/.*"
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
- Only links matching the `followPattern` regex will be crawled
- All matched links will be crawled and archived

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

## Pure.md Integration

This tool uses [Pure.md](https://pure.md) API for clean content extraction:

- No HTML parsing needed
- Automatic removal of ads, navigation, and clutter
- Clean markdown output
- Better handling of dynamic content

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

The project includes a GitHub Action workflow for automated archiving.

### Setup

1. Add your config file to the repository
2. Set the `PURE_API_KEY` secret in your repository settings
3. The action runs daily at 2 AM UTC

### Manual Trigger

```bash
gh workflow run archive.yml -f config_path=./production.config.json
```

### Workflow Configuration

The workflow is defined in `.github/workflows/archive.yml`:

```yaml
on:
  schedule:
    - cron: '0 2 * * *'
  workflow_dispatch:
    inputs:
      config_path:
        description: 'Path to config file'
        required: false
        default: './archivist.config.json'
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