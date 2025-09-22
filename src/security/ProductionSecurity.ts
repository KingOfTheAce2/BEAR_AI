/**
 * Production Security Hardening System
 * Implements comprehensive OWASP Top 10 protection measures
 * and enterprise-grade security controls
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import { body, validationResult, sanitizeBody } from 'express-validator';
import csrf from 'csurf';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import https from 'https';
import { createHash, createCipher, createDecipher } from 'crypto';

// Import security modules
import { CertificatePinning } from './certificates/CertificatePinning';
import { RateLimitManager } from './rate-limiting/RateLimitManager';
import { SecurityHeaders } from './middleware/SecurityHeaders';
import { InputSanitizer } from './validation/InputSanitizer';
import { SqlInjectionPrevention } from './validation/SqlInjectionPrevention';
import { XSSProtection } from './middleware/XSSProtection';
import { CSRFTokenManager } from './csrf/CSRFTokenManager';
import { JWTSecurityManager } from './jwt/JWTSecurityManager';
import { EncryptionManager } from './encryption/EncryptionManager';
import { SecurityEventLogger } from './monitoring/SecurityEventLogger';

/**
 * Main Production Security Class
 * Orchestrates all security components and OWASP Top 10 protections
 */
export class ProductionSecurity {
  private certificatePinning: CertificatePinning;
  private rateLimitManager: RateLimitManager;
  private securityHeaders: SecurityHeaders;
  private inputSanitizer: InputSanitizer;
  private sqlInjectionPrevention: SqlInjectionPrevention;
  private xssProtection: XSSProtection;
  private csrfTokenManager: CSRFTokenManager;
  private jwtSecurityManager: JWTSecurityManager;
  private encryptionManager: EncryptionManager;
  private securityEventLogger: SecurityEventLogger;
  private config: SecurityConfig;

  constructor(config: SecurityConfig) {
    this.config = config;
    this.initializeSecurityComponents();
  }

  /**
   * Initialize all security components
   */
  private initializeSecurityComponents(): void {
    this.certificatePinning = new CertificatePinning(this.config.certificates);
    this.rateLimitManager = new RateLimitManager(this.config.rateLimit);
    this.securityHeaders = new SecurityHeaders(this.config.headers);
    this.inputSanitizer = new InputSanitizer(this.config.validation);
    this.sqlInjectionPrevention = new SqlInjectionPrevention();
    this.xssProtection = new XSSProtection(this.config.xss);
    this.csrfTokenManager = new CSRFTokenManager(this.config.csrf);
    this.jwtSecurityManager = new JWTSecurityManager(this.config.jwt);
    this.encryptionManager = new EncryptionManager(this.config.encryption);
    this.securityEventLogger = new SecurityEventLogger(this.config.logging);
  }

  /**
   * Get comprehensive security middleware stack
   * Implements OWASP Top 10 protections
   */
  public getSecurityMiddleware(): Array<(req: Request, res: Response, next: NextFunction) => void> {
    return [
      // OWASP A01: Broken Access Control
      this.authenticationMiddleware.bind(this),
      this.authorizationMiddleware.bind(this),

      // OWASP A02: Cryptographic Failures
      this.encryptionValidationMiddleware.bind(this),

      // OWASP A03: Injection
      this.inputSanitizer.sanitizeMiddleware.bind(this.inputSanitizer),
      this.sqlInjectionPrevention.preventionMiddleware.bind(this.sqlInjectionPrevention),

      // OWASP A04: Insecure Design
      this.securityHeaders.applyHeaders.bind(this.securityHeaders),

      // OWASP A05: Security Misconfiguration
      this.securityConfigurationMiddleware.bind(this),

      // OWASP A06: Vulnerable and Outdated Components
      this.componentSecurityMiddleware.bind(this),

      // OWASP A07: Identification and Authentication Failures
      this.jwtSecurityManager.validateToken.bind(this.jwtSecurityManager),

      // OWASP A08: Software and Data Integrity Failures
      this.integrityValidationMiddleware.bind(this),

      // OWASP A09: Security Logging and Monitoring Failures
      this.securityEventLogger.logSecurityEvent.bind(this.securityEventLogger),

      // OWASP A10: Server-Side Request Forgery (SSRF)
      this.ssrfProtectionMiddleware.bind(this),

      // Rate limiting and DDoS protection
      this.rateLimitManager.getGlobalRateLimit(),
      this.rateLimitManager.getPerUserRateLimit(),

      // XSS and CSRF protection
      this.xssProtection.xssMiddleware.bind(this.xssProtection),
      this.csrfTokenManager.csrfProtection.bind(this.csrfTokenManager),
    ];
  }

