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
   bun link archivist
   ```

3. **Use in your project**:
   ```bash
   bunx archivist crawl --config ./my-config.json
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
│   │   ├── services/       # Service tests
│   │   └── utils/          # Utility tests
│   └── integration/        # Integration tests
├── .github/
│   └── workflows/          # GitHub Actions
├── archivist.config.ts     # Configuration schema
├── package.json            # Package metadata
├── tsconfig.json           # TypeScript config
└── bun.lockb              # Lock file
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
  "sources": [{
    "url": "https://example.com",
    "depth": 0
  }],
  "output": {
    "directory": "./test-output",
    "format": "markdown"
  }
}
EOF

# Run crawler with test config
bun run archive crawl --config test.config.json
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