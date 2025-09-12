/**
 * Model Capabilities Detector - Analyzes and profiles local models
 * Provides offline capability detection without external API calls
 */

import { ModelConfig, ModelCapabilities, ModelType } from '../types/modelTypes';

export interface ModelProfile {
  id: string;
  capabilities: ModelCapabilities;
  performance: ModelPerformanceProfile;
  compatibility: ModelCompatibility;
  safety: ModelSafetyProfile;
  lastProfiled: Date;
}

export interface ModelPerformanceProfile {
  estimatedLoadTime: number;
  estimatedMemoryUsage: number;
  estimatedTokensPerSecond: number;
  benchmarkScore: number;
  efficiency: number;
  scalability: ModelScalability;
}

export interface ModelCompatibility {
  platforms: string[];
  architectures: string[];
  minMemoryRequired: number;
  gpuRequired: boolean;
  supportedFormats: string[];
  dependencies: string[];
}

export interface ModelSafetyProfile {
  contentFiltering: boolean;
  biasAssessment: ModelBiasAssessment;
  privacyCompliant: boolean;
  localOnly: boolean;
  dataRetention: 'none' | 'session' | 'persistent';
}

export interface ModelBiasAssessment {
  tested: boolean;
  score: number; // 0-100, higher is better
  categories: {
    gender: number;
    racial: number;
    religious: number;
    political: number;
  };
  lastAssessed: Date;
}

export interface ModelScalability {
  minContextLength: number;
  maxContextLength: number;
  batchSize: number;
  parallelizable: boolean;
  streamingSupport: boolean;
}

export class ModelCapabilitiesDetector {
  private profiles: Map<string, ModelProfile> = new Map();
  private detectionCache: Map<string, ModelCapabilities> = new Map();
  
  // Model signature patterns for capability detection
  private readonly capabilityPatterns = {
    chat: /chat|instruct|dialogue|conversation/i,
    code: /code|programming|dev|codex/i,
    creative: /creative|story|novel|poetry/i,
    analytical: /analysis|research|data|science/i,
    multilingual: /multilingual|polyglot|translate/i,
    roleplay: /roleplay|character|persona/i,
    reasoning: /reasoning|logic|math|problem/i
  };

  private readonly architecturePatterns = {
    transformer: /transformer|bert|gpt|llama|falcon/i,
    rnn: /rnn|lstm|gru/i,
    cnn: /cnn|convolution/i,
    hybrid: /hybrid|multi|ensemble/i
  };

  private readonly sizeCategories = [
    { name: 'tiny', maxParams: 1e9, maxMemory: 2e9 },
    { name: 'small', maxParams: 7e9, maxMemory: 8e9 },
    { name: 'medium', maxParams: 13e9, maxMemory: 16e9 },
    { name: 'large', maxParams: 30e9, maxMemory: 32e9 },
    { name: 'xlarge', maxParams: 70e9, maxMemory: 64e9 },
    { name: 'xxlarge', maxParams: Infinity, maxMemory: Infinity }
  ];

  constructor() {
    this.loadPersistedProfiles();
  }

  /**
   * Detect and profile model capabilities from configuration and file analysis
   */
  public async detectCapabilities(model: ModelConfig): Promise<ModelCapabilities> {
    // Check cache first
    const cached = this.detectionCache.get(model.id);
    if (cached) {
      return cached;
    }

    const capabilities: ModelCapabilities = {
      textGeneration: true, // Assume basic text generation
      chatCompletion: this.detectChatCapability(model),
      streaming: this.detectStreamingSupport(model),
      contextLength: this.detectContextLength(model),
      features: this.detectFeatures(model),
      languages: this.detectLanguages(model),
      modelSize: await this.analyzeModelSize(model),
      architecture: this.detectArchitecture(model),
      specializations: this.detectSpecializations(model),
      performance: await this.estimatePerformance(model),
      safety: this.analyzeSafetyFeatures(model)
    };

    // Cache the result
    this.detectionCache.set(model.id, capabilities);
    
    return capabilities;
  }

  /**
   * Create comprehensive model profile
   */
  public async profileModel(model: ModelConfig): Promise<ModelProfile> {
    const capabilities = await this.detectCapabilities(model);
    const performance = await this.analyzePerformance(model);
    const compatibility = this.analyzeCompatibility(model);
    const safety = await this.analyzeSafety(model);

    const profile: ModelProfile = {
      id: model.id,
      capabilities,
      performance,
      compatibility,
      safety,
      lastProfiled: new Date()
    };

    this.profiles.set(model.id, profile);
    await this.persistProfile(profile);

    return profile;
  }

