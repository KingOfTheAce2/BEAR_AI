/**
 * Local Inference Optimizer - Optimizes local model inference with caching
 * Provides offline optimization without external dependencies
 */

import { ModelConfig, ModelInferenceOptions, ModelInferenceResult, ModelManagerConfig } from '../types/modelTypes';

export interface CacheEntry {
  key: string;
  prompt: string;
  result: ModelInferenceResult;
  modelId: string;
  timestamp: Date;
  accessCount: number;
  lastAccessed: Date;
  size: number;
}

export interface OptimizationMetrics {
  cacheHitRate: number;
  averageResponseTime: number;
  totalTokensCached: number;
  memorySaved: number;
  optimizationsApplied: string[];
}

export interface InferenceStrategy {
  useCache: boolean;
  preprocess: boolean;
  postprocess: boolean;
  streaming: boolean;
  batchSize: number;
  contextOptimization: boolean;
}

export class LocalInferenceOptimizer {
  private cache: Map<string, CacheEntry> = new Map();
  private metrics: OptimizationMetrics;
  private config: ModelManagerConfig;
  private maxCacheSize: number;
  private currentCacheSize: number = 0;
  
  // Optimization patterns
  private readonly commonPatterns = new Map<string, string>();
  private readonly responseTemplates = new Map<string, string>();
  private readonly contextOptimizations = new Map<string, string>();

  constructor(config: ModelManagerConfig) {
    this.config = config;
    this.maxCacheSize = config.cacheSize || 2 * 1024 * 1024 * 1024; // 2GB default
    
    this.metrics = {
      cacheHitRate: 0,
      averageResponseTime: 0,
      totalTokensCached: 0,
      memorySaved: 0,
      optimizationsApplied: []
    };

    this.initializeOptimizations();
    this.loadPersistedCache();
  }

  /**
   * Optimize inference request with caching and preprocessing
   */
  public async optimizeInference(
    modelId: string,
    prompt: string,
    options: ModelInferenceOptions,
    generateFunction: (prompt: string, options: ModelInferenceOptions) => Promise<ModelInferenceResult>
  ): Promise<ModelInferenceResult> {
    const strategy = this.determineStrategy(modelId, prompt, options);
    const optimizations: string[] = [];

    // 1. Check cache first
    if (strategy.useCache) {
      const cached = await this.getCachedResult(modelId, prompt, options);
      if (cached) {
        optimizations.push('cache-hit');
        this.updateMetrics({ cacheHit: true, optimizations });
        return this.enhanceCachedResult(cached);
      }
    }

    // 2. Preprocess prompt
    let optimizedPrompt = prompt;
    if (strategy.preprocess) {
      optimizedPrompt = await this.preprocessPrompt(prompt, modelId);
      if (optimizedPrompt !== prompt) {
        optimizations.push('prompt-optimization');
      }
    }

    // 3. Context optimization
    let optimizedOptions = { ...options };
    if (strategy.contextOptimization) {
      optimizedOptions = await this.optimizeContext(optimizedOptions, modelId);
      optimizations.push('context-optimization');
    }

    // 4. Execute inference
    const startTime = Date.now();
    let result: ModelInferenceResult;

    try {
      if (strategy.streaming && options.streaming !== false) {
        result = await this.optimizeStreamingInference(
          modelId,
          optimizedPrompt,
          optimizedOptions,
          generateFunction
        );
        optimizations.push('streaming-optimization');
      } else {
        result = await generateFunction(optimizedPrompt, optimizedOptions);
      }
    } catch (error) {
      // Fallback to simpler options on error
      console.warn('Inference failed with optimizations, retrying with basic options:', error);
      result = await generateFunction(prompt, options);
      optimizations.push('fallback-recovery');
    }

    const inferenceTime = Date.now() - startTime;

    // 5. Postprocess result
    if (strategy.postprocess) {
      result = await this.postprocessResult(result, modelId);
      optimizations.push('result-optimization');
    }

    // 6. Cache the result
    if (strategy.useCache && this.shouldCache(result, inferenceTime)) {
      await this.cacheResult(modelId, prompt, options, result);
      optimizations.push('result-cached');
    }

    // 7. Update metrics
    this.updateMetrics({
      cacheHit: false,
      responseTime: inferenceTime,
      optimizations
    });

    return result;
  }

