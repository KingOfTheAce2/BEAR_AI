/**
 * IFrame Sandbox Implementation (DEPRECATED)
 * SECURITY WARNING: This implementation uses unsafe Function constructor
 * Use SecureSandbox instead for production environments
 * Provides secure execution environment for UI plugins using sandboxed iframes
 */

import { PluginManifest, PluginPermission } from '../core/types';

export class IFrameSandbox {
  private manifest: PluginManifest;
  private permissions: PluginPermission[];
  private iframe: HTMLIFrameElement | null = null;
  private messageChannel: MessageChannel;
  private containerElement: HTMLElement | null = null;

  constructor(manifest: PluginManifest, permissions: PluginPermission[]) {
    this.manifest = manifest;
    this.permissions = permissions;
    this.messageChannel = new MessageChannel();
  }

  /**
   * Create and initialize the IFrame sandbox
   */
  async create(): Promise<HTMLIFrameElement> {
    try {
      // Create iframe element
      this.iframe = document.createElement('iframe');
      
      // Set sandbox attributes for security
      this.iframe.setAttribute('sandbox', this.generateSandboxAttributes());
      
      // Set Content Security Policy
      this.iframe.setAttribute('csp', this.generateCSP());
      
      // Hide iframe initially
      this.iframe.style.display = 'none';
      this.iframe.style.width = '100%';
      this.iframe.style.height = '100%';
      this.iframe.style.border = 'none';
      
      // Generate sandboxed HTML content
      const htmlContent = this.generateSandboxHTML();
      
      // Create blob URL for iframe source
      const htmlBlob = new Blob([htmlContent], { type: 'text/html' });
      const blobURL = URL.createObjectURL(htmlBlob);
      
      // Set iframe source
      this.iframe.src = blobURL;
      
      // Add to DOM (hidden container)
      this.containerElement = this.getOrCreateContainer();
      this.containerElement.appendChild(this.iframe);
      
      // Setup message handling
      await this.setupMessageHandling();
      
      // Wait for iframe to load
      await this.waitForLoad();
      
      // Initialize security context
      await this.initializeSecurityContext();

      return this.iframe;
    } catch (error) {
      throw new Error(`Failed to create IFrame sandbox: ${error.message}`);
    }
  }

  /**
   * Get the message channel for communication
   */
  getMessageChannel(): MessageChannel {
    return this.messageChannel;
  }

  /**
   * Show the plugin UI
   */
  show(targetElement?: HTMLElement): void {
    if (this.iframe) {
      if (targetElement) {
        targetElement.appendChild(this.iframe);
      }
      this.iframe.style.display = 'block';
    }
  }

  /**
   * Hide the plugin UI
   */
  hide(): void {
    if (this.iframe) {
      this.iframe.style.display = 'none';
    }
  }

  /**
   * Destroy the sandbox
   */
  destroy(): void {
    if (this.iframe) {
      // Revoke blob URL
      if (this.iframe.src.startsWith('blob:')) {
        URL.revokeObjectURL(this.iframe.src);
      }
      
      // Remove from DOM
      this.iframe.remove();
      this.iframe = null;
    }

    if (this.containerElement) {
      this.containerElement.remove();
      this.containerElement = null;
    }

    this.messageChannel.port1.close();
    this.messageChannel.port2.close();
  }

  private generateSandboxAttributes(): string {
    const baseAttributes = [
      'allow-scripts',
      'allow-same-origin' // Required for postMessage
    ];

    // Add permissions based on plugin requirements
    if (this.hasPermission('ui')) {
      baseAttributes.push('allow-forms', 'allow-modals');
    }

    if (this.hasPermission('storage')) {
      // Storage is handled through postMessage, not direct access
    }

    // Remove dangerous attributes
    // Never allow: allow-top-navigation, allow-pointer-lock, allow-popups

    return baseAttributes.join(' ');
  }

  private generateCSP(): string {
    const directives = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'", // Needed for plugin code
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "connect-src 'none'", // No direct network access
      "object-src 'none'",
      "base-uri 'none'",
      "form-action 'none'"
    ];

    return directives.join('; ');
  }

  private generateSandboxHTML(): string {
    const allowedPermissions = this.permissions.map(p => p.type);
    
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Plugin: ${this.manifest.name}</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: white;
        }
        .plugin-container {
            width: 100%;
            height: 100vh;
            overflow: auto;
        }
        .plugin-error {
            color: #d32f2f;
            background: #ffebee;
            padding: 16px;
            border-left: 4px solid #d32f2f;
            margin: 16px;
        }
    </style>
