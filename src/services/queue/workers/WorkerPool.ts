// Worker Pool Manager for Concurrent Processing

import { QueueRequest, RequestStatus, WorkerConfiguration, SystemResources } from '../types';

interface WorkerInstance {
  id: string;
  worker: Worker;
  busy: boolean;
  lastUsed: number;
  activeRequests: Set<string>;
  errorCount: number;
  restartCount: number;
}

interface WorkerPoolStats {
  totalWorkers: number;
  activeWorkers: number;
  idleWorkers: number;
  totalRequests: number;
  completedRequests: number;
  failedRequests: number;
  averageProcessingTime: number;
  throughput: number;
}

export class WorkerPool {
  private workers: Map<string, WorkerInstance> = new Map();
  private pendingRequests: Map<string, QueueRequest> = new Map();
  private completedRequests: Map<string, any> = new Map();
  private requestPromises: Map<string, { resolve: Function; reject: Function }> = new Map();
  private config: WorkerConfiguration;
  private stats: WorkerPoolStats;
  private minWorkers: number;
  private maxWorkers: number;
  private scaleTimer?: NodeJS.Timeout;
  private statsTimer?: NodeJS.Timeout;

  constructor(
    config: WorkerConfiguration = {
      maxConcurrentRequests: 4,
      resourceLimits: {
        cpu: 0.8,
        memory: 512 * 1024 * 1024,
        network: 1000,
        disk: 100 * 1024 * 1024,
        concurrency: 4
      },
      workerTimeout: 30000,
      restartOnError: true,
      memoryThreshold: 400 * 1024 * 1024
    },
    minWorkers = 2,
    maxWorkers = 8
  ) {
    this.config = config;
    this.minWorkers = minWorkers;
    this.maxWorkers = maxWorkers;
    
    this.stats = {
      totalWorkers: 0,
      activeWorkers: 0,
      idleWorkers: 0,
      totalRequests: 0,
      completedRequests: 0,
      failedRequests: 0,
      averageProcessingTime: 0,
      throughput: 0
    };

    this.initializeWorkers();
    this.startAutoScaling();
    this.startStatsCollection();
  }

  /**
   * Process a request using the worker pool
   */
  async processRequest(request: QueueRequest): Promise<any> {
    this.stats.totalRequests++;
    this.pendingRequests.set(request.id, request);

    return new Promise((resolve, reject) => {
      this.requestPromises.set(request.id, { resolve, reject });
      this.assignRequestToWorker(request);
    });
  }

  /**
   * Cancel a pending request
   */
  cancelRequest(requestId: string): boolean {
    const request = this.pendingRequests.get(requestId);
    if (!request) return false;

    // Find worker handling this request
    for (const worker of this.workers.values()) {
      if (worker.activeRequests.has(requestId)) {
        worker.worker.postMessage({
          type: 'cancel',
          requestId
        });
        worker.activeRequests.delete(requestId);
        break;
      }
    }

    // Clean up
    this.pendingRequests.delete(requestId);
    const promise = this.requestPromises.get(requestId);
    if (promise) {
      promise.reject(new Error('Request cancelled'));
      this.requestPromises.delete(requestId);
    }

    return true;
  }

  /**
   * Get worker pool statistics
   */
  getStats(): WorkerPoolStats {
    return { ...this.stats };
  }

  /**
   * Get detailed worker information
   */
  getWorkerInfo(): Array<{
    id: string;
    busy: boolean;
    activeRequests: number;
    errorCount: number;
    restartCount: number;
    lastUsed: number;
  }> {
    return Array.from(this.workers.values()).map(worker => ({
      id: worker.id,
      busy: worker.busy,
      activeRequests: worker.activeRequests.size,
      errorCount: worker.errorCount,
      restartCount: worker.restartCount,
      lastUsed: worker.lastUsed
    }));
  }

  /**
   * Scale worker pool to target size
   */
  async scaleToSize(targetSize: number): Promise<void> {
    const currentSize = this.workers.size;
    
    if (targetSize > currentSize) {
      // Scale up
      for (let i = currentSize; i < Math.min(targetSize, this.maxWorkers); i++) {
        await this.createWorker();
      }
    } else if (targetSize < currentSize) {
      // Scale down
      const workersToRemove = currentSize - Math.max(targetSize, this.minWorkers);
      await this.removeIdleWorkers(workersToRemove);
    }
  }

