/**
 * Core Model Manager
 * Orchestrates model loading, unloading, and lifecycle management with memory awareness
 */

import { ModelConfig, LoadedModel, ModelManager, ModelLoadOptions, ModelInferenceOptions, ModelInferenceResult, MemoryStats, ModelManagerConfig, ModelManagerStats, ModelStatus, ModelStatusType, ModelError, ModelErrorCode, ModelEvent, ModelEventType, ModelEventListener, ModelPriority, ModelType, MemoryPressure } from '../types/modelTypes';

import MemoryAwareLoader from '../utils/memoryAwareLoader';
import { GPT4ALLIntegration, GPT4ALLFactory } from './gpt4allIntegration';
import { EventEmitter } from 'events';
import LocalModelStorage from '../utils/localModelStorage';
import ModelCapabilitiesDetector from '../utils/modelCapabilitiesDetector';
import LocalInferenceOptimizer from '../utils/localInferenceOptimizer';
import OfflinePerformanceMonitor, { PerformanceRecommendation } from '../utils/offlinePerformanceMonitor';
import LocalConfigManager from '../utils/localConfigManager';

export class CoreModelManager extends EventEmitter implements ModelManager {
  private loadedModels: Map<string, LoadedModel> = new Map();
  private modelConfigs: Map<string, ModelConfig> = new Map();
  private memoryLoader: MemoryAwareLoader;
  private config: ModelManagerConfig;
  private eventListeners: Map<ModelEventType, ModelEventListener[]> = new Map();
  private stats: ModelManagerStats;
  private isShuttingDown: boolean = false;
  
  // Enhanced local-first components
  private localStorage: LocalModelStorage;
  private capabilitiesDetector: ModelCapabilitiesDetector;
  private inferenceOptimizer: LocalInferenceOptimizer;
  private performanceMonitor: OfflinePerformanceMonitor;
  private configManager: LocalConfigManager;
  private modelDirectories: string[] = [];
  private watchedDirectories: Map<string, any> = new Map();

  constructor(config: Partial<ModelManagerConfig> = {}) {
    super();
    this.config = {
      maxConcurrentModels: config.maxConcurrentModels || 3,
      memoryThreshold: config.memoryThreshold || 80,
      cacheSize: config.cacheSize || 2 * 1024 * 1024 * 1024, // 2GB
      autoUnloadTimeout: config.autoUnloadTimeout || 30, // 30 minutes
      compressionEnabled: config.compressionEnabled ?? true,
      fallbackModel: config.fallbackModel,
      memoryCheckInterval: config.memoryCheckInterval || 5000,
      enableTelemetry: config.enableTelemetry ?? true
    };

    this.memoryLoader = new MemoryAwareLoader(
      this.config.memoryThreshold,
      95, // Critical threshold
      this.config.memoryCheckInterval
    );

    this.stats = this.initializeStats();
    
    // Initialize enhanced local-first components
    this.localStorage = new LocalModelStorage();
    this.capabilitiesDetector = new ModelCapabilitiesDetector();
    this.inferenceOptimizer = new LocalInferenceOptimizer(this.config);
    this.performanceMonitor = new OfflinePerformanceMonitor();
    this.configManager = new LocalConfigManager();
    
    this.setupAutoUnloadTimer();
    this.setupEventListeners();
    this.setupPerformanceMonitoring();
    this.initializeLocalStorage();
  }

