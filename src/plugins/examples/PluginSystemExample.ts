/**
 * BEAR AI Plugin System Usage Examples
 * Demonstrates how to use the comprehensive local plugin system
 */

import { BearPluginSystem, getBearPluginSystem, initializePluginSystem, PluginPackage, PluginManifest } from '../index';

/**
 * Basic Plugin System Usage Example
 */
export class PluginSystemExample {
  private pluginSystem: BearPluginSystem;

  constructor() {
    this.pluginSystem = getBearPluginSystem();
  }

  /**
   * Initialize and demonstrate the plugin system
   */
  async runExample(): Promise<void> {
    // console.log('🚀 Starting BEAR AI Plugin System Example');

    try {
      // 1. Initialize the plugin system
      await this.pluginSystem.initialize();
      
      // 2. Create a sample plugin
      await this.createSamplePlugin();
      
      // 3. Demonstrate marketplace features
      await this.demonstrateMarketplace();
      
      // 4. Show development workflow
      await this.demonstrateDevelopmentWorkflow();
      
      // 5. Show security features
      this.demonstrateSecurityFeatures();
      
      // 6. Show system management
      this.demonstrateSystemManagement();

      // Logging disabled for production
    } catch (error) {
      // Error logging disabled for production
    }
  }

  /**
   * Create and install a sample plugin
   */
  private async createSamplePlugin(): Promise<void> {
    // console.log('\n📦 Creating Sample Plugin...');

    // Define plugin manifest
    const manifest: PluginManifest = {
      id: 'sample-utility-plugin',
      name: 'Sample Utility Plugin',
      version: '1.0.0',
      author: 'BEAR AI Example',
      description: 'A sample utility plugin demonstrating BEAR AI plugin capabilities',
      category: 'utility',
      tags: ['example', 'utility', 'demo'],
      permissions: [
        {
          type: 'storage',
          scope: 'plugin-data',
          description: 'Store plugin configuration and data',
          required: true
        },
        {
          type: 'ui',
          scope: 'notifications',
          description: 'Show user notifications',
          required: false
        }
      ],
      minBearVersion: '1.0.0',
      entry: 'index.js',
      sandboxType: 'worker',
      license: 'MIT'
    };

    // Plugin source code
    const pluginCode = `
      class SamplePlugin {
        constructor(api, config) {
          this.api = api;
          this.config = config;
          this.data = [];
        }

        async initialize() {
          // Logging disabled for production
          
          // Load saved data
          this.data = await this.api.storage.get('plugin_data') || [];
          
          // Show welcome notification
          this.api.ui.showNotification('Sample Plugin loaded successfully!', 'success');
          
          // Set up event listeners
          this.api.events.on('data_process', this.processData.bind(this));
        }

        async processData(inputData) {
          // Logging disabled for production
          
          const processedItem = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            originalData: inputData,
            processed: true,
            processingTime: Math.random() * 100
          };
          
          this.data.push(processedItem);
          await this.api.storage.set('plugin_data', this.data);
          
          this.api.events.emit('data_processed', processedItem);
          return processedItem;
        }

        async getData() {
          return this.data;
        }

        async clearData() {
          this.data = [];
          await this.api.storage.clear();
          this.api.ui.showNotification('Data cleared', 'info');
        }

        onConfigUpdate(newConfig) {
          this.config = newConfig;
          // Logging disabled for production
        }

        destroy() {
          // Logging disabled for production
        }
      }

      // Return the plugin class
      return SamplePlugin;
    `;

    // Create plugin package
    const pluginPackage: PluginPackage = {
      manifest,
      files: new Map([
        ['index.js', pluginCode],
        ['README.md', `# ${manifest.name}\n\n${manifest.description}\n\n## Features\n- Data processing\n- Storage management\n- Event handling`]
      ])
    };

    try {
      // Install the plugin
      const pluginId = await this.pluginSystem.installPlugin(pluginPackage, {
        enableImmediately: true
      });
      
      // Logging disabled for production
      
      // Test plugin functionality
      await this.testSamplePlugin(pluginId);
      
    } catch (error) {
      // Error logging disabled for production
    }
  }

  /**
   * Test the sample plugin functionality
   */
  private async testSamplePlugin(pluginId: string): Promise<void> {
    // console.log(`🧪 Testing plugin: ${pluginId}`);

    const plugin = this.pluginSystem.getPlugin(pluginId);
    if (!plugin) {
      // Error logging disabled for production
      return;
    }

    // Test configuration update
    await this.pluginSystem.updatePluginConfig(pluginId, {
      enableNotifications: true,
      maxDataItems: 100
    });

    // Logging disabled for production
    // console.log(`📊 Plugin status: ${plugin.status}`);
  }

