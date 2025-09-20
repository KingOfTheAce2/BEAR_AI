
import {
  SearchQuery,
  SearchResult,
  SearchChunk,
  SearchHighlight,
  FacetedSearchResult,
  SearchFacet,
  FacetValue,
  Document,
  DocumentChunk,
  KnowledgeBaseConfig
} from '../../../types/knowledge/types';
import { VectorDatabaseService } from '../database/VectorDatabaseService';
import { EmbeddingService } from '../indexing/EmbeddingService';

export class SemanticSearchService {
  private vectorDb: VectorDatabaseService;
  private embeddingService: EmbeddingService;
  private config: KnowledgeBaseConfig;
  private searchCache: Map<string, SearchResult[]> = new Map();
  private cacheTimeout: number = 5 * 60 * 1000; // 5 minutes

  constructor(config: KnowledgeBaseConfig, vectorDb: VectorDatabaseService) {
    this.config = config;
    this.vectorDb = vectorDb;
    this.embeddingService = new EmbeddingService(config.embeddingModel);
  }

  async search(query: SearchQuery): Promise<SearchResult[]> {
    const startTime = Date.now();
    
    try {
      // Check cache first
      const cacheKey = this.getCacheKey(query);
      const cachedResults = this.searchCache.get(cacheKey);
      if (cachedResults) {
        console.log('Returning cached search results');
        return cachedResults;
      }

      // Perform the search
      let results: SearchResult[] = [];
      
      if (query.options?.semantic) {
        results = await this.performSemanticSearch(query);
      } else if (query.options?.exact) {
        results = await this.performExactSearch(query);
      } else {
        // Default: hybrid search (combining semantic and keyword)
        results = await this.performHybridSearch(query);
      }

      // Apply post-processing
      results = await this.postProcessResults(results, query);
      
      // Cache results
      this.searchCache.set(cacheKey, results);
      setTimeout(() => {
        this.searchCache.delete(cacheKey);
      }, this.cacheTimeout);

      const queryTime = Date.now() - startTime;
      console.log(`Search completed in ${queryTime}ms, found ${results.length} results`);
      
      return results;
    } catch (error) {
      console.error('Search error:', error);
      throw new Error(`Search failed: ${error.message}`);
    }
  }

  async facetedSearch(query: SearchQuery): Promise<FacetedSearchResult> {
    const startTime = Date.now();
    
    try {
      // Perform basic search
      const results = await this.search(query);
      
      // Generate facets
      const facets = await this.generateFacets(results, query);
      
      const queryTime = Date.now() - startTime;
      
      return {
        results,
        facets,
        totalCount: results.length,
        queryTime
      };
    } catch (error) {
      console.error('Faceted search error:', error);
      throw new Error(`Faceted search failed: ${error.message}`);
    }
  }

  private async performSemanticSearch(query: SearchQuery): Promise<SearchResult[]> {
    console.log('Performing semantic search...');
    
    // Generate embedding for query
    const queryEmbedding = await this.embeddingService.generateEmbedding(query.text);
    
    // Find similar vectors
    const similarVectors = await this.vectorDb.findSimilarVectors(
      queryEmbedding,
      query.filters?.maxResults || this.config.searchResultLimit
    );
    
    // Get documents and chunks
    const results: SearchResult[] = [];
    const documentMap = new Map<string, SearchResult>();
    
    for (const similar of similarVectors) {
      if (similar.similarity < (query.filters?.minRelevance || 0.5)) {
        continue;
      }
      
      const { documentId, chunkId } = this.parseVectorId(similar.id);
      
      if (!documentId) continue;
      
      const document = await this.vectorDb.getDocument(documentId);
      if (!document) continue;
      
      // Check filters
      if (!this.matchesFilters(document, query.filters)) {
        continue;
      }
      
      let searchResult = documentMap.get(documentId);
      if (!searchResult) {
        searchResult = {
          document,
          relevanceScore: similar.similarity,
          chunks: [],
          highlights: [],
          summary: query.options?.includeSummary ? this.generateSummary(document) : undefined,
          context: query.options?.includeContext ? await this.generateContext(document, query) : undefined
        };
        documentMap.set(documentId, searchResult);
        results.push(searchResult);
      }
      
      // Add chunk if it exists
      if (chunkId) {
        const chunk = await this.vectorDb.getChunk(chunkId);
        if (chunk) {
          searchResult.chunks.push({
            chunk,
            score: similar.similarity,
            reason: 'semantic_similarity'
          });
        }
      }
      
      // Update relevance score (take maximum)
      searchResult.relevanceScore = Math.max(searchResult.relevanceScore, similar.similarity);
    }
    
    // Sort by relevance
    results.sort((a, b) => b.relevanceScore - a.relevanceScore);
    
    return results;
  }

