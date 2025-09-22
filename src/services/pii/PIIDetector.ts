import { createHash } from 'crypto';
import { LegalPIIPatterns } from './LegalPIIPatterns';
import { DutchComplianceValidator } from './DutchComplianceValidator';

export interface PIIMatch {
  type: PIIType;
  text: string;
  start: number;
  end: number;
  confidence: number;
  hash: string;
  isLegalPrivileged?: boolean;
  country?: string;
}

export interface PIIDetectionResult {
  hasPII: boolean;
  matches: PIIMatch[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  suggestions: string[];
  auditHash: string;
}

export enum PIIType {
  // Personal Identifiers
  SSN = 'ssn',
  CREDIT_CARD = 'credit_card',
  EMAIL = 'email',
  PHONE = 'phone',
  ADDRESS = 'address',

  // Legal Industry Specific
  CASE_NUMBER = 'case_number',
  COURT_NAME = 'court_name',
  ATTORNEY_NAME = 'attorney_name',
  ATTORNEY_CLIENT_PRIVILEGE = 'attorney_client_privilege',
  DOCKET_NUMBER = 'docket_number',
  BAR_NUMBER = 'bar_number',

  // Dutch Compliance
  BSN = 'bsn',
  RSIN = 'rsin',
  DUTCH_PASSPORT = 'dutch_passport',
  DUTCH_ID = 'dutch_id',

  // Financial
  IBAN = 'iban',
  BANK_ACCOUNT = 'bank_account',

  // Medical
  PATIENT_ID = 'patient_id',
  MEDICAL_RECORD = 'medical_record',

  // Generic
  CUSTOM = 'custom'
}

export interface PIIDetectorConfig {
  enableRealTime: boolean;
  sensitivity: 'low' | 'medium' | 'high';
  enableLegalPatterns: boolean;
  enableDutchCompliance: boolean;
  customPatterns: { name: string; pattern: RegExp; type: PIIType }[];
  whitelistedTerms: string[];
  enableAuditLogging: boolean;
  hashSalt: string;
}

export class PIIDetector {
  private config: PIIDetectorConfig;
  private legalPatterns: LegalPIIPatterns;
  private dutchValidator: DutchComplianceValidator;
  private auditLog: PIIMatch[] = [];

  constructor(config: Partial<PIIDetectorConfig> = {}) {
    this.config = {
      enableRealTime: true,
      sensitivity: 'high',
      enableLegalPatterns: true,
      enableDutchCompliance: true,
      customPatterns: [],
      whitelistedTerms: [],
      enableAuditLogging: true,
      hashSalt: 'bear-ai-pii-salt',
      ...config
    };

    this.legalPatterns = new LegalPIIPatterns();
    this.dutchValidator = new DutchComplianceValidator();
  }

  /**
   * Main PII detection method
   */
  public async detectPII(text: string, context?: { fileType?: string; source?: string }): Promise<PIIDetectionResult> {
    const matches: PIIMatch[] = [];

    // Core PII patterns
    matches.push(...this.detectCorePII(text));

    // Legal industry patterns
    if (this.config.enableLegalPatterns) {
      matches.push(...this.detectLegalPII(text));
    }

    // Dutch compliance patterns
    if (this.config.enableDutchCompliance) {
      matches.push(...await this.detectDutchPII(text));
    }

    // Custom patterns
    matches.push(...this.detectCustomPatterns(text));

    // Filter out whitelisted terms
    const filteredMatches = this.filterWhitelistedTerms(matches);

    // Calculate risk level
    const riskLevel = this.calculateRiskLevel(filteredMatches);

    // Generate suggestions
    const suggestions = this.generateSuggestions(filteredMatches);

    // Create audit hash
    const auditHash = this.createAuditHash(text, filteredMatches);

    // Log for audit if enabled
    if (this.config.enableAuditLogging) {
      this.logForAudit(filteredMatches, context);
    }

    return {
      hasPII: filteredMatches.length > 0,
      matches: filteredMatches,
      riskLevel,
      suggestions,
      auditHash
    };
  }

  /**
   * Real-time PII detection for chat input
   */
  public detectPIIRealTime(text: string): PIIMatch[] {
    if (!this.config.enableRealTime || text.length < 3) {
      return [];
    }

    const matches: PIIMatch[] = [];

    // Quick patterns for real-time (performance optimized)
    matches.push(...this.detectQuickPatterns(text));

    return this.filterWhitelistedTerms(matches);
  }

