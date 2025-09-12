/**
 * BEAR AI Memory Safety System
 * Comprehensive RAM monitoring and safety margin management
 * 
 * @file Core memory safety architecture for BEAR AI
 * @version 2.0.0
 */

import { EventEmitter } from 'events'

// ==================== INTERFACES ====================

export interface SystemMemoryInfo {
  total: number
  available: number
  used: number
  usagePercentage: number
  platform: 'windows' | 'linux' | 'darwin'
  swap?: {
    total: number
    used: number
    free: number
  }
  gpu?: {
    total: number
    used: number
    available: number
    devices: Array<{
      name: string
      memory: number
      utilization: number
    }>
  }
}

export interface ProcessMemoryInfo {
  pid: number
  name: string
  rss: number // Resident Set Size
  heapTotal: number
  heapUsed: number
  external: number
  arrayBuffers: number
  cpuUsage: number
}

export interface MemoryThreshold {
  level: 'normal' | 'warning' | 'critical' | 'emergency'
  percentage: number
  actions: MemoryAction[]
  description: string
}

export interface MemoryAction {
  type: 'notify' | 'cleanup' | 'unload-model' | 'limit-processing' | 'emergency-stop'
  priority: number
  params?: Record<string, any>
  estimatedSavings: number
}

export interface MemoryAlert {
  id: string
  level: 'info' | 'warning' | 'critical' | 'emergency'
  title: string
  message: string
  timestamp: Date
  actions?: Array<{
    label: string
    action: () => Promise<void>
    estimatedSavings: number
  }>
  acknowledged: boolean
  autoResolve: boolean
}

export interface ModelMemoryInfo {
  modelId: string
  memoryUsage: number
  isLoaded: boolean
  lastAccessed: Date
  priority: number
  canUnload: boolean
  unloadSavings: number
}

// ==================== MEMORY MONITOR SERVICE ====================

export class MemoryMonitorService extends EventEmitter {
  private monitoringInterval?: NodeJS.Timer
  private updateInterval: number = 1000 // 1 second
  private isMonitoring: boolean = false
  private platform: NodeJS.Platform

  constructor(options: { updateInterval?: number } = {}) {
    super()
    this.updateInterval = options.updateInterval || 1000
    this.platform = process.platform
  }

  async startMonitoring(): Promise<void> {
    if (this.isMonitoring) return

    this.isMonitoring = true
    
    this.monitoringInterval = setInterval(async () => {
      try {
        const memoryInfo = await this.getSystemMemory()
        this.emit('memoryUpdate', memoryInfo)
        
        // Check for memory pressure
        if (memoryInfo.usagePercentage > 70) {
          this.emit('memoryPressure', {
            level: this.getMemoryPressureLevel(memoryInfo.usagePercentage),
            info: memoryInfo
          })
        }
      } catch (error) {
        this.emit('monitoringError', error)
      }
    }, this.updateInterval)

    console.log('Memory monitoring started')
  }

