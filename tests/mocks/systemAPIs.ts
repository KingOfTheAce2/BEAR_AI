/**
 * Mock Implementations for System APIs
 * Provides realistic mock implementations for testing memory safety system
 */

import { vi } from 'vitest'

// ==================== NODE.JS PROCESS MOCKS ====================

export interface MockProcessConfig {
  platform: NodeJS.Platform
  memoryUsage: {
    rss: number
    heapTotal: number
    heapUsed: number
    external: number
    arrayBuffers?: number
  }
  cpuUsage: {
    user: number
    system: number
  }
  pid: number
}

export const createMockProcess = (config: Partial<MockProcessConfig> = {}): any => {
  const defaultConfig: MockProcessConfig = {
    platform: 'win32',
    memoryUsage: {
      rss: 512 * 1024 * 1024,      // 512MB
      heapTotal: 256 * 1024 * 1024,  // 256MB
      heapUsed: 128 * 1024 * 1024,   // 128MB
      external: 32 * 1024 * 1024,    // 32MB
      arrayBuffers: 16 * 1024 * 1024 // 16MB
    },
    cpuUsage: {
      user: 1000000, // 1 second in microseconds
      system: 500000 // 0.5 seconds in microseconds
    },
    pid: 12345
  }
  
  const finalConfig = { ...defaultConfig, ...config }
  
  return {
    platform: finalConfig.platform,
    pid: finalConfig.pid,
    memoryUsage: vi.fn().mockReturnValue(finalConfig.memoryUsage),
    cpuUsage: vi.fn().mockReturnValue(finalConfig.cpuUsage),
    hrtime: vi.fn().mockImplementation((time) => {
      if (!time) return [Date.now(), 0]
      return [1, 500000000] // 1.5 seconds
    }),
    nextTick: vi.fn().mockImplementation((callback) => setTimeout(callback, 0)),
    env: {
      NODE_ENV: 'test',
      BEAR_AI_DEBUG: 'true'
    }
  }
}

// ==================== PERFORMANCE API MOCKS ====================

export interface MockPerformanceConfig {
  memory: {
    usedJSHeapSize: number
    totalJSHeapSize: number
    jsHeapSizeLimit: number
  }
  timing: {
    navigationStart: number
    loadEventEnd: number
    domContentLoadedEventEnd: number
  }
  now: () => number
}

export const createMockPerformance = (config: Partial<MockPerformanceConfig> = {}): any => {
  const defaultConfig: MockPerformanceConfig = {
    memory: {
      usedJSHeapSize: 50 * 1024 * 1024,    // 50MB
      totalJSHeapSize: 100 * 1024 * 1024,  // 100MB
      jsHeapSizeLimit: 2 * 1024 * 1024 * 1024 // 2GB
    },
    timing: {
      navigationStart: Date.now() - 5000,
      loadEventEnd: Date.now() - 1000,
      domContentLoadedEventEnd: Date.now() - 2000
    },
    now: () => Date.now()
  }
  
  const finalConfig = { ...defaultConfig, ...config }
  
  return {
    memory: finalConfig.memory,
    timing: finalConfig.timing,
    now: vi.fn().mockImplementation(finalConfig.now),
    mark: vi.fn(),
    measure: vi.fn(),
    clearMarks: vi.fn(),
    clearMeasures: vi.fn(),
    getEntriesByType: vi.fn().mockImplementation((type: string) => {
      if (type === 'navigation') {
        return [{
          fetchStart: finalConfig.timing.navigationStart,
          domContentLoadedEventEnd: finalConfig.timing.domContentLoadedEventEnd,
          loadEventEnd: finalConfig.timing.loadEventEnd
        }]
      }
      if (type === 'paint') {
        return [
          { name: 'first-contentful-paint', startTime: 800 },
          { name: 'first-paint', startTime: 600 }
        ]
      }
      return []
    }),
    measureUserAgentSpecificMemory: vi.fn().mockResolvedValue({
      bytes: finalConfig.memory.usedJSHeapSize,
      breakdown: []
    })
  }
}

// ==================== NAVIGATOR MOCKS ====================

export interface MockNavigatorConfig {
  userAgent: string
  platform: string
  hardwareConcurrency: number
  maxTouchPoints: number
  connection?: {
    effectiveType: '2g' | '3g' | '4g' | 'slow-2g'
    downlink: number
    rtt: number
    saveData: boolean
  }
  serviceWorker?: any
  mediaDevices?: any
}

