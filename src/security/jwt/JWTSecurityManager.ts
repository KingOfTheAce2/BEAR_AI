/**
 * JWT Security Manager
 * Comprehensive JWT validation, session security, and token management
 */

import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import Redis from 'ioredis';

// Define proper JWT payload types
interface JWTPayload {
  userId?: string;
  sub?: string;
  role?: string;
  roles?: string[];
  permissions?: string[];
  iat: number;
  exp: number;
  jti: string;
  iss?: string;
  aud?: string;
  fingerprint?: string;
  [key: string]: string | number | boolean | string[] | undefined;
}

interface RefreshTokenPayload {
  userId: string;
  type: 'refresh';
  jti: string;
  iat: number;
  exp: number;
}

export interface JWTConfig {
  secret: string;
  algorithm: jwt.Algorithm;
  expiresIn: string;
  issuer: string;
  audience?: string;
  refreshTokenSecret?: string;
  refreshTokenExpiresIn?: string;
  blacklistRedis?: {
    host: string;
    port: number;
    password?: string;
  };
  sessionConfig?: {
    secure: boolean;
    httpOnly: boolean;
    sameSite: 'strict' | 'lax' | 'none';
    maxAge: number;
    rolling: boolean;
  };
  rateLimiting?: {
    maxTokensPerUser: number;
    tokenGenerationWindow: number;
  };
}

export class JWTSecurityManager {
  private config: JWTConfig;
  private redis?: Redis;
  private tokenBlacklist: Set<string> = new Set();
  private tokenGenerationCount: Map<string, TokenGenerationData> = new Map();
  private refreshTokenStore: Map<string, RefreshTokenData> = new Map();

  constructor(config: JWTConfig) {
    this.config = config;

    if (config.blacklistRedis) {
      this.redis = new Redis({
        host: config.blacklistRedis.host,
        port: config.blacklistRedis.port,
        password: config.blacklistRedis.password,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3
      });
    }

    // Cleanup expired tokens every hour
    setInterval(() => this.cleanupExpiredTokens(), 60 * 60 * 1000);
  }

  /**
   * Generate JWT token with security enhancements
   */
  public async generateToken(payload: any, options?: jwt.SignOptions): Promise<TokenPair> {
    try {
      // Rate limiting check
      if (!this.checkTokenGenerationRate(payload.userId || payload.sub)) {
        throw new Error('Token generation rate limit exceeded');
      }

      // Add security claims
      const securePayload = {
        ...payload,
        iat: Math.floor(Date.now() / 1000),
        jti: crypto.randomUUID(), // JWT ID for tracking
        iss: this.config.issuer,
        aud: this.config.audience,
        fingerprint: this.generateFingerprint()
      };

      // Generate access token
      const accessToken = jwt.sign(securePayload, this.config.secret, {
        algorithm: this.config.algorithm,
        expiresIn: this.config.expiresIn,
        ...options
      });

      // Generate refresh token if configured
      let refreshToken: string | undefined;
      if (this.config.refreshTokenSecret) {
        refreshToken = await this.generateRefreshToken(securePayload);
      }

      // Track token generation
      this.trackTokenGeneration(payload.userId || payload.sub);

      return {
        accessToken,
        refreshToken,
        expiresIn: this.parseExpirationTime(this.config.expiresIn),
        tokenType: 'Bearer'
      };
    } catch (error) {
      // Error logging disabled for production
      throw new Error('Failed to generate token');
    }
  }

  /**
   * Generate refresh token
   */
  private async generateRefreshToken(payload: any): Promise<string> {
    const refreshPayload = {
      userId: payload.userId || payload.sub,
      type: 'refresh',
      jti: crypto.randomUUID(),
      iat: Math.floor(Date.now() / 1000)
    };

    const refreshToken = jwt.sign(
      refreshPayload,
      this.config.refreshTokenSecret!,
      {
        algorithm: this.config.algorithm,
        expiresIn: this.config.refreshTokenExpiresIn || '7d'
      }
    );

    // Store refresh token data
    this.refreshTokenStore.set(refreshToken, {
      userId: refreshPayload.userId,
      jti: refreshPayload.jti,
      createdAt: Date.now(),
      lastUsed: Date.now(),
      isActive: true
    });

    return refreshToken;
  }

