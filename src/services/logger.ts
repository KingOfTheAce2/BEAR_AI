/**
 * BEAR AI Structured Logging Service
 * Based on Ollama's logging patterns with enhanced structured logging
 * 
 * @file Comprehensive logging service with multiple outputs and structured data
 * @version 2.0.0
 */

import { EventEmitter } from 'events';

// ==================== TYPES & INTERFACES ====================

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  category?: string;
  metadata?: Record<string, any>;
  context?: LogContext;
  performance?: PerformanceMetrics;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

export interface LogContext {
  userId?: string;
  sessionId?: string;
  requestId?: string;
  component?: string;
  operation?: string;
  correlationId?: string;
  traceId?: string;
}

export interface PerformanceMetrics {
  duration?: number;
  memoryUsed?: number;
  cpuUsage?: number;
  operation?: string;
  startTime?: number;
  endTime?: number;
}

export interface LogTransport {
  name: string;
  level: LogLevel;
  write: (entry: LogEntry) => Promise<void>;
  flush?: () => Promise<void>;
  close?: () => Promise<void>;
}

export interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableFile: boolean;
  enableStructured: boolean;
  filePath?: string;
  maxFileSize?: number;
  maxFiles?: number;
  enablePerformanceTracking: boolean;
  enableContextTracking: boolean;
  transports: LogTransport[];
  metadata: Record<string, any>;
}

export interface LogFilter {
  level?: LogLevel[];
  category?: string[];
  component?: string[];
  excludePatterns?: RegExp[];
  includePatterns?: RegExp[];
}

// ==================== LOG LEVELS ====================

const LOG_LEVELS: Record<LogLevel, number> = {
  trace: 0,
  debug: 1,
  info: 2,
  warn: 3,
  error: 4,
  fatal: 5
};

const LOG_COLORS: Record<LogLevel, string> = {
  trace: '\x1b[90m', // Gray
  debug: '\x1b[36m', // Cyan
  info: '\x1b[32m',  // Green
  warn: '\x1b[33m',  // Yellow
  error: '\x1b[31m', // Red
  fatal: '\x1b[35m'  // Magenta
};

const RESET_COLOR = '\x1b[0m';

// ==================== LOGGER CLASS ====================

export class Logger extends EventEmitter {
  private config: LoggerConfig;
  private context: LogContext = {};
  private performanceTimers = new Map<string, number>();
  private logBuffer: LogEntry[] = [];
  private flushInterval?: NodeJS.Timeout;

  constructor(config: Partial<LoggerConfig> = {}) {
    super();
    
    this.config = {
      level: 'info',
      enableConsole: true,
      enableFile: false,
      enableStructured: true,
      enablePerformanceTracking: true,
      enableContextTracking: true,
      transports: [],
      metadata: {},
      ...config
    };

    this.initializeDefaultTransports();
    this.startFlushInterval();
  }

  // ==================== PUBLIC METHODS ====================

  /**
   * Set logging context for all subsequent log entries
   */
  setContext(context: Partial<LogContext>): void {
    this.context = { ...this.context, ...context };
  }

  /**
   * Clear logging context
   */
  clearContext(): void {
    this.context = {};
  }

  /**
   * Get current context
   */
  getContext(): LogContext {
    return { ...this.context };
  }

  /**
   * Start performance timing
   */
  startTimer(operation: string): void {
    if (this.config.enablePerformanceTracking) {
      this.performanceTimers.set(operation, performance.now());
    }
  }

  /**
   * End performance timing and log
   */
  endTimer(operation: string, message?: string): number {
    if (!this.config.enablePerformanceTracking) {
      return 0;
    }

    const startTime = this.performanceTimers.get(operation);
    if (!startTime) {
      this.warn(`Timer not found for operation: ${operation}`);
      return 0;
    }

    const endTime = performance.now();
    const duration = endTime - startTime;
    
    this.performanceTimers.delete(operation);

    const performanceData: PerformanceMetrics = {
      operation,
      duration,
      startTime,
      endTime
    };

    // Add memory usage if available
    if (typeof window !== 'undefined' && 'memory' in performance) {
      const memory = (performance as any).memory;
      performanceData.memoryUsed = memory.usedJSHeapSize;
    }

    this.info(message || `Performance: ${operation} completed`, {
      performance: performanceData
    });

    return duration;
  }

  /**
   * Log with trace level
   */
  trace(message: string, metadata?: Record<string, any>): void {
    this.log('trace', message, metadata);
  }

