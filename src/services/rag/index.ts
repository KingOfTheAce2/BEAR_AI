/**
 * NVIDIA Nemotron RAG System - Main Export Module
 * Comprehensive legal document retrieval and generation system
 */

// Core RAG components
export { default as NemotronRAG } from './NemotronRAG';
export { default as NemotronClient } from './NemotronClient';
export { default as LegalRAGService } from './LegalRAGService';

// Type definitions
export * from './types';
export * from './NemotronRAG';
export * from './NemotronClient';
export * from './LegalRAGService';

// Re-export key interfaces for convenience
export type {
  LegalDocument,
  RAGChunk,
  QueryContext,
  RetrievalResult,
  CitationInfo,
  ContradictionInfo,
  GraphRelation,
  NemotronConfig,
  RAGSystemStatus,
  RAGMetrics,
  SearchAnalytics,
  MultiHopQuery,
  LegalConcept,
  JurisdictionalContext,
  LegalQueryRequest,
  LegalResponse,
  DocumentAnalysisRequest,
  DocumentAnalysisResult,
  ContractAnalysisRequest,
  ContractAnalysisResult,
  LegalResearchRequest,
  LegalResearchResult
} from './types';

/**
 * Factory function to create and initialize a Legal RAG Service
 */
export async function createLegalRAGService(config: {
  nemotronApiKey: string;
  nemoRetrieverUrl: string;
  embeddingModel?: string;
  generationModel?: string;
  vectorDbType?: 'qdrant' | 'lancedb' | 'hybrid';
  vectorDbUrl?: string;
  redisUrl?: string;
  enableGpuAcceleration?: boolean;
  maxChunkSize?: number;
  chunkOverlap?: number;
}): Promise<LegalRAGService> {
  const nemotronConfig = {
    nemotronApiKey: config.nemotronApiKey,
    nemoRetrieverUrl: config.nemoRetrieverUrl,
    embeddingModel: config.embeddingModel || 'nv-embed-v2',
    generationModel: config.generationModel || 'nemotron-4-340b-instruct',
    vectorDatabaseUrl: config.vectorDbUrl || process.env.VECTOR_DB_URL || 'http://localhost:6333',
    maxChunkSize: config.maxChunkSize || 512,
    chunkOverlap: config.chunkOverlap || 50,
    rerankingModel: 'nemotron-rerank',
    confidenceThreshold: 0.7,
    enableGpuAcceleration: config.enableGpuAcceleration || false,
    cacheTtl: 3600,
  };

  const service = new LegalRAGService(nemotronConfig);
  await service.initialize();

  return service;
}

/**
 * Utility functions for legal document processing
 */
export const LegalUtils = {
  /**
   * Extract legal citations from text
   */
  extractCitations(text: string): string[] {
    const citationPatterns = [
      /\d+\s+[A-Za-z\.]+\s+\d+/g, // Volume Reporter Page
      /\d+\s+U\.S\.\s+\d+/g,       // Supreme Court
      /\d+\s+F\.\d+d\s+\d+/g,      // Federal courts
      /\d+\s+S\.\s*Ct\.\s+\d+/g,   // Supreme Court Reporter
      /\d+\s+L\.\s*Ed\.\s*2d\s+\d+/g, // Lawyers' Edition
    ];

    const citations: string[] = [];
    for (const pattern of citationPatterns) {
      const matches = text.match(pattern);
      if (matches) {
        citations.push(...matches);
      }
    }

    return [...new Set(citations)]; // Remove duplicates
  },

  /**
   * Identify legal document type from content
   */
  identifyDocumentType(content: string): 'statute' | 'case_law' | 'regulation' | 'contract' | 'brief' | 'opinion' {
    const indicators = {
      statute: ['§', 'section', 'subsection', 'chapter', 'title', 'code'],
      case_law: ['plaintiff', 'defendant', 'court', 'judge', 'holding', 'appeal'],
      regulation: ['cfr', 'federal register', 'regulation', 'rule', 'administrative'],
      contract: ['agreement', 'party', 'consideration', 'terms', 'breach', 'performance'],
      brief: ['argument', 'memorandum', 'motion', 'brief', 'counsel', 'representation'],
      opinion: ['opinion', 'dissent', 'concur', 'majority', 'analysis', 'reasoning'],
    };

    const scores: Record<string, number> = {};
    const lowerContent = content.toLowerCase();

    for (const [type, keywords] of Object.entries(indicators)) {
      scores[type] = keywords.reduce((score, keyword) => {
        const matches = (lowerContent.match(new RegExp(keyword, 'g')) || []).length;
        return score + matches;
      }, 0);
    }

    const topType = Object.entries(scores).reduce((a, b) => scores[a[0]] > scores[b[0]] ? a : b)[0];
    return topType as any;
  },

  /**
   * Extract jurisdiction from legal text
   */
  extractJurisdiction(text: string): string | null {
    const jurisdictionPatterns = [
      /United States District Court for the (.+?) District/i,
      /(.+?) Supreme Court/i,
      /Court of Appeals for the (.+?) Circuit/i,
      /(.+?) Court of Appeals/i,
      /Superior Court of (.+?)\b/i,
      /(.+?) v\. (.+?),/i, // Case style format
    ];

    for (const pattern of jurisdictionPatterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }

    return null;
  },

  /**
   * Validate legal citation format
   */
  validateCitation(citation: string): { valid: boolean; type: string; issues: string[] } {
    const issues: string[] = [];
    let type = 'unknown';
    let valid = false;

    // US Supreme Court citations
    if (/^\d+\s+U\.S\.\s+\d+/.test(citation)) {
      type = 'supreme_court';
      valid = true;
    }
    // Federal Reporter citations
    else if (/^\d+\s+F\.\d*d\s+\d+/.test(citation)) {
      type = 'federal_reporter';
      valid = true;
    }
    // State reporter citations
    else if (/^\d+\s+[A-Za-z\.]+\s+\d+/.test(citation)) {
      type = 'state_reporter';
      valid = true;
    }
    else {
      issues.push('Citation format not recognized');
    }

    // Additional validation rules
    if (citation.length < 5) {
      issues.push('Citation appears too short');
      valid = false;
    }

    if (!/\d/.test(citation)) {
      issues.push('Citation missing volume or page numbers');
      valid = false;
    }

    return { valid, type, issues };
  },

  /**
   * Calculate document similarity based on legal concepts
   */
  calculateLegalSimilarity(doc1: any, doc2: any): number {
    const concepts1 = new Set(doc1.legalConcepts || []);
    const concepts2 = new Set(doc2.legalConcepts || []);

    const intersection = new Set([...concepts1].filter(x => concepts2.has(x)));
    const union = new Set([...concepts1, ...concepts2]);

    return union.size > 0 ? intersection.size / union.size : 0;
  },

  /**
   * Extract key legal terms from text
   */
  extractLegalTerms(text: string): string[] {
    const legalTerms = [
      'precedent', 'stare decisis', 'jurisdiction', 'standing', 'discovery',
      'summary judgment', 'appeal', 'certiorari', 'habeas corpus', 'due process',
      'equal protection', 'burden of proof', 'prima facie', 'res judicata',
      'collateral estoppel', 'statute of limitations', 'proximate cause',
      'negligence', 'liability', 'damages', 'injunction', 'motion', 'brief',
      'deposition', 'interrogatory', 'subpoena', 'voir dire', 'jury instruction',
      'mens rea', 'actus reus', 'consideration', 'breach', 'specific performance',
      'quantum meruit', 'unjust enrichment', 'fiduciary duty', 'good faith',
      'reasonable person', 'strict liability', 'comparative negligence',
    ];

    const foundTerms: string[] = [];
    const lowerText = text.toLowerCase();

    for (const term of legalTerms) {
      if (lowerText.includes(term.toLowerCase())) {
        foundTerms.push(term);
      }
    }

    return foundTerms;
  },

  /**
   * Format legal citation according to Bluebook style
   */
  formatBluebookCitation(citation: any): string {
    // Simplified Bluebook formatting
    if (citation.type === 'case') {
      return `${citation.caseName}, ${citation.volume} ${citation.reporter} ${citation.page} (${citation.court} ${citation.year})`;
    } else if (citation.type === 'statute') {
      return `${citation.title} U.S.C. § ${citation.section} (${citation.year})`;
    } else if (citation.type === 'regulation') {
      return `${citation.title} C.F.R. § ${citation.section} (${citation.year})`;
    }

    return citation.raw || '';
  },
};

