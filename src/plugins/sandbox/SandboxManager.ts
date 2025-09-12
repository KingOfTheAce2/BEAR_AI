/**
 * BEAR AI Plugin Sandbox Manager
 * Manages secure execution environments for plugins
 */

import { EventEmitter } from 'events';
import {
  PluginInstance,
  PluginManifest,
  PluginSandbox,
  PluginPermission,
  SecurityViolation
} from '../core/types';
import { WebWorkerSandbox } from './WebWorkerSandbox';
import { IFrameSandbox } from './IFrameSandbox';
import { IsolatedSandbox } from './IsolatedSandbox';

export class PluginSandboxManager extends EventEmitter {
  private sandboxes: Map<string, PluginSandbox> = new Map();
  private securityPolicies: Map<string, SecurityPolicy> = new Map();
  private resourceLimits: ResourceLimits;
  private initialized: boolean = false;

  constructor() {
    super();
    this.resourceLimits = {
      memoryLimit: 50 * 1024 * 1024, // 50MB
      cpuTimeLimit: 5000, // 5 seconds
      networkRequestLimit: 100,
      storageLimit: 10 * 1024 * 1024, // 10MB
      fileSystemLimit: 5 * 1024 * 1024 // 5MB
    };
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Initialize default security policies
      this.initializeSecurityPolicies();
      
      // Setup resource monitoring
      this.setupResourceMonitoring();
      
      this.initialized = true;
      this.emit('initialized');
    } catch (error) {
      this.emit('error', { type: 'initialization', error });
      throw error;
    }
  }

  /**
   * Create a sandbox for a plugin
   */
  async createSandbox(manifest: PluginManifest): Promise<PluginSandbox> {
    try {
      const sandboxType = this.determineSandboxType(manifest);
      const permissions = this.validatePermissions(manifest.permissions);
      const securityLevel = this.determineSecurityLevel(permissions);

      let context: Worker | HTMLIFrameElement | null = null;
      let messageChannel: MessageChannel;

      switch (sandboxType) {
        case 'worker':
          const workerSandbox = new WebWorkerSandbox(manifest, permissions);
          context = await workerSandbox.create();
          messageChannel = workerSandbox.getMessageChannel();
          break;

        case 'iframe':
          const iframeSandbox = new IFrameSandbox(manifest, permissions);
          context = await iframeSandbox.create();
          messageChannel = iframeSandbox.getMessageChannel();
          break;

        case 'isolated':
          const isolatedSandbox = new IsolatedSandbox(manifest, permissions);
          context = await isolatedSandbox.create();
          messageChannel = isolatedSandbox.getMessageChannel();
          break;

        default:
          throw new Error(`Unsupported sandbox type: ${sandboxType}`);
      }

      const sandbox: PluginSandbox = {
        type: sandboxType,
        context,
        permissions,
        messageChannel,
        securityLevel
      };

      // Apply security policies
      await this.applySandboxSecurity(manifest.id, sandbox);
      
      // Store sandbox reference
      this.sandboxes.set(manifest.id, sandbox);

      this.emit('sandbox:created', { pluginId: manifest.id, sandboxType });
      return sandbox;
    } catch (error) {
      this.emit('error', { type: 'sandbox_creation', pluginId: manifest.id, error });
      throw error;
    }
  }

  /**
   * Load a plugin into its sandbox
   */
  async loadPlugin(plugin: PluginInstance): Promise<void> {
    const sandbox = this.sandboxes.get(plugin.id);
    if (!sandbox) {
      throw new Error(`No sandbox found for plugin ${plugin.id}`);
    }

    try {
      // Load plugin code into sandbox
      const pluginCode = await this.getPluginCode(plugin);
      const sandboxAPI = this.createSandboxAPI(plugin);

      // Send initialization message
      const initMessage = {
        type: 'init',
        pluginId: plugin.id,
        config: plugin.config,
        api: sandboxAPI,
        code: pluginCode,
        permissions: sandbox.permissions
      };

      await this.sendMessage(plugin, initMessage);

      // Setup message handlers
      this.setupSandboxMessageHandlers(plugin, sandbox);

      this.emit('plugin:loaded', { pluginId: plugin.id });
    } catch (error) {
      this.emit('error', { type: 'plugin_load', pluginId: plugin.id, error });
      throw error;
    }
  }

  /**
   * Unload a plugin from its sandbox
   */
  async unloadPlugin(plugin: PluginInstance): Promise<void> {
    try {
      await this.sendMessage(plugin, { type: 'unload' });
      
      // Cleanup message handlers
      this.cleanupSandboxMessageHandlers(plugin);
      
      this.emit('plugin:unloaded', { pluginId: plugin.id });
    } catch (error) {
      this.emit('error', { type: 'plugin_unload', pluginId: plugin.id, error });
      throw error;
    }
  }

  /**
   * Send message to plugin sandbox
   */
  async sendMessage(plugin: PluginInstance, message: any): Promise<any> {
    const sandbox = this.sandboxes.get(plugin.id);
    if (!sandbox) {
      throw new Error(`No sandbox found for plugin ${plugin.id}`);
    }

    return new Promise((resolve, reject) => {
      const messageId = this.generateMessageId();
      const timeoutId = setTimeout(() => {
        reject(new Error('Message timeout'));
      }, 5000);

      const responseHandler = (event: MessageEvent) => {
        if (event.data.messageId === messageId) {
          clearTimeout(timeoutId);
          sandbox.messageChannel.port1.removeEventListener('message', responseHandler);
          
          if (event.data.error) {
            reject(new Error(event.data.error));
          } else {
            resolve(event.data.result);
          }
        }
      };

      sandbox.messageChannel.port1.addEventListener('message', responseHandler);
      sandbox.messageChannel.port2.postMessage({ ...message, messageId });
    });
  }

  /**
   * Destroy a sandbox
   */
  async destroySandbox(sandbox: PluginSandbox): Promise<void> {
    try {
      switch (sandbox.type) {
        case 'worker':
          if (sandbox.context instanceof Worker) {
            sandbox.context.terminate();
          }
          break;

        case 'iframe':
          if (sandbox.context instanceof HTMLIFrameElement) {
            sandbox.context.remove();
          }
          break;

        case 'isolated':
          // Cleanup isolated environment
          break;
      }

      // Close message channels
      sandbox.messageChannel.port1.close();
      sandbox.messageChannel.port2.close();

      this.emit('sandbox:destroyed');
    } catch (error) {
      this.emit('error', { type: 'sandbox_destruction', error });
      throw error;
    }
  }

  /**
   * Monitor resource usage
   */
  getResourceUsage(pluginId: string): ResourceUsage | null {
    const sandbox = this.sandboxes.get(pluginId);
    if (!sandbox) return null;

    // Implementation would depend on sandbox type
    return {
      memory: 0,
      cpu: 0,
      network: 0,
      storage: 0,
      fileSystem: 0
    };
  }

  /**
   * Shutdown sandbox manager
   */
  async shutdown(): Promise<void> {
    for (const [pluginId, sandbox] of this.sandboxes.entries()) {
      await this.destroySandbox(sandbox);
      this.sandboxes.delete(pluginId);
    }
    
    this.initialized = false;
    this.emit('shutdown');
  }

  private determineSandboxType(manifest: PluginManifest): 'worker' | 'iframe' | 'isolated' {
    if (manifest.sandboxType) {
      return manifest.sandboxType;
    }

    // Auto-determine based on permissions and plugin type
    const hasUIPermissions = manifest.permissions.some(p => p.type === 'ui');
    const hasNetworkPermissions = manifest.permissions.some(p => p.type === 'network');
    
    if (hasUIPermissions) {
      return 'iframe'; // UI plugins need DOM access
    } else if (hasNetworkPermissions) {
      return 'worker'; // Network plugins can use workers
    } else {
      return 'isolated'; // Safe plugins can use isolated environment
    }
  }

  private validatePermissions(permissions: PluginPermission[]): PluginPermission[] {
    const validPermissions = [];
    
    for (const permission of permissions) {
      // Validate permission structure
      if (this.isValidPermission(permission)) {
        validPermissions.push(permission);
      } else {
        this.emit('error', {
          type: 'invalid_permission',
          permission
        });
      }
    }
    
    return validPermissions;
  }

  private isValidPermission(permission: PluginPermission): boolean {
    const validTypes = ['storage', 'network', 'filesystem', 'ui', 'api', 'system'];
    return validTypes.includes(permission.type) && 
           typeof permission.scope === 'string' &&
           typeof permission.description === 'string';
  }

  private determineSecurityLevel(permissions: PluginPermission[]): 'strict' | 'moderate' | 'relaxed' {
    const hasSystemAccess = permissions.some(p => p.type === 'system');
    const hasNetworkAccess = permissions.some(p => p.type === 'network');
    const hasFileSystemAccess = permissions.some(p => p.type === 'filesystem');

    if (hasSystemAccess || hasFileSystemAccess) {
      return 'strict';
    } else if (hasNetworkAccess) {
      return 'moderate';
    } else {
      return 'relaxed';
    }
  }

  private initializeSecurityPolicies(): void {
    this.securityPolicies.set('default', {
      allowedOrigins: ['self'],
      blockedAPIs: ['eval', 'Function'],
      maxExecutionTime: 5000,
      maxMemoryUsage: 50 * 1024 * 1024,
      allowedNetworkHosts: []
    });

    this.securityPolicies.set('strict', {
      allowedOrigins: ['self'],
      blockedAPIs: ['eval', 'Function', 'setTimeout', 'setInterval'],
      maxExecutionTime: 1000,
      maxMemoryUsage: 10 * 1024 * 1024,
      allowedNetworkHosts: []
    });
  }

  private setupResourceMonitoring(): void {
    setInterval(() => {
      for (const [pluginId] of this.sandboxes.entries()) {
        const usage = this.getResourceUsage(pluginId);
        if (usage) {
          this.checkResourceLimits(pluginId, usage);
        }
      }
    }, 1000); // Check every second
  }

  private checkResourceLimits(pluginId: string, usage: ResourceUsage): void {
    const violations: string[] = [];

    if (usage.memory > this.resourceLimits.memoryLimit) {
      violations.push('memory_limit_exceeded');
    }

    if (usage.network > this.resourceLimits.networkRequestLimit) {
      violations.push('network_limit_exceeded');
    }

    if (usage.storage > this.resourceLimits.storageLimit) {
      violations.push('storage_limit_exceeded');
    }

    if (violations.length > 0) {
      this.emit('resource_violation', { pluginId, violations, usage });
    }
  }

  private async applySandboxSecurity(pluginId: string, sandbox: PluginSandbox): Promise<void> {
    const policy = this.securityPolicies.get(sandbox.securityLevel) || 
                   this.securityPolicies.get('default')!;

    // Apply Content Security Policy for iframe sandboxes
    if (sandbox.type === 'iframe' && sandbox.context instanceof HTMLIFrameElement) {
      const csp = this.generateCSP(policy);
      sandbox.context.setAttribute('csp', csp);
    }
  }

  private generateCSP(policy: SecurityPolicy): string {
    const directives = [
      `default-src ${policy.allowedOrigins.join(' ')}`,
      'script-src \'self\' \'unsafe-inline\'',
      'style-src \'self\' \'unsafe-inline\'',
      'img-src \'self\' data:',
      'connect-src \'self\''
    ];

    return directives.join('; ');
  }

  private async getPluginCode(plugin: PluginInstance): Promise<string> {
    // Implementation would fetch plugin code from local storage
    return '';
  }

  private createSandboxAPI(plugin: PluginInstance): any {
    // Create restricted API object for sandbox
    return {
      pluginId: plugin.id,
      version: '1.0.0',
      permissions: plugin.sandbox.permissions.map(p => p.type)
    };
  }

  private setupSandboxMessageHandlers(plugin: PluginInstance, sandbox: PluginSandbox): void {
    const handleMessage = (event: MessageEvent) => {
      this.handleSandboxMessage(plugin.id, event.data);
    };

    sandbox.messageChannel.port1.addEventListener('message', handleMessage);
    sandbox.messageChannel.port1.start();
  }

  private cleanupSandboxMessageHandlers(plugin: PluginInstance): void {
    const sandbox = this.sandboxes.get(plugin.id);
    if (sandbox) {
      sandbox.messageChannel.port1.close();
      sandbox.messageChannel.port2.close();
    }
  }

  private handleSandboxMessage(pluginId: string, message: any): void {
    switch (message.type) {
      case 'error':
        this.emit('error', { type: 'plugin_error', pluginId, error: message.error });
        break;
      
      case 'log':
        this.emit('plugin:log', { pluginId, level: message.level, message: message.message });
        break;
      
      case 'api_call':
        this.emit('plugin:api_call', { pluginId, method: message.method, args: message.args });
        break;
      
      default:
        this.emit('plugin:message', { pluginId, message });
    }
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

interface SecurityPolicy {
  allowedOrigins: string[];
  blockedAPIs: string[];
  maxExecutionTime: number;
  maxMemoryUsage: number;
  allowedNetworkHosts: string[];
}

interface ResourceLimits {
  memoryLimit: number;
  cpuTimeLimit: number;
  networkRequestLimit: number;
  storageLimit: number;
  fileSystemLimit: number;
}

interface ResourceUsage {
  memory: number;
  cpu: number;
  network: number;
  storage: number;
  fileSystem: number;
}