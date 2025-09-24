/**
 * Input Sanitization and Validation Middleware
 * Comprehensive input sanitization to prevent injection attacks
 */

import { Request, Response, NextFunction } from 'express';
import DOMPurify from 'isomorphic-dompurify';
import validator from 'validator';
import { body, param, query, validationResult, ValidationChain } from 'express-validator';
import xss from 'xss';

// Define proper types for sanitization
type SanitizationInput = string | number | boolean | null | undefined | SanitizationInput[] | { [key: string]: SanitizationInput };

interface WhitelistMap {
  [tagName: string]: string[];
}

interface XSSOptions {
  stripIgnoreTag: boolean;
  stripIgnoreTagBody: string[];
  allowCommentTag: boolean;
  whiteList?: WhitelistMap;
  css?: boolean | { whiteList: { [property: string]: boolean } };
  stripBlankChar?: boolean;
}

interface FieldRule {
  maxLength?: number;
  allowedChars?: RegExp;
  customSanitizer?: string;
}

export interface InputSanitizationConfig {
  maxLength: number;
  allowedTags: string[];
  sanitizeLevel: 'strict' | 'moderate' | 'basic';
  enableDOMPurify: boolean;
  customSanitizers?: {
    [key: string]: (input: string) => string;
  };
  fieldSpecificRules?: {
    [fieldName: string]: {
      maxLength?: number;
      allowedChars?: RegExp;
      customSanitizer?: string;
    };
  };
}

export class InputSanitizer {
  private config: InputSanitizationConfig;
  private xssOptions: any;

  constructor(config: InputSanitizationConfig) {
    this.config = config;
    this.setupXSSOptions();
  }

  /**
   * Setup XSS filter options based on sanitization level
   */
  private setupXSSOptions(): void {
    const baseOptions = {
      stripIgnoreTag: true,
      stripIgnoreTagBody: ['script'],
      allowCommentTag: false
    };

    switch (this.config.sanitizeLevel) {
      case 'strict':
        this.xssOptions = {
          ...baseOptions,
          whiteList: this.createStrictWhitelist(),
          css: false,
          stripBlankChar: true
        };
        break;

      case 'moderate':
        this.xssOptions = {
          ...baseOptions,
          whiteList: this.createModerateWhitelist(),
          css: {
            whiteList: {
              color: true,
              'background-color': true,
              'text-align': true,
              'font-size': true,
              'font-weight': true
            }
          }
        };
        break;

      case 'basic':
        this.xssOptions = {
          ...baseOptions,
          whiteList: this.createBasicWhitelist(),
          css: true
        };
        break;
    }
  }

  /**
   * Create strict whitelist for HTML tags
   */
  private createStrictWhitelist(): any {
    const whitelist: any = {};

    // Only allow basic formatting tags
    ['p', 'br', 'strong', 'em', 'b', 'i'].forEach(tag => {
      whitelist[tag] = [];
    });

    return whitelist;
  }

  /**
   * Create moderate whitelist for HTML tags
   */
  private createModerateWhitelist(): any {
    const whitelist: any = {};

    // Allow more formatting and structural tags
    [
      'p', 'br', 'strong', 'em', 'b', 'i', 'u', 'span', 'div',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li',
      'blockquote', 'code', 'pre'
    ].forEach(tag => {
      whitelist[tag] = ['class', 'id'];
    });

    // Allow links with restrictions
    whitelist['a'] = ['href', 'title', 'target'];

    return whitelist;
  }

  /**
   * Create basic whitelist for HTML tags
   */
  private createBasicWhitelist(): any {
    const whitelist: any = {};

    // Allow most safe HTML tags
    this.config.allowedTags.forEach(tag => {
      whitelist[tag] = ['class', 'id', 'style'];
    });

    return whitelist;
  }

  /**
   * Main sanitization middleware
   */
  public sanitizeMiddleware(req: Request, res: Response, next: NextFunction): void {
    try {
      // Sanitize request body
      if (req.body && typeof req.body === 'object') {
        req.body = this.sanitizeObject(req.body, 'body');
      }

      // Sanitize query parameters
      if (req.query && typeof req.query === 'object') {
        req.query = this.sanitizeObject(req.query, 'query');
      }

      // Sanitize route parameters
      if (req.params && typeof req.params === 'object') {
        req.params = this.sanitizeObject(req.params, 'params');
      }

      next();
    } catch (error) {
      // Error logging disabled for production
      res.status(400).json({
        error: 'Invalid input data',
        message: 'Request contains potentially malicious content'
      });
    }
  }

