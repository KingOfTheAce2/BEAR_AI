/**
 * Environment Integration Layer for BEAR AI
 * Integrates new environment management with existing configuration systems
 */

import { environmentManager, EnvironmentConfig } from './environmentManager';
import { environmentValidator } from '../utils/environmentValidator';
import { environmentHealthChecker } from '../utils/environmentHealthCheck';
import { logger } from './logger';

export class EnvironmentIntegration {
  private static instance: EnvironmentIntegration;
  private isInitialized = false;

  public static getInstance(): EnvironmentIntegration {
    if (!EnvironmentIntegration.instance) {
      EnvironmentIntegration.instance = new EnvironmentIntegration();
    }
    return EnvironmentIntegration.instance;
  }

  /**
   * Initialize environment management system
   */
  public async initialize(): Promise<boolean> {
    if (this.isInitialized) {
      return true;
    }

    try {
      logger.info('Initializing environment management system');

      // Load and validate environment variables
      const validation = await environmentManager.load();

      if (!validation.isValid) {
        logger.error('Environment validation failed', {
          errors: validation.errors,
          missingRequired: validation.missingRequired
        });

        // In development, log warnings but continue
        if (environmentManager.isDevelopment()) {
          logger.warn('Continuing with invalid environment in development mode');
        } else {
          // In production, fail fast
          throw new Error('Environment validation failed in production mode');
        }
      }

      // Perform security audit
      const securityAudit = environmentValidator.performSecurityAudit();
      if (securityAudit.level === 'critical' && environmentManager.isProduction()) {
        logger.error('Critical security issues found in production', {
          score: securityAudit.score,
          issues: securityAudit.issues
        });
        throw new Error('Critical security issues prevent production startup');
      }

      // Start health monitoring in production
      if (environmentManager.isProduction()) {
        environmentHealthChecker.startMonitoring(300000); // 5 minutes
        logger.info('Environment health monitoring started');
      }

      this.isInitialized = true;
      logger.info('Environment management system initialized successfully');

      return true;
    } catch (error) {
      logger.error('Failed to initialize environment management', { error });
      return false;
    }
  }

  /**
   * Get configuration value with fallback to legacy system
   */
  public get<K extends keyof EnvironmentConfig>(key: K): EnvironmentConfig[K] | undefined {
    try {
      return environmentManager.get(key);
    } catch (error) {
      logger.warn('Failed to get environment variable, falling back to process.env', { key, error });
      return process.env[key] as EnvironmentConfig[K] | undefined;
    }
  }

  /**
   * Get configuration value with default
   */
  public getWithDefault<K extends keyof EnvironmentConfig>(
    key: K,
    defaultValue: EnvironmentConfig[K]
  ): EnvironmentConfig[K] {
    try {
      return environmentManager.getWithDefault(key, defaultValue);
    } catch (error) {
      logger.warn('Failed to get environment variable with default, using fallback', { key, error });
      const envValue = process.env[key];
      return envValue !== undefined ? (envValue as EnvironmentConfig[K]) : defaultValue;
    }
  }

  /**
   * Check if environment is properly configured
   */
  public isConfigured(): boolean {
    return this.isInitialized && environmentManager.isValid();
  }

  /**
   * Get environment status for health checks
   */
  public async getStatus(): Promise<{
    initialized: boolean;
    valid: boolean;
    healthy: boolean;
    environment: string;
    issues: string[];
  }> {
    const healthStatus = environmentManager.getHealthStatus();
    const lastHealthCheck = environmentHealthChecker.getLastCheck();

    return {
      initialized: this.isInitialized,
      valid: environmentManager.isValid(),
      healthy: lastHealthCheck?.status === 'healthy' || false,
      environment: environmentManager.get('NODE_ENV') || 'unknown',
      issues: healthStatus.issues
    };
  }

