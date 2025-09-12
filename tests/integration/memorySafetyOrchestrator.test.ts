/**
 * Integration Tests for Memory Safety Orchestrator
 * Testing the complete memory safety system integration
 */

import { describe, it, expect, beforeEach, afterEach, vi, beforeAll } from 'vitest'
import { 
  MemorySafetyOrchestrator,
  MemoryMonitorService,
  SafetyThresholdManager,
  ModelLifecycleController,
  MemoryNotificationSystem,
  EmergencyCleanupSystem,
  SystemMemoryInfo,
  MemoryThreshold,
  ModelMemoryInfo,
  MemoryAlert,
  memorySafetySystem
} from '../../src/integrations/memory-safety-system'

// Mock Node.js process for cross-platform testing
const mockProcess = {
  platform: 'win32' as NodeJS.Platform,
  pid: 12345,
  memoryUsage: vi.fn().mockReturnValue({
    rss: 100 * 1024 * 1024,
    heapTotal: 50 * 1024 * 1024,
    heapUsed: 30 * 1024 * 1024,
    external: 5 * 1024 * 1024,
    arrayBuffers: 2 * 1024 * 1024
  }),
  cpuUsage: vi.fn().mockReturnValue({
    user: 1000000,
    system: 500000
  })
}

describe('Memory Safety Orchestrator Integration', () => {
  let orchestrator: MemorySafetyOrchestrator
  let mockGC: any

  beforeAll(() => {
    // Mock global process
    global.process = mockProcess as any
    
    // Mock global GC
    mockGC = vi.fn()
    global.gc = mockGC
    
    // Mock setInterval/clearInterval for timer testing
    vi.useFakeTimers()
  })

  beforeEach(() => {
    orchestrator = new MemorySafetyOrchestrator({
      monitorInterval: 100,
      memoryBudget: 4 * 1024 * 1024 * 1024 // 4GB
    })
    vi.clearAllMocks()
  })

  afterEach(async () => {
    if (orchestrator) {
      await orchestrator.shutdown()
    }
    vi.clearAllTimers()
  })

  describe('System Initialization', () => {
    it('should initialize all subsystems correctly', async () => {
      expect(orchestrator['isActive']).toBe(false)
      
      await orchestrator.initialize()
      
      expect(orchestrator['isActive']).toBe(true)
      expect(orchestrator['memoryMonitor']).toBeDefined()
      expect(orchestrator['thresholdManager']).toBeDefined()
      expect(orchestrator['lifecycleController']).toBeDefined()
      expect(orchestrator['notificationSystem']).toBeDefined()
      expect(orchestrator['emergencyCleanup']).toBeDefined()
    })

    it('should not initialize twice', async () => {
      await orchestrator.initialize()
      expect(orchestrator['isActive']).toBe(true)
      
      await orchestrator.initialize() // Second call
      expect(orchestrator['isActive']).toBe(true)
    })

    it('should shutdown gracefully', async () => {
      await orchestrator.initialize()
      expect(orchestrator['isActive']).toBe(true)
      
      await orchestrator.shutdown()
      expect(orchestrator['isActive']).toBe(false)
    })
  })

  describe('Memory Monitoring Integration', () => {
    beforeEach(async () => {
      await orchestrator.initialize()
    })

    it('should collect system memory information', async () => {
      const memoryInfo = await orchestrator.getCurrentMemoryStatus()
      
      expect(memoryInfo).toBeDefined()
      expect(memoryInfo.total).toBeGreaterThan(0)
      expect(memoryInfo.used).toBeGreaterThan(0)
      expect(memoryInfo.available).toBeGreaterThan(0)
      expect(memoryInfo.usagePercentage).toBeGreaterThanOrEqual(0)
      expect(memoryInfo.usagePercentage).toBeLessThanOrEqual(100)
      expect(memoryInfo.platform).toBe('win32')
    })

    it('should trigger memory pressure events', async () => {
      const eventSpy = vi.fn()
      orchestrator.on('memoryPressure', eventSpy)
      
      // Mock high memory usage
      mockProcess.memoryUsage.mockReturnValue({
        rss: 15 * 1024 * 1024 * 1024, // 15GB - high usage
        heapTotal: 8 * 1024 * 1024 * 1024,
        heapUsed: 7 * 1024 * 1024 * 1024,
        external: 100 * 1024 * 1024,
        arrayBuffers: 50 * 1024 * 1024
      })
      
      // Advance timers to trigger memory check
      await vi.advanceTimersByTimeAsync(150)
      
      expect(eventSpy).toHaveBeenCalled()
    })

    it('should maintain memory monitoring intervals', async () => {
      const memoryMonitor = orchestrator['memoryMonitor']
      const spy = vi.spyOn(memoryMonitor, 'getSystemMemory')
      
      // Advance time by several intervals
      await vi.advanceTimersByTimeAsync(500)
      
      expect(spy).toHaveBeenCalledTimes(5) // 500ms / 100ms interval
    })
  })

  describe('Threshold Management Integration', () => {
    beforeEach(async () => {
      await orchestrator.initialize()
    })

    it('should trigger threshold actions on memory pressure', async () => {
      const alertSpy = vi.fn()
      orchestrator.on('alertCreated', alertSpy)
      
      // Simulate critical memory usage
      mockProcess.memoryUsage.mockReturnValue({
        rss: 14 * 1024 * 1024 * 1024, // 14GB of 16GB = 87.5% (critical threshold)
        heapTotal: 8 * 1024 * 1024 * 1024,
        heapUsed: 7 * 1024 * 1024 * 1024,
        external: 1024 * 1024 * 1024,
        arrayBuffers: 512 * 1024 * 1024
      })
      
      await vi.advanceTimersByTimeAsync(150)
      
      expect(alertSpy).toHaveBeenCalled()
    })

    it('should escalate through threshold levels', async () => {
      const events: any[] = []
      orchestrator.on('thresholdTriggered', (event) => events.push(event))
      
      // Start with warning level
      mockProcess.memoryUsage.mockReturnValue({
        rss: 12 * 1024 * 1024 * 1024, // 75%
        heapTotal: 6 * 1024 * 1024 * 1024,
        heapUsed: 5 * 1024 * 1024 * 1024,
        external: 500 * 1024 * 1024,
        arrayBuffers: 100 * 1024 * 1024
      })
      await vi.advanceTimersByTimeAsync(150)
      
      // Escalate to critical
      mockProcess.memoryUsage.mockReturnValue({
        rss: 14 * 1024 * 1024 * 1024, // 87.5%
        heapTotal: 8 * 1024 * 1024 * 1024,
        heapUsed: 7 * 1024 * 1024 * 1024,
        external: 1024 * 1024 * 1024,
        arrayBuffers: 512 * 1024 * 1024
      })
      await vi.advanceTimersByTimeAsync(150)
      
      expect(events.length).toBeGreaterThan(0)
    })
  })

  describe('Model Lifecycle Integration', () => {
    beforeEach(async () => {
      await orchestrator.initialize()
    })

    it('should register and track models', () => {
      const modelInfo: ModelMemoryInfo = {
        modelId: 'test-model-1',
        memoryUsage: 2 * 1024 * 1024 * 1024, // 2GB
        isLoaded: true,
        lastAccessed: new Date(),
        priority: 5,
        canUnload: true,
        unloadSavings: 2 * 1024 * 1024 * 1024
      }
      
      orchestrator.registerModel(modelInfo)
      
      const summary = orchestrator.getModelMemoryStatus()
      expect(summary.loadedModels).toBe(1)
      expect(summary.totalUsed).toBe(2 * 1024 * 1024 * 1024)
    })

    it('should unload models during memory pressure', async () => {
      // Register test models
      const models: ModelMemoryInfo[] = [
        {
          modelId: 'model-1',
          memoryUsage: 1.5 * 1024 * 1024 * 1024,
          isLoaded: true,
          lastAccessed: new Date(Date.now() - 10000), // 10 seconds ago
          priority: 3,
          canUnload: true,
          unloadSavings: 1.5 * 1024 * 1024 * 1024
        },
        {
          modelId: 'model-2',
          memoryUsage: 1 * 1024 * 1024 * 1024,
          isLoaded: true,
          lastAccessed: new Date(Date.now() - 5000), // 5 seconds ago
          priority: 7,
          canUnload: true,
          unloadSavings: 1 * 1024 * 1024 * 1024
        }
      ]
      
      models.forEach(model => orchestrator.registerModel(model))
      
      // Trigger memory pressure that requires model unloading
      mockProcess.memoryUsage.mockReturnValue({
        rss: 14 * 1024 * 1024 * 1024, // Critical level
        heapTotal: 8 * 1024 * 1024 * 1024,
        heapUsed: 7 * 1024 * 1024 * 1024,
        external: 1024 * 1024 * 1024,
        arrayBuffers: 512 * 1024 * 1024
      })
      
      await vi.advanceTimersByTimeAsync(150)
      
      const summary = orchestrator.getModelMemoryStatus()
      // Should have unloaded models due to memory pressure
      expect(summary.totalUsed).toBeLessThan(2.5 * 1024 * 1024 * 1024)
    })
  })

  describe('Emergency Cleanup Integration', () => {
    beforeEach(async () => {
      await orchestrator.initialize()
    })

    it('should trigger emergency cleanup at critical thresholds', async () => {
      const cleanupSpy = vi.fn()
      orchestrator.on('emergencyCleanupCompleted', cleanupSpy)
      
      // Simulate emergency memory situation
      mockProcess.memoryUsage.mockReturnValue({
        rss: 15.5 * 1024 * 1024 * 1024, // 97% usage - emergency level
        heapTotal: 10 * 1024 * 1024 * 1024,
        heapUsed: 9 * 1024 * 1024 * 1024,
        external: 1024 * 1024 * 1024,
        arrayBuffers: 512 * 1024 * 1024
      })
      
      await vi.advanceTimersByTimeAsync(150)
      
      expect(cleanupSpy).toHaveBeenCalled()
    })

    it('should execute garbage collection during cleanup', async () => {
      // Trigger emergency cleanup manually
      const emergencyCleanup = orchestrator['emergencyCleanup']
      await emergencyCleanup.performEmergencyCleanup()
      
      expect(mockGC).toHaveBeenCalled()
    })
  })

  describe('Alert System Integration', () => {
    beforeEach(async () => {
      await orchestrator.initialize()
    })

    it('should create alerts for memory thresholds', async () => {
      // Trigger warning threshold
      mockProcess.memoryUsage.mockReturnValue({
        rss: 12 * 1024 * 1024 * 1024, // 75% - warning level
        heapTotal: 6 * 1024 * 1024 * 1024,
        heapUsed: 5 * 1024 * 1024 * 1024,
        external: 500 * 1024 * 1024,
        arrayBuffers: 100 * 1024 * 1024
      })
      
      await vi.advanceTimersByTimeAsync(150)
      
      const alerts = orchestrator.getActiveAlerts()
      expect(alerts.length).toBeGreaterThan(0)
      expect(alerts[0].level).toBe('warning')
    })

    it('should acknowledge alerts', async () => {
      // Create an alert first
      mockProcess.memoryUsage.mockReturnValue({
        rss: 12 * 1024 * 1024 * 1024,
        heapTotal: 6 * 1024 * 1024 * 1024,
        heapUsed: 5 * 1024 * 1024 * 1024,
        external: 500 * 1024 * 1024,
        arrayBuffers: 100 * 1024 * 1024
      })
      
      await vi.advanceTimersByTimeAsync(150)
      
      const alerts = orchestrator.getActiveAlerts()
      expect(alerts.length).toBeGreaterThan(0)
      
      const alertId = alerts[0].id
      const acknowledged = orchestrator.acknowledgeAlert(alertId)
      
      expect(acknowledged).toBe(true)
      
      const updatedAlerts = orchestrator.getActiveAlerts()
      const acknowledgedAlert = updatedAlerts.find(a => a.id === alertId)
      expect(acknowledgedAlert?.acknowledged).toBe(true)
    })

    it('should auto-resolve alerts when conditions improve', async () => {
      // Create alert with high memory usage
      mockProcess.memoryUsage.mockReturnValue({
        rss: 12 * 1024 * 1024 * 1024, // 75%
        heapTotal: 6 * 1024 * 1024 * 1024,
        heapUsed: 5 * 1024 * 1024 * 1024,
        external: 500 * 1024 * 1024,
        arrayBuffers: 100 * 1024 * 1024
      })
      
      await vi.advanceTimersByTimeAsync(150)
      expect(orchestrator.getActiveAlerts().length).toBeGreaterThan(0)
      
      // Reduce memory usage
      mockProcess.memoryUsage.mockReturnValue({
        rss: 8 * 1024 * 1024 * 1024, // 50% - below warning threshold
        heapTotal: 4 * 1024 * 1024 * 1024,
        heapUsed: 3 * 1024 * 1024 * 1024,
        external: 500 * 1024 * 1024,
        arrayBuffers: 100 * 1024 * 1024
      })
      
      await vi.advanceTimersByTimeAsync(150)
      
      // Alerts should be auto-resolved
      const remainingAlerts = orchestrator.getActiveAlerts()
      expect(remainingAlerts.filter(a => !a.acknowledged).length).toBe(0)
    })
  })

  describe('Cross-Component Communication', () => {
    beforeEach(async () => {
      await orchestrator.initialize()
    })

    it('should coordinate between all subsystems', async () => {
      const events: any[] = []
      
      // Listen to all relevant events
      orchestrator.on('memoryUpdate', (event) => events.push({ type: 'memoryUpdate', ...event }))
      orchestrator.on('thresholdTriggered', (event) => events.push({ type: 'thresholdTriggered', ...event }))
      orchestrator.on('alertCreated', (event) => events.push({ type: 'alertCreated', ...event }))
      orchestrator.on('memoryOptimized', (event) => events.push({ type: 'memoryOptimized', ...event }))
      
      // Trigger memory pressure scenario
      mockProcess.memoryUsage.mockReturnValue({
        rss: 14 * 1024 * 1024 * 1024, // Critical level
        heapTotal: 8 * 1024 * 1024 * 1024,
        heapUsed: 7 * 1024 * 1024 * 1024,
        external: 1024 * 1024 * 1024,
        arrayBuffers: 512 * 1024 * 1024
      })
      
      await vi.advanceTimersByTimeAsync(200)
      
      // Verify coordinated response
      expect(events.filter(e => e.type === 'memoryUpdate').length).toBeGreaterThan(0)
      expect(events.filter(e => e.type === 'thresholdTriggered').length).toBeGreaterThan(0)
      expect(events.filter(e => e.type === 'alertCreated').length).toBeGreaterThan(0)
    })

    it('should handle rapid memory fluctuations', async () => {
      const alertsCreated: any[] = []
      orchestrator.on('alertCreated', (alert) => alertsCreated.push(alert))
      
      // Rapid fluctuation between normal and critical
      for (let i = 0; i < 5; i++) {
        // High memory
        mockProcess.memoryUsage.mockReturnValue({
          rss: 14 * 1024 * 1024 * 1024,
          heapTotal: 8 * 1024 * 1024 * 1024,
          heapUsed: 7 * 1024 * 1024 * 1024,
          external: 1024 * 1024 * 1024,
          arrayBuffers: 512 * 1024 * 1024
        })
        await vi.advanceTimersByTimeAsync(100)
        
        // Low memory
        mockProcess.memoryUsage.mockReturnValue({
          rss: 8 * 1024 * 1024 * 1024,
          heapTotal: 4 * 1024 * 1024 * 1024,
          heapUsed: 3 * 1024 * 1024 * 1024,
          external: 500 * 1024 * 1024,
          arrayBuffers: 100 * 1024 * 1024
        })
        await vi.advanceTimersByTimeAsync(100)
      }
      
      // System should handle fluctuations without creating excessive alerts
      expect(alertsCreated.length).toBeLessThan(10) // Reasonable number of alerts
    })
  })

  describe('Error Handling and Recovery', () => {
    beforeEach(async () => {
      await orchestrator.initialize()
    })

    it('should handle memory collection errors gracefully', async () => {
      // Mock memory collection failure
      const originalMemoryUsage = mockProcess.memoryUsage
      mockProcess.memoryUsage = vi.fn().mockImplementation(() => {
        throw new Error('Memory access denied')
      })
      
      // Should not crash the system
      await vi.advanceTimersByTimeAsync(150)
      
      expect(orchestrator['isActive']).toBe(true)
      
      // Restore mock
      mockProcess.memoryUsage = originalMemoryUsage
    })

    it('should handle threshold evaluation errors', async () => {
      const thresholdManager = orchestrator['thresholdManager']
      const originalEvaluate = thresholdManager.evaluateMemoryUsage
      
      // Mock evaluation failure
      thresholdManager.evaluateMemoryUsage = vi.fn().mockImplementation(() => {
        throw new Error('Threshold evaluation failed')
      })
      
      await vi.advanceTimersByTimeAsync(150)
      
      // System should continue operating
      expect(orchestrator['isActive']).toBe(true)
      
      // Restore original method
      thresholdManager.evaluateMemoryUsage = originalEvaluate
    })

    it('should handle cleanup failures gracefully', async () => {
      const emergencyCleanup = orchestrator['emergencyCleanup']
      const originalCleanup = emergencyCleanup.performEmergencyCleanup
      
      // Mock cleanup failure
      emergencyCleanup.performEmergencyCleanup = vi.fn().mockRejectedValue(
        new Error('Cleanup failed')
      )
      
      // Trigger emergency situation
      mockProcess.memoryUsage.mockReturnValue({
        rss: 15.5 * 1024 * 1024 * 1024, // 97%
        heapTotal: 10 * 1024 * 1024 * 1024,
        heapUsed: 9 * 1024 * 1024 * 1024,
        external: 1024 * 1024 * 1024,
        arrayBuffers: 512 * 1024 * 1024
      })
      
      await vi.advanceTimersByTimeAsync(150)
      
      // System should still be active despite cleanup failure
      expect(orchestrator['isActive']).toBe(true)
      
      // Restore original method
      emergencyCleanup.performEmergencyCleanup = originalCleanup
    })
  })
})