  /**
   * Demonstrate marketplace features
   */
  private async demonstrateMarketplace(): Promise<void> {
    // console.log('\n🏪 Marketplace Features Demo...');

    try {
      // Get marketplace statistics
      const stats = this.pluginSystem.getMarketplaceStats();
      // console.log('📊 Marketplace Statistics:', {
        totalPlugins: stats.totalPlugins,
        totalCategories: stats.totalCategories,
        averageRating: stats.averageRating.toFixed(1)
      });

      // Get featured plugins
      const featuredPlugins = this.pluginSystem.getFeaturedPlugins();
      // Logging disabled for production

      // Search for plugins
      const searchResults = this.pluginSystem.searchMarketplace('utility');
      // console.log(`🔍 Search Results for 'utility': ${searchResults.length} found`);

      // Get plugin details
      if (searchResults.length > 0) {
        const details = this.pluginSystem.getPluginDetails(searchResults[0].plugin.id);
        if (details) {
          // console.log(`📄 Plugin Details: ${details.info.manifest.name} - ${details.info.manifest.description}`);
        }
      }

    } catch (error) {
      // Error logging disabled for production
    }
  }

  /**
   * Demonstrate development workflow
   */
  private async demonstrateDevelopmentWorkflow(): Promise<void> {
    // console.log('\n🛠️ Development Workflow Demo...');

    try {
      // Create a new development project
      const projectId = await this.pluginSystem.createProject({
        id: 'my-dev-plugin',
        name: 'My Development Plugin',
        author: 'Developer',
        description: 'A plugin created in development mode',
        category: 'utility'
      });

      // Logging disabled for production

      // Generate a plugin template
      const template = this.pluginSystem.generateTemplate('basic');
      // console.log(`📝 Generated template with ${template.files.size} files`);

      // Build the project
      const buildResult = await this.pluginSystem.buildProject(projectId);
      // console.log(`🔨 Build ${buildResult.success ? 'successful' : 'failed'} in ${buildResult.buildTime}ms`);

      if (buildResult.success) {
        // Test the project
        const testResult = await this.pluginSystem.testProject(projectId);
        // console.log(`🧪 Tests ${testResult.success ? 'passed' : 'failed'} - ${testResult.tests.length} tests run`);

        // Install for testing
        if (testResult.success) {
          const testPluginId = await this.pluginSystem.installProjectForTesting(projectId);
          // console.log(`🚀 Installed for testing: ${testPluginId}`);
        }
      }

    } catch (error) {
      // Error logging disabled for production
    }
  }

  /**
   * Demonstrate security features
   */
  private demonstrateSecurityFeatures(): void {
    // console.log('\n🔒 Security Features Demo...');

    try {
      // Get security violations
      const violations = this.pluginSystem.getSecurityViolations();
      // console.log(`🚨 Security violations: ${violations.length}`);

      // Show violation details if any exist
      violations.forEach((violation, index) => {
        // Logging disabled for production
      });

      if (violations.length === 0) {
        // Logging disabled for production
      }

    } catch (error) {
      // Error logging disabled for production
    }
  }

  /**
   * Demonstrate system management features
   */
  private demonstrateSystemManagement(): void {
    // Logging disabled for production

    try {
      // Get system status
      const status = this.pluginSystem.getSystemStatus();
      // console.log('📊 System Status:', {
        initialized: status.initialized,
        totalPlugins: status.totalPlugins,
        enabledPlugins: status.enabledPlugins,
        marketplacePlugins: status.marketplacePlugins
      });

      // Get all plugins by status
      const enabledPlugins = this.pluginSystem.getPluginsByStatus('enabled');
      const installedPlugins = this.pluginSystem.getPluginsByStatus('installed');
      
      // console.log(`🟢 Enabled plugins: ${enabledPlugins.length}`);
      // console.log(`📦 Installed plugins: ${installedPlugins.length}`);

      // List plugin details
      enabledPlugins.forEach(plugin => {
        // Logging disabled for production
      });

    } catch (error) {
      // Error logging disabled for production
    }
  }

  /**
   * Demonstrate plugin interaction
   */
  async demonstratePluginInteraction(): Promise<void> {
    // console.log('\n🔗 Plugin Interaction Demo...');

    // Set up event listeners
    this.pluginSystem.on('plugin:enabled', (data) => {
      // console.log(`🟢 Plugin enabled: ${data.pluginId}`);
    });

    this.pluginSystem.on('plugin:disabled', (data) => {
      // console.log(`🔴 Plugin disabled: ${data.pluginId}`);
    });

    this.pluginSystem.on('security:violation', (violation) => {
      // console.log(`🚨 Security violation: ${violation.description}`);
    });

    // Logging disabled for production
  }

  /**
   * Export system configuration
   */
  async exportSystemData(): Promise<void> {
    // console.log('\n💾 Exporting System Data...');

    try {
      const exportData = await this.pluginSystem.exportSystem();
      // Logging disabled for production
      // console.log(`📅 Export timestamp: ${exportData.exportedAt}`);
      
      // In a real application, you would save this to a file
      // For demo purposes, we'll just show the size
      const dataSize = JSON.stringify(exportData).length;
      // console.log(`📊 Export size: ${(dataSize / 1024).toFixed(1)} KB`);
      
    } catch (error) {
      // Error logging disabled for production
    }
  }

  /**
   * Clean up and shutdown
   */
  async cleanup(): Promise<void> {
    // console.log('\n🧹 Cleaning up...');
    
    try {
      await this.pluginSystem.shutdown();
      // Logging disabled for production
    } catch (error) {
      // Error logging disabled for production
    }
  }
}

