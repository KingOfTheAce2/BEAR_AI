// Optimization Recommendation Engine
import { OptimizationRecommendation, SystemMetrics, ModelPerformanceMetrics, PerformanceAlert } from '../../types/monitoring';

interface PerformancePattern {
  type: string;
  description: string;
  threshold: number;
  recommendation: Omit<OptimizationRecommendation, 'id' | 'timestamp'>;
}

export class OptimizationRecommendationEngine {
  private recommendations: OptimizationRecommendation[] = [];
  private patterns: PerformancePattern[] = [];
  private systemMetricsHistory: SystemMetrics[] = [];
  private modelMetricsHistory: ModelPerformanceMetrics[] = [];
  private maxHistorySize = 1000;

  constructor(private onRecommendation?: (recommendation: OptimizationRecommendation) => void) {
    this.initializePatterns();
  }

  private initializePatterns(): void {
    this.patterns = [
      // System Resource Patterns
      {
        type: 'high_cpu_sustained',
        description: 'Sustained high CPU usage over 80% for more than 5 minutes',
        threshold: 80,
        recommendation: {
          category: 'system',
          priority: 'high',
          title: 'Optimize CPU Usage',
          description: 'System is experiencing sustained high CPU usage which may impact performance and user experience.',
          impact: 'Improved responsiveness and reduced system load',
          implementation: [
            'Review running processes and identify CPU-intensive tasks',
            'Consider implementing task queuing or background processing',
            'Optimize algorithms for better CPU efficiency',
            'Add CPU usage monitoring and alerting',
            'Consider increasing CPU resources if consistently high'
          ],
          estimatedImprovement: '15-30% reduction in CPU usage',
          applied: false
        }
      },
      {
        type: 'memory_leak_pattern',
        description: 'Memory usage consistently increasing over time',
        threshold: 0, // Pattern-based, not threshold-based
        recommendation: {
          category: 'memory',
          priority: 'critical',
          title: 'Potential Memory Leak Detected',
          description: 'Memory usage shows a consistent upward trend, indicating a possible memory leak.',
          impact: 'Prevent system crashes and improve stability',
          implementation: [
            'Profile memory usage to identify leak sources',
            'Review code for proper cleanup of event listeners and references',
            'Implement proper disposal patterns for large objects',
            'Add memory monitoring and automatic cleanup',
            'Consider implementing memory usage limits'
          ],
          estimatedImprovement: '20-50% reduction in memory growth',
          applied: false
        }
      },
      {
        type: 'disk_space_critical',
        description: 'Disk usage approaching critical levels',
        threshold: 85,
        recommendation: {
          category: 'disk',
          priority: 'critical',
          title: 'Critical Disk Space Warning',
          description: 'Disk space is critically low and may cause system instability.',
          impact: 'Prevent system failures and data loss',
          implementation: [
            'Clean up temporary files and caches',
            'Archive or delete old log files',
            'Review and optimize data storage patterns',
            'Implement automatic cleanup policies',
            'Consider adding additional storage capacity'
          ],
          estimatedImprovement: '10-30% disk space recovery',
          applied: false
        }
      },

      // Model Performance Patterns
      {
        type: 'model_latency_degradation',
        description: 'Model inference latency increasing over time',
        threshold: 0,
        recommendation: {
          category: 'model',
          priority: 'medium',
          title: 'Model Performance Degradation',
          description: 'Model inference times are increasing, indicating potential performance issues.',
          impact: 'Faster model responses and better user experience',
          implementation: [
            'Analyze model inference pipeline for bottlenecks',
            'Consider model optimization techniques (quantization, pruning)',
            'Review input preprocessing efficiency',
            'Implement model caching for repeated queries',
            'Consider using smaller or more efficient model variants'
          ],
          estimatedImprovement: '20-40% reduction in inference time',
          applied: false
        }
      },
      {
        type: 'model_memory_excessive',
        description: 'Model using excessive memory for operations',
        threshold: 512, // MB
        recommendation: {
          category: 'model',
          priority: 'medium',
          title: 'Optimize Model Memory Usage',
          description: 'Model operations are using excessive memory, which may impact system performance.',
          impact: 'Reduced memory pressure and improved system stability',
          implementation: [
            'Implement model memory optimization techniques',
            'Use gradient checkpointing for training operations',
            'Reduce batch sizes for inference',
            'Consider model quantization to reduce memory footprint',
            'Implement memory-efficient data loading patterns'
          ],
          estimatedImprovement: '25-50% reduction in model memory usage',
          applied: false
        }
      },
      {
        type: 'frequent_model_errors',
        description: 'High error rate in model operations',
        threshold: 5, // % error rate
        recommendation: {
          category: 'model',
          priority: 'high',
          title: 'Address Model Error Rate',
          description: 'Model operations are experiencing a high error rate, indicating reliability issues.',
          impact: 'Improved model reliability and user experience',
          implementation: [
            'Analyze error patterns and root causes',
            'Implement better input validation and sanitization',
            'Add retry mechanisms with exponential backoff',
            'Improve error handling and fallback strategies',
            'Consider model retraining if accuracy has degraded'
          ],
          estimatedImprovement: '50-80% reduction in error rate',
          applied: false
        }
      },

      // Network and I/O Patterns
      {
        type: 'slow_disk_io',
        description: 'Slow disk I/O performance detected',
        threshold: 0,
        recommendation: {
          category: 'disk',
          priority: 'medium',
          title: 'Optimize Disk I/O Performance',
          description: 'Disk I/O operations are slower than expected, impacting overall performance.',
          impact: 'Faster data access and improved responsiveness',
          implementation: [
            'Implement efficient caching strategies',
            'Optimize file access patterns and reduce random I/O',
            'Consider using faster storage solutions (SSD)',
            'Implement data compression to reduce I/O volume',
            'Use asynchronous I/O operations where possible'
          ],
          estimatedImprovement: '30-60% improvement in I/O performance',
          applied: false
        }
      },

      // General Performance Patterns
      {
        type: 'resource_imbalance',
        description: 'Imbalanced resource utilization',
        threshold: 0,
        recommendation: {
          category: 'system',
          priority: 'low',
          title: 'Balance Resource Utilization',
          description: 'System resources are not being utilized efficiently, with some components overloaded while others are underutilized.',
          impact: 'Better resource utilization and overall performance',
          implementation: [
            'Analyze workload distribution across system components',
            'Implement load balancing strategies',
            'Consider task scheduling optimizations',
            'Review and optimize parallel processing strategies',
            'Monitor and adjust resource allocation dynamically'
          ],
          estimatedImprovement: '10-25% overall performance improvement',
          applied: false
        }
      }
    ];
  }

