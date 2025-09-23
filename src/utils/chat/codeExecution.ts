import { CodeExecutionResult } from '../../types/chat';
import SecureCodeExecutionService from './secureCodeExecution';

// DEPRECATED: This class contains security vulnerabilities
// Use SecureCodeExecutionService instead
class CodeExecutionService {
  private worker: Worker | null = null;
  private timeoutDuration = 10000; // 10 seconds

  constructor() {
    this.initializeWorker();
  }

  private initializeWorker(): void {
    // Create a worker for safe code execution
    const workerCode = `
      // Web Worker for safe code execution
      const safeGlobals = {
        console: {
          log: (...args) => postMessage({ type: 'log', data: args.map(String).join(' ') }),
          error: (...args) => postMessage({ type: 'error', data: args.map(String).join(' ') }),
          warn: (...args) => postMessage({ type: 'warn', data: args.map(String).join(' ') }),
          info: (...args) => postMessage({ type: 'info', data: args.map(String).join(' ') })
        },
        Math,
        Date,
        JSON,
        Array,
        Object,
        String,
        Number,
        Boolean,
        RegExp,
        setTimeout: (fn, delay) => {
          if (delay > 5000) delay = 5000; // Max 5 second delay
          return setTimeout(fn, delay);
        }
      };

      // Create isolated scope
      function executeInSandbox(code, language) {
        const startTime = performance.now();
        let output = [];
        let hasError = false;

        try {
          // Override global objects for security
          const originalConsole = console;
          const capturedLogs = [];

          // Create a safe console
          const safeConsole = {
            log: (...args) => capturedLogs.push({ type: 'log', args }),
            error: (...args) => capturedLogs.push({ type: 'error', args }),
            warn: (...args) => capturedLogs.push({ type: 'warn', args }),
            info: (...args) => capturedLogs.push({ type: 'info', args })
          };

          // Execute code based on language
          let result;
          switch (language.toLowerCase()) {
            case 'javascript':
            case 'js':
              result = executeJavaScript(code, safeConsole);
              break;
            case 'python':
              result = executePython(code);
              break;
            case 'json':
              result = executeJSON(code);
              break;
            default:
              throw new Error('Unsupported language: ' + language);
          }

          output = [...capturedLogs.map(formatLog), result].filter(Boolean);

        } catch (error) {
          hasError = true;
          output = [error.message];
        }

        const endTime = performance.now();
        
        postMessage({
          type: 'result',
          data: {
            output: output.join('\\n'),
            error: hasError ? output.join('\\n') : null,
            duration: endTime - startTime,
            language
          }
        });
      }

      function executeJavaScript(code, safeConsole) {
        // Create safe execution context
        // SECURITY FIX: Replaced Function constructor with safe execution
        // const safeFunction = new Function(...) // DANGEROUS - REMOVED
        // Only allow safe console.log operations
        let result;
        if (code.trim().startsWith('console.log(')) {
          const logMatch = code.match(/console\.log\((.+)\)/);
          if (logMatch) {
            const content = logMatch[1];
            if (content.startsWith('"') && content.endsWith('"') ||
                content.startsWith("'") && content.endsWith("'")) {
              result = content.slice(1, -1);
            } else {
              result = `[${content}]`;
            }
          }
        } else {
          result = 'JavaScript execution disabled for security';
        }

        // SECURITY FIX: Removed Function constructor execution
        // const result = safeFunction(...) // DANGEROUS - REMOVED

        return result !== undefined ? String(result) : '';
      }

      function executePython(code) {
        // Simulate Python execution (limited functionality)
        // This would need a proper Python interpreter like Pyodide
        try {
          // Basic Python-like syntax support
          if (code.includes('print(')) {
            const printMatch = code.match(/print\\((.+?)\\)/g);
            if (printMatch) {
              return printMatch.map(p => {
                const content = p.match(/print\\((.+?)\\)/)[1];
                // SECURITY FIX: Replaced eval() with safe parsing
                // return eval(content); // DANGEROUS - REMOVED
                // Parse print content safely
                if ((content.startsWith('"') && content.endsWith('"')) ||
                    (content.startsWith("'") && content.endsWith("'"))) {
                  return content.slice(1, -1);
                }
                return `[${content}]`; // Placeholder for variables
              }).join('\\n');
            }
          }
          
          return 'Python execution requires additional runtime (Pyodide)';
        } catch (error) {
          throw new Error('Python execution error: ' + error.message);
        }
      }

      function executeJSON(code) {
        try {
          const parsed = JSON.parse(code);
          return JSON.stringify(parsed, null, 2);
        } catch (error) {
          throw new Error('Invalid JSON: ' + error.message);
        }
      }

      function formatLog(log) {
        const prefix = log.type.toUpperCase() + ': ';
        return prefix + log.args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
        ).join(' ');
      }

      onmessage = function(e) {
        const { code, language } = e.data;
        executeInSandbox(code, language);
      };
    `;

    const blob = new Blob([workerCode], { type: 'application/javascript' });
    this.worker = new Worker(URL.createObjectURL(blob));
  }

