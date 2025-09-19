import { useEffect, useRef, useState } from 'react';
import { usePerformance } from '../contexts/PerformanceContext';

interface UsePerformanceTrackingOptions {
  componentName: string;
  trackRender?: boolean;
  trackInteractions?: boolean;
  trackApiCalls?: boolean;
}

interface InteractionTracker {
  start: () => void;
  end: () => void;
  track: (action: string, metadata?: Record<string, any>) => void;
}

export const usePerformanceTracking = (options: UsePerformanceTrackingOptions): InteractionTracker => {
  const { recordUserInteraction } = usePerformance();
  const renderStartTime = useRef(Date.now());
  const [interactions, setInteractions] = useState<Map<string, number>>(new Map());

  // Track component render performance
  useEffect(() => {
    if (options.trackRender) {
      const renderEndTime = Date.now();
      const renderDuration = renderEndTime - renderStartTime.current;

      recordUserInteraction({
        sessionId: 'current-session',
        action: 'component-render',
        timestamp: renderStartTime.current,
        duration: renderDuration,
        timeSpent: renderDuration,
        component: options.componentName,
        performance: {
          renderTime: renderDuration,
          interactionToNextPaint: 0,
          cumulativeLayoutShift: 0,
          largestContentfulPaint: renderDuration
        }
      });
    }
  }, [options.trackRender, options.componentName, recordUserInteraction]);

  // Interaction tracking methods
  const start = () => {
    const trackingId = `${Date.now()}-${Math.random()}`;
    setInteractions(prev => new Map(prev.set(trackingId, Date.now())));
    return trackingId;
  };

  const end = (trackingId?: string) => {
    if (!trackingId) return;
    
    const startTime = interactions.get(trackingId);
    if (startTime) {
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      setInteractions(prev => {
        const newMap = new Map(prev);
        newMap.delete(trackingId);
        return newMap;
      });
      
      return duration;
    }
    return 0;
  };

  const track = (action: string, metadata?: Record<string, any>) => {
    const startTime = Date.now();
    const derivedKeystrokes = typeof metadata?.inputLength === 'number'
      ? metadata.inputLength
      : undefined;

    // Return a function to end the tracking
    return () => {
      const endTime = Date.now();
      const duration = endTime - startTime;

      recordUserInteraction({
        sessionId: 'current-session',
        action,
        timestamp: startTime,
        duration,
        timeSpent: duration,
        clickCount: action === 'click' ? 1 : undefined,
        keystrokes: derivedKeystrokes,
        component: options.componentName,
        metadata,
        performance: {
          renderTime: duration,
          interactionToNextPaint: duration,
          cumulativeLayoutShift: 0,
          largestContentfulPaint: duration
        }
      });
    };
  };

  return { start, end, track };
};

// Hook for tracking specific user actions
export const useActionTracking = (componentName: string) => {
  const { recordUserInteraction } = usePerformance();

  const trackClick = (elementId: string, metadata?: Record<string, any>) => {
    const startTime = Date.now();
    
    const endTracking = () => {
      const endTime = Date.now();
      const duration = endTime - startTime;

      recordUserInteraction({
        sessionId: 'current-session',
        action: 'click',
        timestamp: startTime,
        duration,
        timeSpent: duration,
        clickCount: 1,
        component: componentName,
        metadata: { elementId, ...metadata },
        performance: {
          renderTime: duration,
          interactionToNextPaint: duration,
          cumulativeLayoutShift: 0,
          largestContentfulPaint: duration
        }
      });
    };

    // Track immediately for click events
    setTimeout(endTracking, 0);
    
    return endTracking;
  };

  const trackFormSubmit = (formId: string, formData?: Record<string, any>) => {
    const startTime = Date.now();
    
    return () => {
      const endTime = Date.now();
      const duration = endTime - startTime;

      recordUserInteraction({
        sessionId: 'current-session',
        action: 'form-submit',
        timestamp: startTime,
        duration,
        timeSpent: duration,
        keystrokes: formData ? Object.values(formData).reduce((total, value) => {
          if (typeof value === 'string') {
            return total + value.length;
          }
          return total;
        }, 0) : undefined,
        component: componentName,
        metadata: { formId, formData },
        performance: {
          renderTime: duration,
          interactionToNextPaint: duration,
          cumulativeLayoutShift: 0,
          largestContentfulPaint: duration
        }
      });
    };
  };

  const trackNavigation = (route: string, metadata?: Record<string, any>) => {
    const startTime = Date.now();
    
    return () => {
      const endTime = Date.now();
      const duration = endTime - startTime;

      recordUserInteraction({
        sessionId: 'current-session',
        action: 'navigation',
        timestamp: startTime,
        duration,
        timeSpent: duration,
        component: componentName,
        metadata: { route, ...metadata },
        performance: {
          renderTime: duration,
          interactionToNextPaint: duration,
          cumulativeLayoutShift: 0,
          largestContentfulPaint: duration
        }
      });
    };
  };

  const trackSearch = (query: string, resultsCount?: number) => {
    const startTime = Date.now();
    
    return () => {
      const endTime = Date.now();
      const duration = endTime - startTime;

      recordUserInteraction({
        sessionId: 'current-session',
        action: 'search',
        timestamp: startTime,
        duration,
        timeSpent: duration,
        keystrokes: query.length,
        component: componentName,
        metadata: { query, resultsCount },
        performance: {
          renderTime: duration,
          interactionToNextPaint: duration,
          cumulativeLayoutShift: 0,
          largestContentfulPaint: duration
        }
      });
    };
  };

  return {
    trackClick,
    trackFormSubmit,
    trackNavigation,
    trackSearch
  };
};

