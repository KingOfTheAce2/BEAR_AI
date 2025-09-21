// Global Test Setup
// Common setup and configuration for all Jest tests

import 'jest-environment-jsdom';

// Mock global objects and APIs
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock scrollTo
Object.defineProperty(window, 'scrollTo', {
  value: jest.fn(),
  writable: true
});

// Mock HTMLElement.scrollIntoView
Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
  value: jest.fn(),
  writable: true
});

// Mock Tauri APIs
const mockTauri = {
  invoke: jest.fn().mockResolvedValue({}),
  listen: jest.fn().mockResolvedValue(() => {}),
  emit: jest.fn().mockResolvedValue(undefined),
};

Object.defineProperty(window, '__TAURI__', {
  value: mockTauri,
  writable: true
});

// Mock window.open
Object.defineProperty(window, 'open', {
  value: jest.fn(),
  writable: true
});

// Mock crypto API
Object.defineProperty(global, 'crypto', {
  value: {
    getRandomValues: jest.fn().mockImplementation((arr: any) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    }),
    subtle: {
      generateKey: jest.fn(),
      encrypt: jest.fn(),
      decrypt: jest.fn(),
      sign: jest.fn(),
      verify: jest.fn(),
      digest: jest.fn(),
      importKey: jest.fn(),
      exportKey: jest.fn(),
    }
  }
});

// Mock fetch API
global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  status: 200,
  statusText: 'OK',
  json: jest.fn().mockResolvedValue({}),
  text: jest.fn().mockResolvedValue(''),
  blob: jest.fn().mockResolvedValue(new Blob()),
  arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(0)),
  headers: new Headers(),
  url: '',
  redirected: false,
  type: 'basic' as ResponseType,
  clone: jest.fn(),
  body: null,
  bodyUsed: false,
});

// Mock WebSocket
global.WebSocket = jest.fn().mockImplementation(() => ({
  readyState: WebSocket.CONNECTING,
  send: jest.fn(),
  close: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  dispatchEvent: jest.fn(),
}));

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock sessionStorage
Object.defineProperty(window, 'sessionStorage', {
  value: localStorageMock
});

// Mock File and FileReader
global.File = jest.fn().mockImplementation((parts, filename, properties) => ({
  name: filename,
  size: parts.reduce((acc: number, part: any) => acc + (part.length || 0), 0),
  type: properties?.type || '',
  lastModified: Date.now(),
  slice: jest.fn(),
  stream: jest.fn(),
  text: jest.fn(),
  arrayBuffer: jest.fn(),
}));

global.FileReader = jest.fn().mockImplementation(() => ({
  readAsText: jest.fn(),
  readAsDataURL: jest.fn(),
  readAsArrayBuffer: jest.fn(),
  readAsBinaryString: jest.fn(),
  onload: null,
  onerror: null,
  onprogress: null,
  result: null,
  error: null,
  readyState: 0,
  abort: jest.fn(),
}));

// Mock URL.createObjectURL and revokeObjectURL
Object.defineProperty(URL, 'createObjectURL', {
  value: jest.fn(() => 'blob:mock-url'),
  writable: true
});

Object.defineProperty(URL, 'revokeObjectURL', {
  value: jest.fn(),
  writable: true
});

// Mock Blob
global.Blob = jest.fn().mockImplementation((parts = [], properties = {}) => ({
  size: parts.reduce((acc: number, part: any) => acc + (part.length || 0), 0),
  type: properties.type || '',
  slice: jest.fn(),
  stream: jest.fn(),
  text: jest.fn(),
  arrayBuffer: jest.fn(),
}));

// Console error suppression for expected warnings
const originalError = console.error;
console.error = (...args: any[]) => {
  // Suppress React warnings that are expected in tests
  const message = args[0];
  if (
    typeof message === 'string' &&
    (message.includes('Warning: ReactDOM.render is no longer supported') ||
     message.includes('Warning: componentWillReceiveProps has been renamed') ||
     message.includes('Warning: componentWillMount has been renamed'))
  ) {
    return;
  }
  originalError(...args);
};

// Set up default timeouts
jest.setTimeout(30000);

// Global test utilities
global.testUtils = {
  createMockUser: () => ({
    id: 'test-user-123',
    email: 'test@bearai.com',
    name: 'Test User',
    subscription: 'professional',
    permissions: ['read', 'write', 'analyze']
  }),

  createMockDocument: () => ({
    id: 'test-doc-123',
    name: 'test-document.pdf',
    content: 'Test document content for analysis',
    type: 'contract',
    size: 1024,
    createdAt: new Date().toISOString()
  }),

  createMockApiResponse: (data: any, success = true) => ({
    success,
    data: success ? data : undefined,
    error: success ? undefined : data,
    timestamp: new Date().toISOString()
  }),

  wait: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),

  flushPromises: () => new Promise(resolve => setImmediate(resolve))
};

// Type definitions for global test utilities
declare global {
  interface Window {
    __TAURI__: typeof mockTauri;
  }

  namespace NodeJS {
    interface Global {
      testUtils: {
        createMockUser: () => any;
        createMockDocument: () => any;
        createMockApiResponse: (data: any, success?: boolean) => any;
        wait: (ms: number) => Promise<void>;
        flushPromises: () => Promise<void>;
      };
    }
  }

  var testUtils: {
    createMockUser: () => any;
    createMockDocument: () => any;
    createMockApiResponse: (data: any, success?: boolean) => any;
    wait: (ms: number) => Promise<void>;
    flushPromises: () => Promise<void>;
  };
}

export {};