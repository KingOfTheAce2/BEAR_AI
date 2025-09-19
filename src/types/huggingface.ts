/**
 * HuggingFace Integration Types for BEAR AI
 * Unified type definitions used across services, components, and utilities
 */

// Base model metadata returned from HuggingFace and enriched by BEAR AI
export interface HuggingFaceModel {
  id: string;
  modelId: string;
  name?: string;
  description?: string;
  author: string;
  sha?: string;
  createdAt: Date;
  lastModified: Date;
  created_at?: string;
  updated_at?: string;
  downloads: number;
  likes: number;
  tags: string[];
  pipeline_tag?: string;
  library_name?: string;
  license?: string;
  licenses?: string[];
  size?: number;
  config?: Record<string, any>;
  tokenizer?: string;
  model_index?: Record<string, any>;
  transformersInfo?: TransformersInfo;
  cardData?: ModelCardData;
  siblings?: ModelFile[];
  disabled: boolean;
  gated: boolean;
  private: boolean;
  legalScore: number; // 0-100 score for legal use cases
  legalUseCases: LegalUseCase[];
  performanceBenchmarks: PerformanceBenchmark[];
  resourceRequirements: ResourceRequirements;
  compatibilityInfo: CompatibilityInfo;
  localStatus: LocalModelStatus;
  bearaiTags: string[]; // BEAR AI specific tags
}

export interface TransformersInfo {
  processor?: string;
  tokenizer?: string;
  pipeline_tag?: string;
  tags?: string[];
  supported_tasks?: string[];
}

export interface ModelCardData {
  language?: string | string[];
  license?: string;
  datasets?: string[];
  metrics?: string[];
  model_name?: string;
  tags?: string[];
  task_categories?: string[];
  task_ids?: string[];
  widget?: any[];
}

export interface ModelFile {
  rfilename: string;
  size?: number;
  lfs?: {
    pointer_size: number;
    size: number;
    sha256: string;
  };
}

// Legal use case definitions
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

export enum LegalCategory {
  CONTRACT_ANALYSIS = 'contract-analysis',
  DOCUMENT_REVIEW = 'document-review',
  LEGAL_RESEARCH = 'legal-research',
  COMPLIANCE_CHECK = 'compliance-check',
  COMPLIANCE = 'compliance',
  CASE_LAW_ANALYSIS = 'case-law-analysis',
  LITIGATION_SUPPORT = 'litigation-support',
  REGULATORY_ANALYSIS = 'regulatory-analysis',
  INTELLECTUAL_PROPERTY = 'intellectual-property',
  CORPORATE_LAW = 'corporate-law',
  CRIMINAL_LAW = 'criminal-law',
  FAMILY_LAW = 'family-law',
  IMMIGRATION_LAW = 'immigration-law',
  TAX_LAW = 'tax-law',
  REAL_ESTATE = 'real-estate',
  EMPLOYMENT_LAW = 'employment-law',
  GENERAL_LEGAL = 'general-legal',
  REGULATORY_COMPLIANCE = 'regulatory-compliance',
  RISK_ASSESSMENT = 'risk-assessment',
  LEGAL_DRAFTING = 'legal-drafting'
}

// Performance benchmarking
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

// Resource requirements
export interface ResourceRequirements {
  minRam: number; // MB
  recommendedRam: number; // MB
  minStorage: number; // MB
  modelSizeMB: number;
  gpuRequired: boolean;
  minGpuMemory?: number; // MB
  recommendedGpuMemory?: number; // MB
  cpuCores: number;
  estimatedInferenceTime: {
    cpu: number; // ms per token
    gpu?: number; // ms per token
  };
  powerConsumption: {
    idle: number; // watts
    load: number; // watts
  };
}

// Compatibility information
export interface CompatibilityInfo {
  frameworks: string[];
  pythonVersions: string[];
  transformersVersion: string;
  torchVersions?: string[];
  tensorflowVersions?: string[];
  onnxSupport: boolean;
  quantizationSupport: {
    int8: boolean;
    int4: boolean;
    fp16: boolean;
    bfloat16: boolean;
  };
  platforms: string[];
  architectures: string[];
  specialRequirements?: string[];
}

// Local model status
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
  configuration?: ModelConfiguration;
}

export interface ModelConfiguration {
  maxLength: number;
  temperature: number;
  topP: number;
  topK: number;
  repetitionPenalty: number;
  doSample: boolean;
  earlyStopping?: boolean;
  numBeams?: number;
  padTokenId?: number;
  eosTokenId?: number;
  customPrompts?: {
    system?: string;
    user?: string;
    assistant?: string;
  };
  legalOptimizations?: {
    enableCitations: boolean;
    strictFactChecking: boolean;
    conservativeAnswers: boolean;
    jurisdictionAware: boolean;
    privacyMode: boolean;
  };
}

// Search and filtering
export interface ModelSearchFilters {
  query?: string;
  author?: string;
  pipeline_tag?: string;
  library?: string[];
  language?: string[];
  license?: string[];
  licenses?: string[];
  tags?: string[];
  sort?: 'downloads' | 'likes' | 'updated_at' | 'created_at';
  direction?: 'asc' | 'desc';
  limit?: number;
  full?: boolean;
  legalCategories?: LegalCategory[];
  minLegalScore?: number;
  maxModelSize?: number; // MB
  requiresGpu?: boolean;
  languages?: string[];
  minDownloads?: number;
  frameworks?: string[];
  taskTypes?: string[];
  excludeGated?: boolean;
  excludePrivate?: boolean;
  localOnly?: boolean;
  sortBy?: ModelSortOption;
  sortOrder?: 'asc' | 'desc';
  offset?: number;
}

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

