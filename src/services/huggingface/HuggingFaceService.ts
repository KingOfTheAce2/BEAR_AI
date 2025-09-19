/**
 * HuggingFace Service for BEAR AI
 * Handles API communication with HuggingFace Hub
 */

import {
  HuggingFaceModel,
  ModelSearchFilters,
  LegalCategory,
  ModelRecommendation,
  HuggingFaceConfig,
  ModelMetadata,
  ModelDownloadProgress
} from '../../types/huggingface';

export class HuggingFaceService {
  private config: HuggingFaceConfig;
  private cache: Map<string, any> = new Map();

  constructor(config: HuggingFaceConfig = {}) {
    this.config = {
      baseUrl: 'https://huggingface.co/api',
      timeout: 30000,
      retries: 3,
      cacheTTL: 3600000, // 1 hour
      localCacheEnabled: true,
      downloadPath: './models',
      ...config
    };
  }

  /**
   * Search models with filters
   */
  async searchModels(filters: ModelSearchFilters = {}): Promise<HuggingFaceModel[]> {
    const cacheKey = `search_${JSON.stringify(filters)}`;
    
    if (this.config.localCacheEnabled && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.config.cacheTTL!) {
        return cached.data;
      }
    }

    try {
      const params = new URLSearchParams();
      
      if (filters.query) params.append('search', filters.query);
      if (filters.author) params.append('author', filters.author);
      if (filters.pipeline_tag) params.append('pipeline_tag', filters.pipeline_tag);
      if (filters.library) filters.library.forEach(lib => params.append('library', lib));
      if (filters.language) filters.language.forEach(lang => params.append('language', lang));
      if (filters.license) filters.license.forEach(lic => params.append('license', lic));
      if (filters.tags) filters.tags.forEach(tag => params.append('tags', tag));
      if (filters.sort) params.append('sort', filters.sort);
      if (filters.direction) params.append('direction', filters.direction);
      if (filters.limit) params.append('limit', filters.limit.toString());
      if (filters.full) params.append('full', 'true');

      const response = await fetch(`${this.config.baseUrl}/models?${params}`);
      
      if (!response.ok) {
        throw new Error(`HuggingFace API error: ${response.status}`);
      }

      const models: HuggingFaceModel[] = await response.json();

      if (this.config.localCacheEnabled) {
        this.cache.set(cacheKey, {
          data: models,
          timestamp: Date.now()
        });
      }

      return models;
    } catch (error) {
      console.error('Failed to search models:', error);
      throw error;
    }
  }

  /**
   * Get model details by ID
   */
  async getModel(modelId: string): Promise<HuggingFaceModel> {
    const cacheKey = `model_${modelId}`;
    
    if (this.config.localCacheEnabled && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.config.cacheTTL!) {
        return cached.data;
      }
    }

    try {
      const response = await fetch(`${this.config.baseUrl}/models/${modelId}`);
      
      if (!response.ok) {
        throw new Error(`Model not found: ${modelId}`);
      }

      const model: HuggingFaceModel = await response.json();

      if (this.config.localCacheEnabled) {
        this.cache.set(cacheKey, {
          data: model,
          timestamp: Date.now()
        });
      }

      return model;
    } catch (error) {
      console.error(`Failed to get model ${modelId}:`, error);
      throw error;
    }
  }

  /**
   * Get model recommendations for legal use cases
   */
  async getRecommendations(category: LegalCategory, limit: number = 10): Promise<ModelRecommendation[]> {
    const searchTags = this.getCategoryTags(category);
    const models = await this.searchModels({
      tags: searchTags,
      sort: 'downloads',
      direction: 'desc',
      limit: limit * 2 // Get more to filter better
    });

    const recommendations: ModelRecommendation[] = [];

    for (const model of models.slice(0, limit)) {
      const score = this.calculateRelevanceScore(model, category);
      
      recommendations.push({
        model,
        score,
        reasons: this.getRecommendationReasons(model, category),
        category,
        compatibility: await this.checkCompatibility(model),
        estimatedPerformance: this.estimatePerformance(model)
      });
    }

    return recommendations.sort((a, b) => b.score - a.score);
  }

  /**
   * Download model
   */
  async downloadModel(
    modelId: string,
    onProgress?: (progress: ModelDownloadProgress) => void
  ): Promise<string> {
    try {
      // In a real implementation, this would download the actual model files
      // For now, we simulate the download process
      
      const progress: ModelDownloadProgress = {
        modelId,
        status: 'pending',
        progress: 0,
        downloadedBytes: 0,
        totalBytes: 1000000000, // 1GB estimate
        speed: 0,
        eta: 0
      };

      if (onProgress) onProgress(progress);

      // Simulate download phases
      progress.status = 'downloading';
      
      for (let i = 0; i <= 100; i += 10) {
        progress.progress = i;
        progress.downloadedBytes = (progress.totalBytes * i) / 100;
        progress.speed = 1000000; // 1MB/s
        progress.eta = (100 - i) * 10;
        
        if (onProgress) onProgress(progress);
        
        // Simulate delay
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      progress.status = 'completed';
      progress.progress = 100;
      
      if (onProgress) onProgress(progress);

      return `${this.config.downloadPath}/${modelId}`;
    } catch (error) {
      console.error(`Failed to download model ${modelId}:`, error);
      throw error;
    }
  }

  /**
   * Check if model exists locally
   */
  async isModelLocal(modelId: string): Promise<boolean> {
    // In a real implementation, this would check the local filesystem
    return false;
  }

  /**
   * Get local model metadata
   */
  async getLocalModelMetadata(modelId: string): Promise<ModelMetadata | null> {
    // Implementation would read local metadata
    return null;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<HuggingFaceConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  // Private helper methods

  private getCategoryTags(category: LegalCategory): string[] {
    const tagMap: Record<LegalCategory, string[]> = {
      'contract-analysis': ['legal', 'contract', 'text-classification', 'nlp'],
      'legal-research': ['legal', 'research', 'qa', 'information-retrieval'],
      'compliance-check': ['legal', 'compliance', 'classification', 'regulation'],
      'document-review': ['legal', 'document', 'summarization', 'classification'],
      'case-law-analysis': ['legal', 'case-law', 'analysis', 'classification'],
      'regulatory-compliance': ['legal', 'regulatory', 'compliance', 'classification'],
      'risk-assessment': ['legal', 'risk', 'assessment', 'classification'],
      'legal-drafting': ['legal', 'generation', 'text-generation', 'drafting']
    };

    return tagMap[category] || ['legal'];
  }

  private calculateRelevanceScore(model: HuggingFaceModel, category: LegalCategory): number {
    let score = 0;
    
    // Base score from downloads and likes
    score += Math.min(model.downloads / 10000, 5);
    score += Math.min(model.likes / 100, 3);
    
    // Tag relevance
    const relevantTags = this.getCategoryTags(category);
    const tagMatches = model.tags.filter(tag => 
      relevantTags.some(relevantTag => tag.includes(relevantTag))
    ).length;
    score += tagMatches * 2;
    
    // Pipeline tag relevance
    if (model.pipeline_tag) {
      const relevantPipelines = ['text-classification', 'question-answering', 'summarization', 'text-generation'];
      if (relevantPipelines.includes(model.pipeline_tag)) {
        score += 3;
      }
    }
    
    return Math.min(score, 10); // Cap at 10
  }

  private getRecommendationReasons(model: HuggingFaceModel, category: LegalCategory): string[] {
    const reasons = [];
    
    if (model.downloads > 10000) {
      reasons.push('Popular model with high download count');
    }
    
    if (model.likes > 100) {
      reasons.push('Well-liked by the community');
    }
    
    const relevantTags = this.getCategoryTags(category);
    const hasRelevantTags = model.tags.some(tag => 
      relevantTags.some(relevantTag => tag.includes(relevantTag))
    );
    
    if (hasRelevantTags) {
      reasons.push('Contains relevant tags for legal use cases');
    }
    
    if (model.pipeline_tag === 'text-classification') {
      reasons.push('Suitable for document classification tasks');
    }
    
    return reasons;
  }

  private async checkCompatibility(model: HuggingFaceModel): Promise<any> {
    // Simplified compatibility check
    return {
      compatible: true,
      issues: [],
      warnings: [],
      requirements: {
        memory: 4000000000, // 4GB
        diskSpace: 2000000000, // 2GB
      },
      recommendations: ['Ensure adequate memory is available']
    };
  }

  private estimatePerformance(model: HuggingFaceModel): any {
    // Simplified performance estimation
    const downloadScore = Math.min(model.downloads / 10000, 10);
    
    return {
      accuracy: Math.min(downloadScore * 0.1 + 0.7, 0.95),
      speed: Math.max(1, 10 - downloadScore * 0.1),
      resourceUsage: downloadScore * 0.1 + 0.3
    };
  }
}

export default HuggingFaceService;
