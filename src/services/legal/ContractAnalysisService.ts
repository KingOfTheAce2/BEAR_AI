// Contract Analysis Service for legal document review and analysis
import { 
  LegalDocument, 
  ContractClause, 
  RiskAssessment, 
  RiskFactor, 
  MitigationStrategy,
  ComplianceFlag,
  ClauseType,
  RiskLevel 
} from '../../types/legal';

export interface ContractAnalysisResult {
  documentId: string;
  overallRisk: RiskLevel;
  clauses: ContractClause[];
  riskAssessment: RiskAssessment;
  suggestions: ContractSuggestion[];
  complianceFlags: ComplianceFlag[];
  extractedData: ExtractedContractData;
}

export interface ContractSuggestion {
  type: 'addition' | 'modification' | 'deletion' | 'clarification';
  clauseId?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  rationale: string;
  suggestedLanguage?: string;
  riskMitigation: string;
  precedentCases?: string[];
}

export interface ExtractedContractData {
  parties: ContractParty[];
  effectiveDate?: Date;
  expirationDate?: Date;
  renewalTerms?: string;
  governingLaw: string;
  paymentTerms: PaymentTerms;
  deliverables: Deliverable[];
  keyObligations: Obligation[];
  terminationClauses: TerminationClause[];
}

export interface ContractParty {
  name: string;
  role: 'client' | 'vendor' | 'partner' | 'other';
  address?: string;
  contact?: string;
  entityType?: string;
}

export interface PaymentTerms {
  amount?: number;
  currency?: string;
  schedule: string;
  method: string;
  lateFees?: string;
  discounts?: string;
}

export interface Deliverable {
  description: string;
  deadline?: Date;
  acceptanceCriteria?: string;
  dependencies?: string[];
}

export interface Obligation {
  party: string;
  description: string;
  deadline?: Date;
  consequences?: string;
}

export interface TerminationClause {
  type: 'convenience' | 'cause' | 'breach' | 'expiration';
  noticePeriod: string;
  conditions: string;
  consequences: string;
}

export class ContractAnalysisService {
  private apiBaseUrl: string;
  private apiKey: string;

  constructor(apiBaseUrl = '/api/legal', apiKey = '') {
    this.apiBaseUrl = apiBaseUrl;
    this.apiKey = apiKey;
  }

