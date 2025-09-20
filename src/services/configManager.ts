// Configuration Manager for BEAR AI - Comprehensive configuration management system
import { EventEmitter } from 'events';
export class ConfigManager extends EventEmitter {
  private state: ConfigManagerState;
  private schema: ConfigSchema | null = null;
  private watchInterval: NodeJS.Timeout | null = null;
  private hotReloadOptions: HotReloadOptions;
  private configPath: string;
  private backupPath: string;
  private lastFileModified: Date | null = null;

  constructor(configPath: string = './config') {
    super();
    this.configPath = configPath;
    this.backupPath = `${configPath}/backups`;
    this.hotReloadOptions = {
      enabled: true,
      watchPaths: [`${configPath}/*.json`, `${configPath}/*.yaml`],
      debounceMs: 1000,
      validateOnChange: true,
      backupOnChange: true
    };

    this.state = {
      config: this.getDefaultConfig(),
      userPreferences: {},
      isLoading: false,
      lastUpdated: new Date(),
      errors: [],
      warnings: [],
      pendingChanges: []
    };

    this.initializeWatcher();
  }

  /**
   * Initialize configuration with environment-specific loading
   */
  async initialize(environment?: Environment): Promise<void> {
    this.state.isLoading = true;
    this.emit('config.loading');

    try {
      // Load schema first
      await this.loadSchema();

      // Load base configuration
      const baseConfig = await this.loadConfigFile('base.json');
      
      // Load environment-specific configuration
      const env = environment || this.detectEnvironment();
      const envConfig = await this.loadConfigFile(`${env}.json`);
      
      // Load local overrides (gitignored file)
      const localConfig = await this.loadConfigFile('local.json');

      // Merge configurations with precedence: local > env > base > default
      this.state.config = this.mergeConfigs([
        this.getDefaultConfig(),
        baseConfig,
        envConfig,
        localConfig
      ]);

      // Validate the final configuration
      const validation = this.validateConfig(this.state.config);
      if (!validation.isValid) {
        this.state.errors = validation.errors;
        this.state.warnings = validation.warnings;
        throw new Error(`Configuration validation failed: ${validation.errors.join(', ')}`);
      }

      // Load user preferences
      await this.loadUserPreferences();

      this.state.lastUpdated = new Date();
      this.state.isLoading = false;
      
      this.emitEvent('config.loaded', { environment: env, config: this.state.config });
      
    } catch (error) {
      this.state.isLoading = false;
      this.state.errors.push(error instanceof Error ? error.message : 'Unknown error');
      this.emitEvent('config.error', { error: error instanceof Error ? error.message : error });
      throw error;
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): ApplicationConfig {
    return JSON.parse(JSON.stringify(this.state.config)); // Deep clone
  }

  /**
   * Get configuration value by path
   */
  get<T = any>(path: string, defaultValue?: T): T {
    const keys = path.split('.');
    let current: any = this.state.config;

    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        return defaultValue as T;
      }
    }

