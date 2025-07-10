import 'reflect-metadata';
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { mkdirSync, writeFileSync, existsSync, rmSync, readdirSync } from 'fs';
import { join } from 'path';
import { initializeContainer, appContainer } from '../../src/di/container';
import { ArchiveCrawlerService } from '../../src/services/archive-crawler.service';
import { ConfigService } from '../../src/services/config.service';
import { StateService } from '../../src/services/state.service';
import { LoggerService } from '../../src/services/logger.service';
import type { ArchiveConfig, ArchivistConfig } from '../../archivist.config';

describe('Clean Directory Functionality', () => {
  const testDir = './tests/test-clean-output';
  let archiveCrawler: ArchiveCrawlerService;
  let configService: ConfigService;
  let stateService: StateService;
  let logger: LoggerService;
  
  const testArchive: ArchiveConfig = {
    name: 'Test Archive',
    sources: 'https://example.com',
    output: {
      directory: testDir,
      format: 'markdown',
      fileNaming: 'url-based'
    }
  };
  
  const testConfig: ArchivistConfig = {
    archives: [testArchive],
    crawl: {
      maxConcurrency: 1,
      delay: 0,
      userAgent: 'test-agent',
      timeout: 5000
    }
  };
  
  beforeEach(() => {
    // Clean up and create test directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
    
    // Initialize DI container
    initializeContainer();
    
    // Get services
    configService = appContainer.resolve(ConfigService);
    stateService = appContainer.resolve(StateService);
    logger = appContainer.resolve(LoggerService);
    archiveCrawler = appContainer.resolve(ArchiveCrawlerService);
    
    // Initialize config
    configService.initialize(testConfig, './test-config.json');
    
    // Initialize archive state
    stateService.initializeArchive(testArchive.name);
  });
  
  afterEach(() => {
    // Clean up
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });
  
  it('should create directory if it does not exist', async () => {
    // Directory should not exist initially
    expect(existsSync(testDir)).toBe(false);
    
    const archiveState = stateService.getArchiveState(testArchive.name)!;
    
    // Add a fake result
    archiveState.results.push({
      url: 'https://example.com/page1',
      title: 'Test Page',
      content: 'Test content',
      contentLength: 12,
      links: []
    });
    
    // Save without clean option
    await archiveCrawler.saveResults(testArchive, archiveState);
    
    // Directory should be created
    expect(existsSync(testDir)).toBe(true);
    
    // Files should exist
    const files = readdirSync(testDir);
    expect(files).toContain('example-com-page1.md');
    expect(files).toContain('archivist-metadata.json');
  });
  
  it('should preserve existing files when clean is false', async () => {
    // Create directory with existing files
    mkdirSync(testDir, { recursive: true });
    writeFileSync(join(testDir, 'existing-file.txt'), 'existing content');
    writeFileSync(join(testDir, 'another-file.md'), '# Another file');
    
    const archiveState = stateService.getArchiveState(testArchive.name)!;
    
    // Add a new result
    archiveState.results.push({
      url: 'https://example.com/new-page',
      title: 'New Page',
      content: 'New content',
      contentLength: 11,
      links: []
    });
    
    // Save without clean option
    await archiveCrawler.saveResults(testArchive, archiveState, { clean: false });
    
    // All files should exist
    const files = readdirSync(testDir);
    expect(files).toContain('existing-file.txt');
    expect(files).toContain('another-file.md');
    expect(files).toContain('example-com-new-page.md');
    expect(files).toContain('archivist-metadata.json');
  });
  
  it('should clean directory when clean is true', async () => {
    // Create directory with existing files
    mkdirSync(testDir, { recursive: true });
    writeFileSync(join(testDir, 'old-file1.txt'), 'old content 1');
    writeFileSync(join(testDir, 'old-file2.md'), '# Old file 2');
    writeFileSync(join(testDir, 'archivist-metadata.json'), '{"old": true}');
    
    // Verify files exist
    expect(existsSync(join(testDir, 'old-file1.txt'))).toBe(true);
    expect(existsSync(join(testDir, 'old-file2.md'))).toBe(true);
    
    const archiveState = stateService.getArchiveState(testArchive.name)!;
    
    // Add new results
    archiveState.results.push({
      url: 'https://example.com/fresh-page',
      title: 'Fresh Page',
      content: 'Fresh content',
      contentLength: 13,
      links: []
    });
    
    // Save with clean option
    await archiveCrawler.saveResults(testArchive, archiveState, { clean: true });
    
    // Old files should be gone
    expect(existsSync(join(testDir, 'old-file1.txt'))).toBe(false);
    expect(existsSync(join(testDir, 'old-file2.md'))).toBe(false);
    
    // New files should exist
    const files = readdirSync(testDir);
    expect(files).toContain('example-com-fresh-page.md');
    expect(files).toContain('archivist-metadata.json');
    expect(files.length).toBe(2); // Only the new files
  });
  
  it('should handle subdirectories when cleaning', async () => {
    const subDir = join(testDir, 'subdirectory');
    
    // Create directory structure with files
    mkdirSync(subDir, { recursive: true });
    writeFileSync(join(testDir, 'root-file.txt'), 'root content');
    writeFileSync(join(subDir, 'sub-file.txt'), 'sub content');
    
    const archiveState = stateService.getArchiveState(testArchive.name)!;
    
    // Add a result
    archiveState.results.push({
      url: 'https://example.com/test',
      title: 'Test',
      content: 'Test',
      contentLength: 4,
      links: []
    });
    
    // Save with clean option
    await archiveCrawler.saveResults(testArchive, archiveState, { clean: true });
    
    // Subdirectory should be gone
    expect(existsSync(subDir)).toBe(false);
    
    // Only new files should exist
    const files = readdirSync(testDir);
    expect(files).not.toContain('root-file.txt');
    expect(files).not.toContain('subdirectory');
    expect(files).toContain('example-com-test.md');
  });
});