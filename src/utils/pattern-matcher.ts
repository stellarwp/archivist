import { minimatch } from 'minimatch';

/**
 * Determines if a pattern is a regex pattern (contains regex special characters)
 * or a minimatch glob pattern
 */
function isRegexPattern(pattern: string): boolean {
  // Common regex characters that wouldn't typically appear in glob patterns
  const regexIndicators = [
    '^',     // Start anchor
    '$',     // End anchor
    '\\.',   // Escaped dot
    '\\w',   // Word character
    '\\d',   // Digit
    '\\s',   // Whitespace
    '\\/',   // Escaped slash
    '\\\\',  // Escaped backslash
    '\\b',   // Word boundary
    '|',     // Alternation (but not in braces)
    '(',     // Group start
    ')',     // Group end
    '+',     // One or more (when preceded by other regex chars)
    '.*',    // Zero or more (but check context)
  ];
  
  // Special handling for .* which could be in both regex and glob
  if (pattern.includes('.*')) {
    // If it's preceded by a backslash, it's likely regex
    if (pattern.includes('\\.')) {
      return true;
    }
    // If it has other regex indicators, it's regex
    if (regexIndicators.slice(0, -2).some(indicator => pattern.includes(indicator))) {
      return true;
    }
  }
  
  // Check for character classes that aren't glob patterns
  if (/\[[a-zA-Z]-[a-zA-Z]\]/.test(pattern)) {
    return true;
  }
  
  // Check for + quantifier after specific patterns
  if (/[^*]+\+/.test(pattern)) {
    return true;
  }
  
  // Check if pattern contains regex-specific syntax
  return regexIndicators.slice(0, -2).some(indicator => pattern.includes(indicator));
}

/**
 * Tests if a URL matches a pattern, supporting both minimatch glob patterns
 * and regular expressions for backward compatibility
 */
export function matchesPattern(url: string, pattern: string): boolean {
  try {
    if (isRegexPattern(pattern)) {
      // Treat as regex for backward compatibility
      const regex = new RegExp(pattern);
      return regex.test(url);
    } else {
      // For minimatch to work with URLs, we need to handle them specially
      // Minimatch is designed for file paths, not URLs
      
      // If the pattern looks like a full URL pattern, match directly
      if (pattern.startsWith('http://') || pattern.startsWith('https://')) {
        return minimatch(url, pattern, { 
          nocase: true,
          dot: true
        });
      }
      
      // For path-based patterns, we need to extract the path from the URL
      let urlPath: string;
      try {
        const urlObj = new URL(url);
        // Include everything after the protocol and domain
        urlPath = urlObj.pathname + urlObj.search + urlObj.hash;
      } catch {
        // If URL parsing fails, use the whole URL
        urlPath = url;
      }
      
      // Handle different pattern types
      if (pattern.includes('**')) {
        // Pattern with **, match against full URL
        return minimatch(url, pattern, { 
          nocase: true,
          dot: true
        });
      } else if (pattern.startsWith('*.')) {
        // File extension pattern - check for brace expansion first
        if (pattern.includes('{') && pattern.includes('}')) {
          // Handle brace expansion like *.{jpg,png,gif}
          const match = pattern.match(/\*\.{([^}]+)}/);
          if (match) {
            const extensions = match[1].split(',');
            return extensions.some(ext => url.toLowerCase().endsWith('.' + ext.toLowerCase()));
          }
        }
        // Simple extension pattern
        const extension = pattern.substring(1); // Remove *
        return url.toLowerCase().endsWith(extension.toLowerCase());
      } else if (pattern.includes('*')) {
        // Wildcard pattern - need to be more flexible
        // Convert glob to a simple regex pattern
        const regexPattern = pattern
          .replace(/\*/g, '.*')
          .replace(/\?/g, '.')
          .replace(/\{([^}]+)\}/g, (match, group) => `(${group.split(',').join('|')})`);
        return new RegExp(regexPattern, 'i').test(url);
      } else {
        // Simple string pattern - check if URL contains it
        return url.toLowerCase().includes(pattern.toLowerCase());
      }
    }
  } catch (error) {
    // If pattern is invalid, log warning and return false
    console.warn(`Invalid pattern "${pattern}": ${error}`);
    return false;
  }
}

/**
 * Tests if a URL should be included based on include/exclude patterns
 * Supports both minimatch glob patterns and regular expressions
 */
export function shouldIncludeUrl(
  url: string,
  includePatterns?: string[],
  excludePatterns?: string[]
): boolean {
  // If exclude patterns are defined and URL matches any, exclude it
  if (excludePatterns && excludePatterns.length > 0) {
    const shouldExclude = excludePatterns.some(pattern => matchesPattern(url, pattern));
    if (shouldExclude) {
      return false;
    }
  }
  
  // If include patterns are defined, URL must match at least one
  if (includePatterns && includePatterns.length > 0) {
    return includePatterns.some(pattern => matchesPattern(url, pattern));
  }
  
  // If no include patterns, include by default
  return true;
}

/**
 * Converts common glob patterns to more specific ones if needed
 * This helps users write simpler patterns
 */
export function normalizePattern(pattern: string): string {
  // If pattern doesn't start with scheme or wildcard, assume it's a path pattern
  if (!pattern.startsWith('http') && !pattern.startsWith('*')) {
    // Convert path patterns to full URL patterns
    if (pattern.startsWith('/')) {
      return `**${pattern}`;
    }
    return `**/${pattern}`;
  }
  return pattern;
}