/**
 * Secure Code Execution Service
 * Replaces unsafe eval() and Function() constructor with safe alternatives
 */

import { CodeExecutionResult } from '../../types/chat';

// Safe expression evaluator for simple math and string operations
class SafeExpressionEvaluator {
  private allowedOperators = ['+', '-', '*', '/', '%', '(', ')', ' '];
  private allowedFunctions = ['Math.abs', 'Math.floor', 'Math.ceil', 'Math.round', 'Math.min', 'Math.max'];

  evaluateExpression(expression: string): any {
    // Remove whitespace
    const cleaned = expression.replace(/\s/g, '');

    // Check for dangerous patterns
    if (this.containsDangerousPatterns(cleaned)) {
      throw new Error('Expression contains potentially unsafe operations');
    }

    // Parse and evaluate safely
    return this.safeEvaluate(cleaned);
  }

  private containsDangerousPatterns(expr: string): boolean {
    const dangerousPatterns = [
      /eval/i,
      /function/i,
      /constructor/i,
      /prototype/i,
      /__proto__/i,
      /import/i,
      /require/i,
      /process/i,
      /global/i,
      /window/i,
      /document/i,
      /alert/i,
      /console/i,
      /setTimeout/i,
      /setInterval/i
    ];

    return dangerousPatterns.some(pattern => pattern.test(expr));
  }

  private safeEvaluate(expr: string): any {
    try {
      // Only allow numeric expressions and basic math
      if (!/^[\d+\-*/(). ]+$/.test(expr)) {
        throw new Error('Expression contains invalid characters');
      }

      // Use a safe mathematical expression parser
      return this.parseMathExpression(expr);
    } catch (error) {
      throw new Error(`Safe evaluation failed: ${error.message}`);
    }
  }

  private parseMathExpression(expr: string): number {
    // Simple recursive descent parser for mathematical expressions
    let pos = 0;

    const parseNumber = (): number => {
      let num = '';
      while (pos < expr.length && /[\d.]/.test(expr[pos])) {
        num += expr[pos++];
      }
      return parseFloat(num);
    };

    const parseFactor = (): number => {
      if (expr[pos] === '(') {
        pos++; // skip '('
        const result = parseExpression();
        pos++; // skip ')'
        return result;
      }
      if (expr[pos] === '-') {
        pos++;
        return -parseFactor();
      }
      return parseNumber();
    };

    const parseTerm = (): number => {
      let result = parseFactor();
      while (pos < expr.length && /[*/%]/.test(expr[pos])) {
        const op = expr[pos++];
        const right = parseFactor();
        if (op === '*') result *= right;
        else if (op === '/') result /= right;
        else if (op === '%') result %= right;
      }
      return result;
    };

    const parseExpression = (): number => {
      let result = parseTerm();
      while (pos < expr.length && /[+-]/.test(expr[pos])) {
        const op = expr[pos++];
        const right = parseTerm();
        if (op === '+') result += right;
        else if (op === '-') result -= right;
      }
      return result;
    };

    return parseExpression();
  }
}

// Secure Python-like print statement parser
class SecurePythonPrintParser {
  parsePrintStatements(code: string): string[] {
    const results: string[] = [];
    const printMatches = code.match(/print\s*\(\s*([^)]+)\s*\)/g);

    if (printMatches) {
      for (const match of printMatches) {
        const contentMatch = match.match(/print\s*\(\s*([^)]+)\s*\)/);
        if (contentMatch) {
          const content = contentMatch[1].trim();
          results.push(this.evaluatePrintContent(content));
        }
      }
    }

    return results;
  }

  private evaluatePrintContent(content: string): string {
    // Remove quotes if it's a string literal
    if ((content.startsWith('"') && content.endsWith('"')) ||
        (content.startsWith("'") && content.endsWith("'"))) {
      return content.slice(1, -1);
    }

    // If it's a number, return as string
    if (/^\d+(\.\d+)?$/.test(content)) {
      return content;
    }

    // For variables or expressions, return placeholder
    return `[${content}]`;
  }
}

// Secure template processor for dynamic content
class SecureTemplateProcessor {
  private allowedVariables = new Set<string>();

  constructor(allowedVars: string[] = []) {
    this.allowedVariables = new Set(allowedVars);
  }

  processTemplate(template: string, context: Record<string, any>): string {
    // Use safe template replacement instead of eval
    return template.replace(/\{([^}]+)\}/g, (match, varName) => {
      const trimmed = varName.trim();

      // Only allow whitelisted variables
      if (!this.allowedVariables.has(trimmed)) {
        return match; // Return unchanged if not allowed
      }

      const value = context[trimmed];
      return value !== undefined ? String(value) : match;
    });
  }

  addAllowedVariable(varName: string): void {
    this.allowedVariables.add(varName);
  }
}

