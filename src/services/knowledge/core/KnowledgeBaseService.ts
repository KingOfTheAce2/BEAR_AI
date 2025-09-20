import { Document, KnowledgeBaseConfig, KnowledgeBaseStats, SearchQuery, SearchResult, FacetedSearchResult } from '../../../types/knowledge/types';
import { DocumentIndexer } from '../indexing/DocumentIndexer';
import { SemanticSearchService } from '../search/SemanticSearchService';
import { KnowledgeGraphService } from '../graph/KnowledgeGraphService';
import { RAGService } from '../rag/RAGService';
import { VectorDatabaseService } from '../database/VectorDatabaseService';
import { DocumentVersioningService } from '../versioning/DocumentVersioningService';
import { CitationService } from '../citations/CitationService';
import { AnalyticsService } from '../analytics/AnalyticsService';

export class KnowledgeBaseService {
  private static instance: KnowledgeBaseService;
  
  private documentIndexer!: DocumentIndexer;
  private semanticSearch!: SemanticSearchService;
  private knowledgeGraph!: KnowledgeGraphService;
  private ragService!: RAGService;
  private vectorDb!: VectorDatabaseService;
  private versioning?: DocumentVersioningService;
  private citations?: CitationService;
  private analytics?: AnalyticsService;
  
  private config: KnowledgeBaseConfig = {
    embeddingModel: 'all-MiniLM-L6-v2',
    chunkSize: 512,
    chunkOverlap: 50,
    vectorDimensions: 384,
    indexingBatchSize: 100,
    searchResultLimit: 20,
    enableVersioning: true,
    enableCitations: true,
    enableAnalytics: true
  };

  private constructor() {
    this.initializeServices();
  }

  static getInstance(): KnowledgeBaseService {
    if (!KnowledgeBaseService.instance) {
      KnowledgeBaseService.instance = new KnowledgeBaseService();
    }
    return KnowledgeBaseService.instance;
  }

  private async initializeServices(): Promise<void> {
    // Initialize core services
    this.vectorDb = new VectorDatabaseService(this.config);
    this.documentIndexer = new DocumentIndexer(this.config, this.vectorDb);
    this.semanticSearch = new SemanticSearchService(this.config, this.vectorDb);
    this.knowledgeGraph = new KnowledgeGraphService(this.config, this.vectorDb);
    this.ragService = new RAGService(this.config, this.vectorDb, this.semanticSearch);
    
    if (this.config.enableVersioning) {
      this.versioning = new DocumentVersioningService(this.config, this.vectorDb);
    }
    
    if (this.config.enableCitations) {
      this.citations = new CitationService(this.config, this.vectorDb);
    }
    
    if (this.config.enableAnalytics) {
      this.analytics = new AnalyticsService(this.config, this.vectorDb);
    }

    await this.initializeDatabase();
  }

  private async initializeDatabase(): Promise<void> {
    await this.vectorDb.initialize();
    console.log('Knowledge base services initialized successfully');
  }

