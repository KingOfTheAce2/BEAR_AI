import { GPUAccelerationResult, GPUKernel, GPUComputeTask, WebGLResources, GPUPerformanceMetrics } from '../types/gpuTypes';
import { GPUMemoryManager } from '../memory/memoryManager';
import { PerformanceMonitor } from '../monitoring/performanceMonitor';

export class WebGLBackend {
  private static instance: WebGLBackend;
  private gl: WebGL2RenderingContext | WebGLRenderingContext | null = null;
  private memoryManager: GPUMemoryManager | null = null;
  private performanceMonitor: PerformanceMonitor;
  private isInitialized = false;
  private resources: WebGLResources | null = null;
  private programCache = new Map<string, WebGLProgram>();
  private transformFeedback: WebGLTransformFeedback | null = null;
  private computeExtension: any = null;

  private constructor() {
    this.performanceMonitor = new PerformanceMonitor();
  }

  static getInstance(): WebGLBackend {
    if (!WebGLBackend.instance) {
      WebGLBackend.instance = new WebGLBackend();
    }
    return WebGLBackend.instance;
  }

  async initialize(): Promise<boolean> {
    if (this.isInitialized) {
      return true;
    }

    try {
      const canvas = document.createElement('canvas');
      
      // Try WebGL2 first, then fall back to WebGL1
      this.gl = canvas.getContext('webgl2', {
        powerPreference: 'high-performance',
        antialias: false,
        depth: false,
        stencil: false,
        preserveDrawingBuffer: false
      }) as WebGL2RenderingContext;

      if (!this.gl) {
        this.gl = canvas.getContext('webgl', {
          powerPreference: 'high-performance',
          antialias: false,
          depth: false,
          stencil: false,
          preserveDrawingBuffer: false
        }) as WebGLRenderingContext;
      }

      if (!this.gl) {
        console.warn('WebGL not supported');
        return false;
      }

      // Check for compute shader support (WebGL 2.0 with extensions)
      if (this.gl instanceof WebGL2RenderingContext) {
        this.transformFeedback = this.gl.createTransformFeedback();
        // Check for compute shader extension (not yet standard)
        this.computeExtension = this.gl.getExtension('WEBGL_compute_shader');
      }

      // Enable required extensions
      this.enableExtensions();

      // Initialize memory manager
      const deviceMemory = 512 * 1024 * 1024; // 512MB default for WebGL
      this.memoryManager = GPUMemoryManager.getInstance('webgl', deviceMemory);

      // Store global reference
      (window as any).webglContext = this.gl;

      this.resources = {
        gl: this.gl,
        program: null as any,
        buffers: [],
        textures: [],
        framebuffers: []
      };

      this.isInitialized = true;
      console.log('WebGL backend initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize WebGL:', error);
      return false;
    }
  }

  private enableExtensions(): void {
    if (!this.gl) return;

    const extensions = [
      'OES_texture_float',
      'OES_texture_float_linear',
      'WEBGL_color_buffer_float',
      'EXT_color_buffer_float',
      'OES_element_index_uint',
      'WEBGL_depth_texture'
    ];

    extensions.forEach(ext => {
      const extension = this.gl!.getExtension(ext);
      if (extension) {
        console.log(`WebGL extension enabled: ${ext}`);
      }
    });
  }

