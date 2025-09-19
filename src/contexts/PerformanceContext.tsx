import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
  performanceMonitor, 
  SystemMetrics, 
  ModelInferenceMetrics, 
  UserInteractionMetrics, 
  PerformanceAlert, 
  OptimizationSuggestion 
} from '../services/performanceMonitor';

interface PerformanceContextType {
  // Monitoring state
  isMonitoring: boolean;
  startMonitoring: () => void;
  stopMonitoring: () => void;
  
  // Metrics
  systemMetrics: SystemMetrics[];
  modelMetrics: ModelInferenceMetrics[];
  userMetrics: UserInteractionMetrics[];

  // Alerts and suggestions
  alerts: PerformanceAlert[];
  suggestions: OptimizationSuggestion[];

  // Actions
  recordModelInference: (
    metrics: Omit<ModelInferenceMetrics, 'tokensPerSecond' | 'success'> & { success?: boolean }
  ) => void;
  recordUserInteraction: (metrics: UserInteractionMetrics) => void;
  resolveAlert: (alertId: string) => void;

  // Summary data
  performanceSummary: any;
  
  // Configuration
  updateThresholds: (thresholds: any) => void;
}

const PerformanceContext = createContext<PerformanceContextType | undefined>(undefined);

interface PerformanceProviderProps {
  children: ReactNode;
  autoStart?: boolean;
  monitoringInterval?: number;
}

export const PerformanceProvider: React.FC<PerformanceProviderProps> = ({
  children,
  autoStart = true,
  monitoringInterval = 5000
}) => {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics[]>([]);
  const [modelMetrics, setModelMetrics] = useState<ModelInferenceMetrics[]>([]);
  const [userMetrics, setUserMetrics] = useState<UserInteractionMetrics[]>([]);
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);
  const [suggestions, setSuggestions] = useState<OptimizationSuggestion[]>([]);
  const [performanceSummary, setPerformanceSummary] = useState<any>({});

  useEffect(() => {
    // Initialize data
    setSystemMetrics(performanceMonitor.getSystemMetrics());
    setModelMetrics(performanceMonitor.getModelMetrics());
    setUserMetrics(performanceMonitor.getUserMetrics());
    setAlerts(performanceMonitor.getAlerts());
    setSuggestions(performanceMonitor.getOptimizationSuggestions());
    setPerformanceSummary(performanceMonitor.getPerformanceSummary());

    // Set up event listeners
    const handleMonitoringStarted = () => setIsMonitoring(true);
    const handleMonitoringStopped = () => setIsMonitoring(false);
    
    const handleSystemMetrics = (metrics: SystemMetrics) => {
      setSystemMetrics(prev => [...prev.slice(-99), metrics]);
    };

    const handleModelMetrics = (metrics: ModelInferenceMetrics) => {
      setModelMetrics(prev => [...prev.slice(-99), metrics]);
    };

    const handleUserMetrics = (metrics: UserInteractionMetrics) => {
      setUserMetrics(prev => [...prev.slice(-99), metrics]);
    };

    const handleAlertCreated = (alert: PerformanceAlert) => {
      setAlerts(prev => [...prev, alert]);
    };

    const handleAlertResolved = (alert: PerformanceAlert) => {
      setAlerts(prev => prev.map(a => a.id === alert.id ? alert : a));
    };

    const handleOptimizationSuggestions = (newSuggestions: OptimizationSuggestion[]) => {
      setSuggestions(prev => [...prev, ...newSuggestions]);
    };

    // Register event listeners
    performanceMonitor.on('monitoring-started', handleMonitoringStarted);
    performanceMonitor.on('monitoring-stopped', handleMonitoringStopped);
    performanceMonitor.on('system-metrics-updated', handleSystemMetrics);
    performanceMonitor.on('model-metrics-updated', handleModelMetrics);
    performanceMonitor.on('user-metrics-updated', handleUserMetrics);
    performanceMonitor.on('alert-created', handleAlertCreated);
    performanceMonitor.on('alert-resolved', handleAlertResolved);
    performanceMonitor.on('optimization-suggestions', handleOptimizationSuggestions);

    // Update summary periodically
    const summaryInterval = setInterval(() => {
      setPerformanceSummary(performanceMonitor.getPerformanceSummary());
    }, 10000);

    // Auto-start monitoring if enabled
    if (autoStart) {
      performanceMonitor.startMonitoring(monitoringInterval);
    }

    return () => {
      // Clean up event listeners
      performanceMonitor.off('monitoring-started', handleMonitoringStarted);
      performanceMonitor.off('monitoring-stopped', handleMonitoringStopped);
      performanceMonitor.off('system-metrics-updated', handleSystemMetrics);
      performanceMonitor.off('model-metrics-updated', handleModelMetrics);
      performanceMonitor.off('user-metrics-updated', handleUserMetrics);
      performanceMonitor.off('alert-created', handleAlertCreated);
      performanceMonitor.off('alert-resolved', handleAlertResolved);
      performanceMonitor.off('optimization-suggestions', handleOptimizationSuggestions);
      
      clearInterval(summaryInterval);
    };
  }, [autoStart, monitoringInterval]);

  const startMonitoring = () => {
    performanceMonitor.startMonitoring(monitoringInterval);
  };

  const stopMonitoring = () => {
    performanceMonitor.stopMonitoring();
  };

  const recordModelInference = (
    metrics: Omit<ModelInferenceMetrics, 'tokensPerSecond' | 'success'> & { success?: boolean }
  ) => {
    performanceMonitor.recordModelInference(metrics);
  };

  const recordUserInteraction = (metrics: UserInteractionMetrics) => {
    performanceMonitor.recordUserInteraction(metrics);
  };

  const resolveAlert = (alertId: string) => {
    performanceMonitor.resolveAlert(alertId);
  };

  const updateThresholds = (thresholds: any) => {
    performanceMonitor.updateThresholds(thresholds);
  };

  const value: PerformanceContextType = {
    isMonitoring,
    startMonitoring,
    stopMonitoring,
    systemMetrics,
    modelMetrics,
    userMetrics,
    alerts,
    suggestions,
    recordModelInference,
    recordUserInteraction,
    resolveAlert,
    performanceSummary,
    updateThresholds
  };

  return (
    <PerformanceContext.Provider value={value}>
      {children}
    </PerformanceContext.Provider>
  );
};

