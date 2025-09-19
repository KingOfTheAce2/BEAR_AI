/**
 * BEAR AI Plugin System - Main Entry Point
 * Comprehensive local plugin system with secure sandboxing and development tools
 */

export { PluginManager } from './core/PluginManager';
export { PluginConfigManager } from './core/ConfigManager';
export { PluginSandboxManager } from './sandbox/SandboxManager';
export { WebWorkerSandbox } from './sandbox/WebWorkerSandbox';
export { IFrameSandbox } from './sandbox/IFrameSandbox';
export { PluginAPIProvider } from './api/APIProvider';
export { PluginSecurityManager } from './security/SecurityManager';
export { PluginRegistry } from './registry/PluginRegistry';
export { LocalMarketplace } from './marketplace/LocalMarketplace';
export { PluginDeveloper } from './dev-tools/PluginDeveloper';

// Types
export * from './core/types';

// Main Plugin System Class
import { PluginManager } from './core/PluginManager';
import { PluginRegistry } from './registry/PluginRegistry';
import { LocalMarketplace } from './marketplace/LocalMarketplace';
import { PluginDeveloper } from './dev-tools/PluginDeveloper';
import {
  PluginInstance,
  PluginPackage,
  PluginManifest,
  PluginStatus,
  SecurityViolation
} from './core/types';

/**
 * Unified BEAR AI Plugin System
 * Manages all plugin functionality in a single interface
 */
export class BearPluginSystem {
  private manager: PluginManager;
  private registry: PluginRegistry;
  private marketplace: LocalMarketplace;
  private developer: PluginDeveloper;
  private initialized: boolean = false;

  constructor() {
    this.manager = new PluginManager();
    this.registry = this.manager['registry']; // Access private registry
    this.marketplace = new LocalMarketplace(this.registry);
    this.developer = new PluginDeveloper(this.manager);
    
    this.setupEventForwarding();
  }

  /**
   * Initialize the complete plugin system
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Initialize all components
      await this.manager.initialize();
      await this.marketplace.initialize();
      await this.developer.initialize();
      
      this.initialized = true;
      
      console.log('🔌 BEAR AI Plugin System initialized successfully');
      this.logSystemInfo();
    } catch (error) {
      console.error('❌ Failed to initialize plugin system:', error);
      throw error;
    }
  }

  /**
   * Plugin Management Methods
   */
  
  // Install plugin from package
  async installPlugin(pluginPackage: PluginPackage, options?: any): Promise<string> {
    const pluginId = await this.manager.installPlugin(pluginPackage, options);
    await this.marketplace.addLocalPlugin(pluginPackage);
    return pluginId;
  }

  // Enable plugin
  async enablePlugin(pluginId: string): Promise<void> {
    await this.manager.enablePlugin(pluginId);
  }

  // Disable plugin
  async disablePlugin(pluginId: string): Promise<void> {
    await this.manager.disablePlugin(pluginId);
  }

  // Uninstall plugin
  async uninstallPlugin(pluginId: string): Promise<void> {
    await this.manager.uninstallPlugin(pluginId);
    await this.marketplace.removeLocalPlugin(pluginId);
  }

  // Get plugin information
  getPlugin(pluginId: string): PluginInstance | undefined {
    return this.manager.getPlugin(pluginId);
  }

  // Get all plugins
  getAllPlugins(): PluginInstance[] {
    return this.manager.getAllPlugins();
  }

  // Get plugins by status
  getPluginsByStatus(status: PluginStatus): PluginInstance[] {
    return this.manager.getPluginsByStatus(status);
  }

  // Search plugins
  searchPlugins(query: string): PluginInstance[] {
    return this.manager.searchPlugins(query);
  }

  // Update plugin configuration
  async updatePluginConfig(pluginId: string, config: Record<string, any>): Promise<void> {
    await this.manager.updatePluginConfig(pluginId, config);
  }

  /**
   * Marketplace Methods
   */

  // Get featured plugins
  getFeaturedPlugins() {
    return this.marketplace.getFeaturedPlugins();
  }

  // Get popular plugins
  getPopularPlugins() {
    return this.marketplace.getPopularPlugins();
  }

  // Get recent plugins
  getRecentPlugins() {
    return this.marketplace.getRecentPlugins();
  }

  // Search marketplace
  searchMarketplace(query: string, filters?: any) {
    return this.marketplace.searchPlugins(query, filters);
  }

  // Get plugin details
  getPluginDetails(pluginId: string) {
    return this.marketplace.getPluginDetails(pluginId);
  }

  // Get marketplace statistics
  getMarketplaceStats() {
    return this.marketplace.getStatistics();
  }

  /**
   * Development Methods
   */

  // Create new plugin project
  async createProject(config: any): Promise<string> {
    return await this.developer.createProject(config);
  }

  // Build project
  async buildProject(projectId: string) {
    return await this.developer.buildProject(projectId);
  }

