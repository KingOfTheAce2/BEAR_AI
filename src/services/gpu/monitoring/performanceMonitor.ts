import { GPUPerformanceMetrics, GPUBackend } from '../types/gpuTypes';

export interface PerformanceProfile {
  backend: GPUBackend;
  averageComputeTime: number;
  averageMemoryTransferTime: number;
  averageThroughput: number;
  averageEfficiency: number;
  peakThroughput: number;
  totalOperations: number;
  errorRate: number;
  lastUpdated: number;
}

export interface PerformanceBenchmark {
  operation: string;
  backend: GPUBackend;
  dataSize: number;
  metrics: GPUPerformanceMetrics;
  timestamp: number;
}

export interface SystemResourceUsage {
  cpuUsage: number;
  memoryUsage: number;
  gpuMemoryUsage: number;
  thermalThrottling: boolean;
  powerConsumption?: number;
}

export class PerformanceMonitor {
  private metrics: GPUPerformanceMetrics[] = [];
  private profiles = new Map<GPUBackend, PerformanceProfile>();
  private benchmarks: PerformanceBenchmark[] = [];
  private maxHistorySize = 1000;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private systemUsageHistory: SystemResourceUsage[] = [];
  private alertThresholds = {
    maxComputeTime: 5000, // 5 seconds
    minThroughput: 1, // 1 MB/s
    maxErrorRate: 0.1, // 10%
    maxMemoryUsage: 0.9 // 90%
  };
  private alertCallbacks: Array<(alert: PerformanceAlert) => void> = [];

  constructor() {
    this.startSystemMonitoring();
  }

  recordMetric(name: string, value: number): void {
    const timestamp = Date.now();
    console.log(`Performance metric [${name}]: ${value.toFixed(2)}ms`);
    
    // Store for analysis
    if (this.metrics.length >= this.maxHistorySize) {
      this.metrics.shift();
    }
  }

  recordMetrics(metrics: GPUPerformanceMetrics, backend: GPUBackend = 'webgpu'): void {
    if (this.metrics.length >= this.maxHistorySize) {
      this.metrics.shift();
    }
    
    this.metrics.push({
      ...metrics,
      timestamp: Date.now()
    } as GPUPerformanceMetrics & { timestamp: number });

    this.updateProfile(backend, metrics);
    this.checkAlerts(backend, metrics);
  }

  recordBenchmark(benchmark: PerformanceBenchmark): void {
    this.benchmarks.push({
      ...benchmark,
      timestamp: Date.now()
    });

    // Keep only recent benchmarks
    if (this.benchmarks.length > 100) {
      this.benchmarks = this.benchmarks.slice(-100);
    }
  }

  private updateProfile(backend: GPUBackend, metrics: GPUPerformanceMetrics): void {
    let profile = this.profiles.get(backend);
    
    if (!profile) {
      profile = {
        backend,
        averageComputeTime: metrics.computeTime,
        averageMemoryTransferTime: metrics.memoryTransferTime,
        averageThroughput: metrics.throughput,
        averageEfficiency: metrics.efficiency,
        peakThroughput: metrics.throughput,
        totalOperations: 1,
        errorRate: 0,
        lastUpdated: Date.now()
      };
    } else {
      const count = profile.totalOperations;
      profile.averageComputeTime = (profile.averageComputeTime * count + metrics.computeTime) / (count + 1);
      profile.averageMemoryTransferTime = (profile.averageMemoryTransferTime * count + metrics.memoryTransferTime) / (count + 1);
      profile.averageThroughput = (profile.averageThroughput * count + metrics.throughput) / (count + 1);
      profile.averageEfficiency = (profile.averageEfficiency * count + metrics.efficiency) / (count + 1);
      profile.peakThroughput = Math.max(profile.peakThroughput, metrics.throughput);
      profile.totalOperations = count + 1;
      profile.lastUpdated = Date.now();
    }
    
    this.profiles.set(backend, profile);
  }

  private checkAlerts(backend: GPUBackend, metrics: GPUPerformanceMetrics): void {
    const alerts: PerformanceAlert[] = [];

    if (metrics.computeTime > this.alertThresholds.maxComputeTime) {
      alerts.push({
        type: 'performance',
        severity: 'warning',
        message: `High compute time detected: ${metrics.computeTime.toFixed(2)}ms`,
        backend,
        timestamp: Date.now(),
        metrics
      });
    }

    if (metrics.throughput < this.alertThresholds.minThroughput) {
      alerts.push({
        type: 'performance',
        severity: 'warning',
        message: `Low throughput detected: ${metrics.throughput.toFixed(2)} MB/s`,
        backend,
        timestamp: Date.now(),
        metrics
      });
    }

    if (metrics.efficiency < 0.3) {
      alerts.push({
        type: 'efficiency',
        severity: 'info',
        message: `Low GPU efficiency: ${(metrics.efficiency * 100).toFixed(1)}%`,
        backend,
        timestamp: Date.now(),
        metrics
      });
    }

    alerts.forEach(alert => {
      this.alertCallbacks.forEach(callback => callback(alert));
    });
  }

