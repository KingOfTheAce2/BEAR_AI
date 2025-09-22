/**
 * SQL Injection Prevention System
 * Advanced protection against SQL injection attacks
 */

import { Request, Response, NextFunction } from 'express';
import sqlstring from 'sqlstring';

export class SqlInjectionPrevention {
  private suspiciousPatterns: RegExp[];
  private criticalPatterns: RegExp[];
  private whitelistedPatterns: RegExp[];
  private detectionCount: Map<string, number> = new Map();

  constructor() {
    this.initializePatterns();
  }

  /**
   * Initialize SQL injection detection patterns
   */
  private initializePatterns(): void {
    // Suspicious patterns that might indicate SQL injection attempts
    this.suspiciousPatterns = [
      // Basic SQL keywords
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|DECLARE)\b)/i,

      // SQL operators and symbols
      /(;|--|\/\*|\*\/)/,

      // Union-based injection
      /(\bUNION\b.*\bSELECT\b)/i,

      // Boolean-based injection
      /(\b(OR|AND)\s+[\w\s]*\s*=\s*[\w\s]*)/i,

      // Time-based injection
      /(\b(SLEEP|WAITFOR|DELAY)\s*\()/i,

      // Error-based injection
      /(\b(CONVERT|CAST|CHAR|ASCII|SUBSTRING)\s*\()/i,

      // Database-specific functions
      /(@@VERSION|@@SERVERNAME|USER\(\)|DATABASE\(\)|VERSION\(\))/i,

      // Hex encoding attempts
      /(0x[0-9a-fA-F]+)/,

      // SQL comments
      /(-{2,}|\/\*[\s\S]*?\*\/)/,

      // Quoted strings with SQL keywords
      /('.*\b(SELECT|INSERT|UPDATE|DELETE)\b.*')/i
    ];

    // Critical patterns that definitely indicate attacks
    this.criticalPatterns = [
      // Administrative procedures
      /(\bxp_|sp_)/i,

      // Multiple statement execution
      /(;\s*(SELECT|INSERT|UPDATE|DELETE|DROP))/i,

      // Information schema queries
      /(\bINFORMATION_SCHEMA\b)/i,

      // System table access
      /(\bsys\.|sysobjects|syscolumns)/i,

      // Blind injection attempts
      /(\b(AND|OR)\s+\d+\s*=\s*\d+)/i,

      // Stack-based overflow attempts
      /(%00|%27|%3B|%2527)/i,

      // LDAP injection
      /(\)\(\||\)\(&|\*\)\()/
    ];

    // Whitelisted patterns that are safe
    this.whitelistedPatterns = [
      // Common English words that contain SQL keywords
      /\b(selection|insertion|update|creation|description)\b/i,

      // Date and time formatting
      /\b(insert|select)\s+(into|from)\s+(date|time)\b/i,

      // Common application terms
      /\b(user|order|group|limit|count|sum|avg|max|min)\b/i
    ];
  }

  /**
   * SQL injection prevention middleware
   */
  public preventionMiddleware(req: Request, res: Response, next: NextFunction): void {
    try {
      const detectionResult = this.detectSQLInjection(req);

      if (detectionResult.isMalicious) {
        this.handleSQLInjectionAttempt(req, res, detectionResult);
        return;
      }

      if (detectionResult.isSuspicious) {
        this.logSuspiciousActivity(req, detectionResult);
      }

      next();
    } catch (error) {
      console.error('SQL injection prevention error:', error);
      next();
    }
  }

  /**
   * Detect SQL injection attempts in request
   */
  public detectSQLInjection(req: Request): SQLInjectionDetectionResult {
    const result: SQLInjectionDetectionResult = {
      isMalicious: false,
      isSuspicious: false,
      detectedPatterns: [],
      confidence: 0,
      locations: []
    };

    // Check all request data
    const dataToCheck = [
      { data: req.body, location: 'body' },
      { data: req.query, location: 'query' },
      { data: req.params, location: 'params' },
      { data: req.headers, location: 'headers' }
    ];

    for (const { data, location } of dataToCheck) {
      if (data) {
        const locationResult = this.checkDataForSQLInjection(data, location);
        this.mergeDetectionResults(result, locationResult);
      }
    }

    // Calculate overall confidence
    result.confidence = this.calculateConfidence(result);

    // Determine if malicious or suspicious
    if (result.confidence > 0.8) {
      result.isMalicious = true;
    } else if (result.confidence > 0.3) {
      result.isSuspicious = true;
    }

    return result;
  }

  /**
   * Check specific data object for SQL injection
   */
  private checkDataForSQLInjection(data: any, location: string): SQLInjectionDetectionResult {
    const result: SQLInjectionDetectionResult = {
      isMalicious: false,
      isSuspicious: false,
      detectedPatterns: [],
      confidence: 0,
      locations: []
    };

    this.recursivelyCheckData(data, location, result);
    return result;
  }

