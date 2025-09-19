/**
 * Model Capabilities Detector
 * Analyzes and profiles model capabilities for optimization
 */

import { ModelConfig } from '../types/modelTypes';

export interface ModelCapabilities {
  modelSize: number;
  contextLength: number;
  features: string[];
  supportedTasks: string[];
  optimizations: string[];
  performance: {
    estimatedSpeed: number;
    memoryEfficiency: number;
    accuracy: number;
  };
  limitations: string[];
}

export interface ModelProfile {
  modelId: string;
  capabilities: ModelCapabilities;
  benchmarks: {
    latency: number;
    throughput: number;
    memoryUsage: number;
  };
  recommendations: {
    optimalBatchSize: number;
    recommendedContextLength: number;
    bestUseCases: string[];
  };
  compatibility: {
    hardware: string[];
    frameworks: string[];
  };
  lastProfiled: Date;
}

export class ModelCapabilitiesDetector {
  private profiles: Map<string, ModelProfile> = new Map();
  private capabilitiesCache: Map<string, ModelCapabilities> = new Map();

  /**
   * Detect capabilities of a model
   */
  async detectCapabilities(modelConfig: ModelConfig): Promise<ModelCapabilities> {
    const cacheKey = this.getCacheKey(modelConfig);
    
    if (this.capabilitiesCache.has(cacheKey)) {
      return this.capabilitiesCache.get(cacheKey)!;
    }

    const capabilities = await this.analyzeModel(modelConfig);
    this.capabilitiesCache.set(cacheKey, capabilities);
    
    return capabilities;
  }

  /**
   * Create comprehensive model profile
   */
  async profileModel(modelConfig: ModelConfig): Promise<ModelProfile> {
    const capabilities = await this.detectCapabilities(modelConfig);
    const benchmarks = await this.benchmarkModel(modelConfig);
    const recommendations = this.generateRecommendations(modelConfig, capabilities);
    const compatibility = this.assessCompatibility(modelConfig);

    const profile: ModelProfile = {
      modelId: modelConfig.id,
      capabilities,
      benchmarks,
      recommendations,
      compatibility,
      lastProfiled: new Date()
    };

    this.profiles.set(modelConfig.id, profile);
    return profile;
  }

  /**
   * Get existing profile
   */
  getProfile(modelId: string): ModelProfile | undefined {
    return this.profiles.get(modelId);
  }

  /**
   * Update profile with new data
   */
  updateProfile(modelId: string, updates: Partial<ModelProfile>): void {
    const existing = this.profiles.get(modelId);
    if (existing) {
      this.profiles.set(modelId, { ...existing, ...updates });
    }
  }

  /**
   * Get all model summaries
   */
  getAllModelSummaries(): Array<{
    modelId: string;
    name: string;
    capabilities: string[];
    performance: number;
  }> {
    const summaries = [];
    
    for (const profile of this.profiles.values()) {
      summaries.push({
        modelId: profile.modelId,
        name: profile.modelId, // Would get from model registry
        capabilities: profile.capabilities.features,
        performance: this.calculateOverallPerformance(profile)
      });
    }
    
    return summaries;
  }

  /**
   * Analyze model to determine capabilities
   */
  private async analyzeModel(modelConfig: ModelConfig): Promise<ModelCapabilities> {
    // Extract information from model configuration
    const modelSize = modelConfig.size || 0;
    const configCapabilities =
      typeof modelConfig.capabilities === 'object' && !Array.isArray(modelConfig.capabilities)
        ? modelConfig.capabilities
        : undefined;
    const contextLength =
      modelConfig.contextLength ?? configCapabilities?.contextLength ?? 2048;
    
    // Determine features based on model type and metadata
    const features = this.extractFeatures(modelConfig);
    const supportedTasks = this.determineSupportedTasks(modelConfig);
    const optimizations = this.identifyOptimizations(modelConfig);
    const limitations = this.identifyLimitations(modelConfig);
    
    // Estimate performance metrics
    const performance = this.estimatePerformance(modelConfig);

    return {
      modelSize,
      contextLength,
      features,
      supportedTasks,
      optimizations,
      performance,
      limitations
    };
  }

