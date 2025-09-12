/**
 * Comprehensive Error Handling and Validation System for HuggingFace Integration
 * Provides robust error handling, recovery strategies, and user-friendly error messages
 */

import { HuggingFaceError } from '../../types/huggingface';

export interface ErrorContext {
  operation: string;
  modelId?: string;
  userId?: string;
  timestamp: Date;
  userAgent?: string;
  sessionId?: string;
  stackTrace?: string;
  additionalData?: Record<string, any>;
}

export interface ErrorRecoveryStrategy {
  id: string;
  name: string;
  description: string;
  automated: boolean;
  estimatedTime: number; // minutes
  successRate: number; // 0-100
  riskLevel: 'low' | 'medium' | 'high';
  steps: string[];
  preconditions?: string[];
  fallbackStrategy?: string;
}

export interface ErrorReport {
  error: HuggingFaceError;
  context: ErrorContext;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'network' | 'authentication' | 'validation' | 'system' | 'user' | 'data';
  recoverable: boolean;
  recoveryStrategies: ErrorRecoveryStrategy[];
  userMessage: string;
  technicalMessage: string;
  documentationLinks: string[];
  relatedIssues: string[];
}

export interface ValidationRule<T = any> {
  field: keyof T;
  validator: (value: any) => boolean;
  message: string;
  severity: 'error' | 'warning' | 'info';
  code: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: Array<{
    field: string;
    message: string;
    code: string;
    severity: 'error' | 'warning' | 'info';
    value?: any;
  }>;
  warnings: Array<{
    field: string;
    message: string;
    code: string;
    value?: any;
  }>;
}

export class HuggingFaceErrorHandler {
  private errorHistory: ErrorReport[] = [];
  private recoveryStrategies: Map<string, ErrorRecoveryStrategy> = new Map();
  private validationRules: Map<string, ValidationRule[]> = new Map();
  private errorPatterns: Map<string, RegExp> = new Map();
  private fallbackHandlers: Map<string, Function> = new Map();

  constructor() {
    this.initializeRecoveryStrategies();
    this.initializeValidationRules();
    this.initializeErrorPatterns();
    this.initializeFallbackHandlers();
  }

  /**
   * Handle and process errors with comprehensive analysis
   */
  async handleError(
    error: Error | HuggingFaceError,
    context: Partial<ErrorContext> = {}
  ): Promise<ErrorReport> {
    const fullContext: ErrorContext = {
      operation: 'unknown',
      timestamp: new Date(),
      stackTrace: error.stack,
      ...context
    };

    // Convert to HuggingFaceError if needed
    const hfError: HuggingFaceError = this.normalizeError(error);

    // Analyze error
    const errorReport = await this.analyzeError(hfError, fullContext);

    // Store in history
    this.errorHistory.push(errorReport);

    // Attempt automatic recovery if applicable
    if (errorReport.recoverable) {
      await this.attemptRecovery(errorReport);
    }

    // Log error for monitoring
    this.logError(errorReport);

    return errorReport;
  }

