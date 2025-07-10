#!/usr/bin/env bun
/**
 * Script to update version across all files
 * Usage: bun run scripts/update-version.ts <new-version>
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const newVersion = process.argv[2];

if (!newVersion) {
  console.error('Usage: bun run scripts/update-version.ts <new-version>');
  console.error('Example: bun run scripts/update-version.ts 0.1.0-beta.7');
  process.exit(1);
}

// Validate version format
const versionRegex = /^\d+\.\d+\.\d+(-\w+(\.\d+)?)?$/;
if (!versionRegex.test(newVersion)) {
  console.error('Invalid version format. Use semver format like 1.2.3 or 1.2.3-beta.1');
  process.exit(1);
}

// Parse version components
const parts = newVersion.split('-');
const versionCore = parts[0] || '';
const prerelease = parts[1] || '';
const versionParts = versionCore.split('.');
const major = Number(versionParts[0] || 0);
const minor = Number(versionParts[1] || 0);
const patch = Number(versionParts[2] || 0);

console.log(`Updating version to ${newVersion}...`);

// Files to update
const filesToUpdate = [
  {
    path: 'package.json',
    replacements: [
      { pattern: /"version":\s*"[^"]+"/g, replacement: `"version": "${newVersion}"` }
    ]
  },
  {
    path: 'src/version.ts',
    replacements: [
      { pattern: /export const VERSION = '[^']+'/g, replacement: `export const VERSION = '${newVersion}'` },
      { pattern: /export const VERSION_MAJOR = \d+/g, replacement: `export const VERSION_MAJOR = ${major}` },
      { pattern: /export const VERSION_MINOR = \d+/g, replacement: `export const VERSION_MINOR = ${minor}` },
      { pattern: /export const VERSION_PATCH = \d+/g, replacement: `export const VERSION_PATCH = ${patch}` },
      { pattern: /export const VERSION_PRERELEASE = '[^']*'/g, replacement: `export const VERSION_PRERELEASE = '${prerelease}'` }
    ]
  }
];

// Update files
for (const file of filesToUpdate) {
  const filePath = join(process.cwd(), file.path);
  try {
    let content = readFileSync(filePath, 'utf-8');
    
    for (const { pattern, replacement } of file.replacements) {
      content = content.replace(pattern, replacement);
    }
    
    writeFileSync(filePath, content);
    console.log(`✓ Updated ${file.path}`);
  } catch (error) {
    console.error(`✗ Failed to update ${file.path}:`, error);
  }
}

// Update package-lock.json if it exists
try {
  const lockPath = join(process.cwd(), 'package-lock.json');
  const lockContent = readFileSync(lockPath, 'utf-8');
  const lockData = JSON.parse(lockContent);
  
  // Update version in lock file
  lockData.version = newVersion;
  if (lockData.packages && lockData.packages['']) {
    lockData.packages[''].version = newVersion;
  }
  
  writeFileSync(lockPath, JSON.stringify(lockData, null, 2) + '\n');
  console.log('✓ Updated package-lock.json');
} catch (error) {
  // package-lock.json might not exist, which is fine
  console.log('ℹ Skipped package-lock.json (not found or invalid)');
}

console.log('\nVersion update complete!');
console.log('\nDon\'t forget to:');
console.log('1. Update CHANGELOG.md with release notes');
console.log('2. Commit the changes: git commit -m "chore: bump version to ' + newVersion + '"');
console.log('3. Tag the release: git tag v' + newVersion);
console.log('4. Push changes and tags: git push && git push --tags');