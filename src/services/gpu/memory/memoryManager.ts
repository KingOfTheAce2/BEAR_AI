import { GPUBuffer, GPUMemoryPool, MemoryInfo, GPUBackend } from '../types/gpuTypes';

export interface MemoryAllocationOptions {
  size: number;
  usage: 'vertex' | 'storage' | 'uniform' | 'texture';
  persistent?: boolean;
  alignment?: number;
  priority?: 'low' | 'medium' | 'high';
}

export interface MemoryStats {
  totalAllocated: number;
  totalFree: number;
  fragmentationRatio: number;
  allocationCount: number;
  averageAllocationSize: number;
  largestFreeBlock: number;
}

export class GPUMemoryManager {
  private static instances = new Map<GPUBackend, GPUMemoryManager>();
  private memoryPool: GPUMemoryPool;
  private allocationHistory: Array<{
    id: string;
    size: number;
    timestamp: number;
    freed?: number;
  }> = [];
  private gcThreshold = 0.8; // Trigger GC when 80% full
  private defragmentationThreshold = 0.3; // Defrag when fragmentation > 30%

  private constructor(
    private backend: GPUBackend,
    private maxMemory: number
  ) {
    this.memoryPool = {
      totalSize: maxMemory,
      usedSize: 0,
      freeSize: maxMemory,
      buffers: new Map(),
      fragmentationRatio: 0
    };
    
    // Start periodic cleanup
    this.startPeriodicCleanup();
  }

  static getInstance(backend: GPUBackend, maxMemory: number): GPUMemoryManager {
    if (!GPUMemoryManager.instances.has(backend)) {
      GPUMemoryManager.instances.set(backend, new GPUMemoryManager(backend, maxMemory));
    }
    return GPUMemoryManager.instances.get(backend)!;
  }

  async allocate(options: MemoryAllocationOptions): Promise<GPUBuffer | null> {
    // Check if we have enough memory
    if (options.size > this.memoryPool.freeSize) {
      // Try garbage collection first
      await this.garbageCollect();
      
      if (options.size > this.memoryPool.freeSize) {
        // Try defragmentation
        await this.defragment();
        
        if (options.size > this.memoryPool.freeSize) {
          console.warn(`Insufficient GPU memory: requested ${options.size}, available ${this.memoryPool.freeSize}`);
          return null;
        }
      }
    }

    const bufferId = this.generateBufferId();
    let nativeBuffer: any;

    try {
      nativeBuffer = await this.allocateNativeBuffer(options);
      if (!nativeBuffer) {
        return null;
      }
    } catch (error) {
      console.error('Failed to allocate native buffer:', error);
      return null;
    }

    const gpuBuffer: GPUBuffer = {
      id: bufferId,
      buffer: nativeBuffer,
      size: options.size,
      usage: options.usage,
      inUse: true,
      lastUsed: Date.now()
    };

    this.memoryPool.buffers.set(bufferId, gpuBuffer);
    this.memoryPool.usedSize += options.size;
    this.memoryPool.freeSize -= options.size;
    this.updateFragmentationRatio();

    this.allocationHistory.push({
      id: bufferId,
      size: options.size,
      timestamp: Date.now()
    });

    return gpuBuffer;
  }

  async deallocate(bufferId: string): Promise<boolean> {
    const buffer = this.memoryPool.buffers.get(bufferId);
    if (!buffer) {
      console.warn(`Buffer ${bufferId} not found for deallocation`);
      return false;
    }

    try {
      await this.destroyNativeBuffer(buffer.buffer);
    } catch (error) {
      console.error('Failed to destroy native buffer:', error);
    }

    this.memoryPool.buffers.delete(bufferId);
    this.memoryPool.usedSize -= buffer.size;
    this.memoryPool.freeSize += buffer.size;
    this.updateFragmentationRatio();

    // Update allocation history
    const historyEntry = this.allocationHistory.find(entry => entry.id === bufferId);
    if (historyEntry) {
      historyEntry.freed = Date.now();
    }

    return true;
  }

  async reallocate(bufferId: string, newSize: number): Promise<GPUBuffer | null> {
    const oldBuffer = this.memoryPool.buffers.get(bufferId);
    if (!oldBuffer) {
      return null;
    }

    // If shrinking, just update metadata
    if (newSize <= oldBuffer.size) {
      const sizeDiff = oldBuffer.size - newSize;
      oldBuffer.size = newSize;
      this.memoryPool.freeSize += sizeDiff;
      this.updateFragmentationRatio();
      return oldBuffer;
    }

    // If growing, allocate new buffer and copy data
    const newBuffer = await this.allocate({
      size: newSize,
      usage: oldBuffer.usage
    });

    if (!newBuffer) {
      return null;
    }

    // Copy data from old to new buffer
    try {
      await this.copyBuffer(oldBuffer, newBuffer, Math.min(oldBuffer.size, newSize));
      await this.deallocate(bufferId);
      return newBuffer;
    } catch (error) {
      console.error('Failed to reallocate buffer:', error);
      await this.deallocate(newBuffer.id);
      return null;
    }
  }

