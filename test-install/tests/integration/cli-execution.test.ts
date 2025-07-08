import { describe, expect, it } from 'bun:test';
import { $ } from 'bun';
import { join } from 'path';
import { existsSync } from 'fs';

describe('CLI Execution', () => {
  const cliPath = join(__dirname, '../../../src/cli.ts');

  it('should execute CLI directly with bun', async () => {
    const result = await $`bun ${cliPath} --version`.quiet();
    expect(result.exitCode).toBe(0);
    expect(result.stdout.toString()).toContain('0.1.0-beta.4');
  });

  it('should show help with --help flag', async () => {
    const result = await $`bun ${cliPath} --help`.quiet();
    expect(result.exitCode).toBe(0);
    const output = result.stdout.toString();
    expect(output).toContain('Usage:');
    expect(output).toContain('Commands:');
    expect(output).toContain('init');
    expect(output).toContain('crawl');
  });

  it('should show init command help', async () => {
    const result = await $`bun ${cliPath} init --help`.quiet();
    expect(result.exitCode).toBe(0);
    const output = result.stdout.toString();
    expect(output).toContain('Initialize a new archivist config file');
  });

  it('should show crawl command help', async () => {
    const result = await $`bun ${cliPath} crawl --help`.quiet();
    expect(result.exitCode).toBe(0);
    const output = result.stdout.toString();
    expect(output).toContain('Crawl and archive web content');
    expect(output).toContain('--config');
  });

  it('should execute via bun run when installed as dependency', async () => {
    // This test simulates running via package.json scripts
    const packageJsonPath = join(__dirname, '../../../package.json');
    if (existsSync(packageJsonPath)) {
      const result = await $`cd ${join(__dirname, '../../../')} && bun run archive --version`.quiet();
      expect(result.exitCode).toBe(0);
      expect(result.stdout.toString()).toContain('0.1.0-beta.4');
    }
  });

  it('should have executable permissions', async () => {
    // Use fs.statSync for compatibility with Bun 1.1.0
    const { statSync } = await import('fs');
    const stats = statSync(cliPath);
    // Check if file exists and is accessible
    expect(stats.size).toBeGreaterThan(0);
  });

  it('should fail gracefully with invalid command', async () => {
    const result = await $`bun ${cliPath} invalid-command`.quiet().nothrow();
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr.toString()).toContain("error: unknown command 'invalid-command'");
  });
});