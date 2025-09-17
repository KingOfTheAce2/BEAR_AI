/**
 * GPT4ALL Integration Service
 * Provides GPT4ALL model integration with BEAR AI architecture
 */

import {
  ModelConfig,
  LoadedModel,
  ModelInferenceOptions,
  ModelInferenceResult,
  GPT4ALLConfig,
  GPT4ALLModel,
  ModelStatus,
  ModelType,
  ModelError,
  ModelErrorCode,
  ModelCapabilities,
  ModelMetadata
} from '../types/modelTypes';

export class GPT4ALLIntegration implements GPT4ALLModel {
  public config: GPT4ALLConfig;
  public instance: any = null;
  public isLoaded: boolean = false;
  private modelConfig?: ModelConfig;
  private gpt4all: any = null;

  constructor(config: GPT4ALLConfig, modelConfig?: ModelConfig) {
    this.config = this.applyMetadataOverrides(config, modelConfig?.metadata);
    this.modelConfig = modelConfig;
    this.initializeGPT4ALL();
  }

  public getConfig(): GPT4ALLConfig {
    return { ...this.config };
  }

  /**
   * Initialize GPT4ALL library
   */
  private async initializeGPT4ALL(): Promise<void> {
    try {
      // Dynamic import of gpt4all
      this.gpt4all = await this.loadGPT4ALLLibrary();
    } catch (error) {
      console.error('Failed to initialize GPT4ALL library:', error);
      throw new ModelError(
        'GPT4ALL library initialization failed',
        ModelErrorCode.LOADING_FAILED,
        {
          recoverable: false,
          suggestions: [
            'Install gpt4all package: npm install gpt4all',
            'Verify system compatibility',
            'Check library path configuration'
          ]
        }
      );
    }
  }

  /**
   * Load GPT4ALL library with fallback mechanisms
   */
  private async loadGPT4ALLLibrary(): Promise<any> {
    const possibleImports = [
      () => require('gpt4all'),
      () => import('gpt4all'),
      () => require('@gpt4all/gpt4all'),
      () => import('@gpt4all/gpt4all')
    ];

    let lastError: any;

    for (const importFn of possibleImports) {
      try {
        const lib = await importFn();
        return lib.default || lib;
      } catch (error) {
        lastError = error;
        continue;
      }
    }

    throw new Error(`Failed to load GPT4ALL library. Last error: ${lastError?.message}`);
  }

  private applyMetadataOverrides(
    baseConfig: GPT4ALLConfig,
    metadata?: ModelMetadata
  ): GPT4ALLConfig {
    if (!metadata) {
      return baseConfig;
    }

    const overrides: Partial<GPT4ALLConfig> = {};
    const directKeys: Array<keyof GPT4ALLConfig> = [
      'nThreads',
      'nPredict',
      'temp',
      'topK',
      'topP',
      'repeatPenalty',
      'repeatLastN',
      'seed',
      'nBatch',
      'nCtx',
      'libraryPath',
      'modelPath',
      'promptTemplate'
    ];

    for (const key of directKeys) {
      const value = (metadata as any)[key];
      if (typeof value !== 'undefined' && value !== null) {
        (overrides as any)[key] = value;
      }
    }

    if (typeof metadata.temp === 'number') {
      overrides.temp = metadata.temp;
    }

    if (metadata.runtime && typeof metadata.runtime === 'object') {
      Object.assign(overrides, metadata.runtime);
    }

    return { ...baseConfig, ...overrides };
  }

  /**
   * Load the model into memory
   */
  public async loadModel(): Promise<void> {
    if (this.isLoaded) {
      return;
    }

    try {
      console.log(`Loading GPT4ALL model from: ${this.config.modelPath}`);
      
      const modelOptions = {
        modelPath: this.config.modelPath,
        libraryPath: this.config.libraryPath,
        nThreads: this.config.nThreads || this.getOptimalThreadCount(),
        nCtx: this.config.nCtx || 2048,
        verbose: false
      };

      this.instance = await this.createModelInstance(modelOptions);
      this.isLoaded = true;
      
      console.log(`Successfully loaded GPT4ALL model: ${this.modelConfig?.name || 'Unknown'}`);
    } catch (error) {
      this.isLoaded = false;
      const errorMessage = `Failed to load GPT4ALL model: ${error instanceof Error ? error.message : 'Unknown error'}`;
      
      throw new ModelError(
        errorMessage,
        ModelErrorCode.LOADING_FAILED,
        {
          modelId: this.modelConfig?.id,
          recoverable: true,
          suggestions: [
            'Verify model file exists and is not corrupted',
            'Check available memory',
            'Ensure proper file permissions',
            'Try reducing nCtx or nThreads parameters'
          ]
        }
      );
    }
  }

