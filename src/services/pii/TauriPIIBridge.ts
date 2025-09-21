import { invoke } from '@tauri-apps/api/tauri';
import { PIIDetectionResult, PIIMatch, PIIDetectorConfig } from './PIIDetector';

export interface TauriPIIMatch {
  pii_type: string;
  text: string;
  start: number;
  end: number;
  confidence: number;
  hash: string;
  is_legal_privileged?: boolean;
  country?: string;
}

export interface TauriPIIDetectionResult {
  has_pii: boolean;
  matches: TauriPIIMatch[];
  risk_level: string;
  suggestions: string[];
  audit_hash: string;
}

export interface TauriPIIDetectorConfig {
  enable_real_time: boolean;
  sensitivity: string;
  enable_legal_patterns: boolean;
  enable_dutch_compliance: boolean;
  enable_audit_logging: boolean;
  hash_salt: string;
}

/**
 * Tauri-Rust PII Bridge for enhanced performance
 * Falls back to TypeScript implementation if Tauri is not available
 */
export class TauriPIIBridge {
  private static isAvailable: boolean | null = null;

  /**
   * Check if Tauri PII detection is available
   */
  static async checkAvailability(): Promise&lt;boolean&gt; {
    if (this.isAvailable !== null) {
      return this.isAvailable;
    }

    try {
      // Test if we can invoke a Tauri command
      await invoke('detect_pii_rust', { text: 'test', config: null });
      this.isAvailable = true;
      return true;
    } catch (error) {
      console.warn('Tauri PII detection not available, falling back to TypeScript implementation');
      this.isAvailable = false;
      return false;
    }
  }

  /**
   * Detect PII using Rust backend
   */
  static async detectPII(text: string, config?: Partial&lt;PIIDetectorConfig&gt;): Promise&lt;PIIDetectionResult&gt; {
    const isAvailable = await this.checkAvailability();

    if (!isAvailable) {
      throw new Error('Tauri PII detection not available');
    }

    try {
      const tauriConfig: TauriPIIDetectorConfig | null = config ? {
        enable_real_time: config.enableRealTime ?? true,
        sensitivity: config.sensitivity ?? 'high',
        enable_legal_patterns: config.enableLegalPatterns ?? true,
        enable_dutch_compliance: config.enableDutchCompliance ?? true,
        enable_audit_logging: config.enableAuditLogging ?? true,
        hash_salt: config.hashSalt ?? 'bear-ai-pii-salt'
      } : null;

      const result: TauriPIIDetectionResult = await invoke('detect_pii_rust', {
        text,
        config: tauriConfig
      });

      return this.convertTauriResult(result);
    } catch (error) {
      console.error('Tauri PII detection error:', error);
      throw error;
    }
  }

  /**
   * Mask PII text using Rust backend
   */
  static async maskText(text: string, matches: PIIMatch[]): Promise&lt;string&gt; {
    const isAvailable = await this.checkAvailability();

    if (!isAvailable) {
      throw new Error('Tauri PII masking not available');
    }

    try {
      const tauriMatches: TauriPIIMatch[] = matches.map(match => ({
        pii_type: match.type.toString(),
        text: match.text,
        start: match.start,
        end: match.end,
        confidence: match.confidence,
        hash: match.hash,
        is_legal_privileged: match.isLegalPrivileged,
        country: match.country
      }));

      const result: string = await invoke('mask_pii_text', {
        text,
        matches: tauriMatches
      });

      return result;
    } catch (error) {
      console.error('Tauri PII masking error:', error);
      throw error;
    }
  }

  /**
   * Validate Dutch BSN using Rust backend
   */
  static async validateDutchBSN(bsn: string): Promise&lt;boolean&gt; {
    const isAvailable = await this.checkAvailability();

    if (!isAvailable) {
      throw new Error('Tauri Dutch BSN validation not available');
    }

    try {
      const result: boolean = await invoke('validate_dutch_bsn', { bsn });
      return result;
    } catch (error) {
      console.error('Tauri BSN validation error:', error);
      throw error;
    }
  }

  /**
   * Validate Dutch RSIN using Rust backend
   */
  static async validateDutchRSIN(rsin: string): Promise&lt;boolean&gt; {
    const isAvailable = await this.checkAvailability();

    if (!isAvailable) {
      throw new Error('Tauri Dutch RSIN validation not available');
    }

    try {
      const result: boolean = await invoke('validate_dutch_rsin', { rsin });
      return result;
    } catch (error) {
      console.error('Tauri RSIN validation error:', error);
      throw error;
    }
  }

  /**
   * Get PII audit log from Rust backend
   */
  static async getAuditLog(): Promise&lt;PIIMatch[]&gt; {
    const isAvailable = await this.checkAvailability();

    if (!isAvailable) {
      throw new Error('Tauri PII audit log not available');
    }

    try {
      const result: TauriPIIMatch[] = await invoke('get_pii_audit_log');
      return result.map(match => this.convertTauriMatch(match));
    } catch (error) {
      console.error('Tauri audit log error:', error);
      throw error;
    }
  }

  /**
   * Export PII audit log from Rust backend
   */
  static async exportAuditLog(): Promise&lt;string&gt; {
    const isAvailable = await this.checkAvailability();

    if (!isAvailable) {
      throw new Error('Tauri PII audit export not available');
    }

    try {
      const result: string = await invoke('export_pii_audit_log');
      return result;
    } catch (error) {
      console.error('Tauri audit export error:', error);
      throw error;
    }
  }

