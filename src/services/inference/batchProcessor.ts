/**
 * High-Performance Local Batch Processing System for BEAR AI
 * Implements concurrent request processing with intelligent batching and resource optimization
 */

import { EventEmitter } from 'events';
import { Worker } from 'worker_threads';
import * as os from 'os';
import * as process from 'process';
import { performance } from 'perf_hooks';

// Types and interfaces
export interface BatchRequest {
  id: string;
  prompt: string;
  options?: InferenceOptions;
  priority: RequestPriority;
  timestamp: number;
  timeout?: number;
  metadata?: Record<string, any>;
}

export interface InferenceOptions {
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  modelId?: string;
  stream?: boolean;
  contextWindow?: number;
}

export interface BatchResponse {
  id: string;
  result: string;
  success: boolean;
  error?: string;
  processingTime: number;
  memoryUsed: number;
  tokens?: {
    input: number;
    output: number;
  };
}

export enum RequestPriority {
  LOW = 0,
  NORMAL = 1,
  HIGH = 2,
  CRITICAL = 3
}

export interface BatchProcessorConfig {
  maxConcurrentBatches: number;
  maxBatchSize: number;
  minBatchSize: number;
  batchTimeout: number;
  workerPoolSize: number;
  memoryThreshold: number;
  cpuThreshold: number;
  adaptiveBatching: boolean;
  priorityScheduling: boolean;
  loadBalancing: boolean;
}

export interface WorkerPool {
  workers: Worker[];
  busyWorkers: Set<number>;
  taskQueue: BatchRequest[][];
  workerStats: Map<number, WorkerStats>;
}

export interface WorkerStats {
  id: number;
  totalTasks: number;
  totalProcessingTime: number;
  averageProcessingTime: number;
  memoryUsage: number;
  lastTaskTime: number;
  status: 'idle' | 'busy' | 'error';
}

export interface SystemResources {
  cpuUsage: number;
  memoryUsage: number;
  availableMemory: number;
  totalMemory: number;
  loadAverage: number[];
}

export interface BatchMetrics {
  totalRequests: number;
  processedRequests: number;
  failedRequests: number;
  averageBatchSize: number;
  averageProcessingTime: number;
  throughputPerSecond: number;
  memoryEfficiency: number;
  cpuUtilization: number;
  queueDepth: number;
}

/**
 * Intelligent Batching Algorithm
 * Dynamically optimizes batch sizes based on system resources and request patterns
 */
class IntelligentBatcher {
  private config: BatchProcessorConfig;
  private metrics: BatchMetrics;
  private resourceMonitor: ResourceMonitor;

  constructor(config: BatchProcessorConfig, resourceMonitor: ResourceMonitor) {
    this.config = config;
    this.resourceMonitor = resourceMonitor;
    this.metrics = this.initializeMetrics();
  }

  /**
   * Calculate optimal batch size based on current system state
   */
  calculateOptimalBatchSize(queueLength: number, resources: SystemResources): number {
    if (!this.config.adaptiveBatching) {
      return Math.min(queueLength, this.config.maxBatchSize);
    }

    // Base batch size calculation
    let optimalSize = this.config.minBatchSize;

    // Adjust based on available memory
    const memoryFactor = Math.max(0.1, (1 - resources.memoryUsage));
    optimalSize *= memoryFactor;

    // Adjust based on CPU utilization
    const cpuFactor = Math.max(0.5, (1 - resources.cpuUsage));
    optimalSize *= cpuFactor;

    // Consider queue depth for responsiveness
    const queueFactor = Math.min(2.0, queueLength / this.config.maxBatchSize);
    optimalSize *= queueFactor;

    // Apply historical performance data
    const performanceFactor = this.calculatePerformanceFactor();
    optimalSize *= performanceFactor;

    // Ensure within bounds
    return Math.max(
      this.config.minBatchSize,
      Math.min(this.config.maxBatchSize, Math.floor(optimalSize))
    );
  }

