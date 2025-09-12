/**
 * Local Storage Service using IndexedDB
 * Provides offline storage for documents and metadata
 */

import { LocalFile } from './localFileSystem';
import { ParsedDocument } from './documentParser';

export interface StoredDocument extends ParsedDocument {
  fileInfo: LocalFile;
  indexed: boolean;
  tags: string[];
  lastAccessed: Date;
  searchableContent: string;
}

export interface DocumentIndex {
  id: string;
  terms: string[];
  frequency: Record<string, number>;
  lastIndexed: Date;
}

export class LocalStorageService {
  private dbName = 'BearAI_LocalDocuments';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;

  /**
   * Initialize IndexedDB
   */
  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Documents store
        if (!db.objectStoreNames.contains('documents')) {
          const documentsStore = db.createObjectStore('documents', { keyPath: 'id' });
          documentsStore.createIndex('title', 'title', { unique: false });
          documentsStore.createIndex('format', 'metadata.format', { unique: false });
          documentsStore.createIndex('lastAccessed', 'lastAccessed', { unique: false });
          documentsStore.createIndex('tags', 'tags', { unique: false, multiEntry: true });
        }

        // Search index store
        if (!db.objectStoreNames.contains('searchIndex')) {
          const indexStore = db.createObjectStore('searchIndex', { keyPath: 'id' });
          indexStore.createIndex('terms', 'terms', { unique: false, multiEntry: true });
        }

        // File metadata store
        if (!db.objectStoreNames.contains('fileMetadata')) {
          const metadataStore = db.createObjectStore('fileMetadata', { keyPath: 'id' });
          metadataStore.createIndex('name', 'name', { unique: false });
          metadataStore.createIndex('path', 'path', { unique: false });
          metadataStore.createIndex('lastModified', 'lastModified', { unique: false });
        }