  /**
   * Benchmark model performance
   */
  private async benchmarkModel(modelConfig: ModelConfig): Promise<{
    latency: number;
    throughput: number;
    memoryUsage: number;
  }> {
    // In a real implementation, this would run actual benchmarks
    // For now, we provide estimates based on model characteristics
    
    const sizeGB = (modelConfig.size || 1024 * 1024 * 1024) / (1024 * 1024 * 1024);
    
    return {
      latency: this.estimateLatency(sizeGB),
      throughput: this.estimateThroughput(sizeGB),
      memoryUsage: Math.floor(sizeGB * 1.3 * 1024) // MB with overhead
    };
  }

  /**
   * Generate optimization recommendations
   */
  private generateRecommendations(
    modelConfig: ModelConfig,
    capabilities: ModelCapabilities
  ): {
    optimalBatchSize: number;
    recommendedContextLength: number;
    bestUseCases: string[];
  } {
    const modelSizeGB = capabilities.modelSize / (1024 * 1024 * 1024);
    
    return {
      optimalBatchSize: this.calculateOptimalBatchSize(modelSizeGB),
      recommendedContextLength: Math.min(capabilities.contextLength, 2048),
      bestUseCases: this.identifyBestUseCases(capabilities)
    };
  }

  /**
   * Assess hardware/framework compatibility
   */
  private assessCompatibility(modelConfig: ModelConfig): {
    hardware: string[];
    frameworks: string[];
  } {
    const hardware = ['CPU'];
    const frameworks = ['GPT4All'];

    // Check if GPU acceleration is possible
    if (modelConfig.capabilities?.includes('gpu-acceleration')) {
      hardware.push('GPU');
    }

    // Add framework support based on model type
    if (modelConfig.metadata?.modelType === 'ggml') {
      frameworks.push('llama.cpp', 'ggml');
    }

    return { hardware, frameworks };
  }

  /**
   * Extract features from model configuration
   */
  private extractFeatures(modelConfig: ModelConfig): string[] {
    const features = [];

    if (Array.isArray(modelConfig.capabilities)) {
      features.push(...modelConfig.capabilities);
    } else if (modelConfig.capabilities) {
      const capabilityObject = modelConfig.capabilities;

      if (Array.isArray(capabilityObject.features)) {
        features.push(...capabilityObject.features);
      }

      for (const [key, value] of Object.entries(capabilityObject)) {
        if (typeof value === 'boolean' && value) {
          features.push(key);
        }
      }
    }

    // Add features based on model metadata
    if (modelConfig.metadata?.modelType === 'ggml') {
      features.push('quantized', 'efficient-inference');
    }

    // Add features based on model size
    const sizeGB = (modelConfig.size || 0) / (1024 * 1024 * 1024);
    if (sizeGB < 2) {
      features.push('lightweight', 'mobile-friendly');
    } else if (sizeGB > 10) {
      features.push('high-capacity', 'resource-intensive');
    }

    return features;
  }

  /**
   * Determine supported tasks
   */
  private determineSupportedTasks(modelConfig: ModelConfig): string[] {
    const tasks = [];

    // Base tasks for most models
    tasks.push('text-generation', 'question-answering');

    // Task inference from model name/description
    const name = modelConfig.name.toLowerCase();
    const description = (modelConfig.description || '').toLowerCase();

    if (name.includes('chat') || description.includes('chat')) {
      tasks.push('conversational-ai', 'chat-completion');
    }

    if (name.includes('code') || description.includes('code')) {
      tasks.push('code-generation', 'code-completion');
    }

    if (name.includes('instruct') || description.includes('instruction')) {
      tasks.push('instruction-following', 'task-completion');
    }

    return tasks;
  }

  /**
   * Identify available optimizations
   */
  private identifyOptimizations(modelConfig: ModelConfig): string[] {
    const optimizations = [];

    if (modelConfig.metadata?.modelType === 'ggml') {
      optimizations.push('quantization', 'memory-mapping');
    }

    // Size-based optimizations
    const sizeGB = (modelConfig.size || 0) / (1024 * 1024 * 1024);
    if (sizeGB > 5) {
      optimizations.push('model-sharding', 'progressive-loading');
    }

    optimizations.push('caching', 'batch-processing');

    return optimizations;
  }

