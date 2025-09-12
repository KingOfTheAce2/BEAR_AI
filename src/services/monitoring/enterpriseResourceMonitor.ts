/**
 * Enterprise Resource Monitoring and Alerting System
 * Real-time performance monitoring optimized for legal document processing
 * 
 * Features:
 * - Real-time system metrics collection
 * - Intelligent alerting with escalation
 * - Performance trend analysis
 * - Predictive resource management
 * - Multi-level dashboard integration
 * - Custom metrics for legal workflows
 * 
 * @version 3.0.0
 * @author BEAR AI Monitoring Team
 */

import { EventEmitter } from 'events';

export interface SystemMetrics {
  timestamp: number;
  cpu: {
    usage: number;
    cores: number;
    loadAverage: number[];
    frequency: number;
    temperature?: number;
  };
  memory: {
    total: number;
    used: number;
    free: number;
    available: number;
    percentage: number;
    swapTotal: number;
    swapUsed: number;
    buffers?: number;
    cached?: number;
  };
  disk: {
    total: number;
    used: number;
    free: number;
    percentage: number;
    readRate: number;
    writeRate: number;
    iops: number;
    latency: number;
  };
  network: {
    bytesReceived: number;
    bytesSent: number;
    packetsReceived: number;
    packetsSent: number;
    dropRate: number;
    errorRate: number;
    latency: number;
    bandwidth: number;
  };
  gpu?: {
    count: number;
    devices: Array<{
      id: number;
      name: string;
      usage: number;
      memory: {
        total: number;
        used: number;
        percentage: number;
      };
      temperature: number;
      powerUsage: number;
    }>;
  };
  processes: {
    total: number;
    running: number;
    sleeping: number;
    stopped: number;
    zombie: number;
    bearAiProcesses: number;
  };
}

export interface ApplicationMetrics {
  timestamp: number;
  documentProcessing: {
    queueSize: number;
    activeJobs: number;
    completedJobs: number;
    failedJobs: number;
    averageProcessingTime: number;
    throughput: number; // documents per minute
  };
  modelInference: {
    activeInferences: number;
    averageLatency: number;
    tokensPerSecond: number;
    cacheHitRate: number;
    modelMemoryUsage: number;
  };
  vectorDatabase: {
    totalVectors: number;
    searchesPerSecond: number;
    averageSearchTime: number;
    indexSize: number;
    cacheHitRate: number;
  };
  userSessions: {
    activeUsers: number;
    totalSessions: number;
    averageSessionDuration: number;
    concurrentQueries: number;
  };
  apiMetrics: {
    requestsPerSecond: number;
    averageResponseTime: number;
    errorRate: number;
    rateLimitHits: number;
    authenticatedRequests: number;
  };
}

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  condition: {
    metric: string;
    operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
    threshold: number;
    duration?: number; // Sustained for X seconds
  };
  severity: 'low' | 'medium' | 'high' | 'critical';
  channels: AlertChannel[];
  enabled: boolean;
  cooldownPeriod: number; // Seconds between alerts
  escalationRules?: EscalationRule[];
}

export interface EscalationRule {
  afterMinutes: number;
  severity: 'high' | 'critical';
  additionalChannels: AlertChannel[];
}

export interface AlertChannel {
  type: 'email' | 'slack' | 'webhook' | 'desktop' | 'sms';
  config: Record<string, any>;
}

export interface Alert {
  id: string;
  ruleId: string;
  ruleName: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: number;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: number;
  resolved: boolean;
  resolvedAt?: number;
  metadata: Record<string, any>;
}

export interface PerformanceTrend {
  metric: string;
  timeframe: '1h' | '6h' | '24h' | '7d' | '30d';
  data: Array<{
    timestamp: number;
    value: number;
  }>;
  trend: 'improving' | 'degrading' | 'stable';
  changePercent: number;
  prediction?: {
    nextHour: number;
    confidence: number;
  };
}

export interface HealthScore {
  overall: number;
  categories: {
    system: number;
    application: number;
    network: number;
    storage: number;
    security: number;
  };
  factors: Array<{
    name: string;
    impact: number;
    current: number;
    target: number;
  }>;
}

class MetricsCollector {
  private systemMetrics: SystemMetrics[] = [];
  private applicationMetrics: ApplicationMetrics[] = [];
  private maxHistorySize: number = 10000; // ~2.7 hours at 1-second intervals

