# Version Management

This document describes how versioning is managed in the Archivist project.

## Centralized Version File

All version information is centralized in `src/version.ts`. This file exports:

- `VERSION` - The full version string (e.g., "0.1.0-beta.6")
- `VERSION_MAJOR` - Major version number
- `VERSION_MINOR` - Minor version number
- `VERSION_PATCH` - Patch version number
- `VERSION_PRERELEASE` - Prerelease identifier (e.g., "beta.6")
- `USER_AGENT` / `DEFAULT_USER_AGENT` - User agent string with version

## Updating the Version

To update the version across the codebase:

```bash
# Using the update script
bun run version:update <new-version>

# Example
bun run version:update 0.1.0-beta.7
```

This script will:
1. Update `package.json` version
2. Update all version constants in `src/version.ts`
3. Update `package-lock.json` if it exists

## Manual Version Updates

If you need to update the version manually:

1. Edit `src/version.ts` and update all constants
2. Update `"version"` in `package.json`
3. Update `package-lock.json` if it exists

## Where Version is Used

The version from `src/version.ts` is automatically used in:

- CLI version display (`archivist --version`)
- Default user agent for web requests
- Package metadata

## Version Format

We follow semantic versioning (semver):
- Format: `MAJOR.MINOR.PATCH[-PRERELEASE]`
- Examples: `1.0.0`, `0.1.0-beta.6`, `2.3.1-rc.1`

## Release Process

1. Update version using the script:
   ```bash
   bun run version:update <new-version>
   ```

2. Update CHANGELOG.md with release notes

3. Commit the changes:
   ```bash
   git commit -m "chore: bump version to <new-version>"
   ```

4. Tag the release:
   ```bash
   git tag v<new-version>
   ```

5. Push changes and tags:
   ```bash
   git push && git push --tags
   ```