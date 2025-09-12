/**
 * Offline Performance Monitor - Privacy-focused local performance tracking
 * Monitors model performance without external analytics or data collection
 */

export interface PerformanceMetric {
  id: string;
  modelId: string;
  timestamp: Date;
  type: 'load' | 'inference' | 'memory' | 'error' | 'switch' | 'optimization';
  value: number;
  unit: string;
  metadata?: Record<string, any>;
}

export interface ModelPerformanceSummary {
  modelId: string;
  totalInferences: number;
  averageLoadTime: number;
  averageInferenceTime: number;
  peakMemoryUsage: number;
  errorRate: number;
  tokensPerSecond: number;
  uptime: number;
  efficiency: number;
  lastUsed: Date;
  trends: PerformanceTrends;
}

export interface PerformanceTrends {
  loadTime: TrendData;
  inferenceTime: TrendData;
  memoryUsage: TrendData;
  errorRate: TrendData;
  tokensPerSecond: TrendData;
}

export interface TrendData {
  current: number;
  previous: number;
  change: number;
  trend: 'improving' | 'stable' | 'degrading';
  confidence: number;
}

export interface SystemPerformance {
  totalMemoryUsage: number;
  activeModels: number;
  totalInferences: number;
  systemHealth: 'excellent' | 'good' | 'fair' | 'poor';
  bottlenecks: string[];
  recommendations: string[];
  lastUpdated: Date;
}

export interface PerformanceAlert {
  id: string;
  type: 'warning' | 'error' | 'info';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  modelId?: string;
  timestamp: Date;
  resolved: boolean;
  actions: string[];
}

export class OfflinePerformanceMonitor {
  private metrics: Map<string, PerformanceMetric[]> = new Map();
  private summaries: Map<string, ModelPerformanceSummary> = new Map();
  private systemMetrics: SystemPerformance;
  private alerts: PerformanceAlert[] = [];
  private readonly maxMetricsPerModel = 1000;
  private readonly retentionDays = 30;
  private monitoringInterval: number | null = null;

  constructor() {
    this.systemMetrics = this.initializeSystemMetrics();
    this.loadPersistedData();
    this.startMonitoring();
  }

  /**
   * Record a performance metric
   */
  public recordMetric(metric: Omit<PerformanceMetric, 'id' | 'timestamp'>): void {
    const fullMetric: PerformanceMetric = {
      ...metric,
      id: this.generateMetricId(),
      timestamp: new Date()
    };

    // Store metric
    if (!this.metrics.has(metric.modelId)) {
      this.metrics.set(metric.modelId, []);
    }

    const modelMetrics = this.metrics.get(metric.modelId)!;
    modelMetrics.push(fullMetric);

    // Maintain size limit
    if (modelMetrics.length > this.maxMetricsPerModel) {
      modelMetrics.shift(); // Remove oldest
    }

    // Update summary
    this.updateModelSummary(metric.modelId);

    // Check for alerts
    this.checkForAlerts(fullMetric);

    // Persist data periodically
    if (Math.random() < 0.1) { // 10% chance to persist
      this.persistData();
    }
  }

  /**
   * Record model load time
   */
  public recordLoadTime(modelId: string, loadTime: number, metadata?: Record<string, any>): void {
    this.recordMetric({
      modelId,
      type: 'load',
      value: loadTime,
      unit: 'ms',
      metadata
    });
  }

  /**
   * Record inference performance
   */
  public recordInference(
    modelId: string, 
    inferenceTime: number, 
    tokens: number,
    metadata?: Record<string, any>
  ): void {
    this.recordMetric({
      modelId,
      type: 'inference',
      value: inferenceTime,
      unit: 'ms',
      metadata: { ...metadata, tokens }
    });

    // Also record tokens per second
    if (tokens > 0 && inferenceTime > 0) {
      const tokensPerSecond = tokens / (inferenceTime / 1000);
      this.recordMetric({
        modelId,
        type: 'optimization',
        value: tokensPerSecond,
        unit: 'tokens/s',
        metadata: { ...metadata, metric: 'tokens_per_second' }
      });
    }
  }

  /**
   * Record memory usage
   */
  public recordMemoryUsage(modelId: string, memoryUsage: number, metadata?: Record<string, any>): void {
    this.recordMetric({
      modelId,
      type: 'memory',
      value: memoryUsage,
      unit: 'bytes',
      metadata
    });
  }

