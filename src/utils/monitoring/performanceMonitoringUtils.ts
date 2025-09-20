import { LocalPerformanceMonitor } from '../../services/monitoring/localPerformanceMonitor';
import { ModelPerformanceMetrics, MonitoringConfig } from '../../types/monitoring';

type HookResult = {
  monitor: LocalPerformanceMonitor | null;
  isLoading: boolean;
  error: string | null;
};

let activeMonitor: LocalPerformanceMonitor | null = null;
let initializing: Promise<LocalPerformanceMonitor> | null = null;

const defaultConfig: Partial<MonitoringConfig> = {
  sampling: {
    systemMetricsInterval: 5000,
    modelMetricsInterval: 2000,
    alertCheckInterval: 10000
  }
};

function mergeConfig(
  base: Partial<MonitoringConfig> | undefined,
  overrides: Partial<MonitoringConfig> | undefined
): Partial<MonitoringConfig> | undefined {
  if (!base && !overrides) {
    return undefined;
  }

  return {
    sampling: {
      ...base?.sampling,
      ...overrides?.sampling
    },
    storage: {
      ...base?.storage,
      ...overrides?.storage
    },
    thresholds: {
      ...base?.thresholds,
      ...overrides?.thresholds
    },
    alerts: {
      ...base?.alerts,
      ...overrides?.alerts
    },
    privacy: {
      ...base?.privacy,
      ...overrides?.privacy
    }
  };
}

async function ensureMonitor(config?: Partial<MonitoringConfig>): Promise<LocalPerformanceMonitor> {
  if (activeMonitor) {
    if (config) {
      activeMonitor.updateConfig(config);
    }
    return activeMonitor;
  }

  if (!initializing) {
    const monitor = new LocalPerformanceMonitor(config ?? defaultConfig);
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
    const mergedConfig = mergeConfig(defaultConfig, config);
    return ensureMonitor(mergedConfig);
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
      const configRef = useRef(config);

      const merged = useMemo(() => mergeConfig(mergeConfig(defaultConfig, defaults), config), [defaults, config]);

      configRef.current = config;

      useEffect(() => {
        let isMounted = true;

        const initializeMonitor = async () => {
          setIsLoading(true);
          setError(null);

          try {
            const instance = await ensureMonitor(merged ?? defaultConfig);
            if (isMounted) {
              if (configRef.current && merged) {
                instance.updateConfig(merged);
              }
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