describe('Singleton Memory Safety System', () => {
  afterEach(async () => {
    if (memorySafetySystem['isActive']) {
      await memorySafetySystem.shutdown()
    }
  })

  it('should provide singleton access', () => {
    expect(memorySafetySystem).toBeDefined()
    expect(memorySafetySystem).toBeInstanceOf(MemorySafetyOrchestrator)
  })

  it('should initialize singleton correctly', async () => {
    expect(memorySafetySystem['isActive']).toBe(false)
    
    await memorySafetySystem.initialize()
    
    expect(memorySafetySystem['isActive']).toBe(true)
  })

  it('should provide consistent API across the application', async () => {
    await memorySafetySystem.initialize()
    
    // Test all public API methods
    const memoryStatus = await memorySafetySystem.getCurrentMemoryStatus()
    expect(memoryStatus).toBeDefined()
    
    const modelStatus = memorySafetySystem.getModelMemoryStatus()
    expect(modelStatus).toBeDefined()
    
    const alerts = memorySafetySystem.getActiveAlerts()
    expect(Array.isArray(alerts)).toBe(true)
  })
})

describe('Performance and Scalability', () => {
  let orchestrator: MemorySafetyOrchestrator

  beforeEach(() => {
    global.process = mockProcess as any
    orchestrator = new MemorySafetyOrchestrator({
      monitorInterval: 10, // Aggressive monitoring for testing
      memoryBudget: 8 * 1024 * 1024 * 1024
    })
    vi.useFakeTimers()
  })

  afterEach(async () => {
    if (orchestrator) {
      await orchestrator.shutdown()
    }
    vi.useRealTimers()
  })

  it('should handle high-frequency memory monitoring', async () => {
    await orchestrator.initialize()
    
    const startTime = Date.now()
    
    // Run for 1000ms of simulated time
    await vi.advanceTimersByTimeAsync(1000)
    
    const endTime = Date.now()
    
    // Should complete in reasonable time despite high frequency
    expect(endTime - startTime).toBeLessThan(1000) // Should be much faster than real time
  })

  it('should handle many simultaneous alerts', async () => {
    await orchestrator.initialize()
    
    // Create conditions for multiple alerts
    mockProcess.memoryUsage.mockReturnValue({
      rss: 15 * 1024 * 1024 * 1024, // High usage
      heapTotal: 8 * 1024 * 1024 * 1024,
      heapUsed: 7 * 1024 * 1024 * 1024,
      external: 1024 * 1024 * 1024,
      arrayBuffers: 512 * 1024 * 1024
    })
    
    // Register many models to trigger multiple unload alerts
    for (let i = 0; i < 20; i++) {
      orchestrator.registerModel({
        modelId: `model-${i}`,
        memoryUsage: 200 * 1024 * 1024, // 200MB each
        isLoaded: true,
        lastAccessed: new Date(Date.now() - i * 1000),
        priority: i % 10,
        canUnload: true,
        unloadSavings: 200 * 1024 * 1024
      })
    }
    
    await vi.advanceTimersByTimeAsync(100)
    
    const alerts = orchestrator.getActiveAlerts()
    expect(alerts.length).toBeGreaterThan(0)
    expect(alerts.length).toBeLessThan(50) // Should not create excessive alerts
  })

  it('should maintain performance under memory pressure', async () => {
    await orchestrator.initialize()
    
    const performanceStart = process.hrtime()
    
    // Simulate sustained memory pressure
    mockProcess.memoryUsage.mockReturnValue({
      rss: 14.5 * 1024 * 1024 * 1024, // Sustained high usage
      heapTotal: 8 * 1024 * 1024 * 1024,
      heapUsed: 7.5 * 1024 * 1024 * 1024,
      external: 1024 * 1024 * 1024,
      arrayBuffers: 512 * 1024 * 1024
    })
    
    // Run for extended period
    await vi.advanceTimersByTimeAsync(5000)
    
    const [seconds, nanoseconds] = process.hrtime(performanceStart)
    const duration = seconds * 1000 + nanoseconds / 1000000
    
    // Should maintain reasonable performance
    expect(duration).toBeLessThan(1000) // Less than 1 second real time
  })
})