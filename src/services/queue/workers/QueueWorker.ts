// Web Worker for Queue Processing

import { QueueRequest, RequestStatus, WorkerConfiguration } from '../types';

// Worker message types
interface WorkerMessage {
  type: 'process' | 'cancel' | 'status' | 'configure';
  requestId?: string;
  request?: QueueRequest;
  config?: WorkerConfiguration;
}

interface WorkerResponse {
  type: 'result' | 'error' | 'progress' | 'status';
  requestId: string;
  result?: any;
  error?: string;
  progress?: number;
  status?: RequestStatus;
}

/**
 * Queue Worker class for Web Worker environment
 */
class QueueWorker {
  private config: WorkerConfiguration;
  private activeRequests: Map<string, QueueRequest> = new Map();
  private requestHandlers: Map<string, (request: QueueRequest) => Promise<any>> = new Map();
  private memoryUsage = 0;
  private cpuUsage = 0;

  constructor() {
    this.config = {
      maxConcurrentRequests: 4,
      resourceLimits: {
        cpu: 0.8,
        memory: 512 * 1024 * 1024, // 512MB
        network: 1000, // 1MB/s
        disk: 100 * 1024 * 1024, // 100MB
        concurrency: 4
      },
      workerTimeout: 30000,
      restartOnError: false,
      memoryThreshold: 400 * 1024 * 1024 // 400MB
    };

    this.setupMessageHandler();
    this.setupRequestHandlers();
    this.startResourceMonitoring();
  }

  /**
   * Setup message handler for communication with main thread
   */
  private setupMessageHandler(): void {
    self.addEventListener('message', async (event: MessageEvent<WorkerMessage>) => {
      const { type, requestId, request, config } = event.data;

      try {
        switch (type) {
          case 'configure':
            if (config) {
              this.config = { ...this.config, ...config };
            }
            this.postMessage({ type: 'status', requestId: 'config', status: RequestStatus.COMPLETED });
            break;

          case 'process':
            if (request) {
              await this.processRequest(request);
            }
            break;

          case 'cancel':
            if (requestId) {
              this.cancelRequest(requestId);
            }
            break;

          case 'status':
            this.sendStatus();
            break;
        }
      } catch (error) {
        this.postMessage({
          type: 'error',
          requestId: requestId || 'unknown',
          error: error instanceof Error ? error.message : String(error)
        });
      }
    });
  }

  /**
   * Setup request handlers for different request types
   */
  private setupRequestHandlers(): void {
    // Default request handler
    this.requestHandlers.set('default', this.defaultRequestHandler.bind(this));
    
    // API request handler
    this.requestHandlers.set('api', this.apiRequestHandler.bind(this));
    
    // Computation request handler
    this.requestHandlers.set('compute', this.computeRequestHandler.bind(this));
    
    // File processing handler
    this.requestHandlers.set('file', this.fileProcessingHandler.bind(this));
    
    // Data transformation handler
    this.requestHandlers.set('transform', this.dataTransformHandler.bind(this));
  }

  /**
   * Process a request
   */
  private async processRequest(request: QueueRequest): Promise<void> {
    // Check if we can accept more requests
    if (this.activeRequests.size >= this.config.maxConcurrentRequests) {
      this.postMessage({
        type: 'error',
        requestId: request.id,
        error: 'Worker at capacity'
      });
      return;
    }

    // Check resource limits
    if (!this.checkResourceLimits(request)) {
      this.postMessage({
        type: 'error',
        requestId: request.id,
        error: 'Insufficient resources'
      });
      return;
    }

    this.activeRequests.set(request.id, request);
    
    try {
      // Set timeout
      const timeoutId = setTimeout(() => {
        this.cancelRequest(request.id);
      }, request.timeout || this.config.workerTimeout);

      // Get appropriate handler
      const handler = this.requestHandlers.get(request.type) || 
                    this.requestHandlers.get('default')!;

      // Process request
      const result = await handler(request);
      
      clearTimeout(timeoutId);
      
      this.postMessage({
        type: 'result',
        requestId: request.id,
        result
      });

    } catch (error) {
      this.postMessage({
        type: 'error',
        requestId: request.id,
        error: error instanceof Error ? error.message : String(error)
      });
    } finally {
      this.activeRequests.delete(request.id);
    }
  }

  /**
   * Cancel a request
   */
  private cancelRequest(requestId: string): void {
    const request = this.activeRequests.get(requestId);
    if (request) {
      this.activeRequests.delete(requestId);
      this.postMessage({
        type: 'status',
        requestId,
        status: RequestStatus.CANCELLED
      });
    }
  }

  /**
   * Check if request can be processed within resource limits
   */
  private checkResourceLimits(request: QueueRequest): boolean {
    const required = request.resourceRequirements;
    const limits = this.config.resourceLimits;

    return (
      required.cpu <= limits.cpu &&
      required.memory <= limits.memory &&
      required.network <= limits.network &&
      required.disk <= limits.disk &&
      this.memoryUsage + required.memory <= this.config.memoryThreshold
    );
  }

