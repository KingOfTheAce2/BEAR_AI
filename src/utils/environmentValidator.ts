/**
 * Environment Validation Utilities for BEAR AI
 * Comprehensive validation and security checks for environment variables
 */

import { environmentManager, EnvironmentConfig, ValidationResult } from '../services/environmentManager';
import { logger } from '../services/logger';

export interface SecurityAuditResult {
  score: number; // 0-100
  level: 'critical' | 'high' | 'medium' | 'low';
  issues: SecurityIssue[];
  recommendations: SecurityRecommendation[];
  compliant: boolean;
}

export interface SecurityIssue {
  category: 'authentication' | 'encryption' | 'secrets' | 'network' | 'permissions';
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  remediation: string;
  references?: string[];
}

export interface SecurityRecommendation {
  priority: 'high' | 'medium' | 'low';
  category: string;
  title: string;
  description: string;
  implementation: string;
}

export interface ComplianceCheck {
  standard: 'SOC2' | 'GDPR' | 'HIPAA' | 'PCI-DSS';
  requirement: string;
  status: 'compliant' | 'non-compliant' | 'partial' | 'not-applicable';
  description: string;
  evidence?: string;
}

export class EnvironmentValidator {
  private config: Partial<EnvironmentConfig>;

  constructor() {
    this.config = environmentManager.getAll();
  }

  /**
   * Perform comprehensive environment validation
   */
  public async performFullValidation(): Promise<{
    basic: ValidationResult;
    security: SecurityAuditResult;
    compliance: ComplianceCheck[];
    recommendations: string[];
  }> {
    const basic = environmentManager.getValidationResult() || {
      isValid: false,
      errors: [],
      warnings: [],
      missingRequired: [],
      suggestions: []
    };

    const security = this.performSecurityAudit();
    const compliance = this.checkCompliance();
    const recommendations = this.generateRecommendations();

    return {
      basic,
      security,
      compliance,
      recommendations
    };
  }

  /**
   * Perform security audit of environment configuration
   */
  public performSecurityAudit(): SecurityAuditResult {
    const issues: SecurityIssue[] = [];
    const recommendations: SecurityRecommendation[] = [];

    // Check authentication security
    issues.push(...this.checkAuthenticationSecurity());

    // Check encryption settings
    issues.push(...this.checkEncryptionSecurity());

    // Check secrets management
    issues.push(...this.checkSecretsManagement());

    // Check network security
    issues.push(...this.checkNetworkSecurity());

    // Generate security recommendations
    recommendations.push(...this.generateSecurityRecommendations(issues));

    // Calculate security score
    const score = this.calculateSecurityScore(issues);
    const level = this.determineSecurityLevel(score);

    return {
      score,
      level,
      issues,
      recommendations,
      compliant: score >= 80 && issues.filter(i => i.severity === 'critical').length === 0
    };
  }

  /**
   * Check compliance with various standards
   */
  public checkCompliance(): ComplianceCheck[] {
    const checks: ComplianceCheck[] = [];

    // SOC 2 compliance checks
    checks.push(...this.checkSOC2Compliance());

    // GDPR compliance checks
    checks.push(...this.checkGDPRCompliance());

    // Basic security compliance
    checks.push(...this.checkBasicSecurityCompliance());

    return checks;
  }

  /**
   * Generate environment-specific recommendations
   */
  public generateRecommendations(): string[] {
    const recommendations: string[] = [];
    const isProduction = environmentManager.isProduction();
    const isDevelopment = environmentManager.isDevelopment();

    if (isProduction) {
      recommendations.push(...this.getProductionRecommendations());
    }

    if (isDevelopment) {
      recommendations.push(...this.getDevelopmentRecommendations());
    }

    // General recommendations
    recommendations.push(...this.getGeneralRecommendations());

    return recommendations;
  }

