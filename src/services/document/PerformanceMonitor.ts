import { PerformanceMetrics, BenchmarkResult } from '../../types/document';

/**
 * Performance Monitoring Service for Document Analysis
 * Tracks system resources, processing times, and optimization opportunities
 */

export interface PerformanceThresholds {
  maxProcessingTime: number; // milliseconds
  maxMemoryUsage: number; // MB
  maxCpuUsage: number; // percentage
  maxErrorRate: number; // percentage
  minThroughput: number; // documents per minute
}

export interface OptimizationSuggestion {
  category: 'memory' | 'cpu' | 'io' | 'configuration';
  severity: 'low' | 'medium' | 'high';
  suggestion: string;
  impact: string;
  implementation: string;
}

export interface PerformanceAlert {
  id: string;
  type: 'threshold_exceeded' | 'performance_degradation' | 'resource_exhaustion';
  metric: keyof PerformanceMetrics;
  currentValue: number;
  threshold: number;
  timestamp: Date;
  suggestion?: string;
}

export class DocumentPerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private benchmarks: BenchmarkResult[] = [];
  private thresholds: PerformanceThresholds;
  private isMonitoring: boolean = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private alerts: PerformanceAlert[] = [];

  constructor(thresholds?: Partial<PerformanceThresholds>) {
    this.thresholds = {
      maxProcessingTime: 30000, // 30 seconds
      maxMemoryUsage: 1024, // 1GB
      maxCpuUsage: 80, // 80%
      maxErrorRate: 5, // 5%
      minThroughput: 10, // 10 docs/min
      ...thresholds
    };
  }

  /**
   * Start performance monitoring
   */
  startMonitoring(intervalMs: number = 5000): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.monitoringInterval = setInterval(() => {
      this.collectMetrics();
    }, intervalMs);

    console.log('Performance monitoring started');
  }

  /**
   * Stop performance monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isMonitoring = false;
    console.log('Performance monitoring stopped');
  }

  /**
   * Record processing metrics for a document analysis operation
   */
  recordOperation(
    operationId: string,
    startTime: number,
    endTime: number,
    success: boolean,
    documentSize?: number
  ): PerformanceMetrics {
    const processingTime = endTime - startTime;
    const memoryUsage = this.getMemoryUsage();
    const cpuUsage = this.getCpuUsage();

    const metrics: PerformanceMetrics = {
      processingTime,
      memoryUsage,
      cpuUsage,
      diskIO: 0, // Would be measured in real implementation
      throughput: documentSize ? (documentSize / processingTime) * 1000 : 0,
      errorRate: success ? 0 : 100
    };

    this.metrics.push(metrics);
    this.checkThresholds(metrics);

    // Keep only last 1000 metrics to prevent memory leaks
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }

    return metrics;
  }

  /**
   * Run benchmark tests
   */
  async runBenchmarks(): Promise<BenchmarkResult[]> {
    const benchmarks: BenchmarkResult[] = [];

    console.log('Running performance benchmarks...');

    // Benchmark 1: Small document processing
    const smallDocBenchmark = await this.benchmarkDocumentSize('small', 100);
    benchmarks.push(smallDocBenchmark);

    // Benchmark 2: Medium document processing
    const mediumDocBenchmark = await this.benchmarkDocumentSize('medium', 1000);
    benchmarks.push(mediumDocBenchmark);

    // Benchmark 3: Large document processing
    const largeDocBenchmark = await this.benchmarkDocumentSize('large', 10000);
    benchmarks.push(largeDocBenchmark);

    // Benchmark 4: OCR processing
    const ocrBenchmark = await this.benchmarkOCRProcessing();
    benchmarks.push(ocrBenchmark);

    // Benchmark 5: Batch processing
    const batchBenchmark = await this.benchmarkBatchProcessing();
    benchmarks.push(batchBenchmark);

    this.benchmarks.push(...benchmarks);
    console.log('Benchmarks completed');

    return benchmarks;
  }

  /**
   * Benchmark document processing by size
   */
  private async benchmarkDocumentSize(
    size: 'small' | 'medium' | 'large',
    wordCount: number
  ): Promise<BenchmarkResult> {
    const testText = this.generateTestDocument(wordCount);
    const iterations = 10;
    const results: PerformanceMetrics[] = [];

    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now();
      const startMemory = this.getMemoryUsage();

      // Simulate document processing
      await this.simulateDocumentProcessing(testText);

      const endTime = performance.now();
      const endMemory = this.getMemoryUsage();

      results.push({
        processingTime: endTime - startTime,
        memoryUsage: endMemory - startMemory,
        cpuUsage: this.getCpuUsage(),
        diskIO: 0,
        throughput: wordCount / (endTime - startTime),
        errorRate: 0
      });
    }

    const averageMetrics = this.calculateAverageMetrics(results);

    return {
      testName: `Document Processing - ${size}`,
      metrics: averageMetrics,
      timestamp: new Date()
    };
  }

  /**
   * Benchmark OCR processing
   */
  private async benchmarkOCRProcessing(): Promise<BenchmarkResult> {
    const startTime = performance.now();
    const startMemory = this.getMemoryUsage();

    // Simulate OCR processing
    await new Promise(resolve => setTimeout(resolve, 2000));

    const endTime = performance.now();
    const endMemory = this.getMemoryUsage();

    return {
      testName: 'OCR Processing',
      metrics: {
        processingTime: endTime - startTime,
        memoryUsage: endMemory - startMemory,
        cpuUsage: this.getCpuUsage(),
        diskIO: 0,
        throughput: 1 / ((endTime - startTime) / 1000),
        errorRate: 0
      },
      timestamp: new Date()
    };
  }

  /**
   * Benchmark batch processing
   */
  private async benchmarkBatchProcessing(): Promise<BenchmarkResult> {
    const batchSize = 10;
    const startTime = performance.now();
    const startMemory = this.getMemoryUsage();

    // Simulate batch processing
    const promises = Array.from({ length: batchSize }, async (_, i) => {
      await this.simulateDocumentProcessing(`Test document ${i}`);
    });

    await Promise.all(promises);

    const endTime = performance.now();
    const endMemory = this.getMemoryUsage();

    return {
      testName: 'Batch Processing',
      metrics: {
        processingTime: endTime - startTime,
        memoryUsage: endMemory - startMemory,
        cpuUsage: this.getCpuUsage(),
        diskIO: 0,
        throughput: batchSize / ((endTime - startTime) / 60000), // docs per minute
        errorRate: 0
      },
      timestamp: new Date()
    };
  }

  /**
   * Simulate document processing for benchmarks
   */
  private async simulateDocumentProcessing(text: string): Promise<void> {
    // Simulate CPU-intensive text analysis
    const words = text.split(' ');
    const analysis = {
      wordCount: words.length,
      entities: words.filter(word => word.length > 5),
      patterns: words.filter(word => /[A-Z]/.test(word))
    };

    // Simulate some async processing time
    await new Promise(resolve => setTimeout(resolve, Math.random() * 100));

    return;
  }

  /**
   * Generate test document of specified word count
   */
  private generateTestDocument(wordCount: number): string {
    const sampleWords = [
      'legal', 'contract', 'agreement', 'party', 'liability', 'termination',
      'clause', 'provision', 'whereas', 'therefore', 'consideration',
      'breach', 'damages', 'remedy', 'jurisdiction', 'arbitration'
    ];

    const words: string[] = [];
    for (let i = 0; i < wordCount; i++) {
      words.push(sampleWords[i % sampleWords.length]);
    }

    return words.join(' ');
  }

  /**
   * Calculate average metrics from multiple results
   */
  private calculateAverageMetrics(results: PerformanceMetrics[]): PerformanceMetrics {
    const count = results.length;
    return {
      processingTime: results.reduce((sum, r) => sum + r.processingTime, 0) / count,
      memoryUsage: results.reduce((sum, r) => sum + r.memoryUsage, 0) / count,
      cpuUsage: results.reduce((sum, r) => sum + r.cpuUsage, 0) / count,
      diskIO: results.reduce((sum, r) => sum + r.diskIO, 0) / count,
      throughput: results.reduce((sum, r) => sum + r.throughput, 0) / count,
      errorRate: results.reduce((sum, r) => sum + r.errorRate, 0) / count
    };
  }

  /**
   * Collect current system metrics
   */
  private collectMetrics(): void {
    const metrics: PerformanceMetrics = {
      processingTime: 0, // Not applicable for system metrics
      memoryUsage: this.getMemoryUsage(),
      cpuUsage: this.getCpuUsage(),
      diskIO: this.getDiskIO(),
      throughput: this.calculateCurrentThroughput(),
      errorRate: this.calculateCurrentErrorRate()
    };

    this.metrics.push(metrics);
    this.checkThresholds(metrics);
  }

  /**
   * Check if metrics exceed thresholds
   */
  private checkThresholds(metrics: PerformanceMetrics): void {
    const checks = [
      { metric: 'processingTime' as const, value: metrics.processingTime, threshold: this.thresholds.maxProcessingTime },
      { metric: 'memoryUsage' as const, value: metrics.memoryUsage, threshold: this.thresholds.maxMemoryUsage },
      { metric: 'cpuUsage' as const, value: metrics.cpuUsage, threshold: this.thresholds.maxCpuUsage },
      { metric: 'errorRate' as const, value: metrics.errorRate, threshold: this.thresholds.maxErrorRate }
    ];

    for (const check of checks) {
      if (check.value > check.threshold) {
        this.createAlert({
          type: 'threshold_exceeded',
          metric: check.metric,
          currentValue: check.value,
          threshold: check.threshold
        });
      }
    }

    // Check minimum throughput
    if (metrics.throughput > 0 && metrics.throughput < this.thresholds.minThroughput) {
      this.createAlert({
        type: 'performance_degradation',
        metric: 'throughput',
        currentValue: metrics.throughput,
        threshold: this.thresholds.minThroughput
      });
    }
  }

  /**
   * Create performance alert
   */
  private createAlert(alertData: Omit<PerformanceAlert, 'id' | 'timestamp' | 'suggestion'>): void {
    const alert: PerformanceAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      suggestion: this.getSuggestionForAlert(alertData.metric, alertData.currentValue),
      ...alertData
    };

    this.alerts.push(alert);

    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }

    console.warn('Performance Alert:', alert);
  }

  /**
   * Get optimization suggestion for a metric
   */
  private getSuggestionForAlert(metric: keyof PerformanceMetrics, value: number): string {
    switch (metric) {
      case 'processingTime':
        return 'Consider reducing document size, disabling non-essential features, or processing in smaller batches';
      case 'memoryUsage':
        return 'Reduce batch size, enable garbage collection, or increase available memory';
      case 'cpuUsage':
        return 'Reduce parallel processing, optimize algorithms, or upgrade hardware';
      case 'errorRate':
        return 'Check system logs, validate input data, and review error handling';
      case 'throughput':
        return 'Optimize processing pipeline, increase parallel processing, or check for bottlenecks';
      default:
        return 'Monitor system resources and consider optimization';
    }
  }

  /**
   * Get memory usage (simplified implementation)
   */
  private getMemoryUsage(): number {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return Math.round(process.memoryUsage().heapUsed / 1024 / 1024); // MB
    }
    return 0;
  }

  /**
   * Get CPU usage (simplified implementation)
   */
  private getCpuUsage(): number {
    // In a real implementation, this would use system metrics
    // For now, return a mock value based on current load
    return Math.random() * 20 + 10; // 10-30%
  }

  /**
   * Get disk I/O (simplified implementation)
   */
  private getDiskIO(): number {
    // Would use actual disk I/O metrics in production
    return Math.random() * 100; // MB/s
  }

  /**
   * Calculate current throughput
   */
  private calculateCurrentThroughput(): number {
    const recentMetrics = this.metrics.slice(-10);
    if (recentMetrics.length === 0) return 0;

    const totalThroughput = recentMetrics.reduce((sum, m) => sum + m.throughput, 0);
    return totalThroughput / recentMetrics.length;
  }

  /**
   * Calculate current error rate
   */
  private calculateCurrentErrorRate(): number {
    const recentMetrics = this.metrics.slice(-10);
    if (recentMetrics.length === 0) return 0;

    const totalErrorRate = recentMetrics.reduce((sum, m) => sum + m.errorRate, 0);
    return totalErrorRate / recentMetrics.length;
  }

  /**
   * Generate optimization suggestions
   */
  generateOptimizationSuggestions(): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];
    const recentMetrics = this.metrics.slice(-10);

    if (recentMetrics.length === 0) return suggestions;

    const avgMetrics = this.calculateAverageMetrics(recentMetrics);

    // Memory optimization
    if (avgMetrics.memoryUsage > this.thresholds.maxMemoryUsage * 0.8) {
      suggestions.push({
        category: 'memory',
        severity: avgMetrics.memoryUsage > this.thresholds.maxMemoryUsage ? 'high' : 'medium',
        suggestion: 'Optimize memory usage by reducing batch sizes and enabling garbage collection',
        impact: 'Prevent out-of-memory errors and improve stability',
        implementation: 'Reduce maxConcurrentJobs in batch processing settings'
      });
    }

    // CPU optimization
    if (avgMetrics.cpuUsage > this.thresholds.maxCpuUsage * 0.8) {
      suggestions.push({
        category: 'cpu',
        severity: avgMetrics.cpuUsage > this.thresholds.maxCpuUsage ? 'high' : 'medium',
        suggestion: 'Reduce CPU load by limiting parallel processing or optimizing algorithms',
        impact: 'Improve system responsiveness and reduce processing time',
        implementation: 'Decrease parallel processing threads or optimize entity recognition patterns'
      });
    }

    // Throughput optimization
    if (avgMetrics.throughput < this.thresholds.minThroughput) {
      suggestions.push({
        category: 'configuration',
        severity: 'medium',
        suggestion: 'Increase throughput by enabling parallel processing or optimizing document processing pipeline',
        impact: 'Process more documents in less time',
        implementation: 'Enable parallel processing and increase maxConcurrentJobs if system resources allow'
      });
    }

    return suggestions;
  }

  /**
   * Get performance report
   */
  getPerformanceReport(): {
    currentMetrics: PerformanceMetrics | null;
    averageMetrics: PerformanceMetrics | null;
    alerts: PerformanceAlert[];
    suggestions: OptimizationSuggestion[];
    benchmarks: BenchmarkResult[];
  } {
    const recentMetrics = this.metrics.slice(-10);
    const currentMetrics = this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : null;
    const averageMetrics = recentMetrics.length > 0 ? this.calculateAverageMetrics(recentMetrics) : null;

    return {
      currentMetrics,
      averageMetrics,
      alerts: this.alerts.slice(-10), // Last 10 alerts
      suggestions: this.generateOptimizationSuggestions(),
      benchmarks: this.benchmarks.slice(-5) // Last 5 benchmark results
    };
  }

  /**
   * Export performance data
   */
  exportPerformanceData(format: 'json' | 'csv' = 'json'): string {
    const data = {
      metrics: this.metrics,
      alerts: this.alerts,
      benchmarks: this.benchmarks,
      thresholds: this.thresholds,
      exportedAt: new Date()
    };

    if (format === 'csv') {
      // Convert to CSV format
      const headers = ['Timestamp', 'ProcessingTime', 'MemoryUsage', 'CpuUsage', 'DiskIO', 'Throughput', 'ErrorRate'];
      const rows = this.metrics.map(m => [
        new Date().toISOString(), // Timestamp would be stored in real implementation
        m.processingTime,
        m.memoryUsage,
        m.cpuUsage,
        m.diskIO,
        m.throughput,
        m.errorRate
      ]);

      return [headers, ...rows].map(row => row.join(',')).join('\n');
    }

    return JSON.stringify(data, null, 2);
  }

  /**
   * Clear all performance data
   */
  clearData(): void {
    this.metrics = [];
    this.alerts = [];
    this.benchmarks = [];
  }
}

// Export singleton instance
export const documentPerformanceMonitor = new DocumentPerformanceMonitor();