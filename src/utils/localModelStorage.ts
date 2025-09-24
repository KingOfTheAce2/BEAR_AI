/**
 * Local Model Storage - IndexedDB-based offline storage for model metadata
 * Provides privacy-focused local-first model management without external dependencies
 */

import { ModelConfig, ModelMetadata, ModelCapabilities, ModelType } from '../types/modelTypes';

export interface LocalModelData {
  id: string;
  config: ModelConfig;
  metadata: ModelMetadata;
  capabilities: ModelCapabilities;
  discoveredAt: Date;
  lastAccessed: Date;
  directory: string;
  fileSize: number;
  checksum: string;
  performance: ModelPerformanceData;
}

export interface ModelPerformanceData {
  averageLoadTime: number;
  averageInferenceTime: number;
  memoryUsage: number;
  inferenceCount: number;
  errorCount: number;
  lastUpdated: Date;
}

export interface DirectoryCache {
  directory: string;
  lastScanned: Date;
  modelCount: number;
  totalSize: number;
  models: string[]; // Model IDs
}

export class LocalModelStorage {
  private db: IDBDatabase | null = null;
  private dbName = 'BearAI_ModelStorage';
  private dbVersion = 1;
  private readonly stores = {
    models: 'models',
    directories: 'directories',
    performance: 'performance',
    metadata: 'metadata'
  };

  constructor() {
    this.initializeDatabase();
  }

