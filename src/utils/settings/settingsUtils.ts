import { LocalSettingsConfig, SettingsBackup, SettingsValidationError } from '../../types/settings';

export class SettingsUtils {

  /**
   * Validates settings against a schema
   */
  static validateSettings(settings: Partial<LocalSettingsConfig>): SettingsValidationError[] {
    const errors: SettingsValidationError[] = [];

    // Validate user preferences
    if (settings.userPreferences) {
      const prefs = settings.userPreferences;
      
      if (prefs.language && !/^[a-z]{2}-[A-Z]{2}$/.test(prefs.language)) {
        errors.push({
          path: 'userPreferences.language',
          message: 'Language must be in format "xx-XX" (e.g., "en-US")',
          code: 'INVALID_FORMAT',
          value: prefs.language,
        });
      }

      if (prefs.currency && !/^[A-Z]{3}$/.test(prefs.currency)) {
        errors.push({
          path: 'userPreferences.currency',
          message: 'Currency must be a 3-letter ISO code (e.g., "USD")',
          code: 'INVALID_FORMAT',
          value: prefs.currency,
        });
      }

      if (prefs.timeFormat && !['12h', '24h'].includes(prefs.timeFormat)) {
        errors.push({
          path: 'userPreferences.timeFormat',
          message: 'Time format must be either "12h" or "24h"',
          code: 'INVALID_VALUE',
          value: prefs.timeFormat,
        });
      }
    }

    // Validate theme settings
    if (settings.themeSettings) {
      const theme = settings.themeSettings;
      
      if (theme.activeTheme && !['light', 'dark', 'auto'].includes(theme.activeTheme)) {
        errors.push({
          path: 'themeSettings.activeTheme',
          message: 'Active theme must be "light", "dark", or "auto"',
          code: 'INVALID_VALUE',
          value: theme.activeTheme,
        });
      }

      if (theme.uiScale && (theme.uiScale < 0.5 || theme.uiScale > 2)) {
        errors.push({
          path: 'themeSettings.uiScale',
          message: 'UI scale must be between 0.5 and 2',
          code: 'OUT_OF_RANGE',
          value: theme.uiScale,
        });
      }

      if (theme.sidebarWidth && (theme.sidebarWidth < 200 || theme.sidebarWidth > 800)) {
        errors.push({
          path: 'themeSettings.sidebarWidth',
          message: 'Sidebar width must be between 200 and 800 pixels',
          code: 'OUT_OF_RANGE',
          value: theme.sidebarWidth,
        });
      }

      // Validate custom themes
      if (theme.customThemes) {
        theme.customThemes.forEach((customTheme, index) => {
          if (!customTheme.id) {
            errors.push({
              path: `themeSettings.customThemes[${index}].id`,
              message: 'Custom theme ID is required',
              code: 'REQUIRED',
              value: customTheme.id,
            });
          }

          if (!customTheme.name) {
            errors.push({
              path: `themeSettings.customThemes[${index}].name`,
              message: 'Custom theme name is required',
              code: 'REQUIRED',
              value: customTheme.name,
            });
          }

          // Validate color format
          Object.entries(customTheme.colors || {}).forEach(([colorKey, colorValue]) => {
            if (colorValue && !/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(colorValue)) {
              errors.push({
                path: `themeSettings.customThemes[${index}].colors.${colorKey}`,
                message: 'Color must be a valid hex color (e.g., "#FF0000")',
                code: 'INVALID_FORMAT',
                value: colorValue,
              });
            }
          });
        });
      }
    }

    // Validate model settings
    if (settings.modelSettings) {
      const models = settings.modelSettings;
      
      if (models.chatSettings) {
        const chat = models.chatSettings;
        
        if (chat.temperature !== undefined && (chat.temperature < 0 || chat.temperature > 2)) {
          errors.push({
            path: 'modelSettings.chatSettings.temperature',
            message: 'Temperature must be between 0 and 2',
            code: 'OUT_OF_RANGE',
            value: chat.temperature,
          });
        }

        if (chat.maxTokens !== undefined && chat.maxTokens < 1) {
          errors.push({
            path: 'modelSettings.chatSettings.maxTokens',
            message: 'Max tokens must be at least 1',
            code: 'OUT_OF_RANGE',
            value: chat.maxTokens,
          });
        }

        if (chat.topP !== undefined && (chat.topP < 0 || chat.topP > 1)) {
          errors.push({
            path: 'modelSettings.chatSettings.topP',
            message: 'Top P must be between 0 and 1',
            code: 'OUT_OF_RANGE',
            value: chat.topP,
          });
        }
      }
    }

    // Validate privacy settings
    if (settings.privacySettings) {
      const privacy = settings.privacySettings;
      
      if (privacy.storage) {
        if (privacy.storage.maxStorageSize !== undefined && privacy.storage.maxStorageSize < 1) {
          errors.push({
            path: 'privacySettings.storage.maxStorageSize',
            message: 'Max storage size must be at least 1 MB',
            code: 'OUT_OF_RANGE',
            value: privacy.storage.maxStorageSize,
          });
        }

        if (privacy.storage.retentionPeriod !== undefined && privacy.storage.retentionPeriod < 1) {
          errors.push({
            path: 'privacySettings.storage.retentionPeriod',
            message: 'Retention period must be at least 1 day',
            code: 'OUT_OF_RANGE',
            value: privacy.storage.retentionPeriod,
          });
        }
      }

      if (privacy.network?.proxySettings) {
        const proxy = privacy.network.proxySettings;
        if (proxy.enabled && (!proxy.host || proxy.port === undefined || proxy.port < 1 || proxy.port > 65535)) {
          errors.push({
            path: 'privacySettings.network.proxySettings',
            message: 'Valid proxy host and port (1-65535) required when proxy is enabled',
            code: 'INVALID_CONFIGURATION',
            value: proxy,
          });
        }
      }
    }

    // Validate system settings
    if (settings.systemSettings) {
      const system = settings.systemSettings;
      
      if (system.performance) {
        const perf = system.performance;
        
        if (perf.maxWorkerThreads !== undefined && perf.maxWorkerThreads < 1) {
          errors.push({
            path: 'systemSettings.performance.maxWorkerThreads',
            message: 'Max worker threads must be at least 1',
            code: 'OUT_OF_RANGE',
            value: perf.maxWorkerThreads,
          });
        }

        if (perf.memoryLimit !== undefined && perf.memoryLimit < 128) {
          errors.push({
            path: 'systemSettings.performance.memoryLimit',
            message: 'Memory limit must be at least 128 MB',
            code: 'OUT_OF_RANGE',
            value: perf.memoryLimit,
          });
        }

        if (perf.gcSettings?.threshold !== undefined && (perf.gcSettings.threshold < 0 || perf.gcSettings.threshold > 1)) {
          errors.push({
            path: 'systemSettings.performance.gcSettings.threshold',
            message: 'GC threshold must be between 0 and 1',
            code: 'OUT_OF_RANGE',
            value: perf.gcSettings.threshold,
          });
        }
      }
    }

    return errors;
  }

