// Queue Monitoring and Performance Metrics System

import { QueueMetrics, QueueHealthStatus, QueueStats, SystemResources, RequestStatus } from '../types';

interface MetricSnapshot {
  timestamp: number;
  metrics: QueueMetrics;
}

interface PerformanceAlert {
  id: string;
  type: 'warning' | 'critical';
  message: string;
  timestamp: number;
  acknowledged: boolean;
  resolvedAt?: number;
}

interface MetricThresholds {
  maxAverageLatency: number;
  maxErrorRate: number;
  maxQueueLength: number;
  minThroughput: number;
  maxCpuUsage: number;
  maxMemoryUsage: number;
}

export class QueueMetricsCollector {
  private metrics: QueueMetrics;
  private history: MetricSnapshot[] = [];
  private maxHistorySize: number;
  private alerts: Map<string, PerformanceAlert> = new Map();
  private thresholds: MetricThresholds;
  private collectionInterval: number;
  private collectionTimer?: NodeJS.Timeout;
  private subscribers: Set<(metrics: QueueMetrics) => void> = new Set();

  constructor(
    maxHistorySize = 1000,
    collectionInterval = 5000,
    thresholds: MetricThresholds = {
      maxAverageLatency: 5000,
      maxErrorRate: 0.05,
      maxQueueLength: 100,
      minThroughput: 10,
      maxCpuUsage: 0.85,
      maxMemoryUsage: 0.80
    }
  ) {
    this.maxHistorySize = maxHistorySize;
    this.collectionInterval = collectionInterval;
    this.thresholds = thresholds;
    
    this.metrics = this.initializeMetrics();
    this.startCollection();
  }

