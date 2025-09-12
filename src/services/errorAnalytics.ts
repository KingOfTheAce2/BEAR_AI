/**
 * BEAR AI Error Analytics and Reporting Service
 * Comprehensive error tracking, analytics, and reporting system
 * 
 * @file Error analytics service with metrics and reporting
 * @version 2.0.0
 */

import { EventEmitter } from 'events';
import { ProcessedError, ErrorCategory, ErrorSeverity } from './errorHandler';
import { Logger } from './logger';

// ==================== INTERFACES ====================

export interface ErrorMetrics {
  totalErrors: number;
  uniqueErrors: number;
  errorRate: number;
  meanTimeToResolution: number;
  errorsByCategory: Record<ErrorCategory, number>;
  errorsBySeverity: Record<ErrorSeverity, number>;
  errorsByComponent: Record<string, number>;
  errorsByUser: Record<string, number>;
  topErrors: Array<{
    fingerprint: string;
    count: number;
    lastOccurred: Date;
    category: ErrorCategory;
    severity: ErrorSeverity;
    message: string;
  }>;
  resolutionStats: {
    autoResolved: number;
    userResolved: number;
    unresolved: number;
    averageResolutionTime: number;
  };
  trends: {
    hourly: number[];
    daily: number[];
    weekly: number[];
  };
}

export interface ErrorTrend {
  timestamp: Date;
  count: number;
  category?: ErrorCategory;
  severity?: ErrorSeverity;
  component?: string;
}

export interface ErrorAlert {
  id: string;
  type: 'spike' | 'threshold' | 'critical' | 'pattern';
  message: string;
  severity: ErrorSeverity;
  timestamp: Date;
  data: Record<string, any>;
  triggered: boolean;
}

export interface ErrorAnalyticsConfig {
  enableRealTimeTracking: boolean;
  enableAlerts: boolean;
  enableTrends: boolean;
  enableUserTracking: boolean;
  retentionDays: number;
  alertThresholds: {
    errorRateThreshold: number;
    criticalErrorThreshold: number;
    spikeMultiplier: number;
  };
  reportingEndpoints: {
    metrics?: string;
    alerts?: string;
    reports?: string;
  };
}

export interface ErrorReport {
  id: string;
  title: string;
  summary: string;
  timeRange: {
    start: Date;
    end: Date;
  };
  metrics: ErrorMetrics;
  insights: string[];
  recommendations: string[];
  attachments: Array<{
    name: string;
    type: string;
    data: any;
  }>;
  generatedAt: Date;
}

// ==================== ERROR ANALYTICS SERVICE ====================

export class ErrorAnalyticsService extends EventEmitter {
  private config: ErrorAnalyticsConfig;
  private logger: Logger;
  private errorHistory: ProcessedError[] = [];
  private errorTrends: ErrorTrend[] = [];
  private activeAlerts: ErrorAlert[] = [];
  private resolutionTimes = new Map<string, number>();
  private userSessions = new Map<string, { errors: number; startTime: Date }>();
  private metricsCache: { metrics: ErrorMetrics; timestamp: Date } | null = null;
  private cacheTTL = 5 * 60 * 1000; // 5 minutes

  constructor(logger: Logger, config: Partial<ErrorAnalyticsConfig> = {}) {
    super();
    this.logger = logger;
    this.config = {
      enableRealTimeTracking: true,
      enableAlerts: true,
      enableTrends: true,
      enableUserTracking: true,
      retentionDays: 30,
      alertThresholds: {
        errorRateThreshold: 10, // errors per minute
        criticalErrorThreshold: 1, // critical errors per hour
        spikeMultiplier: 3 // 3x normal rate
      },
      reportingEndpoints: {},
      ...config
    };

    this.startCleanupTimer();
    this.startTrendTracking();
  }

  // ==================== ERROR TRACKING ====================

  /**
   * Track a processed error
   */
  trackError(error: ProcessedError): void {
    // Add to history
    this.errorHistory.push(error);
    
    // Track user session if enabled
    if (this.config.enableUserTracking && error.context.userId) {
      this.trackUserError(error.context.userId);
    }

    // Update trends if enabled
    if (this.config.enableTrends) {
      this.updateTrends(error);
    }

    // Check for alerts if enabled
    if (this.config.enableAlerts) {
      this.checkForAlerts(error);
    }

    // Invalidate cache
    this.metricsCache = null;

    // Emit tracking event
    this.emit('errorTracked', error);

    // Log tracking
    this.logger.debug('Error tracked in analytics', {
      errorId: error.id,
      category: error.category,
      severity: error.severity,
      component: error.context.component
    });
  }