        // Settings store
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      };
    });
  }

  /**
   * Store document
   */
  async storeDocument(document: ParsedDocument, fileInfo: LocalFile, tags: string[] = []): Promise<void> {
    if (!this.db) await this.initialize();

    const storedDoc: StoredDocument = {
      ...document,
      fileInfo,
      indexed: false,
      tags,
      lastAccessed: new Date(),
      searchableContent: this.createSearchableContent(document)
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['documents'], 'readwrite');
      const store = transaction.objectStore('documents');
      const request = store.put(storedDoc);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        // Also store file metadata separately
        this.storeFileMetadata(fileInfo);
        resolve();
      };
    });
  }

  /**
   * Get document by ID
   */
  async getDocument(id: string): Promise<StoredDocument | null> {
    if (!this.db) await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['documents'], 'readonly');
      const store = transaction.objectStore('documents');
      const request = store.get(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const document = request.result;
        if (document) {
          // Update last accessed
          document.lastAccessed = new Date();
          this.updateDocument(document);
        }
        resolve(document || null);
      };
    });
  }

  /**
   * Get all documents
   */
  async getAllDocuments(): Promise<StoredDocument[]> {
    if (!this.db) await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['documents'], 'readonly');
      const store = transaction.objectStore('documents');
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  /**
   * Search documents
   */
  async searchDocuments(query: string, filters?: {
    format?: string;
    tags?: string[];
    dateRange?: { start: Date; end: Date };
  }): Promise<StoredDocument[]> {
    const allDocs = await this.getAllDocuments();
    const searchTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 0);

    return allDocs.filter(doc => {
      // Text matching
      const textMatch = searchTerms.every(term =>
        doc.searchableContent.toLowerCase().includes(term) ||
        doc.title.toLowerCase().includes(term)
      );

      if (!textMatch) return false;

      // Format filter
      if (filters?.format && doc.metadata.format !== filters.format) {
        return false;
      }

      // Tags filter
      if (filters?.tags && filters.tags.length > 0) {
        const hasRequiredTag = filters.tags.some(tag => doc.tags.includes(tag));
        if (!hasRequiredTag) return false;
      }

      // Date range filter
      if (filters?.dateRange) {
        const docDate = doc.metadata.modifiedDate || doc.metadata.createdDate;
        if (docDate) {
          const date = new Date(docDate);
          if (date < filters.dateRange.start || date > filters.dateRange.end) {
            return false;
          }
        }
      }

      return true;
    }).sort((a, b) => {
      // Sort by relevance (simple scoring based on search terms in title)
      const aScore = searchTerms.reduce((score, term) => {
        return score + (a.title.toLowerCase().includes(term) ? 2 : 0) +
               (a.searchableContent.toLowerCase().includes(term) ? 1 : 0);
      }, 0);

      const bScore = searchTerms.reduce((score, term) => {
        return score + (b.title.toLowerCase().includes(term) ? 2 : 0) +
               (b.searchableContent.toLowerCase().includes(term) ? 1 : 0);
      }, 0);

      return bScore - aScore;
    });
  }

  /**
   * Update document
   */
  async updateDocument(document: StoredDocument): Promise<void> {
    if (!this.db) await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['documents'], 'readwrite');
      const store = transaction.objectStore('documents');
      const request = store.put(document);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  /**
   * Delete document
   */
  async deleteDocument(id: string): Promise<void> {
    if (!this.db) await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['documents', 'searchIndex'], 'readwrite');
      
      // Delete from documents
      const docStore = transaction.objectStore('documents');
      const docRequest = docStore.delete(id);

      // Delete from search index
      const indexStore = transaction.objectStore('searchIndex');
      const indexRequest = indexStore.delete(id);

      transaction.onerror = () => reject(transaction.error);
      transaction.oncomplete = () => resolve();
    });
  }

  /**
   * Store file metadata
   */
  private async storeFileMetadata(fileInfo: LocalFile): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['fileMetadata'], 'readwrite');
      const store = transaction.objectStore('fileMetadata');
      const request = store.put(fileInfo);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  /**
   * Create searchable content from document
   */
  private createSearchableContent(document: ParsedDocument): string {
    let content = document.title + ' ' + document.content;
    
    if (document.sections) {
      content += ' ' + document.sections.map(s => s.title + ' ' + s.content).join(' ');
    }

    if (document.metadata.author) {
      content += ' ' + document.metadata.author;
    }

    return content;
  }

  /**
   * Build search index for document
   */
  async buildSearchIndex(document: StoredDocument): Promise<void> {
    if (!this.db) await this.initialize();

    const terms = this.extractSearchTerms(document.searchableContent);
    const frequency = this.calculateTermFrequency(terms);

    const index: DocumentIndex = {
      id: document.id,
      terms: Array.from(new Set(terms)),
      frequency,
      lastIndexed: new Date()
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['searchIndex', 'documents'], 'readwrite');
      
      // Store search index
      const indexStore = transaction.objectStore('searchIndex');
      const indexRequest = indexStore.put(index);

      // Mark document as indexed
      document.indexed = true;
      const docStore = transaction.objectStore('documents');
      const docRequest = docStore.put(document);

      transaction.onerror = () => reject(transaction.error);
      transaction.oncomplete = () => resolve();
    });
  }

  /**
   * Extract search terms from text
   */
  private extractSearchTerms(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(term => term.length > 2)
      .filter(term => !this.isStopWord(term));
  }

  /**
   * Calculate term frequency
   */
  private calculateTermFrequency(terms: string[]): Record<string, number> {
    const frequency: Record<string, number> = {};
    
    for (const term of terms) {
      frequency[term] = (frequency[term] || 0) + 1;
    }

    return frequency;
  }

  /**
   * Check if word is a stop word
   */
  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have',
      'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
      'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they'
    ]);

    return stopWords.has(word);
  }

  /**
   * Get storage usage statistics
   */
  async getStorageStats(): Promise<{
    documentsCount: number;
    totalSize: number;
    formats: Record<string, number>;
    oldestDocument: Date | null;
    newestDocument: Date | null;
  }> {
    const documents = await this.getAllDocuments();
    
    const stats = {
      documentsCount: documents.length,
      totalSize: documents.reduce((total, doc) => total + doc.fileInfo.size, 0),
      formats: {} as Record<string, number>,
      oldestDocument: null as Date | null,
      newestDocument: null as Date | null
    };

    for (const doc of documents) {
      const format = doc.metadata.format;
      stats.formats[format] = (stats.formats[format] || 0) + 1;

      const date = doc.metadata.modifiedDate || doc.metadata.createdDate;
      if (date) {
        const docDate = new Date(date);
        if (!stats.oldestDocument || docDate < stats.oldestDocument) {
          stats.oldestDocument = docDate;
        }
        if (!stats.newestDocument || docDate > stats.newestDocument) {
          stats.newestDocument = docDate;
        }
      }
    }

    return stats;
  }

  /**
   * Clear all stored data
   */
  async clearAll(): Promise<void> {
    if (!this.db) await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['documents', 'searchIndex', 'fileMetadata'], 'readwrite');
      
      transaction.objectStore('documents').clear();
      transaction.objectStore('searchIndex').clear();
      transaction.objectStore('fileMetadata').clear();

      transaction.onerror = () => reject(transaction.error);
      transaction.oncomplete = () => resolve();
    });
  }
}

export const localStorageService = new LocalStorageService();