  /**
   * Subscribe to metrics updates
   */
  subscribe(callback: (metrics: QueueMetrics) => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  /**
   * Get current metrics
   */
  getCurrentMetrics(): QueueMetrics {
    return { ...this.metrics };
  }

  /**
   * Get metrics history
   */
  getHistory(duration?: number): MetricSnapshot[] {
    if (!duration) {
      return [...this.history];
    }

    const cutoff = Date.now() - duration;
    return this.history.filter(snapshot => snapshot.timestamp >= cutoff);
  }

  /**
   * Update queue statistics
   */
  updateQueueStats(stats: QueueStats): void {
    this.metrics.totalRequests = stats.queueLength + this.metrics.completedRequests + this.metrics.failedRequests;
    this.metrics.pendingRequests = stats.queueLength;
    this.metrics.processingRequests = stats.activeWorkers;
    this.metrics.throughput = stats.requestsPerSecond;
    this.metrics.averageWaitTime = stats.averageLatency;
    this.metrics.resourceUtilization = stats.resourceUsage;
    
    this.updateHealthStatus();
    this.notifySubscribers();
  }

  /**
   * Record request completion
   */
  recordRequestCompletion(duration: number, success: boolean): void {
    if (success) {
      this.metrics.completedRequests++;
    } else {
      this.metrics.failedRequests++;
    }

    // Update average processing time (exponential moving average)
    const alpha = 0.1;
    this.metrics.averageProcessingTime = 
      this.metrics.averageProcessingTime * (1 - alpha) + duration * alpha;

    this.updateHealthStatus();
    this.checkThresholds();
    this.notifySubscribers();
  }

  /**
   * Update resource utilization
   */
  updateResourceUtilization(resources: SystemResources): void {
    this.metrics.resourceUtilization = { ...resources };
    this.updateHealthStatus();
    this.checkThresholds();
    this.notifySubscribers();
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(duration = 3600000): PerformanceSummary {
    const recentHistory = this.getHistory(duration);
    
    if (recentHistory.length === 0) {
      return this.createEmptyPerformanceSummary();
    }

    const latencies = recentHistory.map(h => h.metrics.averageProcessingTime);
    const throughputs = recentHistory.map(h => h.metrics.throughput);
    const errorRates = recentHistory.map(h => 
      h.metrics.failedRequests / (h.metrics.completedRequests + h.metrics.failedRequests) || 0
    );

    return {
      duration,
      totalRequests: this.metrics.totalRequests,
      completedRequests: this.metrics.completedRequests,
      failedRequests: this.metrics.failedRequests,
      averageLatency: this.calculateAverage(latencies),
      medianLatency: this.calculateMedian(latencies),
      p95Latency: this.calculatePercentile(latencies, 0.95),
      p99Latency: this.calculatePercentile(latencies, 0.99),
      averageThroughput: this.calculateAverage(throughputs),
      peakThroughput: Math.max(...throughputs),
      averageErrorRate: this.calculateAverage(errorRates),
      peakErrorRate: Math.max(...errorRates),
      uptime: this.calculateUptime(recentHistory),
      availability: this.calculateAvailability(recentHistory)
    };
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): PerformanceAlert[] {
    return Array.from(this.alerts.values())
      .filter(alert => !alert.acknowledged && !alert.resolvedAt);
  }

  /**
   * Acknowledge alert
   */
  acknowledgeAlert(alertId: string): boolean {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.acknowledged = true;
      return true;
    }
    return false;
  }

  /**
   * Get health trends
   */
  getHealthTrends(duration = 3600000): HealthTrend[] {
    const recentHistory = this.getHistory(duration);
    const trends: HealthTrend[] = [];

    if (recentHistory.length < 2) {
      return trends;
    }

    // Analyze CPU trend
    const cpuUsages = recentHistory.map(h => h.metrics.resourceUtilization.cpu.usage);
    trends.push({
      metric: 'cpu_usage',
      trend: this.calculateTrend(cpuUsages),
      severity: this.getTrendSeverity(cpuUsages, this.thresholds.maxCpuUsage),
      description: this.describeTrend('CPU usage', cpuUsages)
    });

    // Analyze memory trend
    const memoryUsages = recentHistory.map(h => 
      h.metrics.resourceUtilization.memory.used / h.metrics.resourceUtilization.memory.total
    );
    trends.push({
      metric: 'memory_usage',
      trend: this.calculateTrend(memoryUsages),
      severity: this.getTrendSeverity(memoryUsages, this.thresholds.maxMemoryUsage),
      description: this.describeTrend('Memory usage', memoryUsages)
    });

    // Analyze latency trend
    const latencies = recentHistory.map(h => h.metrics.averageProcessingTime);
    trends.push({
      metric: 'latency',
      trend: this.calculateTrend(latencies),
      severity: this.getTrendSeverity(latencies, this.thresholds.maxAverageLatency),
      description: this.describeTrend('Response latency', latencies)
    });

    // Analyze error rate trend
    const errorRates = recentHistory.map(h => 
      h.metrics.failedRequests / (h.metrics.completedRequests + h.metrics.failedRequests) || 0
    );
    trends.push({
      metric: 'error_rate',
      trend: this.calculateTrend(errorRates),
      severity: this.getTrendSeverity(errorRates, this.thresholds.maxErrorRate),
      description: this.describeTrend('Error rate', errorRates)
    });

    return trends;
  }

  /**
   * Export metrics data
   */
  exportMetrics(format: 'json' | 'csv' = 'json'): string {
    if (format === 'csv') {
      return this.exportToCSV();
    }
    
    return JSON.stringify({
      currentMetrics: this.metrics,
      history: this.history,
      alerts: Array.from(this.alerts.values()),
      thresholds: this.thresholds
    }, null, 2);
  }

  /**
   * Stop metrics collection
   */
  stop(): void {
    if (this.collectionTimer) {
      clearInterval(this.collectionTimer);
      this.collectionTimer = undefined;
    }
  }

  /**
   * Initialize default metrics
   */
  private initializeMetrics(): QueueMetrics {
    return {
      totalRequests: 0,
      pendingRequests: 0,
      processingRequests: 0,
      completedRequests: 0,
      failedRequests: 0,
      averageWaitTime: 0,
      averageProcessingTime: 0,
      throughput: 0,
      resourceUtilization: {
        cpu: { usage: 0, available: 1.0, cores: 4 },
        memory: { used: 0, available: 2147483648, total: 2147483648 },
        network: { bandwidth: 10000, latency: 50 },
        disk: { usage: 0, available: Infinity }
      },
      queueHealth: {
        status: 'healthy',
        issues: [],
        recommendations: []
      }
    };
  }

  /**
   * Start metrics collection
   */
  private startCollection(): void {
    this.collectionTimer = setInterval(() => {
      this.collectSnapshot();
    }, this.collectionInterval);
  }

  /**
   * Collect metrics snapshot
   */
  private collectSnapshot(): void {
    const snapshot: MetricSnapshot = {
      timestamp: Date.now(),
      metrics: { ...this.metrics }
    };

    this.history.push(snapshot);

    // Maintain history size limit
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }
  }