  /**
   * Mark an error as resolved
   */
  markResolved(errorId: string, resolutionMethod: 'auto' | 'user', resolutionTime?: number): void {
    const error = this.errorHistory.find(e => e.id === errorId);
    if (!error) return;

    const actualResolutionTime = resolutionTime || Date.now() - error.context.timestamp.getTime();
    this.resolutionTimes.set(errorId, actualResolutionTime);

    this.logger.info('Error marked as resolved', {
      errorId,
      resolutionMethod,
      resolutionTime: actualResolutionTime
    });

    this.emit('errorResolved', { errorId, resolutionMethod, resolutionTime: actualResolutionTime });
  }

  // ==================== METRICS GENERATION ====================

  /**
   * Get comprehensive error metrics
   */
  async getMetrics(timeRange?: { start: Date; end: Date }): Promise<ErrorMetrics> {
    // Check cache
    if (this.metricsCache && Date.now() - this.metricsCache.timestamp.getTime() < this.cacheTTL) {
      return this.metricsCache.metrics;
    }

    const errors = this.getFilteredErrors(timeRange);
    const resolvedErrors = Array.from(this.resolutionTimes.keys());

    const metrics: ErrorMetrics = {
      totalErrors: errors.length,
      uniqueErrors: new Set(errors.map(e => e.reportingData.fingerprint)).size,
      errorRate: this.calculateErrorRate(errors, timeRange),
      meanTimeToResolution: this.calculateMeanTimeToResolution(),
      errorsByCategory: this.groupByCategory(errors),
      errorsBySeverity: this.groupBySeverity(errors),
      errorsByComponent: this.groupByComponent(errors),
      errorsByUser: this.groupByUser(errors),
      topErrors: this.getTopErrors(errors, 10),
      resolutionStats: {
        autoResolved: resolvedErrors.filter(id => 
          errors.find(e => e.id === id)?.reportingData.metadata.resolutionMethod === 'auto'
        ).length,
        userResolved: resolvedErrors.filter(id => 
          errors.find(e => e.id === id)?.reportingData.metadata.resolutionMethod === 'user'
        ).length,
        unresolved: errors.length - resolvedErrors.length,
        averageResolutionTime: this.calculateMeanTimeToResolution()
      },
      trends: this.calculateTrends(errors)
    };

    // Cache metrics
    this.metricsCache = {
      metrics,
      timestamp: new Date()
    };

    return metrics;
  }

  /**
   * Get error trends over time
   */
  getTrends(timeRange?: { start: Date; end: Date }, granularity: 'hour' | 'day' | 'week' = 'hour'): ErrorTrend[] {
    const trends = timeRange 
      ? this.errorTrends.filter(t => t.timestamp >= timeRange.start && t.timestamp <= timeRange.end)
      : this.errorTrends;

    // Group by granularity
    const grouped = this.groupTrendsByGranularity(trends, granularity);
    return grouped;
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): ErrorAlert[] {
    return this.activeAlerts.filter(alert => alert.triggered);
  }

  // ==================== REPORTING ====================

