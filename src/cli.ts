#!/usr/bin/env bun
import 'reflect-metadata';
import { Command } from 'commander';
import type { ArchivistConfig } from '../archivist.config';
import { ArchivistConfigSchema, defaultConfig } from '../archivist.config';
import { existsSync } from 'fs';
import path from 'path';
import { VERSION, DEFAULT_USER_AGENT } from './version';

const program = new Command();

// Helper function for user input
async function askQuestion(question: string): Promise<string> {
  process.stdout.write(question);
  
  // Use Bun's stdin
  const decoder = new TextDecoder();
  const reader = Bun.stdin.stream().getReader();
  
  try {
    const { value } = await reader.read();
    reader.releaseLock();
    if (value) {
      return decoder.decode(value).trim();
    }
  } catch (error) {
    console.error('[DEBUG] Error reading input:', error);
  }
  
  return '';
}

program
  .name('archivist')
  .description('Archive web content for LLM context')
  .version(VERSION);

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
  .option('--show-all-urls', 'Show all URLs instead of just the first 20')
  .option('--save-links <path>', 'Save collected links to specified JSON file', 'collected-links.json')
  .action(async (options) => {
    try {
      // Lazy load DI dependencies
      const { initializeContainer, appContainer } = await import('./di/container');
      const { ConfigService } = await import('./services/config.service');
      const { StateService } = await import('./services/state.service');
      const { WebCrawlerService } = await import('./services/web-crawler.service');
      const { LoggerService } = await import('./services/logger.service');
      
      // Initialize DI container
      initializeContainer();
      
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

      // Initialize services with config
      const configService = appContainer.resolve(ConfigService);
      configService.initialize(config, configPath);
      
      const stateService = appContainer.resolve(StateService);
      const webCrawler = appContainer.resolve(WebCrawlerService);
      const logger = appContainer.resolve(LoggerService);

      // Collect URLs first
      logger.info(`Collecting URLs from ${config.archives.length} archive(s)...`);
      if (options.dryRun) {
        logger.info('(Dry run mode - no content will be fetched)');
      }
      
      await webCrawler.collectAllUrls();
      
      // Save collected links to file
      if (options.saveLinks) {
        stateService.saveCollectedLinksFile(options.saveLinks);
        logger.info(`\nCollected links saved to: ${options.saveLinks}`);
      }
      
      const totalUrls = stateService.getTotalUrlCount();
      const paginationStats = stateService.getPaginationStats();
      
      if (totalUrls === 0) {
        logger.info('No URLs found to crawl.');
        return;
      }
      
      // Display collected URLs
      logger.info(`\nFound ${totalUrls} URLs to crawl:`);
      if (paginationStats.totalPages > 0) {
        logger.info(`(Discovered across ${paginationStats.totalPages} pagination pages)`);
      }
      
      logger.info('='.repeat(50));
      
      const collectedUrls = stateService.getAllCollectedUrls();
      let urlIndex = 1;
      let displayed = 0;
      const maxToShow = options.showAllUrls ? Infinity : 20;
      
      // Show URLs grouped by source
      for (const item of collectedUrls) {
        if (displayed >= maxToShow) break;
        
        logger.info(`\nFrom ${item.sourceUrl} (${item.strategy}):`);
        if (item.paginationPages) {
          logger.info(`  Pages: ${item.paginationPages}`);
        }
        
        for (const url of item.urls) {
          if (displayed >= maxToShow) break;
          console.log(`${urlIndex.toString().padStart(4)}. ${url}`);
          urlIndex++;
          displayed++;
        }
      }
      
      if (!options.showAllUrls && totalUrls > 20) {
        logger.info(`\n  ... and ${totalUrls - 20} more URLs`);
        logger.info(`  (Use --show-all-urls to see all URLs)`);
      }
      
      logger.info('='.repeat(50));
      logger.info(`\nTotal URLs to be processed: ${totalUrls}`);
      
      // Show summary report
      logger.info(webCrawler.getCollectedLinksReport());
      
      // Ask for confirmation unless --no-confirm is used
      if (options.confirm !== false) {
        logger.info('─'.repeat(50));
        const response = await askQuestion('\nDo you want to proceed with the crawl? (yes/no): ');
        
        if (!response || !['yes', 'y'].includes(response.toLowerCase())) {
          logger.info('Crawl cancelled.');
          return;
        }
      }
      
      // If dry-run, stop here
      if (options.dryRun) {
        logger.info('\nDry run complete. No content was fetched.');
        return;
      }
      
      // Start crawling
      logger.info(`\nStarting crawl of ${config.archives.length} archive(s)...`);
      await webCrawler.crawlAll();
      
    } catch (error) {
      console.error('Error:', error);
      process.exit(1);
    }
  });

program
  .command('init')
  .description('Initialize a new archivist config file')
  .action(async () => {
    // Lazy load DI dependencies
    const { initializeContainer } = await import('./di/container');
    
    // Initialize DI container
    initializeContainer();
    
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
        userAgent: DEFAULT_USER_AGENT,
        timeout: 30000
      }
    };

    await Bun.write('./archivist.config.json', JSON.stringify(exampleConfig, null, 2));
    console.log('Created archivist.config.json');
    console.log('\nTo use Pure.md for content extraction, add a "pure" section:');
    console.log('  "pure": {');
    console.log('    "apiKey": "your-api-key-here"');
    console.log('  }');
    console.log('\nOr set the PURE_API_KEY environment variable.');
    console.log('\nNext steps:');
    console.log('1. Edit archivist.config.json to add your URLs');
    console.log('2. Run: archivist crawl');
  });

program
  .command('report')
  .description('Show report of last collected URLs')
  .option('-f, --file <path>', 'Path to collected links JSON file', 'collected-links.json')
  .action(async (options) => {
    try {
      // Lazy load DI dependencies
      const { initializeContainer, appContainer } = await import('./di/container');
      const { WebCrawlerService } = await import('./services/web-crawler.service');
      const { LoggerService } = await import('./services/logger.service');
      
      initializeContainer();
      const webCrawler = appContainer.resolve(WebCrawlerService);
      const logger = appContainer.resolve(LoggerService);
      
      logger.info(webCrawler.getCollectedLinksReport());
    } catch (error) {
      console.error('Error reading collected links:', error);
    }
  });

program.parse(process.argv);