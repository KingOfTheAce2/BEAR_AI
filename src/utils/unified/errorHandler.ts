/**
 * Unified Error Handling System for BEAR AI
 * Consistent error handling across all modules
 */

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum ErrorCategory {
  VALIDATION = 'validation',
  NETWORK = 'network',
  AUTH = 'authentication',
  PERMISSION = 'permission',
  SYSTEM = 'system',
  USER = 'user',
  API = 'api',
  FILE = 'file',
  CONFIG = 'configuration',
  PERFORMANCE = 'performance'
}

export interface ErrorContext {
  userId?: string;
  sessionId?: string;
  requestId?: string;
  component?: string;
  action?: string;
  metadata?: Record<string, any>;
  stack?: string;
  timestamp?: Date;
}

export interface ErrorRecoveryAction {
  type: 'retry' | 'fallback' | 'redirect' | 'refresh' | 'ignore';
  label: string;
  action: () => void | Promise<void>;
  autoExecute?: boolean;
  delay?: number;
}

export class BearError extends Error {
  public readonly code: string;
  public readonly category: ErrorCategory;
  public readonly severity: ErrorSeverity;
  public readonly context: ErrorContext;
  public readonly recoveryActions: ErrorRecoveryAction[];
  public readonly timestamp: Date;
  public readonly correlationId: string;

