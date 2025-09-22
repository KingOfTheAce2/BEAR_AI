// Enhanced Model Types for BEAR AI
// Based on Ollama patterns and enhanced functionality

export const ModelType = {
  GPT4ALL: 'gpt4all',
  LLAMA: 'llama',
  MISTRAL: 'mistral',
  CODEGEN: 'codegen',
  GENERIC: 'generic',
  CUSTOM: 'custom'
} as const

export type ModelType = typeof ModelType[keyof typeof ModelType]

export const ModelStatus = {
  AVAILABLE: 'available',
  DOWNLOADING: 'downloading',
  INSTALLED: 'installed',
  LOADING: 'loading',
  LOADED: 'loaded',
  ACTIVE: 'active',
  ERROR: 'error',
  UPDATING: 'updating',
  UNLOADING: 'unloading',
  UNLOADED: 'unloaded'
} as const

export type ModelStatusType = typeof ModelStatus[keyof typeof ModelStatus]

export const ModelPriority = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3
} as const

export type ModelPriority = number

export const ModelErrorCode = {
  MODEL_NOT_FOUND: 'MODEL_NOT_FOUND',
  LOADING_FAILED: 'LOADING_FAILED',
  INSUFFICIENT_MEMORY: 'INSUFFICIENT_MEMORY',
  TIMEOUT: 'TIMEOUT',
  INFERENCE_FAILED: 'INFERENCE_FAILED',
  UNSUPPORTED_FORMAT: 'UNSUPPORTED_FORMAT',
  UNKNOWN: 'UNKNOWN'
} as const

export type ModelErrorCode = typeof ModelErrorCode[keyof typeof ModelErrorCode]

export const MemoryPressure = {
  LOW: 'low',
  MODERATE: 'moderate',
  HIGH: 'high',
  CRITICAL: 'critical'
} as const

export type MemoryPressure = typeof MemoryPressure[keyof typeof MemoryPressure]

export interface Model {
  id: string
  name: string
  description: string
  size: string
  status: ModelStatusType
  type?: ModelType
  downloadProgress?: number
  capabilities: ModelCapability[]
  family: ModelFamily
  tags: string[]
  parameters: string
  quantization: string
  lastUsed?: Date
  performance: ModelPerformance
  metadata: ModelMetadata
  compatibility: ModelCompatibility
}

export type ModelFamily = 
  | 'llama'
  | 'mistral'
  | 'codellama'
  | 'phi'
  | 'gemma'
  | 'orca'
  | 'vicuna'
  | 'wizardlm'
  | 'neural-chat'
  | 'solar'
  | 'starling'
  | 'openchat'
  | 'deepseek'
  | 'custom'

export interface ModelCapability {
  name: string
  supported: boolean
  performance: CapabilityPerformance
  description?: string
  requirements?: string[]
}

export type CapabilityPerformance = 'excellent' | 'good' | 'fair' | 'poor' | 'unknown'

export interface ModelPerformance {
  tokensPerSecond: number
  memoryUsage: number        // MB
  accuracy: number           // 0-100
  latency: number           // ms
  throughput: number        // tokens/minute
  efficiency: number        // tokens per MB
  benchmarkScore?: number   // Overall benchmark score
  lastBenchmark?: Date
}

export interface ModelMetadata {
  name?: string
  version?: string
  description?: string
  license?: string
  source?: string
  author?: string
  homepage?: string
  repository?: string
  paperUrl?: string
  downloadUrl?: string
  checksum?: string
  createdAt?: Date
  updatedAt?: Date
  tags?: string[]
  languages?: string[]
  architecture?: string
  parameters?: number
  downloadCount?: number
  rating?: number
  reviews?: number
  usageCount?: number
  averageInferenceTime?: number
  supportedTokens?: number
  [key: string]: any
}

export interface ModelCompatibility {
  minRAM: number            // MB
  recommendedRAM: number    // MB
  gpuSupport: boolean
  cpuOnly: boolean
  platforms: Platform[]
  architectures: Architecture[]
  frameworks: Framework[]
}

export type Platform = 'windows' | 'macos' | 'linux' | 'docker'
export type Architecture = 'x64' | 'arm64' | 'x86'
export type Framework = 'pytorch' | 'tensorflow' | 'onnx' | 'llamacpp' | 'transformers'

