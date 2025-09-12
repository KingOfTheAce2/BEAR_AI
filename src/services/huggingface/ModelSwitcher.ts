/**
 * Enhanced Model Switching Service for BEAR AI
 * Provides seamless one-click model switching with configuration management
 */

import { 
  HuggingFaceModel, 
  ModelConfiguration, 
  LocalModelStatus,
  ModelEvent,
  ModelEventType
} from '../../types/huggingface';
import { CoreModelManager } from '../modelManager';
import HuggingFaceService from './HuggingFaceService';

export interface ModelSwitchOptions {
  preload?: boolean;
  keepPrevious?: boolean;
  validateCompatibility?: boolean;
  backupConfiguration?: boolean;
  skipBenchmark?: boolean;
  customConfiguration?: Partial<ModelConfiguration>;
  timeout?: number; // milliseconds
}

export interface SwitchResult {
  success: boolean;
  previousModelId?: string;
  newModelId: string;
  switchTime: number;
  memoryFreed: number;
  memoryAllocated: number;
  warnings: string[];
  errors: string[];
  rollbackAvailable: boolean;
}

export interface ModelPreset {
  id: string;
  name: string;
  description: string;
  modelId: string;
  configuration: ModelConfiguration;
  legalOptimized: boolean;
  useCase: string[];
  author: string;
  version: string;
  createdAt: Date;
  lastUsed?: Date;
  usageCount: number;
  rating?: number;
}

export class ModelSwitcher extends EventTarget {
  private modelManager: CoreModelManager;
  private huggingFaceService: HuggingFaceService;
  private presets: Map<string, ModelPreset> = new Map();
  private switchHistory: Array<{
    timestamp: Date;
    fromModel: string;
    toModel: string;
    success: boolean;
    duration: number;
    options: ModelSwitchOptions;
  }> = [];
  private rollbackStack: Array<{
    modelId: string;
    configuration: ModelConfiguration;
    timestamp: Date;
  }> = [];

  constructor(
    modelManager: CoreModelManager,
    huggingFaceService: HuggingFaceService
  ) {
    super();
    this.modelManager = modelManager;
    this.huggingFaceService = huggingFaceService;
    this.initializeDefaultPresets();
  }

