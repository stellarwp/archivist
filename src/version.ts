/**
 * Centralized version management for Archivist
 * Update this file when releasing new versions
 */

export const VERSION = '0.1.0-beta.7';
export const VERSION_MAJOR = 0;
export const VERSION_MINOR = 1;
export const VERSION_PATCH = 0;
export const VERSION_PRERELEASE = 'beta.7';

export const USER_AGENT = `Archivist/${VERSION}`;
export const DEFAULT_USER_AGENT = USER_AGENT;

/**
 * Get the full version string
 */
export function getVersion(): string {
  return VERSION;
}

/**
 * Get the user agent string with version
 */
export function getUserAgent(): string {
  return USER_AGENT;
}

/**
 * Check if current version is a prerelease
 */
export function isPrerelease(): boolean {
  return VERSION_PRERELEASE.length > 0;
}