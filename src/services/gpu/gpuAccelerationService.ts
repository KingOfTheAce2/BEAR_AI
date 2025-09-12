import { GPUAccelerationResult, GPUKernel, GPUComputeTask, GPUBackend, InferenceConfig, ModelOptimization } from './types/gpuTypes';
import { HardwareDetection, HardwareInfo } from './detection/hardwareDetection';
import { GPUMemoryManager } from './memory/memoryManager';
import { PerformanceMonitor } from './monitoring/performanceMonitor';
import { InferenceOptimizer } from './optimization/inferenceOptimizer';
import { WebGPUBackend } from './webgpu/webgpuBackend';
import { WebGLBackend } from './webgl/webglBackend';
import { CPUFallbackBackend } from './fallback/cpuFallback';

export interface GPUServiceConfig {
  preferredBackend?: GPUBackend;
  enableFallback: boolean;
  enableOptimization: boolean;
  enablePerformanceMonitoring: boolean;
  memoryBudget?: number;
  maxConcurrentTasks: number;
}

export interface AccelerationRequest {
  operation: 'matmul' | 'vectoradd' | 'convolution' | 'inference' | 'custom';
  inputs: ArrayBuffer[];
  outputs?: ArrayBuffer[];
  config?: any;
  priority?: 'low' | 'medium' | 'high';
  timeout?: number;
}

export class GPUAccelerationService {
  private static instance: GPUAccelerationService;
  private hardwareDetection: HardwareDetection;
  private memoryManager: GPUMemoryManager | null = null;
  private performanceMonitor: PerformanceMonitor;
  private inferenceOptimizer: InferenceOptimizer;
  private webgpuBackend: WebGPUBackend;
  private webglBackend: WebGLBackend;
  private cpuFallback: CPUFallbackBackend;
  
  private config: GPUServiceConfig = {
    enableFallback: true,
    enableOptimization: true,
    enablePerformanceMonitoring: true,
    maxConcurrentTasks: 4
  };
  
  private isInitialized = false;
  private currentBackend: GPUBackend = 'cpu';
  private hardwareInfo: HardwareInfo | null = null;
  private activeTasks = new Map<string, Promise<GPUAccelerationResult>>();
  private taskQueue: AccelerationRequest[] = [];
  private processingQueue = false;

  private constructor() {
    this.hardwareDetection = HardwareDetection.getInstance();
    this.performanceMonitor = new PerformanceMonitor();
    this.inferenceOptimizer = InferenceOptimizer.getInstance();
    this.webgpuBackend = WebGPUBackend.getInstance();
    this.webglBackend = WebGLBackend.getInstance();
    this.cpuFallback = CPUFallbackBackend.getInstance();
  }

  static getInstance(): GPUAccelerationService {
    if (!GPUAccelerationService.instance) {
      GPUAccelerationService.instance = new GPUAccelerationService();
    }
    return GPUAccelerationService.instance;
  }

  async initialize(config?: Partial<GPUServiceConfig>): Promise<boolean> {
    if (this.isInitialized) {
      return true;
    }

    if (config) {
      this.config = { ...this.config, ...config };
    }

    try {
      console.log('Initializing GPU Acceleration Service...');
      
      // Detect hardware capabilities
      this.hardwareInfo = await this.hardwareDetection.detectHardware();
      console.log('Hardware detection completed:', {
        gpu: this.hardwareInfo.gpu,
        preferredBackend: this.hardwareInfo.preferredBackend,
        webglSupported: this.hardwareInfo.webglSupported,
        webgpuSupported: this.hardwareInfo.webgpuSupported
      });

      // Determine and initialize the best available backend
      const targetBackend = this.config.preferredBackend || this.hardwareInfo.preferredBackend;
      this.currentBackend = await this.initializeBackend(targetBackend);
      
      // Initialize memory manager
      if (this.currentBackend !== 'cpu') {
        const memoryBudget = this.config.memoryBudget || this.hardwareInfo.memory.gpuMemory;
        this.memoryManager = GPUMemoryManager.getInstance(this.currentBackend, memoryBudget);
      }
      
      // Set up performance monitoring
      if (this.config.enablePerformanceMonitoring) {
        this.setupPerformanceMonitoring();
      }
      
      this.isInitialized = true;
      console.log(`GPU Acceleration Service initialized with ${this.currentBackend} backend`);
      
      // Run initial benchmarks
      await this.runInitialBenchmarks();
      
      return true;
    } catch (error) {
      console.error('Failed to initialize GPU Acceleration Service:', error);
      
      // Fallback to CPU if enabled
      if (this.config.enableFallback) {
        this.currentBackend = 'cpu';
        this.isInitialized = true;
        console.log('Initialized with CPU fallback');
        return true;
      }
      
      return false;
    }
  }

