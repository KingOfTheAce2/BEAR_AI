// Legal-specific TypeScript interfaces for BEAR AI
import type { ComponentProps, User } from '../index';

// Legal Document Types
export interface LegalDocument {
  id: string;
  title: string;
  type: LegalDocumentType;
  category: LegalCategory;
  content: string;
  metadata: LegalDocumentMetadata;
  status: DocumentStatus;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  lastModifiedBy: string;
  version: number;
  citations: Citation[];
  precedents: LegalPrecedent[];
  clauses: ContractClause[];
  riskAssessment?: RiskAssessment;
  complianceFlags?: ComplianceFlag[];
}

export type LegalDocumentType = 
  | 'contract' 
  | 'brief' 
  | 'memo' 
  | 'pleading' 
  | 'motion' 
  | 'agreement' 
  | 'template' 
  | 'correspondence'
  | 'discovery'
  | 'opinion'
  | 'settlement';

export type LegalCategory = 
  | 'corporate' 
  | 'litigation' 
  | 'employment' 
  | 'intellectual_property' 
  | 'real_estate' 
  | 'tax' 
  | 'regulatory' 
  | 'criminal'
  | 'family'
  | 'immigration'
  | 'bankruptcy'
  | 'environmental';

export type DocumentStatus = 
  | 'draft' 
  | 'review' 
  | 'approved' 
  | 'executed' 
  | 'archived' 
  | 'template';

export interface LegalDocumentMetadata {
  jurisdiction: string[];
  practiceArea: string[];
  client?: string;
  matter?: string;
  tags: string[];
  confidentialityLevel: 'public' | 'internal' | 'confidential' | 'attorney_client_privilege';
  retentionPolicy?: RetentionPolicy;
  customFields: Record<string, any>;
}

export interface RetentionPolicy {
  retentionPeriod: number; // years
  disposalDate?: Date;
  legalHold: boolean;
  archiveDate?: Date;
}

// Contract Analysis Types
export interface ContractClause {
  id: string;
  type: ClauseType;
  title: string;
  content: string;
  position: number;
  isStandard: boolean;
  riskLevel: RiskLevel;
  suggestions?: string[];
  alternativeLanguage?: string[];
  precedentClauses?: PrecedentClause[];
}

export type ClauseType = 
  | 'termination'
  | 'indemnification'
  | 'liability'
  | 'payment'
  | 'confidentiality'
  | 'intellectual_property'
  | 'force_majeure'
  | 'governing_law'
  | 'dispute_resolution'
  | 'warranties'
  | 'representations'
  | 'delivery'
  | 'performance';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface PrecedentClause {
  id: string;
  source: string;
  jurisdiction: string;
  effectiveDate: Date;
  content: string;
  outcome?: string;
}

// Legal Research Types
export interface CaseLaw {
  id: string;
  citation: string;
  title: string;
  court: string;
  jurisdiction: string;
  date: Date;
  judges: string[];
  parties: string[];
  summary: string;
  holdings: string[];
  procedureHistory: string;
  facts: string;
  reasoning: string;
  outcome: string;
  keyWords: string[];
  shepardization?: ShepardStatus;
  westlawKey?: string;
  lexisKey?: string;
  relevanceScore?: number;
}

export type ShepardStatus = 
  | 'good_law'
  | 'questioned'
  | 'criticized'
  | 'distinguished'
  | 'limited'
  | 'overruled'
  | 'superseded';

export interface Statute {
  id: string;
  citation: string;
  title: string;
  jurisdiction: string;
  section: string;
  text: string;
  effectiveDate: Date;
  amendmentHistory: Amendment[];
  relatedStatutes: string[];
  annotations: Annotation[];
}

export interface Amendment {
  date: Date;
  description: string;
  changedText: string;
  reason: string;
}

export interface Annotation {
  type: 'interpretation' | 'case_law' | 'regulation' | 'commentary';
  content: string;
  source: string;
  date: Date;
}

// Citation Management Types
export interface Citation {
  id: string;
  type: CitationType;
  shortForm: string;
  fullCitation: string;
  pinCite?: string;
  parenthetical?: string;
  source: CitationSource;
  verified: boolean;
  verificationDate?: Date;
  bluebookFormat: string;
  alwdFormat: string;
  customFormat?: string;
  hyperlink?: string;
}

export type CitationType = 
  | 'case'
  | 'statute'
  | 'regulation'
  | 'constitutional'
  | 'treaty'
  | 'law_review'
  | 'book'
  | 'newspaper'
  | 'web'
  | 'brief'
  | 'other';

