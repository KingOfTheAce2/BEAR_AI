/**
 * Environment Configuration Manager
 * Centralizes all environment variable handling with validation and type safety
 */

export interface AppConfig {
  // Application Environment
  nodeEnv: 'development' | 'test' | 'production';
  tauriDebug: boolean;

  // API Configuration
  apiBaseUrl: string;
  apiTimeout: number;

  // Stripe Configuration
  stripe: {
    publishableKey: string;
    secretKey: string;
    webhookSecret: string;
    environment: 'test' | 'live';
    basicPriceId: string;
    proPriceId: string;
    enterprisePriceId: string;
    webhookUrl: string;
  };

  // Database Configuration
  database: {
    url: string;
    encryptionKey: string;
  };

  // Security Configuration
  security: {
    jwtSecret: string;
    jwtExpiration: string;
    encryptionKey: string;
    hashRounds: number;
  };

  // Logging Configuration
  logging: {
    level: 'error' | 'warn' | 'info' | 'debug';
    filePath: string;
  };

  // Feature Flags
  features: {
    paymentProcessing: boolean;
    subscriptionManagement: boolean;
    enterpriseBilling: boolean;
    webhookProcessing: boolean;
  };

  // Enterprise Configuration
  enterprise: {
    mode: boolean;
    maxTeamMembers: number;
    adminEmail: string;
  };

  // Development Configuration
  dev: {
    websocketUrl: string;
    ollamaApiUrl: string;
    streamingEndpoint: string;
  };
}

/**
 * Configuration validation errors
 */
export class ConfigValidationError extends Error {
  constructor(
    message: string,
    public readonly missingVars: string[] = [],
    public readonly invalidVars: string[] = []
  ) {
    super(message);
    this.name = 'ConfigValidationError';
  }
}

/**
 * Get environment variable with validation and sanitization
 */
