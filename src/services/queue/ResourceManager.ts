// Resource-aware Queue Management

import { SystemResources, ResourceRequirements, ResourceType, ScalingThresholds } from './types';

export class ResourceManager {
  private resources: SystemResources;
  private allocatedResources: Map<string, ResourceRequirements> = new Map();
  private resourceHistory: ResourceSnapshot[] = [];
  private maxHistorySize = 100;
  private monitoringInterval: number;
  private monitoringTimer?: NodeJS.Timeout;
  private scalingThresholds: ScalingThresholds;

  constructor(
    monitoringInterval = 5000,
    scalingThresholds: ScalingThresholds = {
      cpuThreshold: 0.8,
      memoryThreshold: 0.85,
      queueLengthThreshold: 50,
      latencyThreshold: 5000,
      scaleUpDelay: 30000,
      scaleDownDelay: 60000
    }
  ) {
    this.monitoringInterval = monitoringInterval;
    this.scalingThresholds = scalingThresholds;
    this.resources = this.initializeResources();
    this.startMonitoring();
  }

  /**
   * Check if resources are available for a request
   */
  canAllocateResources(requirements: ResourceRequirements): boolean {
    const available = this.getAvailableResources();
    
    return (
      available.cpu >= requirements.cpu &&
      available.memory >= requirements.memory &&
      available.network >= requirements.network &&
      available.disk >= requirements.disk
    );
  }

  /**
   * Allocate resources for a request
   */
  allocateResources(requestId: string, requirements: ResourceRequirements): boolean {
    if (!this.canAllocateResources(requirements)) {
      return false;
    }

    this.allocatedResources.set(requestId, requirements);
    return true;
  }

  /**
   * Release resources after request completion
   */
  releaseResources(requestId: string): void {
    this.allocatedResources.delete(requestId);
  }

  /**
   * Get current system resources
   */
  getCurrentResources(): SystemResources {
    return { ...this.resources };
  }

  /**
   * Get available (unallocated) resources
   */
  getAvailableResources(): ResourceRequirements {
    const allocated = this.getTotalAllocatedResources();
    
    return {
      cpu: Math.max(0, this.resources.cpu.available - allocated.cpu),
      memory: Math.max(0, this.resources.memory.available - allocated.memory),
      network: Math.max(0, this.resources.network.bandwidth - allocated.network),
      disk: Math.max(0, this.resources.disk.available - allocated.disk),
      concurrency: Math.max(0, this.getMaxConcurrency() - this.allocatedResources.size)
    };
  }

  /**
   * Get resource utilization percentage
   */
  getResourceUtilization(): Record<ResourceType, number> {
    const allocated = this.getTotalAllocatedResources();
    
    return {
      [ResourceType.CPU]: allocated.cpu / this.resources.cpu.available,
      [ResourceType.MEMORY]: allocated.memory / this.resources.memory.available,
      [ResourceType.NETWORK]: allocated.network / this.resources.network.bandwidth,
      [ResourceType.DISK]: allocated.disk / this.resources.disk.available
    };
  }

  /**
   * Check if system needs scaling up
   */
  shouldScaleUp(): boolean {
    const utilization = this.getResourceUtilization();
    const recentHistory = this.getRecentResourceHistory(5);
    
    // Check if any resource is consistently above threshold
    const cpuHigh = utilization[ResourceType.CPU] > this.scalingThresholds.cpuThreshold;
    const memoryHigh = utilization[ResourceType.MEMORY] > this.scalingThresholds.memoryThreshold;
    
    // Check historical trend
    const trending = this.isResourceUsageTrending(recentHistory, 'up');
    
    return (cpuHigh || memoryHigh) && trending;
  }

