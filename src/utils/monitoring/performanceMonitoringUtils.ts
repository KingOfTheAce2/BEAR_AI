// Performance Monitoring Utilities and Helper Functions
import { LocalPerformanceMonitor } from '../../services/monitoring/localPerformanceMonitor';
import { MonitoringConfig, SystemMetrics, ModelPerformanceMetrics } from '../../types/monitoring';

/**
 * Performance monitoring utilities for easy integration with React applications
 */
export class PerformanceMonitoringUtils {
  private static instance: LocalPerformanceMonitor | null = null;

  /**
   * Initialize the global performance monitor instance
   */
  static async initialize(config?: Partial<MonitoringConfig>): Promise<LocalPerformanceMonitor> {
    if (!this.instance) {
      this.instance = new LocalPerformanceMonitor(config);
      await this.instance.start();
    }
    return this.instance;
  }

  /**
   * Get the global performance monitor instance
   */
  static getInstance(): LocalPerformanceMonitor | null {
    return this.instance;
  }

  /**
   * Destroy the global instance
   */
  static async destroy(): Promise<void> {
    if (this.instance) {
      await this.instance.stop();
      this.instance = null;
    }
  }

  /**
   * Create a React hook-compatible performance monitor
   */
  static createReactHook() {
    return function usePerformanceMonitor(config?: Partial<MonitoringConfig>) {
      const [monitor, setMonitor] = React.useState<LocalPerformanceMonitor | null>(null);
      const [isLoading, setIsLoading] = React.useState(true);
      const [error, setError] = React.useState<string | null>(null);

      React.useEffect(() => {
        let mounted = true;

        const initMonitor = async () => {
          try {
            setIsLoading(true);
            setError(null);
            
            const monitorInstance = await PerformanceMonitoringUtils.initialize(config);
            
            if (mounted) {
              setMonitor(monitorInstance);
            }
          } catch (err) {
            if (mounted) {
              setError(err instanceof Error ? err.message : 'Failed to initialize performance monitor');
            }
          } finally {
            if (mounted) {
              setIsLoading(false);
            }
          }
        };

        initMonitor();

        return () => {
          mounted = false;
        };
      }, []);

      return { monitor, isLoading, error };
    };
  }
}

/**
 * Decorator for automatic model performance tracking
 */
export function trackModelPerformance(
  modelId: string, 
  modelName: string, 
  operation: 'inference' | 'training' | 'loading' = 'inference'
) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const monitor = PerformanceMonitoringUtils.getInstance();
      
      if (!monitor) {
        // If monitoring is not enabled, just run the original method
        return originalMethod.apply(this, args);
      }

      try {
        // Use the tracking wrapper
        const result = await monitor.trackInference(
          modelId,
          modelName,
          () => originalMethod.apply(this, args),
          args[0]?.tokenCount || args[0]?.inputTokens,
          { 
            method: propertyKey,
            className: target.constructor.name,
            arguments: args.length
          }
        );
        
        return result.result;
      } catch (error) {
        // Make sure to track the error
        const operationId = monitor.startModelOperation(modelId, modelName, operation);
        monitor.endModelOperation(operationId, false);
        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Higher-order component for automatic performance monitoring
 */
export function withPerformanceMonitoring<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  config?: {
    trackRenders?: boolean;
    trackProps?: boolean;
    componentName?: string;
  }
) {
  const displayName = config?.componentName || WrappedComponent.displayName || WrappedComponent.name || 'Component';
  
  return React.memo(React.forwardRef<any, P>((props, ref) => {
    const monitor = PerformanceMonitoringUtils.getInstance();
    const renderStartTime = React.useRef<number>();
    
    // Track render performance
    React.useLayoutEffect(() => {
      if (config?.trackRenders && monitor) {
        renderStartTime.current = performance.now();
      }
    });
    
    React.useLayoutEffect(() => {
      if (config?.trackRenders && monitor && renderStartTime.current) {
        const renderTime = performance.now() - renderStartTime.current;
        
        // Create a custom alert if render time is excessive
        if (renderTime > 100) { // 100ms threshold
          monitor.createCustomAlert(
            renderTime > 500 ? 'critical' : 'warning',
            'system',
            `Slow Component Render: ${displayName}`,
            `Component ${displayName} took ${renderTime.toFixed(1)}ms to render, which may impact user experience.`
          );
        }
      }
    });
    
    // Track prop changes
    React.useEffect(() => {
      if (config?.trackProps && monitor) {
        const propsSize = JSON.stringify(props).length;
        if (propsSize > 10000) { // Large props threshold
          monitor.createCustomAlert(
            'warning',
            'memory',
            `Large Props: ${displayName}`,
            `Component ${displayName} received ${(propsSize / 1024).toFixed(1)}KB of props data.`
          );
        }
      }
    }, [props]);

    return React.createElement(WrappedComponent, { ...props, ref });
  }));
}

