/**
 * Unified BEAR AI GUI Test Setup
 * Comprehensive test configuration for the single interface
 */

import '@testing-library/jest-dom';
import { vi } from 'vitest';
import { configure } from '@testing-library/react';

// Configure testing-library
configure({
  testIdAttribute: 'data-testid',
  asyncUtilTimeout: 5000,
});

// Mock window.matchMedia for theme testing
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // Deprecated
    removeListener: vi.fn(), // Deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock localStorage for theme persistence testing
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Mock sessionStorage
Object.defineProperty(window, 'sessionStorage', {
  value: localStorageMock,
  writable: true,
});

// Mock IntersectionObserver for component visibility testing
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock ResizeObserver for responsive testing
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock performance.memory for memory monitoring tests
Object.defineProperty(performance, 'memory', {
  value: {
    usedJSHeapSize: 50000000, // 50MB
    totalJSHeapSize: 100000000, // 100MB
    jsHeapSizeLimit: 2000000000, // 2GB
  },
  writable: true,
});

// Mock process for Node.js environment simulation
if (typeof global !== 'undefined' && !global.process) {
  global.process = {
    platform: 'win32',
    arch: 'x64',
    version: 'v18.0.0',
    memoryUsage: () => ({
      rss: 100000000,
      heapTotal: 50000000,
      heapUsed: 30000000,
      external: 10000000,
      arrayBuffers: 5000000,
    }),
    cpuUsage: () => ({
      user: 1000000,
      system: 500000,
    }),
    env: {
      NODE_ENV: 'test',
      BEAR_AI_ENV: 'test',
    },
  } as any;
}

// Mock crypto for secure operations
if (typeof global !== 'undefined' && !global.crypto) {
  const { webcrypto } = require('crypto');
  global.crypto = webcrypto as any;
}

// Mock FileReader for document upload testing
global.FileReader = vi.fn().mockImplementation(() => ({
  readAsDataURL: vi.fn(),
  readAsText: vi.fn(),
  readAsArrayBuffer: vi.fn(),
  abort: vi.fn(),
  result: null,
  error: null,
  onload: null,
  onerror: null,
  onabort: null,
  onloadstart: null,
  onloadend: null,
  onprogress: null,
  readyState: 0,
  EMPTY: 0,
  LOADING: 1,
  DONE: 2,
}));

// Mock fetch for API testing
global.fetch = vi.fn();

// Mock WebSocket for real-time features
global.WebSocket = vi.fn().mockImplementation(() => ({
  send: vi.fn(),
  close: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
  readyState: 1,
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3,
}));

// Mock electron APIs for desktop testing
global.electronAPI = {
  platform: 'win32',
  versions: {
    node: '18.0.0',
    chrome: '108.0.0.0',
    electron: '22.0.0',
  },
  app: {
    getVersion: () => '1.0.0',
    getPath: (name: string) => `C:/Users/test/${name}`,
  },
  shell: {
    openExternal: vi.fn(),
  },
  dialog: {
    showOpenDialog: vi.fn(),
    showSaveDialog: vi.fn(),
    showMessageBox: vi.fn(),
  },
  fs: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    exists: vi.fn(),
  },
};