  async collectSystemMetrics(): Promise<SystemMetrics> {
    const timestamp = Date.now();
    
    // Note: In a real implementation, these would use actual system APIs
    // For Node.js: os module, process.cpuUsage(), etc.
    // For Tauri: system information APIs
    
    const metrics: SystemMetrics = {
      timestamp,
      cpu: {
        usage: await this.getCPUUsage(),
        cores: await this.getCPUCores(),
        loadAverage: await this.getLoadAverage(),
        frequency: await this.getCPUFrequency(),
        temperature: await this.getCPUTemperature()
      },
      memory: {
        total: await this.getTotalMemory(),
        used: await this.getUsedMemory(),
        free: await this.getFreeMemory(),
        available: await this.getAvailableMemory(),
        percentage: 0, // Calculated below
        swapTotal: await this.getSwapTotal(),
        swapUsed: await this.getSwapUsed(),
        buffers: await this.getBuffers(),
        cached: await this.getCached()
      },
      disk: {
        total: await this.getDiskTotal(),
        used: await this.getDiskUsed(),
        free: await this.getDiskFree(),
        percentage: 0, // Calculated below
        readRate: await this.getDiskReadRate(),
        writeRate: await this.getDiskWriteRate(),
        iops: await this.getDiskIOPS(),
        latency: await this.getDiskLatency()
      },
      network: {
        bytesReceived: await this.getNetworkBytesReceived(),
        bytesSent: await this.getNetworkBytesSent(),
        packetsReceived: await this.getNetworkPacketsReceived(),
        packetsSent: await this.getNetworkPacketsSent(),
        dropRate: await this.getNetworkDropRate(),
        errorRate: await this.getNetworkErrorRate(),
        latency: await this.getNetworkLatency(),
        bandwidth: await this.getNetworkBandwidth()
      },
      gpu: await this.getGPUMetrics(),
      processes: {
        total: await this.getTotalProcesses(),
        running: await this.getRunningProcesses(),
        sleeping: await this.getSleepingProcesses(),
        stopped: await this.getStoppedProcesses(),
        zombie: await this.getZombieProcesses(),
        bearAiProcesses: await this.getBearAIProcesses()
      }
    };

    // Calculate percentages
    metrics.memory.percentage = (metrics.memory.used / metrics.memory.total) * 100;
    metrics.disk.percentage = (metrics.disk.used / metrics.disk.total) * 100;

    this.addSystemMetric(metrics);
    return metrics;
  }

  async collectApplicationMetrics(): Promise<ApplicationMetrics> {
    const timestamp = Date.now();
    
    const metrics: ApplicationMetrics = {
      timestamp,
      documentProcessing: {
        queueSize: await this.getDocumentQueueSize(),
        activeJobs: await this.getActiveDocumentJobs(),
        completedJobs: await this.getCompletedDocumentJobs(),
        failedJobs: await this.getFailedDocumentJobs(),
        averageProcessingTime: await this.getAverageDocumentProcessingTime(),
        throughput: await this.getDocumentThroughput()
      },
      modelInference: {
        activeInferences: await this.getActiveInferences(),
        averageLatency: await this.getModelAverageLatency(),
        tokensPerSecond: await this.getTokensPerSecond(),
        cacheHitRate: await this.getModelCacheHitRate(),
        modelMemoryUsage: await this.getModelMemoryUsage()
      },
      vectorDatabase: {
        totalVectors: await this.getTotalVectors(),
        searchesPerSecond: await this.getVectorSearchesPerSecond(),
        averageSearchTime: await this.getAverageVectorSearchTime(),
        indexSize: await this.getVectorIndexSize(),
        cacheHitRate: await this.getVectorCacheHitRate()
      },
      userSessions: {
        activeUsers: await this.getActiveUsers(),
        totalSessions: await this.getTotalSessions(),
        averageSessionDuration: await this.getAverageSessionDuration(),
        concurrentQueries: await this.getConcurrentQueries()
      },
      apiMetrics: {
        requestsPerSecond: await this.getRequestsPerSecond(),
        averageResponseTime: await this.getAverageResponseTime(),
        errorRate: await this.getAPIErrorRate(),
        rateLimitHits: await this.getRateLimitHits(),
        authenticatedRequests: await this.getAuthenticatedRequests()
      }
    };

    this.addApplicationMetric(metrics);
    return metrics;
  }

