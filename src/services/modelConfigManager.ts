/**
 * Model Configuration Manager
 * Handles model configuration persistence, templates, and presets
 */

import {
  ModelConfig,
  ModelType,
  ModelPriority,
  ModelMetadata,
  ModelCapabilities
} from '../types/modelTypes';

export interface ModelConfiguration {
  autoUnload: boolean;
  memoryLimit: number;
  priority: ModelPriority;
  cacheEnabled: boolean;
  streamingEnabled: boolean;
  timeout: number;
}

export interface ModelConfigTemplate {
  id: string;
  name: string;
  description: string;
  type: ModelType;
  defaultConfig: Partial<ModelConfiguration>;
  recommendedSpecs: {
    minMemory: number;
    maxMemory: number;
    optimalThreads: number;
    contextLength: number;
  };
  tags: string[];
}

export interface ModelPreset {
  id: string;
  name: string;
  description: string;
  modelTypes: ModelType[];
  configuration: ModelConfiguration;
  use_cases: string[];
}

export class ModelConfigManager {
  private configs: Map<string, ModelConfiguration> = new Map();
  private templates: Map<string, ModelConfigTemplate> = new Map();
  private presets: Map<string, ModelPreset> = new Map();
  private storageKey = 'bear_ai_model_configs';

  constructor() {
    this.initializeDefaultTemplates();
    this.initializeDefaultPresets();
    this.loadConfigurations();
  }

  /**
   * Initialize default model configuration templates
   */
  private initializeDefaultTemplates(): void {
    const templates: ModelConfigTemplate[] = [
      {
        id: 'gpt4all-chat',
        name: 'GPT4ALL Chat Model',
        description: 'General purpose conversational AI model',
        type: ModelType.GPT4ALL,
        defaultConfig: {
          autoUnload: true,
          memoryLimit: 4 * 1024 * 1024 * 1024, // 4GB
          priority: ModelPriority.MEDIUM,
          cacheEnabled: true,
          streamingEnabled: true,
          timeout: 30000
        },
        recommendedSpecs: {
          minMemory: 2 * 1024 * 1024 * 1024, // 2GB
          maxMemory: 8 * 1024 * 1024 * 1024, // 8GB
          optimalThreads: 4,
          contextLength: 2048
        },
        tags: ['chat', 'general', 'conversational']
      },
      {
        id: 'gpt4all-code',
        name: 'GPT4ALL Code Model',
        description: 'Specialized for code generation and programming assistance',
        type: ModelType.CODEGEN,
        defaultConfig: {
          autoUnload: false,
          memoryLimit: 6 * 1024 * 1024 * 1024, // 6GB
          priority: ModelPriority.HIGH,
          cacheEnabled: true,
          streamingEnabled: true,
          timeout: 45000
        },
        recommendedSpecs: {
          minMemory: 4 * 1024 * 1024 * 1024, // 4GB
          maxMemory: 12 * 1024 * 1024 * 1024, // 12GB
          optimalThreads: 6,
          contextLength: 4096
        },
        tags: ['code', 'programming', 'development']
      },
      {
        id: 'llama-general',
        name: 'LLaMA General Model',
        description: 'Meta LLaMA model for general purpose tasks',
        type: ModelType.LLAMA,
        defaultConfig: {
          autoUnload: true,
          memoryLimit: 8 * 1024 * 1024 * 1024, // 8GB
          priority: ModelPriority.MEDIUM,
          cacheEnabled: true,
          streamingEnabled: true,
          timeout: 40000
        },
        recommendedSpecs: {
          minMemory: 6 * 1024 * 1024 * 1024, // 6GB
          maxMemory: 16 * 1024 * 1024 * 1024, // 16GB
          optimalThreads: 8,
          contextLength: 4096
        },
        tags: ['llama', 'general', 'meta']
      },
      {
        id: 'mistral-fast',
        name: 'Mistral Fast Model',
        description: 'Fast and efficient Mistral model for quick responses',
        type: ModelType.MISTRAL,
        defaultConfig: {
          autoUnload: true,
          memoryLimit: 3 * 1024 * 1024 * 1024, // 3GB
          priority: ModelPriority.HIGH,
          cacheEnabled: true,
          streamingEnabled: true,
          timeout: 20000
        },
        recommendedSpecs: {
          minMemory: 2 * 1024 * 1024 * 1024, // 2GB
          maxMemory: 6 * 1024 * 1024 * 1024, // 6GB
          optimalThreads: 4,
          contextLength: 8192
        },
        tags: ['mistral', 'fast', 'efficient']
      }
    ];

    templates.forEach(template => {
      this.templates.set(template.id, template);
    });
  }