  /**
   * One-click model switching with comprehensive options
   */
  async switchModel(
    targetModelId: string, 
    options: ModelSwitchOptions = {}
  ): Promise<SwitchResult> {
    const startTime = Date.now();
    const currentModel = this.getCurrentModel();
    
    const result: SwitchResult = {
      success: false,
      newModelId: targetModelId,
      previousModelId: currentModel?.id,
      switchTime: 0,
      memoryFreed: 0,
      memoryAllocated: 0,
      warnings: [],
      errors: [],
      rollbackAvailable: false
    };

    try {
      this.emit('switch_started', { 
        fromModel: currentModel?.id, 
        toModel: targetModelId, 
        options 
      });

      // Step 1: Validate target model
      const targetModel = await this.validateTargetModel(targetModelId);
      if (!targetModel) {
        throw new Error(`Model ${targetModelId} not found or invalid`);
      }

      // Step 2: Compatibility validation
      if (options.validateCompatibility !== false) {
        const compatibility = await this.huggingFaceService.validateCompatibility(targetModelId);
        if (!compatibility.compatible) {
          result.warnings.push(...compatibility.issues);
          if (compatibility.issues.some(issue => issue.includes('Insufficient'))) {
            throw new Error(`Compatibility check failed: ${compatibility.issues.join(', ')}`);
          }
        }
      }

      // Step 3: Backup current configuration
      if (currentModel && options.backupConfiguration !== false) {
        await this.backupCurrentConfiguration(currentModel);
        result.rollbackAvailable = true;
      }

      // Step 4: Preload target model if requested
      if (options.preload && !this.isModelLoaded(targetModelId)) {
        await this.preloadModel(targetModelId);
      }

      // Step 5: Execute the switch
      const switchResults = await this.executeSwitchOperation(
        currentModel?.id,
        targetModelId,
        options
      );

      result.memoryFreed = switchResults.memoryFreed;
      result.memoryAllocated = switchResults.memoryAllocated;

      // Step 6: Apply configuration
      const configuration = options.customConfiguration || 
        await this.getOptimalConfiguration(targetModel);
      
      await this.applyModelConfiguration(targetModelId, configuration);

      // Step 7: Run quick benchmark if enabled
      if (!options.skipBenchmark) {
        try {
          await this.runQuickBenchmark(targetModelId);
        } catch (error) {
          result.warnings.push(`Benchmark failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      result.success = true;
      result.switchTime = Date.now() - startTime;

      // Record successful switch
      this.recordSwitchHistory(currentModel?.id, targetModelId, true, result.switchTime, options);
      
      this.emit('switch_completed', { result, targetModel });

    } catch (error) {
      result.success = false;
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
      result.switchTime = Date.now() - startTime;

      // Record failed switch
      this.recordSwitchHistory(currentModel?.id, targetModelId, false, result.switchTime, options);

      // Attempt rollback if possible
      if (result.rollbackAvailable && currentModel) {
        try {
          await this.rollbackToPrevious();
          result.warnings.push('Automatically rolled back to previous model');
        } catch (rollbackError) {
          result.errors.push(`Rollback failed: ${rollbackError instanceof Error ? rollbackError.message : 'Unknown error'}`);
        }
      }

      this.emit('switch_failed', { result, error });
    }

    return result;
  }

  /**
   * Switch to a predefined preset
   */
  async switchToPreset(presetId: string): Promise<SwitchResult> {
    const preset = this.presets.get(presetId);
    if (!preset) {
      throw new Error(`Preset ${presetId} not found`);
    }

    const options: ModelSwitchOptions = {
      customConfiguration: preset.configuration,
      validateCompatibility: true,
      backupConfiguration: true
    };

    const result = await this.switchModel(preset.modelId, options);
    
    if (result.success) {
      // Update preset usage
      preset.lastUsed = new Date();
      preset.usageCount++;
    }

    return result;
  }

  /**
   * Create a new model preset
   */
  async createPreset(
    presetData: Omit<ModelPreset, 'id' | 'createdAt' | 'usageCount'>
  ): Promise<ModelPreset> {
    const preset: ModelPreset = {
      ...presetData,
      id: this.generatePresetId(presetData.name),
      createdAt: new Date(),
      usageCount: 0
    };

    // Validate model exists
    const modelExists = await this.validateTargetModel(preset.modelId);
    if (!modelExists) {
      throw new Error(`Model ${preset.modelId} not found`);
    }

    // Validate configuration
    await this.validateConfiguration(preset.configuration);

    this.presets.set(preset.id, preset);
    return preset;
  }

  /**
   * Get available presets
   */
  getPresets(): ModelPreset[] {
    return Array.from(this.presets.values()).sort((a, b) => 
      b.lastUsed?.getTime() || 0 - (a.lastUsed?.getTime() || 0)
    );
  }

  /**
   * Get switch history
   */
  getSwitchHistory(limit: number = 50): Array<{
    timestamp: Date;
    fromModel: string;
    toModel: string;
    success: boolean;
    duration: number;
    options: ModelSwitchOptions;
  }> {
    return this.switchHistory
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Rollback to previous model
   */
  async rollbackToPrevious(): Promise<SwitchResult> {
    const lastBackup = this.rollbackStack.pop();
    if (!lastBackup) {
      throw new Error('No rollback point available');
    }

    return await this.switchModel(lastBackup.modelId, {
      customConfiguration: lastBackup.configuration,
      skipBenchmark: true,
      validateCompatibility: false
    });
  }

  /**
   * Get optimal configuration for a model
   */
  async getOptimalConfiguration(model: HuggingFaceModel): Promise<ModelConfiguration> {
    // Base configuration
    const baseConfig: ModelConfiguration = {
      maxLength: 2048,
      temperature: 0.7,
      topP: 0.9,
      topK: 50,
      repetitionPenalty: 1.1,
      doSample: true,
      earlyStopping: true,
      numBeams: 1,
      legalOptimizations: {
        enableCitations: true,
        strictFactChecking: true,
        conservativeAnswers: true,
        jurisdictionAware: true,
        privacyMode: true
      }
    };

    // Adjust based on model characteristics
    if (model.legalScore > 80) {
      // Highly legal-optimized models can handle more aggressive settings
      baseConfig.temperature = 0.3;
      baseConfig.legalOptimizations!.strictFactChecking = true;
    }

    // Adjust based on model size
    if (model.resourceRequirements.modelSizeMB > 7000) {
      // Larger models typically perform better with lower temperature
      baseConfig.temperature = Math.max(0.2, baseConfig.temperature - 0.2);
      baseConfig.maxLength = 4096; // Can handle longer contexts
    }

    // Legal use case optimizations
    for (const useCase of model.legalUseCases) {
      switch (useCase.category) {
        case 'contract_analysis':
          baseConfig.legalOptimizations!.enableCitations = true;
          baseConfig.temperature = 0.3; // More deterministic for contracts
          break;
        case 'legal_research':
          baseConfig.maxLength = 8192; // Longer context for research
          baseConfig.legalOptimizations!.jurisdictionAware = true;
          break;
        case 'document_review':
          baseConfig.temperature = 0.1; // Very deterministic for classification
          baseConfig.doSample = false;
          break;
      }
    }

    return baseConfig;
  }

  /**
   * Validate model configuration
   */
  private async validateConfiguration(config: ModelConfiguration): Promise<void> {
    const errors: string[] = [];

    if (config.maxLength < 1 || config.maxLength > 32768) {
      errors.push('maxLength must be between 1 and 32768');
    }

    if (config.temperature < 0 || config.temperature > 2) {
      errors.push('temperature must be between 0 and 2');
    }

    if (config.topP < 0 || config.topP > 1) {
      errors.push('topP must be between 0 and 1');
    }

    if (config.topK < 0 || config.topK > 1000) {
      errors.push('topK must be between 0 and 1000');
    }

    if (errors.length > 0) {
      throw new Error(`Configuration validation failed: ${errors.join(', ')}`);
    }
  }

  /**
   * Execute the actual model switch operation
   */
  private async executeSwitchOperation(
    fromModelId: string | undefined,
    toModelId: string,
    options: ModelSwitchOptions
  ): Promise<{ memoryFreed: number; memoryAllocated: number }> {
    let memoryFreed = 0;
    let memoryAllocated = 0;

    // Load target model if not already loaded
    if (!this.isModelLoaded(toModelId)) {
      await this.modelManager.loadModel(toModelId, { 
        priority: 'HIGH' as any,
        forceLoad: true 
      });
      
      const loadedModel = this.modelManager.getModel(toModelId);
      memoryAllocated = loadedModel?.memoryUsage || 0;
    }

    // Unload previous model unless keeping it
    if (fromModelId && fromModelId !== toModelId && !options.keepPrevious) {
      const previousModel = this.modelManager.getModel(fromModelId);
      memoryFreed = previousModel?.memoryUsage || 0;
      
      await this.modelManager.unloadModel(fromModelId);
    }

    // Switch to the new model
    if (fromModelId && fromModelId !== toModelId) {
      await this.modelManager.switchModel(fromModelId, toModelId);
    }

    return { memoryFreed, memoryAllocated };
  }

  /**
   * Backup current model configuration
   */
  private async backupCurrentConfiguration(currentModel: any): Promise<void> {
    const configuration = await this.getCurrentConfiguration();
    
    this.rollbackStack.push({
      modelId: currentModel.id,
      configuration,
      timestamp: new Date()
    });

    // Keep only last 5 backups
    if (this.rollbackStack.length > 5) {
      this.rollbackStack.shift();
    }
  }

  /**
   * Apply configuration to a model
   */
  private async applyModelConfiguration(
    modelId: string, 
    configuration: ModelConfiguration
  ): Promise<void> {
    // This would integrate with the actual model configuration system
    // For now, store the configuration for future use
    console.log(`Applying configuration to model ${modelId}:`, configuration);
  }

  /**
   * Run quick benchmark on newly switched model
   */
  private async runQuickBenchmark(modelId: string): Promise<void> {
    // Quick validation that model is working correctly
    const testPrompt = "What is a contract?";
    const startTime = Date.now();
    
    try {
      await this.modelManager.generateText(modelId, testPrompt, {
        maxTokens: 50,
        timeout: 10000
      });
      
      const responseTime = Date.now() - startTime;
      console.log(`Quick benchmark completed in ${responseTime}ms`);
      
    } catch (error) {
      throw new Error(`Model validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Initialize default presets
   */
  private initializeDefaultPresets(): void {
    const contractPreset: ModelPreset = {
      id: 'contract_analysis_optimized',
      name: 'Contract Analysis Optimized',
      description: 'Optimized settings for contract analysis and review',
      modelId: 'legal-bert-base-uncased',
      configuration: {
        maxLength: 2048,
        temperature: 0.3,
        topP: 0.8,
        topK: 40,
        repetitionPenalty: 1.05,
        doSample: true,
        legalOptimizations: {
          enableCitations: true,
          strictFactChecking: true,
          conservativeAnswers: true,
          jurisdictionAware: false,
          privacyMode: true
        }
      },
      legalOptimized: true,
      useCase: ['contract_analysis', 'document_review'],
      author: 'BEAR AI Team',
      version: '1.0',
      createdAt: new Date(),
      usageCount: 0
    };

    const researchPreset: ModelPreset = {
      id: 'legal_research_enhanced',
      name: 'Legal Research Enhanced',
      description: 'Enhanced settings for legal research and case law analysis',
      modelId: 'legal-roberta-large',
      configuration: {
        maxLength: 4096,
        temperature: 0.5,
        topP: 0.95,
        topK: 50,
        repetitionPenalty: 1.1,
        doSample: true,
        legalOptimizations: {
          enableCitations: true,
          strictFactChecking: true,
          conservativeAnswers: false,
          jurisdictionAware: true,
          privacyMode: false
        }
      },
      legalOptimized: true,
      useCase: ['legal_research', 'case_analysis'],
      author: 'BEAR AI Team',
      version: '1.0',
      createdAt: new Date(),
      usageCount: 0
    };

    this.presets.set(contractPreset.id, contractPreset);
    this.presets.set(researchPreset.id, researchPreset);
  }

  // Helper methods
  private getCurrentModel(): any {
    return this.modelManager.getLoadedModels()[0]; // Simplified
  }

  private async getCurrentConfiguration(): Promise<ModelConfiguration> {
    // Return current model configuration
    return {
      maxLength: 2048,
      temperature: 0.7,
      topP: 0.9,
      topK: 50,
      repetitionPenalty: 1.1,
      doSample: true,
      legalOptimizations: {
        enableCitations: true,
        strictFactChecking: true,
        conservativeAnswers: true,
        jurisdictionAware: true,
        privacyMode: true
      }
    };
  }

  private async validateTargetModel(modelId: string): Promise<HuggingFaceModel | null> {
    try {
      // This would validate the model exists and is accessible
      return null; // Placeholder
    } catch {
      return null;
    }
  }

  private isModelLoaded(modelId: string): boolean {
    return this.modelManager.getModel(modelId) !== null;
  }

  private async preloadModel(modelId: string): Promise<void> {
    await this.modelManager.loadModel(modelId, { priority: 'LOW' as any });
  }

  private recordSwitchHistory(
    fromModel: string | undefined,
    toModel: string,
    success: boolean,
    duration: number,
    options: ModelSwitchOptions
  ): void {
    this.switchHistory.push({
      timestamp: new Date(),
      fromModel: fromModel || '',
      toModel,
      success,
      duration,
      options
    });

    // Keep only last 100 switches
    if (this.switchHistory.length > 100) {
      this.switchHistory.shift();
    }
  }

  private generatePresetId(name: string): string {
    return name.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now();
  }

  private emit(eventType: string, data: any): void {
    const event = new CustomEvent(eventType, { detail: data });
    this.dispatchEvent(event);
  }
}

export default ModelSwitcher;