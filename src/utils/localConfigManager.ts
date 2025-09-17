/**
 * Local Configuration Manager - File-based model configuration with JSON schemas
 * Manages model configurations locally without external dependencies
 */

import { ModelConfig, ModelPriority, ModelType } from '../types/modelTypes';

export interface ModelConfigSchema {
  $schema: string;
  type: 'object';
  properties: Record<string, any>;
  required: string[];
  additionalProperties: boolean;
}

export interface LocalModelConfig extends ModelConfig {
  // Enhanced local configuration fields
  localPath: string;
  configVersion: string;
  lastModified: Date;
  checksum: string;
  isValid: boolean;
  validationErrors: string[];
  localSettings: LocalModelSettings;
}

export interface LocalModelSettings {
  autoLoad: boolean;
  priority: number;
  memoryLimit: number;
  timeout: number;
  retryCount: number;
  cacheEnabled: boolean;
  loggingEnabled: boolean;
  performanceMonitoring: boolean;
  customParameters: Record<string, any>;
  environmentVariables: Record<string, string>;
  dependencies: string[];
  preloadScripts: string[];
  postloadScripts: string[];
}

export interface ConfigValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  schema: string;
}

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
  suggestion?: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  impact: 'low' | 'medium' | 'high';
  recommendation: string;
}

export interface ConfigTemplate {
  name: string;
  description: string;
  modelType: ModelType;
  template: Partial<LocalModelConfig>;
  schema: ModelConfigSchema;
}

export class LocalConfigManager {
  private configs: Map<string, LocalModelConfig> = new Map();
  private schemas: Map<string, ModelConfigSchema> = new Map();
  private templates: Map<string, ConfigTemplate> = new Map();
  private watchedDirectories: Map<string, any> = new Map();
  
  private readonly configFileName = 'bear-ai-model.json';
  private readonly schemaVersion = '1.0.0';
  private readonly defaultTimeout = 30000;

  constructor() {
    this.initializeSchemas();
    this.initializeTemplates();
    this.loadPersistedConfigs();
  }

  /**
   * Create configuration file for a model
   */
  public async createModelConfig(
    modelPath: string,
    baseConfig: Partial<ModelConfig>,
    localSettings?: Partial<LocalModelSettings>
  ): Promise<LocalModelConfig> {
    const configPath = this.getConfigPath(modelPath);
    
    const defaultSettings: LocalModelSettings = {
      autoLoad: false,
      priority: 1,
      memoryLimit: 8 * 1024 * 1024 * 1024, // 8GB
      timeout: this.defaultTimeout,
      retryCount: 3,
      cacheEnabled: true,
      loggingEnabled: true,
      performanceMonitoring: true,
      customParameters: {},
      environmentVariables: {},
      dependencies: [],
      preloadScripts: [],
      postloadScripts: []
    };

    const config: LocalModelConfig = {
      id: baseConfig.id || this.generateModelId(modelPath),
      name: baseConfig.name || this.extractModelName(modelPath),
      path: modelPath,
      type: baseConfig.type || ModelType.GPT4ALL,
      priority: baseConfig.priority ?? ModelPriority.MEDIUM,
      version: baseConfig.version || '1.0.0',
      description: baseConfig.description || '',
      author: baseConfig.author || 'Unknown',
      license: baseConfig.license || 'Unknown',
      tags: baseConfig.tags || [],
      languages: baseConfig.languages || ['en'],
      contextLength: baseConfig.contextLength || 2048,
      parameters: baseConfig.parameters || 0,
      architecture: baseConfig.architecture || 'transformer',
      format: baseConfig.format || 'gguf',
      
      // Local fields
      localPath: configPath,
      configVersion: this.schemaVersion,
      lastModified: new Date(),
      checksum: await this.calculateConfigChecksum(baseConfig),
      isValid: true,
      validationErrors: [],
      localSettings: { ...defaultSettings, ...localSettings }
    };

    // Validate configuration
    const validation = await this.validateConfig(config);
    config.isValid = validation.isValid;
    config.validationErrors = validation.errors.map(e => e.message);

    // Store in memory
    this.configs.set(config.id, config);

    // Write to file
    await this.writeConfigFile(configPath, config);

    return config;
  }