  /**
   * Validate specific environment variable formats
   */
  public validateSpecificFormats(): { [key: string]: boolean } {
    const results: { [key: string]: boolean } = {};

    // Validate Stripe keys
    const stripePublishable = this.config.STRIPE_PUBLISHABLE_KEY;
    if (stripePublishable) {
      results.stripePublishableKey = /^pk_(test|live)_[a-zA-Z0-9]{24,}$/.test(stripePublishable);
    }

    const stripeSecret = this.config.STRIPE_SECRET_KEY;
    if (stripeSecret) {
      results.stripeSecretKey = /^sk_(test|live)_[a-zA-Z0-9]{24,}$/.test(stripeSecret);
    }

    const stripeWebhook = this.config.STRIPE_WEBHOOK_SECRET;
    if (stripeWebhook) {
      results.stripeWebhookSecret = /^whsec_[a-zA-Z0-9]{32,}$/.test(stripeWebhook);
    }

    // Validate JWT secret strength
    const jwtSecret = this.config.JWT_SECRET;
    if (jwtSecret) {
      results.jwtSecretStrength = jwtSecret.length >= 32 && this.isStrongSecret(jwtSecret);
    }

    // Validate encryption key format
    const encryptionKey = this.config.ENCRYPTION_KEY;
    if (encryptionKey) {
      results.encryptionKeyFormat = encryptionKey.length === 32 && /^[a-zA-Z0-9+/=]{32}$/.test(encryptionKey);
    }

    // Validate email format
    const adminEmail = this.config.ADMIN_EMAIL;
    if (adminEmail) {
      results.adminEmailFormat = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(adminEmail);
    }

    // Validate database URL format
    const databaseUrl = this.config.DATABASE_URL;
    if (databaseUrl) {
      results.databaseUrlFormat = /^(sqlite|postgresql|mysql):\/\//.test(databaseUrl);
    }

    return results;
  }

  /**
   * Check for environment variable conflicts
   */
  public checkForConflicts(): string[] {
    const conflicts: string[] = [];

    // Check Stripe environment consistency
    const stripeEnv = this.config.STRIPE_ENVIRONMENT;
    const stripeKey = this.config.STRIPE_SECRET_KEY;
    if (stripeEnv && stripeKey) {
      const keyEnv = stripeKey.startsWith('sk_test_') ? 'test' : 'live';
      if (stripeEnv !== keyEnv) {
        conflicts.push('STRIPE_ENVIRONMENT does not match STRIPE_SECRET_KEY environment');
      }
    }

    // Check NODE_ENV vs other environment settings
    const nodeEnv = this.config.NODE_ENV;
    if (nodeEnv === 'production') {
      if (this.config.TAURI_DEBUG) {
        conflicts.push('TAURI_DEBUG should be false in production');
      }
      if (this.config.DEV_DISABLE_AUTH) {
        conflicts.push('DEV_DISABLE_AUTH should not be set in production');
      }
      if (this.config.LOG_LEVEL === 'debug') {
        conflicts.push('LOG_LEVEL should not be debug in production');
      }
    }

    // Check session security in production
    if (nodeEnv === 'production' && !this.config.SESSION_SECURE) {
      conflicts.push('SESSION_SECURE should be true in production');
    }

    return conflicts;
  }

  /**
   * Generate security score report
   */
  public generateSecurityReport(): string {
    const audit = this.performSecurityAudit();
    const compliance = this.checkCompliance();

    let report = `# Environment Security Report\\n\\n`;
    report += `## Overall Security Score: ${audit.score}/100 (${audit.level.toUpperCase()})\\n\\n`;

    report += `## Security Issues (${audit.issues.length})\\n`;
    audit.issues.forEach(issue => {
      report += `- **${issue.severity.toUpperCase()}**: ${issue.title}\\n`;
      report += `  ${issue.description}\\n`;
      report += `  *Remediation*: ${issue.remediation}\\n\\n`;
    });

    report += `## Compliance Status\\n`;
    compliance.forEach(check => {
      report += `- **${check.standard}**: ${check.requirement} - ${check.status.toUpperCase()}\\n`;
    });

    report += `\\n## Recommendations\\n`;
    audit.recommendations.forEach(rec => {
      report += `- **${rec.priority.toUpperCase()}**: ${rec.title}\\n`;
      report += `  ${rec.description}\\n\\n`;
    });

    return report;
  }

  // Private methods for security checks

  private checkAuthenticationSecurity(): SecurityIssue[] {
    const issues: SecurityIssue[] = [];

    // Check JWT secret strength
    const jwtSecret = this.config.JWT_SECRET;
    if (!jwtSecret || jwtSecret.length < 32) {
      issues.push({
        category: 'authentication',
        severity: 'critical',
        title: 'Weak JWT Secret',
        description: 'JWT secret is too short or missing, compromising token security',
        remediation: 'Use a strong, random secret of at least 32 characters',
        references: ['https://tools.ietf.org/html/rfc7519']
      });
    }

    // Check session secret
    const sessionSecret = this.config.SESSION_SECRET;
    if (!sessionSecret || sessionSecret.length < 32) {
      issues.push({
        category: 'authentication',
        severity: 'high',
        title: 'Weak Session Secret',
        description: 'Session secret is inadequate for secure session management',
        remediation: 'Use a cryptographically strong session secret',
      });
    }

    // Check password requirements
    if (!this.config.PASSWORD_REQUIRE_UPPERCASE || !this.config.PASSWORD_REQUIRE_LOWERCASE) {
      issues.push({
        category: 'authentication',
        severity: 'medium',
        title: 'Weak Password Policy',
        description: 'Password policy does not enforce strong passwords',
        remediation: 'Enable uppercase, lowercase, numbers, and symbols requirements',
      });
    }

    // Check 2FA settings
    if (!this.config.ENABLE_TWO_FACTOR_AUTH && environmentManager.isProduction()) {
      issues.push({
        category: 'authentication',
        severity: 'medium',
        title: 'Two-Factor Authentication Disabled',
        description: '2FA is not enabled, reducing account security',
        remediation: 'Enable two-factor authentication for all users',
      });
    }

    return issues;
  }