export interface CitationSource {
  database: 'westlaw' | 'lexis' | 'bloomberg' | 'google_scholar' | 'court_records' | 'other';
  url?: string;
  accessDate?: Date;
  verified: boolean;
}

// Legal Precedent Analysis
export interface LegalPrecedent {
  id: string;
  caseId: string;
  relevantFacts: string[];
  legalPrinciple: string;
  reasoning: string;
  distinguishingFactors?: string[];
  applicationStrength: 'strong' | 'moderate' | 'weak' | 'distinguishable';
  recommendedUse: string;
  similarCases: string[];
}

// Risk Assessment Types
export interface RiskAssessment {
  id: string;
  documentId: string;
  overallRisk: RiskLevel;
  riskFactors: RiskFactor[];
  mitigationStrategies: MitigationStrategy[];
  complianceIssues: ComplianceIssue[];
  recommendations: string[];
  assessmentDate: Date;
  assessedBy: string;
  nextReviewDate?: Date;
}

export interface RiskFactor {
  type: RiskType;
  severity: RiskLevel;
  description: string;
  likelihood: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
  affectedClauses: string[];
  precedentCases?: string[];
}

export type RiskType = 
  | 'liability'
  | 'financial'
  | 'regulatory'
  | 'reputational'
  | 'operational'
  | 'strategic'
  | 'compliance'
  | 'intellectual_property';

export interface MitigationStrategy {
  riskFactorId: string;
  strategy: string;
  implementation: string;
  timeline: string;
  responsible: string;
  cost?: string;
  effectiveness: 'low' | 'medium' | 'high';
}

// Compliance Types
export interface ComplianceFlag {
  id: string;
  type: ComplianceType;
  severity: 'info' | 'warning' | 'error' | 'critical';
  description: string;
  regulation: string;
  section?: string;
  requirement: string;
  currentStatus: ComplianceStatus;
  remediation: string;
  deadline?: Date;
  responsibleParty: string;
}

export type ComplianceType = 
  | 'gdpr'
  | 'ccpa'
  | 'hipaa'
  | 'sox'
  | 'pci_dss'
  | 'securities'
  | 'employment'
  | 'environmental'
  | 'tax'
  | 'industry_specific';

export type ComplianceStatus = 
  | 'compliant'
  | 'non_compliant'
  | 'partially_compliant'
  | 'under_review'
  | 'remediation_in_progress';

export interface ComplianceIssue {
  id: string;
  regulation: string;
  requirement: string;
  currentGap: string;
  riskLevel: RiskLevel;
  remediation: string;
  timeline: string;
  cost?: number;
}

// Client Communication Types
export interface ClientCommunication {
  id: string;
  clientId: string;
  type: CommunicationType;
  subject: string;
  content: string;
  template?: CommunicationTemplate;
  status: CommunicationStatus;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  sentDate?: Date;
  scheduledDate?: Date;
  deliveryMethod: DeliveryMethod[];
  attachments: string[];
  responseRequired: boolean;
  responseDeadline?: Date;
  billingCode?: string;
}

export type CommunicationType = 
  | 'case_update'
  | 'document_request'
  | 'status_report'
  | 'billing_notice'
  | 'appointment_reminder'
  | 'deadline_notice'
  | 'settlement_offer'
  | 'general_correspondence';

export type CommunicationStatus = 
  | 'draft'
  | 'scheduled'
  | 'sent'
  | 'delivered'
  | 'read'
  | 'responded'
  | 'failed';

export type DeliveryMethod = 
  | 'email'
  | 'secure_portal'
  | 'mail'
  | 'fax'
  | 'hand_delivery';

export interface CommunicationTemplate {
  id: string;
  name: string;
  type: CommunicationType;
  subject: string;
  body: string;
  variables: TemplateVariable[];
  category: string;
  tags: string[];
  isActive: boolean;
  createdBy: string;
  lastModified: Date;
}

export interface TemplateVariable {
  name: string;
  type: 'text' | 'date' | 'number' | 'select' | 'boolean';
  required: boolean;
  defaultValue?: any;
  options?: string[]; // for select type
  description?: string;
}

// Workflow Types
export interface LegalWorkflow {
  id: string;
  name: string;
  type: WorkflowType;
  steps: WorkflowStep[];
  triggers: WorkflowTrigger[];
  status: WorkflowStatus;
  assignedTo: string[];
  dueDate?: Date;
  priority: 'low' | 'medium' | 'high' | 'critical';
  estimatedHours?: number;
  actualHours?: number;
  matter?: string;
  client?: string;
  billingCode?: string;
}

