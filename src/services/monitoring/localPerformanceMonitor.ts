import {
  MonitoringConfig,
  MonitoringState,
  ModelPerformanceMetrics,
  OptimizationRecommendation,
  PerformanceAlert,
  PerformanceThresholds,
  SystemMetrics
} from '../../types/monitoring';

interface SystemPerformanceStats {
  avgCpu: number;
  peakCpu: number;
  avgMemory: number;
  peakMemory: number;
  avgDisk: number;
  peakDisk: number;
  sampleCount: number;
}

interface ModelPerformanceStats {
  avgLatency: number;
  p95Latency: number;
  p99Latency: number;
  avgThroughput: number;
  avgMemoryUsage: number;
  totalOperations: number;
  errorRate: number;
}

type OperationType = ModelPerformanceMetrics['operation'];

type StateListener = (state: MonitoringState) => void;
type SystemMetricsListener = (metrics: SystemMetrics) => void;
type ModelMetricsListener = (metrics: ModelPerformanceMetrics) => void;
type AlertListener = (alert: PerformanceAlert) => void;
type RecommendationListener = (recommendation: OptimizationRecommendation) => void;

type PartialMonitoringConfig = Partial<Omit<MonitoringConfig, 'thresholds'>> & {
  thresholds?: Partial<{
    cpu: Partial<PerformanceThresholds['cpu']>;
    memory: Partial<PerformanceThresholds['memory']>;
    disk: Partial<PerformanceThresholds['disk']>;
    modelLatency: Partial<PerformanceThresholds['modelLatency']>;
    modelMemory: Partial<PerformanceThresholds['modelMemory']>;
  }>;
};

interface ActiveOperation {
  id: string;
  modelId: string;
  modelName: string;
  operation: OperationType;
  startTime: number;
  metadata?: Record<string, unknown>;
  inputTokens?: number;
}

