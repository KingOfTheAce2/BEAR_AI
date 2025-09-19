/**
 * Memory Aware Loader
 * Manages model loading based on available memory and system resources
 */

import { ModelConfig, LoadedModel, ModelLoadOptions, MemoryStats, MemoryPressure } from '../types/modelTypes';

export interface LoadingStrategy {
  action: 'load' | 'defer' | 'swap';
  reason?: string;
  preUnloadModels: string[];
  estimatedMemory: number;
  priority: number;
}

export interface MemoryThresholds {
  warning: number;
  critical: number;
  emergency: number;
}

export class MemoryAwareLoader {
  private memoryThreshold: number;
  private criticalThreshold: number;
  private checkInterval: number;
  private loadedModels: Map<string, LoadedModel> = new Map();
  private memoryCheckTimer: NodeJS.Timeout | null = null;
  private lastMemoryCheck: Date = new Date();

  constructor(
    memoryThreshold: number = 80,
    criticalThreshold: number = 95,
    checkInterval: number = 5000
  ) {
    this.memoryThreshold = memoryThreshold;
    this.criticalThreshold = criticalThreshold;
    this.checkInterval = checkInterval;
    
    this.startMemoryMonitoring();
  }

  /**
   * Get loading strategy for a model
   */
  async getLoadingStrategy(
    modelConfig: ModelConfig,
    options: ModelLoadOptions = {}
  ): Promise<LoadingStrategy> {
    const currentMemory = await this.getCurrentMemoryUsage();
    const estimatedModelMemory = this.estimateModelMemory(modelConfig);
    const projectedUsage = currentMemory.percentage + (estimatedModelMemory / currentMemory.total) * 100;

    // Force load if explicitly requested
    if (options.forceLoad) {
      return {
        action: 'load',
        preUnloadModels: [],
        estimatedMemory: estimatedModelMemory,
        priority: options.priority || 1,
        reason: 'Force load requested'
      };
    }

    // Check if we can load without issues
    if (projectedUsage < this.memoryThreshold) {
      return {
        action: 'load',
        preUnloadModels: [],
        estimatedMemory: estimatedModelMemory,
        priority: options.priority || 1
      };
    }

    // Check if we need to unload models first
    if (projectedUsage < this.criticalThreshold) {
      const modelsToUnload = this.selectModelsForUnloading(estimatedModelMemory);
      return {
        action: 'load',
        preUnloadModels: modelsToUnload,
        estimatedMemory: estimatedModelMemory,
        priority: options.priority || 1,
        reason: 'Memory optimization required'
      };
    }

    // Memory pressure too high - defer loading
    return {
      action: 'defer',
      preUnloadModels: [],
      estimatedMemory: estimatedModelMemory,
      priority: options.priority || 1,
      reason: `Memory usage too high: ${projectedUsage.toFixed(1)}%`
    };
  }

  /**
   * Register a loaded model
   */
  registerLoadedModel(model: LoadedModel): void {
    this.loadedModels.set(model.config.id, model);
  }

  /**
   * Unregister a model
   */
  unregisterModel(modelId: string): void {
    this.loadedModels.delete(modelId);
  }

  /**
   * Get current memory statistics
   */
  async getMemoryStats(): Promise<MemoryStats> {
    const memoryInfo = await this.getCurrentMemoryUsage();
    const modelMemory = this.getTotalModelMemory();
    
    return {
      total: memoryInfo.total,
      used: memoryInfo.used,
      available: memoryInfo.available,
      percentage: memoryInfo.percentage,
      modelMemoryUsed: modelMemory,
      pressure: this.getMemoryPressure(memoryInfo.percentage),
      timestamp: new Date()
    };
  }

  /**
   * Optimize memory by unloading models
   */
  async optimizeMemory(): Promise<{
    modelsUnloaded: string[];
    memoryFreed: number;
  }> {
    const currentMemory = await this.getCurrentMemoryUsage();
    
    if (currentMemory.percentage < this.memoryThreshold) {
      return { modelsUnloaded: [], memoryFreed: 0 };
    }

    const modelsToUnload = this.selectModelsForUnloading(0, true);
    let memoryFreed = 0;

    for (const modelId of modelsToUnload) {
      const model = this.loadedModels.get(modelId);
      if (model) {
        memoryFreed += model.memoryUsage;
        this.unregisterModel(modelId);
      }
    }

    return {
      modelsUnloaded: modelsToUnload,
      memoryFreed
    };
  }

