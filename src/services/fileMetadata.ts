/**
 * File Metadata Service for BEAR AI
 * Manages extended file metadata including sync status, relationships, and custom properties
 */

import type { LocalFile } from './localFileSystem';

export interface BaseFileMetadata {
  id: string;
  path: string;
  name: string;
  size: number;
  type: string;
  lastModified: Date;
  created: Date;
  extension: string;
  checksum?: string;
}

export interface ExtendedFileMetadata extends BaseFileMetadata {
  // Content metadata
  pages?: number;
  wordCount?: number;
  characters?: number;
  language?: string;
  encoding?: string;
  
  // Sync metadata
  synced: boolean;
  lastSynced?: Date;
  syncVersion?: number;
  conflicted?: boolean;
  
  // Relationship metadata
  parentId?: string;
  childIds?: string[];
  relatedFiles?: string[];
  tags?: string[];
  
  // Custom properties
  movedFrom?: string;
  copiedFrom?: string;
  deleted?: boolean;
  deletedAt?: Date;
  archived?: boolean;
  archivedAt?: Date;
  
  // Processing metadata
  processed?: boolean;
  processedAt?: Date;
  analysisResults?: any;
  thumbnailPath?: string;
  previewPath?: string;
  
  // User metadata
  starred?: boolean;
  rating?: number;
  notes?: string;
  customFields?: Record<string, any>;
  
  // System metadata
  accessCount?: number;
  lastAccessed?: Date;
  permissions?: string[];
  owner?: string;
  version: number;
  createdBy?: string;
  modifiedBy?: string;
}

export interface MetadataSearchOptions {
  tags?: string[];
  type?: string;
  dateRange?: {
    start: Date;
    end: Date;
    field: 'created' | 'lastModified' | 'lastSynced' | 'lastAccessed';
  };
  synced?: boolean;
  conflicted?: boolean;
  deleted?: boolean;
  archived?: boolean;
  starred?: boolean;
  textSearch?: string;
  customFilters?: Record<string, any>;
}

export interface MetadataStatistics {
  totalFiles: number;
  syncedFiles: number;
  conflictedFiles: number;
  deletedFiles: number;
  archivedFiles: number;
  totalSize: number;
  averageFileSize: number;
  fileTypes: Record<string, number>;
  tagUsage: Record<string, number>;
  lastUpdated: Date;
}

export class FileMetadataService {
  private metadata = new Map<string, ExtendedFileMetadata>();
  private dbName = 'bearai_metadata';
  private version = 1;
  private db: IDBDatabase | null = null;
  private textMimeTypes = new Set([
    'text/plain',
    'text/markdown',
    'text/html',
    'text/css',
    'application/json',
    'application/xml',
    'application/javascript',
    'application/typescript'
  ]);
  private textExtensions = new Set([
    'txt',
    'md',
    'markdown',
    'html',
    'css',
    'js',
    'jsx',
    'ts',
    'tsx',
    'json',
    'yml',
    'yaml',
    'csv',
    'log'
  ]);
  private binaryExtensions = new Set([
    'pdf',
    'doc',
    'docx',
    'ppt',
    'pptx',
    'xls',
    'xlsx',
    'png',
    'jpg',
    'jpeg',
    'gif',
    'bmp',
    'webp',
    'tiff',
    'zip',
    'rar',
    '7z'
  ]);

  constructor() {
    this.initDB();
  }