const DEFAULT_CONFIG: MonitoringConfig = {
  sampling: {
    systemMetricsInterval: 5000,
    modelMetricsInterval: 1000,
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
    disk: { warning: 80, critical: 95 },
    modelLatency: { warning: 3000, critical: 8000 },
    modelMemory: { warning: 256, critical: 512 }
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

const HISTORY_LIMIT = 1000;
const RECOMMENDATION_LIMIT = 100;

function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function percentile(values: number[], percentileValue: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = (sorted.length - 1) * percentileValue;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) {
    return sorted[lower];
  }
  const weight = index - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

function calculateAverage(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  const total = values.reduce((sum, value) => sum + value, 0);
  return total / values.length;
}

export class LocalPerformanceMonitor {
  private config: MonitoringConfig;
  private readonly stateListeners = new Set<StateListener>();
  private readonly systemMetricsListeners = new Set<SystemMetricsListener>();
  private readonly modelMetricsListeners = new Set<ModelMetricsListener>();
  private readonly alertListeners = new Set<AlertListener>();
  private readonly recommendationListeners = new Set<RecommendationListener>();

  private systemMetrics: SystemMetrics[] = [];
  private modelMetrics: ModelPerformanceMetrics[] = [];
  private alerts: PerformanceAlert[] = [];
  private recommendations: OptimizationRecommendation[] = [];
  private activeOperations: Map<string, ActiveOperation> = new Map();

  private isRunning = false;
  private startedAt?: number;
  private systemMetricsTimer: ReturnType<typeof setInterval> | null = null;
  private alertTimer: ReturnType<typeof setInterval> | null = null;

  private networkTotals = {
    bytesReceived: 0,
    bytesSent: 0,
    packetsReceived: 0,
    packetsSent: 0
  };
  private diskThroughput = {
    read: 25,
    write: 20
  };

  constructor(config?: PartialMonitoringConfig) {
    this.config = this.mergeConfig(DEFAULT_CONFIG, config);
  }

  async start(): Promise<void> {
    if (this.isRunning) return;

    this.isRunning = true;
    this.startedAt = Date.now();

    this.collectSystemMetrics();
    this.startTimers();
    this.emitStateChange();
  }

  async stop(): Promise<void> {
    if (!this.isRunning) return;

    this.isRunning = false;
    this.stopTimers();
    this.emitStateChange();
  }

  getState(): MonitoringState {
    return {
      isRunning: this.isRunning,
      startedAt: this.startedAt,
      systemMetrics: [...this.systemMetrics],
      modelMetrics: [...this.modelMetrics],
      alerts: [...this.alerts],
      recommendations: [...this.recommendations],
      config: this.cloneConfig(this.config)
    };
  }

  onStateChange(listener: StateListener): () => void {
    this.stateListeners.add(listener);
    return () => this.stateListeners.delete(listener);
  }

  onSystemMetrics(listener: SystemMetricsListener): () => void {
    this.systemMetricsListeners.add(listener);
    return () => this.systemMetricsListeners.delete(listener);
  }

  onModelMetrics(listener: ModelMetricsListener): () => void {
    this.modelMetricsListeners.add(listener);
    return () => this.modelMetricsListeners.delete(listener);
  }

  onAlert(listener: AlertListener): () => void {
    this.alertListeners.add(listener);
    return () => this.alertListeners.delete(listener);
  }

  onRecommendation(listener: RecommendationListener): () => void {
    this.recommendationListeners.add(listener);
    return () => this.recommendationListeners.delete(listener);
  }

  getCurrentSystemMetrics(): SystemMetrics | null {
    return this.systemMetrics.length > 0 ? this.systemMetrics[this.systemMetrics.length - 1] : null;
  }

  getRecentSystemMetrics(count?: number): SystemMetrics[] {
    if (typeof count === 'number') {
      return this.systemMetrics.slice(-count);
    }
    return [...this.systemMetrics];
  }

  getRecentModelMetrics(count?: number, modelId?: string): ModelPerformanceMetrics[] {
    let metrics = [...this.modelMetrics];
    if (modelId) {
      metrics = metrics.filter(metric => metric.modelId === modelId);
    }
    if (typeof count === 'number') {
      return metrics.slice(-count);
    }
    return metrics;
  }

  getSystemPerformanceStats(timeframeMs?: number): SystemPerformanceStats | null {
    const metrics = this.filterByTime(this.systemMetrics, timeframeMs);
    if (metrics.length === 0) {
      return null;
    }

    const cpuValues = metrics.map(metric => metric.cpu.usage);
    const memoryValues = metrics.map(metric => metric.memory.percentage);
    const diskValues = metrics.map(metric => metric.disk.percentage);

    return {
      avgCpu: calculateAverage(cpuValues),
      peakCpu: Math.max(...cpuValues),
      avgMemory: calculateAverage(memoryValues),
      peakMemory: Math.max(...memoryValues),
      avgDisk: calculateAverage(diskValues),
      peakDisk: Math.max(...diskValues),
      sampleCount: metrics.length
    };
  }

  getModelPerformanceStats(modelId?: string, timeframeMs?: number): ModelPerformanceStats | null {
    let metrics = this.filterByTime(this.modelMetrics, timeframeMs);
    if (modelId) {
      metrics = metrics.filter(metric => metric.modelId === modelId);
    }

    if (metrics.length === 0) {
      return null;
    }

    const latencies = metrics.map(metric => metric.metrics.latency);
    const throughputs = metrics.map(metric => metric.metrics.throughput ?? 0);
    const memoryUsage = metrics.map(metric => metric.metrics.memoryUsage);
    const failures = metrics.filter(metric => (metric.metrics.errorRate ?? 0) > 0).length;

    return {
      avgLatency: calculateAverage(latencies),
      p95Latency: percentile(latencies, 0.95),
      p99Latency: percentile(latencies, 0.99),
      avgThroughput: calculateAverage(throughputs),
      avgMemoryUsage: calculateAverage(memoryUsage),
      totalOperations: metrics.length,
      errorRate: metrics.length > 0 ? (failures / metrics.length) * 100 : 0
    };
  }

  getActiveAlerts(): PerformanceAlert[] {
    return this.alerts.filter(alert => !alert.resolved);
  }

  getActiveRecommendations(): OptimizationRecommendation[] {
    return this.recommendations.filter(recommendation => !recommendation.applied);
  }

  async getHistoricalSystemMetrics(
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<SystemMetrics[]> {
    const filtered = this.filterByRange(this.systemMetrics, startTime, endTime);
    if (typeof limit === 'number') {
      return filtered.slice(-limit);
    }
    return filtered;
  }

  async getHistoricalModelMetrics(
    modelId?: string,
    operation?: OperationType,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<ModelPerformanceMetrics[]> {
    let metrics = this.filterByRange(this.modelMetrics, startTime, endTime);
    if (modelId) {
      metrics = metrics.filter(metric => metric.modelId === modelId);
    }
    if (operation) {
      metrics = metrics.filter(metric => metric.operation === operation);
    }
    if (typeof limit === 'number') {
      return metrics.slice(-limit);
    }
    return metrics;
  }

  resolveAlert(alertId: string, resolution?: string): boolean {
    const alert = this.alerts.find(item => item.id === alertId);
    if (!alert || alert.resolved) {
      return false;
    }

    alert.resolved = true;
    alert.resolvedAt = Date.now();
    if (resolution) {
      (alert as PerformanceAlert & { resolution?: string }).resolution = resolution;
    }
    this.notifyAlertListeners(alert);
    this.emitStateChange();
    return true;
  }

  createCustomAlert(
    type: PerformanceAlert['type'],
    category: PerformanceAlert['category'],
    title: string,
    message: string,
    currentValue = 0,
    threshold = 0
  ): PerformanceAlert {
    const alert = this.buildAlert(type, category, title, message, currentValue, threshold);
    this.alerts.push(alert);
    this.trimArray(this.alerts, HISTORY_LIMIT);
    this.notifyAlertListeners(alert);
    this.emitStateChange();
    return alert;
  }

  markRecommendationApplied(id: string): boolean {
    const recommendation = this.recommendations.find(item => item.id === id);
    if (!recommendation || recommendation.applied) {
      return false;
    }
    recommendation.applied = true;
    recommendation.appliedAt = Date.now();
    this.emitStateChange();
    return true;
  }

  generateProactiveRecommendations(): OptimizationRecommendation[] {
    const recommendationsBefore = this.recommendations.length;
    this.generateRecommendations(true);
    return this.recommendations
      .slice(recommendationsBefore)
      .filter(recommendation => !recommendation.applied);
  }

  updateConfig(newConfig: PartialMonitoringConfig): void {
    const wasRunning = this.isRunning;
    if (wasRunning) {
      this.stopTimers();
    }

    this.config = this.mergeConfig(this.config, newConfig);

    if (wasRunning) {
      this.startTimers();
    }

    this.emitStateChange();
  }

  updateThresholds(thresholds: Partial<PerformanceThresholds>): void {
    this.config = this.mergeConfig(this.config, { thresholds });
    this.emitStateChange();
  }

  async exportData(): Promise<string> {
    const data = {
      generatedAt: new Date().toISOString(),
      config: this.config,
      systemMetrics: this.systemMetrics,
      modelMetrics: this.modelMetrics,
      alerts: this.alerts,
      recommendations: this.recommendations
    };
    return JSON.stringify(data, null, 2);
  }

  async importData(jsonData: string): Promise<void> {
    try {
      const parsed = JSON.parse(jsonData);
      if (Array.isArray(parsed.systemMetrics)) {
        this.systemMetrics = parsed.systemMetrics;
      }
      if (Array.isArray(parsed.modelMetrics)) {
        this.modelMetrics = parsed.modelMetrics;
      }
      if (Array.isArray(parsed.alerts)) {
        this.alerts = parsed.alerts;
      }
      if (Array.isArray(parsed.recommendations)) {
        this.recommendations = parsed.recommendations;
      }
      if (parsed.config) {
        this.config = this.mergeConfig(this.config, parsed.config);
      }
      this.emitStateChange();
    } catch (error) {
      console.error('Failed to import monitoring data', error);
      throw error;
    }
  }

  async clearAllData(): Promise<void> {
    this.systemMetrics = [];
    this.modelMetrics = [];
    this.alerts = [];
    this.recommendations = [];
    this.activeOperations.clear();
    this.emitStateChange();
  }

  async getDatabaseSize(): Promise<number> {
    try {
      const json = await this.exportData();
      if (typeof Buffer !== 'undefined') {
        return Buffer.byteLength(json, 'utf8');
      }
      return json.length;
    } catch (error) {
      console.error('Failed to calculate database size', error);
      return 0;
    }
  }

  startModelOperation(
    modelId: string,
    modelName: string,
    operation: OperationType,
    metadata?: Record<string, unknown>
  ): string {
    const id = this.generateId('op');
    this.activeOperations.set(id, {
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
    additionalMetrics: Partial<ModelPerformanceMetrics['metrics']> & { tokenCount?: number } = {},
    metadata?: Record<string, unknown>
  ): ModelPerformanceMetrics | null {
    const operation = this.activeOperations.get(operationId);
    if (!operation) {
      return null;
    }

    this.activeOperations.delete(operationId);

    const endTime = Date.now();
    const duration = endTime - operation.startTime;

    const tokenCount = additionalMetrics.tokenCount ?? (metadata?.tokenCount as number | undefined);
    const throughput = tokenCount && duration > 0 ? tokenCount / (duration / 1000) : additionalMetrics.throughput;

    const metadataPayload = this.sanitizeModelMetadata(
      operation.metadata as Record<string, unknown> | undefined,
      metadata
    );

    const metrics: ModelPerformanceMetrics = {
      timestamp: endTime,
      modelId: operation.modelId,
      modelName: operation.modelName,
      operation: operation.operation,
      metrics: {
        latency: duration,
        throughput: throughput ?? 0,
        memoryUsage: additionalMetrics.memoryUsage ?? 0,
        cpuUsage: additionalMetrics.cpuUsage ?? 0,
        tokenCount: tokenCount ?? additionalMetrics.tokenCount,
        errorRate: success ? 0 : 100,
        accuracy: additionalMetrics.accuracy
      }
    };

    if (metadataPayload) {
      metrics.metadata = metadataPayload;
    }

    this.modelMetrics.push(metrics);
    this.trimArray(this.modelMetrics, HISTORY_LIMIT);
    this.notifyModelMetricsListeners(metrics);
    this.emitStateChange();
    return metrics;
  }

  async trackInference<T>(
    modelId: string,
    modelName: string,
    inferenceFunction: () => Promise<T>,
    inputTokens?: number,
    metadata?: Record<string, unknown>
  ): Promise<{ result: T; metrics: ModelPerformanceMetrics | null }> {
    const operationId = this.startModelOperation(modelId, modelName, 'inference', {
      ...metadata,
      inputTokens
    });

    try {
      const result = await inferenceFunction();
      const metrics = this.endModelOperation(
        operationId,
        true,
        {
          tokenCount: inputTokens,
          memoryUsage: metadata?.memoryUsage as number | undefined,
          cpuUsage: metadata?.cpuUsage as number | undefined
        },
        metadata
      );
      return { result, metrics };
    } catch (error) {
      this.endModelOperation(operationId, false, {}, { ...metadata, error: error instanceof Error ? error.message : error });
      throw error;
    }
  }

  private startTimers(): void {
    this.stopTimers();
    this.systemMetricsTimer = setInterval(
      () => this.collectSystemMetrics(),
      Math.max(1000, this.config.sampling.systemMetricsInterval)
    );
    this.alertTimer = setInterval(
      () => this.evaluateAlertsAndRecommendations(),
      Math.max(5000, this.config.sampling.alertCheckInterval)
    );
  }

  private stopTimers(): void {
    if (this.systemMetricsTimer) {
      clearInterval(this.systemMetricsTimer);
      this.systemMetricsTimer = null;
    }
    if (this.alertTimer) {
      clearInterval(this.alertTimer);
      this.alertTimer = null;
    }
  }

  private collectSystemMetrics(): void {
    const timestamp = Date.now();
    const previous = this.getCurrentSystemMetrics();

    const cores = this.getHardwareConcurrency(previous?.cpu.cores);
    const cpuUsage = this.generateNextValue(previous?.cpu.usage ?? 30, 5, 0, 100);

    const { usedMemory, totalMemory } = this.getMemoryUsage(previous?.memory.used, previous?.memory.total);
    const availableMemory = Math.max(totalMemory - usedMemory, 0);
    const memoryPercentage = totalMemory > 0 ? (usedMemory / totalMemory) * 100 : 0;

    const { diskUsed, diskTotal } = this.getDiskUsage(previous?.disk.used, previous?.disk.total);
    const diskAvailable = Math.max(diskTotal - diskUsed, 0);
    const diskPercentage = diskTotal > 0 ? (diskUsed / diskTotal) * 100 : 0;

    const networkUsage = this.getNetworkUsage(previous?.network);

    const metrics: SystemMetrics = {
      timestamp,
      cpu: {
        usage: cpuUsage,
        cores,
        temperature: previous?.cpu.temperature
      },
      memory: {
        used: usedMemory,
        total: totalMemory,
        available: availableMemory,
        percentage: clamp(memoryPercentage, 0, 100)
      },
      disk: {
        used: diskUsed,
        total: diskTotal,
        available: diskAvailable,
        percentage: clamp(diskPercentage, 0, 100),
        readSpeed: networkUsage.readSpeed,
        writeSpeed: networkUsage.writeSpeed
      },
      network: networkUsage.network
    };

    this.systemMetrics.push(metrics);
    this.trimArray(this.systemMetrics, HISTORY_LIMIT);
    this.trimHistoryByTime(this.systemMetrics);
    this.notifySystemMetricsListeners(metrics);
    this.emitStateChange();
  }

  private evaluateAlertsAndRecommendations(): void {
    this.evaluateAlerts();
    this.generateRecommendations();
  }

  private evaluateAlerts(): void {
    if (!this.config.alerts.enabled) {
      return;
    }

    const latest = this.getCurrentSystemMetrics();
    if (!latest) {
      return;
    }

    this.evaluateThreshold('CPU Usage', 'system', latest.cpu.usage, this.config.thresholds.cpu);
    this.evaluateThreshold('Memory Usage', 'memory', latest.memory.percentage, this.config.thresholds.memory);
    this.evaluateThreshold('Disk Usage', 'disk', latest.disk.percentage, this.config.thresholds.disk);
  }

  private evaluateThreshold(
    title: string,
    category: PerformanceAlert['category'],
    value: number,
    thresholds: PerformanceThresholds['cpu']
  ): void {
    if (value >= thresholds.critical) {
      this.createOrUpdateAlert('critical', category, `${title} Critical`, value, thresholds.critical);
    } else if (value >= thresholds.warning) {
      this.createOrUpdateAlert('warning', category, `${title} Elevated`, value, thresholds.warning);
    }
  }

  private createOrUpdateAlert(
    type: PerformanceAlert['type'],
    category: PerformanceAlert['category'],
    title: string,
    value: number,
    threshold: number
  ): void {
    const existing = this.alerts.find(alert => !alert.resolved && alert.category === category && alert.type === type);
    if (existing) {
      existing.currentValue = value;
      existing.timestamp = Date.now();
      this.notifyAlertListeners(existing);
      this.emitStateChange();
      return;
    }

    const alert = this.buildAlert(type, category, title, `${title} detected`, value, threshold);
    this.alerts.push(alert);
    this.trimArray(this.alerts, HISTORY_LIMIT);
    this.notifyAlertListeners(alert);
    this.emitStateChange();
  }

  private generateRecommendations(force = false): void {
    const latest = this.getCurrentSystemMetrics();
    if (!latest) {
      return;
    }

    const summary = this.getModelPerformanceStats();

    this.maybeCreateRecommendation(
      'Optimize CPU usage with batching',
      'Consider batching operations or reducing concurrent workloads to lower CPU pressure.',
      'system',
      'high',
      latest.cpu.usage > this.config.thresholds.cpu.warning,
      force,
      `Current CPU ${latest.cpu.usage.toFixed(1)}% (warning ${this.config.thresholds.cpu.warning}%)`
    );

    this.maybeCreateRecommendation(
      'Implement memory pooling',
      'Adopt memory pooling strategies or release unused references more aggressively to reduce memory usage.',
      'memory',
      'critical',
      latest.memory.percentage > this.config.thresholds.memory.warning,
      force,
      `Memory usage ${latest.memory.percentage.toFixed(1)}% (warning ${this.config.thresholds.memory.warning}%)`
    );

    if (summary) {
      this.maybeCreateRecommendation(
        'Investigate model latency bottlenecks',
        'Analyze recent model executions for slow operations and consider quantization or hardware acceleration.',
        'model',
        'high',
        summary.avgLatency > this.config.thresholds.modelLatency.warning,
        force,
        `Average latency ${summary.avgLatency.toFixed(0)}ms (warning ${this.config.thresholds.modelLatency.warning}ms)`
      );
    }
  }

  private maybeCreateRecommendation(
    title: string,
    description: string,
    category: OptimizationRecommendation['category'],
    priority: OptimizationRecommendation['priority'],
    condition: boolean,
    force: boolean,
    contextDetail?: string
  ): void {
    if (!condition) {
      return;
    }

    const existing = this.recommendations.find(recommendation =>
      !recommendation.applied && recommendation.title === title && Date.now() - recommendation.timestamp < 30 * 60 * 1000
    );

    if (existing && !force) {
      return;
    }

    const recommendation: OptimizationRecommendation = {
      id: this.generateId('rec'),
      timestamp: Date.now(),
      category,
      priority,
      title,
      description,
      impact: priority === 'critical' ? 'Immediate action recommended' : 'High impact expected',
      implementation: contextDetail ? [contextDetail] : [],
      estimatedImprovement:
        priority === 'critical' ? 'Significant stability improvements expected' : 'Noticeable improvements expected',
      applied: false,
      appliedAt: undefined
    };

    this.recommendations.push(recommendation);
    this.trimArray(this.recommendations, RECOMMENDATION_LIMIT);
    this.recommendationListeners.forEach(listener => listener(recommendation));
    this.emitStateChange();
  }

  private buildAlert(
    type: PerformanceAlert['type'],
    category: PerformanceAlert['category'],
    title: string,
    message: string,
    currentValue: number,
    threshold: number
  ): PerformanceAlert {
    return {
      id: this.generateId('alert'),
      timestamp: Date.now(),
      type,
      category,
      title,
      message,
      threshold,
      currentValue,
      resolved: false
    };
  }

  private notifySystemMetricsListeners(metrics: SystemMetrics): void {
    this.systemMetricsListeners.forEach(listener => {
      try {
        listener(metrics);
      } catch (error) {
        console.error('System metrics listener error', error);
      }
    });
  }

  private notifyModelMetricsListeners(metrics: ModelPerformanceMetrics): void {
    this.modelMetricsListeners.forEach(listener => {
      try {
        listener(metrics);
      } catch (error) {
        console.error('Model metrics listener error', error);
      }
    });
  }

  private notifyAlertListeners(alert: PerformanceAlert): void {
    this.alertListeners.forEach(listener => {
      try {
        listener(alert);
      } catch (error) {
        console.error('Alert listener error', error);
      }
    });
  }

  private emitStateChange(): void {
    const state = this.getState();
    this.stateListeners.forEach(listener => {
      try {
        listener(state);
      } catch (error) {
        console.error('State listener error', error);
      }
    });
  }

  private mergeConfig(base: MonitoringConfig, updates?: PartialMonitoringConfig): MonitoringConfig {
    if (!updates) {
      return this.cloneConfig(base);
    }

    const mergedThresholds: MonitoringConfig['thresholds'] = {
      cpu: { ...base.thresholds.cpu, ...(updates.thresholds?.cpu || {}) },
      memory: { ...base.thresholds.memory, ...(updates.thresholds?.memory || {}) },
      disk: { ...base.thresholds.disk, ...(updates.thresholds?.disk || {}) },
      modelLatency: { ...base.thresholds.modelLatency, ...(updates.thresholds?.modelLatency || {}) },
      modelMemory: { ...base.thresholds.modelMemory, ...(updates.thresholds?.modelMemory || {}) }
    };

    return {
      sampling: { ...base.sampling, ...(updates.sampling || {}) },
      storage: { ...base.storage, ...(updates.storage || {}) },
      thresholds: mergedThresholds,
      alerts: { ...base.alerts, ...(updates.alerts || {}) },
      privacy: { ...base.privacy, ...(updates.privacy || {}) }
    };
  }

  private cloneConfig(config: MonitoringConfig): MonitoringConfig {
    return {
      sampling: { ...config.sampling },
      storage: { ...config.storage },
      thresholds: {
        cpu: { ...config.thresholds.cpu },
        memory: { ...config.thresholds.memory },
        disk: { ...config.thresholds.disk },
        modelLatency: { ...config.thresholds.modelLatency },
        modelMemory: { ...config.thresholds.modelMemory }
      },
      alerts: { ...config.alerts },
      privacy: { ...config.privacy }
    };
  }

  private trimArray<T>(array: T[], maxLength: number): void {
    if (array.length > maxLength) {
      array.splice(0, array.length - maxLength);
    }
  }

  private trimHistoryByTime(collection: Array<{ timestamp: number }>): void {
    const retentionMs = this.config.storage.maxHistoryDays * 24 * 60 * 60 * 1000;
    const cutoff = Date.now() - retentionMs;
    const index = collection.findIndex(item => item.timestamp >= cutoff);
    if (index > 0) {
      collection.splice(0, index);
    }
  }

  private filterByTime<T extends { timestamp: number }>(
    items: T[],
    timeframeMs?: number
  ): T[] {
    if (!timeframeMs) {
      return [...items];
    }
    const cutoff = Date.now() - timeframeMs;
    return items.filter(item => item.timestamp >= cutoff);
  }

  private filterByRange<T extends { timestamp: number }>(
    items: T[],
    startTime?: number,
    endTime?: number
  ): T[] {
    return items.filter(item => {
      if (startTime && item.timestamp < startTime) {
        return false;
      }
      if (endTime && item.timestamp > endTime) {
        return false;
      }
      return true;
    });
  }

  private generateId(prefix: string): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return `${prefix}-${crypto.randomUUID()}`;
    }
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }

  private generateNextValue(current: number, delta: number, min: number, max: number): number {
    const variation = (Math.random() - 0.5) * 2 * delta;
    const next = current + variation;
    return clamp(Number(next.toFixed(2)), min, max);
  }

  private getHardwareConcurrency(fallback?: number): number {
    if (typeof navigator !== 'undefined' && typeof navigator.hardwareConcurrency === 'number') {
      return navigator.hardwareConcurrency;
    }
    return fallback ?? 4;
  }

  private getMemoryUsage(
    previousUsed?: number,
    previousTotal?: number
  ): { usedMemory: number; totalMemory: number } {
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      const memory = (performance as any).memory;
      return {
        usedMemory: memory.usedJSHeapSize ?? previousUsed ?? 0,
        totalMemory: memory.jsHeapSizeLimit ?? previousTotal ?? 4 * 1024 * 1024 * 1024
      };
    }

    const totalMemory = previousTotal ?? 8 * 1024 * 1024 * 1024;
    const usedMemory = this.generateNextValue(previousUsed ?? totalMemory * 0.45, totalMemory * 0.02, 0, totalMemory);
    return { usedMemory, totalMemory };
  }

  private getDiskUsage(
    previousUsed?: number,
    previousTotal?: number
  ): { diskUsed: number; diskTotal: number } {
    const diskTotal = previousTotal ?? 512 * 1024 * 1024 * 1024;
    const diskUsed = this.generateNextValue(previousUsed ?? diskTotal * 0.4, diskTotal * 0.01, 0, diskTotal);
    return { diskUsed, diskTotal };
  }

  private getNetworkUsage(previous?: SystemMetrics['network']): {
    network: SystemMetrics['network'];
    readSpeed: number;
    writeSpeed: number;
  } {
    const bytesReceived = this.networkTotals.bytesReceived + Math.floor(Math.random() * 1024 * 128);
    const bytesSent = this.networkTotals.bytesSent + Math.floor(Math.random() * 1024 * 96);
    const packetsReceived = this.networkTotals.packetsReceived + Math.floor(Math.random() * 500);
    const packetsSent = this.networkTotals.packetsSent + Math.floor(Math.random() * 400);

    this.networkTotals = { bytesReceived, bytesSent, packetsReceived, packetsSent };

    const readSpeed = this.generateNextValue(this.diskThroughput.read, 10, 0, 200);
    const writeSpeed = this.generateNextValue(this.diskThroughput.write, 10, 0, 200);

    this.diskThroughput = { read: readSpeed, write: writeSpeed };

    return {
      network: {
        bytesReceived,
        bytesSent,
        packetsReceived,
        packetsSent
      },
      readSpeed,
      writeSpeed
    };
  }

  private sanitizeModelMetadata(
    ...sources: Array<Record<string, unknown> | undefined>
  ): ModelPerformanceMetrics['metadata'] | undefined {
    const result: Partial<ModelPerformanceMetrics['metadata']> = {};

    for (const source of sources) {
      if (!source) continue;
      const candidate = source as Record<string, unknown>;

      if (typeof candidate.inputSize === 'number') {
        result.inputSize = candidate.inputSize;
      }
      if (typeof candidate.outputSize === 'number') {
        result.outputSize = candidate.outputSize;
      }
      if (typeof candidate.batchSize === 'number') {
        result.batchSize = candidate.batchSize;
      }
      if (typeof candidate.modelSize === 'number') {
        result.modelSize = candidate.modelSize;
      }
    }

    return Object.keys(result).length > 0 ? result as ModelPerformanceMetrics['metadata'] : undefined;
  }
}

export const localPerformanceMonitor = new LocalPerformanceMonitor();

export type { ModelPerformanceStats, SystemPerformanceStats };