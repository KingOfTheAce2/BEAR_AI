import { GPUAccelerationResult, GPUKernel, GPUComputeTask, WebGPUResources, GPUPerformanceMetrics } from '../types/gpuTypes';
import { GPUMemoryManager } from '../memory/memoryManager';
import { PerformanceMonitor } from '../monitoring/performanceMonitor';

export class WebGPUBackend {
  private static instance: WebGPUBackend;
  private adapter: GPUAdapter | null = null;
  private device: GPUDevice | null = null;
  private queue: GPUQueue | null = null;
  private memoryManager: GPUMemoryManager | null = null;
  private performanceMonitor: PerformanceMonitor;
  private isInitialized = false;
  private resources: WebGPUResources | null = null;
  private kernelCache = new Map<string, GPUComputePipeline>();
  private bindGroupCache = new Map<string, GPUBindGroup>();

  private constructor() {
    this.performanceMonitor = new PerformanceMonitor();
  }

  static getInstance(): WebGPUBackend {
    if (!WebGPUBackend.instance) {
      WebGPUBackend.instance = new WebGPUBackend();
    }
    return WebGPUBackend.instance;
  }

  async initialize(): Promise<boolean> {
    if (this.isInitialized) {
      return true;
    }

    try {
      // Check WebGPU support
      if (!navigator.gpu) {
        console.warn('WebGPU not supported');
        return false;
      }

      // Request adapter
      this.adapter = await navigator.gpu.requestAdapter({
        powerPreference: 'high-performance'
      });

      if (!this.adapter) {
        console.warn('WebGPU adapter not available');
        return false;
      }

      // Request device
      this.device = await this.adapter.requestDevice({
        requiredFeatures: [],
        requiredLimits: {
          maxStorageBufferBindingSize: this.adapter.limits.maxStorageBufferBindingSize,
          maxComputeWorkgroupStorageSize: this.adapter.limits.maxComputeWorkgroupStorageSize,
          maxComputeInvocationsPerWorkgroup: this.adapter.limits.maxComputeInvocationsPerWorkgroup
        }
      });

      if (!this.device) {
        console.warn('WebGPU device not available');
        return false;
      }

      this.queue = this.device.queue;

      // Set up error handling
      this.device.addEventListener('uncapturederror', (event) => {
        console.error('WebGPU uncaptured error:', event.error);
      });

      // Initialize memory manager
      const deviceMemory = 1024 * 1024 * 1024; // 1GB default
      this.memoryManager = GPUMemoryManager.getInstance('webgpu', deviceMemory);

      // Store global references
      (window as any).gpuDevice = this.device;
      (window as any).gpuQueue = this.queue;

      this.resources = {
        device: this.device,
        queue: this.queue,
        bindGroups: [],
        pipelines: [],
        buffers: []
      };

      this.isInitialized = true;
      console.log('WebGPU backend initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize WebGPU:', error);
      return false;
    }
  }

  async compileKernel(kernel: GPUKernel): Promise<GPUComputePipeline | null> {
    if (!this.device) {
      throw new Error('WebGPU not initialized');
    }

    const cacheKey = `${kernel.name}-${this.hashSource(kernel.source)}`;
    if (this.kernelCache.has(cacheKey)) {
      return this.kernelCache.get(cacheKey)!;
    }

    try {
      const startTime = performance.now();

      const shaderModule = this.device.createShaderModule({
        code: kernel.source
      });

      const pipeline = this.device.createComputePipeline({
        compute: {
          module: shaderModule,
          entryPoint: 'main'
        }
      });

      const compilationTime = performance.now() - startTime;
      this.performanceMonitor.recordMetric('kernel_compilation_time', compilationTime);

      this.kernelCache.set(cacheKey, pipeline);
      return pipeline;
    } catch (error) {
      console.error('Failed to compile WebGPU kernel:', error);
      return null;
    }
  }

