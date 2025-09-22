/**
 * CSRF Token Management System
 * Comprehensive Cross-Site Request Forgery protection
 */

import { Request, Response, NextFunction } from 'express';
import csrf from 'csurf';
import crypto from 'crypto';

export interface CSRFConfig {
  secret: string;
  cookieName: string;
  sessionKey: string;
  tokenLength?: number;
  maxAge?: number;
  secureCookie?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
  exemptPaths?: string[];
  customHeaderName?: string;
  enableDoubleSubmit?: boolean;
  rotationInterval?: number;
}

export class CSRFTokenManager {
  private config: CSRFConfig;
  private csrfProtection: any;
  private tokenStore: Map<string, CSRFTokenData> = new Map();
  private rotationTimer?: NodeJS.Timeout;

  constructor(config: CSRFConfig) {
    this.config = {
      tokenLength: 32,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      secureCookie: true,
      sameSite: 'strict',
      exemptPaths: ['/health', '/ping', '/api/public'],
      customHeaderName: 'X-CSRF-Token',
      enableDoubleSubmit: true,
      rotationInterval: 60 * 60 * 1000, // 1 hour
      ...config
    };

    this.initializeCSRFProtection();
    this.setupTokenRotation();
  }

  /**
   * Initialize CSRF protection middleware
   */
  private initializeCSRFProtection(): void {
    this.csrfProtection = csrf({
      cookie: {
        key: this.config.cookieName,
        httpOnly: true,
        secure: this.config.secureCookie,
        sameSite: this.config.sameSite,
        maxAge: this.config.maxAge
      },
      sessionKey: this.config.sessionKey,
      value: this.extractCSRFToken.bind(this),
      ignoreMethods: ['GET', 'HEAD', 'OPTIONS'],
      skip: this.shouldSkipCSRFCheck.bind(this)
    });
  }

  /**
   * Setup automatic token rotation
   */
  private setupTokenRotation(): void {
    if (this.config.rotationInterval) {
      this.rotationTimer = setInterval(() => {
        this.rotateTokens();
      }, this.config.rotationInterval);
    }
  }

  /**
   * Main CSRF protection middleware
   */
  public csrfProtection(req: Request, res: Response, next: NextFunction): void {
    try {
      // Skip CSRF for exempt paths
      if (this.shouldSkipCSRFCheck(req)) {
        return next();
      }

      // Apply standard CSRF protection
      this.csrfProtection(req, res, (err: any) => {
        if (err) {
          this.handleCSRFError(req, res, err);
          return;
        }

        // Double-submit cookie pattern validation
        if (this.config.enableDoubleSubmit) {
          const doubleSubmitValid = this.validateDoubleSubmitPattern(req);
          if (!doubleSubmitValid) {
            this.handleCSRFError(req, res, new Error('Double-submit validation failed'));
            return;
          }
        }

        // Store token metadata
        this.storeTokenMetadata(req);

        // Add token to response
        this.addTokenToResponse(req, res);

        next();
      });
    } catch (error) {
      console.error('CSRF protection error:', error);
      this.handleCSRFError(req, res, error);
    }
  }

  /**
   * Extract CSRF token from request
   */
  private extractCSRFToken(req: Request): string | undefined {
    // Check custom header first
    let token = req.get(this.config.customHeaderName || 'X-CSRF-Token');

    // Check standard header
    if (!token) {
      token = req.get('X-XSRF-TOKEN');
    }

    // Check request body
    if (!token && req.body) {
      token = req.body._csrf || req.body.csrf_token;
    }

    // Check query parameters (less secure, but sometimes needed)
    if (!token && req.query) {
      token = req.query._csrf as string || req.query.csrf_token as string;
    }

    return token;
  }

  /**
   * Check if CSRF protection should be skipped
   */
  private shouldSkipCSRFCheck(req: Request): boolean {
    // Skip for exempt paths
    if (this.config.exemptPaths?.some(path => req.path.startsWith(path))) {
      return true;
    }

    // Skip for API endpoints with proper authentication
    if (req.path.startsWith('/api/') && this.hasValidAPIAuthentication(req)) {
      return true;
    }

    // Skip for safe methods
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      return true;
    }

