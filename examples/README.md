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

**Use case:** Comprehensive documentation archiving with different strategies per section.

### 4. Link Collection (`link-collection.config.json`)
Demonstrates using source pages as link collectors:
- Using `followPattern` to filter which links to crawl
- Setting `depth: 0` to skip crawling the index page itself
- Collecting links from multiple index pages

**Use case:** When you have index or archive pages that list all the content you want to crawl.


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