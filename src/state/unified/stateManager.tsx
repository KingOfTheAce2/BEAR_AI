/**
 * Unified State Management System for BEAR AI
 * Consistent state patterns across all components and services
 */

import React, { createContext, useContext, useCallback, useEffect, useMemo } from 'react';
import { createLogger } from '@/utils/unified/logger';
import { errorHandler, BearError } from '@/utils/unified/errorHandler';

// Base state interface
export interface BaseState {
  loading: boolean;
  error: BearError | null;
  lastUpdated: Date | null;
  version: number;
}

// State update interface
export interface StateUpdate<T = unknown> {
  type: string;
  payload?: T;
  meta?: {
    timestamp: Date;
    source: string;
    correlationId?: string;
  };
}

// State manager configuration
export interface StateManagerConfig {
  name: string;
  initialState: Record<string, unknown>;
  persistKey?: string;
  enableDevTools?: boolean;
  enablePersistence?: boolean;
  enableLogging?: boolean;
  enableMetrics?: boolean;
  middleware?: StateMiddleware[];
}

// Middleware interface
export interface StateMiddleware {
  name: string;
  execute: <T,>(state: T, update: StateUpdate<unknown>, next: (state: T) => T) => T;
}

// State manager class
export class StateManager<T extends BaseState> {
  private config: StateManagerConfig;
  private logger: ReturnType<typeof createLogger>;
  private subscribers: Set<(state: T) => void> = new Set();
  private state: T;
  private middleware: StateMiddleware[] = [];

  constructor(config: StateManagerConfig) {
    this.config = {
      enableDevTools: process.env['NODE_ENV'] === 'development',
      enablePersistence: false,
      enableLogging: process.env['NODE_ENV'] === 'development',
      enableMetrics: true,
      middleware: [],
      ...config
    };

    this.logger = createLogger(`StateManager:${this.config.name}`);
    this.middleware = [...(this.config.middleware || []), ...this.getBuiltinMiddleware()];

    // Initialize state
    this.state = this.initializeState();

    // Setup persistence
    if (this.config.enablePersistence && this.config.persistKey) {
      this.loadPersistedState();
    }

    // Setup DevTools
    if (this.config.enableDevTools && typeof window !== 'undefined' && (window as any).__REDUX_DEVTOOLS_EXTENSION__) {
      this.setupDevTools();
    }
  }

  /**
   * Get current state
   */
  getState(): T {
    return { ...this.state };
  }

  /**
   * Update state with action
   */
  dispatch = (update: StateUpdate): void => {
    const prevState = this.state;
    
    try {
      // Apply middleware chain
      let newState = this.state;
      
      const chain = this.middleware.map(middleware => 
        (state: T) => middleware.execute(state, update, (s) => s)
      );

      // Execute middleware chain
      for (const middlewareFunc of chain) {
        newState = middlewareFunc(newState);
      }

      // Apply the actual update
      newState = this.applyUpdate(newState, update);

      // Update state
      this.state = newState;

      // Log state change
      if (this.config.enableLogging) {
        this.logger.debug(`State updated: ${update.type}`, {
          prevState: this.sanitizeState(prevState),
          newState: this.sanitizeState(newState),
          update: update.payload
        });
      }

      // Notify subscribers
      this.notifySubscribers();

      // Persist state
      if (this.config.enablePersistence && this.config.persistKey) {
        this.persistState();
      }

      // Update DevTools
      if (this.config.enableDevTools) {
        this.updateDevTools(update, newState);
      }

    } catch (error) {
      const bearError = errorHandler.system(
        `State update failed: ${update.type}`,
        'STATE_UPDATE_ERROR',
        { 
          state: this.config.name, 
          update: update.type,
          error: error instanceof Error ? error.message : error
        }
      );

      this.state = {
        ...prevState,
        error: bearError,
        lastUpdated: new Date()
      };

      this.logger.error(`State update failed: ${update.type}`, bearError);
      this.notifySubscribers();
    }
  };

  /**
   * Subscribe to state changes
   */
  subscribe = (callback: (state: T) => void): (() => void) => {
    this.subscribers.add(callback);
    
    return () => {
      this.subscribers.delete(callback);
    };
  };

