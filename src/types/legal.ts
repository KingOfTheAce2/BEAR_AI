// Legal-specific type definitions for BEAR AI

import type {
  LegalComponentProps as BaseLegalComponentProps,
  LegalDocumentType as BaseLegalDocumentType,
  LegalCategory as BaseLegalCategory,
  DocumentStatus as BaseDocumentStatus,
  RiskLevel as BaseRiskLevel
} from './legal';

export type LegalComponentProps = BaseLegalComponentProps;
export type LegalDocumentType = BaseLegalDocumentType;
export type LegalCategory = BaseLegalCategory;
export type DocumentStatus = BaseDocumentStatus;
export type RiskLevel = BaseRiskLevel;

export interface LegalCitation {
  id: string;
  type: 'case' | 'statute' | 'regulation' | 'secondary' | 'constitutional' | 'rule';
  title: string;
  citation: string;
  jurisdiction: string;
  year?: number;
  court?: string;
  relevance: number;
  excerpt?: string;
  url?: string;
  pinpoint?: string;
  verified: boolean;
  accessDate?: Date;
}

export interface CaseReference {
  id: string;
  name: string;
  citation: string;
  court: string;
  year: number;
  jurisdiction: string;
  topics: string[];
  outcome?: string;
  precedential?: boolean;
  relevance: number;
  facts?: string;
  holding?: string;
  reasoning?: string;
  disposition?: string;
}

export interface StatuteReference {
  id: string;
  title: string;
  code: string;
  section: string;
  subsection?: string;
  jurisdiction: string;
  effectiveDate?: Date;
  amendedDate?: Date;
  text?: string;
  relevance: number;
  annotations?: string[];
  relatedCases?: string[];
}

export interface LegalContext {
  matter: string;
  practiceArea: PracticeArea;
  jurisdiction: Jurisdiction;
  relevantDocuments: string[];
  keyIssues: string[];
  timeline: LegalEvent[];
  parties: LegalParty[];
  precedentCases: string[];
  applicableStatutes: string[];
  conflictCheck?: ConflictCheckResult;
  ethicalConsiderations?: string[];
}

export interface LegalEvent {
  date: Date;
  event: string;
  significance: 'critical' | 'high' | 'medium' | 'low';
  documents?: string[];
  deadlines?: Date[];
  responsible?: string;
  status?: 'completed' | 'pending' | 'overdue';
}

export interface LegalParty {
  name: string;
  type: 'plaintiff' | 'defendant' | 'client' | 'opposing' | 'third-party' | 'witness' | 'expert';
  role?: string;
  counsel?: string;
  contact?: ContactInfo;
  status?: 'active' | 'inactive' | 'potential';
}

export interface ContactInfo {
  email?: string;
  phone?: string;
  address?: string;
  firm?: string;
}

export interface LegalWritingAssistance {
  suggestions: WritingSuggestion[];
  toneFeedback: ToneFeedback;
  citationCheck: CitationCheck;
  grammarCheck: GrammarCheck;
  styleGuide: StyleGuideCheck;
  readabilityScore: ReadabilityScore;
  legalTerminology: TerminologyCheck;
}

export interface WritingSuggestion {
  type: 'clarity' | 'conciseness' | 'precision' | 'formality' | 'legal-terminology' | 'structure' | 'argumentation';
  message: string;
  severity: 'error' | 'warning' | 'suggestion' | 'style';
  startIndex: number;
  endIndex: number;
  replacements?: string[];
  explanation?: string;
  precedent?: string;
}

export interface ToneFeedback {
  overall: 'professional' | 'informal' | 'aggressive' | 'passive' | 'persuasive' | 'academic';
  score: number;
  recommendations: string[];
  consistency: number;
  audience: 'court' | 'client' | 'opposing-counsel' | 'internal';
}