  constructor(
    message: string,
    code: string,
    category: ErrorCategory = ErrorCategory.SYSTEM,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    context: ErrorContext = {},
    recoveryActions: ErrorRecoveryAction[] = []
  ) {
    super(message);
    this.name = 'BearError';
    this.code = code;
    this.category = category;
    this.severity = severity;
    this.context = { ...context, timestamp: new Date() };
    this.recoveryActions = recoveryActions;
    this.timestamp = new Date();
    this.correlationId = this.generateCorrelationId();

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, BearError);
    }
  }

  private generateCorrelationId(): string {
    return `bear_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      category: this.category,
      severity: this.severity,
      context: this.context,
      timestamp: this.timestamp,
      correlationId: this.correlationId,
      stack: this.stack
    };
  }

  static fromError(error: Error, code?: string, category?: ErrorCategory): BearError {
    if (error instanceof BearError) {
      return error;
    }

    return new BearError(
      error.message,
      code || 'UNKNOWN_ERROR',
      category || ErrorCategory.SYSTEM,
      ErrorSeverity.MEDIUM,
      { stack: error.stack }
    );
  }
}

export class ErrorHandler {
  private errorQueue: BearError[] = [];
  private errorListeners: ((error: BearError) => void)[] = [];
  private recoveryStrategies: Map<string, ErrorRecoveryAction[]> = new Map();
  private errorCounts: Map<string, number> = new Map();
  private maxRetries: number = 3;

  constructor(private options: {
    logErrors?: boolean;
    reportTelemetry?: boolean;
    maxQueueSize?: number;
  } = {}) {
    this.options = {
      logErrors: true,
      reportTelemetry: process.env.NODE_ENV === 'production',
      maxQueueSize: 100,
      ...options
    };

    // Register default recovery strategies
    this.registerDefaultRecoveryStrategies();
  }

  /**
   * Handle an error with unified processing
   */
  async handle(error: Error | BearError, context: ErrorContext = {}): Promise<BearError> {
    const bearError = error instanceof BearError 
      ? error 
      : BearError.fromError(error, 'UNHANDLED_ERROR');

    // Enrich context
    bearError.context = { ...bearError.context, ...context };

    // Add to queue
    this.addToQueue(bearError);

    // Log error
    if (this.options.logErrors) {
      this.logError(bearError);
    }

    // Report telemetry
    if (this.options.reportTelemetry) {
      await this.reportTelemetry(bearError);
    }

    // Notify listeners
    this.notifyListeners(bearError);

    // Attempt recovery
    await this.attemptRecovery(bearError);

    return bearError;
  }

  /**
   * Create specialized error types
   */
  validation(message: string, field: string, value?: any): BearError {
    return new BearError(
      message,
      'VALIDATION_ERROR',
      ErrorCategory.VALIDATION,
      ErrorSeverity.MEDIUM,
      { field, value },
      [{
        type: 'retry',
        label: 'Retry with correct input',
        action: () => {}
      }]
    );
  }

  network(message: string, status?: number, endpoint?: string): BearError {
    const severity = status && status >= 500 ? ErrorSeverity.HIGH : ErrorSeverity.MEDIUM;
    
    return new BearError(
      message,
      `NETWORK_ERROR_${status || 'UNKNOWN'}`,
      ErrorCategory.NETWORK,
      severity,
      { status, endpoint },
      [{
        type: 'retry',
        label: 'Retry request',
        action: () => {},
        delay: 1000
      }, {
        type: 'fallback',
        label: 'Use cached data',
        action: () => {}
      }]
    );
  }

  authentication(message: string, reason?: string): BearError {
    return new BearError(
      message,
      'AUTH_ERROR',
      ErrorCategory.AUTH,
      ErrorSeverity.HIGH,
      { reason },
      [{
        type: 'redirect',
        label: 'Login again',
        action: () => {
          window.location.href = '/login';
        }
      }]
    );
  }

  permission(message: string, requiredRole?: string, currentRole?: string): BearError {
    return new BearError(
      message,
      'PERMISSION_ERROR',
      ErrorCategory.PERMISSION,
      ErrorSeverity.HIGH,
      { requiredRole, currentRole },
      [{
        type: 'redirect',
        label: 'Go to dashboard',
        action: () => {
          window.location.href = '/dashboard';
        }
      }]
    );
  }

  system(message: string, code: string, details?: Record<string, any>): BearError {
    return new BearError(
      message,
      code,
      ErrorCategory.SYSTEM,
      ErrorSeverity.CRITICAL,
      details,
      [{
        type: 'refresh',
        label: 'Refresh page',
        action: () => window.location.reload()
      }]
    );
  }

  /**
   * Register recovery strategies
   */
  registerRecoveryStrategy(errorCode: string, actions: ErrorRecoveryAction[]): void {
    this.recoveryStrategies.set(errorCode, actions);
  }

  /**
   * Subscribe to error events
   */
  subscribe(listener: (error: BearError) => void): () => void {
    this.errorListeners.push(listener);
    return () => {
      const index = this.errorListeners.indexOf(listener);
      if (index > -1) {
        this.errorListeners.splice(index, 1);
      }
    };
  }

  /**
   * Get error statistics
   */
  getStats(): {
    totalErrors: number;
    errorsByCategory: Record<ErrorCategory, number>;
    errorsBySeverity: Record<ErrorSeverity, number>;
    recentErrors: BearError[];
  } {
    const errorsByCategory = {} as Record<ErrorCategory, number>;
    const errorsBySeverity = {} as Record<ErrorSeverity, number>;

    this.errorQueue.forEach(error => {
      errorsByCategory[error.category] = (errorsByCategory[error.category] || 0) + 1;
      errorsBySeverity[error.severity] = (errorsBySeverity[error.severity] || 0) + 1;
    });

    return {
      totalErrors: this.errorQueue.length,
      errorsByCategory,
      errorsBySeverity,
      recentErrors: this.errorQueue.slice(-10)
    };
  }

  /**
   * Clear error queue
   */
  clearErrors(): void {
    this.errorQueue = [];
    this.errorCounts.clear();
  }

  // Private methods
  private addToQueue(error: BearError): void {
    this.errorQueue.push(error);
    
    if (this.errorQueue.length > (this.options.maxQueueSize || 100)) {
      this.errorQueue.shift();
    }

    // Track error frequency
    const errorKey = `${error.category}:${error.code}`;
    this.errorCounts.set(errorKey, (this.errorCounts.get(errorKey) || 0) + 1);
  }

  private logError(error: BearError): void {
    const logLevel = this.getLogLevel(error.severity);
    const logData = {
      message: error.message,
      code: error.code,
      category: error.category,
      severity: error.severity,
      context: error.context,
      correlationId: error.correlationId,
      stack: error.stack
    };

    // Use console for now, could be replaced with proper logger
    console[logLevel]('🚨 BEAR AI Error:', logData);
  }

  private getLogLevel(severity: ErrorSeverity): 'error' | 'warn' | 'info' {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
      case ErrorSeverity.HIGH:
        return 'error';
      case ErrorSeverity.MEDIUM:
        return 'warn';
      case ErrorSeverity.LOW:
        return 'info';
      default:
        return 'error';
    }
  }

  private async reportTelemetry(error: BearError): Promise<void> {
    try {
      // In production, send to error tracking service
      if (process.env.NODE_ENV === 'production') {
        // Integration with services like Sentry, LogRocket, etc.
        console.log('📊 Error telemetry reported:', {
          correlationId: error.correlationId,
          code: error.code,
          category: error.category,
          severity: error.severity
        });
      }
    } catch (telemetryError) {
      console.warn('Failed to report error telemetry:', telemetryError);
    }
  }

  private notifyListeners(error: BearError): void {
    this.errorListeners.forEach(listener => {
      try {
        listener(error);
      } catch (listenerError) {
        console.error('Error listener failed:', listenerError);
      }
    });
  }

  private async attemptRecovery(error: BearError): Promise<void> {
    // Check for registered recovery strategies
    const strategies = this.recoveryStrategies.get(error.code) || error.recoveryActions;
    
    for (const strategy of strategies) {
      if (strategy.autoExecute) {
        try {
          if (strategy.delay) {
            await new Promise(resolve => setTimeout(resolve, strategy.delay));
          }
          await strategy.action();
          console.log(`✅ Auto-recovery successful for error ${error.code}`);
          break;
        } catch (recoveryError) {
          console.warn(`❌ Auto-recovery failed for error ${error.code}:`, recoveryError);
        }
      }
    }
  }

  private registerDefaultRecoveryStrategies(): void {
    // Network error recovery
    this.registerRecoveryStrategy('NETWORK_ERROR_500', [{
      type: 'retry',
      label: 'Retry request',
      action: () => {},
      autoExecute: true,
      delay: 2000
    }]);

    // Authentication error recovery
    this.registerRecoveryStrategy('AUTH_ERROR', [{
      type: 'redirect',
      label: 'Redirect to login',
      action: () => {
        window.location.href = '/login';
      },
      autoExecute: true
    }]);

    // System error recovery
    this.registerRecoveryStrategy('SYSTEM_ERROR', [{
      type: 'refresh',
      label: 'Refresh application',
      action: () => window.location.reload(),
      autoExecute: false
    }]);
  }
}

// Export singleton instance
export const errorHandler = new ErrorHandler();

// Helper functions
export function isRecoverableError(error: BearError): boolean {
  return error.recoveryActions.length > 0;
}

export function getErrorDisplayMessage(error: BearError): string {
  // Return user-friendly message based on error category
  switch (error.category) {
    case ErrorCategory.VALIDATION:
      return `Please check your input: ${error.message}`;
    case ErrorCategory.NETWORK:
      return 'Connection issue. Please check your internet connection and try again.';
    case ErrorCategory.AUTH:
      return 'Authentication required. Please log in to continue.';
    case ErrorCategory.PERMISSION:
      return 'You don\'t have permission to perform this action.';
    case ErrorCategory.SYSTEM:
      return 'A system error occurred. Please try again or contact support.';
    default:
      return error.message;
  }
}

export function shouldRetryError(error: BearError): boolean {
  const retryableCategories = [ErrorCategory.NETWORK, ErrorCategory.SYSTEM];
  const retrySeverities = [ErrorSeverity.LOW, ErrorSeverity.MEDIUM];
  
  return retryableCategories.includes(error.category) && 
         retrySeverities.includes(error.severity);
}