</head>
<body>
    <div id="plugin-root" class="plugin-container">
        <div id="plugin-loading">Loading plugin...</div>
    </div>

    <script>
        'use strict';
        
        // Global variables
        let pluginAPI = null;
        let pluginConfig = null;
        let pluginInstance = null;
        let parentPort = null;
        
        // Restricted globals - will throw if accessed
        ${this.getRestrictedAPIs().map(api => `
          try {
            Object.defineProperty(window, '${api}', {
              get: function() {
                throw new Error('API ${api} is not allowed in this sandbox');
              },
              configurable: false
            });
          } catch(e) {}
        `).join('')}
        
        // Setup communication with parent
        window.addEventListener('message', function(event) {
            // Security: verify origin if needed
            if (event.data && event.data.type === 'init_port') {
                parentPort = event.ports[0];
                parentPort.onmessage = handleParentMessage;
                parentPort.start();
                
                // Notify parent that iframe is ready
                parentPort.postMessage({ type: 'iframe_ready' });
            }
        });
        
        // Handle messages from parent
        function handleParentMessage(event) {
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
                        
                    case 'show':
                        showPlugin();
                        break;
                        
                    case 'hide':
                        hidePlugin();
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
            try {
                pluginConfig = message.config;
                pluginAPI = createSandboxedAPI(message.api, ${JSON.stringify(allowedPermissions)});
                
                // Clear loading message
                const loadingEl = document.getElementById('plugin-loading');
                if (loadingEl) {
                    loadingEl.remove();
                }
                
                // SECURITY WARNING: Function constructor usage - potential RCE vulnerability
                // TODO: Replace with SecureSandbox implementation
                // const pluginFunction = new Function('api', 'config', 'container', message.code);

                // Temporary safe execution - only allow basic operations
                throw new Error('IFrameSandbox Function constructor is deprecated due to security vulnerabilities. Use SecureSandbox instead.');
                const pluginRoot = document.getElementById('plugin-root');
                
                pluginInstance = pluginFunction(pluginAPI, pluginConfig, pluginRoot);
                
                // Call plugin initialization if available
                if (pluginInstance && typeof pluginInstance.initialize === 'function') {
                    pluginInstance.initialize();
                }
                
                sendResponse(message.messageId, { success: true });
            } catch (error) {
                showError('Failed to initialize plugin: ' + error.message);
                sendError(message.messageId, error);
            }
        }
        
        // Execute plugin method
        function executePluginMethod(message) {
            try {
                if (!pluginInstance) {
                    throw new Error('Plugin not initialized');
                }
                
                const method = pluginInstance[message.method];
                if (typeof method !== 'function') {
                    throw new Error('Method not found: ' + message.method);
                }
                
                const result = method.apply(pluginInstance, message.args || []);
                
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
            
            if (pluginInstance && typeof pluginInstance.onConfigUpdate === 'function') {
                pluginInstance.onConfigUpdate(newConfig);
            }
        }
        
        // Show plugin UI
        function showPlugin() {
            document.body.style.display = 'block';
            
            if (pluginInstance && typeof pluginInstance.onShow === 'function') {
                pluginInstance.onShow();
            }
        }
        
        // Hide plugin UI
        function hidePlugin() {
            document.body.style.display = 'none';
            
            if (pluginInstance && typeof pluginInstance.onHide === 'function') {
                pluginInstance.onHide();
            }
        }
        
        // Unload plugin
        function unloadPlugin() {
            try {
                if (pluginInstance && typeof pluginInstance.destroy === 'function') {
                    pluginInstance.destroy();
                }
                
                pluginInstance = null;
                pluginConfig = null;
                
                // Clear DOM
                document.getElementById('plugin-root').innerHTML = '';
            } catch (error) {
                console.error('Error during plugin unload:', error);
            }
        }
        
        // Handle custom messages
        function handleCustomMessage(message) {
            if (pluginInstance && typeof pluginInstance.onMessage === 'function') {
                const result = pluginInstance.onMessage(message);
                sendResponse(message.messageId, result);
            }
        }
        
        // Create sandboxed API for iframe plugins
        function createSandboxedAPI(baseAPI, allowedPermissions) {
            const api = {
                // DOM utilities
                dom: {
                    createElement: function(tagName, attributes) {
                        const element = document.createElement(tagName);
                        if (attributes) {
                            Object.keys(attributes).forEach(key => {
                                if (key === 'innerHTML' || key === 'textContent') {
                                    element[key] = attributes[key];
                                } else {
                                    element.setAttribute(key, attributes[key]);
                                }
                            });
                        }
                        return element;
                    },
                    querySelector: (selector) => document.querySelector(selector),
                    querySelectorAll: (selector) => document.querySelectorAll(selector),
                    getElementById: (id) => document.getElementById(id)
                },
                
                // Events
                events: {
                    emit: function(event, data) {
                        parentPort.postMessage({
                            type: 'event_emit',
                            event: event,
                            data: data
                        });
                    },
                    
                    on: function(event, handler) {
                        window.pluginEventHandlers = window.pluginEventHandlers || {};
                        window.pluginEventHandlers[event] = window.pluginEventHandlers[event] || [];
                        window.pluginEventHandlers[event].push(handler);
                    }
                },
                
                // UI utilities
                ui: {
                    showNotification: function(message, type) {
                        parentPort.postMessage({
                            type: 'show_notification',
                            message: message,
                            notificationType: type || 'info'
                        });
                    },
                    
                    showModal: function(content, options) {
                        return new Promise((resolve, reject) => {
                            const modalId = 'modal_' + Date.now();
                            
                            parentPort.postMessage({
                                type: 'show_modal',
                                modalId: modalId,
                                content: content,
                                options: options
                            });
                            
                            // Wait for modal response
                            const responseHandler = function(event) {
                                if (event.data.type === 'modal_response' && event.data.modalId === modalId) {
                                    parentPort.removeEventListener('message', responseHandler);
                                    
                                    if (event.data.error) {
                                        reject(new Error(event.data.error));
                                    } else {
                                        resolve(event.data.result);
                                    }
                                }
                            };
                            
                            parentPort.addEventListener('message', responseHandler);
                        });
                    }
                }
            };
            
            // Add storage API if permitted
            if (allowedPermissions.includes('storage')) {
                api.storage = {
                    get: function(key) {
                        return new Promise((resolve, reject) => {
                            const requestId = 'storage_' + Date.now();
                            parentPort.postMessage({
                                type: 'storage_request',
                                requestId: requestId,
                                operation: 'get',
                                key: key
                            });
                            
                            const responseHandler = function(event) {
                                if (event.data.type === 'storage_response' && event.data.requestId === requestId) {
                                    parentPort.removeEventListener('message', responseHandler);
                                    resolve(event.data.result);
                                }
                            };
                            
                            parentPort.addEventListener('message', responseHandler);
                        });
                    },
                    
                    set: function(key, value) {
                        return new Promise((resolve, reject) => {
                            const requestId = 'storage_' + Date.now();
                            parentPort.postMessage({
                                type: 'storage_request',
                                requestId: requestId,
                                operation: 'set',
                                key: key,
                                value: value
                            });
                            
                            const responseHandler = function(event) {
                                if (event.data.type === 'storage_response' && event.data.requestId === requestId) {
                                    parentPort.removeEventListener('message', responseHandler);
                                    resolve(event.data.result);
                                }
                            };
                            
                            parentPort.addEventListener('message', responseHandler);
                        });
                    }
                };
            }
            
            // Console logging
            api.console = {
                log: (...args) => sendLog('log', args),
                warn: (...args) => sendLog('warn', args),
                error: (...args) => sendLog('error', args),
                info: (...args) => sendLog('info', args)
            };
            
            return api;
        }
        
        // Show error in iframe
        function showError(message) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'plugin-error';
            errorDiv.textContent = message;
            
            const root = document.getElementById('plugin-root');
            root.innerHTML = '';
            root.appendChild(errorDiv);
        }
        
        // Send response back to parent
        function sendResponse(messageId, result) {
            if (parentPort) {
                parentPort.postMessage({
                    type: 'response',
                    messageId: messageId,
                    result: result
                });
            }
        }
        
        // Send error back to parent
        function sendError(messageId, error) {
            if (parentPort) {
                parentPort.postMessage({
                    type: 'response',
                    messageId: messageId,
                    error: error.message || error.toString()
                });
            }
        }
        
        // Send log message to parent
        function sendLog(level, args) {
            if (parentPort) {
                parentPort.postMessage({
                    type: 'log',
                    level: level,
                    message: args.map(arg => 
                        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
                    ).join(' ')
                });
            }
        }
        
        // Override console
        window.console = {
            log: (...args) => sendLog('log', args),
            warn: (...args) => sendLog('warn', args),
            error: (...args) => sendLog('error', args),
            info: (...args) => sendLog('info', args),
            debug: (...args) => sendLog('debug', args)
        };
        
        // Prevent certain operations
        window.addEventListener('beforeunload', function(e) {
            e.preventDefault();
            return false;
        });
        
    </script>