/**
 * Legal document processing helpers
 */
export const DocumentProcessors = {
  /**
   * Clean legal document text
   */
  cleanLegalText(text: string): string {
    return text
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, '\n')
      .replace(/\t+/g, ' ')
      .trim();
  },

  /**
   * Split legal document into sections
   */
  splitIntoSections(text: string): Array<{ heading: string; content: string }> {
    const sections: Array<{ heading: string; content: string }> = [];
    const sectionRegex = /^(I{1,3}V?|IV|VI{0,3}|IX|X{0,3}|\d+)\.\s*(.+?)$/gm;

    let lastIndex = 0;
    let match;

    while ((match = sectionRegex.exec(text)) !== null) {
      if (lastIndex > 0) {
        const content = text.substring(lastIndex, match.index).trim();
        if (content) {
          sections.push({
            heading: sections[sections.length - 1]?.heading || 'Introduction',
            content,
          });
        }
      }

      sections.push({
        heading: match[2].trim(),
        content: '',
      });

      lastIndex = match.index + match[0].length;
    }

    // Add remaining content
    if (lastIndex < text.length) {
      const content = text.substring(lastIndex).trim();
      if (content) {
        sections.push({
          heading: sections[sections.length - 1]?.heading || 'Conclusion',
          content,
        });
      }
    }

    return sections;
  },

  /**
   * Extract metadata from legal document
   */
  extractMetadata(text: string): Record<string, any> {
    const metadata: Record<string, any> = {};

    // Extract dates
    const dateRegex = /\b(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2}|\w+\s+\d{1,2},\s+\d{4})\b/g;
    const dates = text.match(dateRegex) || [];
    if (dates.length > 0) {
      metadata.dates = dates;
    }

    // Extract case numbers
    const caseNumberRegex = /\bNo\.\s*(\d{2,4}-\d+|\d+:\d+[A-Z-]+\d+)/gi;
    const caseNumbers = text.match(caseNumberRegex) || [];
    if (caseNumbers.length > 0) {
      metadata.caseNumbers = caseNumbers;
    }

    // Extract party names
    const partyRegex = /^(.+?)\s+v\.\s+(.+?)$/gm;
    const parties = [];
    let partyMatch;
    while ((partyMatch = partyRegex.exec(text)) !== null) {
      parties.push({
        plaintiff: partyMatch[1].trim(),
        defendant: partyMatch[2].trim(),
      });
    }
    if (parties.length > 0) {
      metadata.parties = parties;
    }

    return metadata;
  },
};

// Default export
export default {
  NemotronRAG,
  NemotronClient,
  LegalRAGService,
  createLegalRAGService,
  LegalUtils,
  DocumentProcessors,
};