/**
 * Core types for the BEAR AI Plugin System
 * Local-only plugin architecture with secure sandboxing
 */

export interface PluginMetadata {
  id: string;
  name: string;
  version: string;
  author: string;
  description: string;
  category: 'ui' | 'data' | 'integration' | 'utility' | 'ai' | 'analysis';
  tags: string[];
  permissions: PluginPermission[];
  dependencies?: string[];
  minBearVersion: string;
  icon?: string;
  screenshots?: string[];
  homepage?: string;
  repository?: string;
  license: string;
}

export interface PluginPermission {
  type: 'storage' | 'network' | 'filesystem' | 'ui' | 'api' | 'system';
  scope: string;
  description: string;
  required: boolean;
}

export interface PluginManifest extends PluginMetadata {
  entry: string;
  sandboxType: 'worker' | 'iframe' | 'isolated';
  assets?: string[];
  styles?: string[];
  config?: PluginConfigSchema;
  hooks?: PluginHook[];
}

export interface PluginConfigSchema {
  [key: string]: {
    type: 'string' | 'number' | 'boolean' | 'select' | 'multiselect' | 'json';
    label: string;
    description?: string;
    default?: any;
    options?: Array<{ value: any; label: string }>;
    required?: boolean;
    validation?: {
      pattern?: string;
      min?: number;
      max?: number;
      minLength?: number;
      maxLength?: number;
    };
  };
}

export interface PluginHook {
  event: string;
  handler: string;
  priority?: number;
}

export interface PluginInstance {
  id: string;
  metadata: PluginManifest;
  status: PluginStatus;
  sandbox: PluginSandbox;
  config: Record<string, any>;
  api: PluginAPI;
  createdAt: Date;
  lastActive: Date;
}

export type PluginStatus = 'installed' | 'enabled' | 'disabled' | 'loading' | 'error' | 'updating';

export interface PluginSandbox {
  type: 'worker' | 'iframe' | 'isolated';
  context: Worker | HTMLIFrameElement | null;
  permissions: PluginPermission[];
  messageChannel: MessageChannel;
  securityLevel: 'strict' | 'moderate' | 'relaxed';
}

export interface PluginAPI {
  // Core API methods
  storage: PluginStorageAPI;
  ui: PluginUIAPI;
  events: PluginEventAPI;
  utils: PluginUtilsAPI;
  bear: BearAIAPI;
}

export interface PluginStorageAPI {
  get(key: string): Promise<any>;
  set(key: string, value: any): Promise<void>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
  keys(): Promise<string[]>;
}

export interface PluginUIAPI {
  showNotification(message: string, type?: 'info' | 'success' | 'warning' | 'error'): void;
  showModal(content: string | HTMLElement, options?: ModalOptions): Promise<any>;
  addMenuItem(menu: string, item: MenuItem): void;
  removeMenuItem(menu: string, itemId: string): void;
  addToolbarButton(button: ToolbarButton): void;
  removeToolbarButton(buttonId: string): void;
  createPanel(panel: PanelConfig): string;
  updatePanel(panelId: string, content: string | HTMLElement): void;
  removePanel(panelId: string): void;
}

export interface PluginEventAPI {
  on(event: string, handler: Function): void;
  off(event: string, handler: Function): void;
  emit(event: string, data?: any): void;
  once(event: string, handler: Function): void;
}

export interface PluginUtilsAPI {
  crypto: {
    hash(data: string): Promise<string>;
    encrypt(data: string, key: string): Promise<string>;
    decrypt(data: string, key: string): Promise<string>;
  };
  http: {
    get(url: string, options?: RequestOptions): Promise<Response>;
    post(url: string, data: any, options?: RequestOptions): Promise<Response>;
    put(url: string, data: any, options?: RequestOptions): Promise<Response>;
    delete(url: string, options?: RequestOptions): Promise<Response>;
  };
  validation: {
    validateConfig(config: any, schema: PluginConfigSchema): ValidationResult;
    sanitizeHTML(html: string): string;
    escapeSQL(query: string): string;
  };
}

export interface BearAIAPI {
  version: string;
  getModels(): Promise<ModelInfo[]>;
  chat(message: string, options?: ChatOptions): Promise<ChatResponse>;
  analyze(data: any, type: 'text' | 'image' | 'data'): Promise<AnalysisResult>;
  getContext(): Promise<AppContext>;
  executeCommand(command: string, args?: any[]): Promise<any>;
}

export interface ModalOptions {
  title?: string;
  size?: 'small' | 'medium' | 'large' | 'fullscreen';
  closable?: boolean;
  backdrop?: boolean;
}

export interface MenuItem {
  id: string;
  label: string;
  icon?: string;
  action: () => void;
  submenu?: MenuItem[];
  separator?: boolean;
  shortcut?: string;
}

export interface ToolbarButton {
  id: string;
  label: string;
  icon: string;
  action: () => void;
  tooltip?: string;
  position?: 'left' | 'center' | 'right';
}

export interface PanelConfig {
  id: string;
  title: string;
  content: string | HTMLElement;
  position: 'sidebar' | 'bottom' | 'modal';
  resizable?: boolean;
  closable?: boolean;
}

export interface RequestOptions {
  headers?: Record<string, string>;
  timeout?: number;
  credentials?: 'include' | 'omit' | 'same-origin';
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings?: string[];
}

export interface ModelInfo {
  id: string;
  name: string;
  type: string;
  capabilities: string[];
}

export interface ChatOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export interface ChatResponse {
  message: string;
  tokens: number;
  model: string;
  timestamp: Date;
}

export interface AnalysisResult {
  type: string;
  confidence: number;
  results: any;
  metadata: Record<string, any>;
}

export interface AppContext {
  user: any;
  settings: Record<string, any>;
  activeModels: ModelInfo[];
  memory: any[];
}

export interface PluginInstallOptions {
  force?: boolean;
  skipValidation?: boolean;
  enableImmediately?: boolean;
}

export interface PluginUpdateOptions {
  autoBackup?: boolean;
  preserveConfig?: boolean;
  force?: boolean;
}

export interface SecurityViolation {
  pluginId: string;
  type: 'permission' | 'api' | 'resource' | 'behavior';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  timestamp: Date;
  blocked: boolean;
}

export interface PluginDevelopmentConfig {
  hotReload: boolean;
  debugMode: boolean;
  mockAPI: boolean;
  testData: any;
  devServer?: {
    port: number;
    host: string;
  };
}

export interface PluginPackage {
  manifest: PluginManifest;
  files: Map<string, string>;
  signature?: string;
  integrity?: string;
}

export interface LocalPluginRegistry {
  plugins: Map<string, PluginInstance>;
  categories: Map<string, string[]>;
  tags: Map<string, string[]>;
  searchIndex: Map<string, Set<string>>;
}