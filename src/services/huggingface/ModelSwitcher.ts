/**
 * Model Switcher Service for HuggingFace Models
 * Handles switching between different HuggingFace models
 */

import { HuggingFaceModel } from '../../types/huggingface';

export interface ModelSwitchOptions {
  unloadPrevious?: boolean;
  preloadNext?: boolean;
  timeout?: number;
  preserveContext?: boolean;
}

export interface ModelSwitchResult {
  success: boolean;
  fromModel: string | null;
  toModel: string;
  switchTime: number;
  error?: string;
  warnings?: string[];
}

export class ModelSwitcher {
  private currentModel: string | null = null;
  private loadedModels: Map<string, any> = new Map();
  private switchHistory: ModelSwitchResult[] = [];

  /**
   * Switch to a different model
   */
  async switchModel(
    toModelId: string,
    options: ModelSwitchOptions = {}
  ): Promise<ModelSwitchResult> {
    const startTime = Date.now();
    const fromModel = this.currentModel;

    const switchResult: ModelSwitchResult = {
      success: false,
      fromModel,
      toModel: toModelId,
      switchTime: 0,
      warnings: []
    };

    try {
      // Validate target model
      if (!toModelId) {
        throw new Error('Target model ID is required');
      }

      // Check if already using the target model
      if (this.currentModel === toModelId) {
        switchResult.success = true;
        switchResult.switchTime = Date.now() - startTime;
        switchResult.warnings?.push('Already using the specified model');
        return switchResult;
      }

      // Preload next model if requested
      if (options.preloadNext && !this.loadedModels.has(toModelId)) {
        await this.loadModel(toModelId);
      }

      // Unload previous model if requested and different from target
      if (options.unloadPrevious && fromModel && fromModel !== toModelId) {
        await this.unloadModel(fromModel);
      }

      // Load target model if not already loaded
      if (!this.loadedModels.has(toModelId)) {
        await this.loadModel(toModelId);
      }

      // Switch context
      this.currentModel = toModelId;
      
      switchResult.success = true;
      switchResult.switchTime = Date.now() - startTime;

      // Add to history
      this.switchHistory.push(switchResult);
      this.trimSwitchHistory();

      return switchResult;

    } catch (error) {
      switchResult.error = error instanceof Error ? error.message : 'Unknown error';
      switchResult.switchTime = Date.now() - startTime;
      
      // Add failed switch to history
      this.switchHistory.push(switchResult);
      this.trimSwitchHistory();

      throw error;
    }
  }

  /**
   * Get currently active model
   */
  getCurrentModel(): string | null {
    return this.currentModel;
  }

  /**
   * Get list of loaded models
   */
  getLoadedModels(): string[] {
    return Array.from(this.loadedModels.keys());
  }

  /**
   * Check if a model is loaded
   */
  isModelLoaded(modelId: string): boolean {
    return this.loadedModels.has(modelId);
  }

  /**
   * Preload a model without switching to it
   */
  async preloadModel(modelId: string): Promise<void> {
    if (!this.loadedModels.has(modelId)) {
      await this.loadModel(modelId);
    }
  }

  /**
   * Unload a specific model
   */
  async unloadModel(modelId: string): Promise<void> {
    if (this.loadedModels.has(modelId)) {
      // In a real implementation, this would cleanup model resources
      this.loadedModels.delete(modelId);
      
      // If this was the current model, clear current reference
      if (this.currentModel === modelId) {
        this.currentModel = null;
      }
    }
  }

  /**
   * Unload all models except the current one
   */
  async unloadUnusedModels(): Promise<string[]> {
    const unloaded: string[] = [];
    
    for (const modelId of this.loadedModels.keys()) {
      if (modelId !== this.currentModel) {
        await this.unloadModel(modelId);
        unloaded.push(modelId);
      }
    }
    
    return unloaded;
  }

  /**
   * Get model switch statistics
   */
  getSwitchStats(): {
    totalSwitches: number;
    successfulSwitches: number;
    failedSwitches: number;
    averageSwitchTime: number;
    mostUsedModel: string | null;
  } {
    const totalSwitches = this.switchHistory.length;
    const successful = this.switchHistory.filter(s => s.success).length;
    const failed = totalSwitches - successful;
    
    const avgSwitchTime = totalSwitches > 0 
      ? this.switchHistory.reduce((sum, s) => sum + s.switchTime, 0) / totalSwitches
      : 0;

    // Find most used model
    const modelCounts = new Map<string, number>();
    this.switchHistory.forEach(s => {
      if (s.success) {
        modelCounts.set(s.toModel, (modelCounts.get(s.toModel) || 0) + 1);
      }
    });

    const mostUsedModel = modelCounts.size > 0 
      ? Array.from(modelCounts.entries()).reduce((a, b) => a[1] > b[1] ? a : b)[0]
      : null;

    return {
      totalSwitches,
      successfulSwitches: successful,
      failedSwitches: failed,
      averageSwitchTime: avgSwitchTime,
      mostUsedModel
    };
  }

  /**
   * Get switch history
   */
  getSwitchHistory(limit?: number): ModelSwitchResult[] {
    const history = [...this.switchHistory];
    return limit ? history.slice(-limit) : history;
  }

  /**
   * Clear switch history
   */
  clearSwitchHistory(): void {
    this.switchHistory = [];
  }

  /**
   * Get memory usage estimation
   */
  getMemoryUsage(): {
    loadedModels: number;
    estimatedMemory: number; // in bytes
  } {
    return {
      loadedModels: this.loadedModels.size,
      estimatedMemory: this.loadedModels.size * 1000000000 // 1GB per model estimate
    };
  }

  /**
   * Validate model switch feasibility
   */
  async validateSwitch(
    toModelId: string,
    options: ModelSwitchOptions = {}
  ): Promise<{
    canSwitch: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check if model ID is valid
    if (!toModelId || toModelId.trim() === '') {
      issues.push('Model ID cannot be empty');
    }

    // Check memory constraints
    const memoryUsage = this.getMemoryUsage();
    if (memoryUsage.loadedModels >= 3 && !this.isModelLoaded(toModelId)) {
      issues.push('Too many models loaded - consider unloading unused models');
      recommendations.push('Enable unloadPrevious option or manually unload models');
    }

    // Check if switching to same model
    if (this.currentModel === toModelId) {
      recommendations.push('Already using target model - switch unnecessary');
    }

    return {
      canSwitch: issues.length === 0,
      issues,
      recommendations
    };
  }

  // Private methods

  private async loadModel(modelId: string): Promise<void> {
    // In a real implementation, this would load the actual model
    // For now, we simulate the loading process
    
    if (this.loadedModels.has(modelId)) {
      return; // Already loaded
    }

    // Simulate loading time
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    
    // Store mock model instance
    this.loadedModels.set(modelId, {
      id: modelId,
      loadedAt: new Date(),
      memoryUsage: 1000000000 // 1GB estimate
    });
  }

  private trimSwitchHistory(): void {
    const maxHistorySize = 100;
    if (this.switchHistory.length > maxHistorySize) {
      this.switchHistory = this.switchHistory.slice(-maxHistorySize);
    }
  }
}

export default ModelSwitcher;
