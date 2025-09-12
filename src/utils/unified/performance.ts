/**
 * Unified Performance Monitoring System for BEAR AI
 * Comprehensive performance tracking and optimization tools
 */

import { logger, createLogger } from './logger';
import { errorHandler, BearError } from './errorHandler';

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: 'ms' | 'bytes' | 'count' | 'percent';
  timestamp: Date;
  category: 'render' | 'network' | 'memory' | 'computation' | 'user' | 'system';
  severity: 'info' | 'warning' | 'error';
  context?: Record<string, any>;
}

export interface PerformanceBudget {
  metric: string;
  warning: number;
  error: number;
  unit: string;
}

export interface PerformanceReport {
  summary: {
    totalMetrics: number;
    warnings: number;
    errors: number;
    averageRenderTime: number;
    memoryUsage: number;
  };
  metrics: PerformanceMetric[];
  violations: PerformanceBudget[];
  recommendations: string[];
  timestamp: Date;
}

export class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private budgets: PerformanceBudget[] = [];
  private logger: ReturnType<typeof createLogger>;
  private observers: Map<string, PerformanceObserver> = new Map();
  private timers: Map<string, number> = new Map();
  private counters: Map<string, number> = new Map();
  private thresholds: Map<string, { warning: number; error: number }> = new Map();

  constructor(private options: {
    maxMetrics?: number;
    enableAutoReporting?: boolean;
    reportInterval?: number;
    enableWebVitals?: boolean;
  } = {}) {
    this.options = {
      maxMetrics: 1000,
      enableAutoReporting: true,
      reportInterval: 60000, // 1 minute
      enableWebVitals: true,
      ...options
    };

    this.logger = createLogger('PerformanceMonitor');
    this.setupDefaultBudgets();
    this.setupDefaultThresholds();
    this.initializeObservers();
    
    if (this.options.enableAutoReporting) {
      this.startAutoReporting();
    }
  }

  /**
   * Record a performance metric
   */
  record(metric: Omit<PerformanceMetric, 'timestamp'>): void {
    const fullMetric: PerformanceMetric = {
      ...metric,
      timestamp: new Date()
    };

    this.metrics.push(fullMetric);

    // Trim metrics array if it gets too large
    if (this.metrics.length > (this.options.maxMetrics || 1000)) {
      this.metrics.shift();
    }

    // Check against budgets
    this.checkBudgets(fullMetric);

    // Log if it's a warning or error
    if (fullMetric.severity === 'warning') {
      this.logger.warn(`Performance warning: ${fullMetric.name}`, {
        value: fullMetric.value,
        unit: fullMetric.unit,
        context: fullMetric.context
      });
    } else if (fullMetric.severity === 'error') {
      this.logger.error(`Performance error: ${fullMetric.name}`, {
        value: fullMetric.value,
        unit: fullMetric.unit,
        context: fullMetric.context
      });
    }
  }

  /**
   * Start a performance timer
   */
  startTimer(name: string): void {
    this.timers.set(name, performance.now());
  }

  /**
   * End a performance timer and record the metric
   */
  endTimer(
    name: string, 
    category: PerformanceMetric['category'] = 'computation',
    context?: Record<string, any>
  ): number {
    const startTime = this.timers.get(name);
    if (!startTime) {
      this.logger.warn(`Timer ${name} not found`);
      return 0;
    }

    const duration = performance.now() - startTime;
    this.timers.delete(name);

    const threshold = this.thresholds.get(name);
    let severity: PerformanceMetric['severity'] = 'info';

    if (threshold) {
      if (duration > threshold.error) {
        severity = 'error';
      } else if (duration > threshold.warning) {
        severity = 'warning';
      }
    }

    this.record({
      name,
      value: duration,
      unit: 'ms',
      category,
      severity,
      context
    });

    return duration;
  }

  /**
   * Measure function execution time
   */
  measure<T>(
    name: string,
    fn: () => T,
    category: PerformanceMetric['category'] = 'computation'
  ): T {
    this.startTimer(name);
    try {
      const result = fn();
      this.endTimer(name, category);
      return result;
    } catch (error) {
      this.endTimer(name, category, { error: true });
      throw error;
    }
  }

  /**
   * Measure async function execution time
   */
  async measureAsync<T>(
    name: string,
    fn: () => Promise<T>,
    category: PerformanceMetric['category'] = 'computation'
  ): Promise<T> {
    this.startTimer(name);
    try {
      const result = await fn();
      this.endTimer(name, category);
      return result;
    } catch (error) {
      this.endTimer(name, category, { error: true });
      throw error;
    }
  }

  /**
   * Increment a counter
   */
  increment(name: string, value: number = 1): void {
    const current = this.counters.get(name) || 0;
    this.counters.set(name, current + value);

    this.record({
      name,
      value: current + value,
      unit: 'count',
      category: 'system',
      severity: 'info'
    });
  }

  /**
   * Record memory usage
   */
  recordMemoryUsage(): void {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      
      this.record({
        name: 'memory.used',
        value: memory.usedJSHeapSize,
        unit: 'bytes',
        category: 'memory',
        severity: memory.usedJSHeapSize > 50 * 1024 * 1024 ? 'warning' : 'info' // 50MB warning
      });

      this.record({
        name: 'memory.total',
        value: memory.totalJSHeapSize,
        unit: 'bytes',
        category: 'memory',
        severity: 'info'
      });

      this.record({
        name: 'memory.limit',
        value: memory.jsHeapSizeLimit,
        unit: 'bytes',
        category: 'memory',
        severity: 'info'
      });
    }
  }

  /**
   * Record React component render time
   */
  recordRender(componentName: string, duration: number, props?: any): void {
    const threshold = this.thresholds.get('component.render') || { warning: 16, error: 50 };
    
    let severity: PerformanceMetric['severity'] = 'info';
    if (duration > threshold.error) {
      severity = 'error';
    } else if (duration > threshold.warning) {
      severity = 'warning';
    }

    this.record({
      name: 'component.render',
      value: duration,
      unit: 'ms',
      category: 'render',
      severity,
      context: {
        component: componentName,
        propsCount: props ? Object.keys(props).length : 0
      }
    });
  }

  /**
   * Record network request performance
   */
  recordNetworkRequest(
    url: string,
    method: string,
    status: number,
    duration: number,
    size?: number
  ): void {
    const threshold = this.thresholds.get('network.request') || { warning: 1000, error: 5000 };
    
    let severity: PerformanceMetric['severity'] = 'info';
    if (duration > threshold.error) {
      severity = 'error';
    } else if (duration > threshold.warning) {
      severity = 'warning';
    }

    this.record({
      name: 'network.request',
      value: duration,
      unit: 'ms',
      category: 'network',
      severity,
      context: {
        url,
        method,
        status,
        size
      }
    });

    if (size) {
      this.record({
        name: 'network.size',
        value: size,
        unit: 'bytes',
        category: 'network',
        severity: 'info',
        context: { url, method }
      });
    }
  }

  /**
   * Set performance budgets
   */
  setBudget(budget: PerformanceBudget): void {
    const existingIndex = this.budgets.findIndex(b => b.metric === budget.metric);
    if (existingIndex >= 0) {
      this.budgets[existingIndex] = budget;
    } else {
      this.budgets.push(budget);
    }
  }

  /**
   * Set performance thresholds
   */
  setThreshold(name: string, warning: number, error: number): void {
    this.thresholds.set(name, { warning, error });
  }

  /**
   * Generate performance report
   */
  generateReport(): PerformanceReport {
    const warnings = this.metrics.filter(m => m.severity === 'warning');
    const errors = this.metrics.filter(m => m.severity === 'error');
    
    const renderMetrics = this.metrics.filter(m => m.category === 'render');
    const averageRenderTime = renderMetrics.length > 0
      ? renderMetrics.reduce((sum, m) => sum + m.value, 0) / renderMetrics.length
      : 0;

    const memoryMetrics = this.metrics
      .filter(m => m.name === 'memory.used')
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    const currentMemoryUsage = memoryMetrics[0]?.value || 0;

    const violations = this.budgets.filter(budget => {
      const relevantMetrics = this.metrics.filter(m => m.name === budget.metric);
      if (relevantMetrics.length === 0) return false;
      
      const latestMetric = relevantMetrics[relevantMetrics.length - 1];
      return latestMetric.value > budget.error;
    });

    const recommendations = this.generateRecommendations();

    return {
      summary: {
        totalMetrics: this.metrics.length,
        warnings: warnings.length,
        errors: errors.length,
        averageRenderTime,
        memoryUsage: currentMemoryUsage
      },
      metrics: [...this.metrics].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()),
      violations,
      recommendations,
      timestamp: new Date()
    };
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = [];
    this.counters.clear();
    this.timers.clear();
  }

  /**
   * Get metrics by category
   */
  getMetricsByCategory(category: PerformanceMetric['category']): PerformanceMetric[] {
    return this.metrics.filter(m => m.category === category);
  }

  /**
   * Get metrics by name
   */
  getMetricsByName(name: string): PerformanceMetric[] {
    return this.metrics.filter(m => m.name === name);
  }

  // Private methods
  private setupDefaultBudgets(): void {
    const defaultBudgets: PerformanceBudget[] = [
      { metric: 'component.render', warning: 16, error: 50, unit: 'ms' },
      { metric: 'network.request', warning: 1000, error: 5000, unit: 'ms' },
      { metric: 'memory.used', warning: 50 * 1024 * 1024, error: 100 * 1024 * 1024, unit: 'bytes' },
      { metric: 'bundle.size', warning: 500 * 1024, error: 1024 * 1024, unit: 'bytes' }
    ];

    this.budgets = [...defaultBudgets];
  }

  private setupDefaultThresholds(): void {
    this.thresholds.set('component.render', { warning: 16, error: 50 });
    this.thresholds.set('network.request', { warning: 1000, error: 5000 });
    this.thresholds.set('api.call', { warning: 2000, error: 10000 });
    this.thresholds.set('database.query', { warning: 100, error: 500 });
    this.thresholds.set('file.process', { warning: 1000, error: 5000 });
  }

  private initializeObservers(): void {
    if (typeof PerformanceObserver === 'undefined') {
      return;
    }

    try {
      // Long tasks observer
      const longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.record({
            name: 'long.task',
            value: entry.duration,
            unit: 'ms',
            category: 'system',
            severity: entry.duration > 100 ? 'error' : 'warning'
          });
        }
      });
      
      longTaskObserver.observe({ entryTypes: ['longtask'] });
      this.observers.set('longtask', longTaskObserver);

      // Navigation observer
      const navigationObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const navEntry = entry as PerformanceNavigationTiming;
          
          this.record({
            name: 'navigation.load',
            value: navEntry.loadEventEnd - navEntry.loadEventStart,
            unit: 'ms',
            category: 'system',
            severity: 'info'
          });

          this.record({
            name: 'navigation.dom',
            value: navEntry.domContentLoadedEventEnd - navEntry.domContentLoadedEventStart,
            unit: 'ms',
            category: 'system',
            severity: 'info'
          });
        }
      });
      
      navigationObserver.observe({ entryTypes: ['navigation'] });
      this.observers.set('navigation', navigationObserver);

    } catch (error) {
      this.logger.warn('Failed to initialize performance observers', { error });
    }
  }

  private checkBudgets(metric: PerformanceMetric): void {
    const budget = this.budgets.find(b => b.metric === metric.name);
    if (!budget) return;

    if (metric.value > budget.error) {
      const error = errorHandler.system(
        `Performance budget exceeded: ${metric.name}`,
        'PERFORMANCE_BUDGET_EXCEEDED',
        {
          metric: metric.name,
          value: metric.value,
          threshold: budget.error,
          unit: budget.unit
        }
      );
      
      // Don't throw, just log
      this.logger.error('Performance budget exceeded', error.toJSON());
    }
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    
    // Check for slow renders
    const slowRenders = this.metrics
      .filter(m => m.name === 'component.render' && m.value > 50)
      .length;
    
    if (slowRenders > 5) {
      recommendations.push('Consider optimizing React components with slow render times');
    }

    // Check memory usage
    const memoryMetrics = this.metrics.filter(m => m.name === 'memory.used');
    if (memoryMetrics.length > 0) {
      const avgMemory = memoryMetrics.reduce((sum, m) => sum + m.value, 0) / memoryMetrics.length;
      if (avgMemory > 50 * 1024 * 1024) {
        recommendations.push('High memory usage detected. Consider implementing memory optimization strategies');
      }
    }

    // Check network requests
    const slowNetworkRequests = this.metrics
      .filter(m => m.name === 'network.request' && m.value > 2000)
      .length;
    
    if (slowNetworkRequests > 3) {
      recommendations.push('Multiple slow network requests detected. Consider implementing request caching or optimization');
    }

    return recommendations;
  }

  private startAutoReporting(): void {
    setInterval(() => {
      const report = this.generateReport();
      
      if (report.summary.errors > 0 || report.summary.warnings > 10) {
        this.logger.warn('Performance issues detected', {
          errors: report.summary.errors,
          warnings: report.summary.warnings,
          recommendations: report.recommendations
        });
      }

      // Record memory usage periodically
      this.recordMemoryUsage();
      
    }, this.options.reportInterval);
  }
}