  /**
   * Load configuration from file
   */
  public async loadConfigFromFile(configPath: string): Promise<LocalModelConfig | null> {
    try {
      const configData = await this.readConfigFile(configPath);
      if (!configData) return null;

      const config = await this.parseConfig(configData, configPath);
      
      // Validate loaded configuration
      const validation = await this.validateConfig(config);
      config.isValid = validation.isValid;
      config.validationErrors = validation.errors.map(e => e.message);

      this.configs.set(config.id, config);
      return config;
    } catch (error) {
      console.error(`Failed to load config from ${configPath}:`, error);
      return null;
    }
  }

  /**
   * Discover and load configurations from directory
   */
  public async discoverConfigs(directory: string): Promise<LocalModelConfig[]> {
    const configs: LocalModelConfig[] = [];
    
    try {
      // This would use filesystem APIs in a real implementation
      // For web, we'd need to provide config files or use file input
      const configFiles = await this.findConfigFiles(directory);
      
      for (const configFile of configFiles) {
        const config = await this.loadConfigFromFile(configFile);
        if (config) {
          configs.push(config);
        }
      }

      // Watch directory for changes
      await this.watchDirectory(directory);
      
    } catch (error) {
      console.error(`Failed to discover configs in ${directory}:`, error);
    }

    return configs;
  }

  /**
   * Update model configuration
   */
  public async updateConfig(
    modelId: string,
    updates: Partial<LocalModelConfig>
  ): Promise<LocalModelConfig | null> {
    const existing = this.configs.get(modelId);
    if (!existing) return null;

    const updated: LocalModelConfig = {
      ...existing,
      ...updates,
      lastModified: new Date(),
      checksum: await this.calculateConfigChecksum(updates)
    };

    // Validate updated configuration
    const validation = await this.validateConfig(updated);
    updated.isValid = validation.isValid;
    updated.validationErrors = validation.errors.map(e => e.message);

    // Store in memory
    this.configs.set(modelId, updated);

    // Write to file
    await this.writeConfigFile(updated.localPath, updated);

    return updated;
  }

  /**
   * Validate model configuration against schema
   */
  public async validateConfig(config: LocalModelConfig): Promise<ConfigValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    
    // Get appropriate schema
    const schema = this.getSchemaForModelType(config.type);
    
    // Basic validation
    if (!config.id) {
      errors.push({
        field: 'id',
        message: 'Model ID is required',
        severity: 'error',
        suggestion: 'Generate a unique ID for the model'
      });
    }

    if (!config.name) {
      errors.push({
        field: 'name',
        message: 'Model name is required',
        severity: 'error',
        suggestion: 'Provide a descriptive name for the model'
      });
    }

    if (!config.path) {
      errors.push({
        field: 'path',
        message: 'Model path is required',
        severity: 'error',
        suggestion: 'Specify the path to the model file'
      });
    }

    // Validate local settings
    if (config.localSettings.memoryLimit < 1024 * 1024 * 1024) { // 1GB
      warnings.push({
        field: 'localSettings.memoryLimit',
        message: 'Memory limit is very low',
        impact: 'medium',
        recommendation: 'Consider increasing memory limit for better performance'
      });
    }

    if (config.localSettings.timeout < 5000) {
      warnings.push({
        field: 'localSettings.timeout',
        message: 'Timeout is very short',
        impact: 'high',
        recommendation: 'Increase timeout to prevent premature failures'
      });
    }

    // Validate context length
    if (config.contextLength > 32768) {
      warnings.push({
        field: 'contextLength',
        message: 'Very large context length may impact performance',
        impact: 'medium',
        recommendation: 'Consider reducing context length if not needed'
      });
    }

