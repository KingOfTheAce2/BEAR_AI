/**
 * BEAR AI Plugin Configuration Manager
 * Manages plugin settings, configuration schemas, and user preferences
 */

import { EventEmitter } from 'events';
import { PluginManifest, PluginConfigSchema, ValidationResult } from './types';

export class PluginConfigManager extends EventEmitter {
  private configs: Map<string, PluginConfig> = new Map();
  private schemas: Map<string, PluginConfigSchema> = new Map();
  private globalSettings: GlobalPluginSettings;
  private initialized: boolean = false;

  constructor() {
    super();
    this.globalSettings = {
      enableAutoUpdate: false,
      enableTelemetry: false,
      maxPluginMemory: 100 * 1024 * 1024, // 100MB
      maxPluginStorage: 50 * 1024 * 1024,  // 50MB
      allowNetworkAccess: false,
      securityLevel: 'strict',
      debugMode: false
    };
  }

  /**
   * Initialize configuration manager
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Load global settings
      await this.loadGlobalSettings();
      
      // Load plugin configurations
      await this.loadPluginConfigs();
      
      this.initialized = true;
      this.emit('initialized');
    } catch (error) {
      this.emit('error', { type: 'initialization', error });
      throw error;
    }
  }

  /**
   * Get default configuration for a plugin
   */
  async getDefaultConfig(manifest: PluginManifest): Promise<Record<string, any>> {
    if (!manifest.config) {
      return {};
    }

    const defaultConfig: Record<string, any> = {};
    
    for (const [key, fieldSchema] of Object.entries(manifest.config)) {
      if (fieldSchema.default !== undefined) {
        defaultConfig[key] = fieldSchema.default;
      } else {
        // Set type-appropriate defaults
        switch (fieldSchema.type) {
          case 'string':
            defaultConfig[key] = '';
            break;
          case 'number':
            defaultConfig[key] = 0;
            break;
          case 'boolean':
            defaultConfig[key] = false;
            break;
          case 'select':
            defaultConfig[key] = fieldSchema.options?.[0]?.value || null;
            break;
          case 'multiselect':
            defaultConfig[key] = [];
            break;
          case 'json':
            defaultConfig[key] = {};
            break;
        }
      }
    }

    // Store schema for validation
    this.schemas.set(manifest.id, manifest.config);
    
    return defaultConfig;
  }

  /**
   * Get plugin configuration
   */
  getPluginConfig(pluginId: string): PluginConfig | null {
    return this.configs.get(pluginId) || null;
  }

  /**
   * Update plugin configuration
   */
  async updatePluginConfig(
    pluginId: string,
    updates: Partial<Record<string, any>>,
    validate: boolean = true
  ): Promise<void> {
    try {
      let config = this.configs.get(pluginId);
      if (!config) {
        config = {
          pluginId,
          settings: {},
          enabled: true,
          lastModified: new Date(),
          version: '1.0.0'
        };
        this.configs.set(pluginId, config);
      }

      // Create updated settings
      const newSettings = { ...config.settings, ...updates };

      // Validate if requested and schema exists
      if (validate) {
        const schema = this.schemas.get(pluginId);
        if (schema) {
          const validation = this.validateConfig(newSettings, schema);
          if (!validation.valid) {
            throw new Error(`Configuration validation failed: ${validation.errors.join(', ')}`);
          }
        }
      }

      // Update configuration
      config.settings = newSettings;
      config.lastModified = new Date();

      // Save to storage
      await this.savePluginConfig(pluginId, config);

      this.emit('config:updated', { pluginId, config, updates });
    } catch (error) {
      this.emit('error', { type: 'config_update', pluginId, error });
      throw error;
    }
  }

