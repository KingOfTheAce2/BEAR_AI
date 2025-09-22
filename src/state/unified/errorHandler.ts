/**
 * Unified Error Handling System for BEAR AI
 * Consistent error patterns and handling across all components and services
 */

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium', 
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum ErrorCategory {
  SYSTEM = 'system',
  USER = 'user', 
  NETWORK = 'network',
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  BUSINESS = 'business',
  EXTERNAL = 'external'
}

export interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  timestamp?: Date;
  userAgent?: string;
  url?: string;
  additionalData?: Record<string, any>;
}

export interface ErrorDetails {
  code: string;
  message: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  context?: ErrorContext;
  originalError?: Error;
  stack?: string;
  recoverable: boolean;
  userMessage?: string;
  actionRequired?: string;
  retryable?: boolean;
  retryAfter?: number;
}

/**
 * Custom error class for BEAR AI application
 */
export class BearError extends Error {
  public readonly code: string;
  public readonly category: ErrorCategory;
  public readonly severity: ErrorSeverity;
  public readonly context: ErrorContext | undefined;
  public readonly originalError: Error | undefined;
  public readonly recoverable: boolean;
  public readonly userMessage: string | undefined;
  public readonly actionRequired: string | undefined;
  public readonly retryable: boolean | undefined;
  public readonly retryAfter: number | undefined;
  public readonly timestamp: Date;

  constructor(details: ErrorDetails) {
    super(details.message);
    
    this.name = 'BearError';
    this.code = details.code;
    this.category = details.category;
    this.severity = details.severity;
    this.context = details.context;
    this.originalError = details.originalError;
    this.recoverable = details.recoverable;
    this.userMessage = details.userMessage;
    this.actionRequired = details.actionRequired;
    this.retryable = details.retryable;
    this.retryAfter = details.retryAfter;
    this.timestamp = new Date();

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, BearError);
    }

    // Include original error stack if available
    if (details.originalError?.stack) {
      this.stack = `${this.stack}\nCaused by: ${details.originalError.stack}`;
    }
  }

  /**
   * Convert error to JSON for logging/transmission
   */
  toJSON(): Record<string, any> {
    const base: Record<string, any> = {
      name: this.name,
      code: this.code,
      message: this.message,
      category: this.category,
      severity: this.severity,
      recoverable: this.recoverable,
      timestamp: this.timestamp.toISOString(),
      stack: this.stack
    };

    if (this.context) {
      base.context = this.context;
    }
    if (this.userMessage) {
      base.userMessage = this.userMessage;
    }
    if (this.actionRequired) {
      base.actionRequired = this.actionRequired;
    }
    if (this.retryable !== undefined) {
      base.retryable = this.retryable;
    }
    if (this.retryAfter !== undefined) {
      base.retryAfter = this.retryAfter;
    }
    if (this.originalError) {
      base.originalError = {
        name: this.originalError.name,
        message: this.originalError.message,
        stack: this.originalError.stack
      };
    }

    return base;
  }

  /**
   * Get user-friendly error message
   */
  getUserMessage(): string {
    return this.userMessage || this.getDefaultUserMessage();
  }

  /**
   * Get default user message based on category
   */
  private getDefaultUserMessage(): string {
    switch (this.category) {
      case ErrorCategory.NETWORK:
        return 'Network connection issue. Please check your internet connection and try again.';
      case ErrorCategory.AUTHENTICATION:
        return 'Authentication failed. Please log in again.';
      case ErrorCategory.AUTHORIZATION:
        return 'You do not have permission to perform this action.';
      case ErrorCategory.VALIDATION:
        return 'Invalid input provided. Please check your data and try again.';
      case ErrorCategory.SYSTEM:
        return 'A system error occurred. Please try again later.';
      case ErrorCategory.EXTERNAL:
        return 'An external service is temporarily unavailable. Please try again later.';
      case ErrorCategory.BUSINESS:
        return 'Unable to complete the requested operation.';
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  }
}

/**
 * Error handler class
 */
class ErrorHandler {
  private errorListeners: Set<(error: BearError) => void> = new Set();
  private errorCounts: Map<string, number> = new Map();
  private lastErrors: Map<string, Date> = new Map();

  /**
   * Handle system errors
   */
  system(
    message: string,
    code: string,
    context?: ErrorContext,
    originalError?: Error
  ): BearError {
    const error = new BearError({
      code,
      message,
      category: ErrorCategory.SYSTEM,
      severity: ErrorSeverity.HIGH,
      recoverable: false,
      retryable: true,
      retryAfter: 5000,
      ...(context ? { context } : {}),
      ...(originalError ? { originalError } : {})
    });

    this.handleError(error);
    return error;
  }

