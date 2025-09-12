import { performanceMonitor, SystemMetrics, ModelInferenceMetrics, OptimizationSuggestion } from './performanceMonitor';

export interface OptimizationRule {
  id: string;
  name: string;
  description: string;
  condition: (metrics: SystemMetrics[], modelMetrics: ModelInferenceMetrics[]) => boolean;
  action: (metrics: SystemMetrics[], modelMetrics: ModelInferenceMetrics[]) => OptimizationSuggestion[];
  priority: number;
  category: 'performance' | 'memory' | 'network' | 'model' | 'ui';
}

export interface OptimizationConfig {
  enableAutoOptimization: boolean;
  optimizationInterval: number;
  rules: OptimizationRule[];
  thresholds: {
    cpuUsage: number;
    memoryUsage: number;
    modelLatency: number;
    renderTime: number;
    networkLatency: number;
  };
}

export class PerformanceOptimizer {
  private config: OptimizationConfig;
  private isOptimizing = false;
  private optimizationTimer?: NodeJS.Timeout;
  private appliedOptimizations: Set<string> = new Set();

  constructor(config?: Partial<OptimizationConfig>) {
    this.config = {
      enableAutoOptimization: false,
      optimizationInterval: 30000, // 30 seconds
      rules: this.getDefaultRules(),
      thresholds: {
        cpuUsage: 80,
        memoryUsage: 85,
        modelLatency: 5000,
        renderTime: 100,
        networkLatency: 1000
      },
      ...config
    };
  }

  private getDefaultRules(): OptimizationRule[] {
    return [
      {
        id: 'high-cpu-usage',
        name: 'High CPU Usage Optimization',
        description: 'Optimize CPU-intensive operations',
        priority: 9,
        category: 'performance',
        condition: (systemMetrics) => {
          const latest = systemMetrics[systemMetrics.length - 1];
          return latest && latest.cpu.usage > this.config.thresholds.cpuUsage;
        },
        action: (systemMetrics) => [{
          id: `cpu-opt-${Date.now()}`,
          category: 'performance',
          title: 'Reduce CPU Load',
          description: 'High CPU usage detected. Consider implementing task queuing, reducing concurrent operations, or optimizing algorithms.',
          impact: 'high',
          effort: 'medium',
          priority: 9,
          actionable: true,
          implementation: 'Implement task queuing and reduce concurrent operations',
          metrics: { cpuUsage: systemMetrics[systemMetrics.length - 1]?.cpu.usage },
          timestamp: Date.now()
        }]
      },
      {
        id: 'memory-pressure',
        name: 'Memory Pressure Relief',
        description: 'Optimize memory usage',
        priority: 8,
        category: 'memory',
        condition: (systemMetrics) => {
          const latest = systemMetrics[systemMetrics.length - 1];
          return latest && latest.memory.percentage > this.config.thresholds.memoryUsage;
        },
        action: (systemMetrics) => [{
          id: `memory-opt-${Date.now()}`,
          category: 'memory',
          title: 'Optimize Memory Usage',
          description: 'High memory usage detected. Consider implementing garbage collection, memory pooling, or reducing memory footprint.',
          impact: 'high',
          effort: 'medium',
          priority: 8,
          actionable: true,
          implementation: 'Implement memory pooling and optimize data structures',
          metrics: { memoryUsage: systemMetrics[systemMetrics.length - 1]?.memory.percentage },
          timestamp: Date.now()
        }]
      },
      {
        id: 'slow-model-inference',
        name: 'Model Inference Optimization',
        description: 'Optimize slow model inference',
        priority: 7,
        category: 'model',
        condition: (_, modelMetrics) => {
          const recentMetrics = modelMetrics.slice(-10);
          const avgLatency = recentMetrics.reduce((sum, m) => sum + m.duration, 0) / recentMetrics.length;
          return avgLatency > this.config.thresholds.modelLatency;
        },
        action: (_, modelMetrics) => {
          const recentMetrics = modelMetrics.slice(-10);
          const avgLatency = recentMetrics.reduce((sum, m) => sum + m.duration, 0) / recentMetrics.length;
          
          return [{
            id: `model-opt-${Date.now()}`,
            category: 'model',
            title: 'Optimize Model Inference',
            description: 'Model inference is slow. Consider using smaller models, implementing caching, or optimizing prompts.',
            impact: 'high',
            effort: 'high',
            priority: 7,
            actionable: true,
            implementation: 'Implement response caching and consider using faster model variants',
            metrics: { averageLatency: avgLatency },
            timestamp: Date.now()
          }];
        }
      },
      {
        id: 'memory-leak-detection',
        name: 'Memory Leak Detection',
        description: 'Detect potential memory leaks',
        priority: 8,
        category: 'memory',
        condition: (systemMetrics) => {
          if (systemMetrics.length < 10) return false;
          
          const recent = systemMetrics.slice(-10);
          const memoryTrend = recent.map(m => m.memory.percentage);
          
          // Check if memory usage is consistently increasing
          let increasing = 0;
          for (let i = 1; i < memoryTrend.length; i++) {
            if (memoryTrend[i] > memoryTrend[i - 1]) increasing++;
          }
          
          return increasing > 7; // 70% of samples showing increase
        },
        action: (systemMetrics) => [{
          id: `memory-leak-${Date.now()}`,
          category: 'memory',
          title: 'Potential Memory Leak Detected',
          description: 'Memory usage is consistently increasing. Check for memory leaks in event listeners, intervals, or large object references.',
          impact: 'high',
          effort: 'high',
          priority: 8,
          actionable: true,
          implementation: 'Audit code for memory leaks, implement proper cleanup in useEffect hooks',
          metrics: { memoryTrend: systemMetrics.slice(-5).map(m => m.memory.percentage) },
          timestamp: Date.now()
        }]
      },
      {
        id: 'network-optimization',
        name: 'Network Optimization',
        description: 'Optimize network performance',
        priority: 6,
        category: 'network',
        condition: (systemMetrics) => {
          const latest = systemMetrics[systemMetrics.length - 1];
          return latest && latest.network.latency > this.config.thresholds.networkLatency;
        },
        action: (systemMetrics) => [{
          id: `network-opt-${Date.now()}`,
          category: 'network',
          title: 'Optimize Network Performance',
          description: 'High network latency detected. Consider request batching, caching, or CDN usage.',
          impact: 'medium',
          effort: 'medium',
          priority: 6,
          actionable: true,
          implementation: 'Implement request batching and response caching',
          metrics: { networkLatency: systemMetrics[systemMetrics.length - 1]?.network.latency },
          timestamp: Date.now()
        }]
      },
      {
        id: 'inefficient-rendering',
        name: 'Rendering Optimization',
        description: 'Optimize component rendering',
        priority: 5,
        category: 'ui',
        condition: (systemMetrics) => {
          // This would typically use user interaction metrics
          // For now, we'll use a simple heuristic based on CPU usage
          const latest = systemMetrics[systemMetrics.length - 1];
          return latest && latest.cpu.usage > 60 && latest.memory.percentage > 70;
        },
        action: () => [{
          id: `render-opt-${Date.now()}`,
          category: 'ui',
          title: 'Optimize Component Rendering',
          description: 'High resource usage may indicate inefficient rendering. Consider using React.memo, useMemo, or virtual scrolling.',
          impact: 'medium',
          effort: 'low',
          priority: 5,
          actionable: true,
          implementation: 'Add React.memo to components and optimize re-renders',
          timestamp: Date.now()
        }]
      }
    ];
  }

