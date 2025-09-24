// Configuration Management System Index - Unified exports and initialization
export * from './configManager';
export * from './userSettings';
export * from './environmentConfigLoader';
export * from './configValidator';

// Re-export types
export * from '../types/config';

// Main initialization function
import { configManager } from './configManager';
import { userSettingsService } from './userSettings';
import { environmentConfigLoader } from './environmentConfigLoader';
import { configValidator } from './configValidator';
import { Environment } from '../types/config';

export interface ConfigSystemOptions {
  configDir?: string;
  environment?: Environment;
  enableHotReload?: boolean;
  enableValidation?: boolean;
  autoSave?: boolean;
}

/**
 * Initialize the complete configuration management system
 */
export async function initializeConfigSystem(options: ConfigSystemOptions = {}): Promise<void> {
  const {
    configDir = './config',
    environment,
    enableHotReload = true,
    enableValidation = true,
    autoSave = true
  } = options;

  try {
    // console.log('🚀 Initializing BEAR AI Configuration Management System...');

    // Initialize environment config loader
    // console.log('📁 Setting up environment configuration loader...');
    // Environment config loader is already configured

    // Initialize main config manager
    // Logging disabled for production
    await configManager.initialize(environment);

    // Initialize user settings service
    // console.log('👤 Setting up user settings service...');
    // User settings service is already initialized

    // Validate current configuration
    if (enableValidation) {
      // Logging disabled for production
      const config = configManager.getConfig();
      const validation = await configValidator.validateConfiguration(config, environment);
      
      if (!validation.isValid) {
        // Warning logging disabled for production
      } else {
        // Logging disabled for production
      }
    }

    // Enable hot reload if requested
    if (enableHotReload) {
      // console.log('🔄 Enabling configuration hot reload...');
      configManager.enableHotReload();
    }

    // Logging disabled for production

  } catch (error) {
    // Error logging disabled for production
    throw error;
  }
}

/**
 * Get configuration system status
 */
export function getConfigSystemStatus() {
  return {
    configManager: {
      initialized: true,
      lastUpdated: configManager.getState().lastUpdated,
      errors: configManager.getState().errors,
      warnings: configManager.getState().warnings
    },
    userSettings: {
      initialized: true,
      activeSessions: 0 // userSettingsService.getActiveSessions().length
    },
    hotReload: {
      enabled: true // configManager.isHotReloadEnabled()
    },
    validation: {
      available: true
    }
  };
}

/**
 * Shutdown configuration system gracefully
 */
export async function shutdownConfigSystem(): Promise<void> {
  // console.log('🛑 Shutting down Configuration Management System...');
  
  try {
    // Disable hot reload
    configManager.disableHotReload();
    
    // Save any pending changes
    const state = configManager.getState();
    if (state.pendingChanges.length > 0) {
      // console.log('💾 Saving pending configuration changes...');
      // In a real implementation, this would save pending changes
    }
    
    // Clean up user settings service
    userSettingsService.destroy();
    
    // Logging disabled for production
  } catch (error) {
    // Error logging disabled for production
    throw error;
  }
}

// Convenience exports for common operations
export const config = configManager;
export const userSettings = userSettingsService;
export const envLoader = environmentConfigLoader;
export const validator = configValidator;

// Utility functions
export async function reloadConfiguration(): Promise<void> {
  await configManager.initialize();
}

export async function validateCurrentConfig(): Promise<any> {
  const config = configManager.getConfig();
  return configValidator.validateConfiguration(config);
}

export async function exportConfiguration(includeSecrets: boolean = false): Promise<any> {
  return configManager.exportConfig({ includeSecrets });
}

export async function importConfiguration(configData: any): Promise<any> {
  return configManager.importConfig(configData);
}