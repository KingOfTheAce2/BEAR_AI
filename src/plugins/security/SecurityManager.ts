/**
 * BEAR AI Plugin Security Manager
 * Handles plugin validation, permission enforcement, and security monitoring
 */

import { EventEmitter } from 'events';
import {
  PluginPackage,
  PluginInstance,
  PluginPermission,
  SecurityViolation,
  PluginManifest
} from '../core/types';

export class PluginSecurityManager extends EventEmitter {
  private violations: SecurityViolation[] = [];
  private trustedDevelopers: Set<string> = new Set();
  private blockedPlugins: Set<string> = new Set();
  private permissionPolicies: Map<string, PermissionPolicy> = new Map();
  private initialized: boolean = false;

  constructor() {
    super();
    this.initializeSecurityPolicies();
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Load trusted developers list
      await this.loadTrustedDevelopers();
      
      // Load blocked plugins list
      await this.loadBlockedPlugins();
      
      // Initialize permission monitoring
      this.initializePermissionMonitoring();
      
      this.initialized = true;
      this.emit('initialized');
    } catch (error) {
      this.emit('error', { type: 'initialization', error });
      throw error;
    }
  }

  /**
   * Validate a plugin package before installation
   */
  async validatePlugin(pluginPackage: PluginPackage): Promise<ValidationReport> {
    const { manifest } = pluginPackage;
    const report: ValidationReport = {
      valid: true,
      score: 100,
      issues: [],
      warnings: [],
      recommendations: []
    };

    try {
      // Check if plugin is blocked
      if (this.isPluginBlocked(manifest.id)) {
        report.valid = false;
        report.score = 0;
        report.issues.push({
          type: 'blocked',
          severity: 'critical',
          message: 'Plugin is on the blocked list'
        });
        return report;
      }

      // Validate manifest structure
      this.validateManifest(manifest, report);
      
      // Check permissions
      this.validatePermissions(manifest.permissions, report);
      
      // Validate plugin code
      await this.validatePluginCode(pluginPackage, report);
      
      // Check dependencies
      this.validateDependencies(manifest.dependencies || [], report);
      
      // Reputation check
      this.checkDeveloperReputation(manifest.author, report);
      
      // Content Security Analysis
      await this.performContentSecurityAnalysis(pluginPackage, report);
      
      // Calculate final security score
      this.calculateSecurityScore(report);

      return report;
    } catch (error) {
      report.valid = false;
      report.score = 0;
      report.issues.push({
        type: 'validation_error',
        severity: 'critical',
        message: `Validation failed: ${error.message}`
      });
      return report;
    }
  }

  /**
   * Check if a plugin has required permissions
   */
  async checkPermissions(plugin: PluginInstance): Promise<void> {
    const { permissions } = plugin.sandbox;
    
    for (const permission of permissions) {
      if (!this.isPermissionAllowed(permission, plugin)) {
        const violation: SecurityViolation = {
          pluginId: plugin.id,
          type: 'permission',
          severity: 'high',
          description: `Unauthorized permission access: ${permission.type}`,
          timestamp: new Date(),
          blocked: true
        };
        
        this.recordViolation(violation);
        throw new Error(`Permission denied: ${permission.type}`);
      }
    }
  }

  /**
   * Monitor plugin behavior for security violations
   */
  monitorPlugin(plugin: PluginInstance): void {
    // Monitor API calls
    this.monitorAPIUsage(plugin);
    
    // Monitor resource usage
    this.monitorResourceUsage(plugin);
    
    // Monitor network activity
    this.monitorNetworkActivity(plugin);
    
    // Monitor storage access
    this.monitorStorageAccess(plugin);
  }

  /**
   * Record a security violation
   */
  recordViolation(violation: SecurityViolation): void {
    this.violations.push(violation);
    
    // Limit violation history
    if (this.violations.length > 1000) {
      this.violations = this.violations.slice(-500);
    }
    
    this.emit('violation', violation);
    
    // Auto-block plugin for critical violations
    if (violation.severity === 'critical') {
      this.blockPlugin(violation.pluginId, `Critical security violation: ${violation.description}`);
    }
  }

  /**
   * Get security violations for a plugin
   */
  getViolations(pluginId?: string): SecurityViolation[] {
    if (pluginId) {
      return this.violations.filter(v => v.pluginId === pluginId);
    }
    return [...this.violations];
  }

  /**
   * Block a plugin
   */
  blockPlugin(pluginId: string, reason: string): void {
    this.blockedPlugins.add(pluginId);
    this.saveBlockedPlugins();
    
    this.emit('plugin:blocked', { pluginId, reason });
  }

  /**
   * Unblock a plugin
   */
  unblockPlugin(pluginId: string): void {
    this.blockedPlugins.delete(pluginId);
    this.saveBlockedPlugins();
    
    this.emit('plugin:unblocked', { pluginId });
  }

  /**
   * Add trusted developer
   */
  addTrustedDeveloper(developer: string): void {
    this.trustedDevelopers.add(developer);
    this.saveTrustedDevelopers();
    
    this.emit('developer:trusted', { developer });
  }

  /**
   * Remove trusted developer
   */
  removeTrustedDeveloper(developer: string): void {
    this.trustedDevelopers.delete(developer);
    this.saveTrustedDevelopers();
    
    this.emit('developer:untrusted', { developer });
  }

  /**
   * Get security report for plugin
   */
  getSecurityReport(pluginId: string): SecurityReport {
    const violations = this.getViolations(pluginId);
    const criticalCount = violations.filter(v => v.severity === 'critical').length;
    const highCount = violations.filter(v => v.severity === 'high').length;
    const mediumCount = violations.filter(v => v.severity === 'medium').length;
    const lowCount = violations.filter(v => v.severity === 'low').length;
    
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (criticalCount > 0) riskLevel = 'critical';
    else if (highCount > 0) riskLevel = 'high';
    else if (mediumCount > 2) riskLevel = 'medium';

    return {
      pluginId,
      riskLevel,
      totalViolations: violations.length,
      violationBreakdown: {
        critical: criticalCount,
        high: highCount,
        medium: mediumCount,
        low: lowCount
      },
      recommendations: this.generateSecurityRecommendations(pluginId, violations),
      lastAssessment: new Date()
    };
  }

  /**
   * Shutdown security manager
   */
  async shutdown(): Promise<void> {
    // Save violation log
    await this.saveViolationLog();
    
    this.initialized = false;
    this.emit('shutdown');
  }

  private initializeSecurityPolicies(): void {
    // Default permission policies
    this.permissionPolicies.set('storage', {
      maxSize: 10 * 1024 * 1024, // 10MB
      allowedOperations: ['get', 'set', 'remove', 'clear', 'keys'],
      requiresApproval: false
    });

    this.permissionPolicies.set('network', {
      allowedProtocols: ['https:', 'http:'],
      blockedHosts: ['localhost', '127.0.0.1', '0.0.0.0'],
      maxRequests: 100,
      requiresApproval: true
    });

    this.permissionPolicies.set('ui', {
      allowedElements: ['div', 'span', 'p', 'button', 'input', 'textarea'],
      blockedAttributes: ['onload', 'onerror', 'onclick'],
      requiresApproval: false
    });

    this.permissionPolicies.set('filesystem', {
      allowedPaths: [],
      readOnly: true,
      requiresApproval: true
    });

    this.permissionPolicies.set('system', {
      allowedAPIs: [],
      requiresApproval: true
    });
  }

  private validateManifest(manifest: PluginManifest, report: ValidationReport): void {
    // Required fields
    const requiredFields = ['id', 'name', 'version', 'author', 'description', 'entry'];
    for (const field of requiredFields) {
      if (!manifest[field as keyof PluginManifest]) {
        report.issues.push({
          type: 'missing_field',
          severity: 'high',
          message: `Missing required field: ${field}`
        });
        report.score -= 10;
      }
    }

    // Version format
    if (manifest.version && !/^\d+\.\d+\.\d+/.test(manifest.version)) {
      report.warnings.push({
        type: 'invalid_version',
        severity: 'medium',
        message: 'Version should follow semantic versioning (x.y.z)'
      });
      report.score -= 5;
    }

    // Plugin ID format
    if (manifest.id && !/^[a-z0-9-_.]+$/.test(manifest.id)) {
      report.issues.push({
        type: 'invalid_id',
        severity: 'medium',
        message: 'Plugin ID should only contain lowercase letters, numbers, hyphens, dots, and underscores'
      });
      report.score -= 5;
    }

    // Description length
    if (manifest.description && manifest.description.length < 20) {
      report.warnings.push({
        type: 'short_description',
        severity: 'low',
        message: 'Description should be more descriptive (at least 20 characters)'
      });
      report.score -= 2;
    }
  }

  private validatePermissions(permissions: PluginPermission[], report: ValidationReport): void {
    const dangerousPermissions = ['system', 'filesystem'];
    const networkPermissions = permissions.filter(p => p.type === 'network');
    const systemPermissions = permissions.filter(p => p.type === 'system');

    // Check for dangerous permissions
    for (const permission of permissions) {
      if (dangerousPermissions.includes(permission.type)) {
        report.warnings.push({
          type: 'dangerous_permission',
          severity: 'high',
          message: `Plugin requests dangerous permission: ${permission.type}`
        });
        report.score -= 15;
      }

      // Validate permission scope
      if (!permission.scope || permission.scope.trim() === '') {
        report.issues.push({
          type: 'invalid_permission_scope',
          severity: 'medium',
          message: `Permission ${permission.type} has no scope defined`
        });
        report.score -= 5;
      }

      // Check if permission is properly justified
      if (!permission.description || permission.description.length < 10) {
        report.warnings.push({
          type: 'unclear_permission',
          severity: 'medium',
          message: `Permission ${permission.type} needs better justification`
        });
        report.score -= 3;
      }
    }

    // Network permission validation
    if (networkPermissions.length > 0) {
      if (networkPermissions.length > 1) {
        report.warnings.push({
          type: 'multiple_network_permissions',
          severity: 'medium',
          message: 'Plugin requests multiple network permissions'
        });
        report.score -= 5;
      }
    }

    // System permission validation
    if (systemPermissions.length > 0) {
      report.issues.push({
        type: 'system_permission',
        severity: 'critical',
        message: 'Plugin requests system-level permissions'
      });
      report.score -= 25;
    }
  }

  private async validatePluginCode(pluginPackage: PluginPackage, report: ValidationReport): Promise<void> {
    const { files } = pluginPackage;
    
    // Check for malicious patterns
    const maliciousPatterns = [
      /eval\s*\(/g,
      /Function\s*\(/g,
      /document\.write/g,
      /innerHTML\s*=/g,
      /\<script/gi,
      /javascript:/gi,
      /on\w+\s*=/gi // event handlers
    ];

    for (const [filename, content] of files.entries()) {
      if (filename.endsWith('.js') || filename.endsWith('.ts')) {
        for (const pattern of maliciousPatterns) {
          const matches = content.match(pattern);
          if (matches) {
            report.issues.push({
              type: 'malicious_code',
              severity: 'high',
              message: `Potentially dangerous code pattern found in ${filename}: ${matches[0]}`
            });
            report.score -= 20;
          }
        }

        // Check for obfuscated code
        if (this.isObfuscated(content)) {
          report.warnings.push({
            type: 'obfuscated_code',
            severity: 'high',
            message: `Code appears to be obfuscated in ${filename}`
          });
          report.score -= 15;
        }

        // Check for minified code without source maps
        if (this.isMinified(content) && !files.has(filename + '.map')) {
          report.warnings.push({
            type: 'minified_without_sourcemap',
            severity: 'medium',
            message: `Minified code without source map in ${filename}`
          });
          report.score -= 5;
        }
      }
    }
  }

  private validateDependencies(dependencies: string[], report: ValidationReport): void {
    const knownVulnerableDeps = [
      'lodash@4.17.20', // Example vulnerable dependency
      'moment@2.29.0'   // Example vulnerable dependency
    ];

    for (const dep of dependencies) {
      if (knownVulnerableDeps.some(vuln => dep.includes(vuln.split('@')[0]))) {
        report.warnings.push({
          type: 'vulnerable_dependency',
          severity: 'high',
          message: `Dependency ${dep} may have known vulnerabilities`
        });
        report.score -= 10;
      }
    }

    if (dependencies.length > 10) {
      report.warnings.push({
        type: 'excessive_dependencies',
        severity: 'medium',
        message: 'Plugin has many dependencies, increasing attack surface'
      });
      report.score -= 5;
    }
  }

  private checkDeveloperReputation(author: string, report: ValidationReport): void {
    if (this.trustedDevelopers.has(author)) {
      report.recommendations.push({
        type: 'trusted_developer',
        severity: 'low',
        message: 'Plugin is from a trusted developer'
      });
      report.score += 10;
    } else {
      report.warnings.push({
        type: 'unknown_developer',
        severity: 'medium',
        message: 'Plugin is from an unknown developer'
      });
      report.score -= 5;
    }
  }

  private async performContentSecurityAnalysis(pluginPackage: PluginPackage, report: ValidationReport): Promise<void> {
    // Check for suspicious file types
    const suspiciousExtensions = ['.exe', '.dll', '.so', '.dylib', '.bat', '.sh'];
    
    for (const filename of pluginPackage.files.keys()) {
      const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
      if (suspiciousExtensions.includes(ext)) {
        report.issues.push({
          type: 'suspicious_file',
          severity: 'critical',
          message: `Suspicious file found: ${filename}`
        });
        report.score -= 50;
      }
    }

    // Check file size limits
    let totalSize = 0;
    for (const content of pluginPackage.files.values()) {
      totalSize += content.length;
    }

    if (totalSize > 10 * 1024 * 1024) { // 10MB limit
      report.warnings.push({
        type: 'large_plugin',
        severity: 'medium',
        message: 'Plugin is unusually large'
      });
      report.score -= 5;
    }
  }

  private calculateSecurityScore(report: ValidationReport): void {
    // Ensure score doesn't go below 0
    report.score = Math.max(0, report.score);
    
    // Set validity based on score and critical issues
    const hasCriticalIssues = report.issues.some(issue => issue.severity === 'critical');
    report.valid = !hasCriticalIssues && report.score >= 60;
  }

  private isPluginBlocked(pluginId: string): boolean {
    return this.blockedPlugins.has(pluginId);
  }

  private isPermissionAllowed(permission: PluginPermission, plugin: PluginInstance): boolean {
    const policy = this.permissionPolicies.get(permission.type);
    if (!policy) return false;

    // Check if permission requires approval and hasn't been granted
    if (policy.requiresApproval) {
      // In a real implementation, this would check user approval status
      return false;
    }

    return true;
  }

  private isObfuscated(code: string): boolean {
    // Simple heuristic for detecting obfuscated code
    const averageVarLength = this.getAverageVariableNameLength(code);
    const hasLongStrings = /['"`][^'"`]{100,}['"`]/.test(code);
    const hasHexEscapes = /\\x[0-9a-fA-F]{2}/.test(code);
    
    return averageVarLength < 3 || hasLongStrings || hasHexEscapes;
  }

  private isMinified(code: string): boolean {
    const lines = code.split('\n');
    const avgLineLength = lines.reduce((sum, line) => sum + line.length, 0) / lines.length;
    const hasLongLines = lines.some(line => line.length > 500);
    
    return avgLineLength > 200 || hasLongLines;
  }

  private getAverageVariableNameLength(code: string): number {
    const varNames = code.match(/\b[a-zA-Z_$][a-zA-Z0-9_$]*\b/g) || [];
    if (varNames.length === 0) return 0;
    
    const totalLength = varNames.reduce((sum, name) => sum + name.length, 0);
    return totalLength / varNames.length;
  }

  private monitorAPIUsage(plugin: PluginInstance): void {
    // Implementation would monitor API call frequency and patterns
  }

  private monitorResourceUsage(plugin: PluginInstance): void {
    // Implementation would monitor CPU, memory, and storage usage
  }

  private monitorNetworkActivity(plugin: PluginInstance): void {
    // Implementation would monitor network requests
  }

  private monitorStorageAccess(plugin: PluginInstance): void {
    // Implementation would monitor storage operations
  }

  private generateSecurityRecommendations(pluginId: string, violations: SecurityViolation[]): string[] {
    const recommendations: string[] = [];
    
    if (violations.some(v => v.type === 'permission')) {
      recommendations.push('Review and reduce plugin permissions');
    }
    
    if (violations.some(v => v.severity === 'critical')) {
      recommendations.push('Consider removing this plugin due to critical security issues');
    }
    
    if (violations.length > 10) {
      recommendations.push('Monitor plugin behavior closely');
    }
    
    return recommendations;
  }

  private async loadTrustedDevelopers(): Promise<void> {
    const stored = localStorage.getItem('bear_trusted_developers');
    if (stored) {
      const developers = JSON.parse(stored);
      this.trustedDevelopers = new Set(developers);
    }
  }

  private saveTrustedDevelopers(): void {
    localStorage.setItem('bear_trusted_developers', JSON.stringify([...this.trustedDevelopers]));
  }

  private async loadBlockedPlugins(): Promise<void> {
    const stored = localStorage.getItem('bear_blocked_plugins');
    if (stored) {
      const plugins = JSON.parse(stored);
      this.blockedPlugins = new Set(plugins);
    }
  }

  private saveBlockedPlugins(): void {
    localStorage.setItem('bear_blocked_plugins', JSON.stringify([...this.blockedPlugins]));
  }

  private async saveViolationLog(): Promise<void> {
    localStorage.setItem('bear_security_violations', JSON.stringify(this.violations));
  }

  private initializePermissionMonitoring(): void {
    // Setup permission monitoring intervals
    setInterval(() => {
      // Monitor active plugins
    }, 10000); // Check every 10 seconds
  }
}

interface PermissionPolicy {
  maxSize?: number;
  allowedOperations?: string[];
  allowedProtocols?: string[];
  blockedHosts?: string[];
  maxRequests?: number;
  allowedElements?: string[];
  blockedAttributes?: string[];
  allowedPaths?: string[];
  readOnly?: boolean;
  allowedAPIs?: string[];
  requiresApproval: boolean;
}

interface ValidationReport {
  valid: boolean;
  score: number;
  issues: SecurityIssue[];
  warnings: SecurityIssue[];
  recommendations: SecurityIssue[];
}

interface SecurityIssue {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
}

interface SecurityReport {
  pluginId: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  totalViolations: number;
  violationBreakdown: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  recommendations: string[];
  lastAssessment: Date;
}