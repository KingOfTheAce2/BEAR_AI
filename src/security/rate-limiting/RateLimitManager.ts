/**
 * Advanced Rate Limiting Manager
 * Implements per-IP and per-user rate limiting with adaptive thresholds
 */

import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import { RedisStore } from 'rate-limit-redis';
import Redis from 'ioredis';

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests: boolean;
  keyGenerator?: (req: Request) => string;
  redis?: {
    host: string;
    port: number;
    password?: string;
  };
  adaptive?: {
    enabled: boolean;
    baselineWindowMs: number;
    scalingFactor: number;
    minRequests: number;
    maxRequests: number;
  };
  perUser?: {
    windowMs: number;
    maxRequests: number;
    premiumMultiplier: number;
  };
  emergencyMode?: {
    windowMs: number;
    maxRequests: number;
    triggerThreshold: number;
  };
}

export class RateLimitManager {
  private config: RateLimitConfig;
  private redis?: Redis;
  private emergencyMode: boolean = false;
  private requestMetrics: Map<string, RequestMetrics> = new Map();
  private adaptiveThresholds: Map<string, AdaptiveThreshold> = new Map();

  constructor(config: RateLimitConfig) {
    this.config = config;

    if (config.redis) {
      this.redis = new Redis({
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3
      });
    }
  }

  /**
   * Get global rate limiting middleware
   */
  public getGlobalRateLimit() {
    const store = this.redis ? new RedisStore({
      sendCommand: (...args: string[]) => this.redis!.call(...args),
    }) : undefined;

    return rateLimit({
      windowMs: this.config.windowMs,
      max: this.emergencyMode ?
        this.config.emergencyMode?.maxRequests || 10 :
        this.config.maxRequests,
      message: {
        error: 'Too many requests from this IP, please try again later',
        retryAfter: Math.ceil(this.config.windowMs / 1000)
      },
      standardHeaders: true,
      legacyHeaders: false,
      store,
      keyGenerator: this.config.keyGenerator || this.defaultKeyGenerator.bind(this),
      skip: this.shouldSkipRateLimit.bind(this),
      onLimitReached: this.onRateLimitReached.bind(this)
    });
  }

  /**
   * Get per-user rate limiting middleware
   */
  public getPerUserRateLimit() {
    if (!this.config.perUser) {
      return (req: Request, res: Response, next: NextFunction) => next();
    }

    const store = this.redis ? new RedisStore({
      sendCommand: (...args: string[]) => this.redis!.call(...args),
    }) : undefined;

    return rateLimit({
      windowMs: this.config.perUser.windowMs,
      max: (req: Request) => this.calculateUserMaxRequests(req),
      message: {
        error: 'User request limit exceeded, please try again later',
        retryAfter: Math.ceil(this.config.perUser!.windowMs / 1000)
      },
      standardHeaders: true,
      legacyHeaders: false,
      store,
      keyGenerator: this.userKeyGenerator.bind(this),
      skip: (req: Request) => !req.user,
      onLimitReached: this.onUserRateLimitReached.bind(this)
    });
  }

  /**
   * Get slow down middleware for gradual response delays
   */
  public getSlowDownMiddleware() {
    return slowDown({
      windowMs: this.config.windowMs,
      delayAfter: Math.floor(this.config.maxRequests * 0.8),
      delayMs: 500,
      maxDelayMs: 20000,
      keyGenerator: this.config.keyGenerator || this.defaultKeyGenerator.bind(this)
    });
  }

  /**
   * Adaptive rate limiting based on system load
   */
  public getAdaptiveRateLimit() {
    if (!this.config.adaptive?.enabled) {
      return (req: Request, res: Response, next: NextFunction) => next();
    }

    return (req: Request, res: Response, next: NextFunction) => {
      const key = this.defaultKeyGenerator(req);
      const threshold = this.getAdaptiveThreshold(key);

      if (this.exceedsAdaptiveThreshold(key, threshold)) {
        res.status(429).json({
          error: 'Adaptive rate limit exceeded',
          retryAfter: threshold.windowMs / 1000
        });
        return;
      }

      this.updateRequestMetrics(key);
      next();
    };
  }

  /**
   * Default key generator for IP-based rate limiting
   */
  private defaultKeyGenerator(req: Request): string {
    return req.ip || req.connection.remoteAddress || 'unknown';
  }

