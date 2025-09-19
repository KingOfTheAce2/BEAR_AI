/**
 * Local Storage Service for BEAR AI
 * Handles local document storage using IndexedDB
 */

import type { LocalFile } from './localFileSystem';

export interface DocumentSection {
  id?: string;
  title: string;
  content: string;
  level: number;
}

export interface DocumentMetadata {
  pages?: number;
  wordCount: number;
  characters: number;
  author?: string;
  createdDate?: Date;
  modifiedDate?: Date;
  format: string;
  description?: string;
  keywords?: string[];
  subject?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  quality?: number;
  relevance?: number;
  concepts?: string[];
  entityMentions?: string[];
  sections?: DocumentSection[];
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
  // Access tracking
  lastAccessed?: Date;
  accessCount?: number;
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

export interface DocumentIndex {
  id: string;
  documentId: string;
  terms: string[];
  tags: string[];
  updatedAt: Date;
  metadata: {
    title: string;
    summary?: string;
    description?: string;
  };
}

export class LocalStorageService {
  private dbName = 'bearai_documents';
  private version = 2;
  private db: IDBDatabase | null = null;
  private searchIndex = new Map<string, DocumentIndex>();

  constructor() {
    this.initDB();
  }

  async initialize(): Promise<void> {
    await this.ensureDB();
    await this.loadSearchIndexFromDB();
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
        this.loadSearchIndexFromDB().finally(() => resolve());
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

        if (!db.objectStoreNames.contains('searchIndex')) {
          const indexStore = db.createObjectStore('searchIndex', { keyPath: 'id' });
          indexStore.createIndex('documentId', 'documentId', { unique: true });
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

  private async loadSearchIndexFromDB(): Promise<void> {
    if (!this.db || !this.db.objectStoreNames.contains('searchIndex')) {
      return;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['searchIndex'], 'readonly');
      const store = transaction.objectStore('searchIndex');
      const request = store.getAll();

      request.onsuccess = () => {
        const results = request.result as Array<{
          id: string;
          documentId: string;
          terms: string[];
          tags: string[];
          updatedAt: string | number | Date;
          metadata: DocumentIndex['metadata'];
        }>;

        this.searchIndex.clear();
        results.forEach(record => {
          this.searchIndex.set(record.documentId, {
            id: record.id,
            documentId: record.documentId,
            terms: record.terms,
            tags: record.tags,
            updatedAt: new Date(record.updatedAt),
            metadata: record.metadata
          });
        });
        resolve();
      };

      request.onerror = () => reject(new Error('Failed to load search index'));
    });
  }

