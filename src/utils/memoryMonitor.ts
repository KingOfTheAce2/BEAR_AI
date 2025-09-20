export interface MemoryInfo {
import { EventEmitter } from './EventEmitter';

  used: number;
  total: number;
  available: number;
  usagePercentage: number;
  limit?: number;
  timestamp: number;
  usedMemory?: number;
  totalMemory?: number;
  availableMemory?: number;
  processMemory?: number;
}

export type MemoryStatus = 'normal' | 'warning' | 'critical';

export interface MemoryTrend {
  direction: 'increasing' | 'decreasing' | 'stable';
  changeRate: number;
  samples: number;
  rate?: number;
  confidence?: number;
}

export interface MemoryMonitorConfig {
  updateInterval: number;
  warningThreshold: number;
  criticalThreshold: number;
  historySize: number;
  smoothingFactor: number;
  trendWindow: number;
  enableDetailedMonitoring: boolean;
  enablePerformanceObserver: boolean;
}

export const DEFAULT_MEMORY_CONFIG: MemoryMonitorConfig = {
  updateInterval: 2000,
  warningThreshold: 70,
  criticalThreshold: 85,
  historySize: 120,
  smoothingFactor: 0.1,
  trendWindow: 6,
  enableDetailedMonitoring: true,
  enablePerformanceObserver: false
};

type Subscriber = (info: MemoryInfo) => void;

export class MemoryMonitor {
  private static globalMonitor: MemoryMonitor | null = null;

  private config: MemoryMonitorConfig;
  private subscribers = new Set<Subscriber>();
  private intervalId: number | null = null;
  private history: MemoryInfo[] = [];
  private trend: MemoryTrend | null = null;
  private lastInfo: MemoryInfo | null = null;
  private eventEmitter = new EventEmitter();
  private performanceObserver: PerformanceObserver | null = null;

  constructor(config?: Partial<MemoryMonitorConfig>) {
    this.config = { ...DEFAULT_MEMORY_CONFIG, ...config };
  }

  static isSupported(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }

