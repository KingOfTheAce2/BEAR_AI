/**
 * BEAR AI Plugin Architecture
 * Based on jan-dev extension system patterns
 * 
 * @file Plugin system for BEAR AI extensibility
 * @version 1.0.0
 */

export interface PluginManifest {
  name: string
  version: string
  description: string
  author: string
  engine?: string
  main: string
  module?: string
  dependencies?: Record<string, string>
  capabilities: PluginCapability[]
  settings?: PluginSetting[]
  license?: string
}

export interface PluginCapability {
  type: 'inference' | 'document-processing' | 'ui-component' | 'data-connector' | 'agent-coordinator'
  name: string
  description: string
  version: string
}

export interface PluginSetting {
  key: string
  type: 'string' | 'number' | 'boolean' | 'select'
  title: string
  description: string
  defaultValue: any
  options?: Array<{ value: any; label: string }>
  required?: boolean
}

export interface PluginContext {
  bearAI: {
    version: string
    dataPath: string
    configPath: string
  }
  logger: {
    info: (message: string, ...args: any[]) => void
    warn: (message: string, ...args: any[]) => void
    error: (message: string, ...args: any[]) => void
  }
  events: {
    emit: (event: string, data?: any) => void
    on: (event: string, handler: (data: any) => void) => () => void
  }
  storage: {
    get: (key: string) => Promise<any>
    set: (key: string, value: any) => Promise<void>
    delete: (key: string) => Promise<void>
  }
}

export abstract class BearPlugin {
  protected context: PluginContext
  protected manifest: PluginManifest
  protected settings: Map<string, any> = new Map()

  constructor(context: PluginContext, manifest: PluginManifest) {
    this.context = context
    this.manifest = manifest
  }

  /**
   * Plugin lifecycle: Initialize plugin
   */
  abstract onLoad(): Promise<void>

  /**
   * Plugin lifecycle: Cleanup plugin
   */
  abstract onUnload(): Promise<void>

  /**
   * Get plugin setting value
   */
  protected getSetting<T>(key: string, defaultValue?: T): T {
    return this.settings.get(key) ?? defaultValue
  }

  /**
   * Update plugin setting
   */
  protected async setSetting<T>(key: string, value: T): Promise<void> {
    this.settings.set(key, value)
    await this.context.storage.set(`plugin:${this.manifest.name}:${key}`, value)
  }

  /**
   * Get plugin manifest
   */
  getManifest(): PluginManifest {
    return this.manifest
  }

  /**
   * Get plugin capabilities
   */
  getCapabilities(): PluginCapability[] {
    return this.manifest.capabilities
  }
}

/**
 * Legal Document Processing Plugin
 */
export abstract class LegalDocumentPlugin extends BearPlugin {
  abstract processDocument(
    content: string,
    type: 'pdf' | 'docx' | 'txt',
    options?: any
  ): Promise<{
    extractedText: string
    metadata: Record<string, any>
    analysis?: any
  }>

  abstract analyzeContract(content: string): Promise<{
    keyTerms: string[]
    obligations: Array<{ party: string; obligation: string }>
    risks: string[]
    recommendations: string[]
  }>

  abstract detectPII(content: string): Promise<{
    entities: Array<{ type: string; value: string; confidence: number }>
    scrubbedContent: string
  }>
}

/**
 * Agent Coordination Plugin
 */
export abstract class AgentCoordinationPlugin extends BearPlugin {
  abstract spawnAgent(
    type: string,
    config: any
  ): Promise<{ id: string; status: string }>

  abstract coordinateAgents(
    agents: string[],
    task: string
  ): Promise<{ results: Record<string, any> }>

  abstract getAgentStatus(agentId: string): Promise<{
    id: string
    type: string
    status: 'idle' | 'busy' | 'error'
    currentTask?: string
  }>
}

/**
 * Plugin Manager
 */
export class PluginManager {
  private plugins: Map<string, BearPlugin> = new Map()
  private pluginContexts: Map<string, PluginContext> = new Map()
  private eventHandlers: Map<string, Set<(data: any) => void>> = new Map()

  constructor(private dataPath: string) {}

