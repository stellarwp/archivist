import { z } from 'zod';

export const ArchivistConfigSchema = z.object({
  sources: z.array(z.object({
    url: z.string().url(),
    name: z.string().optional(),
    depth: z.number().min(0).max(3).default(0),
    selector: z.string().optional(),
  })),
  output: z.object({
    directory: z.string().default('./archive'),
    format: z.enum(['markdown', 'html', 'json']).default('markdown'),
    fileNaming: z.enum(['url-based', 'title-based', 'hash-based']).default('url-based'),
  }),
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

export const defaultConfig: ArchivistConfig = {
  sources: [],
  output: {
    directory: './archive',
    format: 'markdown',
    fileNaming: 'url-based',
  },
  crawl: {
    maxConcurrency: 3,
    delay: 1000,
    userAgent: 'Archivist/1.0',
    timeout: 30000,
  },
  pure: {},
};