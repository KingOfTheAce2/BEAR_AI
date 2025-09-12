/**
 * Performance Tests for Memory Overhead
 * Testing memory monitoring system performance and resource usage
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { performance, PerformanceObserver } from 'perf_hooks'
import { 
  MemoryMonitor,
  getGlobalMemoryMonitor,
  DEFAULT_MEMORY_CONFIG
} from '../../src/utils/memoryMonitor'
import { MemorySafetyOrchestrator } from '../../src/integrations/memory-safety-system'
import { SystemResourceDetector } from '../../src/utils/systemResources'
import { CoreModelManager } from '../../src/services/modelManager'

// Performance measurement utilities
interface PerformanceMetrics {
  memoryUsage: {
    initial: number
    peak: number
    final: number
    delta: number
  }
  executionTime: {
    total: number
    average: number
    min: number
    max: number
  }
  resourceUsage: {
    cpuTime: number
    heapUsed: number
    external: number
  }
}

class PerformanceProfiler {
  private startTime: number = 0
  private measurements: number[] = []
  private memorySnapshots: number[] = []
  
  start() {
    if (global.gc) {
      global.gc() // Force garbage collection before measurement
    }
    this.startTime = performance.now()
    this.memorySnapshots.push(process.memoryUsage().heapUsed)
  }
  
  measure(label?: string) {
    const currentTime = performance.now()
    const duration = currentTime - this.startTime
    this.measurements.push(duration)
    this.memorySnapshots.push(process.memoryUsage().heapUsed)
    
    if (label) {
      console.log(`${label}: ${duration.toFixed(2)}ms`)
    }
    
    return duration
  }
  
  getMetrics(): PerformanceMetrics {
    const memoryUsages = this.memorySnapshots
    const executionTimes = this.measurements
    const memoryUsage = process.memoryUsage()
    
    return {
      memoryUsage: {
        initial: memoryUsages[0] || 0,
        peak: Math.max(...memoryUsages),
        final: memoryUsages[memoryUsages.length - 1] || 0,
        delta: (memoryUsages[memoryUsages.length - 1] || 0) - (memoryUsages[0] || 0)
      },
      executionTime: {
        total: executionTimes.reduce((sum, time) => sum + time, 0),
        average: executionTimes.length > 0 ? executionTimes.reduce((sum, time) => sum + time, 0) / executionTimes.length : 0,
        min: Math.min(...executionTimes),
        max: Math.max(...executionTimes)
      },
      resourceUsage: {
        cpuTime: process.cpuUsage().user / 1000, // Convert to milliseconds
        heapUsed: memoryUsage.heapUsed,
        external: memoryUsage.external
      }
    }
  }
  
  reset() {
    this.measurements = []
    this.memorySnapshots = []
    this.startTime = 0
  }
}

describe('Memory System Performance Tests', () => {
  let profiler: PerformanceProfiler
  
  beforeEach(() => {
    profiler = new PerformanceProfiler()
    vi.useFakeTimers()
  })
  
  afterEach(() => {
    vi.useRealTimers()
    if (global.gc) {
      global.gc()
    }
  })

  describe('Memory Monitor Performance', () => {
    it('should have minimal startup overhead', () => {
      profiler.start()
      
      const monitor = new MemoryMonitor({
        updateInterval: 1000,
        enableDetailedMonitoring: true
      })
      
      const startupTime = profiler.measure('Memory Monitor Creation')
      
      expect(startupTime).toBeLessThan(50) // Should take less than 50ms to create
      
      monitor.destroy()
    })

    it('should efficiently collect memory information', async () => {
      const monitor = new MemoryMonitor({ updateInterval: 100 })
      
      profiler.start()
      
      // Collect memory info multiple times
      for (let i = 0; i < 100; i++) {
        monitor['collectMemoryInfo']()
        if (i % 10 === 0) {
          profiler.measure(`Collection ${i}`)
        }
      }
      
      const metrics = profiler.getMetrics()
      
      expect(metrics.executionTime.average).toBeLessThan(5) // Less than 5ms average
      expect(metrics.memoryUsage.delta).toBeLessThan(10 * 1024 * 1024) // Less than 10MB growth
      
      monitor.destroy()
    })

    it('should maintain performance under high frequency monitoring', async () => {
      const monitor = new MemoryMonitor({ updateInterval: 10 }) // Very frequent updates
      
      profiler.start()
      monitor.start()
      
      // Run for simulated 5 seconds
      await vi.advanceTimersByTimeAsync(5000)
      
      const collectionTime = profiler.measure('High Frequency Monitoring')
      
      expect(collectionTime).toBeLessThan(1000) // Should complete in under 1 second
      
      monitor.destroy()
    })

    it('should scale efficiently with history size', () => {
      const smallHistoryMonitor = new MemoryMonitor({ maxHistoryLength: 10 })
      const largeHistoryMonitor = new MemoryMonitor({ maxHistoryLength: 1000 })
      
      profiler.start()
      
      // Add history to small monitor
      for (let i = 0; i < 50; i++) {
        smallHistoryMonitor['addToHistory']({
          timestamp: Date.now(),
          totalMemory: 1024 * 1024 * 1024,
          availableMemory: 512 * 1024 * 1024,
          usedMemory: 512 * 1024 * 1024,
          processMemory: 100 * 1024 * 1024,
          usagePercentage: 50
        })
      }
      
      const smallHistoryTime = profiler.measure('Small History Updates')
      
      // Add same amount to large monitor
      for (let i = 0; i < 50; i++) {
        largeHistoryMonitor['addToHistory']({
          timestamp: Date.now(),
          totalMemory: 1024 * 1024 * 1024,
          availableMemory: 512 * 1024 * 1024,
          usedMemory: 512 * 1024 * 1024,
          processMemory: 100 * 1024 * 1024,
          usagePercentage: 50
        })
      }
      
      const largeHistoryTime = profiler.measure('Large History Updates')
      
      // Performance should be similar regardless of max history size
      const performanceDifference = largeHistoryTime - smallHistoryTime
      expect(performanceDifference).toBeLessThan(20) // Less than 20ms difference
      
      smallHistoryMonitor.destroy()
      largeHistoryMonitor.destroy()
    })

    it('should handle many concurrent subscribers efficiently', () => {
      const monitor = new MemoryMonitor()
      const subscribers = []
      
      profiler.start()
      
      // Add 100 subscribers
      for (let i = 0; i < 100; i++) {
        const callback = vi.fn()
        subscribers.push(monitor.subscribe(callback))
      }
      
      const subscriptionTime = profiler.measure('100 Subscriptions')
      
      // Trigger notifications
      monitor['notifyListeners']({
        timestamp: Date.now(),
        totalMemory: 1024 * 1024 * 1024,
        availableMemory: 512 * 1024 * 1024,
        usedMemory: 512 * 1024 * 1024,
        processMemory: 100 * 1024 * 1024,
        usagePercentage: 50
      })
      
      const notificationTime = profiler.measure('Notify 100 Subscribers')
      
      expect(subscriptionTime).toBeLessThan(50) // Quick subscription
      expect(notificationTime).toBeLessThan(30) // Quick notification
      
      // Cleanup
      subscribers.forEach(unsub => unsub())
      monitor.destroy()
    })
  })

  describe('Memory Safety Orchestrator Performance', () => {
    it('should initialize quickly', async () => {
      profiler.start()
      
      const orchestrator = new MemorySafetyOrchestrator({
        monitorInterval: 1000
      })
      
      await orchestrator.initialize()
      
      const initTime = profiler.measure('Orchestrator Initialization')
      
      expect(initTime).toBeLessThan(200) // Should initialize in under 200ms
      
      await orchestrator.shutdown()
    })

    it('should handle threshold evaluations efficiently', async () => {
      const orchestrator = new MemorySafetyOrchestrator({ monitorInterval: 100 })
      await orchestrator.initialize()
      
      profiler.start()
      
      // Simulate many memory updates
      for (let i = 0; i < 1000; i++) {
        const memoryInfo = {
          total: 16 * 1024 * 1024 * 1024,
          used: (8 + Math.random() * 4) * 1024 * 1024 * 1024,
          available: 8 * 1024 * 1024 * 1024,
          usagePercentage: 50 + Math.random() * 30,
          platform: 'win32' as const
        }
        
        orchestrator['thresholdManager'].evaluateMemoryUsage(memoryInfo)
      }
      
      const evaluationTime = profiler.measure('1000 Threshold Evaluations')
      
      expect(evaluationTime).toBeLessThan(100) // Should complete quickly
      
      await orchestrator.shutdown()
    })

    it('should manage model lifecycle efficiently', async () => {
      const orchestrator = new MemorySafetyOrchestrator()
      await orchestrator.initialize()
      
      profiler.start()
      
      // Register many models
      for (let i = 0; i < 50; i++) {
        orchestrator.registerModel({
          modelId: `model-${i}`,
          memoryUsage: Math.random() * 2 * 1024 * 1024 * 1024,
          isLoaded: Math.random() > 0.5,
          lastAccessed: new Date(Date.now() - Math.random() * 3600000),
          priority: Math.floor(Math.random() * 10),
          canUnload: true,
          unloadSavings: Math.random() * 1024 * 1024 * 1024
        })
      }
      
      const registrationTime = profiler.measure('50 Model Registrations')
      
      // Get status multiple times
      for (let i = 0; i < 100; i++) {
        orchestrator.getModelMemoryStatus()
      }
      
      const statusTime = profiler.measure('100 Status Queries')
      
      expect(registrationTime).toBeLessThan(50) // Quick registration
      expect(statusTime).toBeLessThan(20) // Quick status queries
      
      await orchestrator.shutdown()
    })
  })

  describe('System Resource Detection Performance', () => {
    it('should detect system info quickly', () => {
      profiler.start()
      
      const detector = SystemResourceDetector.getInstance()
      const systemInfo = detector.getSystemInfo()
      
      const detectionTime = profiler.measure('System Info Detection')
      
      expect(detectionTime).toBeLessThan(100) // Should be very fast
      expect(systemInfo).toBeDefined()
    })

    it('should handle repeated queries efficiently', () => {
      const detector = SystemResourceDetector.getInstance()
      
      profiler.start()
      
      // Query system info many times
      for (let i = 0; i < 1000; i++) {
        detector.getSystemInfo()
      }
      
      const queryTime = profiler.measure('1000 System Info Queries')
      
      expect(queryTime).toBeLessThan(50) // Should be cached and very fast
    })

    it('should perform capability detection efficiently', () => {
      profiler.start()
      
      const detector = SystemResourceDetector.getInstance()
      const capabilities = detector.getSystemInfo().capabilities
      
      const capabilityTime = profiler.measure('Capability Detection')
      
      expect(capabilityTime).toBeLessThan(50)
      expect(capabilities).toBeDefined()
    })

    it('should generate optimal configs quickly', () => {
      const detector = SystemResourceDetector.getInstance()
      
      profiler.start()
      
      for (let i = 0; i < 100; i++) {
        detector.getOptimalConfig()
      }
      
      const configTime = profiler.measure('100 Optimal Config Generations')
      
      expect(configTime).toBeLessThan(30)
    })
  })

  describe('Model Manager Performance', () => {
    it('should handle model registration efficiently', async () => {
      const modelManager = new CoreModelManager()
      
      profiler.start()
      
      // Register many models
      for (let i = 0; i < 100; i++) {
        modelManager.registerModel({
          id: `model-${i}`,
          name: `Test Model ${i}`,
          path: `/models/test-${i}.gguf`,
          type: 'GPT4ALL' as any,
          size: Math.random() * 8 * 1024 * 1024 * 1024,
          quantization: 'Q4_K_M',
          capabilities: ['legal-analysis'],
          priority: 5,
          metadata: {}
        })
      }
      
      const registrationTime = profiler.measure('100 Model Registrations')
      
      expect(registrationTime).toBeLessThan(100)
      
      await modelManager.dispose()
    })

    it('should track statistics efficiently', async () => {
      const modelManager = new CoreModelManager()
      
      // Register some models first
      for (let i = 0; i < 10; i++) {
        modelManager.registerModel({
          id: `model-${i}`,
          name: `Test Model ${i}`,
          path: `/models/test-${i}.gguf`,
          type: 'GPT4ALL' as any,
          size: 2 * 1024 * 1024 * 1024,
          quantization: 'Q4_K_M',
          capabilities: [],
          priority: 5,
          metadata: {}
        })
      }
      
      profiler.start()
      
      // Get stats many times
      for (let i = 0; i < 1000; i++) {
        modelManager.getStats()
      }
      
      const statsTime = profiler.measure('1000 Stats Queries')
      
      expect(statsTime).toBeLessThan(50)
      
      await modelManager.dispose()
    })
  })

  describe('Memory Footprint Analysis', () => {
    it('should have reasonable memory footprint for monitoring system', () => {
      if (global.gc) global.gc()
      
      const initialMemory = process.memoryUsage().heapUsed
      
      // Create monitoring system
      const monitor = new MemoryMonitor({
        updateInterval: 1000,
        maxHistoryLength: 100
      })
      
      const orchestrator = new MemorySafetyOrchestrator()
      const detector = SystemResourceDetector.getInstance()
      
      monitor.start()
      
      // Use the system for a bit
      for (let i = 0; i < 50; i++) {
        monitor.getCurrentMemoryInfo()
        detector.getSystemInfo()
      }
      
      if (global.gc) global.gc()
      
      const finalMemory = process.memoryUsage().heapUsed
      const memoryIncrease = finalMemory - initialMemory
      
      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024)
      
      monitor.destroy()
    })

    it('should not leak memory during continuous operation', async () => {
      if (global.gc) global.gc()
      
      const initialMemory = process.memoryUsage().heapUsed
      const monitor = new MemoryMonitor({ updateInterval: 10 })
      
      monitor.start()
      
      // Run for simulated extended period
      for (let cycle = 0; cycle < 10; cycle++) {
        await vi.advanceTimersByTimeAsync(1000)
        
        // Force periodic cleanup
        if (cycle % 3 === 0 && global.gc) {
          global.gc()
        }
      }
      
      monitor.destroy()
      
      if (global.gc) global.gc()
      
      const finalMemory = process.memoryUsage().heapUsed
      const memoryIncrease = finalMemory - initialMemory
      
      // Should not have significant memory growth
      expect(memoryIncrease).toBeLessThan(20 * 1024 * 1024) // Less than 20MB
    })

    it('should efficiently manage event listeners', () => {
      const monitor = new MemoryMonitor()
      const callbacks = []
      
      if (global.gc) global.gc()
      const initialMemory = process.memoryUsage().heapUsed
      
      // Add many subscribers
      for (let i = 0; i < 1000; i++) {
        callbacks.push(monitor.subscribe(() => {}))
      }
      
      if (global.gc) global.gc()
      const withSubscribersMemory = process.memoryUsage().heapUsed
      
      // Remove all subscribers
      callbacks.forEach(unsubscribe => unsubscribe())
      
      if (global.gc) global.gc()
      const afterCleanupMemory = process.memoryUsage().heapUsed
      
      const subscriptionOverhead = withSubscribersMemory - initialMemory
      const cleanupEffectiveness = withSubscribersMemory - afterCleanupMemory
      
      // Subscription overhead should be reasonable
      expect(subscriptionOverhead).toBeLessThan(10 * 1024 * 1024) // Less than 10MB
      
      // Cleanup should free most of the memory
      expect(cleanupEffectiveness / subscriptionOverhead).toBeGreaterThan(0.8) // 80% cleanup
      
      monitor.destroy()
    })
  })

  describe('Concurrent Operation Performance', () => {
    it('should handle concurrent memory monitoring efficiently', async () => {
      const monitors = []
      
      profiler.start()
      
      // Create multiple monitors
      for (let i = 0; i < 10; i++) {
        const monitor = new MemoryMonitor({ updateInterval: 100 })
        monitors.push(monitor)
        monitor.start()
      }
      
      const setupTime = profiler.measure('10 Concurrent Monitors Setup')
      
      // Run concurrently
      await vi.advanceTimersByTimeAsync(2000)
      
      const operationTime = profiler.measure('2 Seconds Concurrent Operation')
      
      expect(setupTime).toBeLessThan(100)
      expect(operationTime).toBeLessThan(500)
      
      // Cleanup
      monitors.forEach(monitor => monitor.destroy())
    })

    it('should maintain performance under concurrent alerts', async () => {
      const orchestrator = new MemorySafetyOrchestrator({ monitorInterval: 50 })
      await orchestrator.initialize()
      
      profiler.start()
      
      // Create many concurrent alerts
      const promises = []
      for (let i = 0; i < 100; i++) {
        promises.push(
          Promise.resolve().then(() => {
            const memoryInfo = {
              total: 16 * 1024 * 1024 * 1024,
              used: 14 * 1024 * 1024 * 1024, // High usage to trigger alerts
              available: 2 * 1024 * 1024 * 1024,
              usagePercentage: 87.5,
              platform: 'win32' as const
            }
            orchestrator['thresholdManager'].evaluateMemoryUsage(memoryInfo)
          })
        )
      }
      
      await Promise.all(promises)
      
      const concurrentTime = profiler.measure('100 Concurrent Alert Evaluations')
      
      expect(concurrentTime).toBeLessThan(200)
      
      await orchestrator.shutdown()
    })
  })

  describe('Resource Cleanup Performance', () => {
    it('should cleanup resources quickly', async () => {
      const monitor = new MemoryMonitor({ updateInterval: 100 })
      const orchestrator = new MemorySafetyOrchestrator()
      const modelManager = new CoreModelManager()
      
      // Initialize everything
      monitor.start()
      await orchestrator.initialize()
      
      profiler.start()
      
      // Cleanup
      monitor.destroy()
      await orchestrator.shutdown()
      await modelManager.dispose()
      
      const cleanupTime = profiler.measure('Full System Cleanup')
      
      expect(cleanupTime).toBeLessThan(300) // Should cleanup quickly
    })

    it('should handle repeated initialization/cleanup cycles', async () => {
      profiler.start()
      
      for (let cycle = 0; cycle < 10; cycle++) {
        const orchestrator = new MemorySafetyOrchestrator()
        await orchestrator.initialize()
        
        // Do some work
        for (let i = 0; i < 10; i++) {
          await orchestrator.getCurrentMemoryStatus()
        }
        
        await orchestrator.shutdown()
        
        if (cycle % 3 === 0) {
          profiler.measure(`Cycle ${cycle}`)
        }
      }
      
      const totalCycleTime = profiler.measure('10 Init/Cleanup Cycles')
      const averageCycleTime = totalCycleTime / 10
      
      expect(averageCycleTime).toBeLessThan(200) // Each cycle should be fast
    })
  })
})

describe('Performance Regression Tests', () => {
  let profiler: PerformanceProfiler
  
  beforeEach(() => {
    profiler = new PerformanceProfiler()
  })

  afterEach(() => {
    if (global.gc) global.gc()
  })

  it('should not regress in memory monitor creation time', () => {
    const iterations = 100
    const times: number[] = []
    
    for (let i = 0; i < iterations; i++) {
      profiler.start()
      const monitor = new MemoryMonitor()
      times.push(profiler.measure())
      monitor.destroy()
    }
    
    const averageTime = times.reduce((sum, time) => sum + time, 0) / times.length
    const maxTime = Math.max(...times)
    
    // Performance benchmarks based on expected performance
    expect(averageTime).toBeLessThan(5) // Average under 5ms
    expect(maxTime).toBeLessThan(50) // Max under 50ms
  })

  it('should not regress in system detection performance', () => {
    const iterations = 50
    const times: number[] = []
    
    for (let i = 0; i < iterations; i++) {
      // Reset singleton for fair test
      SystemResourceDetector['instance'] = null
      
      profiler.start()
      SystemResourceDetector.getInstance().getSystemInfo()
      times.push(profiler.measure())
    }
    
    const averageTime = times.reduce((sum, time) => sum + time, 0) / times.length
    
    expect(averageTime).toBeLessThan(20) // Should be under 20ms average
  })

  it('should maintain consistent performance under load', async () => {
    const monitor = new MemoryMonitor({ updateInterval: 10 })
    const performanceData: number[] = []
    
    monitor.start()
    
    // Measure performance over time
    for (let phase = 0; phase < 10; phase++) {
      profiler.start()
      
      await vi.advanceTimersByTimeAsync(1000)
      
      performanceData.push(profiler.measure())
    }
    
    // Performance should not degrade significantly over time
    const firstHalf = performanceData.slice(0, 5)
    const secondHalf = performanceData.slice(5)
    
    const firstHalfAvg = firstHalf.reduce((sum, time) => sum + time, 0) / firstHalf.length
    const secondHalfAvg = secondHalf.reduce((sum, time) => sum + time, 0) / secondHalf.length
    
    const performanceDegradation = (secondHalfAvg - firstHalfAvg) / firstHalfAvg
    
    // Less than 50% performance degradation over time
    expect(performanceDegradation).toBeLessThan(0.5)
    
    monitor.destroy()
  })
})