// Test utilities for theme testing
export const themeTestUtils = {
  setDarkMode: () => {
    document.documentElement.classList.add('dark');
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: query === '(prefers-color-scheme: dark)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  },
  
  setLightMode: () => {
    document.documentElement.classList.remove('dark');
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: query === '(prefers-color-scheme: light)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  },
  
  setSystemPreference: (isDark: boolean) => {
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: isDark ? query === '(prefers-color-scheme: dark)' : query === '(prefers-color-scheme: light)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  },
  
  resetTheme: () => {
    document.documentElement.classList.remove('dark', 'light');
    localStorageMock.clear();
  },
};

// Test utilities for Windows-specific testing
export const windowsTestUtils = {
  mockWindowsEnvironment: () => {
    Object.defineProperty(global.process, 'platform', { value: 'win32' });
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      configurable: true,
    });
    Object.defineProperty(navigator, 'platform', {
      value: 'Win32',
      configurable: true,
    });
  },
  
  mockWindowsPaths: () => {
    if (global.electronAPI) {
      global.electronAPI.app.getPath = vi.fn().mockImplementation((name: string) => {
        switch (name) {
          case 'userData': return 'C:/Users/test/AppData/Roaming/BEAR-AI';
          case 'temp': return 'C:/Users/test/AppData/Local/Temp';
          case 'downloads': return 'C:/Users/test/Downloads';
          case 'documents': return 'C:/Users/test/Documents';
          default: return `C:/Users/test/${name}`;
        }
      });
    }
  },
  
  simulateWindowsPerformance: () => {
    // Simulate Windows-typical performance characteristics
    Object.defineProperty(performance, 'memory', {
      value: {
        usedJSHeapSize: 80000000,
        totalJSHeapSize: 120000000,
        jsHeapSizeLimit: 4000000000,
      },
      writable: true,
    });
  },
};

// Memory test utilities
export const memoryTestUtils = {
  simulateMemoryPressure: (level: 'low' | 'medium' | 'high') => {
    const pressureLevels = {
      low: { used: 0.6, total: 8000000000 },
      medium: { used: 0.8, total: 8000000000 },
      high: { used: 0.95, total: 8000000000 },
    };
    
    const { used, total } = pressureLevels[level];
    Object.defineProperty(performance, 'memory', {
      value: {
        usedJSHeapSize: total * used,
        totalJSHeapSize: total,
        jsHeapSizeLimit: total,
      },
      writable: true,
    });
  },
  
  resetMemoryState: () => {
    Object.defineProperty(performance, 'memory', {
      value: {
        usedJSHeapSize: 50000000,
        totalJSHeapSize: 100000000,
        jsHeapSizeLimit: 2000000000,
      },
      writable: true,
    });
  },
};

// Performance test utilities
export const performanceTestUtils = {
  measureComponentRender: async (renderFn: () => Promise<any> | any) => {
    const start = performance.now();
    const result = await renderFn();
    const end = performance.now();
    return {
      result,
      renderTime: end - start,
    };
  },
  
  measureMemoryUsage: (beforeFn: () => void, afterFn: () => void) => {
    const memoryBefore = performance.memory?.usedJSHeapSize || 0;
    beforeFn();
    const memoryAfter = performance.memory?.usedJSHeapSize || 0;
    afterFn();
    return {
      memoryIncrease: memoryAfter - memoryBefore,
      memoryBefore,
      memoryAfter,
    };
  },
};

// Integration test utilities
export const integrationTestUtils = {
  mockJanDevAPI: () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/v1/models')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            data: [
              { id: 'gpt-3.5-turbo', object: 'model' },
              { id: 'gpt-4', object: 'model' },
            ],
          }),
        });
      }
      if (url.includes('/v1/chat/completions')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            choices: [
              {
                message: {
                  content: 'Mock AI response for testing',
                  role: 'assistant',
                },
                finish_reason: 'stop',
              },
            ],
          }),
        });
      }
      return Promise.reject(new Error(`Unhandled URL: ${url}`));
    });
  },
  
  mockGPT4AllAPI: () => {
    vi.mock('../src/services/gpt4allIntegration', () => ({
      GPT4ALLIntegration: vi.fn().mockImplementation(() => ({
        loadModel: vi.fn().mockResolvedValue(true),
        generate: vi.fn().mockResolvedValue({
          text: 'Mock GPT4All response',
          tokens: 50,
          inferenceTime: 1500,
        }),
        unloadModel: vi.fn().mockResolvedValue(true),
        getMemoryUsage: vi.fn().mockReturnValue(100000000),
      })),
    }));
  },
  
  resetAPIMocks: () => {
    vi.resetAllMocks();
  },
};

// Cleanup function for all test utilities
export const cleanup = () => {
  themeTestUtils.resetTheme();
  memoryTestUtils.resetMemoryState();
  integrationTestUtils.resetAPIMocks();
  vi.clearAllTimers();
  vi.useRealTimers();
  localStorageMock.clear();
};

// Global test setup
beforeEach(() => {
  // Reset all mocks before each test
  vi.clearAllMocks();
  localStorageMock.clear();
  document.documentElement.className = '';
});

// Global test cleanup
afterEach(() => {
  cleanup();
});