  private addSystemMetric(metric: SystemMetrics) {
    this.systemMetrics.push(metric);
    if (this.systemMetrics.length > this.maxHistorySize) {
      this.systemMetrics.shift();
    }
  }

  private addApplicationMetric(metric: ApplicationMetrics) {
    this.applicationMetrics.push(metric);
    if (this.applicationMetrics.length > this.maxHistorySize) {
      this.applicationMetrics.shift();
    }
  }

  getSystemMetricsHistory(limit?: number): SystemMetrics[] {
    return limit ? this.systemMetrics.slice(-limit) : this.systemMetrics;
  }

  getApplicationMetricsHistory(limit?: number): ApplicationMetrics[] {
    return limit ? this.applicationMetrics.slice(-limit) : this.applicationMetrics;
  }

  // Mock implementations - replace with actual system calls
  private async getCPUUsage(): Promise<number> { return Math.random() * 100; }
  private async getCPUCores(): Promise<number> { return 8; }
  private async getLoadAverage(): Promise<number[]> { return [1.5, 1.2, 1.0]; }
  private async getCPUFrequency(): Promise<number> { return 3.4; }
  private async getCPUTemperature(): Promise<number> { return 65 + Math.random() * 20; }
  
  private async getTotalMemory(): Promise<number> { return 16 * 1024 * 1024 * 1024; }
  private async getUsedMemory(): Promise<number> { return 8 * 1024 * 1024 * 1024; }
  private async getFreeMemory(): Promise<number> { return 8 * 1024 * 1024 * 1024; }
  private async getAvailableMemory(): Promise<number> { return 10 * 1024 * 1024 * 1024; }
  private async getSwapTotal(): Promise<number> { return 4 * 1024 * 1024 * 1024; }
  private async getSwapUsed(): Promise<number> { return 1 * 1024 * 1024 * 1024; }
  private async getBuffers(): Promise<number> { return 512 * 1024 * 1024; }
  private async getCached(): Promise<number> { return 2 * 1024 * 1024 * 1024; }

  private async getDiskTotal(): Promise<number> { return 1024 * 1024 * 1024 * 1024; }
  private async getDiskUsed(): Promise<number> { return 500 * 1024 * 1024 * 1024; }
  private async getDiskFree(): Promise<number> { return 524 * 1024 * 1024 * 1024; }
  private async getDiskReadRate(): Promise<number> { return 150 + Math.random() * 50; }
  private async getDiskWriteRate(): Promise<number> { return 100 + Math.random() * 30; }
  private async getDiskIOPS(): Promise<number> { return 1000 + Math.random() * 500; }
  private async getDiskLatency(): Promise<number> { return 5 + Math.random() * 5; }

  private async getNetworkBytesReceived(): Promise<number> { return Math.random() * 1000000; }
  private async getNetworkBytesSent(): Promise<number> { return Math.random() * 1000000; }
  private async getNetworkPacketsReceived(): Promise<number> { return Math.random() * 10000; }
  private async getNetworkPacketsSent(): Promise<number> { return Math.random() * 10000; }
  private async getNetworkDropRate(): Promise<number> { return Math.random() * 0.1; }
  private async getNetworkErrorRate(): Promise<number> { return Math.random() * 0.05; }
  private async getNetworkLatency(): Promise<number> { return 20 + Math.random() * 30; }
  private async getNetworkBandwidth(): Promise<number> { return 1000; }

  private async getGPUMetrics(): Promise<SystemMetrics['gpu']> {
    return {
      count: 1,
      devices: [{
        id: 0,
        name: "NVIDIA RTX 4090",
        usage: Math.random() * 100,
        memory: {
          total: 24 * 1024 * 1024 * 1024,
          used: Math.random() * 12 * 1024 * 1024 * 1024,
          percentage: Math.random() * 50
        },
        temperature: 60 + Math.random() * 25,
        powerUsage: 300 + Math.random() * 150
      }]
    };
  }

  private async getTotalProcesses(): Promise<number> { return 200 + Math.random() * 50; }
  private async getRunningProcesses(): Promise<number> { return 10 + Math.random() * 20; }
  private async getSleepingProcesses(): Promise<number> { return 180 + Math.random() * 40; }
  private async getStoppedProcesses(): Promise<number> { return Math.random() * 5; }
  private async getZombieProcesses(): Promise<number> { return Math.random() * 2; }
  private async getBearAIProcesses(): Promise<number> { return 5 + Math.random() * 3; }