class SecureCodeExecutionService {
  private worker: Worker | null = null;
  private timeoutDuration = 10000; // 10 seconds
  private expressionEvaluator = new SafeExpressionEvaluator();
  private pythonParser = new SecurePythonPrintParser();
  private templateProcessor = new SecureTemplateProcessor();

  constructor() {
    this.initializeWorker();
  }

  private initializeWorker(): void {
    // Create a secure worker for safe code execution
    const workerCode = `
      // Secure Web Worker for code execution
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
        RegExp
      };

      // Secure execution function that doesn't use eval or Function constructor
      function executeInSecureSandbox(code, language) {
        const startTime = performance.now();
        let output = [];
        let hasError = false;

        try {
          let result;
          switch (language.toLowerCase()) {
            case 'javascript':
            case 'js':
              result = executeSecureJavaScript(code);
              break;
            case 'python':
              result = executeSecurePython(code);
              break;
            case 'json':
              result = executeSecureJSON(code);
              break;
            case 'math':
              result = executeSecureMath(code);
              break;
            default:
              throw new Error('Unsupported language: ' + language);
          }

          if (result !== undefined) {
            output.push(result);
          }

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

      function executeSecureJavaScript(code) {
        // Only allow safe operations - no eval, no Function constructor
        const allowedPatterns = [
          /^console\.log\(.+\)$/,
          /^Math\.\w+\(.+\)$/,
          /^\d+\s*[+\-*/]\s*\d+$/,
          /^JSON\.stringify\(.+\)$/,
          /^JSON\.parse\(.+\)$/,
          /^["'].+["']$/  // String literals
        ];

        const trimmedCode = code.trim();

        // Check if code matches any allowed pattern
        const isAllowed = allowedPatterns.some(pattern => pattern.test(trimmedCode));

        if (!isAllowed) {
          throw new Error('JavaScript code contains potentially unsafe operations');
        }

        // Execute only safe operations
        if (trimmedCode.startsWith('console.log(')) {
          const match = trimmedCode.match(/console\.log\((.+)\)$/);
          if (match) {
            const content = match[1];
            if (content.startsWith('"') && content.endsWith('"') ||
                content.startsWith("'") && content.endsWith("'")) {
              return content.slice(1, -1);
            }
          }
        }

        return 'JavaScript execution completed (limited to safe operations)';
      }

      function executeSecurePython(code) {
        // Parse print statements safely without eval
        const printMatches = code.match(/print\\s*\\(\\s*([^)]+)\\s*\\)/g);
        if (printMatches) {
          return printMatches.map(match => {
            const contentMatch = match.match(/print\\s*\\(\\s*([^)]+)\\s*\\)/);
            if (contentMatch) {
              const content = contentMatch[1].trim();
              // Return literal strings
              if ((content.startsWith('"') && content.endsWith('"')) ||
                  (content.startsWith("'") && content.endsWith("'"))) {
                return content.slice(1, -1);
              }
              return '[' + content + ']';
            }
            return '';
          }).join('\\n');
        }

        return 'Python execution requires additional runtime (Pyodide) - print statements parsed';
      }

      function executeSecureJSON(code) {
        try {
          const parsed = JSON.parse(code);
          return JSON.stringify(parsed, null, 2);
        } catch (error) {
          throw new Error('Invalid JSON: ' + error.message);
        }
      }

      function executeSecureMath(code) {
        // Only allow mathematical expressions
        const mathPattern = /^[\\d+\\-*/()\\s.]+$/;
        if (!mathPattern.test(code)) {
          throw new Error('Math expression contains invalid characters');
        }

        try {
          // Simple math parser (recursive descent)
          const result = parseMathExpression(code.replace(/\\s/g, ''));
          return result.toString();
        } catch (error) {
          throw new Error('Math evaluation error: ' + error.message);
        }
      }

      function parseMathExpression(expr) {
        let pos = 0;

        function parseNumber() {
          let num = '';
          while (pos < expr.length && /[\\d.]/.test(expr[pos])) {
            num += expr[pos++];
          }
          return parseFloat(num);
        }

        function parseFactor() {
          if (expr[pos] === '(') {
            pos++; // skip '('
            const result = parseExpression();
            pos++; // skip ')'
            return result;
          }
          if (expr[pos] === '-') {
            pos++;
            return -parseFactor();
          }
          return parseNumber();
        }

        function parseTerm() {
          let result = parseFactor();
          while (pos < expr.length && /[*\\/]/.test(expr[pos])) {
            const op = expr[pos++];
            const right = parseFactor();
            if (op === '*') result *= right;
            else if (op === '/') result /= right;
          }
          return result;
        }

        function parseExpression() {
          let result = parseTerm();
          while (pos < expr.length && /[+\\-]/.test(expr[pos])) {
            const op = expr[pos++];
            const right = parseTerm();
            if (op === '+') result += right;
            else if (op === '-') result -= right;
          }
          return result;
        }

        return parseExpression();
      }

      onmessage = function(e) {
        const { code, language } = e.data;
        executeInSecureSandbox(code, language);
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

    // Pre-validate code for security
    const validation = this.validateCode(code, language);
    if (!validation.isValid) {
      throw new Error(`Security validation failed: ${validation.errors.join(', ')}`);
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
      'javascript', // Limited safe operations only
      'js',         // Limited safe operations only
      'json',       // JSON parsing only
      'python',     // Print statement parsing only
      'math',       // Mathematical expressions only
      'html',       // Static content only
      'css',        // Static content only
      'markdown'    // Static content only
    ];
  }

  validateCode(code: string, language: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Enhanced security checks - block all dangerous patterns
    const dangerousPatterns = [
      { pattern: /eval\s*\(/i, message: 'eval() is not allowed' },
      { pattern: /Function\s*\(/i, message: 'Function constructor is not allowed' },
      { pattern: /new\s+Function/i, message: 'new Function() is not allowed' },
      { pattern: /constructor/i, message: 'constructor access is not allowed' },
      { pattern: /__proto__/i, message: '__proto__ access is not allowed' },
      { pattern: /prototype/i, message: 'prototype manipulation is not allowed' },
      { pattern: /XMLHttpRequest/i, message: 'XMLHttpRequest is not allowed' },
      { pattern: /fetch\s*\(/i, message: 'fetch() is not allowed' },
      { pattern: /import\s+/i, message: 'import statements are not allowed' },
      { pattern: /require\s*\(/i, message: 'require() is not allowed' },
      { pattern: /process\./i, message: 'process access is not allowed' },
      { pattern: /global\./i, message: 'global access is not allowed' },
      { pattern: /window\./i, message: 'window access is not allowed' },
      { pattern: /document\./i, message: 'document access is not allowed' },
      { pattern: /localStorage/i, message: 'localStorage access is not allowed' },
      { pattern: /sessionStorage/i, message: 'sessionStorage access is not allowed' },
      { pattern: /indexedDB/i, message: 'indexedDB access is not allowed' },
      { pattern: /navigator\./i, message: 'navigator access is not allowed' },
      { pattern: /location\./i, message: 'location access is not allowed' },
      { pattern: /history\./i, message: 'history access is not allowed' },
      { pattern: /setTimeout\s*\(/i, message: 'setTimeout is not allowed' },
      { pattern: /setInterval\s*\(/i, message: 'setInterval is not allowed' },
      { pattern: /alert\s*\(/i, message: 'alert() is not allowed' },
      { pattern: /confirm\s*\(/i, message: 'confirm() is not allowed' },
      { pattern: /prompt\s*\(/i, message: 'prompt() is not allowed' }
    ];

    for (const { pattern, message } of dangerousPatterns) {
      if (pattern.test(code)) {
        errors.push(message);
      }
    }

    // Language-specific validation
    switch (language.toLowerCase()) {
      case 'javascript':
      case 'js':
        if (!this.isValidJavaScriptSyntax(code)) {
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
      case 'math':
        if (!/^[\d+\-*/().\s]+$/.test(code)) {
          errors.push('Math expression contains invalid characters');
        }
        break;
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private isValidJavaScriptSyntax(code: string): boolean {
    // Safe syntax validation without using Function constructor
    try {
      // Check for basic syntax patterns
      const syntaxPatterns = [
        /^console\.log\(.+\)$/, // console.log statements
        /^Math\.\w+\(.+\)$/,   // Math operations
        /^\d+\s*[+\-*/]\s*\d+$/, // Simple arithmetic
        /^JSON\.(stringify|parse)\(.+\)$/, // JSON operations
        /^["'].+["']$/         // String literals
      ];

      const trimmedCode = code.trim();
      return syntaxPatterns.some(pattern => pattern.test(trimmedCode));
    } catch {
      return false;
    }
  }

  // Safe template processing for variable substitution
  processTemplate(template: string, context: Record<string, any>, allowedVars: string[] = []): string {
    this.templateProcessor = new SecureTemplateProcessor(allowedVars);
    return this.templateProcessor.processTemplate(template, context);
  }

  // Safe expression evaluation for mathematical expressions
  evaluateExpression(expression: string): number {
    return this.expressionEvaluator.evaluateExpression(expression);
  }

  formatCode(code: string, language: string): string {
    // Basic code formatting without execution
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

export default SecureCodeExecutionService;