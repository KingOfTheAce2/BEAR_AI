/**
 * BEAR AI Centralized Error Handling System
 * Based on Ollama's error handling patterns with enhanced features
 * 
 * @file Centralized error handling and reporting system
 * @version 2.0.0
 */

import { EventEmitter } from 'events';
import { Logger, LogLevel } from './logger';

// ==================== TYPES & INTERFACES ====================

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';
export type ErrorCategory = 
  | 'network' 
  | 'authentication' 
  | 'permission' 
  | 'validation' 
  | 'storage' 
  | 'memory' 
  | 'ai-inference' 
  | 'parsing' 
  | 'system' 
  | 'user-input' 
  | 'component' 
  | 'api' 
  | 'unknown';

export interface ErrorContext {
  userId?: string;
  sessionId?: string;
  component?: string;
  action?: string;
  route?: string;
  timestamp: Date;
  userAgent?: string;
  additionalData?: Record<string, any>;
}

export interface ProcessedError {
  id: string;
  originalError: Error;
  message: string;
  stack?: string;
  severity: ErrorSeverity;
  category: ErrorCategory;
  context: ErrorContext;
  userFriendlyMessage: string;
  actionable: boolean;
  recoverable: boolean;
  retryable: boolean;
  suggestions: string[];
  reportingData: ErrorReportingData;
}

export interface ErrorReportingData {
  fingerprint: string;
  aggregationKey: string;
  metadata: Record<string, any>;
  breadcrumbs: Breadcrumb[];
  performanceData?: PerformanceData;
}

export interface Breadcrumb {
  timestamp: Date;
  category: string;
  message: string;
  level: LogLevel;
  data?: Record<string, any>;
}

export interface PerformanceData {
  memoryUsage: number;
  loadTime: number;
  componentRenderTime?: number;
  networkLatency?: number;
}

export interface ErrorRecoveryStrategy {
  name: string;
  canRecover: (error: ProcessedError) => boolean;
  recover: (error: ProcessedError) => Promise<boolean>;
  priority: number;
}

export interface ErrorHandlerConfig {
  enableReporting: boolean;
  enableRecovery: boolean;
  maxBreadcrumbs: number;
  reportingEndpoint?: string;
  retryAttempts: number;
  debugMode: boolean;
  enablePerformanceTracking: boolean;
}

// ==================== ERROR HANDLER CLASS ====================

export class ErrorHandler extends EventEmitter {
  private logger: Logger;
  private config: ErrorHandlerConfig;
  private breadcrumbs: Breadcrumb[] = [];
  private recoveryStrategies: ErrorRecoveryStrategy[] = [];
  private errorCounts = new Map<string, number>();
  private retryAttempts = new Map<string, number>();
  private recentErrors = new Map<string, Date>();

  constructor(logger: Logger, config: Partial<ErrorHandlerConfig> = {}) {
    super();
    this.logger = logger;
    this.config = {
      enableReporting: true,
      enableRecovery: true,
      maxBreadcrumbs: 100,
      retryAttempts: 3,
      debugMode: false,
      enablePerformanceTracking: true,
      ...config
    };

    this.initializeDefaultRecoveryStrategies();
  }

  /**
   * Main error processing method
   */
  async handleError(
    error: Error, 
    context: Partial<ErrorContext> = {}
  ): Promise<ProcessedError> {
    const processedError = await this.processError(error, context);
    
    // Log the error
    this.logError(processedError);
    
    // Attempt recovery if enabled
    if (this.config.enableRecovery) {
      await this.attemptRecovery(processedError);
    }
    
    // Report error if enabled
    if (this.config.enableReporting) {
      await this.reportError(processedError);
    }
    
    // Emit error event for components to handle
    this.emit('error', processedError);
    
    return processedError;
  }

  /**
   * Add breadcrumb for error tracking
   */
  addBreadcrumb(breadcrumb: Omit<Breadcrumb, 'timestamp'>): void {
    const fullBreadcrumb: Breadcrumb = {
      ...breadcrumb,
      timestamp: new Date()
    };

    this.breadcrumbs.push(fullBreadcrumb);
    
    if (this.breadcrumbs.length > this.config.maxBreadcrumbs) {
      this.breadcrumbs.shift();
    }
  }

