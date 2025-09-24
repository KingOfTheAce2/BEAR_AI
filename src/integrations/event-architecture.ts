/**
 * BEAR AI Event-Driven Architecture
 * Real-time coordination system for multi-agent scenarios
 * 
 * @file Event-driven architecture for BEAR AI agent coordination
 * @version 1.0.0
 */

interface EventPayload {
  id: string
  timestamp: Date
  source: string
  type: string
  data: any
  priority: 'low' | 'medium' | 'high' | 'critical'
  correlationId?: string
  sessionId?: string
}

interface EventSubscription {
  id: string
  eventType: string
  handler: (payload: EventPayload) => void | Promise<void>
  filter?: (payload: EventPayload) => boolean
  priority: number
  once?: boolean
}

interface EventMetrics {
  totalEvents: number
  eventsPerSecond: number
  averageProcessingTime: number
  errorRate: number
  eventsByType: Record<string, number>
  slowHandlers: Array<{
    subscriptionId: string
    eventType: string
    processingTime: number
  }>
}

/**
 * Event Bus for BEAR AI
 * Provides pub/sub messaging for real-time agent coordination
 */
export class BearEventBus {
  private subscriptions: Map<string, EventSubscription[]> = new Map()
  private eventHistory: EventPayload[] = []
  private metrics: EventMetrics = {
    totalEvents: 0,
    eventsPerSecond: 0,
    averageProcessingTime: 0,
    errorRate: 0,
    eventsByType: {},
    slowHandlers: []
  }
  private metricsInterval?: NodeJS.Timeout
  private eventQueue: EventPayload[] = []
  private processing = false
  private maxHistorySize = 1000
  private maxQueueSize = 10000

  constructor() {
    this.startMetricsCollection()
  }