  /**
   * Get cached model profile
   */
  public getProfile(modelId: string): ModelProfile | null {
    return this.profiles.get(modelId) || null;
  }

  /**
   * Update model profile after usage
   */
  public async updateProfileFromUsage(
    modelId: string, 
    usageData: {
      loadTime: number;
      memoryUsage: number;
      inferenceTime: number;
      tokensGenerated: number;
      errorOccurred: boolean;
    }
  ): Promise<void> {
    const profile = this.profiles.get(modelId);
    if (!profile) return;

    // Update performance metrics based on actual usage
    const perf = profile.performance;
    perf.estimatedLoadTime = this.updateMovingAverage(perf.estimatedLoadTime, usageData.loadTime);
    perf.estimatedMemoryUsage = Math.max(perf.estimatedMemoryUsage, usageData.memoryUsage);
    
    if (usageData.tokensGenerated > 0 && usageData.inferenceTime > 0) {
      const tokensPerSecond = usageData.tokensGenerated / (usageData.inferenceTime / 1000);
      perf.estimatedTokensPerSecond = this.updateMovingAverage(perf.estimatedTokensPerSecond, tokensPerSecond);
    }

    profile.lastProfiled = new Date();
    await this.persistProfile(profile);
  }

  /**
   * Compare models by capabilities and performance
   */
  public compareModels(modelIds: string[]): {
    modelId: string;
    score: number;
    strengths: string[];
    weaknesses: string[];
  }[] {
    const comparisons = modelIds.map(id => {
      const profile = this.profiles.get(id);
      if (!profile) {
        return { modelId: id, score: 0, strengths: [], weaknesses: ['Not profiled'] };
      }

      const score = this.calculateOverallScore(profile);
      const strengths = this.identifyStrengths(profile);
      const weaknesses = this.identifyWeaknesses(profile);

      return { modelId: id, score, strengths, weaknesses };
    });

    return comparisons.sort((a, b) => b.score - a.score);
  }

  /**
   * Recommend best model for specific task
   */
  public recommendModelForTask(
    task: {
      type: 'chat' | 'code' | 'creative' | 'analytical' | 'translation';
      contextRequired: number;
      performanceRequirement: 'fast' | 'balanced' | 'quality';
      memoryLimit?: number;
    },
    availableModels: string[]
  ): string | null {
    const candidates = availableModels
      .map(id => this.profiles.get(id))
      .filter(profile => profile && this.isModelSuitableForTask(profile, task))
      .sort((a, b) => this.scoreModelForTask(b!, task) - this.scoreModelForTask(a!, task));

    return candidates.length > 0 ? candidates[0]!.id : null;
  }

  // Private detection methods
  private detectChatCapability(model: ModelConfig): boolean {
    return this.capabilityPatterns.chat.test(model.name) ||
           this.capabilityPatterns.chat.test(model.description || '') ||
           model.type === 'chat' ||
           (model.tags && model.tags.some(tag => this.capabilityPatterns.chat.test(tag)));
  }

  private detectStreamingSupport(model: ModelConfig): boolean {
    // Most modern models support streaming, assume true unless explicitly disabled
    return model.streaming !== false;
  }

  private detectContextLength(model: ModelConfig): number {
    if (model.contextLength) return model.contextLength;
    
    // Estimate based on model name/description
    const text = `${model.name} ${model.description || ''}`.toLowerCase();
    
    if (text.includes('32k') || text.includes('32768')) return 32768;
    if (text.includes('16k') || text.includes('16384')) return 16384;
    if (text.includes('8k') || text.includes('8192')) return 8192;
    if (text.includes('4k') || text.includes('4096')) return 4096;
    
    // Default estimation based on model size
    const sizeGB = this.estimateModelSizeGB(model);
    if (sizeGB > 20) return 8192;
    if (sizeGB > 10) return 4096;
    return 2048;
  }

  private detectFeatures(model: ModelConfig): string[] {
    const features: string[] = ['text-generation'];
    const text = `${model.name} ${model.description || ''}`.toLowerCase();

    for (const [feature, pattern] of Object.entries(this.capabilityPatterns)) {
      if (pattern.test(text)) {
        features.push(feature);
      }
    }

    return [...new Set(features)]; // Remove duplicates
  }

