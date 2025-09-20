
import { RAGContext, DocumentChunk, Document, KnowledgeBaseConfig, SearchQuery } from '../../../types/knowledge/types';
import { VectorDatabaseService } from '../database/VectorDatabaseService';
import { SemanticSearchService } from '../search/SemanticSearchService';
import { EmbeddingService } from '../indexing/EmbeddingService';

export class RAGService {
  private vectorDb: VectorDatabaseService;
  private searchService: SemanticSearchService;
  private embeddingService: EmbeddingService;
  private config: KnowledgeBaseConfig;
  private contextCache: Map<string, RAGContext> = new Map();
  private cacheTimeout: number = 10 * 60 * 1000; // 10 minutes

  constructor(
    config: KnowledgeBaseConfig,
    vectorDb: VectorDatabaseService,
    searchService: SemanticSearchService
  ) {
    this.config = config;
    this.vectorDb = vectorDb;
    this.searchService = searchService;
    this.embeddingService = new EmbeddingService(config.embeddingModel);
  }

  async retrieveContext(query: string, maxChunks: number = 5): Promise<RAGContext> {
    const startTime = Date.now();
    
    try {
      // Check cache first
      const cacheKey = `${query}-${maxChunks}`;
      const cachedContext = this.contextCache.get(cacheKey);
      if (cachedContext) {
        console.log('Returning cached RAG context');
        return cachedContext;
      }

      console.log(`Retrieving context for query: "${query}"`);

      // Phase 1: Semantic retrieval
      const semanticChunks = await this.performSemanticRetrieval(query, maxChunks * 2);

      // Phase 2: Re-ranking based on relevance and diversity
      const rankedChunks = await this.rerankChunks(query, semanticChunks, maxChunks);

      // Phase 3: Context assembly and optimization
      const context = await this.assembleContext(query, rankedChunks);

      // Cache the result
      this.contextCache.set(cacheKey, context);
      setTimeout(() => {
        this.contextCache.delete(cacheKey);
      }, this.cacheTimeout);

      const retrievalTime = Date.now() - startTime;
      console.log(`Context retrieval completed in ${retrievalTime}ms`);

      return context;
    } catch (error) {
      console.error('Error retrieving context:', error);
      throw new Error(`Context retrieval failed: ${error.message}`);
    }
  }

  private async performSemanticRetrieval(query: string, maxResults: number): Promise<DocumentChunk[]> {
    // Generate embedding for the query
    const queryEmbedding = await this.embeddingService.generateEmbedding(query);

    // Find similar vectors (chunks)
    const similarVectors = await this.vectorDb.findSimilarVectors(queryEmbedding, maxResults);

    const chunks: DocumentChunk[] = [];
    const processedDocuments = new Set<string>();

    for (const similar of similarVectors) {
      if (similar.similarity < 0.4) continue; // Minimum similarity threshold

      const { chunkId, documentId } = this.parseVectorId(similar.id);
      
      if (chunkId) {
        const chunk = await this.vectorDb.getChunk(chunkId);
        if (chunk) {
          chunks.push(chunk);
        }
      } else if (documentId && !processedDocuments.has(documentId)) {
        // If no specific chunk, get the most relevant chunks from the document
        const document = await this.vectorDb.getDocument(documentId);
        if (document) {
          const topChunks = await this.selectTopChunksFromDocument(document, query, 2);
          chunks.push(...topChunks);
          processedDocuments.add(documentId);
        }
      }
    }

    return chunks;
  }

  private async selectTopChunksFromDocument(
    document: Document, 
    query: string, 
    maxChunks: number
  ): Promise<DocumentChunk[]> {
    const queryEmbedding = await this.embeddingService.generateEmbedding(query);
    
    // Score chunks based on semantic similarity and importance
    const scoredChunks = document.chunks.map(chunk => ({
      chunk,
      score: this.calculateChunkRelevanceScore(chunk, query, queryEmbedding)
    }));

    // Sort by score and return top chunks
    scoredChunks.sort((a, b) => b.score - a.score);
    
    return scoredChunks.slice(0, maxChunks).map(sc => sc.chunk);
  }

