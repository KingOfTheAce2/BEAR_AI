/**
 * File Security Service
 * Handles security, permissions, and access control for local files
 */

export interface SecurityPolicy {
  id: string;
  name: string;
  description: string;
  rules: SecurityRule[];
  enabled: boolean;
  priority: number;
}

export interface SecurityRule {
  id: string;
  type: 'file_type' | 'file_size' | 'content_scan' | 'path_restriction' | 'custom';
  condition: string;
  action: 'allow' | 'deny' | 'warn' | 'quarantine';
  message?: string;
  enabled: boolean;
}

export interface ScanResult {
  fileId: string;
  safe: boolean;
  threats: SecurityThreat[];
  warnings: SecurityWarning[];
  score: number; // 0-100, higher is safer
  scanTime: Date;
}

export interface SecurityThreat {
  type: 'malicious_content' | 'suspicious_extension' | 'oversized_file' | 'forbidden_path';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  recommendation: string;
}

export interface SecurityWarning {
  type: 'large_file' | 'unknown_type' | 'external_link' | 'embedded_script';
  description: string;
  suggestion: string;
}

export interface AccessLog {
  id: string;
  fileId: string;
  userId?: string;
  action: 'read' | 'write' | 'delete' | 'move' | 'copy' | 'scan';
  timestamp: Date;
  success: boolean;
  ipAddress?: string;
  userAgent?: string;
  error?: string;
}

export class FileSecurityService {
  private policies: SecurityPolicy[] = [];
  private accessLogs: AccessLog[] = [];
  private quarantinedFiles: Set<string> = new Set();

  constructor() {
    this.initializeDefaultPolicies();
    this.loadStoredData();
  }

  /**
   * Initialize default security policies
   */
  private initializeDefaultPolicies(): void {
    this.policies = [
      {
        id: 'default-file-types',
        name: 'Safe File Types',
        description: 'Only allow safe file types',
        enabled: true,
        priority: 1,
        rules: [
          {
            id: 'safe-extensions',
            type: 'file_type',
            condition: '\\.(txt|md|pdf|docx|json|html|css|js|ts|tsx|jsx)$',
            action: 'allow',
            enabled: true
          },
          {
            id: 'executable-files',
            type: 'file_type',
            condition: '\\.(exe|bat|cmd|sh|scr|com|pif|vbs|js|jar)$',
            action: 'deny',
            message: 'Executable files are not allowed for security reasons',
            enabled: true
          }
        ]
      },
      {
        id: 'file-size-limits',
        name: 'File Size Limits',
        description: 'Prevent overly large files',
        enabled: true,
        priority: 2,
        rules: [
          {
            id: 'max-file-size',
            type: 'file_size',
            condition: '104857600', // 100MB in bytes
            action: 'warn',
            message: 'File is larger than 100MB. Consider if this is necessary.',
            enabled: true
          },
          {
            id: 'huge-file-size',
            type: 'file_size',
            condition: '524288000', // 500MB in bytes
            action: 'deny',
            message: 'Files larger than 500MB are not allowed',
            enabled: true
          }
        ]
      },
      {
        id: 'content-scanning',
        name: 'Content Security Scanning',
        description: 'Scan file content for security issues',
        enabled: true,
        priority: 3,
        rules: [
          {
            id: 'script-detection',
            type: 'content_scan',
            condition: '<script[^>]*>|javascript:|vbscript:|on\\w+\\s*=',
            action: 'warn',
            message: 'File contains potentially unsafe script content',
            enabled: true
          },
          {
            id: 'external-links',
            type: 'content_scan',
            condition: 'https?://(?!localhost|127\\.0\\.0\\.1)',
            action: 'warn',
            message: 'File contains external links',
            enabled: true
          }
        ]
      }
    ];
  }

  /**
   * Scan a file for security threats
   */
  async scanFile(fileId: string, fileName: string, content: string | ArrayBuffer, size: number): Promise<ScanResult> {
    const threats: SecurityThreat[] = [];
    const warnings: SecurityWarning[] = [];
    let score = 100;

    // Apply all enabled policies
    for (const policy of this.policies.filter(p => p.enabled)) {
      for (const rule of policy.rules.filter(r => r.enabled)) {
        const result = await this.applyRule(rule, fileName, content, size);
        
        if (result) {
          if (result.action === 'deny') {
            threats.push({
              type: this.mapRuleTypeToThreatType(rule.type),
              severity: 'high',
              description: result.message || `Violated rule: ${rule.id}`,
              recommendation: 'Remove or modify the file to comply with security policies'
            });
            score -= 30;
          } else if (result.action === 'warn') {
            warnings.push({
              type: this.mapRuleTypeToWarningType(rule.type),
              description: result.message || `Warning from rule: ${rule.id}`,
              suggestion: 'Review the file content and ensure it is safe'
            });
            score -= 10;
          }
        }
      }
    }

    // Additional heuristic checks
    await this.performHeuristicScan(fileName, content, size, threats, warnings);

    const scanResult: ScanResult = {
      fileId,
      safe: threats.length === 0,
      threats,
      warnings,
      score: Math.max(0, score),
      scanTime: new Date()
    };

    // Log the scan
    await this.logAccess({
      fileId,
      action: 'scan',
      timestamp: new Date(),
      success: true
    });

    // Quarantine if necessary
    if (threats.some(t => t.severity === 'critical' || t.severity === 'high')) {
      this.quarantinedFiles.add(fileId);
    }

    return scanResult;
  }

