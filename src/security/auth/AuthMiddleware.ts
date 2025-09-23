/**
 * Secure Authentication Middleware
 * Comprehensive middleware for request authentication, authorization, and security
 */

import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import helmet from 'helmet';
import { getAuthService } from './SecureAuthenticationService';

// Extended Request interface with user information
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: 'admin' | 'attorney' | 'paralegal' | 'user';
    permissions: string[];
  };
  session?: {
    id: string;
    createdAt: Date;
    lastActivity: Date;
  };
}

/**
 * Authentication Middleware
 * Validates JWT tokens and populates user information
 */
export class AuthMiddleware {
  private authService = getAuthService();

  /**
   * Authenticate request using Bearer token
   */
  authenticate() {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        const authHeader = req.headers.authorization;

        if (!authHeader?.startsWith('Bearer ')) {
          return res.status(401).json({
            error: 'Authentication required',
            code: 'MISSING_TOKEN'
          });
        }

        const token = authHeader.substring(7);
        const validation = this.authService.validateSessionToken(token);

        if (!validation.valid) {
          return res.status(401).json({
            error: validation.error || 'Invalid token',
            code: 'INVALID_TOKEN'
          });
        }

        // Get full user information (mock - replace with database call)
        const user = await this.getUserInfo(validation.userId!);
        if (!user) {
          return res.status(401).json({
            error: 'User not found',
            code: 'USER_NOT_FOUND'
          });
        }

        // Add user to request
        req.user = {
          id: user.id,
          email: user.email,
          role: user.role,
          permissions: this.getUserPermissions(user.role)
        };

        // Track session activity
        req.session = {
          id: validation.userId!,
          createdAt: new Date(validation.userId!), // Mock
          lastActivity: new Date()
        };

        next();
      } catch (error) {
        console.error('Authentication error:', error);
        res.status(500).json({
          error: 'Authentication service error',
          code: 'AUTH_SERVICE_ERROR'
        });
      }
    };
  }

  /**
   * Optional authentication - continues even without valid token
   */
  optionalAuth() {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        const authHeader = req.headers.authorization;

        if (authHeader?.startsWith('Bearer ')) {
          const token = authHeader.substring(7);
          const validation = this.authService.validateSessionToken(token);

          if (validation.valid) {
            const user = await this.getUserInfo(validation.userId!);
            if (user) {
              req.user = {
                id: user.id,
                email: user.email,
                role: user.role,
                permissions: this.getUserPermissions(user.role)
              };
            }
          }
        }

        next();
      } catch (error) {
        // Continue without authentication on error
        next();
      }
    };
  }

  /**
   * Require specific role
   */
  requireRole(roles: string | string[]) {
    const requiredRoles = Array.isArray(roles) ? roles : [roles];

    return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      if (!req.user) {
        return res.status(401).json({
          error: 'Authentication required',
          code: 'AUTHENTICATION_REQUIRED'
        });
      }

      if (!requiredRoles.includes(req.user.role)) {
        return res.status(403).json({
          error: 'Insufficient permissions',
          code: 'INSUFFICIENT_PERMISSIONS',
          required: requiredRoles,
          current: req.user.role
        });
      }

      next();
    };
  }

  /**
   * Require specific permission
   */
  requirePermission(permissions: string | string[]) {
    const requiredPermissions = Array.isArray(permissions) ? permissions : [permissions];

    return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      if (!req.user) {
        return res.status(401).json({
          error: 'Authentication required',
          code: 'AUTHENTICATION_REQUIRED'
        });
      }

      const hasPermission = requiredPermissions.some(permission =>
        req.user!.permissions.includes(permission)
      );

      if (!hasPermission) {
        return res.status(403).json({
          error: 'Insufficient permissions',
          code: 'INSUFFICIENT_PERMISSIONS',
          required: requiredPermissions,
          current: req.user.permissions
        });
      }

      next();
    };
  }

  /**
   * Resource ownership check
   */
  requireOwnership(resourceIdParam: string = 'id') {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      if (!req.user) {
        return res.status(401).json({
          error: 'Authentication required',
          code: 'AUTHENTICATION_REQUIRED'
        });
      }

      const resourceId = req.params[resourceIdParam];
      if (!resourceId) {
        return res.status(400).json({
          error: 'Resource ID required',
          code: 'MISSING_RESOURCE_ID'
        });
      }

      // Admin can access all resources
      if (req.user.role === 'admin') {
        return next();
      }

      // Check if user owns the resource (implement based on your data model)
      const ownsResource = await this.checkResourceOwnership(req.user.id, resourceId);
      if (!ownsResource) {
        return res.status(403).json({
          error: 'Access denied',
          code: 'RESOURCE_ACCESS_DENIED'
        });
      }

      next();
    };
  }

  /**
   * Get user permissions based on role
   */
  private getUserPermissions(role: string): string[] {
    const permissions: Record<string, string[]> = {
      admin: [
        'user:read', 'user:write', 'user:delete',
        'document:read', 'document:write', 'document:delete',
        'system:admin', 'audit:read'
      ],
      attorney: [
        'document:read', 'document:write',
        'case:read', 'case:write',
        'client:read', 'client:write'
      ],
      paralegal: [
        'document:read', 'document:write',
        'case:read',
        'client:read'
      ],
      user: [
        'document:read',
        'profile:read', 'profile:write'
      ]
    };

    return permissions[role] || [];
  }

  /**
   * Mock user info retrieval (replace with database call)
   */
  private async getUserInfo(userId: string): Promise<any> {
    // Mock implementation - replace with actual database query
    return {
      id: userId,
      email: 'user@example.com',
      role: 'attorney'
    };
  }

  /**
   * Mock resource ownership check (replace with actual implementation)
   */
  private async checkResourceOwnership(userId: string, resourceId: string): Promise<boolean> {
    // Mock implementation - replace with actual database query
    return true;
  }
}

