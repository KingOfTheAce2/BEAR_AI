/**
 * BEAR AI API Error Handling Middleware
 * Comprehensive API error handling and recovery system
 * 
 * @file API error middleware with retry, circuit breaker, and recovery
 * @version 2.0.0
 */

import { ErrorHandler, ProcessedError, ErrorContext } from './errorHandler';
import { Logger } from './logger';

// ==================== INTERFACES ====================

export interface APIErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    timestamp: string;
    requestId?: string;
    retryAfter?: number;
  };
  metadata?: {
    version: string;
    endpoint: string;
    method: string;
  };
}

export interface APISuccessResponse<T = any> {
  success: true;
  data: T;
  metadata?: {
    version: string;
    endpoint: string;
    method: string;
    timestamp: string;
    requestId?: string;
  };
}

export type APIResponse<T = any> = APISuccessResponse<T> | APIErrorResponse;

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
  retryCondition: (error: any) => boolean;
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  recoveryTimeout: number;
  monitoringPeriod: number;
}

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  skipSuccessfulRequests?: boolean;
}

export interface APIMiddlewareConfig {
  retry: RetryConfig;
  circuitBreaker: CircuitBreakerConfig;
  rateLimit: RateLimitConfig;
  enableMetrics: boolean;
  enableLogging: boolean;
  timeout: number;
}

export interface RequestMetrics {
  endpoint: string;
  method: string;
  duration: number;
  status: number;
  retryCount: number;
  timestamp: Date;
  success: boolean;
}

// ==================== CIRCUIT BREAKER ====================

enum CircuitBreakerState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN'
}

class CircuitBreaker {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private failureCount = 0;
  private lastFailureTime = 0;
  private nextAttemptTime = 0;

  constructor(private config: CircuitBreakerConfig, private logger: Logger) {}

  async call<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === CircuitBreakerState.OPEN) {
      if (Date.now() >= this.nextAttemptTime) {
        this.state = CircuitBreakerState.HALF_OPEN;
        this.logger.info('Circuit breaker transitioning to HALF_OPEN');
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.state = CircuitBreakerState.CLOSED;
      this.logger.info('Circuit breaker transitioned to CLOSED');
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.config.failureThreshold) {
      this.state = CircuitBreakerState.OPEN;
      this.nextAttemptTime = Date.now() + this.config.recoveryTimeout;
      this.logger.warn('Circuit breaker opened', {
        failureCount: this.failureCount,
        nextAttemptTime: new Date(this.nextAttemptTime)
      });
    }
  }

  getState(): CircuitBreakerState {
    return this.state;
  }

  getMetrics(): { state: string; failureCount: number; lastFailureTime: number } {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime
    };
  }
}

// ==================== RATE LIMITER ====================

class RateLimiter {
  private requests: number[] = [];

  constructor(private config: RateLimitConfig) {}

  isAllowed(): boolean {
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    // Remove old requests
    this.requests = this.requests.filter(time => time > windowStart);

    if (this.requests.length >= this.config.maxRequests) {
      return false;
    }

    this.requests.push(now);
    return true;
  }

  getWaitTime(): number {
    if (this.requests.length === 0) return 0;

    const oldestRequest = Math.min(...this.requests);
    const windowEnd = oldestRequest + this.config.windowMs;
    return Math.max(0, windowEnd - Date.now());
  }
}

// ==================== API ERROR MIDDLEWARE ====================

export class APIErrorMiddleware {
  private errorHandler: ErrorHandler;
  private logger: Logger;
  private config: APIMiddlewareConfig;
  private circuitBreakers = new Map<string, CircuitBreaker>();
  private rateLimiters = new Map<string, RateLimiter>();
  private requestMetrics: RequestMetrics[] = [];

  constructor(
    errorHandler: ErrorHandler,
    logger: Logger,
    config: Partial<APIMiddlewareConfig> = {}
  ) {
    this.errorHandler = errorHandler;
    this.logger = logger;
    this.config = {
      retry: {
        maxAttempts: 3,
        baseDelay: 1000,
        maxDelay: 10000,
        backoffFactor: 2,
        retryCondition: (error) => this.isRetryableError(error)
      },
      circuitBreaker: {
        failureThreshold: 5,
        recoveryTimeout: 30000,
        monitoringPeriod: 60000
      },
      rateLimit: {
        maxRequests: 100,
        windowMs: 60000
      },
      enableMetrics: true,
      enableLogging: true,
      timeout: 30000,
      ...config
    };
  }

  // ==================== MAIN REQUEST HANDLER ====================

  /**
   * Process API request with error handling, retry, and circuit breaking
   */
  async processRequest<T>(
    endpoint: string,
    method: string,
    requestFn: () => Promise<T>,
    context?: Partial<ErrorContext>
  ): Promise<APIResponse<T>> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();
    let retryCount = 0;