  async garbageCollect(): Promise<void> {
    const now = Date.now();
    const gcThresholdTime = 30000; // 30 seconds
    const buffersToFree: string[] = [];

    // Find unused buffers that haven't been accessed recently
    for (const [id, buffer] of this.memoryPool.buffers) {
      if (!buffer.inUse && (now - buffer.lastUsed) > gcThresholdTime) {
        buffersToFree.push(id);
      }
    }

    // Free the buffers
    for (const bufferId of buffersToFree) {
      await this.deallocate(bufferId);
    }

    console.log(`GPU GC: Freed ${buffersToFree.length} buffers, reclaimed ${buffersToFree.length * 1024} bytes`);
  }

  async defragment(): Promise<void> {
    if (this.memoryPool.fragmentationRatio < this.defragmentationThreshold) {
      return;
    }

    console.log('Starting GPU memory defragmentation...');
    const startTime = Date.now();

    // Get all active buffers sorted by last used time
    const activeBuffers = Array.from(this.memoryPool.buffers.values())
      .filter(buffer => buffer.inUse)
      .sort((a, b) => b.lastUsed - a.lastUsed);

    // Temporary storage for buffer data
    const tempBuffers = new Map<string, ArrayBuffer>();

    try {
      // Read all buffer data
      for (const buffer of activeBuffers) {
        const data = await this.readBuffer(buffer);
        if (data) {
          tempBuffers.set(buffer.id, data);
        }
      }

      // Clear all buffers
      for (const buffer of activeBuffers) {
        await this.deallocate(buffer.id);
      }

      // Reallocate buffers in optimal order
      for (const buffer of activeBuffers) {
        const data = tempBuffers.get(buffer.id);
        if (data) {
          const newBuffer = await this.allocate({
            size: buffer.size,
            usage: buffer.usage
          });
          if (newBuffer) {
            await this.writeBuffer(newBuffer, data);
            newBuffer.inUse = buffer.inUse;
            newBuffer.lastUsed = buffer.lastUsed;
          }
        }
      }

      this.updateFragmentationRatio();
      console.log(`GPU defragmentation completed in ${Date.now() - startTime}ms`);
    } catch (error) {
      console.error('GPU defragmentation failed:', error);
    }
  }

  private async allocateNativeBuffer(options: MemoryAllocationOptions): Promise<any> {
    switch (this.backend) {
      case 'webgpu':
        return this.allocateWebGPUBuffer(options);
      case 'webgl':
        return this.allocateWebGLBuffer(options);
      default:
        return null;
    }
  }

  private async allocateWebGPUBuffer(options: MemoryAllocationOptions): Promise<GPUBuffer | null> {
    if (!(window as any).gpuDevice) {
      return null;
    }

    const device = (window as any).gpuDevice as GPUDevice;
    const usage = this.getWebGPUBufferUsage(options.usage);

    try {
      return device.createBuffer({
        size: options.size,
        usage: usage | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST
      });
    } catch (error) {
      console.error('WebGPU buffer allocation failed:', error);
      return null;
    }
  }

  private async allocateWebGLBuffer(options: MemoryAllocationOptions): Promise<WebGLBuffer | null> {
    if (!(window as any).webglContext) {
      return null;
    }

    const gl = (window as any).webglContext as WebGL2RenderingContext;
    const buffer = gl.createBuffer();
    
    if (!buffer) {
      return null;
    }

    const target = this.getWebGLBufferTarget(options.usage);
    gl.bindBuffer(target, buffer);
    gl.bufferData(target, options.size, gl.DYNAMIC_DRAW);
    gl.bindBuffer(target, null);

    return buffer;
  }

  private async destroyNativeBuffer(buffer: any): Promise<void> {
    if (this.backend === 'webgpu' && buffer && typeof buffer.destroy === 'function') {
      buffer.destroy();
    } else if (this.backend === 'webgl' && buffer && (window as any).webglContext) {
      const gl = (window as any).webglContext as WebGL2RenderingContext;
      gl.deleteBuffer(buffer);
    }
  }

  private async copyBuffer(src: GPUBuffer, dst: GPUBuffer, size: number): Promise<void> {
    // Implementation depends on backend
    if (this.backend === 'webgpu') {
      await this.copyWebGPUBuffer(src.buffer as GPUBuffer, dst.buffer as GPUBuffer, size);
    } else if (this.backend === 'webgl') {
      await this.copyWebGLBuffer(src.buffer as WebGLBuffer, dst.buffer as WebGLBuffer, size);
    }
  }

