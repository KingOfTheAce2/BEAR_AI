// Local System Resource Monitor
import { SystemMetrics } from '../../types/monitoring';

export class SystemResourceMonitor {
  private isMonitoring = false;
  private intervalId?: NodeJS.Timeout;
  private metrics: SystemMetrics[] = [];
  private maxHistorySize = 1000;

  constructor(private onMetricsUpdate?: (metrics: SystemMetrics) => void) {}

  async start(intervalMs = 5000): Promise<void> {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.intervalId = setInterval(async () => {
      try {
        const metrics = await this.collectSystemMetrics();
        this.addMetrics(metrics);
        this.onMetricsUpdate?.(metrics);
      } catch (error) {
        console.error('Error collecting system metrics:', error);
      }
    }, intervalMs);

    // Collect initial metrics
    const initialMetrics = await this.collectSystemMetrics();
    this.addMetrics(initialMetrics);
    this.onMetricsUpdate?.(initialMetrics);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
    this.isMonitoring = false;
  }

  private async collectSystemMetrics(): Promise<SystemMetrics> {
    const timestamp = Date.now();

    // Use Performance API and Navigator API for browser-based monitoring
    const memory = await this.getMemoryInfo();
    const cpu = await this.getCPUInfo();
    const disk = await this.getDiskInfo();
    const network = await this.getNetworkInfo();

    return {
      timestamp,
      cpu,
      memory,
      disk,
      network
    };
  }

  private async getMemoryInfo() {
    if ('memory' in performance) {
      const memInfo = (performance as any).memory;
      return {
        used: memInfo.usedJSHeapSize || 0,
        total: memInfo.totalJSHeapSize || 0,
        available: (memInfo.totalJSHeapSize || 0) - (memInfo.usedJSHeapSize || 0),
        percentage: memInfo.totalJSHeapSize 
          ? (memInfo.usedJSHeapSize / memInfo.totalJSHeapSize) * 100 
          : 0
      };
    }

    // Fallback for browsers without memory API
    return {
      used: 0,
      total: 0,
      available: 0,
      percentage: 0
    };
  }

  private async getCPUInfo() {
    const cores = navigator.hardwareConcurrency || 4;
    
    // Estimate CPU usage using timing and performance
    const usage = await this.estimateCPUUsage();

    return {
      usage,
      cores,
      temperature: undefined // Not available in browser
    };
  }

  private async estimateCPUUsage(): Promise<number> {
    return new Promise((resolve) => {
      const start = performance.now();
      let iterations = 0;
      const maxTime = 10; // 10ms test

      const testLoop = () => {
        while (performance.now() - start < maxTime) {
          Math.random(); // Simple CPU work
          iterations++;
        }

        // Normalize based on expected iterations (very rough estimate)
        const expectedIterations = 100000; // Baseline for modern CPU
        const usage = Math.min(100, Math.max(0, 100 - (iterations / expectedIterations) * 100));
        resolve(usage);
      };

      setTimeout(testLoop, 0);
    });
  }

  private async getDiskInfo() {
    // Browser storage estimate
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        const quota = estimate.quota || 0;
        const usage = estimate.usage || 0;
        const available = quota - usage;

        return {
          used: usage,
          total: quota,
          available,
          percentage: quota ? (usage / quota) * 100 : 0
        };
      } catch (error) {
        console.warn('Storage estimate not available:', error);
      }
    }

    return {
      used: 0,
      total: 0,
      available: 0,
      percentage: 0
    };
  }

  private async getNetworkInfo() {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      return {
        bytesReceived: 0, // Not directly available in browser
        bytesSent: 0,
        packetsReceived: 0,
        packetsSent: 0,
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt
      };
    }

    return undefined;
  }

  private addMetrics(metrics: SystemMetrics): void {
    this.metrics.push(metrics);
    
    // Keep only recent metrics
    if (this.metrics.length > this.maxHistorySize) {
      this.metrics = this.metrics.slice(-this.maxHistorySize);
    }
  }

  getRecentMetrics(count = 100): SystemMetrics[] {
    return this.metrics.slice(-count);
  }

  getMetricsInRange(startTime: number, endTime: number): SystemMetrics[] {
    return this.metrics.filter(m => 
      m.timestamp >= startTime && m.timestamp <= endTime
    );
  }

  getCurrentMetrics(): SystemMetrics | null {
    return this.metrics[this.metrics.length - 1] || null;
  }

  getAverageMetrics(periodMs = 300000): {
    avgCpu: number;
    avgMemory: number;
    avgDisk: number;
  } {
    const cutoff = Date.now() - periodMs;
    const recentMetrics = this.metrics.filter(m => m.timestamp >= cutoff);

    if (recentMetrics.length === 0) {
      return { avgCpu: 0, avgMemory: 0, avgDisk: 0 };
    }

    const avgCpu = recentMetrics.reduce((sum, m) => sum + m.cpu.usage, 0) / recentMetrics.length;
    const avgMemory = recentMetrics.reduce((sum, m) => sum + m.memory.percentage, 0) / recentMetrics.length;
    const avgDisk = recentMetrics.reduce((sum, m) => sum + m.disk.percentage, 0) / recentMetrics.length;

    return { avgCpu, avgMemory, avgDisk };
  }

  clearHistory(): void {
    this.metrics = [];
  }

  isRunning(): boolean {
    return this.isMonitoring;
  }
}