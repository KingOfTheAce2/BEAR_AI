export interface BaseSettings {

  version: string;
  lastModified: Date;
  schemaVersion: number;
}

export interface UserPreferences extends BaseSettings {
  language: string;
  timezone: string;
  dateFormat: string;
  timeFormat: '12h' | '24h';
  currency: string;
  units: 'metric' | 'imperial';
  autoSave: boolean;
  confirmBeforeExit: boolean;
  showTooltips: boolean;
  enableAnimations: boolean;
  soundEnabled: boolean;
  notificationsEnabled: boolean;
}

export interface ThemeSettings extends BaseSettings {
  activeTheme: 'light' | 'dark' | 'auto';
  customThemes: CustomTheme[];
  fontSize: 'small' | 'medium' | 'large' | 'extra-large';
  fontFamily: string;
  uiScale: number;
  colorBlindnessMode: 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia';
  highContrast: boolean;
  reduceMotion: boolean;
  compactMode: boolean;
  sidebarWidth: number;
  showStatusBar: boolean;
  showLineNumbers: boolean;
  wordWrap: boolean;
}

export interface CustomTheme {
  id: string;
  name: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    success: string;
    warning: string;
    error: string;
    info: string;
  };
  fonts: {
    primary: string;
    monospace: string;
    sizes: {
      xs: string;
      sm: string;
      md: string;
      lg: string;
      xl: string;
    };
  };
}

export interface ModelSettings extends BaseSettings {
  defaultModel: string;
  modelConfigurations: Record<string, ModelConfiguration>;
  chatSettings: {
    temperature: number;
    maxTokens: number;
    topP: number;
    topK: number;
    frequencyPenalty: number;
    presencePenalty: number;
    stopSequences: string[];
    streamingEnabled: boolean;
  };
  codeSettings: {
    model: string;
    temperature: number;
    maxTokens: number;
    contextWindow: number;
    enableCodeCompletion: boolean;
    enableRefactoring: boolean;
    enableDocGeneration: boolean;
  };
  imageSettings: {
    model: string;
    quality: 'low' | 'medium' | 'high';
    size: string;
    style: string;
  };
}

export interface ModelConfiguration {
  id: string;
  name: string;
  provider: string;
  endpoint?: string;
  apiKey?: string;
  parameters: {
    temperature: number;
    maxTokens: number;
    topP: number;
    topK: number;
    frequencyPenalty: number;
    presencePenalty: number;
    stopSequences: string[];
  };
  enabled: boolean;
  custom: boolean;
}

export interface PrivacySettings extends BaseSettings {
  dataCollection: {
    analytics: boolean;
    crashReporting: boolean;
    usageStatistics: boolean;
    performanceMetrics: boolean;
  };
  storage: {
    localStorageEnabled: boolean;
    sessionStorageEnabled: boolean;
    indexedDBEnabled: boolean;
    cookiesEnabled: boolean;
    maxStorageSize: number; // in MB
    autoCleanup: boolean;
    retentionPeriod: number; // in days
  };
  network: {
    allowExternalRequests: boolean;
    allowedDomains: string[];
    blockedDomains: string[];
    proxySettings: {
      enabled: boolean;
      host: string;
      port: number;
      username?: string;
      password?: string;
    };
  };
  content: {
    blockTrackers: boolean;
    blockAds: boolean;
    blockScripts: boolean;
    allowedScriptDomains: string[];
    sanitizeInput: boolean;
    logSensitiveData: boolean;
  };
  encryption: {
    encryptSettings: boolean;
    encryptConversations: boolean;
    encryptFiles: boolean;
    encryptionKey?: string;
    algorithm: 'aes-256-gcm' | 'aes-256-cbc';
  };
}

export interface SystemSettings extends BaseSettings {
  hardware: {
    cpuCores: number;
    totalMemory: number;
    gpuInfo: {
      vendor: string;
      model: string;
      memory: number;
    }[];
    platform: string;
    architecture: string;
  };
  performance: {
    maxWorkerThreads: number;
    memoryLimit: number; // in MB
    gcSettings: {
      enabled: boolean;
      threshold: number;
      frequency: number;
    };
    caching: {
      enabled: boolean;
      maxSize: number; // in MB
      ttl: number; // in seconds
    };
    preloading: {
      enabled: boolean;
      aggressiveness: 'low' | 'medium' | 'high';
    };
  };
  development: {
    debugMode: boolean;
    verboseLogging: boolean;
    enableProfiling: boolean;
    hotReload: boolean;
    sourceMaps: boolean;
    devTools: boolean;
  };
  updates: {
    autoCheck: boolean;
    autoDownload: boolean;
    autoInstall: boolean;
    channel: 'stable' | 'beta' | 'nightly';
    checkInterval: number; // in hours
  };
}

export interface LocalSettingsConfig {
  userPreferences: UserPreferences;
  themeSettings: ThemeSettings;
  modelSettings: ModelSettings;
  privacySettings: PrivacySettings;
  systemSettings: SystemSettings;
}

export interface SettingsBackup {
  version: string;
  timestamp: Date;
  settings: LocalSettingsConfig;
  metadata: {
    platform: string;
    appVersion: string;
    backupType: 'manual' | 'automatic';
    description?: string;
  };
}

export interface SettingsValidationError {
  path: string;
  message: string;
  code: string;
  value: any;
}

export interface SettingsContext {
  settings: LocalSettingsConfig;
  loading: boolean;
  error: string | null;
  updateSettings: <K extends keyof LocalSettingsConfig>(
    category: K,
    updates: Partial<LocalSettingsConfig[K]>
  ) => Promise<void>;
  resetSettings: (category?: keyof LocalSettingsConfig) => Promise<void>;
  exportSettings: () => Promise<SettingsBackup>;
  importSettings: (backup: SettingsBackup) => Promise<void>;
  validateSettings: (settings: Partial<LocalSettingsConfig>) => SettingsValidationError[];
}

export type SettingsCategory = keyof LocalSettingsConfig;
export type SettingsCategoryConfig<T extends SettingsCategory> = LocalSettingsConfig[T];