  private checkEncryptionSecurity(): SecurityIssue[] {
    const issues: SecurityIssue[] = [];

    // Check encryption key
    const encryptionKey = this.config.ENCRYPTION_KEY;
    if (!encryptionKey || encryptionKey.length !== 32) {
      issues.push({
        category: 'encryption',
        severity: 'critical',
        title: 'Invalid Encryption Key',
        description: 'Encryption key is missing or incorrect length',
        remediation: 'Use a 32-character encryption key for AES-256',
      });
    }

    // Check database encryption
    const dbEncryptionKey = this.config.DATABASE_ENCRYPTION_KEY;
    if (!dbEncryptionKey) {
      issues.push({
        category: 'encryption',
        severity: 'high',
        title: 'Database Encryption Not Configured',
        description: 'Database encryption key is not set',
        remediation: 'Configure database encryption for data at rest',
      });
    }

    // Check hash rounds
    const hashRounds = this.config.HASH_ROUNDS;
    if (!hashRounds || hashRounds < 10) {
      issues.push({
        category: 'encryption',
        severity: 'medium',
        title: 'Insufficient Hash Rounds',
        description: 'Password hash rounds are too low',
        remediation: 'Use at least 12 hash rounds for bcrypt',
      });
    }

    return issues;
  }

  private checkSecretsManagement(): SecurityIssue[] {
    const issues: SecurityIssue[] = [];

    // Check for default values
    const defaultPatterns = [
      'your_',
      'change_me',
      'default_',
      'example_',
      'test_key',
      'demo_'
    ];

    Object.entries(this.config).forEach(([key, value]) => {
      if (typeof value === 'string') {
        defaultPatterns.forEach(pattern => {
          if (value.toLowerCase().includes(pattern)) {
            issues.push({
              category: 'secrets',
              severity: 'critical',
              title: `Default Value Detected: ${key}`,
              description: `Environment variable ${key} contains a default/placeholder value`,
              remediation: 'Replace with actual production values',
            });
          }
        });
      }
    });

    // Check for secrets in logs
    if (this.config.LOG_LEVEL === 'debug' && environmentManager.isProduction()) {
      issues.push({
        category: 'secrets',
        severity: 'medium',
        title: 'Debug Logging in Production',
        description: 'Debug logging may expose sensitive information',
        remediation: 'Use warn or error log level in production',
      });
    }

    return issues;
  }

  private checkNetworkSecurity(): SecurityIssue[] {
    const issues: SecurityIssue[] = [];

    // Check HTTPS usage
    const appUrl = this.config.APP_URL;
    if (appUrl && !appUrl.startsWith('https://') && environmentManager.isProduction()) {
      issues.push({
        category: 'network',
        severity: 'high',
        title: 'HTTP Used in Production',
        description: 'Application URL uses HTTP instead of HTTPS',
        remediation: 'Use HTTPS for all production URLs',
      });
    }

    // Check session security
    if (!this.config.SESSION_SECURE && environmentManager.isProduction()) {
      issues.push({
        category: 'network',
        severity: 'high',
        title: 'Insecure Session Cookies',
        description: 'Session cookies are not marked as secure',
        remediation: 'Enable secure flag for session cookies in production',
      });
    }

    // Check CORS settings
    if (this.config.DEV_ENABLE_CORS && environmentManager.isProduction()) {
      issues.push({
        category: 'network',
        severity: 'medium',
        title: 'Development CORS in Production',
        description: 'Development CORS settings may be too permissive',
        remediation: 'Configure strict CORS policy for production',
      });
    }

    return issues;
  }

