#!/usr/bin/env bun
import { Command } from 'commander';
import type { ArchivistConfig } from '../archivist.config';
import { ArchivistConfigSchema, defaultConfig } from '../archivist.config';
import { WebCrawler } from './crawler';
import { existsSync } from 'fs';
import path from 'path';
import { isLegacyConfig, migrateLegacyConfig } from './utils/config-migration';

const program = new Command();

program
  .name('archivist')
  .description('Archive web content for LLM context')
  .version('0.1.0-beta.2');

program
  .command('crawl')
  .description('Crawl and archive web content')
  .option('-c, --config <path>', 'Path to config file', './archivist.config.json')
  .option('-o, --output <dir>', 'Output directory')
  .option('-f, --format <format>', 'Output format (markdown, html, json)')
  .option('--pure-key <key>', 'Pure.md API key')
  .action(async (options) => {
    try {
      let config: ArchivistConfig = defaultConfig;

      // Load config file if exists
      const configPath = path.resolve(options.config);
      if (existsSync(configPath)) {
        console.log(`Loading config from: ${configPath}`);
        const configFile = await Bun.file(configPath).json();
        
        // Check if it's a legacy config and migrate if needed
        if (isLegacyConfig(configFile)) {
          const migratedConfig = migrateLegacyConfig(configFile);
          config = ArchivistConfigSchema.parse(migratedConfig);
          
          // Optionally save the migrated config
          console.log('Note: Your configuration has been automatically migrated to the new format.');
          console.log('Consider updating your config file to use the new structure.');
        } else {
          config = ArchivistConfigSchema.parse(configFile);
        }
      } else {
        console.log('No config file found, using defaults');
      }

      // Override with CLI options
      if (options.pureKey) {
        config.pure.apiKey = options.pureKey;
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

      console.log(`Starting crawl of ${config.archives.length} archive(s)...`);
      
      const crawler = new WebCrawler(config);
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
      },
      pure: {
        apiKey: 'your-api-key-here'
      }
    };

    await Bun.write('./archivist.config.json', JSON.stringify(exampleConfig, null, 2));
    console.log('Created archivist.config.json');
  });

program.parse();