  /**
   * Send status update
   */
  private sendStatus(): void {
    this.postMessage({
      type: 'status',
      requestId: 'status',
      result: {
        activeRequests: this.activeRequests.size,
        memoryUsage: this.memoryUsage,
        cpuUsage: this.cpuUsage,
        maxConcurrent: this.config.maxConcurrentRequests
      }
    });
  }

  /**
   * Start resource monitoring
   */
  private startResourceMonitoring(): void {
    setInterval(() => {
      this.updateResourceUsage();
    }, 5000);
  }

  /**
   * Update resource usage metrics
   */
  private updateResourceUsage(): void {
    // Estimate memory usage
    if ('memory' in performance && (performance as any).memory) {
      const memory = (performance as any).memory;
      this.memoryUsage = memory.usedJSHeapSize || 0;
    }

    // Estimate CPU usage based on active requests
    this.cpuUsage = this.activeRequests.size / this.config.maxConcurrentRequests;
  }

  /**
   * Post message to main thread
   */
  private postMessage(response: WorkerResponse): void {
    self.postMessage(response);
  }

  /**
   * Default request handler
   */
  private async defaultRequestHandler(request: QueueRequest): Promise<any> {
    // Simulate processing time
    await this.sleep(Math.random() * 1000 + 500);
    
    // Report progress
    this.postMessage({
      type: 'progress',
      requestId: request.id,
      progress: 50
    });

    await this.sleep(Math.random() * 1000 + 500);

    return { 
      result: 'processed', 
      requestId: request.id,
      processedAt: Date.now() 
    };
  }

  /**
   * API request handler
   */
  private async apiRequestHandler(request: QueueRequest): Promise<any> {
    const { url, method = 'GET', headers = {}, body } = request.payload;

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Computation request handler
   */
  private async computeRequestHandler(request: QueueRequest): Promise<any> {
    const { operation, data, iterations = 1000 } = request.payload;

    this.postMessage({
      type: 'progress',
      requestId: request.id,
      progress: 0
    });

    let result;
    switch (operation) {
      case 'sort':
        result = this.performSort(data);
        break;
      case 'filter':
        result = this.performFilter(data, request.payload.predicate);
        break;
      case 'aggregate':
        result = this.performAggregate(data, request.payload.aggregation);
        break;
      case 'transform':
        result = this.performTransform(data, request.payload.transformer);
        break;
      default:
        throw new Error(`Unknown computation operation: ${operation}`);
    }

    this.postMessage({
      type: 'progress',
      requestId: request.id,
      progress: 100
    });

    return result;
  }

  /**
   * File processing handler
   */
  private async fileProcessingHandler(request: QueueRequest): Promise<any> {
    const { file, operation } = request.payload;

    switch (operation) {
      case 'parse':
        return this.parseFile(file);
      case 'validate':
        return this.validateFile(file);
      case 'transform':
        return this.transformFile(file, request.payload.transformer);
      default:
        throw new Error(`Unknown file operation: ${operation}`);
    }
  }

  /**
   * Data transformation handler
   */
  private async dataTransformHandler(request: QueueRequest): Promise<any> {
    const { data, transformations } = request.payload;
    let result = data;

    for (let i = 0; i < transformations.length; i++) {
      const transformation = transformations[i];
      result = await this.applyTransformation(result, transformation);
      
      this.postMessage({
        type: 'progress',
        requestId: request.id,
        progress: ((i + 1) / transformations.length) * 100
      });
    }

    return result;
  }

  // Utility methods
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private performSort(data: any[]): any[] {
    return [...data].sort();
  }

  private performFilter(data: any[], predicate: string): any[] {
    const filterFn = new Function('item', `return ${predicate}`);
    return data.filter(filterFn);
  }

  private performAggregate(data: any[], aggregation: any): any {
    // Simple aggregation implementation
    switch (aggregation.type) {
      case 'sum':
        return data.reduce((sum, item) => sum + (item[aggregation.field] || 0), 0);
      case 'count':
        return data.length;
      case 'average':
        const sum = data.reduce((sum, item) => sum + (item[aggregation.field] || 0), 0);
        return sum / data.length;
      default:
        return data;
    }
  }

  private performTransform(data: any[], transformer: string): any[] {
    const transformFn = new Function('item', `return ${transformer}`);
    return data.map(transformFn);
  }

  private parseFile(file: any): any {
    // Simple file parsing implementation
    if (typeof file === 'string') {
      try {
        return JSON.parse(file);
      } catch {
        return { text: file };
      }
    }
    return file;
  }

  private validateFile(file: any): boolean {
    // Simple file validation
    return file != null && typeof file !== 'undefined';
  }

  private transformFile(file: any, transformer: any): any {
    // Apply transformation to file
    return transformer ? transformer(file) : file;
  }

  private async applyTransformation(data: any, transformation: any): Promise<any> {
    switch (transformation.type) {
      case 'map':
        return data.map(transformation.fn);
      case 'filter':
        return data.filter(transformation.fn);
      case 'reduce':
        return data.reduce(transformation.fn, transformation.initial);
      default:
        return data;
    }
  }
}

// Initialize worker
new QueueWorker();