export const createMockNavigator = (config: Partial<MockNavigatorConfig> = {}): any => {
  const defaultConfig: MockNavigatorConfig = {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    platform: 'Win32',
    hardwareConcurrency: 8,
    maxTouchPoints: 0,
    connection: {
      effectiveType: '4g',
      downlink: 10,
      rtt: 100,
      saveData: false
    }
  }
  
  const finalConfig = { ...defaultConfig, ...config }
  
  return {
    userAgent: finalConfig.userAgent,
    platform: finalConfig.platform,
    hardwareConcurrency: finalConfig.hardwareConcurrency,
    maxTouchPoints: finalConfig.maxTouchPoints,
    connection: finalConfig.connection,
    serviceWorker: finalConfig.serviceWorker,
    mediaDevices: finalConfig.mediaDevices,
    onLine: true,
    language: 'en-US',
    languages: ['en-US', 'en'],
    cookieEnabled: true,
    doNotTrack: null,
    getUserMedia: vi.fn(),
    webkitGetUserMedia: vi.fn(),
    mozGetUserMedia: vi.fn()
  }
}

// ==================== FILE SYSTEM MOCKS ====================

export interface MockFileSystemConfig {
  exists: (path: string) => boolean
  readFile: (path: string) => string | Buffer
  writeFile: (path: string, data: any) => void
  readDir: (path: string) => string[]
  stat: (path: string) => { size: number; isFile: () => boolean; mtime: Date }
}

export const createMockFileSystem = (config: Partial<MockFileSystemConfig> = {}): any => {
  const mockFiles = new Map<string, string | Buffer>()
  const mockDirectories = new Set<string>(['/models', '/temp', '/cache'])
  
  const defaultConfig: MockFileSystemConfig = {
    exists: (path: string) => mockFiles.has(path) || mockDirectories.has(path),
    readFile: (path: string) => mockFiles.get(path) || '',
    writeFile: (path: string, data: any) => mockFiles.set(path, data),
    readDir: (path: string) => {
      const files = Array.from(mockFiles.keys()).filter(file => file.startsWith(path))
      return files.map(file => file.replace(path + '/', ''))
    },
    stat: (path: string) => ({
      size: mockFiles.has(path) ? Buffer.byteLength(mockFiles.get(path) as string || '') : 1024,
      isFile: () => mockFiles.has(path),
      mtime: new Date()
    })
  }
  
  const finalConfig = { ...defaultConfig, ...config }
  
  // Add some default mock files
  mockFiles.set('/models/legal-model.gguf', Buffer.alloc(4 * 1024 * 1024 * 1024)) // 4GB model
  mockFiles.set('/models/small-model.gguf', Buffer.alloc(1024 * 1024 * 1024)) // 1GB model
  mockFiles.set('/temp/cache.tmp', 'cached data')
  
  return {
    existsSync: vi.fn().mockImplementation(finalConfig.exists),
    readFileSync: vi.fn().mockImplementation(finalConfig.readFile),
    writeFileSync: vi.fn().mockImplementation(finalConfig.writeFile),
    readdirSync: vi.fn().mockImplementation(finalConfig.readDir),
    statSync: vi.fn().mockImplementation(finalConfig.stat),
    unlinkSync: vi.fn().mockImplementation((path: string) => mockFiles.delete(path)),
    mkdirSync: vi.fn().mockImplementation((path: string) => mockDirectories.add(path)),
    rmdirSync: vi.fn().mockImplementation((path: string) => mockDirectories.delete(path)),
    createReadStream: vi.fn().mockReturnValue({
      pipe: vi.fn(),
      on: vi.fn(),
      read: vi.fn()
    }),
    createWriteStream: vi.fn().mockReturnValue({
      write: vi.fn(),
      end: vi.fn(),
      on: vi.fn()
    })
  }
}

// ==================== GPU/HARDWARE MOCKS ====================

export interface MockGPUConfig {
  devices: Array<{
    name: string
    memory: number
    utilization: number
    temperature?: number
  }>
  totalMemory: number
  availableMemory: number
}

export const createMockGPUInfo = (config: Partial<MockGPUConfig> = {}): MockGPUConfig => {
  const defaultConfig: MockGPUConfig = {
    devices: [
      {
        name: 'NVIDIA RTX 4080',
        memory: 8 * 1024 * 1024 * 1024,
        utilization: 25.5,
        temperature: 65
      }
    ],
    totalMemory: 8 * 1024 * 1024 * 1024,
    availableMemory: 6 * 1024 * 1024 * 1024
  }
  
  return { ...defaultConfig, ...config }
}

// ==================== NETWORK MOCKS ====================