    // Validate file paths
    const pathValidation = await this.validatePaths(config);
    errors.push(...pathValidation.errors);
    warnings.push(...pathValidation.warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      schema: schema.type
    };
  }

  /**
   * Get configuration template for model type
   */
  public getTemplate(modelType: ModelType): ConfigTemplate | null {
    return this.templates.get(modelType) || null;
  }

  /**
   * Create configuration from template
   */
  public createFromTemplate(
    templateName: string,
    overrides: Partial<LocalModelConfig>
  ): LocalModelConfig {
    const template = this.templates.get(templateName);
    if (!template) {
      throw new Error(`Template not found: ${templateName}`);
    }

    const config: LocalModelConfig = {
      ...template.template,
      ...overrides,
      priority: overrides.priority ?? template.template.priority ?? ModelPriority.MEDIUM,
      configVersion: this.schemaVersion,
      lastModified: new Date(),
      isValid: true,
      validationErrors: []
    } as LocalModelConfig;

    return config;
  }

  /**
   * Export configurations to JSON
   */
  public exportConfigs(modelIds?: string[]): string {
    const configsToExport = modelIds 
      ? modelIds.map(id => this.configs.get(id)).filter(Boolean)
      : Array.from(this.configs.values());

    const exportData = {
      version: this.schemaVersion,
      exportedAt: new Date(),
      configs: configsToExport
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Import configurations from JSON
   */
  public async importConfigs(jsonData: string): Promise<LocalModelConfig[]> {
    try {
      const data = JSON.parse(jsonData);
      const imported: LocalModelConfig[] = [];

      for (const configData of data.configs) {
        const config = await this.parseConfig(configData);
        
        // Validate imported configuration
        const validation = await this.validateConfig(config);
        config.isValid = validation.isValid;
        config.validationErrors = validation.errors.map(e => e.message);

        this.configs.set(config.id, config);
        imported.push(config);

        // Write to file if path is specified
        if (config.localPath) {
          await this.writeConfigFile(config.localPath, config);
        }
      }

      return imported;
    } catch (error) {
      console.error('Failed to import configurations:', error);
      throw error;
    }
  }

  /**
   * Get all configurations
   */
  public getAllConfigs(): LocalModelConfig[] {
    return Array.from(this.configs.values());
  }

  /**
   * Get configuration by ID
   */
  public getConfig(modelId: string): LocalModelConfig | null {
    return this.configs.get(modelId) || null;
  }

  /**
   * Delete configuration
   */
  public async deleteConfig(modelId: string): Promise<boolean> {
    const config = this.configs.get(modelId);
    if (!config) return false;

    try {
      // Remove from memory
      this.configs.delete(modelId);

      // Delete file
      await this.deleteConfigFile(config.localPath);

      return true;
    } catch (error) {
      console.error(`Failed to delete config ${modelId}:`, error);
      return false;
    }
  }

  /**
   * Backup configurations
   */
  public async backupConfigs(backupPath?: string): Promise<string> {
    const backup = {
      version: this.schemaVersion,
      backupDate: new Date(),
      configs: this.getAllConfigs(),
      schemas: Object.fromEntries(this.schemas.entries()),
      templates: Object.fromEntries(this.templates.entries())
    };

    const backupData = JSON.stringify(backup, null, 2);

    if (backupPath) {
      await this.writeFile(backupPath, backupData);
    }

    return backupData;
  }

  /**
   * Restore configurations from backup
   */
  public async restoreConfigs(backupData: string): Promise<void> {
    try {
      const backup = JSON.parse(backupData);
      
      // Clear existing configurations
      this.configs.clear();

      // Restore configurations
      for (const configData of backup.configs) {
        const config = await this.parseConfig(configData);
        this.configs.set(config.id, config);
      }

      // Restore schemas if provided
      if (backup.schemas) {
        this.schemas.clear();
        for (const [key, schema] of Object.entries(backup.schemas)) {
          this.schemas.set(key, schema as ModelConfigSchema);
        }
      }

      // Restore templates if provided
      if (backup.templates) {
        this.templates.clear();
        for (const [key, template] of Object.entries(backup.templates)) {
          this.templates.set(key, template as ConfigTemplate);
        }
      }

      console.log(`Restored ${backup.configs.length} configurations from backup`);
    } catch (error) {
      console.error('Failed to restore configurations:', error);
      throw error;
    }
  }

  // Private methods
  private initializeSchemas(): void {
    // Base model configuration schema
    const baseSchema: ModelConfigSchema = {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      type: 'object',
      properties: {
        id: { type: 'string', minLength: 1 },
        name: { type: 'string', minLength: 1 },
        path: { type: 'string', minLength: 1 },
        type: { type: 'string', enum: Object.values(ModelType) },
        version: { type: 'string' },
        description: { type: 'string' },
        author: { type: 'string' },
        license: { type: 'string' },
        tags: { type: 'array', items: { type: 'string' } },
        languages: { type: 'array', items: { type: 'string' } },
        contextLength: { type: 'number', minimum: 1 },
        parameters: { type: 'number', minimum: 0 },
        architecture: { type: 'string' },
        format: { type: 'string' },
        localSettings: {
          type: 'object',
          properties: {
            autoLoad: { type: 'boolean' },
            priority: { type: 'number', minimum: 0, maximum: 10 },
            memoryLimit: { type: 'number', minimum: 0 },
            timeout: { type: 'number', minimum: 1000 },
            retryCount: { type: 'number', minimum: 0, maximum: 10 },
            cacheEnabled: { type: 'boolean' },
            loggingEnabled: { type: 'boolean' },
            performanceMonitoring: { type: 'boolean' }
          },
          required: ['autoLoad', 'priority', 'memoryLimit', 'timeout']
        }
      },
      required: ['id', 'name', 'path', 'type'],
      additionalProperties: true
    };

    this.schemas.set('base', baseSchema);
    this.schemas.set(ModelType.GPT4ALL, baseSchema);
  }

  private initializeTemplates(): void {
    // GPT4ALL template
    const gpt4allTemplate: ConfigTemplate = {
      name: 'GPT4ALL Model',
      description: 'Template for GPT4ALL local models',
      modelType: ModelType.GPT4ALL,
      template: {
        type: ModelType.GPT4ALL,
        priority: ModelPriority.MEDIUM,
        version: '1.0.0',
        architecture: 'transformer',
        format: 'gguf',
        contextLength: 2048,
        languages: ['en'],
        localSettings: {
          autoLoad: false,
          priority: 1,
          memoryLimit: 8 * 1024 * 1024 * 1024,
          timeout: 30000,
          retryCount: 3,
          cacheEnabled: true,
          loggingEnabled: true,
          performanceMonitoring: true,
          customParameters: {},
          environmentVariables: {},
          dependencies: ['gpt4all'],
          preloadScripts: [],
          postloadScripts: []
        }
      },
      schema: this.schemas.get(ModelType.GPT4ALL)!
    };

    this.templates.set('gpt4all', gpt4allTemplate);
    this.templates.set(ModelType.GPT4ALL, gpt4allTemplate);
  }

  private getSchemaForModelType(modelType: ModelType): ModelConfigSchema {
    return this.schemas.get(modelType) || this.schemas.get('base')!;
  }

  private getConfigPath(modelPath: string): string {
    // Generate config path adjacent to model file
    const pathParts = modelPath.split(/[/\\]/);
    pathParts[pathParts.length - 1] = this.configFileName;
    return pathParts.join('/');
  }

  private generateModelId(modelPath: string): string {
    const fileName = modelPath.split(/[/\\]/).pop() || 'unknown';
    const baseName = fileName.replace(/\.[^.]+$/, '');
    return `model_${baseName}_${Date.now()}`;
  }

  private extractModelName(modelPath: string): string {
    const fileName = modelPath.split(/[/\\]/).pop() || 'Unknown Model';
    return fileName.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
  }

  private async calculateConfigChecksum(config: any): Promise<string> {
    // Simple checksum based on config content
    const configStr = JSON.stringify(config, Object.keys(config).sort());
    return btoa(configStr).slice(0, 16);
  }

  private async parseConfig(configData: any, configPath?: string): Promise<LocalModelConfig> {
    const config: LocalModelConfig = {
      ...configData,
      lastModified: configData.lastModified ? new Date(configData.lastModified) : new Date(),
      localPath: configPath || configData.localPath || '',
      isValid: true,
      validationErrors: []
    };

    if (typeof config.priority === 'undefined') {
      config.priority = ModelPriority.MEDIUM;
    }

    // Ensure local settings exist
    if (!config.localSettings) {
      config.localSettings = {
        autoLoad: false,
        priority: 1,
        memoryLimit: 8 * 1024 * 1024 * 1024,
        timeout: this.defaultTimeout,
        retryCount: 3,
        cacheEnabled: true,
        loggingEnabled: true,
        performanceMonitoring: true,
        customParameters: {},
        environmentVariables: {},
        dependencies: [],
        preloadScripts: [],
        postloadScripts: []
      };
    }

    return config;
  }

  private async validatePaths(config: LocalModelConfig): Promise<{
    errors: ValidationError[];
    warnings: ValidationWarning[];
  }> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // In a real implementation, this would check file existence
    // For web, we'd need to handle this differently

    try {
      // Validate model path
      if (config.path && !await this.fileExists(config.path)) {
        errors.push({
          field: 'path',
          message: 'Model file does not exist',
          severity: 'error',
          suggestion: 'Verify the model file path'
        });
      }

      // Validate script paths
      for (const script of config.localSettings.preloadScripts || []) {
        if (!await this.fileExists(script)) {
          warnings.push({
            field: 'localSettings.preloadScripts',
            message: `Preload script not found: ${script}`,
            impact: 'medium',
            recommendation: 'Verify script path or remove if not needed'
          });
        }
      }

      for (const script of config.localSettings.postloadScripts || []) {
        if (!await this.fileExists(script)) {
          warnings.push({
            field: 'localSettings.postloadScripts',
            message: `Postload script not found: ${script}`,
            impact: 'medium',
            recommendation: 'Verify script path or remove if not needed'
          });
        }
      }
    } catch (error) {
      // Path validation errors are not critical
      warnings.push({
        field: 'general',
        message: 'Could not validate file paths',
        impact: 'low',
        recommendation: 'Manually verify file paths exist'
      });
    }

    return { errors, warnings };
  }

  // File system abstraction methods (would be implemented differently for web vs desktop)
  private async findConfigFiles(directory: string): Promise<string[]> {
    // In a real implementation, this would recursively search for config files
    // For web, this would need to be provided through file inputs or directory scanning APIs
    try {
      // Placeholder implementation
      return [];
    } catch {
      return [];
    }
  }

  private async readConfigFile(filePath: string): Promise<any> {
    try {
      // In browser, this would use File API or fetch for remote configs
      // For now, try localStorage as fallback
      const stored = localStorage.getItem(`BearAI_Config_${btoa(filePath)}`);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  private async writeConfigFile(filePath: string, config: LocalModelConfig): Promise<void> {
    try {
      // In browser, save to localStorage as fallback
      const configData = JSON.stringify(config, null, 2);
      localStorage.setItem(`BearAI_Config_${btoa(filePath)}`, configData);
    } catch (error) {
      console.error('Failed to write config file:', error);
    }
  }

  private async deleteConfigFile(filePath: string): Promise<void> {
    try {
      localStorage.removeItem(`BearAI_Config_${btoa(filePath)}`);
    } catch (error) {
      console.error('Failed to delete config file:', error);
    }
  }

  private async writeFile(filePath: string, content: string): Promise<void> {
    try {
      // For web, this would use download or file system access API
      // For now, store in localStorage
      localStorage.setItem(`BearAI_File_${btoa(filePath)}`, content);
    } catch (error) {
      console.error('Failed to write file:', error);
    }
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      // For web, this is challenging - assume true for now
      return true;
    } catch {
      return false;
    }
  }

  private async watchDirectory(directory: string): Promise<void> {
    // In a real implementation, this would set up file system watchers
    // For web, this might use periodic polling or manual refresh
    console.log(`Watching directory for changes: ${directory}`);
  }

  private loadPersistedConfigs(): void {
    try {
      const stored = localStorage.getItem('BearAI_ModelConfigs');
      if (stored) {
        const configsData = JSON.parse(stored);
        for (const [id, configData] of Object.entries(configsData)) {
          const config = configData as LocalModelConfig;
          config.lastModified = new Date(config.lastModified);
          this.configs.set(id, config);
        }
      }
    } catch (error) {
      console.error('Failed to load persisted configs:', error);
    }
  }

  /**
   * Dispose of resources
   */
  public dispose(): void {
    // Persist current configurations
    try {
      const configsData = Object.fromEntries(this.configs.entries());
      localStorage.setItem('BearAI_ModelConfigs', JSON.stringify(configsData));
    } catch (error) {
      console.error('Failed to persist configs on dispose:', error);
    }

    this.configs.clear();
    this.schemas.clear();
    this.templates.clear();
    this.watchedDirectories.clear();
  }
}

export default LocalConfigManager;