  /**
   * User-based key generator
   */
  private userKeyGenerator(req: Request): string {
    if (req.user && req.user.id) {
      return `user:${req.user.id}`;
    }
    return this.defaultKeyGenerator(req);
  }

  /**
   * Calculate maximum requests for user based on their tier
   */
  private calculateUserMaxRequests(req: Request): number {
    if (!req.user || !this.config.perUser) {
      return this.config.perUser?.maxRequests || 100;
    }

    const baseLimit = this.config.perUser.maxRequests;
    const isPremium = req.user.tier === 'premium' || req.user.tier === 'enterprise';

    return isPremium ?
      Math.floor(baseLimit * this.config.perUser.premiumMultiplier) :
      baseLimit;
  }

  /**
   * Check if request should skip rate limiting
   */
  private shouldSkipRateLimit(req: Request): boolean {
    // Skip for health checks
    if (req.path === '/health' || req.path === '/ping') {
      return true;
    }

    // Skip for admin users in non-emergency mode
    if (!this.emergencyMode && req.user?.role === 'admin') {
      return true;
    }

    // Skip successful requests if configured
    if (this.config.skipSuccessfulRequests && req.method === 'GET') {
      return true;
    }

    return false;
  }

  /**
   * Handle rate limit reached event
   */
  private async onRateLimitReached(req: Request, res: Response): Promise<void> {
    const key = this.defaultKeyGenerator(req);
    const metrics = this.requestMetrics.get(key) || this.createRequestMetrics();

    metrics.rateLimitHits++;
    metrics.lastRateLimitHit = Date.now();
    this.requestMetrics.set(key, metrics);

    // Log security event
    console.warn('Rate limit reached:', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path,
      method: req.method,
      timestamp: new Date().toISOString()
    });

