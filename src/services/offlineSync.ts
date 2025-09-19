/**
 * Offline Synchronization Service
 * Handles offline file operations and synchronization
 */

import { StoredDocument, localStorageService, StorageStats } from './localStorage';
import { fileMetadataService, ExtendedFileMetadata } from './fileMetadata';

export interface SyncOperation {
  id: string;
  type: 'create' | 'update' | 'delete' | 'move' | 'copy';
  fileId: string;
  timestamp: Date;
  data?: any;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  error?: string;
  retryCount: number;
  maxRetries: number;
}

export interface SyncStatus {
  isOnline: boolean;
  lastSync: Date | null;
  pendingOperations: number;
  failedOperations: number;
  syncInProgress: boolean;
}

export interface ConflictResolution {
  fileId: string;
  localVersion: StoredDocument;
  remoteVersion?: StoredDocument;
  resolution: 'keep_local' | 'keep_remote' | 'merge' | 'manual';
  timestamp: Date;
}

export class OfflineSyncService {
  private syncQueue: SyncOperation[] = [];
  private isOnline: boolean = navigator.onLine;
  private syncInProgress: boolean = false;
  private lastSync: Date | null = null;
  private listeners: Array<(status: SyncStatus) => void> = [];
  private readonly storageKey = 'bearai_sync_queue';
  private readonly lastSyncKey = 'bearai_sync_last_sync';
  private syncIntervalId: number | null = null;

  constructor() {
    this.setupOnlineStatusListeners();
    this.loadQueueFromStorage();
    this.startPeriodicSync();
  }

  /**
   * Subscribe to synchronization status changes
   */
  onStatusChange(listener: (status: SyncStatus) => void): () => void {
    this.listeners.push(listener);

    try {
      listener(this.getSyncStatus());
    } catch (error) {
      console.error('Sync status listener error:', error);
    }

    return () => {
      this.listeners = this.listeners.filter(existing => existing !== listener);
    };
  }

  /**
   * Get current synchronization status
   */
  getSyncStatus(): SyncStatus {
    const pendingOperations = this.syncQueue.filter(op => op.status === 'pending').length;
    const failedOperations = this.syncQueue.filter(op => op.status === 'failed').length;

    return {
      isOnline: this.isOnline,
      lastSync: this.lastSync,
      pendingOperations,
      failedOperations,
      syncInProgress: this.syncInProgress
    };
  }

  /**
   * Trigger synchronization immediately
   */
  async forceSync(): Promise<void> {
    if (!this.isOnline) {
      throw new Error('Cannot synchronize while offline');
    }

    await this.processSyncQueue();
  }

  /**
   * Clear failed synchronization operations
   */
  async clearFailedOperations(): Promise<void> {
    const hadFailures = this.syncQueue.some(op => op.status === 'failed');
    if (!hadFailures) {
      return;
    }

    this.syncQueue = this.syncQueue.filter(op => op.status !== 'failed');
    await this.saveQueueToStorage();
    this.notifyStatusChange();
  }

  /**
   * Export synchronization data and related storage information
   */
  async exportData(): Promise<{
    exportedAt: string;
    lastSync: string | null;
    syncQueue: Array<Omit<SyncOperation, 'timestamp'> & { timestamp: string }>;
    storage: StorageStats;
    documents: StoredDocument[];
    metadata: ExtendedFileMetadata[];
  }> {
    const [documents, metadata, storage] = await Promise.all([
      localStorageService.getAllDocuments(),
      fileMetadataService.exportMetadata(),
      localStorageService.getStorageStats()
    ]);

    const serializedQueue = this.syncQueue.map(operation => ({
      ...operation,
      timestamp:
        operation.timestamp instanceof Date
          ? operation.timestamp.toISOString()
          : new Date(operation.timestamp).toISOString()
    }));

    return {
      exportedAt: new Date().toISOString(),
      lastSync: this.lastSync ? this.lastSync.toISOString() : null,
      syncQueue: serializedQueue,
      storage,
      documents,
      metadata
    };
  }

