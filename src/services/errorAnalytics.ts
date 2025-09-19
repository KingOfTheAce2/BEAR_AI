/**
 * Error Analytics Service for BEAR AI
 * Provides lightweight in-memory analytics suitable for alpha builds.
 */

import type { Logger } from './logger';
import type {
  ErrorContext,
  ErrorSeverity,
  ProcessedError,
} from './errorHandler';

export interface ErrorAnalyticsConfig {
  enableRealTimeTracking: boolean;
  enableAlerts: boolean;
  enableTrends: boolean;
  retentionDays: number;
}

export interface ErrorResolutionStats {
  averageResolutionTime: number;
  resolvedCount: number;
  unresolvedCount: number;
}

export type ErrorSeverityCounts = Record<ErrorSeverity, number>;

export interface ErrorTrendPoint {
  timestamp: Date;
  total: number;
  resolved: number;
}

export interface ErrorMetrics {
  totalErrors: number;
  errorRate: number;
  errorsBySeverity: ErrorSeverityCounts;
  resolutionStats: ErrorResolutionStats;
  trend: ErrorTrendPoint[];
}

export interface ErrorAlert {
  id: string;
  severity: ErrorSeverity;
  message: string;
  timestamp: Date;
  resolved: boolean;
  context?: Partial<ErrorContext>;
}

export interface ErrorReport {
  id: string;
  message: string;
  stack?: string;
  severity: ErrorSeverity;
  context: ErrorContext;
  timestamp: Date;
  resolvedAt?: Date;
  resolutionType?: 'manual' | 'auto';
}

export interface ErrorAnalyticsService {
  track(error: Error, context?: Partial<ErrorContext>): void;
  trackError(processedError: ProcessedError): void;
  markResolved(errorId: string, resolutionType?: 'manual' | 'auto'): void;
  getActiveAlerts(): ErrorAlert[];
  getMetrics(): Promise<ErrorMetrics>;
  getReports(): ErrorReport[];
  flush(): Promise<void>;
}

const DEFAULT_CONFIG: ErrorAnalyticsConfig = {
  enableRealTimeTracking: true,
  enableAlerts: true,
  enableTrends: true,
  retentionDays: 30,
};

const createSeverityCounter = (): ErrorSeverityCounts => ({
  low: 0,
  medium: 0,
  high: 0,
  critical: 0,
});

const HISTORY_WINDOW_MS = 60 * 60 * 1000; // 1 hour rolling window

export class DefaultErrorAnalytics implements ErrorAnalyticsService {
  private logger?: Logger;
  private config: ErrorAnalyticsConfig;
  private reports: ErrorReport[] = [];
  private alerts: ErrorAlert[] = [];

