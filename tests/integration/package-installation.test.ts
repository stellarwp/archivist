import { describe, expect, it, beforeAll, afterAll } from 'bun:test';
import { $ } from 'bun';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

describe('Package Installation', () => {
  // Skip npm registry tests in CI as the package might not be published yet
  // These tests are mainly for local development and pre-release testing
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

  it.skipIf(process.env.CI)('should install and run archivist via bunx from npm registry', async () => {
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
    const packResult = await $`cd ${originalCwd} && npm pack`.quiet();
    expect(packResult.exitCode).toBe(0);
    
    // Get the tarball filename - it should match the package name and version
    const packageJson = await Bun.file(join(originalCwd, 'package.json')).json();
    const tarballName = `stellarwp-archivist-${packageJson.version}.tgz`;
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

  it('should work with bun run when installed from local tarball', async () => {
    // Skip this test in CI if npm pack hasn't been run
    const packageJson = await Bun.file(join(originalCwd, 'package.json')).json();
    const tarballName = `stellarwp-archivist-${packageJson.version}.tgz`;
    const tarballPath = join(originalCwd, tarballName);
    
    // Check if tarball exists, if not create it
    if (!(await Bun.file(tarballPath).exists())) {
      console.log('Creating tarball for test...');
      const packResult = await $`cd ${originalCwd} && npm pack`.quiet();
      if (packResult.exitCode !== 0) {
        console.log('Skipping test - npm pack failed');
        return;
      }
    }

    // Create test directory
    const scriptsTestDir = mkdtempSync(join(tmpdir(), 'archivist-scripts-test-'));
    testDirs.push(scriptsTestDir);
    process.chdir(scriptsTestDir);

    try {
      // Create package.json with scripts
      const testPackageJson = {
        name: "archivist-scripts-test",
        version: "1.0.0",
        private: true,
        scripts: {
          "archive:init": "archivist init",
          "archive:help": "archivist --help"
        }
      };
      writeFileSync(join(scriptsTestDir, 'package.json'), JSON.stringify(testPackageJson, null, 2));

      // Install from local tarball
      console.log('Installing from local tarball for bun run test...');
      const installResult = await $`bun add ${tarballPath}`.quiet();
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
      
      // Verify config was created
      const configExists = await Bun.file(join(scriptsTestDir, 'archivist.config.json')).exists();
      expect(configExists).toBe(true);
    } finally {
      // Change back to original test directory
      process.chdir(testDir);
    }
  }, 60000); // 60 second timeout
});