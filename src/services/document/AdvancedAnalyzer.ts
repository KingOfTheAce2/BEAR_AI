import { DocumentAnalysis, LegalEntity, OCRResult } from '../../types/document';

/**
 * Advanced Document Analyzer Service
 * Provides enterprise-grade legal document analysis with OCR integration
 */

export interface AdvancedAnalysisConfig {
  enableOCR: boolean;
  enableEntityRecognition: boolean;
  enablePatternMatching: boolean;
  enableComplianceChecking: boolean;
  enableVersionTracking: boolean;
  parallelProcessing: boolean;
  maxConcurrentJobs: number;
}

export interface LegalPattern {
  name: string;
  pattern: RegExp;
  category: 'citation' | 'statute' | 'court' | 'entity' | 'date' | 'monetary';
  confidence: number;
  jurisdiction?: string;
}

export interface AnalysisProgress {
  jobId: string;
  stage: string;
  progress: number;
  message: string;
  estimatedTimeRemaining?: number;
  errors?: string[];
}

export interface EnhancedLegalEntity extends LegalEntity {
  sourceType: 'ocr' | 'text' | 'hybrid';
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
    page: number;
  };
  verification?: {
    verified: boolean;
    source?: string;
    confidence: number;
  };
}

export interface ComplianceCheck {
  regulation: string;
  requirement: string;
  status: 'compliant' | 'non_compliant' | 'partial' | 'requires_review';
  details: string;
  recommendation: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  references: string[];
}

export interface DocumentFingerprint {
  hash: string;
  structure: {
    pageCount: number;
    wordCount: number;
    paragraphCount: number;
    sections: string[];
  };
  metadata: {
    created: string;
    modified: string;
    author?: string;
    title?: string;
  };
}

export class AdvancedDocumentAnalyzer {
  private config: AdvancedAnalysisConfig;
  private legalPatterns: LegalPattern[];
  private activeJobs: Map<string, AnalysisProgress>;
  private jobQueue: Array<{ jobId: string; priority: number; }>;

  constructor(config: AdvancedAnalysisConfig) {
    this.config = config;
    this.activeJobs = new Map();
    this.jobQueue = [];
    this.legalPatterns = this.initializeLegalPatterns();
  }

  /**
   * Initialize comprehensive legal patterns for entity recognition
   */
  private initializeLegalPatterns(): LegalPattern[] {
    return [
      // Federal case citations
      {
        name: 'federal_case_citation',
        pattern: /(\d+)\s+(F\.?\s*(?:2d|3d)?|S\.?\s*Ct\.?|U\.?\s*S\.?)\s+(\d+)(?:\s*\(([^)]+)\s+(\d{4})\))?/gi,
        category: 'citation',
        confidence: 0.95,
        jurisdiction: 'federal'
      },

      // State case citations
      {
        name: 'state_case_citation',
        pattern: /(\d+)\s+([A-Z][a-z]*\.?\s*(?:2d|3d)?)\s+(\d+)(?:\s*\(([^)]+)\s+(\d{4})\))?/gi,
        category: 'citation',
        confidence: 0.85
      },

      // USC references
      {
        name: 'usc_reference',
        pattern: /(\d+)\s+U\.?S\.?C\.?\s+§?\s*(\d+(?:[a-z])?(?:\(\w+\))?)/gi,
        category: 'statute',
        confidence: 0.98,
        jurisdiction: 'federal'
      },

      // CFR references
      {
        name: 'cfr_reference',
        pattern: /(\d+)\s+C\.?F\.?R\.?\s+§?\s*(\d+(?:\.\d+)*)/gi,
        category: 'statute',
        confidence: 0.95,
        jurisdiction: 'federal'
      },

      // Federal courts
      {
        name: 'federal_court',
        pattern: /(?:U\.?S\.?\s+)?(?:Supreme\s+Court|District\s+Court|Court\s+of\s+Appeals|Bankruptcy\s+Court|Tax\s+Court|Court\s+of\s+Federal\s+Claims)/gi,
        category: 'court',
        confidence: 0.90,
        jurisdiction: 'federal'
      },