  private async initializeBackend(targetBackend: GPUBackend): Promise<GPUBackend> {
    // Try to initialize the target backend
    if (targetBackend === 'webgpu') {
      const success = await this.webgpuBackend.initialize();
      if (success) {
        console.log('WebGPU backend initialized successfully');
        return 'webgpu';
      }
    }
    
    if (targetBackend === 'webgl' || !this.hardwareInfo?.webgpuSupported) {
      const success = await this.webglBackend.initialize();
      if (success) {
        console.log('WebGL backend initialized successfully');
        return 'webgl';
      }
    }
    
    // Fallback to CPU
    if (this.config.enableFallback) {
      console.log('Falling back to CPU backend');
      return 'cpu';
    }
    
    throw new Error('No suitable GPU backend available');
  }

  private setupPerformanceMonitoring(): void {
    this.performanceMonitor.onAlert((alert) => {
      console.warn(`Performance Alert [${alert.type}/${alert.severity}]: ${alert.message}`);
      
      // Auto-optimization based on alerts
      if (this.config.enableOptimization && alert.type === 'performance') {
        this.considerBackendSwitch(alert);
      }
    });
  }

  private async considerBackendSwitch(alert: any): Promise<void> {
    // Switch backends if current one is underperforming
    if (alert.severity === 'warning' && this.currentBackend !== 'cpu') {
      const alternatives = this.getAvailableBackends().filter(b => b !== this.currentBackend);
      
      if (alternatives.length > 0) {
        console.log(`Considering backend switch due to performance issues...`);
        // Could implement automatic backend switching logic here
      }
    }
  }

  private async runInitialBenchmarks(): Promise<void> {
    if (!this.config.enablePerformanceMonitoring) {
      return;
    }

    try {
      console.log('Running initial performance benchmarks...');
      
      // Matrix multiplication benchmark
      const matmulBenchmark = await this.performanceMonitor.runBenchmark(
        'matrix_multiply_1024x1024',
        this.currentBackend,
        async () => {
          const size = 1024;
          const a = new Float32Array(size * size).fill(1);
          const b = new Float32Array(size * size).fill(2);
          
          const result = await this.matrixMultiply(a, b, size, size, size);
          return result.metrics;
        },
        3 // 3 iterations
      );
      
      // Vector addition benchmark
      const vectorBenchmark = await this.performanceMonitor.runBenchmark(
        'vector_add_1M',
        this.currentBackend,
        async () => {
          const size = 1000000;
          const a = new Float32Array(size).fill(1);
          const b = new Float32Array(size).fill(2);
          
          const result = await this.vectorAdd(a, b);
          return result.metrics;
        },
        3
      );
      
      console.log('Initial benchmarks completed');
    } catch (error) {
      console.warn('Initial benchmarks failed:', error);
    }
  }