  // Analyze system metrics and generate recommendations
  analyzeSystemMetrics(metrics: SystemMetrics[]): OptimizationRecommendation[] {
    this.systemMetricsHistory.push(...metrics);
    this.trimHistory();

    const newRecommendations: OptimizationRecommendation[] = [];

    // Analyze for sustained high CPU usage
    const recentCpuMetrics = this.systemMetricsHistory.slice(-60); // Last 60 samples (5 minutes at 5s intervals)
    if (recentCpuMetrics.length >= 60) {
      const avgCpu = recentCpuMetrics.reduce((sum, m) => sum + m.cpu.usage, 0) / recentCpuMetrics.length;
      if (avgCpu > 80) {
        const rec = this.createRecommendation('high_cpu_sustained');
        if (rec) newRecommendations.push(rec);
      }
    }

    // Analyze for memory leak pattern
    if (this.systemMetricsHistory.length >= 100) {
      const memoryTrend = this.detectMemoryTrend();
      if (memoryTrend === 'increasing') {
        const rec = this.createRecommendation('memory_leak_pattern');
        if (rec) newRecommendations.push(rec);
      }
    }

    // Check for critical disk space
    const latestMetrics = metrics[metrics.length - 1];
    if (latestMetrics && latestMetrics.disk.percentage > 85) {
      const rec = this.createRecommendation('disk_space_critical');
      if (rec) newRecommendations.push(rec);
    }

    // Detect resource imbalance
    if (this.systemMetricsHistory.length >= 20) {
      const imbalance = this.detectResourceImbalance();
      if (imbalance) {
        const rec = this.createRecommendation('resource_imbalance');
        if (rec) newRecommendations.push(rec);
      }
    }

    return this.processNewRecommendations(newRecommendations);
  }