  /**
   * Reset plugin configuration to defaults
   */
  async resetPluginConfig(pluginId: string): Promise<void> {
    try {
      const schema = this.schemas.get(pluginId);
      if (!schema) {
        throw new Error(`No schema found for plugin ${pluginId}`);
      }

      const defaultConfig = await this.getDefaultConfigFromSchema(schema);
      
      const config: PluginConfig = {
        pluginId,
        settings: defaultConfig,
        enabled: true,
        lastModified: new Date(),
        version: '1.0.0'
      };

      this.configs.set(pluginId, config);
      await this.savePluginConfig(pluginId, config);

      this.emit('config:reset', { pluginId, config });
    } catch (error) {
      this.emit('error', { type: 'config_reset', pluginId, error });
      throw error;
    }
  }

  /**
   * Get configuration schema for a plugin
   */
  getConfigSchema(pluginId: string): PluginConfigSchema | null {
    return this.schemas.get(pluginId) || null;
  }

  /**
   * Validate configuration against schema
   */
  validateConfig(config: Record<string, any>, schema: PluginConfigSchema): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      for (const [key, fieldSchema] of Object.entries(schema)) {
        const value = config[key];

        // Check required fields
        if (fieldSchema.required && (value === undefined || value === null || value === '')) {
          errors.push(`Field '${key}' is required`);
          continue;
        }

        if (value === undefined || value === null) continue;

        // Type validation
        const typeValid = this.validateFieldType(value, fieldSchema);
        if (!typeValid.valid) {
          errors.push(...typeValid.errors);
        }

        // Value validation
        const valueValid = this.validateFieldValue(value, fieldSchema, key);
        if (!valueValid.valid) {
          errors.push(...valueValid.errors);
        }
        warnings.push(...valueValid.warnings);
      }