export interface CitationCheck {
  missingCitations: MissingCitation[];
  incorrectFormat: CitationError[];
  unreachableSources: string[];
  suggestions: CitationSuggestion[];
  bluebookCompliance: number;
  duplicates: string[];
}

export interface MissingCitation {
  statement: string;
  startIndex: number;
  endIndex: number;
  suggestedSources: LegalCitation[];
  reason: string;
}

export interface CitationError {
  citation: string;
  error: string;
  correction?: string;
  rule?: string;
  startIndex: number;
  endIndex: number;
}

export interface CitationSuggestion {
  text: string;
  suggestedCitation: LegalCitation;
  confidence: number;
  reason: string;
}

export interface GrammarCheck {
  errors: GrammarError[];
  score: number;
  passiveVoice: PassiveVoiceAnalysis;
  sentenceComplexity: ComplexityAnalysis;
}

export interface GrammarError {
  message: string;
  startIndex: number;
  endIndex: number;
  suggestions: string[];
  rule: string;
  severity: 'error' | 'warning';
}

export interface PassiveVoiceAnalysis {
  count: number;
  percentage: number;
  instances: PassiveVoiceInstance[];
  recommendation: string;
}

export interface PassiveVoiceInstance {
  text: string;
  startIndex: number;
  endIndex: number;
  suggestion?: string;
}

export interface ComplexityAnalysis {
  averageSentenceLength: number;
  readingLevel: 'elementary' | 'middle-school' | 'high-school' | 'college' | 'graduate';
  complexSentences: number;
  recommendation: string;
}

export interface StyleGuideCheck {
  violations: StyleViolation[];
  compliance: number;
  guide: StyleGuide;
}

export interface StyleViolation {
  rule: string;
  description: string;
  startIndex: number;
  endIndex: number;
  suggestion?: string;
  severity: 'error' | 'warning' | 'preference';
}

export interface ReadabilityScore {
  fleschKincaid: number;
  gunningFog: number;
  smog: number;
  readingLevel: string;
  recommendations: string[];
}

export interface TerminologyCheck {
  legalTerms: LegalTermAnalysis[];
  jargonScore: number;
  plainLanguageSuggestions: PlainLanguageSuggestion[];
  definitions: TermDefinition[];
}

export interface LegalTermAnalysis {
  term: string;
  frequency: number;
  appropriateness: 'appropriate' | 'unnecessary' | 'unclear';
  alternatives?: string[];
  definition?: string;
}

export interface PlainLanguageSuggestion {
  original: string;
  suggestion: string;
  startIndex: number;
  endIndex: number;
  reason: string;
}

export interface TermDefinition {
  term: string;
  definition: string;
  source?: string;
  jurisdiction?: string;
}

export interface ConflictCheckResult {
  status: 'clear' | 'potential' | 'conflict';
  conflicts: ConflictIssue[];
  checkedAgainst: string[];
  lastChecked: Date;
  recommendations: string[];
}

export interface ConflictIssue {
  type: 'adverse-party' | 'former-client' | 'business-relationship' | 'personal-interest';
  description: string;
  severity: 'high' | 'medium' | 'low';
  recommendation: string;
  waivable: boolean;
}

export interface LegalResearchQuery {
  query: string;
  practiceArea: PracticeArea;
  jurisdiction: Jurisdiction;
  dateRange?: DateRange;
  sources: ResearchSource[];
  filters: ResearchFilters;
  precedenceWeight?: number;
}

export interface ResearchFilters {
  courtLevel?: CourtLevel[];
  caseStatus?: CaseStatus[];
  documentType?: DocumentType[];
  language?: string[];
  minimumRelevance?: number;
}

export interface ResearchSource {
  name: string;
  type: 'primary' | 'secondary' | 'tertiary';
  jurisdiction?: string;
  coverage?: DateRange;
  subscription?: boolean;
  reliability: number;
}

export interface DateRange {
  start: Date;
  end: Date;
}