  /**
   * Merges default settings with user settings
   */
  static mergeWithDefaults(userSettings: Partial<LocalSettingsConfig>, defaultSettings: LocalSettingsConfig): LocalSettingsConfig {
    const merged: LocalSettingsConfig = JSON.parse(JSON.stringify(defaultSettings));

    // Deep merge user settings
    Object.entries(userSettings).forEach(([category, categorySettings]) => {
      if (categorySettings && typeof categorySettings === 'object') {
        (merged as any)[category] = {
          ...merged[category as keyof LocalSettingsConfig],
          ...categorySettings,
        };
      }
    });

    return merged;
  }

  /**
   * Creates a settings backup
   */
  static createBackup(settings: LocalSettingsConfig, description?: string): SettingsBackup {
    return {
      version: '1.0.0',
      timestamp: new Date(),
      settings: JSON.parse(JSON.stringify(settings)), // Deep clone
      metadata: {
        platform: typeof navigator !== 'undefined' ? navigator.platform : 'unknown',
        appVersion: '1.0.0', // Would be injected from package.json
        backupType: 'manual',
        description,
      },
    };
  }

  /**
   * Validates a settings backup
   */
  static validateBackup(backup: any): backup is SettingsBackup {
    if (!backup || typeof backup !== 'object') return false;
    if (!backup.version || !backup.timestamp || !backup.settings || !backup.metadata) return false;
    if (!backup.metadata.platform || !backup.metadata.appVersion || !backup.metadata.backupType) return false;
    
    // Validate settings structure
    const settingsErrors = this.validateSettings(backup.settings);
    return settingsErrors.length === 0;
  }