  /**
   * Handle user errors
   */
  user(
    message: string,
    code: string,
    context?: ErrorContext,
    userMessage?: string
  ): BearError {
    const error = new BearError({
      code,
      message,
      category: ErrorCategory.USER,
      severity: ErrorSeverity.LOW,
      recoverable: true,
      retryable: false,
      ...(context ? { context } : {}),
      ...(userMessage ? { userMessage } : {})
    });

    this.handleError(error);
    return error;
  }

  /**
   * Handle network errors
   */
  network(
    message: string,
    code: string,
    context?: ErrorContext,
    originalError?: Error
  ): BearError {
    const error = new BearError({
      code,
      message,
      category: ErrorCategory.NETWORK,
      severity: ErrorSeverity.MEDIUM,
      recoverable: true,
      retryable: true,
      retryAfter: 3000,
      ...(context ? { context } : {}),
      ...(originalError ? { originalError } : {})
    });

    this.handleError(error);
    return error;
  }

  /**
   * Handle validation errors
   */
  validation(
    message: string,
    code: string,
    context?: ErrorContext,
    userMessage?: string
  ): BearError {
    const error = new BearError({
      code,
      message,
      category: ErrorCategory.VALIDATION,
      severity: ErrorSeverity.LOW,
      recoverable: true,
      retryable: false,
      userMessage: userMessage || 'Please check your input and try again.',
      ...(context ? { context } : {})
    });

    this.handleError(error);
    return error;
  }

  /**
   * Handle authentication errors
   */
  authentication(
    message: string,
    code: string,
    context?: ErrorContext
  ): BearError {
    const error = new BearError({
      code,
      message,
      category: ErrorCategory.AUTHENTICATION,
      severity: ErrorSeverity.HIGH,
      recoverable: true,
      retryable: false,
      actionRequired: 'LOGIN_REQUIRED',
      userMessage: 'Please log in to continue.',
      ...(context ? { context } : {})
    });

    this.handleError(error);
    return error;
  }

  /**
   * Handle authorization errors
   */
  authorization(
    message: string,
    code: string,
    context?: ErrorContext
  ): BearError {
    const error = new BearError({
      code,
      message,
      category: ErrorCategory.AUTHORIZATION,
      severity: ErrorSeverity.MEDIUM,
      recoverable: false,
      retryable: false,
      userMessage: 'You do not have permission to perform this action.',
      ...(context ? { context } : {})
    });

    this.handleError(error);
    return error;
  }

  /**
   * Handle business logic errors
   */
  business(
    message: string,
    code: string,
    context?: ErrorContext,
    userMessage?: string
  ): BearError {
    const error = new BearError({
      code,
      message,
      category: ErrorCategory.BUSINESS,
      severity: ErrorSeverity.MEDIUM,
      recoverable: true,
      retryable: false,
      ...(context ? { context } : {}),
      ...(userMessage ? { userMessage } : {})
    });

    this.handleError(error);
    return error;
  }

  /**
   * Handle external service errors
   */
  external(
    message: string,
    code: string,
    context?: ErrorContext,
    originalError?: Error
  ): BearError {
    const error = new BearError({
      code,
      message,
      category: ErrorCategory.EXTERNAL,
      severity: ErrorSeverity.MEDIUM,
      recoverable: true,
      retryable: true,
      retryAfter: 10000,
      ...(context ? { context } : {}),
      ...(originalError ? { originalError } : {})
    });

    this.handleError(error);
    return error;
  }

  /**
   * Convert unknown error to BearError
   */
  fromError(error: unknown, code?: string, context?: ErrorContext): BearError {
    if (error instanceof BearError) {
      return error;
    }

    if (error instanceof Error) {
      return this.system(
        error.message,
        code || 'UNKNOWN_ERROR',
        context,
        error
      );
    }

    return this.system(
      typeof error === 'string' ? error : 'Unknown error occurred',
      code || 'UNKNOWN_ERROR',
      context
    );
  }

  /**
   * Handle error reporting and notifications
   */
  private handleError(error: BearError): void {
    // Track error frequency
    this.trackError(error);

    // Log error based on severity
    this.logError(error);

    // Notify listeners
    this.notifyListeners(error);

    // Report critical errors
    if (error.severity === ErrorSeverity.CRITICAL) {
      this.reportCriticalError(error);
    }
  }