  private calculateChunkRelevanceScore(
    chunk: DocumentChunk, 
    query: string, 
    queryEmbedding: Float32Array
  ): number {
    let score = 0;

    // Semantic similarity (if chunk has embedding)
    if (chunk.embedding) {
      const semanticSimilarity = EmbeddingService.cosineSimilarity(queryEmbedding, chunk.embedding);
      score += semanticSimilarity * 0.6;
    }

    // Keyword overlap
    const queryTerms = query.toLowerCase().split(/\s+/);
    const chunkText = chunk.content.toLowerCase();
    const keywordMatches = queryTerms.filter(term => chunkText.includes(term)).length;
    const keywordScore = keywordMatches / queryTerms.length;
    score += keywordScore * 0.3;

    // Chunk importance (from metadata)
    const importance = chunk.metadata.importance || 0.5;
    score += importance * 0.1;

    return score;
  }

  private async rerankChunks(
    query: string, 
    chunks: DocumentChunk[], 
    maxChunks: number
  ): Promise<DocumentChunk[]> {
    if (chunks.length <= maxChunks) {
      return chunks;
    }

    // Calculate diversity and relevance scores
    const scoredChunks = await Promise.all(
      chunks.map(async chunk => ({
        chunk,
        relevanceScore: await this.calculateRelevanceScore(chunk, query),
        diversityScore: this.calculateDiversityScore(chunk, chunks)
      }))
    );

    // Apply MMR (Maximal Marginal Relevance) for diversity
    const selectedChunks: DocumentChunk[] = [];
    const remainingChunks = [...scoredChunks];

    // Select the most relevant chunk first
    remainingChunks.sort((a, b) => b.relevanceScore - a.relevanceScore);
    selectedChunks.push(remainingChunks.shift()!.chunk);

    // Select remaining chunks balancing relevance and diversity
    const lambda = 0.7; // Balance parameter (0.7 = 70% relevance, 30% diversity)

    while (selectedChunks.length < maxChunks && remainingChunks.length > 0) {
      let bestScore = -Infinity;
      let bestIndex = -1;

      for (let i = 0; i < remainingChunks.length; i++) {
        const candidate = remainingChunks[i];
        
        // Calculate diversity with already selected chunks
        const diversityWithSelected = this.calculateDiversityWithSelected(
          candidate.chunk, 
          selectedChunks
        );

        // MMR score
        const mmrScore = lambda * candidate.relevanceScore + 
                        (1 - lambda) * diversityWithSelected;

        if (mmrScore > bestScore) {
          bestScore = mmrScore;
          bestIndex = i;
        }
      }

      if (bestIndex >= 0) {
        selectedChunks.push(remainingChunks.splice(bestIndex, 1)[0].chunk);
      } else {
        break;
      }
    }

    return selectedChunks;
  }

  private async calculateRelevanceScore(chunk: DocumentChunk, query: string): Promise<number> {
    const queryEmbedding = await this.embeddingService.generateEmbedding(query);
    return this.calculateChunkRelevanceScore(chunk, query, queryEmbedding);
  }

  private calculateDiversityScore(chunk: DocumentChunk, allChunks: DocumentChunk[]): number {
    if (!chunk.embedding || allChunks.length <= 1) return 1.0;

    let totalSimilarity = 0;
    let comparisonCount = 0;

    for (const otherChunk of allChunks) {
      if (otherChunk.id !== chunk.id && otherChunk.embedding) {
        const similarity = EmbeddingService.cosineSimilarity(chunk.embedding, otherChunk.embedding);
        totalSimilarity += similarity;
        comparisonCount++;
      }
    }

    // Return inverse of average similarity (higher diversity = lower similarity)
    const avgSimilarity = comparisonCount > 0 ? totalSimilarity / comparisonCount : 0;
    return 1 - avgSimilarity;
  }

  private calculateDiversityWithSelected(chunk: DocumentChunk, selectedChunks: DocumentChunk[]): number {
    if (!chunk.embedding || selectedChunks.length === 0) return 1.0;

    let maxSimilarity = 0;

    for (const selectedChunk of selectedChunks) {
      if (selectedChunk.embedding) {
        const similarity = EmbeddingService.cosineSimilarity(chunk.embedding, selectedChunk.embedding);
        maxSimilarity = Math.max(maxSimilarity, similarity);
      }
    }

    return 1 - maxSimilarity; // Higher diversity = lower max similarity
  }

