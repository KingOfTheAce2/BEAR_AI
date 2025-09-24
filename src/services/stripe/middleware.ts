/**
 * Stripe Middleware Components
 *
 * Express middleware for secure Stripe webhook handling,
 * rate limiting, and request validation.
 */

import { Request, Response, NextFunction } from 'express';
import { createHash, createHmac, timingSafeEqual } from 'crypto';
import { StripeProduction } from './StripeProduction';
import { AuditLogContext, StripeError } from './types';

interface StripeRequest extends Request {
  stripeEvent?: any;
  auditContext?: AuditLogContext;
  rawBody?: Buffer;
}

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

/**
 * Rate limiting middleware for Stripe API calls
 */
export class StripeRateLimiter {
  private store: RateLimitStore = {};
  private windowMs: number;
  private maxRequests: number;
  private skipSuccessfulRequests: boolean;

  constructor(
    windowMs: number = 60000, // 1 minute
    maxRequests: number = 100,
    skipSuccessfulRequests: boolean = false
  ) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    this.skipSuccessfulRequests = skipSuccessfulRequests;

    // Clean up expired entries every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  middleware() {
    return (req: StripeRequest, res: Response, next: NextFunction) => {
      const key = this.generateKey(req);
      const now = Date.now();
      const resetTime = now + this.windowMs;

      // Initialize or get existing entry
      if (!this.store[key] || this.store[key].resetTime <= now) {
        this.store[key] = {
          count: 0,
          resetTime
        };
      }

      const entry = this.store[key];

      // Check if limit exceeded
      if (entry.count >= this.maxRequests) {
        res.status(429).json({
          error: {
            type: 'rate_limit_error',
            message: 'Too many requests. Please try again later.',
            code: 'rate_limit_exceeded'
          },
          retryAfter: Math.ceil((entry.resetTime - now) / 1000)
        });
        return;
      }

      // Increment counter
      entry.count++;

      // Set headers
      res.set({
        'X-RateLimit-Limit': this.maxRequests.toString(),
        'X-RateLimit-Remaining': (this.maxRequests - entry.count).toString(),
        'X-RateLimit-Reset': Math.ceil(entry.resetTime / 1000).toString()
      });

      // If we should skip successful requests, decrement on success
      if (this.skipSuccessfulRequests) {
        const originalSend = res.send;
        res.send = function(body) {
          if (res.statusCode < 400) {
            entry.count = Math.max(0, entry.count - 1);
          }
          return originalSend.call(this, body);
        };
      }

      next();
    };
  }

  private generateKey(req: StripeRequest): string {
    // Use IP address and user ID if available
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const userId = req.auditContext?.userId || 'anonymous';
    return `${ip}:${userId}`;
  }

  private cleanup(): void {
    const now = Date.now();
    for (const key in this.store) {
      if (this.store[key].resetTime <= now) {
        delete this.store[key];
      }
    }
  }
}

/**
 * Webhook signature validation middleware
 */
export function createWebhookValidationMiddleware(
  stripeService: StripeProduction,
  tolerance: number = 300
) {
  return async (req: StripeRequest, res: Response, next: NextFunction) => {
    try {
      const signature = req.get('stripe-signature');

      if (!signature) {
        return res.status(400).json({
          error: {
            type: 'invalid_request_error',
            message: 'Missing Stripe signature header',
            code: 'missing_signature'
          }
        });
      }

      // Get raw body
      const payload = req.rawBody?.toString() || '';

      if (!payload) {
        return res.status(400).json({
          error: {
            type: 'invalid_request_error',
            message: 'Empty request body',
            code: 'empty_body'
          }
        });
      }

      // Validate webhook signature
      const event = stripeService.validateWebhookSignature(
        payload,
        signature,
        tolerance
      );

      // Add event to request for downstream handlers
      req.stripeEvent = event;

      // Add audit context
      req.auditContext = {
        requestId: req.get('x-request-id') || generateRequestId(),
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('user-agent'),
        correlationId: event.id
      };

      next();

    } catch (error) {
      const stripeError = error as StripeError;

      res.status(400).json({
        error: {
          type: 'invalid_request_error',
          message: stripeError.message || 'Webhook validation failed',
          code: stripeError.code || 'webhook_validation_failed'
        }
      });
    }
  };
}