    // Check if we should trigger emergency mode
    await this.checkEmergencyModeTriggering();
  }

  /**
   * Handle user rate limit reached event
   */
  private async onUserRateLimitReached(req: Request, res: Response): Promise<void> {
    if (!req.user) return;

    console.warn('User rate limit reached:', {
      userId: req.user.id,
      userTier: req.user.tier,
      ip: req.ip,
      path: req.path,
      method: req.method,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Get adaptive threshold for a key
   */
  private getAdaptiveThreshold(key: string): AdaptiveThreshold {
    let threshold = this.adaptiveThresholds.get(key);

    if (!threshold) {
      threshold = {
        windowMs: this.config.adaptive!.baselineWindowMs,
        maxRequests: this.config.adaptive!.minRequests,
        requestCount: 0,
        windowStart: Date.now()
      };
      this.adaptiveThresholds.set(key, threshold);
    }

    // Reset window if expired
    if (Date.now() - threshold.windowStart > threshold.windowMs) {
      threshold.requestCount = 0;
      threshold.windowStart = Date.now();

      // Adjust threshold based on historical data
      this.adjustAdaptiveThreshold(key, threshold);
    }

    return threshold;
  }

  /**
   * Check if request exceeds adaptive threshold
   */
  private exceedsAdaptiveThreshold(key: string, threshold: AdaptiveThreshold): boolean {
    return threshold.requestCount >= threshold.maxRequests;
  }

  /**
   * Update request metrics for adaptive rate limiting
   */
  private updateRequestMetrics(key: string): void {
    const threshold = this.adaptiveThresholds.get(key);
    if (threshold) {
      threshold.requestCount++;
    }

    const metrics = this.requestMetrics.get(key) || this.createRequestMetrics();
    metrics.totalRequests++;
    metrics.lastRequest = Date.now();
    this.requestMetrics.set(key, metrics);
  }

  /**
   * Adjust adaptive threshold based on system load
   */
  private adjustAdaptiveThreshold(key: string, threshold: AdaptiveThreshold): void {
    if (!this.config.adaptive) return;

    const metrics = this.requestMetrics.get(key);
    if (!metrics) return;

    // Calculate adjustment factor based on success rate and system load
    const successRate = (metrics.totalRequests - metrics.rateLimitHits) / metrics.totalRequests;
    const loadFactor = this.calculateSystemLoad();

    let adjustmentFactor = this.config.adaptive.scalingFactor;

    // Reduce limits if success rate is low or system load is high
    if (successRate < 0.8 || loadFactor > 0.8) {
      adjustmentFactor = 0.8;
    } else if (successRate > 0.95 && loadFactor < 0.5) {
      adjustmentFactor = 1.2;
    }

    // Apply adjustment
    threshold.maxRequests = Math.min(
      Math.max(
        Math.floor(threshold.maxRequests * adjustmentFactor),
        this.config.adaptive.minRequests
      ),
      this.config.adaptive.maxRequests
    );
  }

  /**
   * Calculate system load (simplified implementation)
   */
  private calculateSystemLoad(): number {
    // In a real implementation, this would check:
    // - CPU usage
    // - Memory usage
    // - Database response times
    // - Queue lengths
    // For now, return a mock value
    return Math.random() * 0.8; // 0-80% load
  }

  /**
   * Create new request metrics
   */
  private createRequestMetrics(): RequestMetrics {
    return {
      totalRequests: 0,
      rateLimitHits: 0,
      lastRequest: Date.now(),
      lastRateLimitHit: 0
    };
  }

  /**
   * Check if emergency mode should be triggered
   */
  private async checkEmergencyModeTriggering(): Promise<void> {
    if (!this.config.emergencyMode || this.emergencyMode) return;

    const totalRateLimitHits = Array.from(this.requestMetrics.values())
      .reduce((sum, metrics) => sum + metrics.rateLimitHits, 0);

    if (totalRateLimitHits > this.config.emergencyMode.triggerThreshold) {
      await this.activateEmergencyMode();
    }
  }

  /**
   * Activate emergency mode
   */
  public async activateEmergencyMode(): Promise<void> {
    this.emergencyMode = true;

    console.error('Emergency mode activated due to high rate limit violations');

    // Optionally clear existing rate limit counters
    if (this.redis) {
      await this.redis.flushdb();
    }

    // Schedule automatic deactivation
    setTimeout(() => {
      this.deactivateEmergencyMode();
    }, this.config.emergencyMode?.windowMs || 300000); // 5 minutes
  }

  /**
   * Deactivate emergency mode
   */
  public deactivateEmergencyMode(): void {
    this.emergencyMode = false;
    console.info('Emergency mode deactivated');
  }

  /**
   * Health check for rate limiting system
   */
  public async healthCheck(): Promise<'healthy' | 'degraded' | 'critical'> {
    try {
      // Check Redis connection if configured
      if (this.redis) {
        await this.redis.ping();
      }

      // Check if emergency mode is active
      if (this.emergencyMode) {
        return 'degraded';
      }

      // Check rate limit hit rate
      const totalRequests = Array.from(this.requestMetrics.values())
        .reduce((sum, metrics) => sum + metrics.totalRequests, 0);
      const totalHits = Array.from(this.requestMetrics.values())
        .reduce((sum, metrics) => sum + metrics.rateLimitHits, 0);

      const hitRate = totalRequests > 0 ? totalHits / totalRequests : 0;
      if (hitRate > 0.2) { // More than 20% of requests are hitting rate limits
        return 'degraded';
      }

      return 'healthy';
    } catch (error) {
      console.error('Rate limit health check failed:', error);
      return 'critical';
    }
  }

  /**
   * Get rate limiting statistics
   */
  public getStatistics(): {
    emergencyMode: boolean;
    totalClients: number;
    totalRequests: number;
    totalRateLimitHits: number;
    avgHitRate: number;
  } {
    const totalRequests = Array.from(this.requestMetrics.values())
      .reduce((sum, metrics) => sum + metrics.totalRequests, 0);
    const totalHits = Array.from(this.requestMetrics.values())
      .reduce((sum, metrics) => sum + metrics.rateLimitHits, 0);

    return {
      emergencyMode: this.emergencyMode,
      totalClients: this.requestMetrics.size,
      totalRequests,
      totalRateLimitHits: totalHits,
      avgHitRate: totalRequests > 0 ? totalHits / totalRequests : 0
    };
  }
}

interface RequestMetrics {
  totalRequests: number;
  rateLimitHits: number;
  lastRequest: number;
  lastRateLimitHit: number;
}

interface AdaptiveThreshold {
  windowMs: number;
  maxRequests: number;
  requestCount: number;
  windowStart: number;
}