export const createMockFetch = (responses: Record<string, any> = {}): any => {
  return vi.fn().mockImplementation((url: string, options: any = {}) => {
    const response = responses[url] || { ok: true, status: 200, json: () => Promise.resolve({}) }
    
    return Promise.resolve({
      ok: response.ok ?? true,
      status: response.status ?? 200,
      statusText: response.statusText ?? 'OK',
      headers: new Map(Object.entries(response.headers || {})),
      json: () => Promise.resolve(response.data || response),
      text: () => Promise.resolve(JSON.stringify(response.data || response)),
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024)),
      blob: () => Promise.resolve(new Blob()),
      clone: () => ({ ...response })
    })
  })
}

// ==================== WORKER MOCKS ====================

export const createMockWorker = (responses: any[] = []): any => {
  let messageIndex = 0
  
  const worker = {
    postMessage: vi.fn().mockImplementation((data: any) => {
      // Simulate async response
      setTimeout(() => {
        if (worker.onmessage && messageIndex < responses.length) {
          worker.onmessage({ data: responses[messageIndex++] })
        }
      }, 10)
    }),
    terminate: vi.fn(),
    onmessage: null as ((event: { data: any }) => void) | null,
    onerror: null as ((error: any) => void) | null,
    addEventListener: vi.fn().mockImplementation((event: string, callback: any) => {
      if (event === 'message') {
        worker.onmessage = callback
      } else if (event === 'error') {
        worker.onerror = callback
      }
    }),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn()
  }
  
  return vi.fn().mockImplementation(() => worker)
}

// ==================== TIMER MOCKS ====================

export const createMockTimers = () => {
  const timers = new Map<number, { callback: () => void; interval: number; type: 'timeout' | 'interval' }>()
  let nextId = 1
  
  const setTimeout = vi.fn().mockImplementation((callback: () => void, delay: number) => {
    const id = nextId++
    timers.set(id, { callback, interval: delay, type: 'timeout' })
    return id
  })
  
  const setInterval = vi.fn().mockImplementation((callback: () => void, interval: number) => {
    const id = nextId++
    timers.set(id, { callback, interval, type: 'interval' })
    return id
  })
  
  const clearTimeout = vi.fn().mockImplementation((id: number) => {
    timers.delete(id)
  })
  
  const clearInterval = vi.fn().mockImplementation((id: number) => {
    timers.delete(id)
  })
  
  const executeTimer = (id: number) => {
    const timer = timers.get(id)
    if (timer) {
      timer.callback()
      if (timer.type === 'timeout') {
        timers.delete(id)
      }
    }
  }
  
  const executeAllTimers = () => {
    Array.from(timers.keys()).forEach(executeTimer)
  }
  
  return {
    setTimeout,
    setInterval,
    clearTimeout,
    clearInterval,
    executeTimer,
    executeAllTimers,
    getActiveTimers: () => Array.from(timers.keys())
  }
}

// ==================== MEMORY PRESSURE SIMULATOR ====================

export class MemoryPressureSimulator {
  private baseMemoryUsage: number
  private currentMemoryUsage: number
  private memoryGrowthRate: number
  private volatility: number
  
  constructor(config: {
    baseMemoryUsage?: number
    initialUsage?: number
    growthRate?: number
    volatility?: number
  } = {}) {
    this.baseMemoryUsage = config.baseMemoryUsage || 4 * 1024 * 1024 * 1024 // 4GB
    this.currentMemoryUsage = config.initialUsage || this.baseMemoryUsage * 0.5
    this.memoryGrowthRate = config.growthRate || 0.001 // 0.1% per update
    this.volatility = config.volatility || 0.02 // 2% random variation
  }
  
  update(): number {
    // Apply growth trend
    this.currentMemoryUsage *= (1 + this.memoryGrowthRate)
    
    // Apply random volatility
    const variation = (Math.random() - 0.5) * 2 * this.volatility
    this.currentMemoryUsage *= (1 + variation)
    
    // Ensure bounds
    this.currentMemoryUsage = Math.max(0, Math.min(this.currentMemoryUsage, this.baseMemoryUsage))
    
    return this.currentMemoryUsage
  }
  
  getUsagePercentage(): number {
    return (this.currentMemoryUsage / this.baseMemoryUsage) * 100
  }
  
  simulateMemorySpike(intensity: number = 0.3): void {
    this.currentMemoryUsage = Math.min(
      this.baseMemoryUsage,
      this.currentMemoryUsage * (1 + intensity)
    )
  }
  
  simulateMemoryRelease(amount: number = 0.2): void {
    this.currentMemoryUsage *= (1 - amount)
  }
  
  reset(): void {
    this.currentMemoryUsage = this.baseMemoryUsage * 0.5
  }
}

// ==================== COMPREHENSIVE TEST ENVIRONMENT ====================