  // Analyze model metrics and generate recommendations
  analyzeModelMetrics(metrics: ModelPerformanceMetrics[]): OptimizationRecommendation[] {
    this.modelMetricsHistory.push(...metrics);
    this.trimHistory();

    const newRecommendations: OptimizationRecommendation[] = [];

    // Analyze for latency degradation
    const latencyTrend = this.detectLatencyTrend();
    if (latencyTrend === 'increasing') {
      const rec = this.createRecommendation('model_latency_degradation');
      if (rec) newRecommendations.push(rec);
    }

    // Check for excessive memory usage
    const recentModelMetrics = metrics.slice(-10);
    const avgMemoryMB = recentModelMetrics.reduce((sum, m) => sum + m.metrics.memoryUsage, 0) / recentModelMetrics.length / (1024 * 1024);
    if (avgMemoryMB > 512) {
      const rec = this.createRecommendation('model_memory_excessive');
      if (rec) newRecommendations.push(rec);
    }

    // Check for high error rate
    const errorMetrics = recentModelMetrics.filter(m => m.metrics.errorRate && m.metrics.errorRate > 0);
    if (errorMetrics.length > 0) {
      const avgErrorRate = errorMetrics.reduce((sum, m) => sum + (m.metrics.errorRate || 0), 0) / errorMetrics.length;
      if (avgErrorRate > 5) {
        const rec = this.createRecommendation('frequent_model_errors');
        if (rec) newRecommendations.push(rec);
      }
    }

    return this.processNewRecommendations(newRecommendations);
  }

  // Analyze alerts and generate reactive recommendations
  analyzeAlerts(alerts: PerformanceAlert[]): OptimizationRecommendation[] {
    const newRecommendations: OptimizationRecommendation[] = [];

    // Group alerts by category and analyze patterns
    const alertsByCategory = alerts.reduce((acc, alert) => {
      if (!acc[alert.category]) acc[alert.category] = [];
      acc[alert.category].push(alert);
      return acc;
    }, {} as Record<string, PerformanceAlert[]>);

    Object.entries(alertsByCategory).forEach(([category, categoryAlerts]) => {
      if (categoryAlerts.length >= 3) { // Multiple alerts in same category
        const rec = this.createCategorySpecificRecommendation(category, categoryAlerts);
        if (rec) newRecommendations.push(rec);
      }
    });

    return this.processNewRecommendations(newRecommendations);
  }

  // Generate proactive recommendations based on historical data
  generateProactiveRecommendations(): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = [];

    // Analyze historical patterns for proactive suggestions
    if (this.systemMetricsHistory.length >= 200) {
      // Weekly performance analysis
      const weeklyPatterns = this.analyzeWeeklyPatterns();
      recommendations.push(...weeklyPatterns);
    }

    if (this.modelMetricsHistory.length >= 100) {
      // Model usage optimization
      const modelOptimizations = this.analyzeModelUsagePatterns();
      recommendations.push(...modelOptimizations);
    }