  /**
   * Integration with existing configuration systems
   */
  public getLegacyCompatibleConfig(): any {
    const config = environmentManager.getAll();

    // Convert to format expected by existing systems
    return {
      // Application settings
      app: {
        name: config.APP_NAME,
        version: config.APP_VERSION,
        url: config.APP_URL,
        environment: config.NODE_ENV
      },

      // API settings
      api: {
        baseUrl: config.API_BASE_URL,
        timeout: config.API_TIMEOUT,
        version: config.API_VERSION
      },

      // Database settings
      database: {
        url: config.DATABASE_URL,
        encryptionKey: config.DATABASE_ENCRYPTION_KEY,
        timeout: config.DATABASE_TIMEOUT,
        retryAttempts: config.DATABASE_RETRY_ATTEMPTS
      },

      // Authentication settings
      auth: {
        jwtSecret: config.JWT_SECRET,
        jwtExpiration: config.JWT_EXPIRATION,
        jwtIssuer: config.JWT_ISSUER,
        jwtAudience: config.JWT_AUDIENCE,
        sessionSecret: config.SESSION_SECRET,
        sessionTimeout: config.SESSION_TIMEOUT,
        sessionSecure: config.SESSION_SECURE
      },

      // Security settings
      security: {
        encryptionKey: config.ENCRYPTION_KEY,
        encryptionAlgorithm: config.ENCRYPTION_ALGORITHM,
        hashRounds: config.HASH_ROUNDS,
        saltRounds: config.SALT_ROUNDS
      },

      // Stripe settings
      stripe: {
        publishableKey: config.STRIPE_PUBLISHABLE_KEY,
        secretKey: config.STRIPE_SECRET_KEY,
        webhookSecret: config.STRIPE_WEBHOOK_SECRET,
        environment: config.STRIPE_ENVIRONMENT,
        basicPriceId: config.STRIPE_BASIC_PRICE_ID,
        proPriceId: config.STRIPE_PRO_PRICE_ID,
        enterprisePriceId: config.STRIPE_ENTERPRISE_PRICE_ID
      },

      // Logging settings
      logging: {
        level: config.LOG_LEVEL,
        format: config.LOG_FORMAT,
        filePath: config.LOG_FILE_PATH,
        maxFileSize: config.LOG_MAX_FILE_SIZE,
        maxFiles: config.LOG_MAX_FILES
      },

      // Feature flags
      features: {
        enableUserRegistration: config.ENABLE_USER_REGISTRATION,
        enablePasswordReset: config.ENABLE_PASSWORD_RESET,
        enableEmailVerification: config.ENABLE_EMAIL_VERIFICATION,
        enableTwoFactorAuth: config.ENABLE_TWO_FACTOR_AUTH,
        enableDocumentAnalysis: config.ENABLE_DOCUMENT_ANALYSIS,
        enableContractReview: config.ENABLE_CONTRACT_REVIEW,
        enableLegalResearch: config.ENABLE_LEGAL_RESEARCH,
        enableAiChat: config.ENABLE_AI_CHAT,
        enableDocumentSummarization: config.ENABLE_DOCUMENT_SUMMARIZATION,
        enableBillingIntegration: config.ENABLE_BILLING_INTEGRATION
      },

      // Development settings
      development: {
        enableCors: config.DEV_ENABLE_CORS,
        enableDebugLogs: config.DEV_ENABLE_DEBUG_LOGS,
        enableHotReload: config.DEV_ENABLE_HOT_RELOAD,
        disableAuth: config.DEV_DISABLE_AUTH
      },

      // Enterprise settings
      enterprise: {
        mode: config.ENTERPRISE_MODE,
        licenseKey: config.ENTERPRISE_LICENSE_KEY,
        maxTeamMembers: config.MAX_TEAM_MEMBERS,
        maxDocumentsPerUser: config.MAX_DOCUMENTS_PER_USER,
        maxStoragePerUser: config.MAX_STORAGE_PER_USER
      }
    };
  }

