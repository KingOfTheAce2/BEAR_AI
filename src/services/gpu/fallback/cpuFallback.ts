import { GPUAccelerationResult, GPUKernel, GPUComputeTask, GPUPerformanceMetrics } from '../types/gpuTypes';
import { PerformanceMonitor } from '../monitoring/performanceMonitor';

export interface CPUWorkerConfig {
  maxWorkers: number;
  taskTimeout: number;
  enableSIMD: boolean;
  enableWebAssembly: boolean;
}

export interface CPUComputeTask {
  id: string;
  operation: 'matmul' | 'vectoradd' | 'convolution' | 'activation' | 'custom';
  inputs: ArrayBuffer[];
  outputs: ArrayBuffer[];
  config: any;
  priority: 'low' | 'medium' | 'high';
}

export class CPUFallbackBackend {
  private static instance: CPUFallbackBackend;
  private performanceMonitor: PerformanceMonitor;
  private workers: Worker[] = [];
  private taskQueue: CPUComputeTask[] = [];
  private activeTasks = new Map<string, Promise<any>>();
  private config: CPUWorkerConfig;
  private simdSupported = false;
  private wasmSupported = false;
  private wasmModule: WebAssembly.Module | null = null;

  private constructor() {
    this.performanceMonitor = new PerformanceMonitor();
    this.config = {
      maxWorkers: navigator.hardwareConcurrency || 4,
      taskTimeout: 30000, // 30 seconds
      enableSIMD: true,
      enableWebAssembly: true
    };
    this.initializeCapabilities();
    this.initializeWorkers();
  }

  static getInstance(): CPUFallbackBackend {
    if (!CPUFallbackBackend.instance) {
      CPUFallbackBackend.instance = new CPUFallbackBackend();
    }
    return CPUFallbackBackend.instance;
  }

  private async initializeCapabilities(): Promise<void> {
    // Check SIMD support
    try {
      this.simdSupported = typeof SIMD !== 'undefined';
    } catch (error) {
      this.simdSupported = false;
    }

    // Check WebAssembly support
    try {
      this.wasmSupported = typeof WebAssembly !== 'undefined';
      if (this.wasmSupported && this.config.enableWebAssembly) {
        await this.loadWebAssemblyModule();
      }
    } catch (error) {
      this.wasmSupported = false;
      console.warn('WebAssembly not supported, falling back to JavaScript');
    }

    console.log(`CPU Fallback initialized:`);
    console.log(`  Workers: ${this.config.maxWorkers}`);
    console.log(`  SIMD: ${this.simdSupported}`);
    console.log(`  WebAssembly: ${this.wasmSupported}`);
  }

  private async loadWebAssemblyModule(): Promise<void> {
    try {
      // In a real implementation, this would load an optimized WASM module
      // For now, we'll create a simple inline WASM module
      const wasmBytes = new Uint8Array([
        0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00,
        0x01, 0x07, 0x01, 0x60, 0x02, 0x7f, 0x7f, 0x01, 0x7f,
        0x03, 0x02, 0x01, 0x00,
        0x07, 0x07, 0x01, 0x03, 0x61, 0x64, 0x64, 0x00, 0x00,
        0x0a, 0x09, 0x01, 0x07, 0x00, 0x20, 0x00, 0x20, 0x01, 0x6a, 0x0b
      ]);
      
      this.wasmModule = await WebAssembly.compile(wasmBytes);
      console.log('WebAssembly module loaded successfully');
    } catch (error) {
      console.warn('Failed to load WebAssembly module:', error);
      this.wasmSupported = false;
    }
  }

  private initializeWorkers(): void {
    const workerCode = this.generateWorkerCode();
    const workerBlob = new Blob([workerCode], { type: 'application/javascript' });
    const workerUrl = URL.createObjectURL(workerBlob);

    for (let i = 0; i < this.config.maxWorkers; i++) {
      try {
        const worker = new Worker(workerUrl);
        worker.onmessage = this.handleWorkerMessage.bind(this);
        worker.onerror = this.handleWorkerError.bind(this);
        this.workers.push(worker);
      } catch (error) {
        console.warn(`Failed to create worker ${i}:`, error);
      }
    }

    URL.revokeObjectURL(workerUrl);
    console.log(`Initialized ${this.workers.length} CPU workers`);
  }

