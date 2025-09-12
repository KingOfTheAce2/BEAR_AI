// Local Performance Monitoring Types
export interface SystemMetrics {
  timestamp: number;
  cpu: {
    usage: number;
    cores: number;
    temperature?: number;
  };
  memory: {
    used: number;
    total: number;
    available: number;
    percentage: number;
  };
  disk: {
    used: number;
    total: number;
    available: number;
    percentage: number;
    readSpeed?: number;
    writeSpeed?: number;
  };
  network?: {
    bytesReceived: number;
    bytesSent: number;
    packetsReceived: number;
    packetsSent: number;
  };
}

export interface ModelPerformanceMetrics {
  timestamp: number;
  modelId: string;
  modelName: string;
  operation: 'inference' | 'training' | 'loading';
  metrics: {
    latency: number; // milliseconds
    throughput?: number; // tokens/second or requests/second
    memoryUsage: number; // bytes
    cpuUsage: number; // percentage
    tokenCount?: number;
    errorRate?: number;
    accuracy?: number;
  };
  metadata?: {
    inputSize?: number;
    outputSize?: number;
    batchSize?: number;
    modelSize?: number;
  };
}

export interface PerformanceAlert {
  id: string;
  timestamp: number;
  type: 'warning' | 'error' | 'critical';
  category: 'system' | 'model' | 'memory' | 'disk' | 'network';
  title: string;
  message: string;
  threshold: number;
  currentValue: number;
  resolved: boolean;
  resolvedAt?: number;
}

export interface PerformanceThresholds {
  cpu: {
    warning: number;
    critical: number;
  };
  memory: {
    warning: number;
    critical: number;
  };
  disk: {
    warning: number;
    critical: number;
  };
  modelLatency: {
    warning: number;
    critical: number;
  };
  modelMemory: {
    warning: number;
    critical: number;
  };
}

export interface OptimizationRecommendation {
  id: string;
  timestamp: number;
  category: 'system' | 'model' | 'memory' | 'disk' | 'network';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  impact: string;
  implementation: string[];
  estimatedImprovement: string;
  applied: boolean;
  appliedAt?: number;
}

export interface PerformanceReport {
  id: string;
  timestamp: number;
  period: {
    start: number;
    end: number;
  };
  summary: {
    averageCpuUsage: number;
    averageMemoryUsage: number;
    averageDiskUsage: number;
    totalModelInferences: number;
    averageModelLatency: number;
    alertsGenerated: number;
    recommendationsGenerated: number;
  };
  trends: {
    cpuTrend: 'increasing' | 'decreasing' | 'stable';
    memoryTrend: 'increasing' | 'decreasing' | 'stable';
    diskTrend: 'increasing' | 'decreasing' | 'stable';
    modelPerformanceTrend: 'improving' | 'degrading' | 'stable';
  };
  topIssues: PerformanceAlert[];
  topRecommendations: OptimizationRecommendation[];
}

export interface MonitoringConfig {
  sampling: {
    systemMetricsInterval: number; // milliseconds
    modelMetricsInterval: number; // milliseconds
    alertCheckInterval: number; // milliseconds
  };
  storage: {
    maxHistoryDays: number;
    compressionEnabled: boolean;
    autoCleanup: boolean;
  };
  thresholds: PerformanceThresholds;
  alerts: {
    enabled: boolean;
    soundEnabled: boolean;
    notificationEnabled: boolean;
    emailEnabled: boolean;
  };
  privacy: {
    localStorageOnly: boolean;
    encryptData: boolean;
    anonymizeData: boolean;
  };
}

export interface MonitoringState {
  isRunning: boolean;
  startedAt?: number;
  systemMetrics: SystemMetrics[];
  modelMetrics: ModelPerformanceMetrics[];
  alerts: PerformanceAlert[];
  recommendations: OptimizationRecommendation[];
  config: MonitoringConfig;
}