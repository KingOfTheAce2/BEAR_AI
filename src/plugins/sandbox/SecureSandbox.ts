/**
 * Secure Sandbox Implementation
 * Provides safe plugin execution without Function constructor
 */

import { PluginManifest, PluginPermission } from '../core/types';

export interface SecureSandboxOptions {
  allowedFunctions?: string[];
  maxExecutionTime?: number;
  memoryLimit?: number;
}

export class SecureSandbox {
  private manifest: PluginManifest;
  private permissions: PluginPermission[];
  private messageChannel: MessageChannel;
  private options: SecureSandboxOptions;
  private allowedFunctions: Set<string>;

  constructor(manifest: PluginManifest, permissions: PluginPermission[], options: SecureSandboxOptions = {}) {
    this.manifest = manifest;
    this.permissions = permissions;
    this.messageChannel = new MessageChannel();
    this.options = {
      maxExecutionTime: 5000,
      memoryLimit: 50 * 1024 * 1024, // 50MB
      ...options
    };

    // Define allowed functions for plugin execution
    this.allowedFunctions = new Set([
      'console.log',
      'console.warn',
      'console.error',
      'console.info',
      'Math.abs',
      'Math.floor',
      'Math.ceil',
      'Math.round',
      'Math.min',
      'Math.max',
      'JSON.stringify',
      'JSON.parse',
      'String',
      'Number',
      'Boolean',
      'Array.from',
      'Object.keys',
      'Object.values',
      'Object.entries',
      ...(options.allowedFunctions || [])
    ]);
  }

  /**
   * Create secure execution context
   */
  async create(): Promise<any> {
    try {
      const context = this.createSecureContext();
      this.setupMessageHandling();
      return context;
    } catch (error) {
      throw new Error(`Failed to create secure sandbox: ${error.message}`);
    }
  }

  /**
   * Execute plugin code safely without Function constructor
   */
  async executeCode(code: string, api: any, config: any): Promise<any> {
    // Validate code before execution
    this.validateCode(code);

    try {
      // Parse code into safe operations
      const operations = this.parseCodeSafely(code);

      // Execute operations in controlled environment
      return await this.executeOperations(operations, api, config);
    } catch (error) {
      throw new Error(`Secure execution failed: ${error.message}`);
    }
  }

  /**
   * Get message channel for communication
   */
  getMessageChannel(): MessageChannel {
    return this.messageChannel;
  }

  /**
   * Destroy sandbox and cleanup resources
   */
  destroy(): void {
    this.messageChannel.port1.close();
    this.messageChannel.port2.close();
  }

  private createSecureContext(): any {
    return {
      // Safe built-ins only
      console: this.createSecureConsole(),
      Math: this.createSecureMath(),
      JSON: this.createSecureJSON(),
      String: String,
      Number: Number,
      Boolean: Boolean,
      Array: this.createSecureArray(),
      Object: this.createSecureObject(),

      // Plugin-specific APIs
      setTimeout: this.createSecureTimeout(),
      clearTimeout: clearTimeout,
      setInterval: this.createSecureInterval(),
      clearInterval: clearInterval
    };
  }