  /**
   * Sanitize object recursively
   */
  private sanitizeObject(obj: any, context: string): any {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (typeof obj === 'string') {
      return this.sanitizeString(obj, context);
    }

    if (Array.isArray(obj)) {
      return obj.map((item, index) =>
        this.sanitizeObject(item, `${context}[${index}]`)
      );
    }

    if (typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        const sanitizedKey = this.sanitizeString(key, `${context}.key`);
        sanitized[sanitizedKey] = this.sanitizeObject(value, `${context}.${key}`);
      }
      return sanitized;
    }

    return obj;
  }

  /**
   * Sanitize individual string
   */
  private sanitizeString(input: string, context: string): string {
    if (typeof input !== 'string') {
      return input;
    }

    let sanitized = input;

    // Apply field-specific rules if configured
    const fieldRules = this.getFieldRules(context);
    if (fieldRules) {
      sanitized = this.applyFieldRules(sanitized, fieldRules);
    }

    // Apply length limits
    const maxLength = fieldRules?.maxLength || this.config.maxLength;
    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength);
    }

    // Basic encoding of dangerous characters
    sanitized = this.encodeDangerousChars(sanitized);

    // Apply XSS filtering
    sanitized = xss(sanitized, this.xssOptions);

    // Apply DOMPurify if enabled
    if (this.config.enableDOMPurify) {
      sanitized = DOMPurify.sanitize(sanitized, {
        ALLOWED_TAGS: this.config.allowedTags,
        ALLOWED_ATTR: ['class', 'id'],
        KEEP_CONTENT: true
      });
    }

    // Apply custom sanitizers
    if (fieldRules?.customSanitizer && this.config.customSanitizers) {
      const customSanitizer = this.config.customSanitizers[fieldRules.customSanitizer];
      if (customSanitizer) {
        sanitized = customSanitizer(sanitized);
      }
    }

    // Final validation
    sanitized = this.performFinalValidation(sanitized, context);

    return sanitized;
  }

  /**
   * Get field-specific rules
   */
  private getFieldRules(context: string): any {
    if (!this.config.fieldSpecificRules) {
      return null;
    }

    // Extract field name from context
    const fieldName = context.split('.').pop() || context;
    return this.config.fieldSpecificRules[fieldName];
  }

  /**
   * Apply field-specific rules
   */
  private applyFieldRules(input: string, rules: any): string {
    let result = input;

    // Apply allowed characters filter
    if (rules.allowedChars) {
      result = result.replace(new RegExp(`[^${rules.allowedChars.source}]`, 'g'), '');
    }

    return result;
  }

  /**
   * Encode dangerous characters
   */
  private encodeDangerousChars(input: string): string {
    return input
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;')
      .replace(/\\/g, '&#x5C;')
      .replace(/`/g, '&#96;');
  }

  /**
   * Perform final validation checks
   */
  private performFinalValidation(input: string, context: string): string {
    // Check for SQL injection patterns
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|DECLARE)\b)/i,
      /(;|--|\/\*|\*\/|xp_|sp_)/i,
      /(\b(OR|AND)\s+\d+\s*=\s*\d+)/i
    ];

    for (const pattern of sqlPatterns) {
      if (pattern.test(input)) {
        // Warning logging disabled for production
        // Remove the pattern instead of rejecting entirely
        input = input.replace(pattern, '');
      }
    }

    // Check for script injection
    const scriptPatterns = [
      /<script[\s\S]*?<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /data:text\/html/gi,
      /vbscript:/gi
    ];

    for (const pattern of scriptPatterns) {
      if (pattern.test(input)) {
        // Warning logging disabled for production
        input = input.replace(pattern, '');
      }
    }

    return input;
  }

  /**
   * Validation chain for specific data types
   */
  public createValidationChain(field: string, type: string): ValidationChain[] {
    const chains: ValidationChain[] = [];

    switch (type) {
      case 'email':
        chains.push(
          body(field)
            .isEmail()
            .normalizeEmail()
            .withMessage('Invalid email format')
        );
        break;

      case 'url':
        chains.push(
          body(field)
            .isURL({ protocols: ['http', 'https'] })
            .withMessage('Invalid URL format')
        );
        break;

      case 'alphanumeric':
        chains.push(
          body(field)
            .isAlphanumeric()
            .withMessage('Field must contain only letters and numbers')
        );
        break;

      case 'numeric':
        chains.push(
          body(field)
            .isNumeric()
            .withMessage('Field must be numeric')
        );
        break;

      case 'text':
        chains.push(
          body(field)
            .trim()
            .escape()
            .isLength({ min: 1, max: this.config.maxLength })
            .withMessage(`Field must be between 1 and ${this.config.maxLength} characters`)
        );
        break;

      case 'json':
        chains.push(
          body(field)
            .custom((value) => {
              try {
                JSON.parse(value);
                return true;
              } catch {
                throw new Error('Invalid JSON format');
              }
            })
        );
        break;
    }

    return chains;
  }

  /**
   * Validation error handler
   */
  public validationErrorHandler(req: Request, res: Response, next: NextFunction): void {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      const errorMessages = errors.array().map(error => ({
        field: error.param,
        message: error.msg,
        value: error.value
      }));

      // Warning logging disabled for production

      res.status(400).json({
        error: 'Validation failed',
        details: errorMessages
      });
      return;
    }

    next();
  }

  /**
   * File upload sanitization
   */
  public sanitizeFileUpload() {
    return (req: Request, res: Response, next: NextFunction) => {
      if (req.files) {
        const files = Array.isArray(req.files) ? req.files : [req.files];

        for (const file of files as any[]) {
          if (file) {
            // Sanitize filename
            file.originalname = this.sanitizeFilename(file.originalname);

            // Validate file type
            if (!this.isAllowedFileType(file.mimetype)) {
              res.status(400).json({
                error: 'File type not allowed',
                allowedTypes: this.getAllowedFileTypes()
              });
              return;
            }

            // Check file size (example: 10MB limit)
            if (file.size > 10 * 1024 * 1024) {
              res.status(400).json({
                error: 'File size too large',
                maxSize: '10MB'
              });
              return;
            }
          }
        }
      }

      next();
    };
  }

  /**
   * Sanitize filename
   */
  private sanitizeFilename(filename: string): string {
    return filename
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .replace(/\.\./g, '_')
      .substring(0, 255);
  }

  /**
   * Check if file type is allowed
   */
  private isAllowedFileType(mimetype: string): boolean {
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'text/plain',
      'application/pdf',
      'application/json'
    ];

    return allowedTypes.includes(mimetype);
  }

  /**
   * Get allowed file types
   */
  private getAllowedFileTypes(): string[] {
    return [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'text/plain',
      'application/pdf',
      'application/json'
    ];
  }

  /**
   * Create sanitization middleware for specific routes
   */
  public createRouteSanitizer(rules: { [field: string]: string }) {
    return [
      ...Object.entries(rules).flatMap(([field, type]) =>
        this.createValidationChain(field, type)
      ),
      this.validationErrorHandler.bind(this)
    ];
  }

  /**
   * Health check for input sanitizer
   */
  public healthCheck(): 'healthy' | 'degraded' | 'critical' {
    try {
      // Test basic sanitization
      const testInput = '<script>alert("test")</script>Hello World';
      const sanitized = this.sanitizeString(testInput, 'test');

      if (sanitized.includes('<script>')) {
        return 'critical';
      }

      if (!this.config.enableDOMPurify && this.config.sanitizeLevel === 'basic') {
        return 'degraded';
      }

      return 'healthy';
    } catch (error) {
      return 'critical';
    }
  }

  /**
   * Get sanitization statistics
   */
  public getStatistics(): {
    sanitizeLevel: string;
    domPurifyEnabled: boolean;
    maxLength: number;
    allowedTagsCount: number;
    customSanitizersCount: number;
  } {
    return {
      sanitizeLevel: this.config.sanitizeLevel,
      domPurifyEnabled: this.config.enableDOMPurify,
      maxLength: this.config.maxLength,
      allowedTagsCount: this.config.allowedTags.length,
      customSanitizersCount: Object.keys(this.config.customSanitizers || {}).length
    };
  }
}