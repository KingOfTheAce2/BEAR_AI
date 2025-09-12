import { GPUCapabilities, GPUVendor, GPUTier, MemoryInfo, ComputeCapabilities } from '../types/gpuTypes';

export interface HardwareInfo {
  gpu: GPUCapabilities;
  memory: MemoryInfo;
  compute: ComputeCapabilities;
  webglSupported: boolean;
  webgpuSupported: boolean;
  preferredBackend: 'webgpu' | 'webgl' | 'cpu';
}

export class HardwareDetection {
  private static instance: HardwareDetection;
  private hardwareInfo: HardwareInfo | null = null;
  private detectionPromise: Promise<HardwareInfo> | null = null;

  static getInstance(): HardwareDetection {
    if (!HardwareDetection.instance) {
      HardwareDetection.instance = new HardwareDetection();
    }
    return HardwareDetection.instance;
  }

  async detectHardware(): Promise<HardwareInfo> {
    if (this.hardwareInfo) {
      return this.hardwareInfo;
    }

    if (this.detectionPromise) {
      return this.detectionPromise;
    }

    this.detectionPromise = this.performDetection();
    this.hardwareInfo = await this.detectionPromise;
    return this.hardwareInfo;
  }

  private async performDetection(): Promise<HardwareInfo> {
    const webglSupported = this.detectWebGL();
    const webgpuSupported = await this.detectWebGPU();
    const gpu = await this.detectGPUCapabilities(webglSupported, webgpuSupported);
    const memory = await this.detectMemoryInfo();
    const compute = this.detectComputeCapabilities(gpu, webglSupported, webgpuSupported);
    
    const preferredBackend = this.determinePreferredBackend(
      webglSupported,
      webgpuSupported,
      gpu
    );

    return {
      gpu,
      memory,
      compute,
      webglSupported,
      webgpuSupported,
      preferredBackend
    };
  }

  private detectWebGL(): boolean {
    try {
      const canvas = document.createElement('canvas');
      const contexts = ['webgl2', 'webgl', 'experimental-webgl'];
      
      for (const contextId of contexts) {
        const gl = canvas.getContext(contextId as any);
        if (gl) {
          return true;
        }
      }
      return false;
    } catch (error) {
      console.warn('WebGL detection failed:', error);
      return false;
    }
  }

  private async detectWebGPU(): Promise<boolean> {
    try {
      if (!('gpu' in navigator)) {
        return false;
      }
      
      const adapter = await (navigator as any).gpu?.requestAdapter();
      return !!adapter;
    } catch (error) {
      console.warn('WebGPU detection failed:', error);
      return false;
    }
  }

  private async detectGPUCapabilities(
    webglSupported: boolean,
    webgpuSupported: boolean
  ): Promise<GPUCapabilities> {
    let vendor: GPUVendor = 'unknown';
    let tier: GPUTier = 'low';
    let maxTextureSize = 0;
    let maxComputeWorkgroupSize = 0;
    let shaderVersion = '';

    if (webgpuSupported) {
      try {
        const adapter = await (navigator as any).gpu?.requestAdapter();
        if (adapter) {
          const info = adapter.info || adapter;
          vendor = this.parseVendor(info.vendor || info.description || '');
          tier = this.determineTier(info);
          maxComputeWorkgroupSize = adapter.limits?.maxComputeWorkgroupSizeX || 256;
          maxTextureSize = adapter.limits?.maxTextureDimension2D || 4096;
          shaderVersion = 'WGSL';
        }
      } catch (error) {
        console.warn('WebGPU capability detection failed:', error);
      }
    }

    if (webglSupported && !maxTextureSize) {
      try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
        if (gl) {
          maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
          const renderer = gl.getParameter(gl.RENDERER);
          vendor = this.parseVendor(renderer);
          tier = this.determineTierFromRenderer(renderer);
          shaderVersion = gl.getParameter(gl.SHADING_LANGUAGE_VERSION);
        }
      } catch (error) {
        console.warn('WebGL capability detection failed:', error);
      }
    }

