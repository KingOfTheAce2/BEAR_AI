import { StreamingError } from '../types/streaming';
import { streamingErrorRecovery } from '../services/errorRecovery';
import { useStreaming } from './useStreaming';

interface RecoveryState {
  isRecovering: boolean;
  lastError: StreamingError | null;
  recoveryAttempts: number;
  recoveryHistory: Array<{
    error: StreamingError;
    timestamp: Date;
    recovered: boolean;
    strategy?: string;
  }>;
}

interface UseStreamingRecoveryOptions {
  autoRecover?: boolean;
  maxRecoveryAttempts?: number;
  onRecoveryStart?: (error: StreamingError) => void;
  onRecoverySuccess?: (error: StreamingError) => void;
  onRecoveryFailed?: (error: StreamingError) => void;
}

export const useStreamingRecovery = (options: UseStreamingRecoveryOptions = {}) => {
  const {
    autoRecover = true,
    maxRecoveryAttempts = 3,
    onRecoveryStart,
    onRecoverySuccess,
    onRecoveryFailed
  } = options;

  const [recoveryState, setRecoveryState] = useState<RecoveryState>({
    isRecovering: false,
    lastError: null,
    recoveryAttempts: 0,
    recoveryHistory: []
  });

  const streaming = useStreaming({
    autoConnect: false, // We'll handle connection manually
    onError: async (error) => {
      if (autoRecover && recoveryState.recoveryAttempts < maxRecoveryAttempts) {
        await attemptRecovery(error);
      }
    }
  });

  const attemptRecovery = useCallback(async (error: StreamingError) => {
    setRecoveryState(prev => ({
      ...prev,
      isRecovering: true,
      lastError: error,
      recoveryAttempts: prev.recoveryAttempts + 1
    }));

    onRecoveryStart?.(error);

    try {
      // Create a mock service for recovery
      const mockService = {
        getConnectionState: streaming.connectionState,
        connect: streaming.connect,
        disconnect: streaming.disconnect,
        streamMessage: streaming.streamMessage,
        fallbackToHttp: async () => { /* mock implementation */ }
      } as any;

      const recovered = await streamingErrorRecovery.attemptRecovery(mockService, error);

      setRecoveryState(prev => ({
        ...prev,
        isRecovering: false,
        recoveryHistory: [
          ...prev.recoveryHistory,
          {
            error,
            timestamp: new Date(),
            recovered
          }
        ]
      }));

      if (recovered) {
        onRecoverySuccess?.(error);
        // Clear error state
        streaming.clearError();
      } else {
        onRecoveryFailed?.(error);
      }

      return recovered;
    } catch (recoveryError) {
      setRecoveryState(prev => ({
        ...prev,
        isRecovering: false,
        recoveryHistory: [
          ...prev.recoveryHistory,
          {
            error,
            timestamp: new Date(),
            recovered: false
          }
        ]
      }));

      onRecoveryFailed?.(error);
      return false;
    }
  }, [
    streaming,
    recoveryState.recoveryAttempts,
    maxRecoveryAttempts,
    onRecoveryStart,
    onRecoverySuccess,
    onRecoveryFailed
  ]);

  const manualRecovery = useCallback(async (error?: StreamingError) => {
    const targetError = error || recoveryState.lastError || streaming.error;
    if (targetError) {
      return await attemptRecovery(targetError);
    }
    return false;
  }, [attemptRecovery, recoveryState.lastError, streaming.error]);

  const resetRecoveryState = useCallback(() => {
    setRecoveryState({
      isRecovering: false,
      lastError: null,
      recoveryAttempts: 0,
      recoveryHistory: []
    });
    streamingErrorRecovery.clearAttempts();
  }, []);

  const getRecoveryStats = useCallback(() => {
    const history = recoveryState.recoveryHistory;
    const totalAttempts = history.length;
    const successfulRecoveries = history.filter(h => h.recovered).length;
    const recentErrors = history.slice(-5);
    
    return {
      totalAttempts,
      successfulRecoveries,
      successRate: totalAttempts > 0 ? (successfulRecoveries / totalAttempts) * 100 : 0,
      recentErrors,
      currentAttempts: recoveryState.recoveryAttempts
    };
  }, [recoveryState]);

  // Auto-connect with recovery
  const connectWithRecovery = useCallback(async () => {
    try {
      await streaming.connect();
      resetRecoveryState();
    } catch (error) {
      if (autoRecover) {
        await attemptRecovery(error as StreamingError);
      } else {
        throw error;
      }
    }
  }, [streaming.connect, autoRecover, attemptRecovery, resetRecoveryState]);

  // Enhanced streaming with automatic recovery
  const streamMessageWithRecovery = useCallback(async (
    prompt: string,
    options: any = {}
  ) => {
    try {
      return await streaming.streamMessage(prompt, options);
    } catch (error) {
      if (autoRecover) {
        const recovered = await attemptRecovery(error as StreamingError);
        if (recovered) {
          // Retry the message after recovery
          return await streaming.streamMessage(prompt, options);
        }
      }
      throw error;
    }
  }, [streaming.streamMessage, autoRecover, attemptRecovery]);

  return {
    ...streaming,
    
    // Override methods with recovery
    connect: connectWithRecovery,
    streamMessage: streamMessageWithRecovery,
    
    // Recovery-specific state and methods
    recoveryState,
    attemptRecovery: manualRecovery,
    resetRecoveryState,
    getRecoveryStats,
    
    // Recovery status
    isRecovering: recoveryState.isRecovering,
    hasRecoveryHistory: recoveryState.recoveryHistory.length > 0,
    canAttemptRecovery: recoveryState.recoveryAttempts < maxRecoveryAttempts
  };
};

// Hook for recovery monitoring and stats
export const useRecoveryMonitor = () => {
  const [globalStats, setGlobalStats] = useState({
    totalRecoveries: 0,
    successfulRecoveries: 0,
    errorTypes: {} as Record<string, number>,
    averageRecoveryTime: 0
  });

  useEffect(() => {
    // This could connect to a global recovery event system
    // For now, it's a placeholder for monitoring functionality
  }, []);

  return {
    globalStats,
    isMonitoring: true
  };
};