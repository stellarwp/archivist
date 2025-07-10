# Development Guide

This guide explains how to set up Archivist for development, whether you're contributing to the project or using it as a base for your own work.

## Table of Contents

- [Development Setup](#development-setup)
- [Working with Forks](#working-with-forks)
- [Creating Feature Branches](#creating-feature-branches)
- [Installing as a Local Tool](#installing-as-a-local-tool)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Testing](#testing)
- [Debugging](#debugging)
- [Contributing](#contributing)

## Development Setup

### Prerequisites

- [Bun](https://bun.sh) v1.0 or higher
- Git
- A Pure.md API key (for testing actual crawling)

### Basic Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/stellarwp/archivist.git
   cd archivist
   ```

2. **Install dependencies**:
   ```bash
   bun install
   ```

3. **Set up environment** (optional):
   ```bash
   cp .env.example .env
   # Edit .env with your Pure.md API key
   ```

## Working with Forks

If you plan to make significant changes or use Archivist as a base for your own project:

1. **Fork the repository** on GitHub

2. **Clone your fork**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/archivist.git
   cd archivist
   ```

3. **Add upstream remote**:
   ```bash
   git remote add upstream https://github.com/stellarwp/archivist.git
   ```

4. **Keep your fork updated**:
   ```bash
   # Fetch upstream changes
   git fetch upstream
   
   # Merge upstream main into your main
   git checkout main
   git merge upstream/main
   git push origin main
   ```

## Creating Feature Branches

For new features or experiments:

1. **Create a new branch**:
   ```bash
   git checkout -b feature/my-awesome-feature
   ```

2. **Make your changes** and commit regularly:
   ```bash
   git add .
   git commit -m "feat: Add awesome feature"
   ```

3. **Push to your fork**:
   ```bash
   git push origin feature/my-awesome-feature
   ```

## Installing as a Local Tool

To use Archivist in other projects while developing:

### Method 1: Global Link (Recommended for Development)

1. **In the archivist directory**:
   ```bash
   bun link
   ```

2. **In your project directory**:
   ```bash
   bun link @stellarwp/archivist
   ```

3. **Use in your project**:
   ```bash
   archivist crawl --config ./my-config.json
   ```

### Method 2: Local Installation

1. **Build the package** (if needed):
   ```bash
   bun run build
   ```

2. **In your project, install from local path**:
   ```bash
   bun add file:../path/to/archivist
   ```

### Method 3: Install from Git

Install directly from a specific branch or commit:

```bash
# From NPM registry
bun add @stellarwp/archivist

# From main branch
bun add git+https://github.com/stellarwp/archivist.git

# From specific branch
bun add git+https://github.com/stellarwp/archivist.git#feature/my-branch

# From your fork
bun add git+https://github.com/YOUR_USERNAME/archivist.git#your-branch
```

## Project Structure

```
archivist/
├── src/
│   ├── cli.ts                     # CLI entry point with commands
│   ├── index.ts                   # Main module export
│   ├── di/                        # Dependency injection
│   │   └── container.ts           # tsyringe DI container setup
│   ├── services/                  # Core service layer
│   │   ├── archive-crawler.service.ts  # Crawls individual archives
│   │   ├── web-crawler.service.ts      # Orchestrates crawling process
│   │   ├── config.service.ts          # Configuration management
│   │   ├── state.service.ts           # State and progress tracking
│   │   ├── logger.service.ts          # Logging and output formatting
│   │   ├── http.service.ts            # HTTP client configuration
│   │   ├── link-discoverer.ts         # Cheerio-based link discovery
│   │   └── pure-md.ts                 # Pure.md API client
│   ├── strategies/                # Source crawling strategies
│   │   ├── base-strategy.ts           # Abstract base strategy
│   │   ├── explorer-strategy.ts       # Single page link extraction
│   │   ├── pagination-strategy.ts     # Paginated content handling
│   │   └── strategy-factory.ts        # Strategy creation factory
│   ├── utils/                     # Utility functions
│   │   ├── content-formatter.ts       # Output formatting (MD/JSON/HTML)
│   │   ├── file-naming.ts            # File naming strategies
│   │   ├── link-extractor.ts         # Link extraction helper
│   │   ├── pattern-matcher.ts        # URL pattern matching
│   │   ├── markdown-parser.ts        # Markdown parsing utilities
│   │   ├── pure-api-key.ts           # API key resolution
│   │   └── axios-config.ts           # Axios configuration
│   ├── types/                     # TypeScript type definitions
│   │   └── source-strategy.ts         # Strategy type definitions
│   └── version.ts                 # Version management
├── tests/
│   ├── unit/                      # Unit tests
│   │   ├── services/             # Service tests
│   │   ├── utils/                # Utility tests
│   │   └── strategies/           # Strategy tests
│   └── integration/              # Integration tests
├── examples/                      # Example configurations
│   ├── simple-single-archive.config.json
│   ├── multi-archive.config.json
│   ├── documentation-crawler.config.json
│   ├── pagination.config.json
│   └── link-collection.config.json
├── .github/
│   └── workflows/                # GitHub Actions
├── archivist.config.ts           # Configuration schema
├── package.json                  # Package metadata
├── tsconfig.json                 # TypeScript config
└── bun.lockb                    # Lock file
```

## Development Workflow

### 1. Running in Development Mode

Watch for changes and auto-restart:

```bash
bun run dev
```

### 2. Testing Your Changes

```bash
# Run all tests
bun test

# Run specific test file
bun test tests/unit/utils/file-naming.test.ts

# Run tests in watch mode
bun test:watch

# Run with coverage
bun test:coverage
```

### 3. Type Checking

```bash
bunx tsc --noEmit
```

### 4. Manual Testing

Create a test configuration:

```bash
# Create test config
cat > test.config.json << EOF
{
  "archives": [{
    "name": "Test Archive",
    "sources": [{
      "url": "https://example.com",
      "depth": 0
    }],
    "output": {
      "directory": "./test-output",
      "format": "markdown"
    }
  }],
  "crawl": {
    "maxConcurrency": 1,
    "delay": 1000
  }
}
EOF

# Run crawler with test config
bun run src/cli.ts crawl --config test.config.json
```

## Testing

### Running Tests

```bash
# All tests
bun test

# Unit tests only
bun test tests/unit

# Integration tests only
bun test tests/integration

# Specific test suite
bun test tests/unit/utils
```

### Writing Tests

Example test structure:

```typescript
import { describe, expect, it } from 'bun:test';
import { myFunction } from '../src/myModule';

describe('myFunction', () => {
  it('should do something', () => {
    const result = myFunction('input');
    expect(result).toBe('expected output');
  });
});
```

### Mocking

For external dependencies like Pure.md:

```typescript
import { mock } from 'bun:test';

mock.module('axios', () => ({
  default: {
    create: mock(() => ({
      get: mock().mockResolvedValue({ data: 'mocked data' })
    }))
  }
}));
```

## Debugging

### Using Console Logs

Add debug output:

```typescript
console.log('Debug:', variable);
```

### Using Bun Inspector

```bash
bun --inspect run src/cli.ts crawl
```

Then open `chrome://inspect` in Chrome.

### Environment Variables

Set debug environment variables:

```bash
DEBUG=* bun run archive crawl
```

## Contributing

### Code Style

- Use TypeScript for all code
- Follow existing patterns in the codebase
- Prefer functional programming where appropriate
- Add types for all function parameters and returns

### Commit Messages

Follow conventional commits:

```
feat: Add new feature
fix: Fix bug
docs: Update documentation
test: Add tests
refactor: Refactor code
chore: Update dependencies
```

### Pull Request Process

1. **Create feature branch** from `main`
2. **Make changes** with clear commits
3. **Add tests** for new functionality
4. **Update documentation** if needed
5. **Run tests** locally
6. **Push branch** and create PR
7. **Address review feedback**

### Testing Checklist

Before submitting a PR:

- [ ] All tests pass (`bun test`)
- [ ] TypeScript compiles (`bunx tsc --noEmit`)
- [ ] New features have tests
- [ ] Documentation is updated
- [ ] Commit messages follow convention

## Service Architecture

### Dependency Injection

Archivist uses tsyringe for dependency injection, providing better testability and separation of concerns:

```typescript
import { singleton } from 'tsyringe';

@singleton()
export class MyService {
  constructor(
    private configService: ConfigService,
    private logger: LoggerService
  ) {}
}
```

### Core Services

#### WebCrawlerService
Main orchestrator that coordinates the crawling process across multiple archives.

```typescript
const webCrawler = appContainer.resolve(WebCrawlerService);
await webCrawler.collectAllUrls();
await webCrawler.crawlAll({ clean: true });
```

#### ArchiveCrawlerService
Handles crawling individual archives, including URL discovery and content extraction.

```typescript
const archiveCrawler = appContainer.resolve(ArchiveCrawlerService);
const urls = await archiveCrawler.collectUrlsFromSource(sourceUrl, sourceConfig);
await archiveCrawler.crawlUrls(archive, archiveState);
```

#### ConfigService
Manages configuration with environment variable fallbacks.

```typescript
const configService = appContainer.resolve(ConfigService);
configService.initialize(config, configPath);
const archives = configService.getArchives();
```

#### StateService
Tracks crawling progress and manages state persistence.

```typescript
const stateService = appContainer.resolve(StateService);
stateService.initializeArchive(archiveName);
stateService.addToQueue(archiveName, url);
```

### Strategy Pattern

Source strategies allow flexible URL discovery:

```typescript
// Creating custom strategy
export class CustomStrategy extends BaseStrategy {
  type = 'custom';
  
  async execute(sourceUrl: string, config: any): Promise<StrategyResult> {
    // Custom URL discovery logic
    return { urls: discoveredUrls };
  }
}

// Registering strategy
StrategyFactory.registerStrategy('custom', () => new CustomStrategy());
```

## Advanced Topics

### Custom Output Formats

To add a new output format:

1. Add the format to the schema in `archivist.config.ts`
2. Implement formatter in `src/utils/content-formatter.ts`
3. Update the crawler to use the new format
4. Add tests for the new format

### Custom File Naming

To add a new naming strategy:

1. Add the strategy to the schema
2. Implement in `src/utils/file-naming.ts`
3. Update the crawler to use the new strategy
4. Add tests

### Extending the Crawler

To add new crawling features:

1. Update the configuration schema
2. Modify `src/crawler.ts`
3. Add integration tests
4. Update documentation

## Troubleshooting Development Issues

### Bun Installation Issues

If Bun commands aren't working:

```bash
# Reinstall Bun
curl -fsSL https://bun.sh/install | bash
```

### Type Errors

If you see TypeScript errors:

```bash
# Clean and reinstall
rm -rf node_modules bun.lockb
bun install
```

### Test Failures

If tests fail unexpectedly:

```bash
# Clear test cache
rm -rf .bun

# Run tests with more output
bun test --verbose
```

## Resources

- [Bun Documentation](https://bun.sh/docs)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Pure.md Documentation](https://pure.md/docs)
- [Project Issues](https://github.com/stellarwp/archivist/issues)