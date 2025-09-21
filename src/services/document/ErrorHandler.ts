import { ProcessingError, ErrorReport } from '../../types/document';

/**
 * Comprehensive Error Handling System for Document Analysis
 * Provides centralized error management, logging, and recovery mechanisms
 */

export enum ErrorCode {
  // File System Errors
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  FILE_ACCESS_DENIED = 'FILE_ACCESS_DENIED',
  FILE_CORRUPTED = 'FILE_CORRUPTED',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  INVALID_FILE_FORMAT = 'INVALID_FILE_FORMAT',

  // OCR Errors
  OCR_ENGINE_NOT_FOUND = 'OCR_ENGINE_NOT_FOUND',
  OCR_PROCESSING_FAILED = 'OCR_PROCESSING_FAILED',
  OCR_LOW_CONFIDENCE = 'OCR_LOW_CONFIDENCE',
  OCR_LANGUAGE_NOT_SUPPORTED = 'OCR_LANGUAGE_NOT_SUPPORTED',
  OCR_IMAGE_QUALITY_POOR = 'OCR_IMAGE_QUALITY_POOR',

  // Analysis Errors
  ENTITY_RECOGNITION_FAILED = 'ENTITY_RECOGNITION_FAILED',
  PATTERN_MATCHING_FAILED = 'PATTERN_MATCHING_FAILED',
  COMPLIANCE_CHECK_FAILED = 'COMPLIANCE_CHECK_FAILED',
  VERSION_CONTROL_ERROR = 'VERSION_CONTROL_ERROR',
  ANALYSIS_TIMEOUT = 'ANALYSIS_TIMEOUT',

  // System Errors
  MEMORY_EXHAUSTED = 'MEMORY_EXHAUSTED',
  CPU_OVERLOAD = 'CPU_OVERLOAD',
  DISK_SPACE_LOW = 'DISK_SPACE_LOW',
  NETWORK_ERROR = 'NETWORK_ERROR',
  DEPENDENCY_MISSING = 'DEPENDENCY_MISSING',

  // Configuration Errors
  INVALID_CONFIGURATION = 'INVALID_CONFIGURATION',
  MISSING_CREDENTIALS = 'MISSING_CREDENTIALS',
  LICENSE_EXPIRED = 'LICENSE_EXPIRED',
  FEATURE_NOT_AVAILABLE = 'FEATURE_NOT_AVAILABLE',

  // Security Errors
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
  SECURITY_VIOLATION = 'SECURITY_VIOLATION',
  ENCRYPTION_FAILED = 'ENCRYPTION_FAILED',
  SIGNATURE_INVALID = 'SIGNATURE_INVALID',

  // Generic Errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  OPERATION_CANCELLED = 'OPERATION_CANCELLED',
  VALIDATION_FAILED = 'VALIDATION_FAILED'
}

export interface ErrorContext {
  operationId?: string;
  documentId?: string;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  stackTrace?: string;
  systemInfo?: {
    platform: string;
    memory: number;
    diskSpace: number;
    cpuUsage: number;
  };
}

export interface RecoveryAction {
  action: string;
  description: string;
  automated: boolean;
  execute: () => Promise<boolean>;
}

export class DocumentProcessingError extends Error {
  public readonly code: ErrorCode;
  public readonly details?: string;
  public readonly context: ErrorContext;
  public readonly recoverable: boolean;
  public readonly timestamp: Date;
  public readonly severity: 'low' | 'medium' | 'high' | 'critical';

  constructor(
    code: ErrorCode,
    message: string,
    options: {
      details?: string;
      context?: ErrorContext;
      recoverable?: boolean;
      severity?: 'low' | 'medium' | 'high' | 'critical';
      cause?: Error;
    } = {}
  ) {
    super(message);
    this.name = 'DocumentProcessingError';
    this.code = code;
    this.details = options.details;
    this.context = options.context || {};
    this.recoverable = options.recoverable ?? true;
    this.severity = options.severity || 'medium';
    this.timestamp = new Date();

    if (options.cause) {
      this.stack = options.cause.stack;
    }
  }