  async stopMonitoring(): Promise<void> {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = undefined
    }
    this.isMonitoring = false
    console.log('Memory monitoring stopped')
  }

  async getSystemMemory(): Promise<SystemMemoryInfo> {
    const memoryInfo: SystemMemoryInfo = {
      total: 0,
      available: 0,
      used: 0,
      usagePercentage: 0,
      platform: this.platform as any
    }

    if (typeof process !== 'undefined' && process.memoryUsage) {
      // Node.js environment - get basic memory info
      const processMemory = process.memoryUsage()
      
      // For cross-platform implementation, we'd use native modules
      // Here's a mock implementation with realistic values
      if (this.platform === 'win32') {
        memoryInfo.total = 16 * 1024 * 1024 * 1024 // 16GB
        memoryInfo.used = processMemory.rss + (Math.random() * 8 * 1024 * 1024 * 1024)
      } else if (this.platform === 'linux') {
        // On Linux, read from /proc/meminfo
        memoryInfo.total = await this.getLinuxTotalMemory()
        memoryInfo.used = await this.getLinuxUsedMemory()
      } else if (this.platform === 'darwin') {
        // On macOS, use vm_stat or similar
        memoryInfo.total = await this.getMacOSTotalMemory()
        memoryInfo.used = await this.getMacOSUsedMemory()
      }
    } else {
      // Browser environment - use Performance API
      if (typeof performance !== 'undefined' && 'memory' in performance) {
        const mem = (performance as any).memory
        memoryInfo.total = mem.jsHeapSizeLimit
        memoryInfo.used = mem.usedJSHeapSize
      }
    }

    memoryInfo.available = memoryInfo.total - memoryInfo.used
    memoryInfo.usagePercentage = (memoryInfo.used / memoryInfo.total) * 100

    // Add GPU memory info if available
    memoryInfo.gpu = await this.getGPUMemoryInfo()

    return memoryInfo
  }

  async getProcessMemory(pid?: number): Promise<ProcessMemoryInfo> {
    const processMemory = process.memoryUsage()
    
    return {
      pid: process.pid,
      name: 'bear-ai',
      rss: processMemory.rss,
      heapTotal: processMemory.heapTotal,
      heapUsed: processMemory.heapUsed,
      external: processMemory.external,
      arrayBuffers: processMemory.arrayBuffers || 0,
      cpuUsage: process.cpuUsage().user / 1000000 // Convert to milliseconds
    }
  }

  private getMemoryPressureLevel(usagePercentage: number): string {
    if (usagePercentage >= 90) return 'emergency'
    if (usagePercentage >= 80) return 'critical'
    if (usagePercentage >= 70) return 'warning'
    return 'normal'
  }

  // Platform-specific implementations (mocked for now)
  private async getLinuxTotalMemory(): Promise<number> {
    // In real implementation: fs.readFileSync('/proc/meminfo')
    return 16 * 1024 * 1024 * 1024 // 16GB mock
  }

  private async getLinuxUsedMemory(): Promise<number> {
    // Calculate used memory from /proc/meminfo
    return Math.random() * 8 * 1024 * 1024 * 1024 // Mock
  }

  private async getMacOSTotalMemory(): Promise<number> {
    // In real implementation: child_process.exec('sysctl -n hw.memsize')
    return 16 * 1024 * 1024 * 1024 // 16GB mock
  }

  private async getMacOSUsedMemory(): Promise<number> {
    // Parse vm_stat output
    return Math.random() * 8 * 1024 * 1024 * 1024 // Mock
  }

  private async getGPUMemoryInfo(): Promise<SystemMemoryInfo['gpu']> {
    // Mock GPU info - in real implementation, use nvidia-ml-py or similar
    return {
      total: 8 * 1024 * 1024 * 1024,
      used: Math.random() * 4 * 1024 * 1024 * 1024,
      available: 4 * 1024 * 1024 * 1024,
      devices: [
        {
          name: 'NVIDIA RTX 4080',
          memory: 8 * 1024 * 1024 * 1024,
          utilization: Math.random() * 100
        }
      ]
    }
  }
}

// ==================== SAFETY THRESHOLD MANAGER ====================

export class SafetyThresholdManager extends EventEmitter {
  private thresholds: MemoryThreshold[] = []
  private currentLevel: string = 'normal'

  constructor() {
    super()
    this.initializeDefaultThresholds()
  }

  private initializeDefaultThresholds(): void {
    this.thresholds = [
      {
        level: 'normal',
        percentage: 70,
        actions: [],
        description: 'System memory usage is normal'
      },
      {
        level: 'warning',
        percentage: 75,
        actions: [
          {
            type: 'notify',
            priority: 1,
            estimatedSavings: 0,
            params: { level: 'warning', title: 'Memory Usage Warning' }
          },
          {
            type: 'cleanup',
            priority: 2,
            estimatedSavings: 512 * 1024 * 1024, // 512MB
            params: { type: 'cache-cleanup' }
          }
        ],
        description: 'Memory usage is elevated - preventive measures activated'
      },
      {
        level: 'critical',
        percentage: 85,
        actions: [
          {
            type: 'notify',
            priority: 1,
            estimatedSavings: 0,
            params: { level: 'critical', title: 'Critical Memory Usage' }
          },
          {
            type: 'unload-model',
            priority: 2,
            estimatedSavings: 2 * 1024 * 1024 * 1024, // 2GB
            params: { strategy: 'lru' }
          },
          {
            type: 'limit-processing',
            priority: 3,
            estimatedSavings: 1024 * 1024 * 1024, // 1GB
            params: { maxConcurrentTasks: 1 }
          }
        ],
        description: 'Memory usage is critical - aggressive optimization required'
      },
      {
        level: 'emergency',
        percentage: 92,
        actions: [
          {
            type: 'notify',
            priority: 1,
            estimatedSavings: 0,
            params: { level: 'emergency', title: 'Emergency Memory Situation' }
          },
          {
            type: 'emergency-stop',
            priority: 2,
            estimatedSavings: 4 * 1024 * 1024 * 1024, // 4GB
            params: { preserveEssentialOnly: true }
          }
        ],
        description: 'Emergency memory situation - immediate action required'
      }
    ]
  }

