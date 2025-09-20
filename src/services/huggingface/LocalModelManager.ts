/**
 * Local Model Download and Management System
 * Handles downloading, caching, and managing HuggingFace models locally
 */

import { HuggingFaceModel, ModelDownloadProgress, LocalModelStatus, ModelFile, HuggingFaceError } from '../../types/huggingface';

export interface DownloadOptions {
  priority?: 'low' | 'normal' | 'high';
  maxConcurrent?: number;
  resumeIncomplete?: boolean;
  verifyChecksum?: boolean;
  compressionLevel?: 'none' | 'low' | 'medium' | 'high';
  autoOptimize?: boolean;
  includeOptional?: boolean;
}

export interface StorageQuota {
  total: number; // bytes
  used: number; // bytes
  available: number; // bytes
  reserved: number; // bytes reserved for system
}

export interface ModelCache {
  modelId: string;
  localPath: string;
  size: number;
  downloadedAt: Date;
  lastAccessed: Date;
  accessCount: number;
  integrity: 'verified' | 'unverified' | 'corrupted';
  version: string;
  files: Array<{
    filename: string;
    size: number;
    checksum?: string;
    compressed?: boolean;
  }>;
}

export interface DownloadJob {
  id: string;
  modelId: string;
  status: 'queued' | 'downloading' | 'paused' | 'completed' | 'failed' | 'cancelled';
  progress: ModelDownloadProgress;
  options: DownloadOptions;
  startTime?: Date;
  endTime?: Date;
  error?: string;
  retryCount: number;
  maxRetries: number;
}

export class LocalModelManager extends EventTarget {
  private downloadJobs: Map<string, DownloadJob> = new Map();
  private modelCache: Map<string, ModelCache> = new Map();
  private downloadQueue: DownloadJob[] = [];
  private activeDownloads = 0;
  private maxConcurrentDownloads = 3;
  private basePath: string;
  private compressionEnabled = true;
  private autoCleanup = true;

  constructor(basePath: string = './models') {
    super();
    this.basePath = basePath;
    this.initializeStorage();
    this.loadCacheIndex();
    this.startDownloadProcessor();
  }

  /**
   * Queue a model for download
   */
  async downloadModel(
    model: HuggingFaceModel, 
    options: DownloadOptions = {}
  ): Promise<string> {
    const jobId = this.generateJobId(model.id);
    
    // Check if already downloaded
    const existingCache = this.modelCache.get(model.id);
    if (existingCache && existingCache.integrity === 'verified') {
      if (!options.resumeIncomplete) {
        throw new Error(`Model ${model.id} is already downloaded and verified`);
      }
    }

    // Create download job
    const job: DownloadJob = {
      id: jobId,
      modelId: model.id,
      status: 'queued',
      progress: {
        modelId: model.id,
        progress: 0,
        downloaded: 0,
        total: model.resourceRequirements.modelSizeMB * 1024 * 1024,
        speed: 0,
        eta: 0,
        files: []
      },
      options: {
        priority: 'normal',
        maxConcurrent: 1,
        resumeIncomplete: true,
        verifyChecksum: true,
        compressionLevel: 'medium',
        autoOptimize: true,
        includeOptional: false,
        ...options
      },
      retryCount: 0,
      maxRetries: 3
    };

    this.downloadJobs.set(jobId, job);
    this.queueDownload(job);

    this.emit('download_queued', { jobId, modelId: model.id });
    return jobId;
  }

  /**
   * Get download progress for a job
   */
  getDownloadProgress(jobId: string): ModelDownloadProgress | null {
    const job = this.downloadJobs.get(jobId);
    return job?.progress || null;
  }

  /**
   * Cancel a download job
   */
  async cancelDownload(jobId: string): Promise<void> {
    const job = this.downloadJobs.get(jobId);
    if (!job) {
      throw new Error(`Download job ${jobId} not found`);
    }

    if (job.status === 'downloading') {
      // Abort active download
      job.status = 'cancelled';
      this.activeDownloads--;
    } else if (job.status === 'queued') {
      // Remove from queue
      const queueIndex = this.downloadQueue.findIndex(j => j.id === jobId);
      if (queueIndex >= 0) {
        this.downloadQueue.splice(queueIndex, 1);
      }
      job.status = 'cancelled';
    }

    this.emit('download_cancelled', { jobId, modelId: job.modelId });
  }