  /**
   * Update health status based on current metrics
   */
  private updateHealthStatus(): void {
    const issues: string[] = [];
    const recommendations: string[] = [];

    const errorRate = this.metrics.failedRequests / 
      (this.metrics.completedRequests + this.metrics.failedRequests) || 0;

    // Check various health indicators
    if (this.metrics.averageProcessingTime > this.thresholds.maxAverageLatency) {
      issues.push('High response latency detected');
      recommendations.push('Consider scaling up workers or optimizing request processing');
    }

    if (errorRate > this.thresholds.maxErrorRate) {
      issues.push('High error rate detected');
      recommendations.push('Investigate error causes and implement error handling improvements');
    }

    if (this.metrics.pendingRequests > this.thresholds.maxQueueLength) {
      issues.push('Queue length is excessive');
      recommendations.push('Increase worker pool size or implement request prioritization');
    }

    if (this.metrics.throughput < this.thresholds.minThroughput) {
      issues.push('Low throughput detected');
      recommendations.push('Optimize processing efficiency or add more workers');
    }

    if (this.metrics.resourceUtilization.cpu.usage > this.thresholds.maxCpuUsage) {
      issues.push('High CPU utilization');
      recommendations.push('Scale horizontally or optimize CPU-intensive operations');
    }

    const memoryUsage = this.metrics.resourceUtilization.memory.used / 
      this.metrics.resourceUtilization.memory.total;
    if (memoryUsage > this.thresholds.maxMemoryUsage) {
      issues.push('High memory utilization');
      recommendations.push('Implement memory optimization or increase available memory');
    }

    // Determine overall health status
    let status: 'healthy' | 'degraded' | 'critical';
    if (issues.length === 0) {
      status = 'healthy';
    } else if (issues.length <= 2) {
      status = 'degraded';
    } else {
      status = 'critical';
    }

    this.metrics.queueHealth = { status, issues, recommendations };
  }

  /**
   * Check thresholds and create alerts
   */
  private checkThresholds(): void {
    const now = Date.now();

    // Check latency threshold
    if (this.metrics.averageProcessingTime > this.thresholds.maxAverageLatency) {
      this.createAlert('latency_high', 'critical', 
        `Average processing time (${this.metrics.averageProcessingTime}ms) exceeds threshold (${this.thresholds.maxAverageLatency}ms)`);
    }

    // Check error rate threshold
    const errorRate = this.metrics.failedRequests / 
      (this.metrics.completedRequests + this.metrics.failedRequests) || 0;
    if (errorRate > this.thresholds.maxErrorRate) {
      this.createAlert('error_rate_high', 'critical',
        `Error rate (${(errorRate * 100).toFixed(2)}%) exceeds threshold (${(this.thresholds.maxErrorRate * 100).toFixed(2)}%)`);
    }

    // Check queue length threshold
    if (this.metrics.pendingRequests > this.thresholds.maxQueueLength) {
      this.createAlert('queue_length_high', 'warning',
        `Queue length (${this.metrics.pendingRequests}) exceeds threshold (${this.thresholds.maxQueueLength})`);
    }

    // Check CPU usage threshold
    if (this.metrics.resourceUtilization.cpu.usage > this.thresholds.maxCpuUsage) {
      this.createAlert('cpu_usage_high', 'warning',
        `CPU usage (${(this.metrics.resourceUtilization.cpu.usage * 100).toFixed(1)}%) exceeds threshold (${(this.thresholds.maxCpuUsage * 100).toFixed(1)}%)`);
    }
  }

  /**
   * Create or update alert
   */
  private createAlert(id: string, type: 'warning' | 'critical', message: string): void {
    const existingAlert = this.alerts.get(id);
    
    if (!existingAlert || existingAlert.resolvedAt) {
      this.alerts.set(id, {
        id,
        type,
        message,
        timestamp: Date.now(),
        acknowledged: false
      });
    }
  }

  /**
   * Notify subscribers of metrics update
   */
  private notifySubscribers(): void {
    for (const callback of this.subscribers) {
      try {
        callback(this.metrics);
      } catch (error) {
        console.error('Error notifying metrics subscriber:', error);
      }
    }
  }