    return this.processNewRecommendations(recommendations);
  }

  private createRecommendation(patternType: string): OptimizationRecommendation | null {
    const pattern = this.patterns.find(p => p.type === patternType);
    if (!pattern) return null;

    // Check if we already have a recent recommendation of this type
    const recentRec = this.recommendations.find(r => 
      r.title === pattern.recommendation.title && 
      !r.applied &&
      Date.now() - r.timestamp < 24 * 60 * 60 * 1000 // 24 hours
    );

    if (recentRec) return null;

    return {
      ...pattern.recommendation,
      id: `rec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now()
    };
  }

  private createCategorySpecificRecommendation(category: string, alerts: PerformanceAlert[]): OptimizationRecommendation | null {
    const alertTypes = alerts.map(a => a.type);
    const hasCritical = alertTypes.includes('critical');
    const hasError = alertTypes.includes('error');

    return {
      id: `rec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      category: category as any,
      priority: hasCritical ? 'critical' : hasError ? 'high' : 'medium',
      title: `Address ${category.charAt(0).toUpperCase() + category.slice(1)} Issues`,
      description: `Multiple ${category} alerts detected, indicating systemic issues that need attention.`,
      impact: 'Improved system stability and performance',
      implementation: [
        `Review ${category} monitoring logs for patterns`,
        `Implement immediate fixes for critical issues`,
        `Set up proactive monitoring for ${category} metrics`,
        'Consider scaling resources if needed',
        'Establish maintenance procedures to prevent future issues'
      ],
      estimatedImprovement: '20-40% reduction in related issues',
      applied: false
    };
  }

  private detectMemoryTrend(): 'increasing' | 'decreasing' | 'stable' {
    if (this.systemMetricsHistory.length < 50) return 'stable';

    const recent = this.systemMetricsHistory.slice(-50);
    const first25 = recent.slice(0, 25);
    const last25 = recent.slice(25);

    const avgFirst = first25.reduce((sum, m) => sum + m.memory.percentage, 0) / first25.length;
    const avgLast = last25.reduce((sum, m) => sum + m.memory.percentage, 0) / last25.length;

    const change = avgLast - avgFirst;
    if (change > 5) return 'increasing';
    if (change < -5) return 'decreasing';
    return 'stable';
  }

  private detectLatencyTrend(): 'increasing' | 'decreasing' | 'stable' {
    if (this.modelMetricsHistory.length < 20) return 'stable';

    const recent = this.modelMetricsHistory.slice(-20);
    const first10 = recent.slice(0, 10);
    const last10 = recent.slice(10);

    const avgFirst = first10.reduce((sum, m) => sum + m.metrics.latency, 0) / first10.length;
    const avgLast = last10.reduce((sum, m) => sum + m.metrics.latency, 0) / last10.length;

    const change = (avgLast - avgFirst) / avgFirst;
    if (change > 0.2) return 'increasing'; // 20% increase
    if (change < -0.2) return 'decreasing';
    return 'stable';
  }

  private detectResourceImbalance(): boolean {
    if (this.systemMetricsHistory.length < 10) return false;

    const recent = this.systemMetricsHistory.slice(-10);
    const avgCpu = recent.reduce((sum, m) => sum + m.cpu.usage, 0) / recent.length;
    const avgMemory = recent.reduce((sum, m) => sum + m.memory.percentage, 0) / recent.length;
    const avgDisk = recent.reduce((sum, m) => sum + m.disk.percentage, 0) / recent.length;

    // Check for significant imbalance (one resource >70% while others <30%)
    const high = Math.max(avgCpu, avgMemory, avgDisk);
    const low = Math.min(avgCpu, avgMemory, avgDisk);

    return high > 70 && low < 30;
  }

  private analyzeWeeklyPatterns(): OptimizationRecommendation[] {
    // Implement weekly pattern analysis
    // This would analyze day-of-week and time-of-day patterns
    return [];
  }

  private analyzeModelUsagePatterns(): OptimizationRecommendation[] {
    // Implement model usage pattern analysis
    // This would look at model frequency, efficiency, etc.
    return [];
  }

  private processNewRecommendations(newRecommendations: OptimizationRecommendation[]): OptimizationRecommendation[] {
    newRecommendations.forEach(rec => {
      this.recommendations.push(rec);
      this.onRecommendation?.(rec);
    });

    return newRecommendations;
  }

  private trimHistory(): void {
    if (this.systemMetricsHistory.length > this.maxHistorySize) {
      this.systemMetricsHistory = this.systemMetricsHistory.slice(-this.maxHistorySize);
    }
    if (this.modelMetricsHistory.length > this.maxHistorySize) {
      this.modelMetricsHistory = this.modelMetricsHistory.slice(-this.maxHistorySize);
    }
  }

  // Public API methods
  getAllRecommendations(): OptimizationRecommendation[] {
    return [...this.recommendations].sort((a, b) => b.timestamp - a.timestamp);
  }

  getActiveRecommendations(): OptimizationRecommendation[] {
    return this.recommendations.filter(r => !r.applied);
  }

  getRecommendationsByCategory(category: string): OptimizationRecommendation[] {
    return this.recommendations.filter(r => r.category === category);
  }

  getRecommendationsByPriority(priority: string): OptimizationRecommendation[] {
    return this.recommendations.filter(r => r.priority === priority);
  }

  markRecommendationApplied(id: string): boolean {
    const rec = this.recommendations.find(r => r.id === id);
    if (rec) {
      rec.applied = true;
      rec.appliedAt = Date.now();
      return true;
    }
    return false;
  }

  clearOldRecommendations(daysOld = 7): void {
    const cutoff = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
    this.recommendations = this.recommendations.filter(r => 
      r.timestamp > cutoff || !r.applied
    );
  }

  getRecommendationStats(): {
    total: number;
    applied: number;
    pending: number;
    byCategory: Record<string, number>;
    byPriority: Record<string, number>;
  } {
    const applied = this.recommendations.filter(r => r.applied).length;
    const pending = this.recommendations.filter(r => !r.applied).length;
    
    const byCategory: Record<string, number> = {};
    const byPriority: Record<string, number> = {};
    
    this.recommendations.forEach(rec => {
      byCategory[rec.category] = (byCategory[rec.category] || 0) + 1;
      byPriority[rec.priority] = (byPriority[rec.priority] || 0) + 1;
    });

    return {
      total: this.recommendations.length,
      applied,
      pending,
      byCategory,
      byPriority
    };
  }
}