  /**
   * Initialize IndexedDB database for offline storage
   */
  private async initializeDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        reject(new Error('IndexedDB not supported - falling back to localStorage'));
        return;
      }

      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        reject(new Error(`Failed to open IndexedDB: ${request.error}`));
      };

      request.onsuccess = () => {
        this.db = request.result;
        // Logging disabled for production
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Models store
        if (!db.objectStoreNames.contains(this.stores.models)) {
          const modelsStore = db.createObjectStore(this.stores.models, { keyPath: 'id' });
          modelsStore.createIndex('directory', 'directory', { unique: false });
          modelsStore.createIndex('type', 'config.type', { unique: false });
          modelsStore.createIndex('lastAccessed', 'lastAccessed', { unique: false });
        }

        // Directories store
        if (!db.objectStoreNames.contains(this.stores.directories)) {
          const dirStore = db.createObjectStore(this.stores.directories, { keyPath: 'directory' });
          dirStore.createIndex('lastScanned', 'lastScanned', { unique: false });
        }

        // Performance store
        if (!db.objectStoreNames.contains(this.stores.performance)) {
          const perfStore = db.createObjectStore(this.stores.performance, { keyPath: 'modelId' });
          perfStore.createIndex('lastUpdated', 'lastUpdated', { unique: false });
        }

        // Metadata store
        if (!db.objectStoreNames.contains(this.stores.metadata)) {
          const metaStore = db.createObjectStore(this.stores.metadata, { keyPath: 'modelId' });
          metaStore.createIndex('capabilities', 'capabilities', { unique: false });
        }
      };
    });
  }

  /**
   * Store discovered models from a directory scan
   */
  public async storeDiscoveredModels(directory: string, models: ModelConfig[]): Promise<void> {
    if (!this.db) {
      // Warning logging disabled for production
      return this.fallbackToLocalStorage('discovered_models', { directory, models });
    }

    const transaction = this.db.transaction([this.stores.models, this.stores.directories], 'readwrite');
    const modelsStore = transaction.objectStore(this.stores.models);
    const dirStore = transaction.objectStore(this.stores.directories);

    try {
      // Store each model
      for (const model of models) {
        const localModelData: LocalModelData = {
          id: model.id,
          config: model,
          metadata: await this.extractModelMetadata(model),
          capabilities: await this.detectModelCapabilities(model),
          discoveredAt: new Date(),
          lastAccessed: new Date(),
          directory,
          fileSize: await this.getFileSize(model.path),
          checksum: await this.calculateChecksum(model.path),
          performance: this.initializePerformanceData()
        };

        modelsStore.put(localModelData);
      }

      // Update directory cache
      const directoryCache: DirectoryCache = {
        directory,
        lastScanned: new Date(),
        modelCount: models.length,
        totalSize: await this.calculateDirectorySize(directory),
        models: models.map(m => m.id)
      };

      dirStore.put(directoryCache);

      await this.waitForTransaction(transaction);
      // Logging disabled for production
    } catch (error) {
      // Error logging disabled for production
      throw error;
    }
  }

  /**
   * Get cached models for a directory
   */
  public async getCachedModels(directory: string): Promise<ModelConfig[]> {
    if (!this.db) {
      return this.fallbackGetFromLocalStorage('discovered_models', directory) || [];
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.stores.models], 'readonly');
      const store = transaction.objectStore(this.stores.models);
      const index = store.index('directory');
      const request = index.getAll(directory);

      request.onsuccess = () => {
        const models = request.result.map((data: LocalModelData) => data.config);
        resolve(models);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * Store model performance data
   */
  public async storePerformanceData(modelId: string, performance: Partial<ModelPerformanceData>): Promise<void> {
    if (!this.db) {
      return this.fallbackToLocalStorage(`performance_${modelId}`, performance);
    }

    const transaction = this.db.transaction([this.stores.performance], 'readwrite');
    const store = transaction.objectStore(this.stores.performance);

    try {
      const existing = await this.getPerformanceData(modelId);
      const updated: ModelPerformanceData = {
        ...existing,
        ...performance,
        lastUpdated: new Date()
      };

      store.put({ modelId, ...updated });
      await this.waitForTransaction(transaction);
    } catch (error) {
      // Error logging disabled for production
    }
  }

  /**
   * Get model performance data
   */
  public async getPerformanceData(modelId: string): Promise<ModelPerformanceData> {
    if (!this.db) {
      return this.fallbackGetFromLocalStorage(`performance_${modelId}`) || this.initializePerformanceData();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.stores.performance], 'readonly');
      const store = transaction.objectStore(this.stores.performance);
      const request = store.get(modelId);

      request.onsuccess = () => {
        resolve(request.result || this.initializePerformanceData());
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * Get all stored models with optional filtering
   */
  public async getAllModels(filter?: {
    directory?: string;
    type?: string;
    capabilities?: string[];
  }): Promise<LocalModelData[]> {
    if (!this.db) {
      return [];
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.stores.models], 'readonly');
      const store = transaction.objectStore(this.stores.models);
      const request = store.getAll();

      request.onsuccess = () => {
        let models = request.result;

        // Apply filters
        if (filter) {
          if (filter.directory) {
            models = models.filter(m => m.directory === filter.directory);
          }
          if (filter.type) {
            models = models.filter(m => m.config.type === filter.type);
          }
          if (filter.capabilities) {
            models = models.filter(m => 
              filter.capabilities!.some(cap => 
                m.capabilities && m.capabilities.features?.includes(cap)
              )
            );
          }
        }

        resolve(models);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * Update model access time for usage tracking
   */
  public async updateLastAccessed(modelId: string): Promise<void> {
    if (!this.db) {
      return;
    }

    const transaction = this.db.transaction([this.stores.models], 'readwrite');
    const store = transaction.objectStore(this.stores.models);

    try {
      const request = store.get(modelId);
      request.onsuccess = () => {
        if (request.result) {
          request.result.lastAccessed = new Date();
          store.put(request.result);
        }
      };
    } catch (error) {
      // Error logging disabled for production
    }
  }

  /**
   * Clean up old or unused model data
   */
  public async cleanup(options: {
    olderThanDays?: number;
    unusedForDays?: number;
    maxStorageSize?: number;
  } = {}): Promise<void> {
    if (!this.db) {
      return;
    }

    const {
      olderThanDays = 30,
      unusedForDays = 7
    } = options;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const unusedCutoff = new Date();
    unusedCutoff.setDate(unusedCutoff.getDate() - unusedForDays);

    const transaction = this.db.transaction([this.stores.models], 'readwrite');
    const store = transaction.objectStore(this.stores.models);

    try {
      const allModels = await this.getAllModels();
      const toDelete: string[] = [];

      for (const model of allModels) {
        if (model.discoveredAt < cutoffDate || model.lastAccessed < unusedCutoff) {
          toDelete.push(model.id);
        }
      }

      for (const modelId of toDelete) {
        store.delete(modelId);
      }

      await this.waitForTransaction(transaction);
      // Logging disabled for production
    } catch (error) {
      // Error logging disabled for production
    }
  }

  /**
   * Get storage usage statistics
   */
  public async getStorageStats(): Promise<{
    modelCount: number;
    totalSize: number;
    directories: number;
    lastCleanup: Date | null;
  }> {
    if (!this.db) {
      return {
        modelCount: 0,
        totalSize: 0,
        directories: 0,
        lastCleanup: null
      };
    }

    const models = await this.getAllModels();
    const directories = new Set(models.map(m => m.directory));

    return {
      modelCount: models.length,
      totalSize: models.reduce((sum, m) => sum + m.fileSize, 0),
      directories: directories.size,
      lastCleanup: null // Would track in a separate store
    };
  }

  /**
   * Export all model data for backup
   */
  public async exportData(): Promise<string> {
    const models = await this.getAllModels();
    const stats = await this.getStorageStats();
    
    const exportData = {
      version: this.dbVersion,
      exportedAt: new Date(),
      stats,
      models: models.map(m => ({
        ...m,
        // Remove binary data for export
        checksum: m.checksum
      }))
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Import model data from backup
   */
  public async importData(jsonData: string): Promise<void> {
    try {
      const data = JSON.parse(jsonData);
      
      if (!this.db) {
        throw new Error('Database not initialized');
      }

      const transaction = this.db.transaction([this.stores.models], 'readwrite');
      const store = transaction.objectStore(this.stores.models);

      for (const model of data.models) {
        store.put(model);
      }

      await this.waitForTransaction(transaction);
      // Logging disabled for production
    } catch (error) {
      // Error logging disabled for production
      throw error;
    }
  }

  // Private helper methods
  private async extractModelMetadata(model: ModelConfig): Promise<ModelMetadata> {
    // Extract metadata from model file/config
    return {
      name: model.name,
      version: model.version || '1.0.0',
      description: model.description || '',
      author: model.author || 'Unknown',
      license: model.license || 'Unknown',
      tags: model.tags || [],
      languages: model.languages || ['en'],
      architecture: model.architecture || 'transformer',
      parameters: model.parameters || 0
    };
  }

  private async detectModelCapabilities(model: ModelConfig): Promise<ModelCapabilities> {
    // Detect model capabilities based on file analysis
    return {
      textGeneration: true,
      chatCompletion: model.type !== ModelType.CODEGEN,
      streaming: true,
      contextLength: model.contextLength || 2048,
      features: ['text-generation'],
      languages: model.languages || ['en'],
      modelSize: await this.getFileSize(model.path)
    };
  }

  private async getFileSize(_filePath: string): Promise<number> {
    try {
      // In a real implementation, this would use filesystem APIs
      // For web, this would need to be provided by the discovery process
      return 0; // Placeholder
    } catch {
      return 0;
    }
  }

  private async calculateChecksum(_filePath: string): Promise<string> {
    try {
      // In a real implementation, this would calculate file checksum
      // For web, this would be computed during discovery
      return 'sha256-placeholder';
    } catch {
      return '';
    }
  }

  private async calculateDirectorySize(_directory: string): Promise<number> {
    try {
      // Calculate total size of all models in directory
      return 0; // Placeholder
    } catch {
      return 0;
    }
  }

  private initializePerformanceData(): ModelPerformanceData {
    return {
      averageLoadTime: 0,
      averageInferenceTime: 0,
      memoryUsage: 0,
      inferenceCount: 0,
      errorCount: 0,
      lastUpdated: new Date()
    };
  }

  private waitForTransaction(transaction: IDBTransaction): Promise<void> {
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  // Fallback methods for when IndexedDB is not available
  private fallbackToLocalStorage(key: string, data: any): void {
    try {
      localStorage.setItem(`BearAI_${key}`, JSON.stringify(data));
    } catch (error) {
      // Error logging disabled for production
    }
  }

  private fallbackGetFromLocalStorage(key: string, filter?: string): any {
    try {
      const data = localStorage.getItem(`BearAI_${key}`);
      if (!data) return null;
      
      const parsed = JSON.parse(data);
      if (filter && parsed.directory !== filter) {
        return null;
      }
      
      return parsed.models || parsed;
    } catch (error) {
      // Error logging disabled for production
      return null;
    }
  }

  /**
   * Dispose of resources
   */
  public dispose(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

export default LocalModelStorage;