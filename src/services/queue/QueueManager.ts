// Main Queue Manager - Orchestrates all queue components

import { 
  QueueRequest, 
  RequestPriority, 
  RequestStatus, 
  QueueConfiguration, 
  RequestHandler,
  ErrorHandler,
  ProgressCallback,
  MetricsCallback,
  DeduplicationConfig,
  LoadBalancingStrategy
} from './types';

import { PriorityScheduler } from './PriorityScheduler';
import { ResourceManager } from './ResourceManager';
import { WorkerPool } from './workers/WorkerPool';
import { RequestCache } from './cache/RequestCache';
import { LoadBalancer } from './LoadBalancer';
import { QueueMetricsCollector } from './metrics/QueueMetrics';
import { DynamicScaler } from './DynamicScaler';

export class QueueManager {
  private scheduler: PriorityScheduler;
  private resourceManager: ResourceManager;
  private workerPools: Map<string, WorkerPool> = new Map();
  private loadBalancer: LoadBalancer;
  private cache: RequestCache;
  private metricsCollector: QueueMetricsCollector;
  private dynamicScaler: DynamicScaler;
  private requestHandlers: Map<string, RequestHandler> = new Map();
  private errorHandlers: Set<ErrorHandler> = new Set();
  private progressCallbacks: Set<ProgressCallback> = new Set();
  private metricsCallbacks: Set<MetricsCallback> = new Set();
  private config: QueueConfiguration;
  private running = false;
  private processingLoop?: NodeJS.Timeout;

  constructor(config: Partial<QueueConfiguration> = {}) {
    this.config = {
      maxQueueSize: 10000,
      defaultTimeout: 30000,
      defaultRetries: 3,
      priorityWeights: {
        [RequestPriority.CRITICAL]: 10,
        [RequestPriority.HIGH]: 7,
        [RequestPriority.NORMAL]: 5,
        [RequestPriority.LOW]: 3,
        [RequestPriority.BACKGROUND]: 1
      },
      resourceMonitoringInterval: 5000,
      metricsRetentionPeriod: 3600000,
      cacheEnabled: true,
      cacheSizeLimit: 10000,
      workerPoolSize: 4,
      dynamicScaling: true,
      scalingThresholds: {
        cpuThreshold: 0.75,
        memoryThreshold: 0.80,
        queueLengthThreshold: 50,
        latencyThreshold: 3000,
        scaleUpDelay: 30000,
        scaleDownDelay: 60000
      },
      ...config
    };

    this.initializeComponents();
  }

  /**
   * Start the queue manager
   */
  async start(): Promise<void> {
    if (this.running) {
      return;
    }

    this.running = true;
    await this.createInitialWorkerPool();
    this.startProcessingLoop();
    
    console.log('Queue Manager started successfully');
  }

  /**
   * Stop the queue manager
   */
  async stop(): Promise<void> {
    if (!this.running) {
      return;
    }

    this.running = false;
    
    if (this.processingLoop) {
      clearInterval(this.processingLoop);
    }

    await this.loadBalancer.shutdown();
    this.dynamicScaler.stop();
    this.metricsCollector.stop();
    this.resourceManager.stopMonitoring();
    this.cache.stop();

    console.log('Queue Manager stopped successfully');
  }

  /**
   * Submit a request to the queue
   */
  async submitRequest(
    type: string,
    payload: any,
    options: {
      priority?: RequestPriority;
      timeout?: number;
      maxRetries?: number;
      dependencies?: string[];
      metadata?: any;
      cacheable?: boolean;
      cacheKey?: string;
      cacheTTL?: number;
    } = {}
  ): Promise<string> {
    if (!this.running) {
      throw new Error('Queue Manager is not running');
    }

    // Check queue size limit
    const pendingRequests = this.scheduler.getPendingRequests();
    if (pendingRequests.length >= this.config.maxQueueSize) {
      throw new Error('Queue is at maximum capacity');
    }

    // Generate request ID
    const requestId = this.generateRequestId();

    // Check for duplicate request if caching is enabled
    if (this.config.cacheEnabled && options.cacheable !== false) {
      const tempRequest = this.createQueueRequest(requestId, type, payload, options);
      
      if (this.cache.isDuplicate(tempRequest)) {
        const cachedResult = this.cache.get(tempRequest);
        if (cachedResult) {
          this.notifyProgress(requestId, 100);
          return requestId;
        }
      }
    }

    // Create queue request
    const request = this.createQueueRequest(requestId, type, payload, options);

    // Add to scheduler
    this.scheduler.enqueue(request);
    
    // Update metrics
    this.metricsCollector.updateQueueStats({
      queueLength: this.scheduler.getPendingRequests().length,
      activeWorkers: this.getTotalActiveWorkers(),
      idleWorkers: this.getTotalIdleWorkers(),
      totalWorkers: this.getTotalWorkers(),
      requestsPerSecond: this.metricsCollector.getCurrentMetrics().throughput,
      averageLatency: this.metricsCollector.getCurrentMetrics().averageProcessingTime,
      errorRate: this.calculateErrorRate(),
      resourceUsage: this.resourceManager.getCurrentResources()
    });

    return requestId;
  }