  evaluateMemoryUsage(memoryInfo: SystemMemoryInfo): MemoryThreshold | null {
    const currentUsage = memoryInfo.usagePercentage
    
    // Find the appropriate threshold
    let triggeredThreshold: MemoryThreshold | null = null
    
    for (const threshold of this.thresholds.reverse()) {
      if (currentUsage >= threshold.percentage) {
        triggeredThreshold = threshold
        break
      }
    }

    // Reset order
    this.thresholds.reverse()

    if (triggeredThreshold && triggeredThreshold.level !== this.currentLevel) {
      this.currentLevel = triggeredThreshold.level
      this.emit('thresholdTriggered', {
        threshold: triggeredThreshold,
        memoryInfo,
        previousLevel: this.currentLevel
      })
    }

    return triggeredThreshold
  }

  updateThreshold(level: string, percentage: number, actions: MemoryAction[]): void {
    const thresholdIndex = this.thresholds.findIndex(t => t.level === level)
    if (thresholdIndex >= 0) {
      this.thresholds[thresholdIndex].percentage = percentage
      this.thresholds[thresholdIndex].actions = actions
      this.emit('thresholdUpdated', { level, percentage, actions })
    }
  }

  getThresholds(): MemoryThreshold[] {
    return [...this.thresholds]
  }

  getCurrentLevel(): string {
    return this.currentLevel
  }
}

// ==================== MODEL LIFECYCLE CONTROLLER ====================

export class ModelLifecycleController extends EventEmitter {
  private loadedModels: Map<string, ModelMemoryInfo> = new Map()
  private unloadQueue: string[] = []
  private memoryBudget: number = 8 * 1024 * 1024 * 1024 // 8GB default budget

  constructor(memoryBudget?: number) {
    super()
    if (memoryBudget) {
      this.memoryBudget = memoryBudget
    }
  }

  registerModel(modelInfo: ModelMemoryInfo): void {
    this.loadedModels.set(modelInfo.modelId, modelInfo)
    this.emit('modelRegistered', modelInfo)
  }

  unregisterModel(modelId: string): void {
    this.loadedModels.delete(modelId)
    this.emit('modelUnregistered', modelId)
  }

  updateModelAccess(modelId: string): void {
    const model = this.loadedModels.get(modelId)
    if (model) {
      model.lastAccessed = new Date()
      this.emit('modelAccessed', modelId)
    }
  }

  async optimizeMemoryUsage(targetReduction: number): Promise<{
    modelsUnloaded: string[]
    memorySaved: number
    actions: string[]
  }> {
    const actions: string[] = []
    const modelsUnloaded: string[] = []
    let memorySaved = 0

    // Sort models by priority and last access time
    const sortedModels = Array.from(this.loadedModels.values())
      .filter(model => model.isLoaded && model.canUnload)
      .sort((a, b) => {
        // Higher priority models stay loaded longer
        if (a.priority !== b.priority) {
          return a.priority - b.priority
        }
        // Less recently used models are unloaded first
        return a.lastAccessed.getTime() - b.lastAccessed.getTime()
      })

    for (const model of sortedModels) {
      if (memorySaved >= targetReduction) break

      try {
        await this.unloadModel(model.modelId)
        modelsUnloaded.push(model.modelId)
        memorySaved += model.memoryUsage
        actions.push(`Unloaded model ${model.modelId} (${this.formatBytes(model.memoryUsage)})`)
      } catch (error) {
        actions.push(`Failed to unload model ${model.modelId}: ${error.message}`)
      }
    }

    this.emit('memoryOptimized', {
      targetReduction,
      actualReduction: memorySaved,
      modelsUnloaded,
      actions
    })

    return { modelsUnloaded, memorySaved, actions }
  }

  async unloadModel(modelId: string): Promise<boolean> {
    const model = this.loadedModels.get(modelId)
    if (!model || !model.isLoaded) {
      return false
    }

    try {
      // In real implementation, this would call the actual model unloader
      model.isLoaded = false
      this.emit('modelUnloaded', modelId)
      console.log(`Model ${modelId} unloaded successfully`)
      return true
    } catch (error) {
      this.emit('modelUnloadError', { modelId, error })
      return false
    }
  }