  /**
   * Log with debug level
   */
  debug(message: string, metadata?: Record<string, any>): void {
    this.log('debug', message, metadata);
  }

  /**
   * Log with info level
   */
  info(message: string, metadata?: Record<string, any>): void {
    this.log('info', message, metadata);
  }

  /**
   * Log with warn level
   */
  warn(message: string, metadata?: Record<string, any>): void {
    this.log('warn', message, metadata);
  }

  /**
   * Log with error level
   */
  error(message: string, metadata?: Record<string, any>): void {
    this.log('error', message, metadata);
  }

  /**
   * Log with fatal level
   */
  fatal(message: string, metadata?: Record<string, any>): void {
    this.log('fatal', message, metadata);
  }

  /**
   * Log an error object
   */
  logError(error: Error, message?: string, metadata?: Record<string, any>): void {
    const errorData = {
      name: error.name,
      message: error.message,
      stack: error.stack
    };

    this.log('error', message || error.message, {
      ...metadata,
      error: errorData
    });
  }

  /**
   * Create a child logger with additional context
   */
  child(context: Partial<LogContext>, metadata?: Record<string, any>): Logger {
    const childLogger = new Logger(this.config);
    childLogger.setContext({ ...this.context, ...context });
    
    if (metadata) {
      childLogger.config.metadata = { ...this.config.metadata, ...metadata };
    }

    return childLogger;
  }

  /**
   * Add a custom transport
   */
  addTransport(transport: LogTransport): void {
    this.config.transports.push(transport);
  }

  /**
   * Remove a transport by name
   */
  removeTransport(name: string): void {
    this.config.transports = this.config.transports.filter(t => t.name !== name);
  }

  /**
   * Flush all log entries immediately
   */
  async flush(): Promise<void> {
    if (this.logBuffer.length === 0) return;

    const entries = [...this.logBuffer];
    this.logBuffer = [];

    await Promise.all(
      this.config.transports.map(async (transport) => {
        for (const entry of entries) {
          if (this.shouldLog(entry.level, transport.level)) {
            try {
              await transport.write(entry);
            } catch (error) {
              // Error logging disabled for production
            }
          }
        }
        
        if (transport.flush) {
          try {
            await transport.flush();
          } catch (error) {
            // Error logging disabled for production
          }
        }
      })
    );
  }

  /**
   * Close logger and cleanup resources
   */
  async close(): Promise<void> {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }

    await this.flush();

    await Promise.all(
      this.config.transports.map(async (transport) => {
        if (transport.close) {
          try {
            await transport.close();
          } catch (error) {
            // Error logging disabled for production
          }
        }
      })
    );
  }

  // ==================== PRIVATE METHODS ====================

  private log(level: LogLevel, message: string, metadata?: Record<string, any>): void {
    if (!this.shouldLog(level, this.config.level)) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      metadata: { ...this.config.metadata, ...metadata },
      context: this.config.enableContextTracking ? { ...this.context } : undefined
    };

    // Add performance data if available in metadata
    if (metadata?.performance) {
      entry.performance = metadata.performance;
    }

    // Add error data if available in metadata
    if (metadata?.error) {
      entry.error = metadata.error;
    }

    this.logBuffer.push(entry);
    this.emit('log', entry);

    // Immediate flush for fatal errors
    if (level === 'fatal') {
      setImmediate(() => this.flush());
    }
  }

  private shouldLog(messageLevel: LogLevel, configLevel: LogLevel): boolean {
    return LOG_LEVELS[messageLevel] >= LOG_LEVELS[configLevel];
  }

  private initializeDefaultTransports(): void {
    // Console transport
    if (this.config.enableConsole) {
      this.addTransport(new ConsoleTransport(this.config.level));
    }

    // File transport
    if (this.config.enableFile && this.config.filePath) {
      this.addTransport(new FileTransport(this.config.filePath, this.config.level));
    }
  }

  private startFlushInterval(): void {
    // Flush logs every 5 seconds
    this.flushInterval = setInterval(() => {
      this.flush().catch(error => {
        // Error logging disabled for production
      });
    }, 5000);
  }

  private formatLogEntry(entry: LogEntry, colored: boolean = false): string {
    const timestamp = entry.timestamp.toISOString();
    const level = entry.level.toUpperCase().padEnd(5);
    const color = colored ? LOG_COLORS[entry.level] : '';
    const reset = colored ? RESET_COLOR : '';

    let formatted = `${color}[${timestamp}] ${level}${reset} ${entry.message}`;

    // Add context if available
    if (entry.context && Object.keys(entry.context).length > 0) {
      const contextStr = Object.entries(entry.context)
        .filter(([_, value]) => value !== undefined)
        .map(([key, value]) => `${key}=${value}`)
        .join(' ');
      formatted += ` | ${contextStr}`;
    }

    // Add metadata if available and not too large
    if (entry.metadata && Object.keys(entry.metadata).length > 0) {
      const metadataStr = JSON.stringify(entry.metadata, null, 0);
      if (metadataStr.length < 500) {
        formatted += ` | ${metadataStr}`;
      }
    }

    // Add performance data
    if (entry.performance) {
      formatted += ` | duration=${entry.performance.duration?.toFixed(2)}ms`;
      if (entry.performance.memoryUsed) {
        formatted += ` memory=${Math.round(entry.performance.memoryUsed / 1024 / 1024)}MB`;
      }
    }

    // Add error stack for error logs
    if (entry.error && entry.error.stack && entry.level === 'error') {
      formatted += `\n${entry.error.stack}`;
    }

    return formatted;
  }
}

