import { EventEmitter } from 'events';

export interface SystemMetrics {
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
  network: {
    bytesReceived: number;
    bytesSent: number;
    packetsReceived: number;
    packetsSent: number;
    latency: number;
  };
  disk: {
    used: number;
    total: number;
    percentage: number;
    readSpeed: number;
    writeSpeed: number;
  };
  gpu?: {
    usage: number;
    memory: number;
    temperature: number;
  };
  timestamp: number;
}

export interface ModelInferenceMetrics {
  modelName: string;
  requestId: string;
  startTime: number;
  endTime: number;
  duration: number;
  tokensGenerated: number;
  tokensPerSecond: number;
  memoryUsed: number;
  gpuUsage?: number;
  error?: string;
  inputTokens: number;
  outputTokens: number;
  latency: {
    firstToken: number;
    totalTime: number;
    networkTime: number;
    processingTime: number;
  };
}

export interface UserInteractionMetrics {
  sessionId: string;
  userId?: string;
  action: string;
  timestamp: number;
  duration: number;
  component: string;
  metadata?: Record<string, any>;
  performance: {
    renderTime: number;
    interactionToNextPaint: number;
    cumulativeLayoutShift: number;
    largestContentfulPaint: number;
  };
}

export interface PerformanceAlert {
  id: string;
  type: 'cpu' | 'memory' | 'network' | 'model' | 'user' | 'system';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: number;
  threshold: number;
  currentValue: number;
  resolved: boolean;
  metadata?: Record<string, any>;
}

export interface OptimizationSuggestion {
  id: string;
  category: 'performance' | 'memory' | 'network' | 'model' | 'ui';
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  effort: 'low' | 'medium' | 'high';
  priority: number;
  actionable: boolean;
  implementation?: string;
  metrics?: Record<string, number>;
  timestamp: number;
}

export class PerformanceMonitor extends EventEmitter {
  private metrics: SystemMetrics[] = [];
  private modelMetrics: ModelInferenceMetrics[] = [];
  private userMetrics: UserInteractionMetrics[] = [];
  private alerts: PerformanceAlert[] = [];
  private suggestions: OptimizationSuggestion[] = [];
  private isMonitoring = false;
  private monitoringInterval?: NodeJS.Timeout;
  private maxHistorySize = 1000;
  private thresholds = {
    cpu: 80,
    memory: 85,
    network: 1000, // ms
    diskUsage: 90,
    modelLatency: 5000, // ms
    renderTime: 100 // ms
  };

  constructor() {
    super();
    this.initializePerformanceObserver();
  }