export const usePerformance = (): PerformanceContextType => {
  const context = useContext(PerformanceContext);
  if (context === undefined) {
    throw new Error('usePerformance must be used within a PerformanceProvider');
  }
  return context;
};

// Higher-order component for automatic performance tracking
export const withPerformanceTracking = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName: string
) => {
  return React.forwardRef<any, P>((props, ref) => {
    const performance = usePerformance();
    const [renderStart] = useState(Date.now());

    useEffect(() => {
      const renderEnd = Date.now();
      const renderTime = renderEnd - renderStart;

      // Track component render performance
      performance.recordUserInteraction({
        sessionId: 'current-session',
        action: 'component-render',
        timestamp: renderStart,
        duration: renderTime,
        timeSpent: renderTime,
        component: componentName,
        performance: {
          renderTime,
          interactionToNextPaint: 0,
          cumulativeLayoutShift: 0,
          largestContentfulPaint: renderTime
        }
      });
    }, [performance, renderStart, componentName]);

    return <WrappedComponent {...props} ref={ref} />;
  });
};

// Hook for tracking user interactions
export const useInteractionTracking = (componentName: string) => {
  const performance = usePerformance();

  const trackInteraction = (action: string, metadata?: Record<string, any>) => {
    const startTime = Date.now();
    
    return {
      start: startTime,
      end: () => {
        const endTime = Date.now();
        const duration = endTime - startTime;

        performance.recordUserInteraction({
          sessionId: 'current-session',
          action,
          timestamp: startTime,
          duration,
          timeSpent: duration,
          clickCount: action === 'click' ? 1 : undefined,
          component: componentName,
          metadata,
          performance: {
            renderTime: duration,
            interactionToNextPaint: duration,
            cumulativeLayoutShift: 0,
            largestContentfulPaint: duration
          }
        });
      }
    };
  };

  return { trackInteraction };
};

// Hook for tracking model inference
export const useModelTracking = () => {
  const performance = usePerformance();

  const trackInference = async (
    modelName: string,
    inferenceFunction: () => Promise<any>,
    metadata?: { inputTokens?: number; outputTokens?: number }
  ) => {
    const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    let tokensGenerated = 0;
    let memoryBefore = 0;
    let error: string | undefined;

    // Get memory before inference
    if (typeof window !== 'undefined' && (performance as any).memory) {
      memoryBefore = (performance as any).memory.usedJSHeapSize;
    }

    try {
      const result = await inferenceFunction();
      
      // Estimate tokens generated (this would need to be provided by the actual inference)
      if (typeof result === 'string') {
        tokensGenerated = Math.ceil(result.length / 4); // Rough approximation
      }

      return result;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unknown error';
      throw err;
    } finally {
      const endTime = Date.now();
      const duration = endTime - startTime;
      let memoryUsed = 0;

      // Get memory after inference
      if (typeof window !== 'undefined' && (performance as any).memory) {
        memoryUsed = (performance as any).memory.usedJSHeapSize - memoryBefore;
      }

      const success = !error;

      performance.recordModelInference({
        modelId: modelName,
        requestId,
        startTime,
        endTime,
        duration,
        tokensGenerated,
        memoryUsed,
        error,
        inputTokens: metadata?.inputTokens || 0,
        outputTokens: metadata?.outputTokens || tokensGenerated,
        success,
        latency: {
          firstToken: Math.min(duration, 100), // Estimate first token latency
          totalTime: duration,
          networkTime: Math.min(duration * 0.3, 50), // Estimate network time
          processingTime: duration * 0.7 // Estimate processing time
        }
      });
    }
  };

  return { trackInference };
};

export default PerformanceProvider;