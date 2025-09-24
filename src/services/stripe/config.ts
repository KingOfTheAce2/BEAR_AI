/**
 * Stripe Production Configuration Manager
 *
 * Secure configuration management for Stripe production environment
 * with validation, environment detection, and compliance features.
 */

import {
  StripeConfig,
  StripeEnvironmentConfig,
  StripeSecurityConfig,
  ComplianceFlags,
  ConfigValidationResult,
  StripeServiceConfig
} from './types';

/**
 * Environment-specific configuration loader
 */
export class StripeConfigManager {
  private config: StripeServiceConfig;
  private isProduction: boolean;

  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
    this.config = this.loadConfiguration();
    this.validateConfiguration();
  }

  /**
   * Loads configuration from environment variables and defaults
   */
  private loadConfiguration(): StripeServiceConfig {
    const environment: StripeEnvironmentConfig = {
      apiKey: this.getRequiredEnvVar('STRIPE_SECRET_KEY'),
      webhookSecret: this.getRequiredEnvVar('STRIPE_WEBHOOK_SECRET'),
      publishableKey: this.getRequiredEnvVar('STRIPE_PUBLISHABLE_KEY'),
      environment: this.isProduction ? 'production' : 'test',
      allowedOrigins: this.parseArrayEnvVar('STRIPE_ALLOWED_ORIGINS', [
        'https://bear-ai.com',
        'https://app.bear-ai.com',
        'https://secure.bear-ai.com'
      ]),
      maxTransactionAmount: parseInt(process.env.STRIPE_MAX_TRANSACTION_AMOUNT || '1000000'), // $10,000 default
      defaultCurrency: process.env.STRIPE_DEFAULT_CURRENCY || 'usd',
      supportedCurrencies: this.parseArrayEnvVar('STRIPE_SUPPORTED_CURRENCIES', [
        'usd', 'eur', 'gbp', 'cad', 'aud', 'jpy'
      ])
    };

    const security: StripeSecurityConfig = {
      webhookTolerance: parseInt(process.env.STRIPE_WEBHOOK_TOLERANCE || '300'),
      maxRetries: parseInt(process.env.STRIPE_MAX_RETRIES || '3'),
      retryDelay: parseInt(process.env.STRIPE_RETRY_DELAY || '1000'),
      timeoutMs: parseInt(process.env.STRIPE_TIMEOUT_MS || '15000'),
      rateLimitWindow: parseInt(process.env.STRIPE_RATE_LIMIT_WINDOW || '60000'),
      rateLimitMax: parseInt(process.env.STRIPE_RATE_LIMIT_MAX || '100'),
      ipWhitelist: this.parseArrayEnvVar('STRIPE_IP_WHITELIST'),
      requiresAuthentication: process.env.STRIPE_REQUIRES_AUTH !== 'false'
    };

    const compliance: ComplianceFlags = {
      requiresKYC: process.env.STRIPE_REQUIRES_KYC === 'true',
      requiresAMLCheck: process.env.STRIPE_REQUIRES_AML === 'true',
      restrictedCountries: this.parseArrayEnvVar('STRIPE_RESTRICTED_COUNTRIES', [
        'CU', 'IR', 'KP', 'SY' // OFAC sanctioned countries
      ]),
      highRiskThreshold: parseInt(process.env.STRIPE_HIGH_RISK_THRESHOLD || '10000'), // $100
      velocityLimits: {
        daily: parseInt(process.env.STRIPE_DAILY_LIMIT || '100000'), // $1,000
        weekly: parseInt(process.env.STRIPE_WEEKLY_LIMIT || '500000'), // $5,000
        monthly: parseInt(process.env.STRIPE_MONTHLY_LIMIT || '2000000') // $20,000
      }
    };

    const billing = {
      allowedFeatures: this.parseArrayEnvVar('STRIPE_BILLING_FEATURES', [
        'customer_update',
        'payment_method_update',
        'invoice_history',
        'subscription_pause',
        'subscription_cancel'
      ]) as any[],
      returnUrl: process.env.STRIPE_BILLING_RETURN_URL || 'https://app.bear-ai.com/billing',
      customMessage: process.env.STRIPE_BILLING_MESSAGE,
      termsOfServiceUrl: process.env.STRIPE_TERMS_URL || 'https://bear-ai.com/terms',
      privacyPolicyUrl: process.env.STRIPE_PRIVACY_URL || 'https://bear-ai.com/privacy'
    };

    const invoicing = {
      logoUrl: process.env.STRIPE_INVOICE_LOGO_URL,
      companyName: process.env.STRIPE_COMPANY_NAME || 'BEAR AI',
      companyAddress: {
        line1: process.env.STRIPE_COMPANY_ADDRESS_LINE1 || '',
        line2: process.env.STRIPE_COMPANY_ADDRESS_LINE2,
        city: process.env.STRIPE_COMPANY_CITY || '',
        state: process.env.STRIPE_COMPANY_STATE,
        postalCode: process.env.STRIPE_COMPANY_POSTAL_CODE || '',
        country: process.env.STRIPE_COMPANY_COUNTRY || 'US'
      },
      taxId: process.env.STRIPE_COMPANY_TAX_ID,
      footerText: process.env.STRIPE_INVOICE_FOOTER,
      customFields: this.parseCustomFields()
    };

    const webhooks = [{
      url: this.getRequiredEnvVar('STRIPE_WEBHOOK_URL'),
      enabledEvents: this.parseArrayEnvVar('STRIPE_WEBHOOK_EVENTS', [
        'payment_intent.succeeded',
        'payment_intent.payment_failed',
        'customer.subscription.created',
        'customer.subscription.updated',
        'customer.subscription.deleted',
        'invoice.paid',
        'invoice.payment_failed',
        'charge.dispute.created'
      ]),
      description: 'BEAR AI Production Webhook',
      apiVersion: '2024-06-20'
    }];

    return {
      environment,
      security,
      compliance,
      billing,
      invoicing,
      webhooks
    };
  }

  /**
   * Validates the loaded configuration
   */
  private validateConfiguration(): ConfigValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const securityIssues: string[] = [];
    const recommendations: string[] = [];

    // Validate API keys
    if (this.isProduction && !this.config.environment.apiKey.startsWith('sk_live_')) {
      errors.push('Production environment requires live API key (sk_live_...)');
    }

    if (!this.isProduction && !this.config.environment.apiKey.startsWith('sk_test_')) {
      warnings.push('Test environment should use test API key (sk_test_...)');
    }

    // Validate webhook secret
    if (this.config.environment.webhookSecret.length < 32) {
      securityIssues.push('Webhook secret should be at least 32 characters for security');
    }

    // Validate security settings
    if (this.config.security.maxRetries < 3) {
      warnings.push('Consider increasing max retries to at least 3 for production resilience');
    }

    if (this.config.security.timeoutMs < 10000) {
      warnings.push('Timeout should be at least 10 seconds for production stability');
    }

    // Validate rate limiting
    if (this.config.security.rateLimitMax > 1000) {
      warnings.push('High rate limit may impact performance and security');
    }

    // Validate compliance settings
    if (this.isProduction && !this.config.compliance.requiresKYC) {
      recommendations.push('Consider enabling KYC for production compliance');
    }

    // Validate transaction limits
    if (this.config.environment.maxTransactionAmount > 10000000) { // $100,000
      securityIssues.push('Very high transaction limits may require additional compliance measures');
    }

    // Validate webhook configuration
    if (this.config.webhooks[0].url.startsWith('http://')) {
      securityIssues.push('Webhook URL must use HTTPS in production');
    }

    // Validate allowed origins
    if (this.config.environment.allowedOrigins.some(origin => origin.startsWith('http://'))) {
      securityIssues.push('All allowed origins should use HTTPS in production');
    }

    // Additional production checks
    if (this.isProduction) {
      if (!this.config.security.ipWhitelist || this.config.security.ipWhitelist.length === 0) {
        recommendations.push('Consider implementing IP whitelisting for sensitive operations');
      }

      if (!this.config.invoicing.taxId) {
        warnings.push('Tax ID not configured - may be required for compliance');
      }

      if (!this.config.invoicing.logoUrl) {
        recommendations.push('Consider adding company logo URL for professional invoices');
      }
    }

    const result: ConfigValidationResult = {
      isValid: errors.length === 0 && securityIssues.length === 0,
      errors,
      warnings,
      securityIssues,
      recommendations
    };

    if (!result.isValid) {
      const allIssues = [...errors, ...securityIssues].join(', ');
      throw new Error(`Configuration validation failed: ${allIssues}`);
    }

    if (warnings.length > 0 || recommendations.length > 0) {
      // Warning logging disabled for production
    }

    return result;
  }

  /**
   * Gets the validated configuration
   */
  getConfig(): StripeServiceConfig {
    return this.config;
  }

  /**
   * Gets Stripe-specific configuration for the main service
   */
  getStripeConfig(): StripeConfig {
    return {
      apiKey: this.config.environment.apiKey,
      webhookSecret: this.config.environment.webhookSecret,
      apiVersion: '2024-06-20' as const,
      maxNetworkRetries: this.config.security.maxRetries,
      timeout: this.config.security.timeoutMs,
      telemetry: false, // Disable telemetry for privacy
      protocol: 'https' as const
    };
  }

  /**
   * Checks if current environment is production
   */
  isProductionEnvironment(): boolean {
    return this.isProduction;
  }

  /**
   * Gets environment-specific feature flags
   */
  getFeatureFlags(): Record<string, boolean> {
    return {
      enableAdvancedFraudDetection: this.isProduction,
      enableAutomaticTax: this.config.environment.supportedCurrencies.length > 1,
      enableKYC: this.config.compliance.requiresKYC,
      enableAMLChecks: this.config.compliance.requiresAMLCheck,
      enableVelocityLimits: this.isProduction,
      enableIPWhitelisting: !!this.config.security.ipWhitelist?.length,
      enableDetailedLogging: this.isProduction,
      enableWebhookRetries: true,
      enableMarketplaceFunctionality: false, // Can be enabled later
      enableConnectedAccounts: false // Can be enabled later
    };
  }

  /**
   * Gets compliance configuration based on jurisdiction
   */
  getComplianceConfig(country?: string): ComplianceFlags {
    const baseCompliance = this.config.compliance;

    // Adjust compliance based on country
    if (country) {
      // EU countries require stronger compliance
      const euCountries = ['DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'IE', 'PT', 'FI', 'GR'];
      if (euCountries.includes(country.toUpperCase())) {
        return {
          ...baseCompliance,
          requiresKYC: true,
          requiresAMLCheck: true,
          velocityLimits: {
            daily: Math.min(baseCompliance.velocityLimits.daily, 50000), // €500
            weekly: Math.min(baseCompliance.velocityLimits.weekly, 300000), // €3,000
            monthly: Math.min(baseCompliance.velocityLimits.monthly, 1500000) // €15,000
          }
        };
      }

      // High-risk countries
      const highRiskCountries = ['AF', 'BD', 'BO', 'KH', 'LA', 'MN', 'MM', 'NP', 'PK', 'LK'];
      if (highRiskCountries.includes(country.toUpperCase())) {
        return {
          ...baseCompliance,
          requiresKYC: true,
          requiresAMLCheck: true,
          highRiskThreshold: 5000, // $50
          velocityLimits: {
            daily: 10000, // $100
            weekly: 50000, // $500
            monthly: 200000 // $2,000
          }
        };
      }
    }

    return baseCompliance;
  }

  /**
   * Updates configuration dynamically (for runtime adjustments)
   */
  updateConfig(updates: Partial<StripeServiceConfig>): void {
    this.config = { ...this.config, ...updates };
    this.validateConfiguration();
  }

  // Private helper methods

  private getRequiredEnvVar(name: string): string {
    const value = process.env[name];
    if (!value) {
      throw new Error(`Required environment variable ${name} is not set`);
    }
    return value;
  }

  private parseArrayEnvVar(name: string, defaultValue: string[] = []): string[] {
    const value = process.env[name];
    if (!value) return defaultValue;

    return value.split(',').map(item => item.trim()).filter(item => item.length > 0);
  }

  private parseCustomFields(): Array<{ name: string; value: string }> {
    const customFieldsJson = process.env.STRIPE_INVOICE_CUSTOM_FIELDS;
    if (!customFieldsJson) return [];

    try {
      return JSON.parse(customFieldsJson);
    } catch {
      // Warning logging disabled for production
      return [];
    }
  }
}

