/**
 * Unified Logging System for BEAR AI
 * Consistent logging across all modules with structured output
 */

export enum LogLevel {
  TRACE = 0,
  DEBUG = 1,
  INFO = 2,
  WARN = 3,
  ERROR = 4,
  FATAL = 5
}

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  logger: string;
  message: string;
  data?: any;
  context?: LogContext;
  correlationId?: string;
  performance?: {
    startTime: number;
    duration?: number;
  };
}

export interface LogContext {
  userId?: string;
  sessionId?: string;
  requestId?: string;
  component?: string;
  action?: string;
  trace?: string;
  [key: string]: any;
}

export interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableFile: boolean;
  enableRemote: boolean;
  format: 'json' | 'text' | 'structured';
  maxFileSize: number;
  maxFiles: number;
  remoteEndpoint?: string;
  sensitiveFields: string[];
  includeStack: boolean;
}

export class Logger {
  private config: LoggerConfig;
  private logQueue: LogEntry[] = [];
  private flushInterval: NodeJS.Timeout | null = null;
  private context: LogContext = {};

  constructor(
    private name: string,
    config: Partial<LoggerConfig> = {}
  ) {
    this.config = {
      level: process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG,
      enableConsole: true,
      enableFile: false,
      enableRemote: process.env.NODE_ENV === 'production',
      format: 'structured',
      maxFileSize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      sensitiveFields: ['password', 'token', 'secret', 'key', 'credentials'],
      includeStack: process.env.NODE_ENV !== 'production',
      ...config
    };

    this.startFlushInterval();
  }

  /**
   * Set persistent context for all log entries from this logger
   */
  setContext(context: LogContext): void {
    this.context = { ...this.context, ...context };
  }

  /**
   * Clear logger context
   */
  clearContext(): void {
    this.context = {};
  }

  /**
   * Create a child logger with additional context
   */
  child(childContext: LogContext): Logger {
    const child = new Logger(this.name, this.config);
    child.setContext({ ...this.context, ...childContext });
    return child;
  }

  // Logging methods
  trace(message: string, data?: any, context?: LogContext): void {
    this.log(LogLevel.TRACE, message, data, context);
  }

  debug(message: string, data?: any, context?: LogContext): void {
    this.log(LogLevel.DEBUG, message, data, context);
  }

  info(message: string, data?: any, context?: LogContext): void {
    this.log(LogLevel.INFO, message, data, context);
  }

  warn(message: string, data?: any, context?: LogContext): void {
    this.log(LogLevel.WARN, message, data, context);
  }

  error(message: string, data?: any, context?: LogContext): void {
    this.log(LogLevel.ERROR, message, data, context);
  }

  fatal(message: string, data?: any, context?: LogContext): void {
    this.log(LogLevel.FATAL, message, data, context);
  }

  /**
   * Performance logging
   */
  startTimer(label: string): () => void {
    const startTime = performance.now();
    return () => {
      const duration = performance.now() - startTime;
      this.info(`Performance: ${label}`, { duration: `${duration.toFixed(2)}ms` });
    };
  }

