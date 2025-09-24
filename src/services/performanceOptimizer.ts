
import { performanceMonitor, OptimizationSuggestion, PerformanceSummary } from './performanceMonitor';

interface OptimizationStats {
  totalRules: number;
  appliedOptimizations: number;
  lastRun: number | null;
  autoOptimizationRuns: number;
  autoOptimizationEnabled: boolean;
}

interface OptimizationRule {
  id: string;
  description: string;
  evaluate: (summary: PerformanceSummary) => OptimizationSuggestion | null;
}

class PerformanceOptimizer {
  private autoOptimizationHandle: ReturnType<typeof setInterval> | null = null;
  private stats: OptimizationStats = {
    totalRules: 0,
    appliedOptimizations: 0,
    lastRun: null,
    autoOptimizationRuns: 0,
    autoOptimizationEnabled: false
  };

  private readonly dynamicSuggestions = new Map<string, OptimizationSuggestion>();
  private readonly appliedSuggestionIds = new Set<string>();

  private readonly rules: OptimizationRule[] = [
    {
      id: 'cpu-utilization',
      description: 'Reduce CPU pressure when sustained CPU usage is high.',
      evaluate: (summary) => {
        if (summary.systemHealth.cpu > 80) {
          return this.buildSuggestion('cpu-utilization', {
            title: 'Throttle CPU intensive tasks',
            description: 'Introduce request throttling or batch processing to reduce CPU spikes and improve responsiveness.',
            category: 'system',
            impact: 'high',
            effort: 'medium',
            priority: 8,
            metrics: {
              estimatedImprovement: Math.min(20, Math.round(summary.systemHealth.cpu - 70)),
              confidenceScore: 0.7,
              timeToImplement: 2
            }
          });
        }
        return null;
      }
    },
    {
      id: 'memory-pressure',
      description: 'Highlight memory optimization opportunities when usage is elevated.',
      evaluate: (summary) => {
        if (summary.systemHealth.memory > 85) {
          return this.buildSuggestion('memory-pressure', {
            title: 'Optimize memory usage',
            description: 'Release unused caches or implement memory pooling to reduce overall memory pressure.',
            category: 'system',
            impact: 'high',
            effort: 'medium',
            priority: 9,
            metrics: {
              estimatedImprovement: 25,
              confidenceScore: 0.65,
              timeToImplement: 3
            }
          });
        }
        return null;
      }
    },
    {
      id: 'latency-investigation',
      description: 'Investigate elevated model latency.',
      evaluate: (summary) => {
        if (summary.modelPerformance.averageLatency > 2500) {
          return this.buildSuggestion('latency-investigation', {
            title: 'Investigate model latency bottlenecks',
            description: 'Profile recent model operations and consider quantization or GPU acceleration for heavy workloads.',
            category: 'model',
            impact: 'medium',
            effort: 'high',
            priority: 7,
            metrics: {
              estimatedImprovement: 18,
              confidenceScore: 0.6,
              timeToImplement: 4
            }
          });
        }
        return null;
      }
    },
    {
      id: 'error-analysis',
      description: 'Recommend error analysis when failure count increases.',
      evaluate: (summary) => {
        if (summary.modelPerformance.errorCount > 0 && summary.modelPerformance.successRate < 95) {
          return this.buildSuggestion('error-analysis', {
            title: 'Analyze recent model errors',
            description: 'Review failing inference requests and enhance retry or fallback logic to improve reliability.',
            category: 'model',
            impact: 'medium',
            effort: 'low',
            priority: 6,
            metrics: {
              estimatedImprovement: 12,
              confidenceScore: 0.55,
              timeToImplement: 1
            }
          });
        }
        return null;
      }
    }
  ];

  constructor() {
    this.stats.totalRules = this.rules.length;
  }

  startAutoOptimization(intervalMs = 60000): void {
    if (this.autoOptimizationHandle) {
      return;
    }

    const interval = Math.max(15000, intervalMs);
    this.autoOptimizationHandle = setInterval(() => {
      this.runOptimizationCycle(true).catch(error => {
        // Error logging disabled for production
      });
    }, interval);

    this.stats.autoOptimizationEnabled = true;
    this.runOptimizationCycle(true).catch(error => {
      // Error logging disabled for production
    });
  }

  stopAutoOptimization(): void {
    if (this.autoOptimizationHandle) {
      clearInterval(this.autoOptimizationHandle);
      this.autoOptimizationHandle = null;
    }
    this.stats.autoOptimizationEnabled = false;
  }

  getOptimizationStats(): OptimizationStats {
    return { ...this.stats };
  }

  async applySuggestion(suggestion: OptimizationSuggestion): Promise<boolean> {
    try {
      const normalizedId = this.normalizeId(suggestion.id);
      if (this.dynamicSuggestions.has(normalizedId)) {
        this.dynamicSuggestions.delete(normalizedId);
      } else {
        performanceMonitor.dismissSuggestion(suggestion.id);
      }

      this.appliedSuggestionIds.add(suggestion.id);
      this.stats.appliedOptimizations += 1;
      return true;
    } catch (error) {
      // Error logging disabled for production
      return false;
    }
  }

  async runOptimizationCycle(triggeredAutomatically = false): Promise<OptimizationSuggestion[]> {
    const summary = performanceMonitor.getPerformanceSummary();
    this.stats.lastRun = Date.now();

    if (triggeredAutomatically) {
      this.stats.autoOptimizationRuns += 1;
    }

    const newlyGenerated: OptimizationSuggestion[] = [];

    for (const rule of this.rules) {
      const suggestion = rule.evaluate(summary);
      const ruleKey = this.normalizeId(rule.id);

      if (suggestion) {
        const existing = this.dynamicSuggestions.get(ruleKey);
        const suggestionWithTimestamp = { ...suggestion, timestamp: Date.now() };
        this.dynamicSuggestions.set(ruleKey, suggestionWithTimestamp);

        if (!existing) {
          newlyGenerated.push(suggestionWithTimestamp);
        }
      } else {
        this.dynamicSuggestions.delete(ruleKey);
      }
    }

    if (newlyGenerated.length > 0) {
      performanceMonitor.emit('optimization-suggestions', newlyGenerated);
    }

    return [
      ...performanceMonitor.getOptimizationSuggestions(),
      ...this.dynamicSuggestions.values()
    ];
  }

  private buildSuggestion(
    ruleId: string,
    params: {
      title: string;
      description: string;
      category: OptimizationSuggestion['category'];
      impact: OptimizationSuggestion['impact'];
      effort: OptimizationSuggestion['effort'];
      priority: number;
      metrics?: OptimizationSuggestion['metrics'];
    }
  ): OptimizationSuggestion {
    return {
      id: this.normalizeId(ruleId),
      title: params.title,
      description: params.description,
      impact: params.impact,
      effort: params.effort,
      priority: params.priority,
      category: params.category,
      implementation: undefined,
      timestamp: Date.now(),
      actionable: true,
      metrics: params.metrics
    };
  }

  private normalizeId(id: string): string {
    return id.startsWith('optimizer-') ? id : `optimizer-${id}`;
  }
}

export const performanceOptimizer = new PerformanceOptimizer();

export type { OptimizationStats };