  /**
   * Check if system can scale down
   */
  shouldScaleDown(): boolean {
    const utilization = this.getResourceUtilization();
    const recentHistory = this.getRecentResourceHistory(10);
    
    // Check if all resources are well below threshold
    const allResourcesLow = Object.values(utilization).every(
      usage => usage < this.scalingThresholds.cpuThreshold * 0.5
    );
    
    // Check if usage has been consistently low
    const stableAndLow = this.isResourceUsageStable(recentHistory) && allResourcesLow;
    
    return stableAndLow;
  }

  /**
   * Get optimal worker count based on current resources
   */
  getOptimalWorkerCount(): number {
    const available = this.getAvailableResources();
    const utilization = this.getResourceUtilization();
    
    // Base worker count on CPU cores
    let optimalCount = this.resources.cpu.cores;
    
    // Adjust based on memory availability
    const memoryBasedCount = Math.floor(available.memory / 100); // 100MB per worker
    optimalCount = Math.min(optimalCount, memoryBasedCount);
    
    // Adjust based on current utilization
    if (utilization[ResourceType.CPU] > 0.7) {
      optimalCount = Math.max(1, Math.floor(optimalCount * 0.8));
    }
    
    // Ensure minimum and maximum bounds
    return Math.max(1, Math.min(optimalCount, 16));
  }

  /**
   * Get resource recommendations
   */
  getResourceRecommendations(): string[] {
    const recommendations: string[] = [];
    const utilization = this.getResourceUtilization();
    
    if (utilization[ResourceType.CPU] > 0.9) {
      recommendations.push('CPU usage is critical - consider reducing concurrent requests');
    } else if (utilization[ResourceType.CPU] > 0.8) {
      recommendations.push('CPU usage is high - monitor performance closely');
    }
    
    if (utilization[ResourceType.MEMORY] > 0.9) {
      recommendations.push('Memory usage is critical - implement request batching');
    } else if (utilization[ResourceType.MEMORY] > 0.8) {
      recommendations.push('Memory usage is high - consider garbage collection optimization');
    }
    
    const queueSize = this.allocatedResources.size;
    if (queueSize > this.scalingThresholds.queueLengthThreshold) {
      recommendations.push('Queue length is high - consider increasing worker pool size');
    }
    
    return recommendations;
  }

  /**
   * Start resource monitoring
   */
  private startMonitoring(): void {
    this.monitoringTimer = setInterval(() => {
      this.updateResourceMetrics();
      this.recordResourceSnapshot();
    }, this.monitoringInterval);
  }

  /**
   * Stop resource monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
      this.monitoringTimer = undefined;
    }
  }

  /**
   * Update current resource metrics
   */
  private async updateResourceMetrics(): Promise<void> {
    // Update CPU metrics
    this.resources.cpu.usage = await this.measureCpuUsage();
    this.resources.cpu.available = 1.0 - this.resources.cpu.usage;
    
    // Update memory metrics
    if ('memory' in performance && (performance as any).memory) {
      const memory = (performance as any).memory;
      this.resources.memory.used = memory.usedJSHeapSize || 0;
      this.resources.memory.available = 
        (memory.jsHeapSizeLimit || 2147483648) - this.resources.memory.used;
      this.resources.memory.total = memory.jsHeapSizeLimit || 2147483648;
    }
    
    // Update network metrics
    this.resources.network = await this.measureNetworkMetrics();
  }

  /**
   * Record resource snapshot for historical analysis
   */
  private recordResourceSnapshot(): void {
    const snapshot: ResourceSnapshot = {
      timestamp: Date.now(),
      resources: { ...this.resources },
      allocatedCount: this.allocatedResources.size,
      utilization: this.getResourceUtilization()
    };
    
    this.resourceHistory.push(snapshot);
    
    // Maintain history size limit
    if (this.resourceHistory.length > this.maxHistorySize) {
      this.resourceHistory.shift();
    }
  }

  /**
   * Get recent resource history
   */
  private getRecentResourceHistory(count: number): ResourceSnapshot[] {
    return this.resourceHistory.slice(-count);
  }