  private initializePerformanceObserver() {
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      // Web Vitals monitoring
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.handlePerformanceEntry(entry);
        }
      });

      // Observe various performance entry types
      try {
        observer.observe({ entryTypes: ['navigation', 'paint', 'largest-contentful-paint', 'layout-shift'] });
      } catch (error) {
        console.warn('Performance Observer not fully supported:', error);
      }
    }
  }

  private handlePerformanceEntry(entry: PerformanceEntry) {
    const timestamp = Date.now();
    
    switch (entry.entryType) {
      case 'largest-contentful-paint':
        this.checkThreshold('renderTime', entry.startTime, 'UI performance degraded');
        break;
      case 'layout-shift':
        const layoutShift = entry as any;
        if (layoutShift.value > 0.1) {
          this.createAlert({
            type: 'user',
            severity: 'medium',
            message: 'High cumulative layout shift detected',
            threshold: 0.1,
            currentValue: layoutShift.value
          });
        }
        break;
    }
  }

  startMonitoring(intervalMs = 5000): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.monitoringInterval = setInterval(() => {
      this.collectSystemMetrics();
    }, intervalMs);

    this.emit('monitoring-started');
  }

  stopMonitoring(): void {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    this.emit('monitoring-stopped');
  }

  private async collectSystemMetrics(): Promise<void> {
    try {
      const metrics = await this.getSystemMetrics();
      this.addSystemMetrics(metrics);
      this.checkSystemThresholds(metrics);
      this.generateOptimizationSuggestions(metrics);
    } catch (error) {
      console.error('Failed to collect system metrics:', error);
    }
  }

  private async getSystemMetrics(): Promise<SystemMetrics> {
    const timestamp = Date.now();
    
    // Browser-based metrics collection
    if (typeof window !== 'undefined') {
      const memory = (performance as any).memory;
      const connection = (navigator as any).connection;
      
      return {
        cpu: {
          usage: await this.estimateCPUUsage(),
          cores: navigator.hardwareConcurrency || 4
        },
        memory: {
          used: memory?.usedJSHeapSize || 0,
          total: memory?.totalJSHeapSize || 0,
          available: memory?.jsHeapSizeLimit || 0,
          percentage: memory ? (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100 : 0
        },
        network: {
          bytesReceived: 0, // Would need service worker or server integration
          bytesSent: 0,
          packetsReceived: 0,
          packetsSent: 0,
          latency: connection?.rtt || 0
        },
        disk: {
          used: 0, // Not available in browser
          total: 0,
          percentage: 0,
          readSpeed: 0,
          writeSpeed: 0
        },
        timestamp
      };
    }

    // Node.js/Tauri metrics would be implemented here
    return this.getNodeSystemMetrics(timestamp);
  }

  private async estimateCPUUsage(): Promise<number> {
    return new Promise((resolve) => {
      const start = performance.now();
      const iterations = 100000;
      
      // Simple CPU intensive task
      for (let i = 0; i < iterations; i++) {
        Math.random() * Math.random();
      }
      
      const end = performance.now();
      const duration = end - start;
      
      // Estimate CPU usage based on execution time
      // This is a rough approximation
      const baselineTime = 10; // Expected time for the task
      const usage = Math.min(100, (duration / baselineTime) * 100);
      
      resolve(usage);
    });
  }

  private getNodeSystemMetrics(timestamp: number): SystemMetrics {
    // This would integrate with Node.js system monitoring
    // For now, return mock data
    return {
      cpu: { usage: 25, cores: 8 },
      memory: { used: 512000000, total: 8000000000, available: 7488000000, percentage: 6.4 },
      network: { bytesReceived: 1024000, bytesSent: 512000, packetsReceived: 1000, packetsSent: 800, latency: 20 },
      disk: { used: 50000000000, total: 250000000000, percentage: 20, readSpeed: 150, writeSpeed: 100 },
      timestamp
    };
  }

  trackModelInference(metrics: Omit<ModelInferenceMetrics, 'tokensPerSecond'>): void {
    const inferenceMetrics: ModelInferenceMetrics = {
      ...metrics,
      tokensPerSecond: metrics.tokensGenerated / (metrics.duration / 1000)
    };

    this.modelMetrics.push(inferenceMetrics);
    this.trimHistory(this.modelMetrics);

    // Check performance thresholds
    if (inferenceMetrics.duration > this.thresholds.modelLatency) {
      this.createAlert({
        type: 'model',
        severity: 'high',
        message: `Model inference too slow: ${inferenceMetrics.duration}ms`,
        threshold: this.thresholds.modelLatency,
        currentValue: inferenceMetrics.duration,
        metadata: { modelName: metrics.modelName, requestId: metrics.requestId }
      });
    }

    this.emit('model-metrics-updated', inferenceMetrics);
  }

  trackUserInteraction(metrics: UserInteractionMetrics): void {
    this.userMetrics.push(metrics);
    this.trimHistory(this.userMetrics);

    // Check UI performance thresholds
    if (metrics.performance.renderTime > this.thresholds.renderTime) {
      this.createAlert({
        type: 'user',
        severity: 'medium',
        message: `Slow render time: ${metrics.performance.renderTime}ms`,
        threshold: this.thresholds.renderTime,
        currentValue: metrics.performance.renderTime,
        metadata: { component: metrics.component, action: metrics.action }
      });
    }

    this.emit('user-metrics-updated', metrics);
  }

  private addSystemMetrics(metrics: SystemMetrics): void {
    this.metrics.push(metrics);
    this.trimHistory(this.metrics);
    this.emit('system-metrics-updated', metrics);
  }

  private checkSystemThresholds(metrics: SystemMetrics): void {
    if (metrics.cpu.usage > this.thresholds.cpu) {
      this.createAlert({
        type: 'cpu',
        severity: 'high',
        message: `High CPU usage: ${metrics.cpu.usage}%`,
        threshold: this.thresholds.cpu,
        currentValue: metrics.cpu.usage
      });
    }

    if (metrics.memory.percentage > this.thresholds.memory) {
      this.createAlert({
        type: 'memory',
        severity: 'high',
        message: `High memory usage: ${metrics.memory.percentage}%`,
        threshold: this.thresholds.memory,
        currentValue: metrics.memory.percentage
      });
    }

    if (metrics.disk.percentage > this.thresholds.diskUsage) {
      this.createAlert({
        type: 'system',
        severity: 'medium',
        message: `High disk usage: ${metrics.disk.percentage}%`,
        threshold: this.thresholds.diskUsage,
        currentValue: metrics.disk.percentage
      });
    }
  }

  private checkThreshold(type: string, value: number, message: string): void {
    const threshold = (this.thresholds as any)[type];
    if (threshold && value > threshold) {
      this.createAlert({
        type: type as any,
        severity: 'medium',
        message,
        threshold,
        currentValue: value
      });
    }
  }

  private createAlert(alertData: Omit<PerformanceAlert, 'id' | 'timestamp' | 'resolved'>): void {
    const alert: PerformanceAlert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      resolved: false,
      ...alertData
    };

    this.alerts.push(alert);
    this.trimHistory(this.alerts);
    this.emit('alert-created', alert);
  }

  private generateOptimizationSuggestions(metrics: SystemMetrics): void {
    const suggestions: OptimizationSuggestion[] = [];

    // CPU optimization suggestions
    if (metrics.cpu.usage > 70) {
      suggestions.push({
        id: `cpu-opt-${Date.now()}`,
        category: 'performance',
        title: 'High CPU Usage Detected',
        description: 'Consider optimizing compute-intensive operations or reducing background tasks',
        impact: 'high',
        effort: 'medium',
        priority: 8,
        actionable: true,
        implementation: 'Review active processes and implement task queuing',
        metrics: { cpuUsage: metrics.cpu.usage },
        timestamp: Date.now()
      });
    }

    // Memory optimization suggestions
    if (metrics.memory.percentage > 75) {
      suggestions.push({
        id: `memory-opt-${Date.now()}`,
        category: 'memory',
        title: 'High Memory Usage',
        description: 'Memory usage is high, consider implementing garbage collection or reducing memory footprint',
        impact: 'high',
        effort: 'medium',
        priority: 7,
        actionable: true,
        implementation: 'Implement memory pooling and optimize data structures',
        metrics: { memoryUsage: metrics.memory.percentage },
        timestamp: Date.now()
      });
    }

    // Add suggestions to the list
    this.suggestions.push(...suggestions);
    this.trimHistory(this.suggestions);

    if (suggestions.length > 0) {
      this.emit('optimization-suggestions', suggestions);
    }
  }

  private trimHistory<T>(array: T[]): void {
    if (array.length > this.maxHistorySize) {
      array.splice(0, array.length - this.maxHistorySize);
    }
  }

  // Public API methods
  getSystemMetrics(limit = 100): SystemMetrics[] {
    return this.metrics.slice(-limit);
  }

  getModelMetrics(limit = 100): ModelInferenceMetrics[] {
    return this.modelMetrics.slice(-limit);
  }

  getUserMetrics(limit = 100): UserInteractionMetrics[] {
    return this.userMetrics.slice(-limit);
  }

  getAlerts(unresolved = false): PerformanceAlert[] {
    return unresolved ? this.alerts.filter(a => !a.resolved) : this.alerts;
  }

  getOptimizationSuggestions(): OptimizationSuggestion[] {
    return this.suggestions.sort((a, b) => b.priority - a.priority);
  }

  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      this.emit('alert-resolved', alert);
      return true;
    }
    return false;
  }

  updateThresholds(newThresholds: Partial<typeof this.thresholds>): void {
    this.thresholds = { ...this.thresholds, ...newThresholds };
    this.emit('thresholds-updated', this.thresholds);
  }

  getPerformanceSummary() {
    const latestMetrics = this.metrics[this.metrics.length - 1];
    const recentAlerts = this.alerts.filter(a => !a.resolved && Date.now() - a.timestamp < 3600000); // Last hour
    const topSuggestions = this.suggestions.slice(0, 5);

    return {
      systemHealth: {
        cpu: latestMetrics?.cpu.usage || 0,
        memory: latestMetrics?.memory.percentage || 0,
        network: latestMetrics?.network.latency || 0
      },
      modelPerformance: {
        averageLatency: this.getAverageModelLatency(),
        tokensPerSecond: this.getAverageTokensPerSecond(),
        successRate: this.getModelSuccessRate()
      },
      userExperience: {
        averageRenderTime: this.getAverageRenderTime(),
        interactionLatency: this.getAverageInteractionLatency()
      },
      alerts: recentAlerts.length,
      suggestions: topSuggestions.length,
      timestamp: Date.now()
    };
  }

  private getAverageModelLatency(): number {
    if (this.modelMetrics.length === 0) return 0;
    const sum = this.modelMetrics.reduce((acc, m) => acc + m.duration, 0);
    return sum / this.modelMetrics.length;
  }

  private getAverageTokensPerSecond(): number {
    if (this.modelMetrics.length === 0) return 0;
    const sum = this.modelMetrics.reduce((acc, m) => acc + m.tokensPerSecond, 0);
    return sum / this.modelMetrics.length;
  }

  private getModelSuccessRate(): number {
    if (this.modelMetrics.length === 0) return 100;
    const successful = this.modelMetrics.filter(m => !m.error).length;
    return (successful / this.modelMetrics.length) * 100;
  }

  private getAverageRenderTime(): number {
    if (this.userMetrics.length === 0) return 0;
    const sum = this.userMetrics.reduce((acc, m) => acc + m.performance.renderTime, 0);
    return sum / this.userMetrics.length;
  }

  private getAverageInteractionLatency(): number {
    if (this.userMetrics.length === 0) return 0;
    const sum = this.userMetrics.reduce((acc, m) => acc + m.duration, 0);
    return sum / this.userMetrics.length;
  }

  // Export methods for data persistence
  exportMetrics() {
    return {
      system: this.metrics,
      model: this.modelMetrics,
      user: this.userMetrics,
      alerts: this.alerts,
      suggestions: this.suggestions,
      timestamp: Date.now()
    };
  }

  importMetrics(data: any) {
    if (data.system) this.metrics = data.system;
    if (data.model) this.modelMetrics = data.model;
    if (data.user) this.userMetrics = data.user;
    if (data.alerts) this.alerts = data.alerts;
    if (data.suggestions) this.suggestions = data.suggestions;
    
    this.emit('metrics-imported');
  }
}

export const performanceMonitor = new PerformanceMonitor();