  /**
   * Subscribe to events
   */
  subscribe(
    eventType: string,
    handler: (payload: EventPayload) => void | Promise<void>,
    options: {
      filter?: (payload: EventPayload) => boolean
      priority?: number
      once?: boolean
    } = {}
  ): string {
    const subscriptionId = `sub-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    const subscription: EventSubscription = {
      id: subscriptionId,
      eventType,
      handler,
      filter: options.filter,
      priority: options.priority || 0,
      once: options.once || false
    }

    if (!this.subscriptions.has(eventType)) {
      this.subscriptions.set(eventType, [])
    }

    const subs = this.subscriptions.get(eventType)!
    subs.push(subscription)
    
    // Sort by priority (higher priority first)
    subs.sort((a, b) => b.priority - a.priority)

    // console.log(`Subscribed to ${eventType} with ID ${subscriptionId}`)
    return subscriptionId
  }

  /**
   * Unsubscribe from events
   */
  unsubscribe(subscriptionId: string): boolean {
    for (const [eventType, subs] of this.subscriptions.entries()) {
      const index = subs.findIndex(sub => sub.id === subscriptionId)
      if (index !== -1) {
        subs.splice(index, 1)
        if (subs.length === 0) {
          this.subscriptions.delete(eventType)
        }
        // console.log(`Unsubscribed ${subscriptionId} from ${eventType}`)
        return true
      }
    }
    return false
  }

  /**
   * Emit an event
   */
  async emit(
    eventType: string,
    data: any,
    options: {
      source?: string
      priority?: EventPayload['priority']
      correlationId?: string
      sessionId?: string
    } = {}
  ): Promise<void> {
    const payload: EventPayload = {
      id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      type: eventType,
      source: options.source || 'unknown',
      data,
      priority: options.priority || 'medium',
      correlationId: options.correlationId,
      sessionId: options.sessionId
    }

    // Add to queue for processing
    if (this.eventQueue.length >= this.maxQueueSize) {
      // console.warn('Event queue is full, dropping oldest events')
      this.eventQueue.shift()
    }
    
    this.eventQueue.push(payload)
    
    // Process queue if not already processing
    if (!this.processing) {
      this.processEventQueue()
    }
  }

  /**
   * Emit event synchronously (for critical events)
   */
  async emitSync(
    eventType: string,
    data: any,
    options: {
      source?: string
      priority?: EventPayload['priority']
      correlationId?: string
      sessionId?: string
    } = {}
  ): Promise<void> {
    const payload: EventPayload = {
      id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      type: eventType,
      source: options.source || 'unknown',
      data,
      priority: options.priority || 'critical',
      correlationId: options.correlationId,
      sessionId: options.sessionId
    }

    await this.processEvent(payload)
  }

  /**
   * Get event history
   */
  getEventHistory(
    filter?: {
      eventType?: string
      source?: string
      since?: Date
      correlationId?: string
      sessionId?: string
    }
  ): EventPayload[] {
    let events = this.eventHistory

    if (filter) {
      events = events.filter(event => {
        if (filter.eventType && event.type !== filter.eventType) return false
        if (filter.source && event.source !== filter.source) return false
        if (filter.since && event.timestamp < filter.since) return false
        if (filter.correlationId && event.correlationId !== filter.correlationId) return false
        if (filter.sessionId && event.sessionId !== filter.sessionId) return false
        return true
      })
    }

    return events
  }

  /**
   * Get event metrics
   */
  getMetrics(): EventMetrics {
    return { ...this.metrics }
  }

  /**
   * Clear event history
   */
  clearHistory(): void {
    this.eventHistory = []
    // console.log('Event history cleared')
  }

  /**
   * Wait for specific event
   */
  waitFor(
    eventType: string,
    options: {
      timeout?: number
      filter?: (payload: EventPayload) => boolean
    } = {}
  ): Promise<EventPayload> {
    return new Promise((resolve, reject) => {
      const timeout = options.timeout || 30000
      let subscriptionId: string

      const timeoutHandle = setTimeout(() => {
        if (subscriptionId) {
          this.unsubscribe(subscriptionId)
        }
        reject(new Error(`Timeout waiting for event ${eventType}`))
      }, timeout)

      subscriptionId = this.subscribe(
        eventType,
        (payload) => {
          if (!options.filter || options.filter(payload)) {
            clearTimeout(timeoutHandle)
            this.unsubscribe(subscriptionId)
            resolve(payload)
          }
        },
        { once: true }
      )
    })
  }

  /**
   * Process event queue
   */
  private async processEventQueue(): Promise<void> {
    if (this.processing) return
    
    this.processing = true

    try {
      while (this.eventQueue.length > 0) {
        // Sort queue by priority
        this.eventQueue.sort((a, b) => {
          const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 }
          return priorityOrder[b.priority] - priorityOrder[a.priority]
        })

        const event = this.eventQueue.shift()!
        await this.processEvent(event)
      }
    } finally {
      this.processing = false
    }
  }

  /**
   * Process individual event
   */
  private async processEvent(payload: EventPayload): Promise<void> {
    const startTime = Date.now()
    
    try {
      // Update metrics
      this.metrics.totalEvents++
      this.metrics.eventsByType[payload.type] = (this.metrics.eventsByType[payload.type] || 0) + 1

      // Add to history
      this.eventHistory.push(payload)
      if (this.eventHistory.length > this.maxHistorySize) {
        this.eventHistory.shift()
      }

      // Get subscribers
      const subscribers = this.subscriptions.get(payload.type) || []
      
      if (subscribers.length === 0) {
        // console.warn(`No subscribers for event type: ${payload.type}`)
        return
      }

      // Process subscribers in parallel but respect priority
      const subscriberPromises = subscribers.map(async (subscription) => {
        try {
          // Apply filter if present
          if (subscription.filter && !subscription.filter(payload)) {
            return
          }

          const handlerStartTime = Date.now()
          
          // Execute handler
          await subscription.handler(payload)
          
          const handlerDuration = Date.now() - handlerStartTime
          
          // Track slow handlers
          if (handlerDuration > 1000) { // > 1 second
            this.metrics.slowHandlers.push({
              subscriptionId: subscription.id,
              eventType: payload.type,
              processingTime: handlerDuration
            })
            
            // Keep only latest 10 slow handlers
            if (this.metrics.slowHandlers.length > 10) {
              this.metrics.slowHandlers.shift()
            }
          }

          // Remove one-time subscribers
          if (subscription.once) {
            this.unsubscribe(subscription.id)
          }

        } catch (error) {
          // console.error(`Error in event handler for ${payload.type}:`, error)
          this.metrics.errorRate++
        }
      })

      await Promise.all(subscriberPromises)

      // Update processing time metrics
      const processingTime = Date.now() - startTime
      const currentAvg = this.metrics.averageProcessingTime
      const totalEvents = this.metrics.totalEvents
      this.metrics.averageProcessingTime = (currentAvg * (totalEvents - 1) + processingTime) / totalEvents

    } catch (error) {
      // console.error('Error processing event:', error)
      this.metrics.errorRate++
    }
  }

  /**
   * Start metrics collection
   */
  private startMetricsCollection(): void {
    let lastEventCount = 0
    let lastTimestamp = Date.now()

    this.metricsInterval = setInterval(() => {
      const currentTime = Date.now()
      const timeDelta = (currentTime - lastTimestamp) / 1000 // seconds
      const eventsDelta = this.metrics.totalEvents - lastEventCount

      this.metrics.eventsPerSecond = eventsDelta / timeDelta

      lastEventCount = this.metrics.totalEvents
      lastTimestamp = currentTime

      // Reset error rate periodically
      if (this.metrics.totalEvents > 0) {
        this.metrics.errorRate = this.metrics.errorRate / this.metrics.totalEvents
      }

    }, 10000) // Update every 10 seconds
  }

  /**
   * Dispose of the event bus
   */
  dispose(): void {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval)
    }
    
    this.subscriptions.clear()
    this.eventHistory = []
    this.eventQueue = []
    
    // console.log('Event bus disposed')
  }
}

/**
 * Agent Coordination Events
 */
export class AgentCoordinationEvents {
  constructor(private eventBus: BearEventBus) {}

  // Agent lifecycle events
  onAgentSpawned(handler: (agent: any) => void): string {
    return this.eventBus.subscribe('agent:spawned', (payload) => {
      handler(payload.data.agent)
    })
  }

  onAgentStopped(handler: (agent: any) => void): string {
    return this.eventBus.subscribe('agent:stopped', (payload) => {
      handler(payload.data.agent)
    })
  }

  onAgentError(handler: (error: { agent: any; error: string }) => void): string {
    return this.eventBus.subscribe('agent:error', (payload) => {
      handler(payload.data)
    })
  }

  // Task coordination events
  onTaskAssigned(handler: (task: any) => void): string {
    return this.eventBus.subscribe('task:assigned', (payload) => {
      handler(payload.data.task)
    })
  }

  onTaskStarted(handler: (task: any) => void): string {
    return this.eventBus.subscribe('task:started', (payload) => {
      handler(payload.data.task)
    })
  }

  onTaskCompleted(handler: (result: { task: any; result: any }) => void): string {
    return this.eventBus.subscribe('task:completed', (payload) => {
      handler(payload.data)
    })
  }

  onTaskFailed(handler: (error: { task: any; error: string }) => void): string {
    return this.eventBus.subscribe('task:failed', (payload) => {
      handler(payload.data)
    })
  }

  // Document processing events
  onDocumentUploaded(handler: (document: any) => void): string {
    return this.eventBus.subscribe('document:uploaded', (payload) => {
      handler(payload.data.document)
    })
  }

  onDocumentProcessed(handler: (result: { document: any; analysis: any }) => void): string {
    return this.eventBus.subscribe('document:processed', (payload) => {
      handler(payload.data)
    })
  }

  onDocumentError(handler: (error: { document: any; error: string }) => void): string {
    return this.eventBus.subscribe('document:error', (payload) => {
      handler(payload.data)
    })
  }

  // Model management events
  onModelLoaded(handler: (model: any) => void): string {
    return this.eventBus.subscribe('model:loaded', (payload) => {
      handler(payload.data.model)
    })
  }

  onModelUnloaded(handler: (model: any) => void): string {
    return this.eventBus.subscribe('model:unloaded', (payload) => {
      handler(payload.data.model)
    })
  }

  onModelError(handler: (error: { model: any; error: string }) => void): string {
    return this.eventBus.subscribe('model:error', (payload) => {
      handler(payload.data)
    })
  }

  // System events
  onMemoryWarning(handler: (warning: { usage: number; threshold: number }) => void): string {
    return this.eventBus.subscribe('system:memory-warning', (payload) => {
      handler(payload.data)
    }, { priority: 10 })
  }

  onSystemError(handler: (error: string) => void): string {
    return this.eventBus.subscribe('system:error', (payload) => {
      handler(payload.data.error)
    }, { priority: 20 })
  }

  // Emit methods
  async emitAgentSpawned(agent: any, sessionId?: string): Promise<void> {
    await this.eventBus.emit('agent:spawned', { agent }, {
      source: 'agent-coordinator',
      priority: 'medium',
      sessionId
    })
  }

  async emitTaskCompleted(task: any, result: any, sessionId?: string): Promise<void> {
    await this.eventBus.emit('task:completed', { task, result }, {
      source: 'task-manager',
      priority: 'high',
      sessionId
    })
  }

  async emitDocumentProcessed(document: any, analysis: any, sessionId?: string): Promise<void> {
    await this.eventBus.emit('document:processed', { document, analysis }, {
      source: 'document-processor',
      priority: 'medium',
      sessionId
    })
  }

  async emitMemoryWarning(usage: number, threshold: number): Promise<void> {
    await this.eventBus.emitSync('system:memory-warning', { usage, threshold }, {
      source: 'memory-optimizer',
      priority: 'critical'
    })
  }
}

/**
 * Real-time State Synchronization
 */
export class StateSync {
  private eventBus: BearEventBus
  private syncInterval?: NodeJS.Timeout
  private lastSyncTime = 0
  private pendingUpdates: Map<string, any> = new Map()

  constructor(eventBus: BearEventBus) {
    this.eventBus = eventBus
    this.setupSyncHandlers()
    this.startPeriodicSync()
  }

  /**
   * Sync state change
   */
  async syncStateChange(
    stateKey: string,
    newValue: any,
    options: {
      immediate?: boolean
      sessionId?: string
    } = {}
  ): Promise<void> {
    this.pendingUpdates.set(stateKey, newValue)

    if (options.immediate) {
      await this.flushPendingUpdates(options.sessionId)
    }
  }

  /**
   * Listen for state changes
   */
  onStateChange(
    stateKey: string,
    handler: (newValue: any, oldValue?: any) => void
  ): string {
    return this.eventBus.subscribe(`state:${stateKey}`, (payload) => {
      handler(payload.data.newValue, payload.data.oldValue)
    })
  }

  private setupSyncHandlers(): void {
    // Handle incoming state sync requests
    this.eventBus.subscribe('state:sync-request', async (payload) => {
      await this.flushPendingUpdates(payload.sessionId)
    })

    // Handle state conflicts
    this.eventBus.subscribe('state:conflict', (payload) => {
      // console.warn('State conflict detected:', payload.data)
      // Implement conflict resolution logic here
    })
  }

  private startPeriodicSync(): void {
    this.syncInterval = setInterval(() => {
      if (this.pendingUpdates.size > 0) {
        this.flushPendingUpdates()
      }
    }, 1000) // Sync every second
  }

  private async flushPendingUpdates(sessionId?: string): Promise<void> {
    if (this.pendingUpdates.size === 0) return

    const updates = Array.from(this.pendingUpdates.entries())
    this.pendingUpdates.clear()

    for (const [stateKey, newValue] of updates) {
      await this.eventBus.emit(`state:${stateKey}`, {
        newValue,
        timestamp: Date.now()
      }, {
        source: 'state-sync',
        priority: 'medium',
        sessionId
      })
    }

    this.lastSyncTime = Date.now()
  }

  dispose(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
    }
    this.pendingUpdates.clear()
  }
}

// Global instances
export const bearEventBus = new BearEventBus()
export const agentEvents = new AgentCoordinationEvents(bearEventBus)
export const stateSync = new StateSync(bearEventBus)

// Utility functions
export const createCorrelatedEvents = () => {
  const correlationId = `corr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  
  return {
    correlationId,
    emit: (eventType: string, data: any, options: any = {}) =>
      bearEventBus.emit(eventType, data, { ...options, correlationId }),
    waitFor: (eventType: string, options: any = {}) =>
      bearEventBus.waitFor(eventType, { 
        ...options, 
        filter: (payload) => payload.correlationId === correlationId 
      })
  }
}