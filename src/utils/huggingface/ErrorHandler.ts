/**
 * Error Handler for HuggingFace Integration
 * Provides specialized error handling for HuggingFace API and model operations
 */

export enum HuggingFaceErrorType {
  API_ERROR = 'API_ERROR',
  MODEL_NOT_FOUND = 'MODEL_NOT_FOUND',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  RATE_LIMIT = 'RATE_LIMIT',
  NETWORK_ERROR = 'NETWORK_ERROR',
  MODEL_LOAD_ERROR = 'MODEL_LOAD_ERROR',
  INFERENCE_ERROR = 'INFERENCE_ERROR',
  COMPATIBILITY_ERROR = 'COMPATIBILITY_ERROR',
  STORAGE_ERROR = 'STORAGE_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR'
}

export interface HuggingFaceError extends Error {
  type: HuggingFaceErrorType;
  code?: string | number;
  details?: any;
  recoverable: boolean;
  retryAfter?: number;
  suggestions?: string[];
}

export interface ErrorContext {
  operation: string;
  modelId?: string;
  timestamp: Date;
  userAgent?: string;
  sessionId?: string;
}

export class HuggingFaceErrorHandler {
  private errorLog: Array<{ error: HuggingFaceError; context: ErrorContext }> = [];
  private maxLogSize = 1000;

  /**
   * Create a HuggingFace error
   */
  createError(
    type: HuggingFaceErrorType,
    message: string,
    options: {
      code?: string | number;
      details?: any;
      recoverable?: boolean;
      retryAfter?: number;
      suggestions?: string[];
      originalError?: Error;
    } = {}
  ): HuggingFaceError {
    const error = new Error(message) as HuggingFaceError;
    error.name = 'HuggingFaceError';
    error.type = type;

    if (options.code !== undefined) {
      error.code = options.code;
    }

    error.details = options.details;
    error.recoverable = options.recoverable ?? this.isRecoverableByDefault(type);

    if (options.retryAfter !== undefined) {
      error.retryAfter = options.retryAfter;
    }

    error.suggestions = options.suggestions ?? this.getDefaultSuggestions(type);

    // Preserve original stack trace if available
    if (options.originalError?.stack) {
      error.stack = options.originalError.stack;
    }

    return error;
  }

  /**
   * Handle API response errors
   */
  handleApiError(response: Response, context: ErrorContext): HuggingFaceError {
    let errorType = HuggingFaceErrorType.API_ERROR;
    let suggestions: string[] = [];

    switch (response.status) {
      case 401:
        errorType = HuggingFaceErrorType.AUTHENTICATION_ERROR;
        suggestions = [
          'Check your HuggingFace API token',
          'Ensure the token has proper permissions',
          'Verify the token is not expired'
        ];
        break;
      case 404:
        errorType = HuggingFaceErrorType.MODEL_NOT_FOUND;
        suggestions = [
          'Verify the model ID is correct',
          'Check if the model exists on HuggingFace Hub',
          'Ensure you have access to private models'
        ];
        break;
      case 429:
        errorType = HuggingFaceErrorType.RATE_LIMIT;
        const retryAfter = parseInt(response.headers.get('Retry-After') || '60');
        suggestions = [
          'Wait before making another request',
          'Consider upgrading your HuggingFace plan',
          'Implement exponential backoff'
        ];
        const error = this.createError(
          errorType,
          `Rate limit exceeded. Retry after ${retryAfter} seconds`,
          {
            code: response.status,
            retryAfter: retryAfter * 1000,
            recoverable: true,
            suggestions
          }
        );
        this.logError(error, context);
        return error;
      case 500:
      case 502:
      case 503:
        suggestions = [
          'Retry the request after a short delay',
          'Check HuggingFace status page',
          'Try a different model if available'
        ];
        break;
    }

    const error = this.createError(
      errorType,
      `API request failed: ${response.status} ${response.statusText}`,
      {
        code: response.status,
        recoverable: response.status >= 500 || response.status === 429,
        suggestions
      }
    );

    this.logError(error, context);
    return error;
  }

