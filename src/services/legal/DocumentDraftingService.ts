// Document Drafting Service for legal document creation and automation
import { 
  LegalDocument, 
  LegalDocumentType, 
  LegalCategory, 
  CommunicationTemplate,
  TemplateVariable,
  LegalWorkflow,
  WorkflowStep
} from '../../types/legal';

export interface DraftingTemplate {
  id: string;
  name: string;
  type: LegalDocumentType;
  category: LegalCategory;
  description: string;
  content: string;
  variables: TemplateVariable[];
  clauses: TemplateClause[];
  jurisdiction: string[];
  version: string;
  createdBy: string;
  lastModified: Date;
  isActive: boolean;
  tags: string[];
  usageCount: number;
  rating: number;
}

export interface TemplateClause {
  id: string;
  name: string;
  type: string;
  content: string;
  isOptional: boolean;
  conditions?: ClauseCondition[];
  alternatives: string[];
  notes?: string;
}

export interface ClauseCondition {
  variable: string;
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'exists';
  value: any;
}

export interface DocumentAssemblyRequest {
  templateId: string;
  variables: Record<string, any>;
  selectedClauses: string[];
  customizations: DocumentCustomization[];
  outputFormat: 'docx' | 'pdf' | 'html' | 'markdown';
  jurisdiction: string[];
  practiceArea: string;
}

export interface DocumentCustomization {
  type: 'add_clause' | 'modify_clause' | 'remove_clause' | 'add_section';
  location: string;
  content: string;
  instructions?: string;
}

export interface DraftingResult {
  documentId: string;
  content: string;
  metadata: DraftingMetadata;
  suggestions: DraftingSuggestion[];
  warnings: DraftingWarning[];
  nextSteps: string[];
}

export interface DraftingMetadata {
  templateUsed: string;
  variablesApplied: Record<string, any>;
  clausesIncluded: string[];
  jurisdiction: string[];
  practiceArea: string;
  estimatedReviewTime: number;
  confidentialityLevel: string;
}

export interface DraftingSuggestion {
  type: 'improvement' | 'addition' | 'clarification' | 'compliance';
  section: string;
  description: string;
  suggestedText?: string;
  rationale: string;
  priority: 'low' | 'medium' | 'high';
  lawReferences?: string[];
}

export interface DraftingWarning {
  type: 'legal_risk' | 'compliance' | 'missing_clause' | 'inconsistency';
  severity: 'info' | 'warning' | 'error' | 'critical';
  description: string;
  location?: string;
  recommendation: string;
  requiredAction?: boolean;
}

export class DocumentDraftingService {
  private apiBaseUrl: string;
  private apiKey: string;

  constructor(apiBaseUrl = '/api/legal', apiKey = '') {
    this.apiBaseUrl = apiBaseUrl;
    this.apiKey = apiKey;
  }