  /**
   * Record error occurrence
   */
  public recordError(modelId: string, errorType: string, metadata?: Record<string, any>): void {
    this.recordMetric({
      modelId,
      type: 'error',
      value: 1,
      unit: 'count',
      metadata: { ...metadata, errorType }
    });

    // Create alert for errors
    this.createAlert({
      type: 'error',
      severity: 'medium',
      message: `Error occurred in model ${modelId}: ${errorType}`,
      modelId,
      actions: ['Check model configuration', 'Verify model files', 'Review logs']
    });
  }

  /**
   * Record model switch performance
   */
  public recordModelSwitch(
    fromModelId: string,
    toModelId: string,
    switchTime: number,
    metadata?: Record<string, any>
  ): void {
    this.recordMetric({
      modelId: toModelId,
      type: 'switch',
      value: switchTime,
      unit: 'ms',
      metadata: { ...metadata, fromModel: fromModelId }
    });
  }

  /**
   * Get performance summary for a model
   */
  public getModelSummary(modelId: string): ModelPerformanceSummary | null {
    return this.summaries.get(modelId) || null;
  }

  /**
   * Get performance summaries for all models
   */
  public getAllModelSummaries(): ModelPerformanceSummary[] {
    return Array.from(this.summaries.values());
  }

  /**
   * Get system-wide performance metrics
   */
  public getSystemPerformance(): SystemPerformance {
    this.updateSystemMetrics();
    return { ...this.systemMetrics };
  }

  /**
   * Get performance trends over time
   */
  public getPerformanceTrends(
    modelId: string,
    timeRange: 'hour' | 'day' | 'week' | 'month' = 'day'
  ): PerformanceTrends | null {
    const summary = this.summaries.get(modelId);
    if (!summary) return null;

    return summary.trends;
  }

  /**
   * Get active performance alerts
   */
  public getActiveAlerts(): PerformanceAlert[] {
    return this.alerts.filter(alert => !alert.resolved);
  }

