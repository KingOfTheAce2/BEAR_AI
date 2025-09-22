import { useEffect, useMemo, useState } from 'react';
import { LocalPerformanceMonitor } from '../../services/monitoring/localPerformanceMonitor';
import { ModelPerformanceMetrics, MonitoringConfig } from '../../types/monitoring';

type HookResult = {
  monitor: LocalPerformanceMonitor | null;
  isLoading: boolean;
  error: string | null;
};

let activeMonitor: LocalPerformanceMonitor | null = null;
let initializing: Promise<LocalPerformanceMonitor> | null = null;

const defaultConfig: MonitoringConfig = {
  sampling: {
    systemMetricsInterval: 5000,
    modelMetricsInterval: 2000,
    alertCheckInterval: 10000
  },
  storage: {
    maxHistoryDays: 7,
    compressionEnabled: false,
    autoCleanup: true
  },
  thresholds: {
    cpu: { warning: 70, critical: 90 },
    memory: { warning: 80, critical: 95 },
    disk: { warning: 80, critical: 95 },
    modelLatency: { warning: 3000, critical: 8000 },
    modelMemory: { warning: 256, critical: 512 }
  },
  alerts: {
    enabled: true,
    soundEnabled: false,
    notificationEnabled: false,
    emailEnabled: false
  },
  privacy: {
    localStorageOnly: true,
    encryptData: false,
    anonymizeData: false
  }
};

function mergeConfig(
  base: MonitoringConfig,
  overrides?: Partial<MonitoringConfig>
): MonitoringConfig {
  const thresholdOverrides = overrides?.thresholds ?? {};

  return {
    sampling: {
      ...base.sampling,
      ...(overrides?.sampling ?? {})
    },
    storage: {
      ...base.storage,
      ...(overrides?.storage ?? {})
    },
    thresholds: {
      cpu: { ...base.thresholds.cpu, ...(thresholdOverrides.cpu ?? {}) },
      memory: { ...base.thresholds.memory, ...(thresholdOverrides.memory ?? {}) },
      disk: { ...base.thresholds.disk, ...(thresholdOverrides.disk ?? {}) },
      modelLatency: { ...base.thresholds.modelLatency, ...(thresholdOverrides.modelLatency ?? {}) },
      modelMemory: { ...base.thresholds.modelMemory, ...(thresholdOverrides.modelMemory ?? {}) }
    },
    alerts: {
      ...base.alerts,
      ...(overrides?.alerts ?? {})
    },
    privacy: {
      ...base.privacy,
      ...(overrides?.privacy ?? {})
    }
  };
}

async function ensureMonitor(config?: Partial<MonitoringConfig>): Promise<LocalPerformanceMonitor> {
  const resolvedConfig = mergeConfig(defaultConfig, config);

  if (activeMonitor) {
    if (config) {
      activeMonitor.updateConfig(config);
    }
    return activeMonitor;
  }

  if (!initializing) {
    const monitor = new LocalPerformanceMonitor(resolvedConfig);
    initializing = (async () => {
      await monitor.start();
      activeMonitor = monitor;
      initializing = null;
      return monitor;
    })();
  }

  return initializing;
}

export const PerformanceMonitoringUtils = {
  async initialize(config?: Partial<MonitoringConfig>): Promise<LocalPerformanceMonitor> {
    return ensureMonitor(config);
  },

  getMonitor(): LocalPerformanceMonitor | null {
    return activeMonitor;
  },

  async destroy(): Promise<void> {
    if (initializing) {
      await initializing;
    }

    if (activeMonitor) {
      await activeMonitor.stop();
    }

    activeMonitor = null;
    initializing = null;
  },

  createReactHook(defaults?: Partial<MonitoringConfig>) {
    return function useLocalPerformanceMonitor(config?: Partial<MonitoringConfig>): HookResult {
      const [monitor, setMonitor] = useState<LocalPerformanceMonitor | null>(null);
      const [isLoading, setIsLoading] = useState(true);
      const [error, setError] = useState<string | null>(null);
      const baseConfig = useMemo(() => mergeConfig(defaultConfig, defaults ?? {}), [defaults]);
      const merged = useMemo(() => mergeConfig(baseConfig, config), [baseConfig, config]);

      useEffect(() => {
        let isMounted = true;

        const initializeMonitor = async () => {
          setIsLoading(true);
          setError(null);

          try {
            const instance = await ensureMonitor(merged);
            if (isMounted) {
              setMonitor(instance);
            }
          } catch (err) {
            if (isMounted) {
              setError(err instanceof Error ? err.message : String(err));
            }
          } finally {
            if (isMounted) {
              setIsLoading(false);
            }
          }
        };

        initializeMonitor();

        return () => {
          isMounted = false;
        };
      }, [merged]);

      return { monitor, isLoading, error };
    };
  }
};

export function trackModelPerformance(
  modelId: string,
  modelName: string,
  operation: ModelPerformanceMetrics['operation']
) {
  return function (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) {
    const original = descriptor.value;

    if (typeof original !== 'function') {
      return descriptor;
    }

    descriptor.value = async function (...args: any[]) {
      const monitor = PerformanceMonitoringUtils.getMonitor();
      if (!monitor) {
        return original.apply(this, args);
      }

      const operationId = monitor.startModelOperation(modelId, modelName, operation, {
        method: _propertyKey,
        context: this
      });
      const start = Date.now();

      try {
        const result = await original.apply(this, args);
        monitor.endModelOperation(
          operationId,
          true,
          {
            latency: Date.now() - start
          },
          {
            args
          }
        );
        return result;
      } catch (error) {
        monitor.endModelOperation(
          operationId,
          false,
          {
            latency: Date.now() - start
          },
          {
            args,
            error: error instanceof Error ? error.message : error
          }
        );
        throw error;
      }
    };

    return descriptor;
  };
}
