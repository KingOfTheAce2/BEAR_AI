/**
 * Offline Performance Monitor
 * Tracks and analyzes model performance in offline/local environments
 */

export interface ModelPerformanceData {
  modelId: string;
  inferences: Array<{
    timestamp: Date;
    duration: number;
    tokens: number;
    cached: boolean;
    memoryUsage: number;
  }>;
  switches: Array<{
    from: string;
    to: string;
    timestamp: Date;
    duration: number;
    success: boolean;
    error?: string;
  }>;
  errors: Array<{
    timestamp: Date;
    error: string;
    context?: any;
  }>;
}

export interface SystemPerformanceData {
  timestamp: Date;
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  networkLatency?: number;
}

export interface PerformanceMetrics {
  averageInferenceTime: number;
  tokensPerSecond: number;
  errorRate: number;
  cacheHitRate: number;
  memoryEfficiency: number;
  uptime: number;
}

export interface PerformanceRecommendation {
  type: 'optimization' | 'warning' | 'info';
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  actionable: boolean;
  implementation?: string;
}

export class OfflinePerformanceMonitor {
  private modelData: Map<string, ModelPerformanceData> = new Map();
  private systemData: SystemPerformanceData[] = [];
  private monitoringInterval: NodeJS.Timeout | null = null;
  private maxDataPoints: number = 1000;
  private isMonitoring: boolean = false;

  constructor(maxDataPoints: number = 1000) {
    this.maxDataPoints = maxDataPoints;
    this.startSystemMonitoring();
  }

  /**
   * Record model inference performance
   */
  recordInference(
    modelId: string,
    duration: number,
    tokens: number,
    metadata: { cached?: boolean; memoryUsage?: number } = {}
  ): void {
    if (!this.modelData.has(modelId)) {
      this.modelData.set(modelId, {
        modelId,
        inferences: [],
        switches: [],
        errors: []
      });
    }

    const data = this.modelData.get(modelId)!;
    data.inferences.push({
      timestamp: new Date(),
      duration,
      tokens,
      cached: metadata.cached || false,
      memoryUsage: metadata.memoryUsage || 0
    });

    // Maintain data size limit
    if (data.inferences.length > this.maxDataPoints) {
      data.inferences = data.inferences.slice(-this.maxDataPoints);
    }
  }

  /**
   * Record model switch performance
   */
  recordModelSwitch(
    fromModel: string,
    toModel: string,
    duration: number,
    metadata: { success?: boolean; error?: string; preload?: boolean; keepPrevious?: boolean } = {}
  ): void {
    if (!this.modelData.has(toModel)) {
      this.modelData.set(toModel, {
        modelId: toModel,
        inferences: [],
        switches: [],
        errors: []
      });
    }

    const data = this.modelData.get(toModel)!;
    const switchEntry: ModelPerformanceData['switches'][number] = {
      from: fromModel,
      to: toModel,
      timestamp: new Date(),
      duration,
      success: metadata.success !== false
    };

    if (metadata.error) {
      switchEntry.error = metadata.error;
    }

    data.switches.push(switchEntry);

    // Maintain data size limit
    if (data.switches.length > this.maxDataPoints) {
      data.switches = data.switches.slice(-this.maxDataPoints);
    }
  }

  /**
   * Record model error
   */
  recordError(modelId: string, error: string, context?: any): void {
    if (!this.modelData.has(modelId)) {
      this.modelData.set(modelId, {
        modelId,
        inferences: [],
        switches: [],
        errors: []
      });
    }

    const data = this.modelData.get(modelId)!;
    data.errors.push({
      timestamp: new Date(),
      error,
      context
    });

    // Maintain data size limit
    if (data.errors.length > this.maxDataPoints) {
      data.errors = data.errors.slice(-this.maxDataPoints);
    }
  }

  /**
   * Get performance metrics for a specific model
   */
  getModelMetrics(modelId: string, timeWindow?: number): PerformanceMetrics | null {
    const data = this.modelData.get(modelId);
    if (!data) return null;

    const cutoff = timeWindow ? new Date(Date.now() - timeWindow) : null;
    
    const recentInferences = cutoff 
      ? data.inferences.filter(i => i.timestamp > cutoff)
      : data.inferences;

    const recentErrors = cutoff
      ? data.errors.filter(e => e.timestamp > cutoff)
      : data.errors;

    if (recentInferences.length === 0) {
      return {
        averageInferenceTime: 0,
        tokensPerSecond: 0,
        errorRate: 0,
        cacheHitRate: 0,
        memoryEfficiency: 0,
        uptime: 0
      };
    }

    const totalDuration = recentInferences.reduce((sum, inf) => sum + inf.duration, 0);
    const totalTokens = recentInferences.reduce((sum, inf) => sum + inf.tokens, 0);
    const cachedInferences = recentInferences.filter(inf => inf.cached).length;
    const totalMemory = recentInferences.reduce((sum, inf) => sum + inf.memoryUsage, 0);

    return {
      averageInferenceTime: totalDuration / recentInferences.length,
      tokensPerSecond: totalTokens / (totalDuration / 1000),
      errorRate: (recentErrors.length / (recentInferences.length + recentErrors.length)) * 100,
      cacheHitRate: (cachedInferences / recentInferences.length) * 100,
      memoryEfficiency: totalMemory > 0 ? (totalTokens / totalMemory) * 1000 : 0,
      uptime: this.calculateUptime(modelId)
    };
  }

