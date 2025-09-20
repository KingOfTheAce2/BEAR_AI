import { EventEmitter } from 'events';

import {
  StreamingMessage,
  StreamingChunk,
  StreamingConfig,
  ConnectionState,
  StreamingError,
  StreamingOptions,
  StreamingEvent,
  StreamingMetrics
} from '../types/streaming';

export class StreamingService extends EventEmitter {
  private config: StreamingConfig;
  private connectionState: ConnectionState;
  private eventSource: EventSource | null = null;
  private websocket: WebSocket | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private metrics: StreamingMetrics;
  private activeStreams = new Map<string, StreamingMessage>();

  constructor(config: StreamingConfig) {
    super();
    this.config = config;
    this.connectionState = {
      status: 'disconnected',
      reconnectAttempts: 0
    };
    this.metrics = {
      messagesStreamed: 0,
      totalTokens: 0,
      averageLatency: 0,
      connectionUptime: 0,
      errorCount: 0,
      reconnectionCount: 0
    };
  }

  async connect(): Promise<void> {
    if (this.connectionState.status === 'connected' || this.connectionState.status === 'connecting') {
      return;
    }

    this.setConnectionState('connecting');
    
    try {
      if (this.config.method === 'SSE') {
        await this.connectSSE();
      } else {
        await this.connectWebSocket();
      }
    } catch (error) {
      this.handleConnectionError(error as Error);
      throw error;
    }
  }

  private async connectSSE(): Promise<void> {
    return new Promise((resolve, reject) => {
      const eventSource = new EventSource(this.config.endpoint);
      
      eventSource.onopen = () => {
        this.eventSource = eventSource;
        this.setConnectionState('connected');
        this.connectionState.lastConnected = new Date();
        this.connectionState.reconnectAttempts = 0;
        this.emit('connect');
        resolve();
      };

      eventSource.onmessage = (event) => {
        this.handleStreamingData(event.data);
      };

      eventSource.onerror = (error) => {
        this.handleConnectionError(new Error('SSE connection failed'));
        reject(error);
      };

      // Timeout handling
      const timeout = setTimeout(() => {
        eventSource.close();
        reject(new Error('Connection timeout'));
      }, this.config.timeout);

      eventSource.onopen = () => {
        clearTimeout(timeout);
        this.eventSource = eventSource;
        this.setConnectionState('connected');
        this.connectionState.lastConnected = new Date();
        this.connectionState.reconnectAttempts = 0;
        this.emit('connect');
        resolve();
      };
    });
  }

  private async connectWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(this.config.endpoint);
      
      ws.onopen = () => {
        this.websocket = ws;
        this.setConnectionState('connected');
        this.connectionState.lastConnected = new Date();
        this.connectionState.reconnectAttempts = 0;
        this.emit('connect');
        resolve();
      };

      ws.onmessage = (event) => {
        this.handleStreamingData(event.data);
      };

      ws.onerror = (error) => {
        this.handleConnectionError(new Error('WebSocket connection failed'));
        reject(error);
      };

      ws.onclose = () => {
        this.setConnectionState('disconnected');
        this.emit('disconnect');
        this.attemptReconnection();
      };