  async extractMetadata(file: LocalFile): Promise<ExtendedFileMetadata> {
    const existing = this.metadata.get(file.id);
    const baseMetadata: BaseFileMetadata = {
      id: file.id,
      path: file.path || `/${file.name}`,
      name: file.name,
      size: file.size,
      type: file.type || 'application/octet-stream',
      lastModified: new Date(file.lastModified),
      created: existing?.created ?? new Date(file.lastModified),
      extension: this.getFileExtension(file.name),
      checksum: existing?.checksum
    };

    let resolvedContent = typeof file.content === 'string'
      ? file.content
      : typeof file.data === 'string'
        ? file.data
        : undefined;
    const bufferData = file.data instanceof ArrayBuffer ? file.data : undefined;
    let encoding = existing?.encoding;
    let analysisUpdates: Partial<ExtendedFileMetadata> = {};

    if (!resolvedContent && bufferData) {
      if (this.shouldTreatAsText(file, bufferData)) {
        const decoded = this.decodeBuffer(bufferData);
        if (decoded) {
          resolvedContent = decoded;
          encoding = 'utf-8';
        }
      } else {
        encoding = 'binary';
        analysisUpdates = {
          analysisResults: {
            ...(existing?.analysisResults || {}),
            binary: true,
            byteLength: bufferData.byteLength,
            contentType: file.type || 'application/octet-stream'
          }
        };
      }
    }

    const characters = resolvedContent ? resolvedContent.length : existing?.characters || 0;
    const wordCount = resolvedContent
      ? resolvedContent.trim().split(/\s+/).filter(Boolean).length
      : existing?.wordCount || 0;

    if (existing) {
      const updatePayload: Partial<ExtendedFileMetadata> = {
        size: file.size,
        lastModified: new Date(file.lastModified),
        wordCount,
        characters,
        synced: false,
        ...(encoding ? { encoding } : {}),
        ...analysisUpdates
      };

      return (await this.updateMetadata(file.id, updatePayload))!;
    }

    return this.createMetadata(baseMetadata, {
      wordCount,
      characters,
      synced: false,
      lastAccessed: new Date(),
      accessCount: 0,
      ...(encoding ? { encoding } : {}),
      ...analysisUpdates
    });
  }

  async recordSearch(identifier: string): Promise<void> {
    const metadata = this.metadata.get(identifier);
    if (!metadata) return;

    const updatedAccessCount = (metadata.accessCount || 0) + 1;
    await this.updateMetadata(identifier, {
      accessCount: updatedAccessCount,
      lastAccessed: new Date()
    });
  }