// Hook for tracking API call performance
export const useApiTracking = () => {
  const { recordModelInference } = usePerformance();

  const trackApiCall = async (
    apiName: string,
    apiCall: () => Promise<any>,
    options?: {
      estimateTokens?: boolean;
      metadata?: Record<string, any>;
    }
  ) => {
    const requestId = `api-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    let error: string | undefined;
    let result: any;
    let tokensGenerated = 0;

    try {
      result = await apiCall();
      
      // Estimate tokens if enabled and result is string
      if (options?.estimateTokens && typeof result === 'string') {
        tokensGenerated = Math.ceil(result.length / 4);
      }
      
      return result;
    } catch (err) {
      error = err instanceof Error ? err.message : 'API call failed';
      throw err;
    } finally {
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Track as model inference for API calls
      recordModelInference({
        modelId: apiName,
        requestId,
        startTime,
        endTime,
        duration,
        tokensGenerated,
        memoryUsed: 0, // Would need actual memory tracking
        error,
        inputTokens: 0,
        outputTokens: tokensGenerated,
        success: !error,
        latency: {
          firstToken: Math.min(duration, 100),
          totalTime: duration,
          networkTime: duration * 0.3,
          processingTime: duration * 0.7
        },
        metadata: options?.metadata
      });
    }
  };

  return { trackApiCall };
};

// Hook for tracking performance over time
export const usePerformanceTrends = (componentName: string, sampleSize = 10) => {
  const { userMetrics } = usePerformance();
  const [trends, setTrends] = useState<{
    averageRenderTime: number;
    averageInteractionTime: number;
    trendDirection: 'improving' | 'degrading' | 'stable';
  }>({
    averageRenderTime: 0,
    averageInteractionTime: 0,
    trendDirection: 'stable'
  });

  useEffect(() => {
    const componentMetrics = userMetrics
      .filter(metric => metric.component === componentName)
      .slice(-sampleSize);

    if (componentMetrics.length === 0) return;

    const renderTimes = componentMetrics
      .filter(metric => metric.action === 'component-render')
      .map(metric => metric.performance.renderTime);
    
    const interactionTimes = componentMetrics
      .filter(metric => metric.action !== 'component-render')
      .map(metric => metric.duration);

    const avgRenderTime = renderTimes.length > 0 
      ? renderTimes.reduce((sum, time) => sum + time, 0) / renderTimes.length 
      : 0;
    
    const avgInteractionTime = interactionTimes.length > 0
      ? interactionTimes.reduce((sum, time) => sum + time, 0) / interactionTimes.length
      : 0;

    // Calculate trend direction based on recent performance
    let trendDirection: 'improving' | 'degrading' | 'stable' = 'stable';
    
    if (renderTimes.length >= 5) {
      const firstHalf = renderTimes.slice(0, Math.floor(renderTimes.length / 2));
      const secondHalf = renderTimes.slice(Math.floor(renderTimes.length / 2));
      
      const firstAvg = firstHalf.reduce((sum, time) => sum + time, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((sum, time) => sum + time, 0) / secondHalf.length;
      
      const improvementThreshold = 0.1; // 10% improvement threshold
      const degradationThreshold = 0.15; // 15% degradation threshold
      
      if (secondAvg < firstAvg * (1 - improvementThreshold)) {
        trendDirection = 'improving';
      } else if (secondAvg > firstAvg * (1 + degradationThreshold)) {
        trendDirection = 'degrading';
      }
    }

    setTrends({
      averageRenderTime: avgRenderTime,
      averageInteractionTime: avgInteractionTime,
      trendDirection
    });
  }, [userMetrics, componentName, sampleSize]);

  return trends;
};

export default usePerformanceTracking;