/**
 * BEAR AI Plugin Registry
 * Local plugin storage, indexing, and discovery system
 */

import { EventEmitter } from 'events';
import { PluginInstance, PluginPackage, LocalPluginRegistry, PluginManifest, PluginStatus } from '../core/types';

export class PluginRegistry extends EventEmitter {
  private localRegistry: LocalPluginRegistry;
  private dbName = 'bear_plugin_registry';
  private initialized: boolean = false;

  constructor() {
    super();
    this.localRegistry = {
      plugins: new Map(),
      categories: new Map(),
      tags: new Map(),
      searchIndex: new Map()
    };
  }

  /**
   * Initialize the plugin registry
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Load registry from local storage
      await this.loadFromStorage();
      
      // Build search indices
      this.buildSearchIndices();
      
      this.initialized = true;
      this.emit('initialized');
    } catch (error) {
      this.emit('error', { type: 'initialization', error });
      throw error;
    }
  }

  /**
   * Store a plugin package locally
   */
  async storePlugin(pluginPackage: PluginPackage): Promise<void> {
    const { manifest } = pluginPackage;
    
    try {
      // Store plugin files
      const pluginData = {
        manifest,
        files: Object.fromEntries(pluginPackage.files),
        signature: pluginPackage.signature,
        integrity: pluginPackage.integrity,
        storedAt: new Date().toISOString()
      };

      localStorage.setItem(`plugin_${manifest.id}`, JSON.stringify(pluginData));
      
      // Update indices
      this.updateIndices(manifest);
      
      // Save registry state
      await this.saveToStorage();
      
      this.emit('plugin:stored', { pluginId: manifest.id });
    } catch (error) {
      this.emit('error', { type: 'plugin_store', pluginId: manifest.id, error });
      throw error;
    }
  }

  /**
   * Register a plugin instance
   */
  async registerPlugin(plugin: PluginInstance): Promise<void> {
    try {
      // Add to local registry
      this.localRegistry.plugins.set(plugin.id, plugin);
      
      // Update category index
      this.addToCategory(plugin.metadata.category, plugin.id);
      
      // Update tag index
      for (const tag of plugin.metadata.tags) {
        this.addToTag(tag, plugin.id);
      }
      
      // Update search index
      this.updateSearchIndex(plugin);
      
      // Save registry state
      await this.saveToStorage();
      
      this.emit('plugin:registered', { pluginId: plugin.id });
    } catch (error) {
      this.emit('error', { type: 'plugin_register', pluginId: plugin.id, error });
      throw error;
    }
  }

  /**
   * Unregister a plugin
   */
  async unregisterPlugin(pluginId: string): Promise<void> {
    const plugin = this.localRegistry.plugins.get(pluginId);
    if (!plugin) return;

    try {
      // Remove from registry
      this.localRegistry.plugins.delete(pluginId);
      
      // Remove from category index
      this.removeFromCategory(plugin.metadata.category, pluginId);
      
      // Remove from tag index
      for (const tag of plugin.metadata.tags) {
        this.removeFromTag(tag, pluginId);
      }
      
      // Remove from search index
      this.removeFromSearchIndex(pluginId);
      
      // Save registry state
      await this.saveToStorage();
      
      this.emit('plugin:unregistered', { pluginId });
    } catch (error) {
      this.emit('error', { type: 'plugin_unregister', pluginId, error });
      throw error;
    }
  }

  /**
   * Update plugin in registry
   */
  async updatePlugin(plugin: PluginInstance): Promise<void> {
    try {
      // Update plugin in registry
      this.localRegistry.plugins.set(plugin.id, plugin);
      
      // Update search index
      this.updateSearchIndex(plugin);
      
      // Save registry state
      await this.saveToStorage();
      
      this.emit('plugin:updated', { pluginId: plugin.id });
    } catch (error) {
      this.emit('error', { type: 'plugin_update', pluginId: plugin.id, error });
      throw error;
    }
  }

  /**
   * Get all installed plugins
   */
  async getInstalledPlugins(): Promise<PluginInstance[]> {
    const plugins: PluginInstance[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('plugin_')) {
        try {
          const data = JSON.parse(localStorage.getItem(key) || '{}');
          if (data.manifest) {
            // Create plugin instance from stored data
            const plugin: PluginInstance = {
              id: data.manifest.id,
              metadata: data.manifest,
              status: 'installed', // Default status
              sandbox: null as any, // Will be created by SandboxManager
              config: {},
              api: null as any, // Will be created by APIProvider
              createdAt: new Date(data.storedAt || Date.now()),
              lastActive: new Date(data.storedAt || Date.now())
            };
            plugins.push(plugin);
          }
        } catch (error) {
          console.warn(`Failed to parse plugin data for ${key}:`, error);
        }
      }
    }
    