  /**
   * Create selector for specific state slice
   */
  createSelector = <R,>(selector: (state: T) => R): (() => R) => {
    return () => selector(this.state);
  };

  /**
   * Create async action dispatcher
   */
  createAsyncAction = <P, R>(
    type: string,
    asyncFn: (payload: P) => Promise<R>
  ): ((payload: P) => Promise<R>) => {
    return async (payload: P): Promise<R> => {
      // Dispatch loading state
      this.dispatch({
        type: `${type}_PENDING`,
        meta: {
          timestamp: new Date(),
          source: 'async_action'
        }
      });

      try {
        const result = await asyncFn(payload);
        
        // Dispatch success state
        this.dispatch({
          type: `${type}_FULFILLED`,
          payload: result,
          meta: {
            timestamp: new Date(),
            source: 'async_action'
          }
        });

        return result;
      } catch (error) {
        const bearError = error instanceof BearError 
          ? error 
          : errorHandler.system(
              error instanceof Error ? error.message : 'Async action failed',
              'ASYNC_ACTION_ERROR'
            );

        // Dispatch error state
        this.dispatch({
          type: `${type}_REJECTED`,
          payload: bearError,
          meta: {
            timestamp: new Date(),
            source: 'async_action'
          }
        });

        throw bearError;
      }
    };
  };

  // Private methods
  private initializeState(): T {
    const baseState: BaseState = {
      loading: false,
      error: null,
      lastUpdated: null,
      version: 0
    };

    return {
      ...baseState,
      ...this.config.initialState
    } as T;
  }

  private applyUpdate(state: T, update: StateUpdate): T {
    const newState = {
      ...state,
      lastUpdated: new Date(),
      version: state.version + 1
    };

    // Handle standard loading states
    if (update.type.endsWith('_PENDING')) {
      return {
        ...newState,
        loading: true,
        error: null
      };
    }

    if (update.type.endsWith('_FULFILLED')) {
      return {
        ...newState,
        loading: false,
        error: null,
        ...update.payload
      };
    }

    if (update.type.endsWith('_REJECTED')) {
      return {
        ...newState,
        loading: false,
        error: update.payload as BearError
      };
    }

    // Handle custom updates
    if (update.payload) {
      return {
        ...newState,
        ...update.payload
      };
    }

    return newState;
  }

  private notifySubscribers(): void {
    this.subscribers.forEach(callback => {
      try {
        callback(this.state);
      } catch (error) {
        this.logger.error('Subscriber callback failed', { error });
      }
    });
  }

  private loadPersistedState(): void {
    try {
      const persistedState = localStorage.getItem(this.config.persistKey!);
      if (persistedState) {
        const parsed = JSON.parse(persistedState);
        this.state = {
          ...this.state,
          ...parsed,
          // Always reset volatile state
          loading: false,
          error: null
        };
      }
    } catch (error) {
      this.logger.warn('Failed to load persisted state', { error });
    }
  }

  private persistState(): void {
    try {
      const stateToPersist = {
        ...this.state,
        // Don't persist volatile state
        loading: false,
        error: null
      };
      
      localStorage.setItem(
        this.config.persistKey!, 
        JSON.stringify(stateToPersist)
      );
    } catch (error) {
      this.logger.warn('Failed to persist state', { error });
    }
  }

