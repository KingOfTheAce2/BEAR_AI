import { EventEmitter } from '../../utils/EventEmitter';
import {
  MonitoringConfig,
  MonitoringState,
  SystemMetrics,
  ModelPerformanceMetrics,
  PerformanceAlert,
  OptimizationRecommendation,
  PerformanceThresholds
} from '../../types/monitoring';

interface ModelOperationContext {
  id: string;
  modelId: string;
  modelName: string;
  operation: ModelPerformanceMetrics['operation'];
  startTime: number;
  metadata?: any;
}

interface ModelOperationMetrics {
  latency?: number;
  throughput?: number;
  memoryUsage?: number;
  cpuUsage?: number;
  tokenCount?: number;
  errorRate?: number;
  accuracy?: number;
}

const MILLISECONDS_IN_DAY = 24 * 60 * 60 * 1000;

const DEFAULT_CONFIG: MonitoringConfig = {
  sampling: {
    systemMetricsInterval: 5000,
    modelMetricsInterval: 2000,
    alertCheckInterval: 10000
  },
  storage: {
    maxHistoryDays: 7,
    compressionEnabled: false,
    autoCleanup: true
  },
  thresholds: {
    cpu: { warning: 70, critical: 90 },
    memory: { warning: 80, critical: 95 },
    disk: { warning: 85, critical: 95 },
    modelLatency: { warning: 4000, critical: 8000 },
    modelMemory: { warning: 512, critical: 1024 }
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
  }
};