  /**
   * Track error occurrence for analysis
   */
  private trackError(error: BearError): void {
    const key = `${error.category}:${error.code}`;
    const currentCount = this.errorCounts.get(key) || 0;
    this.errorCounts.set(key, currentCount + 1);
    this.lastErrors.set(key, new Date());

    // Reset counts periodically
    this.cleanupErrorTracking();
  }

  /**
   * Log error appropriately based on severity
   */
  private logError(error: BearError): void {
    const logData = {
      code: error.code,
      category: error.category,
      severity: error.severity,
      context: error.context,
      recoverable: error.recoverable,
      retryable: error.retryable
    };

    // Use console methods based on severity
    switch (error.severity) {
      case ErrorSeverity.LOW:
        console.info('Error (Low):', error.message, logData);
        break;
      case ErrorSeverity.MEDIUM:
        console.warn('Error (Medium):', error.message, logData);
        break;
      case ErrorSeverity.HIGH:
        console.error('Error (High):', error.message, logData);
        break;
      case ErrorSeverity.CRITICAL:
        console.error('Error (Critical):', error.message, logData, error.stack);
        break;
    }
  }

  /**
   * Notify error listeners
   */
  private notifyListeners(error: BearError): void {
    this.errorListeners.forEach(listener => {
      try {
        listener(error);
      } catch (listenerError) {
        console.error('Error listener failed:', listenerError);
      }
    });
  }

  /**
   * Report critical errors to monitoring service
   */
  private reportCriticalError(error: BearError): void {
    // In production, send to error monitoring service
    if (process.env['NODE_ENV'] === 'production') {
      // Example: Send to Sentry, Bugsnag, etc.
      console.error('Critical error reported:', error.toJSON());
    }
  }

  /**
   * Clean up old error tracking data
   */
  private cleanupErrorTracking(): void {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    for (const [key, timestamp] of this.lastErrors.entries()) {
      if (timestamp < oneHourAgo) {
        this.lastErrors.delete(key);
        this.errorCounts.delete(key);
      }
    }
  }

  /**
   * Subscribe to error notifications
   */
  onError(listener: (error: BearError) => void): () => void {
    this.errorListeners.add(listener);
    
    return () => {
      this.errorListeners.delete(listener);
    };
  }

  /**
   * Get error statistics
   */
  getErrorStats(): Record<string, number> {
    return Object.fromEntries(this.errorCounts);
  }

  /**
   * Clear error statistics
   */
  clearErrorStats(): void {
    this.errorCounts.clear();
    this.lastErrors.clear();
  }
}

// Global error handler instance
export const errorHandler = new ErrorHandler();

// Utility functions
export const createError = {
  system: (message: string, code: string, context?: ErrorContext, originalError?: Error) =>
    errorHandler.system(message, code, context, originalError),
    
  user: (message: string, code: string, context?: ErrorContext, userMessage?: string) =>
    errorHandler.user(message, code, context, userMessage),
    
  network: (message: string, code: string, context?: ErrorContext, originalError?: Error) =>
    errorHandler.network(message, code, context, originalError),
    
  validation: (message: string, code: string, context?: ErrorContext, userMessage?: string) =>
    errorHandler.validation(message, code, context, userMessage),
    
  authentication: (message: string, code: string, context?: ErrorContext) =>
    errorHandler.authentication(message, code, context),
    
  authorization: (message: string, code: string, context?: ErrorContext) =>
    errorHandler.authorization(message, code, context),
    
  business: (message: string, code: string, context?: ErrorContext, userMessage?: string) =>
    errorHandler.business(message, code, context, userMessage),
    
  external: (message: string, code: string, context?: ErrorContext, originalError?: Error) =>
    errorHandler.external(message, code, context, originalError)
};

// Global error boundary
export function setupGlobalErrorHandling(): void {
  // Handle unhandled promise rejections
  if (typeof window !== 'undefined') {
    window.addEventListener('unhandledrejection', (event) => {
      const error = errorHandler.fromError(
        event.reason,
        'UNHANDLED_PROMISE_REJECTION',
        {
          component: 'GlobalErrorHandler',
          action: 'unhandledrejection',
          url: window.location.href
        }
      );
      
      console.error('Unhandled promise rejection:', error);
      event.preventDefault(); // Prevent default browser behavior
    });

    // Handle uncaught errors
    window.addEventListener('error', (event) => {
      const error = errorHandler.fromError(
        event.error || event.message,
        'UNCAUGHT_ERROR',
        {
          component: 'GlobalErrorHandler',
          action: 'error',
          url: window.location.href,
          additionalData: {
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno
          }
        }
      );
      
      console.error('Uncaught error:', error);
    });
  }
}