  private async assembleContext(query: string, chunks: DocumentChunk[]): Promise<RAGContext> {
    // Get source documents
    const sourceDocuments = await this.getSourceDocuments(chunks);

    // Create context text with proper attribution
    let combinedContext = '';
    let totalTokens = 0;
    const maxContextLength = 4000; // Reasonable context window

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const sourceDoc = sourceDocuments.find(doc => doc.id === chunk.documentId);
      
      // Add attribution header
      const attribution = `[Source ${i + 1}: ${sourceDoc?.title || 'Unknown'}]\n`;
      const chunkContent = chunk.content + '\n\n';
      
      const sectionLength = attribution.length + chunkContent.length;
      
      if (totalTokens + sectionLength > maxContextLength) {
        // Try to fit truncated content
        const remaining = maxContextLength - totalTokens - attribution.length;
        if (remaining > 100) { // Only if we have reasonable space left
          combinedContext += attribution + chunkContent.substring(0, remaining) + '...\n\n';
          totalTokens = maxContextLength;
        }
        break;
      }
      
      combinedContext += attribution + chunkContent;
      totalTokens += sectionLength;
    }

    // Calculate confidence based on relevance scores and coverage
    const confidence = this.calculateContextConfidence(chunks, query);

    return {
      query,
      retrievedChunks: chunks,
      combinedContext: combinedContext.trim(),
      sources: sourceDocuments,
      confidence,
      tokens: totalTokens
    };
  }

  private async getSourceDocuments(chunks: DocumentChunk[]): Promise<Document[]> {
    const documentIds = [...new Set(chunks.map(chunk => chunk.documentId))];
    const documents: Document[] = [];

    for (const docId of documentIds) {
      const document = await this.vectorDb.getDocument(docId);
      if (document) {
        documents.push(document);
      }
    }

    return documents;
  }

  private calculateContextConfidence(chunks: DocumentChunk[], query: string): number {
    if (chunks.length === 0) return 0;

    // Base confidence from number of chunks
    let confidence = Math.min(0.8, chunks.length * 0.15);

    // Boost for high-importance chunks
    const highImportanceChunks = chunks.filter(chunk => 
      (chunk.metadata.importance || 0.5) > 0.7
    );
    confidence += highImportanceChunks.length * 0.05;

    // Boost for recent documents
    const recentDocuments = chunks.filter(chunk => {
      // This would require getting document metadata
      return true; // Placeholder
    });
    
    // Boost for exact matches
    const queryTerms = query.toLowerCase().split(/\s+/);
    let exactMatches = 0;
    
    for (const chunk of chunks) {
      const chunkText = chunk.content.toLowerCase();
      exactMatches += queryTerms.filter(term => chunkText.includes(term)).length;
    }
    
    const exactMatchRatio = exactMatches / (queryTerms.length * chunks.length);
    confidence += exactMatchRatio * 0.2;

    return Math.min(1, confidence);
  }

  async generateResponse(query: string, context?: RAGContext): Promise<string> {
    // This would integrate with an LLM service
    // For now, return a formatted response based on context
    
    if (!context) {
      context = await this.retrieveContext(query);
    }

    if (context.retrievedChunks.length === 0) {
      return "I couldn't find relevant information in the knowledge base to answer your question.";
    }

    // Generate a structured response
    let response = `Based on the available information:\n\n`;

    // Add key insights from top chunks
    const topChunks = context.retrievedChunks.slice(0, 3);
    for (let i = 0; i < topChunks.length; i++) {
      const chunk = topChunks[i];
      const sourceDoc = context.sources.find(doc => doc.id === chunk.documentId);
      
      response += `${i + 1}. ${this.extractKeyInsight(chunk, query)}\n`;
      response += `   (Source: ${sourceDoc?.title || 'Unknown'})\n\n`;
    }

    // Add summary if confidence is high
    if (context.confidence > 0.7) {
      response += `Summary: ${this.generateSummary(context)}\n\n`;
    }

    // Add confidence indicator
    const confidenceLevel = context.confidence > 0.8 ? 'High' :
                           context.confidence > 0.6 ? 'Medium' : 'Low';
    response += `Confidence: ${confidenceLevel} (${Math.round(context.confidence * 100)}%)`;

    return response;
  }

  private extractKeyInsight(chunk: DocumentChunk, query: string): string {
    // Extract the most relevant sentence(s) from the chunk
    const sentences = chunk.content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const queryTerms = query.toLowerCase().split(/\s+/);
    
    // Score sentences based on query term overlap
    const scoredSentences = sentences.map(sentence => {
      const sentenceText = sentence.toLowerCase();
      const matches = queryTerms.filter(term => sentenceText.includes(term)).length;
      return {
        sentence: sentence.trim(),
        score: matches / queryTerms.length
      };
    });

    // Return the highest scoring sentence
    scoredSentences.sort((a, b) => b.score - a.score);
    
    return scoredSentences.length > 0 
      ? scoredSentences[0].sentence 
      : chunk.content.substring(0, 200) + '...';
  }

  private generateSummary(context: RAGContext): string {
    // Create a concise summary of the context
    const keyPoints = context.retrievedChunks
      .slice(0, 3)
      .map(chunk => this.extractKeyInsight(chunk, context.query));

    return keyPoints.join('. ');
  }

  // Advanced retrieval methods
  async hybridRetrieve(
    query: string, 
    semanticWeight: number = 0.7, 
    keywordWeight: number = 0.3,
    maxChunks: number = 5
  ): Promise<RAGContext> {
    // Combine semantic and keyword-based retrieval
    const [semanticChunks, keywordChunks] = await Promise.all([
      this.performSemanticRetrieval(query, Math.ceil(maxChunks * 1.5)),
      this.performKeywordRetrieval(query, Math.ceil(maxChunks * 1.5))
    ]);

    // Merge and score chunks
    const allChunks = [...semanticChunks, ...keywordChunks];
    const uniqueChunks = this.deduplicateChunks(allChunks);

    // Re-score with hybrid approach
    const queryEmbedding = await this.embeddingService.generateEmbedding(query);
    const scoredChunks = uniqueChunks.map(chunk => ({
      chunk,
      score: this.calculateHybridScore(chunk, query, queryEmbedding, semanticWeight, keywordWeight)
    }));

    // Sort and take top chunks
    scoredChunks.sort((a, b) => b.score - a.score);
    const topChunks = scoredChunks.slice(0, maxChunks).map(sc => sc.chunk);

    return await this.assembleContext(query, topChunks);
  }

  private async performKeywordRetrieval(query: string, maxResults: number): Promise<DocumentChunk[]> {
    // Use search service for keyword-based retrieval
    const searchQuery: SearchQuery = {
      text: query,
      options: {
        semantic: false,
        exact: true,
        fuzzy: false,
        includeSummary: false,
        includeContext: false,
        contextWindow: 200,
        rankingModel: 'bm25'
      },
      filters: {
        maxResults
      }
    };

    const searchResults = await this.searchService.search(searchQuery);
    const chunks: DocumentChunk[] = [];

    for (const result of searchResults) {
      chunks.push(...result.chunks.map(sc => sc.chunk));
    }

    return chunks.slice(0, maxResults);
  }

  private calculateHybridScore(
    chunk: DocumentChunk,
    query: string,
    queryEmbedding: Float32Array,
    semanticWeight: number,
    keywordWeight: number
  ): number {
    const semanticScore = chunk.embedding ? 
      EmbeddingService.cosineSimilarity(queryEmbedding, chunk.embedding) : 0;

    const keywordScore = this.calculateKeywordScore(chunk, query);

    return semanticScore * semanticWeight + keywordScore * keywordWeight;
  }

  private calculateKeywordScore(chunk: DocumentChunk, query: string): number {
    const queryTerms = query.toLowerCase().split(/\s+/);
    const chunkText = chunk.content.toLowerCase();
    
    let score = 0;
    for (const term of queryTerms) {
      const termCount = (chunkText.match(new RegExp(term, 'g')) || []).length;
      const termFreq = termCount / chunkText.split(/\s+/).length;
      
      // TF-IDF approximation
      const idf = Math.log(1 + 1 / (termCount + 1));
      score += termFreq * idf;
    }

    return score;
  }

  private deduplicateChunks(chunks: DocumentChunk[]): DocumentChunk[] {
    const seen = new Set<string>();
    return chunks.filter(chunk => {
      if (seen.has(chunk.id)) {
        return false;
      }
      seen.add(chunk.id);
      return true;
    });
  }

  private parseVectorId(vectorId: string): { documentId?: string; chunkId?: string } {
    if (vectorId.startsWith('chunk-')) {
      const parts = vectorId.split('-');
      if (parts.length >= 3) {
        return {
          documentId: parts.slice(1, -2).join('-'),
          chunkId: vectorId.substring(6)
        };
      }
    } else if (vectorId.startsWith('doc-')) {
      const parts = vectorId.split('-');
      if (parts.length >= 2) {
        return {
          documentId: parts.slice(1, -1).join('-')
        };
      }
    }
    
    return {};
  }

  // Cache management
  clearCache(): void {
    this.contextCache.clear();
    console.log('RAG context cache cleared');
  }

  getCacheStats(): { size: number; entries: string[] } {
    return {
      size: this.contextCache.size,
      entries: Array.from(this.contextCache.keys())
    };
  }
}

export default RAGService;
