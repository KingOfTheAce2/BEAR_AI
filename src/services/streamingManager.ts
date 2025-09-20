export class StreamingManager {
import { chatStreamingIntegration } from './chatIntegration';
import { getStreamingConfig, autoDetectStreamingConfig, StreamingEnvironment } from '../utils/streamingConfig';
import { StreamingConfig, StreamingMetrics, ConnectionState } from '../types/streaming';
import { streamingErrorRecovery, withErrorRecovery } from './errorRecovery';
import { streamingService, createStreamingService, StreamingService } from './streamingService';

  private services = new Map<string, StreamingService>();
  private activeService: StreamingService;
  private environment: StreamingEnvironment = 'development';

  constructor() {
    // Initialize with auto-detected configuration
    this.activeService = this.createService('default', autoDetectStreamingConfig());
  }

  createService(name: string, config: StreamingConfig): StreamingService {
    const service = withErrorRecovery(createStreamingService(config));
    this.services.set(name, service);
    return service;
  }

  getService(name: string = 'default'): StreamingService {
    return this.services.get(name) || this.activeService;
  }

  setActiveService(name: string): void {
    const service = this.services.get(name);
    if (service) {
      this.activeService = service;
    } else {
      throw new Error(`Service "${name}" not found`);
    }
  }

  async setupForEnvironment(environment: StreamingEnvironment): Promise<void> {
    this.environment = environment;
    const config = getStreamingConfig(environment);
    
    // Create environment-specific service
    const service = this.createService(environment, config);
    this.setActiveService(environment);
    
    // Setup chat integration
    chatStreamingIntegration.setupStreamingForModel({
      endpoint: config.endpoint,
      headers: config.headers,
      method: config.method
    });
    
    // Connect if not already connected
    if (service.getConnectionState().status === 'disconnected') {
      await service.connect();
    }
  }

  async setupForModel(modelConfig: {
    name: string;
    endpoint: string;
    apiKey?: string;
    method?: 'SSE' | 'WebSocket';
    customHeaders?: Record<string, string>;
  }): Promise<void> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...modelConfig.customHeaders
    };

    if (modelConfig.apiKey) {
      headers['Authorization'] = `Bearer ${modelConfig.apiKey}`;
    }

    const config = getStreamingConfig(this.environment, {
      endpoint: modelConfig.endpoint,
      method: modelConfig.method,
      headers
    });

    const service = this.createService(modelConfig.name, config);
    this.setActiveService(modelConfig.name);
    
    await service.connect();
  }

  async switchToBackup(): Promise<boolean> {
    const backupConfigs = [
      getStreamingConfig('local'),
      getStreamingConfig('development', { method: 'SSE' }),
      getStreamingConfig('development', { method: 'WebSocket' })
    ];

    for (const [index, config] of backupConfigs.entries()) {
      try {
        const backupName = `backup-${index}`;
        const service = this.createService(backupName, config);
        await service.connect();
        this.setActiveService(backupName);
        return true;
      } catch (error) {
        console.warn(`Backup service ${index} failed:`, error);
      }
    }

    return false;
  }

  getConnectionStates(): Record<string, ConnectionState> {
    const states: Record<string, ConnectionState> = {};
    for (const [name, service] of this.services) {
      states[name] = service.getConnectionState();
    }
    return states;
  }

  getAllMetrics(): Record<string, StreamingMetrics> {
    const metrics: Record<string, StreamingMetrics> = {};
    for (const [name, service] of this.services) {
      metrics[name] = service.getMetrics();
    }
    return metrics;
  }

  async disconnectAll(): Promise<void> {
    await Promise.all(
      Array.from(this.services.values()).map(service => service.disconnect())
    );
  }

  removeService(name: string): boolean {
    if (name === 'default') {
      throw new Error('Cannot remove default service');
    }

    const service = this.services.get(name);
    if (service) {
      service.disconnect();
      this.services.delete(name);
      
      // If this was the active service, switch to default
      if (this.activeService === service) {
        this.activeService = this.getService('default');
      }
      
      return true;
    }
    
    return false;
  }

  // Health check for all services
  async healthCheck(): Promise<Record<string, {
    healthy: boolean;
    latency?: number;
    error?: string;
  }>> {
    const results: Record<string, any> = {};

    for (const [name, service] of this.services) {
      const startTime = Date.now();
      try {
        const state = service.getConnectionState();
        if (state.status === 'connected') {
          results[name] = {
            healthy: true,
            latency: state.latency || Date.now() - startTime
          };
        } else {
          results[name] = {
            healthy: false,
            error: state.error || `Status: ${state.status}`
          };
        }
      } catch (error) {
        results[name] = {
          healthy: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }

    return results;
  }

  // Get optimal service based on performance metrics
  getOptimalService(): StreamingService {
    let bestService = this.activeService;
    let bestScore = this.calculateServiceScore(bestService);

    for (const service of this.services.values()) {
      const score = this.calculateServiceScore(service);
      if (score > bestScore) {
        bestService = service;
        bestScore = score;
      }
    }

    return bestService;
  }

  private calculateServiceScore(service: StreamingService): number {
    const state = service.getConnectionState();
    const metrics = service.getMetrics();

    if (state.status !== 'connected') return 0;

    // Score based on latency, error rate, and uptime
    const latencyScore = Math.max(0, 100 - (state.latency || 100));
    const errorRate = metrics.messagesStreamed > 0 
      ? (metrics.errorCount / metrics.messagesStreamed) * 100 
      : 0;
    const errorScore = Math.max(0, 100 - errorRate);
    const uptimeScore = metrics.connectionUptime > 0 ? 100 : 0;

    return (latencyScore * 0.4) + (errorScore * 0.4) + (uptimeScore * 0.2);
  }
}

// Singleton instance
export const streamingManager = new StreamingManager();

// Convenience functions
export const setupStreaming = (environment: StreamingEnvironment) => 
  streamingManager.setupForEnvironment(environment);

export const setupModelStreaming = (config: Parameters<StreamingManager['setupForModel']>[0]) =>
  streamingManager.setupForModel(config);

export const getActiveStreamingService = () => 
  streamingManager.getService();

export const streamingHealthCheck = () => 
  streamingManager.healthCheck();