  /**
   * Setup online/offline event listeners
   */
  private setupOnlineStatusListeners(): void {
    window.addEventListener('online', this.handleOnlineStatusChange);
    window.addEventListener('offline', this.handleOfflineStatusChange);
  }

  /**
   * Queue an operation for synchronization
   */
  async queueOperation(operation: Omit<SyncOperation, 'id' | 'timestamp' | 'status' | 'retryCount'>): Promise<void> {
    const syncOp: SyncOperation = {
      ...operation,
      id: this.generateOperationId(),
      timestamp: new Date(),
      status: 'pending',
      retryCount: 0,
      maxRetries: operation.maxRetries || 3
    };

    this.syncQueue.push(syncOp);
    await this.saveQueueToStorage();
    this.notifyStatusChange();

    // If online, try to process immediately
    if (this.isOnline && !this.syncInProgress) {
      this.processSyncQueue();
    }
  }

  /**
   * Process the synchronization queue
   */
  private async processSyncQueue(): Promise<void> {
    if (this.syncInProgress || !this.isOnline) return;

    this.syncInProgress = true;
    this.notifyStatusChange();

    const pendingOps = this.syncQueue.filter(op => op.status === 'pending');
    
    for (const operation of pendingOps) {
      try {
        operation.status = 'in_progress';
        await this.executeOperation(operation);
        operation.status = 'completed';
      } catch (error) {
        operation.status = 'failed';
        operation.error = error instanceof Error ? error.message : 'Unknown error';
        operation.retryCount++;

        // Schedule retry if under max retries
        if (operation.retryCount < operation.maxRetries) {
          setTimeout(() => {
            operation.status = 'pending';
            this.processSyncQueue();
          }, this.getRetryDelay(operation.retryCount));
        }
      }
    }

    // Clean up completed operations
    this.syncQueue = this.syncQueue.filter(op => op.status !== 'completed');
    await this.saveQueueToStorage();

    this.syncInProgress = false;
    this.lastSync = new Date();
    this.notifyStatusChange();
  }

  /**
   * Execute a sync operation
   */
  private async executeOperation(operation: SyncOperation): Promise<void> {
    switch (operation.type) {
      case 'create':
        await this.syncCreateOperation(operation);
        break;
      case 'update':
        await this.syncUpdateOperation(operation);
        break;
      case 'delete':
        await this.syncDeleteOperation(operation);
        break;
      case 'move':
        await this.syncMoveOperation(operation);
        break;
      case 'copy':
        await this.syncCopyOperation(operation);
        break;
      default:
        throw new Error(`Unknown operation type: ${operation.type}`);
    }
  }

  /**
   * Sync create operation
   */
  private async syncCreateOperation(operation: SyncOperation): Promise<void> {
    const document = await localStorageService.getDocument(operation.fileId);
    if (!document) {
      throw new Error(`Document not found: ${operation.fileId}`);
    }

    // In a real implementation, this would sync with a remote server
    // For now, we'll just mark it as synced locally
    const updatedMetadata = {
      ...document.metadata,
      synced: true,
      lastSynced: new Date(),
      version: (document.metadata.version || 0) + 1
    };

    const updatedDocument = {
      ...document,
      metadata: updatedMetadata
    };

    await localStorageService.updateDocument(updatedDocument);
  }

  /**
   * Sync update operation
   */
  private async syncUpdateOperation(operation: SyncOperation): Promise<void> {
    const document = await localStorageService.getDocument(operation.fileId);
    if (!document) {
      throw new Error(`Document not found: ${operation.fileId}`);
    }

    // Check for conflicts
    const conflict = await this.detectConflict(document);
    if (conflict) {
      await this.handleConflict(conflict);
      return;
    }

    // Proceed with update
    const updatedMetadata = {
      ...document.metadata,
      synced: true,
      lastSynced: new Date(),
      version: (document.metadata.version || 0) + 1
    };

    const updatedDocument = {
      ...document,
      metadata: updatedMetadata
    };

    await localStorageService.updateDocument(updatedDocument);
  }

