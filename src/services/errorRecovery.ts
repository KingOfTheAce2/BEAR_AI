/**
 * Error Recovery System for Streaming Services
 * Handles connection failures, retries, and graceful degradation
 */

import { StreamingService } from './streamingService';
import { StreamingConfig, ConnectionState } from '../types/streaming';

export interface ErrorRecoveryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  exponentialBackoff: boolean;
  jitterEnabled: boolean;
  circuitBreakerThreshold: number;
  circuitBreakerTimeout: number;
  healthCheckInterval: number;
  enableLogging: boolean;
}

export interface RetryAttempt {
  attempt: number;
  timestamp: Date;
  error: Error;
  delay: number;
}

export interface CircuitBreakerState {
  isOpen: boolean;
  failureCount: number;
  lastFailureTime: Date | null;
  nextRetryTime: Date | null;
}

const DEFAULT_RECOVERY_CONFIG: ErrorRecoveryConfig = {
  maxRetries: 5,
  baseDelay: 1000,
  maxDelay: 30000,
  exponentialBackoff: true,
  jitterEnabled: true,
  circuitBreakerThreshold: 3,
  circuitBreakerTimeout: 60000,
  healthCheckInterval: 30000,
  enableLogging: true
};

/**
 * Error recovery wrapper that adds resilience to streaming services
 */
export class StreamingErrorRecovery {
  private config: ErrorRecoveryConfig;
  private service: StreamingService;
  private retryHistory: RetryAttempt[] = [];
  private circuitBreaker: CircuitBreakerState = {
    isOpen: false,
    failureCount: 0,
    lastFailureTime: null,
    nextRetryTime: null
  };
  private healthCheckTimer: NodeJS.Timeout | null = null;
  private reconnectPromise: Promise<void> | null = null;

  constructor(service: StreamingService, config?: Partial<ErrorRecoveryConfig>) {
    this.service = service;
    this.config = { ...DEFAULT_RECOVERY_CONFIG, ...config };
    this.setupErrorHandling();
    this.startHealthCheck();
  }

  /**
   * Setup error event handlers on the underlying service
   */
  private setupErrorHandling(): void {
    // Monitor connection state changes
    const originalConnect = this.service.connect.bind(this.service);
    const originalDisconnect = this.service.disconnect.bind(this.service);
    const originalStream = this.service.stream.bind(this.service);

    // Wrap connect method with error recovery
    this.service.connect = async (): Promise<void> => {
      if (this.circuitBreaker.isOpen && !this.canRetryCircuitBreaker()) {
        throw new Error('Circuit breaker is open - service temporarily unavailable');
      }

      try {
        await originalConnect();
        this.onSuccessfulConnection();
      } catch (error) {
        this.onConnectionFailure(error as Error);
        throw error;
      }
    };

    // Wrap stream method with error recovery
    this.service.stream = async (data: any): Promise<AsyncIterable<any>> => {
      try {
        const stream = await originalStream(data);
        return this.wrapStreamWithRecovery(stream);
      } catch (error) {
        this.onStreamFailure(error as Error);
        throw error;
      }
    };
  }

  /**
   * Wrap async iterable stream with error recovery
   */
  private async* wrapStreamWithRecovery(stream: AsyncIterable<any>): AsyncIterable<any> {
    let retryCount = 0;

    while (retryCount <= this.config.maxRetries) {
      try {
        for await (const chunk of stream) {
          yield chunk;
        }
        return; // Stream completed successfully
      } catch (error) {
        retryCount++;
        this.logError(`Stream error (attempt ${retryCount}):`, error as Error);

        if (retryCount > this.config.maxRetries) {
          this.onStreamFailure(error as Error);
          throw error;
        }

        // Wait before retry
        const delay = this.calculateDelay(retryCount);
        await this.sleep(delay);

        // Try to reconnect if needed
        const connectionState = this.service.getConnectionState();
        if (connectionState.status !== 'connected') {
          await this.attemptReconnect();
        }

        // Get a new stream for retry
        try {
          const originalStream = this.service.stream.bind(this.service);
          stream = await originalStream({}); // Re-initialize stream
        } catch (reconnectError) {
          this.logError('Failed to reinitialize stream:', reconnectError as Error);
          throw reconnectError;
        }
      }
    }
  }

