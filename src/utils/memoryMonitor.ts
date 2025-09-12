/**
 * Memory Monitor Utility for BEAR AI
 * Real-time memory monitoring with cross-platform support
 * Based on modern web APIs and performance observer patterns
 */

export interface MemoryInfo {
  /** Total system memory in bytes */
  totalMemory: number;
  /** Available memory in bytes */
  availableMemory: number;
  /** Used memory in bytes */
  usedMemory: number;
  /** Current process memory usage in bytes */
  processMemory: number;
  /** Memory usage percentage (0-100) */
  usagePercentage: number;
  /** Timestamp of the measurement */
  timestamp: number;
  /** Platform-specific additional info */
  platformInfo?: {
    heapUsed?: number;
    heapTotal?: number;
    external?: number;
    arrayBuffers?: number;
  };
}

export interface MemoryThresholds {
  /** Warning threshold (percentage) */
  warning: number;
  /** Critical threshold (percentage) */
  critical: number;
  /** Maximum safe usage (percentage) */
  maxSafe: number;
}

export interface MemoryMonitorConfig {
  /** Update interval in milliseconds */
  updateInterval: number;
  /** Memory thresholds */
  thresholds: MemoryThresholds;
  /** Enable detailed platform-specific monitoring */
  enableDetailedMonitoring: boolean;
  /** Enable performance observer integration */
  enablePerformanceObserver: boolean;
  /** Maximum number of historical samples to keep */
  maxHistoryLength: number;
}

export type MemoryStatus = 'normal' | 'warning' | 'critical';

export interface MemoryTrend {
  direction: 'increasing' | 'decreasing' | 'stable';
  rate: number; // bytes per second
  confidence: number; // 0-1
}

/**
 * Default configuration for memory monitoring
 */
export const DEFAULT_MEMORY_CONFIG: MemoryMonitorConfig = {
  updateInterval: 1000, // 1 second
  thresholds: {
    warning: 75,   // 75%
    critical: 90,  // 90%
    maxSafe: 80,   // 80%
  },
  enableDetailedMonitoring: true,
  enablePerformanceObserver: true,
  maxHistoryLength: 100,
};

/**
 * Memory Monitor Class
 * Provides real-time memory monitoring with configurable thresholds
 */
export class MemoryMonitor {
  private config: MemoryMonitorConfig;
  private history: MemoryInfo[] = [];
  private listeners: Set<(info: MemoryInfo) => void> = new Set();
  private intervalId: number | null = null;
  private performanceObserver: PerformanceObserver | null = null;
  private isMonitoring = false;

  constructor(config: Partial<MemoryMonitorConfig> = {}) {
    this.config = { ...DEFAULT_MEMORY_CONFIG, ...config };
    this.setupPerformanceObserver();
  }

  /**
   * Start memory monitoring
   */
  public start(): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.intervalId = window.setInterval(() => {
      this.updateMemoryInfo();
    }, this.config.updateInterval);