/**
 * Rate Limiting Middleware
 */
export class RateLimitingMiddleware {
  /**
   * General API rate limiting
   */
  static createApiRateLimit() {
    return rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 1000, // Limit each IP to 1000 requests per windowMs
      message: {
        error: 'Too many requests from this IP, please try again later',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: '15 minutes'
      },
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: (req) => {
        // Use user ID if authenticated, otherwise IP
        const user = (req as AuthenticatedRequest).user;
        return user ? `user:${user.id}` : req.ip;
      }
    });
  }

  /**
   * Strict rate limiting for authentication endpoints
   */
  static createAuthRateLimit() {
    return rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // Limit each IP to 5 login attempts per windowMs
      message: {
        error: 'Too many authentication attempts, please try again later',
        code: 'AUTH_RATE_LIMIT_EXCEEDED',
        retryAfter: '15 minutes'
      },
      standardHeaders: true,
      legacyHeaders: false,
      skipSuccessfulRequests: true
    });
  }

  /**
   * Slow down repeated requests
   */
  static createSlowDown() {
    return slowDown({
      windowMs: 15 * 60 * 1000, // 15 minutes
      delayAfter: 100, // Allow 100 requests per windowMs without delay
      delayMs: 500, // Add 500ms delay per request after delayAfter
      maxDelayMs: 20000 // Maximum delay of 20 seconds
    });
  }

  /**
   * Strict rate limiting for password reset
   */
  static createPasswordResetRateLimit() {
    return rateLimit({
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 3, // Limit each IP to 3 password reset attempts per hour
      message: {
        error: 'Too many password reset attempts, please try again later',
        code: 'PASSWORD_RESET_RATE_LIMIT_EXCEEDED',
        retryAfter: '1 hour'
      },
      standardHeaders: true,
      legacyHeaders: false
    });
  }
}

/**
 * Security Headers Middleware
 */