  /**
   * Get model summary
   */
  getModelSummary(modelId: string): {
    totalInferences: number;
    totalSwitches: number;
    totalErrors: number;
    metrics: PerformanceMetrics | null;
    lastActivity: Date | null;
  } {
    const data = this.modelData.get(modelId);
    if (!data) {
      return {
        totalInferences: 0,
        totalSwitches: 0,
        totalErrors: 0,
        metrics: null,
        lastActivity: null
      };
    }

    const lastInference = data.inferences[data.inferences.length - 1];
    const lastSwitch = data.switches[data.switches.length - 1];
    const lastError = data.errors[data.errors.length - 1];

    const lastActivity = [lastInference, lastSwitch, lastError]
      .map(item => item?.timestamp)
      .filter(Boolean)
      .sort((a, b) => b!.getTime() - a!.getTime())[0] || null;

    return {
      totalInferences: data.inferences.length,
      totalSwitches: data.switches.length,
      totalErrors: data.errors.length,
      metrics: this.getModelMetrics(modelId),
      lastActivity
    };
  }

  /**
   * Get system performance data
   */
  getSystemPerformance(): {
    current: SystemPerformanceData | null;
    average: Omit<SystemPerformanceData, 'timestamp'> | null;
    trend: 'improving' | 'stable' | 'degrading';
  } {
    if (this.systemData.length === 0) {
      return { current: null, average: null, trend: 'stable' };
    }

    const current = this.systemData[this.systemData.length - 1];
    const recent = this.systemData.slice(-10); // Last 10 data points

    const average = {
      cpuUsage: recent.reduce((sum, d) => sum + d.cpuUsage, 0) / recent.length,
      memoryUsage: recent.reduce((sum, d) => sum + d.memoryUsage, 0) / recent.length,
      diskUsage: recent.reduce((sum, d) => sum + d.diskUsage, 0) / recent.length,
      networkLatency: recent.reduce((sum, d) => sum + (d.networkLatency || 0), 0) / recent.length
    };

    // Simple trend analysis
    const trend = this.analyzeTrend(recent);

    return { current, average, trend };
  }

  /**
   * Get performance recommendations
   */
  getRecommendations(modelId?: string): PerformanceRecommendation[] {
    const recommendations: PerformanceRecommendation[] = [];

    if (modelId) {
      const metrics = this.getModelMetrics(modelId);
      if (metrics) {
        recommendations.push(...this.getModelRecommendations(modelId, metrics));
      }
    } else {
      recommendations.push(...this.getSystemRecommendations());
    }

    return recommendations;
  }