  private async performExactSearch(query: SearchQuery): Promise<SearchResult[]> {
    console.log('Performing exact search...');
    
    const searchText = query.text.toLowerCase();
    const documents = await this.vectorDb.searchDocuments(query.filters || {});
    const results: SearchResult[] = [];
    
    for (const document of documents) {
      const content = document.content.toLowerCase();
      
      if (content.includes(searchText)) {
        const highlights = this.findExactMatches(document.content, query.text);
        const relevantChunks = this.findRelevantChunks(document, searchText);
        
        results.push({
          document,
          relevanceScore: this.calculateExactRelevance(content, searchText),
          chunks: relevantChunks,
          highlights,
          summary: query.options?.includeSummary ? this.generateSummary(document) : undefined,
          context: query.options?.includeContext ? await this.generateContext(document, query) : undefined
        });
      }
    }
    
    // Sort by relevance
    results.sort((a, b) => b.relevanceScore - a.relevanceScore);
    
    return results.slice(0, query.filters?.maxResults || this.config.searchResultLimit);
  }

  private async performHybridSearch(query: SearchQuery): Promise<SearchResult[]> {
    console.log('Performing hybrid search...');
    
    // Get both semantic and exact results
    const semanticQuery = { ...query, options: { ...query.options, semantic: true } };
    const exactQuery = { ...query, options: { ...query.options, exact: true } };
    
    const [semanticResults, exactResults] = await Promise.all([
      this.performSemanticSearch(semanticQuery),
      this.performExactSearch(exactQuery)
    ]);
    
    // Combine and deduplicate results
    const combinedResults = this.combineSearchResults(semanticResults, exactResults);
    
    // Re-rank using hybrid scoring
    combinedResults.forEach(result => {
      result.relevanceScore = this.calculateHybridScore(result, query);
    });
    
    // Sort by hybrid score
    combinedResults.sort((a, b) => b.relevanceScore - a.relevanceScore);
    
    return combinedResults.slice(0, query.filters?.maxResults || this.config.searchResultLimit);
  }

  private combineSearchResults(semanticResults: SearchResult[], exactResults: SearchResult[]): SearchResult[] {
    const resultMap = new Map<string, SearchResult>();
    
    // Add semantic results
    for (const result of semanticResults) {
      resultMap.set(result.document.id, result);
    }
    
    // Merge exact results
    for (const exactResult of exactResults) {
      const existing = resultMap.get(exactResult.document.id);
      if (existing) {
        // Merge chunks and highlights
        existing.chunks = [...existing.chunks, ...exactResult.chunks];
        existing.highlights = [...existing.highlights, ...exactResult.highlights];
        
        // Deduplicate chunks
        existing.chunks = this.deduplicateChunks(existing.chunks);
      } else {
        resultMap.set(exactResult.document.id, exactResult);
      }
    }
    
    return Array.from(resultMap.values());
  }

  private deduplicateChunks(chunks: SearchChunk[]): SearchChunk[] {
    const seen = new Set<string>();
    return chunks.filter(chunk => {
      if (seen.has(chunk.chunk.id)) {
        return false;
      }
      seen.add(chunk.chunk.id);
      return true;
    });
  }