  async executeKernel(
    kernel: GPUKernel,
    inputs: ArrayBuffer[],
    outputs: ArrayBuffer[],
    workgroupCount: [number, number, number] = [1, 1, 1]
  ): Promise<GPUAccelerationResult> {
    const startTime = performance.now();
    let metrics: GPUPerformanceMetrics = {
      computeTime: 0,
      memoryTransferTime: 0,
      kernelCompilationTime: 0,
      totalTime: 0,
      throughput: 0,
      efficiency: 0
    };

    try {
      if (!this.device || !this.queue || !this.memoryManager) {
        throw new Error('WebGPU not initialized');
      }

      // Compile kernel if needed
      const pipeline = await this.compileKernel(kernel);
      if (!pipeline) {
        throw new Error('Failed to compile kernel');
      }

      const memoryTransferStart = performance.now();

      // Create input buffers
      const inputBuffers: GPUBuffer[] = [];
      for (let i = 0; i < inputs.length; i++) {
        const buffer = await this.memoryManager.allocate({
          size: inputs[i].byteLength,
          usage: 'storage'
        });
        if (!buffer) {
          throw new Error(`Failed to allocate input buffer ${i}`);
        }
        inputBuffers.push(buffer.buffer as GPUBuffer);
        this.queue.writeBuffer(buffer.buffer as GPUBuffer, 0, inputs[i]);
      }

      // Create output buffers
      const outputBuffers: GPUBuffer[] = [];
      const readBuffers: GPUBuffer[] = [];
      for (let i = 0; i < outputs.length; i++) {
        const buffer = await this.memoryManager.allocate({
          size: outputs[i].byteLength,
          usage: 'storage'
        });
        if (!buffer) {
          throw new Error(`Failed to allocate output buffer ${i}`);
        }
        outputBuffers.push(buffer.buffer as GPUBuffer);
        
        // Create read buffer for output
        const readBuffer = this.device.createBuffer({
          size: outputs[i].byteLength,
          usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
        });
        readBuffers.push(readBuffer);
      }

      const memoryTransferTime = performance.now() - memoryTransferStart;

      // Create bind group
      const bindGroupEntries: GPUBindGroupEntry[] = [];
      
      // Add input buffers
      inputBuffers.forEach((buffer, index) => {
        bindGroupEntries.push({
          binding: index,
          resource: { buffer }
        });
      });
      
      // Add output buffers
      outputBuffers.forEach((buffer, index) => {
        bindGroupEntries.push({
          binding: inputBuffers.length + index,
          resource: { buffer }
        });
      });

      const bindGroup = this.device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: bindGroupEntries
      });

      // Execute compute shader
      const computeStart = performance.now();
      const encoder = this.device.createCommandEncoder();
      const pass = encoder.beginComputePass();
      pass.setPipeline(pipeline);
      pass.setBindGroup(0, bindGroup);
      pass.dispatchWorkgroups(...workgroupCount);
      pass.end();

      // Copy results to read buffers
      outputBuffers.forEach((outputBuffer, index) => {
        encoder.copyBufferToBuffer(
          outputBuffer, 0,
          readBuffers[index], 0,
          outputs[index].byteLength
        );
      });

      const commands = encoder.finish();
      this.queue.submit([commands]);

      // Wait for completion and read results
      await this.device.queue.onSubmittedWorkDone();
      const computeTime = performance.now() - computeStart;

      const readStart = performance.now();
      for (let i = 0; i < readBuffers.length; i++) {
        await readBuffers[i].mapAsync(GPUMapMode.READ);
        const data = new Uint8Array(readBuffers[i].getMappedRange());
        new Uint8Array(outputs[i]).set(data);
        readBuffers[i].unmap();
      }
      const readTime = performance.now() - readStart;

      const totalTime = performance.now() - startTime;
      
      metrics = {
        computeTime,
        memoryTransferTime: memoryTransferTime + readTime,
        kernelCompilationTime: 0, // Already compiled
        totalTime,
        throughput: this.calculateThroughput(inputs, outputs, totalTime),
        efficiency: computeTime / totalTime
      };

      // Cleanup
      inputBuffers.forEach(buffer => buffer.destroy());
      outputBuffers.forEach(buffer => buffer.destroy());
      readBuffers.forEach(buffer => buffer.destroy());

      this.performanceMonitor.recordMetrics(metrics);