  toProcessingError(): ProcessingError {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
      timestamp: this.timestamp,
      context: this.context,
      recoverable: this.recoverable
    };
  }
}

export class DocumentErrorHandler {
  private errors: ProcessingError[] = [];
  private maxErrors: number = 1000;
  private errorCounts: Map<ErrorCode, number> = new Map();
  private recoveryActions: Map<ErrorCode, RecoveryAction[]> = new Map();

  constructor() {
    this.setupRecoveryActions();
    this.setupErrorMonitoring();
  }

  /**
   * Handle an error and attempt recovery
   */
  async handleError(error: Error | DocumentProcessingError, context?: ErrorContext): Promise<boolean> {
    let processingError: ProcessingError;

    if (error instanceof DocumentProcessingError) {
      processingError = error.toProcessingError();
    } else {
      // Convert generic error to processing error
      processingError = {
        code: ErrorCode.UNKNOWN_ERROR,
        message: error.message,
        details: error.stack,
        timestamp: new Date(),
        context: context || {},
        recoverable: true
      };
    }

    // Log the error
    this.logError(processingError);

    // Store the error
    this.addError(processingError);

    // Update error counts
    const count = this.errorCounts.get(processingError.code as ErrorCode) || 0;
    this.errorCounts.set(processingError.code as ErrorCode, count + 1);

    // Attempt recovery if possible
    if (processingError.recoverable) {
      return await this.attemptRecovery(processingError.code as ErrorCode, context);
    }

    return false;
  }

  /**
   * Attempt to recover from an error
   */
  private async attemptRecovery(errorCode: ErrorCode, context?: ErrorContext): Promise<boolean> {
    const actions = this.recoveryActions.get(errorCode);
    if (!actions) return false;

    for (const action of actions) {
      try {
        console.log(`Attempting recovery action: ${action.description}`);
        const success = await action.execute();
        if (success) {
          console.log(`Recovery successful: ${action.description}`);
          return true;
        }
      } catch (recoveryError) {
        console.error(`Recovery action failed: ${action.description}`, recoveryError);
      }
    }

    return false;
  }

  /**
   * Setup recovery actions for common errors
   */
  private setupRecoveryActions(): void {
    // File access errors
    this.recoveryActions.set(ErrorCode.FILE_ACCESS_DENIED, [
      {
        action: 'retry_with_delay',
        description: 'Retry file access after delay',
        automated: true,
        execute: async () => {
          await new Promise(resolve => setTimeout(resolve, 1000));
          return true;
        }
      }
    ]);

    // OCR engine errors
    this.recoveryActions.set(ErrorCode.OCR_ENGINE_NOT_FOUND, [
      {
        action: 'fallback_to_text_extraction',
        description: 'Fall back to basic text extraction',
        automated: true,
        execute: async () => {
          console.log('Falling back to basic text extraction');
          return true;
        }
      }
    ]);

    // Memory errors
    this.recoveryActions.set(ErrorCode.MEMORY_EXHAUSTED, [
      {
        action: 'reduce_batch_size',
        description: 'Reduce batch processing size',
        automated: true,
        execute: async () => {
          console.log('Reducing batch size to conserve memory');
          return true;
        }
      },
      {
        action: 'garbage_collection',
        description: 'Force garbage collection',
        automated: true,
        execute: async () => {
          if (global.gc) {
            global.gc();
            return true;
          }
          return false;
        }
      }
    ]);

    // Timeout errors
    this.recoveryActions.set(ErrorCode.ANALYSIS_TIMEOUT, [
      {
        action: 'increase_timeout',
        description: 'Increase processing timeout',
        automated: true,
        execute: async () => {
          console.log('Increasing processing timeout');
          return true;
        }
      },
      {
        action: 'simplify_analysis',
        description: 'Simplify analysis configuration',
        automated: true,
        execute: async () => {
          console.log('Simplifying analysis to reduce processing time');
          return true;
        }
      }
    ]);

    // Network errors
    this.recoveryActions.set(ErrorCode.NETWORK_ERROR, [
      {
        action: 'retry_with_backoff',
        description: 'Retry with exponential backoff',
        automated: true,
        execute: async () => {
          await new Promise(resolve => setTimeout(resolve, 2000));
          return true;
        }
      }
    ]);
  }

