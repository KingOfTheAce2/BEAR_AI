/**
 * HuggingFace Integration Types for BEAR AI
 */

// Legal taxonomy and evaluation structures ------------------------------------------------------

export enum LegalCategory {
  CONTRACT_ANALYSIS = 'contract_analysis',
  DOCUMENT_REVIEW = 'document_review',
  LEGAL_RESEARCH = 'legal_research',
  COMPLIANCE = 'compliance',
  LITIGATION_SUPPORT = 'litigation_support',
  REGULATORY_ANALYSIS = 'regulatory_analysis',
  INTELLECTUAL_PROPERTY = 'intellectual_property',
  CORPORATE_LAW = 'corporate_law',
  CRIMINAL_LAW = 'criminal_law',
  FAMILY_LAW = 'family_law',
  IMMIGRATION_LAW = 'immigration_law',
  TAX_LAW = 'tax_law',
  REAL_ESTATE = 'real_estate',
  EMPLOYMENT_LAW = 'employment_law',
  GENERAL_LEGAL = 'general_legal'
}

export interface LegalUseCase {
  id: string;
  name: string;
  description: string;
  category: LegalCategory;
  suitabilityScore: number; // 0-100
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
  legalRelevance: number; // 0-100 how relevant to legal tasks
}

// Resource and compatibility metadata -----------------------------------------------------------

export interface ResourceRequirements {
  minRam: number; // MB
  recommendedRam: number; // MB
  minStorage: number; // MB
  modelSizeMB: number;
  gpuRequired: boolean;
  minGpuMemory?: number; // MB
  recommendedGpuMemory?: number; // MB
  cpuCores?: number;
  estimatedInferenceTime: {
    cpu: number; // ms per token
    gpu?: number; // ms per token
  };
  powerConsumption?: {
    idle?: number; // watts
    load?: number; // watts
  };
}

export interface CompatibilityInfo {
  frameworks: string[];
  pythonVersions: string[];
  transformersVersion: string;
  torchVersions?: string[];
  tensorflowVersions?: string[];
  onnxSupport: boolean;
  quantizationSupport?: {
    int8?: boolean;
    int4?: boolean;
    fp16?: boolean;
    bfloat16?: boolean;
  };
  platforms: string[];
  architectures: string[];
  specialRequirements?: string[];
}

export interface LocalModelStatus {
  downloaded: boolean;
  downloadProgress?: number;
  downloadSpeed?: number; // MB/s
  estimatedTimeRemaining?: number; // seconds
  localPath?: string;
  localSize?: number; // bytes
  lastUsed?: Date;
  usage: {
    totalInferences: number;
    totalTokens: number;
    averageResponseTime: number;
    errorCount: number;
    successRate: number;
  };
  configuration?: Record<string, any>;
}

export interface ModelFile {
  filename?: string;
  rfilename?: string;
  size?: number;
  checksum?: string;
  compressed?: boolean;
  lfs?: {
    pointer_size: number;
    size: number;
    sha256: string;
  };
}

// Core HuggingFace metadata --------------------------------------------------------------------

export interface HuggingFaceModel {
  id: string;
  modelId: string;
  name?: string;
  description?: string;
  author: string;
  sha?: string;
  created_at?: string;
  updated_at?: string;
  createdAt?: Date;
  lastModified?: Date;
  downloads: number;
  likes: number;
  tags: string[];
  pipeline_tag?: string;
  library_name?: string;
  license?: string;
  size?: number;
  config?: Record<string, any>;
  tokenizer?: string;
  model_index?: Record<string, any>;
  cardData?: Record<string, any>;
  siblings?: ModelFile[];
  disabled?: boolean;
  gated?: boolean;
  private?: boolean;
  transformersInfo?: Record<string, any>;
  legalScore: number; // 0-100 score for legal use cases
  legalUseCases: LegalUseCase[];
  performanceBenchmarks: PerformanceBenchmark[];
  resourceRequirements: ResourceRequirements;
  compatibilityInfo: CompatibilityInfo;
  localStatus: LocalModelStatus;
  bearaiTags: string[]; // BEAR AI specific tags
}

// Search and recommendation structures ---------------------------------------------------------

export enum ModelSortOption {
  RELEVANCE = 'relevance',
  LEGAL_SCORE = 'legal_score',
  DOWNLOADS = 'downloads',
  LIKES = 'likes',
  CREATED_AT = 'created_at',
  LAST_MODIFIED = 'last_modified',
  MODEL_SIZE = 'model_size',
  PERFORMANCE_SCORE = 'performance_score',
  NAME = 'name'
}

export interface ModelSearchFilters {
  query?: string;
  author?: string;
  pipeline_tag?: string;
  library?: string[];
  language?: string[];
  languages?: string[];
  license?: string[];
  licenses?: string[];
  tags?: string[];
  legalCategories?: LegalCategory[];
  minLegalScore?: number;
  maxModelSize?: number; // MB
  requiresGpu?: boolean;
  minDownloads?: number;
  frameworks?: string[];
  taskTypes?: string[];
  excludeGated?: boolean;
  excludePrivate?: boolean;
  localOnly?: boolean;
  sort?: 'downloads' | 'likes' | 'updated_at' | 'created_at';
  sortBy?: ModelSortOption;
  sortOrder?: 'asc' | 'desc';
  direction?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
  full?: boolean;
}

export interface ModelRecommendation {
  model: HuggingFaceModel;
  category: LegalCategory;
  compatibility?: CompatibilityResult;
  score?: number;
  reason?: string;
  reasons?: string[];
  confidence?: number; // 0-100
  pros?: string[];
  cons?: string[];
  alternativeModels?: string[]; // Model IDs
  estimatedPerformance?: {
    accuracy?: number;
    speed?: number;
    resourceUsage?: number;
    resourceEfficiency?: number;
  };
  legalUseCaseFit?: Array<{
    useCase: LegalUseCase;
    fitScore: number; // 0-100
  }>;
}

export interface CompatibilityResult {
  compatible: boolean;
  issues: string[];
  warnings: string[];
  requirements: {
    memory: number;
    diskSpace: number;
    computeCapability?: string;
  };
  recommendations: string[];
  optimizations?: Array<{
    id: string;
    description: string;
    automated: boolean;
    impact: 'low' | 'medium' | 'high';
    estimatedImprovement?: number;
  }>;
}

// Operational metadata -------------------------------------------------------------------------

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
