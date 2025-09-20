/**
 * React hook for enhanced model management
 * Provides Ollama-style model management with performance monitoring
 */

import {
  ModelConfig,
  LoadedModel,
  ModelInferenceOptions,
  ModelInferenceResult,
  ModelEventType,
  ModelEvent,
  MemoryStats,
  ModelManagerStats
} from '../types/modelTypes';
import CoreModelManager, { type ModelPerformanceMetrics } from '../services/modelManager';

export interface UseModelManagerOptions {
  autoDiscovery?: boolean;
  discoveryPaths?: string[];
  maxConcurrentModels?: number;
  memoryThreshold?: number;
  enableStreaming?: boolean;
  enableMetrics?: boolean;
}

export interface ModelManagerState {
  models: ModelConfig[];
  loadedModels: LoadedModel[];
  activeModel: string | null;
  isLoading: boolean;
  error: string | null;
  memoryStats: MemoryStats | null;
  managerStats: ModelManagerStats | null;
  metrics: ModelPerformanceMetrics[];
  isStreaming: boolean;
}

export interface ModelManagerActions {
  loadModel: (modelId: string, options?: any) => Promise<void>;
  unloadModel: (modelId: string) => Promise<void>;
  switchModel: (modelId: string) => Promise<void>;
  generateText: (prompt: string, options?: ModelInferenceOptions) => Promise<ModelInferenceResult>;
  generateTextStream: (
    prompt: string, 
    options?: ModelInferenceOptions,
    onToken?: (token: string) => void
  ) => Promise<ModelInferenceResult>;
  discoverModels: (paths?: string[]) => Promise<void>;
  refreshStats: () => Promise<void>;
  clearError: () => void;
  optimizeMemory: () => Promise<void>;
}

