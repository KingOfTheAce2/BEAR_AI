import { PIIDetector, PIIDetectionResult, PIIMatch, PIIDetectorConfig } from './PIIDetector';
import { TauriPIIBridge } from './TauriPIIBridge';

/**
 * Hybrid PII Detector that automatically switches between Rust and TypeScript implementations
 * based on availability and performance characteristics
 */
export class HybridPIIDetector {
  private tsDetector: PIIDetector;
  private preferRust: boolean = true;
  private rustAvailable: boolean | null = null;

  constructor(config: Partial<PIIDetectorConfig> = {}) {
    this.tsDetector = new PIIDetector(config);
  }

  /**
   * Check if Rust backend is available
   */
  private async checkRustAvailability(): Promise<boolean> {
    if (this.rustAvailable !== null) {
      return this.rustAvailable;
    }

    try {
      this.rustAvailable = await TauriPIIBridge.checkAvailability();
      return this.rustAvailable;
    } catch (error) {
      this.rustAvailable = false;
      return false;
    }
  }

  /**
   * Main PII detection method with automatic fallback
   */
  public async detectPII(text: string, context?: { fileType?: string; source?: string }): Promise<PIIDetectionResult> {
    // For small texts or when Rust is not preferred, use TypeScript
    if (!this.preferRust || text.length < 100) {
      return this.tsDetector.detectPII(text, context);
    }

    // Try Rust implementation first
    const rustAvailable = await this.checkRustAvailability();

    if (rustAvailable) {
      try {
        const config = this.tsDetector.getConfig();
        return await TauriPIIBridge.detectPII(text, config);
      } catch (error) {
        console.warn('Rust PII detection failed, falling back to TypeScript:', error);
        // Fall back to TypeScript implementation
        return this.tsDetector.detectPII(text, context);
      }
    }

    // Use TypeScript implementation
    return this.tsDetector.detectPII(text, context);
  }

  /**
   * Real-time PII detection (always uses TypeScript for low latency)
   */
  public detectPIIRealTime(text: string): PIIMatch[] {
    return this.tsDetector.detectPIIRealTime(text);
  }

  /**
   * Mask text with hybrid backend selection
   */
  public async maskText(text: string, matches: PIIMatch[]): Promise<string> {
    const rustAvailable = await this.checkRustAvailability();

    if (rustAvailable && this.preferRust) {
      try {
        return await TauriPIIBridge.maskText(text, matches);
      } catch (error) {
        console.warn('Rust text masking failed, falling back to TypeScript:', error);
      }
    }

    return this.tsDetector.maskText(text, matches);
  }

  /**
   * Validate Dutch BSN with hybrid backend selection
   */
  public async validateDutchBSN(bsn: string): Promise<boolean> {
    const rustAvailable = await this.checkRustAvailability();

    if (rustAvailable && this.preferRust) {
      try {
        return await TauriPIIBridge.validateDutchBSN(bsn);
      } catch (error) {
        console.warn('Rust BSN validation failed, falling back to TypeScript:', error);
      }
    }

    // Fall back to TypeScript implementation
    const { DutchComplianceValidator } = await import('./DutchComplianceValidator');
    const validator = new DutchComplianceValidator();
    return validator.validateBSN(bsn);
  }

  /**
   * Validate Dutch RSIN with hybrid backend selection
   */
  public async validateDutchRSIN(rsin: string): Promise<boolean> {
    const rustAvailable = await this.checkRustAvailability();

    if (rustAvailable && this.preferRust) {
      try {
        return await TauriPIIBridge.validateDutchRSIN(rsin);
      } catch (error) {
        console.warn('Rust RSIN validation failed, falling back to TypeScript:', error);
      }
    }

    // Fall back to TypeScript implementation
    const { DutchComplianceValidator } = await import('./DutchComplianceValidator');
    const validator = new DutchComplianceValidator();
    return validator.validateRSIN(rsin);
  }

  /**
   * Get audit log with hybrid backend selection
   */
  public async getAuditLog(): Promise<PIIMatch[]> {
    const rustAvailable = await this.checkRustAvailability();

    if (rustAvailable && this.preferRust) {
      try {
        return await TauriPIIBridge.getAuditLog();
      } catch (error) {
        console.warn('Rust audit log retrieval failed, falling back to TypeScript:', error);
      }
    }

    return this.tsDetector.getAuditLog();
  }

