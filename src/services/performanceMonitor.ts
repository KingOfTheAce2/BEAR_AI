/**
 * Performance Monitor Service for BEAR AI
 * Monitors system and model performance metrics
 */

import { EventEmitter } from 'events';

export interface SystemMetrics {
  timestamp: number;
  cpu: {
    usage: number;
    cores: number;
    frequency: number;
  };
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  network: {
    latency: number;
    upload: number;
    download: number;
  };
}

export interface ModelInferenceMetrics {
  modelId: string;
  startTime: number;
  endTime: number;
  duration: number;
  tokensGenerated: number;
  tokensPerSecond: number;
  memoryUsed: number;
  gpuUsage?: number;
  success: boolean;
  error?: string;
}

export interface PerformanceAlert {
  id: string;
  type: 'cpu' | 'memory' | 'latency' | 'error-rate' | 'custom';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  threshold: number;
  currentValue: number;
  timestamp: number;
  resolved: boolean;
}

export interface OptimizationSuggestion {
  id: string;
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  effort: 'low' | 'medium' | 'high';
  priority: number;
  category: 'system' | 'model' | 'code' | 'infrastructure';
  implementation?: string;
  timestamp: number;
}

export interface PerformanceSummary {
  systemHealth: {
    cpu: number;
    memory: number;
    network: number;
    overall: number;
  };
  modelPerformance: {
    averageLatency: number;
    tokensPerSecond: number;
    successRate: number;
    errorCount: number;
  };
  alerts: {
    active: number;
    critical: number;
    resolved: number;
  };
  suggestions: {
    available: number;
    highPriority: number;
  };
}

class PerformanceMonitor extends EventEmitter {
  private isMonitoring: boolean = false;
  private systemMetrics: SystemMetrics[] = [];
  private modelMetrics: ModelInferenceMetrics[] = [];
  private alerts: PerformanceAlert[] = [];
  private suggestions: OptimizationSuggestion[] = [];
  private monitoringInterval: number | null = null;

  constructor() {
    super();
    this.setMaxListeners(50);
  }

  /**
   * Start performance monitoring
   */
  startMonitoring(interval: number = 5000): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.monitoringInterval = window.setInterval(() => {
      this.collectSystemMetrics();
      this.checkAlerts();
      this.generateSuggestions();
    }, interval);

