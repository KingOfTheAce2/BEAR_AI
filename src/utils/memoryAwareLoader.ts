/**
 * Memory-aware model loading utility
 * Handles dynamic loading/unloading based on available system memory
 */

import { 
  ModelConfig, 
  LoadedModel, 
  MemoryStats, 
  MemoryPressure, 
  ModelLoadOptions,
  ModelStatus,
  ModelError,
  ModelErrorCode,
  ModelPriority
} from '../types/modelTypes';

export class MemoryAwareLoader {
  private memoryCheckInterval: NodeJS.Timeout | null = null;
  private readonly memoryThreshold: number;
  private readonly criticalThreshold: number;
  private readonly checkIntervalMs: number;
  private memoryStats: MemoryStats | null = null;
  private loadedModels: Map<string, LoadedModel> = new Map();

  constructor(
    memoryThreshold: number = 80, // 80% memory usage threshold
    criticalThreshold: number = 95, // 95% critical threshold
    checkIntervalMs: number = 5000 // Check every 5 seconds
  ) {
    this.memoryThreshold = memoryThreshold;
    this.criticalThreshold = criticalThreshold;
    this.checkIntervalMs = checkIntervalMs;
    this.startMemoryMonitoring();
  }

  /**
   * Get current memory statistics
   */
  public async getMemoryStats(): Promise<MemoryStats> {
    try {
      const memUsage = process.memoryUsage();
      const totalMemory = this.getTotalSystemMemory();
      const usedMemory = memUsage.rss;
      const availableMemory = totalMemory - usedMemory;
      const percentage = (usedMemory / totalMemory) * 100;

      this.memoryStats = {
        total: totalMemory,
        available: availableMemory,
        used: usedMemory,
        percentage: Math.round(percentage * 100) / 100,
        pressure: this.calculateMemoryPressure(percentage)
      };

      return this.memoryStats;
    } catch (error) {
      console.error('Failed to get memory stats:', error);
      return {
        total: 0,
        available: 0,
        used: 0,
        percentage: 100,
        pressure: MemoryPressure.CRITICAL
      };
    }
  }

  /**
   * Check if a model can be loaded based on available memory
   */
  public async canLoadModel(modelConfig: ModelConfig): Promise<boolean> {
    const memStats = await this.getMemoryStats();
    const requiredMemory = modelConfig.memoryRequirement ?? modelConfig.size ?? 0;
    const availableMemory = memStats.available;

    // Reserve 20% of available memory as buffer
    const usableMemory = availableMemory * 0.8;

    return requiredMemory <= usableMemory && memStats.pressure !== MemoryPressure.CRITICAL;
  }

  /**
   * Determine optimal loading strategy based on memory conditions
   */
  public async getLoadingStrategy(
    modelConfig: ModelConfig,
    options?: ModelLoadOptions
  ): Promise<LoadingStrategy> {
    const memStats = await this.getMemoryStats();
    const canLoad = await this.canLoadModel(modelConfig);
    const forceLoad = options?.forceLoad || false;

    if (canLoad) {
      return {
        action: 'load',
        preUnloadModels: [],
        compressionLevel: this.getCompressionLevel(memStats.pressure)
      };
    }

    if (forceLoad || modelConfig.priority <= ModelPriority.HIGH) {
      const modelsToUnload = this.selectModelsForUnloading(modelConfig);
      return {
        action: 'load_with_cleanup',
        preUnloadModels: modelsToUnload,
        compressionLevel: this.getCompressionLevel(memStats.pressure)
      };
    }

    return {
      action: 'defer',
      preUnloadModels: [],
      compressionLevel: 0,
      reason: 'Insufficient memory and model priority is not critical'
    };
  }

  /**
   * Execute memory optimization by unloading low-priority models
   */
  public async optimizeMemory(): Promise<OptimizationResult> {
    const memStats = await this.getMemoryStats();
    const modelsUnloaded: string[] = [];
    let memoryFreed = 0;

    if (memStats.pressure === MemoryPressure.LOW) {
      return { modelsUnloaded, memoryFreed, success: true };
    }

    // Sort models by priority and last used time
    const sortedModels = Array.from(this.loadedModels.values())
      .sort((a, b) => {
        // Higher priority number = lower priority, unload first
        if (a.config.priority !== b.config.priority) {
          return b.config.priority - a.config.priority;
        }
        // If same priority, unload older models first
        return a.lastUsed.getTime() - b.lastUsed.getTime();
      });

    for (const model of sortedModels) {
      if (memStats.pressure === MemoryPressure.LOW) {
        break;
      }

      try {
        await this.unloadModel(model.config.id);
        modelsUnloaded.push(model.config.id);
        memoryFreed += model.memoryUsage;
        
        // Update memory stats after each unload
        memStats = await this.getMemoryStats();
      } catch (error) {
        console.error(`Failed to unload model ${model.config.id}:`, error);
      }
    }

    return { modelsUnloaded, memoryFreed, success: true };
  }

  /**
   * Register a loaded model for memory tracking
   */
  public registerLoadedModel(model: LoadedModel): void {
    this.loadedModels.set(model.config.id, model);
  }

  /**
   * Unregister a model from memory tracking
   */
  public unregisterModel(modelId: string): void {
    this.loadedModels.delete(modelId);
  }

  /**
   * Get all loaded models
   */
  public getLoadedModels(): LoadedModel[] {
    return Array.from(this.loadedModels.values());
  }