  /**
   * Cancel a pending request
   */
  async cancelRequest(requestId: string): Promise<boolean> {
    // Try to remove from scheduler first
    if (this.scheduler.remove(requestId)) {
      return true;
    }

    // Try to cancel in worker pools
    for (const workerPool of this.workerPools.values()) {
      if (workerPool.cancelRequest(requestId)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get request status
   */
  getRequestStatus(requestId: string): RequestStatus | null {
    const pendingRequests = this.scheduler.getPendingRequests();
    const pendingRequest = pendingRequests.find(req => req.id === requestId);
    
    if (pendingRequest) {
      return pendingRequest.status;
    }

    const activeRequests = this.scheduler.getActiveRequests();
    const activeRequest = activeRequests.find(req => req.id === requestId);
    
    if (activeRequest) {
      return activeRequest.status;
    }

    return null;
  }

  /**
   * Register request handler for a specific type
   */
  registerHandler(type: string, handler: RequestHandler): void {
    this.requestHandlers.set(type, handler);
  }

  /**
   * Register error handler
   */
  onError(handler: ErrorHandler): void {
    this.errorHandlers.add(handler);
  }

  /**
   * Register progress callback
   */
  onProgress(callback: ProgressCallback): void {
    this.progressCallbacks.add(callback);
  }

  /**
   * Register metrics callback
   */
  onMetrics(callback: MetricsCallback): void {
    this.metricsCallbacks.add(callback);
  }

  /**
   * Get queue statistics
   */
  getStats() {
    const schedulerStats = this.scheduler.getStats();
    const loadBalancerStats = this.loadBalancer.getStats();
    const cacheStats = this.cache.getStats();
    const metricsStats = this.metricsCollector.getCurrentMetrics();
    const scalingStats = this.dynamicScaler.getScalingStats();

    return {
      scheduler: schedulerStats,
      loadBalancer: loadBalancerStats,
      cache: cacheStats,
      metrics: metricsStats,
      scaling: scalingStats,
      resourceUtilization: this.resourceManager.getResourceUtilization(),
      recommendations: this.getRecommendations()
    };
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(duration?: number) {
    return this.metricsCollector.getPerformanceSummary(duration);
  }

  /**
   * Get health trends
   */
  getHealthTrends(duration?: number) {
    return this.metricsCollector.getHealthTrends(duration);
  }

  /**
   * Update configuration
   */
  updateConfiguration(updates: Partial<QueueConfiguration>): void {
    this.config = { ...this.config, ...updates };
    
    // Update component configurations
    if (updates.scalingThresholds) {
      this.dynamicScaler.updateThresholds(updates.scalingThresholds);
    }
  }

  /**
   * Export queue data for persistence
   */
  exportData() {
    return {
      metrics: this.metricsCollector.exportMetrics(),
      cache: this.cache.export(),
      config: this.config,
      stats: this.getStats(),
      timestamp: Date.now()
    };
  }

  /**
   * Import queue data from persistence
   */
  importData(data: any): void {
    if (data.cache) {
      this.cache.import(data.cache);
    }
    
    if (data.config) {
      this.updateConfiguration(data.config);
    }
  }

  /**
   * Initialize all queue components
   */
  private initializeComponents(): void {
    // Initialize scheduler
    this.scheduler = new PriorityScheduler(this.config.priorityWeights);

    // Initialize resource manager
    this.resourceManager = new ResourceManager(
      this.config.resourceMonitoringInterval,
      this.config.scalingThresholds
    );

    // Initialize cache
    const deduplicationConfig: DeduplicationConfig = {
      enabled: this.config.cacheEnabled,
      windowSize: 60000,
      keyGenerator: (request) => `${request.type}:${JSON.stringify(request.payload)}`
    };

    this.cache = new RequestCache(
      this.config.cacheSizeLimit,
      300000, // 5 minute TTL
      60000, // 1 minute cleanup
      deduplicationConfig
    );

    // Initialize metrics collector
    this.metricsCollector = new QueueMetricsCollector(
      1000, // max history
      5000, // collection interval
      {
        maxAverageLatency: this.config.scalingThresholds.latencyThreshold,
        maxErrorRate: 0.05,
        maxQueueLength: this.config.scalingThresholds.queueLengthThreshold,
        minThroughput: 10,
        maxCpuUsage: this.config.scalingThresholds.cpuThreshold,
        maxMemoryUsage: this.config.scalingThresholds.memoryThreshold
      }
    );

    // Initialize load balancer
    const loadBalancingStrategy: LoadBalancingStrategy = { type: 'resource-aware' };
    this.loadBalancer = new LoadBalancer(
      loadBalancingStrategy,
      this.resourceManager
    );

    // Initialize dynamic scaler
    this.dynamicScaler = new DynamicScaler(
      this.resourceManager,
      this.metricsCollector,
      this.config.scalingThresholds,
      2, // min workers
      16, // max workers
      10000, // evaluation interval
      30000 // cooldown period
    );

    // Subscribe to metrics updates
    this.metricsCollector.subscribe((metrics) => {
      this.notifyMetricsCallbacks(metrics);
    });
  }

  /**
   * Create initial worker pool
   */
  private async createInitialWorkerPool(): Promise<void> {
    const defaultPool = new WorkerPool(
      {
        maxConcurrentRequests: 4,
        resourceLimits: {
          cpu: 0.8,
          memory: 512 * 1024 * 1024,
          network: 1000,
          disk: 100 * 1024 * 1024,
          concurrency: 4
        },
        workerTimeout: this.config.defaultTimeout,
        restartOnError: true,
        memoryThreshold: 400 * 1024 * 1024
      },
      2, // min workers
      this.config.workerPoolSize // max workers
    );

    this.workerPools.set('default', defaultPool);
    this.loadBalancer.addNode('default', defaultPool, 1);
    this.dynamicScaler.registerWorkerPool('default', defaultPool);
  }

  /**
   * Start the main processing loop
   */
  private startProcessingLoop(): void {
    this.processingLoop = setInterval(async () => {
      if (!this.running) return;

      try {
        await this.processRequests();
        await this.updateMetrics();
      } catch (error) {
        console.error('Error in processing loop:', error);
        this.notifyErrorHandlers(error as Error, null);
      }
    }, 100); // Process every 100ms
  }

  /**
   * Process pending requests
   */
  private async processRequests(): Promise<void> {
    const availableResources = this.resourceManager.getCurrentResources();
    const request = this.scheduler.dequeue(availableResources);
    
    if (!request) {
      return;
    }

    try {
      // Check cache first
      if (this.config.cacheEnabled && request.metadata.cacheable) {
        const cachedResult = this.cache.get(request);
        if (cachedResult) {
          this.scheduler.complete(request.id, cachedResult);
          this.notifyProgress(request.id, 100);
          return;
        }
      }

      // Route request to worker pool
      const result = await this.loadBalancer.routeRequest(request);
      
      // Cache result if cacheable
      if (this.config.cacheEnabled && request.metadata.cacheable) {
        this.cache.set(request, result, request.metadata.cacheTTL);
      }

      // Mark as completed
      this.scheduler.complete(request.id, result);
      this.metricsCollector.recordRequestCompletion(
        Date.now() - (request.startedAt || request.createdAt),
        true
      );
      
      this.notifyProgress(request.id, 100);

    } catch (error) {
      // Handle request failure
      this.scheduler.fail(request.id, error as Error);
      this.metricsCollector.recordRequestCompletion(
        Date.now() - (request.startedAt || request.createdAt),
        false
      );
      
      this.notifyErrorHandlers(error as Error, request);
    }
  }

  /**
   * Update metrics and trigger callbacks
   */
  private async updateMetrics(): Promise<void> {
    const resources = this.resourceManager.getCurrentResources();
    this.metricsCollector.updateResourceUtilization(resources);

    const stats = {
      queueLength: this.scheduler.getPendingRequests().length,
      activeWorkers: this.getTotalActiveWorkers(),
      idleWorkers: this.getTotalIdleWorkers(),
      totalWorkers: this.getTotalWorkers(),
      requestsPerSecond: this.metricsCollector.getCurrentMetrics().throughput,
      averageLatency: this.metricsCollector.getCurrentMetrics().averageProcessingTime,
      errorRate: this.calculateErrorRate(),
      resourceUsage: resources
    };

    this.metricsCollector.updateQueueStats(stats);
  }

  /**
   * Create a queue request object
   */
  private createQueueRequest(
    requestId: string,
    type: string,
    payload: any,
    options: any
  ): QueueRequest {
    const now = Date.now();
    
    return {
      id: requestId,
      type,
      priority: options.priority || RequestPriority.NORMAL,
      payload,
      metadata: {
        userId: options.metadata?.userId,
        sessionId: options.metadata?.sessionId,
        requestType: type,
        tags: options.metadata?.tags || [],
        estimatedDuration: options.metadata?.estimatedDuration,
        cacheable: options.cacheable !== false,
        cacheKey: options.cacheKey,
        cacheTTL: options.cacheTTL
      },
      dependencies: options.dependencies,
      resourceRequirements: this.estimateResourceRequirements(type, payload),
      retryCount: 0,
      maxRetries: options.maxRetries || this.config.defaultRetries,
      timeout: options.timeout || this.config.defaultTimeout,
      createdAt: now,
      status: RequestStatus.PENDING
    };
  }

  /**
   * Estimate resource requirements for a request
   */
  private estimateResourceRequirements(type: string, payload: any) {
    // Default resource requirements - could be enhanced with ML prediction
    const baseRequirements = {
      cpu: 0.1,
      memory: 50 * 1024 * 1024, // 50MB
      network: 100, // 100KB/s
      disk: 10 * 1024 * 1024, // 10MB
      concurrency: 1
    };

    // Adjust based on request type
    switch (type) {
      case 'compute':
        baseRequirements.cpu = 0.5;
        baseRequirements.memory = 200 * 1024 * 1024;
        break;
      case 'api':
        baseRequirements.network = 1000;
        break;
      case 'file':
        baseRequirements.disk = 100 * 1024 * 1024;
        break;
    }

    // Adjust based on payload size
    const payloadSize = JSON.stringify(payload).length;
    if (payloadSize > 10000) {
      baseRequirements.memory *= 2;
      baseRequirements.cpu *= 1.5;
    }

    return baseRequirements;
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get total active workers across all pools
   */
  private getTotalActiveWorkers(): number {
    return Array.from(this.workerPools.values())
      .reduce((total, pool) => total + pool.getStats().activeWorkers, 0);
  }

  /**
   * Get total idle workers across all pools
   */
  private getTotalIdleWorkers(): number {
    return Array.from(this.workerPools.values())
      .reduce((total, pool) => total + pool.getStats().idleWorkers, 0);
  }

  /**
   * Get total workers across all pools
   */
  private getTotalWorkers(): number {
    return Array.from(this.workerPools.values())
      .reduce((total, pool) => total + pool.getStats().totalWorkers, 0);
  }

  /**
   * Calculate current error rate
   */
  private calculateErrorRate(): number {
    const metrics = this.metricsCollector.getCurrentMetrics();
    const totalRequests = metrics.completedRequests + metrics.failedRequests;
    return totalRequests > 0 ? metrics.failedRequests / totalRequests : 0;
  }

  /**
   * Get system recommendations
   */
  private getRecommendations(): string[] {
    const recommendations: string[] = [];
    
    // Add resource manager recommendations
    recommendations.push(...this.resourceManager.getResourceRecommendations());
    
    // Add scaling recommendations
    recommendations.push(...this.dynamicScaler.getScalingRecommendations());
    
    // Add cache recommendations
    const cacheStats = this.cache.getStats();
    if (cacheStats.hitRate < 0.5) {
      recommendations.push('Cache hit rate is low - consider adjusting cache TTL or size');
    }
    
    return recommendations;
  }

  /**
   * Notify progress callbacks
   */
  private notifyProgress(requestId: string, progress: number): void {
    for (const callback of this.progressCallbacks) {
      try {
        callback(requestId, progress);
      } catch (error) {
        console.error('Error in progress callback:', error);
      }
    }
  }

  /**
   * Notify error handlers
   */
  private notifyErrorHandlers(error: Error, request: QueueRequest | null): void {
    for (const handler of this.errorHandlers) {
      try {
        handler(error, request);
      } catch (handlerError) {
        console.error('Error in error handler:', handlerError);
      }
    }
  }

  /**
   * Notify metrics callbacks
   */
  private notifyMetricsCallbacks(metrics: any): void {
    for (const callback of this.metricsCallbacks) {
      try {
        callback(metrics);
      } catch (error) {
        console.error('Error in metrics callback:', error);
      }
    }
  }
}