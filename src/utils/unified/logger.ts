/**
 * Unified Logger Utility for BEAR AI
 * Provides consistent logging across all components
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  [key: string]: any;
}

export interface Logger {
  debug: (message: string, context?: LogContext) => void;
  info: (message: string, context?: LogContext) => void;
  warn: (message: string, context?: LogContext) => void;
  error: (message: string, context?: LogContext) => void;
  child: (context: LogContext) => Logger;
  componentMount: (componentName: string, props?: unknown) => void;
  componentUnmount: (componentName: string, context?: Record<string, any>) => void;
  componentError: (componentName: string, error: Error, context?: Record<string, any>) => void;
}

class UnifiedLogger implements Logger {
  private prefix: string;
  private level: LogLevel;
  private defaultContext: LogContext;

  constructor(prefix: string = '', level: LogLevel = 'info', context: LogContext = {}) {
    this.prefix = prefix;
    this.level = level;
    this.defaultContext = context;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    return levels.indexOf(level) >= levels.indexOf(this.level);
  }

  private formatContext(context?: LogContext): string {
    const mergedContext = { ...this.defaultContext, ...(context || {}) };
    if (Object.keys(mergedContext).length === 0) {
      return '';
    }

    try {
      return ` ${JSON.stringify(mergedContext)}`;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return ` [context-serialization-error: ${errorMessage}]`;
    }
  }

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const prefixStr = this.prefix ? `[${this.prefix}] ` : '';
    const contextStr = this.formatContext(context);
    return `${timestamp} [${level.toUpperCase()}] ${prefixStr}${message}${contextStr}`;
  }

  debug(message: string, context?: LogContext): void {
    if (this.shouldLog('debug')) {
      // Debug logging disabled for production
    }
  }

  info(message: string, context?: LogContext): void {
    if (this.shouldLog('info')) {
      // Info logging disabled for production
    }
  }

  warn(message: string, context?: LogContext): void {
    if (this.shouldLog('warn')) {
      // Warning logging disabled for production
    }
  }

  error(message: string, context?: LogContext): void {
    if (this.shouldLog('error')) {
      // Error logging disabled for production
    }
  }

  child(context: LogContext): UnifiedLogger {
    return new UnifiedLogger(this.prefix, this.level, { ...this.defaultContext, ...context });
  }

  componentMount(componentName: string, props?: unknown): void {
    this.info(`Component mounted: ${componentName}`, {
      component: componentName,
      props
    });
  }

  componentUnmount(componentName: string, context?: Record<string, any>): void {
    this.info(`Component unmounted: ${componentName}`, {
      component: componentName,
      ...context
    });
  }

  componentError(componentName: string, error: Error, context?: Record<string, any>): void {
    this.error(`Component error: ${componentName}`, {
      component: componentName,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      ...context
    });
  }
}

// Default logger instance
export const logger = new UnifiedLogger('BEAR-AI');

// Logger factory function
export function createLogger(prefix: string, level: LogLevel = 'info', context: LogContext = {}): Logger {
  return new UnifiedLogger(prefix, level, context);
}

// Utility functions
export function setLogLevel(level: LogLevel): void {
  (logger as any).level = level;
}

export function enableProdLogging(): void {
  if (process.env.NODE_ENV === 'production') {
    setLogLevel('warn');
  }
}

export function enableDevLogging(): void {
  if (process.env.NODE_ENV === 'development') {
    setLogLevel('debug');
  }
}