  /**
   * Apply a security rule to file data
   */
  private async applyRule(
    rule: SecurityRule,
    fileName: string,
    content: string | ArrayBuffer,
    size: number
  ): Promise<{ action: string; message?: string } | null> {
    switch (rule.type) {
      case 'file_type':
        return this.checkFileType(rule, fileName);
      case 'file_size':
        return this.checkFileSize(rule, size);
      case 'content_scan':
        return this.scanContent(rule, content);
      case 'path_restriction':
        return this.checkPathRestriction(rule, fileName);
      default:
        return null;
    }
  }

  /**
   * Check file type against rule
   */
  private checkFileType(rule: SecurityRule, fileName: string): { action: string; message?: string } | null {
    const regex = new RegExp(rule.condition, 'i');
    const matches = regex.test(fileName);

    if ((rule.action === 'allow' && !matches) || (rule.action === 'deny' && matches)) {
      return { action: rule.action, message: rule.message };
    }

    return null;
  }

  /**
   * Check file size against rule
   */
  private checkFileSize(rule: SecurityRule, size: number): { action: string; message?: string } | null {
    const limit = parseInt(rule.condition, 10);
    
    if (size > limit) {
      return { action: rule.action, message: rule.message };
    }

    return null;
  }

  /**
   * Scan content against rule
   */
  private scanContent(rule: SecurityRule, content: string | ArrayBuffer): { action: string; message?: string } | null {
    if (typeof content !== 'string') {
      // Can't scan binary content with regex
      return null;
    }

    const regex = new RegExp(rule.condition, 'gi');
    
    if (regex.test(content)) {
      return { action: rule.action, message: rule.message };
    }

    return null;
  }

  /**
   * Check path restrictions
   */
  private checkPathRestriction(rule: SecurityRule, fileName: string): { action: string; message?: string } | null {
    // Check for potentially dangerous path patterns
    const dangerousPatterns = [
      '\\.\\.',  // Directory traversal
      '\\\\',    // Windows path separators in unexpected places
      '///',     // Triple slashes
      '%',       // URL encoding
    ];

    for (const pattern of dangerousPatterns) {
      if (new RegExp(pattern).test(fileName)) {
        return { action: 'deny', message: 'Potentially dangerous file path detected' };
      }
    }

    return null;
  }