    const hasPerformanceMemory = typeof performance !== 'undefined' && Boolean((performance as any).memory);
    return hasPerformanceMemory;
  }

  static getInstance(config?: Partial<MemoryMonitorConfig>): MemoryMonitor {
    if (!MemoryMonitor.globalMonitor) {
      MemoryMonitor.globalMonitor = new MemoryMonitor(config);
    } else if (config) {
      MemoryMonitor.globalMonitor.updateConfig(config);
    }

    return MemoryMonitor.globalMonitor;
  }

  start(): void {
    if (this.intervalId !== null) {
      return;
    }

    if (!MemoryMonitor.isSupported()) {
      throw new Error('Memory monitoring API is not supported in this environment');
    }

    this.collectMemoryInfo();

    this.intervalId = window.setInterval(() => {
      this.collectMemoryInfo();
    }, this.config.updateInterval);

    if (this.config.enablePerformanceObserver) {
      this.initializePerformanceObserver();
    }
  }

  stop(): void {
    if (this.intervalId !== null) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }

    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
      this.performanceObserver = null;
    }
  }

  reset(): void {
    this.history = [];
    this.trend = null;
    this.lastInfo = null;
  }

  subscribe(callback: Subscriber): () => void {
    this.subscribers.add(callback);

    if (this.lastInfo) {
      callback(this.lastInfo);
    }

    return () => {
      this.subscribers.delete(callback);
    };
  }

  getCurrentMemoryInfo(): MemoryInfo | null {
    return this.lastInfo;
  }

  getMemoryStatus(): MemoryStatus {
    const info = this.lastInfo;
    if (!info) {
      return 'normal';
    }

    if (info.usagePercentage >= this.config.criticalThreshold) {
      return 'critical';
    }

    if (info.usagePercentage >= this.config.warningThreshold) {
      return 'warning';
    }

    return 'normal';
  }

  getMemoryTrend(): MemoryTrend | null {
    return this.trend;
  }

  getHistory(): MemoryInfo[] {
    return [...this.history];
  }

  getConfig(): MemoryMonitorConfig {
    return { ...this.config };
  }

  updateConfig(updates: Partial<MemoryMonitorConfig>): void {
    const wasMonitoring = this.intervalId !== null;

    if (wasMonitoring) {
      this.stop();
    }

    this.config = { ...this.config, ...updates };

    if (wasMonitoring) {
      this.start();
    }
  }

  refresh(): MemoryInfo | null {
    if (!MemoryMonitor.isSupported()) {
      return this.lastInfo;
    }

    this.collectMemoryInfo();
    return this.lastInfo;
  }

  on(event: string, listener: (...args: any[]) => void): void {
    this.eventEmitter.on(event, listener);
  }

  off(event: string, listener: (...args: any[]) => void): void {
    this.eventEmitter.off(event, listener);
  }

  private notify(info: MemoryInfo): void {
    this.subscribers.forEach(callback => {
      try {
        callback(info);
      } catch (error) {
        console.error('Memory monitor subscriber failed:', error);
      }
    });

    this.eventEmitter.emit('memoryUpdate', info);
  }

  private collectMemoryInfo(): void {
    const info = this.readMemoryInfo();
    this.lastInfo = info;

    this.history.push(info);
    if (this.history.length > this.config.historySize) {
      this.history = this.history.slice(-this.config.historySize);
    }

    this.trend = this.calculateTrend();
    this.notify(info);
  }

  private readMemoryInfo(): MemoryInfo {
    const timestamp = Date.now();
    const performanceMemory = typeof performance !== 'undefined' ? (performance as any).memory : undefined;

    if (performanceMemory) {
      const used = performanceMemory.usedJSHeapSize || 0;
      const limit = performanceMemory.jsHeapSizeLimit || performanceMemory.totalJSHeapSize || 0;
      const total = limit || this.lastInfo?.total || used;
      const available = Math.max(total - used, 0);
      const usagePercentage = total > 0 ? (used / total) * 100 : 0;

      return {
        used,
        total,
        available,
        usagePercentage,
        limit: performanceMemory.jsHeapSizeLimit,
        timestamp
      };
    }

    if (this.lastInfo) {
      return { ...this.lastInfo, timestamp };
    }

    return {
      used: 0,
      total: 0,
      available: 0,
      usagePercentage: 0,
      timestamp
    };
  }

  private calculateTrend(): MemoryTrend | null {
    if (this.history.length < 2) {
      return this.trend;
    }

    const windowSize = Math.min(this.config.trendWindow, this.history.length - 1);
    if (windowSize < 2) {
      return this.trend;
    }

    const recent = this.history.slice(-windowSize);
    const first = recent[0];
    const last = recent[recent.length - 1];
    const delta = last.used - first.used;
    const elapsed = last.timestamp - first.timestamp;

    if (elapsed <= 0) {
      return this.trend;
    }

    const changeRate = delta / (elapsed / 1000);
    const baseline = last.total || first.total || 1;
    const relativeChange = Math.abs(delta) / baseline;

    if (relativeChange < this.config.smoothingFactor) {
      return {
        direction: 'stable',
        changeRate,
        samples: recent.length
      };
    }

    return {
      direction: delta > 0 ? 'increasing' : 'decreasing',
      changeRate,
      samples: recent.length
    };
  }

  private initializePerformanceObserver(): void {
    if (typeof PerformanceObserver === 'undefined') {
      return;
    }

    try {
      this.performanceObserver = new PerformanceObserver(() => {
        this.collectMemoryInfo();
      });
      this.performanceObserver.observe({ entryTypes: ['gc'] as any });
    } catch (error) {
      console.warn('Failed to initialize performance observer for memory monitoring:', error);
      this.performanceObserver = null;
    }
  }
}

export function getGlobalMemoryMonitor(config?: Partial<MemoryMonitorConfig>): MemoryMonitor {
  return MemoryMonitor.getInstance(config);
}

export function formatMemorySize(bytes: number, fractionDigits: number = 1): string {
  if (!Number.isFinite(bytes) || bytes < 0) {
    return '0 B';
  }

  if (bytes < 1024) {
    return `${bytes.toFixed(0)} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(fractionDigits)} KB`;
  }

  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(fractionDigits)} MB`;
  }

  return `${(bytes / (1024 * 1024 * 1024)).toFixed(fractionDigits)} GB`;
}

export function formatMemoryPercentage(percentage: number, fractionDigits: number = 1): string {
  if (!Number.isFinite(percentage)) {
    return '0%';
  }

  return `${percentage.toFixed(fractionDigits)}%`;
}

export function getMemoryUsageSeverity(
  percentage: number,
  thresholds?: { warning: number; critical: number }
): MemoryStatus {
  const warning = thresholds?.warning ?? DEFAULT_MEMORY_CONFIG.warningThreshold;
  const critical = thresholds?.critical ?? DEFAULT_MEMORY_CONFIG.criticalThreshold;

  if (percentage >= critical) {
    return 'critical';
  }

  if (percentage >= warning) {
    return 'warning';
  }

  return 'normal';
}
