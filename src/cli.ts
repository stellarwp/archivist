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
  .version('0.1.0');

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
        config = ArchivistConfigSchema.parse(configFile);
      } else {
        console.log('No config file found, using defaults');
      }

      // Override with CLI options
      if (options.output) {
        config.output.directory = options.output;
      }
      if (options.format) {
        config.output.format = options.format as any;
      }
      if (options.pureKey) {
        config.pure.apiKey = options.pureKey;
      }

      // Check if we have sources
      if (config.sources.length === 0) {
        console.error('No sources configured. Please create an archivist.config.json file.');
        process.exit(1);
      }

      console.log(`Starting crawl of ${config.sources.length} source(s)...`);
      
      const crawler = new WebCrawler(config);
      const results = await crawler.crawl();
      
      console.log(`\nCrawled ${results.length} page(s)`);
      
      await crawler.save();
      
      console.log(`\nArchive saved to: ${config.output.directory}`);
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
      sources: [
        {
          url: 'https://example.com',
          name: 'Example Site',
          depth: 1,
          selector: '.main-content'
        }
      ],
      output: {
        directory: './archive',
        format: 'markdown',
        fileNaming: 'url-based'
      },
      crawl: {
        maxConcurrency: 3,
        delay: 1000,
        userAgent: 'Archivist/1.0',
        timeout: 30000
      }
    };

    await Bun.write('./archivist.config.json', JSON.stringify(exampleConfig, null, 2));
    console.log('Created archivist.config.json');
  });

program.parse();