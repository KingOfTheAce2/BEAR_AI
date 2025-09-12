import {
  Document,
  DocumentChunk,
  DocumentMetadata,
  ChunkMetadata,
  KnowledgeBaseConfig
} from '../../../types/knowledge/types';
import { EmbeddingService } from './EmbeddingService';
import { VectorDatabaseService } from '../database/VectorDatabaseService';

export class DocumentIndexer {
  private embeddingService: EmbeddingService;
  private vectorDb: VectorDatabaseService;
  private config: KnowledgeBaseConfig;

  constructor(config: KnowledgeBaseConfig, vectorDb: VectorDatabaseService) {
    this.config = config;
    this.vectorDb = vectorDb;
    this.embeddingService = new EmbeddingService(config.embeddingModel);
  }

  async indexDocument(document: Document): Promise<string> {
    try {
      console.log(`Indexing document: ${document.title}`);
      
      // Preprocess document
      const processedDoc = await this.preprocessDocument(document);
      
      // Generate chunks
      const chunks = await this.generateChunks(processedDoc);
      processedDoc.chunks = chunks;
      
      // Generate embeddings for chunks
      await this.generateChunkEmbeddings(processedDoc);
      
      // Generate document-level embeddings
      await this.generateDocumentEmbeddings(processedDoc);
      
      // Extract metadata
      processedDoc.metadata = this.extractMetadata(processedDoc);
      
      // Store in vector database
      await this.vectorDb.storeDocument(processedDoc);
      
      console.log(`Successfully indexed document: ${processedDoc.id}`);
      return processedDoc.id;
    } catch (error) {
      console.error('Error indexing document:', error);
      throw new Error(`Failed to index document: ${error.message}`);
    }
  }

  async updateDocument(document: Document): Promise<void> {
    try {
      // Remove old version
      await this.vectorDb.deleteDocument(document.id);
      
      // Reindex updated version
      await this.indexDocument(document);
    } catch (error) {
      console.error('Error updating document:', error);
      throw new Error(`Failed to update document: ${error.message}`);
    }
  }

  async removeDocument(documentId: string): Promise<void> {
    try {
      await this.vectorDb.deleteDocument(documentId);
    } catch (error) {
      console.error('Error removing document:', error);
      throw new Error(`Failed to remove document: ${error.message}`);
    }
  }

  private async preprocessDocument(document: Document): Promise<Document> {
    // Clean and normalize text
    let cleanContent = this.cleanText(document.content);
    
    // Extract entities and concepts
    const entities = this.extractEntities(cleanContent);
    const concepts = this.extractConcepts(cleanContent);
    
    // Update document with preprocessed data
    return {
      ...document,
      content: cleanContent,
      metadata: {
        ...document.metadata,
        wordCount: this.countWords(cleanContent),
        characterCount: cleanContent.length,
        readingTime: this.calculateReadingTime(cleanContent),
        entityMentions: entities,
        concepts: concepts
      }
    };
  }

