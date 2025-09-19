declare module 'worker_threads' {
  class Worker {
    constructor(filename: string, options?: any);
    postMessage(message: unknown): void;
    terminate(): Promise<number>;
    on(event: string, listener: (...args: any[]) => void): this;
    once(event: string, listener: (...args: any[]) => void): this;
  }

  const isMainThread: boolean;
  const parentPort: {
    postMessage(message: unknown): void;
    on(event: string, listener: (...args: any[]) => void): void;
  } | null;
  const workerData: unknown;

  export { Worker, isMainThread, parentPort, workerData };
}

declare module 'os' {
  const os: any;
  export = os;
}

declare module 'process' {
  const proc: any;
  export = proc;
}

declare module 'perf_hooks' {
  export const performance: {
    now(): number;
  };
}

declare module 'child_process' {
  export function exec(
    command: string,
    callback?: (error: Error | null, stdout: string, stderr: string) => void
  ): void;
}

declare module 'fs' {
  const fs: any;
  export = fs;
}