  /**
   * Shutdown all workers
   */
  async shutdown(): Promise<void> {
    // Stop timers
    if (this.scaleTimer) {
      clearInterval(this.scaleTimer);
    }
    if (this.statsTimer) {
      clearInterval(this.statsTimer);
    }

    // Terminate all workers
    const shutdownPromises = Array.from(this.workers.values()).map(worker => {
      return new Promise<void>((resolve) => {
        worker.worker.terminate();
        resolve();
      });
    });

    await Promise.all(shutdownPromises);
    this.workers.clear();

    // Reject all pending requests
    for (const [requestId, promise] of this.requestPromises) {
      promise.reject(new Error('Worker pool shutdown'));
    }
    this.requestPromises.clear();
  }

  /**
   * Initialize minimum number of workers
   */
  private async initializeWorkers(): Promise<void> {
    for (let i = 0; i < this.minWorkers; i++) {
      await this.createWorker();
    }
  }

  /**
   * Create a new worker instance
   */
  private async createWorker(): Promise<WorkerInstance> {
    const workerId = `worker-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Create worker from inline script since we can't load external files
    const workerScript = this.generateWorkerScript();
    const blob = new Blob([workerScript], { type: 'application/javascript' });
    const workerUrl = URL.createObjectURL(blob);
    
    const worker = new Worker(workerUrl);
    
    const workerInstance: WorkerInstance = {
      id: workerId,
      worker,
      busy: false,
      lastUsed: Date.now(),
      activeRequests: new Set(),
      errorCount: 0,
      restartCount: 0
    };

    // Setup message handler
    worker.onmessage = (event) => {
      this.handleWorkerMessage(workerId, event.data);
    };

    worker.onerror = (error) => {
      this.handleWorkerError(workerId, error);
    };

    // Configure worker
    worker.postMessage({
      type: 'configure',
      config: this.config
    });

    this.workers.set(workerId, workerInstance);
    this.updateStats();

    // Clean up URL
    URL.revokeObjectURL(workerUrl);

    return workerInstance;
  }

  /**
   * Generate worker script as string
   */
  private generateWorkerScript(): string {
    return `
      // Inline worker implementation
      class InlineQueueWorker {
        constructor() {
          this.config = {
            maxConcurrentRequests: 4,
            resourceLimits: {
              cpu: 0.8,
              memory: 512 * 1024 * 1024,
              network: 1000,
              disk: 100 * 1024 * 1024,
              concurrency: 4
            },
            workerTimeout: 30000,
            restartOnError: false,
            memoryThreshold: 400 * 1024 * 1024
          };
          
          this.activeRequests = new Map();
          this.setupMessageHandler();
        }

        setupMessageHandler() {
          self.addEventListener('message', async (event) => {
            const { type, requestId, request, config } = event.data;

            try {
              switch (type) {
                case 'configure':
                  if (config) {
                    this.config = { ...this.config, ...config };
                  }
                  this.postMessage({ type: 'status', requestId: 'config', status: 'completed' });
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
                error: error.message || String(error)
              });
            }
          });
        }

        async processRequest(request) {
          if (this.activeRequests.size >= this.config.maxConcurrentRequests) {
            this.postMessage({
              type: 'error',
              requestId: request.id,
              error: 'Worker at capacity'
            });
            return;
          }

          this.activeRequests.set(request.id, request);
          
          try {
            const timeoutId = setTimeout(() => {
              this.cancelRequest(request.id);
            }, request.timeout || this.config.workerTimeout);

            // Simple request processing simulation
            await this.sleep(Math.random() * 2000 + 1000);
            
            const result = {
              result: 'processed',
              requestId: request.id,
              processedAt: Date.now(),
              type: request.type,
              payload: request.payload
            };
            
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
              error: error.message || String(error)
            });
          } finally {
            this.activeRequests.delete(request.id);
          }
        }

        cancelRequest(requestId) {
          if (this.activeRequests.has(requestId)) {
            this.activeRequests.delete(requestId);
            this.postMessage({
              type: 'status',
              requestId,
              status: 'cancelled'
            });
          }
        }

        sendStatus() {
          this.postMessage({
            type: 'status',
            requestId: 'status',
            result: {
              activeRequests: this.activeRequests.size,
              maxConcurrent: this.config.maxConcurrentRequests
            }
          });
        }

        postMessage(response) {
          self.postMessage(response);
        }

        sleep(ms) {
          return new Promise(resolve => setTimeout(resolve, ms));
        }
      }

      new InlineQueueWorker();
    `;
  }

  /**
   * Assign request to an available worker
   */
  private assignRequestToWorker(request: QueueRequest): void {
    const availableWorker = this.findAvailableWorker();
    
    if (!availableWorker) {
      // Try to create new worker if under limit
      if (this.workers.size < this.maxWorkers) {
        this.createWorker().then(worker => {
          this.assignRequestToSpecificWorker(request, worker);
        });
      } else {
        // Queue request for later processing
        setTimeout(() => {
          this.assignRequestToWorker(request);
        }, 100);
      }
      return;
    }

    this.assignRequestToSpecificWorker(request, availableWorker);
  }

  /**
   * Assign request to a specific worker
   */
  private assignRequestToSpecificWorker(request: QueueRequest, worker: WorkerInstance): void {
    worker.busy = true;
    worker.lastUsed = Date.now();
    worker.activeRequests.add(request.id);

    worker.worker.postMessage({
      type: 'process',
      request
    });

    this.updateStats();
  }

  /**
   * Find an available worker
   */
  private findAvailableWorker(): WorkerInstance | null {
    // First try to find completely idle worker
    for (const worker of this.workers.values()) {
      if (!worker.busy && worker.activeRequests.size === 0) {
        return worker;
      }
    }

    // Then try to find worker under capacity
    for (const worker of this.workers.values()) {
      if (worker.activeRequests.size < this.config.maxConcurrentRequests) {
        return worker;
      }
    }

    return null;
  }

  /**
   * Handle message from worker
   */
  private handleWorkerMessage(workerId: string, message: any): void {
    const worker = this.workers.get(workerId);
    if (!worker) return;

    const { type, requestId, result, error, progress, status } = message;

    switch (type) {
      case 'result':
        this.handleRequestResult(requestId, result, worker);
        break;

      case 'error':
        this.handleRequestError(requestId, error, worker);
        break;

      case 'progress':
        this.handleRequestProgress(requestId, progress);
        break;

      case 'status':
        if (requestId !== 'status' && requestId !== 'config') {
          this.handleRequestStatus(requestId, status, worker);
        }
        break;
    }
  }

  /**
   * Handle successful request result
   */
  private handleRequestResult(requestId: string, result: any, worker: WorkerInstance): void {
    const promise = this.requestPromises.get(requestId);
    if (promise) {
      promise.resolve(result);
      this.requestPromises.delete(requestId);
    }

    this.completedRequests.set(requestId, result);
    this.pendingRequests.delete(requestId);
    worker.activeRequests.delete(requestId);
    
    if (worker.activeRequests.size === 0) {
      worker.busy = false;
    }

    this.stats.completedRequests++;
    this.updateStats();
  }

  /**
   * Handle request error
   */
  private handleRequestError(requestId: string, error: string, worker: WorkerInstance): void {
    const promise = this.requestPromises.get(requestId);
    if (promise) {
      promise.reject(new Error(error));
      this.requestPromises.delete(requestId);
    }

    this.pendingRequests.delete(requestId);
    worker.activeRequests.delete(requestId);
    worker.errorCount++;
    
    if (worker.activeRequests.size === 0) {
      worker.busy = false;
    }

    this.stats.failedRequests++;

    // Restart worker if error count is too high
    if (this.config.restartOnError && worker.errorCount > 5) {
      this.restartWorker(worker.id);
    }

    this.updateStats();
  }

  /**
   * Handle request progress update
   */
  private handleRequestProgress(requestId: string, progress: number): void {
    // Could emit progress events here if needed
    console.debug(`Request ${requestId} progress: ${progress}%`);
  }

  /**
   * Handle request status update
   */
  private handleRequestStatus(requestId: string, status: string, worker: WorkerInstance): void {
    if (status === 'cancelled') {
      worker.activeRequests.delete(requestId);
      if (worker.activeRequests.size === 0) {
        worker.busy = false;
      }
      this.updateStats();
    }
  }

  /**
   * Handle worker error
   */
  private handleWorkerError(workerId: string, error: ErrorEvent): void {
    console.error(`Worker ${workerId} error:`, error);
    const worker = this.workers.get(workerId);
    if (worker) {
      worker.errorCount++;
      if (this.config.restartOnError) {
        this.restartWorker(workerId);
      }
    }
  }

  /**
   * Restart a worker
   */
  private async restartWorker(workerId: string): Promise<void> {
    const worker = this.workers.get(workerId);
    if (!worker) return;

    // Fail all active requests
    for (const requestId of worker.activeRequests) {
      const promise = this.requestPromises.get(requestId);
      if (promise) {
        promise.reject(new Error('Worker restarted'));
        this.requestPromises.delete(requestId);
      }
      this.pendingRequests.delete(requestId);
    }

    // Terminate old worker
    worker.worker.terminate();
    this.workers.delete(workerId);

    // Create new worker
    const newWorker = await this.createWorker();
    newWorker.restartCount = worker.restartCount + 1;
    
    this.updateStats();
  }

  /**
   * Remove idle workers
   */
  private async removeIdleWorkers(count: number): Promise<void> {
    const idleWorkers = Array.from(this.workers.values())
      .filter(worker => !worker.busy && worker.activeRequests.size === 0)
      .sort((a, b) => a.lastUsed - b.lastUsed);

    const workersToRemove = idleWorkers.slice(0, count);
    
    for (const worker of workersToRemove) {
      worker.worker.terminate();
      this.workers.delete(worker.id);
    }

    this.updateStats();
  }

  /**
   * Start auto-scaling based on load
   */
  private startAutoScaling(): void {
    this.scaleTimer = setInterval(() => {
      const pendingCount = this.pendingRequests.size;
      const currentWorkers = this.workers.size;
      const busyWorkers = Array.from(this.workers.values()).filter(w => w.busy).length;

      // Scale up if queue is building up
      if (pendingCount > currentWorkers * 2 && currentWorkers < this.maxWorkers) {
        this.createWorker();
      }
      
      // Scale down if workers are idle
      else if (busyWorkers < currentWorkers / 2 && currentWorkers > this.minWorkers) {
        this.removeIdleWorkers(1);
      }
    }, 10000); // Check every 10 seconds
  }

  /**
   * Start statistics collection
   */
  private startStatsCollection(): void {
    let lastCompletedCount = 0;
    let lastTimestamp = Date.now();

    this.statsTimer = setInterval(() => {
      const now = Date.now();
      const timeDiff = now - lastTimestamp;
      const completedDiff = this.stats.completedRequests - lastCompletedCount;

      // Calculate throughput (requests per second)
      this.stats.throughput = (completedDiff / timeDiff) * 1000;

      lastCompletedCount = this.stats.completedRequests;
      lastTimestamp = now;

      this.updateStats();
    }, 5000); // Update every 5 seconds
  }

  /**
   * Update statistics
   */
  private updateStats(): void {
    this.stats.totalWorkers = this.workers.size;
    this.stats.activeWorkers = Array.from(this.workers.values()).filter(w => w.busy).length;
    this.stats.idleWorkers = this.stats.totalWorkers - this.stats.activeWorkers;

    // Calculate average processing time
    const completedRequests = Array.from(this.completedRequests.values());
    if (completedRequests.length > 0) {
      const totalTime = completedRequests.reduce((sum, result) => {
        const request = this.pendingRequests.get(result.requestId);
        if (request && result.processedAt) {
          return sum + (result.processedAt - request.createdAt);
        }
        return sum;
      }, 0);
      
      this.stats.averageProcessingTime = totalTime / completedRequests.length;
    }
  }
}