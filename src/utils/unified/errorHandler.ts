/**
 * Unified Error Handler for BEAR AI
 * Provides consistent error handling and reporting
 */

import { logger } from './logger';

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';
export type ErrorCategory = 'system' | 'user' | 'network' | 'validation' | 'auth' | 'unknown';

export interface ErrorContext {
  [key: string]: any;
}

export class BearError extends Error {
  public readonly code: string;
  public readonly category: ErrorCategory;
  public readonly severity: ErrorSeverity;
  public readonly context: ErrorContext;
  public readonly timestamp: Date;
  public readonly correlationId: string;

  constructor(
    message: string,
    code: string,
    category: ErrorCategory = 'unknown',
    severity: ErrorSeverity = 'medium',
    context: ErrorContext = {}
  ) {
    super(message);
    this.name = 'BearError';
    this.code = code;
    this.category = category;
    this.severity = severity;
    this.context = context;
    this.timestamp = new Date();
    this.correlationId = this.generateCorrelationId();

    // Maintain proper stack trace (Node.js specific)
    if (typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(this, BearError);
    }
  }

  private generateCorrelationId(): string {
    return `bear-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      category: this.category,
      severity: this.severity,
      context: this.context,
      timestamp: this.timestamp.toISOString(),
      correlationId: this.correlationId,
      stack: this.stack
    };
  }
}

class ErrorHandler {
  private errorReports: BearError[] = [];
  private maxReports: number = 100;

  /**
   * Create a system error
   */
  system(message: string, code: string, context: ErrorContext = {}): BearError {
    return this.createError(message, code, 'system', 'high', context);
  }

  /**
   * Create a user error
   */
  user(message: string, code: string, context: ErrorContext = {}): BearError {
    return this.createError(message, code, 'user', 'low', context);
  }

  /**
   * Create a network error
   */
  network(message: string, code: string, context: ErrorContext = {}): BearError {
    return this.createError(message, code, 'network', 'medium', context);
  }

  /**
   * Create a validation error
   */
  validation(message: string, code: string, context: ErrorContext = {}): BearError {
    return this.createError(message, code, 'validation', 'low', context);
  }

  /**
   * Create an authentication error
   */
  auth(message: string, code: string, context: ErrorContext = {}): BearError {
    return this.createError(message, code, 'auth', 'high', context);
  }

  /**
   * Create a generic error
   */
  createError(
    message: string,
    code: string,
    category: ErrorCategory = 'unknown',
    severity: ErrorSeverity = 'medium',
    context: ErrorContext = {}
  ): BearError {
    const error = new BearError(message, code, category, severity, context);
    this.reportError(error);
    return error;
  }

  /**
   * Report an error
   */
  reportError(error: BearError | Error): void {
    const bearError = error instanceof BearError
      ? error
      : this.createError(error.message, 'UNKNOWN_ERROR', 'unknown', 'medium', {
          originalError: error.name,
          stack: error.stack
        });

    // Add to reports
    this.errorReports.unshift(bearError);

    // Maintain max reports limit
    if (this.errorReports.length > this.maxReports) {
      this.errorReports = this.errorReports.slice(0, this.maxReports);
    }

    // Log error
    logger.error(`[${bearError.code}] ${bearError.message}`, {
      category: bearError.category,
      severity: bearError.severity,
      correlationId: bearError.correlationId,
      context: bearError.context
    });

    // In production, could send to error reporting service
    if (process.env.NODE_ENV === 'production' && bearError.severity === 'critical') {
      this.sendToErrorService(bearError);
    }
  }

  /**
   * Handle async errors
   */
  async handleAsync<T>(
    operation: () => Promise<T>,
    fallback?: T,
    errorCode: string = 'ASYNC_OPERATION_ERROR'
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      const bearError = error instanceof BearError
        ? error
        : this.createError(
            error instanceof Error ? error.message : 'Async operation failed',
            errorCode,
            'system',
            'medium',
            { originalError: error }
          );

      this.reportError(bearError);

      if (fallback !== undefined) {
        return fallback;
      }

      throw bearError;
    }
  }

  /**
   * Handle sync errors
   */
  handle<T>(
    operation: () => T,
    fallback?: T,
    errorCode: string = 'SYNC_OPERATION_ERROR'
  ): T {
    try {
      return operation();
    } catch (error) {
      const bearError = error instanceof BearError
        ? error
        : this.createError(
            error instanceof Error ? error.message : 'Operation failed',
            errorCode,
            'system',
            'medium',
            { originalError: error }
          );

      this.reportError(bearError);

      if (fallback !== undefined) {
        return fallback;
      }

      throw bearError;
    }
  }

  /**
   * Get error reports
   */
  getReports(category?: ErrorCategory, severity?: ErrorSeverity): BearError[] {
    let reports = [...this.errorReports];

    if (category) {
      reports = reports.filter(error => error.category === category);
    }

    if (severity) {
      reports = reports.filter(error => error.severity === severity);
    }

    return reports;
  }

  /**
   * Clear error reports
   */
  clearReports(): void {
    this.errorReports = [];
  }

  /**
   * Get error statistics
   */
  getStats(): {
    total: number;
    byCategory: Record<ErrorCategory, number>;
    bySeverity: Record<ErrorSeverity, number>;
    recent: number;
  } {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);

    const byCategory: Record<ErrorCategory, number> = {
      system: 0, user: 0, network: 0, validation: 0, auth: 0, unknown: 0
    };

    const bySeverity: Record<ErrorSeverity, number> = {
      low: 0, medium: 0, high: 0, critical: 0
    };

    let recent = 0;

    this.errorReports.forEach(error => {
      byCategory[error.category]++;
      bySeverity[error.severity]++;

      if (error.timestamp.getTime() > oneHourAgo) {
        recent++;
      }
    });

    return {
      total: this.errorReports.length,
      byCategory,
      bySeverity,
      recent
    };
  }

  private sendToErrorService(error: BearError): void {
    // Placeholder for error reporting service integration
    // Error logging disabled for production
  }
}

// Export singleton instance
export const errorHandler = new ErrorHandler();

// Export utility functions
export function createBearError(
  message: string,
  code: string,
  category: ErrorCategory = 'unknown',
  severity: ErrorSeverity = 'medium',
  context: ErrorContext = {}
): BearError {
  return errorHandler.createError(message, code, category, severity, context);
}

export function reportError(error: BearError | Error): void {
  errorHandler.reportError(error);
}

export async function handleAsync<T>(
  operation: () => Promise<T>,
  fallback?: T,
  errorCode?: string
): Promise<T> {
  return errorHandler.handleAsync(operation, fallback, errorCode);
}

export function handleSync<T>(
  operation: () => T,
  fallback?: T,
  errorCode?: string
): T {
  return errorHandler.handle(operation, fallback, errorCode);
}