  /**
   * Recursively check data for SQL injection patterns
   */
  private recursivelyCheckData(data: any, path: string, result: SQLInjectionDetectionResult): void {
    if (typeof data === 'string') {
      this.checkStringForSQLInjection(data, path, result);
    } else if (Array.isArray(data)) {
      data.forEach((item, index) => {
        this.recursivelyCheckData(item, `${path}[${index}]`, result);
      });
    } else if (typeof data === 'object' && data !== null) {
      Object.entries(data).forEach(([key, value]) => {
        this.recursivelyCheckData(value, `${path}.${key}`, result);
      });
    }
  }

  /**
   * Check individual string for SQL injection patterns
   */
  private checkStringForSQLInjection(input: string, location: string, result: SQLInjectionDetectionResult): void {
    // Skip if whitelisted
    if (this.isWhitelisted(input)) {
      return;
    }

    // Check critical patterns first
    for (const pattern of this.criticalPatterns) {
      if (pattern.test(input)) {
        result.detectedPatterns.push({
          pattern: pattern.source,
          type: 'critical',
          match: input.match(pattern)?.[0] || '',
          location
        });
      }
    }

    // Check suspicious patterns
    for (const pattern of this.suspiciousPatterns) {
      if (pattern.test(input)) {
        result.detectedPatterns.push({
          pattern: pattern.source,
          type: 'suspicious',
          match: input.match(pattern)?.[0] || '',
          location
        });
      }
    }

    // Additional heuristic checks
    this.performHeuristicChecks(input, location, result);
  }

  /**
   * Perform additional heuristic checks
   */
  private performHeuristicChecks(input: string, location: string, result: SQLInjectionDetectionResult): void {
    // Check for excessive SQL keywords
    const sqlKeywords = ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'FROM', 'WHERE', 'AND', 'OR'];
    const keywordCount = sqlKeywords.filter(keyword =>
      new RegExp(`\\b${keyword}\\b`, 'i').test(input)
    ).length;

    if (keywordCount >= 3) {
      result.detectedPatterns.push({
        pattern: 'multiple_sql_keywords',
        type: 'suspicious',
        match: `${keywordCount} SQL keywords found`,
        location
      });
    }