  // Main contract analysis method
  async analyzeContract(document: LegalDocument): Promise<ContractAnalysisResult> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/contracts/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          documentId: document.id,
          content: document.content,
          documentType: document.type,
          category: document.category,
          jurisdiction: document.metadata.jurisdiction
        })
      });

      if (!response.ok) {
        throw new Error(`Contract analysis failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error analyzing contract:', error);
      throw error;
    }
  }

  // Clause-specific analysis
  async identifyClauses(content: string): Promise<ContractClause[]> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/contracts/clauses/identify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({ content })
      });

      if (!response.ok) {
        throw new Error(`Clause identification failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.clauses || [];
    } catch (error) {
      console.error('Error identifying clauses:', error);
      return [];
    }
  }

  async analyzeClause(clause: ContractClause, contractContext: string): Promise<ContractClause> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/contracts/clauses/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({ clause, context: contractContext })
      });

      if (!response.ok) {
        throw new Error(`Clause analysis failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error analyzing clause:', error);
      return clause;
    }
  }

  // Risk assessment methods
  async assessContractRisk(document: LegalDocument): Promise<RiskAssessment> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/contracts/risk/assess`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          documentId: document.id,
          content: document.content,
          category: document.category,
          jurisdiction: document.metadata.jurisdiction
        })
      });

      if (!response.ok) {
        throw new Error(`Risk assessment failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error assessing contract risk:', error);
      throw error;
    }
  }

  async generateMitigationStrategies(riskFactors: RiskFactor[]): Promise<MitigationStrategy[]> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/contracts/risk/mitigation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({ riskFactors })
      });

      if (!response.ok) {
        throw new Error(`Mitigation strategy generation failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.strategies || [];
    } catch (error) {
      console.error('Error generating mitigation strategies:', error);
      return [];
    }
  }

  // Contract comparison
  async compareContracts(documentA: string, documentB: string): Promise<ContractComparison> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/contracts/compare`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({ 
          documentA, 
          documentB,
          includeClauseMapping: true,
          includeRiskComparison: true
        })
      });

      if (!response.ok) {
        throw new Error(`Contract comparison failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error comparing contracts:', error);
      throw error;
    }
  }

  // Data extraction
  async extractContractData(content: string): Promise<ExtractedContractData> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/contracts/extract`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({ content })
      });

      if (!response.ok) {
        throw new Error(`Contract data extraction failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error extracting contract data:', error);
      throw error;
    }
  }

  // Template and standard clause management
  async getStandardClauses(clauseType: ClauseType, jurisdiction: string[]): Promise<ContractClause[]> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/contracts/clauses/standard?type=${clauseType}&jurisdiction=${jurisdiction.join(',')}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      if (!response.ok) {
        throw new Error(`Standard clauses fetch failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.clauses || [];
    } catch (error) {
      console.error('Error fetching standard clauses:', error);
      return [];
    }
  }

  async suggestClauseImprovements(clause: ContractClause, jurisdiction: string[]): Promise<ContractSuggestion[]> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/contracts/clauses/improve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({ clause, jurisdiction })
      });

      if (!response.ok) {
        throw new Error(`Clause improvement suggestions failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.suggestions || [];
    } catch (error) {
      console.error('Error suggesting clause improvements:', error);
      return [];
    }
  }

  // Negotiation support
  async generateNegotiationPoints(analysis: ContractAnalysisResult): Promise<NegotiationPoint[]> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/contracts/negotiate/points`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({ analysis })
      });

      if (!response.ok) {
        throw new Error(`Negotiation points generation failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.points || [];
    } catch (error) {
      console.error('Error generating negotiation points:', error);
      return [];
    }
  }

  async generateMarkupSuggestions(
    originalText: string, 
    suggestions: ContractSuggestion[]
  ): Promise<string> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/contracts/markup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({ originalText, suggestions })
      });

      if (!response.ok) {
        throw new Error(`Markup generation failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.markedUpText || originalText;
    } catch (error) {
      console.error('Error generating markup:', error);
      return originalText;
    }
  }

  // Compliance checking
  async checkCompliance(
    document: LegalDocument, 
    regulations: string[]
  ): Promise<ComplianceFlag[]> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/contracts/compliance/check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          document,
          regulations,
          jurisdiction: document.metadata.jurisdiction
        })
      });

      if (!response.ok) {
        throw new Error(`Compliance check failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.flags || [];
    } catch (error) {
      console.error('Error checking compliance:', error);
      return [];
    }
  }
}

export interface ContractComparison {
  documentAId: string;
  documentBId: string;
  differences: ContractDifference[];
  similarities: ContractSimilarity[];
  riskComparison: RiskComparison;
  recommendations: string[];
}

export interface ContractDifference {
  type: 'addition' | 'deletion' | 'modification';
  section: string;
  contentA?: string;
  contentB?: string;
  significance: 'low' | 'medium' | 'high' | 'critical';
  explanation: string;
}

export interface ContractSimilarity {
  section: string;
  content: string;
  confidence: number;
}

export interface RiskComparison {
  documentA: RiskLevel;
  documentB: RiskLevel;
  riskFactorChanges: RiskFactorChange[];
}

export interface RiskFactorChange {
  factor: string;
  changeType: 'increased' | 'decreased' | 'unchanged' | 'new' | 'removed';
  impact: string;
}

export interface NegotiationPoint {
  clause: string;
  currentLanguage: string;
  proposedLanguage: string;
  rationale: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  fallbackOptions: string[];
  marketStandard?: string;
}

export default ContractAnalysisService;