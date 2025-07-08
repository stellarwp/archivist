import { describe, expect, it, beforeAll, afterAll } from 'bun:test';
import { $ } from 'bun';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

describe('Package Installation', () => {
  let testDir: string;
  let originalCwd: string;
  const testDirs: string[] = []; // Track all test directories

  beforeAll(() => {
    // Store original working directory
    originalCwd = process.cwd();
    
    // Create a temporary directory for testing
    testDir = mkdtempSync(join(tmpdir(), 'archivist-test-'));
    testDirs.push(testDir);
    
    // Change to test directory
    process.chdir(testDir);
  });

  afterAll(() => {
    // Change back to original directory
    process.chdir(originalCwd);
    
    // Clean up all test directories
    for (const dir of testDirs) {
      try {
        rmSync(dir, { recursive: true, force: true });
      } catch (error) {
        console.warn(`Failed to clean up test directory ${dir}:`, error);
      }
    }
  });

  it('should install and run archivist via bunx from npm registry', async () => {
    // Create a minimal package.json
    const packageJson = {
      name: "archivist-install-test",
      version: "1.0.0",
      private: true
    };
    writeFileSync(join(testDir, 'package.json'), JSON.stringify(packageJson, null, 2));

    // Install @stellarwp/archivist from npm
    console.log('Installing @stellarwp/archivist from npm registry...');
    const installResult = await $`bun add @stellarwp/archivist`.quiet();
    expect(installResult.exitCode).toBe(0);

    // Test bunx archivist --version
    console.log('Testing bunx archivist --version...');
    const versionResult = await $`bunx archivist --version`.quiet();
    expect(versionResult.exitCode).toBe(0);
    expect(versionResult.stdout.toString()).toMatch(/\d+\.\d+\.\d+/);

    // Test bunx archivist --help
    console.log('Testing bunx archivist --help...');
    const helpResult = await $`bunx archivist --help`.quiet();
    expect(helpResult.exitCode).toBe(0);
    const helpOutput = helpResult.stdout.toString();
    expect(helpOutput).toContain('Usage:');
    expect(helpOutput).toContain('Commands:');
    expect(helpOutput).toContain('init');
    expect(helpOutput).toContain('crawl');

    // Test bunx archivist init
    console.log('Testing bunx archivist init...');
    const initResult = await $`bunx archivist init`.quiet();
    expect(initResult.exitCode).toBe(0);
    
    // Verify config file was created
    const configExists = await Bun.file(join(testDir, 'archivist.config.json')).exists();
    expect(configExists).toBe(true);

    // Test bunx archivist crawl --help
    console.log('Testing bunx archivist crawl --help...');
    const crawlHelpResult = await $`bunx archivist crawl --help`.quiet();
    expect(crawlHelpResult.exitCode).toBe(0);
    expect(crawlHelpResult.stdout.toString()).toContain('Crawl and archive web content');
  }, 60000); // 60 second timeout for npm install

  it('should install and run archivist from local tarball', async () => {
    // First, we need to pack the current project
    console.log('Creating local package tarball...');
    const packResult = await $`cd ${originalCwd} && bun run npm pack`.quiet();
    expect(packResult.exitCode).toBe(0);
    
    // Get the tarball filename
    const tarballName = packResult.stdout.toString().trim();
    const tarballPath = join(originalCwd, tarballName);

    // Create a new test directory for local install
    const localTestDir = mkdtempSync(join(tmpdir(), 'archivist-local-test-'));
    testDirs.push(localTestDir); // Track for cleanup
    process.chdir(localTestDir);

    try {
      // Create package.json
      const packageJson = {
        name: "archivist-local-install-test",
        version: "1.0.0",
        private: true
      };
      writeFileSync(join(localTestDir, 'package.json'), JSON.stringify(packageJson, null, 2));

      // Install from local tarball
      console.log('Installing from local tarball...');
      const installResult = await $`bun add ${tarballPath}`.quiet();
      expect(installResult.exitCode).toBe(0);

      // Test that archivist works
      console.log('Testing local installation...');
      const versionResult = await $`bunx archivist --version`.quiet();
      expect(versionResult.exitCode).toBe(0);
      
      // Test init command
      const initResult = await $`bunx archivist init`.quiet();
      expect(initResult.exitCode).toBe(0);
      
      // Verify config was created
      const configExists = await Bun.file(join(localTestDir, 'archivist.config.json')).exists();
      expect(configExists).toBe(true);

    } finally {
      // Clean up
      process.chdir(originalCwd);
      rmSync(localTestDir, { recursive: true, force: true });
      rmSync(tarballPath, { force: true });
    }
  }, 60000); // 60 second timeout

  it('should work with bun run when installed as dependency', async () => {
    // Create package.json with scripts
    const packageJson = {
      name: "archivist-scripts-test",
      version: "1.0.0",
      private: true,
      scripts: {
        "archive:init": "archivist init",
        "archive:help": "archivist --help"
      }
    };
    writeFileSync(join(testDir, 'package.json'), JSON.stringify(packageJson, null, 2));

    // Install archivist
    console.log('Installing for bun run test...');
    const installResult = await $`bun add @stellarwp/archivist`.quiet();
    expect(installResult.exitCode).toBe(0);

    // Test via bun run
    console.log('Testing bun run archive:help...');
    const helpResult = await $`bun run archive:help`.quiet();
    expect(helpResult.exitCode).toBe(0);
    expect(helpResult.stdout.toString()).toContain('Usage:');

    // Test init via bun run
    console.log('Testing bun run archive:init...');
    const initResult = await $`bun run archive:init`.quiet();
    expect(initResult.exitCode).toBe(0);
  }, 60000); // 60 second timeout
});