  /**
   * Group requests into optimal batches with priority consideration
   */
  createBatches(requests: BatchRequest[]): BatchRequest[][] {
    if (requests.length === 0) return [];

    // Sort by priority and timestamp
    const sortedRequests = [...requests].sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority; // Higher priority first
      }
      return a.timestamp - b.timestamp; // Earlier timestamp first
    });

    const batches: BatchRequest[][] = [];
    const resources = this.resourceMonitor.getCurrentResources();
    const optimalBatchSize = this.calculateOptimalBatchSize(requests.length, resources);

    // Create batches with intelligent grouping
    for (let i = 0; i < sortedRequests.length; i += optimalBatchSize) {
      const batch = sortedRequests.slice(i, i + optimalBatchSize);
      batches.push(batch);
    }

    return batches;
  }

  private calculatePerformanceFactor(): number {
    if (this.metrics.processedRequests === 0) return 1.0;

    const targetThroughput = 100; // requests per second
    const actualThroughput = this.metrics.throughputPerSecond;
    
    if (actualThroughput >= targetThroughput) {
      return Math.min(1.5, actualThroughput / targetThroughput);
    } else {
      return Math.max(0.5, actualThroughput / targetThroughput);
    }
  }

  private initializeMetrics(): BatchMetrics {
    return {
      totalRequests: 0,
      processedRequests: 0,
      failedRequests: 0,
      averageBatchSize: 0,
      averageProcessingTime: 0,
      throughputPerSecond: 0,
      memoryEfficiency: 0,
      cpuUtilization: 0,
      queueDepth: 0
    };
  }
}

/**
 * Resource Monitor
 * Tracks system resources and provides real-time resource availability
 */
class ResourceMonitor {
  private updateInterval: NodeJS.Timeout;
  private currentResources: SystemResources;

  constructor(updateIntervalMs: number = 1000) {
    this.currentResources = this.initializeResources();
    this.updateInterval = setInterval(() => {
      this.updateResources();
    }, updateIntervalMs);
  }

  getCurrentResources(): SystemResources {
    return { ...this.currentResources };
  }

  private updateResources(): void {
    const memoryUsage = process.memoryUsage();
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();

    this.currentResources = {
      cpuUsage: this.getCPUUsage(),
      memoryUsage: (totalMemory - freeMemory) / totalMemory,
      availableMemory: freeMemory,
      totalMemory: totalMemory,
      loadAverage: os.loadavg()
    };
  }

  private getCPUUsage(): number {
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;

    cpus.forEach(cpu => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type as keyof typeof cpu.times];
      }
      totalIdle += cpu.times.idle;
    });

    return 1 - (totalIdle / totalTick);
  }

  private initializeResources(): SystemResources {
    return {
      cpuUsage: 0,
      memoryUsage: 0,
      availableMemory: os.freemem(),
      totalMemory: os.totalmem(),
      loadAverage: os.loadavg()
    };
  }

  destroy(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
  }
}

/**
 * Priority Queue Implementation
 * Manages requests with priority-based scheduling
 */
class PriorityQueue {
  private queues: Map<RequestPriority, BatchRequest[]>;

  constructor() {
    this.queues = new Map();
    Object.values(RequestPriority).forEach(priority => {
      if (typeof priority === 'number') {
        this.queues.set(priority, []);
      }
    });
  }

  enqueue(request: BatchRequest): void {
    const queue = this.queues.get(request.priority);
    if (queue) {
      queue.push(request);
      // Sort by timestamp within priority level
      queue.sort((a, b) => a.timestamp - b.timestamp);
    }
  }

  dequeue(maxItems?: number): BatchRequest[] {
    const result: BatchRequest[] = [];
    const max = maxItems || Infinity;

    // Process by priority order (highest first)
    const priorities = [RequestPriority.CRITICAL, RequestPriority.HIGH, RequestPriority.NORMAL, RequestPriority.LOW];
    
    for (const priority of priorities) {
      const queue = this.queues.get(priority);
      if (queue && queue.length > 0 && result.length < max) {
        const needed = Math.min(queue.length, max - result.length);
        result.push(...queue.splice(0, needed));
      }
    }

    return result;
  }