  // Document Management
  async addDocument(document: Document): Promise<string> {
    try {
      // Index the document
      const documentId = await this.documentIndexer.indexDocument(document);
      
      // Update knowledge graph
      await this.knowledgeGraph.addDocumentNode(document);
      
      // Track analytics if enabled
      if (this.analytics) {
        await this.analytics.trackDocumentAdded(document);
      }
      
      return documentId;
    } catch (error: unknown) {
      console.error('Error adding document:', error);
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to add document: ${message}`);
    }
  }

  async updateDocument(documentId: string, updates: Partial<Document>): Promise<void> {
    try {
      const existingDoc = await this.getDocument(documentId);
      if (!existingDoc) {
        throw new Error('Document not found');
      }

      // Create version if versioning is enabled
      if (this.versioning) {
        await this.versioning.createVersion(existingDoc, updates);
      }

      // Update the document
      const updatedDoc = { ...existingDoc, ...updates, updatedAt: new Date() };
      await this.documentIndexer.updateDocument(updatedDoc);
      
      // Update knowledge graph
      await this.knowledgeGraph.updateDocumentNode(updatedDoc);
      
      // Track analytics
      if (this.analytics) {
        await this.analytics.trackDocumentUpdated(updatedDoc);
      }
    } catch (error: unknown) {
      console.error('Error updating document:', error);
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to update document: ${message}`);
    }
  }

  async deleteDocument(documentId: string): Promise<void> {
    try {
      const document = await this.getDocument(documentId);
      if (!document) {
        throw new Error('Document not found');
      }

      // Remove from index
      await this.documentIndexer.removeDocument(documentId);
      
      // Remove from knowledge graph
      await this.knowledgeGraph.removeDocumentNode(documentId);
      
      // Remove citations
      if (this.citations) {
        await this.citations.removeCitationsForDocument(documentId);
      }
      
      // Track analytics
      if (this.analytics) {
        await this.analytics.trackDocumentDeleted(document);
      }
    } catch (error: unknown) {
      console.error('Error deleting document:', error);
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to delete document: ${message}`);
    }
  }

  async getDocument(documentId: string): Promise<Document | null> {
    return await this.vectorDb.getDocument(documentId);
  }

  async getAllDocuments(): Promise<Document[]> {
    return await this.vectorDb.getAllDocuments();
  }

  // Search Operations
  async search(query: SearchQuery): Promise<SearchResult[]> {
    try {
      return await this.semanticSearch.search(query);
    } catch (error: unknown) {
      console.error('Error performing search:', error);
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Search failed: ${message}`);
    }
  }

  async facetedSearch(query: SearchQuery): Promise<FacetedSearchResult> {
    try {
      return await this.semanticSearch.facetedSearch(query);
    } catch (error: unknown) {
      console.error('Error performing faceted search:', error);
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Faceted search failed: ${message}`);
    }
  }

  // RAG Operations
  async retrieveContext(query: string, maxChunks: number = 5): Promise<any> {
    if (!this.ragService) {
      throw new Error('RAG service not initialized');
    }
    return await this.ragService.retrieveContext(query, maxChunks);
  }

  async generateResponse(query: string, context?: any): Promise<string> {
    if (!this.ragService) {
      throw new Error('RAG service not initialized');
    }
    return await this.ragService.generateResponse(query, context);
  }

  // Knowledge Graph Operations
  async getKnowledgeGraph(): Promise<any> {
    return await this.knowledgeGraph.getGraph();
  }

  async findSimilarDocuments(documentId: string, limit: number = 10): Promise<Document[]> {
    return await this.knowledgeGraph.findSimilarDocuments(documentId, limit);
  }

  async getDocumentClusters(): Promise<any[]> {
    return await this.knowledgeGraph.getClusters();
  }

  // Citations
  async getCitations(documentId: string): Promise<any[]> {
    if (!this.citations) {
      throw new Error('Citations service not enabled');
    }
    return await this.citations.getCitationsForDocument(documentId);
  }

  async createCitation(documentId: string, chunkId: string, context: string): Promise<string> {
    if (!this.citations) {
      throw new Error('Citations service not enabled');
    }
    return await this.citations.createCitation(documentId, chunkId, context);
  }

  // Versioning
  async getDocumentVersions(documentId: string): Promise<any[]> {
    if (!this.versioning) {
      throw new Error('Versioning service not enabled');
    }
    return await this.versioning.getVersions(documentId);
  }

  async revertToVersion(documentId: string, version: number): Promise<void> {
    if (!this.versioning) {
      throw new Error('Versioning service not enabled');
    }
    await this.versioning.revertToVersion(documentId, version);
  }

  // Analytics
  async getStats(): Promise<KnowledgeBaseStats> {
    const baseStats = await this.vectorDb.getStats();
    
    if (this.analytics) {
      const analyticsData = await this.analytics.getOverallStats();
      return { ...baseStats, ...analyticsData };
    }
    
    return baseStats;
  }

  async getAnalytics(query: any): Promise<any> {
    if (!this.analytics) {
      throw new Error('Analytics service not enabled');
    }
    return await this.analytics.runQuery(query);
  }

  // Configuration
  updateConfig(newConfig: Partial<KnowledgeBaseConfig>): void {
    this.config = { ...this.config, ...newConfig };
    // Reinitialize services if needed
    this.initializeServices();
  }

  getConfig(): KnowledgeBaseConfig {
    return { ...this.config };
  }

  // Bulk Operations
  async bulkAddDocuments(documents: Document[]): Promise<string[]> {
    const results: string[] = [];
    const batchSize = this.config.indexingBatchSize;
    
    for (let i = 0; i < documents.length; i += batchSize) {
      const batch = documents.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(doc => this.addDocument(doc))
      );
      results.push(...batchResults);
    }
    
    return results;
  }

  async reindexAllDocuments(): Promise<void> {
    try {
      console.log('Starting full reindex...');
      const documents = await this.getAllDocuments();
      
      // Clear existing index
      await this.vectorDb.clear();
      
      // Reindex all documents
      await this.bulkAddDocuments(documents);
      
      console.log(`Reindexed ${documents.length} documents`);
    } catch (error: unknown) {
      console.error('Error during reindexing:', error);
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Reindexing failed: ${message}`);
    }
  }

  // Cleanup and maintenance
  async optimize(): Promise<void> {
    await this.vectorDb.optimize();
    await this.knowledgeGraph.optimize();
    console.log('Knowledge base optimization completed');
  }

  async cleanup(): Promise<void> {
    await this.vectorDb.cleanup();
    console.log('Knowledge base cleanup completed');
  }
}

export default KnowledgeBaseService;
