/**
 * Security Factory
 * Factory class for creating and configuring security components
 */

import { ProductionSecurity, SecurityConfig, defaultSecurityConfig } from './ProductionSecurity';
import { SecurityEventLogger } from './monitoring/SecurityEventLogger';

export class SecurityFactory {
  /**
   * Create production security instance with environment-specific configuration
   */
  public static createProductionSecurity(environment: 'development' | 'staging' | 'production'): ProductionSecurity {
    const config = this.getEnvironmentConfig(environment);
    return new ProductionSecurity(config);
  }

  /**
   * Create security instance with custom configuration
   */
  public static createCustomSecurity(config: Partial<SecurityConfig>): ProductionSecurity {
    const mergedConfig = { ...defaultSecurityConfig, ...config };
    return new ProductionSecurity(mergedConfig);
  }

  /**
   * Get environment-specific security configuration
   */
  private static getEnvironmentConfig(environment: 'development' | 'staging' | 'production'): SecurityConfig {
    const baseConfig = { ...defaultSecurityConfig };

    switch (environment) {
      case 'development':
        return {
          ...baseConfig,
          certificates: {
            ...baseConfig.certificates,
            pinningEnabled: false // Disable certificate pinning in development
          },
          headers: {
            ...baseConfig.headers,
            csp: {
              directives: {
                ...baseConfig.headers.csp.directives,
                'script-src': ["'self'", "'unsafe-eval'", "'unsafe-inline'"], // More permissive for development
                'style-src': ["'self'", "'unsafe-inline'"]
              }
            }
          },
          validation: {
            ...baseConfig.validation,
            sanitizeLevel: 'basic' // Less strict validation in development
          },
          logging: {
            ...baseConfig.logging,
            level: 'debug'
          }
        };

      case 'staging':
        return {
          ...baseConfig,
          certificates: {
            ...baseConfig.certificates,
            pinningEnabled: true,
            pinningValidation: true
          },
          headers: {
            ...baseConfig.headers,
            csp: {
              directives: {
                ...baseConfig.headers.csp.directives,
                'script-src': ["'self'"],
                'style-src': ["'self'", "'unsafe-inline'"] // Allow inline styles for staging
              }
            }
          },
          validation: {
            ...baseConfig.validation,
            sanitizeLevel: 'moderate'
          },
          logging: {
            ...baseConfig.logging,
            level: 'info'
          }
        };

      case 'production':
        return {
          ...baseConfig,
          certificates: {
            ...baseConfig.certificates,
            pinningEnabled: true,
            pinningValidation: true
          },
          headers: {
            ...baseConfig.headers,
            csp: {
              directives: {
                ...baseConfig.headers.csp.directives,
                'script-src': ["'self'"],
                'style-src': ["'self'"]
              }
            },
            hsts: {
              maxAge: 31536000, // 1 year
              includeSubDomains: true,
              preload: true
            }
          },
          validation: {
            ...baseConfig.validation,
            sanitizeLevel: 'strict'
          },
          rateLimit: {
            ...baseConfig.rateLimit,
            windowMs: 15 * 60 * 1000, // 15 minutes
            maxRequests: 100
          },
          logging: {
            ...baseConfig.logging,
            level: 'warn'
          }
        };

      default:
        return baseConfig;
    }
  }

  /**
   * Create security event logger with environment configuration
   */
  public static createSecurityLogger(environment: 'development' | 'staging' | 'production'): SecurityEventLogger {
    const config = this.getLoggerConfig(environment);
    return new SecurityEventLogger(config);
  }

  /**
   * Get logger configuration for environment
   */
  private static getLoggerConfig(environment: string) {
    const baseConfig = {
      level: 'info' as const,
      destination: './logs/security.log',
      retentionDays: 90,
      maxFileSize: 100 * 1024 * 1024, // 100MB
      enableRotation: true,
      enableEncryption: true,
      enableRealTimeAlerts: true
    };

    switch (environment) {
      case 'development':
        return {
          ...baseConfig,
          level: 'debug' as const,
          destination: './logs/security-dev.log',
          enableEncryption: false,
          enableRealTimeAlerts: false
        };

      case 'staging':
        return {
          ...baseConfig,
          level: 'info' as const,
          destination: './logs/security-staging.log',
          enableRealTimeAlerts: true
        };

      case 'production':
        return {
          ...baseConfig,
          level: 'warn' as const,
          destination: './logs/security-production.log',
          enableRealTimeAlerts: true,
          alertThresholds: {
            'AUTHENTICATION_FAILURE': { count: 3, timeWindow: 5 * 60 * 1000 },
            'SQL_INJECTION_ATTEMPT': { count: 1, timeWindow: 5 * 60 * 1000 },
            'XSS_ATTEMPT': { count: 1, timeWindow: 5 * 60 * 1000 }
          }
        };

      default:
        return baseConfig;
    }
  }
}