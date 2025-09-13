// Rate limiting middleware
import { Request, Response, NextFunction } from 'express';
import { ApiError, RateLimit } from '../types/api';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  max: number; // Maximum requests per window
  message?: string;
  standardHeaders?: boolean; // Add standard rate limit headers
  keyGenerator?: (req: Request) => string;
  onLimitReached?: (req: Request, res: Response) => void;
}

class MemoryStore {
  private store: RateLimitStore = {};
  private timers: Map<string, NodeJS.Timeout> = new Map();

  get(key: string): { count: number; resetTime: number } | undefined {
    return this.store[key];
  }

  set(key: string, value: { count: number; resetTime: number }, windowMs: number): void {
    this.store[key] = value;
    
    // Clear existing timer
    const existingTimer = this.timers.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new timer to clean up expired entries
    const timer = setTimeout(() => {
      delete this.store[key];
      this.timers.delete(key);
    }, windowMs);
    
    this.timers.set(key, timer);
  }

  increment(key: string): number {
    const current = this.store[key];
    if (current) {
      current.count++;
      return current.count;
    }
    return 0;
  }

  cleanup(): void {
    const now = Date.now();
    Object.keys(this.store).forEach(key => {
      if (this.store[key].resetTime <= now) {
        delete this.store[key];
        const timer = this.timers.get(key);
        if (timer) {
          clearTimeout(timer);
          this.timers.delete(key);
        }
      }
    });
  }
}

const store = new MemoryStore();

// Clean up expired entries every minute
setInterval(() => store.cleanup(), 60000);

/**
 * Create rate limiting middleware
 */
export const createRateLimit = (config: RateLimitConfig) => {
  const {
    windowMs,
    max,
    message = 'Too many requests, please try again later',
    standardHeaders = true,
    keyGenerator = (req: Request) => req.ip,
    onLimitReached
  } = config;

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = keyGenerator(req) || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const resetTime = now + windowMs;

    let current = store.get(key);

    if (!current || current.resetTime <= now) {
      // Create new window
      current = { count: 1, resetTime };
      store.set(key, current, windowMs);
    } else {
      // Increment existing window
      current.count = store.increment(key);
    }

    const remaining = Math.max(0, max - current.count);
    const isLimitExceeded = current.count > max;

    // Add rate limit headers
    if (standardHeaders) {
      res.set({
        'X-RateLimit-Limit': max.toString(),
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': Math.ceil(current.resetTime / 1000).toString(),
      });

      if (isLimitExceeded) {
        res.set('Retry-After', Math.ceil((current.resetTime - now) / 1000).toString());
      }
    }

    if (isLimitExceeded) {
      if (onLimitReached) {
        onLimitReached(req, res);
      }

      const error: ApiError = {
        code: 'RATE_LIMIT_EXCEEDED',
        message,
        timestamp: new Date().toISOString(),
        path: req.path,
        method: req.method,
        details: {
          limit: max,
          remaining: 0,
          resetTime: current.resetTime,
          retryAfter: Math.ceil((current.resetTime - now) / 1000)
        }
      };

      res.status(429).json({ error });
      return;
    }

    next();
  };
};

/**
 * Pre-configured rate limiters for different endpoints
 */

// General API rate limit: 1000 requests per hour
export const generalRateLimit = createRateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 1000,
  message: 'Too many API requests, please try again later'
});

// Authentication rate limit: 5 attempts per 15 minutes
export const authRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: 'Too many authentication attempts, please try again later',
  keyGenerator: (req: Request) => req.ip + ':auth'
});

// Document upload rate limit: 10 uploads per hour
export const uploadRateLimit = createRateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: 'Too many file uploads, please try again later',
  keyGenerator: (req: Request) => req.ip + ':upload'
});

// Search rate limit: 100 searches per hour
export const searchRateLimit = createRateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100,
  message: 'Too many search requests, please try again later',
  keyGenerator: (req: Request) => req.ip + ':search'
});

// Chat rate limit: 200 messages per hour
export const chatRateLimit = createRateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 200,
  message: 'Too many chat messages, please try again later',
  keyGenerator: (req: Request) => req.ip + ':chat'
});

// Analysis rate limit: 50 analyses per hour (more resource intensive)
export const analysisRateLimit = createRateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50,
  message: 'Too many analysis requests, please try again later',
  keyGenerator: (req: Request) => req.ip + ':analysis'
});

/**
 * User-based rate limiting (requires authentication)
 */
export const createUserRateLimit = (config: RateLimitConfig & { perUser?: boolean }) => {
  return createRateLimit({
    ...config,
    keyGenerator: (req: Request) => {
      if (config.perUser && (req as any).user) {
        return (req as any).user.id;
      }
      return req.ip;
    }
  });
};

// Premium user rate limits (higher limits for paid accounts)
export const premiumRateLimit = createUserRateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5000, // 5x higher limit
  perUser: true,
  message: 'Rate limit exceeded for premium account'
});

// Free user rate limits
export const freeUserRateLimit = createUserRateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100,
  perUser: true,
  message: 'Rate limit exceeded for free account. Consider upgrading for higher limits.'
});

/**
 * Adaptive rate limiting based on system load
 */
export const adaptiveRateLimit = (baseConfig: RateLimitConfig) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Get system metrics (CPU, memory usage, etc.)
    const systemLoad = getSystemLoad(); // Implement this function
    
    // Adjust rate limit based on system load
    const adjustedMax = Math.floor(baseConfig.max * (1 - systemLoad));
    
    const adaptedConfig = {
      ...baseConfig,
      max: Math.max(1, adjustedMax) // Ensure at least 1 request is allowed
    };

    return createRateLimit(adaptedConfig)(req, res, next);
  };
};

/**
 * Get system load (placeholder implementation)
 */
function getSystemLoad(): number {
  // This would typically check CPU usage, memory usage, etc.
  // Return value between 0 (no load) and 1 (maximum load)
  return 0.1; // 10% load for example
}

/**
 * Rate limit bypass for specific conditions
 */
export const bypassRateLimit = (condition: (req: Request) => boolean) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (condition(req)) {
      next();
      return;
    }
    // Apply normal rate limiting if condition is not met
    generalRateLimit(req, res, next);
  };
};

/**
 * IP whitelist rate limit bypass
 */
export const ipWhitelistBypass = (whitelist: string[]) => {
  return bypassRateLimit((req: Request) => whitelist.includes(req.ip));
};

/**
 * Admin role rate limit bypass
 */
export const adminBypass = bypassRateLimit((req: Request) => {
  return (req as any).user && (req as any).user.role === 'admin';
});