
import { Citation, Document, DocumentChunk, KnowledgeBaseConfig } from '../../../types/knowledge/types';
import { VectorDatabaseService } from '../database/VectorDatabaseService';

export class CitationService {
  private vectorDb: VectorDatabaseService;
  private config: KnowledgeBaseConfig;
  private dbName = 'citations-db';
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
        reject(new Error('Failed to open citations database'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains('citations')) {
          const citationsStore = db.createObjectStore('citations', { keyPath: 'id' });
          citationsStore.createIndex('by-document', 'documentId');
          citationsStore.createIndex('by-chunk', 'chunkId');
          citationsStore.createIndex('by-date', 'createdAt');
          citationsStore.createIndex('by-confidence', 'confidence');
        }
        
        if (!db.objectStoreNames.contains('citation-contexts')) {
          const contextsStore = db.createObjectStore('citation-contexts', { keyPath: 'id' });
          contextsStore.createIndex('by-citation', 'citationId');
        }
      };
    });
  }

  async createCitation(
    documentId: string,
    chunkId: string,
    context: string,
    options: {
      text?: string;
      pageNumber?: number;
      startIndex?: number;
      endIndex?: number;
      confidence?: number;
    } = {}
  ): Promise<string> {
    if (!this.db) throw new Error('Citations database not initialized');

    try {
      // Validate document and chunk exist
      const document = await this.vectorDb.getDocument(documentId);
      if (!document) {
        throw new Error('Document not found');
      }

      const chunk = await this.vectorDb.getChunk(chunkId);
      if (!chunk || chunk.documentId !== documentId) {
        throw new Error('Chunk not found or does not belong to document');
      }

      // Extract citation text if not provided
      const citationText = options.text || this.extractCitationText(chunk, context);
      
      // Calculate confidence if not provided
      const confidence = options.confidence !== undefined 
        ? options.confidence 
        : this.calculateCitationConfidence(citationText, context, chunk);

      // Create citation
      const citation: Citation = {
        id: this.generateCitationId(documentId, chunkId),
        documentId,
        chunkId,
        text: citationText,
        pageNumber: options.pageNumber,
        startIndex: options.startIndex || 0,
        endIndex: options.endIndex || citationText.length,
        context,
        confidence,
        createdAt: new Date()
      };

      // Store citation
      await this.storeCitation(citation);

      // Store extended context information
      await this.storeCitationContext(citation.id, context, chunk);

      // Logging disabled for production
      return citation.id;
    } catch (error: unknown) {
      // Error logging disabled for production
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to create citation: ${message}`);
    }
  }

  private extractCitationText(chunk: DocumentChunk, context: string): string {
    // Find the most relevant sentence(s) in the chunk for the given context
    const sentences = chunk.content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const contextWords = context.toLowerCase().split(/\s+/);
    
    // Score sentences based on context relevance
    const scoredSentences = sentences.map(sentence => {
      const sentenceWords = sentence.toLowerCase().split(/\s+/);
      const overlap = contextWords.filter(word => 
        sentenceWords.some(sw => sw.includes(word) || word.includes(sw))
      ).length;
      
      return {
        sentence: sentence.trim(),
        score: overlap / Math.max(contextWords.length, sentenceWords.length)
      };
    });

    // Return the highest scoring sentence(s)
    scoredSentences.sort((a, b) => b.score - a.score);
    
    if (scoredSentences.length === 0) {
      return chunk.content.substring(0, 200) + '...';
    }

    // Return top sentence, or combine top 2 if they're both highly relevant
    if (scoredSentences.length > 1 && 
        scoredSentences[0].score > 0.3 && 
        scoredSentences[1].score > 0.2) {
      return `${scoredSentences[0].sentence}. ${scoredSentences[1].sentence}.`;
    }

    return scoredSentences[0].sentence + '.';
  }

  private calculateCitationConfidence(
    citationText: string, 
    context: string, 
    chunk: DocumentChunk
  ): number {
    let confidence = 0.5; // Base confidence

    // Boost for exact matches in citation text
    const contextLower = context.toLowerCase();
    const citationLower = citationText.toLowerCase();
    
    const contextWords = contextLower.split(/\s+/);
    const exactMatches = contextWords.filter(word => 
      citationLower.includes(word) && word.length > 3
    ).length;
    
    confidence += (exactMatches / contextWords.length) * 0.3;

    // Boost for chunk importance
    const chunkImportance = chunk.metadata.importance || 0.5;
    confidence += chunkImportance * 0.2;

    // Penalty for very short citations
    if (citationText.length < 50) {
      confidence -= 0.1;
    }

    // Boost for citations with specific entities or concepts
    if (chunk.metadata.entityMentions && chunk.metadata.entityMentions.length > 0) {
      confidence += 0.1;
    }

    return Math.max(0.1, Math.min(1.0, confidence));
  }

  private async storeCitation(citation: Citation): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['citations'], 'readwrite');
    const store = transaction.objectStore('citations');
    
    await this.promisifyRequest(store.put(citation));
  }

  private async storeCitationContext(
    citationId: string, 
    context: string, 
    chunk: DocumentChunk
  ): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['citation-contexts'], 'readwrite');
    const store = transaction.objectStore('citation-contexts');
    
    const contextRecord = {
      id: `${citationId}-context`,
      citationId,
      originalContext: context,
      chunkContent: chunk.content,
      surroundingChunks: await this.getSurroundingChunks(chunk),
      extractedAt: new Date()
    };
    
    await this.promisifyRequest(store.put(contextRecord));
  }

  private async getSurroundingChunks(chunk: DocumentChunk): Promise<DocumentChunk[]> {
    try {
      const allChunks = await this.vectorDb.getDocumentChunks(chunk.documentId);
      const chunkIndex = allChunks.findIndex(c => c.id === chunk.id);
      
      if (chunkIndex === -1) return [];
      
      const surroundingChunks: DocumentChunk[] = [];
      
      // Get previous chunk
      if (chunkIndex > 0) {
        surroundingChunks.push(allChunks[chunkIndex - 1]);
      }
      
      // Get next chunk
      if (chunkIndex < allChunks.length - 1) {
        surroundingChunks.push(allChunks[chunkIndex + 1]);
      }
      
      return surroundingChunks;
    } catch {
      return [];
    }
  }

  private generateCitationId(documentId: string, chunkId: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `cite-${documentId.substring(0, 8)}-${chunkId.substring(0, 8)}-${timestamp}-${random}`;
  }

  async getCitation(citationId: string): Promise<Citation | null> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['citations'], 'readonly');
    const store = transaction.objectStore('citations');
    
    const citation = await this.promisifyRequest(store.get(citationId)) as Citation;
    return citation || null;
  }

  async getCitationsForDocument(documentId: string): Promise<Citation[]> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['citations'], 'readonly');
    const store = transaction.objectStore('citations');
    const index = store.index('by-document');
    
    const citations = await this.promisifyRequest(index.getAll(documentId)) as Citation[];
    
    // Sort by creation date (most recent first)
    return citations.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getCitationsForChunk(chunkId: string): Promise<Citation[]> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['citations'], 'readonly');
    const store = transaction.objectStore('citations');
    const index = store.index('by-chunk');
    
    const citations = await this.promisifyRequest(index.getAll(chunkId)) as Citation[];
    
    return citations.sort((a, b) => b.confidence - a.confidence);
  }

  async searchCitations(
    query: string, 
    filters: {
      documentIds?: string[];
      minConfidence?: number;
      dateRange?: { start: Date; end: Date };
    } = {}
  ): Promise<Citation[]> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['citations'], 'readonly');
    const store = transaction.objectStore('citations');
    
    let citations = await this.promisifyRequest(store.getAll()) as Citation[];
    
    // Apply filters
    if (filters.documentIds && filters.documentIds.length > 0) {
      citations = citations.filter(c => filters.documentIds!.includes(c.documentId));
    }
    
    if (filters.minConfidence !== undefined) {
      citations = citations.filter(c => c.confidence >= filters.minConfidence!);
    }
    
    if (filters.dateRange) {
      citations = citations.filter(c => 
        c.createdAt >= filters.dateRange!.start && 
        c.createdAt <= filters.dateRange!.end
      );
    }

    // Text search
    const queryLower = query.toLowerCase();
    const matchingCitations = citations.filter(citation => {
      return citation.text.toLowerCase().includes(queryLower) ||
             citation.context.toLowerCase().includes(queryLower);
    });

    // Score by relevance
    const scoredCitations = matchingCitations.map(citation => ({
      citation,
      relevanceScore: this.calculateSearchRelevance(citation, query)
    }));

    // Sort by relevance score
    scoredCitations.sort((a, b) => b.relevanceScore - a.relevanceScore);
    
    return scoredCitations.map(sc => sc.citation);
  }

  private calculateSearchRelevance(citation: Citation, query: string): number {
    const queryWords = query.toLowerCase().split(/\s+/);
    const citationText = citation.text.toLowerCase();
    const contextText = citation.context.toLowerCase();
    
    let score = 0;
    
    // Exact matches in citation text (high weight)
    for (const word of queryWords) {
      if (citationText.includes(word)) {
        score += 1.0;
      }
    }
    
    // Matches in context (medium weight)
    for (const word of queryWords) {
      if (contextText.includes(word)) {
        score += 0.5;
      }
    }
    
    // Boost for high-confidence citations
    score += citation.confidence * 0.5;
    
    return score;
  }

  async generateBibliography(
    citationIds: string[],
    style: 'APA' | 'MLA' | 'Chicago' | 'Harvard' = 'APA'
  ): Promise<string[]> {
    const citations = await Promise.all(
      citationIds.map(id => this.getCitation(id))
    );
    
    const validCitations = citations.filter(c => c !== null) as Citation[];
    const bibliography: string[] = [];
    
    for (const citation of validCitations) {
      const document = await this.vectorDb.getDocument(citation.documentId);
      if (!document) continue;
      
      const bibEntry = this.formatCitation(citation, document, style);
      if (bibEntry) {
        bibliography.push(bibEntry);
      }
    }
    
    // Remove duplicates and sort alphabetically
    const uniqueEntries = [...new Set(bibliography)];
    return uniqueEntries.sort();
  }

  private formatCitation(
    citation: Citation, 
    document: Document, 
    style: 'APA' | 'MLA' | 'Chicago' | 'Harvard'
  ): string | null {
    const author = document.metadata.author || 'Unknown Author';
    const title = document.title;
    const year = new Date(document.createdAt).getFullYear();
    const pageNumber = citation.pageNumber;
    
    switch (style) {
      case 'APA':
        return this.formatAPACitation(author, title, year, pageNumber);
      case 'MLA':
        return this.formatMLACitation(author, title, year, pageNumber);
      case 'Chicago':
        return this.formatChicagoCitation(author, title, year, pageNumber);
      case 'Harvard':
        return this.formatHarvardCitation(author, title, year, pageNumber);
      default:
        return null;
    }
  }

  private formatAPACitation(
    author: string, 
    title: string, 
    year: number, 
    pageNumber?: number
  ): string {
    const authorFormatted = this.formatAuthorAPA(author);
    const pageRef = pageNumber ? `, p. ${pageNumber}` : '';
    return `${authorFormatted} (${year}). ${title}${pageRef}.`;
  }

  private formatMLACitation(
    author: string, 
    title: string, 
    year: number, 
    pageNumber?: number
  ): string {
    const authorFormatted = this.formatAuthorMLA(author);
    const pageRef = pageNumber ? ` ${pageNumber}` : '';
    return `${authorFormatted}. "${title}." ${year}.${pageRef}`;
  }

  private formatChicagoCitation(
    author: string, 
    title: string, 
    year: number, 
    pageNumber?: number
  ): string {
    const pageRef = pageNumber ? `, ${pageNumber}` : '';
    return `${author}. "${title}." Accessed ${year}${pageRef}.`;
  }

  private formatHarvardCitation(
    author: string, 
    title: string, 
    year: number, 
    pageNumber?: number
  ): string {
    const authorFormatted = this.formatAuthorHarvard(author);
    const pageRef = pageNumber ? `, p.${pageNumber}` : '';
    return `${authorFormatted}, ${year}. ${title}${pageRef}.`;
  }

  private formatAuthorAPA(author: string): string {
    if (author.includes(',')) return author; // Already formatted
    const parts = author.split(' ');
    if (parts.length >= 2) {
      const lastName = parts[parts.length - 1];
      const firstNames = parts.slice(0, -1).map(name => name.charAt(0) + '.').join(' ');
      return `${lastName}, ${firstNames}`;
    }
    return author;
  }

  private formatAuthorMLA(author: string): string {
    const parts = author.split(' ');
    if (parts.length >= 2) {
      const lastName = parts[parts.length - 1];
      const firstNames = parts.slice(0, -1).join(' ');
      return `${lastName}, ${firstNames}`;
    }
    return author;
  }

  private formatAuthorHarvard(author: string): string {
    return this.formatAuthorAPA(author); // Same as APA
  }

  async updateCitation(
    citationId: string, 
    updates: Partial<Citation>
  ): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const existingCitation = await this.getCitation(citationId);
    if (!existingCitation) {
      throw new Error('Citation not found');
    }

    const updatedCitation = {
      ...existingCitation,
      ...updates,
      id: citationId // Ensure ID doesn't change
    };

    const transaction = this.db.transaction(['citations'], 'readwrite');
    const store = transaction.objectStore('citations');
    
    await this.promisifyRequest(store.put(updatedCitation));
    
    // Logging disabled for production
  }

  async deleteCitation(citationId: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['citations', 'citation-contexts'], 'readwrite');
    const citationsStore = transaction.objectStore('citations');
    const contextsStore = transaction.objectStore('citation-contexts');
    
    // Delete citation
    await this.promisifyRequest(citationsStore.delete(citationId));
    
    // Delete associated context
    const contextId = `${citationId}-context`;
    try {
      await this.promisifyRequest(contextsStore.delete(contextId));
    } catch {
      // Context might not exist
    }
    
    // Logging disabled for production
  }

  async removeCitationsForDocument(documentId: string): Promise<void> {
    const citations = await this.getCitationsForDocument(documentId);
    
    for (const citation of citations) {
      await this.deleteCitation(citation.id);
    }
    
    // Logging disabled for production
  }

  async getCitationStats(): Promise<{
    totalCitations: number;
    averageConfidence: number;
    citationsByDocument: Map<string, number>;
    recentCitations: number;
  }> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['citations'], 'readonly');
    const store = transaction.objectStore('citations');
    
    const allCitations = await this.promisifyRequest(store.getAll()) as Citation[];
    
    if (allCitations.length === 0) {
      return {
        totalCitations: 0,
        averageConfidence: 0,
        citationsByDocument: new Map(),
        recentCitations: 0
      };
    }

    // Calculate average confidence
    const avgConfidence = allCitations.reduce((sum, c) => sum + c.confidence, 0) / allCitations.length;
    
    // Citations by document
    const citationsByDocument = new Map<string, number>();
    for (const citation of allCitations) {
      citationsByDocument.set(
        citation.documentId, 
        (citationsByDocument.get(citation.documentId) || 0) + 1
      );
    }
    
    // Recent citations (last 7 days)
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const recentCitations = allCitations.filter(c => c.createdAt >= oneWeekAgo).length;
    
    return {
      totalCitations: allCitations.length,
      averageConfidence: avgConfidence,
      citationsByDocument,
      recentCitations
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

export default CitationService;