export interface ModelCapabilities {
  textGeneration?: boolean
  chatCompletion?: boolean
  codeGeneration?: boolean
  embedding?: boolean
  reasoning?: boolean
  streaming?: boolean
  multiModal?: boolean
  contextLength?: number
  features?: string[]
  languages?: string[]
  modelSize?: number
  architecture?: string
  specializations?: string[]
  supportedFormats?: string[]
  maxContextLength?: number
  performance?: Record<string, any>
  safety?: Record<string, any>
  [key: string]: any
}

export interface ModelConfig {
  id: string
  name: string
  path: string
  type: ModelType
  priority: ModelPriority
  size?: number
  fileSize?: number
  quantization?: string
  format?: string
  version?: string
  description?: string
  author?: string
  license?: string
  provider?: string
  tags?: string[]
  languages?: string[]
  parameters?: number
  architecture?: string
  checksum?: string
  contextLength?: number
  memoryRequirement?: number
  streaming?: boolean
  gpu?: boolean
  local?: boolean
  localPath?: string
  configPath?: string
  baseModel?: string
  metadata?: ModelMetadata
  capabilities?: ModelCapabilities | string[]
  lastUpdated?: Date
  createdAt?: Date
  [key: string]: any
}

export interface ModelLoadOptions {
  forceLoad?: boolean
  priority?: ModelPriority
  timeout?: number
  preload?: boolean
}

export interface ModelInferenceOptions {
  maxTokens?: number
  temperature?: number
  topP?: number
  topK?: number
  repeatPenalty?: number
  presencePenalty?: number
  frequencyPenalty?: number
  timeout?: number
  streaming?: boolean
  context?: string
  stopSequences?: string[]
  nBatch?: number
}

export interface ModelInferenceResult {
  text: string
  tokens: number
  inferenceTime: number
  memoryUsed: number
  model: string
  timestamp: Date
  context?: string
  cached?: boolean
  optimized?: boolean
  optimizations?: string[]
  modelId?: string
}

export interface MemoryStats {
  total: number
  available: number
  used: number
  percentage: number
  pressure: MemoryPressure
  modelMemoryUsed?: number
  timestamp?: Date
}

export interface LoadedModel {
  config: ModelConfig
  instance: any
  status: ModelStatusType
  loadedAt?: Date
  lastUsed: Date
  memoryUsage: number
  inferenceCount: number
  averageResponseTime: number
}

export interface ModelManagerConfig {
  maxConcurrentModels: number
  memoryThreshold: number
  cacheSize: number
  autoUnloadTimeout: number
  compressionEnabled: boolean
  fallbackModel?: string
  memoryCheckInterval: number
  enableTelemetry: boolean
}

export interface ModelManagerStats {
  loadedModels: number
  totalMemoryUsed: number
  cacheSize: number
  totalInferences: number
  averageLoadTime: number
  memoryPressure: MemoryPressure
  uptime: number
}

export const ModelEventType = {
  MODEL_DISCOVERED: 'model.discovered',
  MODEL_LOADED: 'model.loaded',
  MODEL_UNLOADED: 'model.unloaded',
  MODEL_ERROR: 'model.error',
  MODEL_SWITCHED: 'model.switched',
  STREAM_TOKEN: 'model.stream_token',
  INFERENCE_COMPLETED: 'inference.completed',
  CACHE_CLEARED: 'cache.cleared',
  MEMORY_PRESSURE: 'memory.pressure',
  METRICS_COLLECTED: 'metrics.collected'
} as const

export type ModelEventType = typeof ModelEventType[keyof typeof ModelEventType]

export interface ModelEvent {
  type: ModelEventType
  timestamp: Date
  modelId?: string
  data?: Record<string, any>
}

export type ModelEventListener = (event: ModelEvent) => void

export class ModelError extends Error {
  public code: ModelErrorCode
  public recoverable: boolean
  public suggestions: string[]
  public metadata?: Record<string, any>

  constructor(
    message: string,
    code: ModelErrorCode,
    options: { recoverable?: boolean; suggestions?: string[]; metadata?: Record<string, any> } = {}
  ) {
    super(message)
    this.name = 'ModelError'
    this.code = code
    this.recoverable = options.recoverable ?? false
    this.suggestions = options.suggestions ?? []
    if (options.metadata !== undefined) {
      this.metadata = options.metadata
    }
  }
}