  /**
   * Sync delete operation
   */
  private async syncDeleteOperation(operation: SyncOperation): Promise<void> {
    // In a real implementation, this would delete from remote server
    // For now, we'll just clean up local references
    const metadata = fileMetadataService.getMetadata(operation.fileId);
    if (metadata) {
      // Mark as deleted in metadata with proper typing
      await fileMetadataService.updateMetadata(operation.fileId, {
        deleted: true,
        deletedAt: new Date()
      });
    }
  }

  /**
   * Sync move operation
   */
  private async syncMoveOperation(operation: SyncOperation): Promise<void> {
    const { newPath, oldPath } = operation.data;
    
    const document = await localStorageService.getDocument(operation.fileId);
    if (!document) {
      throw new Error(`Document not found: ${operation.fileId}`);
    }

    // Update file path
    document.fileInfo.path = newPath;
    await localStorageService.updateDocument(document);

    // Update metadata with proper typing
    const metadata = fileMetadataService.getMetadata(operation.fileId);
    if (metadata) {
      await fileMetadataService.updateMetadata(operation.fileId, {
        path: newPath,
        movedFrom: oldPath, // Now properly defined in ExtendedFileMetadata
        lastModified: new Date()
      });
    }
  }

  /**
   * Sync copy operation
   */
  private async syncCopyOperation(operation: SyncOperation): Promise<void> {
    const { newId, originalId } = operation.data;
    
    const originalDoc = await localStorageService.getDocument(originalId);
    if (!originalDoc) {
      throw new Error(`Original document not found: ${originalId}`);
    }

    // Create copy with new ID
    const copiedDoc = {
      ...originalDoc,
      id: newId,
      title: `${originalDoc.title} (Copy)`,
      metadata: {
        ...originalDoc.metadata,
        copiedFrom: originalId,
        createdDate: new Date()
      }
    };

    await localStorageService.storeDocument(copiedDoc, copiedDoc.fileInfo, copiedDoc.tags);
  }

  /**
   * Detect conflicts between local and remote versions
   */
  private async detectConflict(document: StoredDocument): Promise<ConflictResolution | null> {
    // In a real implementation, this would check with remote server
    // For now, we'll simulate conflict detection
    const metadata = document.metadata;
    
    if (metadata.remoteModified && metadata.localModified) {
      const remoteTime = new Date(metadata.remoteModified);
      const localTime = new Date(metadata.localModified);
      
      if (Math.abs(remoteTime.getTime() - localTime.getTime()) > 1000) {
        return {
          fileId: document.id,
          localVersion: document,
          remoteVersion: undefined, // Would fetch from remote
          resolution: 'manual',
          timestamp: new Date()
        };
      }
    }

    return null;
  }

  /**
   * Handle synchronization conflicts
   */
  private async handleConflict(conflict: ConflictResolution): Promise<void> {
    switch (conflict.resolution) {
      case 'keep_local':
        // Keep local version, mark as resolved
        break;
      case 'keep_remote':
        // Replace with remote version
        if (conflict.remoteVersion) {
          await localStorageService.updateDocument(conflict.remoteVersion);
        }
        break;
      case 'merge':
        // Attempt automatic merge
        await this.attemptAutoMerge(conflict);
        break;
      case 'manual':
        // Store conflict for manual resolution
        await this.storeConflictForManualResolution(conflict);
        break;
    }
  }

  /**
   * Attempt automatic merge of conflicting versions
   */
  private async attemptAutoMerge(conflict: ConflictResolution): Promise<void> {
    // Simple merge strategy - combine non-conflicting changes
    const merged = {
      ...conflict.localVersion,
      metadata: {
        ...conflict.localVersion.metadata,
        ...conflict.remoteVersion?.metadata,
        merged: true,
        mergedAt: new Date()
      }
    };

    await localStorageService.updateDocument(merged);
  }

