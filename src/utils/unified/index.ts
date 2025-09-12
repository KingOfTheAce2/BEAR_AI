/**
 * BEAR AI Unified Utilities and Patterns
 * Centralized utilities, error handling, logging, and common patterns
 */

// Core utilities
export { cn, type ClassValue } from './classNames';
export { logger, type Logger, type LogLevel } from './logger';
export { ErrorHandler, BearError, type ErrorContext } from './errorHandler';
export { PerformanceMonitor, type PerformanceMetric } from './performance';
export { ApiClient, type ApiResponse, type ApiError } from './apiClient';
export { StateManager, type StateUpdate } from './stateManager';
export { ComponentFactory, type ComponentProps } from './componentFactory';
export { ValidationService, type ValidationRule, type ValidationResult } from './validation';
export { ConfigService } from './config';
export { CacheManager, type CacheOptions } from './cache';

// Types for unified patterns
export interface UnifiedResponse<T = any> {
  success: boolean;
  data?: T;
  error?: BearError;
  metadata?: {
    timestamp: Date;
    requestId: string;
    performance?: PerformanceMetric;
  };
}

export interface UnifiedServiceOptions {
  logger?: Logger;
  errorHandler?: ErrorHandler;
  performanceMonitor?: PerformanceMonitor;
  retryAttempts?: number;
  timeout?: number;
}

export interface UnifiedComponentState {
  loading: boolean;
  error: BearError | null;
  data: any;
  metadata: {
    lastUpdated: Date;
    version: number;
  };
}

// Service factory for creating consistent services
export function createUnifiedService<T extends object>(
  name: string,
  implementation: T,
  options: UnifiedServiceOptions = {}
): T & {
  logger: Logger;
  errorHandler: ErrorHandler;
  performanceMonitor: PerformanceMonitor;
} {
  const logger = options.logger || new (await import('./logger')).Logger(name);
  const errorHandler = options.errorHandler || new (await import('./errorHandler')).ErrorHandler();
  const performanceMonitor = options.performanceMonitor || new (await import('./performance')).PerformanceMonitor();

  return {
    ...implementation,
    logger,
    errorHandler,
    performanceMonitor
  };
}

// Hook factory for creating consistent React hooks
export function createUnifiedHook<T, P extends any[]>(
  name: string,
  hookFn: (...args: P) => T,
  options: UnifiedServiceOptions = {}
) {
  return (...args: P): T & { 
    error: BearError | null; 
    loading: boolean; 
    metadata: any;
  } => {
    const result = hookFn(...args);
    const logger = options.logger || new (import('./logger')).Logger(name);
    
    // Add unified error handling and state management
    const [error, setError] = React.useState<BearError | null>(null);
    const [loading, setLoading] = React.useState(false);
    const [metadata, setMetadata] = React.useState({});

    React.useEffect(() => {
      logger.debug(`Hook ${name} initialized with args:`, args);
    }, []);

    return {
      ...result,
      error,
      loading,
      metadata
    } as any;
  };
}

// Re-export commonly used utilities
export * from './constants';
export * from './helpers';
export * from './transforms';
export * from './formatters';