  peek(): BatchRequest | undefined {
    for (const priority of [RequestPriority.CRITICAL, RequestPriority.HIGH, RequestPriority.NORMAL, RequestPriority.LOW]) {
      const queue = this.queues.get(priority);
      if (queue && queue.length > 0) {
        return queue[0];
      }
    }
    return undefined;
  }

  size(): number {
    let total = 0;
    this.queues.forEach(queue => total += queue.length);
    return total;
  }

  clear(): void {
    this.queues.forEach(queue => queue.length = 0);
  }
}

/**
 * Load Balancer
 * Distributes work across available workers for optimal resource utilization
 */
class LoadBalancer {
  private workerStats: Map<number, WorkerStats>;

  constructor() {
    this.workerStats = new Map();
  }

  /**
   * Select the best worker for a batch based on current load and performance
   */
  selectWorker(availableWorkers: number[], batchSize: number): number | null {
    if (availableWorkers.length === 0) return null;

    // Simple round-robin if no stats available
    if (this.workerStats.size === 0) {
      return availableWorkers[0];
    }

    let bestWorker = availableWorkers[0];
    let bestScore = this.calculateWorkerScore(bestWorker, batchSize);

    for (const workerId of availableWorkers) {
      const score = this.calculateWorkerScore(workerId, batchSize);
      if (score > bestScore) {
        bestScore = score;
        bestWorker = workerId;
      }
    }

    return bestWorker;
  }

  updateWorkerStats(workerId: number, stats: Partial<WorkerStats>): void {
    const existing = this.workerStats.get(workerId) || {
      id: workerId,
      totalTasks: 0,
      totalProcessingTime: 0,
      averageProcessingTime: 0,
      memoryUsage: 0,
      lastTaskTime: 0,
      status: 'idle' as const
    };

    this.workerStats.set(workerId, { ...existing, ...stats });
  }

  private calculateWorkerScore(workerId: number, batchSize: number): number {
    const stats = this.workerStats.get(workerId);
    if (!stats) return 1.0;

    // Higher score = better choice
    let score = 1.0;

    // Prefer workers with lower average processing time
    if (stats.averageProcessingTime > 0) {
      score *= 1.0 / Math.log10(stats.averageProcessingTime + 1);
    }

    // Prefer workers with lower memory usage
    score *= 1.0 - (stats.memoryUsage / (1024 * 1024 * 1024)); // Convert to GB factor

    // Prefer workers that haven't been used recently (load balancing)
    const timeSinceLastTask = Date.now() - stats.lastTaskTime;
    score *= Math.min(2.0, timeSinceLastTask / 10000); // 10 second normalization

    return score;
  }
}

/**
 * Main Batch Processor
 * High-performance local batch processing with intelligent optimization
 */
export class BatchProcessor extends EventEmitter {
  private config: BatchProcessorConfig;
  private queue: PriorityQueue;
  private batcher: IntelligentBatcher;
  private resourceMonitor: ResourceMonitor;
  private loadBalancer: LoadBalancer;
  private workerPool: WorkerPool;
  private isRunning: boolean = false;
  private processingInterval: NodeJS.Timeout | null = null;
  private metrics: BatchMetrics;

  constructor(config: Partial<BatchProcessorConfig> = {}) {
    super();

    this.config = {
      maxConcurrentBatches: config.maxConcurrentBatches || Math.max(2, os.cpus().length - 1),
      maxBatchSize: config.maxBatchSize || 32,
      minBatchSize: config.minBatchSize || 1,
      batchTimeout: config.batchTimeout || 5000,
      workerPoolSize: config.workerPoolSize || Math.max(2, os.cpus().length),
      memoryThreshold: config.memoryThreshold || 0.8,
      cpuThreshold: config.cpuThreshold || 0.9,
      adaptiveBatching: config.adaptiveBatching !== false,
      priorityScheduling: config.priorityScheduling !== false,
      loadBalancing: config.loadBalancing !== false,
      ...config
    };

    this.queue = new PriorityQueue();
    this.resourceMonitor = new ResourceMonitor();
    this.batcher = new IntelligentBatcher(this.config, this.resourceMonitor);
    this.loadBalancer = new LoadBalancer();
    this.workerPool = this.initializeWorkerPool();
    this.metrics = this.initializeMetrics();

    this.setupEventHandlers();
  }