  private detectLanguages(model: ModelConfig): string[] {
    if (model.languages) return model.languages;

    const text = `${model.name} ${model.description || ''}`.toLowerCase();
    const languages = ['en']; // Default to English

    // Common language indicators
    const languagePatterns = {
      'zh': /chinese|mandarin|zh|中文/i,
      'es': /spanish|español|es/i,
      'fr': /french|français|fr/i,
      'de': /german|deutsch|de/i,
      'ja': /japanese|日本語|ja/i,
      'ko': /korean|한국어|ko/i,
      'ru': /russian|русский|ru/i,
      'ar': /arabic|العربية|ar/i,
      'hi': /hindi|हिन्दी|hi/i,
      'pt': /portuguese|português|pt/i
    };

    for (const [lang, pattern] of Object.entries(languagePatterns)) {
      if (pattern.test(text)) {
        languages.push(lang);
      }
    }

    if (text.includes('multilingual') || text.includes('polyglot')) {
      languages.push('zh', 'es', 'fr', 'de', 'ja');
    }

    return [...new Set(languages)];
  }

  private async analyzeModelSize(model: ModelConfig): Promise<number> {
    // Try to get actual file size if available
    if (model.fileSize) return model.fileSize;
    
    // Estimate from parameters
    if (model.parameters) {
      // Rough estimation: parameters * 2 bytes (for 16-bit weights)
      return model.parameters * 2;
    }

    // Estimate from model name/description
    return this.estimateModelSizeGB(model) * 1e9;
  }

  private detectArchitecture(model: ModelConfig): string {
    if (model.architecture) return model.architecture;

    const text = `${model.name} ${model.description || ''}`.toLowerCase();
    
    for (const [arch, pattern] of Object.entries(this.architecturePatterns)) {
      if (pattern.test(text)) {
        return arch;
      }
    }

    return 'transformer'; // Default assumption
  }

  private detectSpecializations(model: ModelConfig): string[] {
    const specializations: string[] = [];
    const text = `${model.name} ${model.description || ''}`.toLowerCase();

    const specializationPatterns = {
      'instruction-following': /instruct|instruction|command/i,
      'conversation': /chat|conversation|dialogue/i,
      'code-generation': /code|programming|codex/i,
      'creative-writing': /creative|story|novel|writing/i,
      'mathematical': /math|mathematics|calculation/i,
      'reasoning': /reasoning|logic|problem|analysis/i,
      'role-playing': /roleplay|character|persona/i,
      'factual': /factual|knowledge|encyclopedia/i
    };

    for (const [spec, pattern] of Object.entries(specializationPatterns)) {
      if (pattern.test(text)) {
        specializations.push(spec);
      }
    }

    return specializations;
  }

  private async estimatePerformance(model: ModelConfig): Promise<any> {
    const sizeGB = this.estimateModelSizeGB(model);
    const category = this.getSizeCategory(sizeGB);

    return {
      category: category.name,
      estimatedLoadTime: this.estimateLoadTime(sizeGB),
      estimatedMemoryUsage: sizeGB * 1.2 * 1e9, // Add 20% overhead
      estimatedTokensPerSecond: this.estimateTokensPerSecond(sizeGB),
      qualityScore: this.estimateQualityScore(sizeGB)
    };
  }

  private async analyzePerformance(model: ModelConfig): Promise<ModelPerformanceProfile> {
    const sizeGB = this.estimateModelSizeGB(model);
    
    return {
      estimatedLoadTime: this.estimateLoadTime(sizeGB),
      estimatedMemoryUsage: sizeGB * 1.2 * 1e9,
      estimatedTokensPerSecond: this.estimateTokensPerSecond(sizeGB),
      benchmarkScore: this.estimateBenchmarkScore(model),
      efficiency: this.calculateEfficiency(sizeGB),
      scalability: {
        minContextLength: 512,
        maxContextLength: this.detectContextLength(model),
        batchSize: Math.max(1, Math.floor(16 / sizeGB)),
        parallelizable: sizeGB < 20,
        streamingSupport: this.detectStreamingSupport(model)
      }
    };
  }

  private analyzeCompatibility(model: ModelConfig): ModelCompatibility {
    return {
      platforms: ['web', 'desktop'], // Local execution platforms
      architectures: ['x86_64', 'arm64'],
      minMemoryRequired: this.estimateModelSizeGB(model) * 1.5 * 1e9,
      gpuRequired: this.estimateModelSizeGB(model) > 10,
      supportedFormats: this.getSupportedFormats(model),
      dependencies: this.detectDependencies(model)
    };
  }

