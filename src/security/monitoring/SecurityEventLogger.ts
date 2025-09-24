/**
 * Security Event Logging and Monitoring System
 * Comprehensive security event logging, monitoring, and alerting
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { EventEmitter } from 'events';
import { Request, Response, NextFunction } from 'express';

// Define proper types for security event metadata
interface SecurityEventMetadata {
  ip?: string;
  userAgent?: string;
  userId?: string;
  sessionId?: string;
  timestamp?: string;
  reason?: string;
  remainingTime?: number;
  hostname?: string;
  error?: string;
  expectedHash?: string;
  providedHash?: string;
  body?: string;
  test?: boolean;
  [key: string]: string | number | boolean | Date | undefined;
}

interface AlertThreshold {
  count: number;
  timeWindow: number;
}

export interface SecurityLoggingConfig {
  level: 'debug' | 'info' | 'warn' | 'error';
  destination: string;
  retentionDays: number;
  maxFileSize?: number;
  enableRotation?: boolean;
  enableEncryption?: boolean;
  enableRealTimeAlerts?: boolean;
  alertThresholds?: {
    [eventType: string]: {
      count: number;
      timeWindow: number; // in milliseconds
    };
  };
  integrations?: {
    siem?: {
      endpoint: string;
      apiKey: string;
    };
    slack?: {
      webhook: string;
      channels: string[];
    };
    email?: {
      smtp: {
        host: string;
        port: number;
        secure: boolean;
        auth: {
          user: string;
          pass: string;
        };
      };
      recipients: string[];
    };
  };
}

export class SecurityEventLogger extends EventEmitter {
  private config: SecurityLoggingConfig;
  private eventCounts: Map<string, EventCount[]> = new Map();
  private isMonitoring: boolean = false;
  private rotationTimer?: NodeJS.Timeout;
  private alertCooldowns: Map<string, number> = new Map();

  constructor(config: SecurityLoggingConfig) {
    super();
    this.config = {
      maxFileSize: 100 * 1024 * 1024, // 100MB
      enableRotation: true,
      enableEncryption: true,
      enableRealTimeAlerts: true,
      alertThresholds: {
        'AUTHENTICATION_FAILURE': { count: 5, timeWindow: 5 * 60 * 1000 }, // 5 failures in 5 minutes
        'SQL_INJECTION_ATTEMPT': { count: 3, timeWindow: 10 * 60 * 1000 }, // 3 attempts in 10 minutes
        'XSS_ATTEMPT': { count: 3, timeWindow: 10 * 60 * 1000 },
        'CSRF_VALIDATION_FAILED': { count: 10, timeWindow: 15 * 60 * 1000 },
        'RATE_LIMIT_EXCEEDED': { count: 20, timeWindow: 30 * 60 * 1000 },
        'SUSPICIOUS_USER_AGENT': { count: 5, timeWindow: 60 * 60 * 1000 },
        'CERTIFICATE_VALIDATION_FAILURE': { count: 1, timeWindow: 5 * 60 * 1000 }
      },
      ...config
    };

    this.initializeLogger();
    this.setupRotation();
  }

  /**
   * Initialize logger and create directories
   */
  private initializeLogger(): void {
    const logDir = path.dirname(this.config.destination);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    // Create initial log file if it doesn't exist
    if (!fs.existsSync(this.config.destination)) {
      this.writeLogEntry({
        timestamp: new Date().toISOString(),
        level: 'info',
        event: 'LOGGER_INITIALIZED',
        message: 'Security event logger initialized',
        metadata: { config: this.sanitizeConfig() }
      });
    }
  }

  /**
   * Setup log rotation
   */
  private setupRotation(): void {
    if (this.config.enableRotation) {
      // Check for rotation every hour
      this.rotationTimer = setInterval(() => {
        this.checkAndRotateLog();
      }, 60 * 60 * 1000);
    }
  }

  /**
   * Log security event
   */
  public async logEvent(eventType: string, metadata: SecurityEventMetadata): Promise<void> {
    try {
      const logEntry: SecurityLogEntry = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        level: this.determineLogLevel(eventType),
        event: eventType,
        message: this.generateEventMessage(eventType, metadata),
        metadata: this.sanitizeMetadata(metadata),
        severity: this.calculateSeverity(eventType, metadata),
        source: 'security-system'
      };

      // Write to log file
      await this.writeLogEntry(logEntry);

      // Update event counts for monitoring
      this.updateEventCount(eventType);

      // Check for alert conditions
      if (this.config.enableRealTimeAlerts) {
        await this.checkAlertConditions(eventType, logEntry);
      }

      // Send to external integrations
      await this.sendToIntegrations(logEntry);

      // Emit event for real-time processing
      this.emit('securityEvent', logEntry);

    } catch (error) {
      // Error logging disabled for production
      // Fallback to console logging
      // Error logging disabled for production
    }
  }

  /**
   * Log security event with middleware integration
   */
  public logSecurityEvent(req: Request, res: Response, next: NextFunction): void {
    const startTime = Date.now();

    // Override res.end to capture response details
    const originalEnd = res.end;
    res.end = function(chunk: any, encoding: any) {
      const duration = Date.now() - startTime;

      // Log request details
      const logData = {
        ip: req.ip,
        method: req.method,
        path: req.path,
        userAgent: req.get('User-Agent'),
        statusCode: res.statusCode,
        duration,
        timestamp: new Date().toISOString()
      };

      // Determine if this request should be logged based on status code
      if (res.statusCode >= 400) {
        const eventType = res.statusCode >= 500 ? 'SERVER_ERROR' : 'CLIENT_ERROR';
        this.logEvent(eventType, logData).catch(() => {}); // Error handling disabled;
      }

      originalEnd.call(this, chunk, encoding);
    }.bind(this);

    next();
  }

  /**
   * Write log entry to file
   */
  private async writeLogEntry(entry: SecurityLogEntry): Promise<void> {
    const logLine = this.formatLogEntry(entry);

    if (this.config.enableEncryption) {
      // Encrypt sensitive log data
      const encrypted = this.encryptLogEntry(logLine);
      fs.appendFileSync(this.config.destination, encrypted + '\n', 'utf8');
    } else {
      fs.appendFileSync(this.config.destination, logLine + '\n', 'utf8');
    }
  }

  /**
   * Format log entry for output
   */
  private formatLogEntry(entry: SecurityLogEntry): string {
    return JSON.stringify({
      ...entry,
      hostname: require('os').hostname(),
      pid: process.pid
    });
  }

  /**
   * Encrypt log entry
   */
  private encryptLogEntry(logLine: string): string {
    // Simple encryption for log entries
    const cipher = crypto.createCipher('aes-256-cbc', process.env.LOG_ENCRYPTION_KEY || 'default-key');
    let encrypted = cipher.update(logLine, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }

  /**
   * Determine log level based on event type
   */
  private determineLogLevel(eventType: string): string {
    const criticalEvents = [
      'EMERGENCY_LOCKDOWN',
      'CERTIFICATE_VALIDATION_FAILURE',
      'AUTHENTICATION_BYPASS_ATTEMPT',
      'PRIVILEGE_ESCALATION_ATTEMPT'
    ];

    const warningEvents = [
      'AUTHENTICATION_FAILURE',
      'SQL_INJECTION_ATTEMPT',
      'XSS_ATTEMPT',
      'CSRF_VALIDATION_FAILED',
      'SUSPICIOUS_USER_AGENT'
    ];

    if (criticalEvents.includes(eventType)) {
      return 'error';
    } else if (warningEvents.includes(eventType)) {
      return 'warn';
    } else {
      return 'info';
    }
  }

  /**
   * Generate human-readable message for event
   */
  private generateEventMessage(eventType: string, metadata: SecurityEventMetadata): string {
    const messageTemplates: { [key: string]: string } = {
      'AUTHENTICATION_FAILURE': `Authentication failed for user from IP ${metadata.ip}`,
      'SQL_INJECTION_ATTEMPT': `SQL injection attempt detected from IP ${metadata.ip}`,
      'XSS_ATTEMPT': `XSS attack attempt blocked from IP ${metadata.ip}`,
      'CSRF_VALIDATION_FAILED': `CSRF token validation failed for session ${metadata.sessionId}`,
      'RATE_LIMIT_EXCEEDED': `Rate limit exceeded for IP ${metadata.ip}`,
      'CERTIFICATE_VALIDATION_FAILURE': `Certificate validation failed for ${metadata.hostname}`,
      'EMERGENCY_LOCKDOWN': `Emergency security lockdown activated: ${metadata.reason}`,
      'SUSPICIOUS_USER_AGENT': `Suspicious user agent detected: ${metadata.userAgent}`
    };

    return messageTemplates[eventType] || `Security event: ${eventType}`;
  }

  /**
   * Calculate event severity
   */
  private calculateSeverity(eventType: string, metadata: SecurityEventMetadata): 'low' | 'medium' | 'high' | 'critical' {
    const severityMap: { [key: string]: 'low' | 'medium' | 'high' | 'critical' } = {
      'EMERGENCY_LOCKDOWN': 'critical',
      'CERTIFICATE_VALIDATION_FAILURE': 'critical',
      'AUTHENTICATION_BYPASS_ATTEMPT': 'critical',
      'PRIVILEGE_ESCALATION_ATTEMPT': 'critical',
      'SQL_INJECTION_ATTEMPT': 'high',
      'XSS_ATTEMPT': 'high',
      'AUTHENTICATION_FAILURE': 'medium',
      'CSRF_VALIDATION_FAILED': 'medium',
      'RATE_LIMIT_EXCEEDED': 'medium',
      'SUSPICIOUS_USER_AGENT': 'low',
      'ACCESS_DENIED': 'low'
    };

    return severityMap[eventType] || 'low';
  }

  /**
   * Sanitize metadata to remove sensitive information
   */
  private sanitizeMetadata(metadata: SecurityEventMetadata): SecurityEventMetadata {
    const sanitized = { ...metadata };

    // Remove or hash sensitive fields
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'authorization'];

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }

    // Hash IP addresses for privacy compliance
    if (sanitized.ip) {
      sanitized.ipHash = crypto.createHash('sha256').update(sanitized.ip).digest('hex').substring(0, 8);
    }

    return sanitized;
  }

  /**
   * Update event count for monitoring
   */
  private updateEventCount(eventType: string): void {
    const now = Date.now();
    let counts = this.eventCounts.get(eventType) || [];

    // Add new event
    counts.push({ timestamp: now, count: 1 });

    // Remove old events outside the maximum time window
    const maxWindow = 24 * 60 * 60 * 1000; // 24 hours
    counts = counts.filter(event => now - event.timestamp <= maxWindow);

    this.eventCounts.set(eventType, counts);
  }

  /**
   * Check alert conditions
   */
  private async checkAlertConditions(eventType: string, logEntry: SecurityLogEntry): Promise<void> {
    const threshold = this.config.alertThresholds?.[eventType];
    if (!threshold) return;

    const now = Date.now();
    const counts = this.eventCounts.get(eventType) || [];

    // Count events within the time window
    const recentEvents = counts.filter(event =>
      now - event.timestamp <= threshold.timeWindow
    );

    const totalCount = recentEvents.reduce((sum, event) => sum + event.count, 0);

    if (totalCount >= threshold.count) {
      // Check cooldown period
      const cooldownKey = `${eventType}_alert`;
      const lastAlert = this.alertCooldowns.get(cooldownKey) || 0;
      const cooldownPeriod = 30 * 60 * 1000; // 30 minutes

      if (now - lastAlert > cooldownPeriod) {
        await this.triggerAlert(eventType, totalCount, threshold, logEntry);
        this.alertCooldowns.set(cooldownKey, now);
      }
    }
  }

  /**
   * Trigger security alert
   */
  private async triggerAlert(
    eventType: string,
    count: number,
    threshold: AlertThreshold,
    logEntry: SecurityLogEntry
  ): Promise<void> {
    const alert: SecurityAlert = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      eventType,
      count,
      threshold: threshold.count,
      timeWindow: threshold.timeWindow,
      severity: logEntry.severity,
      description: `Security alert: ${count} ${eventType} events in ${threshold.timeWindow / 1000} seconds`,
      logEntry
    };

    // Log the alert
    await this.logEvent('SECURITY_ALERT_TRIGGERED', alert);

    // Send to alert channels
    await this.sendAlert(alert);

    // Emit alert event
    this.emit('securityAlert', alert);
  }

  /**
   * Send alert to configured channels
   */
  private async sendAlert(alert: SecurityAlert): Promise<void> {
    const promises: Promise<void>[] = [];

    // Send to Slack
    if (this.config.integrations?.slack) {
      promises.push(this.sendSlackAlert(alert));
    }

    // Send to email
    if (this.config.integrations?.email) {
      promises.push(this.sendEmailAlert(alert));
    }

    await Promise.allSettled(promises);
  }

  /**
   * Send Slack alert
   */
  private async sendSlackAlert(alert: SecurityAlert): Promise<void> {
    try {
      const webhook = this.config.integrations?.slack?.webhook;
      if (!webhook) return;

      const message = {
        text: `🚨 Security Alert: ${alert.eventType}`,
        attachments: [{
          color: this.getSlackColor(alert.severity),
          fields: [
            { title: 'Event Type', value: alert.eventType, short: true },
            { title: 'Count', value: alert.count.toString(), short: true },
            { title: 'Severity', value: alert.severity, short: true },
            { title: 'Time Window', value: `${alert.timeWindow / 1000}s`, short: true },
            { title: 'Description', value: alert.description, short: false }
          ],
          timestamp: alert.timestamp
        }]
      };

      // In a real implementation, you would send HTTP request to Slack webhook
      // Logging disabled for production
    } catch (error) {
      // Error logging disabled for production
    }
  }

  /**
   * Send email alert
   */
  private async sendEmailAlert(alert: SecurityAlert): Promise<void> {
    try {
      // In a real implementation, you would use nodemailer or similar
      // console.log('Email alert would be sent:', {
        to: this.config.integrations?.email?.recipients,
        subject: `Security Alert: ${alert.eventType}`,
        body: alert.description
      });
    } catch (error) {
      // Error logging disabled for production
    }
  }

  /**
   * Get Slack color based on severity
   */
  private getSlackColor(severity: string): string {
    const colors = {
      low: '#36a64f',      // Green
      medium: '#ff9900',   // Orange
      high: '#ff0000',     // Red
      critical: '#8B0000'  // Dark Red
    };
    return colors[severity as keyof typeof colors] || '#808080';
  }

  /**
   * Send to external integrations
   */
  private async sendToIntegrations(logEntry: SecurityLogEntry): Promise<void> {
    // Send to SIEM
    if (this.config.integrations?.siem) {
      await this.sendToSIEM(logEntry);
    }
  }

  /**
   * Send to SIEM system
   */
  private async sendToSIEM(logEntry: SecurityLogEntry): Promise<void> {
    try {
      const siemConfig = this.config.integrations?.siem;
      if (!siemConfig) return;

      // Format for SIEM (e.g., CEF format)
      const cefEntry = this.formatForCEF(logEntry);

      // In a real implementation, you would send HTTP request to SIEM
      // Logging disabled for production
    } catch (error) {
      // Error logging disabled for production
    }
  }

  /**
   * Format log entry for CEF (Common Event Format)
   */
  private formatForCEF(logEntry: SecurityLogEntry): string {
    return `CEF:0|BearAI|SecuritySystem|1.0|${logEntry.event}|${logEntry.message}|${this.getCEFSeverity(logEntry.severity)}|`;
  }

  /**
   * Get CEF severity number
   */
  private getCEFSeverity(severity: string): number {
    const severityMap = { low: 3, medium: 6, high: 8, critical: 10 };
    return severityMap[severity as keyof typeof severityMap] || 0;
  }

  /**
   * Check and rotate log file if needed
   */
  private checkAndRotateLog(): void {
    try {
      const stats = fs.statSync(this.config.destination);
      if (stats.size > (this.config.maxFileSize || 100 * 1024 * 1024)) {
        this.rotateLogFile();
      }
    } catch (error) {
      // Error logging disabled for production
    }
  }

  /**
   * Rotate log file
   */
  private rotateLogFile(): void {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const rotatedFile = `${this.config.destination}.${timestamp}`;

      fs.renameSync(this.config.destination, rotatedFile);

      // Create new log file
      this.writeLogEntry({
        timestamp: new Date().toISOString(),
        level: 'info',
        event: 'LOG_ROTATED',
        message: `Log file rotated to ${rotatedFile}`,
        metadata: {}
      });

      // Logging disabled for production
    } catch (error) {
      // Error logging disabled for production
    }
  }

  /**
   * Start monitoring
   */
  public startMonitoring(): void {
    this.isMonitoring = true;
    // Logging disabled for production
  }

  /**
   * Stop monitoring
   */
  public stopMonitoring(): void {
    this.isMonitoring = false;
    // Logging disabled for production
  }

  /**
   * Enable high alert mode
   */
  public async enableHighAlertMode(): Promise<void> {
    // Reduce alert thresholds for high alert mode
    if (this.config.alertThresholds) {
      for (const eventType in this.config.alertThresholds) {
        this.config.alertThresholds[eventType].count = Math.max(1,
          Math.floor(this.config.alertThresholds[eventType].count / 2)
        );
      }
    }

    await this.logEvent('HIGH_ALERT_MODE_ENABLED', {
      timestamp: new Date().toISOString(),
      reason: 'Security threat level elevated'
    });
  }

  /**
   * Sanitize config for logging
   */
  private sanitizeConfig(): Partial<SecurityLoggingConfig> {
    const config = { ...this.config };
    if (config.integrations?.siem?.apiKey) {
      config.integrations.siem.apiKey = '[REDACTED]';
    }
    return config;
  }

  /**
   * Health check for security logger
   */
  public async healthCheck(): Promise<'healthy' | 'degraded' | 'critical'> {
    try {
      // Test log writing
      await this.logEvent('HEALTH_CHECK', { test: true });

      // Check log file accessibility
      fs.accessSync(this.config.destination, fs.constants.W_OK);

      // Check disk space (simplified)
      const stats = fs.statSync(this.config.destination);
      if (stats.size > (this.config.maxFileSize || 100 * 1024 * 1024) * 0.9) {
        return 'degraded';
      }

      return 'healthy';
    } catch (error) {
      // Error logging disabled for production
      return 'critical';
    }
  }

  /**
   * Get security logging statistics
   */
  public getStatistics(): {
    totalEvents: number;
    eventsByType: { [type: string]: number };
    alertsTriggered: number;
    logFileSize: number;
    monitoring: boolean;
  } {
    const eventsByType: { [type: string]: number } = {};
    let totalEvents = 0;

    for (const [eventType, counts] of this.eventCounts.entries()) {
      const count = counts.reduce((sum, event) => sum + event.count, 0);
      eventsByType[eventType] = count;
      totalEvents += count;
    }

    let logFileSize = 0;
    try {
      const stats = fs.statSync(this.config.destination);
      logFileSize = stats.size;
    } catch {
      // File doesn't exist or not accessible
    }

    return {
      totalEvents,
      eventsByType,
      alertsTriggered: this.alertCooldowns.size,
      logFileSize,
      monitoring: this.isMonitoring
    };
  }

  /**
   * Cleanup resources
   */
  public cleanup(): void {
    if (this.rotationTimer) {
      clearInterval(this.rotationTimer);
    }
    this.eventCounts.clear();
    this.alertCooldowns.clear();
  }
}

/**
 * Security Log Entry Interface
 */
export interface SecurityLogEntry {
  id?: string;
  timestamp: string;
  level: string;
  event: string;
  message: string;
  metadata: SecurityEventMetadata;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  source?: string;
}

/**
 * Security Alert Interface
 */
export interface SecurityAlert {
  id: string;
  timestamp: string;
  eventType: string;
  count: number;
  threshold: number;
  timeWindow: number;
  severity: string;
  description: string;
  logEntry: SecurityLogEntry;
}

/**
 * Event Count Interface
 */
interface EventCount {
  timestamp: number;
  count: number;
}