export interface ModelManager {
  registerModel(config: ModelConfig): void
  unregisterModel(modelId: string): void
  getRegisteredModels(): ModelConfig[]
  discoverModels(directories: string[]): Promise<ModelConfig[]>
  loadModel(modelId: string, options?: ModelLoadOptions): Promise<LoadedModel>
  unloadModel(modelId: string): Promise<void>
  switchModel(fromModelId: string, toModelId: string): Promise<void>
  generateText(
    modelId: string,
    prompt: string,
    options?: ModelInferenceOptions
  ): Promise<ModelInferenceResult>
  generateTextStream(
    modelId: string,
    prompt: string,
    options?: ModelInferenceOptions,
    onToken?: (token: string) => void
  ): Promise<ModelInferenceResult>
  getModel(modelId: string): LoadedModel | null
  getModelMetrics(modelId?: string): any
  getLoadedModels(): LoadedModel[]
  getStats(): ModelManagerStats
  getMemoryStats(): Promise<MemoryStats>
  optimizeMemory(): Promise<void>
  addEventListener(type: ModelEventType, listener: ModelEventListener): void
  removeEventListener(type: ModelEventType, listener: ModelEventListener): void
  dispose(): Promise<void>
}

export interface GPT4ALLConfig {
  modelPath: string
  libraryPath?: string
  nThreads?: number
  nPredict?: number
  temp?: number
  topK?: number
  topP?: number
  repeatPenalty?: number
  repeatLastN?: number
  seed?: number
  nBatch?: number
  nCtx?: number
  promptTemplate?: string
  [key: string]: any
}

export interface GPT4ALLModel {
  loadModel(): Promise<any>
  unloadModel?(): Promise<any>
  dispose?(): Promise<any>
  close?(): Promise<any>
  generate?(prompt: string, options?: any): Promise<any>
  createCompletion?(options: any): Promise<any>
  chat?(messages: Array<{ role: string; content: string }>, options?: any): Promise<any>
  getMemoryUsage?(): number
  [key: string]: any
}

// Streaming response types
export interface StreamingResponse {
  messageId: string
  content: string
  isComplete: boolean
  metadata: StreamingMetadata
  error?: StreamingError
}

export interface StreamingMetadata {
  tokensPerSecond: number
  totalTokens: number
  generatedTokens: number
  timeElapsed: number
  confidence?: number
  model: string
  temperature: number
  prompt?: string
  finishReason?: FinishReason
}

export type FinishReason = 'stop' | 'length' | 'timeout' | 'interrupted' | 'error'

export interface StreamingError {
  code: string
  message: string
  details?: Record<string, any>
  recoverable: boolean
  suggestion?: string
}

// Configuration types
export interface SystemConfiguration {
  model: ModelGenerationSettings
  inference: InferenceConfig
  ui: UIConfig
  security: SecurityConfig
  performance: PerformanceConfig
  integrations: IntegrationConfig
  advanced: AdvancedConfig
}

export interface ModelGenerationSettings {
  defaultModel: string
  temperature: number
  topP: number
  topK: number
  maxTokens: number
  repeatPenalty: number
  seed?: number
  systemPrompt?: string
  contextLength: number
  batchSize: number
  numThread: number
  useGpu: boolean
  gpuLayers: number
}

export interface InferenceConfig {
  enableStreaming: boolean
  streamingDelay: number
  maxConcurrentRequests: number
  requestTimeout: number
  retryAttempts: number
  backoffMultiplier: number
  enableCaching: boolean
  cacheSize: number
  cacheTTL: number
}

export interface UIConfig {
  theme: 'professional' | 'modern' | 'simple'
  colorMode: 'light' | 'dark' | 'system'
  fontSize: 'small' | 'medium' | 'large'
  density: 'compact' | 'comfortable' | 'spacious'
  animations: boolean
  soundEffects: boolean
  notifications: boolean
  autoSave: boolean
  language: string
}

export interface SecurityConfig {
  enableAuth: boolean
  sessionTimeout: number
  maxLoginAttempts: number
  requireMFA: boolean
  enableAuditLog: boolean
  dataEncryption: boolean
  networkSecurity: 'strict' | 'balanced' | 'permissive'
  allowExternal: boolean
  corsOrigins: string[]
}

export interface PerformanceConfig {
  enableMetrics: boolean
  metricsRetention: number
  enableProfiling: boolean
  memoryLimit: number
  cpuLimit: number
  diskLimit: number
  networkLimit: number
  enableOptimizations: boolean
  preloadModels: string[]
  enableLazyLoading: boolean
}

