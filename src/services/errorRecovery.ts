import { StreamingError, ConnectionState } from '../types/streaming';
import { StreamingService } from './streamingService';

export interface RecoveryStrategy {
  name: string;
  canRecover: (error: StreamingError, state: ConnectionState) => boolean;
  recover: (service: StreamingService, error: StreamingError) => Promise<boolean>;
  priority: number; // Lower number = higher priority
}

export class StreamingErrorRecovery {
  private strategies: RecoveryStrategy[] = [];
  private recoveryAttempts = new Map<string, number>();
  private maxAttempts = 3;

  constructor() {
    this.registerDefaultStrategies();
  }

  registerStrategy(strategy: RecoveryStrategy): void {
    this.strategies.push(strategy);
    this.strategies.sort((a, b) => a.priority - b.priority);
  }

  async attemptRecovery(
    service: StreamingService,
    error: StreamingError
  ): Promise<boolean> {
    const errorKey = `${error.type}_${error.message}`;
    const attempts = this.recoveryAttempts.get(errorKey) || 0;

    if (attempts >= this.maxAttempts) {
      console.warn(`Max recovery attempts reached for error: ${error.message}`);
      return false;
    }

    this.recoveryAttempts.set(errorKey, attempts + 1);

    const connectionState = service.getConnectionState();
    
    for (const strategy of this.strategies) {
      if (strategy.canRecover(error, connectionState)) {
        console.log(`Attempting recovery with strategy: ${strategy.name}`);
        
        try {
          const success = await strategy.recover(service, error);
          if (success) {
            console.log(`Recovery successful with strategy: ${strategy.name}`);
            this.recoveryAttempts.delete(errorKey);
            return true;
          }
        } catch (recoveryError) {
          console.error(`Recovery strategy ${strategy.name} failed:`, recoveryError);
        }
      }
    }

    return false;
  }

  clearAttempts(): void {
    this.recoveryAttempts.clear();
  }

  private registerDefaultStrategies(): void {
    // Simple reconnection strategy
    this.registerStrategy({
      name: 'reconnect',
      priority: 1,
      canRecover: (error, state) => 
        error.type === 'connection' && state.reconnectAttempts < 3,
      recover: async (service) => {
        try {
          await service.disconnect();
          await new Promise(resolve => setTimeout(resolve, 1000));
          await service.connect();
          return true;
        } catch {
          return false;
        }
      }
    });

    // Endpoint fallback strategy
    this.registerStrategy({
      name: 'endpoint-fallback',
      priority: 2,
      canRecover: (error) => 
        error.type === 'server' || error.type === 'network',
      recover: async (service) => {
        // This would typically switch to a fallback endpoint
        // For now, we'll try the HTTP fallback
        try {
          await service.fallbackToHttp('test', {});
          return true;
        } catch {
          return false;
        }
      }
    });

    // Method switching strategy (SSE <-> WebSocket)
    this.registerStrategy({
      name: 'method-switch',
      priority: 3,
      canRecover: (error) => 
        error.type === 'connection' || error.type === 'timeout',
      recover: async (service) => {
        // This would create a new service with different method
        // Implementation would depend on how we want to handle config changes
        return false; // For now, not implemented
      }
    });

    // Clear browser cache strategy
    this.registerStrategy({
      name: 'cache-clear',
      priority: 4,
      canRecover: (error) => 
        error.type === 'parse' || error.type === 'network',
      recover: async () => {
        try {
          // Clear relevant caches
          if ('caches' in window) {
            const cacheNames = await caches.keys();
            await Promise.all(
              cacheNames.map(name => caches.delete(name))
            );
          }
          return true;
        } catch {
          return false;
        }
      }
    });

    // Browser refresh strategy (last resort)
    this.registerStrategy({
      name: 'page-refresh',
      priority: 10,
      canRecover: (error, state) => 
        error.type === 'connection' && state.reconnectAttempts >= 3,
      recover: async () => {
        const shouldRefresh = window.confirm(
          'Connection issues persist. Refresh the page to retry?'
        );
        if (shouldRefresh) {
          window.location.reload();
        }
        return shouldRefresh;
      }
    });
  }
}

export const streamingErrorRecovery = new StreamingErrorRecovery();

// Utility function to create error recovery wrapper
export const withErrorRecovery = (service: StreamingService) => {
  const originalStreamMessage = service.streamMessage.bind(service);
  
  service.streamMessage = async function(prompt, options) {
    try {
      return await originalStreamMessage(prompt, options);
    } catch (error) {
      const streamingError = error as StreamingError;
      const recovered = await streamingErrorRecovery.attemptRecovery(service, streamingError);
      
      if (recovered) {
        // Retry the original operation
        return await originalStreamMessage(prompt, options);
      }
      
      throw error;
    }
  };

  return service;
};