// ==================== TRANSPORT IMPLEMENTATIONS ====================

class ConsoleTransport implements LogTransport {
  name = 'console';

  constructor(public level: LogLevel) {}

  async write(entry: LogEntry): Promise<void> {
    const logger = new Logger();
    const formatted = (logger as any).formatLogEntry(entry, true);

    switch (entry.level) {
      case 'trace':
      case 'debug':
        // Debug logging disabled for production
        break;
      case 'info':
        // Info logging disabled for production
        break;
      case 'warn':
        // Warning logging disabled for production
        break;
      case 'error':
      case 'fatal':
        // Error logging disabled for production
        break;
    }
  }
}

class FileTransport implements LogTransport {
  name = 'file';
  private logEntries: string[] = [];

  constructor(private filePath: string, public level: LogLevel) {}

  async write(entry: LogEntry): Promise<void> {
    const logger = new Logger();
    const formatted = (logger as any).formatLogEntry(entry, false);
    this.logEntries.push(formatted);

    // In a browser environment, we can't write to files directly
    // This would need to be implemented server-side or use a different approach
    if (typeof window === 'undefined') {
      // Server-side file writing would go here
      // For now, we'll just store in memory
    }
  }

  async flush(): Promise<void> {
    // Implement file flushing logic here
    // For browser environments, this might send logs to a server endpoint
  }

  getLogEntries(): string[] {
    return [...this.logEntries];
  }
}

class StructuredTransport implements LogTransport {
  name = 'structured';

  constructor(public level: LogLevel, private endpoint?: string) {}

  async write(entry: LogEntry): Promise<void> {
    const structuredEntry = {
      '@timestamp': entry.timestamp.toISOString(),
      level: entry.level,
      message: entry.message,
      ...entry.context,
      ...entry.metadata,
      performance: entry.performance,
      error: entry.error
    };

    if (this.endpoint) {
      try {
        await fetch(this.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(structuredEntry)
        });
      } catch (error) {
        // Error logging disabled for production
      }
    } else {
      // Logging disabled for production
    }
  }
}

// ==================== EXPORTS ====================

export default Logger;

// Global logger instance
let globalLogger: Logger | null = null;

export const createLogger = (config?: Partial<LoggerConfig>): Logger => {
  return new Logger(config);
};

export const setGlobalLogger = (logger: Logger): void => {
  globalLogger = logger;
};

export const getGlobalLogger = (): Logger => {
  if (!globalLogger) {
    globalLogger = new Logger();
  }
  return globalLogger;
};

// Convenience functions
export const log = {
  trace: (message: string, metadata?: Record<string, any>) => getGlobalLogger().trace(message, metadata),
  debug: (message: string, metadata?: Record<string, any>) => getGlobalLogger().debug(message, metadata),
  info: (message: string, metadata?: Record<string, any>) => getGlobalLogger().info(message, metadata),
  warn: (message: string, metadata?: Record<string, any>) => getGlobalLogger().warn(message, metadata),
  error: (message: string, metadata?: Record<string, any>) => getGlobalLogger().error(message, metadata),
  fatal: (message: string, metadata?: Record<string, any>) => getGlobalLogger().fatal(message, metadata),
  startTimer: (operation: string) => getGlobalLogger().startTimer(operation),
  endTimer: (operation: string, message?: string) => getGlobalLogger().endTimer(operation, message),
  setContext: (context: Partial<LogContext>) => getGlobalLogger().setContext(context),
  clearContext: () => getGlobalLogger().clearContext()
};

export { ConsoleTransport, FileTransport, StructuredTransport };