  /**
   * Detect core PII patterns
   */
  private detectCorePII(text: string): PIIMatch[] {
    const matches: PIIMatch[] = [];

    // SSN Pattern (XXX-XX-XXXX)
    const ssnPattern = /\b\d{3}-\d{2}-\d{4}\b/g;
    matches.push(...this.findMatches(text, ssnPattern, PIIType.SSN, 0.9));

    // Credit Card Pattern
    const ccPattern = /\b(?:\d{4}[-\s]?){3}\d{4}\b/g;
    matches.push(...this.findMatches(text, ccPattern, PIIType.CREDIT_CARD, 0.85));

    // Email Pattern
    const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    matches.push(...this.findMatches(text, emailPattern, PIIType.EMAIL, 0.95));

    // Phone Pattern (various formats)
    const phonePattern = /(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/g;
    matches.push(...this.findMatches(text, phonePattern, PIIType.PHONE, 0.8));

    // IBAN Pattern
    const ibanPattern = /\b[A-Z]{2}\d{2}[A-Z0-9]{4}\d{7}([A-Z0-9]?){0,16}\b/g;
    matches.push(...this.findMatches(text, ibanPattern, PIIType.IBAN, 0.9));

    return matches;
  }

  /**
   * Detect legal industry specific PII
   */
  private detectLegalPII(text: string): PIIMatch[] {
    const matches: PIIMatch[] = [];

    // Use legal patterns service
    const legalMatches = this.legalPatterns.detectLegalPII(text);

    legalMatches.forEach(match => {
      matches.push({
        ...match,
        hash: this.hashSensitiveData(match.text),
        isLegalPrivileged: match.type === PIIType.ATTORNEY_CLIENT_PRIVILEGE
      });
    });

    return matches;
  }

  /**
   * Detect Dutch compliance PII
   */
  private async detectDutchPII(text: string): Promise<PIIMatch[]> {
    const matches: PIIMatch[] = [];

    // BSN Pattern with validation
    const bsnPattern = /\b\d{9}\b/g;
    const bsnCandidates = this.findMatches(text, bsnPattern, PIIType.BSN, 0.7);

    for (const candidate of bsnCandidates) {
      if (this.dutchValidator.validateBSN(candidate.text)) {
        matches.push({
          ...candidate,
          confidence: 0.95,
          country: 'NL',
          hash: this.hashSensitiveData(candidate.text)
        });
      }
    }

    // RSIN Pattern with validation
    const rsinPattern = /\b\d{9}B\d{2}\b/g;
    const rsinCandidates = this.findMatches(text, rsinPattern, PIIType.RSIN, 0.7);

    for (const candidate of rsinCandidates) {
      const rsinNumber = candidate.text.slice(0, 9);
      if (this.dutchValidator.validateRSIN(rsinNumber)) {
        matches.push({
          ...candidate,
          confidence: 0.95,
          country: 'NL',
          hash: this.hashSensitiveData(candidate.text)
        });
      }
    }

    return matches;
  }

  /**
   * Detect custom patterns
   */
  private detectCustomPatterns(text: string): PIIMatch[] {
    const matches: PIIMatch[] = [];

    this.config.customPatterns.forEach(customPattern => {
      matches.push(...this.findMatches(text, customPattern.pattern, customPattern.type, 0.8));
    });

    return matches;
  }

  /**
   * Quick patterns for real-time detection
   */
  private detectQuickPatterns(text: string): PIIMatch[] {
    const matches: PIIMatch[] = [];

    // Quick email check
    if (text.includes('@') && text.includes('.')) {
      const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
      matches.push(...this.findMatches(text, emailPattern, PIIType.EMAIL, 0.95));
    }

    // Quick phone check
    if (/\d{3}.*\d{3}.*\d{4}/.test(text)) {
      const phonePattern = /(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/g;
      matches.push(...this.findMatches(text, phonePattern, PIIType.PHONE, 0.8));
    }

    // Quick SSN check
    if (/\d{3}-\d{2}-\d{4}/.test(text)) {
      const ssnPattern = /\b\d{3}-\d{2}-\d{4}\b/g;
      matches.push(...this.findMatches(text, ssnPattern, PIIType.SSN, 0.9));
    }

    return matches;
  }

  /**
   * Find pattern matches in text
   */
  private findMatches(text: string, pattern: RegExp, type: PIIType, confidence: number): PIIMatch[] {
    const matches: PIIMatch[] = [];
    let match;

    while ((match = pattern.exec(text)) !== null) {
      matches.push({
        type,
        text: match[0],
        start: match.index,
        end: match.index + match[0].length,
        confidence,
        hash: this.hashSensitiveData(match[0])
      });
    }

    return matches;
  }

  /**
   * Filter out whitelisted terms
   */
  private filterWhitelistedTerms(matches: PIIMatch[]): PIIMatch[] {
    return matches.filter(match =>
      !this.config.whitelistedTerms.some(term =>
        match.text.toLowerCase().includes(term.toLowerCase())
      )
    );
  }

  /**
   * Calculate risk level based on matches
   */
  private calculateRiskLevel(matches: PIIMatch[]): 'low' | 'medium' | 'high' | 'critical' {
    if (matches.length === 0) return 'low';

    const hasLegalPrivileged = matches.some(m => m.isLegalPrivileged);
    const hasHighConfidenceMatches = matches.some(m => m.confidence > 0.9);
    const hasMultipleTypes = new Set(matches.map(m => m.type)).size > 2;

    if (hasLegalPrivileged) return 'critical';
    if (hasHighConfidenceMatches && hasMultipleTypes) return 'high';
    if (hasHighConfidenceMatches || matches.length > 3) return 'medium';

    return 'low';
  }

  /**
   * Generate suggestions for PII handling
   */
  private generateSuggestions(matches: PIIMatch[]): string[] {
    const suggestions: string[] = [];

    if (matches.length === 0) return suggestions;

    const types = new Set(matches.map(m => m.type));

    if (types.has(PIIType.ATTORNEY_CLIENT_PRIVILEGE)) {
      suggestions.push('⚠️ Attorney-client privileged content detected. Consider removing or marking as confidential.');
    }

    if (types.has(PIIType.SSN)) {
      suggestions.push('Social Security Number detected. Consider masking or removing.');
    }

    if (types.has(PIIType.CREDIT_CARD)) {
      suggestions.push('Credit card number detected. This should be removed immediately.');
    }

    if (types.has(PIIType.BSN)) {
      suggestions.push('Dutch BSN detected. Ensure GDPR compliance for processing.');
    }

    if (matches.length > 5) {
      suggestions.push('Multiple PII elements detected. Consider reviewing entire content.');
    }

    suggestions.push('Consider using anonymization or pseudonymization techniques.');

    return suggestions;
  }

  /**
   * Create SHA256 hash for audit trail
   */
  private hashSensitiveData(data: string): string {
    return createHash('sha256')
      .update(data + this.config.hashSalt)
      .digest('hex');
  }

  /**
   * Create audit hash for the entire detection result
   */
  private createAuditHash(text: string, matches: PIIMatch[]): string {
    const auditData = {
      textLength: text.length,
      matchCount: matches.length,
      types: matches.map(m => m.type),
      timestamp: new Date().toISOString()
    };

    return createHash('sha256')
      .update(JSON.stringify(auditData) + this.config.hashSalt)
      .digest('hex');
  }

  /**
   * Log matches for GDPR audit trail
   */
  private logForAudit(matches: PIIMatch[], context?: { fileType?: string; source?: string }): void {
    const auditEntry = {
      timestamp: new Date().toISOString(),
      matchCount: matches.length,
      types: matches.map(m => m.type),
      hashes: matches.map(m => m.hash),
      riskLevel: this.calculateRiskLevel(matches),
      context
    };

    // Store in audit log (could be sent to logging service)
    this.auditLog.push(...matches);

    // Keep only last 1000 entries for performance
    if (this.auditLog.length > 1000) {
      this.auditLog = this.auditLog.slice(-1000);
    }
  }

  /**
   * Get audit log (for compliance reporting)
   */
  public getAuditLog(): PIIMatch[] {
    return [...this.auditLog];
  }

  /**
   * Clear audit log
   */
  public clearAuditLog(): void {
    this.auditLog = [];
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<PIIDetectorConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  public getConfig(): PIIDetectorConfig {
    return { ...this.config };
  }
}

export default PIIDetector;