  /**
   * Identify model limitations
   */
  private identifyLimitations(modelConfig: ModelConfig): string[] {
    const limitations = [];

    const capabilityContextLength =
      typeof modelConfig.capabilities === 'object' && !Array.isArray(modelConfig.capabilities)
        ? modelConfig.capabilities.contextLength
        : undefined;
    const contextLength = modelConfig.contextLength ?? capabilityContextLength ?? 2048;
    if (contextLength < 4096) {
      limitations.push('limited-context-length');
    }

    const sizeGB = (modelConfig.size || 0) / (1024 * 1024 * 1024);
    if (sizeGB > 8) {
      limitations.push('high-memory-requirements');
    }

    // General limitations
    limitations.push('offline-only', 'no-real-time-training');

    return limitations;
  }

  /**
   * Estimate performance metrics
   */
  private estimatePerformance(modelConfig: ModelConfig): {
    estimatedSpeed: number;
    memoryEfficiency: number;
    accuracy: number;
  } {
    const sizeGB = (modelConfig.size || 1024 * 1024 * 1024) / (1024 * 1024 * 1024);
    
    // Larger models are typically slower but more accurate
    const estimatedSpeed = Math.max(1, 10 - sizeGB); // 1-10 scale
    const accuracy = Math.min(10, 5 + sizeGB * 0.5); // Larger = more accurate
    const memoryEfficiency = modelConfig.metadata?.modelType === 'ggml' ? 8 : 6;

    return {
      estimatedSpeed,
      memoryEfficiency,
      accuracy
    };
  }

  /**
   * Estimate latency based on model size
   */
  private estimateLatency(sizeGB: number): number {
    // Base latency + size factor (in milliseconds)
    return Math.floor(100 + sizeGB * 50);
  }

  /**
   * Estimate throughput based on model size
   */
  private estimateThroughput(sizeGB: number): number {
    // Tokens per second (rough estimate)
    return Math.max(1, Math.floor(20 - sizeGB * 2));
  }

  /**
   * Calculate optimal batch size
   */
  private calculateOptimalBatchSize(sizeGB: number): number {
    if (sizeGB < 2) return 8;
    if (sizeGB < 5) return 4;
    if (sizeGB < 10) return 2;
    return 1;
  }

  /**
   * Identify best use cases
   */
  private identifyBestUseCases(capabilities: ModelCapabilities): string[] {
    const useCases = [];

    if (capabilities.features.includes('lightweight')) {
      useCases.push('mobile-apps', 'edge-computing');
    }

    if (capabilities.features.includes('conversational-ai')) {
      useCases.push('chatbots', 'virtual-assistants');
    }

    if (capabilities.features.includes('code-generation')) {
      useCases.push('coding-assistance', 'code-review');
    }

    if (capabilities.contextLength > 4096) {
      useCases.push('document-analysis', 'long-form-content');
    }

    return useCases;
  }

  /**
   * Calculate overall performance score
   */
  private calculateOverallPerformance(profile: ModelProfile): number {
    const { performance } = profile.capabilities;
    const { latency, throughput } = profile.benchmarks;
    
    // Weighted performance score (0-10)
    const speedScore = performance.estimatedSpeed * 0.3;
    const efficiencyScore = performance.memoryEfficiency * 0.2;
    const accuracyScore = performance.accuracy * 0.3;
    const latencyScore = Math.max(0, 10 - latency / 100) * 0.1;
    const throughputScore = Math.min(10, throughput / 2) * 0.1;
    
    return Math.round(speedScore + efficiencyScore + accuracyScore + latencyScore + throughputScore);
  }

  /**
   * Generate cache key
   */
  private getCacheKey(modelConfig: ModelConfig): string {
    return `${modelConfig.id}_${modelConfig.size || 0}_${modelConfig.version || 'unknown'}`;
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    this.profiles.clear();
    this.capabilitiesCache.clear();
  }
}

export default ModelCapabilitiesDetector;
