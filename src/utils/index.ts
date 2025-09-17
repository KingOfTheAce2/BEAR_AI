// Utilities Index - Simplified exports for existing utilities only
export { cn } from './cn';

// Placeholder exports for missing utilities
export const responsive = (classes: string) => classes;
export const animations = (classes: string) => classes;
export const theme = (classes: string) => classes;

// Memory monitoring stubs (for compatibility)
export class MemoryMonitor {
  static getInstance() { return new MemoryMonitor(); }
  getMemoryInfo() { return { used: 0, total: 100, percentage: 0 }; }
  start() {}
  stop() {}
}

export const getGlobalMemoryMonitor = () => new MemoryMonitor();
export const formatMemorySize = (bytes: number) => `${Math.round(bytes / 1024 / 1024)}MB`;
export const formatMemoryPercentage = (percentage: number) => `${percentage.toFixed(1)}%`;
export const getMemoryUsageSeverity = (percentage: number) => percentage > 80 ? 'high' : 'normal';
export const DEFAULT_MEMORY_CONFIG = { maxUsage: 80, checkInterval: 5000 };

// System resources stubs (for compatibility)
export class SystemResourceDetector {
  static getInstance() { return new SystemResourceDetector(); }
  getSystemInfo() { return { platform: 'web', memory: 8192, cpu: 4 }; }
}

export const getSystemInfo = () => ({ platform: 'web', memory: 8192, cpu: 4 });
export const getOptimalConfig = () => ({});
export const checkSystemRequirements = () => true;
export const getPerformanceMetrics = () => ({ cpu: 0, memory: 0 });
export const createResourceMonitor = () => ({ start: () => {}, stop: () => {} });
export const getPlatformOptimizations = () => ({});

// Type exports (placeholders)
export interface MemoryInfo {
  used: number;
  total: number;
  percentage: number;
}

export interface MemoryThresholds {
  warning: number;
  critical: number;
}

export interface MemoryMonitorConfig {
  maxUsage: number;
  checkInterval: number;
}

export interface SystemInfo {
  platform: string;
  memory: number;
  cpu: number;
}

export interface BrowserInfo {
  name: string;
  version: string;
}

export interface HardwareInfo {
  memory: number;
  cpu: number;
}

export type MemoryStatus = 'normal' | 'warning' | 'critical';
export type MemoryTrend = 'stable' | 'increasing' | 'decreasing';
export type SystemCapabilities = Record<string, boolean>;
export type ResourceLimits = Record<string, number>;
export type PerformanceMetrics = Record<string, number>;