  /**
   * Load a plugin
   */
  async loadPlugin(manifest: PluginManifest, pluginClass: new (context: PluginContext, manifest: PluginManifest) => BearPlugin): Promise<void> {
    try {
      // Create plugin context
      const context = this.createPluginContext(manifest.name)
      this.pluginContexts.set(manifest.name, context)

      // Create plugin instance
      const plugin = new pluginClass(context, manifest)
      
      // Load plugin settings
      await this.loadPluginSettings(plugin)
      
      // Initialize plugin
      await plugin.onLoad()
      
      // Register plugin
      this.plugins.set(manifest.name, plugin)
      
      context.logger.info(`Plugin ${manifest.name} loaded successfully`)
      this.emit('plugin:loaded', { name: manifest.name, plugin })
      
    } catch (error) {
      console.error(`Failed to load plugin ${manifest.name}:`, error)
      throw error
    }
  }

  /**
   * Unload a plugin
   */
  async unloadPlugin(pluginName: string): Promise<void> {
    const plugin = this.plugins.get(pluginName)
    if (!plugin) {
      throw new Error(`Plugin ${pluginName} not found`)
    }

    try {
      await plugin.onUnload()
      this.plugins.delete(pluginName)
      this.pluginContexts.delete(pluginName)
      
      console.log(`Plugin ${pluginName} unloaded successfully`)
      this.emit('plugin:unloaded', { name: pluginName })
      
    } catch (error) {
      console.error(`Failed to unload plugin ${pluginName}:`, error)
      throw error
    }
  }

  /**
   * Get plugin by name
   */
  getPlugin<T extends BearPlugin>(pluginName: string): T | undefined {
    return this.plugins.get(pluginName) as T
  }

  /**
   * Get plugins by capability
   */
  getPluginsByCapability(capabilityType: string): BearPlugin[] {
    return Array.from(this.plugins.values()).filter(plugin =>
      plugin.getCapabilities().some(cap => cap.type === capabilityType)
    )
  }

  /**
   * List all loaded plugins
   */
  listPlugins(): PluginManifest[] {
    return Array.from(this.plugins.values()).map(plugin => plugin.getManifest())
  }

  /**
   * Emit event to all plugins
   */
  emit(event: string, data?: any): void {
    const handlers = this.eventHandlers.get(event)
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data)
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error)
        }
      })
    }
  }

  private createPluginContext(pluginName: string): PluginContext {
    return {
      bearAI: {
        version: '1.0.0',
        dataPath: this.dataPath,
        configPath: `${this.dataPath}/config`
      },
      logger: {
        info: (message: string, ...args: any[]) => {
          console.log(`[${pluginName}] ${message}`, ...args)
        },
        warn: (message: string, ...args: any[]) => {
          console.warn(`[${pluginName}] ${message}`, ...args)
        },
        error: (message: string, ...args: any[]) => {
          console.error(`[${pluginName}] ${message}`, ...args)
        }
      },
      events: {
        emit: (event: string, data?: any) => {
          this.emit(`plugin:${pluginName}:${event}`, data)
        },
        on: (event: string, handler: (data: any) => void) => {
          const fullEvent = `plugin:${pluginName}:${event}`
          if (!this.eventHandlers.has(fullEvent)) {
            this.eventHandlers.set(fullEvent, new Set())
          }
          this.eventHandlers.get(fullEvent)!.add(handler)
          
          return () => {
            this.eventHandlers.get(fullEvent)?.delete(handler)
          }
        }
      },
      storage: {
        get: async (key: string) => {
          // Implementation would use actual storage
          return undefined
        },
        set: async (key: string, value: any) => {
          // Implementation would use actual storage
        },
        delete: async (key: string) => {
          // Implementation would use actual storage
        }
      }
    }
  }

  private async loadPluginSettings(plugin: BearPlugin): Promise<void> {
    const manifest = plugin.getManifest()
    if (manifest.settings) {
      for (const setting of manifest.settings) {
        try {
          const value = await plugin['context'].storage.get(
            `plugin:${manifest.name}:${setting.key}`
          )
          if (value !== undefined) {
            plugin['settings'].set(setting.key, value)
          } else {
            plugin['settings'].set(setting.key, setting.defaultValue)
          }
        } catch (error) {
          console.warn(`Failed to load setting ${setting.key} for plugin ${manifest.name}:`, error)
          plugin['settings'].set(setting.key, setting.defaultValue)
        }
      }
    }
  }
}

