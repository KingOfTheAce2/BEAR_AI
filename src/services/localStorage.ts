/**
 * Local Storage Service for BEAR AI
 * Handles local document storage using IndexedDB
 */

export interface DocumentMetadata {
  pages?: number;
  wordCount: number;
  characters: number;
  author?: string;
  createdDate?: Date;
  modifiedDate?: Date;
  format: string;
  // Sync-related metadata
  synced?: boolean;
  lastSynced?: Date;
  remoteModified?: Date;
  localModified?: Date;
  version?: number;
  checksum?: string;
  conflicted?: boolean;
  merged?: boolean;
  mergedAt?: Date;
}

export interface FileInfo {
  path: string;
  name: string;
  size: number;
  type: string;
  lastModified: Date;
  extension: string;
}

export interface StoredDocument {
  id: string;
  title: string;
  content: string;
  summary?: string;
  fileInfo: FileInfo;
  metadata: DocumentMetadata;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

export interface StorageStats {
  totalDocuments: number;
  totalSize: number;
  lastUpdated: Date;
  syncedDocuments: number;
  unsyncedDocuments: number;
}

class LocalStorageService {
  private dbName = 'bearai_documents';
  private version = 1;
  private db: IDBDatabase | null = null;

  constructor() {
    this.initDB();
  }

  /**
   * Initialize IndexedDB
   */
  private async initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create documents store
        if (!db.objectStoreNames.contains('documents')) {
          const store = db.createObjectStore('documents', { keyPath: 'id' });
          store.createIndex('title', 'title', { unique: false });
          store.createIndex('tags', 'tags', { unique: false, multiEntry: true });
          store.createIndex('createdAt', 'createdAt', { unique: false });
          store.createIndex('updatedAt', 'updatedAt', { unique: false });
          store.createIndex('synced', 'metadata.synced', { unique: false });
        }

