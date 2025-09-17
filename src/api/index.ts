/**
 * API Entry Point - Hybrid Web/Desktop API
 * Automatically detects environment and provides appropriate API implementation
 */

// Simple fallbacks for removed utilities
const isTauriEnvironment = () => false;
const getCurrentEnvironment = () => 'web';
const environmentLog = {
  info: (message: string, ...args: any[]) => console.log(message, ...args),
  error: (message: string, ...args: any[]) => console.error(message, ...args),
  warn: (message: string, ...args: any[]) => console.warn(message, ...args)
};

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

// Re-export everything from the hybrid client (main API)
export * from './localClient.hybrid';

// Export specific registry services to avoid naming conflicts
export { 
  localApiRegistry, 
  localApiClient,
  localApiServer,
  localAuthService,
  localChatService,
  localDocumentService,
  localResearchService,
  localAnalysisService,
  api
} from './localApiRegistry';

// Default export
export { hybridLocalApiClient as default } from './localClient.hybrid';

// Environment info
export const apiInfo = {
  environment: getCurrentEnvironment(),
  isTauri: isTauriEnvironment(),
  timestamp: new Date().toISOString()
};

environmentLog.info('API module loaded:', apiInfo);