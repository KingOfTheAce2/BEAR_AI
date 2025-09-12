// Enhanced Model Types for BEAR AI
// Based on Ollama patterns and enhanced functionality

export interface Model {
  id: string
  name: string
  description: string
  size: string
  status: ModelStatus
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

export type ModelStatus = 
  | 'available'     // Available for download
  | 'downloading'   // Currently downloading
  | 'installed'     // Installed and ready
  | 'loading'       // Loading into memory
  | 'loaded'        // Loaded and active
  | 'error'         // Error state
  | 'updating'      // Being updated
  | 'uninstalling'  // Being removed

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
  version: string
  license: string
  source: string
  author: string
  homepage?: string
  repository?: string
  paperUrl?: string
  downloadUrl: string
  checksum: string
  createdAt: Date
  updatedAt: Date
  downloadCount?: number
  rating?: number
  reviews?: number
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
  model: ModelConfig
  inference: InferenceConfig
  ui: UIConfig
  security: SecurityConfig
  performance: PerformanceConfig
  integrations: IntegrationConfig
  advanced: AdvancedConfig
}

export interface ModelConfig {
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
  status: ModelStatus
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