  private generateWorkerCode(): string {
    return `
      // CPU Worker for fallback compute operations
      
      function matrixMultiply(a, b, rowsA, colsA, colsB) {
        const result = new Float32Array(rowsA * colsB);
        for (let i = 0; i < rowsA; i++) {
          for (let j = 0; j < colsB; j++) {
            let sum = 0;
            for (let k = 0; k < colsA; k++) {
              sum += a[i * colsA + k] * b[k * colsB + j];
            }
            result[i * colsB + j] = sum;
          }
        }
        return result;
      }
      
      function vectorAdd(a, b) {
        const result = new Float32Array(a.length);
        for (let i = 0; i < a.length; i++) {
          result[i] = a[i] + b[i];
        }
        return result;
      }
      
      function vectorScale(a, scale) {
        const result = new Float32Array(a.length);
        for (let i = 0; i < a.length; i++) {
          result[i] = a[i] * scale;
        }
        return result;
      }
      
      function relu(input) {
        const result = new Float32Array(input.length);
        for (let i = 0; i < input.length; i++) {
          result[i] = Math.max(0, input[i]);
        }
        return result;
      }
      
      function convolution2d(input, kernel, inputHeight, inputWidth, kernelSize, stride = 1, padding = 0) {
        const outputHeight = Math.floor((inputHeight + 2 * padding - kernelSize) / stride) + 1;
        const outputWidth = Math.floor((inputWidth + 2 * padding - kernelSize) / stride) + 1;
        const result = new Float32Array(outputHeight * outputWidth);
        
        for (let oh = 0; oh < outputHeight; oh++) {
          for (let ow = 0; ow < outputWidth; ow++) {
            let sum = 0;
            for (let kh = 0; kh < kernelSize; kh++) {
              for (let kw = 0; kw < kernelSize; kw++) {
                const ih = oh * stride - padding + kh;
                const iw = ow * stride - padding + kw;
                
                if (ih >= 0 && ih < inputHeight && iw >= 0 && iw < inputWidth) {
                  sum += input[ih * inputWidth + iw] * kernel[kh * kernelSize + kw];
                }
              }
            }
            result[oh * outputWidth + ow] = sum;
          }
        }
        
        return result;
      }
      
      self.onmessage = function(e) {
        const { taskId, operation, inputs, config } = e.data;
        const startTime = performance.now();
        
        try {
          let result;
          
          switch (operation) {
            case 'matmul':
              const a = new Float32Array(inputs[0]);
              const b = new Float32Array(inputs[1]);
              result = matrixMultiply(a, b, config.rowsA, config.colsA, config.colsB);
              break;
              
            case 'vectoradd':
              const va = new Float32Array(inputs[0]);
              const vb = new Float32Array(inputs[1]);
              result = vectorAdd(va, vb);
              break;
              
            case 'convolution':
              const input = new Float32Array(inputs[0]);
              const kernel = new Float32Array(inputs[1]);
              result = convolution2d(
                input, kernel, 
                config.inputHeight, config.inputWidth,
                config.kernelSize, config.stride, config.padding
              );
              break;
              
            case 'activation':
              const actInput = new Float32Array(inputs[0]);
              if (config.type === 'relu') {
                result = relu(actInput);
              } else {
                result = actInput; // passthrough for unsupported activations
              }
              break;
              
            default:
              throw new Error('Unsupported operation: ' + operation);
          }
          
          const endTime = performance.now();
          
          self.postMessage({
            taskId,
            success: true,
            result: result.buffer,
            computeTime: endTime - startTime
          });
        } catch (error) {
          self.postMessage({
            taskId,
            success: false,
            error: error.message,
            computeTime: performance.now() - startTime
          });
        }
      };
    `;
  }

  private handleWorkerMessage(event: MessageEvent): void {
    const { taskId, success, result, error, computeTime } = event.data;
    
    const taskPromise = this.activeTasks.get(taskId);
    if (taskPromise) {
      this.activeTasks.delete(taskId);
      
      if (success) {
        // Resolve with the result
        (taskPromise as any).resolve({
          success: true,
          result,
          computeTime
        });
      } else {
        (taskPromise as any).reject(new Error(error));
      }
    }
  }

  private handleWorkerError(error: ErrorEvent): void {
    console.error('Worker error:', error);
  }