  // Application metrics mock implementations
  private async getDocumentQueueSize(): Promise<number> { return Math.random() * 50; }
  private async getActiveDocumentJobs(): Promise<number> { return Math.random() * 10; }
  private async getCompletedDocumentJobs(): Promise<number> { return Math.random() * 1000; }
  private async getFailedDocumentJobs(): Promise<number> { return Math.random() * 20; }
  private async getAverageDocumentProcessingTime(): Promise<number> { return 30 + Math.random() * 60; }
  private async getDocumentThroughput(): Promise<number> { return 5 + Math.random() * 10; }

  private async getActiveInferences(): Promise<number> { return Math.random() * 5; }
  private async getModelAverageLatency(): Promise<number> { return 100 + Math.random() * 200; }
  private async getTokensPerSecond(): Promise<number> { return 20 + Math.random() * 30; }
  private async getModelCacheHitRate(): Promise<number> { return 60 + Math.random() * 30; }
  private async getModelMemoryUsage(): Promise<number> { return 2 * 1024 * 1024 * 1024; }

  private async getTotalVectors(): Promise<number> { return 100000 + Math.random() * 50000; }
  private async getVectorSearchesPerSecond(): Promise<number> { return Math.random() * 100; }
  private async getAverageVectorSearchTime(): Promise<number> { return 10 + Math.random() * 40; }
  private async getVectorIndexSize(): Promise<number> { return 500 * 1024 * 1024; }
  private async getVectorCacheHitRate(): Promise<number> { return 70 + Math.random() * 25; }

  private async getActiveUsers(): Promise<number> { return Math.random() * 20; }
  private async getTotalSessions(): Promise<number> { return Math.random() * 100; }
  private async getAverageSessionDuration(): Promise<number> { return 1800 + Math.random() * 3600; }
  private async getConcurrentQueries(): Promise<number> { return Math.random() * 15; }

  private async getRequestsPerSecond(): Promise<number> { return Math.random() * 50; }
  private async getAverageResponseTime(): Promise<number> { return 50 + Math.random() * 200; }
  private async getAPIErrorRate(): Promise<number> { return Math.random() * 5; }
  private async getRateLimitHits(): Promise<number> { return Math.random() * 10; }
  private async getAuthenticatedRequests(): Promise<number> { return Math.random() * 40; }
}

class AlertEngine {
  private alerts: Alert[] = [];
  private alertRules: AlertRule[] = [];
  private alertHistory: Alert[] = [];
  private lastAlertTimes: Map<string, number> = new Map();

  constructor() {
    this.initializeDefaultRules();
  }

  private initializeDefaultRules() {
    const defaultRules: AlertRule[] = [
      {
        id: 'cpu-high',
        name: 'High CPU Usage',
        description: 'CPU usage exceeds 90% for sustained period',
        condition: {
          metric: 'cpu.usage',
          operator: 'gt',
          threshold: 90,
          duration: 300 // 5 minutes
        },
        severity: 'high',
        channels: [{ type: 'desktop', config: {} }],
        enabled: true,
        cooldownPeriod: 300,
        escalationRules: [{
          afterMinutes: 10,
          severity: 'critical',
          additionalChannels: [{ type: 'email', config: {} }]
        }]
      },
      {
        id: 'memory-critical',
        name: 'Critical Memory Usage',
        description: 'Memory usage exceeds 95%',
        condition: {
          metric: 'memory.percentage',
          operator: 'gt',
          threshold: 95
        },
        severity: 'critical',
        channels: [
          { type: 'desktop', config: {} },
          { type: 'email', config: {} }
        ],
        enabled: true,
        cooldownPeriod: 180
      },
      {
        id: 'disk-full',
        name: 'Disk Space Critical',
        description: 'Disk usage exceeds 90%',
        condition: {
          metric: 'disk.percentage',
          operator: 'gt',
          threshold: 90
        },
        severity: 'high',
        channels: [{ type: 'desktop', config: {} }],
        enabled: true,
        cooldownPeriod: 3600 // 1 hour
      },
      {
        id: 'document-queue-full',
        name: 'Document Processing Queue Full',
        description: 'Document processing queue exceeds capacity',
        condition: {
          metric: 'documentProcessing.queueSize',
          operator: 'gt',
          threshold: 100
        },
        severity: 'medium',
        channels: [{ type: 'desktop', config: {} }],
        enabled: true,
        cooldownPeriod: 900 // 15 minutes
      },
      {
        id: 'model-latency-high',
        name: 'High Model Inference Latency',
        description: 'Model inference latency exceeds acceptable threshold',
        condition: {
          metric: 'modelInference.averageLatency',
          operator: 'gt',
          threshold: 5000 // 5 seconds
        },
        severity: 'medium',
        channels: [{ type: 'desktop', config: {} }],
        enabled: true,
        cooldownPeriod: 600 // 10 minutes
      }
    ];

    this.alertRules = defaultRules;
  }

