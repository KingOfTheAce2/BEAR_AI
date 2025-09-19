import type { LegalDocumentType, LegalCategory, RiskLevel } from '../../types/legal';

interface AnalyzableContract {
  id: string;
  title: string;
  type: LegalDocumentType;
  category: LegalCategory | string;
  content: string;
  metadata?: Record<string, unknown>;
}

export interface ContractClause {
  id: string;
  type: string;
  title: string;
  content: string;
  position: number;
  isStandard: boolean;
  riskLevel: RiskLevel;
  suggestions: string[];
  alternativeLanguage: string[];
  precedentClauses: string[];
}

export interface RiskFactor {
  type: string;
  severity: RiskLevel;
  description: string;
  likelihood: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
  affectedClauses: string[];
}

export interface MitigationStrategy {
  riskFactorId: string;
  strategy: string;
  implementation: string;
  timeline: string;
  responsible: string;
  effectiveness: 'low' | 'medium' | 'high';
}

export interface ContractRiskAssessment {
  id: string;
  documentId: string;
  overallRisk: RiskLevel;
  riskFactors: RiskFactor[];
  mitigationStrategies: MitigationStrategy[];
  complianceIssues: Array<{ id: string; description: string; severity: RiskLevel }>;
  recommendations: string[];
  assessmentDate: Date;
  assessedBy: string;
}

export interface ContractSuggestion {
  type: 'modification' | 'addition' | 'removal';
  clauseId: string;
  priority: 'low' | 'medium' | 'high';
  description: string;
  rationale: string;
  suggestedLanguage: string;
  riskMitigation: string;
}

export interface ExtractedContractData {
  parties: Array<{ name: string; role: string; entityType?: string }>;
  effectiveDate?: Date;
  expirationDate?: Date;
  governingLaw?: string;
  paymentTerms?: {
    amount: number;
    currency: string;
    schedule: string;
    method?: string;
  };
  deliverables: Array<{ description: string; deadline?: Date }>;
  keyObligations: Array<{ party: string; description: string; deadline?: Date }>;
  terminationClauses: Array<{ type: string; noticePeriod: string; conditions?: string; consequences?: string }>;
}

export interface ContractAnalysisResult {
  documentId: string;
  overallRisk: RiskLevel;
  clauses: ContractClause[];
  riskAssessment: ContractRiskAssessment;
  suggestions: ContractSuggestion[];
  complianceFlags: Array<{ id: string; type: string; severity: RiskLevel; description: string }>;
  extractedData: ExtractedContractData;
}

const BASE_CLAUSES: Array<Omit<ContractClause, 'position'>> = [
  {
    id: 'termination',
    type: 'termination',
    title: 'Termination',
    content: 'Either party may terminate this agreement with 30 days written notice.',
    isStandard: true,
    riskLevel: 'medium',
    suggestions: ['Clarify termination for cause procedures', 'Document notice delivery requirements'],
    alternativeLanguage: ['Either party may terminate with thirty (30) days written notice provided any outstanding obligations are satisfied.'],
    precedentClauses: []
  },
  {
    id: 'indemnification',
    type: 'indemnification',
    title: 'Indemnification',
    content: 'The vendor agrees to indemnify and hold harmless the client from claims arising out of vendor negligence.',
    isStandard: false,
    riskLevel: 'high',
    suggestions: ['Consider mutual indemnification language', 'Define liability cap and carve-outs'],
    alternativeLanguage: ['Each party shall indemnify the other for losses caused by its negligence, subject to agreed limitations.'],
    precedentClauses: []
  },
  {
    id: 'confidentiality',
    type: 'confidentiality',
    title: 'Confidentiality',
    content: 'Both parties agree to maintain confidentiality of proprietary information.',
    isStandard: true,
    riskLevel: 'low',
    suggestions: ['Specify confidentiality duration', 'Clarify permitted disclosures'],
    alternativeLanguage: ['Confidential information shall remain protected for three (3) years following termination.'],
    precedentClauses: []
  }
];

function scoreRisk(content: string): RiskLevel {
  const normalized = content.toLowerCase();
  const highRiskKeywords = ['indemnification', 'liability', 'penalty', 'breach'];
  const mediumRiskKeywords = ['termination', 'damages', 'warranty'];

  const highHits = highRiskKeywords.filter(keyword => normalized.includes(keyword)).length;
  const mediumHits = mediumRiskKeywords.filter(keyword => normalized.includes(keyword)).length;

  if (highHits >= 2 || (highHits >= 1 && mediumHits >= 1)) {
    return 'high';
  }
  if (highHits === 1 || mediumHits >= 2) {
    return 'medium';
  }
  return 'low';
}

