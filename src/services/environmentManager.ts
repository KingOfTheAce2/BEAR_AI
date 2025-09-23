/**
 * Environment Manager for BEAR AI
 * Comprehensive environment variable management, validation, and loading system
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { logger } from './logger';

export interface EnvironmentConfig {
  // Application Environment
  NODE_ENV: 'development' | 'production' | 'staging' | 'testing';
  APP_NAME: string;
  APP_VERSION: string;
  APP_URL: string;
  API_BASE_URL: string;
  API_TIMEOUT: number;
  API_VERSION: string;

  // Tauri Settings
  TAURI_DEBUG: boolean;
  TAURI_DEV_WINDOW_LABEL?: string;

  // Stripe Configuration
  STRIPE_PUBLISHABLE_KEY: string;
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  STRIPE_ENVIRONMENT: 'test' | 'live';
  STRIPE_BASIC_PRICE_ID?: string;
  STRIPE_PRO_PRICE_ID?: string;
  STRIPE_ENTERPRISE_PRICE_ID?: string;
  STRIPE_WEBHOOK_URL?: string;
  STRIPE_WEBHOOK_ENDPOINT_SECRET?: string;

  // Authentication & Security
  JWT_SECRET: string;
  JWT_EXPIRATION: string;
  JWT_ISSUER: string;
  JWT_AUDIENCE: string;
  SESSION_SECRET: string;
  SESSION_TIMEOUT: string;
  SESSION_SECURE: boolean;
  SESSION_SAME_SITE: 'strict' | 'lax' | 'none';
  ENCRYPTION_KEY: string;
  ENCRYPTION_ALGORITHM: string;
  HASH_ROUNDS: number;
  SALT_ROUNDS: number;

  // Database Configuration
  DATABASE_URL: string;
  DATABASE_ENCRYPTION_KEY: string;
  DATABASE_TIMEOUT: number;
  DATABASE_RETRY_ATTEMPTS: number;
  DATABASE_BACKUP_ENABLED: boolean;
  DATABASE_BACKUP_INTERVAL: string;

  // Admin Configuration
  ADMIN_EMAIL: string;
  ADMIN_PASSWORD_HASH: string;
  ADMIN_FIRST_NAME: string;
  ADMIN_LAST_NAME: string;
  ADMIN_REQUIRE_2FA: boolean;
  ADMIN_SESSION_TIMEOUT: string;
  ADMIN_MAX_LOGIN_ATTEMPTS: number;

  // Third-party API Keys
  OPENAI_API_KEY?: string;
  OPENAI_ORG_ID?: string;
  OPENAI_MODEL?: string;
  ANTHROPIC_API_KEY?: string;
  ANTHROPIC_MODEL?: string;
  GOOGLE_AI_API_KEY?: string;
  GOOGLE_AI_PROJECT_ID?: string;
  HUGGINGFACE_API_TOKEN?: string;
  HUGGINGFACE_MODEL_ENDPOINT?: string;

  // Legal Research APIs
  WESTLAW_API_KEY?: string;
  LEXISNEXIS_API_KEY?: string;
  FASTCASE_API_KEY?: string;

  // Document Processing
  DOCUMENT_AI_API_KEY?: string;
  OCR_SPACE_API_KEY?: string;
  TESSERACT_PATH?: string;

  // Email Service
  SENDGRID_API_KEY?: string;
  SMTP_HOST?: string;
  SMTP_PORT?: number;
  SMTP_USER?: string;
  SMTP_PASS?: string;
  EMAIL_FROM?: string;

  // Cloud Storage
  AWS_ACCESS_KEY_ID?: string;
  AWS_SECRET_ACCESS_KEY?: string;
  AWS_REGION?: string;
  AWS_S3_BUCKET?: string;
  AZURE_STORAGE_ACCOUNT?: string;
  AZURE_STORAGE_KEY?: string;
  AZURE_CONTAINER_NAME?: string;

  // Logging & Monitoring
  LOG_LEVEL: 'error' | 'warn' | 'info' | 'debug';
  LOG_FORMAT: 'json' | 'text';
  LOG_FILE_PATH: string;
  LOG_MAX_FILE_SIZE: string;
  LOG_MAX_FILES: number;
  LOG_ROTATE_INTERVAL: string;
  SENTRY_DSN?: string;
  SENTRY_ENVIRONMENT?: string;
  SENTRY_TRACES_SAMPLE_RATE?: number;

  // Enterprise Features
  ENTERPRISE_MODE: boolean;
  ENTERPRISE_LICENSE_KEY?: string;
  MAX_TEAM_MEMBERS: number;
  MAX_DOCUMENTS_PER_USER: number;
  MAX_STORAGE_PER_USER: string;

  // Feature Flags
  ENABLE_USER_REGISTRATION: boolean;
  ENABLE_PASSWORD_RESET: boolean;
  ENABLE_EMAIL_VERIFICATION: boolean;
  ENABLE_TWO_FACTOR_AUTH: boolean;
  ENABLE_DOCUMENT_ANALYSIS: boolean;
  ENABLE_CONTRACT_REVIEW: boolean;
  ENABLE_LEGAL_RESEARCH: boolean;
  ENABLE_AI_CHAT: boolean;
  ENABLE_DOCUMENT_SUMMARIZATION: boolean;
  ENABLE_BILLING_INTEGRATION: boolean;

  // Development & Testing
  DEV_ENABLE_CORS: boolean;
  DEV_ENABLE_DEBUG_LOGS: boolean;
  DEV_ENABLE_HOT_RELOAD: boolean;
  DEV_DISABLE_AUTH: boolean;
  TEST_DATABASE_URL?: string;
  TEST_DISABLE_EMAIL: boolean;
  TEST_MOCK_PAYMENT_PROCESSING: boolean;
  TEST_SEED_DATA: boolean;

  // Performance Settings
  ENABLE_CACHING: boolean;
  CACHE_TTL: number;
  ENABLE_COMPRESSION: boolean;
  ENABLE_MINIFICATION: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  missingRequired: string[];
  suggestions: string[];
}

export interface ValidationError {
  key: string;
  message: string;
  severity: 'error' | 'warning';
  expectedType?: string;
  actualValue?: any;
}

export interface ValidationWarning {
  key: string;
  message: string;
  recommendation: string;
  impact: 'low' | 'medium' | 'high';
}

export interface EnvironmentSchema {
  [key: string]: {
    required: boolean;
    type: 'string' | 'number' | 'boolean' | 'email' | 'url' | 'enum';
    enumValues?: string[];
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    default?: any;
    description: string;
    productionRequired?: boolean;
    developmentOnly?: boolean;
  };
}

export class EnvironmentManager {
  private config: Partial<EnvironmentConfig> = {};
  private schema: EnvironmentSchema;
  private isLoaded = false;
  private validationResult: ValidationResult | null = null;

  constructor() {
    this.schema = this.defineSchema();
  }

  /**
   * Load and validate environment variables
   */
  public async load(envFilePath?: string): Promise<ValidationResult> {
    try {
      // Load .env file if specified and exists
      if (envFilePath && existsSync(envFilePath)) {
        this.loadEnvFile(envFilePath);
      } else {
        // Try to load from common locations
        const commonPaths = ['.env', '.env.local', `.env.${process.env.NODE_ENV || 'development'}`];
        for (const path of commonPaths) {
          if (existsSync(path)) {
            this.loadEnvFile(path);
            break;
          }
        }
      }

      // Load from process.env
      this.loadFromProcessEnv();

      // Validate the configuration
      this.validationResult = this.validate();
      this.isLoaded = true;

      // Log validation results
      if (this.validationResult.errors.length > 0) {
        logger.error('Environment validation failed', {
          errors: this.validationResult.errors,
          warnings: this.validationResult.warnings
        });
      } else if (this.validationResult.warnings.length > 0) {
        logger.warn('Environment loaded with warnings', {
          warnings: this.validationResult.warnings
        });
      } else {
        logger.info('Environment loaded successfully');
      }

      return this.validationResult;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to load environment configuration', { error: errorMessage });

      this.validationResult = {
        isValid: false,
        errors: [{
          key: 'general',
          message: `Failed to load environment: ${errorMessage}`,
          severity: 'error'
        }],
        warnings: [],
        missingRequired: [],
        suggestions: []
      };

      return this.validationResult;
    }
  }

  /**
   * Get configuration value with type safety
   */
  public get<K extends keyof EnvironmentConfig>(key: K): EnvironmentConfig[K] | undefined {
    if (!this.isLoaded) {
      throw new Error('Environment not loaded. Call load() first.');
    }
    return this.config[key] as EnvironmentConfig[K] | undefined;
  }

  /**
   * Get configuration value with default fallback
   */
  public getWithDefault<K extends keyof EnvironmentConfig>(
    key: K,
    defaultValue: EnvironmentConfig[K]
  ): EnvironmentConfig[K] {
    const value = this.get(key);
    return value !== undefined ? value : defaultValue;
  }

  /**
   * Get all configuration
   */
  public getAll(): Partial<EnvironmentConfig> {
    if (!this.isLoaded) {
      throw new Error('Environment not loaded. Call load() first.');
    }
    return { ...this.config };
  }

  /**
   * Check if environment is production
   */
  public isProduction(): boolean {
    return this.get('NODE_ENV') === 'production';
  }

  /**
   * Check if environment is development
   */
  public isDevelopment(): boolean {
    return this.get('NODE_ENV') === 'development';
  }

  /**
   * Check if environment is testing
   */
  public isTesting(): boolean {
    return this.get('NODE_ENV') === 'testing';
  }

  /**
   * Get validation result
   */
  public getValidationResult(): ValidationResult | null {
    return this.validationResult;
  }

  /**
   * Check if configuration is valid
   */
  public isValid(): boolean {
    return this.validationResult?.isValid ?? false;
  }

  /**
   * Get environment health status
   */
  public getHealthStatus(): {
    healthy: boolean;
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];

    if (!this.isLoaded) {
      issues.push('Environment not loaded');
      recommendations.push('Call load() method to initialize environment');
      return { healthy: false, issues, recommendations };
    }

    if (!this.validationResult) {
      issues.push('Environment not validated');
      recommendations.push('Run validation after loading environment');
      return { healthy: false, issues, recommendations };
    }

    // Check for critical errors
    const criticalErrors = this.validationResult.errors.filter(e => e.severity === 'error');
    if (criticalErrors.length > 0) {
      issues.push(`${criticalErrors.length} critical configuration errors`);
      recommendations.push('Fix critical configuration errors before deployment');
    }

    // Check for missing required variables in production
    if (this.isProduction()) {
      const missingProduction = this.validationResult.missingRequired.filter(key =>
        this.schema[key]?.productionRequired
      );
      if (missingProduction.length > 0) {
        issues.push(`Missing required production variables: ${missingProduction.join(', ')}`);
        recommendations.push('Set all required production environment variables');
      }
    }

    // Check for security issues
    if (this.isProduction()) {
      const securityIssues = this.checkSecurityIssues();
      issues.push(...securityIssues.issues);
      recommendations.push(...securityIssues.recommendations);
    }

    return {
      healthy: issues.length === 0,
      issues,
      recommendations
    };
  }

  /**
   * Load environment variables from file
   */
  private loadEnvFile(filePath: string): void {
    try {
      const content = readFileSync(filePath, 'utf-8');
      const lines = content.split('\\n');

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine && !trimmedLine.startsWith('#')) {
          const [key, ...valueParts] = trimmedLine.split('=');
          if (key && valueParts.length > 0) {
            const value = valueParts.join('=').replace(/^["'](.*)["']$/, '$1');
            process.env[key.trim()] = value;
          }
        }
      }
    } catch (error) {
      logger.warn(`Failed to load env file: ${filePath}`, { error });
    }
  }

  /**
   * Load configuration from process.env
   */
  private loadFromProcessEnv(): void {
    for (const [key, schemaInfo] of Object.entries(this.schema)) {
      const envValue = process.env[key];

      if (envValue !== undefined) {
        this.config[key as keyof EnvironmentConfig] = this.parseValue(
          envValue,
          schemaInfo.type,
          schemaInfo.enumValues
        );
      } else if (schemaInfo.default !== undefined) {
        this.config[key as keyof EnvironmentConfig] = schemaInfo.default;
      }
    }
  }

  /**
   * Parse environment value based on type
   */
  private parseValue(value: string, type: string, enumValues?: string[]): any {
    switch (type) {
      case 'boolean':
        return value.toLowerCase() === 'true';
      case 'number':
        const num = Number(value);
        return isNaN(num) ? value : num;
      case 'enum':
        return enumValues?.includes(value) ? value : value;
      default:
        return value;
    }
  }

  /**
   * Validate configuration against schema
   */
  private validate(): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const missingRequired: string[] = [];
    const suggestions: string[] = [];

    for (const [key, schemaInfo] of Object.entries(this.schema)) {
      const value = this.config[key as keyof EnvironmentConfig];

      // Check required fields
      if (schemaInfo.required && (value === undefined || value === '')) {
        missingRequired.push(key);
        errors.push({
          key,
          message: `Required environment variable '${key}' is not set`,
          severity: 'error'
        });
        continue;
      }

      // Skip validation if value is not set and not required
      if (value === undefined) continue;

      // Type validation
      const typeError = this.validateType(key, value, schemaInfo);
      if (typeError) errors.push(typeError);

      // Additional validations
      const additionalErrors = this.validateAdditional(key, value, schemaInfo);
      errors.push(...additionalErrors);
    }

    // Environment-specific validations
    if (this.isProduction()) {
      const prodErrors = this.validateProductionRequirements();
      errors.push(...prodErrors);
    }

    // Generate suggestions
    if (this.isDevelopment()) {
      suggestions.push('Consider setting up all API keys for full functionality');
      suggestions.push('Enable debug logging for development');
    }

    if (this.isProduction()) {
      suggestions.push('Ensure all secrets are properly secured');
      suggestions.push('Enable production monitoring and logging');
      suggestions.push('Review security settings');
    }

    return {
      isValid: errors.filter(e => e.severity === 'error').length === 0,
      errors,
      warnings,
      missingRequired,
      suggestions
    };
  }

  /**
   * Validate value type
   */
  private validateType(key: string, value: any, schemaInfo: any): ValidationError | null {
    const { type, enumValues } = schemaInfo;

    switch (type) {
      case 'boolean':
        if (typeof value !== 'boolean') {
          return {
            key,
            message: `'${key}' must be a boolean (true/false)`,
            severity: 'error',
            expectedType: 'boolean',
            actualValue: value
          };
        }
        break;

      case 'number':
        if (typeof value !== 'number' || isNaN(value)) {
          return {
            key,
            message: `'${key}' must be a valid number`,
            severity: 'error',
            expectedType: 'number',
            actualValue: value
          };
        }
        break;

      case 'email':
        if (typeof value !== 'string' || !this.isValidEmail(value)) {
          return {
            key,
            message: `'${key}' must be a valid email address`,
            severity: 'error',
            expectedType: 'email',
            actualValue: value
          };
        }
        break;

      case 'url':
        if (typeof value !== 'string' || !this.isValidUrl(value)) {
          return {
            key,
            message: `'${key}' must be a valid URL`,
            severity: 'error',
            expectedType: 'url',
            actualValue: value
          };
        }
        break;

      case 'enum':
        if (enumValues && !enumValues.includes(value)) {
          return {
            key,
            message: `'${key}' must be one of: ${enumValues.join(', ')}`,
            severity: 'error',
            expectedType: `enum(${enumValues.join('|')})`,
            actualValue: value
          };
        }
        break;

      case 'string':
      default:
        if (typeof value !== 'string') {
          return {
            key,
            message: `'${key}' must be a string`,
            severity: 'error',
            expectedType: 'string',
            actualValue: value
          };
        }
        break;
    }

    return null;
  }

  /**
   * Additional validation checks
   */
  private validateAdditional(key: string, value: any, schemaInfo: any): ValidationError[] {
    const errors: ValidationError[] = [];

    // String length validation
    if (typeof value === 'string') {
      if (schemaInfo.minLength && value.length < schemaInfo.minLength) {
        errors.push({
          key,
          message: `'${key}' must be at least ${schemaInfo.minLength} characters long`,
          severity: 'error'
        });
      }

      if (schemaInfo.maxLength && value.length > schemaInfo.maxLength) {
        errors.push({
          key,
          message: `'${key}' must be no more than ${schemaInfo.maxLength} characters long`,
          severity: 'error'
        });
      }

      // Pattern validation
      if (schemaInfo.pattern && !schemaInfo.pattern.test(value)) {
        errors.push({
          key,
          message: `'${key}' does not match required pattern`,
          severity: 'error'
        });
      }
    }

    return errors;
  }

  /**
   * Validate production-specific requirements
   */
  private validateProductionRequirements(): ValidationError[] {
    const errors: ValidationError[] = [];

    // Check for development-only settings in production
    const devOnlyKeys = Object.entries(this.schema)
      .filter(([_, schema]) => schema.developmentOnly)
      .map(([key, _]) => key);

    for (const key of devOnlyKeys) {
      if (this.config[key as keyof EnvironmentConfig] !== undefined) {
        errors.push({
          key,
          message: `'${key}' should not be set in production`,
          severity: 'warning'
        });
      }
    }

    // Check for weak secrets in production
    const secretKeys = ['JWT_SECRET', 'ENCRYPTION_KEY', 'SESSION_SECRET'];
    for (const key of secretKeys) {
      const value = this.config[key as keyof EnvironmentConfig] as string;
      if (value && value.length < 32) {
        errors.push({
          key,
          message: `'${key}' should be at least 32 characters long in production`,
          severity: 'error'
        });
      }
    }

    return errors;
  }

  /**
   * Check for security issues
   */
  private checkSecurityIssues(): { issues: string[]; recommendations: string[] } {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check for insecure settings in production
    if (this.get('TAURI_DEBUG')) {
      issues.push('Debug mode is enabled in production');
      recommendations.push('Disable TAURI_DEBUG in production');
    }

    if (!this.get('SESSION_SECURE') && this.isProduction()) {
      issues.push('Session cookies are not secure in production');
      recommendations.push('Enable SESSION_SECURE in production');
    }

    if (this.get('DEV_DISABLE_AUTH')) {
      issues.push('Authentication is disabled');
      recommendations.push('Enable authentication in production');
    }

    return { issues, recommendations };
  }

  /**
   * Email validation
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * URL validation
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Define environment variable schema
   */
  private defineSchema(): EnvironmentSchema {
    return {
      // Application Environment
      NODE_ENV: {
        required: true,
        type: 'enum',
        enumValues: ['development', 'production', 'staging', 'testing'],
        default: 'development',
        description: 'Application environment'
      },
      APP_NAME: {
        required: true,
        type: 'string',
        default: 'BEAR AI Legal Assistant',
        description: 'Application name'
      },
      APP_VERSION: {
        required: true,
        type: 'string',
        default: '1.0.0',
        description: 'Application version'
      },
      APP_URL: {
        required: true,
        type: 'url',
        default: 'http://localhost:3000',
        description: 'Application URL'
      },
      API_BASE_URL: {
        required: true,
        type: 'url',
        default: 'http://localhost:1420',
        description: 'API base URL'
      },
      API_TIMEOUT: {
        required: false,
        type: 'number',
        default: 30000,
        description: 'API timeout in milliseconds'
      },
      API_VERSION: {
        required: false,
        type: 'string',
        default: 'v1',
        description: 'API version'
      },

      // Tauri Settings
      TAURI_DEBUG: {
        required: false,
        type: 'boolean',
        default: false,
        developmentOnly: true,
        description: 'Enable Tauri debug mode'
      },

      // Stripe Configuration
      STRIPE_PUBLISHABLE_KEY: {
        required: true,
        type: 'string',
        minLength: 20,
        pattern: /^pk_(test|live)_/,
        description: 'Stripe publishable key'
      },
      STRIPE_SECRET_KEY: {
        required: true,
        type: 'string',
        minLength: 20,
        pattern: /^sk_(test|live)_/,
        description: 'Stripe secret key'
      },
      STRIPE_WEBHOOK_SECRET: {
        required: true,
        type: 'string',
        minLength: 20,
        pattern: /^whsec_/,
        description: 'Stripe webhook secret'
      },
      STRIPE_ENVIRONMENT: {
        required: true,
        type: 'enum',
        enumValues: ['test', 'live'],
        default: 'test',
        description: 'Stripe environment'
      },

      // Authentication & Security
      JWT_SECRET: {
        required: true,
        type: 'string',
        minLength: 32,
        description: 'JWT signing secret'
      },
      JWT_EXPIRATION: {
        required: false,
        type: 'string',
        default: '7d',
        description: 'JWT expiration time'
      },
      JWT_ISSUER: {
        required: false,
        type: 'string',
        default: 'bear-ai-legal-assistant',
        description: 'JWT issuer'
      },
      JWT_AUDIENCE: {
        required: false,
        type: 'string',
        default: 'bear-ai-users',
        description: 'JWT audience'
      },
      SESSION_SECRET: {
        required: true,
        type: 'string',
        minLength: 32,
        description: 'Session secret key'
      },
      ENCRYPTION_KEY: {
        required: true,
        type: 'string',
        minLength: 32,
        maxLength: 32,
        description: 'Encryption key (exactly 32 characters)'
      },
      HASH_ROUNDS: {
        required: false,
        type: 'number',
        default: 12,
        description: 'Password hash rounds'
      },

      // Database Configuration
      DATABASE_URL: {
        required: true,
        type: 'string',
        description: 'Database connection URL'
      },
      DATABASE_ENCRYPTION_KEY: {
        required: true,
        type: 'string',
        minLength: 32,
        description: 'Database encryption key'
      },

      // Admin Configuration
      ADMIN_EMAIL: {
        required: true,
        type: 'email',
        description: 'Admin email address'
      },
      ADMIN_PASSWORD_HASH: {
        required: true,
        type: 'string',
        minLength: 20,
        description: 'Admin password hash'
      },

      // Logging
      LOG_LEVEL: {
        required: false,
        type: 'enum',
        enumValues: ['error', 'warn', 'info', 'debug'],
        default: 'info',
        description: 'Logging level'
      },
      LOG_FILE_PATH: {
        required: false,
        type: 'string',
        default: './logs/bear_ai.log',
        description: 'Log file path'
      },

      // Feature Flags
      ENABLE_USER_REGISTRATION: {
        required: false,
        type: 'boolean',
        default: true,
        description: 'Enable user registration'
      },
      ENABLE_BILLING_INTEGRATION: {
        required: false,
        type: 'boolean',
        default: true,
        description: 'Enable billing integration'
      },
      ENTERPRISE_MODE: {
        required: false,
        type: 'boolean',
        default: false,
        description: 'Enable enterprise features'
      },

      // Development Settings
      DEV_ENABLE_CORS: {
        required: false,
        type: 'boolean',
        default: true,
        developmentOnly: true,
        description: 'Enable CORS in development'
      },
      DEV_DISABLE_AUTH: {
        required: false,
        type: 'boolean',
        default: false,
        developmentOnly: true,
        description: 'Disable authentication in development'
      }
    };
  }
}

// Singleton instance
export const environmentManager = new EnvironmentManager();

// Helper function to get environment config
export const getEnvConfig = () => environmentManager.getAll();

// Helper function to check if production
export const isProduction = () => environmentManager.isProduction();

// Helper function to check if development
export const isDevelopment = () => environmentManager.isDevelopment();