/**
 * Singleton instance for application-wide configuration access
 */
let configManager: StripeConfigManager | null = null;

export function getStripeConfigManager(): StripeConfigManager {
  if (!configManager) {
    configManager = new StripeConfigManager();
  }
  return configManager;
}

/**
 * Helper function to get production-ready Stripe configuration
 */
export function createProductionStripeConfig(): StripeConfig {
  return getStripeConfigManager().getStripeConfig();
}

/**
 * Environment variable validation helper
 */
export function validateEnvironmentVariables(): {
  isValid: boolean;
  missingVars: string[];
  invalidVars: string[];
} {
  const requiredVars = [
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'STRIPE_PUBLISHABLE_KEY',
    'STRIPE_WEBHOOK_URL'
  ];

  const missingVars: string[] = [];
  const invalidVars: string[] = [];

  for (const varName of requiredVars) {
    const value = process.env[varName];
    if (!value) {
      missingVars.push(varName);
      continue;
    }

    // Validate specific formats
    switch (varName) {
      case 'STRIPE_SECRET_KEY':
        if (process.env.NODE_ENV === 'production' && !value.startsWith('sk_live_')) {
          invalidVars.push(`${varName} must be a live key in production`);
        }
        if (process.env.NODE_ENV !== 'production' && !value.startsWith('sk_test_')) {
          invalidVars.push(`${varName} should be a test key in development`);
        }
        break;
      case 'STRIPE_PUBLISHABLE_KEY':
        if (process.env.NODE_ENV === 'production' && !value.startsWith('pk_live_')) {
          invalidVars.push(`${varName} must be a live key in production`);
        }
        break;
      case 'STRIPE_WEBHOOK_URL':
        if (!value.startsWith('https://')) {
          invalidVars.push(`${varName} must use HTTPS`);
        }
        break;
      case 'STRIPE_WEBHOOK_SECRET':
        if (value.length < 32) {
          invalidVars.push(`${varName} must be at least 32 characters`);
        }
        break;
    }
  }

  return {
    isValid: missingVars.length === 0 && invalidVars.length === 0,
    missingVars,
    invalidVars
  };
}

export { StripeConfigManager };