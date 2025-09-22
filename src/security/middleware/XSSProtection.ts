/**
 * XSS Protection Middleware
 * Advanced Cross-Site Scripting (XSS) protection with content sanitization
 */

import { Request, Response, NextFunction } from 'express';
import DOMPurify from 'isomorphic-dompurify';
import xss, { IFilterXSSOptions } from 'xss';
import { JSDOM } from 'jsdom';

export interface XSSProtectionConfig {
  filterLevel: 'strict' | 'moderate' | 'basic';
  reportUri?: string;
  enableCSPNonce?: boolean;
  enableDOMPurify?: boolean;
  customFilters?: {
    [key: string]: (input: string) => string;
  };
  allowedDomains?: string[];
  blockInlineStyles?: boolean;
  blockInlineScripts?: boolean;
  enableReflectedXSSProtection?: boolean;
}

export class XSSProtection {
  private config: XSSProtectionConfig;
  private xssOptions: IFilterXSSOptions;
  private suspiciousPatterns: RegExp[];
  private blockedAttempts: Map<string, number> = new Map();

  constructor(config: XSSProtectionConfig) {
    this.config = config;
    this.initializeXSSOptions();
    this.initializeSuspiciousPatterns();
  }

  /**
   * Initialize XSS filter options based on protection level
   */
  private initializeXSSOptions(): void {
    const baseOptions: IFilterXSSOptions = {
      stripIgnoreTag: true,
      stripIgnoreTagBody: ['script', 'style'],
      allowCommentTag: false,
      onIgnoreTag: this.onIgnoreTag.bind(this),
      onIgnoreTagAttr: this.onIgnoreTagAttr.bind(this),
      safeAttrValue: this.safeAttrValue.bind(this)
    };

    switch (this.config.filterLevel) {
      case 'strict':
        this.xssOptions = {
          ...baseOptions,
          whiteList: this.createStrictWhitelist(),
          css: false,
          stripBlankChar: true,
          allowList: {}
        };
        break;

      case 'moderate':
        this.xssOptions = {
          ...baseOptions,
          whiteList: this.createModerateWhitelist(),
          css: {
            whiteList: {
              'color': true,
              'background-color': true,
              'text-align': true,
              'font-size': true,
              'font-weight': true,
              'margin': true,
              'padding': true
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
   * Initialize patterns that indicate potential XSS attacks
   */
  private initializeSuspiciousPatterns(): void {
    this.suspiciousPatterns = [
      // Script tags
      /<script[\s\S]*?>[\s\S]*?<\/script>/gi,

      // JavaScript protocols
      /javascript\s*:/gi,

      // Event handlers
      /on\w+\s*=\s*["']?[^"']*["']?/gi,

      // Data URLs with scripts
      /data\s*:\s*text\/html/gi,

      // VBScript
      /vbscript\s*:/gi,

      // Expression() calls (IE)
      /expression\s*\(/gi,

      // Import statements
      /@import/gi,

      // Link tags with javascript
      /<link[^>]+href\s*=\s*["']?javascript:/gi,

      // Style tags with javascript
      /<style[^>]*>[\s\S]*?javascript[\s\S]*?<\/style>/gi,

      // Object/embed tags
      /<(object|embed|applet)/gi,

      // Form tags with javascript
      /<form[^>]+action\s*=\s*["']?javascript:/gi,

      // Meta refresh with javascript
      /<meta[^>]+http-equiv\s*=\s*["']?refresh[^>]+url\s*=\s*javascript:/gi,

      // Iframe with javascript
      /<iframe[^>]+src\s*=\s*["']?javascript:/gi,

      // Base64 encoded scripts
      /data:text\/html;base64,/gi,

      // Unicode escapes
      /\\u[0-9a-fA-F]{4}/g,

      // HTML entities that might hide scripts
      /&[#x]?[0-9a-fA-F]+;/g
    ];
  }

  /**
   * Create strict whitelist for HTML tags
   */
  private createStrictWhitelist(): { [tag: string]: string[] } {
    return {
      'p': [],
      'br': [],
      'strong': [],
      'em': [],
      'b': [],
      'i': [],
      'span': ['class'],
      'div': ['class']
    };
  }

  /**
   * Create moderate whitelist for HTML tags
   */
  private createModerateWhitelist(): { [tag: string]: string[] } {
    return {
      'p': ['class', 'id', 'style'],
      'br': [],
      'strong': ['class'],
      'em': ['class'],
      'b': ['class'],
      'i': ['class'],
      'u': ['class'],
      'span': ['class', 'id', 'style'],
      'div': ['class', 'id', 'style'],
      'h1': ['class', 'id'],
      'h2': ['class', 'id'],
      'h3': ['class', 'id'],
      'h4': ['class', 'id'],
      'h5': ['class', 'id'],
      'h6': ['class', 'id'],
      'ul': ['class'],
      'ol': ['class'],
      'li': ['class'],
      'blockquote': ['class'],
      'code': ['class'],
      'pre': ['class'],
      'a': ['href', 'title', 'class', 'target'],
      'img': ['src', 'alt', 'title', 'class', 'width', 'height']
    };
  }

  /**
   * Create basic whitelist for HTML tags
   */
  private createBasicWhitelist(): { [tag: string]: string[] } {
    return {
      ...this.createModerateWhitelist(),
      'table': ['class', 'id'],
      'thead': ['class'],
      'tbody': ['class'],
      'tr': ['class'],
      'td': ['class', 'colspan', 'rowspan'],
      'th': ['class', 'colspan', 'rowspan'],
      'video': ['controls', 'width', 'height', 'preload'],
      'audio': ['controls', 'preload'],
      'source': ['src', 'type']
    };
  }

  /**
   * Main XSS protection middleware
   */
  public xssMiddleware(req: Request, res: Response, next: NextFunction): void {
    try {
      // Check for reflected XSS in URL parameters
      if (this.config.enableReflectedXSSProtection) {
        const reflectedXSS = this.detectReflectedXSS(req);
        if (reflectedXSS.detected) {
          this.handleXSSAttempt(req, res, 'reflected', reflectedXSS.patterns);
          return;
        }
      }

      // Sanitize request data
      if (req.body && typeof req.body === 'object') {
        req.body = this.sanitizeData(req.body, 'body');
      }

      if (req.query && typeof req.query === 'object') {
        req.query = this.sanitizeData(req.query, 'query');
      }

      // Add XSS protection headers
      this.addXSSHeaders(res);

      // Override res.render to sanitize template data
      this.overrideResponseRender(res);

      next();
    } catch (error) {
      console.error('XSS protection error:', error);
      next();
    }
  }

  /**
   * Detect reflected XSS attacks
   */
  private detectReflectedXSS(req: Request): { detected: boolean; patterns: string[] } {
    const detectedPatterns: string[] = [];
    const urlParams = new URLSearchParams(req.url.split('?')[1] || '');

    for (const [key, value] of urlParams.entries()) {
      for (const pattern of this.suspiciousPatterns) {
        if (pattern.test(value)) {
          detectedPatterns.push(`${key}=${value}`);
        }
      }
    }

    return {
      detected: detectedPatterns.length > 0,
      patterns: detectedPatterns
    };
  }

  /**
   * Sanitize data recursively
   */
  private sanitizeData(data: any, context: string): any {
    if (data === null || data === undefined) {
      return data;
    }

    if (typeof data === 'string') {
      return this.sanitizeString(data, context);
    }

    if (Array.isArray(data)) {
      return data.map((item, index) =>
        this.sanitizeData(item, `${context}[${index}]`)
      );
    }

    if (typeof data === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(data)) {
        const sanitizedKey = this.sanitizeString(key, `${context}.key`);
        sanitized[sanitizedKey] = this.sanitizeData(value, `${context}.${key}`);
      }
      return sanitized;
    }

    return data;
  }

  /**
   * Sanitize individual string
   */
  private sanitizeString(input: string, context: string): string {
    if (typeof input !== 'string') {
      return input;
    }

    let sanitized = input;

    // Check for XSS patterns before sanitization
    const xssDetected = this.detectXSSPatterns(input);
    if (xssDetected.length > 0) {
      console.warn(`XSS patterns detected in ${context}:`, xssDetected);
    }

    // Apply XSS filtering
    sanitized = xss(sanitized, this.xssOptions);

    // Apply DOMPurify if enabled
    if (this.config.enableDOMPurify) {
      sanitized = DOMPurify.sanitize(sanitized, {
        ALLOWED_TAGS: Object.keys(this.xssOptions.whiteList || {}),
        ALLOWED_ATTR: this.getAllowedAttributes(),
        KEEP_CONTENT: true,
        ALLOW_DATA_ATTR: false,
        ALLOW_UNKNOWN_PROTOCOLS: false
      });
    }

    // Apply custom filters
    if (this.config.customFilters) {
      for (const [name, filter] of Object.entries(this.config.customFilters)) {
        try {
          sanitized = filter(sanitized);
        } catch (error) {
          console.error(`Error applying custom filter ${name}:`, error);
        }
      }
    }

    // Final security checks
    sanitized = this.performFinalSecurityChecks(sanitized);

    return sanitized;
  }

  /**
   * Detect XSS patterns in input
   */
  private detectXSSPatterns(input: string): string[] {
    const detectedPatterns: string[] = [];

    for (const pattern of this.suspiciousPatterns) {
      const matches = input.match(pattern);
      if (matches) {
        detectedPatterns.push(...matches);
      }
    }

    return detectedPatterns;
  }

  /**
   * Get all allowed attributes from whitelist
   */
  private getAllowedAttributes(): string[] {
    const attributes = new Set<string>();

    if (this.xssOptions.whiteList) {
      Object.values(this.xssOptions.whiteList).forEach(attrs => {
        attrs.forEach(attr => attributes.add(attr));
      });
    }

    return Array.from(attributes);
  }

  /**
   * Perform final security checks
   */
  private performFinalSecurityChecks(input: string): string {
    // Remove any remaining script tags
    input = input.replace(/<script[\s\S]*?<\/script>/gi, '');

    // Remove javascript: protocols
    input = input.replace(/javascript\s*:/gi, '');

    // Remove data: URLs that might contain scripts
    input = input.replace(/data\s*:\s*text\/html[^;]*;base64,/gi, '');

    // Remove event handlers
    input = input.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');

    // Remove expression() calls
    input = input.replace(/expression\s*\([^)]*\)/gi, '');

    return input;
  }

  /**
   * Handle XSS attempt
   */
  private handleXSSAttempt(req: Request, res: Response, type: string, patterns: string[]): void {
    const clientIP = req.ip;

    // Increment blocked attempts
    const currentCount = this.blockedAttempts.get(clientIP) || 0;
    this.blockedAttempts.set(clientIP, currentCount + 1);

    // Log the attack attempt
    console.error(`XSS attack attempt detected (${type}):`, {
      ip: clientIP,
      userAgent: req.get('User-Agent'),
      path: req.path,
      method: req.method,
      patterns: patterns,
      timestamp: new Date().toISOString(),
      attemptCount: currentCount + 1
    });

    // Report to configured endpoint if available
    if (this.config.reportUri) {
      this.reportXSSAttempt(req, type, patterns);
    }

    // Send security response
    res.status(400).json({
      error: 'Invalid request content',
      message: 'Request contains potentially malicious content',
      code: 'XSS_ATTEMPT_BLOCKED'
    });
  }

  /**
   * Report XSS attempt to monitoring endpoint
   */
  private async reportXSSAttempt(req: Request, type: string, patterns: string[]): Promise<void> {
    try {
      const report = {
        type: 'xss_attempt',
        subtype: type,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
        method: req.method,
        patterns: patterns,
        timestamp: new Date().toISOString()
      };

      // In a real implementation, you would send this to your monitoring service
      console.log('XSS attempt reported:', report);
    } catch (error) {
      console.error('Failed to report XSS attempt:', error);
    }
  }

  /**
   * Add XSS protection headers
   */
  private addXSSHeaders(res: Response): void {
    // X-XSS-Protection header
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // Additional XSS-related headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');

    // Report URI for XSS attempts
    if (this.config.reportUri) {
      res.setHeader('X-XSS-Report-URI', this.config.reportUri);
    }
  }

  /**
   * Override response render to sanitize template data
   */
  private overrideResponseRender(res: Response): void {
    const originalRender = res.render;

    res.render = function(view: string, locals?: any, callback?: (err: Error, html: string) => void) {
      if (locals && typeof locals === 'object') {
        locals = this.sanitizeData(locals, 'template');
      }

      return originalRender.call(this, view, locals, callback);
    }.bind(this);
  }

  /**
   * Custom tag handler for XSS filter
   */
  private onIgnoreTag(tag: string, html: string, options: any): string {
    // Log suspicious tags
    if (['script', 'object', 'embed', 'applet', 'form', 'iframe'].includes(tag.toLowerCase())) {
      console.warn('Suspicious tag blocked:', { tag, html: html.substring(0, 100) });
    }

    // Remove the tag completely
    return '';
  }

  /**
   * Custom attribute handler for XSS filter
   */
  private onIgnoreTagAttr(tag: string, name: string, value: string, isWhiteAttr: boolean): string {
    // Log suspicious attributes
    if (name.toLowerCase().startsWith('on') || name.toLowerCase() === 'style') {
      console.warn('Suspicious attribute blocked:', { tag, name, value: value.substring(0, 50) });
    }

    return '';
  }

  /**
   * Custom attribute value handler
   */
  private safeAttrValue(tag: string, name: string, value: string, cssFilter: any): string {
    // Additional validation for specific attributes
    if (name.toLowerCase() === 'href') {
      return this.validateHref(value);
    }

    if (name.toLowerCase() === 'src') {
      return this.validateSrc(value);
    }

    return value;
  }

  /**
   * Validate href attribute values
   */
  private validateHref(value: string): string {
    // Remove javascript: and data: protocols
    if (/^(javascript|data|vbscript):/i.test(value)) {
      return '#';
    }

    // Validate allowed domains if configured
    if (this.config.allowedDomains && this.config.allowedDomains.length > 0) {
      try {
        const url = new URL(value);
        if (!this.config.allowedDomains.includes(url.hostname)) {
          return '#';
        }
      } catch {
        // Invalid URL, but might be relative - allow it
      }
    }

    return value;
  }

  /**
   * Validate src attribute values
   */
  private validateSrc(value: string): string {
    // Block javascript: and data: protocols for scripts
    if (/^(javascript|data):/i.test(value)) {
      return '';
    }

    return value;
  }

  /**
   * Create CSP nonce for inline scripts/styles
   */
  public generateCSPNonce(): string {
    const crypto = require('crypto');
    return crypto.randomBytes(16).toString('base64');
  }

  /**
   * Content Security Policy generator for XSS protection
   */
  public generateXSSProtectionCSP(nonce?: string): string {
    const directives: string[] = [
      "default-src 'self'",
      "script-src 'self'" + (nonce ? ` 'nonce-${nonce}'` : ""),
      "style-src 'self'" + (nonce ? ` 'nonce-${nonce}'` : " 'unsafe-inline'"),
      "img-src 'self' data: https:",
      "connect-src 'self'",
      "font-src 'self'",
      "object-src 'none'",
      "media-src 'self'",
      "frame-src 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ];

    if (this.config.reportUri) {
      directives.push(`report-uri ${this.config.reportUri}`);
    }

    return directives.join('; ');
  }

  /**
   * Health check for XSS protection
   */
  public healthCheck(): 'healthy' | 'degraded' | 'critical' {
    try {
      // Test XSS filtering
      const testScript = '<script>alert("xss")</script>';
      const filtered = this.sanitizeString(testScript, 'test');

      if (filtered.includes('<script>')) {
        return 'critical';
      }

      // Check blocked attempts rate
      const totalAttempts = Array.from(this.blockedAttempts.values())
        .reduce((sum, count) => sum + count, 0);

      if (totalAttempts > 50) {
        return 'degraded';
      }

      return 'healthy';
    } catch (error) {
      return 'critical';
    }
  }

  /**
   * Get XSS protection statistics
   */
  public getStatistics(): {
    filterLevel: string;
    domPurifyEnabled: boolean;
    reflectedXSSProtectionEnabled: boolean;
    totalBlockedAttempts: number;
    uniqueAttackers: number;
    allowedTagsCount: number;
  } {
    const totalAttempts = Array.from(this.blockedAttempts.values())
      .reduce((sum, count) => sum + count, 0);

    return {
      filterLevel: this.config.filterLevel,
      domPurifyEnabled: !!this.config.enableDOMPurify,
      reflectedXSSProtectionEnabled: !!this.config.enableReflectedXSSProtection,
      totalBlockedAttempts: totalAttempts,
      uniqueAttackers: this.blockedAttempts.size,
      allowedTagsCount: Object.keys(this.xssOptions.whiteList || {}).length
    };
  }
}