// Create singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Utility functions
export function measurePerformance<T>(
  name: string,
  fn: () => T,
  category?: PerformanceMetric['category']
): T {
  return performanceMonitor.measure(name, fn, category);
}

export async function measureAsyncPerformance<T>(
  name: string,
  fn: () => Promise<T>,
  category?: PerformanceMetric['category']
): Promise<T> {
  return performanceMonitor.measureAsync(name, fn, category);
}

// React hooks for performance monitoring
export function usePerformanceMonitor() {
  return {
    record: performanceMonitor.record.bind(performanceMonitor),
    startTimer: performanceMonitor.startTimer.bind(performanceMonitor),
    endTimer: performanceMonitor.endTimer.bind(performanceMonitor),
    measure: performanceMonitor.measure.bind(performanceMonitor),
    measureAsync: performanceMonitor.measureAsync.bind(performanceMonitor),
    generateReport: performanceMonitor.generateReport.bind(performanceMonitor)
  };
}

export function useRenderPerformance(componentName: string) {
  const startTime = React.useRef<number>();
  
  React.useEffect(() => {
    startTime.current = performance.now();
  });

  React.useEffect(() => {
    if (startTime.current) {
      const duration = performance.now() - startTime.current;
      performanceMonitor.recordRender(componentName, duration);
    }
  });
}

export default performanceMonitor;