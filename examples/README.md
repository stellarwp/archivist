# Archivist Configuration Examples

This directory contains example configuration files for different use cases.

## Examples

### 1. Simple Single Archive (`simple-single-archive.config.json`)
The most basic configuration with a single archive and a single source URL.

**Use case:** Archiving a simple website or blog.

### 2. Multi-Archive Setup (`multi-archive.config.json`)
Shows how to configure multiple archives with different settings for each.

**Use case:** Archiving different sections of documentation with different output formats.

### 3. Documentation Crawler (`documentation-crawler.config.json`)
A more complex example showing:
- Multiple archives for different documentation types
- Depth-based crawling for API docs
- Multiple source URLs for user guides
- Custom selectors for content extraction

**Use case:** Comprehensive documentation archiving with different strategies per section.


## Usage

To use any of these examples:

1. Copy the example file to your project root:
   ```bash
   cp examples/documentation-crawler.config.json ./archivist.config.json
   ```

2. Edit the configuration to match your needs:
   - Update the source URLs
   - Adjust output directories
   - Set your Pure.md API key if needed

3. Run the crawler:
   ```bash
   archivist crawl
   ```

## Configuration Tips

- Start with a low `maxConcurrency` and increase `delay` when crawling external sites to be respectful
- Use `depth: 0` for single-page archives
- Choose appropriate `fileNaming` strategies based on your content type
- Set a higher `timeout` for slow or heavy websites