  private calculateHybridScore(result: SearchResult, query: SearchQuery): number {
    const semanticWeight = 0.7;
    const exactWeight = 0.3;
    
    let semanticScore = 0;
    let exactScore = 0;
    
    // Calculate semantic score from chunks
    if (result.chunks.length > 0) {
      const semanticChunks = result.chunks.filter(c => c.reason === 'semantic_similarity');
      if (semanticChunks.length > 0) {
        semanticScore = Math.max(...semanticChunks.map(c => c.score));
      }
    }
    
    // Calculate exact match score
    const content = result.document.content.toLowerCase();
    const searchText = query.text.toLowerCase();
    if (content.includes(searchText)) {
      exactScore = this.calculateExactRelevance(content, searchText);
    }
    
    return semanticScore * semanticWeight + exactScore * exactWeight;
  }

  private calculateExactRelevance(content: string, searchText: string): number {
    const occurrences = (content.match(new RegExp(searchText, 'gi')) || []).length;
    const contentLength = content.length;
    
    // TF-IDF-like scoring
    const tf = occurrences / contentLength * 1000; // Scaled up
    const idf = Math.log(1 + 1 / (occurrences + 1)); // Inverse document frequency approximation
    
    return Math.min(1, tf * idf);
  }

  private findExactMatches(content: string, searchText: string): SearchHighlight[] {
    const highlights: SearchHighlight[] = [];
    const regex = new RegExp(searchText, 'gi');
    let match;
    
    while ((match = regex.exec(content)) !== null) {
      highlights.push({
        text: match[0],
        startIndex: match.index,
        endIndex: match.index + match[0].length,
        type: 'exact'
      });
    }
    
    return highlights;
  }

  private findRelevantChunks(document: Document, searchText: string): SearchChunk[] {
    const relevantChunks: SearchChunk[] = [];
    
    for (const chunk of document.chunks) {
      const chunkContent = chunk.content.toLowerCase();
      if (chunkContent.includes(searchText)) {
        const occurrences = (chunkContent.match(new RegExp(searchText, 'g')) || []).length;
        const score = occurrences / chunkContent.length * 100; // Scaled relevance
        
        relevantChunks.push({
          chunk,
          score: Math.min(1, score),
          reason: 'exact_match'
        });
      }
    }
    
    return relevantChunks.sort((a, b) => b.score - a.score);
  }

  private generateSummary(document: Document): string {
    // Generate a brief summary of the document
    const sentences = document.content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const maxSentences = 3;
    
    if (sentences.length <= maxSentences) {
      return document.content;
    }
    
    // Take first few sentences and try to get key sentences
    const summary = sentences.slice(0, maxSentences).join('. ') + '.';
    return summary.length > 300 ? summary.substring(0, 300) + '...' : summary;
  }

  private async generateContext(document: Document, query: SearchQuery): Promise<string> {
    const contextWindow = query.options?.contextWindow || 200;
    const searchText = query.text.toLowerCase();
    const content = document.content.toLowerCase();
    
    const index = content.indexOf(searchText);
    if (index === -1) {
      return this.generateSummary(document);
    }
    
    const start = Math.max(0, index - contextWindow);
    const end = Math.min(content.length, index + searchText.length + contextWindow);
    
    let context = document.content.substring(start, end);
    
    // Add ellipsis if truncated
    if (start > 0) context = '...' + context;
    if (end < content.length) context = context + '...';
    
    return context;
  }

  private matchesFilters(document: Document, filters: any): boolean {
    if (!filters) return true;
    
    // Category filter
    if (filters.categories && filters.categories.length > 0) {
      if (!filters.categories.includes(document.category)) {
        return false;
      }
    }
    
    // Tags filter
    if (filters.tags && filters.tags.length > 0) {
      const hasMatchingTag = filters.tags.some((tag: string) => 
        document.tags.includes(tag)
      );
      if (!hasMatchingTag) {
        return false;
      }
    }
    
    // Date range filter
    if (filters.dateRange) {
      const docDate = new Date(document.createdAt);
      if (docDate < filters.dateRange.start || docDate > filters.dateRange.end) {
        return false;
      }
    }
    
    // File type filter
    if (filters.fileTypes && filters.fileTypes.length > 0) {
      if (!filters.fileTypes.includes(document.fileType)) {
        return false;
      }
    }
    
    // Language filter
    if (filters.languages && filters.languages.length > 0) {
      if (!filters.languages.includes(document.language)) {
        return false;
      }
    }
    
    return true;
  }