  private cleanText(text: string): string {
    // Remove excessive whitespace
    text = text.replace(/\s+/g, ' ').trim();
    
    // Remove special characters but keep punctuation
    text = text.replace(/[^\w\s.,!?;:()\-"']/g, '');
    
    // Normalize quotes
    text = text.replace(/[""]/g, '"').replace(/['']/g, "'");
    
    return text;
  }

  private extractEntities(text: string): string[] {
    const entities: string[] = [];
    
    // Simple entity extraction (in production, use NLP library)
    // Extract capitalized words that might be proper nouns
    const words = text.split(/\s+/);
    const capitalizedPattern = /^[A-Z][a-z]+$/;
    
    for (let i = 0; i < words.length; i++) {
      const word = words[i].replace(/[.,!?;:()]/g, '');
      if (capitalizedPattern.test(word) && word.length > 2) {
        // Check for multi-word entities
        let entity = word;
        let j = i + 1;
        while (j < words.length && j < i + 3) {
          const nextWord = words[j].replace(/[.,!?;:()]/g, '');
          if (capitalizedPattern.test(nextWord)) {
            entity += ' ' + nextWord;
            j++;
          } else {
            break;
          }
        }
        
        if (entity.includes(' ') || word.length > 4) {
          entities.push(entity);
        }
      }
    }
    
    // Remove duplicates
    return [...new Set(entities)];
  }

  private extractConcepts(text: string): string[] {
    // Simple concept extraction based on keywords and phrases
    const concepts: string[] = [];
    const conceptPatterns = [
      // Technical terms
      /\b(algorithm|data structure|machine learning|artificial intelligence|neural network|deep learning)\b/gi,
      // Business terms
      /\b(strategy|marketing|sales|revenue|profit|customer|market)\b/gi,
      // Academic terms
      /\b(research|study|analysis|methodology|hypothesis|conclusion)\b/gi
    ];
    
    for (const pattern of conceptPatterns) {
      const matches = text.match(pattern);
      if (matches) {
        concepts.push(...matches.map(m => m.toLowerCase()));
      }
    }
    
    return [...new Set(concepts)];
  }

  private async generateChunks(document: Document): Promise<DocumentChunk[]> {
    const chunks: DocumentChunk[] = [];
    const content = document.content;
    const chunkSize = this.config.chunkSize;
    const overlap = this.config.chunkOverlap;
    
    // Split by sentences first to maintain coherence
    const sentences = this.splitIntoSentences(content);
    
    let currentChunk = '';
    let currentStart = 0;
    let chunkIndex = 0;
    let tokenCount = 0;
    
    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];
      const sentenceTokens = this.countTokens(sentence);
      
      // Check if adding this sentence would exceed chunk size
      if (tokenCount + sentenceTokens > chunkSize && currentChunk.length > 0) {
        // Create chunk
        const chunk = await this.createChunk(
          document.id,
          currentChunk.trim(),
          currentStart,
          currentStart + currentChunk.length,
          chunkIndex,
          tokenCount
        );
        chunks.push(chunk);
        
        // Start new chunk with overlap
        const overlapText = this.getOverlapText(currentChunk, overlap);
        currentChunk = overlapText + sentence;
        currentStart = currentStart + currentChunk.length - overlapText.length - sentence.length;
        chunkIndex++;
        tokenCount = this.countTokens(currentChunk);
      } else {
        currentChunk += (currentChunk ? ' ' : '') + sentence;
        tokenCount += sentenceTokens;
      }
    }
    
    // Add final chunk if there's remaining content
    if (currentChunk.trim()) {
      const chunk = await this.createChunk(
        document.id,
        currentChunk.trim(),
        currentStart,
        currentStart + currentChunk.length,
        chunkIndex,
        tokenCount
      );
      chunks.push(chunk);
    }
    
    return chunks;
  }

  private splitIntoSentences(text: string): string[] {
    // Simple sentence splitting (in production, use proper NLP)
    return text.split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }

  private countTokens(text: string): number {
    // Approximate token count (1 token ≈ 4 characters for English)
    return Math.ceil(text.length / 4);
  }

  private getOverlapText(text: string, overlapSize: number): string {
    const words = text.split(/\s+/);
    const overlapWords = words.slice(-overlapSize);
    return overlapWords.join(' ');
  }

  private async createChunk(
    documentId: string,
    content: string,
    startIndex: number,
    endIndex: number,
    chunkIndex: number,
    tokens: number
  ): Promise<DocumentChunk> {
    // Extract chunk metadata
    const metadata = this.extractChunkMetadata(content, chunkIndex);
    
    return {
      id: `${documentId}-chunk-${chunkIndex}`,
      documentId,
      content,
      startIndex,
      endIndex,
      chunkIndex,
      tokens,
      metadata
    };
  }

