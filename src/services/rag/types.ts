/**
 * Type definitions for NVIDIA Nemotron RAG system
 */

// Re-export types from the main NemotronRAG module
export {
  LegalDocument,
  RAGChunk,
  QueryContext,
  RetrievalResult,
  CitationInfo,
  ContradictionInfo,
  GraphRelation,
  NemotronConfig
} from './NemotronRAG';

// Additional utility types for the RAG system

export interface RAGSystemStatus {
  initialized: boolean;
  vectorDbConnected: boolean;
  embeddingModelLoaded: boolean;
  documentsIndexed: number;
  lastUpdate: Date;
  health: 'healthy' | 'degraded' | 'error';
}

export interface RAGMetrics {
  totalQueries: number;
  averageLatency: number;
  successRate: number;
  cacheHitRate: number;
  confidenceDistribution: {
    high: number;
    medium: number;
    low: number;
  };
}

export interface EmbeddingStats {
  totalEmbeddings: number;
  embeddingDimension: number;
  averageGenerationTime: number;
  cacheSize: number;
  cacheHitRate: number;
}

export interface DocumentStats {
  totalDocuments: number;
  documentsByType: Record<string, number>;
  documentsByJurisdiction: Record<string, number>;
  averageDocumentLength: number;
  totalChunks: number;
}

export interface SearchAnalytics {
  queryId: string;
  query: string;
  timestamp: Date;
  latency: number;
  resultsCount: number;
  confidence: number;
  retrievalMethods: string[];
  userSatisfaction?: number;
}

export interface RAGPerformance {
  retrievalLatency: number;
  embeddingLatency: number;
  rerankingLatency: number;
  totalLatency: number;
  throughput: number;
  resourceUsage: {
    cpu: number;
    memory: number;
    gpu?: number;
  };
}

export interface LegalTerminology {
  term: string;
  definition: string;
  category: 'constitutional' | 'procedural' | 'substantive' | 'administrative';
  synonyms: string[];
  relatedTerms: string[];
  frequency: number;
}

export interface JurisdictionInfo {
  code: string;
  name: string;
  level: 'federal' | 'state' | 'local' | 'international';
  parent?: string;
  children: string[];
  courtHierarchy: string[];
}

export interface DocumentRelationship {
  sourceId: string;
  targetId: string;
  relationType: 'cites' | 'cited_by' | 'overrules' | 'overruled_by' | 'distinguishes' | 'follows';
  strength: number;
  context: string;
  verified: boolean;
}

export interface LegalConcept {
  id: string;
  name: string;
  description: string;
  category: string;
  relatedConcepts: string[];
  precedents: string[];
  jurisdiction: string[];
  lastUpdated: Date;
}

export interface CitationPattern {
  pattern: RegExp;
  jurisdiction: string;
  courtType: string;
  precedentialValue: 'binding' | 'persuasive' | 'not_precedential';
  validator: (citation: string) => boolean;
}

export interface QueryExpansion {
  originalQuery: string;
  expandedTerms: string[];
  synonyms: string[];
  relatedConcepts: string[];
  legalPhrases: string[];
  confidence: number;
}

export interface RetrievalStage {
  name: string;
  startTime: Date;
  endTime?: Date;
  status: 'pending' | 'running' | 'completed' | 'failed';
  results?: any;
  error?: string;
  metrics?: Record<string, number>;
}

export interface RAGPipeline {
  id: string;
  query: string;
  context: QueryContext;
  stages: RetrievalStage[];
  startTime: Date;
  endTime?: Date;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: RetrievalResult;
  error?: string;
}

export interface ConfidenceFactors {
  semanticSimilarity: number;
  citationVerification: number;
  temporalRelevance: number;
  sourceAuthority: number;
  contradictionPenalty: number;
  graphCentrality: number;
  userFeedback?: number;
}

export interface HallucinationCheck {
  text: string;
  supportingEvidence: string[];
  unsupportedClaims: string[];
  confidence: number;
  verified: boolean;
  sources: string[];
}

export interface MultiHopQuery {
  originalQuery: string;
  hops: {
    query: string;
    results: RetrievalResult;
    reasoning: string;
  }[];
  synthesizedAnswer: string;
  confidence: number;
  evidenceChain: string[];
}

export interface AgenticAction {
  type: 'search' | 'verify' | 'reason' | 'synthesize' | 'tool_use';
  input: any;
  output: any;
  confidence: number;
  timestamp: Date;
  reasoning: string[];
}

export interface LegalToolResult {
  toolName: string;
  input: any;
  output: any;
  confidence: number;
  executionTime: number;
  success: boolean;
  error?: string;
}

export interface DocumentGraph {
  nodes: {
    id: string;
    type: 'document' | 'concept' | 'citation';
    metadata: Record<string, any>;
  }[];
  edges: {
    source: string;
    target: string;
    type: string;
    weight: number;
    metadata: Record<string, any>;
  }[];
}

export interface TemporalContext {
  queryDate: Date;
  relevantTimeframe: {
    start: Date;
    end: Date;
  };
  temporalFactors: {
    recency: number;
    stability: number;
    evolution: number;
  };
}

export interface JurisdictionalContext {
  primaryJurisdiction: string;
  relevantJurisdictions: string[];
  jurisdictionalHierarchy: string[];
  conflicts: {
    jurisdiction1: string;
    jurisdiction2: string;
    conflictType: string;
    resolution?: string;
  }[];
}

export interface RAGConfiguration {
  retrieval: {
    maxResults: number;
    confidenceThreshold: number;
    enableHybridSearch: boolean;
    sparseWeight: number;
    denseWeight: number;
    graphWeight: number;
  };
  generation: {
    maxTokens: number;
    temperature: number;
    topP: number;
    frequencyPenalty: number;
    presencePenalty: number;
  };
  processing: {
    chunkSize: number;
    chunkOverlap: number;
    enableParallelProcessing: boolean;
    batchSize: number;
  };
  quality: {
    enableHallucinationCheck: boolean;
    enableContradictionDetection: boolean;
    enableCitationVerification: boolean;
    minConfidenceThreshold: number;
  };
}

export interface BenchmarkResult {
  querySet: string;
  totalQueries: number;
  successfulQueries: number;
  averageLatency: number;
  averageConfidence: number;
  accuracyMetrics: {
    precision: number;
    recall: number;
    f1Score: number;
  };
  qualityMetrics: {
    citationAccuracy: number;
    hallucinationRate: number;
    contradictionRate: number;
  };
}

export interface RAGSystemHealth {
  status: 'healthy' | 'degraded' | 'critical' | 'down';
  components: {
    vectorDatabase: 'up' | 'down' | 'degraded';
    embeddingService: 'up' | 'down' | 'degraded';
    nemotronAPI: 'up' | 'down' | 'degraded';
    cache: 'up' | 'down' | 'degraded';
  };
  metrics: RAGMetrics;
  lastCheck: Date;
  uptime: number;
}