  /**
   * OWASP A01: Authentication Middleware
   */
  private async authenticationMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const token = this.extractToken(req);

      if (!token) {
        await this.securityEventLogger.logEvent('AUTHENTICATION_FAILURE', {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          timestamp: new Date().toISOString(),
          reason: 'Missing authentication token'
        });

        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const isValid = await this.jwtSecurityManager.validateToken(token);
      if (!isValid) {
        await this.securityEventLogger.logEvent('AUTHENTICATION_FAILURE', {
          ip: req.ip,
          token: this.hashSensitiveData(token),
          timestamp: new Date().toISOString(),
          reason: 'Invalid token'
        });

        res.status(401).json({ error: 'Invalid authentication token' });
        return;
      }

      // Add user context to request
      req.user = await this.jwtSecurityManager.decodeToken(token);
      next();
    } catch (error) {
      await this.securityEventLogger.logEvent('AUTHENTICATION_ERROR', {
        error: error.message,
        ip: req.ip,
        timestamp: new Date().toISOString()
      });

      res.status(500).json({ error: 'Authentication service error' });
    }
  }

  /**
   * OWASP A01: Authorization Middleware
   */
  private async authorizationMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user;
      const resource = req.path;
      const action = req.method;

      const hasPermission = await this.checkPermissions(user, resource, action);

      if (!hasPermission) {
        await this.securityEventLogger.logEvent('AUTHORIZATION_FAILURE', {
          userId: user?.id,
          resource,
          action,
          ip: req.ip,
          timestamp: new Date().toISOString()
        });

        res.status(403).json({ error: 'Insufficient permissions' });
        return;
      }

      next();
    } catch (error) {
      await this.securityEventLogger.logEvent('AUTHORIZATION_ERROR', {
        error: error.message,
        ip: req.ip,
        timestamp: new Date().toISOString()
      });

      res.status(500).json({ error: 'Authorization service error' });
    }
  }

  /**
   * OWASP A02: Encryption Validation Middleware
   */
  private async encryptionValidationMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
    // Ensure HTTPS is used
    if (!req.secure && req.get('x-forwarded-proto') !== 'https') {
      await this.securityEventLogger.logEvent('INSECURE_CONNECTION', {
        ip: req.ip,
        protocol: req.protocol,
        timestamp: new Date().toISOString()
      });

      return res.redirect(301, `https://${req.get('host')}${req.url}`);
    }

    // Validate certificate pinning for API calls
    if (req.path.startsWith('/api/')) {
      const certificateValid = await this.certificatePinning.validateCertificate(req);
      if (!certificateValid) {
        await this.securityEventLogger.logEvent('CERTIFICATE_VALIDATION_FAILURE', {
          ip: req.ip,
          path: req.path,
          timestamp: new Date().toISOString()
        });

        res.status(495).json({ error: 'SSL Certificate Required' });
        return;
      }
    }

    next();
  }

  /**
   * OWASP A05: Security Configuration Middleware
   */
  private async securityConfigurationMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
    // Remove sensitive headers
    res.removeHeader('X-Powered-By');
    res.removeHeader('Server');

    // Set secure session cookie attributes
    if (req.session) {
      req.session.cookie.secure = true;
      req.session.cookie.httpOnly = true;
      req.session.cookie.sameSite = 'strict';
    }

    next();
  }

  /**
   * OWASP A06: Component Security Middleware
   */
  private async componentSecurityMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
    // Check for known vulnerable patterns in requests
    const userAgent = req.get('User-Agent') || '';
    const suspiciousPatterns = [
      /sqlmap/i,
      /nikto/i,
      /nessus/i,
      /burp/i,
      /zap/i
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(userAgent)) {
        await this.securityEventLogger.logEvent('SUSPICIOUS_USER_AGENT', {
          userAgent,
          ip: req.ip,
          timestamp: new Date().toISOString()
        });

        res.status(403).json({ error: 'Forbidden' });
        return;
      }
    }

    next();
  }

  /**
   * OWASP A08: Integrity Validation Middleware
   */
  private async integrityValidationMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
    // Validate request integrity for POST/PUT/PATCH requests
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      const contentHash = this.calculateContentHash(req.body);
      const providedHash = req.get('X-Content-Hash');

      if (providedHash && providedHash !== contentHash) {
        await this.securityEventLogger.logEvent('INTEGRITY_VIOLATION', {
          expectedHash: contentHash,
          providedHash,
          ip: req.ip,
          timestamp: new Date().toISOString()
        });

        res.status(400).json({ error: 'Request integrity validation failed' });
        return;
      }
    }

    next();
  }

  /**
   * OWASP A10: SSRF Protection Middleware
   */
  private async ssrfProtectionMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
    // Check for potentially malicious URLs in request body
    const maliciousPatterns = [
      /localhost/i,
      /127\.0\.0\.1/,
      /0\.0\.0\.0/,
      /::1/,
      /169\.254\./,  // Link-local addresses
      /10\./,        // Private network
      /192\.168\./,  // Private network
      /172\.(1[6-9]|2[0-9]|3[0-1])\./  // Private network
    ];

    const requestBody = JSON.stringify(req.body || {});

    for (const pattern of maliciousPatterns) {
      if (pattern.test(requestBody)) {
        await this.securityEventLogger.logEvent('SSRF_ATTEMPT', {
          body: this.hashSensitiveData(requestBody),
          ip: req.ip,
          timestamp: new Date().toISOString()
        });

        res.status(400).json({ error: 'Invalid request parameters' });
        return;
      }
    }

    next();
  }

  /**
   * Initialize security for Express application
   */
  public initializeSecurity(app: any): void {
    // Apply helmet for basic security headers
    app.use(helmet({
      contentSecurityPolicy: this.config.headers.csp,
      hsts: this.config.headers.hsts,
      frameguard: { action: 'deny' },
      noSniff: true,
      xssFilter: true
    }));

    // Apply all security middleware
    const middlewares = this.getSecurityMiddleware();
    middlewares.forEach(middleware => app.use(middleware));

    // Initialize CSRF protection
    app.use(this.csrfTokenManager.csrfProtection);

    // Setup security event monitoring
    this.securityEventLogger.startMonitoring();
  }

  /**
   * Utility methods
   */
  private extractToken(req: Request): string | null {
    const authHeader = req.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    return null;
  }

  private async checkPermissions(user: any, resource: string, action: string): Promise<boolean> {
    // Implement role-based access control logic
    if (!user || !user.roles) return false;

    // Admin users have all permissions
    if (user.roles.includes('admin')) return true;

    // Implement resource-specific permission checks
    const requiredPermission = `${action.toLowerCase()}:${resource}`;
    return user.permissions?.includes(requiredPermission) || false;
  }

  private hashSensitiveData(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex').substring(0, 8);
  }

  private calculateContentHash(content: any): string {
    return crypto.createHash('sha256').update(JSON.stringify(content)).digest('hex');
  }

  /**
   * Security health check
   */
  public async performSecurityHealthCheck(): Promise<SecurityHealthReport> {
    const report: SecurityHealthReport = {
      timestamp: new Date().toISOString(),
      components: {},
      overallStatus: 'healthy',
      issues: []
    };

    try {
      // Check each security component
      report.components.certificatePinning = await this.certificatePinning.healthCheck();
      report.components.rateLimit = await this.rateLimitManager.healthCheck();
      report.components.encryption = await this.encryptionManager.healthCheck();
      report.components.logging = await this.securityEventLogger.healthCheck();
      report.components.jwt = await this.jwtSecurityManager.healthCheck();

      // Determine overall status
      const hasIssues = Object.values(report.components).some(status => status !== 'healthy');
      if (hasIssues) {
        report.overallStatus = 'degraded';
        report.issues.push('One or more security components are not healthy');
      }

    } catch (error) {
      report.overallStatus = 'critical';
      report.issues.push(`Security health check failed: ${error.message}`);
    }

    return report;
  }

  /**
   * Emergency security lockdown
   */
  public async emergencyLockdown(reason: string): Promise<void> {
    await this.securityEventLogger.logEvent('EMERGENCY_LOCKDOWN', {
      reason,
      timestamp: new Date().toISOString(),
      initiatedBy: 'system'
    });

    // Activate emergency rate limits
    await this.rateLimitManager.activateEmergencyMode();

    // Invalidate all active sessions
    await this.jwtSecurityManager.invalidateAllTokens();

    // Enable additional monitoring
    await this.securityEventLogger.enableHighAlertMode();
  }
}