  private async analyzeSafety(model: ModelConfig): Promise<ModelSafetyProfile> {
    return {
      contentFiltering: this.hasContentFiltering(model),
      biasAssessment: {
        tested: false,
        score: 50, // Default neutral score
        categories: {
          gender: 50,
          racial: 50,
          religious: 50,
          political: 50
        },
        lastAssessed: new Date()
      },
      privacyCompliant: true, // Local models are privacy-compliant by default
      localOnly: true,
      dataRetention: 'none' // Local models don't retain data
    };
  }

  // Helper methods
  private estimateModelSizeGB(model: ModelConfig): number {
    const text = `${model.name} ${model.description || ''}`.toLowerCase();
    
    // Try to extract size from name
    const sizeMatch = text.match(/(\d+(?:\.\d+)?)\s*([bkmg])/i);
    if (sizeMatch) {
      const value = parseFloat(sizeMatch[1]);
      const unit = sizeMatch[2].toLowerCase();
      
      switch (unit) {
        case 'g': return value;
        case 'm': return value / 1000;
        case 'k': return value / 1000000;
        case 'b': return value / 1000000000;
      }
    }

    // Extract parameter count
    const paramMatch = text.match(/(\d+(?:\.\d+)?)\s*([bkmg]?)\s*(?:param|parameter)/i);
    if (paramMatch) {
      let params = parseFloat(paramMatch[1]);
      const unit = paramMatch[2].toLowerCase();
      
      switch (unit) {
        case 'b': params *= 1e9; break;
        case 'm': params *= 1e6; break;
        case 'k': params *= 1e3; break;
      }
      
      // Estimate size: parameters * 2 bytes / 1GB
      return (params * 2) / 1e9;
    }

    // Default estimation based on model name patterns
    if (text.includes('large') || text.includes('xl')) return 13;
    if (text.includes('medium')) return 7;
    if (text.includes('small')) return 3;
    if (text.includes('tiny') || text.includes('mini')) return 1;
    
    return 7; // Default medium size
  }

  private getSizeCategory(sizeGB: number): { name: string; maxParams: number; maxMemory: number } {
    return this.sizeCategories.find(cat => sizeGB * 1e9 <= cat.maxMemory) || this.sizeCategories[this.sizeCategories.length - 1];
  }

  private estimateLoadTime(sizeGB: number): number {
    // Estimate based on typical SSD speeds and model complexity
    return Math.max(1000, sizeGB * 1000); // 1 second per GB minimum
  }

  private estimateTokensPerSecond(sizeGB: number): number {
    // Larger models are generally slower
    if (sizeGB > 30) return 5;
    if (sizeGB > 20) return 10;
    if (sizeGB > 10) return 20;
    if (sizeGB > 5) return 40;
    return 80;
  }

  private estimateQualityScore(sizeGB: number): number {
    // Larger models generally have better quality, but with diminishing returns
    return Math.min(100, 30 + Math.log10(sizeGB) * 25);
  }

  private estimateBenchmarkScore(model: ModelConfig): number {
    const sizeGB = this.estimateModelSizeGB(model);
    const baseScore = this.estimateQualityScore(sizeGB);
    
    // Adjust based on model type and specializations
    let adjustedScore = baseScore;
    
    if (model.type === 'instruct') adjustedScore += 10;
    if (model.tags?.includes('chat')) adjustedScore += 5;
    if (model.tags?.includes('reasoning')) adjustedScore += 10;
    
    return Math.min(100, adjustedScore);
  }

  private calculateEfficiency(sizeGB: number): number {
    // Efficiency score: balance between quality and resource usage
    const quality = this.estimateQualityScore(sizeGB);
    const resourceUsage = Math.log10(sizeGB) * 20;
    
    return Math.max(0, quality - resourceUsage);
  }

  private getSupportedFormats(model: ModelConfig): string[] {
    const formats = ['gguf']; // Default format
    
    if (model.format) {
      formats.push(model.format);
    }
    
    // Add common formats based on model type
    if (model.type === ModelType.GPT4ALL) {
      formats.push('ggml', 'gguf');
    }
    
    return [...new Set(formats)];
  }