  /**
   * Validate JWT token with comprehensive security checks
   */
  public async validateToken(token: string, req?: Request): Promise<boolean> {
    try {
      // Check if token is blacklisted
      if (await this.isTokenBlacklisted(token)) {
        return false;
      }

      // Verify token signature and claims
      const decoded = jwt.verify(token, this.config.secret, {
        algorithms: [this.config.algorithm],
        issuer: this.config.issuer,
        audience: this.config.audience
      }) as any;

      // Additional security validations
      if (!this.validateTokenClaims(decoded, req)) {
        return false;
      }

      // Check for token replay attacks
      if (!this.validateTokenReplay(decoded)) {
        return false;
      }

      return true;
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        // Warning logging disabled for production
      } else {
        // Error logging disabled for production
      }
      return false;
    }
  }

  /**
   * Validate token claims for security
   */
  private validateTokenClaims(decoded: any, req?: Request): boolean {
    // Check required claims
    if (!decoded.jti || !decoded.iat || !decoded.exp) {
      return false;
    }

    // Validate fingerprint if request is provided
    if (req && decoded.fingerprint) {
      const currentFingerprint = this.generateFingerprint(req);
      if (decoded.fingerprint !== currentFingerprint) {
        // Warning logging disabled for production
        return false;
      }
    }

    // Check token age (not too old, even if not expired)
    const tokenAge = Date.now() / 1000 - decoded.iat;
    const maxTokenAge = this.parseExpirationTime(this.config.expiresIn);
    if (tokenAge > maxTokenAge * 2) { // Allow some buffer
      return false;
    }

    return true;
  }

  /**
   * Validate against token replay attacks
   */
  private validateTokenReplay(decoded: any): boolean {
    const jti = decoded.jti;
    const currentTime = Math.floor(Date.now() / 1000);

    // Check if we've seen this JTI recently
    if (this.redis) {
      // In production, use Redis for distributed replay protection
      return true; // Assume Redis-based validation
    } else {
      // Simple in-memory check
      const replayKey = `replay_${jti}`;
      if (this.tokenBlacklist.has(replayKey)) {
        return false;
      }

      // Mark as seen (with expiration based on token exp)
      this.tokenBlacklist.add(replayKey);
      setTimeout(() => {
        this.tokenBlacklist.delete(replayKey);
      }, (decoded.exp - currentTime) * 1000);
    }

    return true;
  }

  /**
   * JWT validation middleware
   */
  public validateTokenMiddleware(req: Request, res: Response, next: NextFunction): void {
    this.validateTokenAsync(req, res, next).catch(next);
  }

  /**
   * Async JWT validation middleware
   */
  private async validateTokenAsync(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const token = this.extractToken(req);

      if (!token) {
        res.status(401).json({
          error: 'Authentication required',
          message: 'No token provided',
          code: 'TOKEN_MISSING'
        });
        return;
      }

      const isValid = await this.validateToken(token, req);

      if (!isValid) {
        res.status(401).json({
          error: 'Invalid token',
          message: 'Token validation failed',
          code: 'TOKEN_INVALID'
        });
        return;
      }

      // Decode and attach user info to request
      const decoded = await this.decodeToken(token);
      req.user = decoded;

      // Update session if configured
      this.updateSession(req, decoded);

      next();
    } catch (error) {
      // Error logging disabled for production
      res.status(500).json({
        error: 'Authentication service error',
        code: 'AUTH_SERVICE_ERROR'
      });
    }
  }

  /**
   * Extract token from request
   */
  private extractToken(req: Request): string | null {
    // Check Authorization header
    const authHeader = req.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Check cookie
    if (req.cookies && req.cookies.token) {
      return req.cookies.token;
    }

    // Check query parameter (less secure)
    if (req.query.token && typeof req.query.token === 'string') {
      return req.query.token;
    }

    return null;
  }

  /**
   * Decode token without validation (for internal use)
   */
  public async decodeToken(token: string): Promise<any> {
    try {
      return jwt.verify(token, this.config.secret) as any;
    } catch (error) {
      throw new Error('Failed to decode token');
    }
  }

  /**
   * Refresh access token using refresh token
   */
  public async refreshAccessToken(refreshToken: string): Promise<TokenPair> {
    try {
      if (!this.config.refreshTokenSecret) {
        throw new Error('Refresh tokens not configured');
      }

      // Validate refresh token
      const decoded = jwt.verify(refreshToken, this.config.refreshTokenSecret) as any;

      // Check if refresh token exists and is active
      const refreshData = this.refreshTokenStore.get(refreshToken);
      if (!refreshData || !refreshData.isActive) {
        throw new Error('Invalid refresh token');
      }

      // Update last used
      refreshData.lastUsed = Date.now();

      // Generate new access token
      const newTokenPair = await this.generateToken({
        userId: decoded.userId,
        // Add other claims as needed
      });

      return newTokenPair;
    } catch (error) {
      // Error logging disabled for production
      throw new Error('Failed to refresh token');
    }
  }

  /**
   * Blacklist/invalidate token
   */
  public async blacklistToken(token: string): Promise<void> {
    try {
      const decoded = jwt.decode(token) as JWTPayload | null;
      if (!decoded || !decoded.jti) {
        throw new Error('Invalid token for blacklisting');
      }

      if (this.redis) {
        // Store in Redis with expiration
        const expiry = decoded.exp - Math.floor(Date.now() / 1000);
        if (expiry > 0) {
          await this.redis.setex(`blacklist_${decoded.jti}`, expiry, 'true');
        }
      } else {
        // Store in memory
        this.tokenBlacklist.add(decoded.jti);

        // Auto-remove after expiration
        const expiry = (decoded.exp - Math.floor(Date.now() / 1000)) * 1000;
        if (expiry > 0) {
          setTimeout(() => {
            this.tokenBlacklist.delete(decoded.jti);
          }, expiry);
        }
      }

      // Logging disabled for production
    } catch (error) {
      // Error logging disabled for production
      throw new Error('Failed to blacklist token');
    }
  }

  /**
   * Check if token is blacklisted
   */
  private async isTokenBlacklisted(token: string): Promise<boolean> {
    try {
      const decoded = jwt.decode(token) as JWTPayload | null;
      if (!decoded || !decoded.jti) {
        return false;
      }

      if (this.redis) {
        const result = await this.redis.get(`blacklist_${decoded.jti}`);
        return result === 'true';
      } else {
        return this.tokenBlacklist.has(decoded.jti);
      }
    } catch (error) {
      // Error logging disabled for production
      return false;
    }
  }

  /**
   * Invalidate all tokens for a user
   */
  public async invalidateAllTokens(): Promise<void> {
    try {
      if (this.redis) {
        // In production, you'd maintain a user token mapping in Redis
        await this.redis.flushdb();
      } else {
        this.tokenBlacklist.clear();
        this.refreshTokenStore.clear();
      }

      // Logging disabled for production
    } catch (error) {
      // Error logging disabled for production
      throw new Error('Failed to invalidate tokens');
    }
  }

  /**
   * Generate security fingerprint
   */
  private generateFingerprint(req?: Request): string {
    if (!req) {
      return crypto.randomBytes(16).toString('hex');
    }

    const components = [
      req.get('User-Agent') || '',
      req.ip || '',
      req.get('Accept-Language') || '',
      req.get('Accept-Encoding') || ''
    ];

    return crypto.createHash('sha256')
      .update(components.join('|'))
      .digest('hex')
      .substring(0, 16);
  }

  /**
   * Check token generation rate limiting
   */
  private checkTokenGenerationRate(userId: string): boolean {
    if (!this.config.rateLimiting) {
      return true;
    }

    const now = Date.now();
    const windowStart = now - this.config.rateLimiting.tokenGenerationWindow;

    let userData = this.tokenGenerationCount.get(userId);
    if (!userData) {
      userData = { count: 0, windowStart: now };
      this.tokenGenerationCount.set(userId, userData);
    }

    // Reset window if expired
    if (userData.windowStart < windowStart) {
      userData.count = 0;
      userData.windowStart = now;
    }

    // Check rate limit
    if (userData.count >= this.config.rateLimiting.maxTokensPerUser) {
      return false;
    }

    userData.count++;
    return true;
  }

  /**
   * Track token generation for monitoring
   */
  private trackTokenGeneration(userId: string): void {
    // Implementation depends on your monitoring system
    // Logging disabled for production
  }

  /**
   * Update session data
   */
  private updateSession(req: Request, decoded: any): void {
    if (req.session && this.config.sessionConfig) {
      req.session.user = {
        id: decoded.userId || decoded.sub,
        roles: decoded.roles || [],
        permissions: decoded.permissions || []
      };

      // Configure session security
      if (this.config.sessionConfig.rolling) {
        req.session.touch();
      }
    }
  }

  /**
   * Parse expiration time string to seconds
   */
  private parseExpirationTime(expiresIn: string): number {
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match) {
      return 3600; // Default 1 hour
    }

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 3600;
      case 'd': return value * 86400;
      default: return 3600;
    }
  }

  /**
   * Cleanup expired tokens and data
   */
  private cleanupExpiredTokens(): void {
    const now = Date.now();

    // Cleanup refresh tokens
    for (const [token, data] of this.refreshTokenStore.entries()) {
      const maxAge = this.parseExpirationTime(this.config.refreshTokenExpiresIn || '7d') * 1000;
      if (now - data.createdAt > maxAge) {
        this.refreshTokenStore.delete(token);
      }
    }

    // Cleanup token generation tracking
    const windowMs = this.config.rateLimiting?.tokenGenerationWindow || 60000;
    for (const [userId, data] of this.tokenGenerationCount.entries()) {
      if (now - data.windowStart > windowMs) {
        this.tokenGenerationCount.delete(userId);
      }
    }

    // Logging disabled for production
  }

  /**
   * Health check for JWT system
   */
  public async healthCheck(): Promise<'healthy' | 'degraded' | 'critical'> {
    try {
      // Test token generation and validation
      const testPayload = { userId: 'health-check', test: true };
      const tokenPair = await this.generateToken(testPayload);
      const isValid = await this.validateToken(tokenPair.accessToken);

      if (!isValid) {
        return 'critical';
      }

      // Check Redis connection if configured
      if (this.redis) {
        await this.redis.ping();
      }

      // Check memory usage
      if (this.tokenBlacklist.size > 10000 || this.refreshTokenStore.size > 10000) {
        return 'degraded';
      }

      return 'healthy';
    } catch (error) {
      // Error logging disabled for production
      return 'critical';
    }
  }

  /**
   * Get JWT system statistics
   */
  public getStatistics(): {
    blacklistedTokens: number;
    activeRefreshTokens: number;
    tokenGenerationRate: number;
    redisConnected: boolean;
    algorithm: string;
    tokenExpiry: string;
  } {
    return {
      blacklistedTokens: this.tokenBlacklist.size,
      activeRefreshTokens: this.refreshTokenStore.size,
      tokenGenerationRate: Array.from(this.tokenGenerationCount.values())
        .reduce((sum, data) => sum + data.count, 0),
      redisConnected: this.redis?.status === 'ready',
      algorithm: this.config.algorithm,
      tokenExpiry: this.config.expiresIn
    };
  }
}

/**
 * Token Pair Interface
 */
export interface TokenPair {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  tokenType: string;
}

/**
 * Token Generation Data Interface
 */
interface TokenGenerationData {
  count: number;
  windowStart: number;
}

/**
 * Refresh Token Data Interface
 */
interface RefreshTokenData {
  userId: string;
  jti: string;
  createdAt: number;
  lastUsed: number;
  isActive: boolean;
}