    // Rate limiting
    const rateLimiter = this.getRateLimiter(endpoint);
    if (!rateLimiter.isAllowed()) {
      const waitTime = rateLimiter.getWaitTime();
      return this.createErrorResponse(
        'RATE_LIMIT_EXCEEDED',
        'Rate limit exceeded',
        {
          endpoint,
          method,
          retryAfter: Math.ceil(waitTime / 1000)
        },
        requestId
      );
    }

    // Circuit breaker
    const circuitBreaker = this.getCircuitBreaker(endpoint);

    try {
      const result = await circuitBreaker.call(async () => {
        return await this.executeWithRetry(requestFn, retryCount => {
          retryCount = retryCount;
        });
      });

      // Record success metrics
      if (this.config.enableMetrics) {
        this.recordMetrics(endpoint, method, Date.now() - startTime, 200, retryCount, true);
      }

      return this.createSuccessResponse(result, {
        endpoint,
        method,
        requestId,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      // Process error through centralized handler
      const processedError = await this.errorHandler.handleError(
        error instanceof Error ? error : new Error(String(error)),
        {
          ...context,
          component: 'APIMiddleware',
          action: `${method} ${endpoint}`,
          additionalData: {
            endpoint,
            method,
            requestId,
            retryCount,
            circuitBreakerState: circuitBreaker.getState()
          }
        }
      );

      // Record failure metrics
      if (this.config.enableMetrics) {
        this.recordMetrics(endpoint, method, Date.now() - startTime, 500, retryCount, false);
      }

      return this.createErrorResponseFromProcessed(processedError, requestId);
    }
  }

  /**
   * Execute request with retry logic
   */
  private async executeWithRetry<T>(
    requestFn: () => Promise<T>,
    onRetry: (count: number) => void
  ): Promise<T> {
    let lastError: any;
    
    for (let attempt = 1; attempt <= this.config.retry.maxAttempts; attempt++) {
      try {
        // Add timeout wrapper
        return await this.withTimeout(requestFn(), this.config.timeout);
      } catch (error) {
        lastError = error;
        
        if (attempt === this.config.retry.maxAttempts || !this.config.retry.retryCondition(error)) {
          break;
        }

        const delay = this.calculateRetryDelay(attempt);
        
        this.logger.warn('Request failed, retrying', {
          attempt,
          maxAttempts: this.config.retry.maxAttempts,
          delay,
          error: error instanceof Error ? error.message : String(error)
        });

        onRetry(attempt);
        await this.delay(delay);
      }
    }

    throw lastError;
  }

  /**
   * Add timeout to promise
   */
  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]);
  }

  // ==================== HELPER METHODS ====================

  private getCircuitBreaker(endpoint: string): CircuitBreaker {
    if (!this.circuitBreakers.has(endpoint)) {
      this.circuitBreakers.set(endpoint, new CircuitBreaker(this.config.circuitBreaker, this.logger));
    }
    return this.circuitBreakers.get(endpoint)!;
  }

  private getRateLimiter(endpoint: string): RateLimiter {
    if (!this.rateLimiters.has(endpoint)) {
      this.rateLimiters.set(endpoint, new RateLimiter(this.config.rateLimit));
    }
    return this.rateLimiters.get(endpoint)!;
  }

  private calculateRetryDelay(attempt: number): number {
    const delay = this.config.retry.baseDelay * Math.pow(this.config.retry.backoffFactor, attempt - 1);
    return Math.min(delay, this.config.retry.maxDelay);
  }

  private isRetryableError(error: any): boolean {
    if (error instanceof Error) {
      // Network errors
      if (error.message.includes('fetch') || error.message.includes('network')) {
        return true;
      }
      
      // Timeout errors
      if (error.message.includes('timeout')) {
        return true;
      }
    }

    // HTTP status codes that are retryable
    if (error.status) {
      return [408, 429, 500, 502, 503, 504].includes(error.status);
    }

    return false;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private recordMetrics(
    endpoint: string,
    method: string,
    duration: number,
    status: number,
    retryCount: number,
    success: boolean
  ): void {
    const metric: RequestMetrics = {
      endpoint,
      method,
      duration,
      status,
      retryCount,
      timestamp: new Date(),
      success
    };

    this.requestMetrics.push(metric);

    // Keep only recent metrics (last 1000 requests)
    if (this.requestMetrics.length > 1000) {
      this.requestMetrics.shift();
    }

    this.logger.debug('API request metrics recorded', metric);
  }

  private createSuccessResponse<T>(data: T, metadata?: any): APISuccessResponse<T> {
    return {
      success: true,
      data,
      metadata: {
        version: '1.0',
        ...metadata
      }
    };
  }

  private createErrorResponse(
    code: string,
    message: string,
    details?: any,
    requestId?: string,
    retryAfter?: number
  ): APIErrorResponse {
    return {
      success: false,
      error: {
        code,
        message,
        details,
        timestamp: new Date().toISOString(),
        requestId,
        retryAfter
      },
      metadata: {
        version: '1.0',
        endpoint: details?.endpoint || 'unknown',
        method: details?.method || 'unknown'
      }
    };
  }

  private createErrorResponseFromProcessed(
    processedError: ProcessedError,
    requestId: string
  ): APIErrorResponse {
    const errorCode = this.mapErrorCategoryToCode(processedError.category);
    
    return {
      success: false,
      error: {
        code: errorCode,
        message: processedError.userFriendlyMessage,
        details: {
          originalMessage: processedError.message,
          category: processedError.category,
          severity: processedError.severity,
          suggestions: processedError.suggestions,
          recoverable: processedError.recoverable,
          retryable: processedError.retryable
        },
        timestamp: processedError.context.timestamp.toISOString(),
        requestId
      },
      metadata: {
        version: '1.0',
        endpoint: processedError.context.additionalData?.endpoint || 'unknown',
        method: processedError.context.additionalData?.method || 'unknown'
      }
    };
  }

  private mapErrorCategoryToCode(category: string): string {
    const mapping: Record<string, string> = {
      'network': 'NETWORK_ERROR',
      'authentication': 'AUTH_ERROR',
      'permission': 'PERMISSION_DENIED',
      'validation': 'VALIDATION_ERROR',
      'storage': 'STORAGE_ERROR',
      'memory': 'MEMORY_ERROR',
      'ai-inference': 'AI_SERVICE_ERROR',
      'parsing': 'PARSE_ERROR',
      'system': 'SYSTEM_ERROR',
      'api': 'API_ERROR',
      'unknown': 'UNKNOWN_ERROR'
    };

    return mapping[category] || 'UNKNOWN_ERROR';
  }

  // ==================== METRICS AND MONITORING ====================

  /**
   * Get API metrics
   */
  getMetrics(): {
    requests: RequestMetrics[];
    circuitBreakers: Record<string, any>;
    summary: {
      totalRequests: number;
      successRate: number;
      averageResponseTime: number;
      errorsByEndpoint: Record<string, number>;
    };
  } {
    const successfulRequests = this.requestMetrics.filter(m => m.success);
    const errorsByEndpoint: Record<string, number> = {};

    this.requestMetrics.forEach(metric => {
      if (!metric.success) {
        errorsByEndpoint[metric.endpoint] = (errorsByEndpoint[metric.endpoint] || 0) + 1;
      }
    });

    const circuitBreakerStats: Record<string, any> = {};
    this.circuitBreakers.forEach((cb, endpoint) => {
      circuitBreakerStats[endpoint] = cb.getMetrics();
    });

    return {
      requests: this.requestMetrics,
      circuitBreakers: circuitBreakerStats,
      summary: {
        totalRequests: this.requestMetrics.length,
        successRate: this.requestMetrics.length > 0 
          ? (successfulRequests.length / this.requestMetrics.length) * 100 
          : 0,
        averageResponseTime: this.requestMetrics.length > 0
          ? this.requestMetrics.reduce((sum, m) => sum + m.duration, 0) / this.requestMetrics.length
          : 0,
        errorsByEndpoint
      }
    };
  }

  /**
   * Reset circuit breaker for endpoint
   */
  resetCircuitBreaker(endpoint: string): void {
    this.circuitBreakers.delete(endpoint);
    this.logger.info('Circuit breaker reset', { endpoint });
  }

  /**
   * Clear metrics
   */
  clearMetrics(): void {
    this.requestMetrics = [];
    this.logger.info('API metrics cleared');
  }
}

