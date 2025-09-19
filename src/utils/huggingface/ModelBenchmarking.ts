/**
 * Model Benchmarking Utility for HuggingFace Models
 * Provides benchmarking capabilities for model performance evaluation
 */

import { BenchmarkResult, HuggingFaceModel } from '../../types/huggingface';

export interface BenchmarkConfig {
  batchSizes: number[];
  sequenceLengths: number[];
  numSamples: number;
  warmupRuns: number;
  timeout: number;
}

export interface BenchmarkSuite {
  name: string;
  description: string;
  tests: BenchmarkTest[];
}

export interface BenchmarkTest {
  name: string;
  description: string;
  inputData: any[];
  expectedOutput?: any[];
  metrics: string[];
}

const DEFAULT_CONFIG: BenchmarkConfig = {
  batchSizes: [1, 4, 8],
  sequenceLengths: [128, 256, 512],
  numSamples: 100,
  warmupRuns: 10,
  timeout: 300000 // 5 minutes
};

export class ModelBenchmarking {
  private config: BenchmarkConfig;
  private results: Map<string, BenchmarkResult[]> = new Map();

  constructor(config: Partial<BenchmarkConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Run comprehensive benchmark on a model
   */
  async benchmarkModel(
    model: HuggingFaceModel,
    onProgress?: (progress: { current: number; total: number; stage: string }) => void
  ): Promise<BenchmarkResult> {
    const startTime = Date.now();
    const testConfigurations = this.generateTestConfigurations();
    
    let currentTest = 0;
    const totalTests = testConfigurations.length;

    const latencyResults: number[] = [];
    const throughputResults: { tokensPerSecond: number; requestsPerSecond: number }[] = [];
    const memoryUsage: number[] = [];
    const cpuUsage: number[] = [];

    for (const config of testConfigurations) {
      if (onProgress) {
        onProgress({
          current: currentTest + 1,
          total: totalTests,
          stage: `Testing batch=${config.batchSize}, seqLen=${config.sequenceLength}`
        });
      }

      const testResult = await this.runBenchmarkTest(model, config);
      
      latencyResults.push(testResult.latency);
      throughputResults.push(testResult.throughput);
      memoryUsage.push(testResult.memoryUsage);
      cpuUsage.push(testResult.cpuUsage);

      currentTest++;
    }

    const result: BenchmarkResult = {
      modelId: model.id,
      timestamp: new Date(),
      metrics: {
        latency: {
          mean: this.calculateMean(latencyResults),
          p50: this.calculatePercentile(latencyResults, 50),
          p90: this.calculatePercentile(latencyResults, 90),
          p99: this.calculatePercentile(latencyResults, 99)
        },
        throughput: {
          tokensPerSecond: this.calculateMean(throughputResults.map(t => t.tokensPerSecond)),
          requestsPerSecond: this.calculateMean(throughputResults.map(t => t.requestsPerSecond))
        },
        accuracy: {
          score: await this.calculateAccuracyScore(model),
          dataset: 'synthetic',
          metric: 'f1'
        },
        resources: {
          memoryUsage: this.calculateMean(memoryUsage),
          cpuUsage: this.calculateMean(cpuUsage),
          gpuUsage: 0 // Would be implemented for GPU benchmarks
        }
      },
      testConfiguration: {
        batchSize: this.config.batchSizes[0],
        sequenceLength: this.config.sequenceLengths[0],
        numSamples: this.config.numSamples,
        hardware: this.getHardwareInfo()
      }
    };

    // Store result
    const modelResults = this.results.get(model.id) || [];
    modelResults.push(result);
    this.results.set(model.id, modelResults);

    return result;
  }

  /**
   * Compare multiple models
   */
  async compareModels(
    models: HuggingFaceModel[],
    onProgress?: (modelIndex: number, total: number, modelId: string) => void
  ): Promise<{
    results: BenchmarkResult[];
    comparison: {
      fastest: string;
      mostAccurate: string;
      mostEfficient: string;
      recommended: string;
    };
  }> {
    const results: BenchmarkResult[] = [];

    for (let i = 0; i < models.length; i++) {
      if (onProgress) {
        onProgress(i + 1, models.length, models[i].id);
      }

      const result = await this.benchmarkModel(models[i]);
      results.push(result);
    }

    const comparison = this.generateComparison(results);

    return { results, comparison };
  }

  /**
   * Get benchmark results for a model
   */
  getResults(modelId: string): BenchmarkResult[] {
    return this.results.get(modelId) || [];
  }

  /**
   * Get all benchmark results
   */
  getAllResults(): Map<string, BenchmarkResult[]> {
    return new Map(this.results);
  }

  /**
   * Run performance regression test
   */
  async runRegressionTest(
    model: HuggingFaceModel,
    baseline: BenchmarkResult
  ): Promise<{
    passed: boolean;
    regressions: string[];
    improvements: string[];
    summary: string;
  }> {
    const current = await this.benchmarkModel(model);
    const regressions: string[] = [];
    const improvements: string[] = [];

    // Check latency regression (>10% slower)
    if (current.metrics.latency.mean > baseline.metrics.latency.mean * 1.1) {
      regressions.push(`Latency regression: ${current.metrics.latency.mean.toFixed(2)}ms vs ${baseline.metrics.latency.mean.toFixed(2)}ms`);
    } else if (current.metrics.latency.mean < baseline.metrics.latency.mean * 0.9) {
      improvements.push(`Latency improvement: ${baseline.metrics.latency.mean.toFixed(2)}ms vs ${current.metrics.latency.mean.toFixed(2)}ms`);
    }

    // Check throughput regression (>10% slower)
    if (current.metrics.throughput.tokensPerSecond < baseline.metrics.throughput.tokensPerSecond * 0.9) {
      regressions.push(`Throughput regression: ${current.metrics.throughput.tokensPerSecond.toFixed(2)} vs ${baseline.metrics.throughput.tokensPerSecond.toFixed(2)} tokens/sec`);
    } else if (current.metrics.throughput.tokensPerSecond > baseline.metrics.throughput.tokensPerSecond * 1.1) {
      improvements.push(`Throughput improvement: ${current.metrics.throughput.tokensPerSecond.toFixed(2)} vs ${baseline.metrics.throughput.tokensPerSecond.toFixed(2)} tokens/sec`);
    }

    // Check accuracy regression (>5% worse)
    if (current.metrics.accuracy.score < baseline.metrics.accuracy.score * 0.95) {
      regressions.push(`Accuracy regression: ${current.metrics.accuracy.score.toFixed(3)} vs ${baseline.metrics.accuracy.score.toFixed(3)}`);
    } else if (current.metrics.accuracy.score > baseline.metrics.accuracy.score * 1.05) {
      improvements.push(`Accuracy improvement: ${current.metrics.accuracy.score.toFixed(3)} vs ${baseline.metrics.accuracy.score.toFixed(3)}`);
    }

    const passed = regressions.length === 0;
    const summary = passed 
      ? `✅ No regressions detected. ${improvements.length} improvements found.`
      : `❌ ${regressions.length} regressions detected. ${improvements.length} improvements found.`;

    return {
      passed,
      regressions,
      improvements,
      summary
    };
  }

  /**
   * Export benchmark results
   */
  exportResults(): string {
    const exportData = {
      results: Object.fromEntries(this.results),
      config: this.config,
      exported: new Date(),
      version: '1.0.0'
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Import benchmark results
   */
  importResults(data: string): void {
    try {
      const parsed = JSON.parse(data);
      
      if (parsed.results) {
        this.results = new Map(
          Object.entries(parsed.results).map(([modelId, results]: [string, any]) => [
            modelId,
            results.map((r: any) => ({
              ...r,
              timestamp: new Date(r.timestamp)
            }))
          ])
        );
      }

      if (parsed.config) {
        this.config = { ...this.config, ...parsed.config };
      }
    } catch (error) {
      throw new Error('Failed to import benchmark results: ' + error);
    }
  }

  // Private methods

  private generateTestConfigurations(): Array<{
    batchSize: number;
    sequenceLength: number;
  }> {
    const configurations = [];
    
    for (const batchSize of this.config.batchSizes) {
      for (const sequenceLength of this.config.sequenceLengths) {
        configurations.push({ batchSize, sequenceLength });
      }
    }
    
    return configurations;
  }

  private async runBenchmarkTest(
    model: HuggingFaceModel,
    config: { batchSize: number; sequenceLength: number }
  ): Promise<{
    latency: number;
    throughput: { tokensPerSecond: number; requestsPerSecond: number };
    memoryUsage: number;
    cpuUsage: number;
  }> {
    // Simulate benchmark test
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));

    const baseLatency = 50 + Math.random() * 100;
    const batchFactor = Math.log(config.batchSize + 1);
    const seqFactor = Math.log(config.sequenceLength / 128 + 1);

    return {
      latency: baseLatency * batchFactor * seqFactor,
      throughput: {
        tokensPerSecond: Math.max(1, 100 - baseLatency + Math.random() * 50),
        requestsPerSecond: Math.max(0.1, 10 / batchFactor + Math.random() * 5)
      },
      memoryUsage: config.batchSize * config.sequenceLength * 4 + Math.random() * 1000000, // bytes
      cpuUsage: Math.min(100, 30 + batchFactor * 20 + Math.random() * 30)
    };
  }

  private async calculateAccuracyScore(model: HuggingFaceModel): Promise<number> {
    // Simulate accuracy calculation based on model characteristics
    const downloadScore = Math.min(model.downloads / 10000, 1);
    const likeScore = Math.min(model.likes / 100, 1);
    const baseAccuracy = 0.6 + downloadScore * 0.2 + likeScore * 0.15;
    
    return Math.min(0.95, baseAccuracy + Math.random() * 0.1);
  }

  private calculateMean(values: number[]): number {
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  private calculatePercentile(values: number[], percentile: number): number {
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  private generateComparison(results: BenchmarkResult[]): {
    fastest: string;
    mostAccurate: string;
    mostEfficient: string;
    recommended: string;
  } {
    let fastest = results[0];
    let mostAccurate = results[0];
    let mostEfficient = results[0];

    for (const result of results) {
      if (result.metrics.latency.mean < fastest.metrics.latency.mean) {
        fastest = result;
      }
      if (result.metrics.accuracy.score > mostAccurate.metrics.accuracy.score) {
        mostAccurate = result;
      }
      
      // Efficiency = (accuracy * throughput) / (latency * memory)
      const efficiency = (result.metrics.accuracy.score * result.metrics.throughput.tokensPerSecond) / 
                        (result.metrics.latency.mean * result.metrics.resources.memoryUsage);
      const currentEfficiency = (mostEfficient.metrics.accuracy.score * mostEfficient.metrics.throughput.tokensPerSecond) / 
                               (mostEfficient.metrics.latency.mean * mostEfficient.metrics.resources.memoryUsage);
      
      if (efficiency > currentEfficiency) {
        mostEfficient = result;
      }
    }

    // Recommended is the most efficient unless accuracy is too low
    const recommended = mostEfficient.metrics.accuracy.score > 0.7 ? mostEfficient : mostAccurate;

    return {
      fastest: fastest.modelId,
      mostAccurate: mostAccurate.modelId,
      mostEfficient: mostEfficient.modelId,
      recommended: recommended.modelId
    };
  }

  private getHardwareInfo(): string {
    return `${navigator.platform} - ${navigator.hardwareConcurrency || 4} cores`;
  }
}

export default ModelBenchmarking;
