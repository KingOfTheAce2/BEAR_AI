/**
 * Security Headers Middleware
 * Implements comprehensive security headers including CSP, HSTS, X-Frame-Options
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

export interface SecurityHeadersConfig {
  csp: {
    directives: {
      [key: string]: string[];
    };
    reportUri?: string;
    reportOnly?: boolean;
    nonce?: boolean;
    upgradeInsecureRequests?: boolean;
  };
  hsts: {
    maxAge: number;
    includeSubDomains: boolean;
    preload: boolean;
  };
  frameOptions: string;
  contentTypeOptions?: boolean;
  xssFilter?: boolean;
  referrerPolicy?: string;
  permissionsPolicy?: {
    [key: string]: string[];
  };
  crossOriginEmbedderPolicy?: string;
  crossOriginOpenerPolicy?: string;
  crossOriginResourcePolicy?: string;
}

export class SecurityHeaders {
  private config: SecurityHeadersConfig;
  private nonceCache: Map<string, { nonce: string; timestamp: number }> = new Map();

  constructor(config: SecurityHeadersConfig) {
    this.config = config;

    // Clean up expired nonces every 5 minutes
    setInterval(() => this.cleanupExpiredNonces(), 5 * 60 * 1000);
  }

  /**
   * Apply all security headers middleware
   */
  public applyHeaders(req: Request, res: Response, next: NextFunction): void {
    try {
      // Apply Content Security Policy
      this.applyCSP(req, res);

      // Apply HTTP Strict Transport Security
      this.applyHSTS(req, res);

      // Apply Frame Options
      this.applyFrameOptions(req, res);

      // Apply Content Type Options
      if (this.config.contentTypeOptions !== false) {
        res.setHeader('X-Content-Type-Options', 'nosniff');
      }

      // Apply XSS Filter
      if (this.config.xssFilter !== false) {
        res.setHeader('X-XSS-Protection', '1; mode=block');
      }

      // Apply Referrer Policy
      if (this.config.referrerPolicy) {
        res.setHeader('Referrer-Policy', this.config.referrerPolicy);
      }

      // Apply Permissions Policy
      if (this.config.permissionsPolicy) {
        this.applyPermissionsPolicy(req, res);
      }

      // Apply Cross-Origin Policies
      this.applyCrossOriginPolicies(req, res);

      // Remove server information
      res.removeHeader('X-Powered-By');
      res.removeHeader('Server');

      next();
    } catch (error) {
      // Error logging disabled for production
      next();
    }
  }

  /**
   * Apply Content Security Policy
   */
  private applyCSP(req: Request, res: Response): void {
    let cspDirectives: string[] = [];
    let nonce: string | undefined;

    // Generate nonce if enabled
    if (this.config.csp.nonce) {
      nonce = this.generateNonce();
      this.cacheNonce(req, nonce);
    }

    // Build CSP directives
    for (const [directive, sources] of Object.entries(this.config.csp.directives)) {
      let directiveValue = sources.join(' ');

      // Add nonce to script-src and style-src if enabled
      if (nonce && (directive === 'script-src' || directive === 'style-src')) {
        directiveValue += ` 'nonce-${nonce}'`;
      }

      // Convert camelCase to kebab-case for directives
      const kebabDirective = directive.replace(/([A-Z])/g, '-$1').toLowerCase();
      cspDirectives.push(`${kebabDirective} ${directiveValue}`);
    }

    // Add upgrade-insecure-requests if enabled
    if (this.config.csp.upgradeInsecureRequests) {
      cspDirectives.push('upgrade-insecure-requests');
    }

    // Add report-uri if configured
    if (this.config.csp.reportUri) {
      cspDirectives.push(`report-uri ${this.config.csp.reportUri}`);
    }

    const cspHeader = this.config.csp.reportOnly ?
      'Content-Security-Policy-Report-Only' :
      'Content-Security-Policy';

    res.setHeader(cspHeader, cspDirectives.join('; '));

    // Make nonce available to templates
    if (nonce) {
      (req as any).nonce = nonce;
    }
  }

  /**
   * Apply HTTP Strict Transport Security
   */
  private applyHSTS(req: Request, res: Response): void {
    if (!req.secure && req.get('x-forwarded-proto') !== 'https') {
      return; // Only apply HSTS for HTTPS connections
    }

    let hstsValue = `max-age=${this.config.hsts.maxAge}`;

    if (this.config.hsts.includeSubDomains) {
      hstsValue += '; includeSubDomains';
    }

    if (this.config.hsts.preload) {
      hstsValue += '; preload';
    }

    res.setHeader('Strict-Transport-Security', hstsValue);
  }

  /**
   * Apply Frame Options
   */
  private applyFrameOptions(req: Request, res: Response): void {
    res.setHeader('X-Frame-Options', this.config.frameOptions);

    // Also set frame-ancestors in CSP if not already set
    if (!this.config.csp.directives.frameAncestors) {
      const frameAncestorsValue = this.config.frameOptions.toLowerCase() === 'deny' ?
        "'none'" : this.config.frameOptions.toLowerCase();
      res.setHeader('Content-Security-Policy',
        res.getHeader('Content-Security-Policy') + `; frame-ancestors ${frameAncestorsValue}`);
    }
  }

  /**
   * Apply Permissions Policy
   */
  private applyPermissionsPolicy(req: Request, res: Response): void {
    const permissionsPolicyDirectives: string[] = [];

    for (const [feature, allowlist] of Object.entries(this.config.permissionsPolicy!)) {
      const allowlistStr = allowlist.length === 0 ? '()' :
        allowlist.map(origin => origin === 'self' ? 'self' : `"${origin}"`).join(' ');
      permissionsPolicyDirectives.push(`${feature}=(${allowlistStr})`);
    }

    res.setHeader('Permissions-Policy', permissionsPolicyDirectives.join(', '));
  }

  /**
   * Apply Cross-Origin Policies
   */
  private applyCrossOriginPolicies(req: Request, res: Response): void {
    if (this.config.crossOriginEmbedderPolicy) {
      res.setHeader('Cross-Origin-Embedder-Policy', this.config.crossOriginEmbedderPolicy);
    }

    if (this.config.crossOriginOpenerPolicy) {
      res.setHeader('Cross-Origin-Opener-Policy', this.config.crossOriginOpenerPolicy);
    }

    if (this.config.crossOriginResourcePolicy) {
      res.setHeader('Cross-Origin-Resource-Policy', this.config.crossOriginResourcePolicy);
    }
  }

  /**
   * Generate cryptographically secure nonce
   */
  private generateNonce(): string {
    return crypto.randomBytes(16).toString('base64');
  }

  /**
   * Cache nonce for request validation
   */
  private cacheNonce(req: Request, nonce: string): void {
    const sessionId = this.getSessionId(req);
    this.nonceCache.set(sessionId, {
      nonce,
      timestamp: Date.now()
    });
  }

  /**
   * Validate nonce for inline scripts/styles
   */
  public validateNonce(req: Request, providedNonce: string): boolean {
    const sessionId = this.getSessionId(req);
    const cachedNonce = this.nonceCache.get(sessionId);

    if (!cachedNonce) {
      return false;
    }

    // Check if nonce is expired (5 minutes)
    if (Date.now() - cachedNonce.timestamp > 5 * 60 * 1000) {
      this.nonceCache.delete(sessionId);
      return false;
    }

    return cachedNonce.nonce === providedNonce;
  }

  /**
   * Get session ID for nonce caching
   */
  private getSessionId(req: Request): string {
    return req.sessionID || req.ip || 'default';
  }

  /**
   * Clean up expired nonces
   */
  private cleanupExpiredNonces(): void {
    const now = Date.now();
    const expireTime = 5 * 60 * 1000; // 5 minutes

    for (const [sessionId, nonceData] of this.nonceCache.entries()) {
      if (now - nonceData.timestamp > expireTime) {
        this.nonceCache.delete(sessionId);
      }
    }
  }

  /**
   * Dynamic CSP for specific routes
   */
  public dynamicCSP(additionalDirectives: Partial<SecurityHeadersConfig['csp']['directives']>) {
    return (req: Request, res: Response, next: NextFunction) => {
      // Merge additional directives with base CSP
      const mergedDirectives = { ...this.config.csp.directives };

      for (const [directive, sources] of Object.entries(additionalDirectives)) {
        if (mergedDirectives[directive]) {
          mergedDirectives[directive] = [...mergedDirectives[directive], ...sources];
        } else {
          mergedDirectives[directive] = sources;
        }
      }

      // Temporarily override CSP directives
      const originalDirectives = this.config.csp.directives;
      this.config.csp.directives = mergedDirectives;

      // Apply CSP with merged directives
      this.applyCSP(req, res);

      // Restore original directives
      this.config.csp.directives = originalDirectives;

      next();
    };
  }

  /**
   * Strict CSP for admin routes
   */
  public strictCSP() {
    return this.dynamicCSP({
      'script-src': ["'self'"],
      'style-src': ["'self'"],
      'img-src': ["'self'"],
      'connect-src': ["'self'"],
      'font-src': ["'self'"],
      'object-src': ["'none'"],
      'media-src': ["'none'"],
      'frame-src': ["'none'"],
      'child-src': ["'none'"],
      'worker-src': ["'none'"],
      'manifest-src': ["'self'"]
    });
  }

  /**
   * Relaxed CSP for public content
   */
  public relaxedCSP() {
    return this.dynamicCSP({
      'img-src': ["'self'", 'data:', 'https:'],
      'media-src': ["'self'", 'https:'],
      'font-src': ["'self'", 'https:', 'data:']
    });
  }

  /**
   * Security headers health check
   */
  public healthCheck(): 'healthy' | 'degraded' | 'critical' {
    try {
      // Check if required configurations are present
      if (!this.config.csp.directives.defaultSrc) {
        return 'critical';
      }

      if (!this.config.hsts.maxAge || this.config.hsts.maxAge < 300) {
        return 'degraded';
      }

      if (this.config.frameOptions !== 'DENY' && this.config.frameOptions !== 'SAMEORIGIN') {
        return 'degraded';
      }

      return 'healthy';
    } catch (error) {
      return 'critical';
    }
  }

  /**
   * Get security headers statistics
   */
  public getStatistics(): {
    cspEnabled: boolean;
    hstsEnabled: boolean;
    frameProtectionEnabled: boolean;
    xssFilterEnabled: boolean;
    nonceEnabled: boolean;
    activeNonces: number;
  } {
    return {
      cspEnabled: Object.keys(this.config.csp.directives).length > 0,
      hstsEnabled: this.config.hsts.maxAge > 0,
      frameProtectionEnabled: !!this.config.frameOptions,
      xssFilterEnabled: this.config.xssFilter !== false,
      nonceEnabled: !!this.config.csp.nonce,
      activeNonces: this.nonceCache.size
    };
  }

  /**
   * CSP violation reporting endpoint
   */
  public cspViolationReporter() {
    return (req: Request, res: Response) => {
      try {
        const violation = req.body['csp-report'];

        if (violation) {
          // console.warn('CSP Violation Report:', {
            documentUri: violation['document-uri'],
            violatedDirective: violation['violated-directive'],
            blockedUri: violation['blocked-uri'],
            sourceFile: violation['source-file'],
            lineNumber: violation['line-number'],
            columnNumber: violation['column-number'],
            timestamp: new Date().toISOString(),
            userAgent: req.get('User-Agent'),
            ip: req.ip
          });

          // Store violation for analysis
          this.storeCSPViolation(violation, req);
        }

        res.status(204).end();
      } catch (error) {
        // Error logging disabled for production
        res.status(400).json({ error: 'Invalid CSP report' });
      }
    };
  }

  /**
   * Store CSP violation for security analysis
   */
  private storeCSPViolation(violation: any, req: Request): void {
    // In a production environment, you would store this in a database
    // or send it to a security monitoring service
    const violationRecord = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      violation,
      request: {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        referer: req.get('Referer')
      }
    };

    // Log to security monitoring system
    // Logging disabled for production
  }
}