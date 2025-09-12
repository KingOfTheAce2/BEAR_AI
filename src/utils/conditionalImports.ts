/**
 * Conditional Import System for BEAR AI Hybrid Application
 * Provides safe dynamic imports for Tauri APIs with web fallbacks
 */

import { isTauriEnvironment, environmentLog, waitForTauriReady } from './environmentDetection';

/**
 * Conditional Tauri API imports with fallbacks
 */
export class ConditionalImports {
  private static tauriApiCache: any = null;
  private static initPromise: Promise<any> | null = null;

  /**
   * Safely import Tauri invoke function with fallback
   */
  static async getTauriInvoke(): Promise<(command: string, payload?: any) => Promise<any>> {
    if (!isTauriEnvironment()) {
      environmentLog.warn('Tauri invoke not available - using fallback mock');
      return this.createMockInvoke();
    }

    try {
      // Use dynamic import to avoid build-time errors
      const tauriApi = await import('@tauri-apps/api/tauri');
      return tauriApi.invoke;
    } catch (error) {
      environmentLog.error('Failed to import Tauri API, using fallback:', error);
      // Fall back to our mock implementation
      const mockApi = await import('../api/mockTauriApi');
      return mockApi.mockInvoke;
    }
  }

  /**
   * Safely import all Tauri APIs with caching
   */
  static async getTauriApi(): Promise<any> {
    if (this.tauriApiCache) {
      return this.tauriApiCache;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this.initializeTauriApi();
    this.tauriApiCache = await this.initPromise;
    return this.tauriApiCache;
  }

  /**
   * Initialize Tauri API with proper error handling
   */
  private static async initializeTauriApi(): Promise<any> {
    if (!isTauriEnvironment()) {
      environmentLog.info('Web environment detected - using mock APIs');
      return this.createMockTauriApi();
    }

    try {
      // Wait for Tauri to be ready
      const isReady = await waitForTauriReady();
      if (!isReady) {
        environmentLog.warn('Tauri not ready - using mock APIs');
        return this.createMockTauriApi();
      }

      // Dynamically import all required Tauri APIs
      const [tauriCore, fs, dialog, shell, window, event] = await Promise.all([
        import('@tauri-apps/api/tauri'),
        import('@tauri-apps/api/fs'),
        import('@tauri-apps/api/dialog'),
        import('@tauri-apps/api/shell'),
        import('@tauri-apps/api/window'),
        import('@tauri-apps/api/event')
      ]);

      environmentLog.info('Tauri APIs loaded successfully');
      
      return {
        invoke: tauriCore.invoke,
        fs: {
          readTextFile: fs.readTextFile,
          writeTextFile: fs.writeTextFile,
          createDir: fs.createDir,
          exists: fs.exists,
          removeFile: fs.removeFile,
          removeDir: fs.removeDir,
          copyFile: fs.copyFile,
          renameFile: fs.renameFile
        },
        dialog: {
          open: dialog.open,
          save: dialog.save,
          message: dialog.message,
          ask: dialog.ask,
          confirm: dialog.confirm
        },
        shell: {
          open: shell.open,
          execute: shell.Command
        },
        window: {
          getCurrent: window.getCurrent,
          getAll: window.getAll,
          create: window.WebviewWindow
        },
        event: {
          listen: event.listen,
          once: event.once,
          emit: event.emit,
          unlisten: event.unlisten
        }
      };
    } catch (error) {
      environmentLog.error('Failed to load Tauri APIs:', error);
      return this.createMockTauriApi();
    }
  }

  /**
   * Create mock invoke function for web environment
   */
  private static createMockInvoke() {
    return async (command: string, payload?: any) => {
      environmentLog.warn(`Mock Tauri invoke called: ${command}`, payload);
      
      // Return reasonable mock responses based on command
      switch (command) {
        case 'local_system_health':
          return {
            status: 'healthy',
            local_only: true,
            timestamp: new Date().toISOString()
          };
        
        case 'local_auth_validate':
          return false; // No session in web mode
        
        case 'local_chat_sessions':
          return [];
        
        case 'local_documents_list':
          return [];
        
        default:
          throw new Error(`Mock command not implemented: ${command}`);
      }
    };
  }

  /**
   * Create complete mock Tauri API for web environment
   */
  private static createMockTauriApi() {
    const mockFunction = (name: string) => (...args: any[]) => {
      environmentLog.warn(`Mock Tauri API called: ${name}`, args);
      return Promise.resolve(null);
    };

    return {
      invoke: this.createMockInvoke(),
      fs: {
        readTextFile: mockFunction('fs.readTextFile'),
        writeTextFile: mockFunction('fs.writeTextFile'),
        createDir: mockFunction('fs.createDir'),
        exists: mockFunction('fs.exists'),
        removeFile: mockFunction('fs.removeFile'),
        removeDir: mockFunction('fs.removeDir'),
        copyFile: mockFunction('fs.copyFile'),
        renameFile: mockFunction('fs.renameFile')
      },
      dialog: {
        open: mockFunction('dialog.open'),
        save: mockFunction('dialog.save'),
        message: mockFunction('dialog.message'),
        ask: mockFunction('dialog.ask'),
        confirm: mockFunction('dialog.confirm')
      },
      shell: {
        open: mockFunction('shell.open'),
        execute: class MockCommand {
          constructor(program: string, args?: string[]) {
            environmentLog.warn('Mock shell command:', program, args);
          }
          async execute() {
            return { code: 0, stdout: '', stderr: '' };
          }
        }
      },
      window: {
        getCurrent: () => ({
          minimize: mockFunction('window.minimize'),
          maximize: mockFunction('window.maximize'),
          close: mockFunction('window.close'),
          setTitle: mockFunction('window.setTitle')
        }),
        getAll: mockFunction('window.getAll'),
        create: class MockWebviewWindow {
          constructor(label: string, options?: any) {
            environmentLog.warn('Mock window created:', label, options);
          }
        }
      },
      event: {
        listen: mockFunction('event.listen'),
        once: mockFunction('event.once'),
        emit: mockFunction('event.emit'),
        unlisten: mockFunction('event.unlisten')
      }
    };
  }

  /**
   * Check if real Tauri APIs are available
   */
  static async isRealTauriAvailable(): Promise<boolean> {
    if (!isTauriEnvironment()) return false;
    
    try {
      const api = await this.getTauriApi();
      // Test with a simple invoke call
      await api.invoke('local_system_health');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Clear cache (useful for testing)
   */
  static clearCache(): void {
    this.tauriApiCache = null;
    this.initPromise = null;
  }
}

/**
 * Convenience exports for common usage patterns
 */
export const getTauriInvoke = () => ConditionalImports.getTauriInvoke();
export const getTauriApi = () => ConditionalImports.getTauriApi();
export const isRealTauriAvailable = () => ConditionalImports.isRealTauriAvailable();

export default ConditionalImports;