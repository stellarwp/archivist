#!/usr/bin/env node

import * as esbuild from 'esbuild';
import fs from 'node:fs/promises';
import path from 'node:path';

async function build() {
  console.log('Building GitHub Action bundle...');
  
  // Build the action
  const result = await esbuild.build({
    entryPoints: ['src/action.ts'],
    bundle: true,
    platform: 'node',
    target: 'node20',
    format: 'esm',
    outfile: 'dist/index.mjs',
    external: ['fsevents'],
    minify: true,
    sourcemap: false,
    metafile: true,
  });

  // Create a wrapper that works with GitHub Actions
  const wrapper = `#!/usr/bin/env node
import('./index.mjs').catch(err => {
  console.error(err);
  process.exit(1);
});
`;

  await fs.writeFile('dist/index.js', wrapper, 'utf8');
  
  // Make it executable
  await fs.chmod('dist/index.js', 0o755);
  await fs.chmod('dist/index.mjs', 0o755);
  
  // Print bundle size
  const stats = await fs.stat('dist/index.mjs');
  console.log(`✓ Bundle created: ${(stats.size / 1024 / 1024).toFixed(2)}MB`);
  
  // Analyze metafile
  const text = await esbuild.analyzeMetafile(result.metafile);
  console.log('\nBundle analysis:');
  console.log(text);
}

build().catch(err => {
  console.error(err);
  process.exit(1);
});