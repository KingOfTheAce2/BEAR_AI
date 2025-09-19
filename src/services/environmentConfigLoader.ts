// Environment Configuration Loader for BEAR AI - Handles environment-specific config loading
import { ApplicationConfig, Environment, isValidEnvironment } from '../types/config';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import * as yaml from 'js-yaml';

export interface ConfigSource {
  type: 'file' | 'environment' | 'remote' | 'vault';
  path: string;
  format: 'json' | 'yaml' | 'env';
  required: boolean;
  priority: number;
}

export interface EnvironmentConfigOptions {
  configDir: string;
  environment?: Environment;
  sources: ConfigSource[];
  envPrefix: string;
  enableFileWatching: boolean;
  enableRemoteConfig: boolean;
  cacheConfig: boolean;
  encryptionKey?: string;
}

export interface LoadResult {
  config: Partial<ApplicationConfig>;
  loadedSources: string[];
  errors: Array<{
    source: string;
    error: string;
  }>;
  warnings: string[];
  metadata: {
    environment: Environment;
    loadTime: Date;
    version: string;
  };
}

export interface ConfigTemplate {
  name: string;
  description: string;
  environment: Environment;
  template: Partial<ApplicationConfig>;
  requiredFields: string[];
  optionalFields: string[];
}

export class EnvironmentConfigLoader {
  private options: EnvironmentConfigOptions;
  private configCache: Map<string, { config: any; timestamp: Date }> = new Map();
  private watchers: Map<string, any> = new Map();
  private templates: Map<Environment, ConfigTemplate> = new Map();

  constructor(options: Partial<EnvironmentConfigOptions> = {}) {
    this.options = {
      configDir: './config',
      sources: this.getDefaultSources(),
      envPrefix: 'BEAR_AI_',
      enableFileWatching: true,
      enableRemoteConfig: false,
      cacheConfig: true,
      ...options
    };

    this.initializeTemplates();
    this.ensureConfigDirectory();
  }

