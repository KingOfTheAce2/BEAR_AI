/**
 * Isolated Sandbox Implementation (DEPRECATED)
 * SECURITY WARNING: This implementation uses unsafe Function constructor
 * Use SecureSandbox instead for production environments
 * Provides minimal execution environment for low-risk plugins
 */

import { PluginManifest, PluginPermission } from '../core/types';

export class IsolatedSandbox {
  private manifest: PluginManifest;
  private permissions: PluginPermission[];
  private context: any = null;
  private messageChannel: MessageChannel;
  private isolatedGlobal: any = {};

  constructor(manifest: PluginManifest, permissions: PluginPermission[]) {
    this.manifest = manifest;
    this.permissions = permissions;
    this.messageChannel = new MessageChannel();
  }

  /**
   * Create isolated execution context
   */
  async create(): Promise<any> {
    try {
      // Create isolated global context
      this.isolatedGlobal = this.createIsolatedGlobal();
      
      // Setup message handling
      this.setupMessageHandling();
      
      this.context = this.isolatedGlobal;
      return this.context;
    } catch (error) {
      throw new Error(`Failed to create isolated sandbox: ${error.message}`);
    }
  }

  /**
   * Get message channel
   */
  getMessageChannel(): MessageChannel {
    return this.messageChannel;
  }

  /**
   * Execute code in isolated context
   */
  async executeCode(code: string, api: any, config: any): Promise<any> {
    if (!this.context) {
      throw new Error('Sandbox not initialized');
    }

    try {
      // Use SecureSandbox for safe execution instead of Function constructor
      const { SecureSandbox } = await import('./SecureSandbox');
      const secureSandbox = new SecureSandbox(
        { id: 'isolated', name: 'Isolated Plugin', version: '1.0.0', permissions: this.permissions },
        this.permissions
      );

      await secureSandbox.create();
      return await secureSandbox.executeCode(code, api, config);
    } catch (error) {
      throw new Error(`Execution error: ${error.message}`);
    }
  }

  /**
   * Destroy sandbox
   */
  destroy(): void {
    // Clear timers
    this.clearAllTimers();
    
    // Clear isolated global
    this.isolatedGlobal = {};
    
    // Close message channels
    this.messageChannel.port1.close();
    this.messageChannel.port2.close();
    
    this.context = null;
  }

  private createIsolatedGlobal(): any {
    const isolated = Object.create(null);
    
    // Add safe built-ins
    isolated.Object = Object;
    isolated.Array = Array;
    isolated.String = String;
    isolated.Number = Number;
    isolated.Boolean = Boolean;
    isolated.Date = Date;
    isolated.Math = Math;
    isolated.JSON = JSON;
    isolated.RegExp = RegExp;
    isolated.Error = Error;
    isolated.TypeError = TypeError;
    isolated.ReferenceError = ReferenceError;
    isolated.SyntaxError = SyntaxError;
    
    // Add safe methods
    isolated.parseInt = parseInt;
    isolated.parseFloat = parseFloat;
    isolated.isNaN = isNaN;
    isolated.isFinite = isFinite;
    isolated.encodeURIComponent = encodeURIComponent;
    isolated.decodeURIComponent = decodeURIComponent;
    
    return isolated;
  }

  private setupMessageHandling(): void {
    this.messageChannel.port1.onmessage = (event) => {
      this.handleMessage(event.data);
    };
    this.messageChannel.port1.start();
  }

  private handleMessage(message: any): void {
    try {
      switch (message.type) {
        case 'execute':
          this.handleExecuteMessage(message);
          break;
        
        case 'call_method':
          this.handleMethodCall(message);
          break;
        
        default:
          this.sendResponse(message.messageId, {
            error: 'Unknown message type'
          });
      }
    } catch (error) {
      this.sendResponse(message.messageId, {
        error: error.message
      });
    }
  }

