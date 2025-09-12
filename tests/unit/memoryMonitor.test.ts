/**
 * Unit Tests for Memory Monitor
 * Comprehensive testing of memory monitoring utilities
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { 
  MemoryMonitor, 
  getGlobalMemoryMonitor,
  formatMemorySize,
  formatMemoryPercentage,
  getMemoryUsageSeverity,
  DEFAULT_MEMORY_CONFIG 
} from '../../src/utils/memoryMonitor'

// Mock performance API
const mockPerformance = {
  memory: {
    usedJSHeapSize: 50 * 1024 * 1024, // 50MB
    totalJSHeapSize: 100 * 1024 * 1024, // 100MB
    jsHeapSizeLimit: 2 * 1024 * 1024 * 1024 // 2GB
  },
  measureUserAgentSpecificMemory: vi.fn().mockResolvedValue({
    bytes: 50 * 1024 * 1024
  })
}

// Mock navigator
const mockNavigator = {
  hardwareConcurrency: 8,
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  platform: 'Win32'
}

describe('MemoryMonitor', () => {
  let monitor: MemoryMonitor

  beforeEach(() => {
    // Setup global mocks
    global.performance = mockPerformance as any
    global.navigator = mockNavigator as any
    global.PerformanceObserver = vi.fn().mockImplementation(() => ({
      observe: vi.fn(),
      disconnect: vi.fn()
    }))
    
    vi.clearAllTimers()
    vi.useFakeTimers()
  })

  afterEach(() => {
    if (monitor) {
      monitor.destroy()
    }
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  describe('Constructor and Configuration', () => {
    it('should initialize with default configuration', () => {
      monitor = new MemoryMonitor()
      expect(monitor).toBeDefined()
      expect(monitor.getMemoryStatus()).toBe('normal')
    })

    it('should accept custom configuration', () => {
      const customConfig = {
        updateInterval: 500,
        thresholds: {
          warning: 60,
          critical: 85,
          maxSafe: 70
        },
        maxHistoryLength: 50
      }
      
      monitor = new MemoryMonitor(customConfig)
      expect(monitor).toBeDefined()
    })

    it('should merge configuration with defaults', () => {
      const partialConfig = {
        updateInterval: 2000
      }
      
      monitor = new MemoryMonitor(partialConfig)
      expect(monitor).toBeDefined()
    })
  })

  describe('Memory Collection', () => {
    beforeEach(() => {
      monitor = new MemoryMonitor({ updateInterval: 100 })
    })

    it('should collect initial memory info when started', async () => {
      monitor.start()
      
      // Advance timers to trigger initial collection
      await vi.advanceTimersByTimeAsync(10)
      
      const memoryInfo = monitor.getCurrentMemoryInfo()
      expect(memoryInfo).toBeDefined()
      expect(memoryInfo?.timestamp).toBeGreaterThan(0)
      expect(memoryInfo?.usagePercentage).toBeGreaterThan(0)
    })

    it('should update memory info periodically', async () => {
      monitor.start()
      
      // Get initial reading
      await vi.advanceTimersByTimeAsync(10)
      const initial = monitor.getCurrentMemoryInfo()
      
      // Advance time and check for update
      await vi.advanceTimersByTimeAsync(100)
      const updated = monitor.getCurrentMemoryInfo()
      
      expect(updated?.timestamp).toBeGreaterThan(initial?.timestamp || 0)
    })

    it('should maintain history within configured limits', async () => {
      monitor = new MemoryMonitor({ 
        updateInterval: 10,
        maxHistoryLength: 5
      })
      
      monitor.start()
      
      // Generate multiple readings
      for (let i = 0; i < 10; i++) {
        await vi.advanceTimersByTimeAsync(10)
      }
      
      const history = monitor.getHistory()
      expect(history.length).toBeLessThanOrEqual(5)
    })
  })

  describe('Memory Status Detection', () => {
    beforeEach(() => {
      monitor = new MemoryMonitor()
    })

    it('should return normal status for low usage', () => {
      // Mock low memory usage
      global.performance = {
        ...mockPerformance,
        memory: {
          ...mockPerformance.memory,
          usedJSHeapSize: 10 * 1024 * 1024 // 10MB of 100MB = 10%
        }
      } as any

      monitor.start()
      vi.advanceTimersByTime(10)
      
      expect(monitor.getMemoryStatus()).toBe('normal')
    })

    it('should return warning status for medium usage', () => {
      global.performance = {
        ...mockPerformance,
        memory: {
          ...mockPerformance.memory,
          usedJSHeapSize: 80 * 1024 * 1024 // 80% usage
        }
      } as any

      monitor.start()
      vi.advanceTimersByTime(10)
      
      expect(monitor.getMemoryStatus()).toBe('warning')
    })

    it('should return critical status for high usage', () => {
      global.performance = {
        ...mockPerformance,
        memory: {
          ...mockPerformance.memory,
          usedJSHeapSize: 95 * 1024 * 1024 // 95% usage
        }
      } as any

      monitor.start()
      vi.advanceTimersByTime(10)
      
      expect(monitor.getMemoryStatus()).toBe('critical')
    })
  })

  describe('Memory Trend Analysis', () => {
    beforeEach(() => {
      monitor = new MemoryMonitor({ updateInterval: 100 })
      monitor.start()
    })

    it('should detect stable trend with minimal changes', async () => {
      // Generate stable readings
      for (let i = 0; i < 5; i++) {
        await vi.advanceTimersByTimeAsync(100)
      }
      
      const trend = monitor.getMemoryTrend()
      expect(trend.direction).toBe('stable')
      expect(Math.abs(trend.rate)).toBeLessThan(1024 * 1024) // Less than 1MB/s
    })

    it('should detect increasing trend', async () => {
      let memoryUsage = 50 * 1024 * 1024
      
      // Mock increasing memory usage
      const originalPerformance = global.performance
      global.performance = {
        ...mockPerformance,
        memory: {
          ...mockPerformance.memory,
          get usedJSHeapSize() {
            return memoryUsage += 5 * 1024 * 1024 // Increase by 5MB each time
          }
        }
      } as any

      for (let i = 0; i < 5; i++) {
        await vi.advanceTimersByTimeAsync(100)
      }
      
      const trend = monitor.getMemoryTrend()
      expect(trend.direction).toBe('increasing')
      expect(trend.rate).toBeGreaterThan(1024 * 1024) // More than 1MB/s
      
      global.performance = originalPerformance
    })

    it('should provide confidence level for trend analysis', async () => {
      for (let i = 0; i < 3; i++) {
        await vi.advanceTimersByTimeAsync(100)
      }
      
      const trend = monitor.getMemoryTrend()
      expect(trend.confidence).toBeGreaterThan(0)
      expect(trend.confidence).toBeLessThanOrEqual(1)
    })
  })

  describe('Event System', () => {
    beforeEach(() => {
      monitor = new MemoryMonitor({ updateInterval: 100 })
    })

    it('should call subscribers with memory updates', async () => {
      const callback = vi.fn()
      const unsubscribe = monitor.subscribe(callback)
      
      monitor.start()
      await vi.advanceTimersByTimeAsync(100)
      
      expect(callback).toHaveBeenCalled()
      expect(callback.mock.calls[0][0]).toHaveProperty('timestamp')
      expect(callback.mock.calls[0][0]).toHaveProperty('usagePercentage')
      
      unsubscribe()
    })

    it('should send current info immediately to new subscribers', () => {
      monitor.start()
      vi.advanceTimersByTime(10)
      
      const callback = vi.fn()
      monitor.subscribe(callback)
      
      expect(callback).toHaveBeenCalledOnce()
    })

    it('should handle subscriber errors gracefully', async () => {
      const errorCallback = vi.fn().mockImplementation(() => {
        throw new Error('Subscriber error')
      })
      const normalCallback = vi.fn()
      
      monitor.subscribe(errorCallback)
      monitor.subscribe(normalCallback)
      
      monitor.start()
      await vi.advanceTimersByTimeAsync(100)
      
      // Normal callback should still be called despite error in other callback
      expect(normalCallback).toHaveBeenCalled()
    })

    it('should properly unsubscribe callbacks', async () => {
      const callback = vi.fn()
      const unsubscribe = monitor.subscribe(callback)
      
      monitor.start()
      await vi.advanceTimersByTimeAsync(100)
      expect(callback).toHaveBeenCalled()
      
      callback.mockClear()
      unsubscribe()
      
      await vi.advanceTimersByTimeAsync(100)
      expect(callback).not.toHaveBeenCalled()
    })
  })

  describe('Platform Support', () => {
    it('should detect platform support correctly', () => {
      expect(MemoryMonitor.isSupported()).toBe(true)
    })

    it('should provide platform information', () => {
      const platformInfo = MemoryMonitor.getPlatformInfo()
      
      expect(platformInfo).toHaveProperty('platform')
      expect(platformInfo).toHaveProperty('supportsMemoryAPI')
      expect(platformInfo).toHaveProperty('supportsPerformanceObserver')
      expect(typeof platformInfo.supportsMemoryAPI).toBe('boolean')
    })

    it('should handle missing memory API gracefully', async () => {
      // Remove memory API
      const originalPerformance = global.performance
      global.performance = {} as any
      
      monitor = new MemoryMonitor()
      monitor.start()
      await vi.advanceTimersByTimeAsync(10)
      
      const memoryInfo = monitor.getCurrentMemoryInfo()
      expect(memoryInfo).toBeDefined()
      expect(memoryInfo?.totalMemory).toBeGreaterThan(0)
      
      global.performance = originalPerformance
    })
  })

  describe('Error Handling', () => {
    it('should handle performance API errors gracefully', async () => {
      global.performance = {
        memory: {
          get usedJSHeapSize() {
            throw new Error('Memory access denied')
          }
        }
      } as any
      
      monitor = new MemoryMonitor()
      monitor.start()
      
      // Should not throw
      await vi.advanceTimersByTimeAsync(100)
      
      const memoryInfo = monitor.getCurrentMemoryInfo()
      expect(memoryInfo).toBeDefined()
    })

    it('should handle PerformanceObserver creation failure', () => {
      global.PerformanceObserver = vi.fn().mockImplementation(() => {
        throw new Error('PerformanceObserver not supported')
      })
      
      expect(() => {
        monitor = new MemoryMonitor({ enablePerformanceObserver: true })
      }).not.toThrow()
    })
  })

  describe('Lifecycle Management', () => {
    beforeEach(() => {
      monitor = new MemoryMonitor({ updateInterval: 100 })
    })

    it('should start and stop monitoring correctly', () => {
      expect(monitor['isMonitoring']).toBe(false)
      
      monitor.start()
      expect(monitor['isMonitoring']).toBe(true)
      
      monitor.stop()
      expect(monitor['isMonitoring']).toBe(false)
    })

    it('should not start multiple intervals', () => {
      monitor.start()
      const firstInterval = monitor['intervalId']
      
      monitor.start() // Call again
      expect(monitor['intervalId']).toBe(firstInterval)
    })

    it('should clean up resources on destroy', () => {
      const callback = vi.fn()
      monitor.subscribe(callback)
      monitor.start()
      
      monitor.destroy()
      
      expect(monitor['isMonitoring']).toBe(false)
      expect(monitor['listeners'].size).toBe(0)
      expect(monitor.getHistory()).toHaveLength(0)
    })
  })
})

describe('Global Memory Monitor', () => {
  afterEach(() => {
    // Clean up singleton
    const globalMonitor = getGlobalMemoryMonitor()
    globalMonitor.destroy()
  })

  it('should create singleton instance', () => {
    const monitor1 = getGlobalMemoryMonitor()
    const monitor2 = getGlobalMemoryMonitor()
    
    expect(monitor1).toBe(monitor2)
  })

  it('should accept configuration on first call', () => {
    const config = { updateInterval: 500 }
    const monitor = getGlobalMemoryMonitor(config)
    
    expect(monitor).toBeDefined()
  })
})

describe('Utility Functions', () => {
  describe('formatMemorySize', () => {
    it('should format bytes correctly', () => {
      expect(formatMemorySize(0)).toBe('0.0 B')
      expect(formatMemorySize(1024)).toBe('1.0 KB')
      expect(formatMemorySize(1024 * 1024)).toBe('1.0 MB')
      expect(formatMemorySize(1024 * 1024 * 1024)).toBe('1.0 GB')
      expect(formatMemorySize(1536)).toBe('1.5 KB')
    })

    it('should handle large numbers', () => {
      expect(formatMemorySize(5 * 1024 * 1024 * 1024 * 1024)).toBe('5.0 TB')
    })
  })

  describe('formatMemoryPercentage', () => {
    it('should format percentage with one decimal place', () => {
      expect(formatMemoryPercentage(75.5)).toBe('75.5%')
      expect(formatMemoryPercentage(100)).toBe('100.0%')
      expect(formatMemoryPercentage(0)).toBe('0.0%')
    })
  })

  describe('getMemoryUsageSeverity', () => {
    it('should return correct severity for normal usage', () => {
      const severity = getMemoryUsageSeverity(50)
      expect(severity.status).toBe('normal')
      expect(severity.color).toBe('green')
      expect(severity.priority).toBe(1)
    })

    it('should return correct severity for warning usage', () => {
      const severity = getMemoryUsageSeverity(80)
      expect(severity.status).toBe('warning')
      expect(severity.color).toBe('yellow')
      expect(severity.priority).toBe(2)
    })

    it('should return correct severity for critical usage', () => {
      const severity = getMemoryUsageSeverity(95)
      expect(severity.status).toBe('critical')
      expect(severity.color).toBe('red')
      expect(severity.priority).toBe(3)
    })

    it('should use custom thresholds', () => {
      const customThresholds = {
        warning: 50,
        critical: 70,
        maxSafe: 60
      }
      
      const severity = getMemoryUsageSeverity(60, customThresholds)
      expect(severity.status).toBe('warning')
    })
  })
})

describe('Memory Monitor Edge Cases', () => {
  let monitor: MemoryMonitor

  beforeEach(() => {
    global.performance = mockPerformance as any
    global.navigator = mockNavigator as any
    vi.useFakeTimers()
  })

  afterEach(() => {
    if (monitor) {
      monitor.destroy()
    }
    vi.useRealTimers()
  })

  it('should handle rapid start/stop cycles', () => {
    monitor = new MemoryMonitor({ updateInterval: 100 })
    
    for (let i = 0; i < 5; i++) {
      monitor.start()
      monitor.stop()
    }
    
    expect(monitor['isMonitoring']).toBe(false)
  })

  it('should handle memory info requests before monitoring starts', () => {
    monitor = new MemoryMonitor()
    
    const memoryInfo = monitor.getCurrentMemoryInfo()
    expect(memoryInfo).toBeNull()
    
    const history = monitor.getHistory()
    expect(history).toHaveLength(0)
  })

  it('should handle trend analysis with insufficient data', () => {
    monitor = new MemoryMonitor()
    
    const trend = monitor.getMemoryTrend()
    expect(trend.direction).toBe('stable')
    expect(trend.confidence).toBe(0)
  })

  it('should handle concurrent subscriptions and unsubscriptions', () => {
    monitor = new MemoryMonitor()
    const callbacks = []
    const unsubscribers = []
    
    // Add multiple subscribers
    for (let i = 0; i < 10; i++) {
      const callback = vi.fn()
      callbacks.push(callback)
      unsubscribers.push(monitor.subscribe(callback))
    }
    
    // Remove some subscribers
    for (let i = 0; i < 5; i++) {
      unsubscribers[i]()
    }
    
    monitor.start()
    vi.advanceTimersByTime(100)
    
    // Only remaining subscribers should be called
    for (let i = 0; i < 5; i++) {
      expect(callbacks[i]).not.toHaveBeenCalled()
    }
    for (let i = 5; i < 10; i++) {
      expect(callbacks[i]).toHaveBeenCalled()
    }
  })
})