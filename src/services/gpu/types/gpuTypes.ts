export type GPUVendor = 'nvidia' | 'amd' | 'intel' | 'apple' | 'unknown';
export type GPUTier = 'low' | 'medium' | 'high';
export type GPUBackend = 'webgpu' | 'webgl' | 'cpu';

export interface GPUCapabilities {
  vendor: GPUVendor;
  tier: GPUTier;
  maxTextureSize: number;
  maxComputeWorkgroupSize: number;
  shaderVersion: string;
  supportsFloat32: boolean;
  supportsCompute: boolean;
}

export interface MemoryInfo {
  totalMemory: number;
  freeMemory: number;
  usedMemory: number;
  gpuMemory: number;
}

export interface ComputeCapabilities {
  supportsParallelCompute: boolean;
  maxWorkgroupSize: number;
  preferredWorkgroupSize: number;
  supportsSharedMemory: boolean;
  supportsFP16: boolean;
  supportsFP32: boolean;
  maxBufferSize: number;
  concurrentKernels: number;
}

export interface GPUBuffer {
  id: string;
  buffer: GPUBuffer | WebGLBuffer;
  size: number;
  usage: 'vertex' | 'storage' | 'uniform' | 'texture';
  inUse: boolean;
  lastUsed: number;
}

export interface GPUKernel {
  id: string;
  name: string;
  source: string;
  compiledShader?: any;
  workgroupSize: [number, number, number];
  backend: GPUBackend;
}

export interface GPUMemoryPool {
  totalSize: number;
  usedSize: number;
  freeSize: number;
  buffers: Map<string, GPUBuffer>;
  fragmentationRatio: number;
}

export interface GPUPerformanceMetrics {
  computeTime: number;
  memoryTransferTime: number;
  kernelCompilationTime: number;
  totalTime: number;
  throughput: number;
  efficiency: number;
  powerUsage?: number;
}

export interface GPUTaskConfig {
  workgroupSize?: [number, number, number];
  maxMemory?: number;
  priority?: 'low' | 'medium' | 'high';
  timeout?: number;
  fallbackToCPU?: boolean;
}

export interface GPUComputeTask {
  id: string;
  kernel: GPUKernel;
  inputs: ArrayBuffer[];
  outputs: ArrayBuffer[];
  config: GPUTaskConfig;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startTime?: number;
  endTime?: number;
  error?: Error;
}

export interface WebGLResources {
  gl: WebGL2RenderingContext | WebGLRenderingContext;
  program: WebGLProgram;
  buffers: WebGLBuffer[];
  textures: WebGLTexture[];
  framebuffers: WebGLFramebuffer[];
}

export interface WebGPUResources {
  device: GPUDevice;
  queue: GPUCommandQueue;
  bindGroups: GPUBindGroup[];
  pipelines: GPUComputePipeline[];
  buffers: GPUBuffer[];
}

export interface ModelOptimization {
  quantization: 'fp32' | 'fp16' | 'int8' | 'int4';
  batching: boolean;
  parallelism: number;
  caching: boolean;
  pruning?: number; // Percentage of weights to prune
  distillation?: boolean;
}

export interface InferenceConfig {
  modelSize: number;
  sequenceLength: number;
  batchSize: number;
  optimization: ModelOptimization;
  memoryBudget: number;
  latencyTarget: number; // milliseconds
}

export interface GPUAccelerationResult<T = any> {
  success: boolean;
  result?: T;
  metrics: GPUPerformanceMetrics;
  backend: GPUBackend;
  error?: Error;
  fallbackUsed: boolean;
}