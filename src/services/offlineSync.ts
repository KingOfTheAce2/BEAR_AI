/**
 * Offline Synchronization Service
 * Handles offline file operations and synchronization
 */

import { LocalFile } from './localFileSystem';
import { StoredDocument, localStorageService } from './localStorage';
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

  constructor() {
    this.setupOnlineStatusListeners();
    this.loadQueueFromStorage();
    this.startPeriodicSync();
  }

  /**
   * Setup online/offline event listeners
   */
  private setupOnlineStatusListeners(): void {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.notifyStatusChange();
      this.processSyncQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.notifyStatusChange();
    });
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
    document.metadata = {
      ...document.metadata,
      synced: true,
      lastSynced: new Date()
    };

    await localStorageService.updateDocument(document);
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
    document.metadata = {
      ...document.metadata,
      synced: true,
      lastSynced: new Date()
    };

    await localStorageService.updateDocument(document);
  }

  /**
   * Sync delete operation
   */
  private async syncDeleteOperation(operation: SyncOperation): Promise<void> {
    // In a real implementation, this would delete from remote server
    // For now, we'll just clean up local references
    const metadata = fileMetadataService.getMetadata(operation.fileId);
    if (metadata) {
      // Mark as deleted in metadata
      await fileMetadataService.updateMetadata(operation.fileId, {
        deleted: true,
        deletedAt: new Date()
      } as any);
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

    // Update metadata
    const metadata = fileMetadataService.getMetadata(operation.fileId);
    if (metadata) {
      await fileMetadataService.updateMetadata(operation.fileId, {
        path: newPath,
        movedFrom: oldPath,
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
    const metadata = document.metadata as any;
    
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
   * Get current sync status
   */
  getSyncStatus(): SyncStatus {
    return {
      isOnline: this.isOnline,
      lastSync: this.lastSync,
      pendingOperations: this.syncQueue.filter(op => op.status === 'pending').length,
      failedOperations: this.syncQueue.filter(op => op.status === 'failed').length,
      syncInProgress: this.syncInProgress
    };
  }

  /**
   * Force sync now
   */
  async forcSync(): Promise<void> {
    if (this.isOnline) {
      await this.processSyncQueue();
    } else {
      throw new Error('Cannot sync while offline');
    }
  }

  /**
   * Clear failed operations
   */
  async clearFailedOperations(): Promise<void> {
    this.syncQueue = this.syncQueue.filter(op => op.status !== 'failed');
    await this.saveQueueToStorage();
    this.notifyStatusChange();
  }

  /**
   * Subscribe to sync status changes
   */
  onStatusChange(callback: (status: SyncStatus) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  /**
   * Enable/disable offline mode manually
   */
  setOfflineMode(offline: boolean): void {
    this.isOnline = !offline;
    this.notifyStatusChange();
    
    if (this.isOnline) {
      this.processSyncQueue();
    }
  }

  // Private helper methods

  private generateOperationId(): string {
    return `sync-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private getRetryDelay(retryCount: number): number {
    // Exponential backoff: 1s, 2s, 4s, 8s, etc.
    return Math.min(1000 * Math.pow(2, retryCount), 30000);
  }

  private async saveQueueToStorage(): Promise<void> {
    try {
      localStorage.setItem('bearai_sync_queue', JSON.stringify(this.syncQueue));
    } catch (error) {
      console.error('Failed to save sync queue:', error);
    }
  }

  private async loadQueueFromStorage(): Promise<void> {
    try {
      const stored = localStorage.getItem('bearai_sync_queue');
      if (stored) {
        this.syncQueue = JSON.parse(stored);
        // Convert timestamp strings back to Date objects
        this.syncQueue.forEach(op => {
          op.timestamp = new Date(op.timestamp);
        });
      }
    } catch (error) {
      console.error('Failed to load sync queue:', error);
      this.syncQueue = [];
    }
  }

  private notifyStatusChange(): void {
    const status = this.getSyncStatus();
    this.listeners.forEach(callback => {
      try {
        callback(status);
      } catch (error) {
        console.error('Error in sync status callback:', error);
      }
    });
  }

  private startPeriodicSync(): void {
    // Sync every 5 minutes when online
    setInterval(() => {
      if (this.isOnline && !this.syncInProgress && this.syncQueue.length > 0) {
        this.processSyncQueue();
      }
    }, 5 * 60 * 1000);
  }

  /**
   * Export data for backup
   */
  async exportData(): Promise<{
    documents: StoredDocument[];
    metadata: ExtendedFileMetadata[];
    syncQueue: SyncOperation[];
    timestamp: Date;
  }> {
    const documents = await localStorageService.getAllDocuments();
    const metadata = fileMetadataService.getStatistics();
    
    return {
      documents,
      metadata: [], // Would need to implement getAll in metadata service
      syncQueue: this.syncQueue,
      timestamp: new Date()
    };
  }

  /**
   * Import data from backup
   */
  async importData(data: {
    documents: StoredDocument[];
    metadata: ExtendedFileMetadata[];
    syncQueue: SyncOperation[];
  }): Promise<void> {
    // Clear existing data
    await localStorageService.clearAll();

    // Import documents
    for (const doc of data.documents) {
      await localStorageService.storeDocument(doc, doc.fileInfo, doc.tags);
    }

    // Import metadata
    for (const meta of data.metadata) {
      // Would need to implement import in metadata service
    }

    // Import sync queue
    this.syncQueue = data.syncQueue;
    await this.saveQueueToStorage();

    this.notifyStatusChange();
  }
}

export const offlineSyncService = new OfflineSyncService();