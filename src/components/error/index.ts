/**
 * Error Handling Components Export Index
 * Centralized exports for all error handling components
 * 
 * @file Error handling components index
 * @version 2.0.0
 */

// Core Error Boundary Components
export { ErrorBoundaryWrapper, withErrorBoundary } from './ErrorBoundaryWrapper';
export { ErrorFallbackComponent } from './ErrorFallbackComponent';
export { ErrorRecoveryDialog } from './ErrorRecoveryDialog';

// Types
export type { 
  ErrorBoundaryWrapperProps,
  ErrorFallbackProps 
} from './ErrorBoundaryWrapper';

// Re-export the existing ErrorBoundary for backward compatibility
export { ErrorBoundary, DefaultErrorFallback } from '../ui/ErrorBoundary';
export type { ErrorBoundaryProps, ErrorFallbackProps as UIErrorFallbackProps } from '../ui/ErrorBoundary';

// Error Service Exports
export { ErrorHandler, createErrorHandler, setGlobalErrorHandler, getGlobalErrorHandler, handleError } from '../../services/errorHandler';
export { Logger, createLogger, setGlobalLogger, getGlobalLogger, log } from '../../services/logger';
export { ErrorAnalyticsService, createErrorAnalytics, setGlobalErrorAnalytics, getGlobalErrorAnalytics } from '../../services/errorAnalytics';
export { APIErrorMiddleware, createAPIClient } from '../../services/apiErrorMiddleware';
export { ErrorSystem, initializeErrorSystem, getGlobalErrorSystem, shutdownErrorSystem, setupErrorHandling } from '../../services/errorSystem';

// Types from services
export type {
  ErrorSeverity,
  ErrorCategory,
  ErrorContext,
  ProcessedError,
  ErrorRecoveryStrategy,
  ErrorHandlerConfig
} from '../../services/errorHandler';

export type {
  LogLevel,
  LogEntry,
  LogContext,
  LoggerConfig
} from '../../services/logger';

export type {
  ErrorMetrics,
  ErrorAlert,
  ErrorReport,
  ErrorAnalyticsConfig
} from '../../services/errorAnalytics';

export type {
  APIResponse,
  APIErrorResponse,
  APISuccessResponse,
  APIMiddlewareConfig,
  RetryConfig,
  CircuitBreakerConfig
} from '../../services/apiErrorMiddleware';

export type {
  ErrorSystemConfig,
  ErrorSystemComponents
} from '../../services/errorSystem';