/**
 * Built-in Legal Document Plugin
 */
export class BearLegalDocumentPlugin extends LegalDocumentPlugin {
  async onLoad(): Promise<void> {
    this.context.logger.info('Legal Document Plugin loaded')
  }

  async onUnload(): Promise<void> {
    this.context.logger.info('Legal Document Plugin unloaded')
  }

  async processDocument(
    content: string,
    type: 'pdf' | 'docx' | 'txt',
    options?: any
  ): Promise<{
    extractedText: string
    metadata: Record<string, any>
    analysis?: any
  }> {
    // Mock implementation - would integrate with actual document processing
    return {
      extractedText: content,
      metadata: {
        type,
        processedAt: new Date().toISOString(),
        wordCount: content.split(/\s+/).length
      }
    }
  }

  async analyzeContract(content: string): Promise<{
    keyTerms: string[]
    obligations: Array<{ party: string; obligation: string }>
    risks: string[]
    recommendations: string[]
  }> {
    // Mock contract analysis - would use LLM for actual analysis
    return {
      keyTerms: ['payment terms', 'termination clause', 'liability'],
      obligations: [
        { party: 'Party A', obligation: 'Deliver services as specified' },
        { party: 'Party B', obligation: 'Make payments according to schedule' }
      ],
      risks: ['Unlimited liability', 'Vague termination terms'],
      recommendations: ['Add liability cap', 'Clarify termination process']
    }
  }

  async detectPII(content: string): Promise<{
    entities: Array<{ type: string; value: string; confidence: number }>
    scrubbedContent: string
  }> {
    // Mock PII detection - would use actual PII detection service
    const entities = []
    let scrubbedContent = content

    // Simple email detection
    const emailRegex = /[\w.-]+@[\w.-]+\.\w+/g
    const emails = content.match(emailRegex) || []
    for (const email of emails) {
      entities.push({ type: 'EMAIL', value: email, confidence: 0.95 })
      scrubbedContent = scrubbedContent.replace(email, '[REDACTED_EMAIL]')
    }

    return { entities, scrubbedContent }
  }
}

/**
 * Built-in Agent Coordination Plugin
 */
export class BearAgentCoordinationPlugin extends AgentCoordinationPlugin {
  private agents: Map<string, any> = new Map()

  async onLoad(): Promise<void> {
    this.context.logger.info('Agent Coordination Plugin loaded')
  }

  async onUnload(): Promise<void> {
    this.context.logger.info('Agent Coordination Plugin unloaded')
  }

  async spawnAgent(
    type: string,
    config: any
  ): Promise<{ id: string; status: string }> {
    const agentId = `${type}-${Date.now()}`
    
    this.agents.set(agentId, {
      id: agentId,
      type,
      config,
      status: 'idle',
      createdAt: new Date()
    })

    this.context.logger.info(`Spawned agent ${agentId} of type ${type}`)
    return { id: agentId, status: 'idle' }
  }

  async coordinateAgents(
    agents: string[],
    task: string
  ): Promise<{ results: Record<string, any> }> {
    const results: Record<string, any> = {}
    
    for (const agentId of agents) {
      const agent = this.agents.get(agentId)
      if (agent) {
        // Mock task execution
        agent.status = 'busy'
        agent.currentTask = task
        
        // Simulate work
        await new Promise(resolve => setTimeout(resolve, 100))
        
        results[agentId] = {
          status: 'completed',
          result: `Agent ${agentId} completed task: ${task}`
        }
        
        agent.status = 'idle'
        delete agent.currentTask
      }
    }

    return { results }
  }

  async getAgentStatus(agentId: string): Promise<{
    id: string
    type: string
    status: 'idle' | 'busy' | 'error'
    currentTask?: string
  }> {
    const agent = this.agents.get(agentId)
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`)
    }

    return {
      id: agent.id,
      type: agent.type,
      status: agent.status,
      currentTask: agent.currentTask
    }
  }
}