  /**
   * Resolve an alert
   */
  public resolveAlert(alertId: string): void {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
    }
  }

  /**
   * Get performance recommendations
   */
  public getRecommendations(modelId?: string): string[] {
    if (modelId) {
      return this.getModelRecommendations(modelId);
    }
    return this.getSystemRecommendations();
  }

  /**
   * Generate performance report
   */
  public generateReport(
    timeRange: 'day' | 'week' | 'month' = 'day',
    includeModels?: string[]
  ): {
    summary: SystemPerformance;
    models: ModelPerformanceSummary[];
    alerts: PerformanceAlert[];
    recommendations: string[];
    generated: Date;
  } {
    const models = includeModels 
      ? includeModels.map(id => this.getModelSummary(id)).filter(Boolean) as ModelPerformanceSummary[]
      : this.getAllModelSummaries();

    return {
      summary: this.getSystemPerformance(),
      models,
      alerts: this.getActiveAlerts(),
      recommendations: this.getRecommendations(),
      generated: new Date()
    };
  }

  /**
   * Export performance data for analysis
   */
  public exportData(format: 'json' | 'csv' = 'json'): string {
    const data = {
      metrics: Object.fromEntries(this.metrics.entries()),
      summaries: Object.fromEntries(this.summaries.entries()),
      systemMetrics: this.systemMetrics,
      alerts: this.alerts,
      exportedAt: new Date()
    };

    if (format === 'json') {
      return JSON.stringify(data, null, 2);
    } else {
      return this.convertToCSV(data);
    }
  }

  /**
   * Clear old performance data
   */
  public cleanup(daysToKeep: number = this.retentionDays): void {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    // Clean up metrics
    for (const [modelId, metrics] of this.metrics.entries()) {
      const filteredMetrics = metrics.filter(m => m.timestamp > cutoffDate);
      this.metrics.set(modelId, filteredMetrics);
    }

    // Clean up alerts
    this.alerts = this.alerts.filter(alert => 
      alert.timestamp > cutoffDate || !alert.resolved
    );

    // Update summaries after cleanup
    for (const modelId of this.metrics.keys()) {
      this.updateModelSummary(modelId);
    }

    console.log(`Cleaned up performance data older than ${daysToKeep} days`);
  }

  // Private methods
  private initializeSystemMetrics(): SystemPerformance {
    return {
      totalMemoryUsage: 0,
      activeModels: 0,
      totalInferences: 0,
      systemHealth: 'good',
      bottlenecks: [],
      recommendations: [],
      lastUpdated: new Date()
    };
  }

  private generateMetricId(): string {
    return `metric_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private updateModelSummary(modelId: string): void {
    const metrics = this.metrics.get(modelId) || [];
    if (metrics.length === 0) return;

    const loadMetrics = metrics.filter(m => m.type === 'load');
    const inferenceMetrics = metrics.filter(m => m.type === 'inference');
    const memoryMetrics = metrics.filter(m => m.type === 'memory');
    const errorMetrics = metrics.filter(m => m.type === 'error');
    const tokensMetrics = metrics.filter(m => m.type === 'optimization' && m.metadata?.metric === 'tokens_per_second');

    const summary: ModelPerformanceSummary = {
      modelId,
      totalInferences: inferenceMetrics.length,
      averageLoadTime: this.calculateAverage(loadMetrics.map(m => m.value)),
      averageInferenceTime: this.calculateAverage(inferenceMetrics.map(m => m.value)),
      peakMemoryUsage: Math.max(...memoryMetrics.map(m => m.value), 0),
      errorRate: errorMetrics.length / Math.max(inferenceMetrics.length, 1) * 100,
      tokensPerSecond: this.calculateAverage(tokensMetrics.map(m => m.value)),
      uptime: this.calculateUptime(metrics),
      efficiency: this.calculateEfficiency(inferenceMetrics, memoryMetrics),
      lastUsed: new Date(Math.max(...metrics.map(m => m.timestamp.getTime()))),
      trends: this.calculateTrends(modelId, metrics)
    };

    this.summaries.set(modelId, summary);
  }

  private calculateTrends(modelId: string, metrics: PerformanceMetric[]): PerformanceTrends {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

    const recent = metrics.filter(m => m.timestamp > oneDayAgo);
    const previous = metrics.filter(m => m.timestamp > twoDaysAgo && m.timestamp <= oneDayAgo);

    return {
      loadTime: this.calculateTrendData(
        recent.filter(m => m.type === 'load'),
        previous.filter(m => m.type === 'load')
      ),
      inferenceTime: this.calculateTrendData(
        recent.filter(m => m.type === 'inference'),
        previous.filter(m => m.type === 'inference')
      ),
      memoryUsage: this.calculateTrendData(
        recent.filter(m => m.type === 'memory'),
        previous.filter(m => m.type === 'memory')
      ),
      errorRate: this.calculateErrorRateTrend(recent, previous),
      tokensPerSecond: this.calculateTrendData(
        recent.filter(m => m.type === 'optimization' && m.metadata?.metric === 'tokens_per_second'),
        previous.filter(m => m.type === 'optimization' && m.metadata?.metric === 'tokens_per_second')
      )
    };
  }

  private calculateTrendData(recent: PerformanceMetric[], previous: PerformanceMetric[]): TrendData {
    const currentAvg = this.calculateAverage(recent.map(m => m.value));
    const previousAvg = this.calculateAverage(previous.map(m => m.value));
    
    if (previousAvg === 0) {
      return {
        current: currentAvg,
        previous: previousAvg,
        change: 0,
        trend: 'stable',
        confidence: 0
      };
    }

    const change = ((currentAvg - previousAvg) / previousAvg) * 100;
    const confidence = Math.min(recent.length / 10, 1); // Higher confidence with more data points

    let trend: 'improving' | 'stable' | 'degrading' = 'stable';
    if (Math.abs(change) > 5) { // 5% threshold
      trend = change < 0 ? 'improving' : 'degrading'; // Lower values are better for most metrics
    }

    return {
      current: currentAvg,
      previous: previousAvg,
      change,
      trend,
      confidence
    };
  }

  private calculateErrorRateTrend(recent: PerformanceMetric[], previous: PerformanceMetric[]): TrendData {
    const recentErrors = recent.filter(m => m.type === 'error').length;
    const recentTotal = recent.filter(m => m.type === 'inference').length;
    const previousErrors = previous.filter(m => m.type === 'error').length;
    const previousTotal = previous.filter(m => m.type === 'inference').length;

    const currentRate = recentTotal > 0 ? (recentErrors / recentTotal) * 100 : 0;
    const previousRate = previousTotal > 0 ? (previousErrors / previousTotal) * 100 : 0;

    const change = previousRate > 0 ? ((currentRate - previousRate) / previousRate) * 100 : 0;
    const confidence = Math.min((recentTotal + previousTotal) / 20, 1);

    let trend: 'improving' | 'stable' | 'degrading' = 'stable';
    if (Math.abs(change) > 10) {
      trend = change < 0 ? 'improving' : 'degrading';
    }

    return {
      current: currentRate,
      previous: previousRate,
      change,
      trend,
      confidence
    };
  }

  private calculateAverage(values: number[]): number {
    return values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0;
  }

  private calculateUptime(metrics: PerformanceMetric[]): number {
    if (metrics.length === 0) return 0;
    
    const firstMetric = new Date(Math.min(...metrics.map(m => m.timestamp.getTime())));
    const lastMetric = new Date(Math.max(...metrics.map(m => m.timestamp.getTime())));
    
    return lastMetric.getTime() - firstMetric.getTime();
  }

  private calculateEfficiency(inferenceMetrics: PerformanceMetric[], memoryMetrics: PerformanceMetric[]): number {
    if (inferenceMetrics.length === 0) return 0;

    const avgInferenceTime = this.calculateAverage(inferenceMetrics.map(m => m.value));
    const avgMemoryUsage = this.calculateAverage(memoryMetrics.map(m => m.value));
    
    // Efficiency = 1 / (inference_time_normalized + memory_usage_normalized)
    const timeNormalized = Math.min(avgInferenceTime / 10000, 1); // Normalize to 0-1 (10s = 1)
    const memoryNormalized = Math.min(avgMemoryUsage / (8 * 1e9), 1); // Normalize to 0-1 (8GB = 1)
    
    return Math.max(0, 100 - (timeNormalized + memoryNormalized) * 50);
  }

  private updateSystemMetrics(): void {
    const allSummaries = this.getAllModelSummaries();
    
    this.systemMetrics = {
      totalMemoryUsage: allSummaries.reduce((sum, s) => sum + s.peakMemoryUsage, 0),
      activeModels: allSummaries.length,
      totalInferences: allSummaries.reduce((sum, s) => sum + s.totalInferences, 0),
      systemHealth: this.calculateSystemHealth(allSummaries),
      bottlenecks: this.identifyBottlenecks(allSummaries),
      recommendations: this.getSystemRecommendations(),
      lastUpdated: new Date()
    };
  }

  private calculateSystemHealth(summaries: ModelPerformanceSummary[]): 'excellent' | 'good' | 'fair' | 'poor' {
    if (summaries.length === 0) return 'good';

    const avgErrorRate = this.calculateAverage(summaries.map(s => s.errorRate));
    const avgEfficiency = this.calculateAverage(summaries.map(s => s.efficiency));

    if (avgErrorRate < 1 && avgEfficiency > 80) return 'excellent';
    if (avgErrorRate < 5 && avgEfficiency > 60) return 'good';
    if (avgErrorRate < 10 && avgEfficiency > 40) return 'fair';
    return 'poor';
  }

  private identifyBottlenecks(summaries: ModelPerformanceSummary[]): string[] {
    const bottlenecks: string[] = [];

    const highMemoryModels = summaries.filter(s => s.peakMemoryUsage > 16 * 1e9);
    if (highMemoryModels.length > 0) {
      bottlenecks.push(`High memory usage in ${highMemoryModels.length} model(s)`);
    }

    const slowModels = summaries.filter(s => s.averageInferenceTime > 30000);
    if (slowModels.length > 0) {
      bottlenecks.push(`Slow inference in ${slowModels.length} model(s)`);
    }

    const errorProneModels = summaries.filter(s => s.errorRate > 5);
    if (errorProneModels.length > 0) {
      bottlenecks.push(`High error rate in ${errorProneModels.length} model(s)`);
    }

    return bottlenecks;
  }

  private getModelRecommendations(modelId: string): string[] {
    const summary = this.summaries.get(modelId);
    if (!summary) return [];

    const recommendations: string[] = [];

    if (summary.averageLoadTime > 30000) {
      recommendations.push('Consider using a smaller model variant for faster loading');
    }

    if (summary.averageInferenceTime > 20000) {
      recommendations.push('Enable response caching for repeated queries');
      recommendations.push('Consider model quantization to improve speed');
    }

    if (summary.peakMemoryUsage > 16 * 1e9) {
      recommendations.push('Monitor memory usage and consider unloading unused models');
    }

    if (summary.errorRate > 5) {
      recommendations.push('Review model configuration and input validation');
    }

    if (summary.tokensPerSecond < 10) {
      recommendations.push('Consider optimizing inference parameters');
    }

    return recommendations;
  }

  private getSystemRecommendations(): string[] {
    const recommendations: string[] = [];
    const summaries = this.getAllModelSummaries();

    if (summaries.length > 3) {
      recommendations.push('Consider limiting concurrent models to improve performance');
    }

    const totalMemory = summaries.reduce((sum, s) => sum + s.peakMemoryUsage, 0);
    if (totalMemory > 32 * 1e9) {
      recommendations.push('Total memory usage is high - consider unloading unused models');
    }

    const avgErrorRate = this.calculateAverage(summaries.map(s => s.errorRate));
    if (avgErrorRate > 3) {
      recommendations.push('Review model configurations to reduce error rates');
    }

    return recommendations;
  }

  private checkForAlerts(metric: PerformanceMetric): void {
    // Check for performance degradation
    if (metric.type === 'inference' && metric.value > 60000) { // 1 minute inference
      this.createAlert({
        type: 'warning',
        severity: 'high',
        message: `Very slow inference detected: ${Math.round(metric.value / 1000)}s`,
        modelId: metric.modelId,
        actions: ['Check system resources', 'Consider model optimization']
      });
    }

    // Check for memory issues
    if (metric.type === 'memory' && metric.value > 20 * 1e9) { // 20GB
      this.createAlert({
        type: 'warning',
        severity: 'medium',
        message: `High memory usage detected: ${Math.round(metric.value / 1e9)}GB`,
        modelId: metric.modelId,
        actions: ['Monitor memory usage', 'Consider unloading other models']
      });
    }

    // Check for errors
    if (metric.type === 'error') {
      this.createAlert({
        type: 'error',
        severity: 'medium',
        message: `Error occurred: ${metric.metadata?.errorType || 'Unknown'}`,
        modelId: metric.modelId,
        actions: ['Check logs', 'Verify model integrity']
      });
    }
  }

  private createAlert(alert: Omit<PerformanceAlert, 'id' | 'timestamp' | 'resolved'>): void {
    const fullAlert: PerformanceAlert = {
      ...alert,
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      resolved: false
    };

    this.alerts.push(fullAlert);

    // Limit number of alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-50); // Keep 50 most recent
    }
  }

  private convertToCSV(data: any): string {
    // Simple CSV conversion for metrics
    const csvLines: string[] = [];
    csvLines.push('ModelId,Timestamp,Type,Value,Unit,Metadata');

    for (const [modelId, metrics] of Object.entries(data.metrics) as [string, PerformanceMetric[]][]) {
      for (const metric of metrics) {
        const metadata = JSON.stringify(metric.metadata || {}).replace(/"/g, '""');
        csvLines.push(`"${modelId}","${metric.timestamp.toISOString()}","${metric.type}",${metric.value},"${metric.unit}","${metadata}"`);
      }
    }

    return csvLines.join('\n');
  }

  private startMonitoring(): void {
    // Periodic system monitoring
    this.monitoringInterval = window.setInterval(() => {
      this.updateSystemMetrics();
      
      // Cleanup old data periodically
      if (Math.random() < 0.01) { // 1% chance per interval
        this.cleanup();
      }
    }, 30000); // Every 30 seconds
  }

  private loadPersistedData(): void {
    try {
      // Load metrics
      const storedMetrics = localStorage.getItem('BearAI_PerformanceMetrics');
      if (storedMetrics) {
        const metricsData = JSON.parse(storedMetrics);
        for (const [modelId, metrics] of Object.entries(metricsData)) {
          this.metrics.set(modelId, (metrics as any[]).map(m => ({
            ...m,
            timestamp: new Date(m.timestamp)
          })));
        }
      }

      // Load summaries
      const storedSummaries = localStorage.getItem('BearAI_PerformanceSummaries');
      if (storedSummaries) {
        const summariesData = JSON.parse(storedSummaries);
        for (const [modelId, summary] of Object.entries(summariesData)) {
          this.summaries.set(modelId, {
            ...summary as ModelPerformanceSummary,
            lastUsed: new Date((summary as any).lastUsed)
          });
        }
      }

      // Load alerts
      const storedAlerts = localStorage.getItem('BearAI_PerformanceAlerts');
      if (storedAlerts) {
        this.alerts = JSON.parse(storedAlerts).map((alert: any) => ({
          ...alert,
          timestamp: new Date(alert.timestamp)
        }));
      }
    } catch (error) {
      console.warn('Failed to load persisted performance data:', error);
    }
  }

  private persistData(): void {
    try {
      // Persist metrics
      const metricsData = Object.fromEntries(this.metrics.entries());
      localStorage.setItem('BearAI_PerformanceMetrics', JSON.stringify(metricsData));

      // Persist summaries
      const summariesData = Object.fromEntries(this.summaries.entries());
      localStorage.setItem('BearAI_PerformanceSummaries', JSON.stringify(summariesData));

      // Persist alerts
      localStorage.setItem('BearAI_PerformanceAlerts', JSON.stringify(this.alerts));
    } catch (error) {
      console.warn('Failed to persist performance data:', error);
    }
  }

  /**
   * Dispose of resources
   */
  public dispose(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    this.persistData();
    this.metrics.clear();
    this.summaries.clear();
    this.alerts = [];
  }
}

export default OfflinePerformanceMonitor;