// Model Performance Tracking Service
import { ModelPerformanceMetrics } from '../../types/monitoring';

export class ModelPerformanceTracker {
  private metrics: ModelPerformanceMetrics[] = [];
  private activeOperations = new Map<string, { startTime: number; startMemory: number }>();
  private maxHistorySize = 5000;

  constructor(private onMetricsUpdate?: (metrics: ModelPerformanceMetrics) => void) {}

  // Start tracking a model operation
  startOperation(
    modelId: string, 
    modelName: string, 
    operation: 'inference' | 'training' | 'loading',
    metadata?: any
  ): string {
    const operationId = `${modelId}-${operation}-${Date.now()}-${Math.random()}`;
    
    this.activeOperations.set(operationId, {
      startTime: performance.now(),
      startMemory: this.getCurrentMemoryUsage()
    });

    return operationId;
  }

  // End tracking and record metrics
  endOperation(
    operationId: string,
    success = true,
    additionalMetrics?: Partial<ModelPerformanceMetrics['metrics']>,
    metadata?: any
  ): ModelPerformanceMetrics | null {
    const operation = this.activeOperations.get(operationId);
    if (!operation) {
      console.warn(`Operation ${operationId} not found`);
      return null;
    }

    const endTime = performance.now();
    const endMemory = this.getCurrentMemoryUsage();
    const latency = endTime - operation.startTime;
    const memoryUsage = Math.max(0, endMemory - operation.startMemory);

    // Extract model info from operation ID
    const parts = operationId.split('-');
    const modelId = parts[0];
    const operationType = parts[1] as 'inference' | 'training' | 'loading';

    const metrics: ModelPerformanceMetrics = {
      timestamp: Date.now(),
      modelId,
      modelName: modelId, // Fallback if not provided
      operation: operationType,
      metrics: {
        latency,
        memoryUsage,
        cpuUsage: 0, // Will be estimated
        errorRate: success ? 0 : 100,
        ...additionalMetrics
      },
      metadata
    };

    // Estimate CPU usage based on operation duration and complexity
    metrics.metrics.cpuUsage = this.estimateCPUUsage(latency, operationType);

    this.addMetrics(metrics);
    this.activeOperations.delete(operationId);
    this.onMetricsUpdate?.(metrics);

    return metrics;
  }

  // Track inference specifically
  async trackInference<T>(
    modelId: string,
    modelName: string,
    inferenceFunction: () => Promise<T>,
    inputTokens?: number,
    metadata?: any
  ): Promise<{ result: T; metrics: ModelPerformanceMetrics }> {
    const operationId = this.startOperation(modelId, modelName, 'inference', metadata);
    const startTime = performance.now();

    try {
      const result = await inferenceFunction();
      const endTime = performance.now();
      
      // Estimate throughput if we have token count
      const throughput = inputTokens ? (inputTokens / ((endTime - startTime) / 1000)) : undefined;

      const metrics = this.endOperation(operationId, true, {
        throughput,
        tokenCount: inputTokens
      }, metadata);

      return { result, metrics: metrics! };
    } catch (error) {
      const metrics = this.endOperation(operationId, false, undefined, metadata);
      throw error;
    }
  }

  // Track model loading
  async trackModelLoading<T>(
    modelId: string,
    modelName: string,
    loadFunction: () => Promise<T>,
    modelSize?: number
  ): Promise<{ result: T; metrics: ModelPerformanceMetrics }> {
    const operationId = this.startOperation(modelId, modelName, 'loading', { modelSize });

    try {
      const result = await loadFunction();
      const metrics = this.endOperation(operationId, true, undefined, { modelSize });
      return { result, metrics: metrics! };
    } catch (error) {
      const metrics = this.endOperation(operationId, false, undefined, { modelSize });
      throw error;
    }
  }

  private getCurrentMemoryUsage(): number {
    if ('memory' in performance) {
      const memInfo = (performance as any).memory;
      return memInfo.usedJSHeapSize || 0;
    }
    return 0;
  }