/**
 * Example Usage Function
 */
export async function runPluginSystemExample(): Promise<void> {
  const example = new PluginSystemExample();
  
  try {
    await example.runExample();
    await example.demonstratePluginInteraction();
    await example.exportSystemData();
  } finally {
    await example.cleanup();
  }
}

/**
 * Advanced Plugin Example - Text Processing Plugin
 */
export function createAdvancedPluginExample(): PluginPackage {
  const manifest: PluginManifest = {
    id: 'advanced-text-processor',
    name: 'Advanced Text Processor',
    version: '2.0.0',
    author: 'BEAR AI Advanced',
    description: 'Advanced text processing plugin with multiple algorithms',
    category: 'data',
    tags: ['text', 'processing', 'nlp', 'analysis'],
    permissions: [
      {
        type: 'storage',
        scope: 'processing-cache',
        description: 'Cache processed results',
        required: true
      },
      {
        type: 'api',
        scope: 'bear-ai',
        description: 'Access BEAR AI processing capabilities',
        required: true
      }
    ],
    minBearVersion: '1.0.0',
    entry: 'processor.js',
    sandboxType: 'worker',
    config: {
      enableCache: {
        type: 'boolean',
        label: 'Enable Result Caching',
        description: 'Cache processing results for faster repeated operations',
        default: true,
        required: false
      },
      maxCacheSize: {
        type: 'number',
        label: 'Maximum Cache Size (MB)',
        description: 'Maximum size of processing cache in megabytes',
        default: 10,
        validation: { min: 1, max: 100 },
        required: false
      },
      processingMode: {
        type: 'select',
        label: 'Processing Mode',
        description: 'Text processing algorithm to use',
        default: 'standard',
        options: [
          { value: 'standard', label: 'Standard Processing' },
          { value: 'advanced', label: 'Advanced NLP' },
          { value: 'ai', label: 'AI-Powered Analysis' }
        ],
        required: true
      }
    },
    license: 'MIT'
  };

  const pluginCode = `
    class AdvancedTextProcessor {
      constructor(api, config) {
        this.api = api;
        this.config = config;
        this.cache = new Map();
      }

      async initialize() {
        // Logging disabled for production
        
        // Load cache if enabled
        if (this.config.enableCache) {
          const savedCache = await this.api.storage.get('processing_cache');
          if (savedCache) {
            this.cache = new Map(savedCache);
          }
        }

        // Register processing methods
        this.api.events.on('text:process', this.processText.bind(this));
        this.api.events.on('text:analyze', this.analyzeText.bind(this));
      }

      async processText(text, options = {}) {
        const cacheKey = \`\${text}_\${JSON.stringify(options)}\`;
        
        // Check cache first
        if (this.config.enableCache && this.cache.has(cacheKey)) {
          return this.cache.get(cacheKey);
        }

        let result;
        switch (this.config.processingMode) {
          case 'advanced':
            result = await this.advancedProcess(text, options);
            break;
          case 'ai':
            result = await this.aiProcess(text, options);
            break;
          default:
            result = await this.standardProcess(text, options);
        }

        // Cache result
        if (this.config.enableCache) {
          this.cache.set(cacheKey, result);
          await this.saveCacheIfNeeded();
        }

        this.api.events.emit('text:processed', { text, result, options });
        return result;
      }

      async standardProcess(text, options) {
        return {
          originalText: text,
          wordCount: text.split(/\\s+/).length,
          characterCount: text.length,
          sentences: text.split(/[.!?]+/).filter(s => s.trim().length > 0).length,
          processed: true,
          processingTime: Date.now()
        };
      }

      async advancedProcess(text, options) {
        const basic = await this.standardProcess(text, options);
        
        return {
          ...basic,
          keywords: this.extractKeywords(text),
          sentiment: this.analyzeSentiment(text),
          complexity: this.calculateComplexity(text),
          readabilityScore: this.calculateReadability(text)
        };
      }

      async aiProcess(text, options) {
        const advanced = await this.advancedProcess(text, options);
        
        // Use BEAR AI for advanced analysis
        const aiAnalysis = await this.api.bear.analyze(text, 'text');
        
        return {
          ...advanced,
          aiInsights: aiAnalysis.results,
          confidence: aiAnalysis.confidence,
          aiMetadata: aiAnalysis.metadata
        };
      }

      extractKeywords(text) {
        // Simple keyword extraction
        const words = text.toLowerCase().split(/\\W+/);
        const wordCount = {};
        
        words.forEach(word => {
          if (word.length > 3) {
            wordCount[word] = (wordCount[word] || 0) + 1;
          }
        });

        return Object.entries(wordCount)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 10)
          .map(([word, count]) => ({ word, count }));
      }

      analyzeSentiment(text) {
        // Simple sentiment analysis
        const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic'];
        const negativeWords = ['bad', 'terrible', 'awful', 'horrible', 'disgusting', 'hate'];
        
        const words = text.toLowerCase().split(/\\W+/);
        let score = 0;
        
        words.forEach(word => {
          if (positiveWords.includes(word)) score += 1;
          if (negativeWords.includes(word)) score -= 1;
        });

        return {
          score,
          sentiment: score > 0 ? 'positive' : score < 0 ? 'negative' : 'neutral'
        };
      }

      calculateComplexity(text) {
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
        const totalWords = text.split(/\\s+/).length;
        const avgWordsPerSentence = totalWords / sentences.length;
        
        return {
          averageWordsPerSentence: avgWordsPerSentence,
          complexity: avgWordsPerSentence > 20 ? 'high' : avgWordsPerSentence > 15 ? 'medium' : 'low'
        };
      }

      calculateReadability(text) {
        // Simplified Flesch Reading Ease calculation
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
        const words = text.split(/\\s+/).length;
        const syllables = this.countSyllables(text);
        
        const score = 206.835 - (1.015 * (words / sentences)) - (84.6 * (syllables / words));
        
        return {
          score: Math.round(score),
          level: score >= 90 ? 'Very Easy' : score >= 80 ? 'Easy' : 
                 score >= 70 ? 'Fairly Easy' : score >= 60 ? 'Standard' : 
                 score >= 50 ? 'Fairly Difficult' : 'Difficult'
        };
      }

      countSyllables(text) {
        // Simple syllable counting
        const words = text.toLowerCase().match(/\\b\\w+\\b/g) || [];
        let syllables = 0;
        
        words.forEach(word => {
          syllables += Math.max(1, word.match(/[aeiouy]+/g)?.length || 1);
        });
        
        return syllables;
      }

      async saveCacheIfNeeded() {
        if (this.cache.size > 0 && this.cache.size % 10 === 0) {
          await this.api.storage.set('processing_cache', Array.from(this.cache.entries()));
        }
      }

      async clearCache() {
        this.cache.clear();
        await this.api.storage.remove('processing_cache');
        this.api.ui.showNotification('Cache cleared', 'info');
      }

      onConfigUpdate(newConfig) {
        this.config = newConfig;
        
        if (!newConfig.enableCache) {
          this.clearCache();
        }
      }

      destroy() {
        if (this.config.enableCache && this.cache.size > 0) {
          this.api.storage.set('processing_cache', Array.from(this.cache.entries()));
        }
      }
    }

    return AdvancedTextProcessor;
  `;

  return {
    manifest,
    files: new Map([
      ['processor.js', pluginCode],
      ['README.md', `# ${manifest.name}\n\n${manifest.description}\n\n## Features\n- Multiple processing modes\n- Keyword extraction\n- Sentiment analysis\n- Readability scoring\n- Intelligent caching\n\n## Configuration\n- Enable/disable caching\n- Adjust cache size\n- Select processing mode`]
    ])
  };
}
