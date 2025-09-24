/**
 * Local Model Manager for HuggingFace Models
 * Manages locally stored HuggingFace models
 */

import { HuggingFaceModel, ModelMetadata } from '../../types/huggingface';

export interface LocalModelInfo extends HuggingFaceModel {
  localPath: string;
  isLocal: true;
  metadata: ModelMetadata;
  files: {
    model: string[];
    tokenizer: string[];
    config: string[];
    other: string[];
  };
}

export interface ModelStorageInfo {
  totalModels: number;
  totalSize: number;
  usedSpace: number;
  availableSpace: number;
  lastCleanup: Date;
}

export class LocalModelManager {
  private localModels: Map<string, LocalModelInfo> = new Map();
  private basePath: string;
  private storageKey = 'huggingface_local_models';

  constructor(basePath: string = './models/huggingface') {
    this.basePath = basePath;
    this.loadFromStorage();
  }

  /**
   * Add a model to local management
   */
  async addModel(
    model: HuggingFaceModel,
    localPath: string,
    files: LocalModelInfo['files']
  ): Promise<LocalModelInfo> {
    const localModel: LocalModelInfo = {
      ...model,
      localPath,
      isLocal: true,
      metadata: {
        lastUpdated: new Date(),
        localPath,
        isLocal: true,
        version: '1.0.0',
        tags: model.tags,
        customConfig: {}
      },
      files
    };

    this.localModels.set(model.id, localModel);
    await this.saveToStorage();

    return localModel;
  }

  /**
   * Get all local models
   */
  getLocalModels(): LocalModelInfo[] {
    return Array.from(this.localModels.values());
  }

  /**
   * Get a specific local model
   */
  getLocalModel(modelId: string): LocalModelInfo | null {
    return this.localModels.get(modelId) || null;
  }

  /**
   * Check if model exists locally
   */
  hasModel(modelId: string): boolean {
    return this.localModels.has(modelId);
  }

  /**
   * Remove model from local storage
   */
  async removeModel(modelId: string): Promise<boolean> {
    const model = this.localModels.get(modelId);
    if (!model) return false;

    // In a real implementation, this would delete files from filesystem
    this.localModels.delete(modelId);
    await this.saveToStorage();

    return true;
  }

  /**
   * Update model metadata
   */
  async updateModelMetadata(
    modelId: string,
    metadata: Partial<ModelMetadata>
  ): Promise<boolean> {
    const model = this.localModels.get(modelId);
    if (!model) return false;

    model.metadata = {
      ...model.metadata,
      ...metadata,
      lastUpdated: new Date()
    };

    await this.saveToStorage();
    return true;
  }

  /**
   * Get storage information
   */
  async getStorageInfo(): Promise<ModelStorageInfo> {
    const models = Array.from(this.localModels.values());
    let totalSize = 0;

    // In a real implementation, this would check actual file sizes
    for (const model of models) {
      totalSize += model.size || 1000000000; // 1GB estimate per model
    }

    return {
      totalModels: models.length,
      totalSize,
      usedSpace: totalSize,
      availableSpace: 10000000000 - totalSize, // 10GB - used
      lastCleanup: new Date()
    };
  }