  async compileShader(source: string, type: 'vertex' | 'fragment' | 'compute'): Promise<WebGLShader | null> {
    if (!this.gl) {
      throw new Error('WebGL not initialized');
    }

    const shaderType = type === 'vertex' ? this.gl.VERTEX_SHADER : 
                      type === 'fragment' ? this.gl.FRAGMENT_SHADER :
                      this.computeExtension ? this.computeExtension.COMPUTE_SHADER :
                      this.gl.FRAGMENT_SHADER; // Fallback to fragment for compute emulation

    const shader = this.gl.createShader(shaderType);
    if (!shader) {
      throw new Error('Failed to create shader');
    }

    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);

    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      const error = this.gl.getShaderInfoLog(shader);
      this.gl.deleteShader(shader);
      throw new Error(`Shader compilation failed: ${error}`);
    }

    return shader;
  }

  async compileProgram(vertexSource: string, fragmentSource: string): Promise<WebGLProgram | null> {
    if (!this.gl) {
      throw new Error('WebGL not initialized');
    }

    const cacheKey = this.hashSources(vertexSource + fragmentSource);
    if (this.programCache.has(cacheKey)) {
      return this.programCache.get(cacheKey)!;
    }

    try {
      const startTime = performance.now();

      const vertexShader = await this.compileShader(vertexSource, 'vertex');
      const fragmentShader = await this.compileShader(fragmentSource, 'fragment');

      if (!vertexShader || !fragmentShader) {
        throw new Error('Failed to compile shaders');
      }

      const program = this.gl.createProgram();
      if (!program) {
        throw new Error('Failed to create program');
      }

      this.gl.attachShader(program, vertexShader);
      this.gl.attachShader(program, fragmentShader);
      this.gl.linkProgram(program);

      if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
        const error = this.gl.getProgramInfoLog(program);
        this.gl.deleteProgram(program);
        throw new Error(`Program linking failed: ${error}`);
      }

      // Clean up shaders
      this.gl.deleteShader(vertexShader);
      this.gl.deleteShader(fragmentShader);

      const compilationTime = performance.now() - startTime;
      this.performanceMonitor.recordMetric('shader_compilation_time', compilationTime);

      this.programCache.set(cacheKey, program);
      return program;
    } catch (error) {
      console.error('Failed to compile WebGL program:', error);
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
      if (!this.gl || !this.memoryManager) {
        throw new Error('WebGL not initialized');
      }

      // For WebGL, we need to emulate compute shaders using transform feedback or textures
      if (this.computeExtension) {
        return await this.executeComputeShader(kernel, inputs, outputs, workgroupCount);
      } else {
        return await this.executeEmulatedCompute(kernel, inputs, outputs, workgroupCount);
      }
    } catch (error) {
      const totalTime = performance.now() - startTime;
      metrics.totalTime = totalTime;
      
      return {
        success: false,
        metrics,
        backend: 'webgl',
        error: error as Error,
        fallbackUsed: false
      };
    }
  }

  private async executeComputeShader(
    kernel: GPUKernel,
    inputs: ArrayBuffer[],
    outputs: ArrayBuffer[],
    workgroupCount: [number, number, number]
  ): Promise<GPUAccelerationResult> {
    // Implementation for true compute shaders (if extension is available)
    throw new Error('Native WebGL compute shaders not yet implemented');
  }

  private async executeEmulatedCompute(
    kernel: GPUKernel,
    inputs: ArrayBuffer[],
    outputs: ArrayBuffer[],
    workgroupCount: [number, number, number]
  ): Promise<GPUAccelerationResult> {
    const startTime = performance.now();
    
    try {
      if (!this.gl) {
        throw new Error('WebGL context not available');
      }

      // Convert compute kernel to vertex/fragment shader pair
      const { vertexShader, fragmentShader } = this.convertKernelToShaders(kernel);
      
      const program = await this.compileProgram(vertexShader, fragmentShader);
      if (!program) {
        throw new Error('Failed to compile emulated compute program');
      }

      const memoryTransferStart = performance.now();

      // Create textures for input data
      const inputTextures = await this.createInputTextures(inputs);
      
      // Create framebuffer for output
      const outputFramebuffer = await this.createOutputFramebuffer(outputs[0]);
      
      const memoryTransferTime = performance.now() - memoryTransferStart;

      // Execute the emulated compute
      const computeStart = performance.now();
      
      this.gl.useProgram(program);
      this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, outputFramebuffer);
      
      // Set up viewport
      const width = Math.ceil(Math.sqrt(outputs[0].byteLength / 4)); // Assuming float32
      const height = Math.ceil(outputs[0].byteLength / 4 / width);
      this.gl.viewport(0, 0, width, height);
      
      // Bind input textures
      inputTextures.forEach((texture, index) => {
        this.gl!.activeTexture(this.gl!.TEXTURE0 + index);
        this.gl!.bindTexture(this.gl!.TEXTURE_2D, texture);
        const location = this.gl!.getUniformLocation(program!, `uInput${index}`);
        if (location) {
          this.gl!.uniform1i(location, index);
        }
      });
      
      // Draw full-screen quad
      this.drawFullScreenQuad();
      
      const computeTime = performance.now() - computeStart;

      // Read back results
      const readStart = performance.now();
      const outputArray = new Uint8Array(outputs[0].byteLength);
      this.gl.readPixels(0, 0, width, height, this.gl.RGBA, this.gl.UNSIGNED_BYTE, outputArray);
      new Uint8Array(outputs[0]).set(outputArray);
      const readTime = performance.now() - readStart;

      const totalTime = performance.now() - startTime;
      
      const metrics: GPUPerformanceMetrics = {
        computeTime,
        memoryTransferTime: memoryTransferTime + readTime,
        kernelCompilationTime: 0,
        totalTime,
        throughput: this.calculateThroughput(inputs, outputs, totalTime),
        efficiency: computeTime / totalTime
      };

      // Cleanup
      this.cleanupTextures(inputTextures);
      this.gl.deleteFramebuffer(outputFramebuffer);

      this.performanceMonitor.recordMetrics(metrics);

      return {
        success: true,
        result: outputs,
        metrics,
        backend: 'webgl',
        fallbackUsed: false
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
        backend: 'webgl',
        error: error as Error,
        fallbackUsed: false
      };
    }
  }

  private convertKernelToShaders(kernel: GPUKernel): { vertexShader: string; fragmentShader: string } {
    // Convert WGSL compute shader to WebGL vertex/fragment shaders
    const vertexShader = `
      attribute vec2 aPosition;
      varying vec2 vTexCoord;
      
      void main() {
        gl_Position = vec4(aPosition, 0.0, 1.0);
        vTexCoord = (aPosition + 1.0) / 2.0;
      }
    `;

    // Basic conversion - this would need more sophisticated logic for complex kernels
    const fragmentShader = `
      precision highp float;
      varying vec2 vTexCoord;
      uniform sampler2D uInput0;
      
      void main() {
        vec4 value = texture2D(uInput0, vTexCoord);
        // Simple pass-through for now - would need actual compute logic
        gl_FragColor = value;
      }
    `;

    return { vertexShader, fragmentShader };
  }

  private async createInputTextures(inputs: ArrayBuffer[]): Promise<WebGLTexture[]> {
    if (!this.gl) {
      throw new Error('WebGL context not available');
    }

    const textures: WebGLTexture[] = [];
    
    for (const input of inputs) {
      const texture = this.gl.createTexture();
      if (!texture) {
        throw new Error('Failed to create input texture');
      }
      
      this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
      
      // Calculate texture dimensions
      const width = Math.ceil(Math.sqrt(input.byteLength / 4));
      const height = Math.ceil(input.byteLength / 4 / width);
      
      // Upload data as texture
      const data = new Float32Array(input);
      this.gl.texImage2D(
        this.gl.TEXTURE_2D, 0, this.gl.RGBA,
        width, height, 0,
        this.gl.RGBA, this.gl.FLOAT, data
      );
      
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
      
      textures.push(texture);
    }
    
    return textures;
  }

  private async createOutputFramebuffer(output: ArrayBuffer): Promise<WebGLFramebuffer> {
    if (!this.gl) {
      throw new Error('WebGL context not available');
    }

    const framebuffer = this.gl.createFramebuffer();
    if (!framebuffer) {
      throw new Error('Failed to create output framebuffer');
    }
    
    const texture = this.gl.createTexture();
    if (!texture) {
      throw new Error('Failed to create output texture');
    }
    
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, framebuffer);
    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
    
    const width = Math.ceil(Math.sqrt(output.byteLength / 4));
    const height = Math.ceil(output.byteLength / 4 / width);
    
    this.gl.texImage2D(
      this.gl.TEXTURE_2D, 0, this.gl.RGBA,
      width, height, 0,
      this.gl.RGBA, this.gl.UNSIGNED_BYTE, null
    );
    
    this.gl.framebufferTexture2D(
      this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0,
      this.gl.TEXTURE_2D, texture, 0
    );
    
    return framebuffer;
  }

  private drawFullScreenQuad(): void {
    if (!this.gl) return;

    // Create a simple quad that covers the entire screen
    const vertices = new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
       1,  1
    ]);
    
    const buffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, vertices, this.gl.STATIC_DRAW);
    
    const positionLocation = this.gl.getAttribLocation(this.resources!.program, 'aPosition');
    this.gl.enableVertexAttribArray(positionLocation);
    this.gl.vertexAttribPointer(positionLocation, 2, this.gl.FLOAT, false, 0, 0);
    
    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
    
    this.gl.deleteBuffer(buffer);
  }

  private cleanupTextures(textures: WebGLTexture[]): void {
    if (!this.gl) return;
    
    textures.forEach(texture => {
      this.gl!.deleteTexture(texture);
    });
  }

  async matrixMultiply(
    a: Float32Array,
    b: Float32Array,
    rows: number,
    cols: number,
    inner: number
  ): Promise<Float32Array> {
    // Implement matrix multiplication using WebGL textures
    const result = new Float32Array(rows * cols);
    
    // For now, fallback to CPU implementation
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        let sum = 0;
        for (let k = 0; k < inner; k++) {
          sum += a[i * inner + k] * b[k * cols + j];
        }
        result[i * cols + j] = sum;
      }
    }
    
    return result;
  }

  async vectorAdd(a: Float32Array, b: Float32Array): Promise<Float32Array> {
    const length = Math.min(a.length, b.length);
    const result = new Float32Array(length);
    
    // Simple CPU fallback for vector addition
    for (let i = 0; i < length; i++) {
      result[i] = a[i] + b[i];
    }
    
    return result;
  }

  private calculateThroughput(inputs: ArrayBuffer[], outputs: ArrayBuffer[], timeMs: number): number {
    const totalBytes = inputs.reduce((sum, buffer) => sum + buffer.byteLength, 0) +
                      outputs.reduce((sum, buffer) => sum + buffer.byteLength, 0);
    return (totalBytes / 1024 / 1024) / (timeMs / 1000); // MB/s
  }

  private hashSources(sources: string): string {
    let hash = 0;
    for (let i = 0; i < sources.length; i++) {
      const char = sources.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(16);
  }

  getContext(): WebGL2RenderingContext | WebGLRenderingContext | null {
    return this.gl;
  }

  getResources(): WebGLResources | null {
    return this.resources;
  }

  isAvailable(): boolean {
    return this.isInitialized && !!this.gl;
  }

  getPerformanceMetrics(): GPUPerformanceMetrics[] {
    return this.performanceMonitor.getMetrics();
  }

  clearCache(): void {
    this.programCache.clear();
  }

  async cleanup(): Promise<void> {
    if (this.memoryManager) {
      await this.memoryManager.cleanup();
    }
    
    this.clearCache();
    
    if (this.gl && this.resources) {
      // Clean up WebGL resources
      this.resources.buffers.forEach(buffer => this.gl!.deleteBuffer(buffer));
      this.resources.textures.forEach(texture => this.gl!.deleteTexture(texture));
      this.resources.framebuffers.forEach(fb => this.gl!.deleteFramebuffer(fb));
    }
    
    this.isInitialized = false;
    this.gl = null;
    this.resources = null;
  }
}