  private async generateFacets(results: SearchResult[], query: SearchQuery): Promise<SearchFacet[]> {
    const facets: SearchFacet[] = [];
    
    // Category facet
    const categories = new Map<string, number>();
    results.forEach(result => {
      const category = result.document.category;
      categories.set(category, (categories.get(category) || 0) + 1);
    });
    
    if (categories.size > 1) {
      facets.push({
        field: 'category',
        values: Array.from(categories.entries()).map(([value, count]) => ({
          value,
          count,
          selected: query.filters?.categories?.includes(value) || false
        })).sort((a, b) => b.count - a.count)
      });
    }
    
    // Tags facet
    const tags = new Map<string, number>();
    results.forEach(result => {
      result.document.tags.forEach(tag => {
        tags.set(tag, (tags.get(tag) || 0) + 1);
      });
    });
    
    if (tags.size > 0) {
      facets.push({
        field: 'tags',
        values: Array.from(tags.entries())
          .map(([value, count]) => ({
            value,
            count,
            selected: query.filters?.tags?.includes(value) || false
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 20) // Limit to top 20 tags
      });
    }
    
    // File type facet
    const fileTypes = new Map<string, number>();
    results.forEach(result => {
      const fileType = result.document.fileType;
      fileTypes.set(fileType, (fileTypes.get(fileType) || 0) + 1);
    });
    
    if (fileTypes.size > 1) {
      facets.push({
        field: 'fileType',
        values: Array.from(fileTypes.entries()).map(([value, count]) => ({
          value,
          count,
          selected: query.filters?.fileTypes?.includes(value) || false
        })).sort((a, b) => b.count - a.count)
      });
    }
    
    // Language facet
    const languages = new Map<string, number>();
    results.forEach(result => {
      const language = result.document.language;
      languages.set(language, (languages.get(language) || 0) + 1);
    });
    
    if (languages.size > 1) {
      facets.push({
        field: 'language',
        values: Array.from(languages.entries()).map(([value, count]) => ({
          value,
          count,
          selected: query.filters?.languages?.includes(value) || false
        })).sort((a, b) => b.count - a.count)
      });
    }
    
    return facets;
  }

  private async postProcessResults(results: SearchResult[], query: SearchQuery): Promise<SearchResult[]> {
    // Add explanations if requested
    if (query.options?.includeContext) {
      for (const result of results) {
        result.explanation = this.generateExplanation(result, query);
      }
    }
    
    // Sort chunks within each result by score
    results.forEach(result => {
      result.chunks.sort((a, b) => b.score - a.score);
    });
    
    return results;
  }

  private generateExplanation(result: SearchResult, query: SearchQuery): string {
    const reasons: string[] = [];
    
    if (result.chunks.some(c => c.reason === 'semantic_similarity')) {
      reasons.push('semantic similarity to your query');
    }
    
    if (result.chunks.some(c => c.reason === 'exact_match')) {
      reasons.push('exact matches found');
    }
    
    if (result.document.tags.some(tag => query.text.toLowerCase().includes(tag.toLowerCase()))) {
      reasons.push('matching tags');
    }
    
    return reasons.length > 0 
      ? `This document was found due to ${reasons.join(', ')}.`
      : 'This document matches your search criteria.';
  }

  private parseVectorId(vectorId: string): { documentId?: string; chunkId?: string } {
    if (vectorId.startsWith('chunk-')) {
      const parts = vectorId.split('-');
      if (parts.length >= 3) {
        return {
          documentId: parts.slice(1, -2).join('-'),
          chunkId: vectorId.substring(6) // Remove 'chunk-' prefix
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

  private getCacheKey(query: SearchQuery): string {
    return JSON.stringify({
      text: query.text,
      filters: query.filters,
      options: query.options
    });
  }

  // Analytics and monitoring
  clearCache(): void {
    this.searchCache.clear();
    console.log('Search cache cleared');
  }

  getCacheStats(): { size: number; hitRate: number } {
    return {
      size: this.searchCache.size,
      hitRate: 0
    };
  }
}

export default SemanticSearchService;