  /**
   * Initialize default configuration presets
   */
  private initializeDefaultPresets(): void {
    const presets: ModelPreset[] = [
      {
        id: 'performance-optimized',
        name: 'Performance Optimized',
        description: 'Maximum performance configuration for powerful hardware',
        modelTypes: [ModelType.GPT4ALL, ModelType.LLAMA, ModelType.MISTRAL],
        configuration: {
          autoUnload: false,
          memoryLimit: 16 * 1024 * 1024 * 1024, // 16GB
          priority: ModelPriority.HIGH,
          cacheEnabled: true,
          streamingEnabled: true,
          timeout: 60000
        },
        use_cases: ['research', 'complex-tasks', 'batch-processing']
      },
      {
        id: 'memory-efficient',
        name: 'Memory Efficient',
        description: 'Optimized for systems with limited memory',
        modelTypes: [ModelType.GPT4ALL, ModelType.MISTRAL],
        configuration: {
          autoUnload: true,
          memoryLimit: 2 * 1024 * 1024 * 1024, // 2GB
          priority: ModelPriority.MEDIUM,
          cacheEnabled: false,
          streamingEnabled: true,
          timeout: 30000
        },
        use_cases: ['mobile', 'edge-devices', 'limited-resources']
      },
      {
        id: 'development-mode',
        name: 'Development Mode',
        description: 'Fast switching and debugging for development',
        modelTypes: [ModelType.CODEGEN, ModelType.GPT4ALL],
        configuration: {
          autoUnload: true,
          memoryLimit: 4 * 1024 * 1024 * 1024, // 4GB
          priority: ModelPriority.HIGH,
          cacheEnabled: true,
          streamingEnabled: true,
          timeout: 20000
        },
        use_cases: ['development', 'testing', 'prototyping']
      },
      {
        id: 'production-stable',
        name: 'Production Stable',
        description: 'Stable configuration for production environments',
        modelTypes: [ModelType.GPT4ALL, ModelType.LLAMA],
        configuration: {
          autoUnload: false,
          memoryLimit: 8 * 1024 * 1024 * 1024, // 8GB
          priority: ModelPriority.CRITICAL,
          cacheEnabled: true,
          streamingEnabled: false, // Disable for stability
          timeout: 45000
        },
        use_cases: ['production', 'enterprise', 'critical-systems']
      }
    ];

    presets.forEach(preset => {
      this.presets.set(preset.id, preset);
    });
  }

  /**
   * Get configuration for a model
   */
  public getConfiguration(modelId: string): ModelConfiguration | null {
    return this.configs.get(modelId) || null;
  }

  /**
   * Set configuration for a model
   */
  public setConfiguration(modelId: string, config: ModelConfiguration): void {
    this.configs.set(modelId, config);
    this.saveConfigurations();
  }

  /**
   * Get configuration from template
   */
  public getConfigurationFromTemplate(templateId: string): ModelConfiguration | null {
    const template = this.templates.get(templateId);
    return template ? template.defaultConfig as ModelConfiguration : null;
  }

  /**
   * Get configuration from preset
   */
  public getConfigurationFromPreset(presetId: string): ModelConfiguration | null {
    const preset = this.presets.get(presetId);
    return preset ? preset.configuration : null;
  }

  /**
   * Apply preset to model
   */
  public applyPreset(modelId: string, presetId: string): boolean {
    const preset = this.presets.get(presetId);
    if (!preset) return false;

    this.setConfiguration(modelId, preset.configuration);
    return true;
  }

  /**
   * Create custom configuration from base template
   */
  public createCustomConfiguration(
    templateId: string,
    overrides: Partial<ModelConfiguration>
  ): ModelConfiguration | null {
    const template = this.templates.get(templateId);
    if (!template) return null;

    return {
      ...template.defaultConfig,
      ...overrides
    } as ModelConfiguration;
  }

  /**
   * Get recommended configuration for model type and system specs
   */
  public getRecommendedConfiguration(
    modelType: ModelType,
    systemMemory: number,
    cpuCores: number
  ): ModelConfiguration {
    // Find best template for model type
    const templates = Array.from(this.templates.values())
      .filter(t => t.type === modelType);
    
    if (templates.length === 0) {
      return this.getDefaultConfiguration();
    }

    // Sort by memory requirements (ascending)
    templates.sort((a, b) => a.recommendedSpecs.minMemory - b.recommendedSpecs.minMemory);

    // Find template that fits system specs
    const suitableTemplate = templates.find(t => 
      t.recommendedSpecs.minMemory <= systemMemory
    ) || templates[0];

    const config = { ...suitableTemplate.defaultConfig } as ModelConfiguration;

    // Adjust for system specs
    config.memoryLimit = Math.min(config.memoryLimit, Math.floor(systemMemory * 0.8));
    
    // Adjust timeout based on system performance
    if (cpuCores >= 8) {
      config.timeout = Math.floor(config.timeout * 0.7);
    } else if (cpuCores <= 2) {
      config.timeout = Math.floor(config.timeout * 1.5);
    }

    return config;
  }

  /**
   * Get default configuration
   */
  public getDefaultConfiguration(): ModelConfiguration {
    return {
      autoUnload: true,
      memoryLimit: 4 * 1024 * 1024 * 1024, // 4GB
      priority: ModelPriority.MEDIUM,
      cacheEnabled: true,
      streamingEnabled: true,
      timeout: 30000
    };
  }