function getEnvVar(key: string, defaultValue?: string, required = false): string {
  const value = process.env[key];
  const isProduction = process.env.NODE_ENV === 'production';

  // Only require critical vars in production
  if (!value && required && isProduction) {
    throw new ConfigValidationError(`Required environment variable ${key} is not set`);
  }

  // Sanitize input to prevent injection attacks
  const sanitized = value ? value.replace(/[<>'"](?![^<]*>)/g, '') : '';

  return sanitized || defaultValue || '';
}

/**
 * Get boolean environment variable
 */
function getBooleanEnv(key: string, defaultValue = false): boolean {
  const value = getEnvVar(key, defaultValue.toString());
  return value.toLowerCase() === 'true' || value === '1';
}

/**
 * Get number environment variable
 */
function getNumberEnv(key: string, defaultValue?: number, required = false): number {
  const value = getEnvVar(key, defaultValue?.toString(), required);
  const num = parseInt(value, 10);

  if (isNaN(num) && required) {
    throw new ConfigValidationError(`Environment variable ${key} must be a valid number`);
  }

  return isNaN(num) ? (defaultValue || 0) : num;
}

/**
 * Validate Stripe key format
 */
function validateStripeKey(key: string, type: 'publishable' | 'secret' | 'webhook'): boolean {
  // Allow placeholders in development
  if (process.env.NODE_ENV !== 'production' &&
      (key.includes('_test_') || key.includes('placeholder'))) {
    return true;
  }

  const patterns = {
    publishable: /^pk_(test_|live_)[a-zA-Z0-9]{24,}$/,
    secret: /^sk_(test_|live_)[a-zA-Z0-9]{24,}$/,
    webhook: /^whsec_[a-zA-Z0-9]{32,}$/
  };

  return patterns[type].test(key);
}

/**
 * Validate JWT secret strength with enhanced security
 */
function validateJwtSecret(secret: string): boolean {
  // Enhanced validation to prevent weak secrets
  return secret.length >= 32 &&
         !secret.includes('your_') &&
         !secret.includes('test_') &&
         !secret.includes('example') &&
         !secret.includes('placeholder');
}

/**
 * Generate secure default for development
 */
function generateSecureDefault(): string {
  const crypto = require('crypto');
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Load and validate configuration
 */
export function loadConfig(): AppConfig {
  const missingVars: string[] = [];
  const invalidVars: string[] = [];

  try {
    // Application Environment
    const nodeEnv = getEnvVar('NODE_ENV', 'development') as AppConfig['nodeEnv'];
    const tauriDebug = getBooleanEnv('TAURI_DEBUG', nodeEnv === 'development');

    // API Configuration
    const defaultApiBaseUrl = isProduction ? 'https://api.bear-ai.app' : 'http://localhost:1420';
    const apiBaseUrl = getEnvVar('API_BASE_URL', defaultApiBaseUrl);
    const apiTimeout = getNumberEnv('API_TIMEOUT', 30000);

    // Stripe Configuration - only required in production
    const isProduction = nodeEnv === 'production';
    const stripePublishableKey = getEnvVar('STRIPE_PUBLISHABLE_KEY', 'pk_test_placeholder', isProduction);
    const stripeSecretKey = getEnvVar('STRIPE_SECRET_KEY', 'sk_test_placeholder', isProduction);
    const stripeWebhookSecret = getEnvVar('STRIPE_WEBHOOK_SECRET', 'whsec_placeholder', isProduction);
    const stripeEnvironment = getEnvVar('STRIPE_ENVIRONMENT', 'test') as 'test' | 'live';

    // Validate Stripe keys
    if (stripePublishableKey && !validateStripeKey(stripePublishableKey, 'publishable')) {
      invalidVars.push('STRIPE_PUBLISHABLE_KEY');
    }
    if (stripeSecretKey && !validateStripeKey(stripeSecretKey, 'secret')) {
      invalidVars.push('STRIPE_SECRET_KEY');
    }
    if (stripeWebhookSecret && !validateStripeKey(stripeWebhookSecret, 'webhook')) {
      invalidVars.push('STRIPE_WEBHOOK_SECRET');
    }

    // Database Configuration
    const databaseUrl = getEnvVar('DATABASE_URL', 'sqlite://./bear_ai.db');
    const databaseEncryptionKey = getEnvVar('DATABASE_ENCRYPTION_KEY',
      isProduction ? '' : generateSecureDefault(), isProduction);

    // Security Configuration - with secure defaults for development
    const jwtSecret = getEnvVar('JWT_SECRET',
      isProduction ? '' : generateSecureDefault(), isProduction);
    const jwtExpiration = getEnvVar('JWT_EXPIRATION', '7d');
    const encryptionKey = getEnvVar('ENCRYPTION_KEY',
      isProduction ? '' : generateSecureDefault(), isProduction);
    const hashRounds = getNumberEnv('HASH_ROUNDS', 12);

    // Validate security configuration
    if (jwtSecret && !validateJwtSecret(jwtSecret)) {
      invalidVars.push('JWT_SECRET (must be at least 32 characters)');
    }
    if (encryptionKey && encryptionKey.length < 32) {
      invalidVars.push('ENCRYPTION_KEY (must be at least 32 characters)');
    }
    if (databaseEncryptionKey && databaseEncryptionKey.length < 32) {
      invalidVars.push('DATABASE_ENCRYPTION_KEY (must be at least 32 characters)');
    }

    // Logging Configuration
    const logLevel = getEnvVar('LOG_LEVEL', 'info') as AppConfig['logging']['level'];
    const logFilePath = getEnvVar('LOG_FILE_PATH', './logs/bear_ai.log');

    // Feature Flags
    const enablePaymentProcessing = getBooleanEnv('ENABLE_PAYMENT_PROCESSING', true);
    const enableSubscriptionManagement = getBooleanEnv('ENABLE_SUBSCRIPTION_MANAGEMENT', true);
    const enableEnterpriseBilling = getBooleanEnv('ENABLE_ENTERPRISE_BILLING', false);
    const enableWebhookProcessing = getBooleanEnv('ENABLE_WEBHOOK_PROCESSING', true);

    // Enterprise Configuration
    const enterpriseMode = getBooleanEnv('ENTERPRISE_MODE', false);
    const maxTeamMembers = getNumberEnv('MAX_TEAM_MEMBERS', 10);
    const adminEmail = getEnvVar('ADMIN_EMAIL', 'admin@example.com');

    // Warn about default admin email
    if (adminEmail === 'admin@example.com' && isProduction) {
      // Warning logging disabled for production
    }

    // Development Configuration
    const defaultWebsocketUrl = isProduction ? 'wss://ws.bear-ai.app/chat' : 'ws://localhost:8080/chat';
    const defaultOllamaUrl = isProduction ? 'https://ollama.bear-ai.app/api/chat' : 'http://localhost:11434/api/chat';
    const defaultStreamingUrl = isProduction ? 'wss://stream.bear-ai.app/api/stream' : 'ws://localhost:3001/api/stream';

    const websocketUrl = getEnvVar('WEBSOCKET_URL', defaultWebsocketUrl);
    const ollamaApiUrl = getEnvVar('OLLAMA_API_URL', defaultOllamaUrl);
    const streamingEndpoint = getEnvVar('STREAMING_ENDPOINT', defaultStreamingUrl);

    // Collect missing required variables for production
    if (isProduction) {
      const requiredProdVars = [
        { key: 'STRIPE_PUBLISHABLE_KEY', value: stripePublishableKey },
        { key: 'STRIPE_SECRET_KEY', value: stripeSecretKey },
        { key: 'JWT_SECRET', value: jwtSecret },
        { key: 'ENCRYPTION_KEY', value: encryptionKey },
        { key: 'DATABASE_ENCRYPTION_KEY', value: databaseEncryptionKey }
      ];

      requiredProdVars.forEach(({ key, value }) => {
        if (!value || value.includes('placeholder')) {
          missingVars.push(key);
        }
      });
    }

    // Check for validation errors - only fail in production
    if (isProduction && (missingVars.length > 0 || invalidVars.length > 0)) {
      throw new ConfigValidationError(
        `Configuration validation failed: ${missingVars.length} missing variables, ${invalidVars.length} invalid variables`,
        missingVars,
        invalidVars
      );
    } else if (!isProduction && (missingVars.length > 0 || invalidVars.length > 0)) {
      // console.warn('⚠️ Configuration warnings (development mode):', {
        missing: missingVars,
        invalid: invalidVars,
        note: 'Using secure defaults for development'
      });
    }

    return {
      nodeEnv,
      tauriDebug,
      apiBaseUrl,
      apiTimeout,
      stripe: {
        publishableKey: stripePublishableKey,
        secretKey: stripeSecretKey,
        webhookSecret: stripeWebhookSecret,
        environment: stripeEnvironment,
        basicPriceId: getEnvVar('STRIPE_BASIC_PRICE_ID', ''),
        proPriceId: getEnvVar('STRIPE_PRO_PRICE_ID', ''),
        enterprisePriceId: getEnvVar('STRIPE_ENTERPRISE_PRICE_ID', ''),
        webhookUrl: getEnvVar('STRIPE_WEBHOOK_URL', '')
      },
      database: {
        url: databaseUrl,
        encryptionKey: databaseEncryptionKey
      },
      security: {
        jwtSecret,
        jwtExpiration,
        encryptionKey,
        hashRounds
      },
      logging: {
        level: logLevel,
        filePath: logFilePath
      },
      features: {
        paymentProcessing: enablePaymentProcessing,
        subscriptionManagement: enableSubscriptionManagement,
        enterpriseBilling: enableEnterpriseBilling,
        webhookProcessing: enableWebhookProcessing
      },
      enterprise: {
        mode: enterpriseMode,
        maxTeamMembers,
        adminEmail
      },
      dev: {
        websocketUrl,
        ollamaApiUrl,
        streamingEndpoint
      }
    };
  } catch (error) {
    if (error instanceof ConfigValidationError) {
      throw error;
    }
    throw new ConfigValidationError(`Failed to load configuration: ${error}`);
  }
}

// Global configuration instance
let config: AppConfig | null = null;

/**
 * Get the current configuration (singleton)
 */
export function getConfig(): AppConfig {
  if (!config) {
    config = loadConfig();
  }
  return config;
}

/**
 * Reload configuration (useful for testing)
 */
export function reloadConfig(): AppConfig {
  config = null;
  return getConfig();
}

/**
 * Validate configuration without loading
 */
export function validateConfiguration(): { valid: boolean; errors: string[] } {
  try {
    loadConfig();
    return { valid: true, errors: [] };
  } catch (error) {
    if (error instanceof ConfigValidationError) {
      const errors = [
        ...error.missingVars.map(v => `Missing: ${v}`),
        ...error.invalidVars.map(v => `Invalid: ${v}`)
      ];
      return { valid: false, errors };
    }
    return { valid: false, errors: [error instanceof Error ? error.message : String(error)] };
  }
}

// Export for use in other modules
export default getConfig;