    this.emit('monitoring-started');
  }

  /**
   * Stop performance monitoring
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;
    if (this.monitoringInterval) {
      window.clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    this.emit('monitoring-stopped');
  }

  /**
   * Record model inference metrics
   */
  recordModelInference(metrics: Omit<ModelInferenceMetrics, 'tokensPerSecond'>): void {
    const fullMetrics: ModelInferenceMetrics = {
      ...metrics,
      tokensPerSecond: metrics.duration > 0 ? metrics.tokensGenerated / (metrics.duration / 1000) : 0
    };

    this.modelMetrics.push(fullMetrics);

    // Keep only last 1000 metrics
    if (this.modelMetrics.length > 1000) {
      this.modelMetrics = this.modelMetrics.slice(-1000);
    }

    this.emit('model-metrics-updated', fullMetrics);
  }

  /**
   * Get system metrics
   */
  getSystemMetrics(): SystemMetrics[] {
    return [...this.systemMetrics];
  }

  /**
   * Get model metrics
   */
  getModelMetrics(): ModelInferenceMetrics[] {
    return [...this.modelMetrics];
  }

  /**
   * Get alerts
   */
  getAlerts(): PerformanceAlert[] {
    return [...this.alerts];
  }

  /**
   * Get optimization suggestions
   */
  getOptimizationSuggestions(): OptimizationSuggestion[] {
    return [...this.suggestions];
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(): PerformanceSummary {
    const recentSystemMetrics = this.systemMetrics.slice(-10);
    const recentModelMetrics = this.modelMetrics.slice(-100);
    const activeAlerts = this.alerts.filter(a => !a.resolved);

    // Calculate system health
    const avgCpu = recentSystemMetrics.reduce((sum, m) => sum + m.cpu.usage, 0) / Math.max(recentSystemMetrics.length, 1);
    const avgMemory = recentSystemMetrics.reduce((sum, m) => sum + m.memory.percentage, 0) / Math.max(recentSystemMetrics.length, 1);
    const avgNetwork = recentSystemMetrics.reduce((sum, m) => sum + m.network.latency, 0) / Math.max(recentSystemMetrics.length, 1);
    const overall = (avgCpu + avgMemory) / 2;

    // Calculate model performance
    const avgLatency = recentModelMetrics.reduce((sum, m) => sum + m.duration, 0) / Math.max(recentModelMetrics.length, 1);
    const avgTokensPerSecond = recentModelMetrics.reduce((sum, m) => sum + m.tokensPerSecond, 0) / Math.max(recentModelMetrics.length, 1);
    const successCount = recentModelMetrics.filter(m => m.success).length;
    const successRate = recentModelMetrics.length > 0 ? (successCount / recentModelMetrics.length) * 100 : 100;
    const errorCount = recentModelMetrics.filter(m => !m.success).length;

    return {
      systemHealth: {
        cpu: avgCpu,
        memory: avgMemory,
        network: avgNetwork,
        overall
      },
      modelPerformance: {
        averageLatency: avgLatency,
        tokensPerSecond: avgTokensPerSecond,
        successRate,
        errorCount
      },
      alerts: {
        active: activeAlerts.length,
        critical: activeAlerts.filter(a => a.severity === 'critical').length,
        resolved: this.alerts.filter(a => a.resolved).length
      },
      suggestions: {
        available: this.suggestions.length,
        highPriority: this.suggestions.filter(s => s.priority >= 8).length
      }
    };
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string): void {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      this.emit('alert-resolved', alert);
    }
  }

  /**
   * Clear old data
   */
  clearOldData(olderThanMs: number = 24 * 60 * 60 * 1000): void {
    const cutoff = Date.now() - olderThanMs;

    this.systemMetrics = this.systemMetrics.filter(m => m.timestamp > cutoff);
    this.modelMetrics = this.modelMetrics.filter(m => m.startTime > cutoff);
    this.alerts = this.alerts.filter(a => a.timestamp > cutoff);
    this.suggestions = this.suggestions.filter(s => s.timestamp > cutoff);
  }

  private collectSystemMetrics(): void {
    // Mock system metrics collection
    // In a real implementation, this would collect actual system metrics
    const metrics: SystemMetrics = {
      timestamp: Date.now(),
      cpu: {
        usage: Math.random() * 50 + 10, // 10-60%
        cores: 8,
        frequency: 2400
      },
      memory: {
        used: Math.random() * 4000000000 + 1000000000, // 1-5GB
        total: 8000000000, // 8GB
        percentage: Math.random() * 40 + 20 // 20-60%
      },
      network: {
        latency: Math.random() * 50 + 10, // 10-60ms
        upload: Math.random() * 100,
        download: Math.random() * 1000
      }
    };

    this.systemMetrics.push(metrics);

    // Keep only last 1000 metrics
    if (this.systemMetrics.length > 1000) {
      this.systemMetrics = this.systemMetrics.slice(-1000);
    }

    this.emit('system-metrics-updated', metrics);
  }

  private checkAlerts(): void {
    const latest = this.systemMetrics[this.systemMetrics.length - 1];
    if (!latest) return;

    // Check CPU alert
    if (latest.cpu.usage > 80) {
      this.createAlert('cpu', 'high', 'High CPU usage detected', 80, latest.cpu.usage);
    }

    // Check memory alert
    if (latest.memory.percentage > 85) {
      this.createAlert('memory', 'high', 'High memory usage detected', 85, latest.memory.percentage);
    }

    // Check network latency alert
    if (latest.network.latency > 100) {
      this.createAlert('latency', 'medium', 'High network latency detected', 100, latest.network.latency);
    }
  }

  private createAlert(
    type: PerformanceAlert['type'],
    severity: PerformanceAlert['severity'],
    message: string,
    threshold: number,
    currentValue: number
  ): void {
    // Check if similar alert already exists
    const existingAlert = this.alerts.find(a =>
      a.type === type &&
      !a.resolved &&
      Date.now() - a.timestamp < 300000 // 5 minutes
    );

    if (existingAlert) return;

    const alert: PerformanceAlert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      severity,
      message,
      threshold,
      currentValue,
      timestamp: Date.now(),
      resolved: false
    };

    this.alerts.push(alert);
    this.emit('alert-created', alert);
  }

  private generateSuggestions(): void {
    const summary = this.getPerformanceSummary();

    // Generate suggestions based on current metrics
    if (summary.systemHealth.memory > 75) {
      this.createSuggestion(
        'Optimize Memory Usage',
        'Consider implementing memory pooling or garbage collection optimization',
        'high',
        'medium',
        8,
        'system'
      );
    }

    if (summary.modelPerformance.averageLatency > 2000) {
      this.createSuggestion(
        'Improve Model Performance',
        'Consider model quantization or GPU acceleration',
        'high',
        'high',
        9,
        'model'
      );
    }

    if (summary.systemHealth.cpu > 70) {
      this.createSuggestion(
        'CPU Load Optimization',
        'Implement request queuing or load balancing',
        'medium',
        'medium',
        7,
        'infrastructure'
      );
    }
  }

  private createSuggestion(
    title: string,
    description: string,
    impact: OptimizationSuggestion['impact'],
    effort: OptimizationSuggestion['effort'],
    priority: number,
    category: OptimizationSuggestion['category']
  ): void {
    // Check if similar suggestion already exists
    const existingSuggestion = this.suggestions.find(s =>
      s.title === title &&
      Date.now() - s.timestamp < 3600000 // 1 hour
    );

    if (existingSuggestion) return;

    const suggestion: OptimizationSuggestion = {
      id: `suggestion-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title,
      description,
      impact,
      effort,
      priority,
      category,
      timestamp: Date.now()
    };

    this.suggestions.push(suggestion);
    this.emit('optimization-suggestions', [suggestion]);
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Export factory function
export function createPerformanceMonitor(): PerformanceMonitor {
  return new PerformanceMonitor();
}