export function useModelManager(options: UseModelManagerOptions = {}) {
  const managerRef = useRef<CoreModelManager | null>(null);
  
  const [state, setState] = useState<ModelManagerState>({
    models: [],
    loadedModels: [],
    activeModel: null,
    isLoading: false,
    error: null,
    memoryStats: null,
    managerStats: null,
    metrics: [],
    isStreaming: false
  });

  // Initialize model manager
  useEffect(() => {
    const initializeManager = async () => {
      try {
        setState(prev => ({ ...prev, isLoading: true }));
        
        managerRef.current = new CoreModelManager({
          maxConcurrentModels: options.maxConcurrentModels || 3,
          memoryThreshold: options.memoryThreshold || 80,
          enableTelemetry: options.enableMetrics ?? true
        });

        // Setup event listeners
        setupEventListeners();

        // Auto-discovery if enabled
        if (options.autoDiscovery && options.discoveryPaths) {
          await discoverModels(options.discoveryPaths);
        }

        // Initial stats refresh
        await refreshStats();
        
        setState(prev => ({ ...prev, isLoading: false }));
      } catch (error) {
        setState(prev => ({ 
          ...prev, 
          isLoading: false, 
          error: error instanceof Error ? error.message : 'Failed to initialize model manager'
        }));
      }
    };

    initializeManager();

    // Cleanup on unmount
    return () => {
      if (managerRef.current) {
        managerRef.current.dispose();
      }
    };
  }, []);

  // Setup event listeners for real-time updates
  const setupEventListeners = useCallback(() => {
    if (!managerRef.current) return;

    const manager = managerRef.current;

    // Model loaded event
    manager.addEventListener(ModelEventType.MODEL_LOADED, (event: ModelEvent) => {
      setState(prev => ({
        ...prev,
        loadedModels: manager.getLoadedModels(),
        activeModel: event.modelId || prev.activeModel
      }));
    });

    // Model unloaded event
    manager.addEventListener(ModelEventType.MODEL_UNLOADED, (event: ModelEvent) => {
      setState(prev => ({
        ...prev,
        loadedModels: manager.getLoadedModels(),
        activeModel: prev.activeModel === event.modelId ? null : prev.activeModel
      }));
    });

    // Model error event
    manager.addEventListener(ModelEventType.MODEL_ERROR, (event: ModelEvent) => {
      setState(prev => ({
        ...prev,
        error: event.data?.error || 'Model error occurred'
      }));
    });

    // Model switched event
    manager.addEventListener(ModelEventType.MODEL_SWITCHED, (event: ModelEvent) => {
      setState(prev => ({
        ...prev,
        activeModel: event.data?.toModel || null,
        loadedModels: manager.getLoadedModels()
      }));
    });

    // Metrics collected event
    manager.addEventListener(ModelEventType.METRICS_COLLECTED, (event: ModelEvent) => {
      setState(prev => ({
        ...prev,
        metrics: event.data?.metrics || []
      }));
    });

    // Stream token event
    manager.addEventListener(ModelEventType.STREAM_TOKEN, (event: ModelEvent) => {
      // This could be used to update UI in real-time
      // For now, we just track streaming state
      setState(prev => ({ ...prev, isStreaming: true }));
    });

    // Memory pressure event
    manager.addEventListener(ModelEventType.MEMORY_PRESSURE, async (event: ModelEvent) => {
      await refreshStats();
    });
  }, []);

  // Load a model
  const loadModel = useCallback(async (modelId: string, options: any = {}) => {
    if (!managerRef.current) throw new Error('Model manager not initialized');
    
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      await managerRef.current.loadModel(modelId, options);
      setState(prev => ({ 
        ...prev, 
        isLoading: false,
        loadedModels: managerRef.current!.getLoadedModels(),
        activeModel: modelId
      }));
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load model'
      }));
      throw error;
    }
  }, []);

  // Unload a model
  const unloadModel = useCallback(async (modelId: string) => {
    if (!managerRef.current) throw new Error('Model manager not initialized');
    
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      await managerRef.current.unloadModel(modelId);
      setState(prev => ({ 
        ...prev, 
        isLoading: false,
        loadedModels: managerRef.current!.getLoadedModels(),
        activeModel: prev.activeModel === modelId ? null : prev.activeModel
      }));
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to unload model'
      }));
      throw error;
    }
  }, []);

  // Switch active model
  const switchModel = useCallback(async (modelId: string) => {
    if (!managerRef.current) throw new Error('Model manager not initialized');
    
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      await managerRef.current.switchModel(state.activeModel || '', modelId);
      setState(prev => ({ 
        ...prev, 
        isLoading: false,
        activeModel: modelId,
        loadedModels: managerRef.current!.getLoadedModels()
      }));
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to switch model'
      }));
      throw error;
    }
  }, [state.activeModel]);

  // Generate text
  const generateText = useCallback(async (
    prompt: string, 
    options: ModelInferenceOptions = {}
  ): Promise<ModelInferenceResult> => {
    if (!managerRef.current) throw new Error('Model manager not initialized');
    if (!state.activeModel) throw new Error('No active model selected');
    
    try {
      setState(prev => ({ ...prev, error: null }));
      const result = await managerRef.current.generateText(state.activeModel, prompt, options);
      
      // Refresh metrics after inference
      const metrics = managerRef.current.getModelMetrics();
      setState(prev => ({ ...prev, metrics }));
      
      return result;
    } catch (error) {
      setState(prev => ({ 
        ...prev,
        error: error instanceof Error ? error.message : 'Text generation failed'
      }));
      throw error;
    }
  }, [state.activeModel]);

  // Generate text with streaming
  const generateTextStream = useCallback(async (
    prompt: string,
    options: ModelInferenceOptions = {},
    onToken?: (token: string) => void
  ): Promise<ModelInferenceResult> => {
    if (!managerRef.current) throw new Error('Model manager not initialized');
    if (!state.activeModel) throw new Error('No active model selected');
    
    try {
      setState(prev => ({ ...prev, error: null, isStreaming: true }));
      
      const result = await managerRef.current.generateTextStream(
        state.activeModel, 
        prompt, 
        { ...options, streaming: true },
        onToken
      );
      
      setState(prev => ({ ...prev, isStreaming: false }));
      
      // Refresh metrics after inference
      const metrics = managerRef.current.getModelMetrics();
      setState(prev => ({ ...prev, metrics }));
      
      return result;
    } catch (error) {
      setState(prev => ({ 
        ...prev,
        isStreaming: false,
        error: error instanceof Error ? error.message : 'Streaming generation failed'
      }));
      throw error;
    }
  }, [state.activeModel]);

  // Discover models
  const discoverModels = useCallback(async (paths?: string[]) => {
    if (!managerRef.current) throw new Error('Model manager not initialized');
    
    const discoveryPaths = paths || options.discoveryPaths || [];
    if (discoveryPaths.length === 0) return;
    
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      const discovered = await managerRef.current.discoverModels(discoveryPaths);
      const allModels = managerRef.current.getRegisteredModels();
      
      setState(prev => ({ 
        ...prev, 
        isLoading: false,
        models: allModels
      }));
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        isLoading: false,
        error: error instanceof Error ? error.message : 'Model discovery failed'
      }));
    }
  }, [options.discoveryPaths]);

  // Refresh statistics
  const refreshStats = useCallback(async () => {
    if (!managerRef.current) return;
    
    try {
      const [memoryStats, managerStats, metrics] = await Promise.all([
        managerRef.current.getMemoryStats(),
        Promise.resolve(managerRef.current.getStats()),
        Promise.resolve(managerRef.current.getModelMetrics())
      ]);
      
      setState(prev => ({
        ...prev,
        memoryStats,
        managerStats,
        metrics,
        loadedModels: managerRef.current!.getLoadedModels()
      }));
    } catch (error) {
      console.error('Failed to refresh stats:', error);
    }
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Optimize memory
  const optimizeMemory = useCallback(async () => {
    if (!managerRef.current) return;
    
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      await managerRef.current.optimizeMemory();
      await refreshStats();
      setState(prev => ({ ...prev, isLoading: false }));
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        isLoading: false,
        error: error instanceof Error ? error.message : 'Memory optimization failed'
      }));
    }
  }, [refreshStats]);

  // Auto-refresh stats periodically
  useEffect(() => {
    if (!options.enableMetrics) return;
    
    const interval = setInterval(refreshStats, 30000); // Every 30 seconds
    return () => clearInterval(interval);
  }, [refreshStats, options.enableMetrics]);

  const actions: ModelManagerActions = {
    loadModel,
    unloadModel,
    switchModel,
    generateText,
    generateTextStream,
    discoverModels,
    refreshStats,
    clearError,
    optimizeMemory
  };

  return {
    ...state,
    actions,
    manager: managerRef.current
  };
}

export default useModelManager;