  async executeKernel(
    kernel: GPUKernel,
    inputs: ArrayBuffer[],
    outputs: ArrayBuffer[],
    workgroupCount: [number, number, number] = [1, 1, 1]
  ): Promise<GPUAccelerationResult> {
    const startTime = performance.now();
    
    try {
      // Convert GPU kernel to CPU operation
      const cpuTask = this.convertKernelToCPUTask(kernel, inputs, outputs);
      
      const result = await this.executeCPUTask(cpuTask);
      
      const totalTime = performance.now() - startTime;
      
      const metrics: GPUPerformanceMetrics = {
        computeTime: result.computeTime,
        memoryTransferTime: 0, // No memory transfer for CPU
        kernelCompilationTime: 0,
        totalTime,
        throughput: this.calculateThroughput(inputs, outputs, totalTime),
        efficiency: result.computeTime / totalTime
      };
      
      this.performanceMonitor.recordMetrics(metrics, 'cpu');
      
      return {
        success: true,
        result: outputs,
        metrics,
        backend: 'cpu',
        fallbackUsed: true
      };
    } catch (error) {
      const totalTime = performance.now() - startTime;
      
      return {
        success: false,
        metrics: {
          computeTime: 0,
          memoryTransferTime: 0,
          kernelCompilationTime: 0,
          totalTime,
          throughput: 0,
          efficiency: 0
        },
        backend: 'cpu',
        error: error as Error,
        fallbackUsed: true
      };
    }
  }

