// Shared type definitions for local-first components
// These interfaces mirror the structures used inside the UI components
// so that other modules can import consistent typings without relying
// on component internals.

export interface LocalModel {
  id: string;
  name: string;
  displayName: string;
  size: string;
  sizeBytes: number;
  format: 'GGUF' | 'ONNX' | 'PyTorch' | 'Safetensors';
  quantization: 'Q4_0' | 'Q4_1' | 'Q5_0' | 'Q5_1' | 'Q8_0' | 'F16' | 'F32';
  parameters: string;
  isDownloaded: boolean;
  isActive: boolean;
  localPath?: string;
  downloadProgress?: number;
  lastUsed?: Date;
  memoryRequirement: number;
  cpuOptimized: boolean;
  gpuCompatible: boolean;
  description: string;
  license: string;
  capabilities: string[];
  performance: {
    tokensPerSecond: number;
    memoryUsage: number;
    averageLatency: number;
  };
}

export interface FileSystemItem {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  lastModified: Date;
  isHidden: boolean;
  permissions: {
    readable: boolean;
    writable: boolean;
    executable: boolean;
  };
  mimeType?: string;
  isSymlink?: boolean;
  isEncrypted?: boolean;
  isIndexed?: boolean;
  preview?: {
    text?: string;
    thumbnail?: string;
  };
  metadata?: {
    description?: string;
    tags?: string[];
    lastAccessed?: Date;
    security?: 'safe' | 'warning' | 'restricted';
  };
}

export interface ChatMessage {
  id: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    modelUsed?: string;
    tokensUsed?: number;
    responseTime?: number;
    temperature?: number;
    attachments?: string[];
    storedLocally: boolean;
    encrypted: boolean;
  };
  status: 'sending' | 'sent' | 'generating' | 'completed' | 'error';
  error?: string;
  isStreaming?: boolean;
  parentId?: string;
}

export interface ChatSession {
  id: string;
  name: string;
  createdAt: Date;
  lastModified: Date;
  messageCount: number;
  modelUsed: string;
  isEncrypted: boolean;
  localPath: string;
  size: number;
  metadata: {
    tags: string[];
    description?: string;
    archived: boolean;
  };
}

export interface LocalSettings {
  privacy: {
    encryptionEnabled: boolean;
    encryptionKey: string;
    autoDeleteAfterDays: number;
    requireAuthOnStart: boolean;
    allowTelemetry: boolean;
    anonymizeData: boolean;
  };
  storage: {
    dataDirectory: string;
    maxCacheSize: number;
    autoCleanup: boolean;
    compressionEnabled: boolean;
    backupEnabled: boolean;
    backupLocation: string;
  };
  inference: {
    defaultModel: string;
    maxMemoryUsage: number;
    threadCount: number;
    useGPU: boolean;
    quantizationLevel: 'Q4_0' | 'Q4_1' | 'Q5_0' | 'Q5_1' | 'Q8_0' | 'F16';
    contextWindow: number;
    temperature: number;
  };
  interface: {
    theme: 'light' | 'dark' | 'system';
    fontSize: number;
    autoSave: boolean;
    showLineNumbers: boolean;
    enableSounds: boolean;
    notificationsEnabled: boolean;
    startMinimized: boolean;
    checkUpdates: boolean;
  };
  network: {
    offlineMode: boolean;
    blockExternalRequests: boolean;
    allowModelDownloads: boolean;
    proxyEnabled: boolean;
    proxyUrl: string;
  };
}

export interface ErrorContext {
  component: string;
  operation: string;
  timestamp: Date;
  userId?: string;
  sessionId?: string;
  modelId?: string;
  filePath?: string;
  systemInfo?: {
    memory: number;
    cpu: number;
    disk: number;
  };
}

export interface OfflineError {
  id: string;
  type: 'network' | 'storage' | 'memory' | 'model' | 'file' | 'permission' | 'system' | 'data';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  details?: string;
  context: ErrorContext;
  suggestions: string[];
  isResolved: boolean;
  canRetry: boolean;
  requiresRestart: boolean;
  autoResolved: boolean;
  retryCount: number;
  maxRetries: number;
  localDataLoss: boolean;
  privacyImpact: boolean;
}

export interface PerformanceMetrics {
  timestamp: Date;
  cpu: {
    usage: number;
    cores: number;
    frequency: number;
    temperature?: number;
  };
  memory: {
    used: number;
    total: number;
    cached: number;
    swapUsed: number;
    swapTotal: number;
  };
  disk: {
    read: number;
    write: number;
    usage: number;
    available: number;
    total: number;
  };
  network: {
    bytesReceived: number;
    bytesSent: number;
    packetsReceived: number;
    packetsSent: number;
    isOffline: boolean;
  };
  model: {
    tokensPerSecond: number;
    averageLatency: number;
    memoryUsage: number;
    contextWindowUsage: number;
    isLoaded: boolean;
    modelName?: string;
  };
  application: {
    uptime: number;
    threadsCount: number;
    fileHandles: number;
    cacheHitRate: number;
    errorCount: number;
    warningCount: number;
  };
}

export interface PrivacyStatus {
  networkIsolation: {
    status: 'secure' | 'warning' | 'compromised';
    blockedRequests: number;
    lastExternalAttempt?: Date;
    dnsLeaks: boolean;
    vpnActive: boolean;
  };
  dataEncryption: {
    status: 'encrypted' | 'partial' | 'unencrypted';
    algorithm: string;
    keyStrength: number;
    encryptedFiles: number;
    totalFiles: number;
    encryptionProgress?: number;
  };
  localStorage: {
    status: 'local' | 'cloud' | 'mixed';
    totalSize: number;
    backupLocation: 'local' | 'none';
    compressionEnabled: boolean;
    autoDelete: boolean;
    retentionDays: number;
  };
  dataMinimization: {
    status: 'minimal' | 'standard' | 'excessive';
    piiDetected: boolean;
    anonymized: boolean;
    trackedMetrics: string[];
    optOutStatus: boolean;
  };
  accessControl: {
    status: 'protected' | 'basic' | 'open';
    authenticationEnabled: boolean;
    sessionTimeout: number;
    failedAttempts: number;
    lastAccess: Date;
  };
  auditTrail: {
    enabled: boolean;
    logLevel: 'minimal' | 'standard' | 'detailed';
    eventsLogged: number;
    suspiciousActivity: number;
    lastAudit: Date;
  };
}