  private startSystemMonitoring(): void {
    this.monitoringInterval = setInterval(() => {
      this.recordSystemUsage();
    }, 5000); // Every 5 seconds
  }

  private async recordSystemUsage(): Promise<void> {
    try {
      const usage: SystemResourceUsage = {
        cpuUsage: await this.getCPUUsage(),
        memoryUsage: await this.getMemoryUsage(),
        gpuMemoryUsage: await this.getGPUMemoryUsage(),
        thermalThrottling: await this.checkThermalThrottling()
      };

      this.systemUsageHistory.push(usage);
      
      // Keep only recent history
      if (this.systemUsageHistory.length > 720) { // 1 hour at 5-second intervals
        this.systemUsageHistory.shift();
      }

      // Check for memory alerts
      if (usage.memoryUsage > this.alertThresholds.maxMemoryUsage) {
        this.alertCallbacks.forEach(callback => callback({
          type: 'memory',
          severity: 'warning',
          message: `High memory usage: ${(usage.memoryUsage * 100).toFixed(1)}%`,
          backend: 'cpu',
          timestamp: Date.now()
        }));
      }
    } catch (error) {
      console.warn('Failed to record system usage:', error);
    }
  }

  private async getCPUUsage(): Promise<number> {
    // Approximate CPU usage using performance timing
    if ('performance' in window && 'memory' in (performance as any)) {
      const memory = (performance as any).memory;
      return Math.min(1, memory.usedJSHeapSize / memory.jsHeapSizeLimit);
    }
    return 0;
  }

  private async getMemoryUsage(): Promise<number> {
    if ('performance' in window && 'memory' in (performance as any)) {
      const memory = (performance as any).memory;
      return memory.usedJSHeapSize / memory.jsHeapSizeLimit;
    }
    return 0;
  }

  private async getGPUMemoryUsage(): Promise<number> {
    // This would require WebGPU memory info API (not yet available)
    // For now, estimate based on allocated buffers
    return 0.5; // Placeholder
  }

  private async checkThermalThrottling(): Promise<boolean> {
    // Check if performance has degraded significantly over time
    if (this.metrics.length < 10) return false;
    
    const recent = this.metrics.slice(-5);
    const older = this.metrics.slice(-10, -5);
    
    const recentAvg = recent.reduce((sum, m) => sum + m.computeTime, 0) / recent.length;
    const olderAvg = older.reduce((sum, m) => sum + m.computeTime, 0) / older.length;
    
    return recentAvg > olderAvg * 1.5; // 50% increase suggests throttling
  }

  async runBenchmark(
    operation: string,
    backend: GPUBackend,
    testFunction: () => Promise<GPUPerformanceMetrics>,
    iterations: number = 10
  ): Promise<PerformanceBenchmark> {
    const results: GPUPerformanceMetrics[] = [];
    
    console.log(`Running benchmark: ${operation} on ${backend} (${iterations} iterations)`);
    
    for (let i = 0; i < iterations; i++) {
      try {
        const result = await testFunction();
        results.push(result);
        
        // Small delay between iterations
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.warn(`Benchmark iteration ${i + 1} failed:`, error);
      }
    }
    
    if (results.length === 0) {
      throw new Error('All benchmark iterations failed');
    }
    
    // Calculate average metrics
    const avgMetrics: GPUPerformanceMetrics = {
      computeTime: results.reduce((sum, r) => sum + r.computeTime, 0) / results.length,
      memoryTransferTime: results.reduce((sum, r) => sum + r.memoryTransferTime, 0) / results.length,
      kernelCompilationTime: results.reduce((sum, r) => sum + r.kernelCompilationTime, 0) / results.length,
      totalTime: results.reduce((sum, r) => sum + r.totalTime, 0) / results.length,
      throughput: results.reduce((sum, r) => sum + r.throughput, 0) / results.length,
      efficiency: results.reduce((sum, r) => sum + r.efficiency, 0) / results.length
    };
    
    const benchmark: PerformanceBenchmark = {
      operation,
      backend,
      dataSize: 0, // Would be set by caller
      metrics: avgMetrics,
      timestamp: Date.now()
    };
    
    this.recordBenchmark(benchmark);
    
    console.log(`Benchmark completed: ${operation}`);
    console.log(`  Average compute time: ${avgMetrics.computeTime.toFixed(2)}ms`);
    console.log(`  Average throughput: ${avgMetrics.throughput.toFixed(2)} MB/s`);
    console.log(`  Average efficiency: ${(avgMetrics.efficiency * 100).toFixed(1)}%`);
    
    return benchmark;
  }