export const createTestEnvironment = (config: {
  platform?: NodeJS.Platform
  memoryConfig?: Partial<MockProcessConfig>
  performanceConfig?: Partial<MockPerformanceConfig>
  navigatorConfig?: Partial<MockNavigatorConfig>
  fileSystemConfig?: Partial<MockFileSystemConfig>
  gpuConfig?: Partial<MockGPUConfig>
} = {}) => {
  const mockProcess = createMockProcess({
    platform: config.platform || 'win32',
    ...config.memoryConfig
  })
  
  const mockPerformance = createMockPerformance(config.performanceConfig)
  const mockNavigator = createMockNavigator(config.navigatorConfig)
  const mockFs = createMockFileSystem(config.fileSystemConfig)
  const mockGpu = createMockGPUInfo(config.gpuConfig)
  const mockFetch = createMockFetch()
  const mockWorker = createMockWorker()
  const mockTimers = createMockTimers()
  
  // Mock global objects
  global.process = mockProcess
  global.performance = mockPerformance
  global.navigator = mockNavigator
  global.fetch = mockFetch
  global.Worker = mockWorker
  global.setTimeout = mockTimers.setTimeout
  global.setInterval = mockTimers.setInterval
  global.clearTimeout = mockTimers.clearTimeout
  global.clearInterval = mockTimers.clearInterval
  
  // Mock Web APIs
  global.PerformanceObserver = vi.fn().mockImplementation((callback) => ({
    observe: vi.fn().mockImplementation((options) => {
      // Simulate some performance entries
      setTimeout(() => {
        callback({
          getEntries: () => [
            { entryType: 'measure', name: 'memory-test', startTime: 100, duration: 50 }
          ]
        })
      }, 10)
    }),
    disconnect: vi.fn()
  }))
  
  global.requestIdleCallback = vi.fn().mockImplementation((callback) => {
    setTimeout(callback, 1)
    return 1
  })
  
  global.cancelIdleCallback = vi.fn()
  
  // Mock storage
  global.localStorage = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    length: 0,
    key: vi.fn()
  } as any
  
  global.sessionStorage = { ...global.localStorage }
  
  // Mock other APIs
  global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn()
  }))
  
  global.IntersectionObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn()
  }))
  
  // Provide cleanup function
  const cleanup = () => {
    // Restore original globals if needed
    vi.clearAllMocks()
  }
  
  return {
    mockProcess,
    mockPerformance,
    mockNavigator,
    mockFs,
    mockGpu,
    mockFetch,
    mockWorker,
    mockTimers,
    cleanup
  }
}

// ==================== PERFORMANCE TESTING UTILITIES ====================

export const createPerformanceProfiler = () => {
  const marks = new Map<string, number>()
  const measures = new Map<string, number>()
  
  return {
    mark: (name: string) => {
      marks.set(name, performance.now())
    },
    
    measure: (name: string, startMark: string, endMark?: string) => {
      const start = marks.get(startMark)
      const end = endMark ? marks.get(endMark) : performance.now()
      
      if (start && end) {
        const duration = end - start
        measures.set(name, duration)
        return duration
      }
      
      return 0
    },
    
    getMeasure: (name: string) => measures.get(name) || 0,
    
    getAllMeasures: () => Object.fromEntries(measures),
    
    clearMarks: () => marks.clear(),
    
    clearMeasures: () => measures.clear(),
    
    clear: () => {
      marks.clear()
      measures.clear()
    }
  }
}

// ==================== STRESS TESTING UTILITIES ====================

export const createStressTester = () => {
  return {
    memoryStress: async (duration: number = 5000) => {
      const startTime = Date.now()
      const memoryHogs: any[] = []
      
      const interval = setInterval(() => {
        // Allocate memory to create pressure
        memoryHogs.push(new Array(10000).fill('stress-test-data'))
        
        if (memoryHogs.length > 100) {
          // Occasionally free some memory
          memoryHogs.splice(0, 50)
        }
      }, 100)
      
      await new Promise(resolve => setTimeout(resolve, duration))
      
      clearInterval(interval)
      return memoryHogs.length
    },
    
    cpuStress: async (duration: number = 5000) => {
      const startTime = Date.now()
      let operations = 0
      
      return new Promise<number>((resolve) => {
        const stressWork = () => {
          const iterations = 10000
          for (let i = 0; i < iterations; i++) {
            Math.sqrt(Math.random() * 1000)
            operations++
          }
          
          if (Date.now() - startTime < duration) {
            setImmediate(stressWork)
          } else {
            resolve(operations)
          }
        }
        
        stressWork()
      })
    },
    
    concurrencyStress: async (concurrentOperations: number = 50) => {
      const operations = Array.from({ length: concurrentOperations }, async (_, i) => {
        await new Promise(resolve => setTimeout(resolve, Math.random() * 100))
        return i
      })
      
      return Promise.all(operations)
    }
  }
}