  /**
   * Start memory monitoring
   */
  private startMemoryMonitoring(): void {
    this.memoryCheckTimer = setInterval(async () => {
      try {
        const memoryStats = await this.getMemoryStats();
        this.lastMemoryCheck = new Date();

        if (memoryStats.pressure === MemoryPressure.HIGH || 
            memoryStats.pressure === MemoryPressure.CRITICAL) {
          // Emit memory pressure event
          this.emit('memoryPressure', { pressure: memoryStats.pressure });
        }
      } catch (error) {
        console.error('Memory check failed:', error);
      }
    }, this.checkInterval);
  }

  /**
   * Get current memory usage
   */
  private async getCurrentMemoryUsage(): Promise<{
    total: number;
    used: number;
    available: number;
    percentage: number;
  }> {
    // Browser environment
    if (typeof window !== 'undefined' && (performance as any).memory) {
      const memInfo = (performance as any).memory;
      return {
        total: memInfo.jsHeapSizeLimit,
        used: memInfo.usedJSHeapSize,
        available: memInfo.jsHeapSizeLimit - memInfo.usedJSHeapSize,
        percentage: (memInfo.usedJSHeapSize / memInfo.jsHeapSizeLimit) * 100
      };
    }

    // Node.js environment
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const memUsage = process.memoryUsage();
      const totalMemory = require('os').totalmem();
      
      return {
        total: totalMemory,
        used: memUsage.heapUsed,
        available: totalMemory - memUsage.heapUsed,
        percentage: (memUsage.heapUsed / totalMemory) * 100
      };
    }

    // Fallback estimates
    return {
      total: 8 * 1024 * 1024 * 1024, // 8GB
      used: 2 * 1024 * 1024 * 1024, // 2GB
      available: 6 * 1024 * 1024 * 1024, // 6GB
      percentage: 25
    };
  }

  /**
   * Estimate memory required for a model
   */
  private estimateModelMemory(modelConfig: ModelConfig): number {
    // Base estimation on model size with overhead
    const baseSize = modelConfig.size || 1024 * 1024 * 1024; // 1GB default
    const overhead = 0.3; // 30% overhead for processing
    
    return Math.floor(baseSize * (1 + overhead));
  }

  /**
   * Select models for unloading
   */
  private selectModelsForUnloading(
    requiredMemory: number,
    aggressive: boolean = false
  ): string[] {
    const models = Array.from(this.loadedModels.values());
    
    // Sort by priority (lower first) and last used time
    models.sort((a, b) => {
      // Priority first
      if (a.config.priority !== b.config.priority) {
        return (a.config.priority || 1) - (b.config.priority || 1);
      }
      
      // Then by last used time (oldest first)
      return a.lastUsed.getTime() - b.lastUsed.getTime();
    });

    const toUnload: string[] = [];
    let memoryToFree = 0;
    const target = aggressive ? requiredMemory + (1024 * 1024 * 1024) : requiredMemory;

    for (const model of models) {
      if (memoryToFree >= target) break;
      
      // Don't unload high priority models unless aggressive
      if (!aggressive && (model.config.priority || 1) > 3) {
        continue;
      }

      toUnload.push(model.config.id);
      memoryToFree += model.memoryUsage;
    }

    return toUnload;
  }

  /**
   * Get total memory used by models
   */
  private getTotalModelMemory(): number {
    let total = 0;
    for (const model of this.loadedModels.values()) {
      total += model.memoryUsage;
    }
    return total;
  }

  /**
   * Determine memory pressure level
   */
  private getMemoryPressure(percentage: number): MemoryPressure {
    if (percentage >= this.criticalThreshold) {
      return MemoryPressure.CRITICAL;
    } else if (percentage >= this.memoryThreshold) {
      return MemoryPressure.HIGH;
    } else if (percentage >= this.memoryThreshold * 0.7) {
      return MemoryPressure.MODERATE;
    }
    return MemoryPressure.LOW;
  }

  /**
   * Event emitter functionality
   */
  private listeners: Map<string, Function[]> = new Map();

  emit(event: string, data?: any): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error(`Error in ${event} listener:`, error);
        }
      });
    }
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    if (this.memoryCheckTimer) {
      clearInterval(this.memoryCheckTimer);
      this.memoryCheckTimer = null;
    }
    this.loadedModels.clear();
    this.listeners.clear();
  }
}

export default MemoryAwareLoader;
