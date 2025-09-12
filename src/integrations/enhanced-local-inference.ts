/**
 * Enhanced Local Inference Integration
 * TypeScript integration layer for BEAR AI enhanced local inference engine
 * 
 * Features:
 * - Real-time performance monitoring
 * - WebSocket streaming support
 * - Automatic optimization
 * - Resource management
 * - Error recovery
 * 
 * @file Enhanced local inference integration
 * @version 2.0.0
 */

import { EventEmitter } from 'events';

// Types and interfaces
export interface InferenceRequest {
  requestId?: string;
  prompt: string;
  modelId?: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  topK?: number;
  stopSequences?: string[];
  stream?: boolean;
  priority?: 'low' | 'normal' | 'high' | 'critical';
  cacheKey?: string;
}

export interface InferenceResponse {
  requestId: string;
  text: string;
  tokensGenerated: number;
  finishReason: string;
  processingTimeMs: number;
  queueTimeMs: number;
  modelId: string;
  batchSize?: number;
  cacheHit?: boolean;
  memoryUsageMb?: number;
}

export interface StreamToken {
  token: string;
  timestamp: number;
  tokenId: number;
  logprob?: number;
  isSpecial?: boolean;
  finishReason?: string;
}

export interface EngineMetrics {
  timestamp: number;
  requestsPerSecond: number;
  tokensPerSecond: number;
  averageLatencyMs: number;
  queueDepth: number;
  cacheHitRate: number;
  memoryUsageMb: number;
  gpuUtilizationPercent: number;
  activeModels: number;
  loadedModels: string[];
  status: 'initializing' | 'ready' | 'busy' | 'overloaded' | 'error' | 'maintenance' | 'shutdown';
  errorRate: number;
  uptimeSeconds: number;
}

export interface ModelConfig {
  modelId: string;
  modelPath: string;
  nCtx?: number;
  nGpuLayers?: number;
  nBatch?: number;
  temperature?: number;
  topP?: number;
  topK?: number;
  quantization?: string;
  [key: string]: any;
}

export interface EngineConfig {
  mode?: 'high_performance' | 'balanced' | 'memory_optimized' | 'batch_optimized';
  maxConcurrentModels?: number;
  maxBatchSize?: number;
  maxQueueSize?: number;
  cacheSizeMb?: number;
  memoryPoolMb?: number;
  kvCacheMb?: number;
  enableStreaming?: boolean;
  enableCaching?: boolean;
  enableOptimization?: boolean;
  autoOptimization?: boolean;
  performanceMonitoring?: boolean;
  apiEndpoint?: string;
  wsEndpoint?: string;
}

export interface OptimizationRecommendations {
  batchSize: number;
  threading: {
    inferenceThreads: number;
    ioThreads: number;
    backgroundThreads: number;
  };
  kvCache: {
    enableCompression: boolean;
    compressionRatio?: number;
    chunkedAttention?: boolean;
    chunkSize?: number;
  };
  memoryAllocation: {
    modelCacheMb: number;
    inferenceCacheMb: number;
    kvCacheMb: number;
    systemReserveMb: number;
  };
}

// Error classes
export class InferenceError extends Error {
  constructor(message: string, public code: string, public details?: any) {
    super(message);
    this.name = 'InferenceError';
  }
}

export class ModelLoadError extends InferenceError {
  constructor(modelId: string, details?: any) {
    super(`Failed to load model: ${modelId}`, 'MODEL_LOAD_ERROR', details);
  }
}

export class QueueFullError extends InferenceError {
  constructor() {
    super('Request queue is full', 'QUEUE_FULL_ERROR');
  }
}

export class StreamingError extends InferenceError {
  constructor(message: string, details?: any) {
    super(message, 'STREAMING_ERROR', details);
  }
}

// WebSocket streaming handler
class StreamingHandler extends EventEmitter {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor(private wsEndpoint: string) {
    super();
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.wsEndpoint);

