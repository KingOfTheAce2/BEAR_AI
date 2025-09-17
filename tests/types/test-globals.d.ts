/*
 * Ambient test environment declarations for mocked globals used in Jest/Vitest setups.
 */

type AnyFunction = (...args: any[]) => any;

declare namespace NodeJS {
  interface Global {
    __TAURI__?: TauriAPI;
    electronAPI?: ElectronAPI;
    ResizeObserver: any;
    IntersectionObserver: any;
    PerformanceObserver: any;
    requestIdleCallback: AnyFunction;
    cancelIdleCallback: AnyFunction;
    fetch: AnyFunction;
    WebSocket: WebSocketConstructorLike;
    FileReader: FileReaderConstructorLike;
    File: any;
    Blob: any;
    Worker: any;
    navigator: Navigator;
    localStorage: Storage;
    sessionStorage: Storage;
    URL: typeof globalThis.URL;
    performance: Performance;
    screen: Screen;
    gc?: () => void;
    TextEncoder: any;
    TextDecoder: any;
    crypto: Crypto;
  }
}

interface TauriAPI {
  invoke: AnyFunction;
  event: {
    listen: AnyFunction;
    emit: AnyFunction;
  };
  fs: {
    readTextFile: AnyFunction;
    writeTextFile: AnyFunction;
  };
  shell: {
    open: AnyFunction;
  };
  dialog: {
    open: AnyFunction;
    save: AnyFunction;
  };
}

interface ElectronAPI {
  platform: string;
  versions: {
    node: string;
    chrome: string;
    electron: string;
  };
  app: {
    getVersion: () => string;
    getPath: (name: string) => string;
  };
  shell: {
    openExternal: AnyFunction;
  };
  dialog: {
    showOpenDialog: AnyFunction;
    showSaveDialog: AnyFunction;
    showMessageBox: AnyFunction;
  };
  fs: {
    readFile: AnyFunction;
    writeFile: AnyFunction;
    exists: AnyFunction;
  };
}

interface MemoryInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

interface FileReaderLike {
  readAsDataURL: AnyFunction;
  readAsText: AnyFunction;
  readAsArrayBuffer: AnyFunction;
  abort: AnyFunction;
  result: string | ArrayBuffer | null;
  error: any;
  onload: AnyFunction | null;
  onerror: AnyFunction | null;
  onabort: AnyFunction | null;
  onloadstart: AnyFunction | null;
  onloadend: AnyFunction | null;
  onprogress: AnyFunction | null;
  readyState: number;
  readonly EMPTY: number;
  readonly LOADING: number;
  readonly DONE: number;
}

interface FileReaderConstructorLike {
  new (): FileReaderLike;
  prototype: FileReaderLike;
}

interface WebSocketLike {
  readonly CONNECTING: number;
  readonly OPEN: number;
  readonly CLOSING: number;
  readonly CLOSED: number;
  readyState: number;
  send: AnyFunction;
  close: AnyFunction;
  addEventListener: AnyFunction;
  removeEventListener: AnyFunction;
  dispatchEvent: AnyFunction;
}

interface WebSocketConstructorLike {
  new (...args: any[]): WebSocketLike;
  prototype: WebSocketLike;
  CONNECTING: number;
  OPEN: number;
  CLOSING: number;
  CLOSED: number;
}

declare global {
  interface Window {
    __TAURI__?: TauriAPI;
    electronAPI?: ElectronAPI;
    matchMedia: (query: string) => MediaQueryList;
    localStorage: Storage;
    sessionStorage: Storage;
  }

  interface Performance {
    memory?: MemoryInfo;
  }

  var __TAURI__: TauriAPI | undefined;
  var electronAPI: ElectronAPI | undefined;
  var ResizeObserver: any;
  var IntersectionObserver: any;
  var PerformanceObserver: any;
  var requestIdleCallback: AnyFunction;
  var cancelIdleCallback: AnyFunction;
  var fetch: AnyFunction;
  var WebSocket: WebSocketConstructorLike;
  var FileReader: FileReaderConstructorLike;
  var File: any;
  var Blob: any;
  var Worker: any;
  var navigator: Navigator;
  var localStorage: Storage;
  var sessionStorage: Storage;
  var URL: typeof globalThis.URL;
  var performance: Performance;
  var screen: Screen;
  var gc: (() => void) | undefined;
  var TextEncoder: any;
  var TextDecoder: any;
  var crypto: Crypto;
}

export {};
