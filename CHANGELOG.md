# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Initial project setup with Bun and TypeScript
- Pure.md API integration for clean content extraction
- Web crawler with configurable depth and concurrency
- Multiple output formats: Markdown, HTML, and JSON
- Smart file naming strategies: URL-based, title-based, and hash-based
- CLI interface with `init` and `crawl` commands
- Configuration file support with validation via Zod
- Comprehensive test suite with unit and integration tests
- GitHub Actions workflow for automated archiving
- GitHub Actions workflow for continuous integration testing
- Detailed documentation in README.md
- MIT License

### Technical Details

- Replaced direct HTML parsing with Pure.md API
- Implemented axios for better HTTP request handling
- Added proper TypeScript types and interfaces
- Created modular architecture with separate services and utilities
- Implemented concurrent crawling with rate limiting
- Added link extraction from markdown content
- Included metadata tracking for crawled pages

## [0.1.0] - TBD

- Initial release (pending)