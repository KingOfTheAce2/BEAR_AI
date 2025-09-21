/**
 * TypeScript definitions for advanced document analysis features
 */

export interface DocumentAnalysis {
  id: string;
  filePath: string;
  fingerprint: DocumentFingerprint;
  textContent: string;
  ocrResult?: OCRResult;
  entities: EnhancedLegalEntity[];
  patterns: any[];
  complianceChecks: ComplianceCheck[];
  metadata: AnalysisMetadata;
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

export interface OCRResult {
  id: string;
  source_file: string;
  extracted_text: string;
  confidence_score: number;
  processing_time_ms: number;
  languages_detected: string[];
  page_results: PageOCRResult[];
  metadata: OCRMetadata;
}

export interface PageOCRResult {
  page_number: number;
  text: string;
  confidence: number;
  bounding_boxes: TextBoundingBox[];
  word_count: number;
  line_count: number;
}

export interface TextBoundingBox {
  text: string;
  confidence: number;
  x: number;
  y: number;
  width: number;
  height: number;
  word_level: boolean;
}

export interface OCRMetadata {
  tesseract_version: string;
  preprocessing_applied: string[];
  dpi?: number;
  image_format: string;
  file_size_bytes: number;
  processing_method: OCRMethod;
}

export enum OCRMethod {
  DirectImage = 'DirectImage',
  PDFToImages = 'PDFToImages',
  PreprocessedImage = 'PreprocessedImage',
  MultiLanguage = 'MultiLanguage'
}

export interface LegalEntity {
  entity_type: string;
  text: string;
  confidence: number;
  start_pos: number;
  end_pos: number;
  context: string;
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

export interface AnalysisMetadata {
  processingTime: number;
  version: string;
  analyzer: string;
  confidence: number;
}

export interface LegalEntityMatch {
  entity_type: string;
  text: string;
  start_pos: number;
  end_pos: number;
  confidence: number;
  context: string;
}

// Document Version Control Types
export interface DocumentVersion {
  id: string;
  documentId: string;
  version: number;
  timestamp: Date;
  fingerprint: DocumentFingerprint;
  changes: DocumentChange[];
  author?: string;
  comment?: string;
  parentVersion?: string;
  tags: string[];
  metadata: VersionMetadata;
}

export interface DocumentChange {
  type: 'addition' | 'deletion' | 'modification' | 'move';
  location: {
    start: number;
    end: number;
    page?: number;
    section?: string;
  };
  oldContent?: string;
  newContent?: string;
  severity: 'minor' | 'major' | 'critical';
  category: 'text' | 'structure' | 'metadata' | 'legal_entity' | 'clause';
  confidence: number;
}

export interface VersionMetadata {
  size: number;
  wordCount: number;
  pageCount: number;
  checksum: string;
  analysisVersion: string;
  processingTime: number;
}

export interface DiffResult {
  documentId: string;
  fromVersion: string;
  toVersion: string;
  summary: DiffSummary;
  changes: DocumentChange[];
  visualDiff?: VisualDiff;
  recommendations: string[];
}

export interface DiffSummary {
  totalChanges: number;
  additions: number;
  deletions: number;
  modifications: number;
  severity: 'minor' | 'major' | 'critical';
  confidenceScore: number;
  impactedSections: string[];
}

export interface VisualDiff {
  htmlDiff: string;
  highlightedRegions: Array<{
    type: 'added' | 'removed' | 'modified';
    start: number;
    end: number;
    content: string;
  }>;
}

// Error Handling Types
export interface ProcessingError {
  code: string;
  message: string;
  details?: string;
  timestamp: Date;
  context?: Record<string, any>;
  recoverable: boolean;
}

export interface ErrorReport {
  id: string;
  errors: ProcessingError[];
  summary: {
    totalErrors: number;
    criticalErrors: number;
    recoverableErrors: number;
  };
  affectedDocuments: string[];
  generatedAt: Date;
}

// Performance Monitoring Types
export interface PerformanceMetrics {
  processingTime: number;
  memoryUsage: number;
  cpuUsage: number;
  diskIO: number;
  networkLatency?: number;
  throughput: number;
  errorRate: number;
}

export interface BenchmarkResult {
  testName: string;
  metrics: PerformanceMetrics;
  baseline?: PerformanceMetrics;
  improvement?: number;
  timestamp: Date;
}