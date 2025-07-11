#!/usr/bin/env bun
import 'reflect-metadata';
import { Command } from 'commander';
import { confirm, input, select } from '@inquirer/prompts';
import type { ArchivistConfig } from './config/schema';
import { ArchivistConfigSchema, defaultConfig } from './config/schema';
import { existsSync } from 'fs';
import path from 'path';
import { VERSION, DEFAULT_USER_AGENT } from './version';

// Import DI container and services at the top level to ensure decorators are processed
import { initializeContainer, appContainer } from './di/container';
import { ConfigService } from './services/config.service';
import { StateService } from './services/state.service';
import { WebCrawlerService } from './services/web-crawler.service';
import { LoggerService } from './services/logger.service';

const program = new Command();

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
  .option('--clean', 'Clean output directories before crawling')
  .action(async (options) => {
    try {
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
      
      // Save collected links to each archive's output directory
      for (const archive of config.archives) {
        const collectedLinksPath = path.join(archive.output.directory, 'collected-links.json');
        stateService.saveArchiveCollectedLinks(archive.name, collectedLinksPath);
      }
      logger.info(`\nCollected links saved to each archive's output directory`);
      
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
      if (options.confirm !== false && process.stdin.isTTY) {
        logger.info('─'.repeat(50));
        
        // If --clean is specified, show additional warning
        if (options.clean) {
          logger.info('⚠️  WARNING: --clean flag will delete all existing content in output directories!');
        }
        
        const shouldProceed = await confirm({
          message: 'Do you want to proceed with the crawl?',
          default: true
        });
        
        if (!shouldProceed) {
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
      await webCrawler.crawlAll({ clean: options.clean || false });
      
    } catch (error) {
      console.error('Error:', error);
      process.exit(1);
    }
  });

program
  .command('init')
  .description('Initialize a new archivist config file')
  .option('--interactive', 'Use interactive mode to configure the file')
  .action(async (options) => {
    // Initialize DI container
    initializeContainer();
    
    // Check if config already exists
    if (existsSync('./archivist.config.json')) {
      // Only prompt if we're in an interactive terminal
      if (process.stdin.isTTY) {
        const overwrite = await confirm({
          message: 'archivist.config.json already exists. Do you want to overwrite it?',
          default: false
        });
        
        if (!overwrite) {
          console.log('Init cancelled.');
          return;
        }
      } else {
        // In non-interactive mode, overwrite by default
        console.log('archivist.config.json already exists. Overwriting...');
      }
    }
    
    let config: any;
    
    if (options.interactive) {
      // Interactive mode
      console.log('\n🚀 Let\'s create your archivist configuration!\n');
      
      const archiveName = await input({
        message: 'What would you like to name your archive?',
        default: 'My Documentation Archive'
      });
      
      const sourceUrl = await input({
        message: 'Enter the URL to archive:',
        default: 'https://example.com/docs',
        validate: (value) => {
          try {
            new URL(value);
            return true;
          } catch {
            return 'Please enter a valid URL';
          }
        }
      });
      
      const outputFormat = await select({
        message: 'Select output format:',
        choices: [
          { name: 'Markdown', value: 'markdown' },
          { name: 'JSON', value: 'json' },
          { name: 'HTML', value: 'html' }
        ],
        default: 'markdown'
      });
      
      const fileNaming = await select({
        message: 'Select file naming strategy:',
        choices: [
          { name: 'URL-based (preserves URL structure)', value: 'url-based' },
          { name: 'Title-based (uses page titles)', value: 'title-based' }
        ],
        default: 'url-based'
      });
      
      const usePureMd = await confirm({
        message: 'Do you want to use Pure.md for better content extraction? (requires API key)',
        default: false
      });
      
      let pureApiKey = '';
      if (usePureMd) {
        pureApiKey = await input({
          message: 'Enter your Pure.md API key (or press Enter to set it later):',
          default: ''
        });
      }
      
      config = {
        archives: [{
          name: archiveName,
          sources: sourceUrl,
          output: {
            directory: `./archive/${archiveName.toLowerCase().replace(/\s+/g, '-')}`,
            format: outputFormat,
            fileNaming: fileNaming
          }
        }],
        crawl: {
          maxConcurrency: 3,
          delay: 1000,
          userAgent: DEFAULT_USER_AGENT,
          timeout: 30000
        }
      };
      
      if (pureApiKey) {
        config.pure = { apiKey: pureApiKey };
      }
      
    } else {
      // Default example config
      config = {
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
    }

    await Bun.write('./archivist.config.json', JSON.stringify(config, null, 2));
    console.log('\n✅ Created archivist.config.json');
    
    if (!options.interactive || !config.pure) {
      console.log('\n💡 To use Pure.md for content extraction, add a "pure" section:');
      console.log('  "pure": {');
      console.log('    "apiKey": "your-api-key-here"');
      console.log('  }');
      console.log('\nOr set the PURE_API_KEY environment variable.');
    }
    
    console.log('\n📝 Next steps:');
    console.log('1. Edit archivist.config.json to add more URLs or adjust settings');
    console.log('2. Run: archivist crawl');
  });

program
  .command('report')
  .description('Show report of last collected URLs')
  .option('-f, --file <path>', 'Path to collected links JSON file', 'collected-links.json')
  .action(async (_options) => {
    try {
      initializeContainer();
      const webCrawler = appContainer.resolve(WebCrawlerService);
      const logger = appContainer.resolve(LoggerService);
      
      logger.info(webCrawler.getCollectedLinksReport());
    } catch (error) {
      console.error('Error reading collected links:', error);
    }
  });

program.parse(process.argv);