      // Timeout handling
      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error('Connection timeout'));
      }, this.config.timeout);

      ws.onopen = () => {
        clearTimeout(timeout);
        this.websocket = ws;
        this.setConnectionState('connected');
        this.connectionState.lastConnected = new Date();
        this.connectionState.reconnectAttempts = 0;
        this.emit('connect');
        resolve();
      };
    });
  }

  async streamMessage(prompt: string, options: StreamingOptions): Promise<string> {
    if (this.connectionState.status !== 'connected') {
      await this.connect();
    }

    const messageId = this.generateMessageId();
    const startTime = Date.now();

    const message: StreamingMessage = {
      id: messageId,
      content: '',
      timestamp: new Date(),
      isComplete: false,
      type: 'assistant'
    };

    this.activeStreams.set(messageId, message);

    try {
      const payload = {
        id: messageId,
        prompt,
        ...options
      };

      if (this.config.method === 'WebSocket' && this.websocket) {
        this.websocket.send(JSON.stringify(payload));
      } else {
        // For SSE, we might need to make an HTTP request to initiate the stream
        await fetch(this.config.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...this.config.headers
          },
          body: JSON.stringify(payload)
        });
      }

      return new Promise((resolve, reject) => {
        const onComplete = (completedMessage: StreamingMessage) => {
          if (completedMessage.id === messageId) {
            this.activeStreams.delete(messageId);
            this.updateMetrics(completedMessage, Date.now() - startTime);
            this.off('complete', onComplete);
            this.off('error', onError);
            resolve(completedMessage.content);
          }
        };

        const onError = (error: StreamingError) => {
          this.activeStreams.delete(messageId);
          this.metrics.errorCount++;
          this.off('complete', onComplete);
          this.off('error', onError);
          reject(error);
        };

        this.on('complete', onComplete);
        this.on('error', onError);
      });

    } catch (error) {
      this.activeStreams.delete(messageId);
      throw this.createStreamingError('server', `Failed to start stream: ${error.message}`, true);
    }
  }

  private handleStreamingData(data: string): void {
    try {
      const chunk: StreamingChunk = JSON.parse(data);
      const message = this.activeStreams.get(chunk.id);

      if (!message) {
        return;
      }

      message.content += chunk.delta;
      message.metadata = { ...message.metadata, ...chunk.metadata };

      this.emit('chunk', chunk);

      if (chunk.finished) {
        message.isComplete = true;
        this.emit('complete', message);
      }

      if (chunk.error) {
        const error = this.createStreamingError('server', chunk.error, true);
        this.emit('error', error);
      }

    } catch (error) {
      const parseError = this.createStreamingError('parse', `Failed to parse streaming data: ${error.message}`, false);
      this.emit('error', parseError);
    }
  }

  private handleConnectionError(error: Error): void {
    this.metrics.errorCount++;
    this.setConnectionState('error', error.message);
    
    const streamingError = this.createStreamingError(
      'connection',
      error.message,
      this.connectionState.reconnectAttempts < this.config.reconnectAttempts
    );
    
    this.emit('error', streamingError);
    this.attemptReconnection();
  }

  private attemptReconnection(): void {
    if (this.connectionState.reconnectAttempts >= this.config.reconnectAttempts) {
      this.setConnectionState('error', 'Max reconnection attempts reached');
      return;
    }

    this.setConnectionState('reconnecting');
    this.connectionState.reconnectAttempts++;
    this.metrics.reconnectionCount++;

    this.reconnectTimer = setTimeout(async () => {
      try {
        await this.connect();
      } catch (error) {
        // Will be handled by handleConnectionError
      }
    }, this.config.reconnectDelay * Math.pow(2, this.connectionState.reconnectAttempts - 1));
  }

  private setConnectionState(status: ConnectionState['status'], error?: string): void {
    this.connectionState.status = status;
    this.connectionState.error = error;
    this.emit('connectionStateChange', { ...this.connectionState });
  }

  private createStreamingError(
    type: StreamingError['type'],
    message: string,
    recoverable: boolean
  ): StreamingError {
    return {
      type,
      message,
      recoverable,
      timestamp: new Date()
    };
  }

  private updateMetrics(message: StreamingMessage, latency: number): void {
    this.metrics.messagesStreamed++;
    this.metrics.totalTokens += message.metadata?.tokenCount || 0;
    this.metrics.averageLatency = (this.metrics.averageLatency + latency) / 2;
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getConnectionState(): ConnectionState {
    return { ...this.connectionState };
  }

  getMetrics(): StreamingMetrics {
    return { ...this.metrics };
  }

  async disconnect(): Promise<void> {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }

    this.setConnectionState('disconnected');
    this.emit('disconnect');
  }

  // Fallback to regular HTTP request if streaming fails
  async fallbackToHttp(prompt: string, options: Omit<StreamingOptions, 'stream'>): Promise<string> {
    try {
      const response = await fetch(this.config.endpoint.replace('/stream', ''), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.config.headers
        },
        body: JSON.stringify({
          prompt,
          ...options,
          stream: false
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.content || data.message || '';
    } catch (error) {
      throw this.createStreamingError('network', `Fallback request failed: ${error.message}`, false);
    }
  }
}

// Factory function to create streaming service instances
export const createStreamingService = (config: Partial<StreamingConfig> = {}): StreamingService => {
  const defaultConfig: StreamingConfig = {
    endpoint: '/api/stream',
    method: 'SSE',
    reconnectAttempts: 3,
    reconnectDelay: 1000,
    timeout: 30000,
    ...config
  };

  return new StreamingService(defaultConfig);
};

// Singleton instance for default usage
export const streamingService = createStreamingService();