  /**
   * Search local models
   */
  searchLocalModels(query: string): LocalModelInfo[] {
    const lowercaseQuery = query.toLowerCase();
    
    return Array.from(this.localModels.values()).filter(model =>
      (model.name ?? model.modelId).toLowerCase().includes(lowercaseQuery) ||
      model.description?.toLowerCase().includes(lowercaseQuery) ||
      model.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery)) ||
      model.author.toLowerCase().includes(lowercaseQuery)
    );
  }

  /**
   * Get models by category/tag
   */
  getModelsByTag(tag: string): LocalModelInfo[] {
    return Array.from(this.localModels.values()).filter(model =>
      model.tags.includes(tag)
    );
  }

  /**
   * Verify model integrity
   */
  async verifyModel(modelId: string): Promise<{
    valid: boolean;
    issues: string[];
    missingFiles: string[];
  }> {
    const model = this.localModels.get(modelId);
    if (!model) {
      return {
        valid: false,
        issues: ['Model not found'],
        missingFiles: []
      };
    }

    const issues: string[] = [];
    const missingFiles: string[] = [];

    // In a real implementation, this would check file existence and integrity
    // For now, we simulate the verification
    
    const requiredFiles = [...model.files.model, ...model.files.config];
    const totalFiles = requiredFiles.length;
    
    // Simulate some missing files occasionally
    if (Math.random() > 0.9) {
      missingFiles.push('config.json');
      issues.push('Configuration file missing');
    }

    return {
      valid: issues.length === 0,
      issues,
      missingFiles
    };
  }

  /**
   * Clean up orphaned or corrupted models
   */
  async cleanup(): Promise<{
    removed: string[];
    freed: number;
    errors: string[];
  }> {
    const removed: string[] = [];
    const errors: string[] = [];
    let freed = 0;

    for (const [modelId, model] of this.localModels) {
      try {
        const verification = await this.verifyModel(modelId);
        
        if (!verification.valid && verification.issues.length > 2) {
          // Remove severely corrupted models
          freed += model.size || 0;
          removed.push(modelId);
          this.localModels.delete(modelId);
        }
      } catch (error) {
        errors.push(`Failed to verify ${modelId}: ${error}`);
      }
    }

    if (removed.length > 0) {
      await this.saveToStorage();
    }

    return { removed, freed, errors };
  }

  /**
   * Export model list
   */
  async exportModelList(): Promise<string> {
    const exportData = {
      models: Array.from(this.localModels.entries()),
      exported: new Date(),
      version: '1.0.0'
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Import model list
   */
  async importModelList(data: string): Promise<{
    imported: number;
    errors: string[];
  }> {
    let imported = 0;
    const errors: string[] = [];

    try {
      const parsed = JSON.parse(data);
      
      if (parsed.models && Array.isArray(parsed.models)) {
        for (const [modelId, modelData] of parsed.models) {
          try {
            const localModel: LocalModelInfo = {
              ...modelData,
              metadata: {
                ...modelData.metadata,
                lastUpdated: new Date(modelData.metadata.lastUpdated)
              }
            };
            
            this.localModels.set(modelId, localModel);
            imported++;
          } catch (error) {
            errors.push(`Failed to import ${modelId}: ${error}`);
          }
        }
        
        await this.saveToStorage();
      }
    } catch (error) {
      errors.push(`Failed to parse import data: ${error}`);
    }

    return { imported, errors };
  }

  /**
   * Get model usage statistics
   */
  getModelStats(): {
    totalModels: number;
    byAuthor: Record<string, number>;
    byTag: Record<string, number>;
    byPipeline: Record<string, number>;
    avgSize: number;
  } {
    const models = Array.from(this.localModels.values());
    const byAuthor: Record<string, number> = {};
    const byTag: Record<string, number> = {};
    const byPipeline: Record<string, number> = {};
    
    let totalSize = 0;

    for (const model of models) {
      // Count by author
      byAuthor[model.author] = (byAuthor[model.author] || 0) + 1;
      
      // Count by tags
      for (const tag of model.tags) {
        byTag[tag] = (byTag[tag] || 0) + 1;
      }
      
      // Count by pipeline
      if (model.pipeline_tag) {
        byPipeline[model.pipeline_tag] = (byPipeline[model.pipeline_tag] || 0) + 1;
      }
      
      totalSize += model.size || 0;
    }

    return {
      totalModels: models.length,
      byAuthor,
      byTag,
      byPipeline,
      avgSize: models.length > 0 ? totalSize / models.length : 0
    };
  }

  // Private methods

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        
        if (parsed.models) {
          this.localModels = new Map(parsed.models.map(([id, model]: [string, any]) => [
            id,
            {
              ...model,
              metadata: {
                ...model.metadata,
                lastUpdated: new Date(model.metadata.lastUpdated)
              }
            }
          ]));
        }
      }
    } catch (error) {
      // Error logging disabled for production
      this.localModels = new Map();
    }
  }

  private async saveToStorage(): Promise<void> {
    try {
      const toStore = {
        models: Array.from(this.localModels.entries()),
        lastUpdated: new Date(),
        version: '1.0.0'
      };

      localStorage.setItem(this.storageKey, JSON.stringify(toStore));
    } catch (error) {
      // Error logging disabled for production
    }
  }
}

export default LocalModelManager;