export type WorkflowType = 
  | 'document_review'
  | 'contract_negotiation'
  | 'due_diligence'
  | 'litigation_prep'
  | 'compliance_check'
  | 'client_onboarding'
  | 'case_preparation'
  | 'document_drafting';

export interface WorkflowStep {
  id: string;
  order: number;
  name: string;
  description: string;
  type: StepType;
  assignee?: string;
  status: StepStatus;
  dueDate?: Date;
  estimatedHours?: number;
  actualHours?: number;
  dependencies: string[];
  outputs: string[];
  checklist?: ChecklistItem[];
}

export type StepType = 
  | 'review'
  | 'approve'
  | 'draft'
  | 'research'
  | 'analyze'
  | 'communicate'
  | 'file'
  | 'schedule';

export type StepStatus = 
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'blocked'
  | 'skipped';

export interface ChecklistItem {
  id: string;
  description: string;
  completed: boolean;
  required: boolean;
  completedBy?: string;
  completedDate?: Date;
}

export interface WorkflowTrigger {
  type: 'date' | 'event' | 'status_change' | 'manual';
  condition: string;
  action: string;
}

export type WorkflowStatus = 
  | 'active'
  | 'paused'
  | 'completed'
  | 'cancelled'
  | 'overdue';

// Search and Analytics Types
export interface LegalSearchQuery {
  query: string;
  filters: SearchFilters;
  sortBy: SearchSortOptions;
  pagination: SearchPagination;
}

export interface SearchFilters {
  documentTypes?: LegalDocumentType[];
  categories?: LegalCategory[];
  dateRange?: DateRange;
  jurisdiction?: string[];
  client?: string[];
  matter?: string[];
  author?: string[];
  status?: DocumentStatus[];
  tags?: string[];
  riskLevel?: RiskLevel[];
}

export interface DateRange {
  start: Date;
  end: Date;
}

export interface SearchSortOptions {
  field: 'relevance' | 'date' | 'title' | 'author' | 'status';
  direction: 'asc' | 'desc';
}

export interface SearchPagination {
  page: number;
  limit: number;
  total?: number;
}

export interface LegalSearchResult {
  id: string;
  type: 'document' | 'case' | 'statute' | 'regulation' | 'template';
  title: string;
  preview: string;
  relevanceScore: number;
  highlightedText: string[];
  metadata: Record<string, any>;
  url?: string;
  lastModified: Date;
}

// UI Component Props
export interface LegalComponentProps extends ComponentProps {
  user?: Pick<User, 'id' | 'role'> &
    Partial<Pick<User, 'name' | 'email' | 'avatar' | 'firm'>> & {
      permissions: string[];
    };
  matter?: string;
  client?: string;
  billingEnabled?: boolean;
}

// Analytics Types
export interface LegalAnalytics {
  documentStats: DocumentStats;
  workflowMetrics: WorkflowMetrics;
  complianceMetrics: ComplianceMetrics;
  clientMetrics: ClientMetrics;
  timeTracking: TimeTrackingMetrics;
  billingMetrics: BillingMetrics;
}

export interface DocumentStats {
  totalDocuments: number;
  documentsByType: Record<LegalDocumentType, number>;
  documentsByStatus: Record<DocumentStatus, number>;
  recentActivity: ActivitySummary[];
  storageUsage: StorageMetrics;
}

export interface WorkflowMetrics {
  activeWorkflows: number;
  completedWorkflows: number;
  overdue: number;
  averageCompletionTime: number;
  bottlenecks: BottleneckAnalysis[];
}

export interface ComplianceMetrics {
  overallScore: number;
  riskDistribution: Record<RiskLevel, number>;
  flagsByType: Record<ComplianceType, number>;
  trendData: ComplianceTrend[];
}

export interface ClientMetrics {
  activeClients: number;
  communicationVolume: number;
  responseTime: number;
  satisfaction?: number;
}

export interface TimeTrackingMetrics {
  billableHours: number;
  nonBillableHours: number;
  utilizationRate: number;
  timeByCategory: Record<string, number>;
}

export interface BillingMetrics {
  totalBilled: number;
  outstandingAmount: number;
  collectionRate: number;
  realization: number;
}

export interface ActivitySummary {
  type: string;
  count: number;
  trend: 'up' | 'down' | 'stable';
  period: string;
}

export interface StorageMetrics {
  used: number;
  total: number;
  utilization: number;
  growth: number;
}

export interface BottleneckAnalysis {
  stepName: string;
  averageTime: number;
  frequency: number;
  impact: 'low' | 'medium' | 'high';
}

export interface ComplianceTrend {
  date: Date;
  score: number;
  issues: number;
  resolved: number;
}