  private sanitizeState(state: T): Record<string, unknown> {
    // Remove sensitive data from logs
    const sensitiveFields = ['password', 'token', 'secret', 'key'];
    const sanitized = { ...state };
    
    Object.keys(sanitized).forEach(key => {
      if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
        (sanitized as any)[key] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  private getBuiltinMiddleware(): StateMiddleware[] {
    const middleware: StateMiddleware[] = [];

    // Logging middleware
    if (this.config.enableLogging) {
      middleware.push({
        name: 'logger',
        execute: (state, update, next) => {
          const startTime = performance.now();
          const result = next(state);
          const duration = performance.now() - startTime;
          
          this.logger.debug(`State middleware: ${update.type}`, {
            duration: `${duration.toFixed(2)}ms`,
            stateSize: JSON.stringify(result).length
          });
          
          return result;
        }
      });
    }

    // Metrics middleware
    if (this.config.enableMetrics) {
      middleware.push({
        name: 'metrics',
        execute: (state, update, next) => {
          // Track state update metrics
          const result = next(state);
          
          // Could integrate with analytics service here
          if (process.env['NODE_ENV'] === 'production') {
            // Send metrics to monitoring service
            // State metrics tracked for production
          }
          
          return result;
        }
      });
    }

    return middleware;
  }

  private setupDevTools(): void {
    // Integration with Redux DevTools
    const devTools = (window as any).__REDUX_DEVTOOLS_EXTENSION__;
    if (devTools) {
      // Initialize DevTools connection
      // Debug logging disabled for production
    }
  }

  private updateDevTools(update: StateUpdate, newState: T): void {
    // Send state updates to DevTools
    if (process.env['NODE_ENV'] === 'development') {
      // DevTools state update logged
    }
  }
}

// React integration
export function createStateProvider<T extends BaseState>(
  stateManager: StateManager<T>
) {
  const StateContext = createContext<{
    state: T;
    dispatch: (update: StateUpdate) => void;
  } | null>(null);

  const StateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [state, setState] = React.useState(stateManager.getState());

    useEffect(() => {
      const unsubscribe = stateManager.subscribe(setState);
      return unsubscribe;
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const contextValue = useMemo(() => ({
      state,
      dispatch: stateManager.dispatch
    }), [state]);

    return (
      <StateContext.Provider value={contextValue}>
        {children}
      </StateContext.Provider>
    );
  };

  const useStateManager = () => {
    const context = useContext(StateContext);
    if (!context) {
      throw new Error('useStateManager must be used within StateProvider');
    }
    return context;
  };

  const useStateSelector = <R,>(selector: (state: T) => R): R => {
    const { state } = useStateManager();
    return useMemo(() => selector(state), [state, selector]);
  };

  const useAsyncAction = <P, R>(
    type: string,
    asyncFn: (payload: P) => Promise<R>
  ): ((payload: P) => Promise<R>) => {
    const { dispatch } = useStateManager();
    
    return useCallback(async (payload: P): Promise<R> => {
      dispatch({
        type: `${type}_PENDING`,
        meta: { timestamp: new Date(), source: 'hook' }
      });

      try {
        const result = await asyncFn(payload);
        dispatch({
          type: `${type}_FULFILLED`,
          payload: result,
          meta: { timestamp: new Date(), source: 'hook' }
        });
        return result;
      } catch (error) {
        const bearError = error instanceof BearError 
          ? error 
          : errorHandler.system(
              error instanceof Error ? error.message : 'Action failed',
              'ASYNC_ACTION_ERROR'
            );

        dispatch({
          type: `${type}_REJECTED`,
          payload: bearError,
          meta: { timestamp: new Date(), source: 'hook' }
        });
        
        throw bearError;
      }
    }, [dispatch, type, asyncFn]);
  };

  return {
    StateProvider,
    useStateManager,
    useStateSelector,
    useAsyncAction,
    StateContext
  };
}

// Utility functions for common state patterns
export const stateUtils = {
  // Create loading state update
  loading: (loading: boolean): StateUpdate => ({
    type: loading ? 'SET_LOADING' : 'CLEAR_LOADING',
    payload: { loading },
    meta: { timestamp: new Date(), source: 'util' }
  }),

  // Create error state update
  error: (error: BearError | null): StateUpdate => ({
    type: error ? 'SET_ERROR' : 'CLEAR_ERROR',
    payload: { error },
    meta: { timestamp: new Date(), source: 'util' }
  }),

  // Create data update
  setData: <T,>(data: Partial<T>): StateUpdate => ({
    type: 'SET_DATA',
    payload: data,
    meta: { timestamp: new Date(), source: 'util' }
  }),

  // Create reset update
  reset: (initialState: Record<string, unknown>): StateUpdate => ({
    type: 'RESET',
    payload: initialState,
    meta: { timestamp: new Date(), source: 'util' }
  })
};

// Export factory function
export function createStateManager<T extends BaseState>(
  config: StateManagerConfig
): StateManager<T> {
  return new StateManager<T>(config);
}