  private extractChunkMetadata(content: string, chunkIndex: number): ChunkMetadata {
    // Extract section headings if present
    const headingMatch = content.match(/^#+\s*(.+)$/m);
    const heading = headingMatch ? headingMatch[1] : undefined;
    
    // Calculate importance based on various factors
    const importance = this.calculateChunkImportance(content);
    
    // Extract entities and concepts for this chunk
    const entityMentions = this.extractEntities(content);
    const concepts = this.extractConcepts(content);
    
    return {
      heading,
      importance,
      entityMentions,
      concepts
    };
  }

  private calculateChunkImportance(content: string): number {
    let importance = 0.5; // Base importance
    
    // Boost for headings
    if (content.match(/^#+/m)) {
      importance += 0.3;
    }
    
    // Boost for keywords
    const importantKeywords = [
      'important', 'critical', 'key', 'main', 'primary', 'essential',
      'conclusion', 'summary', 'result', 'finding'
    ];
    
    for (const keyword of importantKeywords) {
      if (content.toLowerCase().includes(keyword)) {
        importance += 0.1;
      }
    }
    
    // Boost for questions
    if (content.includes('?')) {
      importance += 0.1;
    }
    
    // Penalty for very short chunks
    if (content.length < 100) {
      importance -= 0.2;
    }
    
    return Math.max(0, Math.min(1, importance));
  }

  private async generateChunkEmbeddings(document: Document): Promise<void> {
    console.log(`Generating embeddings for ${document.chunks.length} chunks`);
    
    const batchSize = 10; // Process in batches to avoid memory issues
    
    for (let i = 0; i < document.chunks.length; i += batchSize) {
      const batch = document.chunks.slice(i, i + batchSize);
      const texts = batch.map(chunk => chunk.content);
      
      try {
        const embeddings = await this.embeddingService.generateEmbeddings(texts);
        
        for (let j = 0; j < batch.length; j++) {
          batch[j].embedding = embeddings[j];
        }
      } catch (error) {
        console.error('Error generating chunk embeddings:', error);
        // Continue without embeddings for this batch
      }
    }
  }

  private async generateDocumentEmbeddings(document: Document): Promise<void> {
    try {
      // Generate embedding for document title
      const titleEmbedding = await this.embeddingService.generateEmbedding(document.title);
      
      // Generate embedding for document summary (first few sentences)
      const summary = this.generateDocumentSummary(document.content);
      const summaryEmbedding = await this.embeddingService.generateEmbedding(summary);
      
      document.embeddings = [titleEmbedding, summaryEmbedding];
    } catch (error) {
      console.error('Error generating document embeddings:', error);
      document.embeddings = [];
    }
  }

  private generateDocumentSummary(content: string, maxLength: number = 500): string {
    // Take first few sentences up to maxLength
    const sentences = this.splitIntoSentences(content);
    let summary = '';
    
    for (const sentence of sentences) {
      if (summary.length + sentence.length > maxLength) {
        break;
      }
      summary += (summary ? ' ' : '') + sentence + '.';
    }
    
    return summary || content.substring(0, maxLength);
  }

  private extractMetadata(document: Document): DocumentMetadata {
    return {
      ...document.metadata,
      wordCount: this.countWords(document.content),
      characterCount: document.content.length,
      readingTime: this.calculateReadingTime(document.content)
    };
  }

  private countWords(text: string): number {
    return text.split(/\s+/).filter(word => word.length > 0).length;
  }

  private calculateReadingTime(text: string): number {
    const wordsPerMinute = 200; // Average reading speed
    const wordCount = this.countWords(text);
    return Math.ceil(wordCount / wordsPerMinute);
  }

  // Batch operations
  async indexDocuments(documents: Document[]): Promise<string[]> {
    const results: string[] = [];
    const batchSize = this.config.indexingBatchSize;
    
    for (let i = 0; i < documents.length; i += batchSize) {
      const batch = documents.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(documents.length / batchSize)}`);
      
      const batchResults = await Promise.all(
        batch.map(doc => this.indexDocument(doc))
      );
      results.push(...batchResults);
    }
    
    return results;
  }
}

export default DocumentIndexer;