  /**
   * Get all available templates
   */
  public getTemplates(): ModelConfigTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Get templates for specific model type
   */
  public getTemplatesForType(modelType: ModelType): ModelConfigTemplate[] {
    return Array.from(this.templates.values())
      .filter(template => template.type === modelType);
  }

  /**
   * Get all available presets
   */
  public getPresets(): ModelPreset[] {
    return Array.from(this.presets.values());
  }

  /**
   * Get presets for specific model type
   */
  public getPresetsForType(modelType: ModelType): ModelPreset[] {
    return Array.from(this.presets.values())
      .filter(preset => preset.modelTypes.includes(modelType));
  }

  /**
   * Validate configuration
   */
  public validateConfiguration(config: ModelConfiguration): {
    valid: boolean;
    warnings: string[];
    errors: string[];
  } {
    const warnings: string[] = [];
    const errors: string[] = [];

    // Check memory limit
    if (config.memoryLimit < 1024 * 1024 * 1024) { // 1GB
      warnings.push('Memory limit is very low (< 1GB). This may cause loading failures.');
    }
    if (config.memoryLimit > 32 * 1024 * 1024 * 1024) { // 32GB
      warnings.push('Memory limit is very high (> 32GB). Ensure your system has sufficient RAM.');
    }

    // Check timeout
    if (config.timeout < 5000) {
      errors.push('Timeout must be at least 5 seconds.');
    }
    if (config.timeout > 300000) { // 5 minutes
      warnings.push('Very long timeout (> 5 minutes) may cause UI freezing.');
    }

    // Check priority
    if (!Object.values(ModelPriority).includes(config.priority)) {
      errors.push('Invalid priority value.');
    }

    return {
      valid: errors.length === 0,
      warnings,
      errors
    };
  }

  /**
   * Auto-configure model based on file analysis
   */
  public async autoConfigureModel(modelConfig: ModelConfig): Promise<ModelConfiguration> {
    const systemMemory = this.getSystemMemory();
    const cpuCores = this.getCpuCores();
    
    // Get recommended configuration based on model type and system
    let config = this.getRecommendedConfiguration(
      modelConfig.type,
      systemMemory,
      cpuCores
    );

    // Adjust based on model size
    const modelSizeGB = (modelConfig.size ?? 0) / (1024 * 1024 * 1024);
    if (modelSizeGB > 10) {
      // Large model adjustments
      config.autoUnload = true;
      config.priority = ModelPriority.LOW;
      config.timeout = Math.max(config.timeout, 60000);
    } else if (modelSizeGB < 1) {
      // Small model adjustments
      config.autoUnload = false;
      config.priority = ModelPriority.HIGH;
      config.timeout = Math.min(config.timeout, 15000);
    }

    // Adjust based on capabilities
    const capabilityData = Array.isArray(modelConfig.capabilities)
      ? modelConfig.capabilities
      : modelConfig.capabilities?.features ||
        (modelConfig.capabilities ? Object.keys(modelConfig.capabilities).filter(key => key) : [])

    const supportsCodeGeneration = Array.isArray(modelConfig.capabilities)
      ? modelConfig.capabilities.some(cap => cap.toLowerCase().includes('code'))
      : !!(modelConfig.capabilities?.codeGeneration)

    if (supportsCodeGeneration || capabilityData.some(cap => cap.toLowerCase().includes('code'))) {
      config.cacheEnabled = true;
      config.streamingEnabled = true;
      config.priority = ModelPriority.HIGH;
    }

    return config;
  }

  /**
   * Export configurations
   */
  public exportConfigurations(): string {
    const data = {
      configs: Object.fromEntries(this.configs),
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    };
    return JSON.stringify(data, null, 2);
  }

  /**
   * Import configurations
   */
  public importConfigurations(jsonData: string): boolean {
    try {
      const data = JSON.parse(jsonData);
      if (data.configs) {
        this.configs = new Map(Object.entries(data.configs));
        this.saveConfigurations();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to import configurations:', error);
      return false;
    }
  }

  /**
   * Reset configurations to defaults
   */
  public resetConfigurations(): void {
    this.configs.clear();
    this.saveConfigurations();
  }

  /**
   * Load configurations from storage
   */
  private loadConfigurations(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        this.configs = new Map(Object.entries(data));
      }
    } catch (error) {
      console.error('Failed to load configurations:', error);
    }
  }

  /**
   * Save configurations to storage
   */
  private saveConfigurations(): void {
    try {
      const data = Object.fromEntries(this.configs);
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save configurations:', error);
    }
  }

  /**
   * Get system memory (placeholder - would use actual system API)
   */
  private getSystemMemory(): number {
    // Placeholder - in real implementation, this would query system info
    return 16 * 1024 * 1024 * 1024; // 16GB default
  }

  /**
   * Get CPU cores (placeholder - would use actual system API)
   */
  private getCpuCores(): number {
    // Placeholder - in real implementation, this would query system info
    return navigator.hardwareConcurrency || 4;
  }
}

export default ModelConfigManager;