  /**
   * Get cached result if available
   */
  private async getCachedResult(
    modelId: string,
    prompt: string,
    options: ModelInferenceOptions
  ): Promise<ModelInferenceResult | null> {
    const cacheKey = this.generateCacheKey(modelId, prompt, options);
    const entry = this.cache.get(cacheKey);
    
    if (!entry) {
      return null;
    }

    // Check if cache entry is still valid
    const maxAge = this.getCacheMaxAge(prompt);
    const age = Date.now() - entry.timestamp.getTime();
    
    if (age > maxAge) {
      this.cache.delete(cacheKey);
      this.currentCacheSize -= entry.size;
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = new Date();

    return entry.result;
  }

  /**
   * Cache inference result
   */
  private async cacheResult(
    modelId: string,
    prompt: string,
    options: ModelInferenceOptions,
    result: ModelInferenceResult
  ): Promise<void> {
    const cacheKey = this.generateCacheKey(modelId, prompt, options);
    const size = this.estimateResultSize(result);

    // Check if we need to make space
    await this.ensureCacheSpace(size);

    const entry: CacheEntry = {
      key: cacheKey,
      prompt,
      result: { ...result },
      modelId,
      timestamp: new Date(),
      accessCount: 1,
      lastAccessed: new Date(),
      size
    };

    this.cache.set(cacheKey, entry);
    this.currentCacheSize += size;

    // Persist to localStorage if possible
    try {
      this.persistCacheEntry(entry);
    } catch (error) {
      console.warn('Failed to persist cache entry:', error);
    }
  }

  /**
   * Preprocess prompt for optimization
   */
  private async preprocessPrompt(prompt: string, modelId: string): Promise<string> {
    let optimized = prompt;

    // 1. Apply common pattern replacements
    for (const [pattern, replacement] of this.commonPatterns) {
      optimized = optimized.replace(new RegExp(pattern, 'gi'), replacement);
    }

    // 2. Optimize for specific model types
    optimized = this.optimizeForModelType(optimized, modelId);

    // 3. Context length optimization
    optimized = this.optimizeContextLength(optimized);

    // 4. Template matching
    optimized = this.applyTemplateOptimizations(optimized);

    return optimized;
  }

  /**
   * Optimize context and options
   */
  private async optimizeContext(
    options: ModelInferenceOptions,
    modelId: string
  ): Promise<ModelInferenceOptions> {
    const optimized = { ...options };

    // Optimize temperature based on task type
    if (!optimized.temperature) {
      optimized.temperature = this.getOptimalTemperature(options.context || '');
    }

    // Optimize max tokens
    if (!optimized.maxTokens) {
      optimized.maxTokens = this.getOptimalMaxTokens(options.context || '');
    }

    // Optimize top_p and top_k for better quality/speed balance
    if (!optimized.topP) {
      optimized.topP = 0.9; // Good default for most cases
    }

    // Model-specific optimizations
    const modelOptimizations = this.getModelSpecificOptimizations(modelId);
    Object.assign(optimized, modelOptimizations);

    return optimized;
  }

  /**
   * Optimize streaming inference
   */
  private async optimizeStreamingInference(
    modelId: string,
    prompt: string,
    options: ModelInferenceOptions,
    generateFunction: (prompt: string, options: ModelInferenceOptions) => Promise<ModelInferenceResult>
  ): Promise<ModelInferenceResult> {
    // Enable streaming optimizations
    const streamOptions = {
      ...options,
      streaming: true,
      bufferSize: 1024, // Optimal buffer size
      flushInterval: 50   // 50ms flush interval
    };

    return await generateFunction(prompt, streamOptions);
  }

  /**
   * Postprocess inference result
   */
  private async postprocessResult(
    result: ModelInferenceResult,
    modelId: string
  ): Promise<ModelInferenceResult> {
    let optimized = { ...result };

    // 1. Clean up common artifacts
    optimized.text = this.cleanupText(optimized.text);

    // 2. Apply formatting improvements
    optimized.text = this.improveFormatting(optimized.text);

    // 3. Add metadata enhancements
    optimized = this.enhanceMetadata(optimized, modelId);

    return optimized;
  }

  /**
   * Determine optimization strategy for request
   */
  private determineStrategy(
    modelId: string,
    prompt: string,
    options: ModelInferenceOptions
  ): InferenceStrategy {
    const promptLength = prompt.length;
    const isChat = options.context?.includes('chat') || false;
    const isCreative = this.isCreativeTask(prompt);
    const isRepetitive = this.isRepetitiveTask(prompt);

    return {
      useCache: isRepetitive || promptLength < 500,
      preprocess: true,
      postprocess: !isCreative, // Don't postprocess creative outputs
      streaming: options.streaming !== false && promptLength > 100,
      batchSize: Math.min(4, Math.floor(2048 / promptLength)),
      contextOptimization: !isChat // Don't optimize chat context
    };
  }

  /**
   * Enhance cached result with current timestamp
   */
  private enhanceCachedResult(result: ModelInferenceResult): ModelInferenceResult {
    return {
      ...result,
      timestamp: new Date(),
      cached: true,
      inferenceTime: 0 // Cache hits are instantaneous
    };
  }

  // Cache management methods
  private generateCacheKey(
    modelId: string,
    prompt: string,
    options: ModelInferenceOptions
  ): string {
    const keyData = {
      modelId,
      prompt: prompt.slice(0, 200), // First 200 chars
      temperature: options.temperature,
      maxTokens: options.maxTokens,
      topP: options.topP
    };

    return btoa(JSON.stringify(keyData)).replace(/[^a-zA-Z0-9]/g, '');
  }

  private getCacheMaxAge(prompt: string): number {
    // Dynamic cache age based on content type
    if (this.isFactualQuery(prompt)) {
      return 24 * 60 * 60 * 1000; // 24 hours for factual queries
    }
    if (this.isCreativeTask(prompt)) {
      return 60 * 60 * 1000; // 1 hour for creative tasks
    }
    return 6 * 60 * 60 * 1000; // 6 hours default
  }

  private estimateResultSize(result: ModelInferenceResult): number {
    return JSON.stringify(result).length * 2; // Rough estimation
  }

  private async ensureCacheSpace(requiredSize: number): Promise<void> {
    if (this.currentCacheSize + requiredSize <= this.maxCacheSize) {
      return;
    }

    // Remove least recently used entries
    const entries = Array.from(this.cache.values())
      .sort((a, b) => a.lastAccessed.getTime() - b.lastAccessed.getTime());

    let freedSpace = 0;
    for (const entry of entries) {
      if (freedSpace >= requiredSize) break;
      
      this.cache.delete(entry.key);
      freedSpace += entry.size;
      this.currentCacheSize -= entry.size;
    }
  }

  private shouldCache(result: ModelInferenceResult, inferenceTime: number): boolean {
    // Cache longer responses that took significant time
    return result.text.length > 50 && inferenceTime > 1000;
  }

  // Optimization helper methods
  private initializeOptimizations(): void {
    // Common patterns that can be optimized
    this.commonPatterns.set(
      'write a (detailed|comprehensive|thorough)',
      'write a'
    );
    this.commonPatterns.set(
      'please (write|create|generate|make)',
      '$1'
    );
    this.commonPatterns.set(
      'can you help me (with|to)',
      'help me $1'
    );

    // Response templates for common requests
    this.responseTemplates.set('code', 'Here\'s the code:\n\n```\n{code}\n```');
    this.responseTemplates.set('explanation', '{explanation}');
    this.responseTemplates.set('list', '{items}');
  }

  private optimizeForModelType(prompt: string, modelId: string): string {
    // Model-specific optimizations
    if (modelId.includes('code')) {
      return this.optimizeForCodeModel(prompt);
    }
    if (modelId.includes('chat')) {
      return this.optimizeForChatModel(prompt);
    }
    return prompt;
  }

  private optimizeForCodeModel(prompt: string): string {
    // Add code-specific formatting
    if (!prompt.includes('```') && prompt.includes('code')) {
      return prompt + '\n\nFormat your response with code blocks using triple backticks.';
    }
    return prompt;
  }

  private optimizeForChatModel(prompt: string): string {
    // Ensure conversational format
    if (!prompt.startsWith('Human:') && !prompt.startsWith('User:')) {
      return `Human: ${prompt}\n\nAssistant:`;
    }
    return prompt;
  }

  private optimizeContextLength(prompt: string): string {
    const maxOptimalLength = 2000; // Characters
    
    if (prompt.length <= maxOptimalLength) {
      return prompt;
    }

    // Intelligently truncate while preserving meaning
    const sentences = prompt.split(/[.!?]+/);
    let truncated = '';
    
    for (const sentence of sentences) {
      if ((truncated + sentence).length > maxOptimalLength) {
        break;
      }
      truncated += sentence + '.';
    }

    return truncated || prompt.slice(0, maxOptimalLength);
  }

  private applyTemplateOptimizations(prompt: string): string {
    // Apply templates for common request patterns
    if (this.isCodeRequest(prompt)) {
      return prompt + '\n\nResponse format: code block with explanation.';
    }
    if (this.isListRequest(prompt)) {
      return prompt + '\n\nResponse format: numbered or bulleted list.';
    }
    return prompt;
  }

  private getOptimalTemperature(context: string): number {
    if (this.isCreativeTask(context)) return 0.8;
    if (this.isFactualQuery(context)) return 0.1;
    if (this.isCodeRequest(context)) return 0.2;
    return 0.5; // Balanced default
  }

  private getOptimalMaxTokens(context: string): number {
    if (this.isCodeRequest(context)) return 1000;
    if (this.isCreativeTask(context)) return 2000;
    if (this.isFactualQuery(context)) return 500;
    return 800; // Balanced default
  }

  private getModelSpecificOptimizations(modelId: string): Partial<ModelInferenceOptions> {
    const optimizations: Partial<ModelInferenceOptions> = {};

    // Model family specific optimizations
    if (modelId.includes('llama')) {
      optimizations.topP = 0.95;
      optimizations.repetitionPenalty = 1.1;
    } else if (modelId.includes('gpt')) {
      optimizations.topP = 0.9;
      optimizations.presencePenalty = 0.1;
    }

    return optimizations;
  }

  private cleanupText(text: string): string {
    return text
      .replace(/\n{3,}/g, '\n\n') // Remove excessive newlines
      .replace(/\s{2,}/g, ' ')    // Remove excessive spaces
      .trim();
  }

  private improveFormatting(text: string): string {
    // Add proper spacing around code blocks
    text = text.replace(/```([^`]+)```/g, '\n```$1```\n');
    
    // Ensure proper punctuation spacing
    text = text.replace(/([.!?])([A-Z])/g, '$1 $2');
    
    return text;
  }

  private enhanceMetadata(
    result: ModelInferenceResult,
    modelId: string
  ): ModelInferenceResult {
    return {
      ...result,
      optimized: true,
      optimizations: this.metrics.optimizationsApplied,
      modelId
    };
  }

  // Task detection methods
  private isCreativeTask(prompt: string): boolean {
    const creativeKeywords = /write.*story|create.*poem|generate.*creative|imaginative|fiction/i;
    return creativeKeywords.test(prompt);
  }

  private isFactualQuery(prompt: string): boolean {
    const factualKeywords = /what is|who is|when did|where is|how many|definition|fact|information/i;
    return factualKeywords.test(prompt);
  }

  private isCodeRequest(prompt: string): boolean {
    const codeKeywords = /write.*code|function|algorithm|programming|script|debug/i;
    return codeKeywords.test(prompt);
  }

  private isListRequest(prompt: string): boolean {
    const listKeywords = /list|enumerate|steps|bullet|points|items/i;
    return listKeywords.test(prompt);
  }

  private isRepetitiveTask(prompt: string): boolean {
    // Check if this is a common, repetitive task worth caching
    const commonTasks = /hello|hi|help|what can you do|introduce yourself/i;
    return commonTasks.test(prompt) || prompt.length < 50;
  }

  // Persistence methods
  private loadPersistedCache(): void {
    try {
      const stored = localStorage.getItem('BearAI_InferenceCache');
      if (stored) {
        const cacheData = JSON.parse(stored);
        for (const [key, entry] of Object.entries(cacheData)) {
          const cacheEntry = entry as CacheEntry;
          cacheEntry.timestamp = new Date(cacheEntry.timestamp);
          cacheEntry.lastAccessed = new Date(cacheEntry.lastAccessed);
          
          this.cache.set(key, cacheEntry);
          this.currentCacheSize += cacheEntry.size;
        }
      }
    } catch (error) {
      console.warn('Failed to load persisted cache:', error);
    }
  }

  private persistCacheEntry(entry: CacheEntry): void {
    try {
      const allCache = Object.fromEntries(this.cache.entries());
      localStorage.setItem('BearAI_InferenceCache', JSON.stringify(allCache));
    } catch (error) {
      // Storage full or unavailable, remove oldest entries
      this.cleanupOldEntries();
    }
  }

  private cleanupOldEntries(): void {
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - 24); // Remove entries older than 24 hours

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < cutoffDate) {
        this.cache.delete(key);
        this.currentCacheSize -= entry.size;
      }
    }
  }

  // Metrics methods
  private updateMetrics(update: {
    cacheHit?: boolean;
    responseTime?: number;
    optimizations?: string[];
  }): void {
    if (update.cacheHit !== undefined) {
      const totalRequests = this.metrics.cacheHitRate * 100 + (update.cacheHit ? 1 : 0);
      const hits = this.metrics.cacheHitRate * (totalRequests - 1) + (update.cacheHit ? 1 : 0);
      this.metrics.cacheHitRate = hits / totalRequests;
    }

    if (update.responseTime !== undefined) {
      this.metrics.averageResponseTime = 
        (this.metrics.averageResponseTime + update.responseTime) / 2;
    }

    if (update.optimizations) {
      this.metrics.optimizationsApplied = update.optimizations;
    }
  }

  /**
   * Get current optimization metrics
   */
  public getMetrics(): OptimizationMetrics {
    return {
      ...this.metrics,
      totalTokensCached: Array.from(this.cache.values())
        .reduce((sum, entry) => sum + (entry.result.tokens || 0), 0),
      memorySaved: this.currentCacheSize
    };
  }

  /**
   * Clear cache and reset metrics
   */
  public clearCache(): void {
    this.cache.clear();
    this.currentCacheSize = 0;
    localStorage.removeItem('BearAI_InferenceCache');
    
    this.metrics = {
      cacheHitRate: 0,
      averageResponseTime: 0,
      totalTokensCached: 0,
      memorySaved: 0,
      optimizationsApplied: []
    };
  }

  /**
   * Dispose of resources
   */
  public dispose(): void {
    this.clearCache();
  }
}

export default LocalInferenceOptimizer;