  // Test project
  async testProject(projectId: string) {
    return await this.developer.testProject(projectId);
  }

  // Install project for testing
  async installProjectForTesting(projectId: string): Promise<string> {
    return await this.developer.installForTesting(projectId);
  }

  // Generate plugin template
  generateTemplate(type: any) {
    return this.developer.generateTemplate(type);
  }

  /**
   * Security Methods
   */

  // Get security violations
  getSecurityViolations(pluginId?: string): SecurityViolation[] {
    return this.manager.getSecurityViolations(pluginId);
  }

  /**
   * System Methods
   */

  // Get system status
  getSystemStatus(): PluginSystemStatus {
    const allPlugins = this.getAllPlugins();
    const enabledPlugins = this.getPluginsByStatus('enabled');
    const marketplaceStats = this.getMarketplaceStats();
    const securityViolations = this.getSecurityViolations();

    return {
      initialized: this.initialized,
      totalPlugins: allPlugins.length,
      enabledPlugins: enabledPlugins.length,
      marketplacePlugins: marketplaceStats.totalPlugins,
      securityViolations: securityViolations.length,
      lastUpdate: new Date()
    };
  }

  // Export system data
  async exportSystem(): Promise<PluginSystemExport> {
    const [registryData, marketplaceData] = await Promise.all([
      this.registry.exportRegistry(),
      this.marketplace.exportMarketplace()
    ]);

    return {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      registry: registryData,
      marketplace: marketplaceData,
      systemInfo: this.getSystemStatus()
    };
  }

  // Import system data
  async importSystem(data: PluginSystemExport): Promise<void> {
    await this.registry.importRegistry(data.registry);
    await this.marketplace.importMarketplace(data.marketplace);
  }

  // Shutdown system
  async shutdown(): Promise<void> {
    if (!this.initialized) return;

    console.log('🔌 Shutting down BEAR AI Plugin System...');

    await Promise.all([
      this.developer.shutdown(),
      this.marketplace.shutdown(),
      this.manager.shutdown()
    ]);

    this.initialized = false;
    console.log('✅ Plugin system shutdown complete');
  }

  /**
   * Event Handling
   */

  // Subscribe to system events
  on(event: string, listener: (...args: any[]) => void): void {
    this.manager.on(event, listener);
  }

  // Unsubscribe from system events
  off(event: string, listener: (...args: any[]) => void): void {
    this.manager.off(event, listener);
  }

  // Emit system event
  emit(event: string, ...args: any[]): void {
    this.manager.emit(event, ...args);
  }

  private setupEventForwarding(): void {
    // Forward manager events
    this.manager.on('plugin:installed', (data) => this.emit('plugin:installed', data));
    this.manager.on('plugin:enabled', (data) => this.emit('plugin:enabled', data));
    this.manager.on('plugin:disabled', (data) => this.emit('plugin:disabled', data));
    this.manager.on('plugin:uninstalled', (data) => this.emit('plugin:uninstalled', data));
    this.manager.on('plugin:error', (data) => this.emit('plugin:error', data));
    this.manager.on('security:violation', (data) => this.emit('security:violation', data));

    // Forward marketplace events
    this.marketplace.on('plugin:added', (data) => this.emit('marketplace:plugin_added', data));
    this.marketplace.on('plugin:removed', (data) => this.emit('marketplace:plugin_removed', data));

    // Forward developer events
    this.developer.on('project:created', (data) => this.emit('dev:project_created', data));
    this.developer.on('project:built', (data) => this.emit('dev:project_built', data));
    this.developer.on('hot_reload', (data) => this.emit('dev:hot_reload', data));
  }

  private logSystemInfo(): void {
    const status = this.getSystemStatus();
    console.log(`📊 Plugin System Status:
    - Total Plugins: ${status.totalPlugins}
    - Enabled Plugins: ${status.enabledPlugins}
    - Marketplace Plugins: ${status.marketplacePlugins}
    - Security Violations: ${status.securityViolations}`);
  }
}

// System status and export types
interface PluginSystemStatus {
  initialized: boolean;
  totalPlugins: number;
  enabledPlugins: number;
  marketplacePlugins: number;
  securityViolations: number;
  lastUpdate: Date;
}

interface PluginSystemExport {
  version: string;
  exportedAt: string;
  registry: string;
  marketplace: string;
  systemInfo: PluginSystemStatus;
}

// Create singleton instance
let pluginSystemInstance: BearPluginSystem | null = null;

/**
 * Get the global plugin system instance
 */
export function getBearPluginSystem(): BearPluginSystem {
  if (!pluginSystemInstance) {
    pluginSystemInstance = new BearPluginSystem();
  }
  return pluginSystemInstance;
}

/**
 * Initialize the plugin system
 */
export async function initializePluginSystem(): Promise<BearPluginSystem> {
  const system = getBearPluginSystem();
  await system.initialize();
  return system;
}

// Default export
export default BearPluginSystem;