  /**
   * Add a request to the processing queue
   */
  async addRequest(request: Omit<BatchRequest, 'id' | 'timestamp'>): Promise<string> {
    const fullRequest: BatchRequest = {
      id: this.generateRequestId(),
      timestamp: Date.now(),
      ...request
    };

    this.queue.enqueue(fullRequest);
    this.metrics.totalRequests++;
    this.metrics.queueDepth = this.queue.size();

    this.emit('requestQueued', fullRequest);

    // Start processing if not already running
    if (!this.isRunning) {
      this.start();
    }

    return fullRequest.id;
  }

  /**
   * Process a batch of requests in parallel
   */
  async processBatch(requests: BatchRequest[]): Promise<BatchResponse[]> {
    const startTime = performance.now();
    const availableWorkers = this.getAvailableWorkers();

    if (availableWorkers.length === 0) {
      throw new Error('No available workers for batch processing');
    }

    try {
      // Select optimal worker for this batch
      const workerId = this.loadBalancer.selectWorker(availableWorkers, requests.length);
      if (workerId === null) {
        throw new Error('Failed to select worker for batch');
      }

      // Mark worker as busy
      this.workerPool.busyWorkers.add(workerId);

      // Process the batch
      const responses = await this.executeInferenceWorker(workerId, requests);

      // Update metrics
      const processingTime = performance.now() - startTime;
      this.updateBatchMetrics(requests.length, processingTime, responses);

      // Update worker stats
      this.loadBalancer.updateWorkerStats(workerId, {
        totalTasks: (this.loadBalancer['workerStats'].get(workerId)?.totalTasks || 0) + 1,
        lastTaskTime: Date.now(),
        status: 'idle'
      });

      // Mark worker as available
      this.workerPool.busyWorkers.delete(workerId);

      this.emit('batchProcessed', { requests, responses, processingTime });

      return responses;
    } catch (error) {
      const errorResponses = requests.map(req => ({
        id: req.id,
        result: '',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime: performance.now() - startTime,
        memoryUsed: 0
      }));

      this.metrics.failedRequests += requests.length;
      this.emit('batchFailed', { requests, error });

      return errorResponses;
    }
  }

  /**
   * Start the batch processor
   */
  start(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.processingInterval = setInterval(() => {
      this.processQueue();
    }, 100); // Check queue every 100ms

    this.emit('started');
  }

