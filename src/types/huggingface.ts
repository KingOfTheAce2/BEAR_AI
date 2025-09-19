/**
 * HuggingFace Integration Types for BEAR AI
 */

export interface HuggingFaceModel {
  id: string;
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
  torchVersions?: string[];
  tensorflowVersions?: string[];
  onnxSupport?: boolean;
  quantizationSupport?: {
    int8?: boolean;
    int4?: boolean;
    fp16?: boolean;
    bfloat16?: boolean;
  };
  platforms?: string[];
  architectures?: string[];
  specialRequirements?: string[];
}

export interface LocalModelStatus {
  downloaded: boolean;
  downloadProgress?: number;
  downloadSpeed?: number;
  estimatedTimeRemaining?: number;
  localPath?: string;
  localSize?: number;
  lastUsed?: Date;
  usage?: {
    totalInferences: number;
    totalTokens: number;
    averageResponseTime: number;
    errorCount: number;
    successRate: number;
  };
  configuration?: Record<string, any>;
}

export interface ModelFile {
  filename: string;
  size?: number;
  checksum?: string;
  compressed?: boolean;
}

export interface FineTuningCapabilities {
  supportsFineTuning: boolean;
  supportedMethods: ('full' | 'lora' | 'qlora' | 'prefix-tuning')[];
  maxSequenceLength: number;
  recommendedBatchSize: number;
  estimatedTrainingTime: {
    small: number;  // hours
    medium: number;
    large: number;
  };
  requirements: {
    minMemory: number;
    recommendedMemory: number;
    gpuRequired: boolean;
  };
}

export interface ModelDownloadProgress {
  modelId: string;
  status?: 'pending' | 'downloading' | 'extracting' | 'completed' | 'error';
  progress: number; // 0-100
  downloadedBytes?: number;
  totalBytes?: number;
  downloaded?: number;
  total?: number;
  speed: number; // bytes per second
  eta: number; // estimated time remaining in seconds
  error?: string;
  files?: Array<{
    filename: string;
    progress: number;
    size: number;
    downloaded?: number;
    checksum?: string;
  }>;
}

export interface BenchmarkResult {
  modelId: string;
  timestamp: Date;
  metrics: {
    latency: {
      mean: number;
      p50: number;
      p90: number;
      p99: number;
    };
    throughput: {
      tokensPerSecond: number;
      requestsPerSecond: number;
    };
    accuracy: {
      score: number;
      dataset: string;
      metric: string;
    };
    resources: {
      memoryUsage: number;
      cpuUsage: number;
      gpuUsage?: number;
    };
    sequenceLength: number;
    numSamples: number;
    hardware: string;
  };
}

export interface HuggingFaceConfig {
  apiKey?: string;
  baseUrl?: string;
  timeout?: number;
  retries?: number;
  cacheTTL?: number;
  localCacheEnabled?: boolean;
  downloadPath?: string;
}

export interface ModelMetadata {
  lastUpdated: Date;
  localPath?: string;
  isLocal: boolean;
  version: string;
  checksum?: string;
  tags: string[];
  customConfig?: Record<string, any>;
}

export interface HuggingFaceError {
  code: string;
  message: string;
  details?: any;
  retryable: boolean;
  suggestion?: string;
  stack?: string;
}
