// Configuration Validator for BEAR AI - Schema validation and configuration checking
import { ApplicationConfig, ConfigSchema, ConfigValidationRule, Environment } from '../types/config';

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  score: number; // 0-100, quality score
  suggestions: string[];
}

export interface ValidationError {
  path: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  code: string;
  expectedType?: string;
  actualType?: string;
  allowedValues?: any[];
}

export interface ValidationWarning {
  path: string;
  message: string;
  recommendation: string;
  impact: 'low' | 'medium' | 'high';
}

export interface SecurityValidation {
  hasSecureDefaults: boolean;
  hasWeakCredentials: boolean;
  hasInsecureSettings: boolean;
  encryptionEnabled: boolean;
  securityScore: number;
  vulnerabilities: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    fix: string;
  }>;
}

export interface PerformanceValidation {
  hasOptimalSettings: boolean;
  resourceLimitsSet: boolean;
  cachingEnabled: boolean;
  performanceScore: number;
  recommendations: Array<{
    setting: string;
    current: any;
    recommended: any;
    impact: string;
  }>;
}

export interface ComplianceValidation {
  gdprCompliant: boolean;
  hipaaCompliant: boolean;
  pciCompliant: boolean;
  customCompliance: Record<string, boolean>;
  complianceScore: number;
  violations: Array<{
    standard: string;
    requirement: string;
    violation: string;
    remediation: string;
  }>;
}

export class ConfigValidator {
  private schemas: Map<string, ConfigSchema> = new Map();
  private customValidators: Map<string, (value: any, config: any) => ValidationResult> = new Map();
  private securityRules: SecurityRule[] = [];
  private performanceRules: PerformanceRule[] = [];
  private complianceRules: ComplianceRule[] = [];

  constructor() {
    this.initializeDefaultSchemas();
    this.initializeSecurityRules();
    this.initializePerformanceRules();
    this.initializeComplianceRules();
  }

