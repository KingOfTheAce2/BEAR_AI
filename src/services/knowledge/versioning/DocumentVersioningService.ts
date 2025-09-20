
import { Document, DocumentVersion, DocumentChange, KnowledgeBaseConfig } from '../../../types/knowledge/types';
import { VectorDatabaseService } from '../database/VectorDatabaseService';

export class DocumentVersioningService {
  private vectorDb: VectorDatabaseService;
  private config: KnowledgeBaseConfig;
  private dbName = 'document-versions-db';
  private db: IDBDatabase | null = null;

  constructor(config: KnowledgeBaseConfig, vectorDb: VectorDatabaseService) {
    this.config = config;
    this.vectorDb = vectorDb;
    this.initialize();
  }

  private async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onerror = () => {
        reject(new Error('Failed to open versioning database'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains('versions')) {
          const versionStore = db.createObjectStore('versions', { keyPath: 'id' });
          versionStore.createIndex('by-document', 'documentId');
          versionStore.createIndex('by-date', 'createdAt');
        }
        
        if (!db.objectStoreNames.contains('changes')) {
          const changesStore = db.createObjectStore('changes', { keyPath: 'id' });
          changesStore.createIndex('by-version', 'versionId');
        }
      };
    });
  }

  async createVersion(
    originalDocument: Document, 
    updatedDocument: Partial<Document>,
    author?: string
  ): Promise<DocumentVersion> {
    if (!this.db) throw new Error('Versioning database not initialized');

    try {
      // Calculate changes between original and updated
      const changes = this.calculateChanges(originalDocument, updatedDocument);
      
      // Get next version number
      const existingVersions = await this.getVersions(originalDocument.id);
      const nextVersion = Math.max(0, ...existingVersions.map(v => v.version)) + 1;
      
      // Create version record
      const version: DocumentVersion = {
        id: `${originalDocument.id}-v${nextVersion}`,
        documentId: originalDocument.id,
        version: nextVersion,
        changes,
        summary: this.generateChangeSummary(changes),
        createdAt: new Date(),
        author
      };

      // Store version
      await this.storeVersion(version);

      // Store individual changes
      await this.storeChanges(version.id, changes);

      console.log(`Created version ${nextVersion} for document ${originalDocument.id}`);
      return version;
    } catch (error) {
      console.error('Error creating version:', error);
      throw new Error(`Failed to create version: ${error.message}`);
    }
  }

  private calculateChanges(
    original: Document,
    updated: Partial<Document>
  ): DocumentChange[] {
    const changes: DocumentChange[] = [];

    // Track content changes
    if (updated.content && updated.content !== original.content) {
      const contentChanges = this.calculateTextChanges(
        original.content,
        updated.content
      );
      changes.push(...contentChanges);
    }

    // Track title changes
    if (updated.title && updated.title !== original.title) {
      changes.push({
        type: 'modify',
        startIndex: 0,
        endIndex: 0,
        oldText: original.title,
        newText: updated.title,
        confidence: 1.0
      });
    }

    // Track metadata changes
    if (updated.tags && JSON.stringify(updated.tags) !== JSON.stringify(original.tags)) {
      changes.push({
        type: 'modify',
        startIndex: -1, // Special index for metadata
        endIndex: -1,
        oldText: JSON.stringify(original.tags),
        newText: JSON.stringify(updated.tags),
        confidence: 1.0
      });
    }

    return changes;
  }

  private calculateTextChanges(oldText: string, newText: string): DocumentChange[] {
    // Simple diff algorithm - in production, use more sophisticated diff
    const changes: DocumentChange[] = [];
    
    // Split into words for better granularity
    const oldWords = oldText.split(/\s+/);
    const newWords = newText.split(/\s+/);
    
    // Use dynamic programming approach for LCS (Longest Common Subsequence)
    const lcs = this.findLCS(oldWords, newWords);
    
    // Convert LCS result to changes
    let oldIndex = 0;
    let newIndex = 0;
    let textPosition = 0;
    
    for (const operation of lcs) {
      if (operation.type === 'delete') {
        const deletedText = oldWords.slice(oldIndex, oldIndex + operation.count).join(' ');
        changes.push({
          type: 'delete',
          startIndex: textPosition,
          endIndex: textPosition + deletedText.length,
          oldText: deletedText,
          confidence: 0.9
        });
        oldIndex += operation.count;
        textPosition += deletedText.length + 1; // +1 for space
      } else if (operation.type === 'add') {
        const addedText = newWords.slice(newIndex, newIndex + operation.count).join(' ');
        changes.push({
          type: 'add',
          startIndex: textPosition,
          endIndex: textPosition,
          newText: addedText,
          confidence: 0.9
        });
        newIndex += operation.count;
      } else {
        // Common text - advance both indices
        const commonText = oldWords.slice(oldIndex, oldIndex + operation.count).join(' ');
        oldIndex += operation.count;
        newIndex += operation.count;
        textPosition += commonText.length + 1;
      }
    }

    return changes;
  }

  private findLCS(
    oldWords: string[], 
    newWords: string[]
  ): Array<{ type: 'common' | 'delete' | 'add'; count: number }> {
    // Simplified LCS implementation
    const operations: Array<{ type: 'common' | 'delete' | 'add'; count: number }> = [];
    
    let i = 0, j = 0;
    
    while (i < oldWords.length && j < newWords.length) {
      if (oldWords[i] === newWords[j]) {
        // Common word found
        let count = 1;
        while (i + count < oldWords.length && 
               j + count < newWords.length && 
               oldWords[i + count] === newWords[j + count]) {
          count++;
        }
        operations.push({ type: 'common', count });
        i += count;
        j += count;
      } else {
        // Look ahead to find next common word
        let nextCommonI = -1, nextCommonJ = -1;
        
        for (let ii = i; ii < Math.min(i + 10, oldWords.length); ii++) {
          for (let jj = j; jj < Math.min(j + 10, newWords.length); jj++) {
            if (oldWords[ii] === newWords[jj]) {
              nextCommonI = ii;
              nextCommonJ = jj;
              break;
            }
          }
          if (nextCommonI !== -1) break;
        }
        
        if (nextCommonI === -1) {
          // No common words found - delete remaining old, add remaining new
          if (oldWords.length - i > 0) {
            operations.push({ type: 'delete', count: oldWords.length - i });
          }
          if (newWords.length - j > 0) {
            operations.push({ type: 'add', count: newWords.length - j });
          }
          break;
        } else {
          // Delete words before next common word
          if (nextCommonI > i) {
            operations.push({ type: 'delete', count: nextCommonI - i });
            i = nextCommonI;
          }
          // Add words before next common word
          if (nextCommonJ > j) {
            operations.push({ type: 'add', count: nextCommonJ - j });
            j = nextCommonJ;
          }
        }
      }
    }
    
    // Handle remaining words
    if (i < oldWords.length) {
      operations.push({ type: 'delete', count: oldWords.length - i });
    }
    if (j < newWords.length) {
      operations.push({ type: 'add', count: newWords.length - j });
    }
    
    return operations;
  }

  private generateChangeSummary(changes: DocumentChange[]): string {
    const adds = changes.filter(c => c.type === 'add').length;
    const deletes = changes.filter(c => c.type === 'delete').length;
    const modifies = changes.filter(c => c.type === 'modify').length;
    
    const parts: string[] = [];
    if (adds > 0) parts.push(`${adds} addition${adds > 1 ? 's' : ''}`);
    if (deletes > 0) parts.push(`${deletes} deletion${deletes > 1 ? 's' : ''}`);
    if (modifies > 0) parts.push(`${modifies} modification${modifies > 1 ? 's' : ''}`);
    
    return parts.length > 0 ? parts.join(', ') : 'No changes detected';
  }

  private async storeVersion(version: DocumentVersion): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['versions'], 'readwrite');
    const store = transaction.objectStore('versions');
    
    await this.promisifyRequest(store.put(version));
  }

  private async storeChanges(versionId: string, changes: DocumentChange[]): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['changes'], 'readwrite');
    const store = transaction.objectStore('changes');
    
    for (let i = 0; i < changes.length; i++) {
      const changeRecord = {
        id: `${versionId}-change-${i}`,
        versionId,
        ...changes[i]
      };
      
      await this.promisifyRequest(store.put(changeRecord));
    }
  }

  async getVersions(documentId: string): Promise<DocumentVersion[]> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['versions'], 'readonly');
    const store = transaction.objectStore('versions');
    const index = store.index('by-document');
    
    const versions = await this.promisifyRequest(index.getAll(documentId)) as DocumentVersion[];
    
    // Sort by version number (descending)
    return versions.sort((a, b) => b.version - a.version);
  }

  async getVersion(versionId: string): Promise<DocumentVersion | null> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['versions'], 'readonly');
    const store = transaction.objectStore('versions');
    
    const version = await this.promisifyRequest(store.get(versionId)) as DocumentVersion;
    return version || null;
  }

  async getVersionChanges(versionId: string): Promise<DocumentChange[]> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['changes'], 'readonly');
    const store = transaction.objectStore('changes');
    const index = store.index('by-version');
    
    const changeRecords = await this.promisifyRequest(index.getAll(versionId)) as any[];
    
    return changeRecords.map(record => ({
      type: record.type,
      startIndex: record.startIndex,
      endIndex: record.endIndex,
      oldText: record.oldText,
      newText: record.newText,
      confidence: record.confidence
    }));
  }

  async revertToVersion(documentId: string, targetVersion: number): Promise<Document> {
    try {
      // Get current document
      const currentDocument = await this.vectorDb.getDocument(documentId);
      if (!currentDocument) {
        throw new Error('Document not found');
      }

      // Get target version
      const versions = await this.getVersions(documentId);
      const targetVersionRecord = versions.find(v => v.version === targetVersion);
      
      if (!targetVersionRecord) {
        throw new Error(`Version ${targetVersion} not found`);
      }

      // Apply reverse changes from current version down to target version
      const revertedDocument = await this.applyReverseChanges(
        currentDocument,
        versions.filter(v => v.version > targetVersion)
      );

      // Update document in database
      await this.vectorDb.storeDocument(revertedDocument);

      // Create a new version record for the revert
      await this.createVersion(
        currentDocument,
        revertedDocument,
        `System (reverted to v${targetVersion})`
      );

      console.log(`Reverted document ${documentId} to version ${targetVersion}`);
      return revertedDocument;
    } catch (error) {
      console.error('Error reverting document:', error);
      throw new Error(`Failed to revert document: ${error.message}`);
    }
  }

  private async applyReverseChanges(
    document: Document,
    versionsToRevert: DocumentVersion[]
  ): Promise<Document> {
    let revertedContent = document.content;
    let revertedTitle = document.title;
    let revertedTags = [...document.tags];

    // Apply changes in reverse chronological order
    versionsToRevert.sort((a, b) => b.version - a.version);

    for (const version of versionsToRevert) {
      const changes = await this.getVersionChanges(version.id);
      
      for (const change of changes.reverse()) {
        if (change.startIndex === -1) {
          // Metadata change
          if (change.oldText && change.oldText.startsWith('[')) {
            try {
              revertedTags = JSON.parse(change.oldText);
            } catch {
              // Ignore invalid JSON
            }
          }
        } else if (change.type === 'add') {
          // Remove the added text
          if (change.newText) {
            revertedContent = revertedContent.replace(change.newText, '');
          }
        } else if (change.type === 'delete') {
          // Add back the deleted text
          if (change.oldText) {
            const beforeText = revertedContent.substring(0, change.startIndex);
            const afterText = revertedContent.substring(change.startIndex);
            revertedContent = beforeText + change.oldText + afterText;
          }
        } else if (change.type === 'modify') {
          // Replace new text with old text
          if (change.newText && change.oldText) {
            if (change.startIndex === 0 && change.endIndex === 0) {
              // Title change
              revertedTitle = change.oldText;
            } else {
              revertedContent = revertedContent.replace(change.newText, change.oldText);
            }
          }
        }
      }
    }

    return {
      ...document,
      content: revertedContent,
      title: revertedTitle,
      tags: revertedTags,
      updatedAt: new Date()
    };
  }

  async compareVersions(
    documentId: string,
    version1: number,
    version2: number
  ): Promise<{
    changes: DocumentChange[];
    summary: string;
  }> {
    const versions = await this.getVersions(documentId);
    const v1 = versions.find(v => v.version === version1);
    const v2 = versions.find(v => v.version === version2);

    if (!v1 || !v2) {
      throw new Error('One or both versions not found');
    }

    // Get changes between versions
    const minVersion = Math.min(version1, version2);
    const maxVersion = Math.max(version1, version2);
    
    const intermediateVersions = versions.filter(
      v => v.version > minVersion && v.version <= maxVersion
    ).sort((a, b) => a.version - b.version);

    const allChanges: DocumentChange[] = [];
    
    for (const version of intermediateVersions) {
      const changes = await this.getVersionChanges(version.id);
      allChanges.push(...changes);
    }

    const summary = this.generateComparisonSummary(allChanges, version1, version2);

    return {
      changes: allChanges,
      summary
    };
  }

  private generateComparisonSummary(
    changes: DocumentChange[],
    fromVersion: number,
    toVersion: number
  ): string {
    const adds = changes.filter(c => c.type === 'add').length;
    const deletes = changes.filter(c => c.type === 'delete').length;
    const modifies = changes.filter(c => c.type === 'modify').length;

    const direction = fromVersion < toVersion ? 'forward' : 'backward';
    const versionRange = `v${Math.min(fromVersion, toVersion)} to v${Math.max(fromVersion, toVersion)}`;

    return `Changes from ${versionRange} (${direction}): ` +
           `${adds} additions, ${deletes} deletions, ${modifies} modifications`;
  }

  async deleteVersionHistory(documentId: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['versions', 'changes'], 'readwrite');
    const versionsStore = transaction.objectStore('versions');
    const changesStore = transaction.objectStore('changes');

    // Get all versions for this document
    const versions = await this.getVersions(documentId);

    // Delete all versions and their changes
    for (const version of versions) {
      await this.promisifyRequest(versionsStore.delete(version.id));
      
      // Delete associated changes
      const changes = await this.getVersionChanges(version.id);
      for (let i = 0; i < changes.length; i++) {
        const changeId = `${version.id}-change-${i}`;
        await this.promisifyRequest(changesStore.delete(changeId));
      }
    }

    console.log(`Deleted version history for document ${documentId}`);
  }

  async getVersionStats(documentId: string): Promise<{
    totalVersions: number;
    totalChanges: number;
    lastModified: Date;
    authors: string[];
  }> {
    const versions = await this.getVersions(documentId);
    
    if (versions.length === 0) {
      return {
        totalVersions: 0,
        totalChanges: 0,
        lastModified: new Date(),
        authors: []
      };
    }

    let totalChanges = 0;
    const authors = new Set<string>();

    for (const version of versions) {
      totalChanges += version.changes.length;
      if (version.author) {
        authors.add(version.author);
      }
    }

    return {
      totalVersions: versions.length,
      totalChanges,
      lastModified: versions[0].createdAt, // Most recent version
      authors: Array.from(authors)
    };
  }

  private promisifyRequest<T>(request: IDBRequest<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async cleanup(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

export default DocumentVersioningService;