  /**
   * Register custom recovery strategy
   */
  registerRecoveryStrategy(strategy: ErrorRecoveryStrategy): void {
    this.recoveryStrategies.push(strategy);
    this.recoveryStrategies.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Get error statistics
   */
  getErrorStatistics(): {
    totalErrors: number;
    errorsByCategory: Record<ErrorCategory, number>;
    errorsBySeverity: Record<ErrorSeverity, number>;
    frequentErrors: Array<{ fingerprint: string; count: number; lastOccurred: Date }>;
  } {
    const errorsByCategory = {} as Record<ErrorCategory, number>;
    const errorsBySeverity = {} as Record<ErrorSeverity, number>;
    
    // Initialize counts
    (['network', 'authentication', 'permission', 'validation', 'storage', 'memory', 
      'ai-inference', 'parsing', 'system', 'user-input', 'component', 'api', 'unknown'] as ErrorCategory[])
      .forEach(cat => errorsByCategory[cat] = 0);
    
    (['low', 'medium', 'high', 'critical'] as ErrorSeverity[])
      .forEach(sev => errorsBySeverity[sev] = 0);

    const frequentErrors = Array.from(this.errorCounts.entries())
      .map(([fingerprint, count]) => ({
        fingerprint,
        count,
        lastOccurred: this.recentErrors.get(fingerprint) || new Date()
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalErrors: Array.from(this.errorCounts.values()).reduce((sum, count) => sum + count, 0),
      errorsByCategory,
      errorsBySeverity,
      frequentErrors
    };
  }

  // ==================== PRIVATE METHODS ====================

  private async processError(
    error: Error, 
    context: Partial<ErrorContext>
  ): Promise<ProcessedError> {
    const fullContext: ErrorContext = {
      timestamp: new Date(),
      userAgent: typeof window !== 'undefined' ? navigator.userAgent : 'Server',
      ...context
    };

    const category = this.categorizeError(error);
    const severity = this.determineSeverity(error, category);
    const userFriendlyMessage = this.generateUserFriendlyMessage(error, category);
    const suggestions = this.generateSuggestions(error, category);
    
    const processedError: ProcessedError = {
      id: this.generateErrorId(),
      originalError: error,
      message: error.message,
      stack: error.stack,
      severity,
      category,
      context: fullContext,
      userFriendlyMessage,
      actionable: this.isActionable(error, category),
      recoverable: this.isRecoverable(error, category),
      retryable: this.isRetryable(error, category),
      suggestions,
      reportingData: await this.generateReportingData(error, fullContext)
    };

    // Track error frequency
    const fingerprint = processedError.reportingData.fingerprint;
    this.errorCounts.set(fingerprint, (this.errorCounts.get(fingerprint) || 0) + 1);
    this.recentErrors.set(fingerprint, new Date());

    return processedError;
  }

  private categorizeError(error: Error): ErrorCategory {
    const message = error.message.toLowerCase();
    const stack = error.stack?.toLowerCase() || '';

    // Network errors
    if (message.includes('fetch') || message.includes('network') || 
        message.includes('connection') || message.includes('timeout')) {
      return 'network';
    }

    // Authentication errors
    if (message.includes('unauthorized') || message.includes('authentication') ||
        message.includes('login') || stack.includes('auth')) {
      return 'authentication';
    }

    // Permission errors
    if (message.includes('permission') || message.includes('forbidden') ||
        message.includes('access denied')) {
      return 'permission';
    }

    // Validation errors
    if (message.includes('validation') || message.includes('invalid') ||
        message.includes('required') || error.name === 'ValidationError') {
      return 'validation';
    }

    // Storage errors
    if (message.includes('storage') || message.includes('database') ||
        message.includes('save') || message.includes('persist')) {
      return 'storage';
    }

    // Memory errors
    if (message.includes('memory') || message.includes('heap') ||
        message.includes('allocation')) {
      return 'memory';
    }

    // AI/ML inference errors
    if (message.includes('model') || message.includes('inference') ||
        message.includes('ai') || message.includes('llm')) {
      return 'ai-inference';
    }

    // Parsing errors
    if (message.includes('parse') || message.includes('json') ||
        message.includes('syntax') || error.name === 'SyntaxError') {
      return 'parsing';
    }

    // Component errors
    if (stack.includes('react') || stack.includes('component') ||
        message.includes('render')) {
      return 'component';
    }

    // API errors
    if (message.includes('api') || message.includes('endpoint') ||
        message.includes('http')) {
      return 'api';
    }

    // System errors
    if (message.includes('system') || error.name === 'SystemError') {
      return 'system';
    }

    return 'unknown';
  }

  private determineSeverity(error: Error, category: ErrorCategory): ErrorSeverity {
    // Critical errors that break core functionality
    if (category === 'memory' || category === 'system' ||
        error.message.includes('out of memory') ||
        error.message.includes('critical')) {
      return 'critical';
    }

    // High severity errors that significantly impact user experience
    if (category === 'authentication' || category === 'ai-inference' ||
        error.message.includes('failed to load') ||
        error.message.includes('connection failed')) {
      return 'high';
    }

    // Medium severity errors that impact functionality but have workarounds
    if (category === 'network' || category === 'storage' ||
        category === 'api' || category === 'permission') {
      return 'medium';
    }

    // Low severity errors that are recoverable or minor
    return 'low';
  }

  private generateUserFriendlyMessage(error: Error, category: ErrorCategory): string {
    const messages: Record<ErrorCategory, string> = {
      network: 'Unable to connect to the server. Please check your internet connection and try again.',
      authentication: 'Your session has expired. Please log in again to continue.',
      permission: 'You don\'t have permission to perform this action. Please contact your administrator.',
      validation: 'Please check your input and try again.',
      storage: 'Unable to save your data. Please try again in a moment.',
      memory: 'The application is running low on memory. Some features may be temporarily unavailable.',
      'ai-inference': 'The AI service is temporarily unavailable. Please try again in a moment.',
      parsing: 'There was an error processing your data. Please check the format and try again.',
      system: 'A system error occurred. Our team has been notified and is working on a fix.',
      'user-input': 'Please check your input and try again.',
      component: 'A display error occurred. Please refresh the page.',
      api: 'The service is temporarily unavailable. Please try again later.',
      unknown: 'An unexpected error occurred. Please try again or contact support if the problem persists.'
    };

    return messages[category] || messages.unknown;
  }

  private generateSuggestions(error: Error, category: ErrorCategory): string[] {
    const suggestions: Record<ErrorCategory, string[]> = {
      network: [
        'Check your internet connection',
        'Try refreshing the page',
        'Wait a moment and retry',
        'Contact support if the problem persists'
      ],
      authentication: [
        'Log out and log back in',
        'Clear your browser cache',
        'Check if your account is still active'
      ],
      permission: [
        'Contact your administrator for access',
        'Verify your user role and permissions',
        'Try accessing from a different account'
      ],
      validation: [
        'Check all required fields are filled',
        'Verify data format matches requirements',
        'Remove any special characters if not allowed'
      ],
      storage: [
        'Try again in a few moments',
        'Check available storage space',
        'Contact support if the issue persists'
      ],
      memory: [
        'Close other browser tabs',
        'Restart the application',
        'Clear browser cache',
        'Use a device with more memory'
      ],
      'ai-inference': [
        'Try a simpler query',
        'Wait a moment and retry',
        'Check if the AI service is available',
        'Contact support for assistance'
      ],
      parsing: [
        'Check file format is supported',
        'Verify data structure',
        'Try uploading a different file'
      ],
      system: [
        'Refresh the page',
        'Try again later',
        'Contact support if the issue persists'
      ],
      'user-input': [
        'Review your input for errors',
        'Follow the required format',
        'Try entering the information differently'
      ],
      component: [
        'Refresh the page',
        'Clear browser cache',
        'Try using a different browser'
      ],
      api: [
        'Wait a moment and retry',
        'Check service status',
        'Contact support if the issue continues'
      ],
      unknown: [
        'Try refreshing the page',
        'Clear browser cache and cookies',
        'Try again later',
        'Contact support with error details'
      ]
    };

    return suggestions[category] || suggestions.unknown;
  }

  private isActionable(error: Error, category: ErrorCategory): boolean {
    return ['validation', 'user-input', 'authentication', 'permission'].includes(category);
  }

  private isRecoverable(error: Error, category: ErrorCategory): boolean {
    return !['memory', 'system'].includes(category);
  }

  private isRetryable(error: Error, category: ErrorCategory): boolean {
    return ['network', 'api', 'ai-inference', 'storage'].includes(category);
  }

  private async generateReportingData(
    error: Error, 
    context: ErrorContext
  ): Promise<ErrorReportingData> {
    const fingerprint = this.generateFingerprint(error);
    const aggregationKey = this.generateAggregationKey(error, context);
    
    const reportingData: ErrorReportingData = {
      fingerprint,
      aggregationKey,
      metadata: {
        url: typeof window !== 'undefined' ? window.location.href : 'N/A',
        userAgent: context.userAgent,
        timestamp: context.timestamp.toISOString(),
        component: context.component,
        action: context.action,
        route: context.route,
        ...context.additionalData
      },
      breadcrumbs: [...this.breadcrumbs]
    };

    if (this.config.enablePerformanceTracking) {
      reportingData.performanceData = await this.collectPerformanceData();
    }

    return reportingData;
  }

  private generateFingerprint(error: Error): string {
    const key = `${error.name}_${error.message}_${this.getStackSummary(error.stack)}`;
    return this.hashString(key);
  }

  private generateAggregationKey(error: Error, context: ErrorContext): string {
    const key = `${error.name}_${context.component}_${context.action}`;
    return this.hashString(key);
  }

  private getStackSummary(stack?: string): string {
    if (!stack) return '';
    const lines = stack.split('\n').slice(1, 4); // First few stack frames
    return lines.join('|');
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private logError(error: ProcessedError): void {
    const logData = {
      errorId: error.id,
      message: error.message,
      category: error.category,
      severity: error.severity,
      context: error.context,
      fingerprint: error.reportingData.fingerprint
    };

    switch (error.severity) {
      case 'critical':
        this.logger.error('Critical error occurred', logData);
        break;
      case 'high':
        this.logger.error('High severity error', logData);
        break;
      case 'medium':
        this.logger.warn('Medium severity error', logData);
        break;
      case 'low':
        this.logger.info('Low severity error', logData);
        break;
    }
  }

  private async attemptRecovery(error: ProcessedError): Promise<boolean> {
    for (const strategy of this.recoveryStrategies) {
      if (strategy.canRecover(error)) {
        try {
          const recovered = await strategy.recover(error);
          if (recovered) {
            this.logger.info(`Error recovered using strategy: ${strategy.name}`, {
              errorId: error.id,
              strategy: strategy.name
            });
            this.emit('errorRecovered', { error, strategy: strategy.name });
            return true;
          }
        } catch (recoveryError) {
          this.logger.warn(`Recovery strategy failed: ${strategy.name}`, {
            errorId: error.id,
            strategy: strategy.name,
            recoveryError: recoveryError instanceof Error ? recoveryError.message : 'Unknown'
          });
        }
      }
    }

    return false;
  }

  private async reportError(error: ProcessedError): Promise<void> {
    try {
      // In a real implementation, this would send to an error tracking service
      if (this.config.debugMode) {
        // Error report logging disabled
        // Error logging disabled for production
        // Logging disabled for production
        // Logging disabled for production
        // Error report end
      }

      // Emit event for external error reporting services
      this.emit('errorReported', error);
    } catch (reportingError) {
      this.logger.error('Failed to report error', {
        originalErrorId: error.id,
        reportingError: reportingError instanceof Error ? reportingError.message : 'Unknown'
      });
    }
  }

  private async collectPerformanceData(): Promise<PerformanceData> {
    const performanceData: PerformanceData = {
      memoryUsage: 0,
      loadTime: 0
    };

    if (typeof window !== 'undefined') {
      // Memory usage
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        performanceData.memoryUsage = memory.usedJSHeapSize;
      }

      // Load time
      if (performance.timing) {
        performanceData.loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
      }

      // Network latency (approximation)
      if (performance.timing) {
        performanceData.networkLatency = performance.timing.responseEnd - performance.timing.requestStart;
      }
    }

    return performanceData;
  }

  private initializeDefaultRecoveryStrategies(): void {
    // Network retry strategy
    this.registerRecoveryStrategy({
      name: 'network-retry',
      priority: 1,
      canRecover: (error) => error.category === 'network' && error.retryable,
      recover: async (error) => {
        const retryKey = error.reportingData.fingerprint;
        const attempts = this.retryAttempts.get(retryKey) || 0;
        
        if (attempts >= this.config.retryAttempts) {
          return false;
        }

        this.retryAttempts.set(retryKey, attempts + 1);
        
        // Exponential backoff
        const delay = Math.min(1000 * Math.pow(2, attempts), 10000);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        return true; // Signal that retry is possible
      }
    });

    // Cache clear strategy
    this.registerRecoveryStrategy({
      name: 'cache-clear',
      priority: 2,
      canRecover: (error) => ['parsing', 'component'].includes(error.category),
      recover: async () => {
        try {
          if (typeof window !== 'undefined' && 'caches' in window) {
            const cacheNames = await caches.keys();
            await Promise.all(cacheNames.map(name => caches.delete(name)));
          }
          return true;
        } catch {
          return false;
        }
      }
    });

    // Local storage clear strategy
    this.registerRecoveryStrategy({
      name: 'storage-clear',
      priority: 3,
      canRecover: (error) => error.category === 'storage',
      recover: async () => {
        try {
          if (typeof window !== 'undefined') {
            localStorage.clear();
            sessionStorage.clear();
          }
          return true;
        } catch {
          return false;
        }
      }
    });
  }
}

// ==================== EXPORTS ====================

export default ErrorHandler;

// Global error handler instance
let globalErrorHandler: ErrorHandler | null = null;

export const createErrorHandler = (logger: Logger, config?: Partial<ErrorHandlerConfig>): ErrorHandler => {
  return new ErrorHandler(logger, config);
};

export const setGlobalErrorHandler = (handler: ErrorHandler): void => {
  globalErrorHandler = handler;
};

export const getGlobalErrorHandler = (): ErrorHandler | null => {
  return globalErrorHandler;
};

// Utility function for quick error handling
export const handleError = async (
  error: Error, 
  context?: Partial<ErrorContext>
): Promise<ProcessedError | null> => {
  if (globalErrorHandler) {
    return await globalErrorHandler.handleError(error, context);
  }
  
  // Error logging disabled for production
  return null;
};