  /**
   * Export audit log with hybrid backend selection
   */
  public async exportAuditLog(): Promise<string> {
    const rustAvailable = await this.checkRustAvailability();

    if (rustAvailable && this.preferRust) {
      try {
        return await TauriPIIBridge.exportAuditLog();
      } catch (error) {
        console.warn('Rust audit log export failed, falling back to TypeScript:', error);
      }
    }

    const auditLog = this.tsDetector.getAuditLog();
    const exportData = {
      exportDate: new Date().toISOString(),
      totalEntries: auditLog.length,
      entries: auditLog.map(entry => ({
        type: entry.type,
        hash: entry.hash,
        confidence: entry.confidence,
        isLegalPrivileged: entry.isLegalPrivileged,
        country: entry.country
      }))
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Process document with optimal backend selection
   */
  public async processDocument(
    content: string,
    filename: string
  ): Promise<{
    originalContent: string;
    scanResult: PIIDetectionResult;
    shouldBlock: boolean;
    redactedContent?: string;
    filename: string;
    processedAt: string;
  }> {
    const rustAvailable = await this.checkRustAvailability();

    // For large documents, prefer Rust for better performance
    if (rustAvailable && this.preferRust && content.length > 1000) {
      try {
        const config = this.tsDetector.getConfig();
        return await TauriPIIBridge.processDocument(content, filename, config);
      } catch (error) {
        console.warn('Rust document processing failed, falling back to TypeScript:', error);
      }
    }

    // Fall back to TypeScript implementation
    const scanResult = await this.tsDetector.detectPII(content);
    const shouldBlock = scanResult.riskLevel === 'critical' ||
                       (scanResult.riskLevel === 'high' && scanResult.matches.length > 5);

    let redactedContent: string | undefined;
    if (scanResult.hasPII) {
      redactedContent = this.tsDetector.maskText(content, scanResult.matches);
    }

    const baseResult = {
      originalContent: content,
      scanResult,
      shouldBlock,
      filename,
      processedAt: new Date().toISOString()
    };

    if (redactedContent !== undefined) {
      return {
        ...baseResult,
        redactedContent
      };
    }

    return baseResult;
  }

  /**
   * Benchmark performance between implementations
   */
  public async benchmarkPerformance(text: string): Promise<{
    rustTime?: number;
    tsTime: number;
    speedupFactor?: number;
    recommendation: string;
    rustAvailable: boolean;
  }> {
    const rustAvailable = await this.checkRustAvailability();

    // Benchmark TypeScript
    const tsStart = performance.now();
    await this.tsDetector.detectPII(text);
    const tsTime = performance.now() - tsStart;

    if (!rustAvailable) {
      return {
        tsTime,
        recommendation: 'Only TypeScript implementation available',
        rustAvailable: false
      };
    }

    try {
      // Benchmark Rust
      const rustStart = performance.now();
      const config = this.tsDetector.getConfig();
      await TauriPIIBridge.detectPII(text, config);
      const rustTime = performance.now() - rustStart;

      const speedupFactor = tsTime / rustTime;
      const recommendation = speedupFactor > 1.5
        ? `Rust is ${speedupFactor.toFixed(2)}x faster - recommended for large texts`
        : speedupFactor > 0.8
        ? 'Performance is similar - either implementation is fine'
        : 'TypeScript is faster for this text size';

      return {
        rustTime,
        tsTime,
        speedupFactor,
        recommendation,
        rustAvailable: true
      };
    } catch (error) {
      return {
        tsTime,
        recommendation: 'Rust benchmarking failed - using TypeScript only',
        rustAvailable: false
      };
    }
  }

  /**
   * Set backend preference
   */
  public setRustPreference(prefer: boolean): void {
    this.preferRust = prefer;
  }

  /**
   * Get current backend status
   */
  public async getBackendStatus(): Promise<{
    rustAvailable: boolean;
    preferRust: boolean;
    currentBackend: 'rust' | 'typescript';
  }> {
    const rustAvailable = await this.checkRustAvailability();
    const currentBackend = (rustAvailable && this.preferRust) ? 'rust' : 'typescript';

    return {
      rustAvailable,
      preferRust: this.preferRust,
      currentBackend
    };
  }

  /**
   * Update configuration for both backends
   */
  public updateConfig(config: Partial<PIIDetectorConfig>): void {
    this.tsDetector.updateConfig(config);
    // Rust backend will use config when called
  }

  /**
   * Get current configuration
   */
  public getConfig(): PIIDetectorConfig {
    return this.tsDetector.getConfig();
  }

  /**
   * Clear audit logs in both backends
   */
  public clearAuditLog(): void {
    this.tsDetector.clearAuditLog();
    // Note: Rust backend audit log clearing would need to be implemented
  }

  /**
   * Force refresh of Rust availability check
   */
  public async refreshRustAvailability(): Promise<boolean> {
    this.rustAvailable = null;
    return this.checkRustAvailability();
  }
}

export default HybridPIIDetector;