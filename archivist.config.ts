import { z } from 'zod';

// Single source can be a URL string or a detailed object
const SourceSchema = z.union([
  z.string().url(),
  z.object({
    url: z.string().url(),
    name: z.string().optional(),
    depth: z.number().min(0).max(3).default(0),
    linkSelector: z.string().optional().describe('CSS selector to find links to crawl'),
    followPattern: z.string().optional().describe('Regex pattern to filter which links to follow'),
  })
]);

// Sources can be a single source or an array of sources
const SourcesSchema = z.union([
  SourceSchema,
  z.array(SourceSchema)
]);

// Individual archive configuration
const ArchiveSchema = z.object({
  name: z.string(),
  sources: SourcesSchema,
  output: z.object({
    directory: z.string().default('./archive'),
    format: z.enum(['markdown', 'html', 'json']).default('markdown'),
    fileNaming: z.enum(['url-based', 'title-based', 'hash-based']).default('url-based'),
  }),
});

export const ArchivistConfigSchema = z.object({
  archives: z.array(ArchiveSchema),
  crawl: z.object({
    maxConcurrency: z.number().min(1).max(10).default(3),
    delay: z.number().min(0).default(1000),
    userAgent: z.string().default('Archivist/1.0'),
    timeout: z.number().min(1000).default(30000),
  }),
  pure: z.object({
    apiKey: z.string().optional(),
  }),
});

export type ArchivistConfig = z.infer<typeof ArchivistConfigSchema>;
export type Archive = z.infer<typeof ArchiveSchema>;
export type Source = z.infer<typeof SourceSchema>;

export const defaultConfig: ArchivistConfig = {
  archives: [],
  crawl: {
    maxConcurrency: 3,
    delay: 1000,
    userAgent: 'Archivist/1.0',
    timeout: 30000,
  },
  pure: {},
};