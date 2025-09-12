// Configuration types for BEAR AI
export type Environment = 'development' | 'production' | 'testing' | 'staging';

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl: boolean;
  poolSize: number;
  timeout: number;
}

export interface APIConfig {
  baseUrl: string;
  timeout: number;
  retries: number;
  rateLimit: {
    requests: number;
    windowMs: number;
  };
  authentication: {
    type: 'bearer' | 'api-key' | 'oauth';
    credentials: Record<string, string>;
  };
}

export interface ModelConfig {
  name: string;
  provider: 'openai' | 'anthropic' | 'local' | 'huggingface' | 'gpt4all';
  endpoint?: string;
  apiKey?: string;
  parameters: {
    temperature: number;
    maxTokens: number;
    topP: number;
    frequencyPenalty: number;
    presencePenalty: number;
    stream: boolean;
  };
  context: {
    maxLength: number;
    truncationStrategy: 'sliding_window' | 'summarize' | 'drop_oldest';
  };
  safety: {
    contentFilter: boolean;
    toxicityThreshold: number;
    enableModeration: boolean;
  };
}

export interface SecurityConfig {
  encryptionKey: string;
  jwtSecret: string;
  sessionTimeout: number;
  maxLoginAttempts: number;
  lockoutDuration: number;
  requireMFA: boolean;
  allowedOrigins: string[];
  csrfProtection: boolean;
}

export interface LoggingConfig {
  level: 'debug' | 'info' | 'warn' | 'error';
  format: 'json' | 'text';
  outputs: Array<{
    type: 'console' | 'file' | 'remote';
    destination?: string;
    rotation?: {
      maxSize: string;
      maxFiles: number;
    };
  }>;
  sensitiveFields: string[];
  enableMetrics: boolean;
}

export interface PerformanceConfig {
  caching: {
    enabled: boolean;
    ttl: number;
    maxSize: number;
    strategy: 'lru' | 'lfu' | 'fifo';
  };
  monitoring: {
    enableAPM: boolean;
    metricsInterval: number;
    healthCheckInterval: number;
    alertThresholds: {
      cpu: number;
      memory: number;
      responseTime: number;
    };
  };
  optimization: {
    enableCompression: boolean;
    enableCDN: boolean;
    bundleOptimization: boolean;
    lazyLoading: boolean;
  };
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  timezone: string;
  dateFormat: string;
  notifications: {
    desktop: boolean;
    email: boolean;
    inApp: boolean;
    sound: boolean;
  };
  accessibility: {
    highContrast: boolean;
    largeText: boolean;
    screenReader: boolean;
    keyboardNavigation: boolean;
  };
  interface: {
    sidebarCollapsed: boolean;
    densityMode: 'compact' | 'normal' | 'comfortable';
    animationsEnabled: boolean;
    showTooltips: boolean;
  };
  privacy: {
    telemetryEnabled: boolean;
    analyticsEnabled: boolean;
    crashReportingEnabled: boolean;
  };
}

export interface FeatureFlags {
  [key: string]: {
    enabled: boolean;
    conditions?: {
      userRole?: string[];
      environment?: Environment[];
      percentage?: number;
    };
    metadata?: {
      description: string;
      owner: string;
      expiresAt?: Date;
    };
  };
}

export interface SystemConfig {
  environment: Environment;
  debug: boolean;
  version: string;
  buildNumber: string;
  maintenance: {
    enabled: boolean;
    message?: string;
    allowedRoles?: string[];
  };
  resources: {
    maxMemoryUsage: number;
    maxCPUUsage: number;
    maxDiskUsage: number;
  };
}

export interface ApplicationConfig {
  system: SystemConfig;
  database: DatabaseConfig;
  api: Record<string, APIConfig>;
  models: Record<string, ModelConfig>;
  security: SecurityConfig;
  logging: LoggingConfig;
  performance: PerformanceConfig;
  features: FeatureFlags;
  userDefaults: UserPreferences;
}

export interface ConfigValidationRule {
  path: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required: boolean;
  validation?: {
    min?: number;
    max?: number;
    pattern?: RegExp;
    enum?: any[];
    custom?: (value: any) => boolean | string;
  };
}

export interface ConfigSchema {
  version: string;
  rules: ConfigValidationRule[];
}

export interface ConfigChangeEvent {
  path: string;
  oldValue: any;
  newValue: any;
  timestamp: Date;
  source: 'user' | 'system' | 'external';
  userId?: string;
}

export interface HotReloadOptions {
  enabled: boolean;
  watchPaths: string[];
  debounceMs: number;
  validateOnChange: boolean;
  backupOnChange: boolean;
}

export interface ConfigManagerState {
  config: ApplicationConfig;
  userPreferences: Record<string, UserPreferences>;
  isLoading: boolean;
  lastUpdated: Date;
  errors: string[];
  warnings: string[];
  pendingChanges: ConfigChangeEvent[];
}

export interface ConfigExport {
  timestamp: Date;
  environment: Environment;
  version: string;
  config: Partial<ApplicationConfig>;
  userPreferences?: Record<string, UserPreferences>;
  metadata: {
    exportedBy: string;
    reason: string;
    includeSecrets: boolean;
  };
}

export interface ConfigImportResult {
  success: boolean;
  imported: string[];
  skipped: string[];
  errors: Array<{
    path: string;
    error: string;
  }>;
  warnings: string[];
}

// Event types for configuration changes
export type ConfigEventType = 
  | 'config.loaded'
  | 'config.updated'
  | 'config.validated'
  | 'config.error'
  | 'preferences.updated'
  | 'feature.toggled'
  | 'hot.reload';

export interface ConfigEvent {
  type: ConfigEventType;
  payload: any;
  timestamp: Date;
  source: string;
}

// Type guards and utilities
export function isValidEnvironment(env: string): env is Environment {
  return ['development', 'production', 'testing', 'staging'].includes(env);
}

export function isModelConfig(config: any): config is ModelConfig {
  return config && 
    typeof config.name === 'string' &&
    typeof config.provider === 'string' &&
    config.parameters &&
    typeof config.parameters.temperature === 'number';
}

export function isUserPreferences(prefs: any): prefs is UserPreferences {
  return prefs &&
    typeof prefs.theme === 'string' &&
    typeof prefs.language === 'string' &&
    prefs.notifications &&
    typeof prefs.notifications.desktop === 'boolean';
}