  // Template Management
  async getTemplates(filters?: TemplateFilters): Promise<DraftingTemplate[]> {
    try {
      const params = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined) {
            params.append(key, Array.isArray(value) ? value.join(',') : value.toString());
          }
        });
      }

      const response = await fetch(`${this.apiBaseUrl}/drafting/templates?${params}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      if (!response.ok) {
        throw new Error(`Templates fetch failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.templates || [];
    } catch (error) {
      console.error('Error fetching templates:', error);
      return [];
    }
  }

  async getTemplate(templateId: string): Promise<DraftingTemplate | null> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/drafting/templates/${templateId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error(`Template fetch failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching template:', error);
      return null;
    }
  }

  async createTemplate(template: Omit<DraftingTemplate, 'id' | 'createdBy' | 'lastModified' | 'usageCount' | 'rating'>): Promise<DraftingTemplate> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/drafting/templates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(template)
      });

      if (!response.ok) {
        throw new Error(`Template creation failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating template:', error);
      throw error;
    }
  }

  // Document Assembly
  async assembleDocument(request: DocumentAssemblyRequest): Promise<DraftingResult> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/drafting/assemble`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new Error(`Document assembly failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error assembling document:', error);
      throw error;
    }
  }

  async generateFromPrompt(prompt: string, docType: LegalDocumentType, jurisdiction: string[]): Promise<DraftingResult> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/drafting/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          prompt,
          documentType: docType,
          jurisdiction,
          includeStandardClauses: true,
          includeAnalysis: true
        })
      });

      if (!response.ok) {
        throw new Error(`Document generation failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error generating document from prompt:', error);
      throw error;
    }
  }

  // Clause Library Management
  async getClauseLibrary(filters?: ClauseFilters): Promise<TemplateClause[]> {
    try {
      const params = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined) {
            params.append(key, Array.isArray(value) ? value.join(',') : value.toString());
          }
        });
      }

      const response = await fetch(`${this.apiBaseUrl}/drafting/clauses?${params}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      if (!response.ok) {
        throw new Error(`Clause library fetch failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.clauses || [];
    } catch (error) {
      console.error('Error fetching clause library:', error);
      return [];
    }
  }

  async generateClause(type: string, requirements: ClauseRequirements): Promise<TemplateClause> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/drafting/clauses/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({ type, requirements })
      });

      if (!response.ok) {
        throw new Error(`Clause generation failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error generating clause:', error);
      throw error;
    }
  }

  // Document Review and Improvement
  async reviewDraft(content: string, docType: LegalDocumentType): Promise<ReviewResult> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/drafting/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({ content, documentType: docType })
      });

      if (!response.ok) {
        throw new Error(`Document review failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error reviewing draft:', error);
      throw error;
    }
  }

  async suggestImprovements(documentId: string): Promise<DraftingSuggestion[]> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/drafting/${documentId}/improve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      if (!response.ok) {
        throw new Error(`Improvement suggestions failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.suggestions || [];
    } catch (error) {
      console.error('Error suggesting improvements:', error);
      return [];
    }
  }

  // Specialized Document Types
  async createContract(contractSpec: ContractSpecification): Promise<DraftingResult> {
    return this.assembleDocument({
      templateId: `contract_${contractSpec.type}`,
      variables: contractSpec.terms,
      selectedClauses: contractSpec.requiredClauses || [],
      customizations: contractSpec.customizations || [],
      outputFormat: contractSpec.format || 'docx',
      jurisdiction: contractSpec.jurisdiction,
      practiceArea: 'contracts'
    });
  }

  async createBrief(briefSpec: BriefSpecification): Promise<DraftingResult> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/drafting/brief`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(briefSpec)
      });

      if (!response.ok) {
        throw new Error(`Brief creation failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating brief:', error);
      throw error;
    }
  }

  async createMemo(memoSpec: MemoSpecification): Promise<DraftingResult> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/drafting/memo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(memoSpec)
      });

      if (!response.ok) {
        throw new Error(`Memo creation failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating memo:', error);
      throw error;
    }
  }

  // Document Collaboration
  async createCollaborativeSession(documentId: string, collaborators: string[]): Promise<CollaborativeSession> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/drafting/collaborate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({ documentId, collaborators })
      });

      if (!response.ok) {
        throw new Error(`Collaborative session creation failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating collaborative session:', error);
      throw error;
    }
  }

  async trackChanges(documentId: string, changes: DocumentChange[]): Promise<void> {
    try {
      await fetch(`${this.apiBaseUrl}/drafting/${documentId}/changes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({ changes })
      });
    } catch (error) {
      console.error('Error tracking changes:', error);
    }
  }

  // Export and Format
  async exportDocument(documentId: string, format: 'docx' | 'pdf' | 'html' | 'markdown'): Promise<Blob> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/drafting/${documentId}/export?format=${format}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      if (!response.ok) {
        throw new Error(`Document export failed: ${response.statusText}`);
      }

      return await response.blob();
    } catch (error) {
      console.error('Error exporting document:', error);
      throw error;
    }
  }
}

// Supporting interfaces
export interface TemplateFilters {
  type?: LegalDocumentType[];
  category?: LegalCategory[];
  jurisdiction?: string[];
  practiceArea?: string[];
  tags?: string[];
  isActive?: boolean;
}

export interface ClauseFilters {
  type?: string[];
  jurisdiction?: string[];
  isOptional?: boolean;
  tags?: string[];
}

export interface ClauseRequirements {
  jurisdiction: string[];
  context: string;
  protectionLevel: 'standard' | 'enhanced' | 'maximum';
  customTerms?: Record<string, any>;
}

export interface ReviewResult {
  overallScore: number;
  issues: ReviewIssue[];
  suggestions: DraftingSuggestion[];
  completeness: number;
  clarity: number;
  legalSufficiency: number;
  recommendations: string[];
}

export interface ReviewIssue {
  type: 'grammar' | 'legal' | 'structure' | 'consistency';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  location: string;
  suggestion: string;
}

export interface ContractSpecification {
  type: 'employment' | 'service' | 'sales' | 'nda' | 'partnership' | 'lease';
  terms: Record<string, any>;
  jurisdiction: string[];
  requiredClauses?: string[];
  customizations?: DocumentCustomization[];
  format?: 'docx' | 'pdf' | 'html';
}

export interface BriefSpecification {
  type: 'motion' | 'appellate' | 'research' | 'summary';
  caseDetails: CaseDetails;
  arguments: LegalArgument[];
  citations: string[];
  jurisdiction: string[];
  format?: 'docx' | 'pdf';
}

export interface MemoSpecification {
  type: 'research' | 'client_advisory' | 'internal' | 'opinion';
  issue: string;
  facts: string;
  analysis: string;
  conclusion: string;
  jurisdiction: string[];
  confidentialityLevel: 'internal' | 'confidential' | 'attorney_client_privilege';
}

export interface CaseDetails {
  caseName: string;
  caseNumber: string;
  court: string;
  parties: string[];
  procedureHistory: string;
  facts: string;
}

export interface LegalArgument {
  heading: string;
  thesis: string;
  support: string[];
  counterarguments?: string[];
  citations: string[];
}

export interface CollaborativeSession {
  id: string;
  documentId: string;
  collaborators: Collaborator[];
  status: 'active' | 'paused' | 'completed';
  createdAt: Date;
  lastActivity: Date;
  permissions: Record<string, string[]>;
}

export interface Collaborator {
  userId: string;
  name: string;
  role: 'owner' | 'editor' | 'reviewer' | 'viewer';
  joinedAt: Date;
  lastSeen: Date;
}

export interface DocumentChange {
  id: string;
  type: 'insert' | 'delete' | 'modify' | 'comment';
  location: number;
  oldText?: string;
  newText?: string;
  comment?: string;
  author: string;
  timestamp: Date;
  accepted?: boolean;
}

export default DocumentDraftingService;