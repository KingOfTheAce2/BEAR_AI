/**
 * BEAR AI Local Plugin Marketplace
 * Local-only plugin discovery and management interface
 */

import { EventEmitter } from 'events';
import {
  PluginInstance,
  PluginManifest,
  PluginPackage,
  PluginStatus
} from '../core/types';
import { PluginRegistry } from '../registry/PluginRegistry';

export class LocalMarketplace extends EventEmitter {
  private registry: PluginRegistry;
  private localPlugins: Map<string, LocalPluginInfo> = new Map();
  private collections: Map<string, PluginCollection> = new Map();
  private initialized: boolean = false;

  constructor(registry: PluginRegistry) {
    super();
    this.registry = registry;
    this.initializeDefaultCollections();
  }

  /**
   * Initialize the local marketplace
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Load local plugin directory
      await this.scanLocalPlugins();
      
      // Load collections
      await this.loadCollections();
      
      this.initialized = true;
      this.emit('initialized');
    } catch (error) {
      this.emit('error', { type: 'initialization', error });
      throw error;
    }
  }

  /**
   * Get featured plugins
   */
  getFeaturedPlugins(): LocalPluginInfo[] {
    return this.getPluginsFromCollection('featured');
  }

  /**
   * Get popular plugins
   */
  getPopularPlugins(): LocalPluginInfo[] {
    return this.getPluginsFromCollection('popular');
  }

  /**
   * Get recently added plugins
   */
  getRecentPlugins(): LocalPluginInfo[] {
    const allPlugins = Array.from(this.localPlugins.values());
    return allPlugins
      .sort((a, b) => b.addedAt.getTime() - a.addedAt.getTime())
      .slice(0, 20);
  }

  /**
   * Get plugins by category
   */
  getPluginsByCategory(category: string): LocalPluginInfo[] {
    return Array.from(this.localPlugins.values())
      .filter(plugin => plugin.manifest.category === category);
  }

