/**
 * BEAR AI Plugin API Provider
 * Provides secure, sandboxed APIs for plugins to interact with the host application
 */

import { EventEmitter } from 'events';
import {
  PluginInstance,
  PluginManifest,
  PluginAPI,
  PluginStorageAPI,
  PluginUIAPI,
  PluginEventAPI,
  PluginUtilsAPI,
  BearAIAPI,
  PluginConfigSchema,
  ValidationResult,
  ModelInfo,
  ChatOptions,
  ChatResponse,
  AnalysisResult,
  AppContext,
  ModalOptions,
  MenuItem,
  ToolbarButton,
  PanelConfig
} from '../core/types';

export class PluginAPIProvider extends EventEmitter {
  private pluginAPIs: Map<string, PluginAPI> = new Map();
  private storageInstances: Map<string, PluginStorageAPI> = new Map();
  private uiInstances: Map<string, PluginUIAPI> = new Map();
  private eventInstances: Map<string, PluginEventAPI> = new Map();
  private utilsInstance: PluginUtilsAPI | null = null;
  private bearAIInstance: BearAIAPI | null = null;
  private initialized: boolean = false;

  constructor() {
    super();
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Initialize core API instances
      this.utilsInstance = this.createUtilsAPI();
      this.bearAIInstance = this.createBearAIAPI();
      
      this.initialized = true;
      this.emit('initialized');
    } catch (error) {
      this.emit('error', { type: 'initialization', error });
      throw error;
    }
  }

  /**
   * Create API instance for a plugin
   */
  createAPI(manifest: PluginManifest): PluginAPI {
    const pluginId = manifest.id;
    
    try {
      const api: PluginAPI = {
        storage: this.createStorageAPI(pluginId, manifest.permissions),
        ui: this.createUIAPI(pluginId, manifest.permissions),
        events: this.createEventAPI(pluginId),
        utils: this.utilsInstance!,
        bear: this.bearAIInstance!
      };
      
      // Store API reference
      this.pluginAPIs.set(pluginId, api);
      
      this.emit('api:created', { pluginId, api });
      return api;
    } catch (error) {
      this.emit('error', { type: 'api_creation', pluginId, error });
      throw error;
    }
  }

  /**
   * Initialize API for a plugin instance
   */
  async initializeAPI(plugin: PluginInstance): Promise<void> {
    const api = this.pluginAPIs.get(plugin.id);
    if (!api) {
      throw new Error(`No API found for plugin ${plugin.id}`);
    }

    try {
      // Initialize storage namespace
      await this.initializePluginStorage(plugin.id);
      
      // Setup event handlers
      this.setupPluginEventHandlers(plugin);
      
      this.emit('api:initialized', { pluginId: plugin.id });
    } catch (error) {
      this.emit('error', { type: 'api_initialization', pluginId: plugin.id, error });
      throw error;
    }
  }

  /**
   * Cleanup API for a plugin
   */
  async cleanupAPI(plugin: PluginInstance): Promise<void> {
    const pluginId = plugin.id;
    
    try {
      // Cleanup UI elements
      await this.cleanupPluginUI(pluginId);
      
      // Remove event listeners
      this.cleanupPluginEventHandlers(plugin);
      
      // Remove storage instance
      this.storageInstances.delete(pluginId);
      this.uiInstances.delete(pluginId);
      this.eventInstances.delete(pluginId);
      
      // Remove API reference
      this.pluginAPIs.delete(pluginId);
      
      this.emit('api:cleaned', { pluginId });
    } catch (error) {
      this.emit('error', { type: 'api_cleanup', pluginId, error });
      throw error;
    }
  }

  /**
   * Validate plugin configuration
   */
  validateConfig(config: any, schema: PluginConfigSchema): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      for (const [key, fieldSchema] of Object.entries(schema)) {
        const value = config[key];
        
        // Check required fields
        if (fieldSchema.required && (value === undefined || value === null)) {
          errors.push(`Field '${key}' is required`);
          continue;
        }
        
        if (value === undefined || value === null) continue;
        
        // Type validation
        switch (fieldSchema.type) {
          case 'string':
            if (typeof value !== 'string') {
              errors.push(`Field '${key}' must be a string`);
            } else {
              // String validations
              if (fieldSchema.validation?.minLength && value.length < fieldSchema.validation.minLength) {
                errors.push(`Field '${key}' must be at least ${fieldSchema.validation.minLength} characters`);
              }
              if (fieldSchema.validation?.maxLength && value.length > fieldSchema.validation.maxLength) {
                errors.push(`Field '${key}' must be at most ${fieldSchema.validation.maxLength} characters`);
              }
              if (fieldSchema.validation?.pattern && !new RegExp(fieldSchema.validation.pattern).test(value)) {
                errors.push(`Field '${key}' does not match required pattern`);
              }
            }
            break;
            
          case 'number':
            if (typeof value !== 'number' || isNaN(value)) {
              errors.push(`Field '${key}' must be a valid number`);
            } else {
              if (fieldSchema.validation?.min !== undefined && value < fieldSchema.validation.min) {
                errors.push(`Field '${key}' must be at least ${fieldSchema.validation.min}`);
              }
              if (fieldSchema.validation?.max !== undefined && value > fieldSchema.validation.max) {
                errors.push(`Field '${key}' must be at most ${fieldSchema.validation.max}`);
              }
            }
            break;
            
          case 'boolean':
            if (typeof value !== 'boolean') {
              errors.push(`Field '${key}' must be a boolean`);
            }
            break;
            
          case 'select':
            if (fieldSchema.options && !fieldSchema.options.some(opt => opt.value === value)) {
              errors.push(`Field '${key}' must be one of the allowed options`);
            }
            break;
            
          case 'multiselect':
            if (!Array.isArray(value)) {
              errors.push(`Field '${key}' must be an array`);
            } else if (fieldSchema.options) {
              for (const item of value) {
                if (!fieldSchema.options.some(opt => opt.value === item)) {
                  errors.push(`Field '${key}' contains invalid option: ${item}`);
                }
              }
            }
            break;
            
          case 'json':
            try {
              if (typeof value === 'string') {
                JSON.parse(value);
              } else if (typeof value !== 'object') {
                errors.push(`Field '${key}' must be valid JSON`);
              }
            } catch (e) {
              errors.push(`Field '${key}' must be valid JSON`);
            }
            break;
        }
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings
      };
    } catch (error) {
      return {
        valid: false,
        errors: ['Configuration validation failed: ' + error.message]
      };
    }
  }

  /**
   * Shutdown API provider
   */
  async shutdown(): Promise<void> {
    // Cleanup all plugin APIs
    for (const pluginId of this.pluginAPIs.keys()) {
      try {
        await this.cleanupPluginUI(pluginId);
      } catch (error) {
        console.warn(`Error cleaning up plugin ${pluginId}:`, error);
      }
    }

    this.pluginAPIs.clear();
    this.storageInstances.clear();
    this.uiInstances.clear();
    this.eventInstances.clear();
    
    this.initialized = false;
    this.emit('shutdown');
  }

  private createStorageAPI(pluginId: string, permissions: any[]): PluginStorageAPI {
    const hasStoragePermission = permissions.some(p => p.type === 'storage');
    if (!hasStoragePermission) {
      throw new Error(`Plugin ${pluginId} does not have storage permission`);
    }

    const storageAPI: PluginStorageAPI = {
      async get(key: string): Promise<any> {
        try {
          const fullKey = `plugin_${pluginId}_${key}`;
          const value = localStorage.getItem(fullKey);
          return value ? JSON.parse(value) : null;
        } catch (error) {
          throw new Error(`Storage get error: ${error.message}`);
        }
      },

      async set(key: string, value: any): Promise<void> {
        try {
          const fullKey = `plugin_${pluginId}_${key}`;
          localStorage.setItem(fullKey, JSON.stringify(value));
        } catch (error) {
          throw new Error(`Storage set error: ${error.message}`);
        }
      },

      async remove(key: string): Promise<void> {
        try {
          const fullKey = `plugin_${pluginId}_${key}`;
          localStorage.removeItem(fullKey);
        } catch (error) {
          throw new Error(`Storage remove error: ${error.message}`);
        }
      },

      async clear(): Promise<void> {
        try {
          const prefix = `plugin_${pluginId}_`;
          const keysToRemove: string[] = [];
          
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(prefix)) {
              keysToRemove.push(key);
            }
          }
          
          keysToRemove.forEach(key => localStorage.removeItem(key));
        } catch (error) {
          throw new Error(`Storage clear error: ${error.message}`);
        }
      },

      async keys(): Promise<string[]> {
        try {
          const prefix = `plugin_${pluginId}_`;
          const pluginKeys: string[] = [];
          
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(prefix)) {
              pluginKeys.push(key.substring(prefix.length));
            }
          }
          
          return pluginKeys;
        } catch (error) {
          throw new Error(`Storage keys error: ${error.message}`);
        }
      }
    };

    this.storageInstances.set(pluginId, storageAPI);
    return storageAPI;
  }

  private createUIAPI(pluginId: string, permissions: any[]): PluginUIAPI {
    const hasUIPermission = permissions.some(p => p.type === 'ui');
    if (!hasUIPermission) {
      // Return no-op UI API for plugins without UI permissions
      return this.createNoOpUIAPI();
    }

    const uiAPI: PluginUIAPI = {
      showNotification: (message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
        this.emit('ui:notification', { pluginId, message, type });
      },

      showModal: (content: string | HTMLElement, options?: ModalOptions): Promise<any> => {
        return new Promise((resolve) => {
          const modalId = `modal_${pluginId}_${Date.now()}`;
          this.emit('ui:modal', { pluginId, modalId, content, options, resolve });
        });
      },

      addMenuItem: (menu: string, item: MenuItem) => {
        this.emit('ui:menu_item_add', { pluginId, menu, item });
      },

      removeMenuItem: (menu: string, itemId: string) => {
        this.emit('ui:menu_item_remove', { pluginId, menu, itemId });
      },

      addToolbarButton: (button: ToolbarButton) => {
        this.emit('ui:toolbar_button_add', { pluginId, button });
      },

      removeToolbarButton: (buttonId: string) => {
        this.emit('ui:toolbar_button_remove', { pluginId, buttonId });
      },

      createPanel: (panel: PanelConfig): string => {
        const panelId = `panel_${pluginId}_${Date.now()}`;
        this.emit('ui:panel_create', { pluginId, panelId, panel });
        return panelId;
      },

      updatePanel: (panelId: string, content: string | HTMLElement) => {
        this.emit('ui:panel_update', { pluginId, panelId, content });
      },

      removePanel: (panelId: string) => {
        this.emit('ui:panel_remove', { pluginId, panelId });
      }
    };

    this.uiInstances.set(pluginId, uiAPI);
    return uiAPI;
  }

  private createEventAPI(pluginId: string): PluginEventAPI {
    const eventAPI: PluginEventAPI = {
      on: (event: string, handler: Function) => {
        this.on(`plugin:${pluginId}:${event}`, handler);
      },

      off: (event: string, handler: Function) => {
        this.off(`plugin:${pluginId}:${event}`, handler);
      },

      emit: (event: string, data?: any) => {
        this.emit(`plugin:${pluginId}:${event}`, data);
        this.emit('plugin:event', { pluginId, event, data });
      },

      once: (event: string, handler: Function) => {
        this.once(`plugin:${pluginId}:${event}`, handler);
      }
    };

    this.eventInstances.set(pluginId, eventAPI);
    return eventAPI;
  }

  private createUtilsAPI(): PluginUtilsAPI {
    return {
      crypto: {
        async hash(data: string): Promise<string> {
          const encoder = new TextEncoder();
          const dataBuffer = encoder.encode(data);
          const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        },

        async encrypt(data: string, key: string): Promise<string> {
          // Simple encryption implementation
          const encoder = new TextEncoder();
          const keyBuffer = encoder.encode(key.padEnd(32, '0').slice(0, 32));
          const dataBuffer = encoder.encode(data);
          
          const cryptoKey = await crypto.subtle.importKey(
            'raw',
            keyBuffer,
            { name: 'AES-GCM' },
            false,
            ['encrypt']
          );
          
          const iv = crypto.getRandomValues(new Uint8Array(12));
          const encrypted = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv },
            cryptoKey,
            dataBuffer
          );
          
          const result = new Uint8Array(iv.length + encrypted.byteLength);
          result.set(iv);
          result.set(new Uint8Array(encrypted), iv.length);
          
          return btoa(String.fromCharCode(...result));
        },

        async decrypt(encryptedData: string, key: string): Promise<string> {
          const encoder = new TextEncoder();
          const decoder = new TextDecoder();
          const keyBuffer = encoder.encode(key.padEnd(32, '0').slice(0, 32));
          
          const encryptedBuffer = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
          const iv = encryptedBuffer.slice(0, 12);
          const data = encryptedBuffer.slice(12);
          
          const cryptoKey = await crypto.subtle.importKey(
            'raw',
            keyBuffer,
            { name: 'AES-GCM' },
            false,
            ['decrypt']
          );
          
          const decrypted = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv },
            cryptoKey,
            data
          );
          
          return decoder.decode(decrypted);
        }
      },

      http: {
        get: (url: string, options?) => this.makeSecureRequest('GET', url, null, options),
        post: (url: string, data: any, options?) => this.makeSecureRequest('POST', url, data, options),
        put: (url: string, data: any, options?) => this.makeSecureRequest('PUT', url, data, options),
        delete: (url: string, options?) => this.makeSecureRequest('DELETE', url, null, options)
      },

      validation: {
        validateConfig: (config: any, schema: PluginConfigSchema): ValidationResult => {
          return this.validateConfig(config, schema);
        },

        sanitizeHTML: (html: string): string => {
          const div = document.createElement('div');
          div.textContent = html;
          return div.innerHTML;
        },

        escapeSQL: (query: string): string => {
          return query.replace(/'/g, "''");
        }
      }
    };
  }

  private createBearAIAPI(): BearAIAPI {
    return {
      version: '1.0.0',

      async getModels(): Promise<ModelInfo[]> {
        // Mock implementation - would connect to actual BEAR AI models
        return [
          {
            id: 'bear-ai-v1',
            name: 'BEAR AI v1',
            type: 'language',
            capabilities: ['chat', 'completion', 'analysis']
          }
        ];
      },

      async chat(message: string, options?: ChatOptions): Promise<ChatResponse> {
        // Mock implementation
        return {
          message: 'Mock response to: ' + message,
          tokens: message.length,
          model: options?.model || 'bear-ai-v1',
          timestamp: new Date()
        };
      },

      async analyze(data: any, type: 'text' | 'image' | 'data'): Promise<AnalysisResult> {
        // Mock implementation
        return {
          type,
          confidence: 0.85,
          results: { analyzed: true, data },
          metadata: { timestamp: new Date().toISOString() }
        };
      },

      async getContext(): Promise<AppContext> {
        return {
          user: null,
          settings: {},
          activeModels: await this.getModels(),
          memory: []
        };
      },

      async executeCommand(command: string, args?: any[]): Promise<any> {
        this.emit('command:execute', { command, args });
        return { success: true, command, args };
      }
    };
  }

  private createNoOpUIAPI(): PluginUIAPI {
    const noOp = () => {};
    return {
      showNotification: noOp,
      showModal: () => Promise.resolve(null),
      addMenuItem: noOp,
      removeMenuItem: noOp,
      addToolbarButton: noOp,
      removeToolbarButton: noOp,
      createPanel: () => '',
      updatePanel: noOp,
      removePanel: noOp
    };
  }

  private async makeSecureRequest(method: string, url: string, data?: any, options?: any): Promise<Response> {
    // Validate URL
    try {
      const urlObj = new URL(url);
      const allowedProtocols = ['http:', 'https:'];
      
      if (!allowedProtocols.includes(urlObj.protocol)) {
        throw new Error('Invalid protocol');
      }
      
      // Make request with security constraints
      const requestOptions: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers
        },
        credentials: options?.credentials || 'omit',
        ...(data && { body: JSON.stringify(data) })
      };
      
      return await fetch(url, requestOptions);
    } catch (error) {
      throw new Error(`HTTP request failed: ${error.message}`);
    }
  }

  private async initializePluginStorage(pluginId: string): Promise<void> {
    // Create storage namespace if needed
    const namespaceKey = `plugin_${pluginId}_initialized`;
    if (!localStorage.getItem(namespaceKey)) {
      localStorage.setItem(namespaceKey, 'true');
    }
  }

  private setupPluginEventHandlers(plugin: PluginInstance): void {
    // Setup global event handlers for the plugin
  }

  private cleanupPluginEventHandlers(plugin: PluginInstance): void {
    // Remove all event listeners for the plugin
    this.removeAllListeners(`plugin:${plugin.id}:`);
  }

  private async cleanupPluginUI(pluginId: string): Promise<void> {
    // Emit cleanup events for UI elements
    this.emit('ui:cleanup', { pluginId });
  }
}