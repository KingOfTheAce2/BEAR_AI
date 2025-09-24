/**
 * BEAR AI Licensing System - License Manager
 * Core license management functionality for validation, activation, and enforcement
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { LicenseCrypto } from '../crypto/license.crypto';
import { License, LicenseTier, LicenseStatus, LicenseFeatures, HardwareFingerprint, LicenseValidationResult, LicenseActivationRequest, LicenseActivationResponse, UsageTracking, UsageQuota, SecurityCheckResult, LicenseAuditLog } from '../types/license.types';

export class LicenseManager {
  private static instance: LicenseManager;
  private currentLicense: License | null = null;
  private usageTracking: UsageTracking | null = null;
  private licenseConfig: any;
  private auditLogs: LicenseAuditLog[] = [];

  private readonly LICENSE_FILE_PATH = path.join(os.homedir(), '.bear-ai', 'license.dat');
  private readonly USAGE_FILE_PATH = path.join(os.homedir(), '.bear-ai', 'usage.dat');
  private readonly CONFIG_FILE_PATH = path.join(os.homedir(), '.bear-ai', 'license.config');

  private constructor() {
    this.initializeLicenseDirectory();
    this.loadLicenseConfig();
    this.loadCurrentLicense();
    this.loadUsageTracking();
  }

  static getInstance(): LicenseManager {
    if (!LicenseManager.instance) {
      LicenseManager.instance = new LicenseManager();
    }
    return LicenseManager.instance;
  }

  /**
   * Initialize license directory structure
   */
  private initializeLicenseDirectory(): void {
    const licenseDir = path.dirname(this.LICENSE_FILE_PATH);
    if (!fs.existsSync(licenseDir)) {
      fs.mkdirSync(licenseDir, { recursive: true });
    }
  }

  /**
   * Load license configuration
   */
  private loadLicenseConfig(): void {
    try {
      if (fs.existsSync(this.CONFIG_FILE_PATH)) {
        const configData = fs.readFileSync(this.CONFIG_FILE_PATH, 'utf8');
        this.licenseConfig = JSON.parse(configData);
      } else {
        this.licenseConfig = this.getDefaultConfig();
        this.saveLicenseConfig();
      }
    } catch (error) {
      // Error logging disabled for production
      this.licenseConfig = this.getDefaultConfig();
    }
  }

  /**
   * Get default license configuration
   */
  private getDefaultConfig(): any {
    return {
      publicKey: '', // Will be set during installation
      licenseServerUrl: 'https://licensing.bear-ai.com/api/v1',
      offlineMode: true,
      autoRenewal: false,
      gracePeriodDays: 7,
      maxOfflineDays: 30,
      trial: {
        durationDays: 14,
        extensionAllowed: true,
        requiresRegistration: false
      }
    };
  }

  /**
   * Save license configuration
   */
  private saveLicenseConfig(): void {
    try {
      fs.writeFileSync(this.CONFIG_FILE_PATH, JSON.stringify(this.licenseConfig, null, 2));
    } catch (error) {
      // Error logging disabled for production
    }
  }

  /**
   * Get current hardware fingerprint
   */
  async getHardwareFingerprint(): Promise<HardwareFingerprint> {
    try {
      // Get system information
      const cpuInfo = os.cpus()[0];
      const networkInterfaces = os.networkInterfaces();

      // Extract hardware identifiers
      const cpuId = cpuInfo.model + cpuInfo.speed;
      const osInfo = `${os.type()}-${os.release()}-${os.arch()}`;

      // Get MAC address
      let macAddress = '';
      for (const name of Object.keys(networkInterfaces)) {
        const interfaces = networkInterfaces[name];
        if (!interfaces) {
          continue;
        }

        for (const iface of interfaces) {
          if (!iface.internal && iface.mac && iface.mac !== '00:00:00:00:00:00') {
            macAddress = iface.mac;
            break;
          }
        }

        if (macAddress) break;
      }

      // For production, these would be obtained through platform-specific APIs
      const motherboardSerial = 'MB-' + os.hostname();
      const diskSerial = 'DISK-' + os.hostname();

      const fingerprint = LicenseCrypto.createHardwareFingerprint({
        cpuId,
        motherboardSerial,
        diskSerial,
        macAddress,
        osInfo
      });

      return {
        cpuId,
        motherboardSerial,
        diskSerial,
        macAddress,
        osInfo,
        fingerprint,
        timestamp: Date.now()
      };
    } catch (error) {
      throw new Error(`Failed to generate hardware fingerprint: ${error.message}`);
    }
  }

  /**
   * Load current license from storage
   */
  private loadCurrentLicense(): void {
    try {
      if (fs.existsSync(this.LICENSE_FILE_PATH)) {
        const licenseData = fs.readFileSync(this.LICENSE_FILE_PATH, 'utf8');
        const deobfuscated = LicenseCrypto.deobfuscateLicenseData(licenseData);
        this.currentLicense = JSON.parse(deobfuscated);
      }
    } catch (error) {
      // Error logging disabled for production
      this.currentLicense = null;
    }
  }

  /**
   * Save license to storage
   */
  private saveLicense(license: License): void {
    try {
      const licenseData = JSON.stringify(license);
      const obfuscated = LicenseCrypto.obfuscateLicenseData(licenseData);
      fs.writeFileSync(this.LICENSE_FILE_PATH, obfuscated);
      this.currentLicense = license;
    } catch (error) {
      throw new Error(`Failed to save license: ${error.message}`);
    }
  }

  /**
   * Load usage tracking data
   */
  private loadUsageTracking(): void {
    try {
      if (fs.existsSync(this.USAGE_FILE_PATH)) {
        const usageData = fs.readFileSync(this.USAGE_FILE_PATH, 'utf8');
        this.usageTracking = JSON.parse(usageData);
      } else if (this.currentLicense) {
        this.usageTracking = this.initializeUsageTracking(this.currentLicense.id);
      }
    } catch (error) {
      // Error logging disabled for production
      if (this.currentLicense) {
        this.usageTracking = this.initializeUsageTracking(this.currentLicense.id);
      }
    }
  }

  /**
   * Initialize usage tracking for a license
   */
  private initializeUsageTracking(licenseId: string): UsageTracking {
    const now = Date.now();
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    return {
      licenseId,
      quotas: {
        [LicenseTier.FREE]: {
          modelInvocations: 100,
          documentsProcessed: 10,
          apiCalls: 50,
          storageUsed: 100,
          period: 'monthly',
          resetDate: monthStart.getTime()
        },
        [LicenseTier.PROFESSIONAL]: {
          modelInvocations: 10000,
          documentsProcessed: 1000,
          apiCalls: 5000,
          storageUsed: 10000,
          period: 'monthly',
          resetDate: monthStart.getTime()
        },
        [LicenseTier.ENTERPRISE]: {
          modelInvocations: -1, // Unlimited
          documentsProcessed: -1,
          apiCalls: -1,
          storageUsed: 100000,
          period: 'monthly',
          resetDate: monthStart.getTime()
        },
        [LicenseTier.TRIAL]: {
          modelInvocations: 500,
          documentsProcessed: 50,
          apiCalls: 200,
          storageUsed: 500,
          period: 'monthly',
          resetDate: monthStart.getTime()
        }
      },
      currentUsage: {
        modelInvocations: 0,
        documentsProcessed: 0,
        apiCalls: 0,
        storageUsed: 0,
        period: 'monthly',
        resetDate: monthStart.getTime()
      },
      violations: []
    };
  }

  /**
   * Save usage tracking data
   */
  private saveUsageTracking(): void {
    if (this.usageTracking) {
      try {
        fs.writeFileSync(this.USAGE_FILE_PATH, JSON.stringify(this.usageTracking, null, 2));
      } catch (error) {
        // Error logging disabled for production
      }
    }
  }

  /**
   * Validate current license
   */
  async validateLicense(): Promise<LicenseValidationResult> {
    const result: LicenseValidationResult = {
      isValid: false,
      errors: [],
      warnings: [],
      hardwareMatch: false
    };

    if (!this.currentLicense) {
      result.errors.push('No license found');
      return result;
    }

    try {
      // Perform security checks
      const securityCheck = LicenseCrypto.performSecurityChecks();
      if (!securityCheck.environmentSafe) {
        result.errors.push('Unsafe environment detected');
        this.logAuditEvent('security_check_failed', 'critical', { securityCheck });
      }

      // Verify license signature
      if (!this.licenseConfig.publicKey) {
        result.errors.push('Public key not configured');
        return result;
      }

      const signatureValid = LicenseCrypto.verifyLicense(
        this.currentLicense,
        this.currentLicense.signature,
        this.licenseConfig.publicKey
      );

      if (!signatureValid) {
        result.errors.push('Invalid license signature');
        this.logAuditEvent('signature_validation_failed', 'critical', {
          licenseId: this.currentLicense.id
        });
        return result;
      }

      // Check expiration
      const now = Date.now();
      if (this.currentLicense.expiresAt <= now) {
        result.errors.push('License has expired');
        this.logAuditEvent('license_expired', 'error', {
          licenseId: this.currentLicense.id,
          expiresAt: this.currentLicense.expiresAt
        });
      }

      // Check hardware binding
      const currentHardware = await this.getHardwareFingerprint();
      result.hardwareMatch = currentHardware.fingerprint === this.currentLicense.hardwareBinding.fingerprint;

      if (!result.hardwareMatch) {
        result.errors.push('Hardware fingerprint mismatch');
        this.logAuditEvent('hardware_mismatch', 'warning', {
          licenseId: this.currentLicense.id,
          expected: this.currentLicense.hardwareBinding.fingerprint,
          actual: currentHardware.fingerprint
        });
      }

      // Check license status
      if (this.currentLicense.status !== LicenseStatus.ACTIVE) {
        result.errors.push(`License status: ${this.currentLicense.status}`);
      }

      // Expiration warning (30 days)
      const daysUntilExpiration = Math.floor((this.currentLicense.expiresAt - now) / (24 * 60 * 60 * 1000));
      if (daysUntilExpiration <= 30 && daysUntilExpiration > 0) {
        result.expirationWarning = daysUntilExpiration;
        result.warnings.push(`License expires in ${daysUntilExpiration} days`);
      }

      result.isValid = result.errors.length === 0 && result.hardwareMatch;
      result.license = this.currentLicense;

      // Update last validated timestamp
      this.currentLicense.lastValidated = now;
      this.saveLicense(this.currentLicense);

      this.logAuditEvent('license_validated', 'info', {
        licenseId: this.currentLicense.id,
        isValid: result.isValid,
        errors: result.errors,
        warnings: result.warnings
      });

    } catch (error) {
      result.errors.push(`Validation error: ${error.message}`);
      this.logAuditEvent('validation_error', 'error', { error: error.message });
    }

    return result;
  }

  /**
   * Activate license with activation code
   */
  async activateLicense(activationRequest: LicenseActivationRequest): Promise<LicenseActivationResponse> {
    try {
      // In a real implementation, this would contact the license server
      // For now, we'll simulate offline activation

      const hardwareFingerprint = await this.getHardwareFingerprint();

      // Verify hardware fingerprint matches request
      if (hardwareFingerprint.fingerprint !== activationRequest.hardwareFingerprint.fingerprint) {
        return {
          success: false,
          error: 'Hardware fingerprint mismatch',
          requiresOnlineActivation: false
        };
      }

      // Generate license (in production, this would come from the server)
      const license = this.generateLicense(activationRequest);

      // Save license
      this.saveLicense(license);

      // Initialize usage tracking
      this.usageTracking = this.initializeUsageTracking(license.id);
      this.saveUsageTracking();

      this.logAuditEvent('license_activated', 'info', {
        licenseId: license.id,
        activationCode: activationRequest.activationCode,
        userEmail: activationRequest.userInfo.email
      });

      return {
        success: true,
        license,
        requiresOnlineActivation: false
      };

    } catch (error) {
      this.logAuditEvent('activation_failed', 'error', {
        error: error.message,
        activationCode: activationRequest.activationCode
      });

      return {
        success: false,
        error: error.message,
        requiresOnlineActivation: true
      };
    }
  }

  /**
   * Generate a license (for testing/demo purposes)
   */
  private generateLicense(activationRequest: LicenseActivationRequest): License {
    const now = Date.now();
    const oneYear = 365 * 24 * 60 * 60 * 1000;

    // Determine tier based on activation code (simplified)
    let tier = LicenseTier.PROFESSIONAL;
    if (activationRequest.activationCode.startsWith('ENT-')) {
      tier = LicenseTier.ENTERPRISE;
    } else if (activationRequest.activationCode.startsWith('FREE-')) {
      tier = LicenseTier.FREE;
    }

    const features = this.getFeaturesForTier(tier);

    const license: License = {
      id: LicenseCrypto.generateSecureId(),
      userId: activationRequest.userInfo.email,
      tier,
      status: LicenseStatus.ACTIVE,
      features,
      hardwareBinding: activationRequest.hardwareFingerprint,
      issuedAt: now,
      expiresAt: now + oneYear,
      lastValidated: now,
      activationCode: activationRequest.activationCode,
      signature: '', // Will be set below
      version: '1.0',
      maxTransfers: tier === LicenseTier.ENTERPRISE ? 10 : 3,
      transfersUsed: 0,
      offlineGracePeriod: 30,
      metadata: {
        userInfo: activationRequest.userInfo,
        activatedAt: now
      }
    };

    // Sign the license
    if (this.licenseConfig.privateKey) {
      license.signature = LicenseCrypto.signLicense(license, this.licenseConfig.privateKey);
    }

    return license;
  }

  /**
   * Get features for license tier
   */
  private getFeaturesForTier(tier: LicenseTier): LicenseFeatures {
    const baseFeatures: LicenseFeatures = {
      maxModels: 1,
      maxDocuments: 10,
      maxConcurrentSessions: 1,
      advancedRAG: false,
      multimodalProcessing: false,
      enterpriseSupport: false,
      customModels: false,
      apiAccess: false,
      offlineMode: true,
      analyticsAndReports: false,
      prioritySupport: false,
      customIntegrations: false,
      whiteLabeling: false,
      ssoIntegration: false,
      auditLogs: false
    };

    switch (tier) {
      case LicenseTier.PROFESSIONAL:
        return {
          ...baseFeatures,
          maxModels: 5,
          maxDocuments: 1000,
          maxConcurrentSessions: 3,
          advancedRAG: true,
          multimodalProcessing: true,
          apiAccess: true,
          analyticsAndReports: true,
          prioritySupport: true
        };

      case LicenseTier.ENTERPRISE:
        return {
          ...baseFeatures,
          maxModels: -1, // Unlimited
          maxDocuments: -1,
          maxConcurrentSessions: -1,
          advancedRAG: true,
          multimodalProcessing: true,
          enterpriseSupport: true,
          customModels: true,
          apiAccess: true,
          analyticsAndReports: true,
          prioritySupport: true,
          customIntegrations: true,
          whiteLabeling: true,
          ssoIntegration: true,
          auditLogs: true
        };

      case LicenseTier.TRIAL:
        return {
          ...baseFeatures,
          maxModels: 3,
          maxDocuments: 50,
          maxConcurrentSessions: 2,
          advancedRAG: true,
          multimodalProcessing: true
        };

      default: // FREE
        return baseFeatures;
    }
  }

  /**
   * Check if feature is available
   */
  isFeatureAvailable(feature: keyof LicenseFeatures): boolean {
    if (!this.currentLicense) {
      return false;
    }

    return this.currentLicense.features[feature] === true ||
           (typeof this.currentLicense.features[feature] === 'number' &&
            this.currentLicense.features[feature] > 0);
  }

  /**
   * Check usage quota
   */
  checkUsageQuota(resource: keyof UsageQuota): { allowed: boolean; remaining: number } {
    if (!this.currentLicense || !this.usageTracking) {
      return { allowed: false, remaining: 0 };
    }

    const quota = this.usageTracking.quotas[this.currentLicense.tier];
    const current = this.usageTracking.currentUsage;

    const limit = quota[resource] as number;
    const used = current[resource] as number;

    if (limit === -1) { // Unlimited
      return { allowed: true, remaining: -1 };
    }

    const remaining = Math.max(0, limit - used);
    return { allowed: remaining > 0, remaining };
  }

  /**
   * Track usage
   */
  trackUsage(resource: keyof UsageQuota, amount: number = 1): boolean {
    if (!this.currentLicense || !this.usageTracking) {
      return false;
    }

    const quota = this.checkUsageQuota(resource);
    if (!quota.allowed) {
      this.usageTracking.violations.push({
        type: `quota_exceeded_${resource}`,
        timestamp: Date.now(),
        details: `Attempted to use ${amount} ${resource}, but quota exceeded`
      });
      this.saveUsageTracking();
      return false;
    }

    // Update usage
    (this.usageTracking.currentUsage[resource] as number) += amount;
    this.saveUsageTracking();

    return true;
  }

  /**
   * Get current license
   */
  getCurrentLicense(): License | null {
    return this.currentLicense;
  }

  /**
   * Get usage tracking
   */
  getUsageTracking(): UsageTracking | null {
    return this.usageTracking;
  }

  /**
   * Log audit event
   */
  private logAuditEvent(event: string, severity: 'info' | 'warning' | 'error' | 'critical', details: any): void {
    const auditLog: LicenseAuditLog = {
      timestamp: Date.now(),
      event,
      licenseId: this.currentLicense?.id || 'unknown',
      userId: this.currentLicense?.userId || 'unknown',
      hardwareId: this.currentLicense?.hardwareBinding.fingerprint || 'unknown',
      details,
      severity
    };

    this.auditLogs.push(auditLog);

    // Keep only last 1000 logs
    if (this.auditLogs.length > 1000) {
      this.auditLogs = this.auditLogs.slice(-1000);
    }

    // Logging disabled for production
  }

  /**
   * Get audit logs
   */
  getAuditLogs(): LicenseAuditLog[] {
    return [...this.auditLogs];
  }

  /**
   * Reset trial (for testing)
   */
  resetTrial(): void {
    if (this.currentLicense && this.currentLicense.tier === LicenseTier.TRIAL) {
      const now = Date.now();
      const trialDuration = this.licenseConfig.trial.durationDays * 24 * 60 * 60 * 1000;

      this.currentLicense.issuedAt = now;
      this.currentLicense.expiresAt = now + trialDuration;
      this.currentLicense.status = LicenseStatus.ACTIVE;

      this.saveLicense(this.currentLicense);

      if (this.usageTracking) {
        this.usageTracking.currentUsage = this.initializeUsageTracking(this.currentLicense.id).currentUsage;
        this.saveUsageTracking();
      }

      this.logAuditEvent('trial_reset', 'info', { licenseId: this.currentLicense.id });
    }
  }
}