        // Create metadata store
        if (!db.objectStoreNames.contains('metadata')) {
          const metaStore = db.createObjectStore('metadata', { keyPath: 'id' });
          metaStore.createIndex('documentId', 'documentId', { unique: true });
        }
      };
    });
  }

  /**
   * Ensure database is ready
   */
  private async ensureDB(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.initDB();
    }
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    return this.db;
  }

  /**
   * Store a document
   */
  async storeDocument(document: Omit<StoredDocument, 'createdAt' | 'updatedAt' | 'version'>, fileInfo: FileInfo, tags: string[]): Promise<StoredDocument> {
    const db = await this.ensureDB();
    const now = new Date();

    const storedDoc: StoredDocument = {
      ...document,
      fileInfo,
      tags,
      createdAt: now,
      updatedAt: now,
      version: 1,
      metadata: {
        ...document.metadata,
        localModified: now
      }
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['documents'], 'readwrite');
      const store = transaction.objectStore('documents');
      
      const request = store.add(storedDoc);
      
      request.onsuccess = () => {
        resolve(storedDoc);
      };
      
      request.onerror = () => {
        reject(new Error('Failed to store document'));
      };
    });
  }

  /**
   * Get a document by ID
   */
  async getDocument(id: string): Promise<StoredDocument | null> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['documents'], 'readonly');
      const store = transaction.objectStore('documents');
      
      const request = store.get(id);
      
      request.onsuccess = () => {
        const result = request.result;
        if (result) {
          // Convert date strings back to Date objects
          result.createdAt = new Date(result.createdAt);
          result.updatedAt = new Date(result.updatedAt);
          if (result.metadata.createdDate) {
            result.metadata.createdDate = new Date(result.metadata.createdDate);
          }
          if (result.metadata.modifiedDate) {
            result.metadata.modifiedDate = new Date(result.metadata.modifiedDate);
          }
          if (result.metadata.lastSynced) {
            result.metadata.lastSynced = new Date(result.metadata.lastSynced);
          }
        }
        resolve(result || null);
      };
      
      request.onerror = () => {
        reject(new Error('Failed to get document'));
      };
    });
  }

  /**
   * Update a document
   */
  async updateDocument(document: StoredDocument): Promise<StoredDocument> {
    const db = await this.ensureDB();
    const now = new Date();

    const updatedDoc: StoredDocument = {
      ...document,
      updatedAt: now,
      version: document.version + 1,
      metadata: {
        ...document.metadata,
        localModified: now
      }
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['documents'], 'readwrite');
      const store = transaction.objectStore('documents');
      
      const request = store.put(updatedDoc);
      
      request.onsuccess = () => {
        resolve(updatedDoc);
      };
      
      request.onerror = () => {
        reject(new Error('Failed to update document'));
      };
    });
  }

  /**
   * Delete a document
   */
  async deleteDocument(id: string): Promise<boolean> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['documents'], 'readwrite');
      const store = transaction.objectStore('documents');
      
      const request = store.delete(id);
      
      request.onsuccess = () => {
        resolve(true);
      };
      
      request.onerror = () => {
        reject(new Error('Failed to delete document'));
      };
    });
  }

  /**
   * Get all documents
   */
  async getAllDocuments(): Promise<StoredDocument[]> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['documents'], 'readonly');
      const store = transaction.objectStore('documents');
      
      const request = store.getAll();
      
      request.onsuccess = () => {
        const results = request.result;
        // Convert date strings back to Date objects
        results.forEach(doc => {
          doc.createdAt = new Date(doc.createdAt);
          doc.updatedAt = new Date(doc.updatedAt);
          if (doc.metadata.createdDate) {
            doc.metadata.createdDate = new Date(doc.metadata.createdDate);
          }
          if (doc.metadata.modifiedDate) {
            doc.metadata.modifiedDate = new Date(doc.metadata.modifiedDate);
          }
          if (doc.metadata.lastSynced) {
            doc.metadata.lastSynced = new Date(doc.metadata.lastSynced);
          }
        });
        resolve(results);
      };
      
      request.onerror = () => {
        reject(new Error('Failed to get all documents'));
      };
    });
  }

  /**
   * Search documents by title or content
   */
  async searchDocuments(query: string): Promise<StoredDocument[]> {
    const allDocs = await this.getAllDocuments();
    const lowercaseQuery = query.toLowerCase();

    return allDocs.filter(doc => 
      doc.title.toLowerCase().includes(lowercaseQuery) ||
      doc.content.toLowerCase().includes(lowercaseQuery) ||
      doc.summary?.toLowerCase().includes(lowercaseQuery) ||
      doc.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery))
    );
  }

  /**
   * Get documents by tag
   */
  async getDocumentsByTag(tag: string): Promise<StoredDocument[]> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['documents'], 'readonly');
      const store = transaction.objectStore('documents');
      const index = store.index('tags');
      
      const request = index.getAll(tag);
      
      request.onsuccess = () => {
        const results = request.result;
        // Convert date strings back to Date objects
        results.forEach(doc => {
          doc.createdAt = new Date(doc.createdAt);
          doc.updatedAt = new Date(doc.updatedAt);
        });
        resolve(results);
      };
      
      request.onerror = () => {
        reject(new Error('Failed to get documents by tag'));
      };
    });
  }

  /**
   * Get unsynced documents
   */
  async getUnsyncedDocuments(): Promise<StoredDocument[]> {
    const allDocs = await this.getAllDocuments();
    return allDocs.filter(doc => !doc.metadata.synced);
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<StorageStats> {
    const allDocs = await this.getAllDocuments();
    const totalSize = allDocs.reduce((sum, doc) => sum + doc.content.length, 0);
    const syncedCount = allDocs.filter(doc => doc.metadata.synced).length;

    return {
      totalDocuments: allDocs.length,
      totalSize,
      lastUpdated: new Date(),
      syncedDocuments: syncedCount,
      unsyncedDocuments: allDocs.length - syncedCount
    };
  }

  /**
   * Clear all documents
   */
  async clearAll(): Promise<void> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['documents'], 'readwrite');
      const store = transaction.objectStore('documents');
      
      const request = store.clear();
      
      request.onsuccess = () => {
        resolve();
      };
      
      request.onerror = () => {
        reject(new Error('Failed to clear all documents'));
      };
    });
  }

  /**
   * Export all data
   */
  async exportData(): Promise<{
    documents: StoredDocument[];
    metadata: any;
    exportDate: Date;
  }> {
    const documents = await this.getAllDocuments();
    const stats = await this.getStorageStats();

    return {
      documents,
      metadata: stats,
      exportDate: new Date()
    };
  }

  /**
   * Import data
   */
  async importData(data: { documents: StoredDocument[] }): Promise<void> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['documents'], 'readwrite');
      const store = transaction.objectStore('documents');
      
      let completed = 0;
      const total = data.documents.length;

      if (total === 0) {
        resolve();
        return;
      }

      data.documents.forEach(doc => {
        const request = store.put(doc);
        
        request.onsuccess = () => {
          completed++;
          if (completed === total) {
            resolve();
          }
        };
        
        request.onerror = () => {
          reject(new Error('Failed to import document'));
        };
      });
    });
  }

  /**
   * Get document count
   */
  async getDocumentCount(): Promise<number> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['documents'], 'readonly');
      const store = transaction.objectStore('documents');
      
      const request = store.count();
      
      request.onsuccess = () => {
        resolve(request.result);
      };
      
      request.onerror = () => {
        reject(new Error('Failed to get document count'));
      };
    });
  }

  /**
   * Check if document exists
   */
  async documentExists(id: string): Promise<boolean> {
    const doc = await this.getDocument(id);
    return doc !== null;
  }

  /**
   * Get documents with pagination
   */
  async getDocumentsPaginated(offset: number = 0, limit: number = 10): Promise<{
    documents: StoredDocument[];
    total: number;
    hasMore: boolean;
  }> {
    const allDocs = await this.getAllDocuments();
    const total = allDocs.length;
    const documents = allDocs
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .slice(offset, offset + limit);

    return {
      documents,
      total,
      hasMore: offset + limit < total
    };
  }
}

export const localStorageService = new LocalStorageService()