  /**
   * Search plugins in local marketplace
   */
  searchPlugins(query: string, filters?: SearchFilters): SearchResult[] {
    const lowercaseQuery = query.toLowerCase();
    const results: SearchResult[] = [];

    for (const plugin of this.localPlugins.values()) {
      const score = this.calculateSearchScore(plugin, query);
      if (score > 0) {
        const matches = this.applyFilters(plugin, filters || {});
        if (matches) {
          results.push({
            plugin,
            score,
            relevance: this.calculateRelevance(plugin, query)
          });
        }
      }
    }

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, filters?.limit || 50);
  }

  /**
   * Get plugin details
   */
  getPluginDetails(pluginId: string): PluginDetails | null {
    const plugin = this.localPlugins.get(pluginId);
    if (!plugin) return null;

    const installedPlugin = this.registry.getPlugin(pluginId);
    
    return {
      info: plugin,
      installation: installedPlugin ? {
        status: installedPlugin.status,
        version: installedPlugin.metadata.version,
        installedAt: installedPlugin.createdAt,
        lastActive: installedPlugin.lastActive
      } : null,
      dependencies: this.getDependencyInfo(plugin.manifest),
      compatibility: this.checkCompatibility(plugin.manifest),
      reviews: this.getPluginReviews(pluginId)
    };
  }

  /**
   * Add local plugin to marketplace
   */
  async addLocalPlugin(pluginPackage: PluginPackage): Promise<void> {
    const { manifest } = pluginPackage;
    
    try {
      const pluginInfo: LocalPluginInfo = {
        id: manifest.id,
        manifest,
        packagePath: '', // Local storage path
        addedAt: new Date(),
        downloads: 0,
        rating: 0,
        reviews: [],
        tags: [...manifest.tags],
        screenshots: manifest.screenshots || [],
        verified: false,
        size: this.calculatePackageSize(pluginPackage)
      };

      this.localPlugins.set(manifest.id, pluginInfo);
      
      // Add to appropriate collections
      await this.addToCollections(pluginInfo);
      
      // Save to storage
      await this.saveLocalPlugins();
      
      this.emit('plugin:added', { pluginId: manifest.id, pluginInfo });
    } catch (error) {
      this.emit('error', { type: 'add_plugin', pluginId: manifest.id, error });
      throw error;
    }
  }

  /**
   * Remove plugin from marketplace
   */
  async removeLocalPlugin(pluginId: string): Promise<void> {
    try {
      const pluginInfo = this.localPlugins.get(pluginId);
      if (!pluginInfo) return;

      // Remove from collections
      await this.removeFromCollections(pluginId);
      
      // Remove from local plugins
      this.localPlugins.delete(pluginId);
      
      // Save to storage
      await this.saveLocalPlugins();
      
      this.emit('plugin:removed', { pluginId });
    } catch (error) {
      this.emit('error', { type: 'remove_plugin', pluginId, error });
      throw error;
    }
  }

  /**
   * Create a new collection
   */
  async createCollection(collection: Omit<PluginCollection, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const id = `collection_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const newCollection: PluginCollection = {
      id,
      name: collection.name,
      description: collection.description,
      pluginIds: collection.pluginIds,
      isSystem: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.collections.set(id, newCollection);
    await this.saveCollections();
    
    this.emit('collection:created', { collectionId: id, collection: newCollection });
    return id;
  }

  /**
   * Update collection
   */
  async updateCollection(collectionId: string, updates: Partial<PluginCollection>): Promise<void> {
    const collection = this.collections.get(collectionId);
    if (!collection || collection.isSystem) {
      throw new Error('Collection not found or is system collection');
    }

    try {
      Object.assign(collection, updates, { updatedAt: new Date() });
      await this.saveCollections();
      
      this.emit('collection:updated', { collectionId, collection });
    } catch (error) {
      this.emit('error', { type: 'collection_update', collectionId, error });
      throw error;
    }
  }

  /**
   * Delete collection
   */
  async deleteCollection(collectionId: string): Promise<void> {
    const collection = this.collections.get(collectionId);
    if (!collection || collection.isSystem) {
      throw new Error('Collection not found or cannot delete system collection');
    }

    try {
      this.collections.delete(collectionId);
      await this.saveCollections();
      
      this.emit('collection:deleted', { collectionId });
    } catch (error) {
      this.emit('error', { type: 'collection_delete', collectionId, error });
      throw error;
    }
  }

  /**
   * Get all collections
   */
  getCollections(): PluginCollection[] {
    return Array.from(this.collections.values());
  }

  /**
   * Get plugins from collection
   */
  getPluginsFromCollection(collectionId: string): LocalPluginInfo[] {
    const collection = this.collections.get(collectionId);
    if (!collection) return [];

    return collection.pluginIds
      .map(id => this.localPlugins.get(id))
      .filter(Boolean) as LocalPluginInfo[];
  }

  /**
   * Add plugin review
   */
  async addPluginReview(pluginId: string, review: Omit<PluginReview, 'id' | 'createdAt'>): Promise<void> {
    const plugin = this.localPlugins.get(pluginId);
    if (!plugin) {
      throw new Error('Plugin not found');
    }

    try {
      const newReview: PluginReview = {
        id: `review_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        author: review.author,
        rating: review.rating,
        comment: review.comment,
        createdAt: new Date()
      };

      plugin.reviews.push(newReview);
      
      // Update average rating
      plugin.rating = plugin.reviews.reduce((sum, r) => sum + r.rating, 0) / plugin.reviews.length;
      
      await this.saveLocalPlugins();
      
      this.emit('review:added', { pluginId, review: newReview });
    } catch (error) {
      this.emit('error', { type: 'review_add', pluginId, error });
      throw error;
    }
  }

  /**
   * Get marketplace statistics
   */
  getStatistics(): MarketplaceStatistics {
    const plugins = Array.from(this.localPlugins.values());
    const categories = [...new Set(plugins.map(p => p.manifest.category))];
    const totalDownloads = plugins.reduce((sum, p) => sum + p.downloads, 0);
    const averageRating = plugins.length > 0 
      ? plugins.reduce((sum, p) => sum + p.rating, 0) / plugins.length 
      : 0;

    const categoryBreakdown = categories.reduce((acc, category) => {
      acc[category] = plugins.filter(p => p.manifest.category === category).length;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalPlugins: plugins.length,
      totalCategories: categories.length,
      totalCollections: this.collections.size,
      totalDownloads,
      averageRating,
      categoryBreakdown,
      mostPopularPlugin: plugins.sort((a, b) => b.downloads - a.downloads)[0]?.id,
      highestRatedPlugin: plugins.sort((a, b) => b.rating - a.rating)[0]?.id
    };
  }

  /**
   * Export marketplace data
   */
  async exportMarketplace(): Promise<string> {
    const exportData = {
      plugins: Object.fromEntries(this.localPlugins),
      collections: Object.fromEntries(this.collections),
      exportedAt: new Date().toISOString()
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Import marketplace data
   */
  async importMarketplace(data: string): Promise<void> {
    try {
      const importData = JSON.parse(data);
      
      if (importData.plugins) {
        this.localPlugins = new Map(Object.entries(importData.plugins));
      }
      
      if (importData.collections) {
        // Only import non-system collections
        for (const [id, collection] of Object.entries(importData.collections as Record<string, PluginCollection>)) {
          if (!collection.isSystem) {
            this.collections.set(id, collection);
          }
        }
      }

      await this.saveLocalPlugins();
      await this.saveCollections();
      
      this.emit('marketplace:imported');
    } catch (error) {
      this.emit('error', { type: 'marketplace_import', error });
      throw error;
    }
  }

  /**
   * Shutdown marketplace
   */
  async shutdown(): Promise<void> {
    await this.saveLocalPlugins();
    await this.saveCollections();
    
    this.initialized = false;
    this.emit('shutdown');
  }

  private async scanLocalPlugins(): Promise<void> {
    // In a real implementation, this would scan local directories
    // For now, we'll load from localStorage
    try {
      const stored = localStorage.getItem('bear_local_plugins');
      if (stored) {
        const plugins = JSON.parse(stored);
        this.localPlugins = new Map(Object.entries(plugins));
      }
    } catch (error) {
      console.warn('Failed to load local plugins:', error);
    }
  }

  private async loadCollections(): Promise<void> {
    try {
      const stored = localStorage.getItem('bear_plugin_collections');
      if (stored) {
        const collections = JSON.parse(stored);
        // Only load non-system collections from storage
        for (const [id, collection] of Object.entries(collections)) {
          if (!(collection as PluginCollection).isSystem) {
            this.collections.set(id, collection as PluginCollection);
          }
        }
      }
    } catch (error) {
      console.warn('Failed to load collections:', error);
    }
  }

  private async saveLocalPlugins(): Promise<void> {
    try {
      const pluginData = Object.fromEntries(this.localPlugins);
      localStorage.setItem('bear_local_plugins', JSON.stringify(pluginData));
    } catch (error) {
      this.emit('error', { type: 'save_plugins', error });
    }
  }

  private async saveCollections(): Promise<void> {
    try {
      const nonSystemCollections = new Map();
      for (const [id, collection] of this.collections.entries()) {
        if (!collection.isSystem) {
          nonSystemCollections.set(id, collection);
        }
      }
      
      const collectionData = Object.fromEntries(nonSystemCollections);
      localStorage.setItem('bear_plugin_collections', JSON.stringify(collectionData));
    } catch (error) {
      this.emit('error', { type: 'save_collections', error });
    }
  }

  private initializeDefaultCollections(): void {
    // System collections
    this.collections.set('featured', {
      id: 'featured',
      name: 'Featured',
      description: 'Hand-picked plugins showcasing the best of BEAR AI',
      pluginIds: [],
      isSystem: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    this.collections.set('popular', {
      id: 'popular',
      name: 'Popular',
      description: 'Most downloaded and highly rated plugins',
      pluginIds: [],
      isSystem: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    this.collections.set('new', {
      id: 'new',
      name: 'New & Updated',
      description: 'Recently added and updated plugins',
      pluginIds: [],
      isSystem: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  private calculateSearchScore(plugin: LocalPluginInfo, query: string): number {
    const lowercaseQuery = query.toLowerCase();
    let score = 0;

    // Name match
    if (plugin.manifest.name.toLowerCase().includes(lowercaseQuery)) {
      score += 10;
    }

    // Description match
    if (plugin.manifest.description.toLowerCase().includes(lowercaseQuery)) {
      score += 5;
    }

    // Tag matches
    for (const tag of plugin.tags) {
      if (tag.toLowerCase().includes(lowercaseQuery)) {
        score += 3;
      }
    }

    // Category match
    if (plugin.manifest.category.toLowerCase().includes(lowercaseQuery)) {
      score += 2;
    }

    // Author match
    if (plugin.manifest.author.toLowerCase().includes(lowercaseQuery)) {
      score += 1;
    }

    return score;
  }

  private calculateRelevance(plugin: LocalPluginInfo, query: string): number {
    // Combine search score with plugin metrics
    const searchScore = this.calculateSearchScore(plugin, query);
    const popularityScore = Math.log10(plugin.downloads + 1);
    const ratingScore = plugin.rating;

    return searchScore + (popularityScore * 0.5) + (ratingScore * 0.3);
  }

  private applyFilters(plugin: LocalPluginInfo, filters: SearchFilters): boolean {
    if (filters.category && plugin.manifest.category !== filters.category) {
      return false;
    }

    if (filters.tags && filters.tags.length > 0) {
      const hasAllTags = filters.tags.every(tag => 
        plugin.tags.some(pTag => pTag.toLowerCase() === tag.toLowerCase())
      );
      if (!hasAllTags) return false;
    }

    if (filters.minRating && plugin.rating < filters.minRating) {
      return false;
    }

    if (filters.verified !== undefined && plugin.verified !== filters.verified) {
      return false;
    }

    return true;
  }

  private calculatePackageSize(pluginPackage: PluginPackage): number {
    let size = 0;
    for (const content of pluginPackage.files.values()) {
      size += content.length;
    }
    return size;
  }

  private getDependencyInfo(manifest: PluginManifest): DependencyInfo[] {
    if (!manifest.dependencies) return [];

    return manifest.dependencies.map(dep => {
      const installed = this.registry.getPlugin(dep);
      return {
        name: dep,
        required: true,
        installed: !!installed,
        version: installed?.metadata.version
      };
    });
  }

  private checkCompatibility(manifest: PluginManifest): CompatibilityInfo {
    // Mock compatibility check
    return {
      compatible: true,
      minBearVersion: manifest.minBearVersion,
      currentBearVersion: '1.0.0',
      issues: []
    };
  }

  private getPluginReviews(pluginId: string): PluginReview[] {
    const plugin = this.localPlugins.get(pluginId);
    return plugin?.reviews || [];
  }

  private async addToCollections(plugin: LocalPluginInfo): Promise<void> {
    // Add to "new" collection
    const newCollection = this.collections.get('new');
    if (newCollection && !newCollection.pluginIds.includes(plugin.id)) {
      newCollection.pluginIds.unshift(plugin.id);
      // Keep only last 20
      newCollection.pluginIds = newCollection.pluginIds.slice(0, 20);
    }

    // Add to category-specific collections if they exist
    const categoryCollection = Array.from(this.collections.values())
      .find(c => c.name.toLowerCase() === plugin.manifest.category.toLowerCase());
    
    if (categoryCollection && !categoryCollection.pluginIds.includes(plugin.id)) {
      categoryCollection.pluginIds.push(plugin.id);
    }
  }

  private async removeFromCollections(pluginId: string): Promise<void> {
    for (const collection of this.collections.values()) {
      const index = collection.pluginIds.indexOf(pluginId);
      if (index !== -1) {
        collection.pluginIds.splice(index, 1);
      }
    }
  }
}

interface LocalPluginInfo {
  id: string;
  manifest: PluginManifest;
  packagePath: string;
  addedAt: Date;
  downloads: number;
  rating: number;
  reviews: PluginReview[];
  tags: string[];
  screenshots: string[];
  verified: boolean;
  size: number;
}

interface PluginCollection {
  id: string;
  name: string;
  description: string;
  pluginIds: string[];
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface PluginReview {
  id: string;
  author: string;
  rating: number;
  comment: string;
  createdAt: Date;
}

interface SearchFilters {
  category?: string;
  tags?: string[];
  minRating?: number;
  verified?: boolean;
  limit?: number;
}

interface SearchResult {
  plugin: LocalPluginInfo;
  score: number;
  relevance: number;
}

interface PluginDetails {
  info: LocalPluginInfo;
  installation: {
    status: PluginStatus;
    version: string;
    installedAt: Date;
    lastActive: Date;
  } | null;
  dependencies: DependencyInfo[];
  compatibility: CompatibilityInfo;
  reviews: PluginReview[];
}

interface DependencyInfo {
  name: string;
  required: boolean;
  installed: boolean;
  version?: string;
}

interface CompatibilityInfo {
  compatible: boolean;
  minBearVersion: string;
  currentBearVersion: string;
  issues: string[];
}

interface MarketplaceStatistics {
  totalPlugins: number;
  totalCategories: number;
  totalCollections: number;
  totalDownloads: number;
  averageRating: number;
  categoryBreakdown: Record<string, number>;
  mostPopularPlugin?: string;
  highestRatedPlugin?: string;
}