  private detectDependencies(model: ModelConfig): string[] {
    const deps: string[] = [];
    
    // Common dependencies based on model type
    if (model.type === ModelType.GPT4ALL) {
      deps.push('gpt4all');
    }
    
    return deps;
  }

  private hasContentFiltering(model: ModelConfig): boolean {
    const text = `${model.name} ${model.description || ''}`.toLowerCase();
    return text.includes('safe') || text.includes('filtered') || text.includes('aligned');
  }

  private calculateOverallScore(profile: ModelProfile): number {
    const perf = profile.performance;
    const compat = profile.compatibility;
    
    // Weighted scoring
    const performanceScore = (perf.benchmarkScore * 0.4) + (perf.efficiency * 0.3);
    const compatibilityScore = compat.platforms.length * 10;
    const featuresScore = profile.capabilities.features?.length * 5 || 0;
    
    return Math.min(100, performanceScore + compatibilityScore + featuresScore);
  }

  private identifyStrengths(profile: ModelProfile): string[] {
    const strengths: string[] = [];
    
    if (profile.performance.efficiency > 70) strengths.push('High efficiency');
    if (profile.performance.benchmarkScore > 80) strengths.push('High quality');
    if (profile.performance.estimatedTokensPerSecond > 50) strengths.push('Fast inference');
    if (profile.capabilities.contextLength > 8192) strengths.push('Large context');
    if (profile.capabilities.languages.length > 3) strengths.push('Multilingual');
    if (profile.safety.privacyCompliant) strengths.push('Privacy-focused');
    
    return strengths;
  }

  private identifyWeaknesses(profile: ModelProfile): string[] {
    const weaknesses: string[] = [];
    
    if (profile.performance.estimatedMemoryUsage > 20e9) weaknesses.push('High memory usage');
    if (profile.performance.estimatedLoadTime > 30000) weaknesses.push('Slow loading');
    if (profile.performance.benchmarkScore < 40) weaknesses.push('Limited quality');
    if (profile.capabilities.contextLength < 2048) weaknesses.push('Small context');
    if (profile.compatibility.gpuRequired) weaknesses.push('Requires GPU');
    
    return weaknesses;
  }

  private isModelSuitableForTask(profile: ModelProfile, task: any): boolean {
    if (task.contextRequired > profile.capabilities.contextLength) return false;
    if (task.memoryLimit && profile.performance.estimatedMemoryUsage > task.memoryLimit) return false;
    
    const hasRequiredCapability = profile.capabilities.features?.some(feature => 
      feature.includes(task.type) || 
      (task.type === 'chat' && feature.includes('conversation'))
    );
    
    return hasRequiredCapability || false;
  }

  private scoreModelForTask(profile: ModelProfile, task: any): number {
    let score = profile.performance.benchmarkScore;
    
    // Adjust based on task requirements
    if (task.performanceRequirement === 'fast') {
      score += profile.performance.estimatedTokensPerSecond;
    } else if (task.performanceRequirement === 'quality') {
      score += profile.performance.benchmarkScore * 0.5;
    }
    
    // Bonus for matching capabilities
    if (profile.capabilities.features?.includes(task.type)) {
      score += 20;
    }
    
    return score;
  }

  private updateMovingAverage(current: number, newValue: number, weight = 0.1): number {
    return current * (1 - weight) + newValue * weight;
  }

  private async loadPersistedProfiles(): Promise<void> {
    try {
      const stored = localStorage.getItem('BearAI_ModelProfiles');
      if (stored) {
        const profiles = JSON.parse(stored);
        for (const [id, profile] of Object.entries(profiles)) {
          this.profiles.set(id, profile as ModelProfile);
        }
      }
    } catch (error) {
      console.error('Failed to load persisted profiles:', error);
    }
  }

  private async persistProfile(profile: ModelProfile): Promise<void> {
    try {
      const allProfiles = Object.fromEntries(this.profiles.entries());
      localStorage.setItem('BearAI_ModelProfiles', JSON.stringify(allProfiles));
    } catch (error) {
      console.error('Failed to persist profile:', error);
    }
  }

  /**
   * Clear all cached data
   */
  public clearCache(): void {
    this.detectionCache.clear();
    this.profiles.clear();
    localStorage.removeItem('BearAI_ModelProfiles');
  }

  /**
   * Dispose of resources
   */
  public dispose(): void {
    this.clearCache();
  }
}

export default ModelCapabilitiesDetector;