/**
 * BEAR AI Plugin Manager - Core plugin system orchestrator
 * Handles plugin lifecycle, security, and coordination
 */

import { EventEmitter } from 'events';
import { PluginInstance, PluginManifest, PluginStatus, PluginInstallOptions, PluginUpdateOptions, SecurityViolation, LocalPluginRegistry, PluginPackage } from './types';
import { PluginSandboxManager } from '../sandbox/SandboxManager';
import { PluginAPIProvider } from '../api/APIProvider';
import { PluginSecurityManager } from '../security/SecurityManager';
import { PluginRegistry } from '../registry/PluginRegistry';
import { PluginConfigManager } from './ConfigManager';

// Error interfaces for typed error handling
interface SandboxError {
  type: string;
  pluginId?: string;
  error: Error | string;
  timestamp?: Date;
}

interface APIError {
  type: string;
  pluginId?: string;
  error: Error | string;
  method?: string;
}

export class PluginManager extends EventEmitter {
  private plugins: Map<string, PluginInstance> = new Map();
  private registry: PluginRegistry;
  private sandboxManager: PluginSandboxManager;
  private apiProvider: PluginAPIProvider;
  private securityManager: PluginSecurityManager;
  private configManager: PluginConfigManager;
  private initialized: boolean = false;

  constructor() {
    super();
    this.registry = new PluginRegistry();
    this.sandboxManager = new PluginSandboxManager();
    this.apiProvider = new PluginAPIProvider();
    this.securityManager = new PluginSecurityManager();
    this.configManager = new PluginConfigManager();
    
    this.setupEventHandlers();
  }

  /**
   * Initialize the plugin system
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      await this.registry.initialize();
      await this.sandboxManager.initialize();
      await this.apiProvider.initialize();
      await this.securityManager.initialize();
      await this.configManager.initialize();

      // Load installed plugins
      await this.loadInstalledPlugins();
      
      this.initialized = true;
      this.emit('initialized');
    } catch (error) {
      this.emit('error', { type: 'initialization', error });
      throw error;
    }
  }

  /**
   * Install a plugin from local package
   */
  async installPlugin(
    pluginPackage: PluginPackage,
    options: PluginInstallOptions = {}
  ): Promise<string> {
    const { manifest } = pluginPackage;
    
    try {
      // Validate plugin package
      if (!options.skipValidation) {
        await this.securityManager.validatePlugin(pluginPackage);
      }

      // Check for conflicts
      if (this.plugins.has(manifest.id) && !options.force) {
        throw new Error(`Plugin ${manifest.id} is already installed`);
      }

      // Create plugin instance
      const instance: PluginInstance = {
        id: manifest.id,
        metadata: manifest,
        status: 'installed',
        sandbox: await this.sandboxManager.createSandbox(manifest),
        config: await this.configManager.getDefaultConfig(manifest),
        api: this.apiProvider.createAPI(manifest),
        createdAt: new Date(),
        lastActive: new Date()
      };

      // Store plugin files locally
      await this.registry.storePlugin(pluginPackage);
      
      // Register plugin
      this.plugins.set(manifest.id, instance);
      await this.registry.registerPlugin(instance);

      // Enable immediately if requested
      if (options.enableImmediately) {
        await this.enablePlugin(manifest.id);
      }

      this.emit('plugin:installed', { pluginId: manifest.id, manifest });
      return manifest.id;
    } catch (error) {
      this.emit('error', { type: 'installation', pluginId: manifest.id, error });
      throw error;
    }
  }

