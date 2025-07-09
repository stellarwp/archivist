
/**
 * Resolves the Pure API key with the following priority:
 * 1. CLI --pure-key parameter (passed via config)
 * 2. pure.apiKey from config file
 * 3. PURE_API_KEY environment variable
 */
export function resolvePureApiKey(config?: { pure?: { apiKey?: string } } | { apiKey?: string }): string | undefined {
  // Priority 1: Config value (which includes CLI override)
  if (config) {
    // Check if it's a full config with pure section
    if ('pure' in config && config.pure?.apiKey) {
      return config.pure.apiKey;
    }
    // Check if it's a simple config with apiKey directly
    if ('apiKey' in config && config.apiKey) {
      return config.apiKey;
    }
  }

  // Priority 2: Environment variable
  if (process.env.PURE_API_KEY) {
    return process.env.PURE_API_KEY;
  }

  return undefined;
}