  /**
   * Validate complete configuration
   */
  async validateConfiguration(config: ApplicationConfig, environment?: Environment): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      score: 100,
      suggestions: []
    };

    // Schema validation
    const schemaValidation = await this.validateSchema(config, environment);
    result.errors.push(...schemaValidation.errors);
    result.warnings.push(...schemaValidation.warnings);

    // Type validation
    const typeValidation = this.validateTypes(config);
    result.errors.push(...typeValidation.errors);

    // Business logic validation
    const businessValidation = this.validateBusinessLogic(config);
    result.errors.push(...businessValidation.errors);
    result.warnings.push(...businessValidation.warnings);

    // Cross-reference validation
    const crossRefValidation = this.validateCrossReferences(config);
    result.errors.push(...crossRefValidation.errors);

    // Environment-specific validation
    if (environment) {
      const envValidation = this.validateEnvironment(config, environment);
      result.errors.push(...envValidation.errors);
      result.warnings.push(...envValidation.warnings);
    }

    // Custom validation
    const customValidation = await this.runCustomValidations(config);
    result.errors.push(...customValidation.errors);
    result.warnings.push(...customValidation.warnings);

    // Calculate final score and validity
    result.isValid = result.errors.filter(e => e.severity === 'error').length === 0;
    result.score = this.calculateScore(result.errors, result.warnings.length);
    result.suggestions = this.generateSuggestions(result.errors, result.warnings);

    return result;
  }

  /**
   * Validate security configuration
   */
  validateSecurity(config: ApplicationConfig): SecurityValidation {
    const result: SecurityValidation = {
      hasSecureDefaults: true,
      hasWeakCredentials: false,
      hasInsecureSettings: false,
      encryptionEnabled: false,
      securityScore: 100,
      vulnerabilities: []
    };

    // Check security configuration
    if (config.security) {
      // Check encryption
      result.encryptionEnabled = !!config.security.encryptionKey;
      
      // Check JWT secret strength
      if (config.security.jwtSecret && config.security.jwtSecret.length < 32) {
        result.hasWeakCredentials = true;
        result.vulnerabilities.push({
          type: 'weak_jwt_secret',
          severity: 'high',
          description: 'JWT secret is too short',
          fix: 'Use a JWT secret with at least 32 characters'
        });
      }

      // Check CSRF protection
      if (!config.security.csrfProtection) {
        result.hasInsecureSettings = true;
        result.vulnerabilities.push({
          type: 'csrf_disabled',
          severity: 'medium',
          description: 'CSRF protection is disabled',
          fix: 'Enable CSRF protection in security configuration'
        });
      }

      // Check session timeout
      if (config.security.sessionTimeout > 86400) { // 24 hours
        result.vulnerabilities.push({
          type: 'long_session_timeout',
          severity: 'low',
          description: 'Session timeout is very long',
          fix: 'Consider reducing session timeout for better security'
        });
      }

      // Check MFA requirement
      if (!config.security.requireMFA && config.system.environment === 'production') {
        result.vulnerabilities.push({
          type: 'mfa_not_required',
          severity: 'medium',
          description: 'MFA is not required in production',
          fix: 'Enable MFA requirement for production environment'
        });
      }
    } else {
      result.hasSecureDefaults = false;
      result.vulnerabilities.push({
        type: 'missing_security_config',
        severity: 'critical',
        description: 'Security configuration is missing',
        fix: 'Add security configuration section'
      });
    }

    // Run security rules
    for (const rule of this.securityRules) {
      const ruleResult = rule.validate(config);
      if (!ruleResult.passed) {
        result.vulnerabilities.push(...ruleResult.vulnerabilities);
      }
    }

    // Calculate security score
    result.securityScore = this.calculateSecurityScore(result.vulnerabilities);
    result.hasSecureDefaults = result.securityScore >= 80;

    return result;
  }

  /**
   * Validate performance configuration
   */
  validatePerformance(config: ApplicationConfig): PerformanceValidation {
    const result: PerformanceValidation = {
      hasOptimalSettings: true,
      resourceLimitsSet: false,
      cachingEnabled: false,
      performanceScore: 100,
      recommendations: []
    };

    // Check system resource limits
    if (config.system?.resources) {
      result.resourceLimitsSet = true;
      
      // Check memory limits
      if (config.system.resources.maxMemoryUsage > 90) {
        result.recommendations.push({
          setting: 'system.resources.maxMemoryUsage',
          current: config.system.resources.maxMemoryUsage,
          recommended: 85,
          impact: 'High memory usage threshold may cause system instability'
        });
      }

      // Check CPU limits
      if (config.system.resources.maxCPUUsage > 85) {
        result.recommendations.push({
          setting: 'system.resources.maxCPUUsage',
          current: config.system.resources.maxCPUUsage,
          recommended: 80,
          impact: 'High CPU usage threshold may affect response times'
        });
      }
    }

    // Check caching configuration
    if (config.performance?.caching?.enabled) {
      result.cachingEnabled = true;
      
      // Check cache TTL
      if (config.performance.caching.ttl < 300) { // 5 minutes
        result.recommendations.push({
          setting: 'performance.caching.ttl',
          current: config.performance.caching.ttl,
          recommended: 3600,
          impact: 'Low cache TTL may increase database load'
        });
      }

      // Check cache size
      if (config.performance.caching.maxSize < 100) {
        result.recommendations.push({
          setting: 'performance.caching.maxSize',
          current: config.performance.caching.maxSize,
          recommended: 1000,
          impact: 'Small cache size may reduce hit rate'
        });
      }
    }

    // Check logging performance impact
    if (config.logging?.level === 'debug' && config.system.environment === 'production') {
      result.recommendations.push({
        setting: 'logging.level',
        current: 'debug',
        recommended: 'warn',
        impact: 'Debug logging in production affects performance'
      });
    }

    // Run performance rules
    for (const rule of this.performanceRules) {
      const ruleResult = rule.validate(config);
      result.recommendations.push(...ruleResult.recommendations);
    }

    // Calculate performance score
    result.performanceScore = this.calculatePerformanceScore(result.recommendations);
    result.hasOptimalSettings = result.performanceScore >= 80;

    return result;
  }

  /**
   * Validate compliance requirements
   */
  validateCompliance(config: ApplicationConfig, standards: string[] = ['gdpr']): ComplianceValidation {
    const result: ComplianceValidation = {
      gdprCompliant: true,
      hipaaCompliant: true,
      pciCompliant: true,
      customCompliance: {},
      complianceScore: 100,
      violations: []
    };

    // GDPR validation
    if (standards.includes('gdpr')) {
      result.gdprCompliant = this.validateGDPR(config, result.violations);
    }

    // HIPAA validation
    if (standards.includes('hipaa')) {
      result.hipaaCompliant = this.validateHIPAA(config, result.violations);
    }

    // PCI validation
    if (standards.includes('pci')) {
      result.pciCompliant = this.validatePCI(config, result.violations);
    }

    // Custom compliance rules
    for (const rule of this.complianceRules) {
      if (standards.includes(rule.standard)) {
        const ruleResult = rule.validate(config);
        result.customCompliance[rule.standard] = ruleResult.compliant;
        result.violations.push(...ruleResult.violations);
      }
    }

    // Calculate compliance score
    result.complianceScore = this.calculateComplianceScore(result.violations);

    return result;
  }

  /**
   * Add custom validation rule
   */
  addCustomValidator(name: string, validator: (value: any, config: any) => ValidationResult): void {
    this.customValidators.set(name, validator);
  }

  /**
   * Add configuration schema
   */
  addSchema(name: string, schema: ConfigSchema): void {
    this.schemas.set(name, schema);
  }

  /**
   * Validate specific configuration path
   */
  validatePath(config: ApplicationConfig, path: string): ValidationResult {
    const value = this.getByPath(config, path);
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      score: 100,
      suggestions: []
    };

    // Find applicable rules
    for (const schema of this.schemas.values()) {
      const rule = schema.rules.find(r => r.path === path);
      if (rule) {
        const validation = this.validateRule(rule, value, config);
        if (!validation.isValid) {
          result.errors.push({
            path,
            message: validation.error,
            severity: rule.required ? 'error' : 'warning',
            code: 'validation_failed',
            expectedType: rule.type
          });
        }
      }
    }

    result.isValid = result.errors.filter(e => e.severity === 'error').length === 0;
    return result;
  }

  // Private methods
  private initializeDefaultSchemas(): void {
    const baseSchema: ConfigSchema = {
      version: '1.0.0',
      rules: [
        {
          path: 'system.environment',
          type: 'string',
          required: true,
          validation: {
            enum: ['development', 'production', 'testing', 'staging']
          }
        },
        {
          path: 'system.version',
          type: 'string',
          required: true,
          validation: {
            pattern: /^\d+\.\d+\.\d+$/
          }
        },
        {
          path: 'database.port',
          type: 'number',
          required: true,
          validation: {
            min: 1,
            max: 65535
          }
        },
        {
          path: 'security.sessionTimeout',
          type: 'number',
          required: false,
          validation: {
            min: 300, // 5 minutes
            max: 86400 // 24 hours
          }
        },
        {
          path: 'logging.level',
          type: 'string',
          required: true,
          validation: {
            enum: ['debug', 'info', 'warn', 'error']
          }
        }
      ]
    };

    this.schemas.set('base', baseSchema);
  }

  private initializeSecurityRules(): void {
    this.securityRules = [
      {
        name: 'strong_passwords',
        validate: (config) => ({
          passed: true, // Simplified for demo
          vulnerabilities: []
        })
      },
      {
        name: 'secure_defaults',
        validate: (config) => ({
          passed: true, // Simplified for demo
          vulnerabilities: []
        })
      }
    ];
  }

  private initializePerformanceRules(): void {
    this.performanceRules = [
      {
        name: 'optimal_cache_settings',
        validate: (config) => ({
          recommendations: []
        })
      }
    ];
  }

  private initializeComplianceRules(): void {
    this.complianceRules = [
      {
        standard: 'custom',
        name: 'data_retention',
        validate: (config) => ({
          compliant: true,
          violations: []
        })
      }
    ];
  }

  private async validateSchema(config: ApplicationConfig, environment?: Environment): Promise<{ errors: ValidationError[]; warnings: ValidationWarning[] }> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    const schema = this.schemas.get('base');
    if (!schema) return { errors, warnings };

    for (const rule of schema.rules) {
      const value = this.getByPath(config, rule.path);
      const validation = this.validateRule(rule, value, config);
      
      if (!validation.isValid) {
        const error: ValidationError = {
          path: rule.path,
          message: validation.error,
          severity: rule.required ? 'error' : 'warning',
          code: 'schema_validation',
          expectedType: rule.type,
          actualType: typeof value
        };

        if (rule.required) {
          errors.push(error);
        } else {
          warnings.push({
            path: rule.path,
            message: validation.error,
            recommendation: `Consider setting ${rule.path} to a valid ${rule.type}`,
            impact: 'medium'
          });
        }
      }
    }

    return { errors, warnings };
  }

  private validateTypes(config: ApplicationConfig): { errors: ValidationError[] } {
    const errors: ValidationError[] = [];

    // Type-specific validations
    if (config.system) {
      if (typeof config.system.debug !== 'boolean') {
        errors.push({
          path: 'system.debug',
          message: 'Debug flag must be a boolean',
          severity: 'error',
          code: 'type_error',
          expectedType: 'boolean',
          actualType: typeof config.system.debug
        });
      }
    }

    return { errors };
  }

  private validateBusinessLogic(config: ApplicationConfig): { errors: ValidationError[]; warnings: ValidationWarning[] } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Business logic validations
    if (config.database && config.database.poolSize > 100) {
      warnings.push({
        path: 'database.poolSize',
        message: 'Database pool size is very large',
        recommendation: 'Consider reducing pool size to improve resource usage',
        impact: 'medium'
      });
    }

    return { errors, warnings };
  }

  private validateCrossReferences(config: ApplicationConfig): { errors: ValidationError[] } {
    const errors: ValidationError[] = [];

    // Cross-reference validations
    if (config.security?.requireMFA && !config.api) {
      errors.push({
        path: 'security.requireMFA',
        message: 'MFA requires API configuration',
        severity: 'error',
        code: 'dependency_error'
      });
    }

    return { errors };
  }

  private validateEnvironment(config: ApplicationConfig, environment: Environment): { errors: ValidationError[]; warnings: ValidationWarning[] } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Environment-specific validations
    if (environment === 'production') {
      if (config.system?.debug) {
        warnings.push({
          path: 'system.debug',
          message: 'Debug mode is enabled in production',
          recommendation: 'Disable debug mode in production for security and performance',
          impact: 'high'
        });
      }

      if (!config.security?.jwtSecret) {
        errors.push({
          path: 'security.jwtSecret',
          message: 'JWT secret is required in production',
          severity: 'error',
          code: 'production_requirement'
        });
      }
    }

    return { errors, warnings };
  }

  private async runCustomValidations(config: ApplicationConfig): Promise<{ errors: ValidationError[]; warnings: ValidationWarning[] }> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    for (const [name, validator] of this.customValidators) {
      try {
        const result = validator(config, config);
        errors.push(...result.errors);
        warnings.push(...result.warnings.map(w => ({
          path: w.path || 'custom',
          message: w.message || 'Custom validation warning',
          recommendation: `Custom validator ${name} recommendation`,
          impact: 'medium' as const
        })));
      } catch (error) {
        errors.push({
          path: 'custom',
          message: `Custom validator ${name} failed: ${error}`,
          severity: 'error',
          code: 'custom_validator_error'
        });
      }
    }

    return { errors, warnings };
  }

  private validateRule(rule: ConfigValidationRule, value: any, config: any): { isValid: boolean; error: string } {
    if (value === undefined || value === null) {
      return { isValid: !rule.required, error: 'Required field is missing' };
    }

    // Type validation
    const actualType = Array.isArray(value) ? 'array' : typeof value;
    if (actualType !== rule.type) {
      return { isValid: false, error: `Expected ${rule.type}, got ${actualType}` };
    }

    // Additional validation
    if (rule.validation) {
      const { min, max, pattern, enum: enumValues, custom } = rule.validation;

      if (min !== undefined && (typeof value === 'number' ? value < min : value.length < min)) {
        return { isValid: false, error: `Value must be at least ${min}` };
      }

      if (max !== undefined && (typeof value === 'number' ? value > max : value.length > max)) {
        return { isValid: false, error: `Value must be at most ${max}` };
      }

      if (pattern && typeof value === 'string' && !pattern.test(value)) {
        return { isValid: false, error: 'Value does not match required pattern' };
      }

      if (enumValues && !enumValues.includes(value)) {
        return { isValid: false, error: `Value must be one of: ${enumValues.join(', ')}` };
      }

      if (custom) {
        const customResult = custom(value);
        if (typeof customResult === 'string') {
          return { isValid: false, error: customResult };
        }
        if (!customResult) {
          return { isValid: false, error: 'Custom validation failed' };
        }
      }
    }

    return { isValid: true, error: '' };
  }

  private calculateScore(errors: ValidationError[], warningCount: number): number {
    const errorPenalty = errors.filter(e => e.severity === 'error').length * 20;
    const warningPenalty = warningCount * 5;
    return Math.max(0, 100 - errorPenalty - warningPenalty);
  }

  private generateSuggestions(errors: ValidationError[], warnings: ValidationWarning[]): string[] {
    const suggestions: string[] = [];

    // Error-based suggestions
    for (const error of errors) {
      if (error.code === 'type_error') {
        suggestions.push(`Convert ${error.path} to ${error.expectedType}`);
      } else if (error.code === 'schema_validation') {
        suggestions.push(`Fix validation error in ${error.path}: ${error.message}`);
      }
    }

    // Warning-based suggestions
    for (const warning of warnings) {
      suggestions.push(warning.recommendation);
    }

    return [...new Set(suggestions)]; // Remove duplicates
  }

  private calculateSecurityScore(vulnerabilities: SecurityValidation['vulnerabilities']): number {
    let score = 100;
    for (const vuln of vulnerabilities) {
      switch (vuln.severity) {
        case 'critical': score -= 30; break;
        case 'high': score -= 20; break;
        case 'medium': score -= 10; break;
        case 'low': score -= 5; break;
      }
    }
    return Math.max(0, score);
  }

  private calculatePerformanceScore(recommendations: PerformanceValidation['recommendations']): number {
    let score = 100;
    for (const rec of recommendations) {
      if (rec.impact.includes('High') || rec.impact.includes('high')) {
        score -= 15;
      } else if (rec.impact.includes('Medium') || rec.impact.includes('medium')) {
        score -= 10;
      } else {
        score -= 5;
      }
    }
    return Math.max(0, score);
  }

  private calculateComplianceScore(violations: ComplianceValidation['violations']): number {
    let score = 100;
    score -= violations.length * 10; // Each violation costs 10 points
    return Math.max(0, score);
  }

  private validateGDPR(config: ApplicationConfig, violations: ComplianceValidation['violations']): boolean {
    let compliant = true;

    // Check data retention policies
    if (!config.userDefaults?.privacy?.telemetryEnabled) {
      violations.push({
        standard: 'GDPR',
        requirement: 'User consent for data processing',
        violation: 'No explicit telemetry consent setting',
        remediation: 'Add user consent settings for telemetry'
      });
      compliant = false;
    }

    return compliant;
  }

  private validateHIPAA(config: ApplicationConfig, violations: ComplianceValidation['violations']): boolean {
    let compliant = true;

    // Check encryption requirements
    if (!config.security?.encryptionKey) {
      violations.push({
        standard: 'HIPAA',
        requirement: 'Data encryption at rest',
        violation: 'No encryption key configured',
        remediation: 'Configure encryption for sensitive data'
      });
      compliant = false;
    }

    return compliant;
  }

  private validatePCI(config: ApplicationConfig, violations: ComplianceValidation['violations']): boolean {
    let compliant = true;

    // Check secure defaults
    if (!config.security?.csrfProtection) {
      violations.push({
        standard: 'PCI-DSS',
        requirement: 'Protection against common attacks',
        violation: 'CSRF protection disabled',
        remediation: 'Enable CSRF protection'
      });
      compliant = false;
    }

    return compliant;
  }

  private getByPath(obj: any, path: string): any {
    const keys = path.split('.');
    let current = obj;

    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        return undefined;
      }
    }

    return current;
  }
}

// Supporting interfaces
interface SecurityRule {
  name: string;
  validate: (config: ApplicationConfig) => {
    passed: boolean;
    vulnerabilities: SecurityValidation['vulnerabilities'];
  };
}

interface PerformanceRule {
  name: string;
  validate: (config: ApplicationConfig) => {
    recommendations: PerformanceValidation['recommendations'];
  };
}

interface ComplianceRule {
  standard: string;
  name: string;
  validate: (config: ApplicationConfig) => {
    compliant: boolean;
    violations: ComplianceValidation['violations'];
  };
}

// Export singleton instance
export const configValidator = new ConfigValidator();

// Export utility functions
export async function validateConfiguration(config: ApplicationConfig, environment?: Environment): Promise<ValidationResult> {
  return configValidator.validateConfiguration(config, environment);
}

export function validateSecurity(config: ApplicationConfig): SecurityValidation {
  return configValidator.validateSecurity(config);
}

export function validatePerformance(config: ApplicationConfig): PerformanceValidation {
  return configValidator.validatePerformance(config);
}

export function validateCompliance(config: ApplicationConfig, standards?: string[]): ComplianceValidation {
  return configValidator.validateCompliance(config, standards);
}