  /**
   * Process document for PII using Rust backend
   */
  static async processDocument(
    content: string,
    filename: string,
    config?: Partial&lt;PIIDetectorConfig&gt;
  ): Promise&lt;{
    originalContent: string;
    scanResult: PIIDetectionResult;
    shouldBlock: boolean;
    redactedContent?: string;
    filename: string;
    processedAt: string;
  }&gt; {
    const isAvailable = await this.checkAvailability();

    if (!isAvailable) {
      throw new Error('Tauri document PII processing not available');
    }

    try {
      const tauriConfig: TauriPIIDetectorConfig | null = config ? {
        enable_real_time: config.enableRealTime ?? true,
        sensitivity: config.sensitivity ?? 'high',
        enable_legal_patterns: config.enableLegalPatterns ?? true,
        enable_dutch_compliance: config.enableDutchCompliance ?? true,
        enable_audit_logging: config.enableAuditLogging ?? true,
        hash_salt: config.hashSalt ?? 'bear-ai-pii-salt'
      } : null;

      const result: any = await invoke('process_document_pii', {
        content,
        filename,
        config: tauriConfig
      });

      return {
        originalContent: result.original_content,
        scanResult: this.convertTauriResult(result.scan_result),
        shouldBlock: result.should_block,
        redactedContent: result.redacted_content,
        filename: result.filename,
        processedAt: result.processed_at
      };
    } catch (error) {
      console.error('Tauri document processing error:', error);
      throw error;
    }
  }

  /**
   * Convert Tauri result to TypeScript interface
   */
  private static convertTauriResult(tauriResult: TauriPIIDetectionResult): PIIDetectionResult {
    return {
      hasPII: tauriResult.has_pii,
      matches: tauriResult.matches.map(match => this.convertTauriMatch(match)),
      riskLevel: this.convertRiskLevel(tauriResult.risk_level),
      suggestions: tauriResult.suggestions,
      auditHash: tauriResult.audit_hash
    };
  }

  /**
   * Convert Tauri match to TypeScript interface
   */
  private static convertTauriMatch(tauriMatch: TauriPIIMatch): PIIMatch {
    return {
      type: this.convertPIIType(tauriMatch.pii_type),
      text: tauriMatch.text,
      start: tauriMatch.start,
      end: tauriMatch.end,
      confidence: tauriMatch.confidence,
      hash: tauriMatch.hash,
      isLegalPrivileged: tauriMatch.is_legal_privileged,
      country: tauriMatch.country
    };
  }

  /**
   * Convert Tauri PII type string to enum
   */
  private static convertPIIType(tauriType: string): import('./PIIDetector').PIIType {
    const { PIIType } = require('./PIIDetector');

    const typeMap: Record&lt;string, import('./PIIDetector').PIIType&gt; = {
      'ssn': PIIType.SSN,
      'credit_card': PIIType.CREDIT_CARD,
      'email': PIIType.EMAIL,
      'phone': PIIType.PHONE,
      'address': PIIType.ADDRESS,
      'case_number': PIIType.CASE_NUMBER,
      'court_name': PIIType.COURT_NAME,
      'attorney_name': PIIType.ATTORNEY_NAME,
      'attorney_client_privilege': PIIType.ATTORNEY_CLIENT_PRIVILEGE,
      'docket_number': PIIType.DOCKET_NUMBER,
      'bar_number': PIIType.BAR_NUMBER,
      'bsn': PIIType.BSN,
      'rsin': PIIType.RSIN,
      'dutch_passport': PIIType.DUTCH_PASSPORT,
      'dutch_id': PIIType.DUTCH_ID,
      'iban': PIIType.IBAN,
      'bank_account': PIIType.BANK_ACCOUNT,
      'patient_id': PIIType.PATIENT_ID,
      'medical_record': PIIType.MEDICAL_RECORD,
      'custom': PIIType.CUSTOM
    };

    return typeMap[tauriType] || PIIType.CUSTOM;
  }

  /**
   * Convert Tauri risk level to TypeScript type
   */
  private static convertRiskLevel(tauriLevel: string): 'low' | 'medium' | 'high' | 'critical' {
    const levelMap: Record&lt;string, 'low' | 'medium' | 'high' | 'critical'&gt; = {
      'low': 'low',
      'medium': 'medium',
      'high': 'high',
      'critical': 'critical'
    };

    return levelMap[tauriLevel] || 'low';
  }

  /**
   * Benchmark performance between Rust and TypeScript implementations
   */
  static async benchmarkPerformance(text: string, iterations: number = 100): Promise&lt;{
    rustTime: number;
    tsTime: number;
    speedupFactor: number;
    recommendation: string;
  }&gt; {
    const isAvailable = await this.checkAvailability();

    if (!isAvailable) {
      throw new Error('Tauri benchmarking not available');
    }

    // Benchmark Rust implementation
    const rustStart = performance.now();
    for (let i = 0; i < iterations; i++) {
      await this.detectPII(text);
    }
    const rustTime = performance.now() - rustStart;

    // Benchmark TypeScript implementation (would need to import)
    const { PIIDetector } = await import('./PIIDetector');
    const tsDetector = new PIIDetector();

    const tsStart = performance.now();
    for (let i = 0; i < iterations; i++) {
      await tsDetector.detectPII(text);
    }
    const tsTime = performance.now() - tsStart;

    const speedupFactor = tsTime / rustTime;
    const recommendation = speedupFactor > 1.5
      ? 'Use Rust implementation for better performance'
      : 'TypeScript implementation is sufficient';

    return {
      rustTime,
      tsTime,
      speedupFactor,
      recommendation
    };
  }
}

export default TauriPIIBridge;