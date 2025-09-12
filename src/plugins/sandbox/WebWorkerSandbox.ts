/**
 * Web Worker Sandbox Implementation
 * Provides secure execution environment for plugins using Web Workers
 */

import { PluginManifest, PluginPermission } from '../core/types';

export class WebWorkerSandbox {
  private manifest: PluginManifest;
  private permissions: PluginPermission[];
  private worker: Worker | null = null;
  private messageChannel: MessageChannel;
  private workerBlob: Blob | null = null;

  constructor(manifest: PluginManifest, permissions: PluginPermission[]) {
    this.manifest = manifest;
    this.permissions = permissions;
    this.messageChannel = new MessageChannel();
  }

  /**
   * Create and initialize the Web Worker sandbox
   */
  async create(): Promise<Worker> {
    try {
      // Generate sandboxed worker code
      const workerCode = this.generateWorkerCode();
      this.workerBlob = new Blob([workerCode], { type: 'application/javascript' });
      
      // Create worker from blob URL
      const workerURL = URL.createObjectURL(this.workerBlob);
      this.worker = new Worker(workerURL);

      // Setup error handling
      this.worker.onerror = (error) => {
        this.handleWorkerError(error);
      };

      // Setup message handling
      this.worker.onmessage = (event) => {
        this.handleWorkerMessage(event);
      };

      // Transfer message port to worker
      this.worker.postMessage({
        type: 'init_port',
        port: this.messageChannel.port2
      }, [this.messageChannel.port2]);

      // Initialize security context
      await this.initializeSecurityContext();

      return this.worker;
    } catch (error) {
      throw new Error(`Failed to create Web Worker sandbox: ${error.message}`);
    }
  }

  /**
   * Get the message channel for communication
   */
  getMessageChannel(): MessageChannel {
    return this.messageChannel;
  }

  /**
   * Destroy the sandbox
   */
  destroy(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }

    if (this.workerBlob) {
      URL.revokeObjectURL(URL.createObjectURL(this.workerBlob));
      this.workerBlob = null;
    }

