export interface StreamingMessage {
  id: string;
  content: string;
  timestamp: Date;
  isComplete: boolean;
  type: 'user' | 'assistant' | 'system';
  metadata?: {
    model?: string;
    tokenCount?: number;
    latency?: number;
  };
}

export interface StreamingChunk {
  id: string;
  delta: string;
  finished: boolean;
  error?: string;
  metadata?: {
    tokens?: number;
    finishReason?: string;
  };
}

export interface StreamingConfig {
  endpoint: string;
  method: 'SSE' | 'WebSocket';
  reconnectAttempts: number;
  reconnectDelay: number;
  timeout: number;
  headers?: Record<string, string>;
}

export interface ConnectionState {
  status: 'connecting' | 'connected' | 'disconnected' | 'error' | 'reconnecting';
  error?: string;
  lastConnected?: Date;
  reconnectAttempts: number;
  latency?: number;
}

export interface StreamingError {
  type: 'connection' | 'timeout' | 'parse' | 'server' | 'network';
  message: string;
  code?: string | number;
  recoverable: boolean;
  timestamp: Date;
}

export interface StreamingMetrics {
  messagesStreamed: number;
  totalTokens: number;
  averageLatency: number;
  connectionUptime: number;
  errorCount: number;
  reconnectionCount: number;
}

export type StreamingEventType = 
  | 'chunk'
  | 'complete'
  | 'error'
  | 'connect'
  | 'disconnect'
  | 'reconnect'
  | 'timeout';

export interface StreamingEvent {
  type: StreamingEventType;
  data?: any;
  timestamp: Date;
}

export interface StreamingOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream: true;
  onChunk?: (chunk: StreamingChunk) => void;
  onComplete?: (message: StreamingMessage) => void;
  onError?: (error: StreamingError) => void;
  onProgress?: (progress: number) => void;
}