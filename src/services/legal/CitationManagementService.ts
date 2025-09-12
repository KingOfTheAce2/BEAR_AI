// Citation Management Service for legal citation verification and formatting
import { Citation, CitationType, CitationSource } from '../../types/legal';

export interface CitationValidationResult {
  isValid: boolean;
  citation: Citation;
  errors: CitationError[];
  suggestions: CitationSuggestion[];
  confidence: number;
  lastVerified: Date;
}

export interface CitationError {
  type: 'format' | 'missing_info' | 'invalid_source' | 'broken_link' | 'outdated';
  severity: 'error' | 'warning' | 'info';
  description: string;
  field?: string;
  suggestion?: string;
}

export interface CitationSuggestion {
  type: 'format_improvement' | 'additional_info' | 'alternative_source' | 'pinpoint';
  description: string;
  suggestedValue: string;
  rationale: string;
}

export interface CitationStyle {
  name: 'bluebook' | 'alwd' | 'apa' | 'mla' | 'chicago' | 'custom';
  version: string;
  jurisdiction?: string;
  courtRules?: string[];
}

export interface CitationDatabase {
  name: 'westlaw' | 'lexis' | 'google_scholar' | 'courtlistener' | 'justia' | 'free_law';
  apiKey?: string;
  subscription: boolean;
  coverage: string[];
  lastUpdated: Date;
}

export interface BulkCitationRequest {
  citations: string[];
  style: CitationStyle;
  verifyAll: boolean;
  formatAll: boolean;
  includePinpoints: boolean;
}

export interface BulkCitationResult {
  processed: number;
  successful: number;
  failed: number;
  results: CitationValidationResult[];
  summary: CitationSummary;
}

export interface CitationSummary {
  totalCitations: number;
  validCitations: number;
  invalidCitations: number;
  warningCitations: number;
  byType: Record<CitationType, number>;
  bySource: Record<string, number>;
  commonErrors: string[];
}

export class CitationManagementService {
  private apiBaseUrl: string;
  private apiKey: string;
  private databases: CitationDatabase[];

  constructor(apiBaseUrl = '/api/legal', apiKey = '') {
    this.apiBaseUrl = apiBaseUrl;
    this.apiKey = apiKey;
    this.databases = this.initializeDatabases();
  }

  private initializeDatabases(): CitationDatabase[] {
    return [
      {
        name: 'courtlistener',
        subscription: false,
        coverage: ['US Federal', 'US State'],
        lastUpdated: new Date()
      },
      {
        name: 'free_law',
        subscription: false,
        coverage: ['US Federal', 'US State'],
        lastUpdated: new Date()
      },
      {
        name: 'google_scholar',
        subscription: false,
        coverage: ['International', 'US Federal', 'US State'],
        lastUpdated: new Date()
      }
    ];
  }