  /**
   * Store conflict for manual resolution
   */
  private async storeConflictForManualResolution(conflict: ConflictResolution): Promise<void> {
    const conflictData = {
      id: `conflict-${conflict.fileId}`,
      ...conflict,
      needsResolution: true
    };

    // Store in IndexedDB for manual resolution UI
    // Implementation would depend on your conflict resolution UI
    console.warn('Conflict requires manual resolution:', conflictData);
  }

  /**
   * Load synchronization queue and metadata state from storage
   */
  private loadQueueFromStorage(): void {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }

    try {
      const storedQueue = window.localStorage.getItem(this.storageKey);
      if (storedQueue) {
        const parsed: Array<Omit<SyncOperation, 'timestamp'> & { timestamp: string }> = JSON.parse(storedQueue);
        this.syncQueue = parsed.map(operation => ({
          ...operation,
          timestamp: new Date(operation.timestamp)
        }));
      }

      const storedLastSync = window.localStorage.getItem(this.lastSyncKey);
      if (storedLastSync) {
        this.lastSync = new Date(storedLastSync);
      }
    } catch (error) {
      console.error('Failed to load sync queue from storage:', error);
      this.syncQueue = [];
    }
  }

  /**
   * Persist synchronization queue to storage
   */
  private async saveQueueToStorage(): Promise<void> {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }

    try {
      const serializedQueue = JSON.stringify(
        this.syncQueue.map(operation => ({
          ...operation,
          timestamp:
            operation.timestamp instanceof Date
              ? operation.timestamp.toISOString()
              : new Date(operation.timestamp).toISOString()
        }))
      );

      window.localStorage.setItem(this.storageKey, serializedQueue);

      if (this.lastSync) {
        window.localStorage.setItem(this.lastSyncKey, this.lastSync.toISOString());
      } else {
        window.localStorage.removeItem(this.lastSyncKey);
      }
    } catch (error) {
      console.error('Failed to save sync queue to storage:', error);
    }
  }

  /**
   * Start periodic synchronization processing
   */
  private startPeriodicSync(): void {
    if (typeof window === 'undefined') {
      return;
    }

    if (this.syncIntervalId) {
      window.clearInterval(this.syncIntervalId);
    }

    this.syncIntervalId = window.setInterval(() => {
      const hasPending = this.syncQueue.some(op => op.status === 'pending');
      if (this.isOnline && hasPending && !this.syncInProgress) {
        this.processSyncQueue();
      }
    }, 30000);
  }

  /**
   * Generate a unique identifier for sync operations
   */
  private generateOperationId(): string {
    return `sync-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }

  /**
   * Calculate retry delay using exponential backoff
   */
  private getRetryDelay(retryCount: number): number {
    const baseDelay = 1000;
    const maxDelay = 30000;
    return Math.min(maxDelay, baseDelay * Math.pow(2, retryCount));
  }

  /**
   * Notify registered listeners about status changes
   */
  private notifyStatusChange(): void {
    const status = this.getSyncStatus();

    for (const listener of this.listeners) {
      try {
        listener(status);
      } catch (error) {
        console.error('Sync status listener error:', error);
      }
    }
  }

  /**
   * Remove listeners and reset internal observers
   */
  dispose(): void {
    window.removeEventListener('online', this.handleOnlineStatusChange);
    window.removeEventListener('offline', this.handleOfflineStatusChange);
    if (this.syncIntervalId) {
      window.clearInterval(this.syncIntervalId);
      this.syncIntervalId = null;
    }
    this.listeners = [];
  }

  private handleOnlineStatusChange = () => {
    this.isOnline = true;
    this.notifyStatusChange();
    this.processSyncQueue();
  };

  private handleOfflineStatusChange = () => {
    this.isOnline = false;
    this.notifyStatusChange();
  };
}

export const offlineSyncService = new OfflineSyncService();
