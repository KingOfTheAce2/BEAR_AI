/**
 * HuggingFace Integration Index for BEAR AI
 * Exports all HuggingFace-related components, services, and utilities
 */

// Main Components
export { default as HuggingFaceModelSelector } from './HuggingFaceModelSelector';
export { default as FineTuningInterface } from './FineTuningInterface';

// Services
export { default as HuggingFaceService } from '@/services/huggingface/HuggingFaceService';
export { default as ModelSwitcher } from '@/services/huggingface/ModelSwitcher';
export { default as LocalModelManager } from '@/services/huggingface/LocalModelManager';

// Utilities
export { default as ModelBenchmarking } from '@/utils/huggingface/ModelBenchmarking';
export { default as CompatibilityValidator } from '@/utils/huggingface/CompatibilityValidator';
export { default as HuggingFaceErrorHandler } from '@/utils/huggingface/ErrorHandler';

// Types
export type {
  HuggingFaceModel,
  ModelSearchFilters,
  ModelRecommendation,
  FineTuningCapabilities,
  FineTuningConfig,
  LegalCategory
} from '@/types/huggingface/index';

export type {
  CompatibilityResult,
  ModelDownloadProgress,
  BenchmarkResult
} from '@/types/huggingface';