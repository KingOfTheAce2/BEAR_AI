// Main Local Performance Monitor Orchestrator
import { 
  MonitoringConfig, 
  MonitoringState, 
  SystemMetrics, 
  ModelPerformanceMetrics, 
  PerformanceAlert, 
  OptimizationRecommendation,
  PerformanceReport,
  PerformanceThresholds
} from '../../types/monitoring';

import { SystemResourceMonitor } from './systemResourceMonitor';
import { ModelPerformanceTracker } from './modelPerformanceTracker';
import { LocalStorageService } from './localStorageService';
import { AlertSystem } from './alertSystem';
import { OptimizationRecommendationEngine } from './optimizationRecommendationEngine';

export class LocalPerformanceMonitor {
  private systemMonitor: SystemResourceMonitor;
  private modelTracker: ModelPerformanceTracker;
  private storageService: LocalStorageService;
  private alertSystem: AlertSystem;
  private recommendationEngine: OptimizationRecommendationEngine;
  
  private state: MonitoringState;
  private isRunning = false;
  private saveInterval?: NodeJS.Timeout;
  private reportInterval?: NodeJS.Timeout;
  private cleanupInterval?: NodeJS.Timeout;
  
  private callbacks: {
    onSystemMetrics?: (metrics: SystemMetrics) => void;
    onModelMetrics?: (metrics: ModelPerformanceMetrics) => void;
    onAlert?: (alert: PerformanceAlert) => void;
    onRecommendation?: (recommendation: OptimizationRecommendation) => void;
    onStateChange?: (state: MonitoringState) => void;
  } = {};

  constructor(config?: Partial<MonitoringConfig>) {
    // Initialize default configuration
    this.state = {
      isRunning: false,
      systemMetrics: [],
      modelMetrics: [],
      alerts: [],
      recommendations: [],
      config: this.createDefaultConfig(config)
    };

    // Initialize services
    this.storageService = new LocalStorageService();
    
    this.systemMonitor = new SystemResourceMonitor((metrics) => {
      this.handleSystemMetrics(metrics);
    });

    this.modelTracker = new ModelPerformanceTracker((metrics) => {
      this.handleModelMetrics(metrics);
    });

    this.alertSystem = new AlertSystem(
      this.state.config.thresholds,
      (alert) => this.handleAlert(alert)
    );

    this.recommendationEngine = new OptimizationRecommendationEngine(
      (recommendation) => this.handleRecommendation(recommendation)
    );

    // Load persisted data
    this.loadPersistedData();
  }

  // Start monitoring
  async start(): Promise<void> {
    if (this.isRunning) return;

    console.log('[PerformanceMonitor] Starting local performance monitoring...');
    
    this.isRunning = true;
    this.state.isRunning = true;
    this.state.startedAt = Date.now();

    // Start individual services
    await this.systemMonitor.start(this.state.config.sampling.systemMetricsInterval);
    this.alertSystem.start(this.state.config.sampling.alertCheckInterval);

    // Set up periodic data saving
    this.saveInterval = setInterval(async () => {
      await this.saveCurrentData();
    }, 60000); // Save every minute

    // Set up periodic report generation
    this.reportInterval = setInterval(async () => {
      await this.generatePeriodicReport();
    }, 24 * 60 * 60 * 1000); // Daily reports

    // Set up cleanup
    if (this.state.config.storage.autoCleanup) {
      this.cleanupInterval = setInterval(async () => {
        await this.performCleanup();
      }, 24 * 60 * 60 * 1000); // Daily cleanup
    }

    this.notifyStateChange();
    console.log('[PerformanceMonitor] Local performance monitoring started successfully');
  }

  // Stop monitoring
  async stop(): Promise<void> {
    if (!this.isRunning) return;

    console.log('[PerformanceMonitor] Stopping local performance monitoring...');

    this.isRunning = false;
    this.state.isRunning = false;

    // Stop services
    this.systemMonitor.stop();
    this.alertSystem.stop();

    // Clear intervals
    if (this.saveInterval) {
      clearInterval(this.saveInterval);
      this.saveInterval = undefined;
    }
    if (this.reportInterval) {
      clearInterval(this.reportInterval);
      this.reportInterval = undefined;
    }
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }

    // Save final data
    await this.saveCurrentData();
    
    this.notifyStateChange();
    console.log('[PerformanceMonitor] Local performance monitoring stopped');
  }

  // Model tracking methods
  startModelOperation(modelId: string, modelName: string, operation: 'inference' | 'training' | 'loading', metadata?: any): string {
    return this.modelTracker.startOperation(modelId, modelName, operation, metadata);
  }

  endModelOperation(operationId: string, success = true, additionalMetrics?: any, metadata?: any): ModelPerformanceMetrics | null {
    return this.modelTracker.endOperation(operationId, success, additionalMetrics, metadata);
  }

  async trackInference<T>(
    modelId: string,
    modelName: string,
    inferenceFunction: () => Promise<T>,
    inputTokens?: number,
    metadata?: any
  ): Promise<{ result: T; metrics: ModelPerformanceMetrics }> {
    return this.modelTracker.trackInference(modelId, modelName, inferenceFunction, inputTokens, metadata);
  }

  async trackModelLoading<T>(
    modelId: string,
    modelName: string,
    loadFunction: () => Promise<T>,
    modelSize?: number
  ): Promise<{ result: T; metrics: ModelPerformanceMetrics }> {
    return this.modelTracker.trackModelLoading(modelId, modelName, loadFunction, modelSize);
  }

  // Data access methods
  getState(): MonitoringState {
    return { ...this.state };
  }

  getCurrentSystemMetrics(): SystemMetrics | null {
    return this.systemMonitor.getCurrentMetrics();
  }

  getRecentSystemMetrics(count = 100): SystemMetrics[] {
    return this.systemMonitor.getRecentMetrics(count);
  }

  getRecentModelMetrics(count = 100): ModelPerformanceMetrics[] {
    return this.modelTracker.getRecentMetrics(count);
  }

  getActiveAlerts(): PerformanceAlert[] {
    return this.alertSystem.getActiveAlerts();
  }

  getAllAlerts(limit = 100): PerformanceAlert[] {
    return this.alertSystem.getAllAlerts(limit);
  }

  getActiveRecommendations(): OptimizationRecommendation[] {
    return this.recommendationEngine.getActiveRecommendations();
  }

  getAllRecommendations(): OptimizationRecommendation[] {
    return this.recommendationEngine.getAllRecommendations();
  }

  // Historical data access
  async getHistoricalSystemMetrics(startTime?: number, endTime?: number, limit = 1000): Promise<SystemMetrics[]> {
    return this.storageService.getSystemMetrics(startTime, endTime, limit);
  }

  async getHistoricalModelMetrics(
    modelId?: string, 
    operation?: string, 
    startTime?: number, 
    endTime?: number, 
    limit = 1000
  ): Promise<ModelPerformanceMetrics[]> {
    return this.storageService.getModelMetrics(modelId, operation, startTime, endTime, limit);
  }

  async getHistoricalAlerts(resolved?: boolean, category?: string, limit = 100): Promise<PerformanceAlert[]> {
    return this.storageService.getAlerts(resolved, category, limit);
  }

  async getHistoricalRecommendations(applied?: boolean, category?: string, priority?: string): Promise<OptimizationRecommendation[]> {
    return this.storageService.getRecommendations(applied, category, priority);
  }

  // Analytics and insights
  getSystemPerformanceStats(periodMs = 3600000): {
    avgCpu: number;
    avgMemory: number;
    avgDisk: number;
    peakCpu: number;
    peakMemory: number;
    peakDisk: number;
  } {
    const recentMetrics = this.systemMonitor.getRecentMetrics(Math.floor(periodMs / this.state.config.sampling.systemMetricsInterval));
    
    if (recentMetrics.length === 0) {
      return { avgCpu: 0, avgMemory: 0, avgDisk: 0, peakCpu: 0, peakMemory: 0, peakDisk: 0 };
    }

    const cpuValues = recentMetrics.map(m => m.cpu.usage);
    const memoryValues = recentMetrics.map(m => m.memory.percentage);
    const diskValues = recentMetrics.map(m => m.disk.percentage);

    return {
      avgCpu: cpuValues.reduce((sum, v) => sum + v, 0) / cpuValues.length,
      avgMemory: memoryValues.reduce((sum, v) => sum + v, 0) / memoryValues.length,
      avgDisk: diskValues.reduce((sum, v) => sum + v, 0) / diskValues.length,
      peakCpu: Math.max(...cpuValues),
      peakMemory: Math.max(...memoryValues),
      peakDisk: Math.max(...diskValues)
    };
  }

  getModelPerformanceStats(modelId?: string, periodMs = 3600000): {
    avgLatency: number;
    avgThroughput: number;
    avgMemoryUsage: number;
    totalOperations: number;
    errorRate: number;
    p95Latency: number;
    p99Latency: number;
  } {
    return this.modelTracker.getPerformanceStats(modelId, periodMs);
  }

  // Configuration management
  updateConfig(newConfig: Partial<MonitoringConfig>): void {
    this.state.config = { ...this.state.config, ...newConfig };
    
    // Update thresholds in alert system
    if (newConfig.thresholds) {
      this.alertSystem.updateThresholds(newConfig.thresholds);
    }
    
    // Update sampling intervals if monitoring is running
    if (this.isRunning && newConfig.sampling) {
      if (newConfig.sampling.systemMetricsInterval) {
        this.systemMonitor.stop();
        this.systemMonitor.start(newConfig.sampling.systemMetricsInterval);
      }
      if (newConfig.sampling.alertCheckInterval) {
        this.alertSystem.stop();
        this.alertSystem.start(newConfig.sampling.alertCheckInterval);
      }
    }

    this.notifyStateChange();
  }

  updateThresholds(thresholds: Partial<PerformanceThresholds>): void {
    this.state.config.thresholds = { ...this.state.config.thresholds, ...thresholds };
    this.alertSystem.updateThresholds(this.state.config.thresholds);
    this.notifyStateChange();
  }

  // Alert management
  resolveAlert(alertId: string, resolution?: string): boolean {
    return this.alertSystem.resolveAlert(alertId, resolution);
  }

  createCustomAlert(
    type: 'warning' | 'error' | 'critical',
    category: 'system' | 'model' | 'memory' | 'disk' | 'network',
    title: string,
    message: string
  ): PerformanceAlert {
    return this.alertSystem.createCustomAlert(type, category, title, message);
  }

  // Recommendation management
  markRecommendationApplied(id: string): boolean {
    return this.recommendationEngine.markRecommendationApplied(id);
  }

  generateProactiveRecommendations(): OptimizationRecommendation[] {
    return this.recommendationEngine.generateProactiveRecommendations();
  }

  // Event callbacks
  onSystemMetrics(callback: (metrics: SystemMetrics) => void): void {
    this.callbacks.onSystemMetrics = callback;
  }

  onModelMetrics(callback: (metrics: ModelPerformanceMetrics) => void): void {
    this.callbacks.onModelMetrics = callback;
  }

  onAlert(callback: (alert: PerformanceAlert) => void): void {
    this.callbacks.onAlert = callback;
  }

  onRecommendation(callback: (recommendation: OptimizationRecommendation) => void): void {
    this.callbacks.onRecommendation = callback;
  }

  onStateChange(callback: (state: MonitoringState) => void): void {
    this.callbacks.onStateChange = callback;
  }

  // Data export/import
  async exportData(): Promise<string> {
    const data = await this.storageService.exportData();
    return JSON.stringify(data, null, 2);
  }

  async importData(jsonData: string): Promise<void> {
    const data = JSON.parse(jsonData);
    await this.storageService.importData(data);
    await this.loadPersistedData();
  }

  // Cleanup and maintenance
  async clearAllData(): Promise<void> {
    await this.storageService.clearAllData();
    this.systemMonitor.clearHistory();
    this.modelTracker.clearHistory();
    this.alertSystem.clearAllAlerts();
    this.recommendationEngine.clearOldRecommendations(0);
    
    this.state.systemMetrics = [];
    this.state.modelMetrics = [];
    this.state.alerts = [];
    this.state.recommendations = [];
    
    this.notifyStateChange();
  }

  async getDatabaseSize(): Promise<number> {
    return this.storageService.getDatabaseSize();
  }

  // Private methods
  private createDefaultConfig(config?: Partial<MonitoringConfig>): MonitoringConfig {
    return {
      sampling: {
        systemMetricsInterval: 5000, // 5 seconds
        modelMetricsInterval: 1000, // 1 second
        alertCheckInterval: 10000 // 10 seconds
      },
      storage: {
        maxHistoryDays: 30,
        compressionEnabled: true,
        autoCleanup: true
      },
      thresholds: {
        cpu: { warning: 70, critical: 90 },
        memory: { warning: 80, critical: 95 },
        disk: { warning: 85, critical: 95 },
        modelLatency: { warning: 5000, critical: 10000 }, // milliseconds
        modelMemory: { warning: 512, critical: 1024 } // MB
      },
      alerts: {
        enabled: true,
        soundEnabled: false,
        notificationEnabled: false,
        emailEnabled: false
      },
      privacy: {
        localStorageOnly: true,
        encryptData: false,
        anonymizeData: false
      },
      ...config
    };
  }

  private async loadPersistedData(): Promise<void> {
    try {
      // Load recent data to populate current state
      const [systemMetrics, modelMetrics, alerts, recommendations] = await Promise.all([
        this.storageService.getSystemMetrics(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        this.storageService.getModelMetrics(undefined, undefined, Date.now() - 24 * 60 * 60 * 1000),
        this.storageService.getAlerts(false), // Active alerts only
        this.storageService.getRecommendations(false) // Active recommendations only
      ]);

      this.state.systemMetrics = systemMetrics;
      this.state.modelMetrics = modelMetrics;
      this.state.alerts = alerts;
      this.state.recommendations = recommendations;

    } catch (error) {
      console.warn('[PerformanceMonitor] Failed to load persisted data:', error);
    }
  }

  private async saveCurrentData(): Promise<void> {
    try {
      const recentSystemMetrics = this.systemMonitor.getRecentMetrics(100);
      const recentModelMetrics = this.modelTracker.getRecentMetrics(100);
      const allAlerts = this.alertSystem.getAllAlerts();
      const allRecommendations = this.recommendationEngine.getAllRecommendations();

      await Promise.all([
        recentSystemMetrics.length > 0 ? this.storageService.saveSystemMetrics(recentSystemMetrics) : Promise.resolve(),
        recentModelMetrics.length > 0 ? this.storageService.saveModelMetrics(recentModelMetrics) : Promise.resolve(),
        allAlerts.length > 0 ? this.storageService.saveAlerts(allAlerts) : Promise.resolve(),
        allRecommendations.length > 0 ? this.storageService.saveRecommendations(allRecommendations) : Promise.resolve()
      ]);

    } catch (error) {
      console.error('[PerformanceMonitor] Failed to save data:', error);
    }
  }

  private async generatePeriodicReport(): Promise<void> {
    try {
      const now = Date.now();
      const dayAgo = now - 24 * 60 * 60 * 1000;

      const [systemMetrics, modelMetrics, alerts, recommendations] = await Promise.all([
        this.storageService.getSystemMetrics(dayAgo, now),
        this.storageService.getModelMetrics(undefined, undefined, dayAgo, now),
        this.storageService.getAlerts(undefined, undefined, 1000),
        this.storageService.getRecommendations()
      ]);

      const report: PerformanceReport = {
        id: `report-${now}`,
        timestamp: now,
        period: { start: dayAgo, end: now },
        summary: {
          averageCpuUsage: systemMetrics.reduce((sum, m) => sum + m.cpu.usage, 0) / Math.max(systemMetrics.length, 1),
          averageMemoryUsage: systemMetrics.reduce((sum, m) => sum + m.memory.percentage, 0) / Math.max(systemMetrics.length, 1),
          averageDiskUsage: systemMetrics.reduce((sum, m) => sum + m.disk.percentage, 0) / Math.max(systemMetrics.length, 1),
          totalModelInferences: modelMetrics.filter(m => m.operation === 'inference').length,
          averageModelLatency: modelMetrics.reduce((sum, m) => sum + m.metrics.latency, 0) / Math.max(modelMetrics.length, 1),
          alertsGenerated: alerts.filter(a => a.timestamp >= dayAgo).length,
          recommendationsGenerated: recommendations.filter(r => r.timestamp >= dayAgo).length
        },
        trends: {
          cpuTrend: this.calculateTrend(systemMetrics.map(m => m.cpu.usage)),
          memoryTrend: this.calculateTrend(systemMetrics.map(m => m.memory.percentage)),
          diskTrend: this.calculateTrend(systemMetrics.map(m => m.disk.percentage)),
          modelPerformanceTrend: this.calculateTrend(modelMetrics.map(m => m.metrics.latency))
        },
        topIssues: alerts.filter(a => a.timestamp >= dayAgo).slice(0, 5),
        topRecommendations: recommendations.filter(r => r.timestamp >= dayAgo && !r.applied).slice(0, 5)
      };

      await this.storageService.saveReport(report);

    } catch (error) {
      console.error('[PerformanceMonitor] Failed to generate periodic report:', error);
    }
  }

  private calculateTrend(values: number[]): 'increasing' | 'decreasing' | 'stable' {
    if (values.length < 10) return 'stable';

    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));

    const firstAvg = firstHalf.reduce((sum, v) => sum + v, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, v) => sum + v, 0) / secondHalf.length;

    const change = (secondAvg - firstAvg) / firstAvg;
    
    if (change > 0.1) return 'increasing';
    if (change < -0.1) return 'decreasing';
    return 'stable';
  }

  private async performCleanup(): Promise<void> {
    try {
      await this.storageService.cleanupOldData();
      this.alertSystem.clearResolvedAlerts();
      this.recommendationEngine.clearOldRecommendations();
      console.log('[PerformanceMonitor] Cleanup completed');
    } catch (error) {
      console.error('[PerformanceMonitor] Cleanup failed:', error);
    }
  }

  private handleSystemMetrics(metrics: SystemMetrics): void {
    // Update state
    this.state.systemMetrics.push(metrics);
    if (this.state.systemMetrics.length > 1000) {
      this.state.systemMetrics = this.state.systemMetrics.slice(-1000);
    }

    // Check for alerts
    this.alertSystem.checkSystemMetrics(metrics);

    // Generate recommendations
    this.recommendationEngine.analyzeSystemMetrics([metrics]);

    // Notify callback
    this.callbacks.onSystemMetrics?.(metrics);
    this.notifyStateChange();
  }

  private handleModelMetrics(metrics: ModelPerformanceMetrics): void {
    // Update state
    this.state.modelMetrics.push(metrics);
    if (this.state.modelMetrics.length > 1000) {
      this.state.modelMetrics = this.state.modelMetrics.slice(-1000);
    }

    // Check for alerts
    this.alertSystem.checkModelMetrics(metrics);

    // Generate recommendations
    this.recommendationEngine.analyzeModelMetrics([metrics]);

    // Notify callback
    this.callbacks.onModelMetrics?.(metrics);
    this.notifyStateChange();
  }

  private handleAlert(alert: PerformanceAlert): void {
    // Update state
    this.state.alerts.push(alert);
    if (this.state.alerts.length > 500) {
      this.state.alerts = this.state.alerts.slice(-500);
    }

    // Generate reactive recommendations
    this.recommendationEngine.analyzeAlerts([alert]);

    // Notify callback
    this.callbacks.onAlert?.(alert);
    this.notifyStateChange();
  }

  private handleRecommendation(recommendation: OptimizationRecommendation): void {
    // Update state
    this.state.recommendations.push(recommendation);
    if (this.state.recommendations.length > 200) {
      this.state.recommendations = this.state.recommendations.slice(-200);
    }

    // Notify callback
    this.callbacks.onRecommendation?.(recommendation);
    this.notifyStateChange();
  }

  private notifyStateChange(): void {
    this.callbacks.onStateChange?.(this.state);
  }

  // Static utility methods
  static async createWithDefaults(): Promise<LocalPerformanceMonitor> {
    const monitor = new LocalPerformanceMonitor();
    await monitor.start();
    return monitor;
  }

  static getDefaultConfig(): MonitoringConfig {
    return new LocalPerformanceMonitor().state.config;
  }
}