export type PracticeArea = 
  | 'corporate' | 'litigation' | 'criminal' | 'family' | 'real-estate' 
  | 'intellectual-property' | 'employment' | 'tax' | 'bankruptcy' 
  | 'immigration' | 'environmental' | 'healthcare' | 'securities'
  | 'insurance' | 'constitutional' | 'administrative' | 'trusts-estates'
  | 'elder-law' | 'personal-injury' | 'appellate' | 'general';

export type Jurisdiction = 
  | 'federal' | 'state' | 'local' | 'tribal' | 'international'
  | 'alabama' | 'alaska' | 'arizona' | 'arkansas' | 'california' 
  | 'colorado' | 'connecticut' | 'delaware' | 'florida' | 'georgia'
  | 'hawaii' | 'idaho' | 'illinois' | 'indiana' | 'iowa' | 'kansas'
  | 'kentucky' | 'louisiana' | 'maine' | 'maryland' | 'massachusetts'
  | 'michigan' | 'minnesota' | 'mississippi' | 'missouri' | 'montana'
  | 'nebraska' | 'nevada' | 'new-hampshire' | 'new-jersey' | 'new-mexico'
  | 'new-york' | 'north-carolina' | 'north-dakota' | 'ohio' | 'oklahoma'
  | 'oregon' | 'pennsylvania' | 'rhode-island' | 'south-carolina'
  | 'south-dakota' | 'tennessee' | 'texas' | 'utah' | 'vermont'
  | 'virginia' | 'washington' | 'west-virginia' | 'wisconsin' | 'wyoming'
  | 'dc' | 'puerto-rico' | 'guam' | 'virgin-islands';

export type CourtLevel = 
  | 'supreme-court' | 'appellate' | 'district' | 'trial' | 'municipal' 
  | 'family' | 'probate' | 'bankruptcy' | 'tax' | 'administrative';

export type CaseStatus = 
  | 'published' | 'unpublished' | 'pending' | 'settled' | 'dismissed'
  | 'remanded' | 'affirmed' | 'reversed' | 'vacated';

export type DocumentType = 
  | 'opinion' | 'order' | 'statute' | 'regulation' | 'rule' | 'constitution'
  | 'treaty' | 'brief' | 'pleading' | 'motion' | 'transcript' | 'evidence'
  | 'contract' | 'memo' | 'letter' | 'filing' | 'form';

export type StyleGuide = 
  | 'bluebook' | 'alwd' | 'california' | 'chicago' | 'apa' | 'mla' | 'custom';

export interface LegalStreamingOptions {
  enableCitations: boolean;
  enableCaseSearch: boolean;
  enableStatuteSearch: boolean;
  autoLegalAnalysis: boolean;
  confidentialityMode: boolean;
  practiceAreaFilter?: PracticeArea;
  jurisdictionFilter?: Jurisdiction;
  citationStyle: StyleGuide;
  responseDepth: 'brief' | 'detailed' | 'comprehensive';
  includeAlternativeArguments: boolean;
  riskAssessment: boolean;
}

export interface LegalConversationMetrics {
  questionsAnswered: number;
  citationsProvided: number;
  casesReferenced: number;
  statutesReferenced: number;
  documentsAnalyzed: number;
  averageResponseTime: number;
  confidenceScore: number;
  practiceAreaCoverage: PracticeArea[];
  jurisdictionCoverage: Jurisdiction[];
  complexityLevel: 'basic' | 'intermediate' | 'advanced' | 'expert';
}

export interface LegalNotification {
  id: string;
  type: 'deadline' | 'conflict' | 'citation-update' | 'case-alert' | 'statute-change' | 'ethics-alert';
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  practiceArea?: PracticeArea;
  jurisdiction?: Jurisdiction;
  dueDate?: Date;
  actionRequired: boolean;
  relatedDocuments?: string[];
  createdAt: Date;
  acknowledged: boolean;
}