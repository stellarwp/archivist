import { z } from 'zod';
import { DEFAULT_USER_AGENT } from '../version';

// Define pagination stop conditions first
const PaginationStopConditionsSchema = z.object({
  consecutiveEmptyPages: z.number().min(1).default(3).optional().describe('Stop after N pages with no new links'),
  max404Errors: z.number().min(1).default(2).optional().describe('Stop after N 404 errors'),
  errorKeywords: z.array(z.string()).optional().describe('Keywords indicating error pages'),
  minNewLinksPerPage: z.number().min(0).default(1).optional().describe('Minimum new links to continue'),
}).optional();

// Define pagination config
const PaginationConfigSchema = z.object({
  startPage: z.number().default(1).optional(),
  maxPages: z.number().optional(),
  pageParam: z.string().default('page').optional(),
  pagePattern: z.string().optional().describe('Pattern for page URLs, e.g., "example.com/page/{page}"'),
  nextLinkSelector: z.string().optional().describe('CSS selector for next page link'),
  stopConditions: PaginationStopConditionsSchema.describe('Conditions for early pagination stopping'),
});

// Single source can be a URL string or a detailed object
const SourceSchema = z.union([
  z.string().url(),
  z.object({
    url: z.string().url(),
    name: z.string().optional(),
    depth: z.number().min(0).max(3).default(0).optional(),
    linkSelector: z.string().optional().describe('CSS selector to find links to crawl'),
    includePatterns: z.array(z.string()).optional().describe('Regex patterns - only follow links matching these'),
    excludePatterns: z.array(z.string()).optional().describe('Regex patterns - exclude links matching these'),
    strategy: z.enum(['explorer', 'pagination']).default('explorer').optional().describe('Source crawling strategy'),
    pagination: PaginationConfigSchema.optional().describe('Configuration for pagination strategy'),
  })
]);

// Sources can be a single source or an array of sources
const SourcesSchema = z.union([
  SourceSchema,
  z.array(SourceSchema)
]);

// Output configuration schema
const OutputSchema = z.object({
  directory: z.string().default('./archive'),
  format: z.enum(['markdown', 'html', 'json']).default('markdown'),
  fileNaming: z.enum(['url-based', 'title-based', 'hash-based']).default('url-based'),
});

// Individual archive configuration
const ArchiveSchema = z.object({
  name: z.string(),
  sources: SourcesSchema,
  output: OutputSchema,
});

// Export schema objects for extracting nested types
const CrawlConfigSchema = z.object({
  maxConcurrency: z.number().min(1).max(10).default(3),
  delay: z.number().min(0).default(1000),
  userAgent: z.string().default(DEFAULT_USER_AGENT),
  timeout: z.number().min(1000).default(30000),
  debug: z.boolean().default(false).optional(),
});

// Export types
export type SourceConfig = z.infer<typeof SourceSchema>;
export type ArchiveConfig = z.infer<typeof ArchiveSchema>;
export type OutputConfig = z.infer<typeof OutputSchema>;
export type CrawlConfig = z.infer<typeof CrawlConfigSchema>;
export type PaginationConfig = z.infer<typeof PaginationConfigSchema>;
export type PaginationStopConditions = z.infer<typeof PaginationStopConditionsSchema>;

export const ArchivistConfigSchema = z.object({
  archives: z.array(ArchiveSchema),
  crawl: CrawlConfigSchema.optional(),
  pure: z.object({
    apiKey: z.string().optional(),
  }).optional(),
});

export type ArchivistConfig = z.infer<typeof ArchivistConfigSchema>;
export type Archive = z.infer<typeof ArchiveSchema>;
export type Source = z.infer<typeof SourceSchema>;

export const defaultCrawlConfig: CrawlConfig = {
  maxConcurrency: 3,
  delay: 1000,
  userAgent: DEFAULT_USER_AGENT,
  timeout: 30000,
};

export const defaultConfig: ArchivistConfig = {
  archives: [],
  crawl: defaultCrawlConfig,
};