  /**
   * Handle network errors
   */
  handleNetworkError(originalError: Error, context: ErrorContext): HuggingFaceError {
    const error = this.createError(
      HuggingFaceErrorType.NETWORK_ERROR,
      `Network request failed: ${originalError.message}`,
      {
        originalError,
        recoverable: true,
        retryAfter: 5000,
        suggestions: [
          'Check your internet connection',
          'Verify firewall settings',
          'Try again in a few moments',
          'Check if HuggingFace Hub is accessible'
        ]
      }
    );

    this.logError(error, context);
    return error;
  }

  /**
   * Handle model loading errors
   */
  handleModelLoadError(
    modelId: string,
    originalError: Error,
    context: ErrorContext
  ): HuggingFaceError {
    let errorType = HuggingFaceErrorType.MODEL_LOAD_ERROR;
    let suggestions = [
      'Verify the model format is supported',
      'Check available memory and storage',
      'Try downloading the model manually'
    ];

    // Analyze error message for specific issues
    const errorMessage = originalError.message.toLowerCase();
    
    if (errorMessage.includes('memory') || errorMessage.includes('oom')) {
      suggestions = [
        'Free up system memory',
        'Try a smaller model variant',
        'Use model quantization',
        'Close other applications'
      ];
    } else if (errorMessage.includes('network') || errorMessage.includes('download')) {
      errorType = HuggingFaceErrorType.NETWORK_ERROR;
      suggestions = [
        'Check internet connection',
        'Retry the download',
        'Verify model repository access'
      ];
    } else if (errorMessage.includes('format') || errorMessage.includes('invalid')) {
      errorType = HuggingFaceErrorType.COMPATIBILITY_ERROR;
      suggestions = [
        'Check model format compatibility',
        'Try a different model version',
        'Verify system requirements'
      ];
    }

    const error = this.createError(
      errorType,
      `Failed to load model ${modelId}: ${originalError.message}`,
      {
        originalError,
        details: { modelId },
        recoverable: true,
        suggestions
      }
    );

    this.logError(error, context);
    return error;
  }

  /**
   * Handle inference errors
   */
  handleInferenceError(
    modelId: string,
    originalError: Error,
    context: ErrorContext
  ): HuggingFaceError {
    const suggestions = [
      'Check input format and data types',
      'Verify model is properly loaded',
      'Reduce input size if too large',
      'Check for memory issues'
    ];

    const error = this.createError(
      HuggingFaceErrorType.INFERENCE_ERROR,
      `Inference failed for model ${modelId}: ${originalError.message}`,
      {
        originalError,
        details: { modelId },
        recoverable: true,
        suggestions
      }
    );

    this.logError(error, context);
    return error;
  }

  /**
   * Handle validation errors
   */
  handleValidationError(
    field: string,
    value: any,
    reason: string,
    context: ErrorContext
  ): HuggingFaceError {
    const error = this.createError(
      HuggingFaceErrorType.VALIDATION_ERROR,
      `Validation failed for ${field}: ${reason}`,
      {
        details: { field, value, reason },
        recoverable: true,
        suggestions: [
          'Check input parameters',
          'Verify data format requirements',
          'Consult API documentation'
        ]
      }
    );

    this.logError(error, context);
    return error;
  }

  /**
   * Get error suggestions based on error pattern
   */
  getSuggestionsForError(error: HuggingFaceError): string[] {
    const baseSuggestions = error.suggestions || [];
    
    // Add context-specific suggestions based on error history
    const recentSimilarErrors = this.errorLog
      .filter(log => 
        log.error.type === error.type &&
        Date.now() - log.context.timestamp.getTime() < 300000 // Last 5 minutes
      )
      .slice(-3);

    if (recentSimilarErrors.length > 1) {
      baseSuggestions.push('Multiple similar errors detected - consider switching to a different approach');
    }

    return [...new Set(baseSuggestions)]; // Remove duplicates
  }