  async accelerate(request: AccelerationRequest): Promise<GPUAccelerationResult> {
    if (!this.isInitialized) {
      throw new Error('GPU Acceleration Service not initialized');
    }

    // Check task queue limits
    if (this.activeTasks.size >= this.config.maxConcurrentTasks) {
      this.taskQueue.push(request);
      await this.processTaskQueue();
    }

    const taskId = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      const taskPromise = this.executeAccelerationRequest(request);
      this.activeTasks.set(taskId, taskPromise);
      
      const result = await taskPromise;
      
      this.activeTasks.delete(taskId);
      this.processTaskQueue(); // Process any queued tasks
      
      return result;
    } catch (error) {
      this.activeTasks.delete(taskId);
      this.processTaskQueue();
      throw error;
    }
  }

  private async executeAccelerationRequest(request: AccelerationRequest): Promise<GPUAccelerationResult> {
    const timeout = request.timeout || 30000; // 30 seconds default
    
    return new Promise(async (resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Acceleration request timeout'));
      }, timeout);
      
      try {
        let result: GPUAccelerationResult;
        
        switch (request.operation) {
          case 'matmul':
            result = await this.executeMatrixMultiplication(request);
            break;
          case 'vectoradd':
            result = await this.executeVectorAddition(request);
            break;
          case 'convolution':
            result = await this.executeConvolution(request);
            break;
          case 'inference':
            result = await this.executeInference(request);
            break;
          case 'custom':
            result = await this.executeCustomKernel(request);
            break;
          default:
            throw new Error(`Unsupported operation: ${request.operation}`);
        }
        
        clearTimeout(timeoutId);
        resolve(result);
      } catch (error) {
        clearTimeout(timeoutId);
        
        // Try fallback if available and original backend failed
        if (this.config.enableFallback && this.currentBackend !== 'cpu') {
          try {
            console.log('Attempting CPU fallback...');
            const fallbackResult = await this.executeFallback(request);
            resolve(fallbackResult);
          } catch (fallbackError) {
            reject(fallbackError);
          }
        } else {
          reject(error);
        }
      }
    });
  }

  private async executeMatrixMultiplication(request: AccelerationRequest): Promise<GPUAccelerationResult> {
    const [a, b] = request.inputs.map(buffer => new Float32Array(buffer));
    const config = request.config || {};
    const rows = config.rows || Math.sqrt(a.length);
    const cols = config.cols || Math.sqrt(b.length);
    const inner = config.inner || rows;
    
    return this.matrixMultiply(a, b, rows, cols, inner);
  }

  private async executeVectorAddition(request: AccelerationRequest): Promise<GPUAccelerationResult> {
    const [a, b] = request.inputs.map(buffer => new Float32Array(buffer));
    return this.vectorAdd(a, b);
  }

  private async executeConvolution(request: AccelerationRequest): Promise<GPUAccelerationResult> {
    // Placeholder for convolution implementation
    throw new Error('Convolution not yet implemented');
  }

  private async executeInference(request: AccelerationRequest): Promise<GPUAccelerationResult> {
    // Placeholder for inference implementation
    throw new Error('Inference not yet implemented');
  }

  private async executeCustomKernel(request: AccelerationRequest): Promise<GPUAccelerationResult> {
    if (!request.config?.kernel) {
      throw new Error('Custom kernel operation requires kernel configuration');
    }
    
    const kernel = request.config.kernel as GPUKernel;
    const outputs = request.outputs || [new ArrayBuffer(request.inputs[0].byteLength)];
    
    return this.executeKernel(kernel, request.inputs, outputs);
  }

  private async executeFallback(request: AccelerationRequest): Promise<GPUAccelerationResult> {
    switch (request.operation) {
      case 'matmul':
        const [a, b] = request.inputs.map(buffer => new Float32Array(buffer));
        const config = request.config || {};
        const result = await this.cpuFallback.matrixMultiply(
          a, b, 
          config.rows || Math.sqrt(a.length),
          config.cols || Math.sqrt(b.length),
          config.inner || Math.sqrt(a.length)
        );
        return {
          success: true,
          result: [result.buffer],
          metrics: {
            computeTime: 0,
            memoryTransferTime: 0,
            kernelCompilationTime: 0,
            totalTime: 0,
            throughput: 0,
            efficiency: 0
          },
          backend: 'cpu',
          fallbackUsed: true
        };
      
      case 'vectoradd':
        const [va, vb] = request.inputs.map(buffer => new Float32Array(buffer));
        const vectorResult = await this.cpuFallback.vectorAdd(va, vb);
        return {
          success: true,
          result: [vectorResult.buffer],
          metrics: {
            computeTime: 0,
            memoryTransferTime: 0,
            kernelCompilationTime: 0,
            totalTime: 0,
            throughput: 0,
            efficiency: 0
          },
          backend: 'cpu',
          fallbackUsed: true
        };
      
      default:
        throw new Error(`Fallback not available for operation: ${request.operation}`);
    }
  }

  private async processTaskQueue(): Promise<void> {
    if (this.processingQueue || this.taskQueue.length === 0) {
      return;
    }
    
    this.processingQueue = true;
    
    while (this.taskQueue.length > 0 && this.activeTasks.size < this.config.maxConcurrentTasks) {
      const request = this.taskQueue.shift();
      if (request) {
        // Execute the queued request
        this.accelerate(request).catch(error => {
          console.error('Queued task failed:', error);
        });
      }
    }
    
    this.processingQueue = false;
  }

  async matrixMultiply(
    a: Float32Array,
    b: Float32Array,
    rows: number,
    cols: number,
    inner: number
  ): Promise<GPUAccelerationResult> {
    switch (this.currentBackend) {
      case 'webgpu':
        const result = await this.webgpuBackend.matrixMultiply(a, b, rows, cols, inner);
        return {
          success: true,
          result: [result.buffer],
          metrics: {
            computeTime: 0,
            memoryTransferTime: 0,
            kernelCompilationTime: 0,
            totalTime: 0,
            throughput: 0,
            efficiency: 0
          },
          backend: 'webgpu',
          fallbackUsed: false
        };
      
      case 'webgl':
        const webglResult = await this.webglBackend.matrixMultiply(a, b, rows, cols, inner);
        return {
          success: true,
          result: [webglResult.buffer],
          metrics: {
            computeTime: 0,
            memoryTransferTime: 0,
            kernelCompilationTime: 0,
            totalTime: 0,
            throughput: 0,
            efficiency: 0
          },
          backend: 'webgl',
          fallbackUsed: false
        };
      
      case 'cpu':
        const cpuResult = await this.cpuFallback.matrixMultiply(a, b, rows, cols, inner);
        return {
          success: true,
          result: [cpuResult.buffer],
          metrics: {
            computeTime: 0,
            memoryTransferTime: 0,
            kernelCompilationTime: 0,
            totalTime: 0,
            throughput: 0,
            efficiency: 0
          },
          backend: 'cpu',
          fallbackUsed: true
        };
      
      default:
        throw new Error(`Unsupported backend: ${this.currentBackend}`);
    }
  }

  async vectorAdd(a: Float32Array, b: Float32Array): Promise<GPUAccelerationResult> {
    switch (this.currentBackend) {
      case 'webgpu':
        const result = await this.webgpuBackend.vectorAdd(a, b);
        return {
          success: true,
          result: [result.buffer],
          metrics: {
            computeTime: 0,
            memoryTransferTime: 0,
            kernelCompilationTime: 0,
            totalTime: 0,
            throughput: 0,
            efficiency: 0
          },
          backend: 'webgpu',
          fallbackUsed: false
        };
      
      case 'webgl':
        const webglResult = await this.webglBackend.vectorAdd(a, b);
        return {
          success: true,
          result: [webglResult.buffer],
          metrics: {
            computeTime: 0,
            memoryTransferTime: 0,
            kernelCompilationTime: 0,
            totalTime: 0,
            throughput: 0,
            efficiency: 0
          },
          backend: 'webgl',
          fallbackUsed: false
        };
      
      case 'cpu':
        const cpuResult = await this.cpuFallback.vectorAdd(a, b);
        return {
          success: true,
          result: [cpuResult.buffer],
          metrics: {
            computeTime: 0,
            memoryTransferTime: 0,
            kernelCompilationTime: 0,
            totalTime: 0,
            throughput: 0,
            efficiency: 0
          },
          backend: 'cpu',
          fallbackUsed: true
        };
      
      default:
        throw new Error(`Unsupported backend: ${this.currentBackend}`);
    }
  }

  async executeKernel(
    kernel: GPUKernel,
    inputs: ArrayBuffer[],
    outputs: ArrayBuffer[]
  ): Promise<GPUAccelerationResult> {
    switch (this.currentBackend) {
      case 'webgpu':
        return this.webgpuBackend.executeKernel(kernel, inputs, outputs);
      
      case 'webgl':
        return this.webglBackend.executeKernel(kernel, inputs, outputs);
      
      case 'cpu':
        return this.cpuFallback.executeKernel(kernel, inputs, outputs);
      
      default:
        throw new Error(`Unsupported backend: ${this.currentBackend}`);
    }
  }

  async optimizeForInference(config: InferenceConfig): Promise<{
    optimizedConfig: InferenceConfig;
    recommendations: string[];
    estimatedSpeedup: number;
  }> {
    if (!this.config.enableOptimization) {
      return {
        optimizedConfig: config,
        recommendations: ['Optimization disabled'],
        estimatedSpeedup: 1.0
      };
    }

    const optimizedConfig = await this.inferenceOptimizer.optimizeInferenceConfig(config);
    const recommendations = await this.inferenceOptimizer.getOptimizationRecommendations(config);
    
    return {
      optimizedConfig,
      recommendations: recommendations.recommended.map(r => r.description),
      estimatedSpeedup: recommendations.estimated_speedup
    };
  }

  // Public API methods
  getCurrentBackend(): GPUBackend {
    return this.currentBackend;
  }

  getAvailableBackends(): GPUBackend[] {
    const backends: GPUBackend[] = ['cpu'];
    
    if (this.hardwareInfo?.webglSupported) {
      backends.push('webgl');
    }
    
    if (this.hardwareInfo?.webgpuSupported) {
      backends.push('webgpu');
    }
    
    return backends;
  }

  getHardwareInfo(): HardwareInfo | null {
    return this.hardwareInfo;
  }

  getPerformanceMetrics() {
    return this.performanceMonitor.getPerformanceSummary();
  }

  getMemoryStats() {
    return this.memoryManager?.getMemoryStats() || null;
  }

  async switchBackend(backend: GPUBackend): Promise<boolean> {
    if (!this.getAvailableBackends().includes(backend)) {
      console.warn(`Backend ${backend} not available`);
      return false;
    }

    try {
      const newBackend = await this.initializeBackend(backend);
      
      if (newBackend === backend) {
        this.currentBackend = backend;
        console.log(`Switched to ${backend} backend`);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error(`Failed to switch to ${backend} backend:`, error);
      return false;
    }
  }

  async benchmark(): Promise<{
    [backend: string]: {
      matrixMultiplyTime: number;
      vectorAddTime: number;
      throughput: number;
    }
  }> {
    const results: any = {};
    const availableBackends = this.getAvailableBackends();
    
    for (const backend of availableBackends) {
      const originalBackend = this.currentBackend;
      
      try {
        await this.switchBackend(backend);
        
        if (backend === 'cpu') {
          results[backend] = await this.cpuFallback.benchmark();
        } else {
          // Run basic benchmarks for GPU backends
          const size = 512;
          const a = new Float32Array(size * size).fill(1);
          const b = new Float32Array(size * size).fill(2);
          
          const matmulStart = performance.now();
          await this.matrixMultiply(a, b, size, size, size);
          const matrixMultiplyTime = performance.now() - matmulStart;
          
          const va = new Float32Array(size * 1000).fill(1);
          const vb = new Float32Array(size * 1000).fill(2);
          
          const vectorStart = performance.now();
          await this.vectorAdd(va, vb);
          const vectorAddTime = performance.now() - vectorStart;
          
          const totalTime = matrixMultiplyTime + vectorAddTime;
          const totalBytes = (a.byteLength + b.byteLength + va.byteLength + vb.byteLength) * 2;
          const throughput = (totalBytes / 1024 / 1024) / (totalTime / 1000);
          
          results[backend] = {
            matrixMultiplyTime,
            vectorAddTime,
            throughput
          };
        }
      } catch (error) {
        console.error(`Benchmark failed for ${backend}:`, error);
        results[backend] = {
          matrixMultiplyTime: Infinity,
          vectorAddTime: Infinity,
          throughput: 0
        };
      }
      
      // Restore original backend
      await this.switchBackend(originalBackend);
    }
    
    return results;
  }

  isInitialized(): boolean {
    return this.isInitialized;
  }

  updateConfig(newConfig: Partial<GPUServiceConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  async cleanup(): Promise<void> {
    // Clean up all backends
    await this.webgpuBackend.cleanup();
    await this.webglBackend.cleanup();
    this.cpuFallback.cleanup();
    
    // Clean up memory manager
    if (this.memoryManager) {
      await this.memoryManager.cleanup();
    }
    
    // Clean up performance monitor
    this.performanceMonitor.cleanup();
    
    // Clear active tasks
    this.activeTasks.clear();
    this.taskQueue.length = 0;
    
    this.isInitialized = false;
    console.log('GPU Acceleration Service cleaned up');
  }
}