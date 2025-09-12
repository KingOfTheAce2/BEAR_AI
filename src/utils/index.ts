// Utilities Index
// Central export file for all utility functions and classes

export { cn, responsive, animations, theme } from './cn';

export { 
  MemoryMonitor,
  getGlobalMemoryMonitor,
  formatMemorySize,
  formatMemoryPercentage,
  getMemoryUsageSeverity,
  DEFAULT_MEMORY_CONFIG 
} from './memoryMonitor';

export type {
  MemoryInfo,
  MemoryThresholds,
  MemoryMonitorConfig,
  MemoryStatus,
  MemoryTrend
} from './memoryMonitor';

export {
  SystemResourceDetector,
  getSystemInfo,
  getOptimalConfig,
  checkSystemRequirements,
  getPerformanceMetrics,
  createResourceMonitor,
  getPlatformOptimizations
} from './systemResources';

export type {
  SystemInfo,
  BrowserInfo,
  HardwareInfo,
  SystemCapabilities,
  ResourceLimits,
  PerformanceMetrics
} from './systemResources';