  /**
   * Migrates settings from older versions
   */
  static migrateSettings(settings: any, fromVersion: number, toVersion: number): LocalSettingsConfig {
    let migrated = JSON.parse(JSON.stringify(settings));

    // Migration logic would go here
    // For now, we just ensure all required fields are present
    
    if (fromVersion < 1) {
      // Add any new fields that didn't exist in version 0
      if (!migrated.userPreferences?.schemaVersion) {
        migrated.userPreferences = { ...migrated.userPreferences, schemaVersion: 1 };
      }
    }

    // Update schema versions
    Object.keys(migrated).forEach(category => {
      if (migrated[category] && typeof migrated[category] === 'object') {
        migrated[category].schemaVersion = toVersion;
        migrated[category].lastModified = new Date();
      }
    });

    return migrated;
  }

  /**
   * Gets the current schema version
   */
  static getCurrentSchemaVersion(): number {
    return 1;
  }

  /**
   * Calculates settings diff between two configurations
   */
  static calculateDiff(oldSettings: LocalSettingsConfig, newSettings: LocalSettingsConfig): Record<string, any> {
    const diff: Record<string, any> = {};

    Object.entries(newSettings).forEach(([category, categorySettings]) => {
      const oldCategorySettings = oldSettings[category as keyof LocalSettingsConfig];
      const categoryDiff: Record<string, any> = {};

      Object.entries(categorySettings as any).forEach(([key, value]) => {
        const oldValue = (oldCategorySettings as any)?.[key];
        if (JSON.stringify(oldValue) !== JSON.stringify(value)) {
          categoryDiff[key] = { old: oldValue, new: value };
        }
      });

      if (Object.keys(categoryDiff).length > 0) {
        diff[category] = categoryDiff;
      }
    });

    return diff;
  }

  /**
   * Applies theme to DOM
   */
  static applyTheme(themeSettings: LocalSettingsConfig['themeSettings']): void {
    const root = document.documentElement;
    
    // Apply font settings
    root.style.setProperty('--font-family-primary', themeSettings.fontFamily);
    root.style.setProperty('--ui-scale', themeSettings.uiScale.toString());
    root.style.setProperty('--sidebar-width', `${themeSettings.sidebarWidth}px`);
    
    // Apply theme mode
    root.setAttribute('data-theme', themeSettings.activeTheme);
    
    // Apply accessibility settings
    if (themeSettings.reduceMotion) {
      root.style.setProperty('--animation-duration', '0s');
      root.style.setProperty('--transition-duration', '0s');
    }
    
    if (themeSettings.highContrast) {
      root.setAttribute('data-high-contrast', 'true');
    } else {
      root.removeAttribute('data-high-contrast');
    }
    
    // Apply font size
    const fontSizeMap = {
      'small': '0.875rem',
      'medium': '1rem',
      'large': '1.125rem',
      'extra-large': '1.25rem',
    };
    root.style.setProperty('--font-size-base', fontSizeMap[themeSettings.fontSize]);
    
    // Apply custom theme if active
    const activeCustomTheme = themeSettings.customThemes.find(theme => 
      theme.id === themeSettings.activeTheme
    );
    
    if (activeCustomTheme) {
      Object.entries(activeCustomTheme.colors).forEach(([colorName, colorValue]) => {
        root.style.setProperty(`--color-${colorName}`, colorValue);
      });
    }
  }

  /**
   * Gets system information
   */
  static getSystemInfo() {
    return {
      platform: typeof navigator !== 'undefined' ? navigator.platform : 'unknown',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      language: typeof navigator !== 'undefined' ? navigator.language : 'en-US',
      hardwareConcurrency: typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 4 : 4,
      deviceMemory: typeof navigator !== 'undefined' ? (navigator as any).deviceMemory || 4 : 4,
      connection: typeof navigator !== 'undefined' ? (navigator as any).connection : null,
      cookieEnabled: typeof navigator !== 'undefined' ? navigator.cookieEnabled : false,
      onLine: typeof navigator !== 'undefined' ? navigator.onLine : true,
    };
  }

  /**
   * Formats file size in human readable format
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Generates a secure random string for encryption keys
   */
  static generateSecureKey(length: number = 32): string {
    const array = new Uint8Array(length);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(array);
    } else {
      // Fallback for environments without crypto
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
    }
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }
}