/**
 * Request sanitization middleware
 */
export function sanitizeStripeRequest() {
  return (req: StripeRequest, res: Response, next: NextFunction) => {
    // Remove sensitive data from query parameters
    if (req.query) {
      for (const key in req.query) {
        if (isSensitiveParameter(key)) {
          delete req.query[key];
        }
      }
    }

    // Remove sensitive headers
    const sensitiveHeaders = [
      'authorization',
      'x-api-key',
      'stripe-signature'
    ];

    for (const header of sensitiveHeaders) {
      if (req.headers[header]) {
        // Keep for processing but mark as sensitive
        req.headers[`x-original-${header}`] = req.headers[header];
      }
    }

    next();
  };
}

/**
 * Request logging middleware
 */
export function createRequestLoggingMiddleware(
  logger: (entry: any) => Promise<void>
) {
  return async (req: StripeRequest, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    const requestId = req.auditContext?.requestId || generateRequestId();

    // Log request start
    await logger({
      type: 'request_start',
      requestId,
      method: req.method,
      path: sanitizePath(req.path),
      ip: req.ip,
      userAgent: req.get('user-agent'),
      timestamp: new Date().toISOString()
    });

    // Capture response details
    const originalSend = res.send;
    res.send = function(body) {
      const duration = Date.now() - startTime;

      // Log request completion (don't await to avoid blocking)
      logger({
        type: 'request_complete',
        requestId,
        statusCode: res.statusCode,
        duration,
        contentLength: body ? Buffer.byteLength(body) : 0,
        timestamp: new Date().toISOString()
      }).catch(() => {}); // Error handling disabled for production

      return originalSend.call(this, body);
    };

    next();
  };
}

/**
 * Error handling middleware for Stripe-specific errors
 */
export function stripeErrorHandler() {
  return (error: any, req: StripeRequest, res: Response, next: NextFunction) => {
    // Handle Stripe-specific errors
    if (error.type) {
      const statusCode = getStatusCodeForStripeError(error.type);

      const sanitizedError = {
        error: {
          type: error.type,
          code: error.code,
          message: sanitizeErrorMessage(error.message),
          param: error.param,
          requestId: req.auditContext?.requestId
        }
      };

      // Log error without sensitive data
      // console.error('Stripe Error:', {
        type: error.type,
        code: error.code,
        message: sanitizeErrorMessage(error.message),
        requestId: req.auditContext?.requestId,
        path: sanitizePath(req.path),
        method: req.method,
        timestamp: new Date().toISOString()
      });

      return res.status(statusCode).json(sanitizedError);
    }

    // Handle other errors
    const statusCode = error.statusCode || error.status || 500;

    res.status(statusCode).json({
      error: {
        type: 'api_error',
        message: statusCode >= 500 ? 'Internal server error' : sanitizeErrorMessage(error.message),
        requestId: req.auditContext?.requestId
      }
    });
  };
}

/**
 * IP whitelist middleware for sensitive operations
 */
export function createIPWhitelistMiddleware(allowedIPs: string[]) {
  return (req: StripeRequest, res: Response, next: NextFunction) => {
    const clientIP = req.ip || req.connection.remoteAddress || '';

    // Check if IP is in whitelist
    const isAllowed = allowedIPs.some(allowedIP => {
      if (allowedIP.includes('/')) {
        // CIDR notation support
        return isIPInCIDR(clientIP, allowedIP);
      }
      return clientIP === allowedIP;
    });

    if (!isAllowed) {
      return res.status(403).json({
        error: {
          type: 'authentication_error',
          message: 'Access denied from this IP address',
          code: 'ip_not_allowed'
        }
      });
    }

    next();
  };
}

/**
 * CORS middleware specifically configured for Stripe
 */
