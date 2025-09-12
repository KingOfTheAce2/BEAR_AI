/**
 * BEAR AI Test Setup
 * Global test configuration and mocks
 * 
 * @file Test environment setup for BEAR AI
 */

import '@testing-library/jest-dom'
import { beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest'

// Global test setup
beforeAll(() => {
  // Mock global objects
  global.fetch = vi.fn()
  global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }))
  
  // Mock Tauri APIs if not available
  if (!global.__TAURI__) {
    global.__TAURI__ = {
      invoke: vi.fn(),
      event: {
        listen: vi.fn(),
        emit: vi.fn(),
      },
      fs: {
        readTextFile: vi.fn(),
        writeTextFile: vi.fn(),
        exists: vi.fn(),
        mkdir: vi.fn(),
        readDir: vi.fn(),
        removeFile: vi.fn(),
        removeDir: vi.fn(),
      },
      dialog: {
        open: vi.fn(),
        save: vi.fn(),
        message: vi.fn(),
        ask: vi.fn(),
        confirm: vi.fn(),
      },
      path: {
        join: vi.fn().mockImplementation((...paths) => paths.join('/')),
        dirname: vi.fn(),
        basename: vi.fn(),
        extname: vi.fn(),
        resolve: vi.fn(),
      },
    }
  }
  
  // Mock console methods for cleaner test output
  global.console = {
    ...console,
    warn: vi.fn(),
    error: vi.fn(),
    log: process.env.NODE_ENV === 'test' ? vi.fn() : console.log,
  }
  
  // Mock localStorage
  const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    length: 0,
    key: vi.fn(),
  }
  global.localStorage = localStorageMock
  global.sessionStorage = localStorageMock
  
  // Mock IntersectionObserver
  global.IntersectionObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }))
  
  // Mock Web Workers
  global.Worker = vi.fn().mockImplementation((scriptURL) => ({
    postMessage: vi.fn(),
    terminate: vi.fn(),
    onmessage: null,
    onerror: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
  
  // Mock file system APIs
  global.File = vi.fn().mockImplementation((fileBits, fileName, options) => ({
    name: fileName,
    size: fileBits.length,
    type: options?.type || 'text/plain',
    lastModified: Date.now(),
    arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(0)),
    text: vi.fn().mockResolvedValue(''),
    stream: vi.fn(),
  }))
  
  global.FileReader = vi.fn().mockImplementation(() => ({
    readAsText: vi.fn(),
    readAsArrayBuffer: vi.fn(),
    readAsDataURL: vi.fn(),
    result: null,
    error: null,
    onload: null,
    onerror: null,
    onprogress: null,
    readyState: 0,
    EMPTY: 0,
    LOADING: 1,
    DONE: 2,
  }))
  
  // Mock crypto for tests
  Object.defineProperty(global, 'crypto', {
    value: {
      randomUUID: vi.fn(() => 'mock-uuid-' + Math.random().toString(36).substr(2, 9)),
      getRandomValues: vi.fn((arr) => {
        for (let i = 0; i < arr.length; i++) {
          arr[i] = Math.floor(Math.random() * 256)
        }
        return arr
      }),
    },
  })
  
  // Mock URL.createObjectURL
  global.URL.createObjectURL = vi.fn(() => 'mock-object-url')
  global.URL.revokeObjectURL = vi.fn()
})

beforeEach(() => {
  // Reset all mocks before each test
  vi.clearAllMocks()
  
  // Reset localStorage
  localStorage.clear()
  sessionStorage.clear()
  
  // Reset fetch mock
  global.fetch = vi.fn()
  
  // Reset console mocks
  vi.clearAllMocks()
})

afterEach(() => {
  // Cleanup after each test
  vi.restoreAllMocks()
})

afterAll(() => {
  // Global cleanup
  vi.clearAllTimers()
  vi.unstubAllEnvs()
})

// Test utilities
export const createMockFile = (
  name: string,
  content: string,
  type: string = 'text/plain'
): File => {
  const file = new File([content], name, { type })
  return file
}

export const createMockLegalDocument = (overrides?: Partial<any>) => ({
  id: 'test-doc-1',
  name: 'Test Contract.pdf',
  type: 'pdf' as const,
  size: 1024,
  path: '/test/path/contract.pdf',
  uploadedAt: new Date(),
  status: 'uploaded' as const,
  metadata: {
    wordCount: 100,
    jurisdiction: 'US'
  },
  ...overrides
})

export const createMockAgent = (overrides?: Partial<any>) => ({
  id: 'test-agent-1',
  type: 'legal-analyzer' as const,
  status: 'idle' as const,
  capabilities: ['contract-analysis', 'risk-assessment'],
  config: {},
  lastActivity: new Date(),
  metrics: {
    tasksCompleted: 0,
    averageProcessingTime: 0,
    errorCount: 0
  },
  ...overrides
})

export const createMockTask = (overrides?: Partial<any>) => ({
  id: 'test-task-1',
  type: 'document-analysis' as const,
  status: 'pending' as const,
  assignedAgents: [],
  priority: 'medium' as const,
  documentIds: ['test-doc-1'],
  progress: 0,
  startedAt: new Date(),
  ...overrides
})

export const createMockLLMModel = (overrides?: Partial<any>) => ({
  id: 'test-model-1',
  name: 'Test Legal Model',
  type: 'legal-specialist' as const,
  size: 4000000000,
  quantization: 'Q4_K_M',
  isLoaded: false,
  isLoading: false,
  capabilities: ['legal-analysis', 'contract-review'],
  performanceMetrics: {
    tokensPerSecond: 0,
    memoryUsage: 0,
    accuracy: 0
  },
  ...overrides
})

// Mock implementations for common scenarios
export const mockSuccessfulFetch = (data: any) => {
  global.fetch = vi.fn().mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: vi.fn().mockResolvedValueOnce(data),
    text: vi.fn().mockResolvedValueOnce(JSON.stringify(data)),
  })
}

export const mockFailedFetch = (status: number = 500, message: string = 'Server Error') => {
  global.fetch = vi.fn().mockRejectedValueOnce(
    new Error(`HTTP ${status}: ${message}`)
  )
}

export const mockStreamingFetch = (chunks: string[]) => {
  const mockReader = {
    read: vi.fn()
  }
  
  chunks.forEach((chunk, index) => {
    mockReader.read.mockResolvedValueOnce({
      done: index === chunks.length - 1,
      value: new TextEncoder().encode(chunk)
    })
  })
  
  global.fetch = vi.fn().mockResolvedValueOnce({
    ok: true,
    status: 200,
    body: {
      getReader: () => mockReader
    }
  })
}

// Test environment configuration
export const testConfig = {
  timeout: {
    short: 1000,
    medium: 5000,
    long: 10000
  },
  delays: {
    immediate: 0,
    short: 10,
    medium: 100,
    long: 500
  }
}

// Export commonly used test libraries
export {
  render,
  screen,
  fireEvent,
  waitFor,
  act
} from '@testing-library/react'

export { userEvent } from '@testing-library/user-event'

export {
  vi,
  describe,
  it,
  test,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach
} from 'vitest'