    // Check for quote manipulation
    const singleQuotes = (input.match(/'/g) || []).length;
    const doubleQuotes = (input.match(/"/g) || []).length;

    if (singleQuotes > 2 || doubleQuotes > 2) {
      result.detectedPatterns.push({
        pattern: 'quote_manipulation',
        type: 'suspicious',
        match: `${singleQuotes} single quotes, ${doubleQuotes} double quotes`,
        location
      });
    }

    // Check for encoded characters
    const encodedChars = input.match(/%[0-9a-fA-F]{2}/g) || [];
    if (encodedChars.length > 3) {
      result.detectedPatterns.push({
        pattern: 'excessive_encoding',
        type: 'suspicious',
        match: `${encodedChars.length} encoded characters`,
        location
      });
    }

    // Check string length (very long strings might be injection attempts)
    if (input.length > 1000) {
      result.detectedPatterns.push({
        pattern: 'excessive_length',
        type: 'suspicious',
        match: `String length: ${input.length}`,
        location
      });
    }
  }

  /**
   * Check if input matches whitelisted patterns
   */
  private isWhitelisted(input: string): boolean {
    return this.whitelistedPatterns.some(pattern => pattern.test(input));
  }

  /**
   * Merge detection results
   */
  private mergeDetectionResults(target: SQLInjectionDetectionResult, source: SQLInjectionDetectionResult): void {
    target.detectedPatterns.push(...source.detectedPatterns);
    target.locations.push(...source.locations);
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(result: SQLInjectionDetectionResult): number {
    let confidence = 0;

    for (const pattern of result.detectedPatterns) {
      if (pattern.type === 'critical') {
        confidence += 0.4;
      } else if (pattern.type === 'suspicious') {
        confidence += 0.1;
      }
    }

    // Cap at 1.0
    return Math.min(confidence, 1.0);
  }

  /**
   * Handle detected SQL injection attempt
   */
  private handleSQLInjectionAttempt(req: Request, res: Response, detection: SQLInjectionDetectionResult): void {
    const clientIP = req.ip;

    // Increment detection count
    const currentCount = this.detectionCount.get(clientIP) || 0;
    this.detectionCount.set(clientIP, currentCount + 1);

    // Log the attack attempt
    console.error('SQL Injection attempt detected:', {
      ip: clientIP,
      userAgent: req.get('User-Agent'),
      path: req.path,
      method: req.method,
      confidence: detection.confidence,
      patterns: detection.detectedPatterns,
      timestamp: new Date().toISOString(),
      attemptCount: currentCount + 1
    });

    // Send security response
    res.status(400).json({
      error: 'Invalid request parameters',
      message: 'Request contains potentially malicious content',
      code: 'SECURITY_VIOLATION'
    });
  }

  /**
   * Log suspicious activity
   */
  private logSuspiciousActivity(req: Request, detection: SQLInjectionDetectionResult): void {
    console.warn('Suspicious SQL patterns detected:', {
      ip: req.ip,
      path: req.path,
      confidence: detection.confidence,
      patterns: detection.detectedPatterns.map(p => p.pattern),
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Parameterized query helper
   */
  public createParameterizedQuery(query: string, params: any[]): string {
    try {
      return sqlstring.format(query, params);
    } catch (error) {
      console.error('Error creating parameterized query:', error);
      throw new Error('Invalid query parameters');
    }
  }

  /**
   * Escape SQL string
   */
  public escapeSQLString(input: string): string {
    return sqlstring.escape(input);
  }

  /**
   * Validate SQL identifier (table names, column names)
   */
  public validateSQLIdentifier(identifier: string): boolean {
    // SQL identifiers should only contain alphanumeric characters and underscores
    const identifierPattern = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
    return identifierPattern.test(identifier) && identifier.length <= 64;
  }

  /**
   * Create safe SQL LIKE pattern
   */
  public createSafeLikePattern(input: string): string {
    // Escape special LIKE characters
    return input
      .replace(/\\/g, '\\\\')
      .replace(/%/g, '\\%')
      .replace(/_/g, '\\_')
      .replace(/'/g, "''");
  }

  /**
   * Database-specific query builder helpers
   */
  public createQueryBuilder(databaseType: 'mysql' | 'postgresql' | 'sqlite' | 'mssql') {
    return {
      select: (table: string, columns: string[], conditions?: any) => {
        if (!this.validateSQLIdentifier(table)) {
          throw new Error('Invalid table name');
        }

        const validColumns = columns.filter(col => this.validateSQLIdentifier(col));
        if (validColumns.length !== columns.length) {
          throw new Error('Invalid column names');
        }

        let query = `SELECT ${validColumns.join(', ')} FROM ${table}`;

        if (conditions) {
          const whereClause = this.buildWhereClause(conditions, databaseType);
          if (whereClause) {
            query += ` WHERE ${whereClause}`;
          }
        }

        return query;
      },

      insert: (table: string, data: { [key: string]: any }) => {
        if (!this.validateSQLIdentifier(table)) {
          throw new Error('Invalid table name');
        }

        const columns = Object.keys(data).filter(col => this.validateSQLIdentifier(col));
        const values = columns.map(col => sqlstring.escape(data[col]));

        return `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${values.join(', ')})`;
      },

      update: (table: string, data: { [key: string]: any }, conditions: any) => {
        if (!this.validateSQLIdentifier(table)) {
          throw new Error('Invalid table name');
        }

        const validColumns = Object.keys(data).filter(col => this.validateSQLIdentifier(col));
        const setClauses = validColumns.map(col =>
          `${col} = ${sqlstring.escape(data[col])}`
        );

        let query = `UPDATE ${table} SET ${setClauses.join(', ')}`;

        const whereClause = this.buildWhereClause(conditions, databaseType);
        if (whereClause) {
          query += ` WHERE ${whereClause}`;
        }

        return query;
      }
    };
  }

  /**
   * Build WHERE clause safely
   */
  private buildWhereClause(conditions: any, databaseType: string): string {
    if (!conditions || typeof conditions !== 'object') {
      return '';
    }

    const clauses: string[] = [];

    for (const [column, value] of Object.entries(conditions)) {
      if (!this.validateSQLIdentifier(column)) {
        continue;
      }

      clauses.push(`${column} = ${sqlstring.escape(value)}`);
    }

    return clauses.join(' AND ');
  }

  /**
   * Health check for SQL injection prevention
   */
  public healthCheck(): 'healthy' | 'degraded' | 'critical' {
    try {
      // Test pattern detection
      const testMalicious = "'; DROP TABLE users; --";
      const detection = this.detectSQLInjection({ body: { test: testMalicious } } as Request);

      if (!detection.isMalicious) {
        return 'critical';
      }

      // Check if too many detections recently
      const totalDetections = Array.from(this.detectionCount.values())
        .reduce((sum, count) => sum + count, 0);

      if (totalDetections > 100) {
        return 'degraded';
      }

      return 'healthy';
    } catch (error) {
      return 'critical';
    }
  }

  /**
   * Get SQL injection prevention statistics
   */
  public getStatistics(): {
    totalDetections: number;
    uniqueIPs: number;
    criticalPatternsCount: number;
    suspiciousPatternsCount: number;
    recentDetections: number;
  } {
    const totalDetections = Array.from(this.detectionCount.values())
      .reduce((sum, count) => sum + count, 0);

    // Recent detections (in last hour)
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    const recentDetections = 0; // Would need timestamp tracking for accurate implementation

    return {
      totalDetections,
      uniqueIPs: this.detectionCount.size,
      criticalPatternsCount: this.criticalPatterns.length,
      suspiciousPatternsCount: this.suspiciousPatterns.length,
      recentDetections
    };
  }
}

/**
 * SQL Injection Detection Result Interface
 */
export interface SQLInjectionDetectionResult {
  isMalicious: boolean;
  isSuspicious: boolean;
  detectedPatterns: Array<{
    pattern: string;
    type: 'critical' | 'suspicious';
    match: string;
    location: string;
  }>;
  confidence: number;
  locations: string[];
}