  private generateSecurityRecommendations(issues: SecurityIssue[]): SecurityRecommendation[] {
    const recommendations: SecurityRecommendation[] = [];

    // Generate recommendations based on issues
    const criticalIssues = issues.filter(i => i.severity === 'critical');
    if (criticalIssues.length > 0) {
      recommendations.push({
        priority: 'high',
        category: 'Security',
        title: 'Address Critical Security Issues',
        description: `${criticalIssues.length} critical security issues found`,
        implementation: 'Fix all critical issues before deploying to production'
      });
    }

    // Environment-specific recommendations
    if (environmentManager.isProduction()) {
      recommendations.push({
        priority: 'high',
        category: 'Production',
        title: 'Enable Security Monitoring',
        description: 'Set up security monitoring and alerting',
        implementation: 'Configure Sentry, New Relic, or similar monitoring'
      });
    }

    return recommendations;
  }

  private checkSOC2Compliance(): ComplianceCheck[] {
    return [
      {
        standard: 'SOC2',
        requirement: 'Data Encryption at Rest',
        status: this.config.DATABASE_ENCRYPTION_KEY ? 'compliant' : 'non-compliant',
        description: 'Database must be encrypted at rest',
        evidence: this.config.DATABASE_ENCRYPTION_KEY ? 'Database encryption key configured' : undefined
      },
      {
        standard: 'SOC2',
        requirement: 'Secure Authentication',
        status: this.config.JWT_SECRET && this.config.JWT_SECRET.length >= 32 ? 'compliant' : 'non-compliant',
        description: 'Strong authentication mechanisms required',
        evidence: this.config.JWT_SECRET ? 'JWT authentication configured' : undefined
      }
    ];
  }

  private checkGDPRCompliance(): ComplianceCheck[] {
    return [
      {
        standard: 'GDPR',
        requirement: 'Data Protection by Design',
        status: this.config.ENCRYPTION_KEY ? 'compliant' : 'partial',
        description: 'Personal data must be protected by design and by default',
        evidence: this.config.ENCRYPTION_KEY ? 'Encryption configured' : undefined
      }
    ];
  }

  private checkBasicSecurityCompliance(): ComplianceCheck[] {
    return [
      {
        standard: 'PCI-DSS',
        requirement: 'Secure Payment Processing',
        status: this.config.STRIPE_SECRET_KEY && this.config.STRIPE_WEBHOOK_SECRET ? 'compliant' : 'non-compliant',
        description: 'Payment processing must use secure methods',
        evidence: this.config.STRIPE_SECRET_KEY ? 'Stripe secure payment configured' : undefined
      }
    ];
  }

  private calculateSecurityScore(issues: SecurityIssue[]): number {
    let score = 100;

    issues.forEach(issue => {
      switch (issue.severity) {
        case 'critical':
          score -= 25;
          break;
        case 'high':
          score -= 15;
          break;
        case 'medium':
          score -= 8;
          break;
        case 'low':
          score -= 3;
          break;
      }
    });

    return Math.max(0, score);
  }

  private determineSecurityLevel(score: number): 'critical' | 'high' | 'medium' | 'low' {
    if (score >= 90) return 'low';
    if (score >= 70) return 'medium';
    if (score >= 50) return 'high';
    return 'critical';
  }

  private isStrongSecret(secret: string): boolean {
    // Check for character diversity
    const hasLower = /[a-z]/.test(secret);
    const hasUpper = /[A-Z]/.test(secret);
    const hasNumbers = /\\d/.test(secret);
    const hasSpecial = /[!@#$%^&*()_+\\-=\\[\\]{};':"\\|,.<>\\/?]/.test(secret);

    return hasLower && hasUpper && hasNumbers && hasSpecial;
  }

  private getProductionRecommendations(): string[] {
    return [
      'Enable all security features for production deployment',
      'Set up monitoring and alerting for security events',
      'Configure backup and disaster recovery procedures',
      'Enable rate limiting and DDoS protection',
      'Set up SSL/TLS certificates and HTTPS redirects',
      'Configure environment-specific logging and monitoring'
    ];
  }

  private getDevelopmentRecommendations(): string[] {
    return [
      'Use development-specific API keys and secrets',
      'Enable debug logging for troubleshooting',
      'Set up local development database',
      'Configure hot reloading for faster development',
      'Use mock services for external integrations'
    ];
  }

  private getGeneralRecommendations(): string[] {
    return [
      'Regularly rotate secrets and API keys',
      'Keep environment variables updated with application changes',
      'Document all environment variables and their purposes',
      'Use strong, unique secrets for each environment',
      'Implement automated environment validation in CI/CD'
    ];
  }
}

// Export singleton instance
export const environmentValidator = new EnvironmentValidator();