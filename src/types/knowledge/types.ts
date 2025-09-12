// Knowledge Base Type Definitions
export interface Document {
  id: string;
  title: string;
  content: string;
  metadata: DocumentMetadata;
  chunks: DocumentChunk[];
  embeddings?: Float32Array[];
  version: number;
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
  category: string;
  language: string;
  sourceUrl?: string;
  fileType: string;
  size: number;
}

export interface DocumentChunk {
  id: string;
  documentId: string;
  content: string;
  embedding?: Float32Array;
  startIndex: number;
  endIndex: number;
  chunkIndex: number;
  tokens: number;
  metadata: ChunkMetadata;
}

export interface DocumentMetadata {
  author?: string;
  subject?: string;
  keywords?: string[];
  description?: string;
  lastModified?: Date;
  wordCount: number;
  characterCount: number;
  readingTime: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  quality?: number;
  relevance?: number;
}

export interface ChunkMetadata {
  section?: string;
  subsection?: string;
  pageNumber?: number;
  heading?: string;
  importance: number;
  entityMentions?: string[];
  concepts?: string[];
}

export interface KnowledgeNode {
  id: string;
  type: 'document' | 'concept' | 'entity' | 'topic';
  label: string;
  description?: string;
  properties: Record<string, any>;
  embedding?: Float32Array;
  connections: KnowledgeConnection[];
  weight: number;
  cluster?: string;
}

export interface KnowledgeConnection {
  sourceId: string;
  targetId: string;
  type: 'references' | 'similar' | 'contains' | 'related' | 'derives';
  weight: number;
  metadata?: Record<string, any>;
}

export interface KnowledgeGraph {
  nodes: Map<string, KnowledgeNode>;
  connections: KnowledgeConnection[];
  clusters: KnowledgeCluster[];
  statistics: GraphStatistics;
}

export interface KnowledgeCluster {
  id: string;
  label: string;
  nodes: string[];
  centroid: Float32Array;
  coherence: number;
  size: number;
}

export interface GraphStatistics {
  totalNodes: number;
  totalConnections: number;
  avgDegree: number;
  density: number;
  modularity: number;
  clusters: number;
}

export interface SearchQuery {
  text: string;
  filters?: SearchFilters;
  options?: SearchOptions;
}

export interface SearchFilters {
  categories?: string[];
  tags?: string[];
  dateRange?: { start: Date; end: Date };
  authors?: string[];
  fileTypes?: string[];
  languages?: string[];
  minRelevance?: number;
  maxResults?: number;
}

export interface SearchOptions {
  semantic: boolean;
  fuzzy: boolean;
  exact: boolean;
  includeSummary: boolean;
  includeContext: boolean;
  contextWindow: number;
  rankingModel: 'bm25' | 'semantic' | 'hybrid';
}

export interface SearchResult {
  document: Document;
  relevanceScore: number;
  chunks: SearchChunk[];
  summary?: string;
  highlights: SearchHighlight[];
  context?: string;
  explanation?: string;
}

export interface SearchChunk {
  chunk: DocumentChunk;
  score: number;
  reason: string;
}

export interface SearchHighlight {
  text: string;
  startIndex: number;
  endIndex: number;
  type: 'exact' | 'semantic' | 'fuzzy';
}

export interface RAGContext {
  query: string;
  retrievedChunks: DocumentChunk[];
  combinedContext: string;
  sources: Document[];
  confidence: number;
  tokens: number;
}

export interface Citation {
  id: string;
  documentId: string;
  chunkId?: string;
  text: string;
  pageNumber?: number;
  startIndex: number;
  endIndex: number;
  context: string;
  confidence: number;
  createdAt: Date;
}

export interface DocumentVersion {
  id: string;
  documentId: string;
  version: number;
  changes: DocumentChange[];
  summary: string;
  createdAt: Date;
  author?: string;
}

export interface DocumentChange {
  type: 'add' | 'delete' | 'modify';
  startIndex: number;
  endIndex: number;
  oldText?: string;
  newText?: string;
  confidence: number;
}

export interface EmbeddingModel {
  name: string;
  dimensions: number;
  maxTokens: number;
  loaded: boolean;
  session?: any;
}

export interface VectorIndex {
  id: string;
  dimensions: number;
  vectors: Map<string, Float32Array>;
  metadata: Map<string, any>;
  tree?: any; // HNSW or similar structure
}

export interface KnowledgeBaseConfig {
  embeddingModel: string;
  chunkSize: number;
  chunkOverlap: number;
  vectorDimensions: number;
  indexingBatchSize: number;
  searchResultLimit: number;
  enableVersioning: boolean;
  enableCitations: boolean;
  enableAnalytics: boolean;
}

export interface KnowledgeBaseStats {
  totalDocuments: number;
  totalChunks: number;
  totalEmbeddings: number;
  indexSize: number;
  lastIndexed: Date;
  avgProcessingTime: number;
  searchPerformance: {
    avgQueryTime: number;
    totalQueries: number;
    successRate: number;
  };
  storage: {
    documentsSize: number;
    embeddingsSize: number;
    indexSize: number;
    totalSize: number;
  };
}

export interface FacetedSearchResult {
  results: SearchResult[];
  facets: SearchFacet[];
  totalCount: number;
  queryTime: number;
}

export interface SearchFacet {
  field: string;
  values: FacetValue[];
}

export interface FacetValue {
  value: string;
  count: number;
  selected: boolean;
}

export interface AnalyticsQuery {
  type: 'trend' | 'distribution' | 'correlation' | 'summary';
  field: string;
  timeRange?: { start: Date; end: Date };
  groupBy?: string;
  filters?: Record<string, any>;
}

export interface AnalyticsResult {
  query: AnalyticsQuery;
  data: AnalyticsDataPoint[];
  summary: AnalyticsSummary;
  generatedAt: Date;
}

export interface AnalyticsDataPoint {
  label: string;
  value: number;
  metadata?: Record<string, any>;
}

export interface AnalyticsSummary {
  total: number;
  average: number;
  median: number;
  min: number;
  max: number;
  trend?: 'increasing' | 'decreasing' | 'stable';
  insights: string[];
}