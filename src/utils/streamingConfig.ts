import { StreamingConfig } from '../types/streaming';

// Default streaming configurations for different environments
export const streamingConfigs = {
  development: {
    endpoint: 'ws://localhost:3001/api/stream',
    method: 'WebSocket' as const,
    reconnectAttempts: 5,
    reconnectDelay: 1000,
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
    }
  },
  
  production: {
    endpoint: '/api/stream',
    method: 'SSE' as const,
    reconnectAttempts: 3,
    reconnectDelay: 2000,
    timeout: 45000,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache'
    }
  },

  // OpenAI-compatible streaming
  openai: {
    endpoint: 'https://api.openai.com/v1/chat/completions',
    method: 'SSE' as const,
    reconnectAttempts: 3,
    reconnectDelay: 1000,
    timeout: 60000,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.REACT_APP_OPENAI_API_KEY || ''}`,
    }
  },

  // Local AI models (Ollama, etc.)
  local: {
    endpoint: 'http://localhost:11434/api/chat',
    method: 'SSE' as const,
    reconnectAttempts: 5,
    reconnectDelay: 500,
    timeout: 120000,
    headers: {
      'Content-Type': 'application/json',
    }
  }
} as const;

export type StreamingEnvironment = keyof typeof streamingConfigs;

export const getStreamingConfig = (
  environment: StreamingEnvironment = 'development',
  overrides: Partial<StreamingConfig> = {}
): StreamingConfig => {
  const baseConfig = streamingConfigs[environment];
  
  return {
    ...baseConfig,
    ...overrides,
    headers: {
      ...baseConfig.headers,
      ...overrides.headers
    }
  };
};

// Auto-detect best configuration based on environment
export const autoDetectStreamingConfig = (): StreamingConfig => {
  const isDev = process.env.NODE_ENV === 'development';
  const hasWebSocket = typeof WebSocket !== 'undefined';
  const hasEventSource = typeof EventSource !== 'undefined';
  
  if (isDev) {
    return getStreamingConfig('development', {
      method: hasWebSocket ? 'WebSocket' : 'SSE'
    });
  }
  
  return getStreamingConfig('production', {
    method: hasEventSource ? 'SSE' : 'WebSocket'
  });
};

// Configuration validator
export const validateStreamingConfig = (config: StreamingConfig): string[] => {
  const errors: string[] = [];
  
  if (!config.endpoint) {
    errors.push('Endpoint is required');
  }
  
  if (!['SSE', 'WebSocket'].includes(config.method)) {
    errors.push('Method must be either "SSE" or "WebSocket"');
  }
  
  if (config.reconnectAttempts < 0) {
    errors.push('Reconnect attempts must be non-negative');
  }
  
  if (config.reconnectDelay < 0) {
    errors.push('Reconnect delay must be non-negative');
  }
  
  if (config.timeout <= 0) {
    errors.push('Timeout must be positive');
  }
  
  try {
    new URL(config.endpoint);
  } catch {
    errors.push('Endpoint must be a valid URL');
  }
  
  return errors;
};

// Performance optimization configurations
export const performanceConfigs = {
  highThroughput: {
    reconnectAttempts: 1,
    reconnectDelay: 100,
    timeout: 5000
  },
  
  reliable: {
    reconnectAttempts: 10,
    reconnectDelay: 5000,
    timeout: 120000
  },
  
  balanced: {
    reconnectAttempts: 3,
    reconnectDelay: 1000,
    timeout: 30000
  }
} as const;

export type PerformanceProfile = keyof typeof performanceConfigs;

export const applyPerformanceProfile = (
  config: StreamingConfig,
  profile: PerformanceProfile
): StreamingConfig => {
  return {
    ...config,
    ...performanceConfigs[profile]
  };
};