  evaluateMetrics(systemMetrics: SystemMetrics, applicationMetrics: ApplicationMetrics) {
    const allMetrics = this.flattenMetrics(systemMetrics, applicationMetrics);
    
    for (const rule of this.alertRules) {
      if (!rule.enabled) continue;

      // Check cooldown period
      const lastAlertTime = this.lastAlertTimes.get(rule.id) || 0;
      const now = Date.now();
      if (now - lastAlertTime < rule.cooldownPeriod * 1000) {
        continue;
      }

      // Evaluate condition
      if (this.evaluateCondition(rule.condition, allMetrics)) {
        const alert = this.createAlert(rule, allMetrics);
        this.triggerAlert(alert);
        this.lastAlertTimes.set(rule.id, now);
      }
    }
  }

  private flattenMetrics(systemMetrics: SystemMetrics, applicationMetrics: ApplicationMetrics): Record<string, any> {
    const flattened: Record<string, any> = {};
    
    const flatten = (obj: any, prefix: string = '') => {
      for (const [key, value] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          flatten(value, fullKey);
        } else {
          flattened[fullKey] = value;
        }
      }
    };
    
    flatten(systemMetrics);
    flatten(applicationMetrics);
    
    return flattened;
  }

  private evaluateCondition(condition: AlertRule['condition'], metrics: Record<string, any>): boolean {
    const value = metrics[condition.metric];
    if (value === undefined) return false;

    switch (condition.operator) {
      case 'gt': return value > condition.threshold;
      case 'lt': return value < condition.threshold;
      case 'eq': return value === condition.threshold;
      case 'gte': return value >= condition.threshold;
      case 'lte': return value <= condition.threshold;
      default: return false;
    }
  }

  private createAlert(rule: AlertRule, metrics: Record<string, any>): Alert {
    const currentValue = metrics[rule.condition.metric];
    
    return {
      id: `${rule.id}-${Date.now()}`,
      ruleId: rule.id,
      ruleName: rule.name,
      severity: rule.severity,
      message: `${rule.description}. Current value: ${currentValue}, Threshold: ${rule.condition.threshold}`,
      timestamp: Date.now(),
      acknowledged: false,
      resolved: false,
      metadata: {
        metric: rule.condition.metric,
        currentValue,
        threshold: rule.condition.threshold,
        operator: rule.condition.operator
      }
    };
  }

  private triggerAlert(alert: Alert) {
    this.alerts.push(alert);
    this.alertHistory.push({ ...alert });
    
    // Limit active alerts
    if (this.alerts.length > 1000) {
      this.alerts.shift();
    }
    
    // Emit alert event
    this.onAlert?.(alert);
  }

  acknowledgeAlert(alertId: string, acknowledgedBy: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert && !alert.acknowledged) {
      alert.acknowledged = true;
      alert.acknowledgedBy = acknowledgedBy;
      alert.acknowledgedAt = Date.now();
      return true;
    }
    return false;
  }

  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert && !alert.resolved) {
      alert.resolved = true;
      alert.resolvedAt = Date.now();
      return true;
    }
    return false;
  }

  getActiveAlerts(): Alert[] {
    return this.alerts.filter(a => !a.resolved);
  }

  getAlertHistory(limit: number = 100): Alert[] {
    return this.alertHistory.slice(-limit);
  }

  addAlertRule(rule: AlertRule) {
    this.alertRules.push(rule);
  }

  removeAlertRule(ruleId: string): boolean {
    const index = this.alertRules.findIndex(r => r.id === ruleId);
    if (index !== -1) {
      this.alertRules.splice(index, 1);
      return true;
    }
    return false;
  }

  getAlertRules(): AlertRule[] {
    return [...this.alertRules];
  }

  // Callback for alert notifications
  onAlert?: (alert: Alert) => void;
}

