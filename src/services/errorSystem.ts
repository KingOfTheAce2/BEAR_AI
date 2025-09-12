/**
 * BEAR AI Integrated Error Handling System
 * Central initialization and coordination of all error handling components
 * 
 * @file Complete error handling system integration
 * @version 2.0.0
 */

import { ErrorHandler, ErrorHandlerConfig, createErrorHandler, setGlobalErrorHandler } from './errorHandler';
import { Logger, LoggerConfig, createLogger, setGlobalLogger } from './logger';
import { ErrorAnalyticsService, ErrorAnalyticsConfig, createErrorAnalytics, setGlobalErrorAnalytics } from './errorAnalytics';
import { APIErrorMiddleware, APIMiddlewareConfig } from './apiErrorMiddleware';
import { gracefulDegradationManager } from '../integrations/graceful-degradation';

// ==================== SYSTEM CONFIGURATION ====================

export interface ErrorSystemConfig {
  logger: Partial<LoggerConfig>;
  errorHandler: Partial<ErrorHandlerConfig>;
  analytics: Partial<ErrorAnalyticsConfig>;
  apiMiddleware: Partial<APIMiddlewareConfig>;
  enableGlobalHandlers: boolean;
  enableUnhandledRejectionCapture: boolean;
  enableWindowErrorCapture: boolean;
  enableDegradationIntegration: boolean;
}

export interface ErrorSystemComponents {
  logger: Logger;
  errorHandler: ErrorHandler;
  analytics: ErrorAnalyticsService;
  apiMiddleware: APIErrorMiddleware;
}

// ==================== SYSTEM INITIALIZATION ====================

export class ErrorSystem {
  private components: ErrorSystemComponents;
  private config: ErrorSystemConfig;
  private initialized = false;

  constructor(config: Partial<ErrorSystemConfig> = {}) {
    this.config = {
      logger: {
        level: 'info',
        enableConsole: true,
        enableFile: false,
        enableStructured: true
      },
      errorHandler: {
        enableReporting: true,
        enableRecovery: true,
        debugMode: process.env.NODE_ENV === 'development'
      },
      analytics: {
        enableRealTimeTracking: true,
        enableAlerts: true,
        enableTrends: true,
        retentionDays: 30
      },
      apiMiddleware: {
        retry: {
          maxAttempts: 3,
          baseDelay: 1000,
          maxDelay: 10000,
          backoffFactor: 2,
          retryCondition: () => true
        },
        enableMetrics: true,
        enableLogging: true,
        timeout: 30000
      },
      enableGlobalHandlers: true,
      enableUnhandledRejectionCapture: true,
      enableWindowErrorCapture: true,
      enableDegradationIntegration: true,
      ...config
    };

    this.components = this.initializeComponents();
  }

  /**
   * Initialize all error handling components
   */
  private initializeComponents(): ErrorSystemComponents {
    // Create logger first (needed by other components)
    const logger = createLogger(this.config.logger);

    // Create error handler
    const errorHandler = createErrorHandler(logger, this.config.errorHandler);

    // Create analytics service
    const analytics = createErrorAnalytics(logger, this.config.analytics);

    // Create API middleware
    const apiMiddleware = new APIErrorMiddleware(errorHandler, logger, this.config.apiMiddleware);

    // Wire up analytics to error handler
    errorHandler.on('error', (processedError) => {
      analytics.trackError(processedError);
    });

    errorHandler.on('errorRecovered', ({ error, strategy }) => {
      analytics.markResolved(error.id, 'auto');
      logger.info('Error auto-recovered', { errorId: error.id, strategy });
    });

    return {
      logger,
      errorHandler,
      analytics,
      apiMiddleware
    };
  }

  /**
   * Initialize the complete error handling system
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      throw new Error('Error system already initialized');
    }

    const { logger, errorHandler, analytics } = this.components;

    try {
      // Set global instances if enabled
      if (this.config.enableGlobalHandlers) {
        setGlobalLogger(logger);
        setGlobalErrorHandler(errorHandler);
        setGlobalErrorAnalytics(analytics);
      }

      // Set up global error capturing
      if (this.config.enableUnhandledRejectionCapture) {
        this.setupUnhandledRejectionCapture();
      }

      if (this.config.enableWindowErrorCapture && typeof window !== 'undefined') {
        this.setupWindowErrorCapture();
      }

      // Integrate with graceful degradation if enabled
      if (this.config.enableDegradationIntegration) {
        this.setupDegradationIntegration();
      }

      // Initialize component-specific setups
      await this.initializeComponentIntegrations();

      this.initialized = true;

      logger.info('Error handling system initialized successfully', {
        components: Object.keys(this.components),
        globalHandlers: this.config.enableGlobalHandlers,
        unhandledRejectionCapture: this.config.enableUnhandledRejectionCapture,
        windowErrorCapture: this.config.enableWindowErrorCapture
      });

    } catch (error) {
      logger.error('Failed to initialize error handling system', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Get system components
   */
  getComponents(): ErrorSystemComponents {
    return this.components;
  }