      // State courts
      {
        name: 'state_court',
        pattern: /(?:Supreme\s+Court|Superior\s+Court|Circuit\s+Court|District\s+Court|Municipal\s+Court|Family\s+Court|Probate\s+Court)\s+of\s+[A-Z][a-z]+/gi,
        category: 'court',
        confidence: 0.85
      },

      // Legal entities
      {
        name: 'legal_parties',
        pattern: /\b(?:plaintiff|defendant|appellant|appellee|petitioner|respondent|intervenor|amicus\s+curiae?)\b/gi,
        category: 'entity',
        confidence: 0.88
      },

      // Legal professionals
      {
        name: 'legal_professionals',
        pattern: /\b(?:judge|justice|magistrate|attorney|counsel|esquire|esq\.?)\b/gi,
        category: 'entity',
        confidence: 0.85
      },

      // Contract dates
      {
        name: 'contract_dates',
        pattern: /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b/gi,
        category: 'date',
        confidence: 0.92
      },

      // Monetary amounts with legal context
      {
        name: 'legal_monetary',
        pattern: /\$[\d,]+(?:\.\d{2})?(?:\s+(?:dollars?|USD))?|\b(?:damages?|settlement|award|fine|penalty|fee)\s+(?:of\s+)?\$?[\d,]+(?:\.\d{2})?/gi,
        category: 'monetary',
        confidence: 0.90
      },

      // Contract terms
      {
        name: 'contract_terms',
        pattern: /\b(?:whereas|therefore|notwithstanding|provided\s+that|subject\s+to|in\s+consideration\s+of|force\s+majeure|breach|default|termination|assignment)\b/gi,
        category: 'entity',
        confidence: 0.80
      },