class TrendAnalyzer {
  private metricsHistory: { system: SystemMetrics[], application: ApplicationMetrics[] } = {
    system: [],
    application: []
  };

  addSystemMetrics(metrics: SystemMetrics) {
    this.metricsHistory.system.push(metrics);
    if (this.metricsHistory.system.length > 10000) {
      this.metricsHistory.system.shift();
    }
  }

  addApplicationMetrics(metrics: ApplicationMetrics) {
    this.metricsHistory.application.push(metrics);
    if (this.metricsHistory.application.length > 10000) {
      this.metricsHistory.application.shift();
    }
  }

  analyzeSystemTrend(metric: string, timeframe: '1h' | '6h' | '24h' | '7d'): PerformanceTrend {
    const now = Date.now();
    const timeRanges = {
      '1h': 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000
    };

    const cutoffTime = now - timeRanges[timeframe];
    const relevantMetrics = this.metricsHistory.system.filter(m => m.timestamp >= cutoffTime);

    const data = relevantMetrics.map(m => ({
      timestamp: m.timestamp,
      value: this.extractMetricValue(m, metric)
    })).filter(d => d.value !== undefined);

    if (data.length < 2) {
      return {
        metric,
        timeframe,
        data: [],
        trend: 'stable',
        changePercent: 0
      };
    }

    // Calculate trend
    const firstValue = data[0].value;
    const lastValue = data[data.length - 1].value;
    const changePercent = ((lastValue - firstValue) / firstValue) * 100;

    let trend: 'improving' | 'degrading' | 'stable' = 'stable';
    if (Math.abs(changePercent) > 5) {
      // For most metrics, lower is better (except throughput-related)
      const improvementMetrics = ['throughput', 'tokensPerSecond', 'cacheHitRate'];
      const isImprovementMetric = improvementMetrics.some(im => metric.includes(im));
      
      if (isImprovementMetric) {
        trend = changePercent > 0 ? 'improving' : 'degrading';
      } else {
        trend = changePercent < 0 ? 'improving' : 'degrading';
      }
    }

    // Simple linear prediction for next hour
    const prediction = this.predictNextValue(data);

    return {
      metric,
      timeframe,
      data,
      trend,
      changePercent,
      prediction
    };
  }

  private extractMetricValue(metrics: SystemMetrics | ApplicationMetrics, path: string): number | undefined {
    const parts = path.split('.');
    let value: any = metrics;
    
    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        return undefined;
      }
    }
    
    return typeof value === 'number' ? value : undefined;
  }

  private predictNextValue(data: Array<{timestamp: number, value: number}>): { nextHour: number, confidence: number } {
    if (data.length < 5) {
      return { nextHour: data[data.length - 1].value, confidence: 0 };
    }

    // Simple linear regression
    const n = data.length;
    const sumX = data.reduce((sum, d, i) => sum + i, 0);
    const sumY = data.reduce((sum, d) => sum + d.value, 0);
    const sumXY = data.reduce((sum, d, i) => sum + i * d.value, 0);
    const sumX2 = data.reduce((sum, d, i) => sum + i * i, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Predict next hour (assume 1-minute intervals)
    const nextHour = intercept + slope * (n + 60);
    
    // Calculate confidence based on R-squared
    const meanY = sumY / n;
    const totalSumSquares = data.reduce((sum, d) => sum + Math.pow(d.value - meanY, 2), 0);
    const residualSumSquares = data.reduce((sum, d, i) => {
      const predicted = intercept + slope * i;
      return sum + Math.pow(d.value - predicted, 2);
    }, 0);
    
    const rSquared = 1 - (residualSumSquares / totalSumSquares);
    const confidence = Math.max(0, Math.min(100, rSquared * 100));

    return { nextHour, confidence };
  }
}