  /**
   * Get system health status
   */
  async getHealthStatus(): Promise<{
    healthy: boolean;
    components: Record<string, { status: string; metrics?: any }>;
    summary: {
      totalErrors: number;
      errorRate: number;
      criticalErrors: number;
      systemLoad: string;
    };
  }> {
    const { analytics, apiMiddleware, logger } = this.components;

    try {
      const metrics = await analytics.getMetrics();
      const apiMetrics = apiMiddleware.getMetrics();
      const alerts = analytics.getActiveAlerts();

      const criticalErrors = metrics.errorsBySeverity.critical || 0;
      const errorRate = metrics.errorRate;
      const systemLoad = this.determineSystemLoad(metrics, alerts.length);

      const healthy = criticalErrors === 0 && errorRate < 5 && alerts.length < 3;

      return {
        healthy,
        components: {
          logger: { status: 'operational' },
          errorHandler: { status: 'operational' },
          analytics: { 
            status: 'operational', 
            metrics: {
              totalErrors: metrics.totalErrors,
              errorRate: metrics.errorRate,
              alerts: alerts.length
            }
          },
          apiMiddleware: { 
            status: 'operational',
            metrics: {
              totalRequests: apiMetrics.summary.totalRequests,
              successRate: apiMetrics.summary.successRate,
              averageResponseTime: apiMetrics.summary.averageResponseTime
            }
          }
        },
        summary: {
          totalErrors: metrics.totalErrors,
          errorRate: metrics.errorRate,
          criticalErrors,
          systemLoad
        }
      };

    } catch (error) {
      logger.error('Failed to get health status', {
        error: error instanceof Error ? error.message : String(error)
      });

      return {
        healthy: false,
        components: {
          logger: { status: 'unknown' },
          errorHandler: { status: 'unknown' },
          analytics: { status: 'unknown' },
          apiMiddleware: { status: 'unknown' }
        },
        summary: {
          totalErrors: 0,
          errorRate: 0,
          criticalErrors: 0,
          systemLoad: 'unknown'
        }
      };
    }
  }

  /**
   * Generate comprehensive system report
   */
  async generateSystemReport(): Promise<{
    timestamp: Date;
    systemHealth: any;
    errorMetrics: any;
    apiMetrics: any;
    alerts: any[];
    recommendations: string[];
  }> {
    const { analytics, apiMiddleware } = this.components;

    const healthStatus = await this.getHealthStatus();
    const errorMetrics = await analytics.getMetrics();
    const apiMetrics = apiMiddleware.getMetrics();
    const alerts = analytics.getActiveAlerts();

    const recommendations = this.generateSystemRecommendations(healthStatus, errorMetrics, alerts);

    return {
      timestamp: new Date(),
      systemHealth: healthStatus,
      errorMetrics,
      apiMetrics,
      alerts,
      recommendations
    };
  }

  /**
   * Shutdown the error handling system
   */
  async shutdown(): Promise<void> {
    if (!this.initialized) return;

    const { logger, analytics } = this.components;

    try {
      // Flush any pending logs and analytics
      await logger.flush();
      
      // Close logger
      await logger.close();

      logger.info('Error handling system shut down successfully');
    } catch (error) {
      console.error('Error during system shutdown:', error);
    } finally {
      this.initialized = false;
    }
  }

  // ==================== PRIVATE METHODS ====================

  private setupUnhandledRejectionCapture(): void {
    const { errorHandler, logger } = this.components;

    if (typeof process !== 'undefined') {
      // Node.js environment
      process.on('unhandledRejection', (reason, promise) => {
        const error = reason instanceof Error ? reason : new Error(String(reason));
        errorHandler.handleError(error, {
          component: 'UnhandledRejection',
          action: 'promise-rejection',
          additionalData: { promise: promise.toString() }
        });
      });

      process.on('uncaughtException', (error) => {
        errorHandler.handleError(error, {
          component: 'UncaughtException',
          action: 'uncaught-exception'
        });
        
        // In production, you might want to exit the process
        if (process.env.NODE_ENV === 'production') {
          setTimeout(() => process.exit(1), 1000);
        }
      });
    }

    if (typeof window !== 'undefined') {
      // Browser environment
      window.addEventListener('unhandledrejection', (event) => {
        const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
        errorHandler.handleError(error, {
          component: 'UnhandledRejection',
          action: 'promise-rejection',
          additionalData: { url: window.location.href }
        });
      });
    }

    logger.info('Unhandled rejection capture enabled');
  }