  /**
   * Attempt to reconnect with exponential backoff
   */
  async attemptReconnect(): Promise<void> {
    if (this.reconnectPromise) {
      return this.reconnectPromise;
    }

    this.reconnectPromise = this.performReconnect();
    
    try {
      await this.reconnectPromise;
    } finally {
      this.reconnectPromise = null;
    }
  }

  private async performReconnect(): Promise<void> {
    let attempt = 0;

    while (attempt < this.config.maxRetries) {
      if (this.circuitBreaker.isOpen && !this.canRetryCircuitBreaker()) {
        throw new Error('Circuit breaker prevents reconnection');
      }

      attempt++;
      const delay = this.calculateDelay(attempt);

      this.logInfo(`Reconnection attempt ${attempt} in ${delay}ms`);
      await this.sleep(delay);

      try {
        await this.service.connect();
        this.onSuccessfulConnection();
        this.logInfo('Reconnection successful');
        return;
      } catch (error) {
        this.onConnectionFailure(error as Error);
        this.logError(`Reconnection attempt ${attempt} failed:`, error as Error);

        if (attempt >= this.config.maxRetries) {
          throw new Error(`Max reconnection attempts (${this.config.maxRetries}) exceeded`);
        }
      }
    }
  }

  /**
   * Calculate retry delay with exponential backoff and jitter
   */
  private calculateDelay(attempt: number): number {
    let delay = this.config.baseDelay;

    if (this.config.exponentialBackoff) {
      delay *= Math.pow(2, attempt - 1);
    }

    // Apply maximum delay cap
    delay = Math.min(delay, this.config.maxDelay);

    // Add jitter to prevent thundering herd
    if (this.config.jitterEnabled) {
      const jitter = Math.random() * 0.3; // ±30% jitter
      delay *= (1 + (Math.random() > 0.5 ? jitter : -jitter));
    }

    return Math.floor(delay);
  }

  /**
   * Handle successful connection
   */
  private onSuccessfulConnection(): void {
    // Reset circuit breaker
    this.circuitBreaker = {
      isOpen: false,
      failureCount: 0,
      lastFailureTime: null,
      nextRetryTime: null
    };

    // Clear retry history on successful connection
    this.retryHistory = [];
    this.logInfo('Connection successful - error recovery state reset');
  }

  /**
   * Handle connection failure
   */
  private onConnectionFailure(error: Error): void {
    const now = new Date();
    
    // Record retry attempt
    this.retryHistory.push({
      attempt: this.retryHistory.length + 1,
      timestamp: now,
      error,
      delay: this.calculateDelay(this.retryHistory.length + 1)
    });

    // Update circuit breaker
    this.circuitBreaker.failureCount++;
    this.circuitBreaker.lastFailureTime = now;

    // Open circuit breaker if threshold exceeded
    if (this.circuitBreaker.failureCount >= this.config.circuitBreakerThreshold) {
      this.circuitBreaker.isOpen = true;
      this.circuitBreaker.nextRetryTime = new Date(
        now.getTime() + this.config.circuitBreakerTimeout
      );
      this.logError('Circuit breaker opened due to repeated failures');
    }

    this.logError('Connection failure recorded:', error);
  }

  /**
   * Handle stream failure
   */
  private onStreamFailure(error: Error): void {
    this.logError('Stream failure:', error);
    // Stream failures don't affect circuit breaker directly
    // but may trigger reconnection attempts
  }

  /**
   * Check if circuit breaker allows retry
   */
  private canRetryCircuitBreaker(): boolean {
    if (!this.circuitBreaker.isOpen) return true;
    if (!this.circuitBreaker.nextRetryTime) return false;

    const now = new Date();
    if (now >= this.circuitBreaker.nextRetryTime) {
      this.logInfo('Circuit breaker timeout expired - allowing retry');
      return true;
    }

    return false;
  }

  /**
   * Start periodic health checks
   */
  private startHealthCheck(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    this.healthCheckTimer = setInterval(() => {
      this.performHealthCheck();
    }, this.config.healthCheckInterval);
  }

