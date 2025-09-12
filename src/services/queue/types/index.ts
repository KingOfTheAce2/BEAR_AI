// Queue Management Types and Interfaces

export enum RequestPriority {
  CRITICAL = 0,
  HIGH = 1,
  NORMAL = 2,
  LOW = 3,
  BACKGROUND = 4
}

export enum RequestStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  RETRYING = 'retrying'
}

export enum ResourceType {
  CPU = 'cpu',
  MEMORY = 'memory',
  NETWORK = 'network',
  DISK = 'disk'
}

export interface QueueRequest {
  id: string;
  type: string;
  priority: RequestPriority;
  payload: any;
  metadata: RequestMetadata;
  dependencies?: string[];
  resourceRequirements: ResourceRequirements;
  retryCount: number;
  maxRetries: number;
  timeout: number;
  createdAt: number;
  scheduledAt?: number;
  startedAt?: number;
  completedAt?: number;
  status: RequestStatus;
  result?: any;
  error?: Error;
}

export interface RequestMetadata {
  userId?: string;
  sessionId?: string;
  requestType: string;
  tags: string[];
  estimatedDuration?: number;
  cacheable: boolean;
  cacheKey?: string;
  cacheTTL?: number;
}

export interface ResourceRequirements {
  cpu: number; // 0-1 scale
  memory: number; // MB
  network: number; // KB/s
  disk: number; // MB
  concurrency: number; // max concurrent instances
}

export interface SystemResources {
  cpu: {
    usage: number;
    available: number;
    cores: number;
  };
  memory: {
    used: number;
    available: number;
    total: number;
  };
  network: {
    bandwidth: number;
    latency: number;
  };
  disk: {
    usage: number;
    available: number;
  };
}

export interface QueueMetrics {
  totalRequests: number;
  pendingRequests: number;
  processingRequests: number;
  completedRequests: number;
  failedRequests: number;
  averageWaitTime: number;
  averageProcessingTime: number;
  throughput: number; // requests per second
  resourceUtilization: SystemResources;
  queueHealth: QueueHealthStatus;
}

export interface QueueHealthStatus {
  status: 'healthy' | 'degraded' | 'critical';
  issues: string[];
  recommendations: string[];
}

export interface WorkerConfiguration {
  maxConcurrentRequests: number;
  resourceLimits: ResourceRequirements;
  specializationType?: string[];
  workerTimeout: number;
  restartOnError: boolean;
  memoryThreshold: number;
}

export interface QueueConfiguration {
  maxQueueSize: number;
  defaultTimeout: number;
  defaultRetries: number;
  priorityWeights: Record<RequestPriority, number>;
  resourceMonitoringInterval: number;
  metricsRetentionPeriod: number;
  cacheEnabled: boolean;
  cacheSizeLimit: number;
  workerPoolSize: number;
  dynamicScaling: boolean;
  scalingThresholds: ScalingThresholds;
}

export interface ScalingThresholds {
  cpuThreshold: number;
  memoryThreshold: number;
  queueLengthThreshold: number;
  latencyThreshold: number;
  scaleUpDelay: number;
  scaleDownDelay: number;
}

export interface CacheEntry {
  key: string;
  value: any;
  ttl: number;
  createdAt: number;
  accessCount: number;
  lastAccessed: number;
}

export interface DeduplicationConfig {
  enabled: boolean;
  windowSize: number; // milliseconds
  keyGenerator: (request: QueueRequest) => string;
}

export interface LoadBalancingStrategy {
  type: 'round-robin' | 'least-loaded' | 'resource-aware' | 'priority-based';
  parameters?: Record<string, any>;
}

export interface QueueStats {
  queueLength: number;
  activeWorkers: number;
  idleWorkers: number;
  totalWorkers: number;
  requestsPerSecond: number;
  averageLatency: number;
  errorRate: number;
  resourceUsage: SystemResources;
}

export type RequestHandler = (request: QueueRequest) => Promise<any>;
export type ErrorHandler = (error: Error, request: QueueRequest) => void;
export type ProgressCallback = (requestId: string, progress: number) => void;
export type MetricsCallback = (metrics: QueueMetrics) => void;