  private async saveDocumentIndex(index: DocumentIndex): Promise<void> {
    const db = await this.ensureDB();
    if (!db.objectStoreNames.contains('searchIndex')) {
      return null;
    }
    if (!db.objectStoreNames.contains('searchIndex')) {
      return;
    }

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['searchIndex'], 'readwrite');
      const store = transaction.objectStore('searchIndex');
      const request = store.put({ ...index, updatedAt: index.updatedAt.toISOString() });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to save search index'));
    });
  }

  /**
   * Store a document
   */
  async storeDocument(
    document: {
      id: string;
      title: string;
      content: string;
      metadata: DocumentMetadata;
      summary?: string;
      tags?: string[];
      fileInfo?: FileInfo;
      sections?: DocumentSection[];
    },
    file: FileInfo | LocalFile,
    tags: string[] = []
  ): Promise<StoredDocument> {
    const db = await this.ensureDB();
    const now = new Date();

    const resolvedSections = document.sections ?? document.metadata.sections;

    const resolvedFileInfo: FileInfo = document.fileInfo || {
      path: 'path' in file ? file.path : `/${document.title}`,
      name: 'name' in file ? file.name : document.title,
      size: file.size,
      type: file.type,
      lastModified: new Date('lastModified' in file ? file.lastModified : Date.now()),
      extension: this.extractExtension('name' in file ? file.name : document.title)
    };

    const metadata: DocumentMetadata = {
      ...document.metadata,
      ...(resolvedSections ? { sections: resolvedSections } : {}),
      localModified: now,
      accessCount: document.metadata.accessCount ?? 0,
      lastAccessed: document.metadata.lastAccessed ?? now,
      synced: document.metadata.synced ?? false
    };

    const storedDoc: StoredDocument = {
      id: document.id,
      title: document.title,
      content: document.content,
      summary: document.summary,
      fileInfo: resolvedFileInfo,
      metadata,
      tags: document.tags ?? tags,
      createdAt: now,
      updatedAt: now,
      version: 1
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['documents'], 'readwrite');
      const store = transaction.objectStore('documents');

      const request = store.add(storedDoc);

      request.onsuccess = async () => {
        try {
          await this.buildSearchIndex(storedDoc);
        } catch (error) {
          console.warn('Failed to build search index:', error);
        }
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
          if (result.metadata.localModified) {
            result.metadata.localModified = new Date(result.metadata.localModified);
          }
          if (result.metadata.mergedAt) {
            result.metadata.mergedAt = new Date(result.metadata.mergedAt);
          }
          if (result.metadata.lastAccessed) {
            result.metadata.lastAccessed = new Date(result.metadata.lastAccessed);
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
        localModified: now,
        lastAccessed: document.metadata.lastAccessed ?? now,
        accessCount: document.metadata.accessCount ?? 0
      }
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['documents'], 'readwrite');
      const store = transaction.objectStore('documents');

      const request = store.put(updatedDoc);

      request.onsuccess = async () => {
        try {
          await this.buildSearchIndex(updatedDoc);
        } catch (error) {
          console.warn('Failed to update search index:', error);
        }
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

      request.onsuccess = async () => {
        try {
          await this.removeDocumentIndex(id);
        } catch (error) {
          console.warn('Failed to remove document index:', error);
        }
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
          if (doc.metadata.localModified) {
            doc.metadata.localModified = new Date(doc.metadata.localModified);
          }
          if (doc.metadata.mergedAt) {
            doc.metadata.mergedAt = new Date(doc.metadata.mergedAt);
          }
          if (doc.metadata.lastAccessed) {
            doc.metadata.lastAccessed = new Date(doc.metadata.lastAccessed);
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

  async buildSearchIndex(document: StoredDocument): Promise<DocumentIndex> {
    const terms = this.tokenize([
      document.title,
      document.summary ?? '',
      document.content
    ].join(' '));

    const index: DocumentIndex = {
      id: document.id,
      documentId: document.id,
      terms,
      tags: document.tags,
      updatedAt: new Date(),
      metadata: {
        title: document.title,
        summary: document.summary,
        description: document.metadata.description
      }
    };

    this.searchIndex.set(document.id, index);
    await this.saveDocumentIndex(index);
    return index;
  }

  async getDocumentIndex(documentId: string): Promise<DocumentIndex | null> {
    const cached = this.searchIndex.get(documentId);
    if (cached) {
      return cached;
    }

    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['searchIndex'], 'readonly');
      const store = transaction.objectStore('searchIndex');
      const request = store.get(documentId);

      request.onsuccess = () => {
        const record = request.result;
        if (!record) {
          resolve(null);
          return;
        }

        const index: DocumentIndex = {
          id: record.id,
          documentId: record.documentId,
          terms: record.terms,
          tags: record.tags,
          updatedAt: new Date(record.updatedAt),
          metadata: record.metadata
        };
        this.searchIndex.set(documentId, index);
        resolve(index);
      };

      request.onerror = () => reject(new Error('Failed to retrieve search index'));
    });
  }

  private async removeDocumentIndex(documentId: string): Promise<void> {
    this.searchIndex.delete(documentId);
    const db = await this.ensureDB();
    if (!db.objectStoreNames.contains('searchIndex')) {
      return;
    }

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['searchIndex'], 'readwrite');
      const store = transaction.objectStore('searchIndex');
      const request = store.delete(documentId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to remove search index'));
    });
  }

  private tokenize(content: string): string[] {
    const MAX_CHARS = 200_000;
    const truncated = content.length > MAX_CHARS ? content.slice(0, MAX_CHARS) : content;
    const normalized = truncated.toLowerCase();
    let tokens: string[] = [];

    const supportsSegmenter = typeof Intl !== 'undefined' && typeof (Intl as any).Segmenter === 'function';

    if (supportsSegmenter) {
      const segmenter = new (Intl as any).Segmenter(undefined, { granularity: 'word' });
      for (const segment of segmenter.segment(normalized)) {
        if (segment.isWordLike) {
          const value = segment.segment.trim();
          if (value.length > 2) {
            tokens.push(value);
          }
        }
      }
    } else {
      tokens = normalized
        .replace(/[^\p{L}\p{N}\s]/gu, ' ')
        .split(/\s+/u)
        .filter(token => token.length > 2);
    }

    if (tokens.length > 2000) {
      const step = Math.ceil(tokens.length / 2000);
      tokens = tokens.filter((_, index) => index % step === 0);
    }

    const uniqueTokens: string[] = [];
    const seen = new Set<string>();

    for (const token of tokens) {
      if (!seen.has(token)) {
        seen.add(token);
        uniqueTokens.push(token);
        if (uniqueTokens.length >= 500) {
          break;
        }
      }
    }

    return uniqueTokens;
  }

  private extractExtension(name: string): string {
    const lastDot = name.lastIndexOf('.');
    return lastDot === -1 ? '' : name.slice(lastDot + 1).toLowerCase();
  }
}

export const localStorageService = new LocalStorageService()