  /**
   * Validate data against defined rules
   */
  validate<T>(data: T, ruleSetName: string): ValidationResult {
    const rules = this.validationRules.get(ruleSetName) || [];
    const errors: ValidationResult['errors'] = [];
    const warnings: ValidationResult['warnings'] = [];

    for (const rule of rules) {
      const value = (data as any)[rule.field];
      
      if (!rule.validator(value)) {
        const validationError = {
          field: rule.field as string,
          message: rule.message,
          code: rule.code,
          severity: rule.severity,
          value
        };

        if (rule.severity === 'error') {
          errors.push(validationError);
        } else if (rule.severity === 'warning') {
          warnings.push({
            field: rule.field as string,
            message: rule.message,
            code: rule.code,
            value
          });
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Get error statistics and trends
   */
  getErrorStatistics(timeRange?: { start: Date; end: Date }): {
    totalErrors: number;
    errorsByCategory: Record<string, number>;
    errorsBySeverity: Record<string, number>;
    recoverySuccessRate: number;
    commonErrors: Array<{ code: string; count: number; message: string }>;
    trends: Array<{ date: string; count: number }>;
  } {
    let relevantErrors = this.errorHistory;

    if (timeRange) {
      relevantErrors = this.errorHistory.filter(
        report => report.context.timestamp >= timeRange.start && 
                  report.context.timestamp <= timeRange.end
      );
    }

    const errorsByCategory: Record<string, number> = {};
    const errorsBySeverity: Record<string, number> = {};
    const errorCodes: Record<string, { count: number; message: string }> = {};

    for (const report of relevantErrors) {
      errorsByCategory[report.category] = (errorsByCategory[report.category] || 0) + 1;
      errorsBySeverity[report.severity] = (errorsBySeverity[report.severity] || 0) + 1;
      
      const code = report.error.code;
      if (!errorCodes[code]) {
        errorCodes[code] = { count: 0, message: report.error.message };
      }
      errorCodes[code].count++;
    }

    const commonErrors = Object.entries(errorCodes)
      .map(([code, data]) => ({ code, count: data.count, message: data.message }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Calculate recovery success rate
    const recoverableErrors = relevantErrors.filter(r => r.recoverable);
    const recoverySuccessRate = recoverableErrors.length > 0 ? 
      (recoverableErrors.filter(r => r.error.retryable).length / recoverableErrors.length) * 100 : 0;

    // Generate trends (daily error counts for the last 30 days)
    const trends = this.generateErrorTrends(relevantErrors);

    return {
      totalErrors: relevantErrors.length,
      errorsByCategory,
      errorsBySeverity,
      recoverySuccessRate,
      commonErrors,
      trends
    };
  }

  /**
   * Get recovery recommendations for specific error
   */
  getRecoveryRecommendations(errorCode: string): ErrorRecoveryStrategy[] {
    const strategies: ErrorRecoveryStrategy[] = [];

    // Get strategies for specific error codes
    switch (errorCode) {
      case 'NETWORK_ERROR':
        strategies.push(
          this.recoveryStrategies.get('retry_with_backoff')!,
          this.recoveryStrategies.get('check_connectivity')!,
          this.recoveryStrategies.get('use_proxy')!
        );
        break;
      
      case 'AUTHENTICATION_FAILED':
        strategies.push(
          this.recoveryStrategies.get('refresh_token')!,
          this.recoveryStrategies.get('re_authenticate')!
        );
        break;
      
      case 'INSUFFICIENT_MEMORY':
        strategies.push(
          this.recoveryStrategies.get('free_memory')!,
          this.recoveryStrategies.get('use_quantization')!,
          this.recoveryStrategies.get('use_streaming')!
        );
        break;
      
      case 'MODEL_NOT_FOUND':
        strategies.push(
          this.recoveryStrategies.get('verify_model_id')!,
          this.recoveryStrategies.get('search_alternatives')!,
          this.recoveryStrategies.get('check_permissions')!
        );
        break;
      
      default:
        // Generic recovery strategies
        strategies.push(
          this.recoveryStrategies.get('retry_operation')!,
          this.recoveryStrategies.get('clear_cache')!
        );
    }

    return strategies.filter(Boolean);
  }

  /**
   * Execute recovery strategy
   */
  async executeRecoveryStrategy(
    strategyId: string,
    errorContext: ErrorContext
  ): Promise<{
    success: boolean;
    message: string;
    nextStrategy?: string;
  }> {
    const strategy = this.recoveryStrategies.get(strategyId);
    if (!strategy) {
      return { success: false, message: `Strategy ${strategyId} not found` };
    }

    try {
      // Check preconditions
      if (strategy.preconditions) {
        for (const precondition of strategy.preconditions) {
          if (!await this.checkPrecondition(precondition, errorContext)) {
            return { 
              success: false, 
              message: `Precondition failed: ${precondition}`,
              nextStrategy: strategy.fallbackStrategy
            };
          }
        }
      }

      // Execute recovery steps
      const result = await this.executeRecoverySteps(strategy, errorContext);
      
      return {
        success: result.success,
        message: result.message,
        nextStrategy: result.success ? undefined : strategy.fallbackStrategy
      };

    } catch (error) {
      return {
        success: false,
        message: `Recovery failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        nextStrategy: strategy.fallbackStrategy
      };
    }
  }

  /**
   * Generate user-friendly error messages
   */
  generateUserMessage(error: HuggingFaceError, context: ErrorContext): string {
    const errorMessages: Record<string, string> = {
      'NETWORK_ERROR': 'Unable to connect to HuggingFace servers. Please check your internet connection and try again.',
      'AUTHENTICATION_FAILED': 'Authentication failed. Please check your HuggingFace token and permissions.',
      'MODEL_NOT_FOUND': 'The requested model could not be found. It may have been removed or made private.',
      'INSUFFICIENT_MEMORY': 'Not enough memory available to load this model. Consider closing other applications or using a smaller model.',
      'DOWNLOAD_FAILED': 'Failed to download the model. Please check your storage space and internet connection.',
      'COMPATIBILITY_ERROR': 'This model is not compatible with your current system configuration.',
      'QUOTA_EXCEEDED': 'You have exceeded your usage quota. Please try again later or upgrade your plan.',
      'RATE_LIMITED': 'Too many requests. Please wait a moment before trying again.',
      'VALIDATION_FAILED': 'The provided data is invalid. Please check your input and try again.',
      'GATED_MODEL': 'This model requires special access. Please request permission from the model author.',
      'UNSUPPORTED_FORMAT': 'This model format is not supported by your current setup.'
    };

    const baseMessage = errorMessages[error.code] || 'An unexpected error occurred. Please try again.';
    
    // Add context-specific information
    if (context.modelId) {
      return `${baseMessage} (Model: ${context.modelId})`;
    }
    
    return baseMessage;
  }

  /**
   * Clear error history
   */
  clearHistory(): void {
    this.errorHistory = [];
  }

  /**
   * Export error data for analysis
   */
  exportErrorData(format: 'json' | 'csv' = 'json'): string {
    if (format === 'json') {
      return JSON.stringify(this.errorHistory, null, 2);
    } else {
      const csvLines = [
        'Timestamp,Operation,Error Code,Severity,Category,Model ID,Message'
      ];
      
      for (const report of this.errorHistory) {
        csvLines.push([
          report.context.timestamp.toISOString(),
          report.context.operation,
          report.error.code,
          report.severity,
          report.category,
          report.context.modelId || '',
          `"${report.error.message.replace(/"/g, '""')}"`
        ].join(','));
      }
      
      return csvLines.join('\n');
    }
  }

  /**
   * Private helper methods
   */
  private normalizeError(error: Error | HuggingFaceError): HuggingFaceError {
    if ('code' in error && 'retryable' in error) {
      return error as HuggingFaceError;
    }

    // Convert standard Error to HuggingFaceError
    return {
      code: this.classifyError(error),
      message: error.message,
      retryable: this.isRetryable(error),
      suggestion: this.getSuggestion(error)
    };
  }

  private classifyError(error: Error): string {
    const message = error.message.toLowerCase();
    
    if (message.includes('network') || message.includes('connection')) {
      return 'NETWORK_ERROR';
    } else if (message.includes('auth') || message.includes('token')) {
      return 'AUTHENTICATION_FAILED';
    } else if (message.includes('memory') || message.includes('oom')) {
      return 'INSUFFICIENT_MEMORY';
    } else if (message.includes('not found') || message.includes('404')) {
      return 'MODEL_NOT_FOUND';
    } else if (message.includes('download')) {
      return 'DOWNLOAD_FAILED';
    } else if (message.includes('rate limit') || message.includes('too many')) {
      return 'RATE_LIMITED';
    } else if (message.includes('quota') || message.includes('limit exceeded')) {
      return 'QUOTA_EXCEEDED';
    } else if (message.includes('validation') || message.includes('invalid')) {
      return 'VALIDATION_FAILED';
    } else {
      return 'UNKNOWN_ERROR';
    }
  }

  private isRetryable(error: Error): boolean {
    const retryableCodes = [
      'NETWORK_ERROR',
      'RATE_LIMITED',
      'DOWNLOAD_FAILED',
      'UNKNOWN_ERROR'
    ];
    return retryableCodes.includes(this.classifyError(error));
  }

  private getSuggestion(error: Error): string {
    const code = this.classifyError(error);
    const suggestions: Record<string, string> = {
      'NETWORK_ERROR': 'Check your internet connection and try again',
      'AUTHENTICATION_FAILED': 'Verify your HuggingFace token is valid',
      'INSUFFICIENT_MEMORY': 'Close other applications or use a smaller model',
      'MODEL_NOT_FOUND': 'Verify the model ID is correct',
      'DOWNLOAD_FAILED': 'Check available storage space',
      'RATE_LIMITED': 'Wait a few minutes before retrying',
      'QUOTA_EXCEEDED': 'Upgrade your plan or wait for quota reset',
      'VALIDATION_FAILED': 'Check your input parameters'
    };
    return suggestions[code] || 'Contact support if the issue persists';
  }

  private async analyzeError(
    error: HuggingFaceError, 
    context: ErrorContext
  ): Promise<ErrorReport> {
    const severity = this.determineSeverity(error, context);
    const category = this.categorizeError(error);
    const recoveryStrategies = this.getRecoveryRecommendations(error.code);
    
    return {
      error,
      context,
      severity,
      category,
      recoverable: error.retryable || recoveryStrategies.length > 0,
      recoveryStrategies,
      userMessage: this.generateUserMessage(error, context),
      technicalMessage: `${error.code}: ${error.message}`,
      documentationLinks: this.getDocumentationLinks(error.code),
      relatedIssues: this.findRelatedIssues(error.code)
    };
  }

  private determineSeverity(error: HuggingFaceError, context: ErrorContext): 'low' | 'medium' | 'high' | 'critical' {
    const criticalErrors = ['INSUFFICIENT_MEMORY', 'AUTHENTICATION_FAILED'];
    const highErrors = ['MODEL_NOT_FOUND', 'DOWNLOAD_FAILED', 'COMPATIBILITY_ERROR'];
    const mediumErrors = ['NETWORK_ERROR', 'RATE_LIMITED', 'VALIDATION_FAILED'];
    
    if (criticalErrors.includes(error.code)) return 'critical';
    if (highErrors.includes(error.code)) return 'high';
    if (mediumErrors.includes(error.code)) return 'medium';
    return 'low';
  }

  private categorizeError(error: HuggingFaceError): 'network' | 'authentication' | 'validation' | 'system' | 'user' | 'data' {
    const categories: Record<string, ErrorReport['category']> = {
      'NETWORK_ERROR': 'network',
      'AUTHENTICATION_FAILED': 'authentication',
      'VALIDATION_FAILED': 'validation',
      'INSUFFICIENT_MEMORY': 'system',
      'MODEL_NOT_FOUND': 'user',
      'DOWNLOAD_FAILED': 'network',
      'RATE_LIMITED': 'network',
      'QUOTA_EXCEEDED': 'user',
      'COMPATIBILITY_ERROR': 'system',
      'GATED_MODEL': 'authentication',
      'UNSUPPORTED_FORMAT': 'data'
    };
    return categories[error.code] || 'system';
  }

  private async attemptRecovery(errorReport: ErrorReport): Promise<void> {
    const autoRecoveryStrategies = errorReport.recoveryStrategies.filter(s => s.automated);
    
    for (const strategy of autoRecoveryStrategies) {
      try {
        const result = await this.executeRecoveryStrategy(strategy.id, errorReport.context);
        if (result.success) {
          console.log(`Auto-recovery successful with strategy: ${strategy.name}`);
          break;
        }
      } catch (error) {
        console.warn(`Auto-recovery failed for strategy ${strategy.name}:`, error);
      }
    }
  }

  private logError(errorReport: ErrorReport): void {
    const logLevel = {
      low: 'info',
      medium: 'warn',
      high: 'error',
      critical: 'error'
    }[errorReport.severity];

    console[logLevel as 'info' | 'warn' | 'error']('HuggingFace Error:', {
      code: errorReport.error.code,
      message: errorReport.error.message,
      operation: errorReport.context.operation,
      modelId: errorReport.context.modelId,
      severity: errorReport.severity,
      recoverable: errorReport.recoverable
    });
  }

  private generateErrorTrends(errors: ErrorReport[]): Array<{ date: string; count: number }> {
    const trends: Record<string, number> = {};
    const now = new Date();
    
    // Initialize last 30 days
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      trends[dateStr] = 0;
    }
    
    // Count errors by date
    for (const error of errors) {
      const dateStr = error.context.timestamp.toISOString().split('T')[0];
      if (trends.hasOwnProperty(dateStr)) {
        trends[dateStr]++;
      }
    }
    
    return Object.entries(trends).map(([date, count]) => ({ date, count }));
  }

  private getDocumentationLinks(errorCode: string): string[] {
    const links: Record<string, string[]> = {
      'AUTHENTICATION_FAILED': [
        'https://huggingface.co/docs/hub/security-tokens',
        'https://huggingface.co/docs/transformers/installation'
      ],
      'MODEL_NOT_FOUND': [
        'https://huggingface.co/models',
        'https://huggingface.co/docs/hub/models-the-hub'
      ],
      'INSUFFICIENT_MEMORY': [
        'https://huggingface.co/docs/transformers/perf_infer_gpu_one',
        'https://huggingface.co/docs/transformers/main_classes/quantization'
      ]
    };
    return links[errorCode] || [];
  }

  private findRelatedIssues(errorCode: string): string[] {
    // In a real implementation, this would query a database of known issues
    return [];
  }

  private async checkPrecondition(precondition: string, context: ErrorContext): Promise<boolean> {
    // Implementation would check various system preconditions
    switch (precondition) {
      case 'network_available':
        return this.checkNetworkConnectivity();
      case 'storage_available':
        return this.checkStorageSpace();
      case 'memory_available':
        return this.checkMemoryAvailability();
      default:
        return true;
    }
  }

  private async executeRecoverySteps(
    strategy: ErrorRecoveryStrategy,
    context: ErrorContext
  ): Promise<{ success: boolean; message: string }> {
    // Implementation would execute the actual recovery steps
    console.log(`Executing recovery strategy: ${strategy.name}`);
    
    // Simulate recovery execution
    await new Promise(resolve => setTimeout(resolve, strategy.estimatedTime * 60 * 1000));
    
    // Simulate success rate
    const success = Math.random() < (strategy.successRate / 100);
    
    return {
      success,
      message: success ? `Recovery successful: ${strategy.name}` : `Recovery failed: ${strategy.name}`
    };
  }

  private async checkNetworkConnectivity(): Promise<boolean> {
    try {
      const response = await fetch('https://huggingface.co', { method: 'HEAD' });
      return response.ok;
    } catch {
      return false;
    }
  }

  private checkStorageSpace(): boolean {
    // Implementation would check actual storage space
    return true; // Placeholder
  }

  private checkMemoryAvailability(): boolean {
    // Implementation would check actual memory availability
    return true; // Placeholder
  }

  /**
   * Initialize recovery strategies
   */
  private initializeRecoveryStrategies(): void {
    const strategies: ErrorRecoveryStrategy[] = [
      {
        id: 'retry_with_backoff',
        name: 'Retry with Exponential Backoff',
        description: 'Retry the operation with increasing delays between attempts',
        automated: true,
        estimatedTime: 2,
        successRate: 85,
        riskLevel: 'low',
        steps: ['Wait 1 second', 'Retry operation', 'If failed, wait 2 seconds', 'Retry again', 'Continue with exponential backoff'],
        preconditions: ['network_available']
      },
      {
        id: 'refresh_token',
        name: 'Refresh Authentication Token',
        description: 'Refresh or regenerate the HuggingFace authentication token',
        automated: false,
        estimatedTime: 5,
        successRate: 90,
        riskLevel: 'low',
        steps: ['Go to HuggingFace settings', 'Generate new token', 'Update application configuration'],
        fallbackStrategy: 're_authenticate'
      },
      {
        id: 'free_memory',
        name: 'Free System Memory',
        description: 'Close unnecessary applications to free memory',
        automated: true,
        estimatedTime: 1,
        successRate: 70,
        riskLevel: 'medium',
        steps: ['Identify memory-intensive processes', 'Close non-essential applications', 'Clear system cache'],
        preconditions: ['memory_available']
      },
      {
        id: 'use_quantization',
        name: 'Enable Model Quantization',
        description: 'Use quantized version of the model to reduce memory usage',
        automated: true,
        estimatedTime: 3,
        successRate: 95,
        riskLevel: 'low',
        steps: ['Enable 8-bit quantization', 'Load quantized model', 'Verify functionality'],
        fallbackStrategy: 'use_streaming'
      }
    ];

    for (const strategy of strategies) {
      this.recoveryStrategies.set(strategy.id, strategy);
    }
  }

  /**
   * Initialize validation rules
   */
  private initializeValidationRules(): void {
    // Model validation rules
    const modelRules: ValidationRule[] = [
      {
        field: 'modelId',
        validator: (value) => typeof value === 'string' && value.length > 0,
        message: 'Model ID is required and must be a non-empty string',
        severity: 'error',
        code: 'MISSING_MODEL_ID'
      },
      {
        field: 'legalScore',
        validator: (value) => typeof value === 'number' && value >= 0 && value <= 100,
        message: 'Legal score must be a number between 0 and 100',
        severity: 'error',
        code: 'INVALID_LEGAL_SCORE'
      },
      {
        field: 'resourceRequirements',
        validator: (value) => value && typeof value === 'object',
        message: 'Resource requirements must be specified',
        severity: 'error',
        code: 'MISSING_RESOURCE_REQUIREMENTS'
      }
    ];

    this.validationRules.set('model', modelRules);
  }

  /**
   * Initialize error patterns for automatic classification
   */
  private initializeErrorPatterns(): void {
    const patterns = new Map<string, RegExp>([
      ['NETWORK_ERROR', /network|connection|timeout|refused/i],
      ['AUTHENTICATION_FAILED', /auth|token|unauthorized|forbidden/i],
      ['INSUFFICIENT_MEMORY', /memory|oom|out of memory/i],
      ['MODEL_NOT_FOUND', /not found|404|does not exist/i],
      ['RATE_LIMITED', /rate limit|too many requests|429/i],
      ['QUOTA_EXCEEDED', /quota|limit exceeded|over limit/i]
    ]);

    this.errorPatterns = patterns;
  }

  /**
   * Initialize fallback handlers
   */
  private initializeFallbackHandlers(): void {
    this.fallbackHandlers.set('network_error', async () => {
      // Fallback to cached data or offline mode
      console.log('Using fallback for network error');
    });

    this.fallbackHandlers.set('model_error', async () => {
      // Fallback to alternative model
      console.log('Using fallback model');
    });
  }
}

export default HuggingFaceErrorHandler;