  /**
   * Force garbage collection if available
   */
  public forceGarbageCollection(): void {
    if (global.gc) {
      global.gc();
    }
  }

  /**
   * Start monitoring memory usage
   */
  private startMemoryMonitoring(): void {
    this.memoryCheckInterval = setInterval(async () => {
      try {
        const memStats = await this.getMemoryStats();
        
        if (memStats.pressure === MemoryPressure.CRITICAL) {
          console.warn('Critical memory pressure detected, initiating emergency cleanup');
          await this.emergencyMemoryCleanup();
        } else if (memStats.pressure === MemoryPressure.HIGH) {
          console.warn('High memory pressure detected, optimizing memory usage');
          await this.optimizeMemory();
        }
      } catch (error) {
        console.error('Error during memory monitoring:', error);
      }
    }, this.checkIntervalMs);
  }

  /**
   * Stop memory monitoring
   */
  public stopMemoryMonitoring(): void {
    if (this.memoryCheckInterval) {
      clearInterval(this.memoryCheckInterval);
      this.memoryCheckInterval = null;
    }
  }

  /**
   * Emergency memory cleanup - unload non-critical models immediately
   */
  private async emergencyMemoryCleanup(): Promise<void> {
    const nonCriticalModels = Array.from(this.loadedModels.values())
      .filter(model => model.config.priority > ModelPriority.CRITICAL)
      .sort((a, b) => b.config.priority - a.config.priority);

    for (const model of nonCriticalModels) {
      try {
        await this.unloadModel(model.config.id);
        console.log(`Emergency unloaded model: ${model.config.id}`);
        
        const memStats = await this.getMemoryStats();
        if (memStats.pressure !== MemoryPressure.CRITICAL) {
          break;
        }
      } catch (error) {
        console.error(`Failed to emergency unload model ${model.config.id}:`, error);
      }
    }

    // Force garbage collection
    this.forceGarbageCollection();
  }

  /**
   * Select models for unloading to make room for new model
   */
  private selectModelsForUnloading(newModel: ModelConfig): string[] {
    const requiredMemory = newModel.memoryRequirement;
    const modelsToUnload: string[] = [];
    let memoryToFree = 0;

    // Sort by priority (higher number = lower priority) and last used
    const candidates = Array.from(this.loadedModels.values())
      .filter(model => model.config.priority >= newModel.priority)
      .sort((a, b) => {
        if (a.config.priority !== b.config.priority) {
          return b.config.priority - a.config.priority;
        }
        return a.lastUsed.getTime() - b.lastUsed.getTime();
      });

    for (const model of candidates) {
      if (memoryToFree >= requiredMemory) {
        break;
      }
      modelsToUnload.push(model.config.id);
      memoryToFree += model.memoryUsage;
    }

    return modelsToUnload;
  }

  /**
   * Calculate memory pressure based on usage percentage
   */
  private calculateMemoryPressure(percentage: number): MemoryPressure {
    if (percentage >= this.criticalThreshold) {
      return MemoryPressure.CRITICAL;
    } else if (percentage >= this.memoryThreshold) {
      return MemoryPressure.HIGH;
    } else if (percentage >= this.memoryThreshold * 0.7) {
      return MemoryPressure.MODERATE;
    } else {
      return MemoryPressure.LOW;
    }
  }

  /**
   * Get compression level based on memory pressure
   */
  private getCompressionLevel(pressure: MemoryPressure): number {
    switch (pressure) {
      case MemoryPressure.CRITICAL:
        return 9; // Maximum compression
      case MemoryPressure.HIGH:
        return 6;
      case MemoryPressure.MODERATE:
        return 3;
      default:
        return 0; // No compression
    }
  }

  /**
   * Get total system memory (platform-specific implementation)
   */
  private getTotalSystemMemory(): number {
    try {
      const os = require('os');
      return os.totalmem();
    } catch {
      // Fallback to process memory limit
      return process.memoryUsage.rss * 10; // Rough estimate
    }
  }

  /**
   * Unload a specific model (to be implemented by ModelManager)
   */
  private async unloadModel(modelId: string): Promise<void> {
    // This will be called by ModelManager
    throw new Error('unloadModel must be implemented by ModelManager');
  }

  /**
   * Cleanup resources
   */
  public dispose(): void {
    this.stopMemoryMonitoring();
    this.loadedModels.clear();
  }
}

export interface LoadingStrategy {
  action: 'load' | 'load_with_cleanup' | 'defer';
  preUnloadModels: string[];
  compressionLevel: number;
  reason?: string;
}

export interface OptimizationResult {
  modelsUnloaded: string[];
  memoryFreed: number;
  success: boolean;
  error?: string;
}

export class MemoryError extends Error implements ModelError {
  public code: ModelErrorCode;
  public modelId?: string;
  public memoryRequired?: number;
  public availableMemory?: number;
  public recoverable: boolean;
  public suggestions?: string[];

  constructor(
    message: string,
    code: ModelErrorCode = ModelErrorCode.INSUFFICIENT_MEMORY,
    options: Partial<MemoryError> = {}
  ) {
    super(message);
    this.name = 'MemoryError';
    this.code = code;
    this.modelId = options.modelId;
    this.memoryRequired = options.memoryRequired;
    this.availableMemory = options.availableMemory;
    this.recoverable = options.recoverable ?? true;
    this.suggestions = options.suggestions ?? [];
  }
}

export default MemoryAwareLoader;