export class SecurityMiddleware {
  /**
   * Apply comprehensive security headers
   */
  static createSecurityHeaders() {
    return helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: [\"'self'\"],
          styleSrc: [\"'self'\", \"'unsafe-inline'\", 'https://fonts.googleapis.com'],
          fontSrc: [\"'self'\", 'https://fonts.gstatic.com'],
          imgSrc: [\"'self'\", 'data:', 'https:'],
          scriptSrc: [\"'self'\"],
          connectSrc: [\"'self'\", 'https://api.stripe.com'],
          frameAncestors: [\"'none'\"],
          objectSrc: [\"'none'\"],
          baseUri: [\"'self'\"]
        }
      },
      hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true
      },
      noSniff: true,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      xssFilter: true
    });
  }

  /**
   * Request sanitization
   */
  static sanitizeRequest() {
    return (req: Request, res: Response, next: NextFunction) => {
      // Remove potentially dangerous characters from query parameters
      for (const [key, value] of Object.entries(req.query)) {
        if (typeof value === 'string') {
          req.query[key] = value.replace(/[<>\"'%;()&+]/g, '');
        }
      }

      // Limit request size
      const contentLength = req.headers['content-length'];
      if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) { // 10MB limit
        return res.status(413).json({
          error: 'Request too large',
          code: 'REQUEST_TOO_LARGE'
        });
      }

      next();
    };
  }

  /**
   * CORS configuration for legal application
   */
  static createCorsConfig() {
    return {
      origin: (origin: string | undefined, callback: Function) => {
        // Allow requests from whitelisted domains
        const allowedOrigins = [
          'https://bear-ai.com',
          'https://app.bear-ai.com',
          'https://admin.bear-ai.com'
        ];

        // Allow localhost in development
        if (process.env.NODE_ENV === 'development') {
          allowedOrigins.push('http://localhost:3000', 'http://localhost:3001');
        }

        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      exposedHeaders: ['X-Total-Count', 'X-RateLimit-Remaining']
    };
  }
}

/**
 * Session Security Middleware
 */
export class SessionSecurityMiddleware {
  /**
   * Validate session activity and prevent hijacking
   */
  static validateSession() {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      if (!req.user || !req.session) {
        return next();
      }

      // Check for suspicious session activity
      const lastActivity = req.session.lastActivity;
      const timeSinceActivity = Date.now() - lastActivity.getTime();

      // Session timeout (30 minutes of inactivity)
      if (timeSinceActivity > 30 * 60 * 1000) {
        return res.status(401).json({
          error: 'Session expired due to inactivity',
          code: 'SESSION_EXPIRED'
        });
      }

      // Update last activity
      req.session.lastActivity = new Date();

      next();
    };
  }

  /**
   * Concurrent session limitation
   */
  static limitConcurrentSessions(maxSessions: number = 3) {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      if (!req.user) {
        return next();
      }

      // Check concurrent sessions for user (implement based on your session store)
      const activeSessions = await this.getActiveSessionsForUser(req.user.id);

      if (activeSessions.length > maxSessions) {
        return res.status(429).json({
          error: 'Too many active sessions',
          code: 'CONCURRENT_SESSION_LIMIT_EXCEEDED',
          maxSessions
        });
      }

      next();
    };
  }

  /**
   * Mock active sessions retrieval
   */
  private static async getActiveSessionsForUser(userId: string): Promise<any[]> {
    // Mock implementation - replace with actual session store query
    return [];
  }
}

// Export middleware instances
export const authMiddleware = new AuthMiddleware();

// Convenience exports
export const authenticate = authMiddleware.authenticate();
export const optionalAuth = authMiddleware.optionalAuth();
export const requireRole = (roles: string | string[]) => authMiddleware.requireRole(roles);
export const requirePermission = (permissions: string | string[]) => authMiddleware.requirePermission(permissions);
export const requireOwnership = (resourceIdParam?: string) => authMiddleware.requireOwnership(resourceIdParam);

export const apiRateLimit = RateLimitingMiddleware.createApiRateLimit();
export const authRateLimit = RateLimitingMiddleware.createAuthRateLimit();
export const slowDown = RateLimitingMiddleware.createSlowDown();
export const passwordResetRateLimit = RateLimitingMiddleware.createPasswordResetRateLimit();

export const securityHeaders = SecurityMiddleware.createSecurityHeaders();
export const sanitizeRequest = SecurityMiddleware.sanitizeRequest();
export const corsConfig = SecurityMiddleware.createCorsConfig();

export const validateSession = SessionSecurityMiddleware.validateSession();
export const limitConcurrentSessions = (maxSessions?: number) =>
  SessionSecurityMiddleware.limitConcurrentSessions(maxSessions);

export default {
  authenticate,
  optionalAuth,
  requireRole,
  requirePermission,
  requireOwnership,
  apiRateLimit,
  authRateLimit,
  slowDown,
  passwordResetRateLimit,
  securityHeaders,
  sanitizeRequest,
  corsConfig,
  validateSession,
  limitConcurrentSessions
};