class HealthScoreCalculator {
  calculateHealthScore(
    systemMetrics: SystemMetrics, 
    applicationMetrics: ApplicationMetrics,
    alerts: Alert[]
  ): HealthScore {
    const categories = {
      system: this.calculateSystemHealth(systemMetrics),
      application: this.calculateApplicationHealth(applicationMetrics),
      network: this.calculateNetworkHealth(systemMetrics),
      storage: this.calculateStorageHealth(systemMetrics),
      security: this.calculateSecurityHealth(alerts)
    };

    const overall = Object.values(categories).reduce((sum, score) => sum + score, 0) / Object.keys(categories).length;

    const factors = [
      { name: 'CPU Usage', impact: 0.2, current: systemMetrics.cpu.usage, target: 70 },
      { name: 'Memory Usage', impact: 0.25, current: systemMetrics.memory.percentage, target: 80 },
      { name: 'Disk Usage', impact: 0.15, current: systemMetrics.disk.percentage, target: 85 },
      { name: 'Active Alerts', impact: 0.2, current: alerts.filter(a => !a.resolved).length, target: 0 },
      { name: 'Processing Queue', impact: 0.2, current: applicationMetrics.documentProcessing.queueSize, target: 10 }
    ];

    return { overall, categories, factors };
  }

  private calculateSystemHealth(metrics: SystemMetrics): number {
    let score = 100;
    
    // CPU penalty
    if (metrics.cpu.usage > 90) score -= 30;
    else if (metrics.cpu.usage > 80) score -= 20;
    else if (metrics.cpu.usage > 70) score -= 10;
    
    // Memory penalty
    if (metrics.memory.percentage > 95) score -= 40;
    else if (metrics.memory.percentage > 90) score -= 25;
    else if (metrics.memory.percentage > 80) score -= 10;
    
    // Load average penalty
    const loadAvg = metrics.cpu.loadAverage[0];
    const cores = metrics.cpu.cores;
    if (loadAvg > cores * 2) score -= 20;
    else if (loadAvg > cores * 1.5) score -= 10;
    
    return Math.max(0, score);
  }

  private calculateApplicationHealth(metrics: ApplicationMetrics): number {
    let score = 100;
    
    // Document processing health
    if (metrics.documentProcessing.queueSize > 50) score -= 20;
    if (metrics.documentProcessing.failedJobs > metrics.documentProcessing.completedJobs * 0.1) score -= 15;
    
    // Model inference health  
    if (metrics.modelInference.averageLatency > 5000) score -= 25;
    if (metrics.modelInference.cacheHitRate < 50) score -= 10;
    
    // API health
    if (metrics.apiMetrics.errorRate > 5) score -= 20;
    if (metrics.apiMetrics.averageResponseTime > 1000) score -= 15;
    
    return Math.max(0, score);
  }

  private calculateNetworkHealth(metrics: SystemMetrics): number {
    let score = 100;
    
    if (metrics.network.errorRate > 1) score -= 30;
    if (metrics.network.dropRate > 0.1) score -= 20;
    if (metrics.network.latency > 100) score -= 15;
    
    return Math.max(0, score);
  }

  private calculateStorageHealth(metrics: SystemMetrics): number {
    let score = 100;
    
    if (metrics.disk.percentage > 95) score -= 40;
    else if (metrics.disk.percentage > 90) score -= 25;
    else if (metrics.disk.percentage > 80) score -= 10;
    
    if (metrics.disk.latency > 20) score -= 15;
    if (metrics.disk.iops < 500) score -= 10;
    
    return Math.max(0, score);
  }

  private calculateSecurityHealth(alerts: Alert[]): number {
    const criticalAlerts = alerts.filter(a => a.severity === 'critical' && !a.resolved);
    const highAlerts = alerts.filter(a => a.severity === 'high' && !a.resolved);
    
    let score = 100;
    score -= criticalAlerts.length * 25;
    score -= highAlerts.length * 10;
    
    return Math.max(0, score);
  }
}

export class EnterpriseResourceMonitor extends EventEmitter {
  private metricsCollector: MetricsCollector;
  private alertEngine: AlertEngine;
  private trendAnalyzer: TrendAnalyzer;
  private healthCalculator: HealthScoreCalculator;
  
  private monitoring: boolean = false;
  private monitoringInterval?: NodeJS.Timeout;
  private collectionInterval: number = 5000; // 5 seconds
  