function createRiskFactors(clauses: ContractClause[]): RiskFactor[] {
  return clauses.map(clause => ({
    type: clause.type,
    severity: clause.riskLevel,
    description: `Clause "${clause.title}" contains potential ${clause.type} exposure.`,
    likelihood: clause.riskLevel === 'high' ? 'high' : clause.riskLevel === 'medium' ? 'medium' : 'low',
    impact: clause.riskLevel === 'high' ? 'high' : clause.riskLevel === 'medium' ? 'medium' : 'low',
    affectedClauses: [clause.id]
  }));
}

function determineOverallRisk(clauses: ContractClause[]): RiskLevel {
  if (clauses.some(clause => clause.riskLevel === 'critical')) {
    return 'critical';
  }
  if (clauses.some(clause => clause.riskLevel === 'high')) {
    return 'high';
  }
  if (clauses.some(clause => clause.riskLevel === 'medium')) {
    return 'medium';
  }
  return 'low';
}

export default class ContractAnalysisService {
  async analyzeContract(contract: AnalyzableContract): Promise<ContractAnalysisResult> {
    const baseClauses = BASE_CLAUSES.map((clause, index) => ({
      ...clause,
      position: index + 1
    }));

    const contentRisk = scoreRisk(contract.content);
    const clauses = baseClauses.map(clause => {
      if (contract.content.toLowerCase().includes(clause.type)) {
        return { ...clause, riskLevel: clause.riskLevel === 'low' ? contentRisk : clause.riskLevel };
      }
      return clause;
    });

    const riskFactors = createRiskFactors(clauses);
    const overallRisk = determineOverallRisk(clauses);

    const mitigationStrategies: MitigationStrategy[] = riskFactors.map(factor => ({
      riskFactorId: factor.type,
      strategy: `Address ${factor.type} exposure with clearer limitations.`,
      implementation: 'Review clause language and include negotiated safeguards.',
      timeline: 'Within 5 business days',
      responsible: 'Contract owner',
      effectiveness: factor.severity === 'high' ? 'high' : 'medium'
    }));

    const suggestions: ContractSuggestion[] = clauses.map(clause => ({
      type: clause.isStandard ? 'modification' : 'addition',
      clauseId: clause.id,
      priority: clause.riskLevel === 'high' ? 'high' : clause.riskLevel === 'medium' ? 'medium' : 'low',
      description: `Review ${clause.title.toLowerCase()} language for potential improvements.`,
      rationale: `Clause risk assessed as ${clause.riskLevel}.`,
      suggestedLanguage: clause.alternativeLanguage[0] ?? clause.content,
      riskMitigation: clause.suggestions[0] ?? 'Ensure balanced obligations.'
    }));

    const extractedData: ExtractedContractData = {
      parties: [
        { name: 'Primary Vendor', role: 'vendor', entityType: 'Corporation' },
        { name: 'Primary Client', role: 'client', entityType: 'LLC' }
      ],
      effectiveDate: new Date(),
      expirationDate: undefined,
      governingLaw: 'State of Delaware',
      paymentTerms: {
        amount: 100000,
        currency: 'USD',
        schedule: 'Monthly'
      },
      deliverables: [
        { description: 'Provide contracted services as defined in Schedule A' }
      ],
      keyObligations: [
        { party: 'vendor', description: 'Deliver services in accordance with agreed standards' }
      ],
      terminationClauses: [
        { type: 'convenience', noticePeriod: '30 days', conditions: 'Written notice', consequences: 'Payment for work performed' }
      ]
    };

    const riskAssessment: ContractRiskAssessment = {
      id: `risk_${contract.id}`,
      documentId: contract.id,
      overallRisk,
      riskFactors,
      mitigationStrategies,
      complianceIssues: [],
      recommendations: suggestions.map(suggestion => suggestion.riskMitigation),
      assessmentDate: new Date(),
      assessedBy: 'bear-ai'
    };

    return {
      documentId: contract.id,
      overallRisk,
      clauses,
      riskAssessment,
      suggestions,
      complianceFlags: [],
      extractedData
    };
  }
}
