/**
 * Offline Synchronization Service
 * Handles offline file operations and synchronization
 */

import { type StoredDocument, type StorageStats, localStorageService } from './localStorage';
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
  private isOnline: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private syncInProgress: boolean = false;
  private lastSync: Date | null = null;
  private listeners: Array<(status: SyncStatus) => void> = [];
  private readonly QUEUE_STORAGE_KEY = 'bearai_offline_sync_queue';
  private readonly LAST_SYNC_STORAGE_KEY = 'bearai_offline_sync_last_sync';
  private readonly DEFAULT_SYNC_INTERVAL = 5 * 60 * 1000;
  private periodicSyncHandle: number | null = null;

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
    const pendingOperations = this.syncQueue.filter(op =>
      op.status === 'pending' || op.status === 'in_progress'
    ).length;
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
   * Backwards-compatible alias with historical typo
   */
  async forcSync(): Promise<void> {
    await this.forceSync();
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
    if (typeof window === 'undefined') {
      return;
    }

    window.addEventListener('online', this.handleOnlineStatusChange);
    window.addEventListener('offline', this.handleOfflineStatusChange);
  }

  /**
   * Load queue state from browser storage
   */
  private loadQueueFromStorage(): void {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }

    try {
      const storedQueue = window.localStorage.getItem(this.QUEUE_STORAGE_KEY);
      if (storedQueue) {
        const parsed: Array<Omit<SyncOperation, 'timestamp'> & { timestamp: string }> = JSON.parse(storedQueue);
        this.syncQueue = parsed.map(operation => ({
          ...operation,
          timestamp: new Date(operation.timestamp),
          status: operation.status === 'in_progress' ? 'pending' : operation.status
        }));
      }

      const storedLastSync = window.localStorage.getItem(this.LAST_SYNC_STORAGE_KEY);
      if (storedLastSync) {
        this.lastSync = new Date(storedLastSync);
      }
    } catch (error) {
      console.error('Failed to load offline sync queue from storage:', error);
      this.syncQueue = [];
    }
  }

  /**
   * Persist queue state to browser storage
   */
  private async saveQueueToStorage(): Promise<void> {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }

    try {
      const serialized = JSON.stringify(
        this.syncQueue.map(operation => ({
          ...operation,
          timestamp:
            operation.timestamp instanceof Date
              ? operation.timestamp.toISOString()
              : new Date(operation.timestamp).toISOString()
        }))
      );

      window.localStorage.setItem(this.QUEUE_STORAGE_KEY, serialized);

      if (this.lastSync) {
        window.localStorage.setItem(this.LAST_SYNC_STORAGE_KEY, this.lastSync.toISOString());
      } else {
        window.localStorage.removeItem(this.LAST_SYNC_STORAGE_KEY);
      }
    } catch (error) {
      console.error('Failed to persist offline sync queue:', error);
    }
  }

  /**
   * Start periodic synchronization attempts
   */
  private startPeriodicSync(): void {
    if (typeof window === 'undefined') {
      return;
    }

    if (this.periodicSyncHandle !== null) {
      window.clearInterval(this.periodicSyncHandle);
    }

    this.periodicSyncHandle = window.setInterval(() => {
      if (this.isOnline && !this.syncInProgress) {
        void this.processSyncQueue();
      }
    }, this.DEFAULT_SYNC_INTERVAL);
  }

  /**
   * Generate a stable operation identifier
   */
  private generateOperationId(): string {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID();
    }

    const random = Math.random().toString(36).slice(2, 10);
    return `sync-${Date.now()}-${random}`;
  }

  /**
   * Notify subscribers of status changes
   */
  private notifyStatusChange(): void {
    const status = this.getSyncStatus();
    this.listeners.forEach(listener => {
      try {
        listener(status);
      } catch (error) {
        console.error('Offline sync listener failed:', error);
      }
    });
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private getRetryDelay(retryCount: number): number {
    const baseDelay = 1000;
    const maxDelay = 30_000;
    return Math.min(maxDelay, baseDelay * Math.pow(2, Math.max(0, retryCount - 1)));
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
    this.lastSync = new Date();
    await this.saveQueueToStorage();

    this.syncInProgress = false;
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
   * Remove listeners and reset internal observers
   */
  dispose(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnlineStatusChange);
      window.removeEventListener('offline', this.handleOfflineStatusChange);

      if (this.periodicSyncHandle !== null) {
        window.clearInterval(this.periodicSyncHandle);
        this.periodicSyncHandle = null;
      }
    }

    this.listeners = [];
  }

  private handleOnlineStatusChange = () => {
    this.isOnline = true;
    this.notifyStatusChange();
    void this.processSyncQueue();
  };

  private handleOfflineStatusChange = () => {
    this.isOnline = false;
    this.notifyStatusChange();
  };
}

export const offlineSyncService = new OfflineSyncService();
