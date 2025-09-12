// Knowledge Base Components Export
export { default as KnowledgeSearchComponent } from './search/KnowledgeSearchComponent';
export { default as KnowledgeAnalyticsComponent } from './analytics/KnowledgeAnalyticsComponent';

// Re-export knowledge base service for easy access
export { default as KnowledgeBaseService } from '../../services/knowledge/core/KnowledgeBaseService';

// Re-export types
export type {
  Document,
  DocumentChunk,
  SearchQuery,
  SearchResult,
  KnowledgeBaseConfig,
  KnowledgeGraph,
  Citation,
  AnalyticsQuery,
  AnalyticsResult
} from '../../types/knowledge/types';