  startAutoOptimization(): void {
    if (this.isOptimizing) return;
    
    this.isOptimizing = true;
    this.config.enableAutoOptimization = true;
    
    this.optimizationTimer = setInterval(() => {
      this.runOptimizationCycle();
    }, this.config.optimizationInterval);
    
    console.log('Auto-optimization started');
  }

  stopAutoOptimization(): void {
    this.isOptimizing = false;
    this.config.enableAutoOptimization = false;
    
    if (this.optimizationTimer) {
      clearInterval(this.optimizationTimer);
      this.optimizationTimer = undefined;
    }
    
    console.log('Auto-optimization stopped');
  }

  async runOptimizationCycle(): Promise<OptimizationSuggestion[]> {
    const systemMetrics = performanceMonitor.getSystemMetrics(50); // Last 50 metrics
    const modelMetrics = performanceMonitor.getModelMetrics(20);   // Last 20 model calls
    
    const suggestions: OptimizationSuggestion[] = [];
    
    for (const rule of this.config.rules) {
      try {
        if (rule.condition(systemMetrics, modelMetrics)) {
          const ruleSuggestions = rule.action(systemMetrics, modelMetrics);
          suggestions.push(...ruleSuggestions);
        }
      } catch (error) {
        console.error(`Error applying optimization rule ${rule.id}:`, error);
      }
    }
    
    // Remove duplicate suggestions
    const uniqueSuggestions = suggestions.filter((suggestion, index, arr) => 
      arr.findIndex(s => s.title === suggestion.title && s.category === suggestion.category) === index
    );
    
    // Apply auto-optimizations if enabled
    if (this.config.enableAutoOptimization) {
      await this.applyAutoOptimizations(uniqueSuggestions);
    }
    
    return uniqueSuggestions;
  }

  private async applyAutoOptimizations(suggestions: OptimizationSuggestion[]): Promise<void> {
    const autoApplicable = suggestions.filter(s => 
      s.actionable && 
      s.effort === 'low' && 
      !this.appliedOptimizations.has(s.id)
    );
    
    for (const suggestion of autoApplicable) {
      try {
        await this.applySuggestion(suggestion);
        this.appliedOptimizations.add(suggestion.id);
        console.log(`Auto-applied optimization: ${suggestion.title}`);
      } catch (error) {
        console.error(`Failed to auto-apply optimization ${suggestion.id}:`, error);
      }
    }
  }