  private convertKernelToCPUTask(
    kernel: GPUKernel, 
    inputs: ArrayBuffer[], 
    outputs: ArrayBuffer[]
  ): CPUComputeTask {
    // Analyze kernel to determine operation type
    const kernelSource = kernel.source.toLowerCase();
    
    let operation: CPUComputeTask['operation'] = 'custom';
    let config: any = {};
    
    if (kernelSource.includes('matrix') || kernelSource.includes('matmul')) {
      operation = 'matmul';
      // Try to extract matrix dimensions from kernel
      config = this.extractMatrixDimensions(kernel.source);
    } else if (kernelSource.includes('vector') && kernelSource.includes('add')) {
      operation = 'vectoradd';
    } else if (kernelSource.includes('conv')) {
      operation = 'convolution';
      config = this.extractConvolutionConfig(kernel.source);
    } else if (kernelSource.includes('relu') || kernelSource.includes('activation')) {
      operation = 'activation';
      config = { type: 'relu' };
    }
    
    return {
      id: `cpu-task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      operation,
      inputs,
      outputs,
      config,
      priority: 'medium'
    };
  }

  private extractMatrixDimensions(kernelSource: string): any {
    // Simple pattern matching to extract matrix dimensions
    // This would need to be more sophisticated for real WGSL parsing
    const patterns = {
      rows: /rows\s*=\s*(\d+)/i,
      cols: /cols\s*=\s*(\d+)/i,
      inner: /inner\s*=\s*(\d+)/i
    };
    
    const config: any = {};
    
    for (const [key, pattern] of Object.entries(patterns)) {
      const match = kernelSource.match(pattern);
      if (match) {
        config[key] = parseInt(match[1]);
      }
    }
    
    // Default values if not found
    return {
      rowsA: config.rows || 64,
      colsA: config.inner || 64,
      colsB: config.cols || 64
    };
  }

  private extractConvolutionConfig(kernelSource: string): any {
    // Extract convolution parameters
    return {
      inputHeight: 224,
      inputWidth: 224,
      kernelSize: 3,
      stride: 1,
      padding: 1
    };
  }

  private async executeCPUTask(task: CPUComputeTask): Promise<any> {
    return new Promise((resolve, reject) => {
      // Find available worker
      const availableWorker = this.workers[0]; // Simple round-robin for now
      
      if (!availableWorker) {
        reject(new Error('No available CPU workers'));
        return;
      }
      
      // Store the promise resolvers
      (this.activeTasks.get(task.id) as any) = { resolve, reject };
      
      // Set timeout
      const timeout = setTimeout(() => {
        this.activeTasks.delete(task.id);
        reject(new Error('CPU task timeout'));
      }, this.config.taskTimeout);
      
      // Override promise to clear timeout
      const originalResolve = resolve;
      const originalReject = reject;
      
      (this.activeTasks.get(task.id) as any).resolve = (result: any) => {
        clearTimeout(timeout);
        originalResolve(result);
      };
      
      (this.activeTasks.get(task.id) as any).reject = (error: any) => {
        clearTimeout(timeout);
        originalReject(error);
      };
      
      // Send task to worker
      availableWorker.postMessage({
        taskId: task.id,
        operation: task.operation,
        inputs: task.inputs,
        config: task.config
      });
      
      this.activeTasks.set(task.id, { resolve, reject } as any);
    });
  }

  async matrixMultiply(
    a: Float32Array,
    b: Float32Array,
    rows: number,
    cols: number,
    inner: number
  ): Promise<Float32Array> {
    const task: CPUComputeTask = {
      id: `matmul-${Date.now()}`,
      operation: 'matmul',
      inputs: [a.buffer, b.buffer],
      outputs: [new ArrayBuffer(rows * cols * 4)],
      config: { rowsA: rows, colsA: inner, colsB: cols },
      priority: 'high'
    };
    
    const result = await this.executeCPUTask(task);
    return new Float32Array(result.result);
  }

  async vectorAdd(a: Float32Array, b: Float32Array): Promise<Float32Array> {
    const length = Math.min(a.length, b.length);
    
    const task: CPUComputeTask = {
      id: `vectoradd-${Date.now()}`,
      operation: 'vectoradd',
      inputs: [a.buffer, b.buffer],
      outputs: [new ArrayBuffer(length * 4)],
      config: {},
      priority: 'high'
    };
    
    const result = await this.executeCPUTask(task);
    return new Float32Array(result.result);
  }

  private calculateThroughput(inputs: ArrayBuffer[], outputs: ArrayBuffer[], timeMs: number): number {
    const totalBytes = inputs.reduce((sum, buffer) => sum + buffer.byteLength, 0) +
                      outputs.reduce((sum, buffer) => sum + buffer.byteLength, 0);
    return (totalBytes / 1024 / 1024) / (timeMs / 1000); // MB/s
  }

  isAvailable(): boolean {
    return this.workers.length > 0;
  }

  getCapabilities(): {
    maxWorkers: number;
    simdSupported: boolean;
    wasmSupported: boolean;
    estimatedPerformance: number;
  } {
    return {
      maxWorkers: this.workers.length,
      simdSupported: this.simdSupported,
      wasmSupported: this.wasmSupported,
      estimatedPerformance: this.workers.length * (this.wasmSupported ? 2 : 1)
    };
  }

  getPerformanceMetrics(): GPUPerformanceMetrics[] {
    return this.performanceMonitor.getMetrics();
  }

  async benchmark(): Promise<{
    matrixMultiplyTime: number;
    vectorAddTime: number;
    throughput: number;
  }> {
    console.log('Running CPU fallback benchmark...');
    
    const size = 1024;
    const a = new Float32Array(size * size).fill(1);
    const b = new Float32Array(size * size).fill(2);
    
    // Matrix multiply benchmark
    const matmulStart = performance.now();
    await this.matrixMultiply(a, b, size, size, size);
    const matrixMultiplyTime = performance.now() - matmulStart;
    
    // Vector add benchmark
    const va = new Float32Array(size * 1000).fill(1);
    const vb = new Float32Array(size * 1000).fill(2);
    
    const vectorStart = performance.now();
    await this.vectorAdd(va, vb);
    const vectorAddTime = performance.now() - vectorStart;
    
    const totalTime = matrixMultiplyTime + vectorAddTime;
    const totalBytes = (a.byteLength + b.byteLength + va.byteLength + vb.byteLength) * 2;
    const throughput = (totalBytes / 1024 / 1024) / (totalTime / 1000);
    
    console.log(`CPU Benchmark Results:`);
    console.log(`  Matrix Multiply: ${matrixMultiplyTime.toFixed(2)}ms`);
    console.log(`  Vector Add: ${vectorAddTime.toFixed(2)}ms`);
    console.log(`  Throughput: ${throughput.toFixed(2)} MB/s`);
    
    return {
      matrixMultiplyTime,
      vectorAddTime,
      throughput
    };
  }

  updateConfig(newConfig: Partial<CPUWorkerConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Reinitialize workers if maxWorkers changed
    if (newConfig.maxWorkers && newConfig.maxWorkers !== this.workers.length) {
      this.cleanup();
      this.initializeWorkers();
    }
  }

  cleanup(): void {
    // Terminate all workers
    this.workers.forEach(worker => {
      worker.terminate();
    });
    this.workers.length = 0;
    
    // Clear active tasks
    this.activeTasks.clear();
    this.taskQueue.length = 0;
    
    console.log('CPU fallback backend cleaned up');
  }
}