  /**
   * Validate configuration for specific features
   */
  public validateFeatureConfig(feature: string): { valid: boolean; issues: string[] } {
    const issues: string[] = [];

    switch (feature) {
      case 'stripe':
        if (!this.get('STRIPE_SECRET_KEY')) {
          issues.push('STRIPE_SECRET_KEY is required for payment processing');
        }
        if (!this.get('STRIPE_PUBLISHABLE_KEY')) {
          issues.push('STRIPE_PUBLISHABLE_KEY is required for payment processing');
        }
        if (!this.get('STRIPE_WEBHOOK_SECRET')) {
          issues.push('STRIPE_WEBHOOK_SECRET is required for webhook processing');
        }
        break;

      case 'auth':
        if (!this.get('JWT_SECRET')) {
          issues.push('JWT_SECRET is required for authentication');
        }
        if (!this.get('SESSION_SECRET')) {
          issues.push('SESSION_SECRET is required for session management');
        }
        break;

      case 'database':
        if (!this.get('DATABASE_URL')) {
          issues.push('DATABASE_URL is required for database connection');
        }
        if (!this.get('DATABASE_ENCRYPTION_KEY')) {
          issues.push('DATABASE_ENCRYPTION_KEY is required for data encryption');
        }
        break;

      case 'admin':
        if (!this.get('ADMIN_EMAIL')) {
          issues.push('ADMIN_EMAIL is required for admin account');
        }
        if (!this.get('ADMIN_PASSWORD_HASH')) {
          issues.push('ADMIN_PASSWORD_HASH is required for admin account');
        }
        break;

      default:
        issues.push(`Unknown feature: ${feature}`);
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }

  /**
   * Generate configuration summary for debugging
   */
  public getConfigSummary(): {
    environment: string;
    configuredVariables: number;
    missingRequired: string[];
    securityScore: number;
    healthStatus: string;
    lastUpdated: Date | null;
  } {
    const config = environmentManager.getAll();
    const validation = environmentManager.getValidationResult();
    const securityAudit = environmentValidator.performSecurityAudit();
    const lastCheck = environmentHealthChecker.getLastCheck();

    return {
      environment: config.NODE_ENV || 'unknown',
      configuredVariables: Object.keys(config).length,
      missingRequired: validation?.missingRequired || [],
      securityScore: securityAudit.score,
      healthStatus: lastCheck?.status || 'unknown',
      lastUpdated: lastCheck?.timestamp || null
    };
  }

  /**
   * Export configuration for external systems
   */
  public exportConfig(format: 'json' | 'yaml' | 'env' = 'json'): string {
    const config = this.getLegacyCompatibleConfig();

    switch (format) {
      case 'json':
        return JSON.stringify(config, null, 2);

      case 'yaml':
        // Simple YAML export (would need yaml library for full support)
        return Object.entries(config)
          .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
          .join('\\n');

      case 'env':
        // Export as environment variables
        const flatConfig = this.flattenConfig(config);
        return Object.entries(flatConfig)
          .map(([key, value]) => `${key}=${value}`)
          .join('\\n');

      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Shutdown environment management system
   */
  public shutdown(): void {
    if (this.isInitialized) {
      environmentHealthChecker.stopMonitoring();
      this.isInitialized = false;
      logger.info('Environment management system shutdown');
    }
  }

  // Private helper methods

  private flattenConfig(obj: any, prefix = ''): { [key: string]: any } {
    const result: { [key: string]: any } = {};

    for (const [key, value] of Object.entries(obj)) {
      const newKey = prefix ? `${prefix}_${key.toUpperCase()}` : key.toUpperCase();

      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        Object.assign(result, this.flattenConfig(value, newKey));
      } else {
        result[newKey] = value;
      }
    }

    return result;
  }
}

// Export singleton instance
export const environmentIntegration = EnvironmentIntegration.getInstance();

// Helper functions for backward compatibility
export const getConfig = (key: string) => environmentIntegration.get(key as any);
export const getConfigWithDefault = (key: string, defaultValue: any) =>
  environmentIntegration.getWithDefault(key as any, defaultValue);
export const isConfigured = () => environmentIntegration.isConfigured();
export const getLegacyConfig = () => environmentIntegration.getLegacyCompatibleConfig();