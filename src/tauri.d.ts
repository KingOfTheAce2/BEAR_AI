// Tauri API type definitions for TypeScript
declare global {
  interface Window {
    __TAURI__?: {
      invoke: (cmd: string, args?: Record<string, unknown>) => Promise<unknown>
      event: {
        listen: (event: string, handler: (event: any) => void) => Promise<() => void>
        emit: (event: string, payload?: unknown) => Promise<void>
      }
      app: {
        getName: () => Promise<string>
        getVersion: () => Promise<string>
        getTauriVersion: () => Promise<string>
        show: () => Promise<void>
        hide: () => Promise<void>
      }
      window: {
        appWindow: {
          show: () => Promise<void>
          hide: () => Promise<void>
          close: () => Promise<void>
          minimize: () => Promise<void>
          maximize: () => Promise<void>
          unmaximize: () => Promise<void>
          isMaximized: () => Promise<boolean>
          setResizable: (resizable: boolean) => Promise<void>
          setTitle: (title: string) => Promise<void>
          setAlwaysOnTop: (alwaysOnTop: boolean) => Promise<void>
        }
      }
      notification: {
        sendNotification: (options: string | { title: string; body?: string; icon?: string }) => Promise<void>
        isPermissionGranted: () => Promise<boolean>
        requestPermission: () => Promise<Permission | null>
      }
      fs: {
        readTextFile: (filePath: string) => Promise<string>
        writeTextFile: (filePath: string, contents: string) => Promise<void>
        readDir: (dir: string) => Promise<FileEntry[]>
        createDir: (dir: string, options?: { recursive?: boolean }) => Promise<void>
        exists: (path: string) => Promise<boolean>
      }
      path: {
        appDir: () => Promise<string>
        desktopDir: () => Promise<string>
        documentDir: () => Promise<string>
        downloadDir: () => Promise<string>
        join: (...paths: string[]) => Promise<string>
      }
      dialog: {
        open: (options?: OpenDialogOptions) => Promise<string | string[] | null>
        save: (options?: SaveDialogOptions) => Promise<string | null>
        message: (message: string, options?: MessageDialogOptions) => Promise<void>
        ask: (message: string, options?: MessageDialogOptions) => Promise<boolean>
        confirm: (message: string, options?: MessageDialogOptions) => Promise<boolean>
      }
    }
  }
}

// Tauri-specific types
type Permission = 'granted' | 'denied' | 'default'

interface FileEntry {
  path: string
  name?: string
  children?: FileEntry[]
}

interface OpenDialogOptions {
  defaultPath?: string
  filters?: FileFilter[]
  multiple?: boolean
  directory?: boolean
}

interface SaveDialogOptions {
  defaultPath?: string
  filters?: FileFilter[]
}

interface FileFilter {
  name: string
  extensions: string[]
}

interface MessageDialogOptions {
  title?: string
  type?: 'info' | 'warning' | 'error'
}

// Custom Tauri commands (defined in Rust)
interface TauriCommands {
  greet: (name: string) => Promise<string>
  get_system_info: () => Promise<Record<string, string>>
  show_window: () => Promise<void>
  hide_window: () => Promise<void>
}

// Utility to check if running in Tauri
export const isTauri = (): boolean => {
  return typeof window !== 'undefined' && !!window.__TAURI__
}

// Utility to safely invoke Tauri commands
export const invokeTauri = async <T>(
  command: keyof TauriCommands,
  args?: Record<string, unknown>
): Promise<T> => {
  if (!isTauri()) {
    throw new Error('Tauri is not available')
  }
  
  return window.__TAURI__!.invoke(command, args) as Promise<T>
}

export {}