  async applySuggestion(suggestion: OptimizationSuggestion): Promise<boolean> {
    try {
      switch (suggestion.category) {
        case 'performance':
          return await this.applyPerformanceOptimization(suggestion);
        case 'memory':
          return await this.applyMemoryOptimization(suggestion);
        case 'network':
          return await this.applyNetworkOptimization(suggestion);
        case 'model':
          return await this.applyModelOptimization(suggestion);
        case 'ui':
          return await this.applyUIOptimization(suggestion);
        default:
          console.warn(`Unknown optimization category: ${suggestion.category}`);
          return false;
      }
    } catch (error) {
      console.error(`Failed to apply suggestion ${suggestion.id}:`, error);
      return false;
    }
  }

  private async applyPerformanceOptimization(suggestion: OptimizationSuggestion): Promise<boolean> {
    // Implementation would depend on specific optimization
    // For now, we'll just update thresholds or configurations
    
    if (suggestion.title.includes('CPU')) {
      // Could adjust CPU-intensive operation throttling
      performanceMonitor.updateThresholds({
        cpu: Math.max(this.config.thresholds.cpuUsage - 5, 50)
      });
      return true;
    }
    
    return false;
  }

  private async applyMemoryOptimization(suggestion: OptimizationSuggestion): Promise<boolean> {
    if (suggestion.title.includes('Memory')) {
      // Could trigger garbage collection or adjust memory limits
      if (typeof window !== 'undefined' && (window as any).gc) {
        (window as any).gc();
      }
      return true;
    }
    
    return false;
  }

  private async applyNetworkOptimization(suggestion: OptimizationSuggestion): Promise<boolean> {
    // Network optimizations would typically involve configuration changes
    // This could adjust caching headers, request batching, etc.
    return false;
  }

  private async applyModelOptimization(suggestion: OptimizationSuggestion): Promise<boolean> {
    // Model optimizations might involve switching to faster models
    // or adjusting inference parameters
    return false;
  }

  private async applyUIOptimization(suggestion: OptimizationSuggestion): Promise<boolean> {
    // UI optimizations would typically require code changes
    // This could adjust rendering thresholds or enable optimizations
    return false;
  }

  // Configuration methods
  updateConfig(newConfig: Partial<OptimizationConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  addRule(rule: OptimizationRule): void {
    this.config.rules.push(rule);
    this.config.rules.sort((a, b) => b.priority - a.priority);
  }

  removeRule(ruleId: string): void {
    this.config.rules = this.config.rules.filter(rule => rule.id !== ruleId);
  }

  updateRule(ruleId: string, updates: Partial<OptimizationRule>): void {
    const index = this.config.rules.findIndex(rule => rule.id === ruleId);
    if (index !== -1) {
      this.config.rules[index] = { ...this.config.rules[index], ...updates };
    }
  }

  // Analytics methods
  getOptimizationStats() {
    return {
      totalRules: this.config.rules.length,
      appliedOptimizations: this.appliedOptimizations.size,
      isAutoOptimizing: this.isOptimizing,
      optimizationInterval: this.config.optimizationInterval,
      thresholds: this.config.thresholds,
      rulesByCategory: this.config.rules.reduce((acc, rule) => {
        acc[rule.category] = (acc[rule.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };
  }

  getAppliedOptimizations(): string[] {
    return Array.from(this.appliedOptimizations);
  }

  resetAppliedOptimizations(): void {
    this.appliedOptimizations.clear();
  }

  // Testing and validation
  async validateOptimization(suggestion: OptimizationSuggestion): Promise<{
    applicable: boolean;
    estimatedImpact: number;
    risks: string[];
  }> {
    const risks: string[] = [];
    let applicable = true;
    let estimatedImpact = 0;

    // Validate based on current system state
    const systemMetrics = performanceMonitor.getSystemMetrics(5);
    const latest = systemMetrics[systemMetrics.length - 1];

    if (suggestion.category === 'memory' && (!latest || latest.memory.percentage < 50)) {
      applicable = false;
      risks.push('Memory usage is already low');
    }

    if (suggestion.effort === 'high' && suggestion.impact === 'low') {
      risks.push('High effort for low impact optimization');
    }

    // Estimate impact based on metrics
    switch (suggestion.category) {
      case 'performance':
        estimatedImpact = latest ? Math.min(latest.cpu.usage * 0.2, 20) : 10;
        break;
      case 'memory':
        estimatedImpact = latest ? Math.min(latest.memory.percentage * 0.15, 15) : 8;
        break;
      case 'network':
        estimatedImpact = latest ? Math.min(latest.network.latency * 0.1, 100) : 50;
        break;
      default:
        estimatedImpact = 5;
    }

    return {
      applicable,
      estimatedImpact,
      risks
    };
  }
}

export const performanceOptimizer = new PerformanceOptimizer();