  /**
   * Check if resource usage is trending up or down
   */
  private isResourceUsageTrending(history: ResourceSnapshot[], direction: 'up' | 'down'): boolean {
    if (history.length < 3) return false;
    
    const cpuTrend = this.calculateTrend(history.map(h => h.utilization[ResourceType.CPU]));
    const memoryTrend = this.calculateTrend(history.map(h => h.utilization[ResourceType.MEMORY]));
    
    const trending = (cpuTrend + memoryTrend) / 2;
    
    return direction === 'up' ? trending > 0.1 : trending < -0.1;
  }

  /**
   * Check if resource usage is stable
   */
  private isResourceUsageStable(history: ResourceSnapshot[]): boolean {
    if (history.length < 5) return false;
    
    const cpuVariance = this.calculateVariance(history.map(h => h.utilization[ResourceType.CPU]));
    const memoryVariance = this.calculateVariance(history.map(h => h.utilization[ResourceType.MEMORY]));
    
    return cpuVariance < 0.05 && memoryVariance < 0.05;
  }

  /**
   * Calculate trend from array of values
   */
  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;
    
    const n = values.length;
    const sumX = (n * (n + 1)) / 2;
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = values.reduce((sum, val, idx) => sum + val * (idx + 1), 0);
    const sumX2 = (n * (n + 1) * (2 * n + 1)) / 6;
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return slope;
  }

  /**
   * Calculate variance from array of values
   */
  private calculateVariance(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    return squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
  }

  /**
   * Initialize default system resources
   */
  private initializeResources(): SystemResources {
    return {
      cpu: {
        usage: 0,
        available: 1.0,
        cores: navigator.hardwareConcurrency || 4
      },
      memory: {
        used: 0,
        available: 2147483648, // 2GB default
        total: 2147483648
      },
      network: {
        bandwidth: 10000, // 10 Mbps default
        latency: 50
      },
      disk: {
        usage: 0,
        available: Infinity
      }
    };
  }

  /**
   * Measure CPU usage
   */
  private async measureCpuUsage(): Promise<number> {
    const start = performance.now();
    const duration = 100;
    
    return new Promise(resolve => {
      const startTime = performance.now();
      let iterations = 0;
      
      const measure = () => {
        const elapsed = performance.now() - startTime;
        if (elapsed < duration) {
          // Do some CPU-intensive work
          for (let i = 0; i < 1000; i++) {
            Math.random();
          }
          iterations++;
          requestAnimationFrame(measure);
        } else {
          // Estimate CPU usage based on iterations completed
          const expectedIterations = duration * 100; // Rough baseline
          const usage = Math.min(1.0, iterations / expectedIterations);
          resolve(usage);
        }
      };
      
      requestAnimationFrame(measure);
    });
  }

  /**
   * Measure network metrics
   */
  private async measureNetworkMetrics(): Promise<{ bandwidth: number; latency: number }> {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      return {
        bandwidth: (connection.downlink || 10) * 1000,
        latency: connection.rtt || 50
      };
    }
    
    return { bandwidth: 10000, latency: 50 };
  }

  /**
   * Get total allocated resources
   */
  private getTotalAllocatedResources(): ResourceRequirements {
    const total: ResourceRequirements = {
      cpu: 0,
      memory: 0,
      network: 0,
      disk: 0,
      concurrency: 0
    };
    
    for (const requirements of this.allocatedResources.values()) {
      total.cpu += requirements.cpu;
      total.memory += requirements.memory;
      total.network += requirements.network;
      total.disk += requirements.disk;
      total.concurrency = Math.max(total.concurrency, requirements.concurrency);
    }
    
    return total;
  }

  /**
   * Get maximum concurrency based on system resources
   */
  private getMaxConcurrency(): number {
    return this.resources.cpu.cores * 2; // 2x CPU cores as baseline
  }
}

interface ResourceSnapshot {
  timestamp: number;
  resources: SystemResources;
  allocatedCount: number;
  utilization: Record<ResourceType, number>;
}