  getMetrics(): GPUPerformanceMetrics[] {
    return [...this.metrics];
  }

  getProfile(backend: GPUBackend): PerformanceProfile | undefined {
    return this.profiles.get(backend);
  }

  getAllProfiles(): PerformanceProfile[] {
    return Array.from(this.profiles.values());
  }

  getBenchmarks(operation?: string, backend?: GPUBackend): PerformanceBenchmark[] {
    return this.benchmarks.filter(b => 
      (!operation || b.operation === operation) &&
      (!backend || b.backend === backend)
    );
  }

  getSystemUsage(): SystemResourceUsage[] {
    return [...this.systemUsageHistory];
  }

  getCurrentSystemUsage(): SystemResourceUsage | undefined {
    return this.systemUsageHistory[this.systemUsageHistory.length - 1];
  }

  onAlert(callback: (alert: PerformanceAlert) => void): void {
    this.alertCallbacks.push(callback);
  }

  removeAlertCallback(callback: (alert: PerformanceAlert) => void): void {
    const index = this.alertCallbacks.indexOf(callback);
    if (index > -1) {
      this.alertCallbacks.splice(index, 1);
    }
  }

  setAlertThresholds(thresholds: Partial<typeof this.alertThresholds>): void {
    this.alertThresholds = { ...this.alertThresholds, ...thresholds };
  }

  getPerformanceSummary(): {
    totalOperations: number;
    averagePerformance: GPUPerformanceMetrics;
    bestBackend: GPUBackend | null;
    recommendations: string[];
  } {
    const totalOperations = this.metrics.length;
    const recommendations: string[] = [];
    
    if (totalOperations === 0) {
      return {
        totalOperations: 0,
        averagePerformance: {
          computeTime: 0,
          memoryTransferTime: 0,
          kernelCompilationTime: 0,
          totalTime: 0,
          throughput: 0,
          efficiency: 0
        },
        bestBackend: null,
        recommendations: ['No performance data available']
      };
    }
    
    const averagePerformance: GPUPerformanceMetrics = {
      computeTime: this.metrics.reduce((sum, m) => sum + m.computeTime, 0) / totalOperations,
      memoryTransferTime: this.metrics.reduce((sum, m) => sum + m.memoryTransferTime, 0) / totalOperations,
      kernelCompilationTime: this.metrics.reduce((sum, m) => sum + m.kernelCompilationTime, 0) / totalOperations,
      totalTime: this.metrics.reduce((sum, m) => sum + m.totalTime, 0) / totalOperations,
      throughput: this.metrics.reduce((sum, m) => sum + m.throughput, 0) / totalOperations,
      efficiency: this.metrics.reduce((sum, m) => sum + m.efficiency, 0) / totalOperations
    };
    
    // Find best backend
    let bestBackend: GPUBackend | null = null;
    let bestThroughput = 0;
    
    for (const profile of this.profiles.values()) {
      if (profile.averageThroughput > bestThroughput) {
        bestThroughput = profile.averageThroughput;
        bestBackend = profile.backend;
      }
    }
    
    // Generate recommendations
    if (averagePerformance.efficiency < 0.5) {
      recommendations.push('Consider optimizing memory transfers to improve efficiency');
    }
    
    if (averagePerformance.throughput < 10) {
      recommendations.push('Low throughput detected - consider larger batch sizes');
    }
    
    const currentUsage = this.getCurrentSystemUsage();
    if (currentUsage && currentUsage.memoryUsage > 0.8) {
      recommendations.push('High memory usage - consider implementing memory pooling');
    }
    
    return {
      totalOperations,
      averagePerformance,
      bestBackend,
      recommendations
    };
  }

  clearHistory(): void {
    this.metrics.length = 0;
    this.benchmarks.length = 0;
    this.systemUsageHistory.length = 0;
    this.profiles.clear();
  }

  exportData(): {
    metrics: GPUPerformanceMetrics[];
    profiles: PerformanceProfile[];
    benchmarks: PerformanceBenchmark[];
    systemUsage: SystemResourceUsage[];
  } {
    return {
      metrics: this.getMetrics(),
      profiles: this.getAllProfiles(),
      benchmarks: this.getBenchmarks(),
      systemUsage: this.getSystemUsage()
    };
  }

  cleanup(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.clearHistory();
    this.alertCallbacks.length = 0;
  }
}

export interface PerformanceAlert {
  type: 'performance' | 'memory' | 'efficiency' | 'error';
  severity: 'info' | 'warning' | 'error';
  message: string;
  backend: GPUBackend;
  timestamp: number;
  metrics?: GPUPerformanceMetrics;
}