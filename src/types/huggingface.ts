/**
 * HuggingFace Integration Types for BEAR AI
 */

export interface HuggingFaceModel {
  id: string;
  modelId: string;
  name: string;
  description?: string;
  author: string;
  downloads: number;
  likes: number;
  tags: string[];
  pipeline_tag?: string;
  library_name?: string;
  license?: string;
  created_at: string;
  updated_at: string;
  size?: number;
  config?: Record<string, any>;
  tokenizer?: string;
  model_index?: Record<string, any>;
  sha?: string;
  cardData?: Record<string, any>;
  siblings?: ModelFile[];
  legalScore?: number;
  legalUseCases?: LegalUseCase[];
  performanceBenchmarks?: PerformanceBenchmark[];
  resourceRequirements?: ResourceRequirements;
  compatibilityInfo?: CompatibilityInfo;
  localStatus?: LocalModelStatus;
  bearaiTags?: string[];
}

export interface ModelSearchFilters {
  query?: string;
  author?: string;
  pipeline_tag?: string;
  library?: string[];
  language?: string[];
  license?: string[];
  tags?: string[];
  sort?: 'downloads' | 'likes' | 'updated_at' | 'created_at';
  direction?: 'asc' | 'desc';
  limit?: number;
  full?: boolean;
}

export const LegalCategory = {
  CONTRACT_ANALYSIS: 'contract_analysis',
  LEGAL_RESEARCH: 'legal_research',
  COMPLIANCE_CHECK: 'compliance_check',
  DOCUMENT_REVIEW: 'document_review',
  CASE_LAW_ANALYSIS: 'case_law_analysis',
  REGULATORY_COMPLIANCE: 'regulatory_compliance',
  RISK_ASSESSMENT: 'risk_assessment',
  LEGAL_DRAFTING: 'legal_drafting'
} as const;

export type LegalCategory = typeof LegalCategory[keyof typeof LegalCategory];

export interface LegalUseCase {
  id: string;
  name: string;
  description: string;
  category: LegalCategory;
  suitabilityScore: number;
  examples: string[];
  requirements: string[];
  limitations: string[];
  accuracy?: number;
  speed?: number;
  resourceIntensive?: boolean;
}

export interface PerformanceBenchmark {
  taskType: string;
  taskName: string;
  dataset: string;
  metric: string;
  score: number;
  lastTested: Date;
  testingFramework: string;
  notes?: string;
  legalRelevance?: number;
}

export interface ModelRecommendation {
  model: HuggingFaceModel;
  score: number;
  reasons: string[];
  category: LegalCategory;
  compatibility: CompatibilityResult;
  estimatedPerformance: {
    accuracy: number;
    speed: number;
    resourceUsage: number;
  };
}

export interface CompatibilityOptimization {
  id: string;
  description: string;
  automated: boolean;
  impact: 'low' | 'medium' | 'high';
  estimatedImprovement?: number;
}

export interface CompatibilityResult {
  compatible: boolean;
  score: number;
  confidence: number;
  issues: string[];
  warnings: string[];
  requirements: {
    memory: number;
    diskSpace: number;
    computeCapability?: string;
  };
  recommendations: string[];
  optimizations: CompatibilityOptimization[];

  export interface CompatibilityOptimization {
  id: string;
  description: string;
  automated: boolean;
  impact: 'low' | 'medium' | 'high';
  estimatedImprovement?: number;
}

export interface CompatibilityResult {
  compatible: boolean;
  score: number;
  confidence: number;
  issues: string[];
  warnings: string[];
  requirements: {
    memory: number;
    diskSpace: number;
    computeCapability?: string;
  };
  recommendations: string[];
  optimizations: CompatibilityOptimization[];
}

export interface ResourceRequirements {
  minRam?: number;
  recommendedRam?: number;
  minStorage?: number;
  modelSizeMB: number;
  gpuRequired?: boolean;
  minGpuMemory?: number;
  recommendedGpuMemory?: number;
  cpuCores?: number;
  estimatedInferenceTime?: {
    cpu?: number;
    gpu?: number;
  };
  powerConsumption?: {
    idle?: number;
    load?: number;
  };
}

export interface CompatibilityInfo {
  frameworks?: string[];
  pythonVersions?: string[];
  transformersVersion?: string;