    return {
      vendor,
      tier,
      maxTextureSize: maxTextureSize || 2048,
      maxComputeWorkgroupSize: maxComputeWorkgroupSize || 256,
      shaderVersion: shaderVersion || 'unknown',
      supportsFloat32: true, // Assume support for modern browsers
      supportsCompute: webgpuSupported
    };
  }

  private async detectMemoryInfo(): Promise<MemoryInfo> {
    let totalMemory = 0;
    let usedMemory = 0;
    let freeMemory = 0;

    // Try to get memory info from various sources
    try {
      // Performance memory API
      const perfMemory = (performance as any).memory;
      if (perfMemory) {
        totalMemory = perfMemory.jsHeapSizeLimit;
        usedMemory = perfMemory.usedJSHeapSize;
        freeMemory = totalMemory - usedMemory;
      }

      // Navigator device memory (experimental)
      const deviceMemory = (navigator as any).deviceMemory;
      if (deviceMemory) {
        totalMemory = Math.max(totalMemory, deviceMemory * 1024 * 1024 * 1024);
      }

      // Fallback estimates
      if (!totalMemory) {
        totalMemory = 2 * 1024 * 1024 * 1024; // 2GB default
        freeMemory = totalMemory * 0.7; // Assume 70% free
      }
    } catch (error) {
      console.warn('Memory detection failed:', error);
      totalMemory = 2 * 1024 * 1024 * 1024;
      freeMemory = totalMemory * 0.7;
    }

    return {
      totalMemory,
      freeMemory,
      usedMemory,
      gpuMemory: totalMemory * 0.25 // Estimate 25% for GPU
    };
  }

  private detectComputeCapabilities(
    gpu: GPUCapabilities,
    webglSupported: boolean,
    webgpuSupported: boolean
  ): ComputeCapabilities {
    return {
      supportsParallelCompute: webgpuSupported,
      maxWorkgroupSize: gpu.maxComputeWorkgroupSize,
      preferredWorkgroupSize: Math.min(256, gpu.maxComputeWorkgroupSize),
      supportsSharedMemory: webgpuSupported,
      supportsFP16: gpu.tier !== 'low',
      supportsFP32: true,
      maxBufferSize: webgpuSupported ? 1024 * 1024 * 1024 : 256 * 1024 * 1024,
      concurrentKernels: webgpuSupported ? 4 : 1
    };
  }

  private parseVendor(description: string): GPUVendor {
    const lower = description.toLowerCase();
    if (lower.includes('nvidia')) return 'nvidia';
    if (lower.includes('amd') || lower.includes('radeon')) return 'amd';
    if (lower.includes('intel')) return 'intel';
    if (lower.includes('apple') || lower.includes('m1') || lower.includes('m2')) return 'apple';
    return 'unknown';
  }

  private determineTier(adapterInfo: any): GPUTier {
    const description = (adapterInfo.description || '').toLowerCase();
    
    // High-end indicators
    if (description.includes('rtx') || 
        description.includes('gtx 1080') ||
        description.includes('gtx 1070') ||
        description.includes('rx 6') ||
        description.includes('rx 7') ||
        description.includes('m1 max') ||
        description.includes('m2 max')) {
      return 'high';
    }
    
    // Medium-end indicators
    if (description.includes('gtx') ||
        description.includes('rx 5') ||
        description.includes('rx 4') ||
        description.includes('m1') ||
        description.includes('m2') ||
        description.includes('iris')) {
      return 'medium';
    }
    
    return 'low';
  }

  private determineTierFromRenderer(renderer: string): GPUTier {
    return this.determineTier({ description: renderer });
  }

  private determinePreferredBackend(
    webglSupported: boolean,
    webgpuSupported: boolean,
    gpu: GPUCapabilities
  ): 'webgpu' | 'webgl' | 'cpu' {
    if (webgpuSupported && gpu.tier !== 'low') {
      return 'webgpu';
    }
    if (webglSupported) {
      return 'webgl';
    }
    return 'cpu';
  }

  getHardwareInfo(): HardwareInfo | null {
    return this.hardwareInfo;
  }

  async isGPUAvailable(): Promise<boolean> {
    const info = await this.detectHardware();
    return info.webglSupported || info.webgpuSupported;
  }

  async getOptimalConfiguration(): Promise<{
    backend: 'webgpu' | 'webgl' | 'cpu';
    maxBatchSize: number;
    workgroupSize: number;
    memoryLimit: number;
  }> {
    const info = await this.detectHardware();
    
    const memoryLimit = Math.min(
      info.memory.freeMemory * 0.8, // Use 80% of free memory
      info.memory.gpuMemory
    );

    let maxBatchSize = 32;
    let workgroupSize = 64;

    if (info.gpu.tier === 'high') {
      maxBatchSize = 128;
      workgroupSize = 256;
    } else if (info.gpu.tier === 'medium') {
      maxBatchSize = 64;
      workgroupSize = 128;
    }

    return {
      backend: info.preferredBackend,
      maxBatchSize,
      workgroupSize: Math.min(workgroupSize, info.compute.maxWorkgroupSize),
      memoryLimit
    };
  }
}