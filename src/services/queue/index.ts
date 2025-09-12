// Queue Service Main Export

export { QueueManager } from './QueueManager';
export { PriorityScheduler } from './PriorityScheduler';
export { ResourceManager } from './ResourceManager';
export { WorkerPool } from './workers/WorkerPool';
export { RequestCache, CacheWarmingStrategy } from './cache/RequestCache';
export { LoadBalancer, AdaptiveLoadBalancer } from './LoadBalancer';
export { QueueMetricsCollector } from './metrics/QueueMetrics';
export { DynamicScaler } from './DynamicScaler';

export * from './types';

// Re-export worker types for external use
export type { WorkerInstance } from './workers/WorkerPool';

// Convenience factory function
export function createQueueManager(config?: any) {
  return new QueueManager(config);
}

// Default configuration
export const DEFAULT_QUEUE_CONFIG = {
  maxQueueSize: 10000,
  defaultTimeout: 30000,
  defaultRetries: 3,
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
  }
};