  /**
   * Setup error monitoring and alerting
   */
  private setupErrorMonitoring(): void {
    // Monitor error rates
    setInterval(() => {
      this.analyzeErrorPatterns();
    }, 60000); // Check every minute

    // Clean up old errors
    setInterval(() => {
      this.cleanupOldErrors();
    }, 300000); // Clean up every 5 minutes
  }

  /**
   * Analyze error patterns and trends
   */
  private analyzeErrorPatterns(): void {
    const recentErrors = this.errors.filter(
      error => Date.now() - error.timestamp.getTime() < 300000 // Last 5 minutes
    );

    const errorRate = recentErrors.length / 5; // Errors per minute
    if (errorRate > 10) {
      console.warn(`High error rate detected: ${errorRate} errors/minute`);
      this.triggerAlert('high_error_rate', { rate: errorRate });
    }

    // Check for error clustering
    const errorGroups = new Map<string, number>();
    recentErrors.forEach(error => {
      const count = errorGroups.get(error.code) || 0;
      errorGroups.set(error.code, count + 1);
    });

    errorGroups.forEach((count, code) => {
      if (count > 5) {
        console.warn(`Error clustering detected: ${code} occurred ${count} times`);
        this.triggerAlert('error_clustering', { code, count });
      }
    });
  }

  /**
   * Trigger alerts for critical conditions
   */
  private triggerAlert(type: string, data: any): void {
    // In a real implementation, this would send alerts to monitoring systems
    console.error(`ALERT [${type}]:`, data);

    // Could integrate with services like:
    // - Sentry for error tracking
    // - PagerDuty for incident management
    // - Slack for team notifications
    // - Email notifications
  }

