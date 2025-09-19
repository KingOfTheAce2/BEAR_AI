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

export interface ContractAnalysis {
  keyTerms: Array<{
    term: string
    definition?: string
    importance: 'high' | 'medium' | 'low'
    location: { section: string; paragraph: number }
  }>
  parties: Array<{
    name: string
    role: 'primary' | 'secondary' | 'guarantor' | 'witness'
    obligations: string[]
    rights: string[]
  }>
  obligations: Array<{
    party: string
    obligation: string
    deadline?: Date
    penalty?: string
    status: 'pending' | 'fulfilled' | 'breached' | 'disputed'
  }>
  risks: Array<{
    type: 'legal' | 'financial' | 'operational' | 'reputational'
    description: string
    severity: 'low' | 'medium' | 'high' | 'critical'
    mitigation?: string
    probability: number
    impact: number
  }>
  clauses: Array<{
    type: 'termination' | 'liability' | 'indemnification' | 'force-majeure' | 'governing-law' | 'other'
    content: string
    assessment: 'favorable' | 'neutral' | 'unfavorable' | 'requires-attention'
    recommendations?: string[]
  }>
  compliance: Array<{
    regulation: string
    status: 'compliant' | 'non-compliant' | 'requires-review' | 'not-applicable'
    details?: string
    remediation?: string[]
  }>
  recommendations: Array<{
    type: 'amendment' | 'negotiation' | 'approval' | 'rejection' | 'review'
    priority: 'low' | 'medium' | 'high' | 'critical'
    description: string
    rationale: string
    impact: string
  }>
  summary: {
    overview: string
    keyPoints: string[]
    riskScore: number
    recommendedAction: 'approve' | 'negotiate' | 'reject' | 'review'
    confidence: number
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

  abstract analyzeContract(
    content: string,
    options?: {
      jurisdiction?: string
      contractType?: string
      focusAreas?: string[]
    }
  ): Promise<ContractAnalysis>

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

  async analyzeContract(
    content: string,
    options?: {
      jurisdiction?: string
      contractType?: string
      focusAreas?: string[]
    }
  ): Promise<ContractAnalysis> {
    const contractLabel = options?.contractType ?? 'agreement'
    const normalizedContent = content.toLowerCase()
    const includesLiability = normalizedContent.includes('liability')

    return {
      keyTerms: [
        {
          term: 'Payment Terms',
          definition: 'Schedule and method for compensation between parties',
          importance: 'high',
          location: { section: 'Financial Terms', paragraph: 1 }
        },
        {
          term: 'Termination',
          definition: 'Conditions under which the contract may be ended',
          importance: 'medium',
          location: { section: 'General Provisions', paragraph: 4 }
        },
        includesLiability
          ? {
              term: 'Liability Limitation',
              definition: 'Caps or exclusions on party liability',
              importance: 'high',
              location: { section: 'Liability', paragraph: 2 }
            }
          : {
              term: 'Confidentiality',
              definition: 'Restrictions on information disclosure',
              importance: 'medium',
              location: { section: 'Confidentiality', paragraph: 1 }
            }
      ],
      parties: [
        {
          name: 'Party A',
          role: 'primary',
          obligations: ['Deliver services as specified', 'Provide monthly status reports'],
          rights: ['Receive timely payment', 'Request scope clarifications']
        },
        {
          name: 'Party B',
          role: 'secondary',
          obligations: ['Make payments according to schedule', 'Provide necessary access and information'],
          rights: ['Review deliverables', 'Request revisions within scope']
        }
      ],
      obligations: [
        {
          party: 'Party A',
          obligation: 'Complete project milestones on the agreed timeline',
          deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          status: 'pending'
        },
        {
          party: 'Party B',
          obligation: 'Submit payment within 30 days of invoice',
          penalty: '1.5% monthly interest on late payments',
          status: 'pending'
        }
      ],
      risks: [
        {
          type: 'legal',
          description: includesLiability
            ? 'Potential exposure due to unlimited liability language'
            : 'Review confidentiality obligations for completeness',
          severity: includesLiability ? 'high' : 'medium',
          mitigation: includesLiability
            ? 'Introduce explicit liability cap aligned with industry standards'
            : 'Define confidentiality term and permitted disclosures',
          probability: includesLiability ? 0.4 : 0.3,
          impact: includesLiability ? 0.7 : 0.5
        },
        {
          type: 'financial',
          description: 'Payment schedule may affect cash flow predictability',
          severity: 'medium',
          mitigation: 'Align invoicing cadence with internal budgeting process',
          probability: 0.5,
          impact: 0.6
        }
      ],
      clauses: [
        {
          type: 'termination',
          content: 'Either party may terminate with 30 days written notice.',
          assessment: 'neutral',
          recommendations: ['Clarify termination for cause and cure periods']
        },
        {
          type: includesLiability ? 'liability' : 'other',
          content: includesLiability
            ? 'Liability is unlimited for all damages without exclusions.'
            : 'Parties agree to maintain confidentiality for three years.',
          assessment: includesLiability ? 'requires-attention' : 'favorable',
          recommendations: includesLiability
            ? ['Negotiate liability cap proportional to contract value']
            : ['Confirm confidentiality aligns with regulatory requirements']
        }
      ],
      compliance: [
        {
          regulation: options?.jurisdiction ? `General standards (${options.jurisdiction})` : 'General standards',
          status: includesLiability ? 'requires-review' : 'compliant',
          details: includesLiability
            ? 'Liability language should be reviewed against applicable statutory limitations.'
            : 'Key contractual protections align with standard practice.',
          remediation: includesLiability
            ? ['Introduce liability cap', 'Document indemnification carve-outs']
            : undefined
        }
      ],
      recommendations: [
        {
          type: includesLiability ? 'negotiation' : 'review',
          priority: includesLiability ? 'high' : 'medium',
          description: includesLiability
            ? 'Negotiate liability limitations to reduce potential exposure.'
            : 'Validate confidentiality obligations against internal policies.',
          rationale: includesLiability
            ? 'Unlimited liability may create disproportionate financial risk.'
            : 'Ensures sensitive data protections meet organizational standards.',
          impact: includesLiability ? 'Reduces downside risk from catastrophic events.' : 'Maintains compliance posture.'
        },
        {
          type: 'amendment',
          priority: 'medium',
          description: 'Document detailed payment milestones and acceptance criteria.',
          rationale: 'Improves transparency for deliverables and billing.',
          impact: 'Enhances accountability and reduces payment disputes.'
        }
      ],
      summary: {
        overview: `Baseline analysis for ${contractLabel} involving two parties`,
        keyPoints: [
          'Identified payment and termination clauses as primary negotiation levers.',
          includesLiability
            ? 'Unlimited liability detected and flagged for immediate review.'
            : 'Confidentiality obligations appear balanced for both parties.',
          'Recommended actions prepared for next negotiation cycle.'
        ],
        riskScore: includesLiability ? 68 : 45,
        recommendedAction: includesLiability ? 'negotiate' : 'review',
        confidence: includesLiability ? 0.78 : 0.85
      }
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