// ==================== EXPORTS ====================

export default APIErrorMiddleware;

// Utility functions for common API patterns
export const createAPIClient = (
  baseURL: string,
  errorHandler: ErrorHandler,
  logger: Logger,
  config?: Partial<APIMiddlewareConfig>
) => {
  const middleware = new APIErrorMiddleware(errorHandler, logger, config);

  return {
    get: <T>(endpoint: string, options?: RequestInit) => 
      middleware.processRequest(endpoint, 'GET', () => 
        fetch(`${baseURL}${endpoint}`, { ...options, method: 'GET' }).then(res => res.json() as Promise<T>)
      ),
    
    post: <T>(endpoint: string, data?: any, options?: RequestInit) => 
      middleware.processRequest(endpoint, 'POST', () => 
        fetch(`${baseURL}${endpoint}`, { 
          ...options, 
          method: 'POST',
          body: JSON.stringify(data),
          headers: { 'Content-Type': 'application/json', ...options?.headers }
        }).then(res => res.json() as Promise<T>)
      ),
    
    put: <T>(endpoint: string, data?: any, options?: RequestInit) => 
      middleware.processRequest(endpoint, 'PUT', () => 
        fetch(`${baseURL}${endpoint}`, { 
          ...options, 
          method: 'PUT',
          body: JSON.stringify(data),
          headers: { 'Content-Type': 'application/json', ...options?.headers }
        }).then(res => res.json() as Promise<T>)
      ),
    
    delete: <T>(endpoint: string, options?: RequestInit) => 
      middleware.processRequest(endpoint, 'DELETE', () => 
        fetch(`${baseURL}${endpoint}`, { ...options, method: 'DELETE' }).then(res => res.json() as Promise<T>)
      ),

    middleware
  };
};