  /**
   * Create model instance with proper error handling
   */
  private async createModelInstance(options: any): Promise<any> {
    try {
      // Try different instantiation patterns
      if (this.gpt4all.GPT4All) {
        return await this.gpt4all.GPT4All.create(options.modelPath, options);
      } else if (this.gpt4all.default) {
        return new this.gpt4all.default(options.modelPath, options);
      } else {
        return new this.gpt4all(options.modelPath, options);
      }
    } catch (error) {
      // Enhanced error handling for common issues
      if (error instanceof Error) {
        if (error.message.includes('file not found') || error.message.includes('ENOENT')) {
          throw new ModelError(
            `Model file not found: ${options.modelPath}`,
            ModelErrorCode.MODEL_NOT_FOUND,
            { recoverable: false }
          );
        } else if (error.message.includes('memory') || error.message.includes('allocation')) {
          throw new ModelError(
            'Insufficient memory to load model',
            ModelErrorCode.INSUFFICIENT_MEMORY,
            { recoverable: true }
          );
        }
      }
      throw error;
    }
  }

  /**
   * Unload the model from memory
   */
  public async unloadModel(): Promise<void> {
    if (!this.isLoaded || !this.instance) {
      return;
    }

    try {
      // Call dispose/cleanup methods if available
      if (this.instance.dispose) {
        await this.instance.dispose();
      } else if (this.instance.close) {
        await this.instance.close();
      }

      this.instance = null;
      this.isLoaded = false;
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      console.log(`Successfully unloaded GPT4ALL model: ${this.modelConfig?.name || 'Unknown'}`);
    } catch (error) {
      console.error('Error during model unloading:', error);
      // Still mark as unloaded even if cleanup failed
      this.instance = null;
      this.isLoaded = false;
    }
  }

  /**
   * Generate text using the loaded model
   */
  public async generate(
    prompt: string,
    options?: ModelInferenceOptions
  ): Promise<ModelInferenceResult> {
    if (!this.isLoaded || !this.instance) {
      throw new ModelError(
        'Model is not loaded',
        ModelErrorCode.MODEL_NOT_FOUND,
        { recoverable: true }
      );
    }

    const startTime = Date.now();
    const memoryBefore = this.getMemoryUsage();

    try {
      const inferenceOptions = this.buildInferenceOptions(options);
      const response = await this.performInference(prompt, inferenceOptions);
      
      const inferenceTime = Date.now() - startTime;
      const memoryAfter = this.getMemoryUsage();

      return {
        text: response.text || response,
        tokens: this.estimateTokenCount(response.text || response),
        inferenceTime,
        memoryUsed: memoryAfter - memoryBefore,
        model: this.modelConfig?.id || 'gpt4all',
        timestamp: new Date(),
        context: options?.context
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown inference error';
      
      throw new ModelError(
        `Inference failed: ${errorMessage}`,
        ModelErrorCode.INFERENCE_FAILED,
        {
          modelId: this.modelConfig?.id,
          recoverable: true,
          suggestions: [
            'Check model status and reload if necessary',
            'Verify prompt format and length',
            'Reduce maxTokens or adjust temperature',
            'Ensure sufficient memory is available'
          ]
        }
      );
    }
  }

  /**
   * Perform the actual inference with timeout handling
   */
  private async performInference(prompt: string, options: any): Promise<any> {
    const timeout = options.timeout || 30000; // 30 second default timeout

    return new Promise(async (resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new ModelError(
          `Inference timeout after ${timeout}ms`,
          ModelErrorCode.TIMEOUT,
          { recoverable: true }
        ));
      }, timeout);

      try {
        let result;
        
        // Handle different GPT4ALL API patterns
        if (this.instance.generate) {
          result = await this.instance.generate(prompt, options);
        } else if (this.instance.createCompletion) {
          result = await this.instance.createCompletion({
            prompt,
            ...options
          });
        } else if (this.instance.chat) {
          result = await this.instance.chat([
            { role: 'user', content: prompt }
          ], options);
        } else {
          // Fallback for basic inference
          result = await this.instance(prompt, options);
        }

        clearTimeout(timeoutId);
        resolve(result);
      } catch (error) {
        clearTimeout(timeoutId);
        reject(error);
      }
    });
  }

  /**
   * Build inference options from ModelInferenceOptions
   */
  private buildInferenceOptions(options?: ModelInferenceOptions): any {
    const defaultOptions = {
      nPredict: this.config.nPredict || 256,
      temp: this.config.temp || 0.7,
      topK: this.config.topK || 40,
      topP: this.config.topP || 0.9,
      repeatPenalty: this.config.repeatPenalty || 1.1
    };

    if (!options) {
      return defaultOptions;
    }

    return {
      nPredict: options.maxTokens || defaultOptions.nPredict,
      temp: options.temperature || defaultOptions.temp,
      topK: options.topK || defaultOptions.topK,
      topP: options.topP || defaultOptions.topP,
      repeatPenalty: options.repeatPenalty || defaultOptions.repeatPenalty,
      timeout: options.timeout
    };
  }

  /**
   * Get current memory usage of the model
   */
  public getMemoryUsage(): number {
    if (!this.isLoaded) {
      return 0;
    }

    // Estimate based on process memory usage
    // This is an approximation as GPT4ALL doesn't provide direct memory metrics
    const memUsage = process.memoryUsage();
    return memUsage.rss;
  }

  /**
   * Get optimal thread count based on system capabilities
   */
  private getOptimalThreadCount(): number {
    const os = require('os');
    const cpuCount = os.cpus().length;
    // Use 75% of available CPUs, minimum 1, maximum 8
    return Math.min(Math.max(Math.floor(cpuCount * 0.75), 1), 8);
  }

  /**
   * Estimate token count from text
   */
  private estimateTokenCount(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  /**
   * Get model capabilities
   */
  public getCapabilities(): ModelCapabilities {
    return {
      textGeneration: true,
      chatCompletion: true,
      codeGeneration: this.modelConfig?.type === ModelType.CODEGEN,
      embedding: false,
      reasoning: true,
      multiModal: false,
      supportedFormats: ['text'],
      maxContextLength: this.config.nCtx || 2048
    };
  }

  /**
   * Validate model file
   */
  public static async validateModelFile(modelPath: string): Promise<boolean> {
    const fs = require('fs').promises;
    const path = require('path');

    try {
      const stats = await fs.stat(modelPath);
      if (!stats.isFile()) {
        return false;
      }

      // Check file extension
      const ext = path.extname(modelPath).toLowerCase();
      const validExtensions = ['.bin', '.ggml', '.gguf', '.gpt4all'];
      
      return validExtensions.includes(ext);
    } catch {
      return false;
    }
  }

  /**
   * Create model configuration from file
   */
  public static async createConfigFromFile(
    modelPath: string,
    options: Partial<ModelConfig> = {}
  ): Promise<ModelConfig> {
    const path = require('path');
    const fs = require('fs').promises;

    const isValid = await this.validateModelFile(modelPath);
    if (!isValid) {
      throw new ModelError(
        `Invalid model file: ${modelPath}`,
        ModelErrorCode.UNSUPPORTED_FORMAT
      );
    }

    const stats = await fs.stat(modelPath);
    const filename = path.basename(modelPath, path.extname(modelPath));

    return {
      id: options.id || `gpt4all-${Date.now()}`,
      name: options.name || filename,
      path: modelPath,
      type: ModelType.GPT4ALL,
      size: stats.size,
      memoryRequirement: Math.ceil(stats.size * 1.5), // Estimate 1.5x file size
      priority: options.priority ?? ModelPriority.MEDIUM,
      capabilities: {
        textGeneration: true,
        chatCompletion: true,
        codeGeneration: filename.toLowerCase().includes('code'),
        embedding: false,
        reasoning: true,
        multiModal: false,
        supportedFormats: ['text'],
        maxContextLength: 2048
      },
      metadata: {
        version: '1.0.0',
        description: options.metadata?.description || `GPT4ALL model: ${filename}`,
        author: 'GPT4ALL',
        license: 'GPL-3.0',
        tags: ['gpt4all', 'local', 'offline'],
        createdAt: new Date(),
        usageCount: 0,
        averageInferenceTime: 0,
        supportedTokens: 2048,
        ...options.metadata
      }
    };
  }
}

