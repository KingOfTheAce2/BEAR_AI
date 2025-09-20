import {
import { streamingService, StreamingService } from '../services/streamingService';

  StreamingMessage,
  StreamingChunk,
  ConnectionState,
  StreamingError,
  StreamingOptions
} from '../types/streaming';

export interface UseStreamingOptions {
  autoConnect?: boolean;
  customService?: StreamingService;
  onError?: (error: StreamingError) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export interface UseStreamingReturn {
  // State
  isConnected: boolean;
  connectionState: ConnectionState;
  isStreaming: boolean;
  currentMessage: string;
  error: StreamingError | null;
  
  // Actions
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  streamMessage: (prompt: string, options?: Partial<StreamingOptions>) => Promise<string>;
  clearError: () => void;
  
  // Metrics
  metrics: ReturnType<StreamingService['getMetrics']>;
}

export const useStreaming = (options: UseStreamingOptions = {}): UseStreamingReturn => {
  const {
    autoConnect = false,
    customService,
    onError,
    onConnect,
    onDisconnect
  } = options;

  const service = customService || streamingService;
  const [connectionState, setConnectionState] = useState<ConnectionState>(service.getConnectionState());
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentMessage, setCurrentMessage] = useState('');
  const [error, setError] = useState<StreamingError | null>(null);
  const [metrics, setMetrics] = useState(service.getMetrics());
  
  const currentMessageRef = useRef('');
  const streamingPromiseRef = useRef<Promise<string> | null>(null);

  // Handle connection state changes
  useEffect(() => {
    const handleConnectionStateChange = (state: ConnectionState) => {
      setConnectionState(state);
      
      if (state.status === 'connected' && onConnect) {
        onConnect();
      } else if (state.status === 'disconnected' && onDisconnect) {
        onDisconnect();
      }
    };

    const handleChunk = (chunk: StreamingChunk) => {
      currentMessageRef.current += chunk.delta;
      setCurrentMessage(currentMessageRef.current);
    };

    const handleComplete = (message: StreamingMessage) => {
      setCurrentMessage(message.content);
      setIsStreaming(false);
      setMetrics(service.getMetrics());
    };

    const handleError = (streamingError: StreamingError) => {
      setError(streamingError);
      setIsStreaming(false);
      if (onError) {
        onError(streamingError);
      }
    };

    service.on('connectionStateChange', handleConnectionStateChange);
    service.on('chunk', handleChunk);
    service.on('complete', handleComplete);
    service.on('error', handleError);

    return () => {
      service.off('connectionStateChange', handleConnectionStateChange);
      service.off('chunk', handleChunk);
      service.off('complete', handleComplete);
      service.off('error', handleError);
    };
  }, [service, onConnect, onDisconnect, onError]);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect && connectionState.status === 'disconnected') {
      connect();
    }
  }, [autoConnect]);

  const connect = useCallback(async (): Promise<void> => {
    try {
      setError(null);
      await service.connect();
    } catch (err) {
      const connectionError: StreamingError = {
        type: 'connection',
        message: err instanceof Error ? err.message : 'Connection failed',
        recoverable: true,
        timestamp: new Date()
      };
      setError(connectionError);
      throw connectionError;
    }
  }, [service]);

  const disconnect = useCallback(async (): Promise<void> => {
    try {
      await service.disconnect();
      setCurrentMessage('');
      setIsStreaming(false);
      currentMessageRef.current = '';
    } catch (err) {
      console.error('Disconnect error:', err);
    }
  }, [service]);

  const streamMessage = useCallback(async (
    prompt: string,
    streamOptions: Partial<StreamingOptions> = {}
  ): Promise<string> => {
    // Cancel any existing stream
    if (streamingPromiseRef.current) {
      // Note: We can't actually cancel the promise, but we can ignore its result
      streamingPromiseRef.current = null;
    }

    setIsStreaming(true);
    setCurrentMessage('');
    setError(null);
    currentMessageRef.current = '';

    const defaultOptions: StreamingOptions = {
      stream: true,
      ...streamOptions
    };

    try {
      const promise = service.streamMessage(prompt, defaultOptions);
      streamingPromiseRef.current = promise;
      
      const result = await promise;
      
      // Only update state if this is still the current stream
      if (streamingPromiseRef.current === promise) {
        streamingPromiseRef.current = null;
        setIsStreaming(false);
        return result;
      }
      
      return result;
    } catch (err) {
      // Only update state if this is still the current stream
      if (streamingPromiseRef.current) {
        streamingPromiseRef.current = null;
        setIsStreaming(false);
        
        const streamingError = err instanceof Error 
          ? {
              type: 'server' as const,
              message: err.message,
              recoverable: true,
              timestamp: new Date()
            }
          : err as StreamingError;
        
        setError(streamingError);
        
        // Attempt fallback to HTTP
        try {
          const fallbackResult = await service.fallbackToHttp(prompt, defaultOptions);
          setCurrentMessage(fallbackResult);
          return fallbackResult;
        } catch (fallbackErr) {
          throw streamingError;
        }
      }
      
      throw err;
    }
  }, [service]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // State
    isConnected: connectionState.status === 'connected',
    connectionState,
    isStreaming,
    currentMessage,
    error,
    
    // Actions
    connect,
    disconnect,
    streamMessage,
    clearError,
    
    // Metrics
    metrics
  };
};

// Hook for managing multiple concurrent streams
export const useMultipleStreams = (maxConcurrent = 3) => {
  const [streams, setStreams] = useState<Map<string, {
    id: string;
    prompt: string;
    response: string;
    isComplete: boolean;
    error?: StreamingError;
  }>>(new Map());
  
  const [activeStreamCount, setActiveStreamCount] = useState(0);
  const baseStreaming = useStreaming();

  const startStream = useCallback(async (
    id: string,
    prompt: string,
    options?: Partial<StreamingOptions>
  ): Promise<void> => {
    if (activeStreamCount >= maxConcurrent) {
      throw new Error(`Maximum concurrent streams (${maxConcurrent}) exceeded`);
    }

    setStreams(prev => new Map(prev.set(id, {
      id,
      prompt,
      response: '',
      isComplete: false
    })));

    setActiveStreamCount(prev => prev + 1);

    try {
      const response = await baseStreaming.streamMessage(prompt, options);
      
      setStreams(prev => new Map(prev.set(id, {
        id,
        prompt,
        response,
        isComplete: true
      })));
    } catch (error) {
      setStreams(prev => new Map(prev.set(id, {
        id,
        prompt,
        response: '',
        isComplete: true,
        error: error as StreamingError
      })));
    } finally {
      setActiveStreamCount(prev => prev - 1);
    }
  }, [activeStreamCount, maxConcurrent, baseStreaming]);

  const removeStream = useCallback((id: string) => {
    setStreams(prev => {
      const newStreams = new Map(prev);
      newStreams.delete(id);
      return newStreams;
    });
  }, []);

  return {
    streams,
    activeStreamCount,
    maxConcurrent,
    startStream,
    removeStream,
    ...baseStreaming
  };
};