  /**
   * Perform additional heuristic security scanning
   */
  private async performHeuristicScan(
    fileName: string,
    content: string | ArrayBuffer,
    size: number,
    threats: SecurityThreat[],
    warnings: SecurityWarning[]
  ): Promise<void> {
    // Check for suspicious file names
    const suspiciousNames = ['config', 'password', 'secret', 'key', 'token', 'private'];
    if (suspiciousNames.some(name => fileName.toLowerCase().includes(name))) {
      warnings.push({
        type: 'unknown_type',
        description: 'File name suggests it might contain sensitive information',
        suggestion: 'Ensure the file does not contain passwords or API keys'
      });
    }

    // Check for very large files
    if (size > 50 * 1024 * 1024) { // 50MB
      warnings.push({
        type: 'large_file',
        description: 'File is very large and may impact performance',
        suggestion: 'Consider compressing or splitting the file'
      });
    }

    // Content-based checks for text files
    if (typeof content === 'string') {
      // Check for embedded scripts in non-JS files
      if (!fileName.endsWith('.js') && !fileName.endsWith('.ts')) {
        const scriptPatterns = [
          /<script[^>]*>/i,
          /javascript:/i,
          /vbscript:/i,
          /on\w+\s*=/i
        ];

        if (scriptPatterns.some(pattern => pattern.test(content))) {
          warnings.push({
            type: 'embedded_script',
            description: 'Non-script file contains script-like content',
            suggestion: 'Review the content to ensure it is safe'
          });
        }
      }

      // Check for potential data exfiltration
      const exfilPatterns = [
        /fetch\s*\(/i,
        /XMLHttpRequest/i,
        /\.send\s*\(/i,
        /websocket/i
      ];

      if (exfilPatterns.some(pattern => pattern.test(content))) {
        threats.push({
          type: 'malicious_content',
          severity: 'medium',
          description: 'File contains code that could send data to external servers',
          recommendation: 'Review the file carefully before processing'
        });
      }
    }
  }

  /**
   * Check if a file is quarantined
   */
  isQuarantined(fileId: string): boolean {
    return this.quarantinedFiles.has(fileId);
  }

  /**
   * Quarantine a file
   */
  quarantineFile(fileId: string, reason: string): void {
    this.quarantinedFiles.add(fileId);
    this.logAccess({
      fileId,
      action: 'quarantine' as any,
      timestamp: new Date(),
      success: true,
      error: reason
    });
  }

  /**
   * Remove file from quarantine
   */
  unquarantineFile(fileId: string): void {
    this.quarantinedFiles.delete(fileId);
    this.logAccess({
      fileId,
      action: 'unquarantine' as any,
      timestamp: new Date(),
      success: true
    });
  }

  /**
   * Log file access
   */
  async logAccess(log: Omit<AccessLog, 'id'>): Promise<void> {
    const accessLog: AccessLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...log
    };

    this.accessLogs.push(accessLog);

    // Keep only recent logs (last 1000)
    if (this.accessLogs.length > 1000) {
      this.accessLogs = this.accessLogs.slice(-1000);
    }

    this.saveStoredData();
  }

  /**
   * Get access logs for a file
   */
  getAccessLogs(fileId?: string): AccessLog[] {
    if (fileId) {
      return this.accessLogs.filter(log => log.fileId === fileId);
    }
    return [...this.accessLogs];
  }

  /**
   * Add a custom security policy
   */
  addPolicy(policy: Omit<SecurityPolicy, 'id'>): string {
    const newPolicy: SecurityPolicy = {
      ...policy,
      id: `policy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };

    this.policies.push(newPolicy);
    this.saveStoredData();
    return newPolicy.id;
  }

  /**
   * Update a security policy
   */
  updatePolicy(policyId: string, updates: Partial<SecurityPolicy>): boolean {
    const index = this.policies.findIndex(p => p.id === policyId);
    if (index === -1) return false;

    this.policies[index] = { ...this.policies[index], ...updates };
    this.saveStoredData();
    return true;
  }

  /**
   * Remove a security policy
   */
  removePolicy(policyId: string): boolean {
    const index = this.policies.findIndex(p => p.id === policyId);
    if (index === -1) return false;

    this.policies.splice(index, 1);
    this.saveStoredData();
    return true;
  }

  /**
   * Get all security policies
   */
  getPolicies(): SecurityPolicy[] {
    return [...this.policies];
  }

  /**
   * Get security statistics
   */
  getSecurityStats(): {
    totalScans: number;
    threatsDetected: number;
    quarantinedFiles: number;
    recentLogs: AccessLog[];
    policyViolations: { policyId: string; count: number }[];
  } {
    const scanLogs = this.accessLogs.filter(log => log.action === 'scan');
    const recentLogs = this.accessLogs.slice(-10);

    return {
      totalScans: scanLogs.length,
      threatsDetected: scanLogs.filter(log => log.error).length,
      quarantinedFiles: this.quarantinedFiles.size,
      recentLogs,
      policyViolations: [] // Would need to track violations by policy
    };
  }

  // Private helper methods

  private mapRuleTypeToThreatType(ruleType: string): SecurityThreat['type'] {
    switch (ruleType) {
      case 'file_type': return 'suspicious_extension';
      case 'file_size': return 'oversized_file';
      case 'content_scan': return 'malicious_content';
      case 'path_restriction': return 'forbidden_path';
      default: return 'malicious_content';
    }
  }

  private mapRuleTypeToWarningType(ruleType: string): SecurityWarning['type'] {
    switch (ruleType) {
      case 'file_type': return 'unknown_type';
      case 'file_size': return 'large_file';
      case 'content_scan': return 'embedded_script';
      default: return 'unknown_type';
    }
  }

  private saveStoredData(): void {
    try {
      const data = {
        policies: this.policies,
        accessLogs: this.accessLogs.slice(-100), // Store only recent logs
        quarantinedFiles: Array.from(this.quarantinedFiles)
      };
      localStorage.setItem('bearai_security_data', JSON.stringify(data));
    } catch (error) {
      // Error logging disabled for production
    }
  }

  private loadStoredData(): void {
    try {
      const stored = localStorage.getItem('bearai_security_data');
      if (stored) {
        const data = JSON.parse(stored);
        if (data.policies) {
          this.policies = [...this.policies, ...data.policies.filter((p: SecurityPolicy) => 
            !this.policies.some(existing => existing.id === p.id)
          )];
        }
        if (data.accessLogs) {
          this.accessLogs = data.accessLogs.map((log: any) => ({
            ...log,
            timestamp: new Date(log.timestamp)
          }));
        }
        if (data.quarantinedFiles) {
          this.quarantinedFiles = new Set(data.quarantinedFiles);
        }
      }
    } catch (error) {
      // Error logging disabled for production
    }
  }
}

export const fileSecurityService = new FileSecurityService();