  /**
   * Calculate average of array
   */
  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  /**
   * Calculate median of array
   */
  private calculateMedian(values: number[]): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 
      ? (sorted[mid - 1] + sorted[mid]) / 2 
      : sorted[mid];
  }

  /**
   * Calculate percentile of array
   */
  private calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.floor(percentile * sorted.length);
    return sorted[Math.min(index, sorted.length - 1)];
  }

  /**
   * Calculate trend from values
   */
  private calculateTrend(values: number[]): 'increasing' | 'decreasing' | 'stable' {
    if (values.length < 2) return 'stable';
    
    const slope = this.calculateLinearRegression(values).slope;
    const threshold = 0.01;
    
    if (slope > threshold) return 'increasing';
    if (slope < -threshold) return 'decreasing';
    return 'stable';
  }

  /**
   * Calculate linear regression slope
   */
  private calculateLinearRegression(values: number[]): { slope: number; intercept: number } {
    const n = values.length;
    const sumX = (n * (n + 1)) / 2;
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = values.reduce((sum, val, idx) => sum + val * (idx + 1), 0);
    const sumX2 = (n * (n + 1) * (2 * n + 1)) / 6;

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return { slope, intercept };
  }

  /**
   * Get trend severity
   */
  private getTrendSeverity(values: number[], threshold: number): 'low' | 'medium' | 'high' {
    const latest = values[values.length - 1] || 0;
    const ratio = latest / threshold;
    
    if (ratio > 1.0) return 'high';
    if (ratio > 0.8) return 'medium';
    return 'low';
  }

  /**
   * Describe trend in human-readable format
   */
  private describeTrend(metric: string, values: number[]): string {
    if (values.length < 2) return `${metric} data insufficient`;
    
    const first = values[0];
    const last = values[values.length - 1];
    const change = ((last - first) / first) * 100;
    
    if (Math.abs(change) < 5) {
      return `${metric} is stable`;
    } else if (change > 0) {
      return `${metric} increased by ${change.toFixed(1)}%`;
    } else {
      return `${metric} decreased by ${Math.abs(change).toFixed(1)}%`;
    }
  }

  /**
   * Calculate uptime from history
   */
  private calculateUptime(history: MetricSnapshot[]): number {
    if (history.length === 0) return 1.0;
    
    const healthySnapshots = history.filter(h => h.metrics.queueHealth.status === 'healthy');
    return healthySnapshots.length / history.length;
  }

  /**
   * Calculate availability from history
   */
  private calculateAvailability(history: MetricSnapshot[]): number {
    if (history.length === 0) return 1.0;
    
    const availableSnapshots = history.filter(h => 
      h.metrics.queueHealth.status !== 'critical'
    );
    return availableSnapshots.length / history.length;
  }

  /**
   * Create empty performance summary
   */
  private createEmptyPerformanceSummary(): PerformanceSummary {
    return {
      duration: 0,
      totalRequests: 0,
      completedRequests: 0,
      failedRequests: 0,
      averageLatency: 0,
      medianLatency: 0,
      p95Latency: 0,
      p99Latency: 0,
      averageThroughput: 0,
      peakThroughput: 0,
      averageErrorRate: 0,
      peakErrorRate: 0,
      uptime: 1.0,
      availability: 1.0
    };
  }

  /**
   * Export metrics to CSV format
   */
  private exportToCSV(): string {
    const headers = ['timestamp', 'totalRequests', 'pendingRequests', 'processingRequests', 
                    'completedRequests', 'failedRequests', 'averageWaitTime', 
                    'averageProcessingTime', 'throughput', 'cpuUsage', 'memoryUsage'];
    
    const rows = this.history.map(snapshot => [
      snapshot.timestamp,
      snapshot.metrics.totalRequests,
      snapshot.metrics.pendingRequests,
      snapshot.metrics.processingRequests,
      snapshot.metrics.completedRequests,
      snapshot.metrics.failedRequests,
      snapshot.metrics.averageWaitTime,
      snapshot.metrics.averageProcessingTime,
      snapshot.metrics.throughput,
      snapshot.metrics.resourceUtilization.cpu.usage,
      snapshot.metrics.resourceUtilization.memory.used / snapshot.metrics.resourceUtilization.memory.total
    ]);

    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  }
}

// Supporting interfaces
interface PerformanceSummary {
  duration: number;
  totalRequests: number;
  completedRequests: number;
  failedRequests: number;
  averageLatency: number;
  medianLatency: number;
  p95Latency: number;
  p99Latency: number;
  averageThroughput: number;
  peakThroughput: number;
  averageErrorRate: number;
  peakErrorRate: number;
  uptime: number;
  availability: number;
}

interface HealthTrend {
  metric: string;
  trend: 'increasing' | 'decreasing' | 'stable';
  severity: 'low' | 'medium' | 'high';
  description: string;
}