const DEFAULT_STATE: MonitoringState = {
  isRunning: false,
  systemMetrics: [],
  modelMetrics: [],
  alerts: [],
  recommendations: [],
  config: DEFAULT_CONFIG
};

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function createId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(16).slice(2)}`;
}

function safeLocalStorage(): Storage | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage;
  } catch (error) {
    console.warn('LocalPerformanceMonitor: localStorage unavailable', error);
    return null;
  }
}

function mergeConfig(base: MonitoringConfig, overrides?: Partial<MonitoringConfig>): MonitoringConfig {
  if (!overrides) {
    return deepClone(base);
  }

  return {
    sampling: {
      ...base.sampling,
      ...overrides.sampling
    },
    storage: {
      ...base.storage,
      ...overrides.storage
    },
    thresholds: {
      cpu: {
        ...base.thresholds.cpu,
        ...overrides.thresholds?.cpu
      },
      memory: {
        ...base.thresholds.memory,
        ...overrides.thresholds?.memory
      },
      disk: {
        ...base.thresholds.disk,
        ...overrides.thresholds?.disk
      },
      modelLatency: {
        ...base.thresholds.modelLatency,
        ...overrides.thresholds?.modelLatency
      },
      modelMemory: {
        ...base.thresholds.modelMemory,
        ...overrides.thresholds?.modelMemory
      }
    },
    alerts: {
      ...base.alerts,
      ...overrides.alerts
    },
    privacy: {
      ...base.privacy,
      ...overrides.privacy
    }
  };
}

export class LocalPerformanceMonitor extends EventEmitter {
  private config: MonitoringConfig;
  private state: MonitoringState;
  private systemMetricsTimer: ReturnType<typeof setInterval> | null = null;
  private alertTimer: ReturnType<typeof setInterval> | null = null;
  private modelOperations: Map<string, ModelOperationContext> = new Map();
  private storageKey = 'bear_ai_local_performance_monitor';

  constructor(config?: Partial<MonitoringConfig>) {
    super();
    this.setMaxListeners(50);

    this.config = mergeConfig(DEFAULT_CONFIG, config);
    const persisted = this.loadPersistedState();
    if (persisted) {
      this.state = {
        ...persisted,
        config: mergeConfig(this.config, persisted.config)
      };
      this.config = this.state.config;
    } else {
      this.state = {
        ...deepClone(DEFAULT_STATE),
        config: deepClone(this.config)
      };
    }
  }

  /** Lifecycle Methods */
  async start(): Promise<void> {
    if (this.state.isRunning) {
      return;
    }

    this.state.isRunning = true;
    this.state.startedAt = Date.now();
    this.persistState();
    this.emitStateChange();

    this.collectSystemMetrics();

    this.systemMetricsTimer = setInterval(
      () => this.collectSystemMetrics(),
      Math.max(1000, this.config.sampling.systemMetricsInterval)
    );

    this.alertTimer = setInterval(
      () => this.evaluateAlerts(),
      Math.max(3000, this.config.sampling.alertCheckInterval)
    );
  }

  async stop(): Promise<void> {
    if (!this.state.isRunning) {
      return;
    }

    this.state.isRunning = false;
    this.state.startedAt = undefined;
    if (this.systemMetricsTimer) {
      clearInterval(this.systemMetricsTimer);
      this.systemMetricsTimer = null;
    }
    if (this.alertTimer) {
      clearInterval(this.alertTimer);
      this.alertTimer = null;
    }
    this.persistState();
    this.emitStateChange();
  }

  getState(): MonitoringState {
    return {
      ...deepClone(this.state),
      config: deepClone(this.config)
    };
  }

  onStateChange(callback: (state: MonitoringState) => void): () => void {
    this.on('stateChange', callback);
    return () => this.off('stateChange', callback);
  }

  /** Model Tracking */
  startModelOperation(
    modelId: string,
    modelName: string,
    operation: ModelPerformanceMetrics['operation'],
    metadata?: any
  ): string {
    const id = createId('op');
    this.modelOperations.set(id, {
      id,
      modelId,
      modelName,
      operation,
      startTime: Date.now(),
      metadata
    });
    return id;
  }

  endModelOperation(
    operationId: string,
    success: boolean,
    additionalMetrics: ModelOperationMetrics = {},
    metadata?: any
  ): ModelPerformanceMetrics | null {
    const context = this.modelOperations.get(operationId);
    if (!context) {
      return null;
    }

    this.modelOperations.delete(operationId);

    const now = Date.now();
    const duration = additionalMetrics.latency ?? Math.max(0, now - context.startTime);
    const tokenCount = additionalMetrics.tokenCount;
    const throughput = additionalMetrics.throughput ?? (tokenCount ? tokenCount / Math.max(1, duration / 1000) : undefined);

    const metrics: ModelPerformanceMetrics = {
      timestamp: now,
      modelId: context.modelId,
      modelName: context.modelName,
      operation: context.operation,
      metrics: {
        latency: duration,
        throughput,
        memoryUsage:
          additionalMetrics.memoryUsage ??
          this.estimateModelMemoryUsage(tokenCount),
        cpuUsage: additionalMetrics.cpuUsage ?? this.estimateCpuUsage(),
        tokenCount,
        errorRate: success ? additionalMetrics.errorRate ?? 0 : 100,
        accuracy: additionalMetrics.accuracy
      },
      metadata: {
        ...context.metadata,
        ...metadata,
        success
      }
    };

    this.state.modelMetrics.push(metrics);
    this.trimHistory();
    this.persistState();
    this.emit('modelMetrics', metrics);
    this.emitStateChange();

    if (!success) {
      this.createAlert(
        'error',
        'model',
        `${context.modelName} operation failed`,
        'A model operation failed and was recorded as an error.',
        0,
        100
      );
    } else {
      this.evaluateModelThresholds(metrics);
    }

    return metrics;
  }

  async trackInference<T>(
    modelId: string,
    modelName: string,
    inferenceFunction: () => Promise<T>,
    tokenCount?: number,
    metadata?: any
  ): Promise<{ result: T; metrics: ModelPerformanceMetrics | null }> {
    const operationId = this.startModelOperation(modelId, modelName, 'inference', metadata);
    const start = Date.now();
    try {
      const result = await inferenceFunction();
      const metrics = this.endModelOperation(
        operationId,
        true,
        {
          latency: Date.now() - start,
          tokenCount
        },
        metadata
      );
      return { result, metrics };
    } catch (error) {
      this.endModelOperation(
        operationId,
        false,
        {
          latency: Date.now() - start
        },
        {
          ...metadata,
          error: error instanceof Error ? error.message : error
        }
      );
      throw error;
    }
  }

  /** Data Access */
  getCurrentSystemMetrics(): SystemMetrics | null {
    if (this.state.systemMetrics.length === 0) {
      return null;
    }
    return this.state.systemMetrics[this.state.systemMetrics.length - 1];
  }

  getRecentSystemMetrics(count = 50): SystemMetrics[] {
    if (count <= 0) {
      return [];
    }
    return this.state.systemMetrics.slice(-count);
  }

  getRecentModelMetrics(count = 50): ModelPerformanceMetrics[] {
    if (count <= 0) {
      return [];
    }
    return this.state.modelMetrics.slice(-count);
  }

  getActiveAlerts(): PerformanceAlert[] {
    return this.state.alerts.filter(alert => !alert.resolved);
  }

  getActiveRecommendations(): OptimizationRecommendation[] {
    return this.state.recommendations.filter(rec => !rec.applied);
  }

  getSystemPerformanceStats(timeframeMs?: number): {
    avgCpu: number;
    peakCpu: number;
    avgMemory: number;
    peakMemory: number;
    avgDisk: number;
    peakDisk: number;
    samples: number;
  } | null {
    const cutoff = timeframeMs ? Date.now() - timeframeMs : null;
    const metrics = cutoff
      ? this.state.systemMetrics.filter(metric => metric.timestamp >= cutoff)
      : this.state.systemMetrics;

    if (metrics.length === 0) {
      return null;
    }

    const avg = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;

    const cpuValues = metrics.map(metric => metric.cpu.usage);
    const memoryValues = metrics.map(metric => metric.memory.percentage);
    const diskValues = metrics.map(metric => metric.disk.percentage);

    return {
      avgCpu: avg(cpuValues),
      peakCpu: Math.max(...cpuValues),
      avgMemory: avg(memoryValues),
      peakMemory: Math.max(...memoryValues),
      avgDisk: avg(diskValues),
      peakDisk: Math.max(...diskValues),
      samples: metrics.length
    };
  }

  getModelPerformanceStats(
    modelId?: string,
    timeframeMs?: number
  ): {
    avgLatency: number;
    avgMemory: number;
    errorRate: number;
    throughput: number;
    totalOperations: number;
    inferenceCount: number;
    trainingCount: number;
    loadingCount: number;
    uniqueModels: number;
  } {
    const cutoff = timeframeMs ? Date.now() - timeframeMs : null;
    let metrics = this.state.modelMetrics;

    if (modelId) {
      metrics = metrics.filter(metric => metric.modelId === modelId);
    }

    if (cutoff) {
      metrics = metrics.filter(metric => metric.timestamp >= cutoff);
    }

    if (metrics.length === 0) {
      return {
        avgLatency: 0,
        avgMemory: 0,
        errorRate: 0,
        throughput: 0,
        totalOperations: 0,
        inferenceCount: 0,
        trainingCount: 0,
        loadingCount: 0,
        uniqueModels: 0
      };
    }

    const latencyValues = metrics.map(metric => metric.metrics.latency);
    const memoryValues = metrics.map(metric => metric.metrics.memoryUsage);
    const errorValues = metrics.map(metric => metric.metrics.errorRate ?? 0);
    const throughputValues = metrics
      .map(metric => metric.metrics.throughput ?? 0)
      .filter(value => value > 0);

    const inferenceCount = metrics.filter(metric => metric.operation === 'inference').length;
    const trainingCount = metrics.filter(metric => metric.operation === 'training').length;
    const loadingCount = metrics.filter(metric => metric.operation === 'loading').length;
    const uniqueModels = new Set(metrics.map(metric => metric.modelId)).size;

    const avg = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;

    return {
      avgLatency: avg(latencyValues),
      avgMemory: avg(memoryValues),
      errorRate: avg(errorValues),
      throughput: throughputValues.length > 0 ? avg(throughputValues) : 0,
      totalOperations: metrics.length,
      inferenceCount,
      trainingCount,
      loadingCount,
      uniqueModels
    };
  }

  async getHistoricalSystemMetrics(
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<SystemMetrics[]> {
    let metrics = [...this.state.systemMetrics];

    if (startTime) {
      metrics = metrics.filter(metric => metric.timestamp >= startTime);
    }

    if (endTime) {
      metrics = metrics.filter(metric => metric.timestamp <= endTime);
    }

    if (limit && limit > 0) {
      metrics = metrics.slice(-limit);
    }

    return metrics;
  }

  async getHistoricalModelMetrics(
    modelId?: string,
    operation?: ModelPerformanceMetrics['operation'],
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<ModelPerformanceMetrics[]> {
    let metrics = [...this.state.modelMetrics];

    if (modelId) {
      metrics = metrics.filter(metric => metric.modelId === modelId);
    }

    if (operation) {
      metrics = metrics.filter(metric => metric.operation === operation);
    }

    if (startTime) {
      metrics = metrics.filter(metric => metric.timestamp >= startTime);
    }

    if (endTime) {
      metrics = metrics.filter(metric => metric.timestamp <= endTime);
    }

    if (limit && limit > 0) {
      metrics = metrics.slice(-limit);
    }

    return metrics;
  }

  /** Alert & Recommendation Management */
  resolveAlert(alertId: string, resolution?: string): boolean {
    const alert = this.state.alerts.find(item => item.id === alertId);
    if (!alert || alert.resolved) {
      return false;
    }

    alert.resolved = true;
    alert.resolvedAt = Date.now();
    if (resolution) {
      alert.message += `\nResolution: ${resolution}`;
    }
    this.persistState();
    this.emitStateChange();
    return true;
  }

  createCustomAlert(
    type: PerformanceAlert['type'],
    category: PerformanceAlert['category'],
    title: string,
    message: string
  ): PerformanceAlert {
    return this.createAlert(type, category, title, message, 0, 0);
  }

  markRecommendationApplied(id: string): boolean {
    const recommendation = this.state.recommendations.find(rec => rec.id === id);
    if (!recommendation || recommendation.applied) {
      return false;
    }

    recommendation.applied = true;
    recommendation.appliedAt = Date.now();
    this.persistState();
    this.emitStateChange();
    return true;
  }

  generateProactiveRecommendations(): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = [];
    const systemStats = this.getSystemPerformanceStats(60 * 60 * 1000);
    const modelStats = this.getModelPerformanceStats(undefined, 60 * 60 * 1000);

    if (systemStats) {
      if (systemStats.avgCpu > this.config.thresholds.cpu.warning) {
        recommendations.push(this.createRecommendation(
          'system',
          systemStats.avgCpu > this.config.thresholds.cpu.critical ? 'high' : 'medium',
          'Optimize CPU Usage',
          'Consider reducing background tasks, optimizing model configurations, or scheduling intensive jobs during off-peak hours.',
          'Improving CPU efficiency will help maintain consistent response times and avoid throttling.',
          ['Review running services', 'Enable batching for model requests', 'Adjust concurrency settings'],
          `${systemStats.avgCpu.toFixed(1)}% average CPU usage`
        ));
      }

      if (systemStats.avgMemory > this.config.thresholds.memory.warning) {
        recommendations.push(this.createRecommendation(
          'memory',
          systemStats.avgMemory > this.config.thresholds.memory.critical ? 'high' : 'medium',
          'Reduce Memory Consumption',
          'Unload unused models or reduce context window sizes to prevent memory pressure.',
          'Lowering memory usage prevents swapping and keeps inference fast.',
          ['Unload inactive models', 'Reduce cache sizes', 'Restart long-running services periodically'],
          `${systemStats.avgMemory.toFixed(1)}% average memory usage`
        ));
      }
    }

    if (modelStats.totalOperations > 0 && modelStats.avgLatency > this.config.thresholds.modelLatency.warning) {
      recommendations.push(this.createRecommendation(
        'model',
        modelStats.avgLatency > this.config.thresholds.modelLatency.critical ? 'critical' : 'high',
        'Improve Model Latency',
        'Latency for recent model operations is elevated. Consider quantization, caching, or using a faster variant.',
        'Reducing latency improves responsiveness and user satisfaction.',
        ['Enable result caching', 'Use hardware acceleration when available', 'Profile preprocessing and postprocessing steps'],
        `${modelStats.avgLatency.toFixed(0)}ms average latency`
      ));
    }

    this.mergeRecommendations(recommendations);
    return recommendations;
  }

  /** Configuration */
  updateConfig(newConfig: Partial<MonitoringConfig>): void {
    this.config = mergeConfig(this.config, newConfig);
    this.state.config = deepClone(this.config);
    this.restartTimersIfNeeded();
    this.persistState();
    this.emitStateChange();
  }

  updateThresholds(thresholds: Partial<PerformanceThresholds>): void {
    const nextThresholds: PerformanceThresholds = {
      cpu: {
        ...this.config.thresholds.cpu,
        ...thresholds.cpu
      },
      memory: {
        ...this.config.thresholds.memory,
        ...thresholds.memory
      },
      disk: {
        ...this.config.thresholds.disk,
        ...thresholds.disk
      },
      modelLatency: {
        ...this.config.thresholds.modelLatency,
        ...thresholds.modelLatency
      },
      modelMemory: {
        ...this.config.thresholds.modelMemory,
        ...thresholds.modelMemory
      }
    };

    this.updateConfig({ thresholds: nextThresholds });
  }

  /** Maintenance */
  async exportData(): Promise<string> {
    const snapshot = this.getState();
    return JSON.stringify(snapshot, null, 2);
  }

  async importData(jsonData: string): Promise<void> {
    try {
      const parsed = JSON.parse(jsonData);
      if (!parsed) {
        throw new Error('Invalid data format');
      }
      this.state = {
        ...parsed,
        config: mergeConfig(this.config, parsed.config)
      };
      this.config = this.state.config;
      this.trimHistory();
      this.persistState();
      this.emitStateChange();
    } catch (error) {
      throw new Error(`Failed to import monitoring data: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async clearAllData(): Promise<void> {
    this.state.systemMetrics = [];
    this.state.modelMetrics = [];
    this.state.alerts = [];
    this.state.recommendations = [];
    this.persistState();
    this.emitStateChange();
  }

  async getDatabaseSize(): Promise<number> {
    const snapshot = await this.exportData();
    return snapshot.length;
  }

  /** Event listeners */
  onSystemMetrics(callback: (metrics: SystemMetrics) => void): () => void {
    this.on('systemMetrics', callback);
    return () => this.off('systemMetrics', callback);
  }

  onModelMetrics(callback: (metrics: ModelPerformanceMetrics) => void): () => void {
    this.on('modelMetrics', callback);
    return () => this.off('modelMetrics', callback);
  }

  onAlert(callback: (alert: PerformanceAlert) => void): () => void {
    this.on('alert', callback);
    return () => this.off('alert', callback);
  }

  onRecommendation(callback: (recommendation: OptimizationRecommendation) => void): () => void {
    this.on('recommendation', callback);
    return () => this.off('recommendation', callback);
  }

  /** Internal helpers */
  private collectSystemMetrics(): void {
    const timestamp = Date.now();
    const previous = this.getCurrentSystemMetrics();

    const cpuUsage = this.smoothValue(previous?.cpu.usage ?? 35, 5, 5, 95);
    const memoryInfo = this.readMemoryInfo(previous?.memory.percentage ?? 45);
    const diskUsage = this.smoothValue(previous?.disk.percentage ?? 40, 4, 5, 95);

    const metrics: SystemMetrics = {
      timestamp,
      cpu: {
        usage: cpuUsage,
        cores: typeof navigator !== 'undefined' && navigator.hardwareConcurrency
          ? navigator.hardwareConcurrency
          : 4,
        temperature: undefined
      },
      memory: memoryInfo,
      disk: {
        used: this.estimateDiskValue(memoryInfo.used, 0.6, 0.9),
        total: this.estimateDiskValue(memoryInfo.total, 0.8, 1.2),
        available: this.estimateDiskValue(memoryInfo.available, 0.8, 1.2),
        percentage: diskUsage,
        readSpeed: this.randomInRange(50, 400),
        writeSpeed: this.randomInRange(50, 300)
      },
      network: {
        bytesReceived: this.randomInRange(1_000_000, 15_000_000),
        bytesSent: this.randomInRange(500_000, 5_000_000),
        packetsReceived: this.randomInRange(10_000, 150_000),
        packetsSent: this.randomInRange(8_000, 100_000)
      }
    };

    this.state.systemMetrics.push(metrics);
    this.trimHistory();
    this.persistState();
    this.emit('systemMetrics', metrics);
    this.emitStateChange();

    this.evaluateSystemThresholds(metrics);
    this.generateProactiveRecommendations();
  }

  private evaluateAlerts(): void {
    if (!this.config.alerts.enabled) {
      return;
    }

    const latest = this.getCurrentSystemMetrics();
    if (latest) {
      this.evaluateSystemThresholds(latest);
    }

    const recentModel = this.state.modelMetrics[this.state.modelMetrics.length - 1];
    if (recentModel) {
      this.evaluateModelThresholds(recentModel);
    }

    this.generateProactiveRecommendations();
  }

  private evaluateSystemThresholds(metrics: SystemMetrics): void {
    if (!this.config.alerts.enabled) {
      return;
    }

    const { thresholds } = this.config;

    this.checkThreshold(
      metrics.cpu.usage,
      thresholds.cpu,
      'system',
      'CPU usage elevated',
      'CPU usage has exceeded configured thresholds. Consider reducing load or optimizing workloads.'
    );

    this.checkThreshold(
      metrics.memory.percentage,
      thresholds.memory,
      'memory',
      'Memory usage elevated',
      'Memory usage is high. Consider unloading unused models or reducing cache sizes.'
    );

    this.checkThreshold(
      metrics.disk.percentage,
      thresholds.disk,
      'disk',
      'Disk usage elevated',
      'Disk utilization has exceeded thresholds. Clear temporary files or expand storage capacity.'
    );
  }

  private evaluateModelThresholds(metrics: ModelPerformanceMetrics): void {
    const { thresholds } = this.config;

    this.checkThreshold(
      metrics.metrics.latency,
      thresholds.modelLatency,
      'model',
      `${metrics.modelName} latency high`,
      'Model latency has exceeded the configured threshold.'
    );

    if (metrics.metrics.memoryUsage) {
      this.checkThreshold(
        metrics.metrics.memoryUsage / (1024 * 1024),
        thresholds.modelMemory,
        'model',
        `${metrics.modelName} memory usage high`,
        'Model memory consumption is elevated compared to configured thresholds.'
      );
    }
  }

  private checkThreshold(
    value: number,
    threshold: { warning: number; critical: number },
    category: PerformanceAlert['category'],
    title: string,
    message: string
  ): void {
    if (!value && value !== 0) {
      return;
    }

    if (value >= threshold.critical) {
      this.createAlert('critical', category, title, message, threshold.critical, value);
    } else if (value >= threshold.warning) {
      this.createAlert('warning', category, title, message, threshold.warning, value);
    }
  }

  private createAlert(
    type: PerformanceAlert['type'],
    category: PerformanceAlert['category'],
    title: string,
    message: string,
    threshold: number,
    currentValue: number
  ): PerformanceAlert {
    const existing = this.state.alerts.find(alert => !alert.resolved && alert.title === title);
    const timestamp = Date.now();

    if (existing) {
      existing.timestamp = timestamp;
      existing.currentValue = currentValue;
      this.persistState();
      this.emitStateChange();
      return existing;
    }

    const alert: PerformanceAlert = {
      id: createId('alert'),
      timestamp,
      type,
      category,
      title,
      message,
      threshold,
      currentValue,
      resolved: false
    };

    this.state.alerts.push(alert);
    this.persistState();
    this.emit('alert', alert);
    this.emitStateChange();
    return alert;
  }

  private createRecommendation(
    category: OptimizationRecommendation['category'],
    priority: OptimizationRecommendation['priority'],
    title: string,
    description: string,
    impact: string,
    implementation: string[],
    estimatedImprovement: string
  ): OptimizationRecommendation {
    return {
      id: createId('rec'),
      timestamp: Date.now(),
      category,
      priority,
      title,
      description,
      impact,
      implementation,
      estimatedImprovement,
      applied: false
    };
  }

  private mergeRecommendations(newRecommendations: OptimizationRecommendation[]): void {
    let added = false;
    newRecommendations.forEach(recommendation => {
      const existing = this.state.recommendations.find(rec => rec.title === recommendation.title);
      if (!existing) {
        this.state.recommendations.push(recommendation);
        added = true;
        this.emit('recommendation', recommendation);
      } else {
        existing.timestamp = recommendation.timestamp;
        existing.estimatedImprovement = recommendation.estimatedImprovement;
        existing.priority = recommendation.priority;
      }
    });

    if (added) {
      this.persistState();
      this.emitStateChange();
    }
  }

  private estimateModelMemoryUsage(tokenCount?: number): number {
    if (!tokenCount) {
      return this.randomInRange(128, 512) * 1024 * 1024;
    }
    const base = tokenCount * 8 * 1024;
    return base * this.randomInRange(1.5, 3);
  }

  private estimateCpuUsage(): number {
    return this.randomInRange(10, 85);
  }

  private readMemoryInfo(previousPercentage: number): SystemMetrics['memory'] {
    if (typeof performance !== 'undefined' && 'memory' in performance) {
      const memory = (performance as any).memory;
      const total = memory.jsHeapSizeLimit ?? memory.totalJSHeapSize ?? 512 * 1024 * 1024;
      const used = memory.usedJSHeapSize ?? memory.totalJSHeapSize ?? (total * previousPercentage) / 100;
      const available = Math.max(0, total - used);
      const percentage = total > 0 ? (used / total) * 100 : previousPercentage;

      return {
        used,
        total,
        available,
        percentage: Math.min(100, Math.max(0, percentage))
      };
    }

    const total = 8 * 1024 * 1024 * 1024; // Assume 8GB total for estimation
    const percentage = this.smoothValue(previousPercentage, 6, 10, 95);
    const used = (percentage / 100) * total;
    const available = total - used;

    return {
      used,
      total,
      available,
      percentage
    };
  }

  private estimateDiskValue(reference: number, minMultiplier: number, maxMultiplier: number): number {
    return reference * this.randomInRange(minMultiplier, maxMultiplier);
  }

  private randomInRange(min: number, max: number): number {
    return Math.random() * (max - min) + min;
  }

  private smoothValue(last: number, variation: number, min: number, max: number): number {
    const change = (Math.random() - 0.5) * variation;
    const next = last + change;
    return Math.min(max, Math.max(min, next));
  }

  private trimHistory(): void {
    if (!this.config.storage.autoCleanup) {
      return;
    }

    const cutoff = Date.now() - this.config.storage.maxHistoryDays * MILLISECONDS_IN_DAY;
    this.state.systemMetrics = this.state.systemMetrics.filter(metric => metric.timestamp >= cutoff);
    this.state.modelMetrics = this.state.modelMetrics.filter(metric => metric.timestamp >= cutoff);
    this.state.alerts = this.state.alerts.filter(alert => alert.timestamp >= cutoff || !alert.resolved);
    this.state.recommendations = this.state.recommendations.filter(rec => rec.timestamp >= cutoff || rec.applied);
  }

  private restartTimersIfNeeded(): void {
    if (!this.state.isRunning) {
      return;
    }

    if (this.systemMetricsTimer) {
      clearInterval(this.systemMetricsTimer);
    }
    if (this.alertTimer) {
      clearInterval(this.alertTimer);
    }

    this.systemMetricsTimer = setInterval(
      () => this.collectSystemMetrics(),
      Math.max(1000, this.config.sampling.systemMetricsInterval)
    );

    this.alertTimer = setInterval(
      () => this.evaluateAlerts(),
      Math.max(3000, this.config.sampling.alertCheckInterval)
    );
  }

  private loadPersistedState(): MonitoringState | null {
    const storage = safeLocalStorage();
    if (!storage) {
      return null;
    }

    const raw = storage.getItem(this.storageKey);
    if (!raw) {
      return null;
    }

    try {
      const parsed = JSON.parse(raw) as MonitoringState;
      return parsed;
    } catch (error) {
      console.warn('LocalPerformanceMonitor: failed to parse persisted state', error);
      return null;
    }
  }

  private persistState(): void {
    const storage = safeLocalStorage();
    if (!storage) {
      return;
    }

    try {
      const serializable: MonitoringState = {
        ...this.state,
        config: deepClone(this.config)
      };
      storage.setItem(this.storageKey, JSON.stringify(serializable));
    } catch (error) {
      console.warn('LocalPerformanceMonitor: failed to persist state', error);
    }
  }

  private emitStateChange(): void {
    this.emit('stateChange', this.getState());
  }
}

export function createLocalPerformanceMonitor(config?: Partial<MonitoringConfig>): LocalPerformanceMonitor {
  return new LocalPerformanceMonitor(config);
}

export type { MonitoringState as LocalMonitoringState };
