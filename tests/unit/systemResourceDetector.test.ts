/**
 * Unit Tests for Cross-Platform System Resource Detection
 * Testing system capabilities detection across different platforms
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { 
  SystemResourceDetector,
  getSystemInfo,
  getOptimalConfig,
  checkSystemRequirements,
  getPerformanceMetrics,
  createResourceMonitor,
  getPlatformOptimizations
} from '../../src/utils/systemResources'

// Mock different browser environments
const createMockNavigator = (overrides: Partial<Navigator> = {}): Navigator => ({
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  platform: 'Win32',
  hardwareConcurrency: 8,
  maxTouchPoints: 0,
  ...overrides
} as Navigator)

const createMockPerformance = (overrides: Partial<Performance> = {}): Performance => ({
  memory: {
    usedJSHeapSize: 50 * 1024 * 1024,
    totalJSHeapSize: 100 * 1024 * 1024,
    jsHeapSizeLimit: 2 * 1024 * 1024 * 1024
  },
  getEntriesByType: vi.fn().mockReturnValue([]),
  now: vi.fn().mockReturnValue(Date.now()),
  ...overrides
} as any)

describe('SystemResourceDetector', () => {
  let detector: SystemResourceDetector
  let originalNavigator: Navigator
  let originalPerformance: Performance

  beforeEach(() => {
    // Store originals
    originalNavigator = global.navigator
    originalPerformance = global.performance
    
    // Reset singleton
    SystemResourceDetector['instance'] = null
    
    // Mock globals
    global.navigator = createMockNavigator()
    global.performance = createMockPerformance()
    global.screen = {
      width: 1920,
      height: 1080,
      availWidth: 1920,
      availHeight: 1040
    } as Screen
    global.localStorage = {
      setItem: vi.fn(),
      removeItem: vi.fn()
    } as any
    global.sessionStorage = {
      setItem: vi.fn(),
      removeItem: vi.fn()
    } as any
  })

  afterEach(() => {
    global.navigator = originalNavigator
    global.performance = originalPerformance
  })

  describe('Singleton Pattern', () => {
    it('should create singleton instance', () => {
      const detector1 = SystemResourceDetector.getInstance()
      const detector2 = SystemResourceDetector.getInstance()
      
      expect(detector1).toBe(detector2)
    })

    it('should initialize system info on creation', () => {
      detector = SystemResourceDetector.getInstance()
      const systemInfo = detector.getSystemInfo()
      
      expect(systemInfo).toBeDefined()
      expect(systemInfo.os).toBeDefined()
      expect(systemInfo.browser).toBeDefined()
      expect(systemInfo.hardware).toBeDefined()
      expect(systemInfo.capabilities).toBeDefined()
      expect(systemInfo.limits).toBeDefined()
    })
  })

  describe('Operating System Detection', () => {
    it('should detect Windows', () => {
      global.navigator = createMockNavigator({
        platform: 'Win32',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      })
      
      detector = SystemResourceDetector.getInstance()
      const systemInfo = detector.getSystemInfo()
      
      expect(systemInfo.os).toBe('Windows')
    })

    it('should detect macOS', () => {
      global.navigator = createMockNavigator({
        platform: 'MacIntel',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
      })
      
      detector = SystemResourceDetector.getInstance()
      const systemInfo = detector.getSystemInfo()
      
      expect(systemInfo.os).toBe('macOS')
    })

    it('should detect Linux', () => {
      global.navigator = createMockNavigator({
        platform: 'Linux x86_64',
        userAgent: 'Mozilla/5.0 (X11; Linux x86_64)'
      })
      
      detector = SystemResourceDetector.getInstance()
      const systemInfo = detector.getSystemInfo()
      
      expect(systemInfo.os).toBe('Linux')
    })

    it('should detect Android', () => {
      global.navigator = createMockNavigator({
        platform: 'Linux armv7l',
        userAgent: 'Mozilla/5.0 (Linux; Android 10; SM-G975F)'
      })
      
      detector = SystemResourceDetector.getInstance()
      const systemInfo = detector.getSystemInfo()
      
      expect(systemInfo.os).toBe('Android')
    })

    it('should detect iOS', () => {
      global.navigator = createMockNavigator({
        platform: 'iPhone',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X)'
      })
      
      detector = SystemResourceDetector.getInstance()
      const systemInfo = detector.getSystemInfo()
      
      expect(systemInfo.os).toBe('iOS')
    })

    it('should handle unknown platforms', () => {
      global.navigator = createMockNavigator({
        platform: 'UnknownOS',
        userAgent: 'UnknownBrowser/1.0'
      })
      
      detector = SystemResourceDetector.getInstance()
      const systemInfo = detector.getSystemInfo()
      
      expect(systemInfo.os).toBe('Unknown')
    })
  })

  describe('Browser Detection', () => {
    it('should detect Chrome', () => {
      global.navigator = createMockNavigator({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      })
      
      detector = SystemResourceDetector.getInstance()
      const browserInfo = detector.getSystemInfo().browser
      
      expect(browserInfo.name).toBe('Chrome')
      expect(browserInfo.version).toBe('91.0.4472.124')
      expect(browserInfo.engine).toBe('Blink')
      expect(browserInfo.mobile).toBe(false)
    })

    it('should detect Firefox', () => {
      global.navigator = createMockNavigator({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0'
      })
      
      detector = SystemResourceDetector.getInstance()
      const browserInfo = detector.getSystemInfo().browser
      
      expect(browserInfo.name).toBe('Firefox')
      expect(browserInfo.version).toBe('89.0')
      expect(browserInfo.engine).toBe('Gecko')
    })

    it('should detect Safari', () => {
      global.navigator = createMockNavigator({
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15'
      })
      
      detector = SystemResourceDetector.getInstance()
      const browserInfo = detector.getSystemInfo().browser
      
      expect(browserInfo.name).toBe('Safari')
      expect(browserInfo.version).toBe('14.1.1')
      expect(browserInfo.engine).toBe('WebKit')
    })

    it('should detect Edge', () => {
      global.navigator = createMockNavigator({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 Edg/91.0.864.59'
      })
      
      detector = SystemResourceDetector.getInstance()
      const browserInfo = detector.getSystemInfo().browser
      
      expect(browserInfo.name).toBe('Edge')
      expect(browserInfo.version).toBe('91.0.864.59')
      expect(browserInfo.engine).toBe('Blink')
    })

    it('should detect mobile browsers', () => {
      global.navigator = createMockNavigator({
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1'
      })
      
      detector = SystemResourceDetector.getInstance()
      const browserInfo = detector.getSystemInfo().browser
      
      expect(browserInfo.mobile).toBe(true)
    })
  })

  describe('Hardware Detection', () => {
    it('should detect CPU cores', () => {
      global.navigator = createMockNavigator({
        hardwareConcurrency: 16
      })
      
      detector = SystemResourceDetector.getInstance()
      const hardware = detector.getSystemInfo().hardware
      
      expect(hardware.cores).toBe(16)
    })

    it('should estimate RAM based on cores and device type', () => {
      global.navigator = createMockNavigator({
        hardwareConcurrency: 8,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      })
      
      detector = SystemResourceDetector.getInstance()
      const hardware = detector.getSystemInfo().hardware
      
      expect(hardware.estimatedRam).toBeGreaterThan(0)
      expect(hardware.estimatedRam).toBe(16 * 1024 * 1024 * 1024) // 16GB for 8 cores desktop
    })

    it('should estimate lower RAM for mobile devices', () => {
      global.navigator = createMockNavigator({
        hardwareConcurrency: 6,
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X)'
      })
      
      detector = SystemResourceDetector.getInstance()
      const hardware = detector.getSystemInfo().hardware
      
      expect(hardware.estimatedRam).toBe(6 * 1024 * 1024 * 1024) // 6GB for 6 cores mobile
    })

    it('should detect screen properties', () => {
      detector = SystemResourceDetector.getInstance()
      const hardware = detector.getSystemInfo().hardware
      
      expect(hardware.screen.width).toBe(1920)
      expect(hardware.screen.height).toBe(1080)
      expect(hardware.screen.availableWidth).toBe(1920)
      expect(hardware.screen.availableHeight).toBe(1040)
    })

    it('should detect touch support', () => {
      global.navigator = createMockNavigator({
        maxTouchPoints: 10
      })
      global.ontouchstart = {} as any
      
      detector = SystemResourceDetector.getInstance()
      const hardware = detector.getSystemInfo().hardware
      
      expect(hardware.touchSupport).toBe(true)
    })

    it('should detect connection information when available', () => {
      const mockConnection = {
        effectiveType: '4g',
        downlink: 10,
        rtt: 50,
        saveData: false
      }
      
      global.navigator = createMockNavigator({
        connection: mockConnection
      } as any)
      
      detector = SystemResourceDetector.getInstance()
      const hardware = detector.getSystemInfo().hardware
      
      expect(hardware.connection).toEqual(mockConnection)
    })
  })

  describe('Capabilities Detection', () => {
    it('should detect Web APIs support', () => {
      global.Worker = vi.fn() as any
      global.WebAssembly = {} as any
      global.BroadcastChannel = vi.fn() as any
      global.SharedArrayBuffer = vi.fn() as any
      global.Atomics = {} as any
      global.OffscreenCanvas = vi.fn() as any
      global.PerformanceObserver = vi.fn() as any
      
      global.navigator = createMockNavigator({
        serviceWorker: {} as any
      })
      
      detector = SystemResourceDetector.getInstance()
      const capabilities = detector.getSystemInfo().capabilities
      
      expect(capabilities.webApis.webWorkers).toBe(true)
      expect(capabilities.webApis.serviceWorkers).toBe(true)
      expect(capabilities.webApis.webAssembly).toBe(true)
      expect(capabilities.webApis.broadcastChannel).toBe(true)
      expect(capabilities.webApis.sharedArrayBuffer).toBe(true)
      expect(capabilities.webApis.atomics).toBe(true)
      expect(capabilities.webApis.offscreenCanvas).toBe(true)
      expect(capabilities.webApis.performanceObserver).toBe(true)
    })

    it('should detect storage capabilities', () => {
      global.indexedDB = {} as any
      
      detector = SystemResourceDetector.getInstance()
      const capabilities = detector.getSystemInfo().capabilities
      
      expect(capabilities.storage.localStorage).toBe(true)
      expect(capabilities.storage.sessionStorage).toBe(true)
      expect(capabilities.storage.indexedDB).toBe(true)
      expect(capabilities.storage.quota).toBeGreaterThan(0)
    })

    it('should handle storage API failures gracefully', () => {
      global.localStorage = {
        setItem: vi.fn().mockImplementation(() => {
          throw new Error('Storage disabled')
        }),
        removeItem: vi.fn()
      } as any
      
      detector = SystemResourceDetector.getInstance()
      const capabilities = detector.getSystemInfo().capabilities
      
      expect(capabilities.storage.localStorage).toBe(false)
    })

    it('should detect media capabilities', () => {
      global.RTCPeerConnection = vi.fn() as any
      global.navigator = createMockNavigator({
        mediaDevices: {} as any,
        getUserMedia: vi.fn()
      })
      
      detector = SystemResourceDetector.getInstance()
      const capabilities = detector.getSystemInfo().capabilities
      
      expect(capabilities.media.webRTC).toBe(true)
      expect(capabilities.media.mediaDevices).toBe(true)
      expect(capabilities.media.getUserMedia).toBe(true)
    })
  })

  describe('Resource Limits Calculation', () => {
    it('should calculate appropriate limits for desktop', () => {
      global.navigator = createMockNavigator({
        hardwareConcurrency: 8,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      })
      
      detector = SystemResourceDetector.getInstance()
      const limits = detector.getSystemInfo().limits
      
      expect(limits.maxSafeMemory).toBeGreaterThan(8 * 1024 * 1024 * 1024) // > 8GB
      expect(limits.maxConcurrentOperations).toBeGreaterThan(8) // More than cores
      expect(limits.maxFileSize).toBe(500 * 1024 * 1024) // 500MB for desktop
    })

    it('should calculate conservative limits for mobile', () => {
      global.navigator = createMockNavigator({
        hardwareConcurrency: 4,
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X)'
      })
      
      detector = SystemResourceDetector.getInstance()
      const limits = detector.getSystemInfo().limits
      
      expect(limits.maxSafeMemory).toBeLessThan(2 * 1024 * 1024 * 1024) // < 2GB
      expect(limits.maxConcurrentOperations).toBeLessThanOrEqual(4) // Limited concurrency
      expect(limits.maxFileSize).toBe(50 * 1024 * 1024) // 50MB for mobile
      expect(limits.networkTimeout).toBe(15000) // Longer timeout for mobile
    })
  })

  describe('Performance Metrics Collection', () => {
    beforeEach(() => {
      // Mock performance entries
      global.performance = createMockPerformance({
        getEntriesByType: vi.fn().mockImplementation((type) => {
          if (type === 'navigation') {
            return [{
              fetchStart: 100,
              domContentLoadedEventEnd: 1000
            }]
          }
          if (type === 'paint') {
            return [{
              name: 'first-contentful-paint',
              startTime: 800
            }]
          }
          return []
        })
      })
      
      global.PerformanceObserver = vi.fn().mockImplementation((callback) => ({
        observe: vi.fn().mockImplementation((options) => {
          if (options.entryTypes.includes('largest-contentful-paint')) {
            callback({
              getEntries: () => [{ startTime: 900 }]
            })
          }
        })
      }))
    })

    it('should collect performance metrics', async () => {
      detector = SystemResourceDetector.getInstance()
      const metrics = await detector.getPerformanceMetrics()
      
      expect(metrics).toBeDefined()
      expect(metrics.fcp).toBe(800)
      expect(metrics.tti).toBe(900) // domContentLoadedEventEnd - fetchStart
      expect(metrics.heapInfo).toBeDefined()
      expect(metrics.heapInfo?.used).toBeGreaterThan(0)
    })

    it('should handle missing performance API gracefully', async () => {
      global.performance = {} as any
      
      detector = SystemResourceDetector.getInstance()
      const metrics = await detector.getPerformanceMetrics()
      
      expect(metrics).toBeDefined()
      expect(metrics.fcp).toBe(0)
      expect(metrics.lcp).toBe(0)
      expect(metrics.heapInfo).toBeUndefined()
    })
  })

  describe('System Requirements Checking', () => {
    beforeEach(() => {
      detector = SystemResourceDetector.getInstance()
    })

    it('should pass when requirements are met', () => {
      const requirements = {
        minRam: 4 * 1024 * 1024 * 1024, // 4GB
        minCores: 4,
        requiredApis: ['webWorkers', 'webAssembly']
      }
      
      global.Worker = vi.fn() as any
      global.WebAssembly = {} as any
      global.navigator = createMockNavigator({
        hardwareConcurrency: 8
      })
      
      detector = SystemResourceDetector.getInstance()
      const result = detector.meetsMinimumRequirements(requirements)
      
      expect(result.meets).toBe(true)
      expect(result.missing).toHaveLength(0)
    })

    it('should fail when requirements are not met', () => {
      const requirements = {
        minRam: 32 * 1024 * 1024 * 1024, // 32GB
        minCores: 16,
        requiredApis: ['nonExistentAPI']
      }
      
      const result = detector.meetsMinimumRequirements(requirements)
      
      expect(result.meets).toBe(false)
      expect(result.missing.length).toBeGreaterThan(0)
      expect(result.missing.some(m => m.includes('RAM'))).toBe(true)
      expect(result.missing.some(m => m.includes('CPU cores'))).toBe(true)
    })

    it('should check API availability correctly', () => {
      global.Worker = undefined as any
      
      const requirements = {
        requiredApis: ['webWorkers']
      }
      
      detector = SystemResourceDetector.getInstance()
      const result = detector.meetsMinimumRequirements(requirements)
      
      expect(result.meets).toBe(false)
      expect(result.missing.some(m => m.includes('webWorkers'))).toBe(true)
    })
  })

  describe('Optimal Configuration Generation', () => {
    it('should generate high-end configuration for powerful systems', () => {
      global.navigator = createMockNavigator({
        hardwareConcurrency: 16,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      })
      
      detector = SystemResourceDetector.getInstance()
      const config = detector.getOptimalConfig()
      
      expect(config.memoryMonitorInterval).toBe(500) // Fast monitoring
      expect(config.maxConcurrentOperations).toBe(10) // High concurrency
      expect(config.enableDetailedMetrics).toBe(true)
      expect(config.networkTimeout).toBe(5000) // Desktop timeout
    })

    it('should generate conservative configuration for mobile', () => {
      global.navigator = createMockNavigator({
        hardwareConcurrency: 4,
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X)'
      })
      
      detector = SystemResourceDetector.getInstance()
      const config = detector.getOptimalConfig()
      
      expect(config.memoryMonitorInterval).toBe(2000) // Slower monitoring
      expect(config.maxConcurrentOperations).toBe(3) // Limited concurrency
      expect(config.enableDetailedMetrics).toBe(false)
      expect(config.networkTimeout).toBe(10000) // Mobile timeout
    })

    it('should prefer IndexedDB over localStorage when available', () => {
      global.indexedDB = {} as any
      
      detector = SystemResourceDetector.getInstance()
      const config = detector.getOptimalConfig()
      
      expect(config.preferredStorageMethod).toBe('indexedDB')
    })

    it('should fallback to localStorage when IndexedDB unavailable', () => {
      global.indexedDB = undefined as any
      
      detector = SystemResourceDetector.getInstance()
      const config = detector.getOptimalConfig()
      
      expect(config.preferredStorageMethod).toBe('localStorage')
    })
  })
})

describe('Utility Functions', () => {
  beforeEach(() => {
    global.navigator = createMockNavigator()
    global.performance = createMockPerformance()
    SystemResourceDetector['instance'] = null
  })

  describe('getSystemInfo', () => {
    it('should return system information', () => {
      const info = getSystemInfo()
      
      expect(info).toBeDefined()
      expect(info.os).toBeDefined()
      expect(info.browser).toBeDefined()
      expect(info.hardware).toBeDefined()
    })
  })

  describe('getOptimalConfig', () => {
    it('should return optimal configuration', () => {
      const config = getOptimalConfig()
      
      expect(config).toBeDefined()
      expect(config.memoryMonitorInterval).toBeGreaterThan(0)
      expect(config.maxConcurrentOperations).toBeGreaterThan(0)
    })
  })

  describe('checkSystemRequirements', () => {
    it('should check system requirements', () => {
      const requirements = {
        minRam: 1 * 1024 * 1024 * 1024, // 1GB
        minCores: 1
      }
      
      const result = checkSystemRequirements(requirements)
      
      expect(result).toBeDefined()
      expect(result.meets).toBe(true)
      expect(Array.isArray(result.missing)).toBe(true)
    })
  })

  describe('getPerformanceMetrics', () => {
    it('should return performance metrics', async () => {
      const metrics = await getPerformanceMetrics()
      
      expect(metrics).toBeDefined()
      expect(typeof metrics.fcp).toBe('number')
      expect(typeof metrics.lcp).toBe('number')
    })
  })

  describe('createResourceMonitor', () => {
    it('should create resource monitor', () => {
      const callback = vi.fn()
      const monitor = createResourceMonitor(callback, 100)
      
      expect(monitor).toBeDefined()
      expect(typeof monitor.start).toBe('function')
      expect(typeof monitor.stop).toBe('function')
    })

    it('should call callback periodically', async () => {
      vi.useFakeTimers()
      const callback = vi.fn()
      const monitor = createResourceMonitor(callback, 100)
      
      monitor.start()
      
      await vi.advanceTimersByTimeAsync(300)
      
      expect(callback).toHaveBeenCalledTimes(3)
      
      monitor.stop()
      vi.useRealTimers()
    })

    it('should stop monitoring when requested', () => {
      vi.useFakeTimers()
      const callback = vi.fn()
      const monitor = createResourceMonitor(callback, 100)
      
      monitor.start()
      monitor.stop()
      
      vi.advanceTimersByTime(200)
      
      expect(callback).not.toHaveBeenCalled()
      
      vi.useRealTimers()
    })
  })

  describe('getPlatformOptimizations', () => {
    it('should return mobile optimizations', () => {
      global.navigator = createMockNavigator({
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X)'
      })
      SystemResourceDetector['instance'] = null
      
      const optimizations = getPlatformOptimizations()
      
      expect(optimizations.reducedAnimations).toBe(true)
      expect(optimizations.lowerPollingRate).toBe(true)
      expect(optimizations.aggressiveCaching).toBe(true)
      expect(optimizations.reducedConcurrency).toBe(true)
    })

    it('should return low-end device optimizations', () => {
      global.navigator = createMockNavigator({
        hardwareConcurrency: 2,
        userAgent: 'Mozilla/5.0 (Windows NT 6.1; Win64; x64)'
      })
      SystemResourceDetector['instance'] = null
      
      const optimizations = getPlatformOptimizations()
      
      expect(optimizations.disableNonEssentialFeatures).toBe(true)
      expect(optimizations.increaseThrottling).toBe(true)
      expect(optimizations.reduceBatchSizes).toBe(true)
    })

    it('should return high-end device optimizations', () => {
      global.navigator = createMockNavigator({
        hardwareConcurrency: 16,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      })
      global.performance = createMockPerformance({
        memory: {
          jsHeapSizeLimit: 16 * 1024 * 1024 * 1024 // Simulate 16GB system
        }
      })
      SystemResourceDetector['instance'] = null
      
      const optimizations = getPlatformOptimizations()
      
      expect(optimizations.enableAdvancedFeatures).toBe(true)
      expect(optimizations.increaseConcurrency).toBe(true)
      expect(optimizations.enableDetailedMonitoring).toBe(true)
    })
  })
})

describe('Edge Cases and Error Handling', () => {
  beforeEach(() => {
    SystemResourceDetector['instance'] = null
  })

  it('should handle missing navigator gracefully', () => {
    const originalNavigator = global.navigator
    delete (global as any).navigator
    
    expect(() => {
      SystemResourceDetector.getInstance()
    }).not.toThrow()
    
    global.navigator = originalNavigator
  })

  it('should handle missing performance API gracefully', () => {
    const originalPerformance = global.performance
    delete (global as any).performance
    
    expect(() => {
      SystemResourceDetector.getInstance()
    }).not.toThrow()
    
    global.performance = originalPerformance
  })

  it('should handle undefined hardwareConcurrency', () => {
    global.navigator = createMockNavigator({
      hardwareConcurrency: undefined as any
    })
    
    const detector = SystemResourceDetector.getInstance()
    const hardware = detector.getSystemInfo().hardware
    
    expect(hardware.cores).toBe(1) // Default fallback
  })

  it('should handle malformed user agent strings', () => {
    global.navigator = createMockNavigator({
      userAgent: ''
    })
    
    const detector = SystemResourceDetector.getInstance()
    const browser = detector.getSystemInfo().browser
    
    expect(browser.name).toBe('Unknown')
    expect(browser.version).toBe('Unknown')
  })

  it('should handle storage quota estimation failures', () => {
    // Mock that will throw during quota estimation
    const mockDetector = class extends SystemResourceDetector {
      public estimateStorageQuota(): number {
        throw new Error('Quota estimation failed')
      }
    }
    
    expect(() => {
      new (mockDetector as any)()
    }).not.toThrow()
  })

  it('should handle performance observer errors', async () => {
    global.PerformanceObserver = vi.fn().mockImplementation(() => {
      throw new Error('PerformanceObserver failed')
    })
    
    const detector = SystemResourceDetector.getInstance()
    
    expect(async () => {
      await detector.getPerformanceMetrics()
    }).not.toThrow()
  })
})