    return plugins;
  }

  /**
   * Get plugin by ID
   */
  getPlugin(pluginId: string): PluginInstance | undefined {
    return this.localRegistry.plugins.get(pluginId);
  }

  /**
   * Search plugins by query
   */
  searchPlugins(query: string): PluginInstance[] {
    const lowercaseQuery = query.toLowerCase();
    const results: PluginInstance[] = [];
    const resultIds = new Set<string>();

    // Search by keywords in search index
    for (const [keyword, pluginIds] of this.localRegistry.searchIndex.entries()) {
      if (keyword.includes(lowercaseQuery)) {
        for (const pluginId of pluginIds) {
          if (!resultIds.has(pluginId)) {
            const plugin = this.localRegistry.plugins.get(pluginId);
            if (plugin) {
              results.push(plugin);
              resultIds.add(pluginId);
            }
          }
        }
      }
    }

    // Direct text search in plugin metadata
    for (const plugin of this.localRegistry.plugins.values()) {
      if (resultIds.has(plugin.id)) continue;

      const searchableText = [
        plugin.metadata.name,
        plugin.metadata.description,
        plugin.metadata.author,
        ...plugin.metadata.tags
      ].join(' ').toLowerCase();

      if (searchableText.includes(lowercaseQuery)) {
        results.push(plugin);
      }
    }

    return this.sortSearchResults(results, query);
  }

  /**
   * Get plugins by category
   */
  getPluginsByCategory(category: string): PluginInstance[] {
    const pluginIds = this.localRegistry.categories.get(category) || [];
    return pluginIds.map(id => this.localRegistry.plugins.get(id)).filter(Boolean) as PluginInstance[];
  }

  /**
   * Get plugins by tag
   */
  getPluginsByTag(tag: string): PluginInstance[] {
    const pluginIds = this.localRegistry.tags.get(tag) || [];
    return pluginIds.map(id => this.localRegistry.plugins.get(id)).filter(Boolean) as PluginInstance[];
  }

  /**
   * Get all categories
   */
  getCategories(): string[] {
    return Array.from(this.localRegistry.categories.keys());
  }

  /**
   * Get all tags
   */
  getTags(): string[] {
    return Array.from(this.localRegistry.tags.keys());
  }

  /**
   * Get plugin statistics
   */
  getStatistics(): RegistryStatistics {
    const plugins = Array.from(this.localRegistry.plugins.values());
    const categories = this.getCategories();
    const tags = this.getTags();

    const statusCounts = plugins.reduce((acc, plugin) => {
      acc[plugin.status] = (acc[plugin.status] || 0) + 1;
      return acc;
    }, {} as Record<PluginStatus, number>);

    const categoryCounts = categories.reduce((acc, category) => {
      acc[category] = this.localRegistry.categories.get(category)?.length || 0;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalPlugins: plugins.length,
      statusBreakdown: statusCounts,
      categoryBreakdown: categoryCounts,
      totalCategories: categories.length,
      totalTags: tags.length,
      averagePluginsPerCategory: plugins.length / Math.max(categories.length, 1)
    };
  }

  /**
   * Remove plugin files
   */
  async removePluginFiles(pluginId: string): Promise<void> {
    try {
      localStorage.removeItem(`plugin_${pluginId}`);
      this.emit('plugin:files_removed', { pluginId });
    } catch (error) {
      this.emit('error', { type: 'plugin_file_removal', pluginId, error });
      throw error;
    }
  }

  /**
   * Backup plugin
   */
  async backupPlugin(pluginId: string): Promise<void> {
    try {
      const pluginData = localStorage.getItem(`plugin_${pluginId}`);
      if (pluginData) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        localStorage.setItem(`plugin_backup_${pluginId}_${timestamp}`, pluginData);
        this.emit('plugin:backed_up', { pluginId, timestamp });
      }
    } catch (error) {
      this.emit('error', { type: 'plugin_backup', pluginId, error });
      throw error;
    }
  }

  /**
   * Get plugin backup versions
   */
  getPluginBackups(pluginId: string): PluginBackup[] {
    const backups: PluginBackup[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(`plugin_backup_${pluginId}_`)) {
        const timestamp = key.substring(`plugin_backup_${pluginId}_`.length);
        try {
          const data = JSON.parse(localStorage.getItem(key) || '{}');
          backups.push({
            pluginId,
            timestamp: new Date(timestamp.replace(/-/g, ':')),
            version: data.manifest?.version || 'unknown',
            size: localStorage.getItem(key)?.length || 0
          });
        } catch (error) {
          console.warn(`Failed to parse backup data for ${key}:`, error);
        }
      }
    }
    
    return backups.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Restore plugin from backup
   */
  async restorePluginFromBackup(pluginId: string, timestamp: Date): Promise<void> {
    try {
      const timestampStr = timestamp.toISOString().replace(/[:.]/g, '-');
      const backupKey = `plugin_backup_${pluginId}_${timestampStr}`;
      const backupData = localStorage.getItem(backupKey);
      
      if (!backupData) {
        throw new Error('Backup not found');
      }
      
      // Restore plugin data
      localStorage.setItem(`plugin_${pluginId}`, backupData);
      
      this.emit('plugin:restored', { pluginId, timestamp });
    } catch (error) {
      this.emit('error', { type: 'plugin_restore', pluginId, error });
      throw error;
    }
  }

  /**
   * Export registry data
   */
  async exportRegistry(): Promise<string> {
    const registryData = {
      plugins: Object.fromEntries(this.localRegistry.plugins),
      categories: Object.fromEntries(this.localRegistry.categories),
      tags: Object.fromEntries(this.localRegistry.tags),
      exportedAt: new Date().toISOString()
    };
    
    return JSON.stringify(registryData, null, 2);
  }

  /**
   * Import registry data
   */
  async importRegistry(data: string): Promise<void> {
    try {
      const registryData = JSON.parse(data);
      
      // Validate data structure
      if (!registryData.plugins || !registryData.categories || !registryData.tags) {
        throw new Error('Invalid registry data format');
      }
      
      // Clear existing registry
      this.localRegistry.plugins.clear();
      this.localRegistry.categories.clear();
      this.localRegistry.tags.clear();
      this.localRegistry.searchIndex.clear();
      
      // Import data
      this.localRegistry.plugins = new Map(Object.entries(registryData.plugins));
      this.localRegistry.categories = new Map(Object.entries(registryData.categories));
      this.localRegistry.tags = new Map(Object.entries(registryData.tags));
      
      // Rebuild search indices
      this.buildSearchIndices();
      
      // Save to storage
      await this.saveToStorage();
      
      this.emit('registry:imported');
    } catch (error) {
      this.emit('error', { type: 'registry_import', error });
      throw error;
    }
  }

  /**
   * Shutdown registry
   */
  async shutdown(): Promise<void> {
    await this.saveToStorage();
    this.initialized = false;
    this.emit('shutdown');
  }

  private async loadFromStorage(): Promise<void> {
    try {
      const registryData = localStorage.getItem(this.dbName);
      if (registryData) {
        const parsed = JSON.parse(registryData);
        this.localRegistry.categories = new Map(parsed.categories || []);
        this.localRegistry.tags = new Map(parsed.tags || []);
        
        // Load installed plugins
        const installedPlugins = await this.getInstalledPlugins();
        for (const plugin of installedPlugins) {
          this.localRegistry.plugins.set(plugin.id, plugin);
        }
      }
    } catch (error) {
      console.warn('Failed to load registry from storage:', error);
    }
  }

  private async saveToStorage(): Promise<void> {
    try {
      const registryData = {
        categories: Array.from(this.localRegistry.categories.entries()),
        tags: Array.from(this.localRegistry.tags.entries()),
        lastSaved: new Date().toISOString()
      };
      
      localStorage.setItem(this.dbName, JSON.stringify(registryData));
    } catch (error) {
      this.emit('error', { type: 'storage_save', error });
    }
  }

  private buildSearchIndices(): void {
    this.localRegistry.searchIndex.clear();
    
    for (const plugin of this.localRegistry.plugins.values()) {
      this.updateSearchIndex(plugin);
    }
  }

  private updateSearchIndex(plugin: PluginInstance): void {
    const keywords = [
      ...plugin.metadata.name.toLowerCase().split(/\s+/),
      ...plugin.metadata.description.toLowerCase().split(/\s+/),
      plugin.metadata.author.toLowerCase(),
      plugin.metadata.category.toLowerCase(),
      ...plugin.metadata.tags.map(tag => tag.toLowerCase())
    ];

    for (const keyword of keywords) {
      if (keyword.length > 2) { // Only index meaningful keywords
        if (!this.localRegistry.searchIndex.has(keyword)) {
          this.localRegistry.searchIndex.set(keyword, new Set());
        }
        this.localRegistry.searchIndex.get(keyword)!.add(plugin.id);
      }
    }
  }

  private removeFromSearchIndex(pluginId: string): void {
    for (const [keyword, pluginIds] of this.localRegistry.searchIndex.entries()) {
      pluginIds.delete(pluginId);
      if (pluginIds.size === 0) {
        this.localRegistry.searchIndex.delete(keyword);
      }
    }
  }

  private updateIndices(manifest: PluginManifest): void {
    // Update category index
    this.addToCategory(manifest.category, manifest.id);
    
    // Update tag index
    for (const tag of manifest.tags) {
      this.addToTag(tag, manifest.id);
    }
  }

  private addToCategory(category: string, pluginId: string): void {
    if (!this.localRegistry.categories.has(category)) {
      this.localRegistry.categories.set(category, []);
    }
    const plugins = this.localRegistry.categories.get(category)!;
    if (!plugins.includes(pluginId)) {
      plugins.push(pluginId);
    }
  }

  private removeFromCategory(category: string, pluginId: string): void {
    const plugins = this.localRegistry.categories.get(category);
    if (plugins) {
      const index = plugins.indexOf(pluginId);
      if (index !== -1) {
        plugins.splice(index, 1);
      }
      if (plugins.length === 0) {
        this.localRegistry.categories.delete(category);
      }
    }
  }

  private addToTag(tag: string, pluginId: string): void {
    if (!this.localRegistry.tags.has(tag)) {
      this.localRegistry.tags.set(tag, []);
    }
    const plugins = this.localRegistry.tags.get(tag)!;
    if (!plugins.includes(pluginId)) {
      plugins.push(pluginId);
    }
  }

  private removeFromTag(tag: string, pluginId: string): void {
    const plugins = this.localRegistry.tags.get(tag);
    if (plugins) {
      const index = plugins.indexOf(pluginId);
      if (index !== -1) {
        plugins.splice(index, 1);
      }
      if (plugins.length === 0) {
        this.localRegistry.tags.delete(tag);
      }
    }
  }

  private sortSearchResults(results: PluginInstance[], query: string): PluginInstance[] {
    const lowercaseQuery = query.toLowerCase();
    
    return results.sort((a, b) => {
      // Exact name matches first
      const aNameMatch = a.metadata.name.toLowerCase() === lowercaseQuery;
      const bNameMatch = b.metadata.name.toLowerCase() === lowercaseQuery;
      if (aNameMatch && !bNameMatch) return -1;
      if (!aNameMatch && bNameMatch) return 1;
      
      // Name starts with query
      const aNameStarts = a.metadata.name.toLowerCase().startsWith(lowercaseQuery);
      const bNameStarts = b.metadata.name.toLowerCase().startsWith(lowercaseQuery);
      if (aNameStarts && !bNameStarts) return -1;
      if (!aNameStarts && bNameStarts) return 1;
      
      // Sort by relevance score
      const aScore = this.calculateRelevanceScore(a, query);
      const bScore = this.calculateRelevanceScore(b, query);
      
      return bScore - aScore;
    });
  }

  private calculateRelevanceScore(plugin: PluginInstance, query: string): number {
    const lowercaseQuery = query.toLowerCase();
    let score = 0;

    // Name matches
    if (plugin.metadata.name.toLowerCase().includes(lowercaseQuery)) {
      score += 10;
    }

    // Description matches
    if (plugin.metadata.description.toLowerCase().includes(lowercaseQuery)) {
      score += 5;
    }

    // Tag matches
    for (const tag of plugin.metadata.tags) {
      if (tag.toLowerCase().includes(lowercaseQuery)) {
        score += 3;
      }
    }

    // Category matches
    if (plugin.metadata.category.toLowerCase().includes(lowercaseQuery)) {
      score += 2;
    }

    return score;
  }
}

interface RegistryStatistics {
  totalPlugins: number;
  statusBreakdown: Record<PluginStatus, number>;
  categoryBreakdown: Record<string, number>;
  totalCategories: number;
  totalTags: number;
  averagePluginsPerCategory: number;
}

interface PluginBackup {
  pluginId: string;
  timestamp: Date;
  version: string;
  size: number;
}