  /**
   * Generate comprehensive error report
   */
  async generateReport(
    timeRange: { start: Date; end: Date },
    title?: string
  ): Promise<ErrorReport> {
    const metrics = await this.getMetrics(timeRange);
    const insights = this.generateInsights(metrics);
    const recommendations = this.generateRecommendations(metrics);

    const report: ErrorReport = {
      id: `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: title || `Error Analysis Report - ${timeRange.start.toLocaleDateString()} to ${timeRange.end.toLocaleDateString()}`,
      summary: this.generateReportSummary(metrics),
      timeRange,
      metrics,
      insights,
      recommendations,
      attachments: [
        {
          name: 'error_metrics.json',
          type: 'application/json',
          data: metrics
        },
        {
          name: 'error_trends.json',
          type: 'application/json',
          data: this.getTrends(timeRange)
        }
      ],
      generatedAt: new Date()
    };

    this.logger.info('Error report generated', {
      reportId: report.id,
      timeRange,
      totalErrors: metrics.totalErrors
    });

    this.emit('reportGenerated', report);
    return report;
  }

  /**
   * Export error data
   */
  exportData(format: 'json' | 'csv', timeRange?: { start: Date; end: Date }): string {
    const errors = this.getFilteredErrors(timeRange);

    if (format === 'json') {
      return JSON.stringify(errors, null, 2);
    } else {
      return this.convertToCSV(errors);
    }
  }

  // ==================== PRIVATE METHODS ====================

  private getFilteredErrors(timeRange?: { start: Date; end: Date }): ProcessedError[] {
    if (!timeRange) return [...this.errorHistory];

    return this.errorHistory.filter(error => 
      error.context.timestamp >= timeRange.start && 
      error.context.timestamp <= timeRange.end
    );
  }

  private calculateErrorRate(errors: ProcessedError[], timeRange?: { start: Date; end: Date }): number {
    if (errors.length === 0) return 0;

    const range = timeRange || {
      start: new Date(Date.now() - 60 * 60 * 1000), // Last hour
      end: new Date()
    };

    const minutes = (range.end.getTime() - range.start.getTime()) / (1000 * 60);
    return errors.length / Math.max(minutes, 1);
  }

  private calculateMeanTimeToResolution(): number {
    const resolutionTimes = Array.from(this.resolutionTimes.values());
    if (resolutionTimes.length === 0) return 0;

    return resolutionTimes.reduce((sum, time) => sum + time, 0) / resolutionTimes.length;
  }

  private groupByCategory(errors: ProcessedError[]): Record<ErrorCategory, number> {
    const groups = {} as Record<ErrorCategory, number>;
    
    // Initialize all categories
    (['network', 'authentication', 'permission', 'validation', 'storage', 'memory', 
      'ai-inference', 'parsing', 'system', 'user-input', 'component', 'api', 'unknown'] as ErrorCategory[])
      .forEach(cat => groups[cat] = 0);

    errors.forEach(error => {
      groups[error.category] = (groups[error.category] || 0) + 1;
    });

    return groups;
  }

  private groupBySeverity(errors: ProcessedError[]): Record<ErrorSeverity, number> {
    const groups = {} as Record<ErrorSeverity, number>;
    
    // Initialize all severities
    (['low', 'medium', 'high', 'critical'] as ErrorSeverity[])
      .forEach(sev => groups[sev] = 0);

    errors.forEach(error => {
      groups[error.severity] = (groups[error.severity] || 0) + 1;
    });

    return groups;
  }

  private groupByComponent(errors: ProcessedError[]): Record<string, number> {
    const groups: Record<string, number> = {};

    errors.forEach(error => {
      const component = error.context.component || 'unknown';
      groups[component] = (groups[component] || 0) + 1;
    });

    return groups;
  }

  private groupByUser(errors: ProcessedError[]): Record<string, number> {
    const groups: Record<string, number> = {};

    errors.forEach(error => {
      const userId = error.context.userId || 'anonymous';
      groups[userId] = (groups[userId] || 0) + 1;
    });

    return groups;
  }

  private getTopErrors(errors: ProcessedError[], limit: number): Array<{
    fingerprint: string;
    count: number;
    lastOccurred: Date;
    category: ErrorCategory;
    severity: ErrorSeverity;
    message: string;
  }> {
    const errorCounts = new Map<string, {
      count: number;
      lastOccurred: Date;
      category: ErrorCategory;
      severity: ErrorSeverity;
      message: string;
    }>();

    errors.forEach(error => {
      const fingerprint = error.reportingData.fingerprint;
      const existing = errorCounts.get(fingerprint);

      if (existing) {
        existing.count++;
        if (error.context.timestamp > existing.lastOccurred) {
          existing.lastOccurred = error.context.timestamp;
        }
      } else {
        errorCounts.set(fingerprint, {
          count: 1,
          lastOccurred: error.context.timestamp,
          category: error.category,
          severity: error.severity,
          message: error.message
        });
      }
    });

    return Array.from(errorCounts.entries())
      .map(([fingerprint, data]) => ({ fingerprint, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  private calculateTrends(errors: ProcessedError[]): { hourly: number[]; daily: number[]; weekly: number[] } {
    const now = new Date();
    
    // Hourly trends (last 24 hours)
    const hourly = Array(24).fill(0);
    // Daily trends (last 7 days)
    const daily = Array(7).fill(0);
    // Weekly trends (last 4 weeks)
    const weekly = Array(4).fill(0);

    errors.forEach(error => {
      const errorTime = error.context.timestamp;
      const hoursAgo = Math.floor((now.getTime() - errorTime.getTime()) / (1000 * 60 * 60));
      const daysAgo = Math.floor(hoursAgo / 24);
      const weeksAgo = Math.floor(daysAgo / 7);

      if (hoursAgo < 24) {
        hourly[23 - hoursAgo]++;
      }
      
      if (daysAgo < 7) {
        daily[6 - daysAgo]++;
      }
      
      if (weeksAgo < 4) {
        weekly[3 - weeksAgo]++;
      }
    });

    return { hourly, daily, weekly };
  }

  private trackUserError(userId: string): void {
    const session = this.userSessions.get(userId);
    if (session) {
      session.errors++;
    } else {
      this.userSessions.set(userId, {
        errors: 1,
        startTime: new Date()
      });
    }
  }

  private updateTrends(error: ProcessedError): void {
    const trend: ErrorTrend = {
      timestamp: error.context.timestamp,
      count: 1,
      category: error.category,
      severity: error.severity,
      component: error.context.component
    };

    this.errorTrends.push(trend);

    // Keep only recent trends
    const cutoff = new Date(Date.now() - this.config.retentionDays * 24 * 60 * 60 * 1000);
    this.errorTrends = this.errorTrends.filter(t => t.timestamp >= cutoff);
  }

  private checkForAlerts(error: ProcessedError): void {
    const now = new Date();
    const { alertThresholds } = this.config;

    // Critical error alert
    if (error.severity === 'critical') {
      const recentCritical = this.errorHistory.filter(e => 
        e.severity === 'critical' && 
        now.getTime() - e.context.timestamp.getTime() < 60 * 60 * 1000 // Last hour
      );

      if (recentCritical.length >= alertThresholds.criticalErrorThreshold) {
        this.createAlert('critical', `${recentCritical.length} critical errors in the last hour`, 'critical', {
          count: recentCritical.length,
          errors: recentCritical.map(e => ({ id: e.id, message: e.message }))
        });
      }
    }

    // Error rate spike alert
    const recentErrors = this.errorHistory.filter(e => 
      now.getTime() - e.context.timestamp.getTime() < 60 * 1000 // Last minute
    );

    if (recentErrors.length >= alertThresholds.errorRateThreshold) {
      this.createAlert('spike', `Error rate spike: ${recentErrors.length} errors in the last minute`, 'high', {
        count: recentErrors.length,
        rate: recentErrors.length
      });
    }
  }

  private createAlert(type: ErrorAlert['type'], message: string, severity: ErrorSeverity, data: Record<string, any>): void {
    const alert: ErrorAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      message,
      severity,
      timestamp: new Date(),
      data,
      triggered: true
    };

    this.activeAlerts.push(alert);

    this.logger.warn('Error alert triggered', {
      alertId: alert.id,
      type: alert.type,
      message: alert.message
    });

    this.emit('alertTriggered', alert);
  }

  private groupTrendsByGranularity(trends: ErrorTrend[], granularity: 'hour' | 'day' | 'week'): ErrorTrend[] {
    // Implementation would group trends by the specified granularity
    // For now, return as-is
    return trends;
  }

  private generateInsights(metrics: ErrorMetrics): string[] {
    const insights: string[] = [];

    // Error rate insights
    if (metrics.errorRate > 10) {
      insights.push(`High error rate detected: ${metrics.errorRate.toFixed(2)} errors per minute`);
    }

    // Top error category
    const topCategory = Object.entries(metrics.errorsByCategory)
      .reduce((a, b) => a[1] > b[1] ? a : b);
    if (topCategory[1] > 0) {
      insights.push(`Most common error category: ${topCategory[0]} (${topCategory[1]} errors)`);
    }

    // Resolution rate
    const resolutionRate = (metrics.resolutionStats.autoResolved + metrics.resolutionStats.userResolved) / 
                          metrics.totalErrors * 100;
    insights.push(`Resolution rate: ${resolutionRate.toFixed(1)}%`);

    // Trend analysis
    const recentTrend = metrics.trends.daily.slice(-2);
    if (recentTrend.length === 2 && recentTrend[1] > recentTrend[0] * 1.5) {
      insights.push('Error count is trending upward in recent days');
    }

    return insights;
  }

  private generateRecommendations(metrics: ErrorMetrics): string[] {
    const recommendations: string[] = [];

    // High error rate recommendations
    if (metrics.errorRate > 10) {
      recommendations.push('Implement rate limiting and circuit breakers');
      recommendations.push('Review and optimize error-prone components');
    }

    // Memory error recommendations
    if (metrics.errorsByCategory.memory > metrics.totalErrors * 0.1) {
      recommendations.push('Implement memory monitoring and cleanup routines');
      recommendations.push('Consider upgrading system memory or optimizing memory usage');
    }

    // Network error recommendations
    if (metrics.errorsByCategory.network > metrics.totalErrors * 0.2) {
      recommendations.push('Implement retry mechanisms with exponential backoff');
      recommendations.push('Add offline support and caching strategies');
    }

    // Resolution time recommendations
    if (metrics.meanTimeToResolution > 300000) { // 5 minutes
      recommendations.push('Improve error recovery mechanisms');
      recommendations.push('Provide better user guidance for error resolution');
    }

    return recommendations;
  }

  private generateReportSummary(metrics: ErrorMetrics): string {
    return `
Analyzed ${metrics.totalErrors} errors with ${metrics.uniqueErrors} unique error patterns.
Current error rate: ${metrics.errorRate.toFixed(2)} errors per minute.
Resolution rate: ${((metrics.resolutionStats.autoResolved + metrics.resolutionStats.userResolved) / metrics.totalErrors * 100).toFixed(1)}%.
Most common category: ${Object.entries(metrics.errorsByCategory).reduce((a, b) => a[1] > b[1] ? a : b)[0]}.
    `.trim();
  }

  private convertToCSV(errors: ProcessedError[]): string {
    const headers = [
      'ID', 'Timestamp', 'Message', 'Category', 'Severity', 'Component', 
      'User ID', 'Recoverable', 'Retryable', 'Fingerprint'
    ];

    const rows = errors.map(error => [
      error.id,
      error.context.timestamp.toISOString(),
      error.message.replace(/"/g, '""'),
      error.category,
      error.severity,
      error.context.component || '',
      error.context.userId || '',
      error.recoverable.toString(),
      error.retryable.toString(),
      error.reportingData.fingerprint
    ]);

    return [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
  }

  private startCleanupTimer(): void {
    // Clean up old data every hour
    setInterval(() => {
      const cutoff = new Date(Date.now() - this.config.retentionDays * 24 * 60 * 60 * 1000);
      
      this.errorHistory = this.errorHistory.filter(e => e.context.timestamp >= cutoff);
      this.errorTrends = this.errorTrends.filter(t => t.timestamp >= cutoff);
      this.activeAlerts = this.activeAlerts.filter(a => a.timestamp >= cutoff);
      
      // Clear old user sessions
      for (const [userId, session] of this.userSessions.entries()) {
        if (session.startTime < cutoff) {
          this.userSessions.delete(userId);
        }
      }

      this.logger.debug('Error analytics cleanup completed');
    }, 60 * 60 * 1000); // Every hour
  }

  private startTrendTracking(): void {
    if (!this.config.enableTrends) return;

    // Update trend aggregations every 5 minutes
    setInterval(() => {
      // Aggregate recent errors into trends
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
      
      const recentErrors = this.errorHistory.filter(e => 
        e.context.timestamp >= fiveMinutesAgo && e.context.timestamp <= now
      );

      if (recentErrors.length > 0) {
        const trend: ErrorTrend = {
          timestamp: now,
          count: recentErrors.length
        };

        this.errorTrends.push(trend);
      }
    }, 5 * 60 * 1000); // Every 5 minutes
  }
}

// ==================== EXPORTS ====================

export default ErrorAnalyticsService;

// Global analytics instance
let globalAnalytics: ErrorAnalyticsService | null = null;

export const createErrorAnalytics = (logger: Logger, config?: Partial<ErrorAnalyticsConfig>): ErrorAnalyticsService => {
  return new ErrorAnalyticsService(logger, config);
};

export const setGlobalErrorAnalytics = (analytics: ErrorAnalyticsService): void => {
  globalAnalytics = analytics;
};

export const getGlobalErrorAnalytics = (): ErrorAnalyticsService | null => {
  return globalAnalytics;
};