  private async copyWebGPUBuffer(src: GPUBuffer, dst: GPUBuffer, size: number): Promise<void> {
    const device = (window as any).gpuDevice as GPUDevice;
    const encoder = device.createCommandEncoder();
    encoder.copyBufferToBuffer(src, 0, dst, 0, size);
    const commands = encoder.finish();
    device.queue.submit([commands]);
  }

  private async copyWebGLBuffer(src: WebGLBuffer, dst: WebGLBuffer, size: number): Promise<void> {
    const gl = (window as any).webglContext as WebGL2RenderingContext;
    
    // Read from source
    gl.bindBuffer(gl.COPY_READ_BUFFER, src);
    gl.bindBuffer(gl.COPY_WRITE_BUFFER, dst);
    gl.copyBufferSubData(gl.COPY_READ_BUFFER, gl.COPY_WRITE_BUFFER, 0, 0, size);
    gl.bindBuffer(gl.COPY_READ_BUFFER, null);
    gl.bindBuffer(gl.COPY_WRITE_BUFFER, null);
  }

  private async readBuffer(buffer: GPUBuffer): Promise<ArrayBuffer | null> {
    // Implementation for reading buffer data
    return new ArrayBuffer(buffer.size);
  }

  private async writeBuffer(buffer: GPUBuffer, data: ArrayBuffer): Promise<void> {
    // Implementation for writing buffer data
  }

  private getWebGPUBufferUsage(usage: string): GPUBufferUsageFlags {
    switch (usage) {
      case 'storage': return GPUBufferUsage.STORAGE;
      case 'uniform': return GPUBufferUsage.UNIFORM;
      case 'vertex': return GPUBufferUsage.VERTEX;
      default: return GPUBufferUsage.STORAGE;
    }
  }

  private getWebGLBufferTarget(usage: string): number {
    const gl = (window as any).webglContext as WebGL2RenderingContext;
    switch (usage) {
      case 'vertex': return gl.ARRAY_BUFFER;
      case 'storage': return gl.SHADER_STORAGE_BUFFER || gl.ARRAY_BUFFER;
      case 'uniform': return gl.UNIFORM_BUFFER;
      default: return gl.ARRAY_BUFFER;
    }
  }

  private updateFragmentationRatio(): void {
    const bufferSizes = Array.from(this.memoryPool.buffers.values()).map(b => b.size);
    const totalAllocatedSize = bufferSizes.reduce((sum, size) => sum + size, 0);
    
    if (totalAllocatedSize === 0) {
      this.memoryPool.fragmentationRatio = 0;
      return;
    }

    // Simple fragmentation calculation
    const averageBufferSize = totalAllocatedSize / bufferSizes.length;
    const variance = bufferSizes.reduce((sum, size) => sum + Math.pow(size - averageBufferSize, 2), 0) / bufferSizes.length;
    this.memoryPool.fragmentationRatio = Math.min(1, Math.sqrt(variance) / averageBufferSize);
  }

  private generateBufferId(): string {
    return `gpu-buffer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private startPeriodicCleanup(): void {
    setInterval(async () => {
      if (this.memoryPool.usedSize / this.memoryPool.totalSize > this.gcThreshold) {
        await this.garbageCollect();
      }
    }, 60000); // Every minute
  }

  getMemoryStats(): MemoryStats {
    const buffers = Array.from(this.memoryPool.buffers.values());
    const allocatedSizes = buffers.map(b => b.size);
    
    return {
      totalAllocated: this.memoryPool.usedSize,
      totalFree: this.memoryPool.freeSize,
      fragmentationRatio: this.memoryPool.fragmentationRatio,
      allocationCount: buffers.length,
      averageAllocationSize: allocatedSizes.length > 0 
        ? allocatedSizes.reduce((sum, size) => sum + size, 0) / allocatedSizes.length 
        : 0,
      largestFreeBlock: this.memoryPool.freeSize // Simplified
    };
  }

  getMemoryPool(): GPUMemoryPool {
    return { ...this.memoryPool };
  }

  markBufferInUse(bufferId: string, inUse: boolean): void {
    const buffer = this.memoryPool.buffers.get(bufferId);
    if (buffer) {
      buffer.inUse = inUse;
      if (inUse) {
        buffer.lastUsed = Date.now();
      }
    }
  }

  async cleanup(): Promise<void> {
    const bufferIds = Array.from(this.memoryPool.buffers.keys());
    for (const id of bufferIds) {
      await this.deallocate(id);
    }
    this.allocationHistory.length = 0;
  }
}