  async executeCode(code: string, language: string): Promise<CodeExecutionResult> {
    const worker = this.worker;
    if (!worker) {
      throw new Error('Code execution worker not initialized');
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Code execution timed out'));
      }, this.timeoutDuration);

      const handleMessage = (event: MessageEvent) => {
        clearTimeout(timeout);
        worker.removeEventListener('message', handleMessage);

        if (event.data.type === 'result') {
          resolve(event.data.data);
        } else {
          reject(new Error('Unexpected worker response'));
        }
      };

      worker.addEventListener('message', handleMessage);
      worker.postMessage({ code, language });
    });
  }

  getSupportedLanguages(): string[] {
    return [
      'javascript',
      'js',
      'json',
      'python', // Limited support
      'html',
      'css',
      'markdown'
    ];
  }

  validateCode(code: string, language: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Basic security checks
    const dangerousPatterns = [
      /eval\s*\(/,
      /Function\s*\(/,
      /XMLHttpRequest/,
      /fetch\s*\(/,
      /import\s+/,
      /require\s*\(/,
      /process\./,
      /global\./,
      /window\./,
      /document\./,
      /localStorage/,
      /sessionStorage/,
      /indexedDB/,
      /navigator\./,
      /location\./,
      /history\./
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(code)) {
        errors.push(`Potentially unsafe code detected: ${pattern.source}`);
      }
    }

    // Language-specific validation
    switch (language.toLowerCase()) {
      case 'javascript':
      case 'js':
        if (!this.isValidJavaScript(code)) {
          errors.push('Invalid JavaScript syntax');
        }
        break;
      case 'json':
        try {
          JSON.parse(code);
        } catch (error) {
          errors.push('Invalid JSON format');
        }
        break;
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private isValidJavaScript(code: string): boolean {
    // SECURITY FIX: Replaced Function constructor with safe validation
    // try {
    //   new Function(code); // DANGEROUS - REMOVED
    //   return true;
    // } catch {
    //   return false;
    // }

    // Safe syntax validation patterns
    const safePatterns = [
      /^console\.log\(.+\)$/,
      /^Math\..+$/,
      /^JSON\.(stringify|parse)\(.+\)$/,
      /^["'].+["']$/ // String literals
    ];

    const trimmed = code.trim();
    return safePatterns.some(pattern => pattern.test(trimmed));
  }

  formatCode(code: string, language: string): string {
    // Basic code formatting
    switch (language.toLowerCase()) {
      case 'json':
        try {
          return JSON.stringify(JSON.parse(code), null, 2);
        } catch {
          return code;
        }
      case 'javascript':
      case 'js':
        return this.formatJavaScript(code);
      default:
        return code;
    }
  }

  private formatJavaScript(code: string): string {
    // Basic JavaScript formatting (simplified)
    return code
      .replace(/;\s*}/g, ';\n}')
      .replace(/{/g, '{\n  ')
      .replace(/;/g, ';\n')
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .join('\n');
  }

  dispose(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }
}

export default CodeExecutionService;