/**
 * Security Configuration Interface
 */
export interface SecurityConfig {
  certificates: {
    pinningEnabled: boolean;
    trustedCertificates: string[];
    pinningValidation: boolean;
  };
  rateLimit: {
    windowMs: number;
    maxRequests: number;
    skipSuccessfulRequests: boolean;
    keyGenerator?: (req: Request) => string;
  };
  headers: {
    csp: any;
    hsts: any;
    frameOptions: string;
  };
  validation: {
    maxLength: number;
    allowedTags: string[];
    sanitizeLevel: 'strict' | 'moderate' | 'basic';
  };
  xss: {
    filterLevel: 'strict' | 'moderate' | 'basic';
    reportUri?: string;
  };
  csrf: {
    secret: string;
    cookieName: string;
    sessionKey: string;
  };
  jwt: {
    secret: string;
    algorithm: string;
    expiresIn: string;
    issuer: string;
  };
  encryption: {
    algorithm: string;
    keyDerivation: string;
    saltLength: number;
  };
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    destination: string;
    retentionDays: number;
  };
}

/**
 * Security Health Report Interface
 */
export interface SecurityHealthReport {
  timestamp: string;
  components: {
    [key: string]: 'healthy' | 'degraded' | 'critical';
  };
  overallStatus: 'healthy' | 'degraded' | 'critical';
  issues: string[];
}

/**
 * Default Security Configuration
 */
export const defaultSecurityConfig: SecurityConfig = {
  certificates: {
    pinningEnabled: true,
    trustedCertificates: [],
    pinningValidation: true
  },
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
    skipSuccessfulRequests: false
  },
  headers: {
    csp: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"]
      }
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    },
    frameOptions: 'DENY'
  },
  validation: {
    maxLength: 1000,
    allowedTags: ['b', 'i', 'em', 'strong'],
    sanitizeLevel: 'strict'
  },
  xss: {
    filterLevel: 'strict'
  },
  csrf: {
    secret: process.env.CSRF_SECRET || crypto.randomBytes(32).toString('hex'),
    cookieName: '_csrf',
    sessionKey: 'csrfSecret'
  },
  jwt: {
    secret: process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex'),
    algorithm: 'HS256',
    expiresIn: '24h',
    issuer: 'bear-ai-security'
  },
  encryption: {
    algorithm: 'aes-256-gcm',
    keyDerivation: 'pbkdf2',
    saltLength: 32
  },
  logging: {
    level: 'info',
    destination: './logs/security.log',
    retentionDays: 90
  }
};