    return false;
  }

  /**
   * Check if request has valid API authentication
   */
  private hasValidAPIAuthentication(req: Request): boolean {
    // Check for valid JWT token
    const authHeader = req.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return true; // Assume JWT validation is done elsewhere
    }

    // Check for API key
    const apiKey = req.get('X-API-Key');
    if (apiKey) {
      return true; // Assume API key validation is done elsewhere
    }

    return false;
  }

  /**
   * Validate double-submit cookie pattern
   */
  private validateDoubleSubmitPattern(req: Request): boolean {
    if (!this.config.enableDoubleSubmit) {
      return true;
    }

    const cookieToken = req.cookies[this.config.cookieName];
    const headerToken = this.extractCSRFToken(req);

    if (!cookieToken || !headerToken) {
      return false;
    }

    // Use constant-time comparison to prevent timing attacks
    return this.safeCompare(cookieToken, headerToken);
  }

  /**
   * Safe string comparison to prevent timing attacks
   */
  private safeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
  }

  /**
   * Store token metadata for monitoring
   */
  private storeTokenMetadata(req: Request): void {
    const token = this.extractCSRFToken(req);
    if (!token) return;

    const tokenData: CSRFTokenData = {
      token,
      sessionId: req.sessionID,
      userAgent: req.get('User-Agent') || '',
      ip: req.ip,
      createdAt: Date.now(),
      lastUsed: Date.now(),
      usageCount: 1
    };

    // Update existing token data or create new
    const existing = this.tokenStore.get(token);
    if (existing) {
      existing.lastUsed = Date.now();
      existing.usageCount++;
    } else {
      this.tokenStore.set(token, tokenData);
    }
  }

  /**
   * Add CSRF token to response
   */
  private addTokenToResponse(req: Request, res: Response): void {
    // Add token to response locals for templates
    res.locals.csrfToken = (req as any).csrfToken();

    // Add token to custom header for JavaScript access
    res.setHeader(this.config.customHeaderName || 'X-CSRF-Token', res.locals.csrfToken);
  }

  /**
   * Handle CSRF validation errors
   */
  private handleCSRFError(req: Request, res: Response, error: any): void {
    const errorDetails = {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path,
      method: req.method,
      sessionId: req.sessionID,
      timestamp: new Date().toISOString(),
      error: error.message
    };

    console.warn('CSRF validation failed:', errorDetails);

    // Log to security monitoring
    this.logSecurityEvent('CSRF_VALIDATION_FAILED', errorDetails);

    // Send appropriate error response
    if (req.accepts('json')) {
      res.status(403).json({
        error: 'CSRF token validation failed',
        message: 'Invalid or missing CSRF token',
        code: 'CSRF_TOKEN_INVALID'
      });
    } else {
      res.status(403).render('error/csrf', {
        title: 'Security Error',
        message: 'Your session has expired. Please refresh the page and try again.'
      });
    }
  }

  /**
   * Generate new CSRF token
   */
  public generateToken(): string {
    return crypto.randomBytes(this.config.tokenLength || 32).toString('hex');
  }

  /**
   * Generate token for specific session
   */
  public generateTokenForSession(sessionId: string): string {
    const token = this.generateToken();
    const tokenData: CSRFTokenData = {
      token,
      sessionId,
      userAgent: '',
      ip: '',
      createdAt: Date.now(),
      lastUsed: Date.now(),
      usageCount: 0
    };

    this.tokenStore.set(token, tokenData);
    return token;
  }

  /**
   * Validate token manually
   */
  public validateToken(token: string, sessionId: string): boolean {
    const tokenData = this.tokenStore.get(token);

    if (!tokenData) {
      return false;
    }

    // Check if token belongs to the session
    if (tokenData.sessionId !== sessionId) {
      return false;
    }

    // Check if token is expired
    if (Date.now() - tokenData.createdAt > (this.config.maxAge || 24 * 60 * 60 * 1000)) {
      this.tokenStore.delete(token);
      return false;
    }

    return true;
  }

  /**
   * Invalidate token
   */
  public invalidateToken(token: string): void {
    this.tokenStore.delete(token);
  }

  /**
   * Invalidate all tokens for a session
   */
  public invalidateSessionTokens(sessionId: string): void {
    for (const [token, data] of this.tokenStore.entries()) {
      if (data.sessionId === sessionId) {
        this.tokenStore.delete(token);
      }
    }
  }

  /**
   * Rotate tokens (for scheduled rotation)
   */
  private rotateTokens(): void {
    const now = Date.now();
    const rotationAge = this.config.rotationInterval || 60 * 60 * 1000;

    for (const [token, data] of this.tokenStore.entries()) {
      if (now - data.createdAt > rotationAge) {
        this.tokenStore.delete(token);
      }
    }

    console.log(`CSRF token rotation completed. Removed ${this.tokenStore.size} expired tokens.`);
  }

  /**
   * Create CSRF token middleware for forms
   */
  public createFormTokenMiddleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      res.locals.csrfToken = (req as any).csrfToken();
      next();
    };
  }

  /**
   * Create CSRF token validation for AJAX requests
   */
  public createAjaxTokenMiddleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      if (req.xhr || req.get('Content-Type') === 'application/json') {
        const token = this.extractCSRFToken(req);
        if (!token) {
          res.status(403).json({
            error: 'CSRF token required for AJAX requests',
            code: 'CSRF_TOKEN_MISSING'
          });
          return;
        }
      }
      next();
    };
  }

  /**
   * Get CSRF token for client-side usage
   */
  public getTokenForClient(req: Request): { token: string; headerName: string } {
    return {
      token: (req as any).csrfToken(),
      headerName: this.config.customHeaderName || 'X-CSRF-Token'
    };
  }

  /**
   * Log security events
   */
  private logSecurityEvent(event: string, details: any): void {
    // In a production environment, this would integrate with your security monitoring system
    console.log(`Security Event: ${event}`, details);
  }

  /**
   * Health check for CSRF protection
   */
  public healthCheck(): 'healthy' | 'degraded' | 'critical' {
    try {
      // Check if token generation works
      const testToken = this.generateToken();
      if (!testToken || testToken.length < 16) {
        return 'critical';
      }

      // Check token store size (too many tokens might indicate issues)
      if (this.tokenStore.size > 10000) {
        return 'degraded';
      }

      return 'healthy';
    } catch (error) {
      return 'critical';
    }
  }

  /**
   * Get CSRF protection statistics
   */
  public getStatistics(): {
    activeTokens: number;
    doubleSubmitEnabled: boolean;
    exemptPathsCount: number;
    rotationInterval: number;
    avgTokenAge: number;
    tokenUsageDistribution: { [range: string]: number };
  } {
    const now = Date.now();
    const tokenAges = Array.from(this.tokenStore.values()).map(data => now - data.createdAt);
    const avgTokenAge = tokenAges.length > 0 ? tokenAges.reduce((sum, age) => sum + age, 0) / tokenAges.length : 0;

    const usageDistribution = {
      '0-1': 0,
      '2-5': 0,
      '6-10': 0,
      '11+': 0
    };

    for (const data of this.tokenStore.values()) {
      if (data.usageCount <= 1) usageDistribution['0-1']++;
      else if (data.usageCount <= 5) usageDistribution['2-5']++;
      else if (data.usageCount <= 10) usageDistribution['6-10']++;
      else usageDistribution['11+']++;
    }

    return {
      activeTokens: this.tokenStore.size,
      doubleSubmitEnabled: !!this.config.enableDoubleSubmit,
      exemptPathsCount: this.config.exemptPaths?.length || 0,
      rotationInterval: this.config.rotationInterval || 0,
      avgTokenAge: Math.round(avgTokenAge / 1000 / 60), // in minutes
      tokenUsageDistribution: usageDistribution
    };
  }

  /**
   * Cleanup resources
   */
  public cleanup(): void {
    if (this.rotationTimer) {
      clearInterval(this.rotationTimer);
    }
    this.tokenStore.clear();
  }
}

/**
 * CSRF Token Data Interface
 */
interface CSRFTokenData {
  token: string;
  sessionId: string;
  userAgent: string;
  ip: string;
  createdAt: number;
  lastUsed: number;
  usageCount: number;
}