  private async handleExecuteMessage(message: any): Promise<void> {
    try {
      const result = await this.executeCode(message.code, message.api, message.config);
      this.sendResponse(message.messageId, { result });
    } catch (error) {
      this.sendResponse(message.messageId, { error: error.message });
    }
  }

  private handleMethodCall(message: any): void {
    try {
      // Handle method calls on plugin instance
      const { method, args } = message;
      
      if (this.isolatedGlobal.pluginInstance && typeof this.isolatedGlobal.pluginInstance[method] === 'function') {
        const result = this.isolatedGlobal.pluginInstance[method].apply(this.isolatedGlobal.pluginInstance, args);
        this.sendResponse(message.messageId, { result });
      } else {
        this.sendResponse(message.messageId, { error: 'Method not found' });
      }
    } catch (error) {
      this.sendResponse(message.messageId, { error: error.message });
    }
  }

  private sendResponse(messageId: string, response: any): void {
    this.messageChannel.port2.postMessage({
      messageId,
      ...response
    });
  }

  private createRestrictedConsole(): Console {
    return {
      log: (...args) => this.sendLog('log', args),
      warn: (...args) => this.sendLog('warn', args),
      error: (...args) => this.sendLog('error', args),
      info: (...args) => this.sendLog('info', args),
      debug: (...args) => this.sendLog('debug', args),
      trace: (...args) => this.sendLog('trace', args),
      clear: () => {},
      count: () => {},
      countReset: () => {},
      group: () => {},
      groupCollapsed: () => {},
      groupEnd: () => {},
      table: () => {},
      time: () => {},
      timeEnd: () => {},
      timeLog: () => {},
      assert: () => {},
      dir: () => {},
      dirxml: () => {},
      profile: () => {},
      profileEnd: () => {}
    } as Console;
  }

  private sendLog(level: string, args: any[]): void {
    this.messageChannel.port2.postMessage({
      type: 'log',
      level,
      message: args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ')
    });
  }

  private createRestrictedTimers(): any {
    const timers = new Map<number, any>();
    let timerId = 1;

    const createTimer = (callback: Function, delay: number, repeat: boolean, ...args: any[]) => {
      const id = timerId++;
      
      const wrappedCallback = () => {
        try {
          callback.apply(this.isolatedGlobal, args);
        } catch (error) {
          this.sendLog('error', [`Timer callback error: ${error.message}`]);
        }
        
        if (!repeat) {
          timers.delete(id);
        }
      };

      const timeoutId = repeat 
        ? setInterval(wrappedCallback, Math.max(delay, 10)) // Min 10ms delay
        : setTimeout(wrappedCallback, Math.max(delay, 0));
      
      timers.set(id, {
        timeoutId,
        repeat,
        callback: wrappedCallback
      });
      
      return id;
    };

    const clearTimer = (id: number) => {
      const timer = timers.get(id);
      if (timer) {
        if (timer.repeat) {
          clearInterval(timer.timeoutId);
        } else {
          clearTimeout(timer.timeoutId);
        }
        timers.delete(id);
      }
    };

    return {
      setTimeout: (callback: Function, delay: number, ...args: any[]) => {
        return createTimer(callback, delay, false, ...args);
      },
      
      clearTimeout: (id: number) => {
        clearTimer(id);
      },
      
      setInterval: (callback: Function, delay: number, ...args: any[]) => {
        return createTimer(callback, delay, true, ...args);
      },
      
      clearInterval: (id: number) => {
        clearTimer(id);
      },
      
      // Clear all timers (used during cleanup)
      clearAll: () => {
        for (const [id] of timers.entries()) {
          clearTimer(id);
        }
      }
    };
  }

  private clearAllTimers(): void {
    if (this.isolatedGlobal.timers && typeof this.isolatedGlobal.timers.clearAll === 'function') {
      this.isolatedGlobal.timers.clearAll();
    }
  }

  private hasPermission(type: string): boolean {
    return this.permissions.some(p => p.type === type);
  }
}