    // Initial reading
    this.updateMemoryInfo();
  }

  /**
   * Stop memory monitoring
   */
  public stop(): void {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }
  }

  /**
   * Get current memory information
   */
  public getCurrentMemoryInfo(): MemoryInfo | null {
    return this.history.length > 0 ? this.history[this.history.length - 1] : null;
  }

  /**
   * Get memory usage history
   */
  public getHistory(): MemoryInfo[] {
    return [...this.history];
  }

  /**
   * Get memory status based on current usage
   */
  public getMemoryStatus(): MemoryStatus {
    const current = this.getCurrentMemoryInfo();
    if (!current) return 'normal';

    const { usagePercentage } = current;
    const { thresholds } = this.config;

    if (usagePercentage >= thresholds.critical) return 'critical';
    if (usagePercentage >= thresholds.warning) return 'warning';
    return 'normal';
  }

  /**
   * Get memory usage trend analysis
   */
  public getMemoryTrend(): MemoryTrend {
    if (this.history.length < 3) {
      return { direction: 'stable', rate: 0, confidence: 0 };
    }

    const recent = this.history.slice(-10); // Last 10 samples
    const first = recent[0];
    const last = recent[recent.length - 1];
    
    const timeDiff = (last.timestamp - first.timestamp) / 1000; // seconds
    const memoryDiff = last.usedMemory - first.usedMemory;
    const rate = timeDiff > 0 ? memoryDiff / timeDiff : 0;

    let direction: MemoryTrend['direction'] = 'stable';
    if (Math.abs(rate) > 1024 * 1024) { // 1MB/s threshold
      direction = rate > 0 ? 'increasing' : 'decreasing';
    }

    const confidence = Math.min(recent.length / 10, 1); // More samples = higher confidence

    return { direction, rate, confidence };
  }

  /**
   * Subscribe to memory updates
   */
  public subscribe(callback: (info: MemoryInfo) => void): () => void {
    this.listeners.add(callback);
    
    // Send current info immediately if available
    const current = this.getCurrentMemoryInfo();
    if (current) {
      callback(current);
    }

    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Check if browser supports memory API
   */
  public static isSupported(): boolean {
    return 'memory' in performance || 'measureUserAgentSpecificMemory' in performance;
  }

  /**
   * Get platform information
   */
  public static getPlatformInfo(): {
    platform: string;
    supportsMemoryAPI: boolean;
    supportsPerformanceObserver: boolean;
  } {
    return {
      platform: this.detectPlatform(),
      supportsMemoryAPI: this.isSupported(),
      supportsPerformanceObserver: 'PerformanceObserver' in window,
    };
  }

  private setupPerformanceObserver(): void {
    if (!this.config.enablePerformanceObserver || !('PerformanceObserver' in window)) {
      return;
    }

    try {
      this.performanceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        // Process memory-related performance entries
        entries.forEach((entry) => {
          if (entry.entryType === 'measure' && entry.name.includes('memory')) {
            this.updateMemoryInfo();
          }
        });
      });

      this.performanceObserver.observe({ entryTypes: ['measure', 'navigation'] });
    } catch (error) {
      console.warn('Failed to setup performance observer:', error);
      this.performanceObserver = null;
    }
  }

  private async updateMemoryInfo(): Promise<void> {
    try {
      const memoryInfo = await this.collectMemoryInfo();
      this.addToHistory(memoryInfo);
      this.notifyListeners(memoryInfo);
    } catch (error) {
      console.error('Failed to update memory info:', error);
    }
  }

  private async collectMemoryInfo(): Promise<MemoryInfo> {
    const timestamp = Date.now();
    let memoryData: Partial<MemoryInfo> = {
      timestamp,
      totalMemory: 0,
      availableMemory: 0,
      usedMemory: 0,
      processMemory: 0,
      usagePercentage: 0,
    };

    // Try modern memory API first
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      memoryData.processMemory = memory.usedJSHeapSize || 0;
      memoryData.platformInfo = {
        heapUsed: memory.usedJSHeapSize || 0,
        heapTotal: memory.totalJSHeapSize || 0,
        external: 0,
        arrayBuffers: 0,
      };
    }

    // Try experimental memory API
    if ('measureUserAgentSpecificMemory' in performance) {
      try {
        const memoryMeasurement = await (performance as any).measureUserAgentSpecificMemory();
        if (memoryMeasurement && memoryMeasurement.bytes) {
          memoryData.processMemory = memoryMeasurement.bytes;
        }
      } catch (error) {
        // Silently fail - this API is experimental
      }
    }

    // Estimate system memory (fallback approach)
    memoryData = this.estimateSystemMemory(memoryData);

    return memoryData as MemoryInfo;
  }

  private estimateSystemMemory(partial: Partial<MemoryInfo>): MemoryInfo {
    // Fallback estimation based on available information
    const processMemory = partial.processMemory || 0;
    
    // Estimate total system memory based on device capabilities
    let estimatedTotal = 4 * 1024 * 1024 * 1024; // 4GB default
    
    // Use navigator.hardwareConcurrency as a hint for system capabilities
    if (navigator.hardwareConcurrency) {
      const cores = navigator.hardwareConcurrency;
      if (cores >= 8) estimatedTotal = 16 * 1024 * 1024 * 1024; // 16GB
      else if (cores >= 4) estimatedTotal = 8 * 1024 * 1024 * 1024; // 8GB
      else if (cores >= 2) estimatedTotal = 4 * 1024 * 1024 * 1024; // 4GB
      else estimatedTotal = 2 * 1024 * 1024 * 1024; // 2GB
    }

    // Estimate used memory (conservative approach)
    const estimatedUsed = Math.max(processMemory * 4, estimatedTotal * 0.3); // At least 30% of total
    const availableMemory = Math.max(0, estimatedTotal - estimatedUsed);
    const usagePercentage = Math.min(100, (estimatedUsed / estimatedTotal) * 100);

    return {
      totalMemory: estimatedTotal,
      availableMemory,
      usedMemory: estimatedUsed,
      processMemory,
      usagePercentage,
      timestamp: partial.timestamp || Date.now(),
      platformInfo: partial.platformInfo,
    };
  }

  private addToHistory(info: MemoryInfo): void {
    this.history.push(info);
    
    // Maintain history size limit
    if (this.history.length > this.config.maxHistoryLength) {
      this.history.shift();
    }
  }

  private notifyListeners(info: MemoryInfo): void {
    this.listeners.forEach((callback) => {
      try {
        callback(info);
      } catch (error) {
        console.error('Error in memory monitor listener:', error);
      }
    });
  }

  private static detectPlatform(): string {
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (userAgent.includes('win')) return 'windows';
    if (userAgent.includes('mac')) return 'macos';
    if (userAgent.includes('linux')) return 'linux';
    if (userAgent.includes('android')) return 'android';
    if (userAgent.includes('ios') || userAgent.includes('iphone') || userAgent.includes('ipad')) return 'ios';
    
    return 'unknown';
  }

  /**
   * Cleanup resources
   */
  public destroy(): void {
    this.stop();
    this.listeners.clear();
    this.history = [];
  }
}

/**
 * Create a singleton instance of MemoryMonitor
 */
let globalMemoryMonitor: MemoryMonitor | null = null;

export function getGlobalMemoryMonitor(config?: Partial<MemoryMonitorConfig>): MemoryMonitor {
  if (!globalMemoryMonitor) {
    globalMemoryMonitor = new MemoryMonitor(config);
  }
  return globalMemoryMonitor;
}

/**
 * Utility functions for memory formatting
 */
export const formatMemorySize = (bytes: number): string => {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
};

export const formatMemoryPercentage = (percentage: number): string => {
  return `${percentage.toFixed(1)}%`;
};

/**
 * Memory usage severity calculator
 */
export const getMemoryUsageSeverity = (
  percentage: number, 
  thresholds: MemoryThresholds = DEFAULT_MEMORY_CONFIG.thresholds
): {
  status: MemoryStatus;
  color: string;
  priority: number;
} => {
  if (percentage >= thresholds.critical) {
    return { status: 'critical', color: 'red', priority: 3 };
  }
  if (percentage >= thresholds.warning) {
    return { status: 'warning', color: 'yellow', priority: 2 };
  }
  return { status: 'normal', color: 'green', priority: 1 };
};