  private estimateCPUUsage(latency: number, operation: string): number {
    // Simple heuristic based on operation type and duration
    let baseCPU = 0;
    
    switch (operation) {
      case 'inference':
        baseCPU = Math.min(80, latency / 10); // Higher CPU for longer inference
        break;
      case 'training':
        baseCPU = Math.min(95, latency / 5); // Very high CPU for training
        break;
      case 'loading':
        baseCPU = Math.min(60, latency / 20); // Moderate CPU for loading
        break;
    }

    return Math.max(0, baseCPU);
  }

  private addMetrics(metrics: ModelPerformanceMetrics): void {
    this.metrics.push(metrics);
    
    // Keep only recent metrics
    if (this.metrics.length > this.maxHistorySize) {
      this.metrics = this.metrics.slice(-this.maxHistorySize);
    }
  }

  // Get metrics for a specific model
  getModelMetrics(modelId: string, limit = 100): ModelPerformanceMetrics[] {
    return this.metrics
      .filter(m => m.modelId === modelId)
      .slice(-limit);
  }

  // Get metrics by operation type
  getOperationMetrics(operation: 'inference' | 'training' | 'loading', limit = 100): ModelPerformanceMetrics[] {
    return this.metrics
      .filter(m => m.operation === operation)
      .slice(-limit);
  }

  // Get recent metrics
  getRecentMetrics(count = 100): ModelPerformanceMetrics[] {
    return this.metrics.slice(-count);
  }

  // Get metrics in time range
  getMetricsInRange(startTime: number, endTime: number): ModelPerformanceMetrics[] {
    return this.metrics.filter(m => 
      m.timestamp >= startTime && m.timestamp <= endTime
    );
  }

  // Get performance statistics
  getPerformanceStats(modelId?: string, periodMs = 3600000): {
    avgLatency: number;
    avgThroughput: number;
    avgMemoryUsage: number;
    totalOperations: number;
    errorRate: number;
    p95Latency: number;
    p99Latency: number;
  } {
    const cutoff = Date.now() - periodMs;
    let targetMetrics = this.metrics.filter(m => m.timestamp >= cutoff);
    
    if (modelId) {
      targetMetrics = targetMetrics.filter(m => m.modelId === modelId);
    }

    if (targetMetrics.length === 0) {
      return {
        avgLatency: 0,
        avgThroughput: 0,
        avgMemoryUsage: 0,
        totalOperations: 0,
        errorRate: 0,
        p95Latency: 0,
        p99Latency: 0
      };
    }

    const latencies = targetMetrics.map(m => m.metrics.latency).sort((a, b) => a - b);
    const throughputs = targetMetrics.filter(m => m.metrics.throughput).map(m => m.metrics.throughput!);
    const memoryUsages = targetMetrics.map(m => m.metrics.memoryUsage);
    const errors = targetMetrics.filter(m => m.metrics.errorRate && m.metrics.errorRate > 0);

    return {
      avgLatency: latencies.reduce((sum, l) => sum + l, 0) / latencies.length,
      avgThroughput: throughputs.length > 0 ? throughputs.reduce((sum, t) => sum + t, 0) / throughputs.length : 0,
      avgMemoryUsage: memoryUsages.reduce((sum, m) => sum + m, 0) / memoryUsages.length,
      totalOperations: targetMetrics.length,
      errorRate: (errors.length / targetMetrics.length) * 100,
      p95Latency: latencies[Math.floor(latencies.length * 0.95)] || 0,
      p99Latency: latencies[Math.floor(latencies.length * 0.99)] || 0
    };
  }

  // Get active operations count
  getActiveOperationsCount(): number {
    return this.activeOperations.size;
  }

  // Clear history
  clearHistory(): void {
    this.metrics = [];
  }

  // Get all unique model IDs
  getTrackedModels(): string[] {
    const modelIds = new Set(this.metrics.map(m => m.modelId));
    return Array.from(modelIds);
  }
}