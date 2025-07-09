#!/usr/bin/env bun
import { Command } from 'commander';
import type { ArchivistConfig } from '../archivist.config';
import { ArchivistConfigSchema, defaultConfig } from '../archivist.config';
import { WebCrawler } from './crawler';
import { existsSync } from 'fs';
import path from 'path';

const program = new Command();

program
  .name('archivist')
  .description('Archive web content for LLM context')
  .version('0.1.0-beta.6');

program
  .command('crawl')
  .description('Crawl and archive web content')
  .option('-c, --config <path>', 'Path to config file', './archivist.config.json')
  .option('-o, --output <dir>', 'Output directory')
  .option('-f, --format <format>', 'Output format (markdown, html, json)')
  .option('--pure-key <key>', 'Pure.md API key')
  .option('-d, --debug', 'Enable debug logging')
  .option('--dry-run', 'Collect and display all URLs without crawling')
  .option('--no-confirm', 'Skip confirmation prompt and proceed directly')
  .action(async (options) => {
    try {
      let config: ArchivistConfig = defaultConfig;

      // Load config file if exists
      const configPath = path.resolve(options.config);
      if (existsSync(configPath)) {
        console.log(`Loading config from: ${configPath}`);
        const configFile = await Bun.file(configPath).json();
        
        config = ArchivistConfigSchema.parse(configFile);
      } else {
        console.log('No config file found, using defaults');
      }

      // Override with CLI options
      if (options.pureKey) {
        if (!config.pure) {
          config.pure = {};
        }
        config.pure.apiKey = options.pureKey;
      }

      // Set debug mode if specified
      if (options.debug) {
        config.crawl = {
          ...config.crawl,
          debug: true
        };
      }

      // Apply CLI overrides to all archives if specified
      if (options.output || options.format) {
        config.archives = config.archives.map(archive => ({
          ...archive,
          output: {
            ...archive.output,
            ...(options.output && { directory: options.output }),
            ...(options.format && { format: options.format as any }),
          }
        }));
      }

      // Check if we have archives
      if (config.archives.length === 0) {
        console.error('No archives configured. Please create an archivist.config.json file.');
        process.exit(1);
      }

      // Always collect URLs first and show them
      console.log(`Collecting URLs from ${config.archives.length} archive(s)...`);
      if (options.dryRun) {
        console.log('(Dry run mode - no content will be fetched)');
      }
      console.log('');
      
      const crawler = new WebCrawler(config);
      const allUrls = await crawler.collectAllUrls();
      
      if (allUrls.length === 0) {
        console.log('No URLs found to crawl.');
        return;
      }
      
      console.log(`\nFound ${allUrls.length} URLs to crawl:`);
      console.log('='.repeat(50));
      allUrls.forEach((url, index) => {
        console.log(`${(index + 1).toString().padStart(4, ' ')}. ${url}`);
      });
      console.log('='.repeat(50));
      
      // Ask for confirmation unless --no-confirm is used
      if (options.confirm !== false) {
        console.log(`\nTotal URLs to be processed: ${allUrls.length}`);
        const response = prompt('\nDo you want to proceed with the crawl? (yes/no): ');
        
        if (!response || !['yes', 'y'].includes(response.toLowerCase())) {
          console.log('Crawl cancelled.');
          return;
        }
      }
      
      // If dry-run, stop here
      if (options.dryRun) {
        console.log('\nDry run complete. No content was fetched.');
        return;
      }
      
      console.log(`\nStarting crawl of ${config.archives.length} archive(s)...`);
      await crawler.crawlAll();
      
      console.log(`\nAll archives processed successfully!`);
    } catch (error) {
      console.error('Error:', error);
      process.exit(1);
    }
  });

program
  .command('init')
  .description('Initialize a new archivist config file')
  .action(async () => {
    const exampleConfig = {
      archives: [
        {
          name: 'Example Documentation',
          sources: [
            {
              url: 'https://example.com/docs',
              name: 'Main Docs',
              depth: 2
            }
          ],
          output: {
            directory: './archive/example-docs',
            format: 'markdown',
            fileNaming: 'url-based'
          }
        },
        {
          name: 'Blog Posts',
          sources: 'https://example.com/blog',
          output: {
            directory: './archive/blog',
            format: 'json',
            fileNaming: 'title-based'
          }
        }
      ],
      crawl: {
        maxConcurrency: 3,
        delay: 1000,
        userAgent: 'Archivist/1.0',
        timeout: 30000
      }
    };

    await Bun.write('./archivist.config.json', JSON.stringify(exampleConfig, null, 2));
    console.log('Created archivist.config.json');
    console.log('\nTo use Pure.md for content extraction, add a "pure" section:');
    console.log('  "pure": {');
    console.log('    "apiKey": "your-api-key-here"');
    console.log('  }');
  });

program.parse();