  /**
   * Stop the batch processor
   */
  stop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }

    this.emit('stopped');
  }

  /**
   * Get current metrics
   */
  getMetrics(): BatchMetrics {
    return { ...this.metrics };
  }

  /**
   * Get current system resources
   */
  getSystemResources(): SystemResources {
    return this.resourceMonitor.getCurrentResources();
  }

  /**
   * Shutdown the processor and cleanup resources
   */
  async shutdown(): Promise<void> {
    this.stop();
    
    // Cleanup worker pool
    for (const worker of this.workerPool.workers) {
      await worker.terminate();
    }

    // Cleanup resource monitor
    this.resourceMonitor.destroy();

    this.emit('shutdown');
  }

  private async processQueue(): Promise<void> {
    if (!this.isRunning || this.queue.size() === 0) return;

    const resources = this.resourceMonitor.getCurrentResources();

    // Check resource thresholds
    if (resources.memoryUsage > this.config.memoryThreshold ||
        resources.cpuUsage > this.config.cpuThreshold) {
      return; // Skip this cycle if resources are constrained
    }

    const availableWorkers = this.getAvailableWorkers();
    const maxBatches = Math.min(availableWorkers.length, this.config.maxConcurrentBatches);

    for (let i = 0; i < maxBatches && this.queue.size() > 0; i++) {
      const optimalBatchSize = this.batcher.calculateOptimalBatchSize(this.queue.size(), resources);
      const requests = this.queue.dequeue(optimalBatchSize);

      if (requests.length > 0) {
        // Process batch asynchronously
        this.processBatch(requests).catch(error => {
          this.emit('error', error);
        });
      }
    }
  }

  private getAvailableWorkers(): number[] {
    const available: number[] = [];
    for (let i = 0; i < this.workerPool.workers.length; i++) {
      if (!this.workerPool.busyWorkers.has(i)) {
        available.push(i);
      }
    }
    return available;
  }

  private async executeInferenceWorker(workerId: number, requests: BatchRequest[]): Promise<BatchResponse[]> {
    // Simulate local inference processing
    // In a real implementation, this would interface with the actual model
    const responses: BatchResponse[] = [];

    for (const request of requests) {
      const startTime = performance.now();
      
      try {
        // Simulate processing time based on request complexity
        const processingTime = Math.random() * 1000 + 500; // 0.5-1.5 seconds
        await new Promise(resolve => setTimeout(resolve, processingTime));

        const response: BatchResponse = {
          id: request.id,
          result: `Processed: ${request.prompt.substring(0, 50)}...`,
          success: true,
          processingTime: performance.now() - startTime,
          memoryUsed: Math.random() * 1024 * 1024, // Random memory usage
          tokens: {
            input: request.prompt.length / 4, // Rough token estimate
            output: 100 + Math.random() * 200 // Random output length
          }
        };

        responses.push(response);
        this.metrics.processedRequests++;
      } catch (error) {
        const errorResponse: BatchResponse = {
          id: request.id,
          result: '',
          success: false,
          error: error instanceof Error ? error.message : 'Processing failed',
          processingTime: performance.now() - startTime,
          memoryUsed: 0
        };

        responses.push(errorResponse);
        this.metrics.failedRequests++;
      }
    }

    return responses;
  }

  private initializeWorkerPool(): WorkerPool {
    return {
      workers: [], // Workers would be initialized here in a full implementation
      busyWorkers: new Set(),
      taskQueue: [],
      workerStats: new Map()
    };
  }

  private updateBatchMetrics(batchSize: number, processingTime: number, responses: BatchResponse[]): void {
    this.metrics.averageBatchSize = (this.metrics.averageBatchSize + batchSize) / 2;
    this.metrics.averageProcessingTime = (this.metrics.averageProcessingTime + processingTime) / 2;
    
    const currentTime = Date.now();
    const timeWindow = 60000; // 1 minute window
    this.metrics.throughputPerSecond = (responses.length / (processingTime / 1000));
    
    // Update memory efficiency
    const totalMemoryUsed = responses.reduce((sum, resp) => sum + resp.memoryUsed, 0);
    this.metrics.memoryEfficiency = batchSize > 0 ? (totalMemoryUsed / batchSize) / (1024 * 1024) : 0;
    
    // Update queue depth
    this.metrics.queueDepth = this.queue.size();
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private setupEventHandlers(): void {
    process.on('SIGTERM', () => this.shutdown());
    process.on('SIGINT', () => this.shutdown());
  }

  private initializeMetrics(): BatchMetrics {
    return {
      totalRequests: 0,
      processedRequests: 0,
      failedRequests: 0,
      averageBatchSize: 0,
      averageProcessingTime: 0,
      throughputPerSecond: 0,
      memoryEfficiency: 0,
      cpuUtilization: 0,
      queueDepth: 0
    };
  }
}

// Export the main classes
export default BatchProcessor;
export {
  IntelligentBatcher,
  ResourceMonitor,
  PriorityQueue,
  LoadBalancer
};