  private validateCode(code: string): void {
    // Check for dangerous patterns
    const dangerousPatterns = [
      /eval\s*\(/i,
      /Function\s*\(/i,
      /new\s+Function/i,
      /constructor/i,
      /__proto__/i,
      /prototype\s*\[/i,
      /import\s*\(/i,
      /require\s*\(/i,
      /process\./i,
      /global\./i,
      /window\./i,
      /document\./i,
      /location\./i,
      /navigator\./i,
      /XMLHttpRequest/i,
      /fetch\s*\(/i,
      /WebSocket/i,
      /localStorage/i,
      /sessionStorage/i,
      /indexedDB/i
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(code)) {
        throw new Error(`Code contains prohibited pattern: ${pattern.source}`);
      }
    }

    // Check code length
    if (code.length > 100000) { // 100KB limit
      throw new Error('Code exceeds maximum length limit');
    }
  }

  private parseCodeSafely(code: string): Array<{type: string, operation: string, args: any[]}> {
    const operations: Array<{type: string, operation: string, args: any[]}> = [];

    // Parse safe operations like console.log, API calls, etc.
    const lines = code.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('//')) continue;

      // Parse console operations
      const consoleMatch = trimmed.match(/^console\.(log|warn|error|info)\s*\(\s*(.+?)\s*\)$/);
      if (consoleMatch) {
        operations.push({
          type: 'console',
          operation: consoleMatch[1],
          args: [this.parseArgument(consoleMatch[2])]
        });
        continue;
      }

      // Parse API calls
      const apiMatch = trimmed.match(/^api\.(\w+)\.(\w+)\s*\(\s*(.*?)\s*\)$/);
      if (apiMatch) {
        operations.push({
          type: 'api',
          operation: `${apiMatch[1]}.${apiMatch[2]}`,
          args: apiMatch[3] ? this.parseArguments(apiMatch[3]) : []
        });
        continue;
      }

      // Parse variable assignments (limited)
      const assignMatch = trimmed.match(/^(\w+)\s*=\s*(.+)$/);
      if (assignMatch) {
        operations.push({
          type: 'assign',
          operation: assignMatch[1],
          args: [this.parseArgument(assignMatch[2])]
        });
        continue;
      }

      // If no safe pattern matches, reject the line
      if (trimmed) {
        throw new Error(`Unsupported operation: ${trimmed}`);
      }
    }

    return operations;
  }

  private parseArgument(arg: string): any {
    const trimmed = arg.trim();

    // String literals
    if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
        (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
      return trimmed.slice(1, -1);
    }

    // Numbers
    if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
      return parseFloat(trimmed);
    }

    // Booleans
    if (trimmed === 'true') return true;
    if (trimmed === 'false') return false;
    if (trimmed === 'null') return null;
    if (trimmed === 'undefined') return undefined;

    // Arrays (simple)
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      const content = trimmed.slice(1, -1);
      if (!content) return [];
      return content.split(',').map(item => this.parseArgument(item));
    }

    // Objects (simple)
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      const content = trimmed.slice(1, -1);
      if (!content) return {};

      const obj: any = {};
      const pairs = content.split(',');
      for (const pair of pairs) {
        const [key, value] = pair.split(':').map(s => s.trim());
        if (key && value) {
          const cleanKey = key.replace(/['"]/g, '');
          obj[cleanKey] = this.parseArgument(value);
        }
      }
      return obj;
    }

    // Return as variable reference
    return { type: 'variable', name: trimmed };
  }

  private parseArguments(args: string): any[] {
    if (!args.trim()) return [];

    const result: any[] = [];
    let depth = 0;
    let current = '';

    for (let i = 0; i < args.length; i++) {
      const char = args[i];

      if (char === ',' && depth === 0) {
        result.push(this.parseArgument(current));
        current = '';
      } else {
        if (char === '(' || char === '[' || char === '{') depth++;
        if (char === ')' || char === ']' || char === '}') depth--;
        current += char;
      }
    }

    if (current.trim()) {
      result.push(this.parseArgument(current));
    }

    return result;
  }

  private async executeOperations(operations: Array<{type: string, operation: string, args: any[]}>, api: any, config: any): Promise<any> {
    const context: any = { api, config, variables: {} };
    let lastResult: any;

    for (const op of operations) {
      try {
        switch (op.type) {
          case 'console':
            this.executeConsoleOperation(op.operation, op.args, context);
            break;

          case 'api':
            lastResult = await this.executeApiOperation(op.operation, op.args, context);
            break;

          case 'assign':
            context.variables[op.operation] = this.resolveValue(op.args[0], context);
            break;

          default:
            throw new Error(`Unknown operation type: ${op.type}`);
        }
      } catch (error) {
        throw new Error(`Operation failed: ${op.type}.${op.operation} - ${error.message}`);
      }
    }

    return lastResult;
  }

  private executeConsoleOperation(operation: string, args: any[], context: any): void {
    const resolvedArgs = args.map(arg => this.resolveValue(arg, context));

    switch (operation) {
      case 'log':
        this.sendLog('log', resolvedArgs);
        break;
      case 'warn':
        this.sendLog('warn', resolvedArgs);
        break;
      case 'error':
        this.sendLog('error', resolvedArgs);
        break;
      case 'info':
        this.sendLog('info', resolvedArgs);
        break;
    }
  }

  private async executeApiOperation(operation: string, args: any[], context: any): Promise<any> {
    const resolvedArgs = args.map(arg => this.resolveValue(arg, context));
    const [namespace, method] = operation.split('.');

    if (context.api[namespace] && typeof context.api[namespace][method] === 'function') {
      return await context.api[namespace][method](...resolvedArgs);
    } else {
      throw new Error(`API method not found: ${operation}`);
    }
  }

  private resolveValue(value: any, context: any): any {
    if (value && typeof value === 'object' && value.type === 'variable') {
      return context.variables[value.name] ?? value.name;
    }
    return value;
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

  private setupMessageHandling(): void {
    this.messageChannel.port1.onmessage = (event) => {
      this.handleMessage(event.data);
    };
    this.messageChannel.port1.start();
  }

  private handleMessage(message: any): void {
    // Handle incoming messages safely
    try {
      switch (message.type) {
        case 'execute':
          this.handleExecuteMessage(message);
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

  private sendResponse(messageId: string, response: any): void {
    this.messageChannel.port2.postMessage({
      messageId,
      ...response
    });
  }

  // Secure implementations of built-in objects
  private createSecureConsole() {
    return {
      log: (...args: any[]) => this.sendLog('log', args),
      warn: (...args: any[]) => this.sendLog('warn', args),
      error: (...args: any[]) => this.sendLog('error', args),
      info: (...args: any[]) => this.sendLog('info', args)
    };
  }

  private createSecureMath() {
    return {
      abs: Math.abs,
      floor: Math.floor,
      ceil: Math.ceil,
      round: Math.round,
      min: Math.min,
      max: Math.max,
      random: Math.random,
      PI: Math.PI,
      E: Math.E
    };
  }

  private createSecureJSON() {
    return {
      stringify: JSON.stringify,
      parse: (text: string) => {
        try {
          return JSON.parse(text);
        } catch (error) {
          throw new Error('Invalid JSON');
        }
      }
    };
  }

  private createSecureArray() {
    return {
      from: Array.from,
      isArray: Array.isArray
    };
  }

  private createSecureObject() {
    return {
      keys: Object.keys,
      values: Object.values,
      entries: Object.entries,
      assign: Object.assign
    };
  }

  private createSecureTimeout() {
    return (callback: Function, delay: number) => {
      // Limit timeout delay
      const safeDelay = Math.min(delay, this.options.maxExecutionTime || 5000);
      return setTimeout(callback, safeDelay);
    };
  }

  private createSecureInterval() {
    return (callback: Function, delay: number) => {
      // Limit interval delay
      const safeDelay = Math.max(delay, 100); // Minimum 100ms
      return setInterval(callback, safeDelay);
    };
  }

  private hasPermission(type: string): boolean {
    return this.permissions.some(p => p.type === type);
  }
}