  /**
   * Pause a download job
   */
  async pauseDownload(jobId: string): Promise<void> {
    const job = this.downloadJobs.get(jobId);
    if (!job) {
      throw new Error(`Download job ${jobId} not found`);
    }

    if (job.status === 'downloading') {
      job.status = 'paused';
      this.activeDownloads--;
      this.emit('download_paused', { jobId, modelId: job.modelId });
    }
  }

  /**
   * Resume a paused download
   */
  async resumeDownload(jobId: string): Promise<void> {
    const job = this.downloadJobs.get(jobId);
    if (!job) {
      throw new Error(`Download job ${jobId} not found`);
    }

    if (job.status === 'paused') {
      job.status = 'queued';
      this.queueDownload(job);
      this.emit('download_resumed', { jobId, modelId: job.modelId });
    }
  }

  /**
   * Get all downloaded models
   */
  getDownloadedModels(): ModelCache[] {
    return Array.from(this.modelCache.values())
      .filter(cache => cache.integrity === 'verified')
      .sort((a, b) => b.lastAccessed.getTime() - a.lastAccessed.getTime());
  }

  /**
   * Get storage quota information
   */
  async getStorageQuota(): Promise<StorageQuota> {
    const used = Array.from(this.modelCache.values())
      .reduce((total, cache) => total + cache.size, 0);
    
    // Simulate getting system storage info
    const total = 100 * 1024 * 1024 * 1024; // 100GB
    const reserved = 10 * 1024 * 1024 * 1024; // 10GB reserved
    
    return {
      total,
      used,
      available: total - used - reserved,
      reserved
    };
  }