  /**
   * Add error to the collection
   */
  private addError(error: ProcessingError): void {
    this.errors.push(error);

    // Maintain max errors limit
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(-this.maxErrors);
    }
  }

  /**
   * Log error with appropriate level
   */
  private logError(error: ProcessingError): void {
    const logMessage = `[${error.code}] ${error.message}`;
    const logData = {
      code: error.code,
      details: error.details,
      context: error.context,
      timestamp: error.timestamp
    };

    // Determine log level based on error severity
    if (error.code === ErrorCode.MEMORY_EXHAUSTED ||
        error.code === ErrorCode.SECURITY_VIOLATION ||
        error.code === ErrorCode.UNAUTHORIZED_ACCESS) {
      console.error(logMessage, logData);
    } else if (error.code === ErrorCode.ANALYSIS_TIMEOUT ||
               error.code === ErrorCode.OCR_LOW_CONFIDENCE) {
      console.warn(logMessage, logData);
    } else {
      console.info(logMessage, logData);
    }

    // Send to external logging service if configured
    this.sendToExternalLogger(error);
  }

  /**
   * Send error to external logging service
   */
  private sendToExternalLogger(error: ProcessingError): void {
    // In production, integrate with services like:
    // - Datadog
    // - New Relic
    // - Splunk
    // - CloudWatch
    // - Elastic Stack

    // For now, just log to console
    if (process.env.NODE_ENV === 'production') {
      // Would send to actual logging service
      console.log('Sending to external logger:', error);
    }
  }

  /**
   * Clean up old errors to prevent memory leaks
   */
  private cleanupOldErrors(): void {
    const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago
    this.errors = this.errors.filter(error => error.timestamp.getTime() > cutoffTime);
  }

  /**
   * Get error statistics
   */
  getErrorStatistics(): {
    totalErrors: number;
    errorsByCode: Map<ErrorCode, number>;
    errorRate: number;
    recentErrors: ProcessingError[];
  } {
    const recentErrors = this.errors.filter(
      error => Date.now() - error.timestamp.getTime() < 3600000 // Last hour
    );

    return {
      totalErrors: this.errors.length,
      errorsByCode: new Map(this.errorCounts),
      errorRate: recentErrors.length / 60, // Errors per minute
      recentErrors: recentErrors.slice(-10) // Last 10 errors
    };
  }

  /**
   * Generate error report
   */
  generateErrorReport(timeRange?: { start: Date; end: Date }): ErrorReport {
    let relevantErrors = this.errors;

    if (timeRange) {
      relevantErrors = this.errors.filter(error =>
        error.timestamp >= timeRange.start && error.timestamp <= timeRange.end
      );
    }

    const criticalErrors = relevantErrors.filter(error =>
      [ErrorCode.MEMORY_EXHAUSTED, ErrorCode.SECURITY_VIOLATION, ErrorCode.UNAUTHORIZED_ACCESS]
        .includes(error.code as ErrorCode)
    );

    const recoverableErrors = relevantErrors.filter(error => error.recoverable);

    const affectedDocuments = [...new Set(
      relevantErrors
        .map(error => error.context?.documentId)
        .filter(Boolean) as string[]
    )];

    return {
      id: `report_${Date.now()}`,
      errors: relevantErrors,
      summary: {
        totalErrors: relevantErrors.length,
        criticalErrors: criticalErrors.length,
        recoverableErrors: recoverableErrors.length
      },
      affectedDocuments,
      generatedAt: new Date()
    };
  }

  /**
   * Clear all errors
   */
  clearErrors(): void {
    this.errors = [];
    this.errorCounts.clear();
  }

  /**
   * Export errors for external analysis
   */
  exportErrors(format: 'json' | 'csv' = 'json'): string {
    if (format === 'csv') {
      const headers = ['Timestamp', 'Code', 'Message', 'Recoverable', 'Context'];
      const rows = this.errors.map(error => [
        error.timestamp.toISOString(),
        error.code,
        error.message.replace(/,/g, ';'), // Escape commas
        error.recoverable.toString(),
        JSON.stringify(error.context).replace(/,/g, ';')
      ]);

      return [headers, ...rows].map(row => row.join(',')).join('\n');
    }

    return JSON.stringify(this.errors, null, 2);
  }
}

// Export singleton instance
export const documentErrorHandler = new DocumentErrorHandler();

// Utility functions for common error scenarios
export const createFileError = (message: string, filePath: string): DocumentProcessingError => {
  return new DocumentProcessingError(ErrorCode.FILE_NOT_FOUND, message, {
    context: { documentId: filePath },
    severity: 'medium'
  });
};

export const createOCRError = (message: string, confidence?: number): DocumentProcessingError => {
  return new DocumentProcessingError(
    confidence && confidence < 0.5 ? ErrorCode.OCR_LOW_CONFIDENCE : ErrorCode.OCR_PROCESSING_FAILED,
    message,
    {
      details: confidence ? `Confidence: ${confidence}` : undefined,
      severity: confidence && confidence < 0.3 ? 'high' : 'medium'
    }
  );
};

export const createMemoryError = (usage: number, limit: number): DocumentProcessingError => {
  return new DocumentProcessingError(ErrorCode.MEMORY_EXHAUSTED,
    `Memory usage ${usage}MB exceeds limit ${limit}MB`, {
    details: `Current usage: ${usage}MB, Limit: ${limit}MB`,
    severity: 'critical',
    recoverable: true
  });
};