        this.ws.onopen = () => {
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          this.emit('connected');
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            this.emit('error', new StreamingError('Failed to parse message', error));
          }
        };

        this.ws.onclose = () => {
          this.stopHeartbeat();
          this.emit('disconnected');
          this.attemptReconnect();
        };

        this.ws.onerror = (error) => {
          this.emit('error', new StreamingError('WebSocket error', error));
          reject(error);
        };

      } catch (error) {
        reject(error);
      }
    });
  }

  private handleMessage(message: any) {
    switch (message.type) {
      case 'token':
        this.emit('token', message.data as StreamToken);
        break;
      case 'metadata':
        this.emit('metadata', message.data);
        break;
      case 'error':
        this.emit('error', new StreamingError(message.data.message, message.data));
        break;
      case 'complete':
        this.emit('complete', message.data);
        break;
      case 'pong':
        // Heartbeat response
        break;
      default:
        console.warn('Unknown message type:', message.type);
    }
  }

  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000); // 30 seconds
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private async attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.emit('error', new StreamingError('Max reconnection attempts reached'));
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    setTimeout(async () => {
      try {
        await this.connect();
      } catch (error) {
        // Will trigger another reconnect attempt
      }
    }, delay);
  }

  sendMessage(message: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      throw new StreamingError('WebSocket not connected');
    }
  }

  disconnect() {
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

// Main inference client
export class EnhancedLocalInferenceClient extends EventEmitter {
  private config: Required<EngineConfig>;
  private streamingHandler: StreamingHandler | null = null;
  private metricsInterval: NodeJS.Timeout | null = null;
  private activeStreams = new Map<string, AsyncGenerator<string, void, unknown>>();

  constructor(config: EngineConfig = {}) {
    super();

    // Set default configuration
    this.config = {
      mode: 'balanced',
      maxConcurrentModels: 2,
      maxBatchSize: 8,
      maxQueueSize: 1000,
      cacheSizeMb: 2048,
      memoryPoolMb: 1024,
      kvCacheMb: 1024,
      enableStreaming: true,
      enableCaching: true,
      enableOptimization: true,
      autoOptimization: true,
      performanceMonitoring: true,
      apiEndpoint: 'http://localhost:8000',
      wsEndpoint: 'ws://localhost:8000/ws',
      ...config
    };
  }

  async initialize(): Promise<void> {
    try {
      // Test API connection
      await this.testConnection();

      // Initialize streaming if enabled
      if (this.config.enableStreaming) {
        await this.initializeStreaming();
      }

      // Start performance monitoring
      if (this.config.performanceMonitoring) {
        this.startMetricsCollection();
      }

      this.emit('initialized');
    } catch (error) {
      throw new InferenceError('Failed to initialize client', 'INIT_ERROR', error);
    }
  }

  private async testConnection(): Promise<void> {
    try {
      const response = await fetch(`${this.config.apiEndpoint}/health`);
      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }
    } catch (error) {
      throw new InferenceError('API connection failed', 'CONNECTION_ERROR', error);
    }
  }

  private async initializeStreaming(): Promise<void> {
    this.streamingHandler = new StreamingHandler(this.config.wsEndpoint);
    
    this.streamingHandler.on('connected', () => {
      this.emit('streaming_connected');
    });

    this.streamingHandler.on('disconnected', () => {
      this.emit('streaming_disconnected');
    });

    this.streamingHandler.on('error', (error) => {
      this.emit('streaming_error', error);
    });

    await this.streamingHandler.connect();
  }

  private startMetricsCollection() {
    this.metricsInterval = setInterval(async () => {
      try {
        const metrics = await this.getMetrics();
        this.emit('metrics', metrics);
      } catch (error) {
        this.emit('error', new InferenceError('Metrics collection failed', 'METRICS_ERROR', error));
      }
    }, 10000); // Every 10 seconds
  }

  async registerModel(config: ModelConfig): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.apiEndpoint}/models/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new ModelLoadError(config.modelId, error);
      }

      const result = await response.json();
      return result.success;
    } catch (error) {
      if (error instanceof ModelLoadError) throw error;
      throw new ModelLoadError(config.modelId, error);
    }
  }

  async loadModel(modelId: string, preload: boolean = true): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.apiEndpoint}/models/load`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modelId, preload })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new ModelLoadError(modelId, error);
      }

      const result = await response.json();
      return result.success;
    } catch (error) {
      if (error instanceof ModelLoadError) throw error;
      throw new ModelLoadError(modelId, error);
    }
  }

  async generate(request: InferenceRequest): Promise<InferenceResponse> {
    try {
      const response = await fetch(`${this.config.apiEndpoint}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...request,
          requestId: request.requestId || this.generateRequestId()
        })
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw new QueueFullError();
        }
        const error = await response.json();
        throw new InferenceError('Generation failed', 'GENERATION_ERROR', error);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof InferenceError) throw error;
      throw new InferenceError('Generation request failed', 'REQUEST_ERROR', error);
    }
  }

  async *generateStream(request: InferenceRequest): AsyncGenerator<string, void, unknown> {
    const requestId = request.requestId || this.generateRequestId();
    
    if (!this.streamingHandler) {
      throw new StreamingError('Streaming not initialized');
    }

    try {
      // Start streaming request
      this.streamingHandler.sendMessage({
        type: 'start_stream',
        data: { ...request, requestId, stream: true }
      });

      // Create async generator for tokens
      const tokenGenerator = this.createTokenGenerator(requestId);
      this.activeStreams.set(requestId, tokenGenerator);

      yield* tokenGenerator;

    } catch (error) {
      throw new StreamingError('Stream generation failed', error);
    } finally {
      this.activeStreams.delete(requestId);
    }
  }

  private async *createTokenGenerator(requestId: string): AsyncGenerator<string, void, unknown> {
    return new Promise<AsyncGenerator<string, void, unknown>>((resolve, reject) => {
      const tokens: string[] = [];
      let completed = false;

      const tokenHandler = (token: StreamToken) => {
        if (token.finishReason) {
          completed = true;
          return;
        }
        tokens.push(token.token);
      };

      const errorHandler = (error: Error) => {
        reject(error);
      };

      const completeHandler = () => {
        completed = true;
      };

      this.streamingHandler!.on('token', tokenHandler);
      this.streamingHandler!.on('error', errorHandler);
      this.streamingHandler!.on('complete', completeHandler);

      const generator = async function* () {
        while (!completed || tokens.length > 0) {
          if (tokens.length > 0) {
            yield tokens.shift()!;
          } else {
            await new Promise(resolve => setTimeout(resolve, 10));
          }
        }
      };

      resolve(generator());

      // Cleanup listeners after some time
      setTimeout(() => {
        this.streamingHandler!.off('token', tokenHandler);
        this.streamingHandler!.off('error', errorHandler);
        this.streamingHandler!.off('complete', completeHandler);
      }, 300000); // 5 minutes
    });
  }

  async getOptimizationRecommendations(request: Partial<InferenceRequest>): Promise<OptimizationRecommendations> {
    try {
      const response = await fetch(`${this.config.apiEndpoint}/optimize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new Error(`Optimization request failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      throw new InferenceError('Failed to get optimization recommendations', 'OPTIMIZATION_ERROR', error);
    }
  }

  async getMetrics(): Promise<EngineMetrics> {
    try {
      const response = await fetch(`${this.config.apiEndpoint}/metrics`);
      
      if (!response.ok) {
        throw new Error(`Metrics request failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      throw new InferenceError('Failed to get metrics', 'METRICS_ERROR', error);
    }
  }

  async getSystemStatus(): Promise<any> {
    try {
      const response = await fetch(`${this.config.apiEndpoint}/status`);
      
      if (!response.ok) {
        throw new Error(`Status request failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      throw new InferenceError('Failed to get system status', 'STATUS_ERROR', error);
    }
  }

  async invalidateCache(key?: string, tags?: string[]): Promise<number> {
    try {
      const response = await fetch(`${this.config.apiEndpoint}/cache/invalidate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, tags })
      });

      if (!response.ok) {
        throw new Error(`Cache invalidation failed: ${response.status}`);
      }

      const result = await response.json();
      return result.invalidated_count;
    } catch (error) {
      throw new InferenceError('Cache invalidation failed', 'CACHE_ERROR', error);
    }
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async shutdown(): Promise<void> {
    // Stop metrics collection
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }

    // Close all active streams
    for (const [requestId, stream] of this.activeStreams) {
      try {
        await stream.return(undefined);
      } catch (error) {
        console.warn(`Failed to close stream ${requestId}:`, error);
      }
    }
    this.activeStreams.clear();

    // Disconnect streaming
    if (this.streamingHandler) {
      this.streamingHandler.disconnect();
      this.streamingHandler = null;
    }

    this.emit('shutdown');
  }
}

// Convenience functions
export async function createInferenceClient(config?: EngineConfig): Promise<EnhancedLocalInferenceClient> {
  const client = new EnhancedLocalInferenceClient(config);
  await client.initialize();
  return client;
}

export async function createHighPerformanceClient(config?: Partial<EngineConfig>): Promise<EnhancedLocalInferenceClient> {
  return createInferenceClient({
    mode: 'high_performance',
    maxBatchSize: 16,
    enableOptimization: true,
    autoOptimization: true,
    ...config
  });
}

export async function createMemoryOptimizedClient(config?: Partial<EngineConfig>): Promise<EnhancedLocalInferenceClient> {
  return createInferenceClient({
    mode: 'memory_optimized',
    maxConcurrentModels: 1,
    cacheSizeMb: 1024,
    ...config
  });
}

// Global client instance
let globalClient: EnhancedLocalInferenceClient | null = null;

export async function getGlobalClient(config?: EngineConfig): Promise<EnhancedLocalInferenceClient> {
  if (!globalClient) {
    globalClient = await createInferenceClient(config);
  }
  return globalClient;
}

export { StreamingHandler };