    this.messageChannel.port1.close();
    this.messageChannel.port2.close();
  }

  private generateWorkerCode(): string {
    const restrictedAPIs = this.getRestrictedAPIs();
    const allowedPermissions = this.permissions.map(p => p.type);

    return `
      // BEAR AI Plugin Worker Sandbox
      'use strict';
      
      // Global variables
      let pluginPort = null;
      let pluginAPI = null;
      let pluginConfig = null;
      
      // Restricted APIs - These will throw errors if accessed
      ${restrictedAPIs.map(api => `
        try {
          Object.defineProperty(self, '${api}', {
            get: function() {
              throw new Error('API ${api} is not allowed in this sandbox');
            },
            configurable: false
          });
        } catch(e) {}
      `).join('')}
      
      // Setup message port communication
      self.onmessage = function(event) {
        if (event.data.type === 'init_port') {
          pluginPort = event.data.port;
          pluginPort.onmessage = handlePluginMessage;
          pluginPort.start();
        }
      };
      
      // Handle messages from main thread
      function handlePluginMessage(event) {
        const message = event.data;
        
        try {
          switch (message.type) {
            case 'init':
              initializePlugin(message);
              break;
              
            case 'execute':
              executePluginMethod(message);
              break;
              
            case 'config_updated':
              updatePluginConfig(message.config);
              break;
              
            case 'unload':
              unloadPlugin();
              break;
              
            default:
              handleCustomMessage(message);
          }
        } catch (error) {
          sendError(message.messageId, error);
        }
      }
      
      // Initialize plugin
      function initializePlugin(message) {
        pluginConfig = message.config;
        pluginAPI = createSandboxedAPI(message.api, ${JSON.stringify(allowedPermissions)});
        
        try {
          // Execute plugin code
          const pluginFunction = new Function('api', 'config', message.code);
          const pluginInstance = pluginFunction(pluginAPI, pluginConfig);
          
          // Store plugin instance globally
          self.pluginInstance = pluginInstance;
          
          // Call plugin initialization if available
          if (pluginInstance && typeof pluginInstance.initialize === 'function') {
            pluginInstance.initialize();
          }
          
          sendResponse(message.messageId, { success: true });
        } catch (error) {
          sendError(message.messageId, error);
        }
      }
      
      // Execute plugin method
      function executePluginMethod(message) {
        try {
          if (!self.pluginInstance) {
            throw new Error('Plugin not initialized');
          }
          
          const method = self.pluginInstance[message.method];
          if (typeof method !== 'function') {
            throw new Error('Method not found: ' + message.method);
          }
          
          const result = method.apply(self.pluginInstance, message.args || []);
          
          // Handle promises
          if (result && typeof result.then === 'function') {
            result.then(
              value => sendResponse(message.messageId, value),
              error => sendError(message.messageId, error)
            );
          } else {
            sendResponse(message.messageId, result);
          }
        } catch (error) {
          sendError(message.messageId, error);
        }
      }
      
      // Update plugin configuration
      function updatePluginConfig(newConfig) {
        pluginConfig = newConfig;
        
        if (self.pluginInstance && typeof self.pluginInstance.onConfigUpdate === 'function') {
          self.pluginInstance.onConfigUpdate(newConfig);
        }
      }
      
      // Unload plugin
      function unloadPlugin() {
        try {
          if (self.pluginInstance && typeof self.pluginInstance.destroy === 'function') {
            self.pluginInstance.destroy();
          }
          
          self.pluginInstance = null;
          pluginConfig = null;
          
          // Close worker
          self.close();
        } catch (error) {
          console.error('Error during plugin unload:', error);
        }
      }
      
      // Handle custom messages
      function handleCustomMessage(message) {
        if (self.pluginInstance && typeof self.pluginInstance.onMessage === 'function') {
          const result = self.pluginInstance.onMessage(message);
          sendResponse(message.messageId, result);
        }
      }
      
      // Create sandboxed API
      function createSandboxedAPI(baseAPI, allowedPermissions) {
        const api = {};
        
        // Storage API
        if (allowedPermissions.includes('storage')) {
          api.storage = {
            get: (key) => baseAPI.storage.get(key),
            set: (key, value) => baseAPI.storage.set(key, value),
            remove: (key) => baseAPI.storage.remove(key),
            clear: () => baseAPI.storage.clear(),
            keys: () => baseAPI.storage.keys()
          };
        }
        
        // Network API (restricted)
        if (allowedPermissions.includes('network')) {
          api.http = {
            get: (url, options) => secureHttpRequest('GET', url, null, options),
            post: (url, data, options) => secureHttpRequest('POST', url, data, options),
            put: (url, data, options) => secureHttpRequest('PUT', url, data, options),
            delete: (url, options) => secureHttpRequest('DELETE', url, null, options)
          };
        }
        
        // Events API
        api.events = {
          emit: (event, data) => {
            pluginPort.postMessage({
              type: 'event_emit',
              event: event,
              data: data
            });
          },
          on: (event, handler) => {
            // Store event handlers
            self.eventHandlers = self.eventHandlers || {};
            self.eventHandlers[event] = self.eventHandlers[event] || [];
            self.eventHandlers[event].push(handler);
          }
        };
        
        // Utilities API
        api.utils = {
          crypto: {
            hash: (data) => baseAPI.utils.crypto.hash(data)
          },
          validation: {
            validateConfig: (config, schema) => baseAPI.utils.validation.validateConfig(config, schema),
            sanitizeHTML: (html) => baseAPI.utils.validation.sanitizeHTML(html)
          }
        };
        
        // Console logging
        api.console = {
          log: (...args) => sendLog('log', args),
          warn: (...args) => sendLog('warn', args),
          error: (...args) => sendLog('error', args),
          info: (...args) => sendLog('info', args)
        };
        
        return api;
      }
      
      // Secure HTTP request handler
      function secureHttpRequest(method, url, data, options) {
        return new Promise((resolve, reject) => {
          try {
            // Validate URL
            const urlObj = new URL(url);
            const allowedProtocols = ['http:', 'https:'];
            
            if (!allowedProtocols.includes(urlObj.protocol)) {
              throw new Error('Invalid protocol: ' + urlObj.protocol);
            }
            
            // Send request through main thread
            const requestId = 'req_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            
            pluginPort.postMessage({
              type: 'http_request',
              requestId: requestId,
              method: method,
              url: url,
              data: data,
              options: options
            });
            
            // Wait for response
            const responseHandler = (event) => {
              if (event.data.type === 'http_response' && event.data.requestId === requestId) {
                pluginPort.removeEventListener('message', responseHandler);
                
                if (event.data.error) {
                  reject(new Error(event.data.error));
                } else {
                  resolve(event.data.response);
                }
              }
            };
            
            pluginPort.addEventListener('message', responseHandler);
          } catch (error) {
            reject(error);
          }
        });
      }
      
      // Send response back to main thread
      function sendResponse(messageId, result) {
        if (pluginPort) {
          pluginPort.postMessage({
            type: 'response',
            messageId: messageId,
            result: result
          });
        }
      }
      
      // Send error back to main thread
      function sendError(messageId, error) {
        if (pluginPort) {
          pluginPort.postMessage({
            type: 'response',
            messageId: messageId,
            error: error.message || error.toString()
          });
        }
      }
      
      // Send log message to main thread
      function sendLog(level, args) {
        if (pluginPort) {
          pluginPort.postMessage({
            type: 'log',
            level: level,
            message: args.map(arg => 
              typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
            ).join(' ')
          });
        }
      }
      
      // Override console to redirect to our logging
      self.console = {
        log: (...args) => sendLog('log', args),
        warn: (...args) => sendLog('warn', args),
        error: (...args) => sendLog('error', args),
        info: (...args) => sendLog('info', args),
        debug: (...args) => sendLog('debug', args)
      };
    `;
  }

  private getRestrictedAPIs(): string[] {
    const baseRestricted = ['importScripts', 'close'];
    
    // Add more restrictions based on permissions
    if (!this.hasPermission('network')) {
      baseRestricted.push('fetch', 'XMLHttpRequest');
    }
    
    if (!this.hasPermission('system')) {
      baseRestricted.push('eval', 'Function');
    }
    
    return baseRestricted;
  }

  private hasPermission(type: string): boolean {
    return this.permissions.some(p => p.type === type);
  }

  private async initializeSecurityContext(): Promise<void> {
    // Set up security policies and restrictions
    if (this.worker) {
      this.worker.postMessage({
        type: 'security_init',
        permissions: this.permissions,
        restrictions: this.getRestrictedAPIs()
      });
    }
  }

  private handleWorkerError(error: ErrorEvent): void {
    console.error('Worker error:', error);
    // Emit error to parent
  }

  private handleWorkerMessage(event: MessageEvent): void {
    // Handle messages from worker
    const { data } = event;
    
    switch (data.type) {
      case 'log':
        console.log(`[Plugin ${this.manifest.id}] ${data.level}:`, data.message);
        break;
      
      case 'error':
        console.error(`[Plugin ${this.manifest.id}] Error:`, data.error);
        break;
      
      default:
        // Forward to message channel
        this.messageChannel.port1.postMessage(data);
    }
  }
}