import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  MemoryMonitor, 
  MemoryInfo, 
  MemoryStatus, 
  MemoryTrend, 
  MemoryMonitorConfig, 
  getGlobalMemoryMonitor,
  DEFAULT_MEMORY_CONFIG 
} from '@utils/memoryMonitor';
import { getSystemInfo, getOptimalConfig } from '@utils/systemResources';

export interface UseMemoryMonitorOptions {
  /** Custom configuration for memory monitoring */
  config?: Partial<MemoryMonitorConfig>;
  /** Whether to start monitoring automatically */
  autoStart?: boolean;
  /** Whether to use system-optimized configuration */
  useOptimalConfig?: boolean;
  /** Callback for memory status changes */
  onStatusChange?: (status: MemoryStatus) => void;
  /** Callback for critical memory conditions */
  onCriticalMemory?: (memoryInfo: MemoryInfo) => void;
  /** Callback for memory warnings */
  onMemoryWarning?: (memoryInfo: MemoryInfo) => void;
  /** Whether to track memory trends */
  enableTrends?: boolean;
  /** Debounce delay for callbacks (ms) */
  debounceDelay?: number;
}

export interface UseMemoryMonitorReturn {
  /** Current memory information */
  memoryInfo: MemoryInfo | null;
  /** Current memory status */
  status: MemoryStatus;
  /** Memory usage trend */
  trend: MemoryTrend | null;
  /** Memory usage history */
  history: MemoryInfo[];
  /** Whether monitoring is active */
  isMonitoring: boolean;
  /** Whether memory API is supported */
  isSupported: boolean;
  /** Start monitoring */
  start: () => void;
  /** Stop monitoring */
  stop: () => void;
  /** Reset monitoring data */
  reset: () => void;
  /** Get current configuration */
  getConfig: () => MemoryMonitorConfig;
  /** Update configuration */
  updateConfig: (newConfig: Partial<MemoryMonitorConfig>) => void;
  /** Force manual update */
  refresh: () => void;
  /** Error state */
  error: Error | null;
}

/**
 * React Hook for Memory Monitoring
 * Provides real-time memory usage data with configurable thresholds and callbacks
 */