  /**
   * Load configuration for specific environment
   */
  async loadEnvironmentConfig(environment?: Environment): Promise<LoadResult> {
    const env = environment || this.detectEnvironment();
    const result: LoadResult = {
      config: {},
      loadedSources: [],
      errors: [],
      warnings: [],
      metadata: {
        environment: env,
        loadTime: new Date(),
        version: '1.0.0'
      }
    };

    // Sort sources by priority
    const sortedSources = [...this.options.sources].sort((a, b) => a.priority - b.priority);

    for (const source of sortedSources) {
      try {
        const sourceConfig = await this.loadFromSource(source, env);
        if (sourceConfig) {
          result.config = this.deepMerge(result.config, sourceConfig);
          result.loadedSources.push(source.path);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        if (source.required) {
          result.errors.push({ source: source.path, error: errorMessage });
        } else {
          result.warnings.push(`Optional source ${source.path}: ${errorMessage}`);
        }
      }
    }

    // Load environment variables
    const envConfig = this.loadEnvironmentVariables(env);
    if (Object.keys(envConfig).length > 0) {
      result.config = this.deepMerge(result.config, envConfig);
      result.loadedSources.push('environment-variables');
    }

    // Apply environment-specific overrides
    const envOverrides = await this.getEnvironmentOverrides(env);
    if (envOverrides) {
      result.config = this.deepMerge(result.config, envOverrides);
      result.loadedSources.push(`${env}-overrides`);
    }

    return result;
  }

  /**
   * Generate configuration template for environment
   */
  async generateTemplate(environment: Environment, outputPath?: string): Promise<ConfigTemplate> {
    const template = this.templates.get(environment);
    if (!template) {
      throw new Error(`No template available for environment: ${environment}`);
    }

    if (outputPath) {
      const configJson = JSON.stringify(template.template, null, 2);
      this.ensureDirectoryExists(dirname(outputPath));
      writeFileSync(outputPath, configJson, 'utf8');
    }

    return template;
  }

  /**
   * Validate configuration files
   */
  async validateEnvironmentFiles(environment: Environment): Promise<{
    isValid: boolean;
    missing: string[];
    invalid: Array<{ file: string; errors: string[] }>;
    recommendations: string[];
  }> {
    const result = {
      isValid: true,
      missing: [],
      invalid: [],
      recommendations: []
    };

    const requiredFiles = [
      `${this.options.configDir}/base.json`,
      `${this.options.configDir}/${environment}.json`
    ];

    // Check for missing files
    for (const file of requiredFiles) {
      if (!existsSync(file)) {
        result.missing.push(file);
        result.isValid = false;
      }
    }

    // Validate existing files
    for (const source of this.options.sources) {
      if (source.required) {
        const filePath = this.resolveConfigPath(source.path, environment);
        if (existsSync(filePath)) {
          try {
            const config = await this.loadConfigFile(filePath, source.format);
            const validation = this.validateConfigStructure(config, environment);
            
            if (!validation.isValid) {
              result.invalid.push({ file: filePath, errors: validation.errors });
              result.isValid = false;
            }
          } catch (error) {
            result.invalid.push({ 
              file: filePath, 
              errors: [error instanceof Error ? error.message : 'Parse error'] 
            });
            result.isValid = false;
          }
        }
      }
    }

    // Generate recommendations
    if (environment === 'production') {
      if (!existsSync(`${this.options.configDir}/production.secrets.json`)) {
        result.recommendations.push('Create production.secrets.json for sensitive configuration');
      }
    }

    if (!existsSync(`${this.options.configDir}/local.json`)) {
      result.recommendations.push('Consider creating local.json for development overrides');
    }

    return result;
  }

  /**
   * Initialize configuration for new environment
   */
  async initializeEnvironment(environment: Environment, options: {
    copyFrom?: Environment;
    includeSecrets?: boolean;
    interactive?: boolean;
  } = {}): Promise<void> {
    const { copyFrom, includeSecrets = false } = options;

    const configPath = `${this.options.configDir}/${environment}.json`;
    const secretsPath = `${this.options.configDir}/${environment}.secrets.json`;

    // Ensure config directory exists
    this.ensureConfigDirectory();

    if (existsSync(configPath)) {
      throw new Error(`Configuration for ${environment} already exists`);
    }

    let baseConfig: Partial<ApplicationConfig>;

    if (copyFrom) {
      // Copy from existing environment
      const sourceResult = await this.loadEnvironmentConfig(copyFrom);
      baseConfig = sourceResult.config;
    } else {
      // Use template
      const template = await this.generateTemplate(environment);
      baseConfig = template.template;
    }

    // Customize for environment
    baseConfig = this.customizeForEnvironment(baseConfig, environment);

    // Split secrets from main config
    const { mainConfig, secretsConfig } = this.splitSecrets(baseConfig);

    // Write main configuration
    writeFileSync(configPath, JSON.stringify(mainConfig, null, 2), 'utf8');

    // Write secrets configuration if requested
    if (includeSecrets && Object.keys(secretsConfig).length > 0) {
      writeFileSync(secretsPath, JSON.stringify(secretsConfig, null, 2), 'utf8');
    }

    console.log(`✅ Initialized configuration for ${environment}`);
    console.log(`📁 Main config: ${configPath}`);
    if (includeSecrets) {
      console.log(`🔐 Secrets config: ${secretsPath}`);
    }
  }

  /**
   * Enable hot reload for configuration files
   */
  enableHotReload(callback: (config: Partial<ApplicationConfig>) => void): void {
    if (!this.options.enableFileWatching) return;

    for (const source of this.options.sources) {
      const filePath = this.resolveConfigPath(source.path);
      
      if (existsSync(filePath) && !this.watchers.has(filePath)) {
        // In a real implementation, you would use fs.watchFile or chokidar
        // For this example, we'll simulate file watching
        console.log(`👀 Watching ${filePath} for changes`);
      }
    }
  }

  /**
   * Disable hot reload
   */
  disableHotReload(): void {
    for (const [filePath, watcher] of this.watchers) {
      // In a real implementation, you would close the file watcher
      console.log(`🛑 Stopped watching ${filePath}`);
    }
    this.watchers.clear();
  }

  /**
   * Get configuration schema for environment
   */
  getEnvironmentSchema(environment: Environment): object {
    const template = this.templates.get(environment);
    if (!template) {
      throw new Error(`No schema available for environment: ${environment}`);
    }

    return {
      type: 'object',
      properties: this.generateJsonSchema(template.template),
      required: template.requiredFields,
      additionalProperties: false
    };
  }

  /**
   * Export configuration for deployment
   */
  async exportForDeployment(environment: Environment, options: {
    includeSecrets?: boolean;
    format?: 'json' | 'yaml' | 'env';
    minify?: boolean;
  } = {}): Promise<string> {
    const { includeSecrets = false, format = 'json', minify = false } = options;

    const result = await this.loadEnvironmentConfig(environment);
    let config = result.config;

    if (!includeSecrets) {
      config = this.removeSensitiveData(config);
    }

    switch (format) {
      case 'json':
        return JSON.stringify(config, null, minify ? 0 : 2);
      
      case 'yaml':
        return yaml.dump(config, { indent: minify ? 0 : 2 });
      
      case 'env':
        return this.convertToEnvironmentVariables(config);
      
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  // Private methods
  private getDefaultSources(): ConfigSource[] {
    return [
      {
        type: 'file',
        path: 'base.json',
        format: 'json',
        required: true,
        priority: 1
      },
      {
        type: 'file',
        path: '{environment}.json',
        format: 'json',
        required: true,
        priority: 2
      },
      {
        type: 'file',
        path: '{environment}.secrets.json',
        format: 'json',
        required: false,
        priority: 3
      },
      {
        type: 'file',
        path: 'local.json',
        format: 'json',
        required: false,
        priority: 4
      }
    ];
  }

  private detectEnvironment(): Environment {
    const env = process.env.NODE_ENV || process.env.BEAR_AI_ENV || 'development';
    return isValidEnvironment(env) ? env : 'development';
  }

  private async loadFromSource(source: ConfigSource, environment: Environment): Promise<any> {
    const filePath = this.resolveConfigPath(source.path, environment);

    // Check cache first
    if (this.options.cacheConfig) {
      const cached = this.configCache.get(filePath);
      if (cached && Date.now() - cached.timestamp.getTime() < 60000) { // 1 minute cache
        return cached.config;
      }
    }

    if (!existsSync(filePath)) {
      if (source.required) {
        throw new Error(`Required configuration file not found: ${filePath}`);
      }
      return null;
    }

    const config = await this.loadConfigFile(filePath, source.format);

    // Cache the result
    if (this.options.cacheConfig) {
      this.configCache.set(filePath, { config, timestamp: new Date() });
    }

    return config;
  }

  private async loadConfigFile(filePath: string, format: 'json' | 'yaml' | 'env'): Promise<any> {
    const content = readFileSync(filePath, { encoding: 'utf8' }) as string;

    switch (format) {
      case 'json':
        return JSON.parse(content);

      case 'yaml':
        return yaml.load(content);

      case 'env':
        return this.parseEnvFile(content);
      
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  private loadEnvironmentVariables(environment: Environment): Partial<ApplicationConfig> {
    const config: any = {};
    const prefix = this.options.envPrefix;

    // Convert environment variables to config object
    for (const [key, value] of Object.entries(process.env)) {
      if (key.startsWith(prefix)) {
        const configKey = key.slice(prefix.length).toLowerCase();
        const configPath = configKey.replace(/_/g, '.');
        this.setByPath(config, configPath, this.parseEnvValue(value));
      }
    }

    return config;
  }

  private async getEnvironmentOverrides(environment: Environment): Promise<Partial<ApplicationConfig> | null> {
    const overridePath = `${this.options.configDir}/${environment}.overrides.json`;
    
    if (!existsSync(overridePath)) {
      return null;
    }

    return this.loadConfigFile(overridePath, 'json');
  }

  private resolveConfigPath(path: string, environment?: Environment): string {
    const env = environment || this.detectEnvironment();
    const resolvedPath = path.replace('{environment}', env);
    return join(this.options.configDir, resolvedPath);
  }

  private ensureConfigDirectory(): void {
    if (!existsSync(this.options.configDir)) {
      mkdirSync(this.options.configDir, { recursive: true });
    }
  }

  private ensureDirectoryExists(dirPath: string): void {
    if (!existsSync(dirPath)) {
      mkdirSync(dirPath, { recursive: true });
    }
  }

  private initializeTemplates(): void {
    // Development template
    this.templates.set('development', {
      name: 'Development',
      description: 'Configuration template for development environment',
      environment: 'development',
      template: {
        system: {
          environment: 'development',
          debug: true,
          version: '1.0.0',
          buildNumber: '1',
          maintenance: { enabled: false },
          resources: { maxMemoryUsage: 80, maxCPUUsage: 70, maxDiskUsage: 85 }
        },
        logging: {
          level: 'debug',
          format: 'text',
          outputs: [{ type: 'console' }],
          sensitiveFields: ['password', 'secret'],
          enableMetrics: true
        }
      },
      requiredFields: ['system.environment', 'logging.level'],
      optionalFields: ['system.debug', 'logging.format']
    });

    // Production template
    this.templates.set('production', {
      name: 'Production',
      description: 'Configuration template for production environment',
      environment: 'production',
      template: {
        system: {
          environment: 'production',
          debug: false,
          version: '1.0.0',
          buildNumber: '1',
          maintenance: { enabled: false },
          resources: { maxMemoryUsage: 90, maxCPUUsage: 85, maxDiskUsage: 95 }
        },
        logging: {
          level: 'warn',
          format: 'json',
          outputs: [
            { type: 'file', destination: '/var/log/bear-ai/app.log' },
            { type: 'remote', destination: 'https://logs.example.com' }
          ],
          sensitiveFields: ['password', 'secret', 'token', 'key'],
          enableMetrics: true
        }
      },
      requiredFields: ['system.environment', 'logging.level', 'security.jwtSecret'],
      optionalFields: ['system.debug']
    });

    // Testing template
    this.templates.set('testing', {
      name: 'Testing',
      description: 'Configuration template for testing environment',
      environment: 'testing',
      template: {
        system: {
          environment: 'testing',
          debug: true,
          version: '1.0.0',
          buildNumber: '1',
          maintenance: { enabled: false },
          resources: { maxMemoryUsage: 70, maxCPUUsage: 60, maxDiskUsage: 75 }
        },
        logging: {
          level: 'info',
          format: 'json',
          outputs: [{ type: 'console' }],
          sensitiveFields: ['password', 'secret'],
          enableMetrics: false
        }
      },
      requiredFields: ['system.environment'],
      optionalFields: ['logging.enableMetrics']
    });
  }

  private customizeForEnvironment(config: Partial<ApplicationConfig>, environment: Environment): Partial<ApplicationConfig> {
    const customized = JSON.parse(JSON.stringify(config));

    // Apply environment-specific customizations
    if (customized.system) {
      customized.system.environment = environment;
      customized.system.debug = environment === 'development' || environment === 'testing';
    }

    if (environment === 'production' && customized.logging) {
      customized.logging.level = 'warn';
      customized.logging.format = 'json';
    }

    return customized;
  }

  private splitSecrets(config: Partial<ApplicationConfig>): { mainConfig: any; secretsConfig: any } {
    const mainConfig = JSON.parse(JSON.stringify(config));
    const secretsConfig: any = {};

    const sensitiveKeys = ['password', 'secret', 'key', 'token', 'credential'];

    this.extractSecrets(mainConfig, secretsConfig, '', sensitiveKeys);

    return { mainConfig, secretsConfig };
  }

  private extractSecrets(obj: any, secrets: any, path: string, sensitiveKeys: string[]): void {
    for (const key in obj) {
      const currentPath = path ? `${path}.${key}` : key;
      
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        this.extractSecrets(obj[key], secrets, currentPath, sensitiveKeys);
      } else if (sensitiveKeys.some(s => key.toLowerCase().includes(s))) {
        this.setByPath(secrets, currentPath, obj[key]);
        obj[key] = `\${${currentPath.toUpperCase().replace(/\./g, '_')}}`;
      }
    }
  }

  private validateConfigStructure(config: any, environment: Environment): { isValid: boolean; errors: string[] } {
    const template = this.templates.get(environment);
    if (!template) {
      return { isValid: true, errors: [] };
    }

    const errors: string[] = [];

    // Check required fields
    for (const field of template.requiredFields) {
      if (!this.hasPath(config, field)) {
        errors.push(`Required field missing: ${field}`);
      }
    }

    return { isValid: errors.length === 0, errors };
  }

  private generateJsonSchema(obj: any): any {
    const schema: any = {};

    for (const key in obj) {
      const value = obj[key];
      
      if (value === null) {
        schema[key] = { type: 'null' };
      } else if (Array.isArray(value)) {
        schema[key] = { type: 'array' };
      } else if (typeof value === 'object') {
        schema[key] = {
          type: 'object',
          properties: this.generateJsonSchema(value)
        };
      } else {
        schema[key] = { type: typeof value };
      }
    }

    return schema;
  }

  private removeSensitiveData(config: any): any {
    const cleaned = JSON.parse(JSON.stringify(config));
    const sensitiveKeys = ['password', 'secret', 'key', 'token', 'credential'];

    const cleanObject = (obj: any): void => {
      for (const key in obj) {
        if (typeof obj[key] === 'object' && obj[key] !== null) {
          cleanObject(obj[key]);
        } else if (sensitiveKeys.some(s => key.toLowerCase().includes(s))) {
          obj[key] = '***REDACTED***';
        }
      }
    };

    cleanObject(cleaned);
    return cleaned;
  }

  private convertToEnvironmentVariables(config: any, prefix: string = this.options.envPrefix): string {
    const envVars: string[] = [];

    const flatten = (obj: any, path: string = ''): void => {
      for (const key in obj) {
        const currentPath = path ? `${path}_${key.toUpperCase()}` : key.toUpperCase();
        
        if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
          flatten(obj[key], currentPath);
        } else {
          const value = Array.isArray(obj[key]) ? JSON.stringify(obj[key]) : String(obj[key]);
          envVars.push(`${prefix}${currentPath}=${value}`);
        }
      }
    };

    flatten(config);
    return envVars.join('\n');
  }

  private parseEnvFile(content: string): any {
    const config: any = {};
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        const value = valueParts.join('=');
        config[key] = this.parseEnvValue(value);
      }
    }

    return config;
  }

  private parseEnvValue(value: string | undefined): any {
    if (!value) return '';
    
    // Remove quotes
    const trimmed = value.trim();
    if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || 
        (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
      return trimmed.slice(1, -1);
    }

    // Parse boolean
    if (trimmed.toLowerCase() === 'true') return true;
    if (trimmed.toLowerCase() === 'false') return false;

    // Parse number
    if (/^\d+$/.test(trimmed)) return parseInt(trimmed, 10);
    if (/^\d+\.\d+$/.test(trimmed)) return parseFloat(trimmed);

    return trimmed;
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

  private hasPath(obj: any, path: string): boolean {
    const keys = path.split('.');
    let current = obj;

    for (const key of keys) {
      if (!current || typeof current !== 'object' || !(key in current)) {
        return false;
      }
      current = current[key];
    }

    return true;
  }
}

// Export singleton instance
export const environmentConfigLoader = new EnvironmentConfigLoader();

// Export utility functions
export async function loadEnvironmentConfig(environment?: Environment): Promise<LoadResult> {
  return environmentConfigLoader.loadEnvironmentConfig(environment);
}

export async function initializeEnvironment(environment: Environment, options?: {
  copyFrom?: Environment;
  includeSecrets?: boolean;
}): Promise<void> {
  return environmentConfigLoader.initializeEnvironment(environment, options);
}

export async function validateEnvironmentFiles(environment: Environment): Promise<{
  isValid: boolean;
  missing: string[];
  invalid: Array<{ file: string; errors: string[] }>;
  recommendations: string[];
}> {
  return environmentConfigLoader.validateEnvironmentFiles(environment);
}