// Model recommendations
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
  confidence?: number; // optional confidence level
  pros?: string[];
  cons?: string[];
  alternativeModels?: string[]; // Model IDs
  legalUseCaseFit?: Array<{
    useCase: LegalUseCase;
    fitScore: number; // 0-100
  }>;
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

// Fine-tuning support
export interface FineTuningCapabilities {
  supported: boolean;
  methods: FineTuningMethod[];
  difficulty: 'easy' | 'moderate' | 'advanced';
  estimatedTime: number; // hours
  dataRequirements: {
    minSamples: number;
    recommendedSamples: number;
    format: string[];
    preprocessing: string[];
  };
  computeRequirements: ResourceRequirements;
  legalDatasetSupport: boolean;
  pretrainedCheckpoints?: string[];
  notes?: string[];
}

export enum FineTuningMethod {
  FULL_FINE_TUNING = 'full_fine_tuning',
  LORA = 'lora',
  QLORA = 'qlora',
  ADALORA = 'adalora',
  PREFIX_TUNING = 'prefix_tuning',
  PROMPT_TUNING = 'prompt_tuning',
  P_TUNING_V2 = 'p_tuning_v2'
}

export interface FineTuningJob {
  id: string;
  modelId: string;
  status: FineTuningStatus;
  method: FineTuningMethod;
  dataset: string;
  config: FineTuningConfig;
  progress: number; // 0-100
  startTime?: Date;
  endTime?: Date;
  estimatedCompletion?: Date;
  metrics?: TrainingMetrics;
  error?: string;
  outputModelId?: string;
}

export enum FineTuningStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export interface FineTuningConfig {
  learningRate: number;
  batchSize: number;
  epochs: number;
  warmupSteps: number;
  weightDecay: number;
  maxSeqLength: number;
  gradientAccumulationSteps: number;
  lora?: {
    r: number;
    alpha: number;
    dropout: number;
    targetModules: string[];
  };
  validation: {
    split: number;
    metric: string;
    earlyStoppingPatience?: number;
  };
  legal: {
    enablePrivacyFilters: boolean;
    enableBiasDetection: boolean;
    enableFactChecking: boolean;
    jurisdictionFocus?: string[];
  };
}

export interface TrainingMetrics {
  loss: number;
  validationLoss?: number;
  accuracy?: number;
  f1Score?: number;
  bleuScore?: number;
  perplexity?: number;
  legalMetrics?: {
    citationAccuracy: number;
    factualConsistency: number;
    legalReasoningScore: number;
    ethicsScore: number;
  };
}

// Download progress tracking
export interface ModelDownloadProgress {
  modelId: string;
  status?: 'pending' | 'downloading' | 'extracting' | 'completed' | 'error';
  progress: number; // 0-100
  downloaded: number; // bytes
  total: number; // bytes
  speed: number; // bytes per second
  eta: number; // seconds
  downloadedBytes?: number; // optional alias for compatibility
  totalBytes?: number; // optional alias for compatibility
  files?: Array<{
    filename: string;
    progress: number;
    size: number;
    downloaded: number;
  }>;
  error?: string;
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
  };
  testConfiguration: {
    batchSize: number;
    sequenceLength: number;
    numSamples: number;
    hardware: string;
  };
}

export interface HuggingFaceConfig {
  apiKey?: string;
  apiToken?: string;
  baseUrl?: string;
  timeout?: number;
  retries?: number;
  retryAttempts?: number;
  cacheTTL?: number;
  cacheDuration?: number;
  localCacheEnabled?: boolean;
  cacheEnabled?: boolean;
  downloadPath?: string;
  maxConcurrentDownloads?: number;
  enableTelemetry?: boolean;
  legalOptimizations?: {
    prioritizeLegalModels?: boolean;
    filterNonCommercial?: boolean;
    enablePrivacyMode?: boolean;
    requireOpenSource?: boolean;
  };
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

export interface ModelEvent {
  type: ModelEventType;
  modelId?: string;
  data?: any;
  timestamp: Date;
}

export enum ModelEventType {
  SEARCH_STARTED = 'search_started',
  SEARCH_COMPLETED = 'search_completed',
  SEARCH_FAILED = 'search_failed',
  DOWNLOAD_STARTED = 'download_started',
  DOWNLOAD_PROGRESS = 'download_progress',
  DOWNLOAD_COMPLETED = 'download_completed',
  DOWNLOAD_FAILED = 'download_failed',
  MODEL_LOADED = 'model_loaded',
  MODEL_UNLOADED = 'model_unloaded',
  MODEL_SWITCHED = 'model_switched',
  INFERENCE_STARTED = 'inference_started',
  INFERENCE_COMPLETED = 'inference_completed',
  FINE_TUNING_STARTED = 'fine_tuning_started',
  FINE_TUNING_PROGRESS = 'fine_tuning_progress',
  FINE_TUNING_COMPLETED = 'fine_tuning_completed'
}
