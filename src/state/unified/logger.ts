/**
 * Unified Logging System for BEAR AI
 * Consistent logging patterns across all components and services
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4
}

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  context?: string;
  data?: any;
  error?: Error;
  correlationId?: string;
}

export interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableStorage: boolean;
  enableRemote: boolean;
  maxStorageEntries: number;
  remoteEndpoint?: string;
  context?: string;
}

class Logger {
  private config: LoggerConfig;
  private context: string;
  private storage: LogEntry[] = [];

  constructor(context: string = 'App', config?: Partial<LoggerConfig>) {
    this.context = context;
    this.config = {
      level: process.env.NODE_ENV === 'development' ? LogLevel.DEBUG : LogLevel.INFO,
      enableConsole: true,
      enableStorage: process.env.NODE_ENV === 'development',
      enableRemote: process.env.NODE_ENV === 'production',
      maxStorageEntries: 1000,
      ...config
    };
  }

  /**
   * Debug level logging
   */
  debug(message: string, data?: any): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  /**
   * Info level logging
   */
  info(message: string, data?: any): void {
    this.log(LogLevel.INFO, message, data);
  }

  /**
   * Warning level logging
   */
  warn(message: string, data?: any): void {
    this.log(LogLevel.WARN, message, data);
  }

  /**
   * Error level logging
   */
  error(message: string, error?: Error | any): void {
    const errorData = error instanceof Error 
      ? { name: error.name, message: error.message, stack: error.stack }
      : error;
    
    this.log(LogLevel.ERROR, message, errorData, error instanceof Error ? error : undefined);
  }

  /**
   * Fatal level logging
   */
  fatal(message: string, error?: Error | any): void {
    const errorData = error instanceof Error 
      ? { name: error.name, message: error.message, stack: error.stack }
      : error;
    
    this.log(LogLevel.FATAL, message, errorData, error instanceof Error ? error : undefined);
  }

  /**
   * Core logging method
   */
  private log(level: LogLevel, message: string, data?: any, error?: Error): void {
    // Check if this log level should be processed
    if (level < this.config.level) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      context: this.context,
      data: this.sanitizeData(data),
      error,
      correlationId: this.generateCorrelationId()
    };

    // Console logging
    if (this.config.enableConsole) {
      this.logToConsole(entry);
    }

    // Storage logging
    if (this.config.enableStorage) {
      this.logToStorage(entry);
    }

    // Remote logging
    if (this.config.enableRemote) {
      this.logToRemote(entry);
    }
  }

  /**
   * Log to browser console
   */
  private logToConsole(entry: LogEntry): void {
    const timestamp = entry.timestamp.toISOString();
    const levelName = LogLevel[entry.level];
    const prefix = `[${timestamp}] ${levelName} ${entry.context}:`;

    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(prefix, entry.message, entry.data || '');
        break;
      case LogLevel.INFO:
        console.info(prefix, entry.message, entry.data || '');
        break;
      case LogLevel.WARN:
        console.warn(prefix, entry.message, entry.data || '');
        break;
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(prefix, entry.message, entry.data || '', entry.error || '');
        break;
    }
  }

  /**
   * Log to local storage
   */
  private logToStorage(entry: LogEntry): void {
    try {
      this.storage.push(entry);

      // Maintain max storage size
      if (this.storage.length > this.config.maxStorageEntries) {
        this.storage = this.storage.slice(-this.config.maxStorageEntries);
      }

      // Persist to localStorage (optional)
      if (typeof window !== 'undefined') {
        const storageKey = `bear_logs_${this.context.toLowerCase()}`;
        const recentLogs = this.storage.slice(-100); // Only keep last 100 in localStorage
        localStorage.setItem(storageKey, JSON.stringify(recentLogs));
      }
    } catch (error) {
      // Fail silently for storage issues
      console.warn('Failed to store log entry:', error);
    }
  }

  /**
   * Log to remote service
   */
  private logToRemote(entry: LogEntry): void {
    // Only log errors and above to remote in production
    if (entry.level < LogLevel.ERROR) {
      return;
    }

    try {
      // Batch remote logging to avoid spam
      this.batchRemoteLog(entry);
    } catch (error) {
      // Fail silently for remote logging issues
      console.warn('Failed to send log to remote:', error);
    }
  }

  private remoteLogs: LogEntry[] = [];
  private remoteLogTimer: NodeJS.Timeout | null = null;

  /**
   * Batch remote logs to reduce API calls
   */
  private batchRemoteLog(entry: LogEntry): void {
    this.remoteLogs.push(entry);

    // Clear existing timer
    if (this.remoteLogTimer) {
      clearTimeout(this.remoteLogTimer);
    }

    // Set new timer to send batch
    this.remoteLogTimer = setTimeout(() => {
      this.flushRemoteLogs();
    }, 5000); // Send batch every 5 seconds

    // If critical error, send immediately
    if (entry.level === LogLevel.FATAL) {
      this.flushRemoteLogs();
    }
  }

  /**
   * Send batched logs to remote service
   */
  private flushRemoteLogs(): void {
    if (this.remoteLogs.length === 0 || !this.config.remoteEndpoint) {
      return;
    }

    const logsToSend = [...this.remoteLogs];
    this.remoteLogs = [];

    // Clear timer
    if (this.remoteLogTimer) {
      clearTimeout(this.remoteLogTimer);
      this.remoteLogTimer = null;
    }

    // Send to remote service (implement based on your backend)
    fetch(this.config.remoteEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        logs: logsToSend.map(log => ({
          ...log,
          error: log.error ? {
            name: log.error.name,
            message: log.error.message,
            stack: log.error.stack
          } : undefined
        }))
      })
    }).catch(error => {
      console.warn('Failed to send logs to remote service:', error);
    });
  }

  /**
   * Get stored logs
   */
  getLogs(level?: LogLevel): LogEntry[] {
    if (level !== undefined) {
      return this.storage.filter(entry => entry.level >= level);
    }
    return [...this.storage];
  }

  /**
   * Clear stored logs
   */
  clearLogs(): void {
    this.storage = [];
    
    if (typeof window !== 'undefined') {
      const storageKey = `bear_logs_${this.context.toLowerCase()}`;
      localStorage.removeItem(storageKey);
    }
  }

  /**
   * Create child logger with additional context
   */
  child(additionalContext: string): Logger {
    return new Logger(`${this.context}:${additionalContext}`, this.config);
  }

  /**
   * Sanitize data for logging (remove sensitive information)
   */
  private sanitizeData(data: any): any {
    if (!data) return data;

    const sensitiveFields = [
      'password', 'token', 'secret', 'key', 'auth', 'credential',
      'ssn', 'social', 'credit', 'card', 'ccv', 'pin'
    ];

    const sanitize = (obj: any): any => {
      if (obj === null || obj === undefined) return obj;
      
      if (typeof obj !== 'object') return obj;
      
      if (Array.isArray(obj)) {
        return obj.map(sanitize);
      }

      const sanitized: any = {};
      
      for (const [key, value] of Object.entries(obj)) {
        const lowerKey = key.toLowerCase();
        
        if (sensitiveFields.some(field => lowerKey.includes(field))) {
          sanitized[key] = '[REDACTED]';
        } else if (typeof value === 'object') {
          sanitized[key] = sanitize(value);
        } else {
          sanitized[key] = value;
        }
      }

      return sanitized;
    };

    return sanitize(data);
  }

  /**
   * Generate correlation ID for request tracking
   */
  private generateCorrelationId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Global logger instance
let globalLogger: Logger;

/**
 * Get or create global logger
 */
export function getLogger(): Logger {
  if (!globalLogger) {
    globalLogger = new Logger('BEAR');
  }
  return globalLogger;
}

/**
 * Create logger with specific context
 */
export function createLogger(context: string, config?: Partial<LoggerConfig>): Logger {
  return new Logger(context, config);
}

/**
 * Configure global logging settings
 */
export function configureLogging(config: Partial<LoggerConfig>): void {
  globalLogger = new Logger('BEAR', config);
}

// Default export for convenience
export const logger = {
  debug: (message: string, data?: any) => getLogger().debug(message, data),
  info: (message: string, data?: any) => getLogger().info(message, data),
  warn: (message: string, data?: any) => getLogger().warn(message, data),
  error: (message: string, error?: Error | any) => getLogger().error(message, error),
  fatal: (message: string, error?: Error | any) => getLogger().fatal(message, error),
  child: (context: string) => getLogger().child(context),
  getLogs: (level?: LogLevel) => getLogger().getLogs(level),
  clearLogs: () => getLogger().clearLogs()
};
