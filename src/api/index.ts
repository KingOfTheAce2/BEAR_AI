/**
 * API Entry Point - Hybrid Web/Desktop API
 * Automatically detects environment and provides appropriate API implementation
 */

import { isTauriEnvironment, getCurrentEnvironment, environmentLog } from '../utils/environmentDetection';

// Conditional exports based on environment
let apiExports: any;

if (isTauriEnvironment()) {
  // Desktop environment - use Tauri-based local client
  environmentLog.info('Loading Tauri-based local API client');
  apiExports = import('./localClient');
} else {
  // Web environment - use hybrid client with HTTP fallbacks
  environmentLog.info('Loading hybrid API client with HTTP fallbacks');
  apiExports = import('./localClient.hybrid');
}

// Re-export everything from the appropriate client
export * from './localClient.hybrid';

// Also provide the registry and server exports
export * from './localApiRegistry';

// Default export
export { hybridLocalApiClient as default } from './localClient.hybrid';

// Environment info
export const apiInfo = {
  environment: getCurrentEnvironment(),
  isTauri: isTauriEnvironment(),
  timestamp: new Date().toISOString()
};

environmentLog.info('API module loaded:', apiInfo);