/**
 * GPT4ALL Model Factory
 */
export class GPT4ALLFactory {
  /**
   * Create GPT4ALL model instance from configuration
   */
  public static async createModel(
    modelConfig: ModelConfig,
    gpt4allConfig?: Partial<GPT4ALLConfig>
  ): Promise<GPT4ALLIntegration> {
    const config: GPT4ALLConfig = {
      modelPath: modelConfig.path,
      nThreads: gpt4allConfig?.nThreads,
      nCtx: gpt4allConfig?.nCtx || 2048,
      nPredict: gpt4allConfig?.nPredict || 256,
      temp: gpt4allConfig?.temp || 0.7,
      topK: gpt4allConfig?.topK || 40,
      topP: gpt4allConfig?.topP || 0.9,
      repeatPenalty: gpt4allConfig?.repeatPenalty || 1.1,
      promptTemplate: gpt4allConfig?.promptTemplate,
      ...gpt4allConfig
    };

    return new GPT4ALLIntegration(config, modelConfig);
  }

  /**
   * Discover GPT4ALL models in directory
   */
  public static async discoverModels(directory: string): Promise<ModelConfig[]> {
    const fs = require('fs').promises;
    const path = require('path');

    try {
      const files = await fs.readdir(directory);
      const models: ModelConfig[] = [];

      for (const file of files) {
        const fullPath = path.join(directory, file);
        
        try {
          if (await GPT4ALLIntegration.validateModelFile(fullPath)) {
            const config = await GPT4ALLIntegration.createConfigFromFile(fullPath);
            models.push(config);
          }
        } catch (error) {
          console.warn(`Failed to process model file ${fullPath}:`, error);
        }
      }

      return models;
    } catch (error) {
      console.error(`Failed to discover models in ${directory}:`, error);
      return [];
    }
  }
}

export default GPT4ALLIntegration;