  /**
   * Enhanced recursive model discovery with local filesystem scanning
   */
  public async discoverModels(directories: string[]): Promise<ModelConfig[]> {
    const allModels: ModelConfig[] = [];
    this.modelDirectories = [...directories];
    
    for (const directory of directories) {
      try {
        // Enhanced recursive discovery with metadata extraction
        const models = await this.recursiveModelDiscovery(directory);
        allModels.push(...models);
        
        // Store discovered models locally
        await this.localStorage.storeDiscoveredModels(directory, models);
        
        // Setup directory watching for real-time updates
        await this.setupDirectoryWatcher(directory);
        
        // Emit discovery event
        this.emitEvent({
          type: ModelEventType.MODEL_DISCOVERED,
          timestamp: new Date(),
          data: { 
            directory, 
            modelsFound: models.length,
            cached: false,
            recursive: true
          }
        });
      } catch (error) {
        console.warn(`Failed to discover models in ${directory}:`, error);
        
        // Try to load from local cache if directory scan fails
        try {
          const cachedModels = await this.localStorage.getCachedModels(directory);
          if (cachedModels.length > 0) {
            allModels.push(...cachedModels);
            console.info(`Loaded ${cachedModels.length} models from cache for ${directory}`);
          }
        } catch (cacheError) {
          console.warn(`Failed to load cached models for ${directory}:`, cacheError);
        }
      }
    }
    
    return allModels;
  }

  /**
   * Switch active model with optimization
   */
  public async switchModel(fromModelId: string, toModelId: string): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Load new model first (if not already loaded)
      let targetModel = this.loadedModels.get(toModelId);
      if (!targetModel || targetModel.status !== ModelStatus.LOADED) {
        targetModel = await this.loadModel(toModelId, { priority: ModelPriority.HIGH });
      }
      
      // Unload previous model if different
      if (fromModelId && fromModelId !== toModelId) {
        await this.unloadModel(fromModelId);
      }
      
      const switchTime = Date.now() - startTime;
      