export function useMemoryMonitor(options: UseMemoryMonitorOptions = {}): UseMemoryMonitorReturn {
  const {
    config: userConfig,
    autoStart = true,
    useOptimalConfig: useOptimal = true,
    onStatusChange,
    onCriticalMemory,
    onMemoryWarning,
    enableTrends = true,
    debounceDelay = 100,
  } = options;

  // State
  const [memoryInfo, setMemoryInfo] = useState<MemoryInfo | null>(null);
  const [status, setStatus] = useState<MemoryStatus>('normal');
  const [trend, setTrend] = useState<MemoryTrend | null>(null);
  const [history, setHistory] = useState<MemoryInfo[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Refs for stable references
  const monitorRef = useRef<MemoryMonitor | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const callbackTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const previousStatusRef = useRef<MemoryStatus>('normal');

  // Check if memory monitoring is supported
  const isSupported = MemoryMonitor.isSupported();

  // Get optimal configuration based on system capabilities
  const getOptimalConfiguration = useCallback((): MemoryMonitorConfig => {
    if (!useOptimal) {
      return { ...DEFAULT_MEMORY_CONFIG, ...userConfig };
    }

    try {
      const systemConfig = getOptimalConfig();
      const optimalConfig: MemoryMonitorConfig = {
        ...DEFAULT_MEMORY_CONFIG,
        updateInterval: systemConfig.memoryMonitorInterval,
        enableDetailedMonitoring: systemConfig.enableDetailedMetrics,
        enablePerformanceObserver: systemConfig.enableDetailedMetrics && systemConfig.adaptiveSampling,
        historySize: systemConfig.historySize,
        smoothingFactor: systemConfig.smoothingFactor,
        trendWindow: Math.max(4, Math.min(12, Math.round(systemConfig.maxSamples / 20)))
      };

      return { ...optimalConfig, ...userConfig };
    } catch (err) {
      console.warn('Failed to get optimal config, using defaults:', err);
      return { ...DEFAULT_MEMORY_CONFIG, ...userConfig };
    }
  }, [useOptimal, userConfig]);

  // Debounced callback execution
  const executeCallback = useCallback((key: string, callback: () => void) => {
    const timers = callbackTimersRef.current;
    
    // Clear existing timer
    if (timers.has(key)) {
      clearTimeout(timers.get(key)!);
    }

    // Set new timer
    const timer = setTimeout(() => {
      callback();
      timers.delete(key);
    }, debounceDelay);

    timers.set(key, timer);
  }, [debounceDelay]);

  // Handle memory info updates
  const handleMemoryUpdate = useCallback((info: MemoryInfo) => {
    try {
      setMemoryInfo(info);
      setHistory(prev => [...prev.slice(-99), info]); // Keep last 100 entries

      // Update status
      const newStatus = monitorRef.current?.getMemoryStatus() || 'normal';
      setStatus(newStatus);

      // Update trend if enabled
      if (enableTrends && monitorRef.current) {
        const newTrend = monitorRef.current.getMemoryTrend();
        setTrend(newTrend);
      }

      // Execute callbacks with debouncing
      if (onStatusChange && newStatus !== previousStatusRef.current) {
        executeCallback('status', () => onStatusChange(newStatus));
        previousStatusRef.current = newStatus;
      }

      if (onCriticalMemory && newStatus === 'critical') {
        executeCallback('critical', () => onCriticalMemory(info));
      }

      if (onMemoryWarning && newStatus === 'warning') {
        executeCallback('warning', () => onMemoryWarning(info));
      }

      // Clear error state on successful update
      setError(null);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Memory update failed');
      setError(error);
      console.error('Memory monitor update error:', error);
    }
  }, [enableTrends, onStatusChange, onCriticalMemory, onMemoryWarning, executeCallback]);

  // Initialize monitor
  const initializeMonitor = useCallback(() => {
    try {
      if (!isSupported) {
        throw new Error('Memory monitoring API not supported in this browser');
      }

      const config = getOptimalConfiguration();
      const monitor = getGlobalMemoryMonitor(config);
      
      monitorRef.current = monitor;
      return monitor;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to initialize memory monitor');
      setError(error);
      throw error;
    }
  }, [isSupported, getOptimalConfiguration]);

  // Start monitoring
  const start = useCallback(() => {
    try {
      if (isMonitoring) return;

      const monitor = monitorRef.current || initializeMonitor();
      
      // Subscribe to updates
      unsubscribeRef.current = monitor.subscribe(handleMemoryUpdate);
      
      // Start monitoring
      monitor.start();
      setIsMonitoring(true);
      setError(null);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to start monitoring');
      setError(error);
      console.error('Failed to start memory monitoring:', error);
    }
  }, [isMonitoring, initializeMonitor, handleMemoryUpdate]);

  // Stop monitoring
  const stop = useCallback(() => {
    try {
      if (!isMonitoring) return;

      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }

      if (monitorRef.current) {
        monitorRef.current.stop();
      }

      // Clear any pending callbacks
      callbackTimersRef.current.forEach(timer => clearTimeout(timer));
      callbackTimersRef.current.clear();

      setIsMonitoring(false);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to stop monitoring');
      setError(error);
      console.error('Failed to stop memory monitoring:', error);
    }
  }, [isMonitoring]);

  // Reset monitoring data
  const reset = useCallback(() => {
    setMemoryInfo(null);
    setStatus('normal');
    setTrend(null);
    setHistory([]);
    setError(null);
    previousStatusRef.current = 'normal';
    
    // Clear any pending callbacks
    callbackTimersRef.current.forEach(timer => clearTimeout(timer));
    callbackTimersRef.current.clear();
  }, []);

  // Get current configuration
  const getConfig = useCallback((): MemoryMonitorConfig => {
    if (monitorRef.current) {
      return monitorRef.current.getConfig();
    }
    return getOptimalConfiguration();
  }, [getOptimalConfiguration]);

  // Update configuration
  const updateConfig = useCallback((newConfig: Partial<MemoryMonitorConfig>) => {
    try {
      const monitor = monitorRef.current || initializeMonitor();
      const fullConfig = { ...getOptimalConfiguration(), ...newConfig };

      monitor.updateConfig(fullConfig);
      monitorRef.current = monitor;

      if (isMonitoring) {
        monitor.start();
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update configuration');
      setError(error);
      console.error('Failed to update memory monitor configuration:', error);
    }
  }, [initializeMonitor, getOptimalConfiguration, isMonitoring]);

  // Force manual refresh
  const refresh = useCallback(async () => {
    try {
      if (!monitorRef.current) return;

      // Trigger immediate update
      monitorRef.current.refresh();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to refresh memory data');
      setError(error);
      console.error('Failed to refresh memory monitoring:', error);
    }
  }, []);

  // Auto-start effect
  useEffect(() => {
    if (autoStart && !isMonitoring && !error) {
      start();
    }

    // Cleanup on unmount
    return () => {
      stop();
      
      // Clear any pending callbacks
      callbackTimersRef.current.forEach(timer => clearTimeout(timer));
      callbackTimersRef.current.clear();
    };
  }, [autoStart, isMonitoring, error, start, stop]);

  // Handle visibility changes (pause monitoring when tab is hidden)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && isMonitoring) {
        // Optionally pause monitoring when tab is hidden
        // This can be configurable in the future
      } else if (!document.hidden && !isMonitoring && autoStart) {
        start();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isMonitoring, autoStart, start]);

  return {
    memoryInfo,
    status,
    trend,
    history,
    isMonitoring,
    isSupported,
    start,
    stop,
    reset,
    getConfig,
    updateConfig,
    refresh,
    error,
  };
}

/**
 * Simplified hook for basic memory monitoring
 */
export function useSimpleMemoryMonitor(): {
  memoryUsage: number;
  status: MemoryStatus;
  isSupported: boolean;
} {
  const { memoryInfo, status, isSupported } = useMemoryMonitor({
    config: { updateInterval: 2000 },
    enableTrends: false,
  });

  return {
    memoryUsage: memoryInfo?.usagePercentage || 0,
    status,
    isSupported,
  };
}

/**
 * Hook for memory threshold alerts
 */
export function useMemoryAlerts(thresholds?: { warning: number; critical: number }) {
  const [alerts, setAlerts] = useState<Array<{ type: 'warning' | 'critical'; timestamp: number }>>([]);
  
  const { status } = useMemoryMonitor({
    onMemoryWarning: () => {
      setAlerts(prev => [...prev.slice(-9), { type: 'warning', timestamp: Date.now() }]);
    },
    onCriticalMemory: () => {
      setAlerts(prev => [...prev.slice(-9), { type: 'critical', timestamp: Date.now() }]);
    },
    config: thresholds ? { thresholds: { ...DEFAULT_MEMORY_CONFIG.thresholds, ...thresholds } } : undefined,
  });

  const clearAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  return {
    alerts,
    currentStatus: status,
    clearAlerts,
  };
}