export interface IntegrationConfig {
  enableAPI: boolean
  apiPort: number
  enableWebhooks: boolean
  webhookUrl?: string
  enablePlugins: boolean
  allowedPlugins: string[]
  enableExternalModels: boolean
  modelRepositories: string[]
  enableSync: boolean
  syncInterval: number
}

export interface AdvancedConfig {
  debugMode: boolean
  logLevel: 'error' | 'warn' | 'info' | 'debug' | 'trace'
  enableExperimentalFeatures: boolean
  customSettings: Record<string, any>
  environmentVariables: Record<string, string>
  featureFlags: Record<string, boolean>
  developerMode: boolean
  telemetryEnabled: boolean
}

// Performance monitoring types
export interface PerformanceMetrics {
  system: SystemMetrics
  models: ModelMetrics[]
  inference: InferenceMetrics
  usage: UsageMetrics
  realTime: RealTimeMetrics
  alerts: Alert[]
}

export interface SystemMetrics {
  cpuUsage: number
  memoryUsage: number
  memoryTotal: number
  gpuUsage?: number
  gpuMemoryUsage?: number
  diskUsage: number
  diskTotal: number
  networkIn: number
  networkOut: number
  temperature: number
  uptime: number
  loadAverage: number[]
  processCount: number
}

export interface ModelMetrics {
  modelId: string
  status: ModelStatusType
  memoryFootprint: number
  tokensPerSecond: number
  averageLatency: number
  throughput: number
  errorRate: number
  requestCount: number
  successRate: number
  lastUsed: Date
  totalInference: number
  averageTokens: number
}

export interface InferenceMetrics {
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  averageResponseTime: number
  p95ResponseTime: number
  p99ResponseTime: number
  concurrentRequests: number
  queueLength: number
  cacheHitRate: number
  bytesProcessed: number
}

export interface UsageMetrics {
  sessionsToday: number
  sessionsThisWeek: number
  sessionsThisMonth: number
  totalSessions: number
  averageSessionDuration: number
  totalInferenceTime: number
  totalTokensGenerated: number
  totalTokensProcessed: number
  popularModels: string[]
  peakUsageHours: number[]
}

export interface RealTimeMetrics {
  timestamp: Date
  activeUsers: number
  activeModels: number
  requestsPerMinute: number
  tokensPerMinute: number
  errorRate: number
  responseTime: number
  systemLoad: number
  memoryPressure: number
}

export interface Alert {
  id: string
  type: AlertType
  severity: AlertSeverity
  title: string
  message: string
  timestamp: Date
  acknowledged: boolean
  resolved: boolean
  metadata?: Record<string, any>
  actions?: AlertAction[]
}

export type AlertType = 
  | 'performance'
  | 'security'
  | 'system'
  | 'model'
  | 'network'
  | 'storage'
  | 'memory'
  | 'temperature'

export type AlertSeverity = 'info' | 'warning' | 'error' | 'critical'

export interface AlertAction {
  id: string
  label: string
  action: string
  destructive?: boolean
  primary?: boolean
}

// Error handling types
export interface ErrorFallbackProps {
  error: Error
  errorInfo?: {
    componentStack: string
  }
  resetError: () => void
  retry: () => void
}

export interface ValidationError {
  field: string
  message: string
  code: string
  severity: 'error' | 'warning' | 'info'
}

// Notification types
export interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  timestamp: Date
  duration?: number
  actions?: NotificationAction[]
  persistent?: boolean
  metadata?: Record<string, any>
  progress?: number
  status?: NotificationStatus
}

export type NotificationType = 'success' | 'warning' | 'error' | 'info' | 'progress'
export type NotificationStatus = 'pending' | 'completed' | 'failed' | 'cancelled'

export interface NotificationAction {
  id: string
  label: string
  action: string
  variant?: 'primary' | 'secondary' | 'destructive'
}

export type NotificationPosition = 
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right'
  | 'top-center'
  | 'bottom-center'

// Time range types for analytics
export interface TimeRange {
  start: Date
  end: Date
  preset?: TimeRangePreset
}

export type TimeRangePreset = 
  | 'last-hour'
  | 'last-day'
  | 'last-week'
  | 'last-month'
  | 'last-year'
  | 'custom'