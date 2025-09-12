/**
 * High-Performance Local Batch Processing System - Main Export
 * Provides a unified interface for local AI inference batch processing
 */

export { default as BatchProcessor } from './batchProcessor';
export {
  BatchRequest,
  BatchResponse,
  InferenceOptions,
  RequestPriority,
  BatchProcessorConfig,
  WorkerPool,
  WorkerStats,
  SystemResources,
  BatchMetrics,
  IntelligentBatcher,
  ResourceMonitor,
  PriorityQueue,
  LoadBalancer
} from './batchProcessor';

export { default as LocalInferenceEngine } from './localInferenceEngine';
export {
  InferenceWorkerData,
  ModelInferenceConfig,
  InferenceResult,
  LocalInferenceEngineConfig
} from './localInferenceEngine';

export {
  OptimizedBatchConfig,
  PerformanceConfig,
  MonitoringConfig,
  ResourceLimitConfig,
  SystemCapabilities,
  SystemCapabilityDetector,
  BatchConfigurationOptimizer,
  BatchConfigurationValidator,
  BatchConfigurationFactory
} from './batchProcessorConfig';

// Main factory function for easy initialization
import BatchProcessor from './batchProcessor';
import LocalInferenceEngine from './localInferenceEngine';
import { BatchConfigurationFactory, OptimizedBatchConfig } from './batchProcessorConfig';

/**
 * High-level factory function to create a fully configured batch processing system
 */
export async function createBatchProcessingSystem(
  modelConfigs: any[],
  configType: 'default' | 'throughput' | 'memory' | 'latency' = 'default'
): Promise<{
  processor: BatchProcessor;
  engine: LocalInferenceEngine;
  config: OptimizedBatchConfig;
}> {
  // Generate optimal configuration
  let config: OptimizedBatchConfig;
  switch (configType) {
    case 'throughput':
      config = await BatchConfigurationFactory.createThroughputConfig();
      break;
    case 'memory':
      config = await BatchConfigurationFactory.createMemoryEfficientConfig();
      break;
    case 'latency':
      config = await BatchConfigurationFactory.createLowLatencyConfig();
      break;
    default:
      config = await BatchConfigurationFactory.createDefaultConfig();
  }

  // Create and initialize components
  const processor = new BatchProcessor(config);
  const engine = new LocalInferenceEngine(config.inference);

  // Initialize the inference engine with model configurations
  await engine.initialize(modelConfigs);

  return {
    processor,
    engine,
    config
  };
}

/**
 * Convenience function to create a simple batch processor with default settings
 */
export async function createSimpleBatchProcessor(): Promise<BatchProcessor> {
  const config = await BatchConfigurationFactory.createDefaultConfig();
  return new BatchProcessor(config);
}

/**
 * Convenience function to create a high-throughput batch processor
 */
export async function createHighThroughputProcessor(): Promise<BatchProcessor> {
  const config = await BatchConfigurationFactory.createThroughputConfig();
  return new BatchProcessor(config);
}

/**
 * Convenience function to create a memory-efficient batch processor
 */
export async function createMemoryEfficientProcessor(): Promise<BatchProcessor> {
  const config = await BatchConfigurationFactory.createMemoryEfficientConfig();
  return new BatchProcessor(config);
}

/**
 * Convenience function to create a low-latency batch processor
 */
export async function createLowLatencyProcessor(): Promise<BatchProcessor> {
  const config = await BatchConfigurationFactory.createLowLatencyConfig();
  return new BatchProcessor(config);
}