  /**
   * Export performance data
   */
  async exportData(): Promise<string> {
    const exportData = {
      models: Object.fromEntries(this.modelData),
      system: this.systemData,
      exported: new Date()
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Import performance data
   */
  async importData(data: string): Promise<void> {
    try {
      const parsed = JSON.parse(data);
      
      if (parsed.models) {
        this.modelData = new Map(Object.entries(parsed.models));
      }
      
      if (parsed.system) {
        this.systemData = parsed.system.map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp)
        }));
      }
    } catch (error) {
      throw new Error('Failed to import performance data: ' + error);
    }
  }

  /**
   * Clear old data
   */
  cleanup(olderThan: number = 24 * 60 * 60 * 1000): void {
    const cutoff = new Date(Date.now() - olderThan);

    // Clean model data
    for (const data of this.modelData.values()) {
      data.inferences = data.inferences.filter(i => i.timestamp > cutoff);
      data.switches = data.switches.filter(s => s.timestamp > cutoff);
      data.errors = data.errors.filter(e => e.timestamp > cutoff);
    }

    // Clean system data
    this.systemData = this.systemData.filter(d => d.timestamp > cutoff);
  }

  /**
   * Start system monitoring
   */
  private startSystemMonitoring(): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.monitoringInterval = setInterval(() => {
      this.collectSystemMetrics();
    }, 10000); // Collect every 10 seconds
  }

  /**
   * Stop system monitoring
   */
  stopSystemMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isMonitoring = false;
  }

  /**
   * Collect system metrics
   */
  private collectSystemMetrics(): void {
    try {
      const systemData: SystemPerformanceData = {
        timestamp: new Date(),
        cpuUsage: this.getCPUUsage(),
        memoryUsage: this.getMemoryUsage(),
        diskUsage: this.getDiskUsage(),
        networkLatency: this.getNetworkLatency()
      };

      this.systemData.push(systemData);

      // Maintain data size limit
      if (this.systemData.length > this.maxDataPoints) {
        this.systemData = this.systemData.slice(-this.maxDataPoints);
      }
    } catch (error) {
      // Error logging disabled for production
    }
  }

  /**
   * Get CPU usage percentage
   */
  private getCPUUsage(): number {
    // Simulate CPU usage - in real implementation would use system APIs
    return Math.random() * 30 + 20; // 20-50%
  }

  /**
   * Get memory usage percentage
   */
  private getMemoryUsage(): number {
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      const memInfo = (performance as any).memory;
      return (memInfo.usedJSHeapSize / memInfo.jsHeapSizeLimit) * 100;
    }
    
    // Fallback simulation
    return Math.random() * 40 + 30; // 30-70%
  }

  /**
   * Get disk usage percentage
   */
  private getDiskUsage(): number {
    // Simulate disk usage - in real implementation would check storage APIs
    return Math.random() * 20 + 40; // 40-60%
  }

  /**
   * Get network latency
   */
  private getNetworkLatency(): number | undefined {
    if (navigator.onLine) {
      // Simulate network latency
      return Math.random() * 50 + 10; // 10-60ms
    }
    return undefined;
  }

  /**
   * Calculate model uptime
   */
  private calculateUptime(modelId: string): number {
    const data = this.modelData.get(modelId);
    if (!data || data.inferences.length === 0) return 0;

    const firstActivity = data.inferences[0].timestamp;
    const lastActivity = data.inferences[data.inferences.length - 1].timestamp;
    
    return lastActivity.getTime() - firstActivity.getTime();
  }

  /**
   * Analyze performance trend
   */
  private analyzeTrend(data: SystemPerformanceData[]): 'improving' | 'stable' | 'degrading' {
    if (data.length < 5) return 'stable';

    const recent = data.slice(-3);
    const older = data.slice(-6, -3);

    const recentAvg = recent.reduce((sum, d) => sum + d.cpuUsage + d.memoryUsage, 0) / (recent.length * 2);
    const olderAvg = older.reduce((sum, d) => sum + d.cpuUsage + d.memoryUsage, 0) / (older.length * 2);

    const diff = recentAvg - olderAvg;
    
    if (diff < -5) return 'improving';
    if (diff > 5) return 'degrading';
    return 'stable';
  }

  /**
   * Get model-specific recommendations
   */
  private getModelRecommendations(modelId: string, metrics: PerformanceMetrics): PerformanceRecommendation[] {
    const recommendations: PerformanceRecommendation[] = [];

    if (metrics.averageInferenceTime > 5000) {
      recommendations.push({
        type: 'optimization',
        title: 'High Inference Latency',
        description: 'Consider using a smaller model or enabling GPU acceleration',
        impact: 'high',
        actionable: true,
        implementation: 'Switch to quantized model or enable hardware acceleration'
      });
    }

    if (metrics.cacheHitRate < 20) {
      recommendations.push({
        type: 'optimization',
        title: 'Low Cache Hit Rate',
        description: 'Enable or increase cache size for better performance',
        impact: 'medium',
        actionable: true,
        implementation: 'Increase cache size in model configuration'
      });
    }

    if (metrics.errorRate > 5) {
      recommendations.push({
        type: 'warning',
        title: 'High Error Rate',
        description: 'Model is experiencing frequent errors',
        impact: 'high',
        actionable: true,
        implementation: 'Check model compatibility and system resources'
      });
    }

    return recommendations;
  }

  /**
   * Get system-wide recommendations
   */
  private getSystemRecommendations(): PerformanceRecommendation[] {
    const recommendations: PerformanceRecommendation[] = [];
    const systemPerf = this.getSystemPerformance();

    if (systemPerf.average && systemPerf.average.memoryUsage > 80) {
      recommendations.push({
        type: 'warning',
        title: 'High Memory Usage',
        description: 'System memory usage is consistently high',
        impact: 'high',
        actionable: true,
        implementation: 'Unload unused models or increase system RAM'
      });
    }

    if (systemPerf.trend === 'degrading') {
      recommendations.push({
        type: 'warning',
        title: 'Performance Degradation',
        description: 'System performance is trending downward',
        impact: 'medium',
        actionable: true,
        implementation: 'Monitor resource usage and optimize model allocation'
      });
    }

    return recommendations;
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    this.stopSystemMonitoring();
    this.modelData.clear();
    this.systemData = [];
  }
}

export default OfflinePerformanceMonitor;