  /**
   * Initialize IndexedDB for metadata
   */
  private async initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        reject(new Error('Failed to open metadata database'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.loadMetadataFromDB();
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains('metadata')) {
          const store = db.createObjectStore('metadata', { keyPath: 'id' });
          store.createIndex('path', 'path', { unique: false });
          store.createIndex('type', 'type', { unique: false });
          store.createIndex('synced', 'synced', { unique: false });
          store.createIndex('tags', 'tags', { unique: false, multiEntry: true });
          store.createIndex('created', 'created', { unique: false });
          store.createIndex('lastModified', 'lastModified', { unique: false });
        }
      };
    });
  }

  /**
   * Load metadata from IndexedDB into memory
   */
  private async loadMetadataFromDB(): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['metadata'], 'readonly');
      const store = transaction.objectStore('metadata');
      
      const request = store.getAll();
      
      request.onsuccess = () => {
        const results = request.result;
        this.metadata.clear();
        
        results.forEach((meta: ExtendedFileMetadata) => {
          // Convert date strings back to Date objects
          meta.created = new Date(meta.created);
          meta.lastModified = new Date(meta.lastModified);
          if (meta.lastSynced) meta.lastSynced = new Date(meta.lastSynced);
          if (meta.deletedAt) meta.deletedAt = new Date(meta.deletedAt);
          if (meta.archivedAt) meta.archivedAt = new Date(meta.archivedAt);
          if (meta.processedAt) meta.processedAt = new Date(meta.processedAt);
          if (meta.lastAccessed) meta.lastAccessed = new Date(meta.lastAccessed);
          
          this.metadata.set(meta.id, meta);
        });
        
        resolve();
      };
      
      request.onerror = () => {
        reject(new Error('Failed to load metadata from database'));
      };
    });
  }

  /**
   * Save metadata to IndexedDB
   */
  private async saveMetadataToDB(metadata: ExtendedFileMetadata): Promise<void> {
    if (!this.db) await this.initDB();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['metadata'], 'readwrite');
      const store = transaction.objectStore('metadata');
      
      const request = store.put(metadata);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to save metadata'));
    });
  }

  /**
   * Create metadata for a new file
   */
  async createMetadata(fileData: BaseFileMetadata, extended?: Partial<ExtendedFileMetadata>): Promise<ExtendedFileMetadata> {
    const metadata: ExtendedFileMetadata = {
      ...fileData,
      synced: false,
      conflicted: false,
      deleted: false,
      archived: false,
      processed: false,
      starred: false,
      accessCount: 0,
      version: 1,
      tags: [],
      childIds: [],
      relatedFiles: [],
      customFields: {},
      ...extended
    };

    this.metadata.set(metadata.id, metadata);
    await this.saveMetadataToDB(metadata);

    return metadata;
  }

  /**
   * Get metadata by file ID
   */
  getMetadata(id: string): ExtendedFileMetadata | undefined {
    return this.metadata.get(id);
  }

  /**
   * Update metadata
   */
  async updateMetadata(id: string, updates: Partial<ExtendedFileMetadata>): Promise<ExtendedFileMetadata | null> {
    const existing = this.metadata.get(id);
    if (!existing) return null;

    const updated: ExtendedFileMetadata = {
      ...existing,
      ...updates,
      version: existing.version + 1,
      lastModified: new Date()
    };

    this.metadata.set(id, updated);
    await this.saveMetadataToDB(updated);

    return updated;
  }

  /**
   * Delete metadata
   */
  async deleteMetadata(id: string): Promise<boolean> {
    const metadata = this.metadata.get(id);
    if (!metadata) return false;

    // Mark as deleted instead of removing
    await this.updateMetadata(id, {
      deleted: true,
      deletedAt: new Date()
    });

    return true;
  }

  /**
   * Permanently remove metadata
   */
  async removeMetadata(id: string): Promise<boolean> {
    if (!this.metadata.has(id)) return false;

    this.metadata.delete(id);

    if (!this.db) return true;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['metadata'], 'readwrite');
      const store = transaction.objectStore('metadata');
      
      const request = store.delete(id);
      
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(new Error('Failed to remove metadata'));
    });
  }

  /**
   * Search metadata
   */
  searchMetadata(options: MetadataSearchOptions): ExtendedFileMetadata[] {
    let results = Array.from(this.metadata.values());

    // Filter by deletion status
    if (options.deleted !== undefined) {
      results = results.filter(meta => meta.deleted === options.deleted);
    } else {
      // By default, exclude deleted items
      results = results.filter(meta => !meta.deleted);
    }

    // Filter by tags
    if (options.tags && options.tags.length > 0) {
      results = results.filter(meta => 
        meta.tags && options.tags!.some(tag => meta.tags!.includes(tag))
      );
    }

    // Filter by type
    if (options.type) {
      results = results.filter(meta => meta.type === options.type);
    }

    // Filter by date range
    if (options.dateRange) {
      const { start, end, field } = options.dateRange;
      results = results.filter(meta => {
        const fieldValue = meta[field];
        if (!(fieldValue instanceof Date)) return false;
        return fieldValue >= start && fieldValue <= end;
      });
    }

    // Filter by sync status
    if (options.synced !== undefined) {
      results = results.filter(meta => meta.synced === options.synced);
    }

    // Filter by conflict status
    if (options.conflicted !== undefined) {
      results = results.filter(meta => meta.conflicted === options.conflicted);
    }

    // Filter by archived status
    if (options.archived !== undefined) {
      results = results.filter(meta => meta.archived === options.archived);
    }

    // Filter by starred status
    if (options.starred !== undefined) {
      results = results.filter(meta => meta.starred === options.starred);
    }

    // Text search
    if (options.textSearch) {
      const searchTerm = options.textSearch.toLowerCase();
      results = results.filter(meta => 
        meta.name.toLowerCase().includes(searchTerm) ||
        meta.path.toLowerCase().includes(searchTerm) ||
        (meta.notes && meta.notes.toLowerCase().includes(searchTerm)) ||
        (meta.tags && meta.tags.some(tag => tag.toLowerCase().includes(searchTerm)))
      );
    }

    // Custom filters
    if (options.customFilters) {
      Object.entries(options.customFilters).forEach(([key, value]) => {
        results = results.filter(meta => {
          const metaValue = (meta as any)[key];
          if (typeof value === 'object' && value.operator) {
            return this.applyOperatorFilter(metaValue, value.operator, value.value);
          }
          return metaValue === value;
        });
      });
    }

    return results;
  }

  /**
   * Apply operator-based filter
   */
  private applyOperatorFilter(metaValue: any, operator: string, filterValue: any): boolean {
    switch (operator) {
      case 'gt':
        return metaValue > filterValue;
      case 'gte':
        return metaValue >= filterValue;
      case 'lt':
        return metaValue < filterValue;
      case 'lte':
        return metaValue <= filterValue;
      case 'ne':
        return metaValue !== filterValue;
      case 'in':
        return Array.isArray(filterValue) && filterValue.includes(metaValue);
      case 'nin':
        return Array.isArray(filterValue) && !filterValue.includes(metaValue);
      case 'contains':
        return typeof metaValue === 'string' && metaValue.includes(filterValue);
      default:
        return metaValue === filterValue;
    }
  }

  /**
   * Get all metadata
   */
  getAllMetadata(includeDeleted: boolean = false): ExtendedFileMetadata[] {
    const results = Array.from(this.metadata.values());
    return includeDeleted ? results : results.filter(meta => !meta.deleted);
  }

  /**
   * Get metadata statistics
   */
  getStatistics(): MetadataStatistics {
    const allMetadata = this.getAllMetadata();
    const syncedFiles = allMetadata.filter(meta => meta.synced).length;
    const conflictedFiles = allMetadata.filter(meta => meta.conflicted).length;
    const deletedFiles = Array.from(this.metadata.values()).filter(meta => meta.deleted).length;
    const archivedFiles = allMetadata.filter(meta => meta.archived).length;
    
    const totalSize = allMetadata.reduce((sum, meta) => sum + meta.size, 0);
    const averageFileSize = allMetadata.length > 0 ? totalSize / allMetadata.length : 0;

    // File type distribution
    const fileTypes: Record<string, number> = {};
    allMetadata.forEach(meta => {
      fileTypes[meta.type] = (fileTypes[meta.type] || 0) + 1;
    });

    // Tag usage
    const tagUsage: Record<string, number> = {};
    allMetadata.forEach(meta => {
      meta.tags?.forEach(tag => {
        tagUsage[tag] = (tagUsage[tag] || 0) + 1;
      });
    });

    return {
      totalFiles: allMetadata.length,
      syncedFiles,
      conflictedFiles,
      deletedFiles,
      archivedFiles,
      totalSize,
      averageFileSize,
      fileTypes,
      tagUsage,
      lastUpdated: new Date()
    };
  }

  /**
   * Add tag to file
   */
  async addTag(id: string, tag: string): Promise<boolean> {
    const metadata = this.metadata.get(id);
    if (!metadata) return false;

    if (!metadata.tags) metadata.tags = [];
    if (!metadata.tags.includes(tag)) {
      metadata.tags.push(tag);
      await this.updateMetadata(id, { tags: metadata.tags });
      return true;
    }

    return false;
  }

  /**
   * Remove tag from file
   */
  async removeTag(id: string, tag: string): Promise<boolean> {
    const metadata = this.metadata.get(id);
    if (!metadata || !metadata.tags) return false;

    const index = metadata.tags.indexOf(tag);
    if (index > -1) {
      metadata.tags.splice(index, 1);
      await this.updateMetadata(id, { tags: metadata.tags });
      return true;
    }

    return false;
  }

  /**
   * Set file relationship
   */
  async setRelationship(parentId: string, childId: string): Promise<boolean> {
    const parent = this.metadata.get(parentId);
    const child = this.metadata.get(childId);
    
    if (!parent || !child) return false;

    // Add child to parent
    if (!parent.childIds) parent.childIds = [];
    if (!parent.childIds.includes(childId)) {
      parent.childIds.push(childId);
      await this.updateMetadata(parentId, { childIds: parent.childIds });
    }

    // Set parent for child
    await this.updateMetadata(childId, { parentId });

    return true;
  }

  /**
   * Remove file relationship
   */
  async removeRelationship(parentId: string, childId: string): Promise<boolean> {
    const parent = this.metadata.get(parentId);
    const child = this.metadata.get(childId);
    
    if (!parent || !child) return false;

    // Remove child from parent
    if (parent.childIds) {
      const index = parent.childIds.indexOf(childId);
      if (index > -1) {
        parent.childIds.splice(index, 1);
        await this.updateMetadata(parentId, { childIds: parent.childIds });
      }
    }

    // Remove parent from child
    if (child.parentId === parentId) {
      await this.updateMetadata(childId, { parentId: undefined });
    }

    return true;
  }

  /**
   * Record file access
   */
  async recordAccess(id: string): Promise<void> {
    const metadata = this.metadata.get(id);
    if (!metadata) return;

    await this.updateMetadata(id, {
      accessCount: (metadata.accessCount || 0) + 1,
      lastAccessed: new Date()
    });
  }

  /**
   * Bulk update metadata
   */
  async bulkUpdate(updates: Array<{ id: string; updates: Partial<ExtendedFileMetadata> }>): Promise<number> {
    let successCount = 0;

    for (const { id, updates: updateData } of updates) {
      try {
        const result = await this.updateMetadata(id, updateData);
        if (result) successCount++;
      } catch (error) {
        console.error(`Failed to update metadata for ${id}:`, error);
      }
    }

    return successCount;
  }

  /**
   * Export metadata
   */
  async exportMetadata(): Promise<ExtendedFileMetadata[]> {
    return this.getAllMetadata(true); // Include deleted items in export
  }

  /**
   * Import metadata
   */
  async importMetadata(metadataList: ExtendedFileMetadata[]): Promise<number> {
    let importedCount = 0;

    for (const metadata of metadataList) {
      try {
        this.metadata.set(metadata.id, metadata);
        await this.saveMetadataToDB(metadata);
        importedCount++;
      } catch (error) {
        console.error(`Failed to import metadata for ${metadata.id}:`, error);
      }
    }

    return importedCount;
  }

  /**
   * Clear all metadata
   */
  async clearAll(): Promise<void> {
    this.metadata.clear();

    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['metadata'], 'readwrite');
      const store = transaction.objectStore('metadata');

      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to clear metadata'));
    });
  }

  private shouldTreatAsText(file: LocalFile, buffer: ArrayBuffer): boolean {
    if (file.type && this.textMimeTypes.has(file.type)) {
      return true;
    }

    const extension = this.getFileExtension(file.name);
    if (extension) {
      if (this.textExtensions.has(extension)) {
        return true;
      }
      if (this.binaryExtensions.has(extension)) {
        return false;
      }
    }

    const sample = new Uint8Array(buffer.slice(0, 32));
    return !sample.some(byte => byte === 0);
  }

  private decodeBuffer(buffer: ArrayBuffer, encoding: string = 'utf-8'): string | undefined {
    try {
      const decoder = new TextDecoder(encoding, { fatal: false });
      return decoder.decode(buffer);
    } catch (error) {
      console.warn('Failed to decode buffer to text:', error);
      return undefined;
    }
  }

  private getFileExtension(name: string): string {
    const lastDot = name.lastIndexOf('.');
    return lastDot === -1 ? '' : name.slice(lastDot + 1).toLowerCase();
  }
}

export const fileMetadataService = new FileMetadataService();