  private setupWindowErrorCapture(): void {
    const { errorHandler, logger } = this.components;

    window.addEventListener('error', (event) => {
      const error = event.error || new Error(event.message);
      errorHandler.handleError(error, {
        component: 'WindowError',
        action: 'javascript-error',
        additionalData: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          url: window.location.href
        }
      });
    });

    // Capture React errors that might not be caught by error boundaries
    const originalConsoleError = console.error;
    console.error = (...args) => {
      const message = args.join(' ');
      if (message.includes('Error:') || message.includes('Warning:')) {
        const error = new Error(message);
        errorHandler.handleError(error, {
          component: 'ConsoleError',
          action: 'console-error'
        });
      }
      originalConsoleError.apply(console, args);
    };

    logger.info('Window error capture enabled');
  }

  private setupDegradationIntegration(): void {
    const { errorHandler, logger } = this.components;

    // Listen to graceful degradation events
    gracefulDegradationManager.on('degradationLevelChanged', (event) => {
      logger.warn('System degradation level changed', {
        from: event.from,
        to: event.to,
        restrictions: event.restrictions.length
      });

      // Track as a system event
      errorHandler.addBreadcrumb({
        category: 'system',
        message: `Degradation level changed from ${event.from} to ${event.to}`,
        level: 'warn',
        data: event
      });
    });

    gracefulDegradationManager.on('featureDisabled', (event) => {
      logger.warn('Feature disabled due to degradation', {
        feature: event.feature,
        reason: event.reason
      });
    });

    logger.info('Graceful degradation integration enabled');
  }

  private async initializeComponentIntegrations(): Promise<void> {
    // Set up cross-component integrations here
    // For example, analytics alerting based on API metrics, etc.
  }

  private determineSystemLoad(metrics: any, alertCount: number): string {
    const errorRate = metrics.errorRate;
    const criticalErrors = metrics.errorsBySeverity.critical || 0;

    if (criticalErrors > 0 || errorRate > 10 || alertCount > 5) {
      return 'high';
    } else if (errorRate > 5 || alertCount > 2) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  private generateSystemRecommendations(
    healthStatus: any,
    errorMetrics: any,
    alerts: any[]
  ): string[] {
    const recommendations: string[] = [];

    if (!healthStatus.healthy) {
      recommendations.push('System health check failed - investigate critical issues immediately');
    }

    if (errorMetrics.errorRate > 10) {
      recommendations.push('High error rate detected - implement additional error prevention measures');
    }

    if (errorMetrics.errorsBySeverity.critical > 0) {
      recommendations.push('Critical errors present - prioritize resolution of critical issues');
    }

    if (alerts.length > 3) {
      recommendations.push('Multiple active alerts - review alert configuration and resolve underlying issues');
    }

    if (errorMetrics.resolutionStats.averageResolutionTime > 300000) {
      recommendations.push('Long error resolution times - improve error recovery mechanisms');
    }

    if (recommendations.length === 0) {
      recommendations.push('System is operating normally - continue monitoring');
    }

    return recommendations;
  }
}

// ==================== EXPORTS ====================

export default ErrorSystem;

// Global system instance
let globalErrorSystem: ErrorSystem | null = null;

/**
 * Initialize the global error handling system
 */
export const initializeErrorSystem = async (config?: Partial<ErrorSystemConfig>): Promise<ErrorSystem> => {
  if (globalErrorSystem) {
    throw new Error('Error system already initialized globally');
  }

  globalErrorSystem = new ErrorSystem(config);
  await globalErrorSystem.initialize();
  
  return globalErrorSystem;
};

/**
 * Get the global error system instance
 */
export const getGlobalErrorSystem = (): ErrorSystem | null => {
  return globalErrorSystem;
};

/**
 * Shutdown the global error system
 */
export const shutdownErrorSystem = async (): Promise<void> => {
  if (globalErrorSystem) {
    await globalErrorSystem.shutdown();
    globalErrorSystem = null;
  }
};

// Convenience function for quick setup
export const setupErrorHandling = async (config?: Partial<ErrorSystemConfig>): Promise<ErrorSystemComponents> => {
  const system = await initializeErrorSystem(config);
  return system.getComponents();
};