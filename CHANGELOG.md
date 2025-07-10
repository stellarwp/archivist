# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0-beta.6] - 2025-01-09

### Added

- **Clean Output Directory Option**
  - Added `--clean` flag to crawl command to remove existing output before crawling
  - Automatically cleans each archive's output directory when flag is used
  - Shows warning message during confirmation prompt when --clean is specified
  - Helps ensure fresh crawls without manual directory cleanup

- **Interactive Prompts with @inquirer/prompts**
  - Replaced custom input handling with professional prompts from Inquirer.js
  - Added `--interactive` flag to `init` command for guided configuration setup
  - Interactive mode includes archive name, URL validation, format selection, and API key setup
  - Enhanced crawl confirmation prompt with better UX
  - Automatic TTY detection for CI/CD compatibility

- **Pre-Crawl URL Collection and Confirmation**
  - Always collect and display all URLs before starting the crawl
  - Interactive confirmation prompt to review URLs before proceeding
  - `--dry-run` flag to collect URLs without crawling
  - `--no-confirm` flag to skip the confirmation prompt
  - Helps users verify patterns and avoid accidental over-crawling

### Changed

- **Dependency Injection Implementation**
  - Migrated to tsyringe for proper dependency injection
  - Added reflect-metadata for decorator support
  - Improved service architecture with singleton pattern
  - Better separation of concerns and testability

### Fixed

- **CI/CD Compatibility**
  - Fixed reflect-metadata loading issues in CI environments
  - Added proper polyfill imports for spawned CLI processes
  - Non-interactive environments now skip prompts automatically
  - All tests pass in both local and CI environments

- **Pagination Strategy**
  - Now extracts content links from each paginated page
  - Returns article/post links instead of pagination pages themselves
  - Filters out pagination navigation links from results
  - Ensures only content pages are sent to Pure.md
  - Fix hanging issue when using pagination strategy
  - Improve crawl script execution for paginated content

## [0.1.0-beta.5] - 2025-01-09

### Added

- **Source Strategies for Flexible Crawling**
  - Introduced pluggable source strategies architecture
  - Added pagination strategy for handling paginated content
  - Support for dynamic pagination patterns with URL templates
  - Comprehensive examples and fixtures for pagination scenarios

### Fixed

- **TypeScript Type Errors**
  - Resolved type compatibility issues across the codebase
  - Fixed axios mock types in pagination strategy tests
  - Improved type safety in link discovery components

- **Test Suite Improvements**
  - Enhanced LinkDiscoverer tests for better environment compatibility
  - Added fallback implementations for cross-platform support
  - Improved test isolation using spyOn instead of mock.module
  - Fixed package installation tests for CI environments

- **Error Handling**
  - Added proper 404 handling to pagination strategy
  - Improved robustness in LinkDiscoverer constructor options

### Changed

- **Test Infrastructure**
  - Added TypeScript type checking to test suite
  - Added comprehensive CLI and package installation tests
  - Improved test coverage for source strategies

## [0.1.0-beta.4] - 2025-01-06

### Changed

- **Object Sources Behavior**
  - Object sources are now exclusively used for link collection
  - The source URL itself is no longer crawled when using object notation
  - Default `linkSelector` is now `'a[href]'` when not specified
  - This prevents duplicate crawling and clarifies the purpose of object sources

- **Configuration Improvements**
  - Made `pure` configuration section optional
  - No longer requires empty `apiKey` string
  - Cleaner configuration files without unnecessary sections

### Improved

- **Developer Experience**
  - Added helpful message in init command about Pure.md API key
  - Better separation between required and optional configuration
  - More intuitive configuration structure

## [0.1.0-beta.3] - 2025-01-05

### Added

- **Cheerio-based Link Discovery**
  - Link discoverer for finding all links on a page when Pure.md is unavailable
  - Used for pagination and discovering crawlable URLs
  - Extracts and normalizes all links from HTML pages
  - Pure.md remains the only tool for content extraction
  - When Pure.md fails, pages are marked with placeholder content
  
- **Enhanced Link Filtering**
  - Replaced single `followPattern` with `includePatterns` and `excludePatterns` arrays
  - Support for multiple include patterns (link must match at least one)
  - Support for multiple exclude patterns (link must not match any)
  - Patterns can be combined for sophisticated filtering logic
  - Applied during both link collection and crawling phases

### Changed

- **Source Configuration**
  - `followPattern` property replaced with `includePatterns` array
  - Added `excludePatterns` array for negative filtering
  - Both pattern arrays accept regular expressions as strings
  - Pattern filtering now supports more complex URL matching scenarios

- **Crawler Behavior**
  - Pure.md is the exclusive content extractor
  - Cheerio is used only for link discovery when Pure.md fails
  - Without Pure.md API key, only links are discovered (no content extraction)
  - Pages without successful Pure.md extraction show placeholder content
  - Improved separation of concerns: content extraction vs link discovery

### Fixed

- Fixed `filterLinks` method implementation in ArchiveCrawler
- Updated tests to use new pattern array syntax
- Improved error messages for invalid regex patterns

### Removed

- Removed legacy configuration format support (still in beta)
- Removed automatic config migration utilities
- Removed backward compatibility code

## [0.1.0-beta.2] - 2025-01-05

### Fixed

- **Pure.md API Integration**
  - Removed URL encoding from API calls that was causing 400 Bad Request errors
  - Pure.md API expects raw URLs in the path, not URL-encoded ones
  - Updated tests to match corrected behavior

### Added

- **Multi-Archive Configuration**
  - New configuration structure supporting multiple independent archives
  - Each archive can have its own sources and output settings
  - Flexible source definitions: single URL string, detailed object, or array
  - Archives are processed sequentially with isolated crawl state
  
- **Link Collection from Index Pages**
  - Use any page as a link collector with `linkSelector` and `followPattern`
  - Extract links from index/archive pages before crawling
  - Filter links with regex patterns for precise control
  - Set `depth: 0` to only collect links without archiving the index page
  

### Changed

- Configuration schema restructured from single `sources`/`output` to `archives` array
- Crawler refactored to support multiple archive processing
- Source object `selector` option (if used) renamed to `linkSelector` for clarity
- Added `followPattern` option for regex-based link filtering
- CLI updated to handle new configuration structure
- Updated all documentation examples to show new format
- Added comprehensive test coverage for new features

## [0.1.0-beta.1] - 2025-01-04

### Added

- **Core Features**
  - Web content archiver built with Bun and TypeScript
  - Pure.md API integration for clean content extraction
  - Concurrent web crawling with configurable depth
  - Rate limiting and request delay configuration
  
- **Output Options**
  - Multiple output formats: Markdown, HTML, and JSON
  - Smart file naming strategies: URL-based, title-based, and hash-based
  - Metadata tracking for all crawled pages
  
- **CLI Tool**
  - Command-line interface with `init` and `crawl` commands
  - Configuration file support with Zod validation
  - Environment variable support for API keys
  
- **Testing & CI/CD**
  - Comprehensive test suite (44 tests) with unit and integration tests
  - GitHub Actions workflow for automated archiving
  - GitHub Actions workflow for continuous integration testing
  - Test coverage for all modules
  
- **Documentation**
  - Detailed README with usage examples and configuration guide
  - Comprehensive DEVELOPMENT.md for contributors
  - MIT License
  - Example configuration files

- **Developer Experience**
  - TypeScript with strict type checking
  - Modular architecture with clear separation of concerns
  - axios for robust HTTP request handling
  - Development mode with file watching