  /**
   * Perform health check on the service
   */
  private async performHealthCheck(): Promise<void> {
    try {
      const connectionState = this.service.getConnectionState();
      
      // If disconnected, try to reconnect
      if (connectionState.status === 'disconnected' && !this.circuitBreaker.isOpen) {
        this.logInfo('Health check detected disconnection - attempting reconnect');
        await this.attemptReconnect();
      }
      
      // Check for high error rates
      const metrics = this.service.getMetrics();
      const errorRate = metrics.messagesStreamed > 0 
        ? metrics.errorCount / metrics.messagesStreamed 
        : 0;

      if (errorRate > 0.1) { // 10% error rate threshold
        this.logWarning(`High error rate detected: ${(errorRate * 100).toFixed(1)}%`);
      }

    } catch (error) {
      this.logError('Health check failed:', error as Error);
    }
  }

  /**
   * Get recovery status and statistics
   */
  getRecoveryStatus() {
    return {
      circuitBreaker: { ...this.circuitBreaker },
      retryHistory: [...this.retryHistory],
      config: { ...this.config },
      isRecovering: this.reconnectPromise !== null,
      lastRetryAttempt: this.retryHistory.length > 0 
        ? this.retryHistory[this.retryHistory.length - 1] 
        : null
    };
  }

  /**
   * Reset error recovery state
   */
  reset(): void {
    this.retryHistory = [];
    this.circuitBreaker = {
      isOpen: false,
      failureCount: 0,
      lastFailureTime: null,
      nextRetryTime: null
    };
    this.reconnectPromise = null;
    this.logInfo('Error recovery state manually reset');
  }

  /**
   * Update recovery configuration
   */
  updateConfig(updates: Partial<ErrorRecoveryConfig>): void {
    this.config = { ...this.config, ...updates };
    
    // Restart health check with new interval if changed
    if (updates.healthCheckInterval) {
      this.startHealthCheck();
    }
    
    this.logInfo('Error recovery configuration updated');
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
    
    this.reconnectPromise = null;
    this.logInfo('Error recovery destroyed');
  }

  // Utility methods
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private logInfo(message: string, data?: any): void {
    if (this.config.enableLogging) {
      console.info(`[StreamingErrorRecovery] ${message}`, data || '');
    }
  }

  private logWarning(message: string, data?: any): void {
    if (this.config.enableLogging) {
      console.warn(`[StreamingErrorRecovery] ${message}`, data || '');
    }
  }

  private logError(message: string, error: Error): void {
    if (this.config.enableLogging) {
      console.error(`[StreamingErrorRecovery] ${message}`, {
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
    }
  }
}

/**
 * Factory function to wrap a streaming service with error recovery
 */
export function withErrorRecovery(
  service: StreamingService, 
  config?: Partial<ErrorRecoveryConfig>
): StreamingService {
  const recovery = new StreamingErrorRecovery(service, config);
  
  // Add recovery methods to the service
  (service as any).getRecoveryStatus = () => recovery.getRecoveryStatus();
  (service as any).resetRecovery = () => recovery.reset();
  (service as any).updateRecoveryConfig = (updates: Partial<ErrorRecoveryConfig>) => 
    recovery.updateConfig(updates);
  (service as any).destroyRecovery = () => recovery.destroy();

  return service;
}

/**
 * Global error recovery instance for shared configuration
 */
export const streamingErrorRecovery = {
  create: (service: StreamingService, config?: Partial<ErrorRecoveryConfig>) =>
    new StreamingErrorRecovery(service, config),
    
  wrap: (service: StreamingService, config?: Partial<ErrorRecoveryConfig>) =>
    withErrorRecovery(service, config),
    
  defaultConfig: DEFAULT_RECOVERY_CONFIG,
  
  createConfig: (overrides?: Partial<ErrorRecoveryConfig>): ErrorRecoveryConfig =>
    ({ ...DEFAULT_RECOVERY_CONFIG, ...overrides })
};

/**
 * Utility types for error recovery
 */
export type ErrorRecoveryStatus = ReturnType<StreamingErrorRecovery['getRecoveryStatus']>;

export interface RecoveryMetrics {
  totalRetries: number;
  successfulRecoveries: number;
  circuitBreakerActivations: number;
  averageRecoveryTime: number;
  lastRecoveryAttempt: Date | null;
}