/**
 * Utility functions for performance analysis
 */
export const PerformanceAnalytics = {
  /**
   * Calculate performance score based on metrics
   */
  calculatePerformanceScore(systemMetrics: SystemMetrics[], modelMetrics: ModelPerformanceMetrics[]): {
    overall: number;
    system: number;
    model: number;
    breakdown: {
      cpu: number;
      memory: number;
      disk: number;
      modelLatency: number;
      modelMemory: number;
    };
  } {
    if (systemMetrics.length === 0 && modelMetrics.length === 0) {
      return {
        overall: 100,
        system: 100,
        model: 100,
        breakdown: { cpu: 100, memory: 100, disk: 100, modelLatency: 100, modelMemory: 100 }
      };
    }

    // System scores (higher usage = lower score)
    const recentSystemMetrics = systemMetrics.slice(-10);
    const avgCpu = recentSystemMetrics.reduce((sum, m) => sum + m.cpu.usage, 0) / Math.max(recentSystemMetrics.length, 1);
    const avgMemory = recentSystemMetrics.reduce((sum, m) => sum + m.memory.percentage, 0) / Math.max(recentSystemMetrics.length, 1);
    const avgDisk = recentSystemMetrics.reduce((sum, m) => sum + m.disk.percentage, 0) / Math.max(recentSystemMetrics.length, 1);

    const cpuScore = Math.max(0, 100 - avgCpu);
    const memoryScore = Math.max(0, 100 - avgMemory);
    const diskScore = Math.max(0, 100 - avgDisk);

    // Model scores (higher latency/memory = lower score)
    const recentModelMetrics = modelMetrics.slice(-20);
    const avgLatency = recentModelMetrics.reduce((sum, m) => sum + m.metrics.latency, 0) / Math.max(recentModelMetrics.length, 1);
    const avgModelMemory = recentModelMetrics.reduce((sum, m) => sum + m.metrics.memoryUsage, 0) / Math.max(recentModelMetrics.length, 1);

    const modelLatencyScore = Math.max(0, 100 - (avgLatency / 100)); // 10s max = 0 score
    const modelMemoryScore = Math.max(0, 100 - (avgModelMemory / (1024 * 1024 * 10))); // 1GB max = 0 score

    const systemScore = (cpuScore + memoryScore + diskScore) / 3;
    const modelScore = modelMetrics.length > 0 ? (modelLatencyScore + modelMemoryScore) / 2 : 100;
    const overallScore = (systemScore + modelScore) / 2;

    return {
      overall: Math.round(overallScore),
      system: Math.round(systemScore),
      model: Math.round(modelScore),
      breakdown: {
        cpu: Math.round(cpuScore),
        memory: Math.round(memoryScore),
        disk: Math.round(diskScore),
        modelLatency: Math.round(modelLatencyScore),
        modelMemory: Math.round(modelMemoryScore)
      }
    };
  },

  /**
   * Generate performance insights
   */
  generateInsights(systemMetrics: SystemMetrics[], modelMetrics: ModelPerformanceMetrics[]): string[] {
    const insights: string[] = [];

    if (systemMetrics.length === 0 && modelMetrics.length === 0) {
      insights.push("No performance data available yet. Start monitoring to get insights.");
      return insights;
    }

    // System insights
    if (systemMetrics.length > 0) {
      const recent = systemMetrics.slice(-20);
      const avgCpu = recent.reduce((sum, m) => sum + m.cpu.usage, 0) / recent.length;
      const avgMemory = recent.reduce((sum, m) => sum + m.memory.percentage, 0) / recent.length;
      const avgDisk = recent.reduce((sum, m) => sum + m.disk.percentage, 0) / recent.length;

      if (avgCpu < 30) {
        insights.push("🟢 CPU usage is low - system has plenty of processing capacity available.");
      } else if (avgCpu > 80) {
        insights.push("🔴 CPU usage is high - consider optimizing CPU-intensive tasks or upgrading hardware.");
      }

      if (avgMemory < 50) {
        insights.push("🟢 Memory usage is healthy with good headroom for peak loads.");
      } else if (avgMemory > 85) {
        insights.push("🔴 Memory usage is high - monitor for potential memory leaks or consider increasing RAM.");
      }

      if (avgDisk > 90) {
        insights.push("🔴 Disk space is critically low - immediate cleanup recommended.");
      } else if (avgDisk > 80) {
        insights.push("🟡 Disk usage is high - consider cleaning up old files or adding storage.");
      }
    }

    // Model insights
    if (modelMetrics.length > 0) {
      const recent = modelMetrics.slice(-50);
      const avgLatency = recent.reduce((sum, m) => sum + m.metrics.latency, 0) / recent.length;
      const errorRate = recent.filter(m => m.metrics.errorRate && m.metrics.errorRate > 0).length / recent.length * 100;

      if (avgLatency < 500) {
        insights.push("🟢 Model inference is very fast - excellent user experience.");
      } else if (avgLatency > 5000) {
        insights.push("🔴 Model inference is slow - consider model optimization or hardware upgrade.");
      }

      if (errorRate === 0) {
        insights.push("🟢 Model operations are highly reliable with no recent errors.");
      } else if (errorRate > 10) {
        insights.push("🔴 High model error rate detected - investigate model stability issues.");
      }

      // Operation type insights
      const operations = recent.reduce((acc, m) => {
        acc[m.operation] = (acc[m.operation] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const totalOps = Object.values(operations).reduce((sum, count) => sum + count, 0);
      if (operations.inference && operations.inference / totalOps > 0.8) {
        insights.push("📊 Mostly inference operations - system optimized for production workload.");
      } else if (operations.training && operations.training / totalOps > 0.3) {
        insights.push("🎯 Significant training activity - ensure adequate resources for training workloads.");
      }
    }

    if (insights.length === 0) {
      insights.push("📈 System performance is within normal ranges.");
    }

    return insights;
  },

  /**
   * Export performance data for analysis
   */
  exportToCSV(systemMetrics: SystemMetrics[], modelMetrics: ModelPerformanceMetrics[]): string {
    const headers = [
      'timestamp',
      'type',
      'cpu_usage',
      'memory_percentage', 
      'disk_percentage',
      'model_id',
      'model_name',
      'operation',
      'latency_ms',
      'memory_usage_bytes',
      'error_rate'
    ];

    const rows = [headers.join(',')];

    // Add system metrics
    systemMetrics.forEach(metric => {
      rows.push([
        metric.timestamp,
        'system',
        metric.cpu.usage.toFixed(2),
        metric.memory.percentage.toFixed(2),
        metric.disk.percentage.toFixed(2),
        '', '', '', '', '', ''
      ].join(','));
    });

    // Add model metrics
    modelMetrics.forEach(metric => {
      rows.push([
        metric.timestamp,
        'model',
        '', '', '',
        metric.modelId,
        metric.modelName,
        metric.operation,
        metric.metrics.latency.toFixed(2),
        metric.metrics.memoryUsage,
        metric.metrics.errorRate || 0
      ].join(','));
    });

    return rows.join('\n');
  }
};

/**
 * React context for performance monitoring
 */
export const PerformanceMonitorContext = React.createContext<{
  monitor: LocalPerformanceMonitor | null;
  isLoading: boolean;
  error: string | null;
}>({
  monitor: null,
  isLoading: true,
  error: null
});

/**
 * Performance monitoring provider component
 */
export const PerformanceMonitorProvider: React.FC<{
  children: React.ReactNode;
  config?: Partial<MonitoringConfig>;
}> = ({ children, config }) => {
  const { monitor, isLoading, error } = PerformanceMonitoringUtils.createReactHook()(config);

  return React.createElement(
    PerformanceMonitorContext.Provider,
    { value: { monitor, isLoading, error } },
    children
  );
};

/**
 * Hook to use performance monitor from context
 */
export const usePerformanceMonitor = () => {
  const context = React.useContext(PerformanceMonitorContext);
  if (!context) {
    throw new Error('usePerformanceMonitor must be used within a PerformanceMonitorProvider');
  }
  return context;
};

// Add React import for environments where it's needed
declare const React: any;