  /**
   * Async performance logging
   */
  async timed<T>(label: string, fn: () => Promise<T>): Promise<T> {
    const startTime = performance.now();
    try {
      const result = await fn();
      const duration = performance.now() - startTime;
      this.info(`Performance: ${label}`, { 
        duration: `${duration.toFixed(2)}ms`,
        status: 'success'
      });
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      this.error(`Performance: ${label}`, { 
        duration: `${duration.toFixed(2)}ms`,
        status: 'error',
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  /**
   * HTTP request logging
   */
  httpRequest(method: string, url: string, status: number, duration: number, data?: any): void {
    const level = status >= 400 ? LogLevel.WARN : LogLevel.INFO;
    this.log(level, `HTTP ${method} ${url}`, {
      method,
      url,
      status,
      duration: `${duration.toFixed(2)}ms`,
      ...data
    }, {
      action: 'http_request'
    });
  }

  /**
   * Component lifecycle logging
   */
  componentMount(componentName: string, props?: any): void {
    this.debug(`Component mounted: ${componentName}`, props, {
      component: componentName,
      action: 'mount'
    });
  }

  componentUnmount(componentName: string): void {
    this.debug(`Component unmounted: ${componentName}`, undefined, {
      component: componentName,
      action: 'unmount'
    });
  }

  componentError(componentName: string, error: Error): void {
    this.error(`Component error: ${componentName}`, {
      error: error.message,
      stack: this.config.includeStack ? error.stack : undefined
    }, {
      component: componentName,
      action: 'error'
    });
  }

  /**
   * User action logging
   */
  userAction(action: string, details?: any, userId?: string): void {
    this.info(`User action: ${action}`, details, {
      userId: userId || this.context.userId,
      action: 'user_action',
      userAction: action
    });
  }

  /**
   * Security event logging
   */
  securityEvent(event: string, severity: 'low' | 'medium' | 'high' | 'critical', details?: any): void {
    const level = severity === 'critical' ? LogLevel.FATAL : 
                  severity === 'high' ? LogLevel.ERROR :
                  severity === 'medium' ? LogLevel.WARN : LogLevel.INFO;

    this.log(level, `Security event: ${event}`, details, {
      action: 'security_event',
      securityEvent: event,
      severity
    });
  }

  // Core logging method
  private log(level: LogLevel, message: string, data?: any, context?: LogContext): void {
    // Check if log level is enabled
    if (level < this.config.level) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      logger: this.name,
      message,
      data: this.sanitizeData(data),
      context: { ...this.context, ...context },
      correlationId: this.generateCorrelationId()
    };

    // Add to queue
    this.logQueue.push(entry);

    // Immediate console output for high priority logs
    if (this.config.enableConsole && (level >= LogLevel.WARN || process.env.NODE_ENV !== 'production')) {
      this.consoleOutput(entry);
    }

    // Trigger immediate flush for critical logs
    if (level >= LogLevel.ERROR) {
      this.flush();
    }
  }

  /**
   * Format log entry for display
   */
  private formatEntry(entry: LogEntry): string {
    const levelName = LogLevel[entry.level];
    const timestamp = entry.timestamp.toISOString();
    
    switch (this.config.format) {
      case 'json':
        return JSON.stringify(entry);
        
      case 'structured':
        const parts = [
          `[${timestamp}]`,
          `[${levelName}]`,
          `[${entry.logger}]`,
          entry.message
        ];
        
        if (entry.context?.component) {
          parts.push(`(${entry.context.component})`);
        }
        
        if (entry.data) {
          parts.push(JSON.stringify(entry.data, null, 2));
        }
        
        return parts.join(' ');
        
      case 'text':
      default:
        let text = `${timestamp} ${levelName} [${entry.logger}] ${entry.message}`;
        if (entry.data) {
          text += ` ${JSON.stringify(entry.data)}`;
        }
        return text;
    }
  }

  /**
   * Console output with appropriate styling
   */
  private consoleOutput(entry: LogEntry): void {
    const formatted = this.formatEntry(entry);
    const style = this.getConsoleStyle(entry.level);
    
    switch (entry.level) {
      case LogLevel.TRACE:
        console.trace(style, formatted);
        break;
      case LogLevel.DEBUG:
        console.debug(style, formatted);
        break;
      case LogLevel.INFO:
        console.info(style, formatted);
        break;
      case LogLevel.WARN:
        console.warn(style, formatted);
        break;
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(style, formatted);
        break;
    }
  }

  /**
   * Get console styling for log level
   */
  private getConsoleStyle(level: LogLevel): string {
    switch (level) {
      case LogLevel.TRACE:
        return '🔍';
      case LogLevel.DEBUG:
        return '🐛';
      case LogLevel.INFO:
        return 'ℹ️';
      case LogLevel.WARN:
        return '⚠️';
      case LogLevel.ERROR:
        return '❌';
      case LogLevel.FATAL:
        return '💀';
      default:
        return '';
    }
  }

  /**
   * Sanitize sensitive data from logs
   */
  private sanitizeData(data: any): any {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const sanitized = Array.isArray(data) ? [...data] : { ...data };
    
    const sanitizeObject = (obj: any): any => {
      for (const key in obj) {
        if (this.config.sensitiveFields.some(field => 
            key.toLowerCase().includes(field.toLowerCase())
        )) {
          obj[key] = '[REDACTED]';
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          obj[key] = sanitizeObject(obj[key]);
        }
      }
      return obj;
    };

    return sanitizeObject(sanitized);
  }

  /**
   * Generate correlation ID for tracking related log entries
   */
  private generateCorrelationId(): string {
    return `${this.name}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Start periodic flush of log queue
   */
  private startFlushInterval(): void {
    this.flushInterval = setInterval(() => {
      this.flush();
    }, 5000); // Flush every 5 seconds
  }

  /**
   * Flush log queue to outputs
   */
  private async flush(): Promise<void> {
    if (this.logQueue.length === 0) {
      return;
    }

    const entries = [...this.logQueue];
    this.logQueue = [];

    try {
      // File output
      if (this.config.enableFile) {
        await this.writeToFile(entries);
      }

      // Remote output
      if (this.config.enableRemote && this.config.remoteEndpoint) {
        await this.sendToRemote(entries);
      }
    } catch (error) {
      console.error('Failed to flush logs:', error);
      // Re-add entries to queue for retry
      this.logQueue.unshift(...entries);
    }
  }

  /**
   * Write logs to file (placeholder - would use fs in Node.js)
   */
  private async writeToFile(entries: LogEntry[]): Promise<void> {
    // In a real implementation, this would write to file system
    console.debug('📁 Writing logs to file:', entries.length);
  }

  /**
   * Send logs to remote endpoint
   */
  private async sendToRemote(entries: LogEntry[]): Promise<void> {
    if (!this.config.remoteEndpoint) return;

    try {
      const response = await fetch(this.config.remoteEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ logs: entries }),
      });

      if (!response.ok) {
        throw new Error(`Remote logging failed: ${response.status}`);
      }
    } catch (error) {
      console.warn('Failed to send logs to remote endpoint:', error);
    }
  }

  /**
   * Clean up logger
   */
  destroy(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    
    // Final flush
    this.flush();
  }
}

// Create default loggers for common use cases
export const appLogger = new Logger('App');
export const apiLogger = new Logger('API');
export const uiLogger = new Logger('UI');
export const systemLogger = new Logger('System');
export const securityLogger = new Logger('Security');
export const performanceLogger = new Logger('Performance');

// Utility functions
export function createLogger(name: string, config?: Partial<LoggerConfig>): Logger {
  return new Logger(name, config);
}

export function getLoggerForComponent(componentName: string): Logger {
  return new Logger(`Component:${componentName}`);
}

export function getLoggerForService(serviceName: string): Logger {
  return new Logger(`Service:${serviceName}`);
}