  getMemoryUsageSummary(): {
    totalUsed: number
    totalBudget: number
    utilizationPercentage: number
    loadedModels: number
    modelsCanUnload: number
  } {
    const loadedModels = Array.from(this.loadedModels.values()).filter(m => m.isLoaded)
    const totalUsed = loadedModels.reduce((sum, model) => sum + model.memoryUsage, 0)
    const modelsCanUnload = loadedModels.filter(m => m.canUnload).length

    return {
      totalUsed,
      totalBudget: this.memoryBudget,
      utilizationPercentage: (totalUsed / this.memoryBudget) * 100,
      loadedModels: loadedModels.length,
      modelsCanUnload
    }
  }

  setMemoryBudget(newBudget: number): void {
    this.memoryBudget = newBudget
    this.emit('memoryBudgetChanged', newBudget)
  }

  private formatBytes(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    if (bytes === 0) return '0 Bytes'
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
  }
}

// ==================== NOTIFICATION SYSTEM ====================

export class MemoryNotificationSystem extends EventEmitter {
  private activeAlerts: Map<string, MemoryAlert> = new Map()
  private alertHistory: MemoryAlert[] = []
  private maxHistorySize: number = 100

  constructor() {
    super()
  }

  createAlert(alert: Omit<MemoryAlert, 'id' | 'timestamp' | 'acknowledged'>): string {
    const alertId = `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    const fullAlert: MemoryAlert = {
      id: alertId,
      timestamp: new Date(),
      acknowledged: false,
      ...alert
    }

    this.activeAlerts.set(alertId, fullAlert)
    this.addToHistory(fullAlert)
    
    this.emit('alertCreated', fullAlert)
    console.log(`Memory alert created: ${fullAlert.title} (${fullAlert.level})`)
    
    return alertId
  }

  acknowledgeAlert(alertId: string): boolean {
    const alert = this.activeAlerts.get(alertId)
    if (alert) {
      alert.acknowledged = true
      this.emit('alertAcknowledged', alert)
      return true
    }
    return false
  }

  resolveAlert(alertId: string): boolean {
    const alert = this.activeAlerts.get(alertId)
    if (alert) {
      this.activeAlerts.delete(alertId)
      this.emit('alertResolved', alert)
      console.log(`Memory alert resolved: ${alert.title}`)
      return true
    }
    return false
  }

  getActiveAlerts(): MemoryAlert[] {
    return Array.from(this.activeAlerts.values())
  }

  getAlertHistory(limit?: number): MemoryAlert[] {
    const history = [...this.alertHistory].reverse()
    return limit ? history.slice(0, limit) : history
  }

  clearHistory(): void {
    this.alertHistory = []
    this.emit('historyCleared')
  }

  // Auto-resolve alerts that are marked for auto-resolution
  checkAutoResolve(currentMemoryUsage: number): void {
    for (const [alertId, alert] of this.activeAlerts) {
      if (alert.autoResolve) {
        // Auto-resolve if memory usage has dropped below warning level
        if (currentMemoryUsage < 70) {
          this.resolveAlert(alertId)
        }
      }
    }
  }

  private addToHistory(alert: MemoryAlert): void {
    this.alertHistory.push(alert)
    
    // Maintain history size limit
    if (this.alertHistory.length > this.maxHistorySize) {
      this.alertHistory = this.alertHistory.slice(-this.maxHistorySize)
    }
  }
}

// ==================== EMERGENCY CLEANUP SYSTEM ====================

export class EmergencyCleanupSystem extends EventEmitter {
  private cleanupProcedures: Map<string, () => Promise<number>> = new Map()
  private isEmergencyActive: boolean = false

  constructor() {
    super()
    this.initializeCleanupProcedures()
  }

  private initializeCleanupProcedures(): void {
    // Register standard cleanup procedures
    this.cleanupProcedures.set('garbage-collection', this.performGarbageCollection.bind(this))
    this.cleanupProcedures.set('clear-document-cache', this.clearDocumentCache.bind(this))
    this.cleanupProcedures.set('unload-unused-models', this.unloadUnusedModels.bind(this))
    this.cleanupProcedures.set('clear-temp-files', this.clearTempFiles.bind(this))
    this.cleanupProcedures.set('compress-active-data', this.compressActiveData.bind(this))
  }

  async performEmergencyCleanup(): Promise<{
    totalMemorySaved: number
    proceduresExecuted: string[]
    errors: string[]
  }> {
    if (this.isEmergencyActive) {
      throw new Error('Emergency cleanup already in progress')
    }

    this.isEmergencyActive = true
    this.emit('emergencyCleanupStarted')

    const proceduresExecuted: string[] = []
    const errors: string[] = []
    let totalMemorySaved = 0

    try {
      // Execute cleanup procedures in priority order
      const procedures = [
        'garbage-collection',
        'clear-document-cache', 
        'unload-unused-models',
        'clear-temp-files',
        'compress-active-data'
      ]

      for (const procedureName of procedures) {
        try {
          const procedure = this.cleanupProcedures.get(procedureName)
          if (procedure) {
            const memorySaved = await procedure()
            totalMemorySaved += memorySaved
            proceduresExecuted.push(procedureName)
            
            console.log(`Emergency cleanup: ${procedureName} saved ${this.formatBytes(memorySaved)}`)
          }
        } catch (error) {
          errors.push(`${procedureName}: ${error.message}`)
          console.error(`Emergency cleanup error in ${procedureName}:`, error)
        }
      }

      this.emit('emergencyCleanupCompleted', {
        totalMemorySaved,
        proceduresExecuted,
        errors
      })

    } finally {
      this.isEmergencyActive = false
    }

    return { totalMemorySaved, proceduresExecuted, errors }
  }

  registerCleanupProcedure(name: string, procedure: () => Promise<number>): void {
    this.cleanupProcedures.set(name, procedure)
    this.emit('cleanupProcedureRegistered', name)
  }

  // Standard cleanup procedures
  private async performGarbageCollection(): Promise<number> {
    const beforeGC = process.memoryUsage().heapUsed
    
    if (global.gc) {
      global.gc()
      const afterGC = process.memoryUsage().heapUsed
      return Math.max(0, beforeGC - afterGC)
    }
    
    return 0
  }

  private async clearDocumentCache(): Promise<number> {
    // Mock implementation - would clear actual document cache
    const estimatedSavings = 512 * 1024 * 1024 // 512MB
    console.log('Clearing document cache...')
    return estimatedSavings
  }

  private async unloadUnusedModels(): Promise<number> {
    // Mock implementation - would unload unused LLM models
    const estimatedSavings = 2 * 1024 * 1024 * 1024 // 2GB
    console.log('Unloading unused models...')
    return estimatedSavings
  }

  private async clearTempFiles(): Promise<number> {
    // Mock implementation - would clear temporary files
    const estimatedSavings = 256 * 1024 * 1024 // 256MB
    console.log('Clearing temporary files...')
    return estimatedSavings
  }

  private async compressActiveData(): Promise<number> {
    // Mock implementation - would compress active data structures
    const estimatedSavings = 128 * 1024 * 1024 // 128MB
    console.log('Compressing active data structures...')
    return estimatedSavings
  }

  private formatBytes(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    if (bytes === 0) return '0 Bytes'
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
  }
}

// ==================== MEMORY SAFETY ORCHESTRATOR ====================

export class MemorySafetyOrchestrator extends EventEmitter {
  private memoryMonitor: MemoryMonitorService
  private thresholdManager: SafetyThresholdManager
  private lifecycleController: ModelLifecycleController
  private notificationSystem: MemoryNotificationSystem
  private emergencyCleanup: EmergencyCleanupSystem
  
  private isActive: boolean = false

  constructor(config: {
    monitorInterval?: number
    memoryBudget?: number
  } = {}) {
    super()
    
    this.memoryMonitor = new MemoryMonitorService({
      updateInterval: config.monitorInterval
    })
    this.thresholdManager = new SafetyThresholdManager()
    this.lifecycleController = new ModelLifecycleController(config.memoryBudget)
    this.notificationSystem = new MemoryNotificationSystem()
    this.emergencyCleanup = new EmergencyCleanupSystem()
    
    this.setupEventHandlers()
  }

  async initialize(): Promise<void> {
    if (this.isActive) return

    console.log('Initializing BEAR AI Memory Safety System...')
    
    await this.memoryMonitor.startMonitoring()
    this.isActive = true
    
    this.emit('initialized')
    console.log('Memory Safety System initialized successfully')
  }

  async shutdown(): Promise<void> {
    if (!this.isActive) return

    await this.memoryMonitor.stopMonitoring()
    this.isActive = false
    
    this.emit('shutdown')
    console.log('Memory Safety System shutdown complete')
  }

  private setupEventHandlers(): void {
    // Memory pressure handling
    this.memoryMonitor.on('memoryUpdate', (memoryInfo) => {
      const threshold = this.thresholdManager.evaluateMemoryUsage(memoryInfo)
      this.notificationSystem.checkAutoResolve(memoryInfo.usagePercentage)
    })

    // Threshold-triggered actions
    this.thresholdManager.on('thresholdTriggered', async ({ threshold, memoryInfo }) => {
      await this.handleThresholdActions(threshold, memoryInfo)
    })

    // Emergency cleanup integration
    this.emergencyCleanup.on('emergencyCleanupCompleted', (result) => {
      this.notificationSystem.createAlert({
        level: 'info',
        title: 'Emergency Cleanup Completed',
        message: `Freed ${this.formatBytes(result.totalMemorySaved)} of memory`,
        autoResolve: true
      })
    })
  }

  private async handleThresholdActions(threshold: MemoryThreshold, memoryInfo: SystemMemoryInfo): Promise<void> {
    for (const action of threshold.actions.sort((a, b) => a.priority - b.priority)) {
      try {
        switch (action.type) {
          case 'notify':
            this.createMemoryAlert(action, threshold, memoryInfo)
            break
          case 'cleanup':
            await this.performCleanupAction(action)
            break
          case 'unload-model':
            await this.performModelUnloading(action)
            break
          case 'limit-processing':
            await this.limitProcessing(action)
            break
          case 'emergency-stop':
            await this.performEmergencyStop(action)
            break
        }
      } catch (error) {
        console.error(`Failed to execute memory action ${action.type}:`, error)
      }
    }
  }

  private createMemoryAlert(action: MemoryAction, threshold: MemoryThreshold, memoryInfo: SystemMemoryInfo): void {
    const level = action.params?.level || 'info'
    const title = action.params?.title || 'Memory Usage Alert'
    
    this.notificationSystem.createAlert({
      level,
      title,
      message: `${threshold.description}. Current usage: ${memoryInfo.usagePercentage.toFixed(1)}%`,
      autoResolve: level !== 'emergency',
      actions: [
        {
          label: 'Optimize Memory',
          action: async () => {
            await this.lifecycleController.optimizeMemoryUsage(action.estimatedSavings)
          },
          estimatedSavings: action.estimatedSavings
        }
      ]
    })
  }

  private async performCleanupAction(action: MemoryAction): Promise<void> {
    // Trigger appropriate cleanup based on action params
    if (action.params?.type === 'cache-cleanup') {
      await this.emergencyCleanup.performEmergencyCleanup()
    }
  }

  private async performModelUnloading(action: MemoryAction): Promise<void> {
    await this.lifecycleController.optimizeMemoryUsage(action.estimatedSavings)
  }

  private async limitProcessing(action: MemoryAction): Promise<void> {
    // Emit event to limit concurrent processing
    this.emit('limitProcessing', action.params)
  }

  private async performEmergencyStop(action: MemoryAction): Promise<void> {
    // Perform emergency cleanup
    await this.emergencyCleanup.performEmergencyCleanup()
    
    // Create critical alert
    this.notificationSystem.createAlert({
      level: 'emergency',
      title: 'Emergency Memory Procedure Executed',
      message: 'System memory was critically low. Emergency procedures have been executed.',
      autoResolve: false
    })
  }

  // Public API methods
  getCurrentMemoryStatus(): Promise<SystemMemoryInfo> {
    return this.memoryMonitor.getSystemMemory()
  }

  getActiveAlerts(): MemoryAlert[] {
    return this.notificationSystem.getActiveAlerts()
  }

  getModelMemoryStatus(): ReturnType<ModelLifecycleController['getMemoryUsageSummary']> {
    return this.lifecycleController.getMemoryUsageSummary()
  }

  registerModel(modelInfo: ModelMemoryInfo): void {
    this.lifecycleController.registerModel(modelInfo)
  }

  acknowledgeAlert(alertId: string): boolean {
    return this.notificationSystem.acknowledgeAlert(alertId)
  }

  private formatBytes(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    if (bytes === 0) return '0 Bytes'
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
  }
}

// Export singleton instance for global use
export const memorySafetySystem = new MemorySafetyOrchestrator()