/**
 * Unified BEAR AI GUI - Global Test Setup
 * Global configuration and setup for all tests
 */

import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';

// Global test configuration
export default function globalSetup() {
  // Global setup that runs once before all tests
  beforeAll(async () => {
    console.log('🚀 Starting BEAR AI Unified GUI Test Suite');
    
    // Set up global test environment
    process.env.NODE_ENV = 'test';
    process.env.BEAR_AI_ENV = 'test';
    process.env.BEAR_AI_DEBUG = 'false';
    
    // Mock performance APIs if not available
    if (typeof performance === 'undefined') {
      global.performance = {
        now: () => Date.now(),
        mark: () => {},
        measure: () => {},
        clearMarks: () => {},
        clearMeasures: () => {},
        getEntriesByName: () => [],
        getEntriesByType: () => [],
        memory: {
          usedJSHeapSize: 50000000,
          totalJSHeapSize: 100000000,
          jsHeapSizeLimit: 2000000000,
        },
      } as any;
    }
    
    // Set up console for test environment
    if (process.env.BEAR_AI_SILENT_TESTS !== 'false') {
      // Suppress console output during tests unless explicitly enabled
      const originalConsole = global.console;
      global.console = {
        ...originalConsole,
        log: () => {},
        warn: () => {},
        info: () => {},
        debug: () => {},
        // Keep error for debugging test failures
        error: originalConsole.error,
      };
    }
    
    // Initialize test utilities
    setupTestUtilities();
  });
  
  // Global cleanup that runs once after all tests
  afterAll(async () => {
    console.log('✅ BEAR AI Unified GUI Test Suite Complete');
    
    // Clean up global resources
    cleanupTestUtilities();
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
  });
  
  // Setup that runs before each test file
  beforeEach(() => {
    // Reset test environment state
    resetTestEnvironment();
  });
  
  // Cleanup that runs after each test file
  afterEach(() => {
    // Clean up after each test
    cleanupAfterTest();
  });
}

/**
 * Set up test utilities and global mocks
 */
function setupTestUtilities() {
  // Mock fetch globally
  global.fetch = createMockFetch();
  
  // Mock WebSocket
  global.WebSocket = createMockWebSocket();
  
  // Mock storage APIs
  setupStorageMocks();
  
  // Mock performance observer
  setupPerformanceObserver();
  
  // Set up error boundaries for tests
  setupErrorHandling();
}

/**
 * Create mock fetch implementation
 */
function createMockFetch() {
  return jest.fn().mockImplementation((url: string, options?: any) => {
    return Promise.resolve({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({}),
      text: async () => '',
      blob: async () => new Blob(),
      arrayBuffer: async () => new ArrayBuffer(0),
      headers: new Map(),
      url,
      clone: () => createMockResponse(),
    });
  });
}

/**
 * Create mock response object
 */
function createMockResponse() {
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    json: async () => ({}),
    text: async () => '',
    blob: async () => new Blob(),
    arrayBuffer: async () => new ArrayBuffer(0),
    headers: new Map(),
    url: '',
    clone: () => createMockResponse(),
  };
}

/**
 * Create mock WebSocket implementation
 */
function createMockWebSocket() {
  return class MockWebSocket {
    static CONNECTING = 0;
    static OPEN = 1;
    static CLOSING = 2;
    static CLOSED = 3;

    CONNECTING = 0;
    OPEN = 1;
    CLOSING = 2;
    CLOSED = 3;

    readyState = 1;
    url: string;
    protocol: string;

    onopen: ((event: Event) => void) | null = null;
    onclose: ((event: CloseEvent) => void) | null = null;
    onmessage: ((event: MessageEvent) => void) | null = null;
    onerror: ((event: Event) => void) | null = null;

    constructor(url: string, protocols?: string | string[]) {
      this.url = url;
      this.protocol = Array.isArray(protocols) ? protocols[0] : protocols || '';
      
      // Simulate connection
      setTimeout(() => {
        if (this.onopen) {
          this.onopen(new Event('open'));
        }
      }, 0);
    }

    send(data: string | ArrayBufferLike | Blob | ArrayBufferView) {
      // Mock send - do nothing
    }

    close(code?: number, reason?: string) {
      this.readyState = 3;
      if (this.onclose) {
        this.onclose(new CloseEvent('close', { code, reason }));
      }
    }

    addEventListener(type: string, listener: EventListener) {
      // Mock event listener
    }

    removeEventListener(type: string, listener: EventListener) {
      // Mock remove event listener
    }

    dispatchEvent(event: Event): boolean {
      return true;
    }
  };
}

/**
 * Set up storage mocks (localStorage, sessionStorage)
 */
function setupStorageMocks() {
  const createStorageMock = () => {
    const store: { [key: string]: string } = {};
    
    return {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => {
        store[key] = String(value);
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        Object.keys(store).forEach(key => delete store[key]);
      },
      length: Object.keys(store).length,
      key: (index: number) => Object.keys(store)[index] || null,
    };
  };

  if (typeof global.localStorage === 'undefined') {
    global.localStorage = createStorageMock();
  }
  
  if (typeof global.sessionStorage === 'undefined') {
    global.sessionStorage = createStorageMock();
  }
}

/**
 * Set up performance observer mock
 */
function setupPerformanceObserver() {
  global.PerformanceObserver = class MockPerformanceObserver {
    callback: PerformanceObserverCallback;
    
    constructor(callback: PerformanceObserverCallback) {
      this.callback = callback;
    }
    
    observe(options: PerformanceObserverInit) {
      // Mock observe
    }
    
    disconnect() {
      // Mock disconnect
    }
    
    takeRecords(): PerformanceEntryList {
      return [];
    }
  } as any;
}

/**
 * Set up error handling for tests
 */
function setupErrorHandling() {
  // Catch unhandled promise rejections in tests
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  });
  
  // Catch uncaught exceptions in tests
  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
  });
}

/**
 * Reset test environment state
 */
function resetTestEnvironment() {
  // Clear all mocks
  if (typeof global.fetch?.mockClear === 'function') {
    global.fetch.mockClear();
  }
  
  // Clear storage
  global.localStorage?.clear();
  global.sessionStorage?.clear();
  
  // Reset document classes
  if (typeof document !== 'undefined') {
    document.documentElement.className = '';
    document.body.className = '';
  }
  
  // Reset window properties
  if (typeof window !== 'undefined') {
    delete (window as any).matchMedia;
  }
}

/**
 * Clean up after each test
 */
function cleanupAfterTest() {
  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }
  
  // Clear any timeouts/intervals
  if (typeof window !== 'undefined') {
    // Clear all timeouts (this is a bit aggressive but ensures clean state)
    let id = setTimeout(() => {}, 0);
    for (let i = 0; i <= id; i++) {
      clearTimeout(i);
      clearInterval(i);
    }
  }
}

/**
 * Clean up global test utilities
 */
function cleanupTestUtilities() {
  // Remove global mocks
  delete (global as any).fetch;
  delete (global as any).WebSocket;
  
  // Clean up performance mocks
  delete (global as any).PerformanceObserver;
  
  // Remove storage mocks if they were added
  if (process.env.NODE_ENV === 'test') {
    delete (global as any).localStorage;
    delete (global as any).sessionStorage;
  }
}

// Export test utilities for use in individual tests
export {
  setupTestUtilities,
  cleanupTestUtilities,
  resetTestEnvironment,
  cleanupAfterTest,
  createMockFetch,
  createMockWebSocket,
};