      // Check for unknown fields
      for (const key of Object.keys(config)) {
        if (!(key in schema)) {
          warnings.push(`Unknown configuration field: ${key}`);
        }
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings
      };
    } catch (error) {
      return {
        valid: false,
        errors: [`Configuration validation error: ${error.message}`]
      };
    }
  }

  /**
   * Export plugin configuration
   */
  exportPluginConfig(pluginId: string): string {
    const config = this.configs.get(pluginId);
    if (!config) {
      throw new Error(`Configuration not found for plugin ${pluginId}`);
    }

    const exportData = {
      pluginId,
      settings: config.settings,
      exportedAt: new Date().toISOString(),
      version: config.version
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Import plugin configuration
   */
  async importPluginConfig(pluginId: string, configData: string): Promise<void> {
    try {
      const importData = JSON.parse(configData);
      
      if (importData.pluginId !== pluginId) {
        throw new Error('Plugin ID mismatch');
      }

      await this.updatePluginConfig(pluginId, importData.settings, true);
      
      this.emit('config:imported', { pluginId });
    } catch (error) {
      this.emit('error', { type: 'config_import', pluginId, error });
      throw error;
    }
  }

  /**
   * Get global plugin settings
   */
  getGlobalSettings(): GlobalPluginSettings {
    return { ...this.globalSettings };
  }

  /**
   * Update global plugin settings
   */
  async updateGlobalSettings(updates: Partial<GlobalPluginSettings>): Promise<void> {
    try {
      this.globalSettings = { ...this.globalSettings, ...updates };
      await this.saveGlobalSettings();
      
      this.emit('global_settings:updated', { settings: this.globalSettings, updates });
    } catch (error) {
      this.emit('error', { type: 'global_settings_update', error });
      throw error;
    }
  }

  /**
   * Generate configuration UI metadata
   */
  generateConfigUI(pluginId: string): ConfigUIMetadata | null {
    const schema = this.schemas.get(pluginId);
    const config = this.configs.get(pluginId);
    
    if (!schema) return null;

    const sections: ConfigSection[] = [];
    const currentSection: ConfigSection = {
      id: 'main',
      title: 'Configuration',
      fields: []
    };

    for (const [key, fieldSchema] of Object.entries(schema)) {
      const field: ConfigField = {
        id: key,
        label: fieldSchema.label,
        description: fieldSchema.description,
        type: fieldSchema.type,
        required: fieldSchema.required || false,
        value: config?.settings[key] || fieldSchema.default,
        options: fieldSchema.options,
        validation: fieldSchema.validation
      };

      currentSection.fields.push(field);
    }

    if (currentSection.fields.length > 0) {
      sections.push(currentSection);
    }

    return {
      pluginId,
      sections,
      schema: schema
    };
  }

  /**
   * Create configuration backup
   */
  async createConfigBackup(pluginId: string): Promise<string> {
    try {
      const config = this.configs.get(pluginId);
      if (!config) {
        throw new Error(`Configuration not found for plugin ${pluginId}`);
      }

      const timestamp = new Date().toISOString();
      const backupKey = `config_backup_${pluginId}_${timestamp.replace(/[:.]/g, '-')}`;
      const backupData = {
        ...config,
        backupCreatedAt: timestamp
      };

      localStorage.setItem(backupKey, JSON.stringify(backupData));
      
      this.emit('config:backup_created', { pluginId, timestamp });
      return timestamp;
    } catch (error) {
      this.emit('error', { type: 'config_backup', pluginId, error });
      throw error;
    }
  }

  /**
   * Get configuration backups
   */
  getConfigBackups(pluginId: string): ConfigBackup[] {
    const backups: ConfigBackup[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(`config_backup_${pluginId}_`)) {
        try {
          const data = JSON.parse(localStorage.getItem(key) || '{}');
          backups.push({
            pluginId,
            timestamp: new Date(data.backupCreatedAt),
            version: data.version || 'unknown',
            size: localStorage.getItem(key)?.length || 0
          });
        } catch (error) {
          console.warn(`Failed to parse backup data for ${key}:`, error);
        }
      }
    }
    
    return backups.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Restore configuration from backup
   */
  async restoreConfigFromBackup(pluginId: string, timestamp: Date): Promise<void> {
    try {
      const timestampStr = timestamp.toISOString().replace(/[:.]/g, '-');
      const backupKey = `config_backup_${pluginId}_${timestampStr}`;
      const backupData = localStorage.getItem(backupKey);
      
      if (!backupData) {
        throw new Error('Backup not found');
      }

      const config: PluginConfig = JSON.parse(backupData);
      config.lastModified = new Date();
      
      this.configs.set(pluginId, config);
      await this.savePluginConfig(pluginId, config);
      
      this.emit('config:restored', { pluginId, timestamp });
    } catch (error) {
      this.emit('error', { type: 'config_restore', pluginId, error });
      throw error;
    }
  }

  /**
   * Shutdown configuration manager
   */
  async shutdown(): Promise<void> {
    // Save all configurations
    for (const [pluginId, config] of this.configs.entries()) {
      await this.savePluginConfig(pluginId, config);
    }
    
    await this.saveGlobalSettings();
    
    this.initialized = false;
    this.emit('shutdown');
  }

  private async loadGlobalSettings(): Promise<void> {
    try {
      const stored = localStorage.getItem('bear_global_plugin_settings');
      if (stored) {
        const settings = JSON.parse(stored);
        this.globalSettings = { ...this.globalSettings, ...settings };
      }
    } catch (error) {
      console.warn('Failed to load global settings:', error);
    }
  }

  private async saveGlobalSettings(): Promise<void> {
    try {
      localStorage.setItem('bear_global_plugin_settings', JSON.stringify(this.globalSettings));
    } catch (error) {
      this.emit('error', { type: 'global_settings_save', error });
    }
  }

  private async loadPluginConfigs(): Promise<void> {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('plugin_config_')) {
        try {
          const pluginId = key.substring('plugin_config_'.length);
          const configData = localStorage.getItem(key);
          if (configData) {
            const config: PluginConfig = JSON.parse(configData);
            this.configs.set(pluginId, config);
          }
        } catch (error) {
          console.warn(`Failed to load config for ${key}:`, error);
        }
      }
    }
  }

  private async savePluginConfig(pluginId: string, config: PluginConfig): Promise<void> {
    try {
      localStorage.setItem(`plugin_config_${pluginId}`, JSON.stringify(config));
    } catch (error) {
      this.emit('error', { type: 'config_save', pluginId, error });
    }
  }

  private async getDefaultConfigFromSchema(schema: PluginConfigSchema): Promise<Record<string, any>> {
    const config: Record<string, any> = {};
    
    for (const [key, fieldSchema] of Object.entries(schema)) {
      config[key] = fieldSchema.default;
    }
    
    return config;
  }

  private validateFieldType(value: any, fieldSchema: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    switch (fieldSchema.type) {
      case 'string':
        if (typeof value !== 'string') {
          errors.push(`Value must be a string`);
        }
        break;
      case 'number':
        if (typeof value !== 'number' || isNaN(value)) {
          errors.push(`Value must be a number`);
        }
        break;
      case 'boolean':
        if (typeof value !== 'boolean') {
          errors.push(`Value must be a boolean`);
        }
        break;
      case 'select':
        if (fieldSchema.options && !fieldSchema.options.some((opt: any) => opt.value === value)) {
          errors.push(`Value must be one of the allowed options`);
        }
        break;
      case 'multiselect':
        if (!Array.isArray(value)) {
          errors.push(`Value must be an array`);
        }
        break;
      case 'json':
        if (typeof value === 'string') {
          try {
            JSON.parse(value);
          } catch (e) {
            errors.push(`Value must be valid JSON`);
          }
        } else if (typeof value !== 'object') {
          errors.push(`Value must be valid JSON`);
        }
        break;
    }

    return { valid: errors.length === 0, errors };
  }

  private validateFieldValue(value: any, fieldSchema: any, fieldName: string): { valid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!fieldSchema.validation) {
      return { valid: true, errors, warnings };
    }

    const validation = fieldSchema.validation;

    // String validations
    if (typeof value === 'string') {
      if (validation.minLength && value.length < validation.minLength) {
        errors.push(`${fieldName} must be at least ${validation.minLength} characters`);
      }
      if (validation.maxLength && value.length > validation.maxLength) {
        errors.push(`${fieldName} must be at most ${validation.maxLength} characters`);
      }
      if (validation.pattern && !new RegExp(validation.pattern).test(value)) {
        errors.push(`${fieldName} format is invalid`);
      }
    }

    // Number validations
    if (typeof value === 'number') {
      if (validation.min !== undefined && value < validation.min) {
        errors.push(`${fieldName} must be at least ${validation.min}`);
      }
      if (validation.max !== undefined && value > validation.max) {
        errors.push(`${fieldName} must be at most ${validation.max}`);
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }
}

interface PluginConfig {
  pluginId: string;
  settings: Record<string, any>;
  enabled: boolean;
  lastModified: Date;
  version: string;
}

interface GlobalPluginSettings {
  enableAutoUpdate: boolean;
  enableTelemetry: boolean;
  maxPluginMemory: number;
  maxPluginStorage: number;
  allowNetworkAccess: boolean;
  securityLevel: 'strict' | 'moderate' | 'relaxed';
  debugMode: boolean;
}

interface ConfigUIMetadata {
  pluginId: string;
  sections: ConfigSection[];
  schema: PluginConfigSchema;
}

interface ConfigSection {
  id: string;
  title: string;
  fields: ConfigField[];
}

interface ConfigField {
  id: string;
  label: string;
  description?: string;
  type: string;
  required: boolean;
  value: any;
  options?: Array<{ value: any; label: string }>;
  validation?: any;
}

interface ConfigBackup {
  pluginId: string;
  timestamp: Date;
  version: string;
  size: number;
}