      return {
        success: true,
        result: outputs,
        metrics,
        backend: 'webgpu',
        fallbackUsed: false
      };
    } catch (error) {
      const totalTime = performance.now() - startTime;
      metrics.totalTime = totalTime;
      
      return {
        success: false,
        metrics,
        backend: 'webgpu',
        error: error as Error,
        fallbackUsed: false
      };
    }
  }

  async executeComputeTask(task: GPUComputeTask): Promise<GPUAccelerationResult> {
    task.status = 'running';
    task.startTime = Date.now();

    try {
      const workgroupCount: [number, number, number] = [
        Math.ceil(task.inputs.length / (task.kernel.workgroupSize[0] || 64)),
        task.kernel.workgroupSize[1] || 1,
        task.kernel.workgroupSize[2] || 1
      ];

      const result = await this.executeKernel(
        task.kernel,
        task.inputs,
        task.outputs,
        workgroupCount
      );

      task.status = result.success ? 'completed' : 'failed';
      task.endTime = Date.now();
      if (!result.success && result.error) {
        task.error = result.error;
      }

      return result;
    } catch (error) {
      task.status = 'failed';
      task.endTime = Date.now();
      task.error = error as Error;

      return {
        success: false,
        metrics: {
          computeTime: 0,
          memoryTransferTime: 0,
          kernelCompilationTime: 0,
          totalTime: task.endTime - (task.startTime || 0),
          throughput: 0,
          efficiency: 0
        },
        backend: 'webgpu',
        error: error as Error,
        fallbackUsed: false
      };
    }
  }

  async matrixMultiply(
    a: Float32Array,
    b: Float32Array,
    rows: number,
    cols: number,
    inner: number
  ): Promise<Float32Array> {
    const shaderCode = `
      @group(0) @binding(0) var<storage, read> matrixA: array<f32>;
      @group(0) @binding(1) var<storage, read> matrixB: array<f32>;
      @group(0) @binding(2) var<storage, read_write> result: array<f32>;
      
      @compute @workgroup_size(16, 16)
      fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
        let row = global_id.x;
        let col = global_id.y;
        
        if (row >= ${rows}u || col >= ${cols}u) {
          return;
        }
        
        var sum: f32 = 0.0;
        for (var i: u32 = 0u; i < ${inner}u; i++) {
          sum += matrixA[row * ${inner}u + i] * matrixB[i * ${cols}u + col];
        }
        
        result[row * ${cols}u + col] = sum;
      }
    `;

    const kernel: GPUKernel = {
      id: 'matrix-multiply',
      name: 'Matrix Multiplication',
      source: shaderCode,
      workgroupSize: [16, 16, 1],
      backend: 'webgpu'
    };

    const result = new Float32Array(rows * cols);
    const gpuResult = await this.executeKernel(
      kernel,
      [a.buffer, b.buffer],
      [result.buffer],
      [Math.ceil(rows / 16), Math.ceil(cols / 16), 1]
    );

    if (!gpuResult.success) {
      throw new Error('Matrix multiplication failed');
    }

    return result;
  }

  async vectorAdd(a: Float32Array, b: Float32Array): Promise<Float32Array> {
    const length = Math.min(a.length, b.length);
    const shaderCode = `
      @group(0) @binding(0) var<storage, read> vectorA: array<f32>;
      @group(0) @binding(1) var<storage, read> vectorB: array<f32>;
      @group(0) @binding(2) var<storage, read_write> result: array<f32>;
      
      @compute @workgroup_size(256)
      fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
        let index = global_id.x;
        if (index >= ${length}u) {
          return;
        }
        result[index] = vectorA[index] + vectorB[index];
      }
    `;

    const kernel: GPUKernel = {
      id: 'vector-add',
      name: 'Vector Addition',
      source: shaderCode,
      workgroupSize: [256, 1, 1],
      backend: 'webgpu'
    };

    const result = new Float32Array(length);
    const gpuResult = await this.executeKernel(
      kernel,
      [a.buffer, b.buffer],
      [result.buffer],
      [Math.ceil(length / 256), 1, 1]
    );

    if (!gpuResult.success) {
      throw new Error('Vector addition failed');
    }

    return result;
  }

  private calculateThroughput(inputs: ArrayBuffer[], outputs: ArrayBuffer[], timeMs: number): number {
    const totalBytes = inputs.reduce((sum, buffer) => sum + buffer.byteLength, 0) +
                      outputs.reduce((sum, buffer) => sum + buffer.byteLength, 0);
    return (totalBytes / 1024 / 1024) / (timeMs / 1000); // MB/s
  }

  private hashSource(source: string): string {
    let hash = 0;
    for (let i = 0; i < source.length; i++) {
      const char = source.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(16);
  }

  getDevice(): GPUDevice | null {
    return this.device;
  }

  getQueue(): GPUQueue | null {
    return this.queue;
  }

  getResources(): WebGPUResources | null {
    return this.resources;
  }

  isAvailable(): boolean {
    return this.isInitialized && !!this.device;
  }

  getPerformanceMetrics(): GPUPerformanceMetrics[] {
    return this.performanceMonitor.getMetrics();
  }

  clearCache(): void {
    this.kernelCache.clear();
    this.bindGroupCache.clear();
  }

  async cleanup(): Promise<void> {
    if (this.memoryManager) {
      await this.memoryManager.cleanup();
    }
    
    if (this.device) {
      this.device.destroy();
    }
    
    this.clearCache();
    this.isInitialized = false;
    this.adapter = null;
    this.device = null;
    this.queue = null;
    this.resources = null;
  }
}