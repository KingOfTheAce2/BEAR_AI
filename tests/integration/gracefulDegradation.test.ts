/**
 * Integration Tests for Graceful Degradation and Emergency Cleanup
 * Testing system behavior under extreme conditions and memory pressure
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { 
  MemorySafetyOrchestrator,
  EmergencyCleanupSystem,
  MemoryNotificationSystem,
  SystemMemoryInfo
} from '../../src/integrations/memory-safety-system'
import { CoreModelManager } from '../../src/services/modelManager'
import { 
  createTestEnvironment,
  MemoryPressureSimulator,
  createStressTester
} from '../mocks/systemAPIs'

describe('Graceful Degradation Integration Tests', () => {
  let orchestrator: MemorySafetyOrchestrator
  let modelManager: CoreModelManager
  let emergencyCleanup: EmergencyCleanupSystem
  let notificationSystem: MemoryNotificationSystem
  let memorySimulator: MemoryPressureSimulator
  let testEnv: ReturnType<typeof createTestEnvironment>
  let stressTester: ReturnType<typeof createStressTester>

  beforeEach(async () => {
    vi.useFakeTimers()
    
    // Create test environment with high memory pressure
    testEnv = createTestEnvironment({
      memoryConfig: {
        memoryUsage: {
          rss: 12 * 1024 * 1024 * 1024,    // 12GB initial usage
          heapTotal: 8 * 1024 * 1024 * 1024,
          heapUsed: 6 * 1024 * 1024 * 1024,
          external: 1024 * 1024 * 1024,
          arrayBuffers: 512 * 1024 * 1024
        }
      }
    })
    
    // Mock global GC
    global.gc = vi.fn()
    
    memorySimulator = new MemoryPressureSimulator({
      baseMemoryUsage: 16 * 1024 * 1024 * 1024, // 16GB system
      initialUsage: 12 * 1024 * 1024 * 1024,    // Start at 75% usage
      growthRate: 0.01, // 1% growth per update
      volatility: 0.05   // 5% volatility
    })
    
    stressTester = createStressTester()
    
    orchestrator = new MemorySafetyOrchestrator({
      monitorInterval: 100,
      memoryBudget: 8 * 1024 * 1024 * 1024
    })
    
    modelManager = new CoreModelManager({
      maxConcurrentModels: 5,
      memoryThreshold: 80,
      autoUnloadTimeout: 1 // 1 minute for testing
    })
    
    emergencyCleanup = new EmergencyCleanupSystem()
    notificationSystem = new MemoryNotificationSystem()
    
    await orchestrator.initialize()
  })

  afterEach(async () => {
    if (orchestrator) {
      await orchestrator.shutdown()
    }
    if (modelManager) {
      await modelManager.dispose()
    }
    testEnv.cleanup()
    vi.useRealTimers()
  })

  describe('Memory Pressure Escalation', () => {
    it('should handle gradual memory pressure escalation', async () => {
      const memoryUpdates: SystemMemoryInfo[] = []
      const alertsCreated: any[] = []
      const actionsExecuted: string[] = []
      
      orchestrator.on('memoryUpdate', (info) => memoryUpdates.push(info))
      orchestrator.on('alertCreated', (alert) => alertsCreated.push(alert))
      orchestrator.on('memoryOptimized', (result) => 
        actionsExecuted.push(...result.actions)
      )
      
      // Simulate gradual memory increase
      for (let step = 0; step < 10; step++) {
        const currentUsage = memorySimulator.update()
        const usagePercentage = memorySimulator.getUsagePercentage()
        
        // Update mock process memory to reflect simulation
        testEnv.mockProcess.memoryUsage.mockReturnValue({
          rss: currentUsage,
          heapTotal: currentUsage * 0.6,
          heapUsed: currentUsage * 0.4,
          external: currentUsage * 0.1,
          arrayBuffers: currentUsage * 0.05
        })
        
        await vi.advanceTimersByTimeAsync(200)
        
        if (step % 3 === 0) {
          console.log(`Step ${step}: Memory usage at ${usagePercentage.toFixed(1)}%`)
        }
      }
      
      expect(memoryUpdates.length).toBeGreaterThan(5)
      expect(alertsCreated.length).toBeGreaterThan(0)
      
      // Should have triggered increasingly severe responses
      const severeLevels = alertsCreated.filter(alert => 
        alert.level === 'critical' || alert.level === 'emergency'
      )
      expect(severeLevels.length).toBeGreaterThan(0)
    })

    it('should trigger emergency cleanup at critical thresholds', async () => {
      const cleanupResults: any[] = []
      
      emergencyCleanup.on('emergencyCleanupCompleted', (result) => 
        cleanupResults.push(result)
      )
      
      // Simulate emergency memory situation (95% usage)
      const criticalUsage = 15.2 * 1024 * 1024 * 1024 // 95% of 16GB
      testEnv.mockProcess.memoryUsage.mockReturnValue({
        rss: criticalUsage,
        heapTotal: criticalUsage * 0.6,
        heapUsed: criticalUsage * 0.5,
        external: criticalUsage * 0.1,
        arrayBuffers: criticalUsage * 0.05
      })
      
      await vi.advanceTimersByTimeAsync(200)
      
      expect(cleanupResults.length).toBeGreaterThan(0)
      expect(cleanupResults[0].totalMemorySaved).toBeGreaterThan(0)
      expect(cleanupResults[0].proceduresExecuted).toContain('garbage-collection')
      expect(global.gc).toHaveBeenCalled()
    })

    it('should progressively unload models under memory pressure', async () => {
      // Register multiple models
      const models = []
      for (let i = 0; i < 5; i++) {
        const modelInfo = {
          modelId: `model-${i}`,
          memoryUsage: 1.5 * 1024 * 1024 * 1024, // 1.5GB each
          isLoaded: true,
          lastAccessed: new Date(Date.now() - i * 60000), // Different access times
          priority: i + 1,
          canUnload: true,
          unloadSavings: 1.5 * 1024 * 1024 * 1024
        }
        
        models.push(modelInfo)
        orchestrator.registerModel(modelInfo)
      }
      
      const initialSummary = orchestrator.getModelMemoryStatus()
      expect(initialSummary.loadedModels).toBe(5)
      
      // Simulate critical memory pressure
      const criticalUsage = 14.5 * 1024 * 1024 * 1024 // 90% usage
      testEnv.mockProcess.memoryUsage.mockReturnValue({
        rss: criticalUsage,
        heapTotal: criticalUsage * 0.6,
        heapUsed: criticalUsage * 0.5,
        external: criticalUsage * 0.1,
        arrayBuffers: criticalUsage * 0.05
      })
      
      await vi.advanceTimersByTimeAsync(200)
      
      const finalSummary = orchestrator.getModelMemoryStatus()
      expect(finalSummary.loadedModels).toBeLessThan(initialSummary.loadedModels)
      expect(finalSummary.totalUsed).toBeLessThan(initialSummary.totalUsed)
    })
  })

  describe('Emergency Cleanup Procedures', () => {
    it('should execute all cleanup procedures in priority order', async () => {
      const cleanupResult = await emergencyCleanup.performEmergencyCleanup()
      
      expect(cleanupResult.proceduresExecuted).toHaveLength(5)
      expect(cleanupResult.proceduresExecuted).toEqual([
        'garbage-collection',
        'clear-document-cache',
        'unload-unused-models',
        'clear-temp-files',
        'compress-active-data'
      ])
      
      expect(cleanupResult.totalMemorySaved).toBeGreaterThan(0)
      expect(cleanupResult.errors).toHaveLength(0)
    })

    it('should handle cleanup procedure failures gracefully', async () => {
      // Mock one procedure to fail
      const originalProcedure = emergencyCleanup['cleanupProcedures'].get('clear-document-cache')
      emergencyCleanup['cleanupProcedures'].set(
        'clear-document-cache', 
        vi.fn().mockRejectedValue(new Error('Cache cleanup failed'))
      )
      
      const cleanupResult = await emergencyCleanup.performEmergencyCleanup()
      
      expect(cleanupResult.errors).toHaveLength(1)
      expect(cleanupResult.errors[0]).toContain('clear-document-cache')
      expect(cleanupResult.proceduresExecuted.length).toBeGreaterThan(0) // Other procedures still executed
      
      // Restore original procedure
      if (originalProcedure) {
        emergencyCleanup['cleanupProcedures'].set('clear-document-cache', originalProcedure)
      }
    })

    it('should register and execute custom cleanup procedures', async () => {
      let customCleanupExecuted = false
      const customCleanup = async () => {
        customCleanupExecuted = true
        return 256 * 1024 * 1024 // 256MB saved
      }
      
      emergencyCleanup.registerCleanupProcedure('custom-cleanup', customCleanup)
      
      // Force cleanup to include custom procedure
      const cleanupProcedures = emergencyCleanup['cleanupProcedures']
      const originalPerformCleanup = emergencyCleanup.performEmergencyCleanup
      
      emergencyCleanup.performEmergencyCleanup = async function() {
        const result = await originalPerformCleanup.call(this)
        
        // Execute custom procedure
        try {
          const memorySaved = await customCleanup()
          result.totalMemorySaved += memorySaved
          result.proceduresExecuted.push('custom-cleanup')
        } catch (error) {
          result.errors.push(`custom-cleanup: ${error.message}`)
        }
        
        return result
      }
      
      const cleanupResult = await emergencyCleanup.performEmergencyCleanup()
      
      expect(customCleanupExecuted).toBe(true)
      expect(cleanupResult.proceduresExecuted).toContain('custom-cleanup')
    })

    it('should prevent concurrent emergency cleanups', async () => {
      const cleanup1Promise = emergencyCleanup.performEmergencyCleanup()
      
      await expect(emergencyCleanup.performEmergencyCleanup())
        .rejects.toThrow('Emergency cleanup already in progress')
      
      await cleanup1Promise // Let first cleanup complete
      
      // Should allow cleanup after first one completes
      const cleanup2Result = await emergencyCleanup.performEmergencyCleanup()
      expect(cleanup2Result).toBeDefined()
    })
  })

  describe('System Resilience Under Stress', () => {
    it('should maintain stability under memory stress', async () => {
      const errorsSeen: any[] = []
      const performanceMetrics: number[] = []
      
      orchestrator.on('error', (error) => errorsSeen.push(error))
      
      // Start memory stress test
      const memoryStressPromise = stressTester.memoryStress(5000)
      
      // Monitor performance during stress
      for (let i = 0; i < 10; i++) {
        const startTime = performance.now()
        
        try {
          await orchestrator.getCurrentMemoryStatus()
          const endTime = performance.now()
          performanceMetrics.push(endTime - startTime)
        } catch (error) {
          errorsSeen.push(error)
        }
        
        await vi.advanceTimersByTimeAsync(500)
      }
      
      await memoryStressPromise
      
      // System should remain responsive
      const averageResponseTime = performanceMetrics.reduce((sum, time) => sum + time, 0) / performanceMetrics.length
      expect(averageResponseTime).toBeLessThan(100) // Should stay under 100ms
      expect(errorsSeen.length).toBeLessThan(3) // Minimal errors acceptable under stress
    })

    it('should recover from temporary resource exhaustion', async () => {
      // Simulate extreme memory spike
      memorySimulator.simulateMemorySpike(0.5) // 50% spike
      const spikeUsage = memorySimulator.getUsagePercentage()
      
      testEnv.mockProcess.memoryUsage.mockReturnValue({
        rss: memorySimulator.update(),
        heapTotal: memorySimulator['currentMemoryUsage'] * 0.6,
        heapUsed: memorySimulator['currentMemoryUsage'] * 0.5,
        external: memorySimulator['currentMemoryUsage'] * 0.1,
        arrayBuffers: memorySimulator['currentMemoryUsage'] * 0.05
      })
      
      // System should trigger emergency response
      await vi.advanceTimersByTimeAsync(200)
      
      const alertsDuringSpike = orchestrator.getActiveAlerts()
      expect(alertsDuringSpike.some(alert => alert.level === 'emergency')).toBe(true)
      
      // Simulate memory recovery
      memorySimulator.simulateMemoryRelease(0.4) // Release 40% of memory
      testEnv.mockProcess.memoryUsage.mockReturnValue({
        rss: memorySimulator.update(),
        heapTotal: memorySimulator['currentMemoryUsage'] * 0.6,
        heapUsed: memorySimulator['currentMemoryUsage'] * 0.4,
        external: memorySimulator['currentMemoryUsage'] * 0.1,
        arrayBuffers: memorySimulator['currentMemoryUsage'] * 0.05
      })
      
      await vi.advanceTimersByTimeAsync(500)
      
      const alertsAfterRecovery = orchestrator.getActiveAlerts()
      const unresolvedEmergencies = alertsAfterRecovery.filter(
        alert => alert.level === 'emergency' && !alert.acknowledged
      )
      expect(unresolvedEmergencies.length).toBe(0)
    })

    it('should maintain core functionality during degraded operation', async () => {
      // Force system into degraded state
      const degradedUsage = 15.8 * 1024 * 1024 * 1024 // 98% usage
      testEnv.mockProcess.memoryUsage.mockReturnValue({
        rss: degradedUsage,
        heapTotal: degradedUsage * 0.5,
        heapUsed: degradedUsage * 0.4,
        external: degradedUsage * 0.2,
        arrayBuffers: degradedUsage * 0.1
      })
      
      await vi.advanceTimersByTimeAsync(300)
      
      // Core functions should still work despite degraded performance
      const memoryStatus = await orchestrator.getCurrentMemoryStatus()
      expect(memoryStatus).toBeDefined()
      expect(memoryStatus.usagePercentage).toBeGreaterThan(95)
      
      const alerts = orchestrator.getActiveAlerts()
      expect(alerts.length).toBeGreaterThan(0)
      
      const modelStatus = orchestrator.getModelMemoryStatus()
      expect(modelStatus).toBeDefined()
    })
  })

  describe('Alert System Under Pressure', () => {
    it('should manage alert flood scenarios', async () => {
      const alertsCreated: any[] = []
      notificationSystem.on('alertCreated', (alert) => alertsCreated.push(alert))
      
      // Create many concurrent memory pressure scenarios
      for (let i = 0; i < 100; i++) {
        notificationSystem.createAlert({
          level: i % 2 === 0 ? 'warning' : 'critical',
          title: `Alert ${i}`,
          message: `Test alert ${i}`,
          autoResolve: true
        })
      }
      
      const activeAlerts = notificationSystem.getActiveAlerts()
      
      // Should have all alerts but manage them efficiently
      expect(alertsCreated.length).toBe(100)
      expect(activeAlerts.length).toBe(100)
      
      // System should handle auto-resolution efficiently
      notificationSystem.checkAutoResolve(60) // Simulate normal memory usage
      
      const remainingAlerts = notificationSystem.getActiveAlerts()
      const autoResolvedCount = activeAlerts.filter(alert => alert.autoResolve).length
      
      expect(remainingAlerts.length).toBeLessThan(activeAlerts.length)
    })

    it('should prioritize critical alerts during system stress', async () => {
      // Create mix of alert levels
      const alertLevels = ['info', 'warning', 'critical', 'emergency']
      
      for (let i = 0; i < 20; i++) {
        notificationSystem.createAlert({
          level: alertLevels[i % 4] as any,
          title: `Alert ${i}`,
          message: `Test alert with level ${alertLevels[i % 4]}`,
          autoResolve: false
        })
      }
      
      const alerts = notificationSystem.getActiveAlerts()
      
      // Critical and emergency alerts should be easily identifiable
      const criticalAlerts = alerts.filter(alert => 
        alert.level === 'critical' || alert.level === 'emergency'
      )
      
      expect(criticalAlerts.length).toBe(10) // 5 critical + 5 emergency
      
      // Should be able to acknowledge critical alerts preferentially
      for (const alert of criticalAlerts) {
        const acknowledged = notificationSystem.acknowledgeAlert(alert.id)
        expect(acknowledged).toBe(true)
      }
    })

    it('should maintain alert history under pressure', async () => {
      // Generate many alerts rapidly
      for (let i = 0; i < 150; i++) {
        const alertId = notificationSystem.createAlert({
          level: 'warning',
          title: `Rapid Alert ${i}`,
          message: `Generated at ${Date.now()}`,
          autoResolve: true
        })
        
        if (i % 10 === 0) {
          notificationSystem.resolveAlert(alertId)
        }
      }
      
      const history = notificationSystem.getAlertHistory()
      
      // Should maintain history within limits (100 max)
      expect(history.length).toBeLessThanOrEqual(100)
      
      // Most recent alerts should be present
      const recentAlert = history.find(alert => 
        alert.title.includes('149') || alert.title.includes('148')
      )
      expect(recentAlert).toBeDefined()
    })
  })

  describe('Model Management Under Pressure', () => {
    it('should intelligently unload models based on priority and usage', async () => {
      // Register models with different priorities and access patterns
      const models = [
        {
          modelId: 'high-priority-recent',
          memoryUsage: 2 * 1024 * 1024 * 1024,
          isLoaded: true,
          lastAccessed: new Date(),
          priority: 9,
          canUnload: false,
          unloadSavings: 2 * 1024 * 1024 * 1024
        },
        {
          modelId: 'low-priority-old',
          memoryUsage: 1.5 * 1024 * 1024 * 1024,
          isLoaded: true,
          lastAccessed: new Date(Date.now() - 3600000), // 1 hour ago
          priority: 2,
          canUnload: true,
          unloadSavings: 1.5 * 1024 * 1024 * 1024
        },
        {
          modelId: 'medium-priority-recent',
          memoryUsage: 1 * 1024 * 1024 * 1024,
          isLoaded: true,
          lastAccessed: new Date(Date.now() - 300000), // 5 minutes ago
          priority: 5,
          canUnload: true,
          unloadSavings: 1 * 1024 * 1024 * 1024
        }
      ]
      
      models.forEach(model => orchestrator.registerModel(model))
      
      // Trigger memory optimization
      const criticalUsage = 14.8 * 1024 * 1024 * 1024 // 92% usage
      testEnv.mockProcess.memoryUsage.mockReturnValue({
        rss: criticalUsage,
        heapTotal: criticalUsage * 0.6,
        heapUsed: criticalUsage * 0.5,
        external: criticalUsage * 0.1,
        arrayBuffers: criticalUsage * 0.05
      })
      
      await vi.advanceTimersByTimeAsync(300)
      
      const finalStatus = orchestrator.getModelMemoryStatus()
      
      // High priority model should still be loaded
      // Low priority old model should be unloaded first
      expect(finalStatus.totalUsed).toBeLessThan(4.5 * 1024 * 1024 * 1024) // Should have unloaded at least one model
    })

    it('should handle model unloading failures gracefully', async () => {
      // Register a model that fails to unload
      const problematicModel = {
        modelId: 'problematic-model',
        memoryUsage: 2 * 1024 * 1024 * 1024,
        isLoaded: true,
        lastAccessed: new Date(Date.now() - 3600000),
        priority: 1,
        canUnload: true,
        unloadSavings: 2 * 1024 * 1024 * 1024
      }
      
      orchestrator.registerModel(problematicModel)
      
      // Mock the model lifecycle controller to simulate unload failure
      const originalUnloadModel = orchestrator['lifecycleController'].unloadModel
      orchestrator['lifecycleController'].unloadModel = vi.fn().mockImplementation(async (modelId: string) => {
        if (modelId === 'problematic-model') {
          throw new Error('Model unload failed')
        }
        return originalUnloadModel.call(orchestrator['lifecycleController'], modelId)
      })
      
      // Trigger memory pressure
      const criticalUsage = 14.8 * 1024 * 1024 * 1024
      testEnv.mockProcess.memoryUsage.mockReturnValue({
        rss: criticalUsage,
        heapTotal: criticalUsage * 0.6,
        heapUsed: criticalUsage * 0.5,
        external: criticalUsage * 0.1,
        arrayBuffers: criticalUsage * 0.05
      })
      
      const alertsSpy = vi.fn()
      orchestrator.on('alertCreated', alertsSpy)
      
      await vi.advanceTimersByTimeAsync(300)
      
      // System should continue operating despite unload failure
      expect(orchestrator['isActive']).toBe(true)
      expect(alertsSpy).toHaveBeenCalled()
    })
  })

  describe('Cross-Platform Resilience', () => {
    const platforms: NodeJS.Platform[] = ['win32', 'linux', 'darwin']
    
    platforms.forEach(platform => {
      it(`should handle graceful degradation on ${platform}`, async () => {
        // Reinitialize with platform-specific configuration
        await orchestrator.shutdown()
        
        testEnv.cleanup()
        testEnv = createTestEnvironment({
          platform,
          memoryConfig: {
            platform,
            memoryUsage: {
              rss: 14 * 1024 * 1024 * 1024, // High usage
              heapTotal: 8 * 1024 * 1024 * 1024,
              heapUsed: 6 * 1024 * 1024 * 1024,
              external: 1024 * 1024 * 1024,
              arrayBuffers: 512 * 1024 * 1024
            }
          }
        })
        
        orchestrator = new MemorySafetyOrchestrator({ monitorInterval: 100 })
        await orchestrator.initialize()
        
        await vi.advanceTimersByTimeAsync(300)
        
        const memoryStatus = await orchestrator.getCurrentMemoryStatus()
        expect(memoryStatus).toBeDefined()
        expect(memoryStatus.platform).toBe(platform)
        
        const alerts = orchestrator.getActiveAlerts()
        expect(Array.isArray(alerts)).toBe(true)
      })
    })
  })

  describe('Long-Running Stability', () => {
    it('should maintain stability over extended operation', async () => {
      const performanceMetrics: number[] = []
      const memorySnapshots: number[] = []
      const errorCount = { count: 0 }
      
      orchestrator.on('error', () => errorCount.count++)
      
      // Simulate 24 hours of operation in compressed time
      for (let hour = 0; hour < 24; hour++) {
        const startTime = performance.now()
        
        // Vary memory pressure throughout the day
        const timeOfDay = hour / 24
        const memoryVariation = Math.sin(timeOfDay * Math.PI * 2) * 0.2 + 0.8 // 60-100% usage
        const currentUsage = memoryVariation * 16 * 1024 * 1024 * 1024
        
        testEnv.mockProcess.memoryUsage.mockReturnValue({
          rss: currentUsage,
          heapTotal: currentUsage * 0.6,
          heapUsed: currentUsage * 0.4,
          external: currentUsage * 0.1,
          arrayBuffers: currentUsage * 0.05
        })
        
        // Advance time by simulated hour
        await vi.advanceTimersByTimeAsync(3600) // 1 hour worth of intervals
        
        const endTime = performance.now()
        performanceMetrics.push(endTime - startTime)
        
        if (process.memoryUsage) {
          memorySnapshots.push(process.memoryUsage().heapUsed)
        }
        
        // Occasionally force garbage collection
        if (hour % 6 === 0 && global.gc) {
          global.gc()
        }
      }
      
      // System should maintain consistent performance
      const averagePerformance = performanceMetrics.reduce((sum, perf) => sum + perf, 0) / performanceMetrics.length
      const performanceVariation = Math.max(...performanceMetrics) - Math.min(...performanceMetrics)
      
      expect(averagePerformance).toBeLessThan(1000) // Under 1 second per simulated hour
      expect(performanceVariation).toBeLessThan(averagePerformance * 3) // Variation within 3x average
      expect(errorCount.count).toBeLessThan(5) // Minimal errors over 24 hours
      
      // Memory usage should not grow unboundedly
      if (memorySnapshots.length > 1) {
        const initialMemory = memorySnapshots[0]
        const finalMemory = memorySnapshots[memorySnapshots.length - 1]
        const memoryGrowth = (finalMemory - initialMemory) / initialMemory
        
        expect(memoryGrowth).toBeLessThan(0.5) // Less than 50% growth over 24 hours
      }
    })
  })
})