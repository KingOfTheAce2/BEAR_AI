/**
 * GPU Acceleration Service - Main Export
 * 
 * Provides browser-based GPU acceleration using WebGL/WebGPU APIs
 * with automatic hardware detection, memory optimization, and CPU fallback.
 */

// Main service
export { GPUAccelerationService } from './gpuAccelerationService';

// Core backends
export { WebGPUBackend } from './webgpu/webgpuBackend';
export { WebGLBackend } from './webgl/webglBackend';
export { CPUFallbackBackend } from './fallback/cpuFallback';

// Hardware detection and optimization
export { HardwareDetection } from './detection/hardwareDetection';
export { InferenceOptimizer } from './optimization/inferenceOptimizer';

// Memory and performance
export { GPUMemoryManager } from './memory/memoryManager';
export { PerformanceMonitor } from './monitoring/performanceMonitor';

// Types
export type {
  GPUBackend,
  GPUCapabilities,
  GPUVendor,
  GPUTier,
  MemoryInfo,
  ComputeCapabilities,
  GPUBuffer,
  GPUKernel,
  GPUMemoryPool,
  GPUPerformanceMetrics,
  GPUTaskConfig,
  GPUComputeTask,
  WebGLResources,
  WebGPUResources,
  ModelOptimization,
  InferenceConfig,
  GPUAccelerationResult
} from './types/gpuTypes';

export type {
  HardwareInfo
} from './detection/hardwareDetection';

export type {
  PerformanceProfile,
  PerformanceBenchmark,
  SystemResourceUsage,
  PerformanceAlert
} from './monitoring/performanceMonitor';

export type {
  OptimizationStrategy,
  BatchingConfig,
  CachingConfig,
  QuantizationConfig
} from './optimization/inferenceOptimizer';

export type {
  MemoryAllocationOptions,
  MemoryStats
} from './memory/memoryManager';

export type {
  CPUWorkerConfig,
  CPUComputeTask
} from './fallback/cpuFallback';

export type {
  GPUServiceConfig,
  AccelerationRequest
} from './gpuAccelerationService';

// Utility functions
export const createGPUService = async (config?: Partial<import('./gpuAccelerationService').GPUServiceConfig>) => {
  const service = GPUAccelerationService.getInstance();
  await service.initialize(config);
  return service;
};

export const detectGPUCapabilities = async () => {
  const detection = HardwareDetection.getInstance();
  return await detection.detectHardware();
};

export const optimizeInferenceConfig = async (config: import('./types/gpuTypes').InferenceConfig) => {
  const optimizer = InferenceOptimizer.getInstance();
  return await optimizer.optimizeInferenceConfig(config);
};

// Constants
export const GPU_BACKENDS = ['webgpu', 'webgl', 'cpu'] as const;
export const GPU_VENDORS = ['nvidia', 'amd', 'intel', 'apple', 'unknown'] as const;
export const GPU_TIERS = ['low', 'medium', 'high'] as const;
export const QUANTIZATION_LEVELS = ['fp32', 'fp16', 'int8', 'int4'] as const;

// Default configurations
export const DEFAULT_GPU_CONFIG: import('./gpuAccelerationService').GPUServiceConfig = {
  enableFallback: true,
  enableOptimization: true,
  enablePerformanceMonitoring: true,
  maxConcurrentTasks: 4
};

export const DEFAULT_INFERENCE_CONFIG: import('./types/gpuTypes').InferenceConfig = {
  modelSize: 1024 * 1024 * 100, // 100MB
  sequenceLength: 512,
  batchSize: 1,
  optimization: {
    quantization: 'fp32',
    batching: false,
    parallelism: 1,
    caching: false
  },
  memoryBudget: 1024 * 1024 * 1024, // 1GB
  latencyTarget: 100 // 100ms
};

/**
 * Quick start helper function
 * 
 * @example
 * ```typescript
 * import { quickStartGPU } from './services/gpu';
 * 
 * const gpu = await quickStartGPU();
 * 
 * // Matrix multiplication
 * const a = new Float32Array([1, 2, 3, 4]);
 * const b = new Float32Array([5, 6, 7, 8]);
 * const result = await gpu.matrixMultiply(a, b, 2, 2, 2);
 * 
 * // Vector addition
 * const va = new Float32Array([1, 2, 3]);
 * const vb = new Float32Array([4, 5, 6]);
 * const vectorResult = await gpu.vectorAdd(va, vb);
 * ```
 */
export const quickStartGPU = async (config?: Partial<import('./gpuAccelerationService').GPUServiceConfig>) => {
  console.log('🚀 Initializing GPU Acceleration...');
  
  const service = await createGPUService({
    ...DEFAULT_GPU_CONFIG,
    ...config
  });
  
  const hardwareInfo = service.getHardwareInfo();
  const backend = service.getCurrentBackend();
  
  console.log(`✅ GPU Acceleration ready with ${backend} backend`);
  if (hardwareInfo) {
    console.log(`🔧 Hardware: ${hardwareInfo.gpu.vendor} ${hardwareInfo.gpu.tier} tier`);
    console.log(`💾 Memory: ${Math.round(hardwareInfo.memory.freeMemory / 1024 / 1024)}MB available`);
  }
  
  return service;
};

/**
 * Check if GPU acceleration is available
 */
export const isGPUAvailable = async (): Promise<boolean> => {
  try {
    const detection = HardwareDetection.getInstance();
    return await detection.isGPUAvailable();
  } catch (error) {
    console.warn('GPU availability check failed:', error);
    return false;
  }
};

/**
 * Get optimal GPU configuration for current hardware
 */
export const getOptimalGPUConfig = async (): Promise<{
  backend: import('./types/gpuTypes').GPUBackend;
  maxBatchSize: number;
  workgroupSize: number;
  memoryLimit: number;
}> => {
  const detection = HardwareDetection.getInstance();
  return await detection.getOptimalConfiguration();
};

/**
 * Run GPU benchmark suite
 */
export const runGPUBenchmark = async () => {
  console.log('🏃‍♂️ Running GPU benchmark suite...');
  
  const service = await createGPUService();
  const results = await service.benchmark();
  
  console.log('📊 Benchmark Results:');
  Object.entries(results).forEach(([backend, metrics]) => {
    console.log(`  ${backend.toUpperCase()}:`);
    console.log(`    Matrix Multiply: ${metrics.matrixMultiplyTime.toFixed(2)}ms`);
    console.log(`    Vector Add: ${metrics.vectorAddTime.toFixed(2)}ms`);
    console.log(`    Throughput: ${metrics.throughput.toFixed(2)} MB/s`);
  });
  
  await service.cleanup();
  return results;
};

export default GPUAccelerationService;