import '@testing-library/jest-dom';
import { expect, vi } from 'vitest';
import { configure } from '@testing-library/react';
import { toHaveNoViolations } from 'jest-axe';

declare global {
  interface Window {
    __TAURI__?: {
      invoke: (cmd: string, args?: Record<string, unknown>) => Promise<unknown>;
      listen: (event: string, handler: (...payload: any[]) => void) => Promise<() => void>;
      emit: (event: string, payload?: unknown) => Promise<void>;
    };
  }

  // eslint-disable-next-line no-var
  var testUtils: {
    createMockUser: () => {
      id: string;
      email: string;
      name: string;
      subscription: string;
      permissions: string[];
    };
    createMockDocument: () => {
      id: string;
      name: string;
      content: string;
      type: string;
      size: number;
      createdAt: string;
    };
    createMockApiResponse: (data: unknown, success?: boolean) => {
      success: boolean;
      data?: unknown;
      error?: unknown;
      timestamp: string;
    };
    wait: (ms: number) => Promise<void>;
    flushPromises: () => Promise<void>;
  };
}

expect.extend({ toHaveNoViolations });

configure({
  testIdAttribute: 'data-testid',
  asyncUtilTimeout: 5000,
  computedStyleSupportsPseudoElements: true,
});


const globalAny = globalThis as any;

globalAny.getComputedStyle = (_element: Element) => ({
  getPropertyValue: () => '',
  getPropertyPriority: () => '',
  item: () => '',
  length: 0,
  removeProperty: () => '',
  setProperty: () => undefined,
});

if (!globalAny.matchMedia) {
  globalAny.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

globalAny.IntersectionObserver = vi.fn(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

globalAny.ResizeObserver = vi.fn(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

globalAny.scrollTo = vi.fn();

if (!HTMLElement.prototype.scrollIntoView) {
  HTMLElement.prototype.scrollIntoView = vi.fn();
}

globalAny.__TAURI__ = globalAny.__TAURI__ ?? {
  invoke: vi.fn().mockResolvedValue({}),
  listen: vi.fn().mockResolvedValue(() => {}),
  emit: vi.fn().mockResolvedValue(undefined),
};

if (!globalAny.crypto) {
  globalAny.crypto = {
    getRandomValues: vi.fn((arr: Uint8Array) => {
      for (let i = 0; i < arr.length; i += 1) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    }),
    subtle: {
      generateKey: vi.fn(),
      encrypt: vi.fn(),
      decrypt: vi.fn(),
      sign: vi.fn(),
      verify: vi.fn(),
      digest: vi.fn(),
      importKey: vi.fn(),
      exportKey: vi.fn(),
    },
  };
} else {
  globalAny.crypto.getRandomValues = globalAny.crypto.getRandomValues ?? vi.fn();
}

globalAny.fetch = vi.fn().mockResolvedValue({
  ok: true,
  status: 200,
  statusText: 'OK',
  json: vi.fn().mockResolvedValue({}),
  text: vi.fn().mockResolvedValue(''),
  blob: vi.fn().mockResolvedValue(new Blob()),
  arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(0)),
  headers: new Headers(),
  url: '',
  redirected: false,
  type: 'basic' as ResponseType,
  clone: vi.fn(),
  body: null,
  bodyUsed: false,
});

const websocketConnectingState = typeof WebSocket !== 'undefined' ? WebSocket.CONNECTING : 0;

globalAny.WebSocket = vi.fn(() => ({
  readyState: websocketConnectingState,
  send: vi.fn(),
  close: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
}));

const createStorageMock = () => {
  let store: Record<string, string> = {};

  return {
    getItem: vi.fn((key: string) => (key in store ? store[key] : null)),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
    get length() {
      return Object.keys(store).length;
    },
  };
};

globalAny.localStorage = createStorageMock();
globalAny.sessionStorage = createStorageMock();

globalAny.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
globalAny.URL.revokeObjectURL = vi.fn();

globalAny.File = class MockFile extends Blob {
  name: string;
  lastModified: number;

  constructor(parts: BlobPart[], filename: string, properties: FilePropertyBag = {}) {
    super(parts, properties);
    this.name = filename;
    this.lastModified = properties.lastModified ?? Date.now();
  }
} as typeof File;

globalAny.FileReader = class MockFileReader {
  onload: ((this: FileReader, ev: ProgressEvent<FileReader>) => unknown) | null = null;
  onerror: ((this: FileReader, ev: ProgressEvent<FileReader>) => unknown) | null = null;
  onprogress: ((this: FileReader, ev: ProgressEvent<FileReader>) => unknown) | null = null;
  result: string | ArrayBuffer | null = null;
  error: DOMException | null = null;
  readyState = 0;

  readAsText = vi.fn();
  readAsDataURL = vi.fn();
  readAsArrayBuffer = vi.fn();
  readAsBinaryString = vi.fn();
  abort = vi.fn();
} as typeof FileReader;

// Original console error capture disabled
// Console error override disabled
  const [message] = args;
  if (typeof message === 'string' &&
    (message.includes('Warning: ReactDOM.render is no longer supported') ||
     message.includes('Warning: componentWillReceiveProps has been renamed') ||
     message.includes('Warning: componentWillMount has been renamed'))
  ) {
    return;
  }
  originalConsoleError(...args);
};

const testUtils = {
  createMockUser: () => ({
    id: 'test-user-123',
    email: 'test@bearai.com',
    name: 'Test User',
    subscription: 'professional',
    permissions: ['read', 'write', 'analyze'],
  }),
  createMockDocument: () => ({
    id: 'test-doc-123',
    name: 'test-document.pdf',
    content: 'Test document content for analysis',
    type: 'contract',
    size: 1024,
    createdAt: new Date().toISOString(),
  }),
  createMockApiResponse: (data: unknown, success = true) => ({
    success,
    data: success ? data : undefined,
    error: success ? undefined : data,
    timestamp: new Date().toISOString(),
  }),
  wait: (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)),
  flushPromises: () => new Promise<void>((resolve) => setTimeout(resolve, 0)),
};

globalAny.testUtils = testUtils;

export {};
