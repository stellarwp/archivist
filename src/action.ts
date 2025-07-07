#!/usr/bin/env node

/**
 * GitHub Action entry point for Archivist
 * This file is bundled with all dependencies for use in GitHub Actions
 */

import { ArchivistConfigSchema } from '../archivist.config.js';
import { WebCrawler } from './crawler.js';
import * as fs from 'node:fs';
import * as path from 'node:path';

// GitHub Actions logging functions
function info(message: string): void {
  console.log(message);
}

function error(message: string): void {
  console.error(`::error::${message}`);
}

function warning(message: string): void {
  console.log(`::warning::${message}`);
}

function group(title: string): void {
  console.log(`::group::${title}`);
}

function endGroup(): void {
  console.log('::endgroup::');
}

function setOutput(name: string, value: string): void {
  console.log(`::set-output name=${name}::${value}`);
}

function setFailed(message: string): void {
  error(message);
  process.exit(1);
}

// Get inputs from environment variables (set by GitHub Actions)
function getInput(name: string): string {
  const envName = `INPUT_${name.replace(/-/g, '_').toUpperCase()}`;
  return process.env[envName] || '';
}

async function run(): Promise<void> {
  try {
    // Get inputs
    const configFile = getInput('config-file') || 'archivist.config.ts';
    const pureApiKey = getInput('pure-api-key');
    
    info(`🗄️ Archivist GitHub Action`);
    info(`📁 Config file: ${configFile}`);
    
    // Set Pure API key if provided
    if (pureApiKey) {
      process.env.PURE_API_KEY = pureApiKey;
      info('🔑 Pure.md API key provided');
    } else {
      warning('No Pure.md API key provided - content extraction will be limited');
    }
    
    // Check if config file exists
    const configPath = path.resolve(process.cwd(), configFile);
    if (!fs.existsSync(configPath)) {
      setFailed(`Configuration file not found: ${configPath}`);
      return;
    }
    
    // Load and validate configuration
    group('Loading configuration');
    let config;
    try {
      // For GitHub Actions, we expect JSON config files
      // Users can convert their TS config to JSON for CI
      if (!configPath.endsWith('.json')) {
        warning(`Config file should be JSON for GitHub Actions. Got: ${configFile}`);
        info('Convert your archivist.config.ts to archivist.config.json for use in CI');
      }
      
      const configContent = fs.readFileSync(configPath, 'utf-8');
      const rawConfig = JSON.parse(configContent);
      
      // Validate configuration
      config = ArchivistConfigSchema.parse(rawConfig);
      info(`✅ Configuration loaded: ${config.archives.length} archive(s) defined`);
      
      for (const archive of config.archives) {
        info(`  - ${archive.name}: ${Array.isArray(archive.sources) ? archive.sources.length : 1} source(s)`);
      }
    } catch (err) {
      endGroup();
      if (err instanceof SyntaxError) {
        setFailed(`Invalid JSON in config file: ${err.message}`);
      } else {
        setFailed(`Failed to load configuration: ${err instanceof Error ? err.message : String(err)}`);
      }
      return;
    }
    endGroup();
    
    // Initialize and run crawler
    group('Starting web crawl');
    const crawler = new WebCrawler(config);
    
    let totalFiles = 0;
    let totalErrors = 0;
    
    try {
      // Override console.log to capture crawler output
      const originalLog = console.log;
      const originalError = console.error;
      
      console.log = (message: string, ...args: any[]) => {
        if (typeof message === 'string') {
          if (message.includes('Processing archive:')) {
            endGroup();
            group(message);
          } else if (message.includes('Saved:')) {
            totalFiles++;
            info(message);
          } else if (message.includes('Error')) {
            totalErrors++;
            warning(message);
          } else {
            info(message);
          }
        } else {
          originalLog(message, ...args);
        }
      };
      
      console.error = (message: string, ...args: any[]) => {
        totalErrors++;
        error(typeof message === 'string' ? message : String(message));
      };
      
      // Run the crawler
      await crawler.crawlAll();
      
      // Restore console methods
      console.log = originalLog;
      console.error = originalError;
      
    } catch (err) {
      endGroup();
      setFailed(`Crawl failed: ${err instanceof Error ? err.message : String(err)}`);
      return;
    }
    endGroup();
    
    // Set outputs
    setOutput('total-files', String(totalFiles));
    setOutput('total-errors', String(totalErrors));
    
    // Summary
    info('');
    info('📊 Summary:');
    info(`  ✅ Files archived: ${totalFiles}`);
    if (totalErrors > 0) {
      warning(`  ⚠️  Errors encountered: ${totalErrors}`);
    }
    
    // Set exit code based on errors
    if (totalErrors > 0 && totalFiles === 0) {
      setFailed('No files were successfully archived');
    } else if (totalErrors > 0) {
      warning('Completed with some errors');
      process.exit(0); // Still success, but with warnings
    } else {
      info('✅ All archives completed successfully!');
    }
    
  } catch (err) {
    setFailed(`Unexpected error: ${err instanceof Error ? err.message : String(err)}`);
  }
}

// Run the action
run().catch(err => {
  setFailed(`Fatal error: ${err instanceof Error ? err.message : String(err)}`);
});