  /**
   * Check if error should trigger a retry
   */
  shouldRetry(error: HuggingFaceError, attemptNumber: number = 1): boolean {
    if (!error.recoverable) return false;
    if (attemptNumber > 3) return false;

    const noRetryTypes = [
      HuggingFaceErrorType.AUTHENTICATION_ERROR,
      HuggingFaceErrorType.MODEL_NOT_FOUND,
      HuggingFaceErrorType.VALIDATION_ERROR
    ];

    return !noRetryTypes.includes(error.type);
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  calculateRetryDelay(error: HuggingFaceError, attemptNumber: number): number {
    if (error.retryAfter) {
      return error.retryAfter;
    }

    // Exponential backoff: 1s, 2s, 4s, 8s...
    const baseDelay = 1000;
    const maxDelay = 30000;
    const delay = Math.min(baseDelay * Math.pow(2, attemptNumber - 1), maxDelay);
    
    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 0.1 * delay;
    return delay + jitter;
  }

  /**
   * Get error statistics
   */
  getErrorStats(): {
    totalErrors: number;
    errorsByType: Record<HuggingFaceErrorType, number>;
    mostCommonError: HuggingFaceErrorType | null;
    recoverableErrors: number;
    recentErrorRate: number;
  } {
    const now = Date.now();
    const oneHourAgo = now - 3600000;
    
    const recentErrors = this.errorLog.filter(log => 
      log.context.timestamp.getTime() > oneHourAgo
    );

    const errorsByType: Record<HuggingFaceErrorType, number> = {} as any;
    let recoverableErrors = 0;

    for (const { error } of this.errorLog) {
      errorsByType[error.type] = (errorsByType[error.type] || 0) + 1;
      if (error.recoverable) recoverableErrors++;
    }

    const mostCommonError = Object.entries(errorsByType)
      .sort(([, a], [, b]) => b - a)[0]?.[0] as HuggingFaceErrorType || null;

    return {
      totalErrors: this.errorLog.length,
      errorsByType,
      mostCommonError,
      recoverableErrors,
      recentErrorRate: recentErrors.length
    };
  }

  /**
   * Clear error log
   */
  clearErrorLog(): void {
    this.errorLog = [];
  }

  /**
   * Export error log
   */
  exportErrorLog(): string {
    return JSON.stringify({
      errors: this.errorLog.map(({ error, context }) => ({
        error: {
          name: error.name,
          type: error.type,
          message: error.message,
          code: error.code,
          recoverable: error.recoverable,
          suggestions: error.suggestions
        },
        context,
        timestamp: context.timestamp.toISOString()
      })),
      exported: new Date().toISOString()
    }, null, 2);
  }

  // Private methods

  private logError(error: HuggingFaceError, context: ErrorContext): void {
    this.errorLog.push({ error, context });
    
    // Maintain log size limit
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog = this.errorLog.slice(-this.maxLogSize);
    }
  }

  private isRecoverableByDefault(type: HuggingFaceErrorType): boolean {
    const nonRecoverableTypes = [
      HuggingFaceErrorType.AUTHENTICATION_ERROR,
      HuggingFaceErrorType.MODEL_NOT_FOUND,
      HuggingFaceErrorType.VALIDATION_ERROR
    ];
    
    return !nonRecoverableTypes.includes(type);
  }

  private getDefaultSuggestions(type: HuggingFaceErrorType): string[] {
    const suggestionMap: Record<HuggingFaceErrorType, string[]> = {
      [HuggingFaceErrorType.API_ERROR]: ['Check API endpoint', 'Verify request format'],
      [HuggingFaceErrorType.MODEL_NOT_FOUND]: ['Verify model ID', 'Check model availability'],
      [HuggingFaceErrorType.AUTHENTICATION_ERROR]: ['Check API credentials', 'Verify token permissions'],
      [HuggingFaceErrorType.RATE_LIMIT]: ['Wait before retry', 'Implement rate limiting'],
      [HuggingFaceErrorType.NETWORK_ERROR]: ['Check connection', 'Retry request'],
      [HuggingFaceErrorType.MODEL_LOAD_ERROR]: ['Check system resources', 'Verify model format'],
      [HuggingFaceErrorType.INFERENCE_ERROR]: ['Check input format', 'Verify model state'],
      [HuggingFaceErrorType.COMPATIBILITY_ERROR]: ['Check system requirements', 'Try different model'],
      [HuggingFaceErrorType.STORAGE_ERROR]: ['Check disk space', 'Verify permissions'],
      [HuggingFaceErrorType.VALIDATION_ERROR]: ['Check input parameters', 'Review documentation']
    };

    return suggestionMap[type] || ['Contact support'];
  }
}

export default HuggingFaceErrorHandler;
