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
}

class UnifiedLogger implements Logger {
  private prefix: string;
  private level: LogLevel;

  constructor(prefix: string = '', level: LogLevel = 'info') {
    this.prefix = prefix;
    this.level = level;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    return levels.indexOf(level) >= levels.indexOf(this.level);
  }

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const prefixStr = this.prefix ? `[${this.prefix}] ` : '';
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';
    return `${timestamp} [${level.toUpperCase()}] ${prefixStr}${message}${contextStr}`;
  }

  debug(message: string, context?: LogContext): void {
    if (this.shouldLog('debug')) {
      console.debug(this.formatMessage('debug', message, context));
    }
  }

  info(message: string, context?: LogContext): void {
    if (this.shouldLog('info')) {
      console.info(this.formatMessage('info', message, context));
    }
  }

  warn(message: string, context?: LogContext): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, context));
    }
  }

  error(message: string, context?: LogContext): void {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage('error', message, context));
    }
  }
}

// Default logger instance
export const logger = new UnifiedLogger('BEAR-AI');

// Logger factory function
export function createLogger(prefix: string, level: LogLevel = 'info'): Logger {
  return new UnifiedLogger(prefix, level);
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