  /**
   * Uninstall a plugin
   */
  async uninstallPlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    try {
      // Disable plugin first
      if (plugin.status === 'enabled') {
        await this.disablePlugin(pluginId);
      }

      // Cleanup sandbox
      await this.sandboxManager.destroySandbox(plugin.sandbox);

      // Remove from registry
      await this.registry.unregisterPlugin(pluginId);
      await this.registry.removePluginFiles(pluginId);

      // Remove from memory
      this.plugins.delete(pluginId);

      this.emit('plugin:uninstalled', { pluginId });
    } catch (error) {
      this.emit('error', { type: 'uninstallation', pluginId, error });
      throw error;
    }
  }

  /**
   * Enable a plugin
   */
  async enablePlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    if (plugin.status === 'enabled') return;

    try {
      plugin.status = 'loading';
      this.emit('plugin:status_changed', { pluginId, status: 'loading' });

      // Check permissions
      await this.securityManager.checkPermissions(plugin);

      // Load plugin in sandbox
      await this.sandboxManager.loadPlugin(plugin);

      // Initialize plugin API
      await this.apiProvider.initializeAPI(plugin);

      // Register plugin hooks
      await this.registerPluginHooks(plugin);

      plugin.status = 'enabled';
      plugin.lastActive = new Date();
      
      await this.registry.updatePlugin(plugin);
      this.emit('plugin:enabled', { pluginId });
      this.emit('plugin:status_changed', { pluginId, status: 'enabled' });
    } catch (error) {
      plugin.status = 'error';
      this.emit('error', { type: 'enable', pluginId, error });
      this.emit('plugin:status_changed', { pluginId, status: 'error' });
      throw error;
    }
  }

  /**
   * Disable a plugin
   */
  async disablePlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    if (plugin.status !== 'enabled') return;

    try {
      // Unregister hooks
      await this.unregisterPluginHooks(plugin);

      // Cleanup API
      await this.apiProvider.cleanupAPI(plugin);

      // Unload from sandbox
      await this.sandboxManager.unloadPlugin(plugin);

      plugin.status = 'disabled';
      
      await this.registry.updatePlugin(plugin);
      this.emit('plugin:disabled', { pluginId });
      this.emit('plugin:status_changed', { pluginId, status: 'disabled' });
    } catch (error) {
      this.emit('error', { type: 'disable', pluginId, error });
      throw error;
    }
  }

  /**
   * Update a plugin
   */
  async updatePlugin(
    pluginId: string,
    newPackage: PluginPackage,
    options: PluginUpdateOptions = {}
  ): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    try {
      // Backup current version if requested
      if (options.autoBackup) {
        await this.registry.backupPlugin(pluginId);
      }

      const wasEnabled = plugin.status === 'enabled';
      
      // Disable plugin temporarily
      if (wasEnabled) {
        await this.disablePlugin(pluginId);
      }

      // Store new version
      await this.registry.storePlugin(newPackage);

      // Update plugin instance
      plugin.metadata = newPackage.manifest;
      if (!options.preserveConfig) {
        plugin.config = await this.configManager.getDefaultConfig(newPackage.manifest);
      }

      // Re-enable if it was enabled
      if (wasEnabled) {
        await this.enablePlugin(pluginId);
      }

      this.emit('plugin:updated', { pluginId, newVersion: newPackage.manifest.version });
    } catch (error) {
      this.emit('error', { type: 'update', pluginId, error });
      throw error;
    }
  }

  /**
   * Get plugin by ID
   */
  getPlugin(pluginId: string): PluginInstance | undefined {
    return this.plugins.get(pluginId);
  }

  /**
   * Get all plugins
   */
  getAllPlugins(): PluginInstance[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Get plugins by status
   */
  getPluginsByStatus(status: PluginStatus): PluginInstance[] {
    return this.getAllPlugins().filter(plugin => plugin.status === status);
  }

  /**
   * Get plugins by category
   */
  getPluginsByCategory(category: string): PluginInstance[] {
    return this.getAllPlugins().filter(plugin => plugin.metadata.category === category);
  }

  /**
   * Search plugins
   */
  searchPlugins(query: string): PluginInstance[] {
    return this.registry.searchPlugins(query);
  }

  /**
   * Update plugin configuration
   */
  async updatePluginConfig(pluginId: string, config: Record<string, unknown>): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    try {
      // Validate configuration
      if (plugin.metadata.config) {
        const validation = this.apiProvider.validateConfig(config, plugin.metadata.config);
        if (!validation.valid) {
          throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
        }
      }

      plugin.config = config;
      await this.registry.updatePlugin(plugin);

      // Notify plugin of config change
      if (plugin.status === 'enabled') {
        await this.sandboxManager.sendMessage(plugin, {
          type: 'config_updated',
          config
        });
      }

      this.emit('plugin:config_updated', { pluginId, config });
    } catch (error) {
      this.emit('error', { type: 'config_update', pluginId, error });
      throw error;
    }
  }

  /**
   * Get security violations
   */
  getSecurityViolations(pluginId?: string): SecurityViolation[] {
    return this.securityManager.getViolations(pluginId);
  }

  /**
   * Shutdown plugin system
   */
  async shutdown(): Promise<void> {
    // Disable all plugins
    for (const plugin of this.getAllPlugins()) {
      if (plugin.status === 'enabled') {
        await this.disablePlugin(plugin.id);
      }
    }

    // Cleanup managers
    await this.sandboxManager.shutdown();
    await this.apiProvider.shutdown();
    await this.securityManager.shutdown();
    await this.registry.shutdown();

    this.initialized = false;
    this.emit('shutdown');
  }

  private setupEventHandlers(): void {
    // Security violations
    this.securityManager.on('violation', (violation: SecurityViolation) => {
      this.emit('security:violation', violation);
      
      if (violation.severity === 'critical') {
        this.disablePlugin(violation.pluginId).catch(error => {
          this.emit('error', { type: 'security_disable', pluginId: violation.pluginId, error });
        });
      }
    });

    // Sandbox errors
    this.sandboxManager.on('error', (data: SandboxError) => {
      this.emit('error', { type: 'sandbox', ...data });
    });

    // API errors
    this.apiProvider.on('error', (data: APIError) => {
      this.emit('error', { type: 'api', ...data });
    });
  }

  private async loadInstalledPlugins(): Promise<void> {
    const installedPlugins = await this.registry.getInstalledPlugins();
    
    for (const plugin of installedPlugins) {
      this.plugins.set(plugin.id, plugin);
      
      // Auto-enable previously enabled plugins
      if (plugin.status === 'enabled') {
        try {
          await this.enablePlugin(plugin.id);
        } catch (error) {
          // Warning logging disabled for production
          plugin.status = 'error';
        }
      }
    }
  }

  private async registerPluginHooks(plugin: PluginInstance): Promise<void> {
    if (!plugin.metadata.hooks) return;

    for (const hook of plugin.metadata.hooks) {
      this.emit('hook:register', {
        pluginId: plugin.id,
        event: hook.event,
        handler: hook.handler,
        priority: hook.priority || 0
      });
    }
  }

  private async unregisterPluginHooks(plugin: PluginInstance): Promise<void> {
    if (!plugin.metadata.hooks) return;

    for (const hook of plugin.metadata.hooks) {
      this.emit('hook:unregister', {
        pluginId: plugin.id,
        event: hook.event,
        handler: hook.handler
      });
    }
  }
}