      this.emitEvent({
        type: ModelEventType.MODEL_SWITCHED,
        timestamp: new Date(),
        data: { 
          fromModel: fromModelId, 
          toModel: toModelId, 
          switchTime 
        }
      });
    } catch (error) {
      this.emitEvent({
        type: ModelEventType.MODEL_ERROR,
        timestamp: new Date(),
        modelId: toModelId,
        data: { error: error instanceof Error ? error.message : 'Model switch failed' }
      });
      throw error;
    }
  }

  /**
   * Generate text with streaming support
   */
  public async generateTextStream(
    modelId: string,
    prompt: string,
    options: ModelInferenceOptions = {},
    onToken?: (token: string) => void
  ): Promise<ModelInferenceResult> {
    const model = this.loadedModels.get(modelId);
    if (!model) {
      throw new ModelError(
        `Model not loaded: ${modelId}`,
        ModelErrorCode.MODEL_NOT_FOUND,
        { recoverable: true }
      );
    }

    const startTime = Date.now();
    model.lastUsed = new Date();
    model.status = ModelStatus.ACTIVE;

    try {
      let fullText = '';
      let tokenCount = 0;
      
      // Check if model supports streaming
      if (model.instance.generateStream) {
        const stream = model.instance.generateStream(prompt, {
          ...options,
          streaming: true
        });
        
        for await (const chunk of stream) {
          const token = chunk.text || chunk;
          fullText += token;
          tokenCount++;
          
          if (onToken) {
            onToken(token);
          }
          
          // Emit streaming event
          this.emitEvent({
            type: ModelEventType.STREAM_TOKEN,
            timestamp: new Date(),
            modelId,
            data: { token, tokenIndex: tokenCount }
          });
        }
      } else {
        // Fallback to regular generation
        const result = await this.generateText(modelId, prompt, options);
        fullText = result.text;
        tokenCount = result.tokens;
        
        // Simulate streaming for non-streaming models
        if (onToken) {
          const words = fullText.split(' ');
          for (const word of words) {
            onToken(word + ' ');
          }
        }
      }
      
      const inferenceTime = Date.now() - startTime;
      model.status = ModelStatus.LOADED;
      
      return {
        text: fullText,
        tokens: tokenCount,
        inferenceTime,
        memoryUsed: model.memoryUsage,
        model: modelId,
        timestamp: new Date(),
        context: options.context
      };
    } catch (error) {
      model.status = ModelStatus.ERROR;
      throw error;
    }
  }

  /**
   * Get comprehensive model performance metrics
   */
  public getModelMetrics(modelId?: string): ModelPerformanceMetrics[] {
    const metrics: ModelPerformanceMetrics[] = [];
    
    const modelsToCheck = modelId ? 
      [this.loadedModels.get(modelId)].filter(Boolean) : 
      Array.from(this.loadedModels.values());
    
    for (const model of modelsToCheck) {
      if (!model) continue;
      
      metrics.push({
        modelId: model.config.id,
        modelName: model.config.name,
        status: model.status,
        memoryUsage: model.memoryUsage,
        inferenceCount: model.inferenceCount,
        averageResponseTime: model.averageResponseTime,
        loadTime: model.loadedAt ? Date.now() - model.loadedAt.getTime() : 0,
        lastUsed: model.lastUsed,
        errorCount: this.getModelErrorCount(model.config.id),
        throughput: this.calculateThroughput(model),
        efficiency: this.calculateEfficiency(model)
      });
    }
    
    return metrics;
  }

  /**
   * Load a model into memory
   */
  public async loadModel(
    modelId: string,
    options: ModelLoadOptions = {}
  ): Promise<LoadedModel> {
    const startTime = Date.now();
    
    try {
      // Check if model is already loaded
      const existingModel = this.loadedModels.get(modelId);
      if (existingModel && existingModel.status === ModelStatus.LOADED) {
        existingModel.lastUsed = new Date();
        return existingModel;
      }

      // Get model configuration
      const modelConfig = this.modelConfigs.get(modelId);
      if (!modelConfig) {
        throw new ModelError(
          `Model configuration not found: ${modelId}`,
          ModelErrorCode.MODEL_NOT_FOUND,
          { recoverable: false }
        );
      }

      // Check concurrent model limit
      if (!options.forceLoad && this.loadedModels.size >= this.config.maxConcurrentModels) {
        throw new ModelError(
          `Maximum concurrent models limit reached (${this.config.maxConcurrentModels})`,
          ModelErrorCode.INSUFFICIENT_MEMORY,
          { 
            recoverable: true,
            suggestions: ['Unload existing models', 'Increase maxConcurrentModels limit']
          }
        );
      }

      // Check memory availability and get loading strategy
      const strategy = await this.memoryLoader.getLoadingStrategy(modelConfig, options);
      
      if (strategy.action === 'defer') {
        throw new ModelError(
          strategy.reason || 'Model loading deferred due to resource constraints',
          ModelErrorCode.INSUFFICIENT_MEMORY,
          { 
            recoverable: true,
            suggestions: ['Try again later', 'Set forceLoad option', 'Free up memory']
          }
        );
      }

      // Unload models if needed
      if (strategy.preUnloadModels.length > 0) {
        await this.unloadModels(strategy.preUnloadModels);
      }

      // Create model instance
      const modelInstance = await this.createModelInstance(modelConfig);
      
      // Create loaded model entry
      const loadedModel: LoadedModel = {
        config: modelConfig,
        instance: modelInstance,
        status: ModelStatus.LOADING,
        loadedAt: new Date(),
        lastUsed: new Date(),
        memoryUsage: 0,
        inferenceCount: 0,
        averageResponseTime: 0
      };

      this.loadedModels.set(modelId, loadedModel);
      this.memoryLoader.registerLoadedModel(loadedModel);

      try {
        // Load the actual model
        await modelInstance.loadModel();
        loadedModel.status = ModelStatus.LOADED;
        loadedModel.memoryUsage = modelInstance.getMemoryUsage();

        // Update statistics
        this.stats.loadedModels++;
        this.stats.totalMemoryUsed += loadedModel.memoryUsage;
        this.stats.averageLoadTime = this.updateAverageLoadTime(Date.now() - startTime);

        // Emit event
        this.emitEvent({
          type: ModelEventType.MODEL_LOADED,
          timestamp: new Date(),
          modelId,
          data: { loadTime: Date.now() - startTime }
        });

        return loadedModel;
      } catch (error) {
        // Cleanup on loading failure
        this.loadedModels.delete(modelId);
        this.memoryLoader.unregisterModel(modelId);
        loadedModel.status = ModelStatus.ERROR;
        throw error;
      }
    } catch (error) {
      this.emitEvent({
        type: ModelEventType.MODEL_ERROR,
        timestamp: new Date(),
        modelId,
        data: { error: error instanceof Error ? error.message : 'Unknown error' }
      });
      throw error;
    }
  }

  /**
   * Unload a specific model
   */
  public async unloadModel(modelId: string): Promise<void> {
    const model = this.loadedModels.get(modelId);
    if (!model) {
      return; // Model not loaded
    }

    try {
      model.status = ModelStatus.UNLOADING;
      
      // Unload the model instance
      if (model.instance && model.instance.unloadModel) {
        await model.instance.unloadModel();
      }

      // Update statistics
      this.stats.loadedModels--;
      this.stats.totalMemoryUsed = Math.max(0, this.stats.totalMemoryUsed - model.memoryUsage);

      // Remove from tracking
      this.loadedModels.delete(modelId);
      this.memoryLoader.unregisterModel(modelId);

      this.emitEvent({
        type: ModelEventType.MODEL_UNLOADED,
        timestamp: new Date(),
        modelId,
        data: { memoryFreed: model.memoryUsage }
      });
    } catch (error) {
      console.error(`Failed to unload model ${modelId}:`, error);
      // Still remove from tracking even if unloading failed
      this.loadedModels.delete(modelId);
      this.memoryLoader.unregisterModel(modelId);
    }
  }

  /**
   * Unload multiple models
   */
  private async unloadModels(modelIds: string[]): Promise<void> {
    const unloadPromises = modelIds.map(modelId => this.unloadModel(modelId));
    await Promise.all(unloadPromises);
  }

  /**
   * Unload all models
   */
  public async unloadAllModels(): Promise<void> {
    this.isShuttingDown = true;
    const modelIds = Array.from(this.loadedModels.keys());
    await this.unloadModels(modelIds);
  }

  /**
   * Get all loaded models
   */
  public getLoadedModels(): LoadedModel[] {
    return Array.from(this.loadedModels.values());
  }

  /**
   * Get specific loaded model
   */
  public getModel(modelId: string): LoadedModel | null {
    return this.loadedModels.get(modelId) || null;
  }

  /**
   * Generate text using a loaded model
   */
  public async generateText(
    modelId: string,
    prompt: string,
    options: ModelInferenceOptions = {}
  ): Promise<ModelInferenceResult> {
    const model = this.loadedModels.get(modelId);
    if (!model) {
      // Try to auto-load if not loaded
      await this.loadModel(modelId, { priority: ModelPriority.HIGH });
      const reloadedModel = this.loadedModels.get(modelId);
      if (!reloadedModel) {
        throw new ModelError(
          `Model not loaded and auto-loading failed: ${modelId}`,
          ModelErrorCode.MODEL_NOT_FOUND,
          { recoverable: true }
        );
      }
    }

    const loadedModel = this.loadedModels.get(modelId)!;
    loadedModel.status = ModelStatus.ACTIVE;
    loadedModel.lastUsed = new Date();

    try {
      // Use inference optimizer for enhanced performance
      const result = await this.inferenceOptimizer.optimizeInference(
        modelId,
        prompt,
        options,
        async (optimizedPrompt, optimizedOptions) => {
          return await loadedModel.instance.generate(optimizedPrompt, optimizedOptions);
        }
      );
      
      // Record performance metrics
      this.performanceMonitor.recordInference(
        modelId,
        result.inferenceTime,
        result.tokens || 0,
        { cached: result.cached || false }
      );
      
      // Update statistics
      loadedModel.inferenceCount++;
      loadedModel.averageResponseTime = this.updateAverageResponseTime(
        loadedModel.averageResponseTime,
        result.inferenceTime,
        loadedModel.inferenceCount
      );
      
      this.stats.totalInferences++;
      loadedModel.status = ModelStatus.LOADED;

      this.emitEvent({
        type: ModelEventType.INFERENCE_COMPLETED,
        timestamp: new Date(),
        modelId,
        data: { 
          inferenceTime: result.inferenceTime,
          tokens: result.tokens
        }
      });

      return result;
    } catch (error) {
      loadedModel.status = ModelStatus.ERROR;
      throw error;
    }
  }

  /**
   * Get memory statistics
   */
  public async getMemoryStats(): Promise<MemoryStats> {
    return await this.memoryLoader.getMemoryStats();
  }

  /**
   * Get manager statistics
   */
  public getStats(): ModelManagerStats {
    const currentTime = Date.now();
    this.stats.uptime = Math.floor((currentTime - this.stats.uptime) / 1000);
    return { ...this.stats };
  }

  /**
   * Add event listener
   */
  public addEventListener(type: ModelEventType, listener: ModelEventListener): void {
    if (!this.eventListeners.has(type)) {
      this.eventListeners.set(type, []);
    }
    this.eventListeners.get(type)!.push(listener);
  }

  /**
   * Remove event listener
   */
  public removeEventListener(type: ModelEventType, listener: ModelEventListener): void {
    const listeners = this.eventListeners.get(type);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Clear cache (placeholder for cache implementation)
   */
  public async clearCache(): Promise<void> {
    // Implementation would clear model cache
    this.emitEvent({
      type: ModelEventType.CACHE_CLEARED,
      timestamp: new Date()
    });
  }

  /**
   * Optimize memory usage
   */
  public async optimizeMemory(): Promise<void> {
    const result = await this.memoryLoader.optimizeMemory();
    
    if (result.modelsUnloaded.length > 0) {
      this.emitEvent({
        type: ModelEventType.MEMORY_PRESSURE,
        timestamp: new Date(),
        data: { 
          modelsUnloaded: result.modelsUnloaded,
          memoryFreed: result.memoryFreed
        }
      });
    }
  }

  /**
   * Register a model configuration
   */
  public registerModel(config: ModelConfig): void {
    this.modelConfigs.set(config.id, config);
  }

  /**
   * Unregister a model configuration
   */
  public unregisterModel(modelId: string): void {
    this.modelConfigs.delete(modelId);
  }

  /**
   * Get registered model configurations
   */
  public getRegisteredModels(): ModelConfig[] {
    return Array.from(this.modelConfigs.values());
  }

  /**
   * Auto-discover and register GPT4ALL models
   */
  public async discoverGPT4ALLModels(directory: string): Promise<ModelConfig[]> {
    try {
      const models = await GPT4ALLFactory.discoverModels(directory);
      
      for (const model of models) {
        this.registerModel(model);
      }
      
      return models;
    } catch (error) {
      console.error(`Failed to discover GPT4ALL models in ${directory}:`, error);
      return [];
    }
  }

  /**
   * Create model instance based on configuration
   */
  private async createModelInstance(config: ModelConfig): Promise<any> {
    switch (config.type) {
      case ModelType.GPT4ALL:
        return await GPT4ALLFactory.createModel(config);
      
      // Add other model types here as needed
      default:
        throw new ModelError(
          `Unsupported model type: ${config.type}`,
          ModelErrorCode.UNSUPPORTED_FORMAT,
          { recoverable: false }
        );
    }
  }

  /**
   * Setup auto-unload timer for inactive models
   */
  private setupAutoUnloadTimer(): void {
    const checkInterval = this.config.autoUnloadTimeout * 60 * 1000; // Convert to milliseconds
    
    setInterval(() => {
      if (this.isShuttingDown) return;
      
      const now = new Date();
      const modelsToUnload: string[] = [];

      for (const [modelId, model] of this.loadedModels) {
        const timeSinceLastUse = now.getTime() - model.lastUsed.getTime();
        
        if (timeSinceLastUse > checkInterval && 
            model.config.priority > ModelPriority.HIGH) {
          modelsToUnload.push(modelId);
        }
      }

      // Unload inactive models
      modelsToUnload.forEach(modelId => {
        this.unloadModel(modelId).catch(error => {
          console.error(`Failed to auto-unload model ${modelId}:`, error);
        });
      });
    }, checkInterval);
  }

  /**
   * Setup event listeners for memory monitoring
   */
  private setupEventListeners(): void {
    // Listen to memory pressure from MemoryAwareLoader
    this.on('memoryPressure', this.handleMemoryPressure.bind(this));
    this.on('modelError', this.handleModelError.bind(this));
  }

  /**
   * Setup performance monitoring
   */
  private setupPerformanceMonitoring(): void {
    setInterval(() => {
      this.collectPerformanceMetrics();
    }, 10000); // Collect metrics every 10 seconds
  }

  /**
   * Handle memory pressure events
   */
  private async handleMemoryPressure(event: ModelEvent): Promise<void> {
    const { pressure } = event.data || {};
    
    if (pressure === MemoryPressure.HIGH || pressure === MemoryPressure.CRITICAL) {
      await this.optimizeMemory();
    }
  }

  /**
   * Handle model error events
   */
  private handleModelError(event: ModelEvent): void {
    const { modelId, error } = event.data || {};
    
    // Log error for metrics
    this.incrementErrorCount(modelId);
    
    // Attempt recovery for recoverable errors
    if (error?.recoverable) {
      this.scheduleModelReload(modelId);
    }
  }

  /**
   * Collect performance metrics
   */
  private collectPerformanceMetrics(): void {
    const metrics = this.getModelMetrics();
    
    this.emitEvent({
      type: ModelEventType.METRICS_COLLECTED,
      timestamp: new Date(),
      data: { metrics }
    });
  }

  /**
   * Calculate model throughput (inferences per minute)
   */
  private calculateThroughput(model: LoadedModel): number {
    const uptimeMinutes = (Date.now() - model.loadedAt.getTime()) / (1000 * 60);
    return uptimeMinutes > 0 ? model.inferenceCount / uptimeMinutes : 0;
  }

  /**
   * Calculate model efficiency (tokens per second)
   */
  private calculateEfficiency(model: LoadedModel): number {
    return model.averageResponseTime > 0 ? 
      (model.inferenceCount * 100) / model.averageResponseTime : 0;
  }

  /**
   * Get error count for a model
   */
  private getModelErrorCount(modelId: string): number {
    // This would be tracked in a separate error tracking system
    return 0; // Placeholder
  }

  /**
   * Increment error count for a model
   */
  private incrementErrorCount(modelId: string): void {
    // Implementation would increment error counter
  }

  /**
   * Schedule model reload after error
   */
  private scheduleModelReload(modelId: string): void {
    setTimeout(async () => {
      try {
        await this.loadModel(modelId, { forceLoad: true });
      } catch (error) {
        console.error(`Failed to reload model ${modelId}:`, error);
      }
    }, 5000); // Retry after 5 seconds
  }

  /**
   * Initialize statistics
   */
  private initializeStats(): ModelManagerStats {
    return {
      loadedModels: 0,
      totalMemoryUsed: 0,
      cacheSize: 0,
      totalInferences: 0,
      averageLoadTime: 0,
      memoryPressure: MemoryPressure.LOW,
      uptime: Date.now()
    };
  }

  /**
   * Update average load time
   */
  private updateAverageLoadTime(newLoadTime: number): number {
    const currentCount = this.stats.loadedModels;
    const currentAverage = this.stats.averageLoadTime;
    
    return (currentAverage * currentCount + newLoadTime) / (currentCount + 1);
  }

  /**
   * Update average response time
   */
  private updateAverageResponseTime(
    currentAverage: number,
    newTime: number,
    count: number
  ): number {
    return (currentAverage * (count - 1) + newTime) / count;
  }

  /**
   * Emit event to listeners
   */
  private emitEvent(event: ModelEvent): void {
    const listeners = this.eventListeners.get(event.type);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(event);
        } catch (error) {
          console.error('Error in event listener:', error);
        }
      });
    }
  }

  /**
   * Initialize local storage components
   */
  private async initializeLocalStorage(): Promise<void> {
    try {
      console.log('Initializing local-first model management...');
      
      // Load any previously discovered models from cache
      const cachedDirectories = this.modelDirectories;
      for (const directory of cachedDirectories) {
        try {
          const cachedModels = await this.localStorage.getCachedModels(directory);
          for (const model of cachedModels) {
            this.registerModel(model);
          }
        } catch (error) {
          console.warn(`Failed to load cached models from ${directory}:`, error);
        }
      }
      
      console.log('Local storage initialization complete');
    } catch (error) {
      console.error('Failed to initialize local storage:', error);
    }
  }

  /**
   * Enhanced recursive model discovery with metadata extraction
   */
  private async recursiveModelDiscovery(directory: string): Promise<ModelConfig[]> {
    const models: ModelConfig[] = [];
    
    try {
      // First try standard GPT4ALL discovery
      const gpt4allModels = await this.discoverGPT4ALLModels(directory);
      
      // Enhance each discovered model with capabilities detection
      for (const model of gpt4allModels) {
        try {
          // Detect model capabilities
          const capabilities = await this.capabilitiesDetector.detectCapabilities(model);
          
          // Create comprehensive model profile
          const profile = await this.capabilitiesDetector.profileModel(model);
          
          // Create/update local configuration
          const localConfig = await this.configManager.createModelConfig(
            model.path,
            model,
            {
              autoLoad: false,
              priority: 1,
              memoryLimit: capabilities.modelSize * 1.5, // 50% overhead
              performanceMonitoring: true,
              cacheEnabled: true
            }
          );
          
          models.push(model);
          
          console.log(`Enhanced model discovered: ${model.name} with ${capabilities.features?.length || 0} capabilities`);
        } catch (error) {
          console.warn(`Failed to enhance model ${model.name}:`, error);
          models.push(model); // Add basic model even if enhancement fails
        }
      }
      
      return models;
    } catch (error) {
      console.error(`Failed recursive discovery in ${directory}:`, error);
      return [];
    }
  }

  /**
   * Setup directory watching for real-time model discovery
   */
  private async setupDirectoryWatcher(directory: string): Promise<void> {
    try {
      // In a real implementation, this would use file system watchers
      // For web, we might use periodic polling or manual refresh triggers
      console.log(`Setting up directory watcher for: ${directory}`);
      
      // Store directory for future reference
      this.watchedDirectories.set(directory, {
        path: directory,
        lastScanned: new Date(),
        watcherActive: true
      });
      
    } catch (error) {
      console.warn(`Failed to setup directory watcher for ${directory}:`, error);
    }
  }

  /**
   * Enhanced model switching with optimization
   */
  public async switchModelOptimized(
    fromModelId: string,
    toModelId: string,
    options: { preload?: boolean; keepPrevious?: boolean } = {}
  ): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Record switch attempt
      this.performanceMonitor.recordModelSwitch(fromModelId, toModelId, 0, {
        preload: options.preload,
        keepPrevious: options.keepPrevious
      });
      
      // Enhanced switching logic
      if (options.preload) {
        // Preload target model in background
        await this.loadModel(toModelId, { priority: ModelPriority.HIGH });
      }
      
      // Standard switch logic
      await this.switchModel(fromModelId, toModelId);
      
      // Optionally keep previous model loaded
      if (!options.keepPrevious && fromModelId !== toModelId) {
        await this.unloadModel(fromModelId);
      }
      
      const switchTime = Date.now() - startTime;
      
      // Update performance metrics
      this.performanceMonitor.recordModelSwitch(fromModelId, toModelId, switchTime, {
        success: true,
        ...options
      });
      
    } catch (error) {
      const switchTime = Date.now() - startTime;
      this.performanceMonitor.recordModelSwitch(fromModelId, toModelId, switchTime, {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Get comprehensive model analytics
   */
  public getModelAnalytics(modelId?: string): {
    performance: any;
    capabilities: any;
    configuration: any;
    recommendations: PerformanceRecommendation[];
  } {
    if (modelId) {
      const profile = this.capabilitiesDetector.getProfile(modelId);
      const config = this.configManager.getConfig(modelId);
      const performanceSummary = this.performanceMonitor.getModelSummary(modelId);
      const recommendations = this.performanceMonitor.getRecommendations(modelId);
      
      return {
        performance: performanceSummary,
        capabilities: profile?.capabilities,
        configuration: config,
        recommendations
      };
    } else {
      const systemPerformance = this.performanceMonitor.getSystemPerformance();
      const allProfiles = this.capabilitiesDetector.getAllModelSummaries?.() || [];
      const optimizerMetrics = this.inferenceOptimizer.getMetrics();
      const recommendations = this.performanceMonitor.getRecommendations();
      
      return {
        performance: {
          system: systemPerformance,
          optimizer: optimizerMetrics,
          models: allProfiles
        },
        capabilities: allProfiles,
        configuration: this.configManager.getAllConfigs(),
        recommendations
      };
    }
  }

  /**
   * Export all local data for backup
   */
  public async exportLocalData(): Promise<{
    models: string;
    configs: string;
    performance: string;
    timestamp: Date;
  }> {
    const [modelsData, configsData, performanceData] = await Promise.all([
      this.localStorage.exportData(),
      this.configManager.exportConfigs(),
      this.performanceMonitor.exportData()
    ]);
    
    return {
      models: modelsData,
      configs: configsData,
      performance: performanceData,
      timestamp: new Date()
    };
  }

  /**
   * Import local data from backup
   */
  public async importLocalData(backupData: {
    models?: string;
    configs?: string;
    performance?: string;
  }): Promise<void> {
    try {
      if (backupData.models) {
        await this.localStorage.importData(backupData.models);
      }
      
      if (backupData.configs) {
        await this.configManager.importConfigs(backupData.configs);
      }
      
      // Performance data import would be handled if needed
      
      console.log('Successfully imported local data from backup');
    } catch (error) {
      console.error('Failed to import local data:', error);
      throw error;
    }
  }

  /**
   * Optimize system performance
   */
  public async optimizeSystem(): Promise<{
    optimizations: string[];
    improvements: Record<string, number>;
    recommendations: PerformanceRecommendation[];
  }> {
    const optimizations: string[] = [];
    const improvements: Record<string, number> = {};
    
    // Clear optimizer cache if hit rate is low
    const optimizerMetrics = this.inferenceOptimizer.getMetrics();
    if (optimizerMetrics.cacheHitRate < 0.1) {
      this.inferenceOptimizer.clearCache();
      optimizations.push('Cleared low-efficiency inference cache');
    }
    
    // Cleanup old performance data
    this.performanceMonitor.cleanup();
    optimizations.push('Cleaned up old performance data');
    
    // Cleanup old model storage
    await this.localStorage.cleanup();
    optimizations.push('Cleaned up old model storage');
    
    // Get system recommendations
    const recommendations = this.performanceMonitor.getRecommendations();
    
    return {
      optimizations,
      improvements,
      recommendations
    };
  }

  /**
   * Cleanup resources
   */
  public async dispose(): Promise<void> {
    this.isShuttingDown = true;
    
    // Dispose of enhanced components
    try {
      this.localStorage.dispose();
      this.capabilitiesDetector.dispose();
      this.inferenceOptimizer.dispose();
      this.performanceMonitor.dispose();
      this.configManager.dispose();
    } catch (error) {
      console.error('Error disposing enhanced components:', error);
    }
    
    // Original disposal logic
    await this.unloadAllModels();
    this.memoryLoader.dispose();
    this.eventListeners.clear();
    this.watchedDirectories.clear();
  }
}

// Additional interfaces for enhanced functionality
  export interface ModelPerformanceMetrics {
    modelId: string;
    modelName: string;
    status: ModelStatusType;
    memoryUsage: number;
    inferenceCount: number;
    averageResponseTime: number;
  loadTime: number;
  lastUsed: Date;
  errorCount: number;
  throughput: number; // inferences per minute
  efficiency: number; // tokens per second
}

export interface ModelConfiguration {
  autoUnload: boolean;
  memoryLimit: number;
  priority: ModelPriority;
  cacheEnabled: boolean;
  streamingEnabled: boolean;
  timeout: number;
}

export interface ModelRegistry {
  models: Map<string, ModelConfig>;
  configurations: Map<string, ModelConfiguration>;
  performance: Map<string, ModelPerformanceMetrics>;
}

export default CoreModelManager;