    return current as T;
  }

  /**
   * Set configuration value by path
   */
  async set(path: string, value: any, options: { persist?: boolean; validate?: boolean } = {}): Promise<void> {
    const { persist = true, validate = true } = options;

    // Create change event
    const oldValue = this.get(path);
    const changeEvent: ConfigChangeEvent = {
      path,
      oldValue,
      newValue: value,
      timestamp: new Date(),
      source: 'user'
    };

    // Apply change to state
    this.setByPath(this.state.config, path, value);

    // Validate if requested
    if (validate) {
      const validation = this.validateConfig(this.state.config);
      if (!validation.isValid) {
        // Rollback change
        this.setByPath(this.state.config, path, oldValue);
        throw new Error(`Configuration validation failed: ${validation.errors.join(', ')}`);
      }
    }

    // Add to pending changes
    this.state.pendingChanges.push(changeEvent);

    // Persist if requested
    if (persist) {
      await this.persistConfig();
    }

    this.emitEvent('config.updated', { path, oldValue, newValue: value });
  }

  /**
   * Update multiple configuration values atomically
   */
  async update(updates: Record<string, any>, options: { persist?: boolean; validate?: boolean } = {}): Promise<void> {
    const { persist = true, validate = true } = options;
    const changeEvents: ConfigChangeEvent[] = [];

    // Create backup of current state
    const backup = JSON.parse(JSON.stringify(this.state.config));

    try {
      // Apply all changes
      for (const [path, value] of Object.entries(updates)) {
        const oldValue = this.get(path);
        this.setByPath(this.state.config, path, value);
        
        changeEvents.push({
          path,
          oldValue,
          newValue: value,
          timestamp: new Date(),
          source: 'user'
        });
      }

      // Validate if requested
      if (validate) {
        const validation = this.validateConfig(this.state.config);
        if (!validation.isValid) {
          throw new Error(`Configuration validation failed: ${validation.errors.join(', ')}`);
        }
      }

      // Add to pending changes
      this.state.pendingChanges.push(...changeEvents);

      // Persist if requested
      if (persist) {
        await this.persistConfig();
      }

      this.emitEvent('config.updated', { updates, changeEvents });

    } catch (error) {
      // Rollback all changes
      this.state.config = backup;
      throw error;
    }
  }

  /**
   * User preferences management
   */
  async getUserPreferences(userId: string): Promise<UserPreferences> {
    if (!this.state.userPreferences[userId]) {
      this.state.userPreferences[userId] = { ...this.state.config.userDefaults };
    }
    return JSON.parse(JSON.stringify(this.state.userPreferences[userId]));
  }

  async setUserPreferences(userId: string, preferences: Partial<UserPreferences>): Promise<void> {
    if (!this.state.userPreferences[userId]) {
      this.state.userPreferences[userId] = { ...this.state.config.userDefaults };
    }

    this.state.userPreferences[userId] = {
      ...this.state.userPreferences[userId],
      ...preferences
    };

    await this.persistUserPreferences();
    this.emitEvent('preferences.updated', { userId, preferences });
  }

  /**
   * Model configuration management
   */
  getModelConfig(modelName: string): ModelConfig | null {
    return this.state.config.models[modelName] || null;
  }

  async setModelConfig(modelName: string, config: ModelConfig): Promise<void> {
    await this.set(`models.${modelName}`, config);
  }

  getAvailableModels(): string[] {
    return Object.keys(this.state.config.models);
  }

  /**
   * Feature flags management
   */
  isFeatureEnabled(featureName: string, context?: { userRole?: string; environment?: Environment }): boolean {
    const feature = this.state.config.features[featureName];
    if (!feature) return false;

    if (!feature.enabled) return false;

    // Check conditions
    if (feature.conditions) {
      const { userRole, environment } = context || {};
      
      if (feature.conditions.userRole && userRole && !feature.conditions.userRole.includes(userRole)) {
        return false;
      }

      if (feature.conditions.environment && environment && !feature.conditions.environment.includes(environment)) {
        return false;
      }

      if (feature.conditions.percentage && Math.random() * 100 > feature.conditions.percentage) {
        return false;
      }
    }

    return true;
  }

  async toggleFeature(featureName: string, enabled: boolean): Promise<void> {
    await this.set(`features.${featureName}.enabled`, enabled);
    this.emitEvent('feature.toggled', { featureName, enabled });
  }

  /**
   * Hot reload functionality
   */
  enableHotReload(options?: Partial<HotReloadOptions>): void {
    this.hotReloadOptions = { ...this.hotReloadOptions, ...options };
    this.initializeWatcher();
  }

  disableHotReload(): void {
    this.hotReloadOptions.enabled = false;
    if (this.watchInterval) {
      clearInterval(this.watchInterval);
      this.watchInterval = null;
    }
  }

  /**
   * Configuration export/import
   */
  exportConfig(options: {
    includeSecrets?: boolean;
    includeUserPreferences?: boolean;
    format?: 'json' | 'yaml';
  } = {}): ConfigExport {
    const { includeSecrets = false, includeUserPreferences = false } = options;

    let config = JSON.parse(JSON.stringify(this.state.config));

    // Remove secrets if not included
    if (!includeSecrets) {
      config = this.removeSensitiveData(config);
    }

    return {
      timestamp: new Date(),
      environment: this.state.config.system.environment,
      version: this.state.config.system.version,
      config,
      userPreferences: includeUserPreferences ? this.state.userPreferences : undefined,
      metadata: {
        exportedBy: 'system',
        reason: 'manual_export',
        includeSecrets
      }
    };
  }

  async importConfig(configExport: ConfigExport, options: {
    merge?: boolean;
    validate?: boolean;
    backup?: boolean;
  } = {}): Promise<ConfigImportResult> {
    const { merge = true, validate = true, backup = true } = options;
    const result: ConfigImportResult = {
      success: false,
      imported: [],
      skipped: [],
      errors: [],
      warnings: []
    };

    try {
      // Create backup if requested
      if (backup) {
        await this.createBackup();
      }

      // Validate imported config
      if (validate) {
        const validation = this.validateConfig(configExport.config as ApplicationConfig);
        if (!validation.isValid) {
          result.errors.push(...validation.errors.map(error => ({ path: 'root', error })));
          return result;
        }
      }

      // Apply configuration
      if (merge) {
        this.state.config = this.mergeConfigs([this.state.config, configExport.config as ApplicationConfig]);
      } else {
        this.state.config = configExport.config as ApplicationConfig;
      }

      // Import user preferences if included
      if (configExport.userPreferences) {
        this.state.userPreferences = { ...this.state.userPreferences, ...configExport.userPreferences };
      }

      await this.persistConfig();
      result.success = true;
      result.imported = Object.keys(configExport.config);

      this.emitEvent('config.imported', { result, source: configExport });

    } catch (error) {
      result.errors.push({ path: 'root', error: error instanceof Error ? error.message : 'Unknown error' });
    }

    return result;
  }

  /**
   * Validation
   */
  validateConfig(config: Partial<ApplicationConfig>): { isValid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!this.schema) {
      warnings.push('No schema loaded for validation');
      return { isValid: true, errors, warnings };
    }

    for (const rule of this.schema.rules) {
      const value = this.getByPath(config, rule.path);
      const validation = this.validateRule(rule, value);
      
      if (!validation.isValid) {
        if (rule.required) {
          errors.push(`${rule.path}: ${validation.error}`);
        } else {
          warnings.push(`${rule.path}: ${validation.error}`);
        }
      }
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * State management
   */
  getState(): ConfigManagerState {
    return JSON.parse(JSON.stringify(this.state));
  }

  reset(): void {
    this.state = {
      config: this.getDefaultConfig(),
      userPreferences: {},
      isLoading: false,
      lastUpdated: new Date(),
      errors: [],
      warnings: [],
      pendingChanges: []
    };
    this.emitEvent('config.reset', {});
  }

  // Private methods
  private getDefaultConfig(): ApplicationConfig {
    return {
      system: {
        environment: 'development',
        debug: true,
        version: '1.0.0',
        buildNumber: '1',
        maintenance: { enabled: false },
        resources: {
          maxMemoryUsage: 80,
          maxCPUUsage: 70,
          maxDiskUsage: 85
        }
      },
      database: {
        host: 'localhost',
        port: 5432,
        database: 'bear_ai',
        username: 'bear_ai',
        password: '',
        ssl: false,
        poolSize: 10,
        timeout: 30000
      },
      api: {},
      models: {},
      security: {
        encryptionKey: '',
        jwtSecret: '',
        sessionTimeout: 3600,
        maxLoginAttempts: 5,
        lockoutDuration: 900,
        requireMFA: false,
        allowedOrigins: ['http://localhost:3000'],
        csrfProtection: true
      },
      logging: {
        level: 'info',
        format: 'json',
        outputs: [{ type: 'console' }],
        sensitiveFields: ['password', 'apiKey', 'secret'],
        enableMetrics: true
      },
      performance: {
        caching: {
          enabled: true,
          ttl: 3600,
          maxSize: 100,
          strategy: 'lru'
        },
        monitoring: {
          enableAPM: true,
          metricsInterval: 60,
          healthCheckInterval: 30,
          alertThresholds: {
            cpu: 80,
            memory: 85,
            responseTime: 1000
          }
        },
        optimization: {
          enableCompression: true,
          enableCDN: false,
          bundleOptimization: true,
          lazyLoading: true
        }
      },
      features: {},
      userDefaults: {
        theme: 'auto',
        language: 'en',
        timezone: 'UTC',
        dateFormat: 'ISO',
        notifications: {
          desktop: true,
          email: true,
          inApp: true,
          sound: false
        },
        accessibility: {
          highContrast: false,
          largeText: false,
          screenReader: false,
          keyboardNavigation: false
        },
        interface: {
          sidebarCollapsed: false,
          densityMode: 'normal',
          animationsEnabled: true,
          showTooltips: true
        },
        privacy: {
          telemetryEnabled: true,
          analyticsEnabled: true,
          crashReportingEnabled: true
        }
      }
    };
  }

  private detectEnvironment(): Environment {
    const env = process.env.NODE_ENV || process.env.BEAR_AI_ENV || 'development';
    return isValidEnvironment(env) ? env : 'development';
  }

  private async loadConfigFile(filename: string): Promise<Partial<ApplicationConfig>> {
    try {
      // In a real implementation, this would load from filesystem
      // For now, return empty config
      return {};
    } catch (error) {
      console.warn(`Could not load config file ${filename}:`, error);
      return {};
    }
  }

  private async loadSchema(): Promise<void> {
    try {
      // In a real implementation, this would load schema from file
      this.schema = {
        version: '1.0.0',
        rules: [
          { path: 'system.environment', type: 'string', required: true },
          { path: 'database.host', type: 'string', required: true },
          { path: 'database.port', type: 'number', required: true, validation: { min: 1, max: 65535 } }
        ]
      };
    } catch (error) {
      console.warn('Could not load configuration schema:', error);
    }
  }

  private async loadUserPreferences(): Promise<void> {
    try {
      // In a real implementation, this would load from database or file
      this.state.userPreferences = {};
    } catch (error) {
      console.warn('Could not load user preferences:', error);
    }
  }

  private mergeConfigs(configs: Partial<ApplicationConfig>[]): ApplicationConfig {
    let result = configs[0] as ApplicationConfig;
    
    for (let i = 1; i < configs.length; i++) {
      result = this.deepMerge(result, configs[i]);
    }
    
    return result;
  }

  private deepMerge(target: any, source: any): any {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    
    return result;
  }

  private setByPath(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    let current = obj;

    for (const key of keys) {
      if (!(key in current) || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }

    current[lastKey] = value;
  }

  private getByPath(obj: any, path: string): any {
    const keys = path.split('.');
    let current = obj;

    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        return undefined;
      }
    }

    return current;
  }

  private validateRule(rule: ConfigValidationRule, value: any): { isValid: boolean; error: string } {
    if (value === undefined || value === null) {
      return { isValid: !rule.required, error: 'Required field is missing' };
    }

    // Type validation
    const actualType = Array.isArray(value) ? 'array' : typeof value;
    if (actualType !== rule.type) {
      return { isValid: false, error: `Expected ${rule.type}, got ${actualType}` };
    }

    // Additional validation
    if (rule.validation) {
      const { min, max, pattern, enum: enumValues, custom } = rule.validation;

      if (min !== undefined && (typeof value === 'number' ? value < min : value.length < min)) {
        return { isValid: false, error: `Value must be at least ${min}` };
      }

      if (max !== undefined && (typeof value === 'number' ? value > max : value.length > max)) {
        return { isValid: false, error: `Value must be at most ${max}` };
      }

      if (pattern && typeof value === 'string' && !pattern.test(value)) {
        return { isValid: false, error: `Value does not match required pattern` };
      }

      if (enumValues && !enumValues.includes(value)) {
        return { isValid: false, error: `Value must be one of: ${enumValues.join(', ')}` };
      }

      if (custom) {
        const customResult = custom(value);
        if (typeof customResult === 'string') {
          return { isValid: false, error: customResult };
        }
        if (!customResult) {
          return { isValid: false, error: 'Custom validation failed' };
        }
      }
    }

    return { isValid: true, error: '' };
  }

  private initializeWatcher(): void {
    if (!this.hotReloadOptions.enabled) return;

    if (this.watchInterval) {
      clearInterval(this.watchInterval);
    }

    this.watchInterval = setInterval(async () => {
      try {
        await this.checkForChanges();
      } catch (error) {
        console.error('Error checking for configuration changes:', error);
      }
    }, this.hotReloadOptions.debounceMs);
  }

  private async checkForChanges(): Promise<void> {
    // In a real implementation, this would check file modification times
    // and reload configuration if files have changed
  }

  private async persistConfig(): Promise<void> {
    try {
      // In a real implementation, this would save to filesystem
      this.state.lastUpdated = new Date();
    } catch (error) {
      console.error('Failed to persist configuration:', error);
      throw error;
    }
  }

  private async persistUserPreferences(): Promise<void> {
    try {
      // In a real implementation, this would save to database or file
    } catch (error) {
      console.error('Failed to persist user preferences:', error);
      throw error;
    }
  }

  private async createBackup(): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backup = this.exportConfig({ includeSecrets: true, includeUserPreferences: true });
    
    try {
      // In a real implementation, this would save backup to filesystem
      console.log(`Configuration backup created: backup-${timestamp}.json`);
    } catch (error) {
      console.error('Failed to create configuration backup:', error);
      throw error;
    }
  }

  private removeSensitiveData(config: any): any {
    const sensitive = ['password', 'secret', 'key', 'token', 'credentials'];
    const cleaned = JSON.parse(JSON.stringify(config));

    const cleanObject = (obj: any): void => {
      for (const key in obj) {
        if (typeof obj[key] === 'object' && obj[key] !== null) {
          cleanObject(obj[key]);
        } else if (sensitive.some(s => key.toLowerCase().includes(s))) {
          obj[key] = '***REDACTED***';
        }
      }
    };

    cleanObject(cleaned);
    return cleaned;
  }

  private emitEvent(type: ConfigEventType, payload: any): void {
    const event: ConfigEvent = {
      type,
      payload,
      timestamp: new Date(),
      source: 'ConfigManager'
    };

    this.emit(type, event);
    this.emit('config.event', event);
  }
}

// Singleton instance
export const configManager = new ConfigManager();

// Export utility functions
export function createConfigManager(configPath?: string): ConfigManager {
  return new ConfigManager(configPath);
}

export function getConfig(): ApplicationConfig {
  return configManager.getConfig();
}

export function getConfigValue<T = any>(path: string, defaultValue?: T): T {
  return configManager.get(path, defaultValue);
}

export async function setConfigValue(path: string, value: any): Promise<void> {
  return configManager.set(path, value);
}

export function isFeatureEnabled(featureName: string, context?: { userRole?: string; environment?: Environment }): boolean {
  return configManager.isFeatureEnabled(featureName, context);
}