  constructor() {
    super();
    
    this.metricsCollector = new MetricsCollector();
    this.alertEngine = new AlertEngine();
    this.trendAnalyzer = new TrendAnalyzer();
    this.healthCalculator = new HealthScoreCalculator();
    
    // Forward alerts
    this.alertEngine.onAlert = (alert) => {
      this.emit('alert', alert);
    };
  }

  async startMonitoring(interval: number = 5000) {
    if (this.monitoring) return;
    
    this.monitoring = true;
    this.collectionInterval = interval;
    
    await this.collectMetrics();
    
    this.monitoringInterval = setInterval(async () => {
      await this.collectMetrics();
    }, interval);
    
    this.emit('monitoring-started');
  }

  stopMonitoring() {
    if (!this.monitoring) return;
    
    this.monitoring = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
    
    this.emit('monitoring-stopped');
  }

  private async collectMetrics() {
    try {
      const [systemMetrics, applicationMetrics] = await Promise.all([
        this.metricsCollector.collectSystemMetrics(),
        this.metricsCollector.collectApplicationMetrics()
      ]);
      
      // Add to trend analyzer
      this.trendAnalyzer.addSystemMetrics(systemMetrics);
      this.trendAnalyzer.addApplicationMetrics(applicationMetrics);
      
      // Evaluate alerts
      this.alertEngine.evaluateMetrics(systemMetrics, applicationMetrics);
      
      // Calculate health score
      const alerts = this.alertEngine.getActiveAlerts();
      const healthScore = this.healthCalculator.calculateHealthScore(
        systemMetrics, 
        applicationMetrics, 
        alerts
      );
      
      // Emit events
      this.emit('metrics-collected', {
        system: systemMetrics,
        application: applicationMetrics,
        health: healthScore
      });
      
    } catch (error) {
      this.emit('error', error);
    }
  }

  // Public API methods
  getCurrentMetrics(): { system: SystemMetrics, application: ApplicationMetrics } | null {
    const systemHistory = this.metricsCollector.getSystemMetricsHistory(1);
    const applicationHistory = this.metricsCollector.getApplicationMetricsHistory(1);
    
    if (systemHistory.length === 0 || applicationHistory.length === 0) {
      return null;
    }
    
    return {
      system: systemHistory[0],
      application: applicationHistory[0]
    };
  }

  getMetricsHistory(limit?: number): { system: SystemMetrics[], application: ApplicationMetrics[] } {
    return {
      system: this.metricsCollector.getSystemMetricsHistory(limit),
      application: this.metricsCollector.getApplicationMetricsHistory(limit)
    };
  }

  getTrend(metric: string, timeframe: '1h' | '6h' | '24h' | '7d' = '1h'): PerformanceTrend {
    return this.trendAnalyzer.analyzeSystemTrend(metric, timeframe);
  }

  getHealthScore(): HealthScore | null {
    const current = this.getCurrentMetrics();
    if (!current) return null;
    
    const alerts = this.alertEngine.getActiveAlerts();
    return this.healthCalculator.calculateHealthScore(
      current.system,
      current.application,
      alerts
    );
  }

  getAlerts(): Alert[] {
    return this.alertEngine.getActiveAlerts();
  }

  acknowledgeAlert(alertId: string, acknowledgedBy: string = 'user'): boolean {
    return this.alertEngine.acknowledgeAlert(alertId, acknowledgedBy);
  }

  resolveAlert(alertId: string): boolean {
    return this.alertEngine.resolveAlert(alertId);
  }

  addAlertRule(rule: AlertRule): void {
    this.alertEngine.addAlertRule(rule);
  }

  removeAlertRule(ruleId: string): boolean {
    return this.alertEngine.removeAlertRule(ruleId);
  }

  getAlertRules(): AlertRule[] {
    return this.alertEngine.getAlertRules();
  }

  // Export data for external analysis
  exportData() {
    return {
      metrics: this.getMetricsHistory(),
      alerts: this.alertEngine.getAlertHistory(),
      rules: this.getAlertRules(),
      health: this.getHealthScore(),
      timestamp: Date.now()
    };
  }
}

// Singleton instance
let globalMonitor: EnterpriseResourceMonitor | null = null;

export function getResourceMonitor(): EnterpriseResourceMonitor {
  if (!globalMonitor) {
    globalMonitor = new EnterpriseResourceMonitor();
  }
  return globalMonitor;
}

export default EnterpriseResourceMonitor;