  constructor(logger?: Logger, config: Partial<ErrorAnalyticsConfig> = {}) {
    this.logger = logger;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  track(error: Error, context: Partial<ErrorContext> = {}): void {
    const processed: ProcessedError = {
      id: `runtime-${Date.now()}`,
      originalError: error,
      message: error.message,
      stack: error.stack,
      severity: 'medium',
      category: 'unknown',
      context: {
        timestamp: new Date(),
        ...context,
      } as ErrorContext,
      userFriendlyMessage: error.message,
      actionable: false,
      recoverable: false,
      retryable: false,
      suggestions: [],
      reportingData: {
        fingerprint: 'runtime',
        aggregationKey: 'runtime',
        metadata: context,
        breadcrumbs: [],
      },
    };

    this.trackError(processed);
  }

  trackError(processedError: ProcessedError): void {
    const report: ErrorReport = {
      id: processedError.id,
      message: processedError.message,
      stack: processedError.stack,
      severity: processedError.severity,
      context: processedError.context,
      timestamp: processedError.context.timestamp || new Date(),
    };

    this.reports.push(report);
    this.logger?.warn?.('Tracked error', { id: report.id, severity: report.severity });

    if (this.config.enableAlerts && (processedError.severity === 'high' || processedError.severity === 'critical')) {
      this.alerts.push({
        id: `${report.id}-alert`,
        severity: processedError.severity,
        message: processedError.userFriendlyMessage || processedError.message,
        timestamp: new Date(),
        resolved: false,
        context: processedError.context,
      });
    }

    this.pruneHistory();
  }

  markResolved(errorId: string, resolutionType: 'manual' | 'auto' = 'manual'): void {
    const report = this.reports.find((entry) => entry.id === errorId);
    if (report) {
      report.resolvedAt = new Date();
      report.resolutionType = resolutionType;
    }

    this.alerts = this.alerts.map((alert) =>
      alert.id.startsWith(errorId)
        ? { ...alert, resolved: true }
        : alert
    );
  }

  getActiveAlerts(): ErrorAlert[] {
    return this.alerts.filter((alert) => !alert.resolved);
  }

  async getMetrics(): Promise<ErrorMetrics> {
    this.pruneHistory();

    const severityCounts = createSeverityCounter();
    for (const report of this.reports) {
      severityCounts[report.severity] = (severityCounts[report.severity] || 0) + 1;
    }

    const resolved = this.reports.filter((report) => report.resolvedAt);
    const unresolved = this.reports.length - resolved.length;

    const averageResolutionTime = resolved.length
      ? resolved.reduce((total, report) => {
          const resolutionDuration = report.resolvedAt!.getTime() - report.timestamp.getTime();
          return total + Math.max(resolutionDuration, 0);
        }, 0) / resolved.length
      : 0;

    const cutoff = Date.now() - HISTORY_WINDOW_MS;
    const recentErrors = this.reports.filter((report) => report.timestamp.getTime() >= cutoff);
    const errorRate = recentErrors.length / (HISTORY_WINDOW_MS / (60 * 1000));

    return {
      totalErrors: this.reports.length,
      errorRate,
      errorsBySeverity: severityCounts,
      resolutionStats: {
        averageResolutionTime,
        resolvedCount: resolved.length,
        unresolvedCount: unresolved,
      },
      trend: this.generateTrend(),
    };
  }

  getReports(): ErrorReport[] {
    return [...this.reports];
  }

  async flush(): Promise<void> {
    this.logger?.info?.('Flushing error analytics');
  }

  private pruneHistory(): void {
    if (!this.reports.length) {
      return;
    }

    const retentionCutoff = Date.now() - this.config.retentionDays * 24 * 60 * 60 * 1000;
    this.reports = this.reports.filter((report) => report.timestamp.getTime() >= retentionCutoff);
    this.alerts = this.alerts.filter((alert) => alert.timestamp.getTime() >= retentionCutoff);
  }

  private generateTrend(): ErrorTrendPoint[] {
    if (!this.config.enableTrends || this.reports.length === 0) {
      return [];
    }

    const buckets = new Map<string, { total: number; resolved: number }>();

    for (const report of this.reports) {
      const bucketKey = report.timestamp.toISOString().slice(0, 10);
      const bucket = buckets.get(bucketKey) || { total: 0, resolved: 0 };
      bucket.total += 1;
      if (report.resolvedAt) {
        bucket.resolved += 1;
      }
      buckets.set(bucketKey, bucket);
    }

    return Array.from(buckets.entries())
      .sort(([a], [b]) => (a > b ? 1 : -1))
      .map(([date, values]) => ({
        timestamp: new Date(date),
        total: values.total,
        resolved: values.resolved,
      }));
  }
}

let globalErrorAnalytics: ErrorAnalyticsService | null = null;

export const createErrorAnalytics = (
  logger?: Logger,
  config: Partial<ErrorAnalyticsConfig> = {}
): ErrorAnalyticsService => new DefaultErrorAnalytics(logger, config);

export const setGlobalErrorAnalytics = (service: ErrorAnalyticsService): void => {
  globalErrorAnalytics = service;
};

export const getGlobalErrorAnalytics = (): ErrorAnalyticsService | null => {
  return globalErrorAnalytics;
};

export const errorAnalytics = new DefaultErrorAnalytics();

export default errorAnalytics;
