
import { Document, DocumentChunk, KnowledgeBaseConfig, KnowledgeBaseStats, VectorIndex } from '../../../types/knowledge/types';

interface DBSchema {
  documents: {
    key: string;
    value: Document;
    indexes: {
      'by-category': string;
      'by-tags': string[];
      'by-date': Date;
      'by-language': string;
    };
  };
  chunks: {
    key: string;
    value: DocumentChunk;
    indexes: {
      'by-document': string;
      'by-tokens': number;
    };
  };
  embeddings: {
    key: string;
    value: {
      id: string;
      embedding: Float32Array;
      type: 'document' | 'chunk';
      metadata: any;
    };
  };
  vectors: {
    key: string;
    value: VectorIndex;
  };
  metadata: {
    key: string;
    value: any;
  };
}

export class VectorDatabaseService {
  private dbName = 'knowledge-base-db';
  private version = 1;
  private db: IDBDatabase | null = null;
  private config: KnowledgeBaseConfig;
  private vectorIndex: Map<string, Float32Array> = new Map();
  private documentCache: Map<string, Document> = new Map();

  constructor(config: KnowledgeBaseConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.setupErrorHandling();
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        this.createObjectStores(db);
      };
    });
  }

  private createObjectStores(db: IDBDatabase): void {
    // Documents store
    if (!db.objectStoreNames.contains('documents')) {
      const documentsStore = db.createObjectStore('documents', { keyPath: 'id' });
      documentsStore.createIndex('by-category', 'category');
      documentsStore.createIndex('by-tags', 'tags', { multiEntry: true });
      documentsStore.createIndex('by-date', 'createdAt');
      documentsStore.createIndex('by-language', 'language');
    }

    // Chunks store
    if (!db.objectStoreNames.contains('chunks')) {
      const chunksStore = db.createObjectStore('chunks', { keyPath: 'id' });
      chunksStore.createIndex('by-document', 'documentId');
      chunksStore.createIndex('by-tokens', 'tokens');
    }

    // Embeddings store
    if (!db.objectStoreNames.contains('embeddings')) {
      const embeddingsStore = db.createObjectStore('embeddings', { keyPath: 'id' });
    }

    // Vector index store
    if (!db.objectStoreNames.contains('vectors')) {
      const vectorsStore = db.createObjectStore('vectors', { keyPath: 'id' });
    }

    // Metadata store
    if (!db.objectStoreNames.contains('metadata')) {
      const metadataStore = db.createObjectStore('metadata', { keyPath: 'key' });
    }
  }

  private setupErrorHandling(): void {
    if (this.db) {
      this.db.onerror = (event) => {
        console.error('Database error:', event);
      };
    }
  }

  // Document operations
  async storeDocument(document: Document): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['documents', 'chunks', 'embeddings'], 'readwrite');
    const documentsStore = transaction.objectStore('documents');
    const chunksStore = transaction.objectStore('chunks');
    const embeddingsStore = transaction.objectStore('embeddings');

    // Store document
    await this.promisifyRequest(documentsStore.put(document));

    // Store chunks
    for (const chunk of document.chunks) {
      await this.promisifyRequest(chunksStore.put(chunk));

      // Store chunk embedding if available
      if (chunk.embedding) {
        await this.promisifyRequest(embeddingsStore.put({
          id: `chunk-${chunk.id}`,
          embedding: chunk.embedding,
          type: 'chunk',
          metadata: { documentId: document.id, chunkId: chunk.id }
        }));
        
        // Cache vector for similarity search
        this.vectorIndex.set(`chunk-${chunk.id}`, chunk.embedding);
      }
    }

    // Store document embeddings if available
    if (document.embeddings) {
      for (let i = 0; i < document.embeddings.length; i++) {
        await this.promisifyRequest(embeddingsStore.put({
          id: `doc-${document.id}-${i}`,
          embedding: document.embeddings[i],
          type: 'document',
          metadata: { documentId: document.id, index: i }
        }));
        
        // Cache vector
        this.vectorIndex.set(`doc-${document.id}-${i}`, document.embeddings[i]);
      }
    }

    // Cache document
    this.documentCache.set(document.id, document);
  }

  async getDocument(id: string): Promise<Document | null> {
    // Check cache first
    if (this.documentCache.has(id)) {
      return this.documentCache.get(id) || null;
    }

    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['documents'], 'readonly');
    const store = transaction.objectStore('documents');
    
    try {
      const document = await this.promisifyRequest(store.get(id)) as Document;
      if (document) {
        this.documentCache.set(id, document);
      }
      return document || null;
    } catch {
      return null;
    }
  }

  async getAllDocuments(): Promise<Document[]> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['documents'], 'readonly');
    const store = transaction.objectStore('documents');
    
    const documents = await this.promisifyRequest(store.getAll()) as Document[];
    
    // Update cache
    documents.forEach(doc => this.documentCache.set(doc.id, doc));
    
    return documents;
  }

  async deleteDocument(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['documents', 'chunks', 'embeddings'], 'readwrite');
    const documentsStore = transaction.objectStore('documents');
    const chunksStore = transaction.objectStore('chunks');
    const embeddingsStore = transaction.objectStore('embeddings');

    // Delete document
    await this.promisifyRequest(documentsStore.delete(id));

    // Delete chunks
    const chunkIndex = chunksStore.index('by-document');
    const chunkCursor = await this.promisifyRequest<IDBCursorWithValue | null>(
      chunkIndex.openCursor(id)
    );
    
    if (chunkCursor) {
      await this.walkCursor(chunkCursor, async (cursor) => {
        const chunk = cursor.value as DocumentChunk;
        
        // Delete chunk
        await this.promisifyRequest(chunksStore.delete(chunk.id));
        
        // Delete chunk embedding
        try {
          await this.promisifyRequest(embeddingsStore.delete(`chunk-${chunk.id}`));
          this.vectorIndex.delete(`chunk-${chunk.id}`);
        } catch {
          // Embedding might not exist
        }
      });
    }

    // Delete document embeddings
    const embeddingKeys = Array.from(this.vectorIndex.keys()).filter(key => 
      key.startsWith(`doc-${id}-`)
    );
    
    for (const key of embeddingKeys) {
      try {
        await this.promisifyRequest(embeddingsStore.delete(key));
        this.vectorIndex.delete(key);
      } catch {
        // Embedding might not exist
      }
    }

    // Remove from cache
    this.documentCache.delete(id);
  }

  // Vector operations
  async storeEmbedding(id: string, embedding: Float32Array, type: 'document' | 'chunk', metadata: any): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['embeddings'], 'readwrite');
    const store = transaction.objectStore('embeddings');

    await this.promisifyRequest(store.put({
      id,
      embedding,
      type,
      metadata
    }));

    // Cache vector
    this.vectorIndex.set(id, embedding);
  }

  async getEmbedding(id: string): Promise<Float32Array | null> {
    // Check cache first
    if (this.vectorIndex.has(id)) {
      return this.vectorIndex.get(id) || null;
    }

    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['embeddings'], 'readonly');
    const store = transaction.objectStore('embeddings');
    
    try {
      const result = await this.promisifyRequest(store.get(id));
      if (result) {
        this.vectorIndex.set(id, result.embedding);
        return result.embedding;
      }
      return null;
    } catch {
      return null;
    }
  }

  async findSimilarVectors(queryEmbedding: Float32Array, limit: number = 10): Promise<Array<{ id: string; similarity: number; metadata: any }>> {
    const results: Array<{ id: string; similarity: number; metadata: any }> = [];

    // Search in cache first (faster)
    for (const [id, embedding] of this.vectorIndex) {
      const similarity = this.cosineSimilarity(queryEmbedding, embedding);
      results.push({ id, similarity, metadata: {} });
    }

    // Sort by similarity and limit results
    results.sort((a, b) => b.similarity - a.similarity);
    
    // Get metadata for top results
    if (this.db) {
      const transaction = this.db.transaction(['embeddings'], 'readonly');
      const store = transaction.objectStore('embeddings');
      
      const topResults = results.slice(0, limit);
      for (const result of topResults) {
        try {
          const embeddingData = await this.promisifyRequest(store.get(result.id));
          if (embeddingData) {
            result.metadata = embeddingData.metadata;
          }
        } catch {
          // Metadata might not exist
        }
      }
    }

    return results.slice(0, limit);
  }

  // Similarity calculations
  private cosineSimilarity(a: Float32Array, b: Float32Array): number {
    if (a.length !== b.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  private euclideanDistance(a: Float32Array, b: Float32Array): number {
    if (a.length !== b.length) return Infinity;
    
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      const diff = a[i] - b[i];
      sum += diff * diff;
    }
    
    return Math.sqrt(sum);
  }

  // Chunk operations
  async getDocumentChunks(documentId: string): Promise<DocumentChunk[]> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['chunks'], 'readonly');
    const store = transaction.objectStore('chunks');
    const index = store.index('by-document');
    
    const chunks = await this.promisifyRequest(index.getAll(documentId)) as DocumentChunk[];
    return chunks.sort((a, b) => a.chunkIndex - b.chunkIndex);
  }

  async getChunk(chunkId: string): Promise<DocumentChunk | null> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['chunks'], 'readonly');
    const store = transaction.objectStore('chunks');
    
    try {
      return await this.promisifyRequest(store.get(chunkId)) as DocumentChunk || null;
    } catch {
      return null;
    }
  }

  // Search operations
  async searchDocuments(filters: any): Promise<Document[]> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['documents'], 'readonly');
    const store = transaction.objectStore('documents');
    
    let results: Document[] = [];
    
    if (filters.category) {
      const index = store.index('by-category');
      results = await this.promisifyRequest(index.getAll(filters.category)) as Document[];
    } else if (filters.tags && filters.tags.length > 0) {
      const index = store.index('by-tags');
      const allResults = new Set<Document>();
      
      for (const tag of filters.tags) {
        const tagResults = await this.promisifyRequest(index.getAll(tag)) as Document[];
        tagResults.forEach(doc => allResults.add(doc));
      }
      
      results = Array.from(allResults);
    } else {
      results = await this.promisifyRequest(store.getAll()) as Document[];
    }

    // Apply additional filters
    return results.filter(doc => {
      if (filters.dateRange) {
        const docDate = new Date(doc.createdAt);
        if (docDate < filters.dateRange.start || docDate > filters.dateRange.end) {
          return false;
        }
      }
      
      if (filters.language && doc.language !== filters.language) {
        return false;
      }
      
      if (filters.fileTypes && filters.fileTypes.length > 0 && 
          !filters.fileTypes.includes(doc.fileType)) {
        return false;
      }
      
      return true;
    });
  }

  // Statistics and monitoring
  async getStats(): Promise<KnowledgeBaseStats> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['documents', 'chunks', 'embeddings'], 'readonly');
    
    const documentsCount = await this.getObjectCount(transaction.objectStore('documents'));
    const chunksCount = await this.getObjectCount(transaction.objectStore('chunks'));
    const embeddingsCount = await this.getObjectCount(transaction.objectStore('embeddings'));
    
    // Calculate storage sizes (approximate)
    const documents = await this.promisifyRequest(transaction.objectStore('documents').getAll()) as Document[];
    const documentsSize = this.calculateSize(documents);
    
    const chunks = await this.promisifyRequest(transaction.objectStore('chunks').getAll()) as DocumentChunk[];
    const chunksSize = this.calculateSize(chunks);
    
    const embeddingsSize = embeddingsCount * this.config.vectorDimensions * 4; // 4 bytes per float32

    return {
      totalDocuments: documentsCount,
      totalChunks: chunksCount,
      totalEmbeddings: embeddingsCount,
      indexSize: this.vectorIndex.size,
      lastIndexed: new Date(),
      avgProcessingTime: 0,
      searchPerformance: {
        avgQueryTime: 0,
        totalQueries: 0,
        successRate: 1.0
      },
      storage: {
        documentsSize,
        embeddingsSize,
        indexSize: embeddingsSize, // Approximate
        totalSize: documentsSize + embeddingsSize
      }
    };
  }

  private async getObjectCount(store: IDBObjectStore): Promise<number> {
    return await this.promisifyRequest(store.count());
  }

  private calculateSize(objects: any[]): number {
    return JSON.stringify(objects).length;
  }

  // Maintenance operations
  async optimize(): Promise<void> {
    // Rebuild vector index for better performance
    this.vectorIndex.clear();
    
    if (!this.db) return;
    
    const transaction = this.db.transaction(['embeddings'], 'readonly');
    const store = transaction.objectStore('embeddings');
    
    const cursor = await this.promisifyRequest<IDBCursorWithValue | null>(store.openCursor());
    if (cursor) {
      await this.walkCursor(cursor, async (cursor) => {
        const data = cursor.value;
        this.vectorIndex.set(data.id, data.embedding);
      });
    }
    
    console.log('Vector index optimized');
  }

  async clear(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['documents', 'chunks', 'embeddings', 'vectors'], 'readwrite');
    
    await Promise.all([
      this.promisifyRequest(transaction.objectStore('documents').clear()),
      this.promisifyRequest(transaction.objectStore('chunks').clear()),
      this.promisifyRequest(transaction.objectStore('embeddings').clear()),
      this.promisifyRequest(transaction.objectStore('vectors').clear())
    ]);
    
    this.vectorIndex.clear();
    this.documentCache.clear();
  }

  async cleanup(): Promise<void> {
    this.documentCache.clear();
    this.vectorIndex.clear();
    
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  // Helper methods
  private promisifyRequest<T>(request: IDBRequest<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  private async walkCursor(
    cursor: IDBCursorWithValue | null,
    callback: (cursor: IDBCursorWithValue) => Promise<void>
  ): Promise<void> {
    let current = cursor;

    while (current) {
      await callback(current);

      current = await new Promise<IDBCursorWithValue | null>((resolve, reject) => {
        const request = current!.request as IDBRequest<IDBCursorWithValue | null>;
        request.onsuccess = () => resolve(request.result as IDBCursorWithValue | null);
        request.onerror = () => reject(request.error);
        current!.continue();
      });
    }
  }
}

export default VectorDatabaseService;