export function createStripeCORSMiddleware(allowedOrigins: string[]) {
  return (req: StripeRequest, res: Response, next: NextFunction) => {
    const origin = req.get('origin');

    if (origin && allowedOrigins.includes(origin)) {
      res.header('Access-Control-Allow-Origin', origin);
    }

    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Stripe-Signature');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Max-Age', '86400'); // 24 hours

    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    next();
  };
}

/**
 * Request validation middleware for specific endpoints
 */
export function validatePaymentIntentRequest() {
  return (req: StripeRequest, res: Response, next: NextFunction) => {
    const { amount, currency, customer_id } = req.body;

    const errors: string[] = [];

    // Validate amount
    if (!amount || typeof amount !== 'number' || amount < 50) {
      errors.push('Amount must be at least 50 cents');
    }

    if (amount > 99999999) {
      errors.push('Amount exceeds maximum limit');
    }

    // Validate currency
    if (!currency || typeof currency !== 'string') {
      errors.push('Currency is required');
    }

    const supportedCurrencies = ['usd', 'eur', 'gbp', 'cad', 'aud', 'jpy'];
    if (currency && !supportedCurrencies.includes(currency.toLowerCase())) {
      errors.push(`Unsupported currency: ${currency}`);
    }

    // Validate customer ID format if provided
    if (customer_id && !customer_id.startsWith('cus_')) {
      errors.push('Invalid customer ID format');
    }

    if (errors.length > 0) {
      return res.status(400).json({
        error: {
          type: 'invalid_request_error',
          message: 'Validation failed',
          errors
        }
      });
    }

    next();
  };
}

// Helper functions

function generateRequestId(): string {
  return 'req_' + createHash('sha256')
    .update(Date.now().toString() + Math.random().toString())
    .digest('hex')
    .substring(0, 16);
}

function isSensitiveParameter(key: string): boolean {
  const sensitiveParams = [
    'api_key',
    'secret',
    'password',
    'token',
    'card_number',
    'cvc',
    'ssn'
  ];

  return sensitiveParams.some(param =>
    key.toLowerCase().includes(param)
  );
}

function sanitizePath(path: string): string {
  // Remove query parameters and sensitive path segments
  return path
    .split('?')[0]
    .replace(/\/cus_[a-zA-Z0-9]+/g, '/cus_***')
    .replace(/\/pi_[a-zA-Z0-9]+/g, '/pi_***')
    .replace(/\/sub_[a-zA-Z0-9]+/g, '/sub_***')
    .replace(/\/in_[a-zA-Z0-9]+/g, '/in_***');
}

function sanitizeErrorMessage(message: string): string {
  return message
    .replace(/sk_live_[a-zA-Z0-9]+/g, '[REDACTED_API_KEY]')
    .replace(/whsec_[a-zA-Z0-9]+/g, '[REDACTED_WEBHOOK_SECRET]')
    .replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, '[REDACTED_CARD]')
    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[REDACTED_SSN]');
}

function getStatusCodeForStripeError(errorType: string): number {
  const statusMap: Record<string, number> = {
    'api_error': 500,
    'card_error': 402,
    'idempotency_error': 400,
    'invalid_request_error': 400,
    'rate_limit_error': 429,
    'authentication_error': 401,
    'api_connection_error': 502
  };

  return statusMap[errorType] || 500;
}

function isIPInCIDR(ip: string, cidr: string): boolean {
  // Basic CIDR check implementation
  // In production, use a proper library like 'ipaddr.js'
  const [network, prefixLength] = cidr.split('/');
  const prefix = parseInt(prefixLength, 10);

  // Convert IPs to integers for comparison
  const ipInt = ipToInt(ip);
  const networkInt = ipToInt(network);

  if (ipInt === null || networkInt === null) {
    return false;
  }

  const mask = (0xFFFFFFFF << (32 - prefix)) >>> 0;

  return (ipInt & mask) === (networkInt & mask);
}

function ipToInt(ip: string): number | null {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;

  const nums = parts.map(part => parseInt(part, 10));
  if (nums.some(num => isNaN(num) || num < 0 || num > 255)) {
    return null;
  }

  return (nums[0] << 24) + (nums[1] << 16) + (nums[2] << 8) + nums[3];
}

export {
  StripeRequest,
  RateLimitStore
};