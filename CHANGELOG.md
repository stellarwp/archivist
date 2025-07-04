# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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