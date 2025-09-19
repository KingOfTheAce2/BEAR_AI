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

export type LegalCategory = 
  | 'contract-analysis'
  | 'legal-research'
  | 'compliance-check'
  | 'document-review'
  | 'case-law-analysis'
  | 'regulatory-compliance'
  | 'risk-assessment'
  | 'legal-drafting';

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
  status: 'pending' | 'downloading' | 'extracting' | 'completed' | 'error';
  progress: number; // 0-100
  downloadedBytes: number;
  totalBytes: number;
  speed: number; // bytes per second
  eta: number; // estimated time remaining in seconds
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