  /**
   * Delete a downloaded model
   */
  async deleteModel(modelId: string, force: boolean = false): Promise<void> {
    const cache = this.modelCache.get(modelId);
    if (!cache) {
      throw new Error(`Model ${modelId} not found in cache`);
    }

    // Check if model is currently in use
    if (!force && this.isModelInUse(modelId)) {
      throw new Error(`Model ${modelId} is currently in use. Use force=true to delete anyway.`);
    }

    try {
      // Delete model files
      await this.deleteModelFiles(cache.localPath);
      
      // Remove from cache
      this.modelCache.delete(modelId);
      
      // Update cache index
      await this.saveCacheIndex();
      
      this.emit('model_deleted', { modelId, freedSpace: cache.size });
    } catch (error) {
      throw new Error(`Failed to delete model ${modelId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Optimize storage by removing unused models
   */
  async optimizeStorage(targetFreeSpace?: number): Promise<{
    deletedModels: string[];
    freedSpace: number;
    recommendations: string[];
  }> {
    const quota = await this.getStorageQuota();
    const models = this.getDownloadedModels();
    
    const deletedModels: string[] = [];
    let freedSpace = 0;
    const recommendations: string[] = [];

    // Sort models by usage (least used first)
    const sortedModels = models.sort((a, b) => {
      const scoreA = this.calculateUsageScore(a);
      const scoreB = this.calculateUsageScore(b);
      return scoreA - scoreB;
    });

    const requiredSpace = targetFreeSpace || (quota.total * 0.1); // 10% of total space
    
    for (const model of sortedModels) {
      if (quota.available >= requiredSpace) break;
      
      // Skip if model is in use
      if (this.isModelInUse(model.modelId)) {
        recommendations.push(`Model ${model.modelId} could be deleted but is currently in use`);
        continue;
      }

      try {
        await this.deleteModel(model.modelId, true);
        deletedModels.push(model.modelId);
        freedSpace += model.size;
        quota.available += model.size;
      } catch (error) {
        recommendations.push(`Failed to delete ${model.modelId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Add general recommendations
    if (quota.available < requiredSpace) {
      recommendations.push('Consider increasing storage capacity or manually deleting unused models');
    }

    if (models.some(m => m.integrity === 'unverified')) {
      recommendations.push('Some models have unverified integrity - consider re-downloading');
    }

    return { deletedModels, freedSpace, recommendations };
  }

  /**
   * Verify model integrity
   */
  async verifyModel(modelId: string): Promise<{
    valid: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    const cache = this.modelCache.get(modelId);
    if (!cache) {
      return {
        valid: false,
        issues: [`Model ${modelId} not found in cache`],
        recommendations: ['Download the model again']
      };
    }

    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check if files exist
    const fileExists = await this.checkFilesExist(cache.localPath, cache.files);
    if (!fileExists.allExist) {
      issues.push(`Missing files: ${fileExists.missingFiles.join(', ')}`);
      recommendations.push('Re-download the model to restore missing files');
    }

    // Verify checksums if available
    for (const file of cache.files) {
      if (file.checksum) {
        const actualChecksum = await this.calculateFileChecksum(
          `${cache.localPath}/${file.filename}`
        );
        if (actualChecksum !== file.checksum) {
          issues.push(`Checksum mismatch for ${file.filename}`);
          recommendations.push(`Re-download ${file.filename} or the entire model`);
        }
      }
    }

    // Update cache integrity
    const valid = issues.length === 0;
    cache.integrity = valid ? 'verified' : 'corrupted';
    
    if (!valid) {
      recommendations.push('Consider deleting and re-downloading the model');
    }

    await this.saveCacheIndex();

    return { valid, issues, recommendations };
  }

  /**
   * Get model local path
   */
  getModelPath(modelId: string): string | null {
    const cache = this.modelCache.get(modelId);
    return cache?.localPath || null;
  }

  /**
   * Check if model is downloaded and ready
   */
  isModelReady(modelId: string): boolean {
    const cache = this.modelCache.get(modelId);
    return cache !== undefined && cache.integrity === 'verified';
  }

  /**
   * Get download statistics
   */
  getDownloadStats(): {
    totalDownloads: number;
    completedDownloads: number;
    failedDownloads: number;
    activeDownloads: number;
    queuedDownloads: number;
    totalSize: number;
  } {
    const jobs = Array.from(this.downloadJobs.values());
    const totalSize = Array.from(this.modelCache.values())
      .reduce((sum, cache) => sum + cache.size, 0);

    return {
      totalDownloads: jobs.length,
      completedDownloads: jobs.filter(j => j.status === 'completed').length,
      failedDownloads: jobs.filter(j => j.status === 'failed').length,
      activeDownloads: this.activeDownloads,
      queuedDownloads: this.downloadQueue.length,
      totalSize
    };
  }

  /**
   * Private methods
   */
  private async initializeStorage(): Promise<void> {
    // Initialize storage directory structure
    try {
      // Create base directory if it doesn't exist
      console.log(`Initializing storage at: ${this.basePath}`);
    } catch (error) {
      throw new Error(`Failed to initialize storage: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async loadCacheIndex(): Promise<void> {
    try {
      // Load cache index from persistent storage
      // This would read from a JSON file or database
      console.log('Loading cache index...');
    } catch (error) {
      console.warn('Failed to load cache index, starting fresh');
    }
  }

  private async saveCacheIndex(): Promise<void> {
    try {
      // Save cache index to persistent storage
      const cacheData = Array.from(this.modelCache.entries());
      console.log(`Saving cache index with ${cacheData.length} entries`);
    } catch (error) {
      console.error('Failed to save cache index:', error);
    }
  }

  private queueDownload(job: DownloadJob): void {
    // Insert job in queue based on priority
    const priority = job.options.priority || 'normal';
    const priorityValue = { high: 3, normal: 2, low: 1 }[priority];
    
    let insertIndex = this.downloadQueue.length;
    for (let i = 0; i < this.downloadQueue.length; i++) {
      const queuedPriority = this.downloadQueue[i].options.priority || 'normal';
      const queuedPriorityValue = { high: 3, normal: 2, low: 1 }[queuedPriority];
      
      if (priorityValue > queuedPriorityValue) {
        insertIndex = i;
        break;
      }
    }
    
    this.downloadQueue.splice(insertIndex, 0, job);
  }

  private startDownloadProcessor(): void {
    // Process download queue
    setInterval(() => {
      this.processDownloadQueue();
    }, 1000);
  }

  private async processDownloadQueue(): Promise<void> {
    if (this.activeDownloads >= this.maxConcurrentDownloads || this.downloadQueue.length === 0) {
      return;
    }

    const job = this.downloadQueue.shift();
    if (!job) return;

    this.activeDownloads++;
    job.status = 'downloading';
    job.startTime = new Date();

    try {
      await this.executeDownload(job);
      job.status = 'completed';
      job.endTime = new Date();
      
      this.emit('download_completed', { jobId: job.id, modelId: job.modelId });
    } catch (error) {
      job.error = error instanceof Error ? error.message : 'Unknown error';
      job.retryCount++;
      
      if (job.retryCount < job.maxRetries) {
        job.status = 'queued';
        this.queueDownload(job);
        this.emit('download_retry', { jobId: job.id, modelId: job.modelId, retryCount: job.retryCount });
      } else {
        job.status = 'failed';
        this.emit('download_failed', { jobId: job.id, modelId: job.modelId, error: job.error });
      }
    } finally {
      this.activeDownloads--;
    }
  }

  private async executeDownload(job: DownloadJob): Promise<void> {
    // Simulate download process
    const modelId = job.modelId;
    const localPath = `${this.basePath}/${modelId.replace('/', '_')}`;
    
    // Create model cache entry
    const cache: ModelCache = {
      modelId,
      localPath,
      size: job.progress.total,
      downloadedAt: new Date(),
      lastAccessed: new Date(),
      accessCount: 0,
      integrity: 'unverified',
      version: '1.0',
      files: []
    };

    // Simulate file download with progress updates
    const totalFiles = 5; // Simulate 5 files
    for (let i = 0; i < totalFiles; i++) {
      const filename = `file_${i}.bin`;
      const fileSize = job.progress.total / totalFiles;
      
      // Simulate file download progress
      for (let progress = 0; progress <= 100; progress += 10) {
        const files = job.progress.files ?? [];
        files[i] = {
          filename,
          progress,
          size: fileSize,
          downloaded: (fileSize * progress) / 100
        };
        job.progress.files = files;

        // Update overall progress
        const totalDownloaded = files.reduce(
          (sum, file) => sum + file.downloaded, 0
        );
        job.progress.downloaded = totalDownloaded;
        job.progress.progress = (totalDownloaded / job.progress.total) * 100;
        job.progress.speed = Math.random() * 1024 * 1024; // Random speed
        job.progress.eta = job.progress.speed > 0 ? 
          (job.progress.total - totalDownloaded) / job.progress.speed : 0;

        this.emit('download_progress', { jobId: job.id, progress: job.progress });
        
        // Simulate delay
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      cache.files.push({
        filename,
        size: fileSize,
        checksum: `checksum_${i}`,
        compressed: job.options.compressionLevel !== 'none'
      });
    }

    // Verify integrity if requested
    if (job.options.verifyChecksum) {
      cache.integrity = 'verified';
    }

    this.modelCache.set(modelId, cache);
    await this.saveCacheIndex();
  }

  private calculateUsageScore(cache: ModelCache): number {
    const daysSinceAccess = (Date.now() - cache.lastAccessed.getTime()) / (1000 * 60 * 60 * 24);
    const sizeScore = cache.size / (1024 * 1024 * 1024); // GB
    const accessScore = cache.accessCount / 100;
    
    // Lower score = higher priority for deletion
    return daysSinceAccess + sizeScore - accessScore;
  }

  private isModelInUse(modelId: string): boolean {
    // Check if model is currently loaded or being used
    // This would integrate with the model manager
    return false; // Placeholder
  }

  private async deleteModelFiles(localPath: string): Promise<void> {
    // Delete model files from storage
    console.log(`Deleting model files at: ${localPath}`);
  }

  private async checkFilesExist(localPath: string, files: any[]): Promise<{
    allExist: boolean;
    missingFiles: string[];
  }> {
    const missingFiles: string[] = [];
    
    for (const file of files) {
      // Check if file exists (simulated)
      const exists = Math.random() > 0.1; // 90% chance file exists
      if (!exists) {
        missingFiles.push(file.filename);
      }
    }

    return {
      allExist: missingFiles.length === 0,
      missingFiles
    };
  }

  private async calculateFileChecksum(filePath: string): Promise<string> {
    // Calculate file checksum (simulated)
    return `checksum_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateJobId(modelId: string): string {
    return `${modelId.replace('/', '_')}_${Date.now()}`;
  }

  private emit(eventType: string, data: any): void {
    const event = new CustomEvent(eventType, { detail: data });
    this.dispatchEvent(event);
  }
}

export default LocalModelManager;