  // Citation Extraction
  async extractCitations(text: string, includeContext = false): Promise<Citation[]> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/citations/extract`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({ text, includeContext })
      });

      if (!response.ok) {
        throw new Error(`Citation extraction failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.citations || [];
    } catch (error) {
      console.error('Error extracting citations:', error);
      return [];
    }
  }

  async extractFromDocument(documentId: string): Promise<Citation[]> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/citations/extract/document/${documentId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      if (!response.ok) {
        throw new Error(`Document citation extraction failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.citations || [];
    } catch (error) {
      console.error('Error extracting citations from document:', error);
      return [];
    }
  }

  // Citation Validation and Verification
  async validateCitation(citation: Citation): Promise<CitationValidationResult> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/citations/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(citation)
      });

      if (!response.ok) {
        throw new Error(`Citation validation failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error validating citation:', error);
      return {
        isValid: false,
        citation,
        errors: [{ type: 'invalid_source', severity: 'error', description: 'Unable to validate citation' }],
        suggestions: [],
        confidence: 0,
        lastVerified: new Date()
      };
    }
  }

  async verifyCitationSource(citation: Citation): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/citations/verify-source`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(citation)
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      return data.verified || false;
    } catch (error) {
      console.error('Error verifying citation source:', error);
      return false;
    }
  }

  async bulkValidate(request: BulkCitationRequest): Promise<BulkCitationResult> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/citations/bulk-validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new Error(`Bulk citation validation failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error in bulk citation validation:', error);
      throw error;
    }
  }

  // Citation Formatting
  async formatCitation(citation: Citation, style: CitationStyle): Promise<string> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/citations/format`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({ citation, style })
      });

      if (!response.ok) {
        throw new Error(`Citation formatting failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.formatted || citation.fullCitation;
    } catch (error) {
      console.error('Error formatting citation:', error);
      return citation.fullCitation;
    }
  }

  async formatMultipleCitations(citations: Citation[], style: CitationStyle): Promise<string[]> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/citations/format-multiple`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({ citations, style })
      });

      if (!response.ok) {
        throw new Error(`Multiple citation formatting failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.formatted || citations.map(c => c.fullCitation);
    } catch (error) {
      console.error('Error formatting multiple citations:', error);
      return citations.map(c => c.fullCitation);
    }
  }

  async generateShortForm(citation: Citation): Promise<string> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/citations/short-form`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(citation)
      });

      if (!response.ok) {
        throw new Error(`Short form generation failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.shortForm || citation.shortForm;
    } catch (error) {
      console.error('Error generating short form:', error);
      return citation.shortForm;
    }
  }

  // Citation Database Integration
  async searchInDatabases(query: string, databases?: string[]): Promise<Citation[]> {
    try {
      const targetDatabases = databases || this.databases.map(db => db.name);
      
      const response = await fetch(`${this.apiBaseUrl}/citations/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({ query, databases: targetDatabases })
      });

      if (!response.ok) {
        throw new Error(`Citation database search failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.results || [];
    } catch (error) {
      console.error('Error searching citation databases:', error);
      return [];
    }
  }

  async getCitationMetadata(citation: Citation): Promise<CitationMetadata> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/citations/metadata`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(citation)
      });

      if (!response.ok) {
        throw new Error(`Citation metadata fetch failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching citation metadata:', error);
      return { found: false, lastChecked: new Date() };
    }
  }

  // Citation Table Management
  async generateCitationTable(citations: Citation[], style: CitationStyle): Promise<CitationTable> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/citations/table`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({ citations, style })
      });

      if (!response.ok) {
        throw new Error(`Citation table generation failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error generating citation table:', error);
      throw error;
    }
  }

  async checkForDuplicates(citations: Citation[]): Promise<DuplicateReport> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/citations/duplicates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({ citations })
      });

      if (!response.ok) {
        throw new Error(`Duplicate check failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error checking for duplicates:', error);
      return { duplicates: [], uniqueCitations: citations.length };
    }
  }

  // Citation Analytics
  async analyzeCitationQuality(citations: Citation[]): Promise<CitationQualityReport> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/citations/analyze-quality`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({ citations })
      });

      if (!response.ok) {
        throw new Error(`Citation quality analysis failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error analyzing citation quality:', error);
      throw error;
    }
  }

  async generateCitationReport(documentId: string): Promise<CitationReport> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/citations/report/${documentId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      if (!response.ok) {
        throw new Error(`Citation report generation failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error generating citation report:', error);
      throw error;
    }
  }

  // Real-time Citation Checking
  async watchForBrokenLinks(citations: Citation[]): Promise<void> {
    try {
      await fetch(`${this.apiBaseUrl}/citations/watch-links`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({ citations })
      });
    } catch (error) {
      console.error('Error setting up link watching:', error);
    }
  }

  async getUpdatedCitations(since: Date): Promise<Citation[]> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/citations/updates?since=${since.toISOString()}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      if (!response.ok) {
        throw new Error(`Citation updates fetch failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.citations || [];
    } catch (error) {
      console.error('Error fetching citation updates:', error);
      return [];
    }
  }
}

// Supporting interfaces
export interface CitationMetadata {
  found: boolean;
  title?: string;
  authors?: string[];
  publicationDate?: Date;
  court?: string;
  jurisdiction?: string;
  volume?: string;
  page?: string;
  url?: string;
  pdfUrl?: string;
  lastChecked: Date;
  archiveUrl?: string;
}

export interface CitationTable {
  id: string;
  entries: CitationTableEntry[];
  style: CitationStyle;
  generatedAt: Date;
  format: 'html' | 'docx' | 'pdf';
}

export interface CitationTableEntry {
  shortForm: string;
  fullCitation: string;
  type: CitationType;
  firstAppearance: number;
  frequency: number;
}

export interface DuplicateReport {
  duplicates: DuplicateGroup[];
  uniqueCitations: number;
  totalChecked: number;
  similarityThreshold: number;
}

export interface DuplicateGroup {
  original: Citation;
  duplicates: Citation[];
  similarityScore: number;
  recommendation: 'merge' | 'keep_separate' | 'review';
}

export interface CitationQualityReport {
  overallScore: number;
  breakdown: {
    format: number;
    completeness: number;
    accuracy: number;
    recency: number;
  };
  issues: CitationError[];
  recommendations: string[];
  topSources: string[];
  citationDiversity: number;
}

export interface CitationReport {
  documentId: string;
  totalCitations: number;
  validCitations: number;
  brokenLinks: number;
  outdatedCitations: number;
  qualityScore: number;
  recommendations: string[];
  citationsByType: Record<CitationType, number>;
  timeline: CitationTimelineEntry[];
}

export interface CitationTimelineEntry {
  date: Date;
  action: 'added' | 'verified' | 'updated' | 'flagged';
  citationId: string;
  details: string;
}

export default CitationManagementService;