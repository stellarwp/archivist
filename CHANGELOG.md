# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
  
- **Backward Compatibility**
  - Automatic migration from legacy configuration format
  - Helpful migration messages for users with old configs
  - Seamless upgrade path without breaking existing setups

### Changed

- Configuration schema restructured from single `sources`/`output` to `archives` array
- Crawler refactored to support multiple archive processing
- Source object `selector` option replaced with `linkSelector` and `followPattern`
- CLI updated to handle new configuration structure
- Updated all documentation examples to show new format
- Added comprehensive test coverage for new features

## [0.1.0] - 2025-01-04

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