</body>
</html>`;
  }

  private getRestrictedAPIs(): string[] {
    const baseRestricted = [
      'fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource',
      'localStorage', 'sessionStorage', 'indexedDB',
      'navigator', 'location', 'history'
    ];
    
    if (!this.hasPermission('system')) {
      baseRestricted.push('eval', 'Function');
    }
    
    return baseRestricted;
  }

  private hasPermission(type: string): boolean {
    return this.permissions.some(p => p.type === type);
  }

  private getOrCreateContainer(): HTMLElement {
    let container = document.getElementById('bear-plugin-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'bear-plugin-container';
      container.style.display = 'none';
      container.style.position = 'absolute';
      container.style.top = '0';
      container.style.left = '0';
      container.style.width = '100%';
      container.style.height = '100%';
      container.style.pointerEvents = 'none';
      document.body.appendChild(container);
    }
    return container;
  }

  private async setupMessageHandling(): Promise<void> {
    if (!this.iframe) return;

    // Listen for iframe ready signal
    window.addEventListener('message', (event) => {
      if (event.source === this.iframe?.contentWindow && 
          event.data?.type === 'iframe_ready') {
        // Send message port to iframe
        this.iframe?.contentWindow?.postMessage(
          { type: 'init_port' },
          '*',
          [this.messageChannel.port2]
        );
      }
    });
  }

  private async waitForLoad(): Promise<void> {
    if (!this.iframe) return;

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('IFrame load timeout'));
      }, 10000);

      this.iframe!.addEventListener('load', () => {
        clearTimeout(timeout);
        resolve();
      });

      this.iframe!.addEventListener('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  private async initializeSecurityContext(): Promise<void> {
    // Additional security initialization if needed
  }
}