import '@testing-library/jest-dom'
import { vi } from 'vitest'
import './setup-msw'

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  disconnect: vi.fn(),
  unobserve: vi.fn(),
}))

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  disconnect: vi.fn(),
  unobserve: vi.fn(),
}))

// Mock scrollTo
Object.defineProperty(window, 'scrollTo', {
  writable: true,
  value: vi.fn(),
})

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value.toString()
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
    get length() {
      return Object.keys(store).length
    },
    key: vi.fn((index: number) => Object.keys(store)[index] || null),
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

// Mock sessionStorage
Object.defineProperty(window, 'sessionStorage', {
  value: localStorageMock,
})

// Mock crypto.randomUUID
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: vi.fn(() => 'mock-uuid-' + Math.random().toString(36).substr(2, 9)),
  },
})

// Mock URL.createObjectURL
Object.defineProperty(global.URL, 'createObjectURL', {
  value: vi.fn(() => 'mock-object-url'),
})

Object.defineProperty(global.URL, 'revokeObjectURL', {
  value: vi.fn(),
})

// Mock File and FileList
global.File = vi.fn().mockImplementation((bits, name, options) => ({
  name,
  size: bits.reduce((acc: number, bit: any) => acc + bit.length, 0),
  type: options?.type || 'text/plain',
  lastModified: Date.now(),
})) as any

global.FileList = vi.fn().mockImplementation((files) => ({
  length: files.length,
  item: (index: number) => files[index] || null,
  ...files,
})) as any

// Set up environment variables for tests
process.env.VITE_APP_TITLE = 'BEAR AI Legal Assistant (Test)'
process.env.VITE_API_BASE_URL = 'http://localhost:8000'

// Global test cleanup
afterEach(() => {
  // Clear all mocks after each test
  vi.clearAllMocks()
  
  // Clear localStorage
  localStorageMock.clear()
})