      // Jurisdictional references
      {
        name: 'jurisdiction',
        pattern: /\b(?:federal|state|local|municipal|county|district)\s+(?:law|statute|regulation|ordinance|code)\b/gi,
        category: 'entity',
        confidence: 0.85
      }
    ];
  }

  /**
   * Analyze document with advanced features
   */
  async analyzeDocument(
    filePath: string,
    options: Partial<AdvancedAnalysisConfig> = {}
  ): Promise<{
    jobId: string;
    analysis?: DocumentAnalysis;
    progressCallback?: (progress: AnalysisProgress) => void;
  }> {
    const jobId = this.generateJobId();
    const mergedConfig = { ...this.config, ...options };

    // Initialize progress tracking
    const progress: AnalysisProgress = {
      jobId,
      stage: 'initializing',
      progress: 0,
      message: 'Starting document analysis...'
    };

    this.activeJobs.set(jobId, progress);

    try {
      // Stage 1: Document fingerprinting
      this.updateProgress(jobId, {
        stage: 'fingerprinting',
        progress: 10,
        message: 'Creating document fingerprint...'
      });

      const fingerprint = await this.createDocumentFingerprint(filePath);

      // Stage 2: Text extraction (with OCR if needed)
      this.updateProgress(jobId, {
        stage: 'text_extraction',
        progress: 25,
        message: 'Extracting text content...'
      });

      const textContent = await this.extractTextWithOCR(filePath, mergedConfig);

      // Stage 3: Advanced entity recognition
      this.updateProgress(jobId, {
        stage: 'entity_recognition',
        progress: 50,
        message: 'Recognizing legal entities...'
      });

      const entities = await this.performAdvancedEntityRecognition(
        textContent.text,
        textContent.ocrResult
      );

      // Stage 4: Pattern matching
      this.updateProgress(jobId, {
        stage: 'pattern_matching',
        progress: 70,
        message: 'Analyzing legal patterns...'
      });

      const patterns = await this.analyzePatterns(textContent.text);

      // Stage 5: Compliance checking
      this.updateProgress(jobId, {
        stage: 'compliance_check',
        progress: 85,
        message: 'Checking compliance requirements...'
      });

      const complianceChecks = await this.performComplianceChecks(
        textContent.text,
        entities,
        patterns
      );

      // Stage 6: Finalization
      this.updateProgress(jobId, {
        stage: 'finalizing',
        progress: 95,
        message: 'Finalizing analysis...'
      });

      const analysis: DocumentAnalysis = {
        id: jobId,
        filePath,
        fingerprint,
        textContent: textContent.text,
        ocrResult: textContent.ocrResult,
        entities,
        patterns,
        complianceChecks,
        metadata: {
          processingTime: Date.now() - parseInt(jobId),
          version: '2.0.0',
          analyzer: 'AdvancedDocumentAnalyzer',
          confidence: this.calculateOverallConfidence(entities, patterns),
        }
      };

      this.updateProgress(jobId, {
        stage: 'completed',
        progress: 100,
        message: 'Analysis completed successfully'
      });

      return { jobId, analysis };

    } catch (error) {
      this.updateProgress(jobId, {
        stage: 'error',
        progress: 0,
        message: `Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      });

      throw error;
    }
  }

  /**
   * Extract text with OCR support
   */
  private async extractTextWithOCR(
    filePath: string,
    config: AdvancedAnalysisConfig
  ): Promise<{ text: string; ocrResult?: OCRResult }> {
    if (!config.enableOCR) {
      // Use existing document parser
      const response = await window.__TAURI__.invoke('analyze_document_file', {
        filePath
      });
      return { text: response.extracted_text };
    }

    try {
      // Use OCR processor
      const ocrResult: OCRResult = await window.__TAURI__.invoke('process_document_ocr', {
        filePath
      });

      return {
        text: ocrResult.extracted_text,
        ocrResult
      };
    } catch (error) {
      // Warning logging disabled for production

      // Fallback to standard extraction
      const response = await window.__TAURI__.invoke('analyze_document_file', {
        filePath
      });
      return { text: response.extracted_text };
    }
  }

  /**
   * Perform advanced entity recognition
   */
  private async performAdvancedEntityRecognition(
    text: string,
    ocrResult?: OCRResult
  ): Promise<EnhancedLegalEntity[]> {
    const entities: EnhancedLegalEntity[] = [];

    // Extract entities from text using patterns
    for (const pattern of this.legalPatterns) {
      const matches = text.matchAll(pattern.pattern);

      for (const match of matches) {
        if (match.index !== undefined) {
          const entity: EnhancedLegalEntity = {
            entity_type: pattern.category,
            text: match[0],
            confidence: pattern.confidence,
            start_pos: match.index,
            end_pos: match.index + match[0].length,
            context: this.getContext(text, match.index, match.index + match[0].length),
            sourceType: ocrResult ? 'hybrid' : 'text',
            verification: {
              verified: false,
              confidence: pattern.confidence
            }
          };

          // Add bounding box if from OCR
          if (ocrResult) {
            entity.boundingBox = this.findBoundingBox(match[0], ocrResult);
          }

          entities.push(entity);
        }
      }
    }

    // Get additional entities from Rust backend if OCR is available
    if (ocrResult) {
      try {
        const ocrEntities = await window.__TAURI__.invoke('extract_legal_entities_from_ocr', {
          text
        });

        for (const ocrEntity of ocrEntities) {
          entities.push({
            entity_type: ocrEntity.entity_type,
            text: ocrEntity.text,
            confidence: ocrEntity.confidence,
            start_pos: ocrEntity.start_pos,
            end_pos: ocrEntity.end_pos,
            context: ocrEntity.context,
            sourceType: 'ocr',
            verification: {
              verified: false,
              confidence: ocrEntity.confidence
            }
          });
        }
      } catch (error) {
        // Warning logging disabled for production
      }
    }

    return this.deduplicateEntities(entities);
  }

  /**
   * Analyze patterns in the document
   */
  private async analyzePatterns(text: string): Promise<any[]> {
    const patterns = [];

    // Document structure analysis
    const paragraphs = text.split(/\n\s*\n/).length;
    const sentences = text.split(/[.!?]+/).length;
    const avgSentenceLength = text.length / sentences;

    patterns.push({
      type: 'document_structure',
      data: {
        paragraphs,
        sentences,
        avgSentenceLength,
        complexity: avgSentenceLength > 25 ? 'high' : avgSentenceLength > 15 ? 'medium' : 'low'
      }
    });

    // Legal document type detection
    const documentTypePatterns = {
      contract: /\b(?:agreement|contract|terms|conditions|party|parties)\b/gi,
      brief: /\b(?:brief|argument|motion|petition)\b/gi,
      opinion: /\b(?:opinion|holding|reasoning|court\s+finds)\b/gi,
      statute: /\b(?:section|subsection|paragraph|code|statute)\b/gi,
    };

    const typeScores: { [key: string]: number } = {};
    for (const [type, pattern] of Object.entries(documentTypePatterns)) {
      const matches = text.match(pattern);
      typeScores[type] = matches ? matches.length : 0;
    }

    const likelyType = Object.entries(typeScores)
      .sort(([,a], [,b]) => b - a)[0];

    patterns.push({
      type: 'document_type',
      data: {
        detected: likelyType[0],
        confidence: likelyType[1] / (text.length / 1000), // Normalize by document length
        scores: typeScores
      }
    });

    return patterns;
  }

  /**
   * Perform compliance checks
   */
  private async performComplianceChecks(
    text: string,
    entities: EnhancedLegalEntity[],
    patterns: any[]
  ): Promise<ComplianceCheck[]> {
    const checks: ComplianceCheck[] = [];

    // GDPR compliance for contracts
    const gdprKeywords = /\b(?:personal\s+data|data\s+protection|gdpr|privacy\s+policy|consent|data\s+subject)\b/gi;
    const gdprMatches = text.match(gdprKeywords);

    if (gdprMatches && gdprMatches.length > 0) {
      checks.push({
        regulation: 'GDPR',
        requirement: 'Data protection clauses',
        status: gdprMatches.length >= 3 ? 'compliant' : 'requires_review',
        details: `Found ${gdprMatches.length} data protection references`,
        recommendation: gdprMatches.length < 3
          ? 'Consider adding more comprehensive data protection clauses'
          : 'Data protection references appear adequate',
        priority: 'high',
        references: gdprMatches
      });
    }

    // SOX compliance for financial documents
    const soxKeywords = /\b(?:internal\s+controls|financial\s+reporting|material\s+weakness|disclosure\s+controls)\b/gi;
    const soxMatches = text.match(soxKeywords);

    if (soxMatches && soxMatches.length > 0) {
      checks.push({
        regulation: 'SOX',
        requirement: 'Internal controls documentation',
        status: soxMatches.length >= 2 ? 'compliant' : 'requires_review',
        details: `Found ${soxMatches.length} internal controls references`,
        recommendation: 'Review internal controls documentation completeness',
        priority: 'high',
        references: soxMatches
      });
    }

    // Contract completeness check
    const essentialClauses = [
      'termination',
      'liability',
      'governing law',
      'dispute resolution',
      'force majeure'
    ];

    const missingClauses = essentialClauses.filter(clause =>
      !text.toLowerCase().includes(clause.replace(' ', '\\s+'))
    );

    if (missingClauses.length > 0) {
      checks.push({
        regulation: 'Contract Best Practices',
        requirement: 'Essential contract clauses',
        status: missingClauses.length > 2 ? 'non_compliant' : 'requires_review',
        details: `Missing clauses: ${missingClauses.join(', ')}`,
        recommendation: 'Consider adding missing essential clauses',
        priority: missingClauses.length > 2 ? 'high' : 'medium',
        references: []
      });
    }

    return checks;
  }

  /**
   * Create document fingerprint for version tracking
   */
  private async createDocumentFingerprint(filePath: string): Promise<DocumentFingerprint> {
    // This would typically use the file system to get metadata
    // and create a hash of the document content

    const hash = await this.calculateFileHash(filePath);

    return {
      hash,
      structure: {
        pageCount: 0, // Would be determined from document
        wordCount: 0, // Would be calculated from text
        paragraphCount: 0, // Would be calculated from text
        sections: [] // Would be extracted from document structure
      },
      metadata: {
        created: new Date().toISOString(),
        modified: new Date().toISOString()
      }
    };
  }

  /**
   * Calculate file hash for fingerprinting
   */
  private async calculateFileHash(filePath: string): Promise<string> {
    // This would use a proper hashing algorithm in production
    // For now, return a mock hash based on timestamp and path
    const timestamp = Date.now().toString();
    const pathHash = filePath.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);

    return `${timestamp}-${Math.abs(pathHash).toString(16)}`;
  }

  /**
   * Find bounding box for text in OCR result
   */
  private findBoundingBox(text: string, ocrResult: OCRResult): any {
    for (const page of ocrResult.page_results) {
      for (const bbox of page.bounding_boxes) {
        if (bbox.text.includes(text) || text.includes(bbox.text)) {
          return {
            x: bbox.x,
            y: bbox.y,
            width: bbox.width,
            height: bbox.height,
            page: page.page_number
          };
        }
      }
    }
    return undefined;
  }

  /**
   * Get context around text position
   */
  private getContext(text: string, start: number, end: number): string {
    const contextSize = 100;
    const contextStart = Math.max(0, start - contextSize);
    const contextEnd = Math.min(text.length, end + contextSize);
    return text.slice(contextStart, contextEnd);
  }

  /**
   * Deduplicate entities
   */
  private deduplicateEntities(entities: EnhancedLegalEntity[]): EnhancedLegalEntity[] {
    const unique = new Map<string, EnhancedLegalEntity>();

    for (const entity of entities) {
      const key = `${entity.text.toLowerCase()}-${entity.entity_type}`;
      const existing = unique.get(key);

      if (!existing || entity.confidence > existing.confidence) {
        unique.set(key, entity);
      }
    }

    return Array.from(unique.values());
  }

  /**
   * Calculate overall confidence score
   */
  private calculateOverallConfidence(
    entities: EnhancedLegalEntity[],
    patterns: any[]
  ): number {
    if (entities.length === 0) return 0;

    const entityConfidence = entities.reduce((sum, e) => sum + e.confidence, 0) / entities.length;
    const patternConfidence = patterns.length > 0 ? 0.8 : 0.5; // Base confidence for pattern analysis

    return (entityConfidence + patternConfidence) / 2;
  }

  /**
   * Generate unique job ID
   */
  private generateJobId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Update analysis progress
   */
  private updateProgress(jobId: string, update: Partial<AnalysisProgress>): void {
    const current = this.activeJobs.get(jobId);
    if (current) {
      const updated = { ...current, ...update };
      this.activeJobs.set(jobId, updated);
    }
  }

  /**
   * Get analysis progress
   */
  getProgress(jobId: string): AnalysisProgress | undefined {
    return this.activeJobs.get(jobId);
  }

  /**
   * Cancel analysis job
   */
  cancelJob(jobId: string): boolean {
    return this.activeJobs.delete(jobId);
  }

  /**
   * Get active jobs
   */
  getActiveJobs(): AnalysisProgress[] {
    return Array.from(this.activeJobs.values());
  }
}

// Export singleton instance
export const advancedAnalyzer = new AdvancedDocumentAnalyzer({
  enableOCR: true,
  enableEntityRecognition: true,
  enablePatternMatching: true,
  enableComplianceChecking: true,
  enableVersionTracking: true,
  parallelProcessing: true,
  maxConcurrentJobs: 3
});