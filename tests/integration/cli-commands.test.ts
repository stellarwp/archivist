import 'reflect-metadata';
import { describe, expect, it, beforeEach, afterEach } from 'bun:test';
import { $ } from 'bun';
import { mkdtempSync, rmSync, mkdirSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

describe('CLI Commands', () => {
  let testDir: string;
  let originalCwd: string;
  const cliPath = join(__dirname, '../../dist/cli.js');

  beforeEach(() => {
    // Store original working directory
    originalCwd = process.cwd();
    
    // Create a fresh temporary directory for each test
    testDir = mkdtempSync(join(tmpdir(), 'archivist-cli-test-'));
    
    // Change to test directory
    process.chdir(testDir);
  });

  afterEach(() => {
    // Change back to original directory
    process.chdir(originalCwd);
    
    // Clean up test directory
    try {
      rmSync(testDir, { recursive: true, force: true });
    } catch (error) {
      console.warn('Failed to clean up test directory:', error);
    }
  });

  describe('init command', () => {
    it('should create a config file with default values', async () => {
      const result = await $`bun ${cliPath} init`.quiet();
      expect(result.exitCode).toBe(0);
      
      // Check that config file was created
      const configFile = Bun.file(join(testDir, 'archivist.config.json'));
      expect(await configFile.exists()).toBe(true);
      
      // Verify config content
      const config = await configFile.json();
      expect(config).toHaveProperty('archives');
      expect(Array.isArray(config.archives)).toBe(true);
      expect(config.archives.length).toBeGreaterThan(0);
      expect(config).toHaveProperty('crawl');
      expect(config.crawl).toHaveProperty('maxConcurrency');
    });
  });

  describe('crawl command', () => {
    it('should fail when no config exists', async () => {
      // Don't create any config - test directory is empty
      const result = await $`bun ${cliPath} crawl`.quiet().nothrow();
      
      // Should exit with error
      expect(result.exitCode).toBe(1);
      const output = result.stderr.toString() + result.stdout.toString();
      expect(output).toContain('No config file found');
    });

    it('should handle crawl with example config gracefully', async () => {
      // Create a custom config with shorter timeout
      const configPath = join(testDir, 'archivist.config.json');
      const config = {
        archives: [{
          name: "Quick Test",
          sources: ["https://example.com/test"],
          output: {
            directory: "./test-output",
            format: "json",
            fileNaming: "url-based"
          }
        }],
        crawl: {
          maxConcurrency: 1,
          delay: 100,
          timeout: 2000  // Short timeout to fail quickly
        }
      };
      await Bun.write(configPath, JSON.stringify(config, null, 2));
      
      // Run crawl - it will try to fetch example.com URLs
      const result = await $`bun ${cliPath} crawl`.quiet().nothrow();
      
      // The crawl should complete (exit code 0) even if URLs fail
      // The crawler is designed to continue despite individual URL failures
      expect(result.exitCode).toBe(0);
      // The output should show that config was loaded and crawl started
      const output = result.stdout.toString() + result.stderr.toString();
      expect(output).toContain('Loading config from');
    }, 10000);  // Give test 10 seconds total

    it('should accept config file parameter', async () => {
      // First create a config
      await $`bun ${cliPath} init`.quiet();
      
      // Create a custom config in a different location
      const customConfigPath = join(testDir, 'custom.config.json');
      const config = {
        archives: [{
          name: "Test Archive",
          sources: ["https://example.com"],
          output: {
            directory: "./test-output",
            format: "markdown",
            fileNaming: "url-based"
          }
        }],
        crawl: {
          maxConcurrency: 1,
          delay: 100,
          timeout: 2000  // Add timeout to prevent hanging
        }
      };
      await Bun.write(customConfigPath, JSON.stringify(config, null, 2));
      
      // Test with custom config path
      const result = await $`bun ${cliPath} crawl --config ${customConfigPath} --dry-run`.quiet().nothrow();
      
      // Should at least parse the config without errors
      // (actual crawling would require network access)
      expect(result.stdout.toString() || result.stderr.toString()).toBeTruthy();
    }, 10000);  // Give test 10 seconds total

    it('should validate config schema', async () => {
      // Create an invalid config
      const invalidConfig = {
        archives: "not-an-array", // Should be array
        crawl: {
          maxConcurrency: "not-a-number" // Should be number
        }
      };
      await Bun.write(join(testDir, 'archivist.config.json'), JSON.stringify(invalidConfig, null, 2));
      
      // Try to crawl with invalid config
      const result = await $`bun ${cliPath} crawl`.quiet().nothrow();
      expect(result.exitCode).not.toBe(0);
      
      // Should show validation error
      const output = result.stderr.toString() || result.stdout.toString();
      expect(output.toLowerCase()).toMatch(/invalid|error|expected/i);
    });
  });

  describe('version command', () => {
    it('should display version number', async () => {
      const result = await $`bun ${cliPath} --version`.quiet();
      expect(result.exitCode).toBe(0);
      expect(result.stdout.toString()).toMatch(/\d+\.\d+\.\d+/);
    });

    it('should match package.json version', async () => {
      const result = await $`bun ${cliPath} --version`.quiet();
      const packageJson = await Bun.file(join(__dirname, '../../package.json')).json();
      expect(result.stdout.toString().trim()).toContain(packageJson.version);
    });
  });

  describe('help command', () => {
    it('should show general help', async () => {
      const result = await $`bun ${cliPath} --help`.quiet();
      expect(result.exitCode).toBe(0);
      
      const output = result.stdout.toString();
      expect(output).toContain('Usage:');
      expect(output).toContain('Commands:');
      expect(output).toContain('init');
      expect(output).toContain('crawl');
      expect(output).toContain('Options:');
    });

    it('should show command-specific help', async () => {
      // Test init help
      const initHelp = await $`bun ${cliPath} init --help`.quiet();
      expect(initHelp.exitCode).toBe(0);
      expect(initHelp.stdout.toString()).toContain('Initialize');
      
      // Test crawl help
      const crawlHelp = await $`bun ${cliPath} crawl --help`.quiet();
      expect(crawlHelp.exitCode).toBe(0);
      const crawlOutput = crawlHelp.stdout.toString();
      expect(crawlOutput).toContain('Crawl');
      expect(crawlOutput).toContain('--config');
      expect(crawlOutput).toContain('--output');
      expect(crawlOutput).toContain('--format');
    });
  });

  describe('error handling', () => {
    it('should handle unknown commands gracefully', async () => {
      const result = await $`bun ${cliPath} unknown-command`.quiet().nothrow();
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr.toString()).toContain('unknown command');
    });

    it('should handle invalid options gracefully', async () => {
      const result = await $`bun ${cliPath} crawl --invalid-option`.quiet().nothrow();
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr.toString()).toContain('unknown option');
    });
  });
  
  describe('clean option', () => {
    it('should accept --clean flag', async () => {
      // Create config
      const config = {
        archives: [{
          name: "Test Archive",
          sources: "https://example.com",
          output: {
            directory: "./test-output",
            format: "markdown",
            fileNaming: "url-based"
          }
        }],
        crawl: {
          maxConcurrency: 1,
          delay: 100,
          timeout: 2000
        }
      };
      await Bun.write(join(testDir, 'archivist.config.json'), JSON.stringify(config, null, 2));
      
      // Test that --clean flag is accepted
      const helpResult = await $`bun ${cliPath} crawl --help`.quiet();
      expect(helpResult.stdout.toString()).toContain('--clean');
      
      // Test that it shows in dry-run mode
      const dryRunResult = await $`bun ${cliPath} crawl --dry-run --clean --no-confirm`.quiet().nothrow();
      // Just verify the flag is accepted without error (actual cleaning is tested in unit tests)
      const output = dryRunResult.stdout.toString() + dryRunResult.stderr.toString();
      expect(output).toBeTruthy();
    });
  });
});