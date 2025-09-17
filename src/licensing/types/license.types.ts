/**
 * BEAR AI Licensing System - Type Definitions
 * Comprehensive type definitions for licensing, tiers, and hardware fingerprinting
 */

export interface HardwareFingerprint {
  cpuId: string;
  motherboardSerial: string;
  diskSerial: string;
  macAddress: string;
  osInfo: string;
  fingerprint: string; // Combined hash
  timestamp: number;
}

export interface LicenseFeatures {
  maxModels: number;
  maxDocuments: number;
  maxConcurrentSessions: number;
  advancedRAG: boolean;
  multimodalProcessing: boolean;
  enterpriseSupport: boolean;
  customModels: boolean;
  apiAccess: boolean;
  offlineMode: boolean;
  analyticsAndReports: boolean;
  prioritySupport: boolean;
  customIntegrations: boolean;
  whiteLabeling: boolean;
  ssoIntegration: boolean;
  auditLogs: boolean;
}

export enum LicenseTier {
  FREE = 'free',
  PROFESSIONAL = 'professional',
  ENTERPRISE = 'enterprise',
  TRIAL = 'trial'
}

export enum LicenseStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  SUSPENDED = 'suspended',
  INVALID = 'invalid',
  TRIAL_EXPIRED = 'trial_expired'
}

export interface License {
  id: string;
  userId: string;
  tier: LicenseTier;
  status: LicenseStatus;
  features: LicenseFeatures;
  hardwareBinding: HardwareFingerprint;
  issuedAt: number;
  expiresAt: number;
  lastValidated: number;
  activationCode: string;
  signature: string;
  version: string;
  maxTransfers: number;
  transfersUsed: number;
  offlineGracePeriod: number; // days
  metadata: Record<string, any>;
}

export interface UsageQuota {
  modelInvocations: number;
  documentsProcessed: number;
  apiCalls: number;
  storageUsed: number; // MB
  period: 'daily' | 'monthly' | 'yearly';
  resetDate: number;
}

export interface UsageTracking {
  licenseId: string;
  quotas: Record<LicenseTier, UsageQuota>;
  currentUsage: UsageQuota;
  violations: Array<{
    type: string;
    timestamp: number;
    details: string;
  }>;
}

export interface LicenseValidationResult {
  isValid: boolean;
  license?: License;
  errors: string[];
  warnings: string[];
  hardwareMatch: boolean;
  expirationWarning?: number; // days until expiration
}

export interface LicenseActivationRequest {
  activationCode: string;
  hardwareFingerprint: HardwareFingerprint;
  userInfo: {
    email: string;
    name: string;
    organization?: string;
  };
}

export interface LicenseActivationResponse {
  success: boolean;
  license?: License;
  error?: string;
  requiresOnlineActivation: boolean;
}

export interface LicenseTransferRequest {
  licenseId: string;
  fromHardware: HardwareFingerprint;
  toHardware: HardwareFingerprint;
  reason: string;
}

export interface LicenseConfig {
  publicKey: string;
  privateKey?: string; // Only for license generation
  licenseServerUrl?: string;
  offlineMode: boolean;
  autoRenewal: boolean;
  gracePeriodDays: number;
  maxOfflineDays: number;
}

export interface TrialConfig {
  durationDays: number;
  features: Partial<LicenseFeatures>;
  extensionAllowed: boolean;
  requiresRegistration: boolean;
}

// Enterprise license server types
export interface OrganizationLicense {
  organizationId: string;
  licenses: License[];
  pooledFeatures: LicenseFeatures;
  centralManagement: boolean;
  seatCount: number;
  usedSeats: number;
}

export interface LicenseServerConfig {
  serverUrl: string;
  apiKey: string;
  syncInterval: number; // minutes
  offlineBufferDays: number;
}

// Anti-tampering and security
export interface SecurityCheckResult {
  codeIntegrity: boolean;
  licenseIntegrity: boolean;
  environmentSafe: boolean;
  debuggerDetected: boolean;
  virtualMachineDetected: boolean;
  clockTampering: boolean;
  threats: string[];
}

export interface LicenseAuditLog {
  timestamp: number;
  event: string;
  licenseId: string;
  userId: string;
  hardwareId: string;
  ipAddress?: string;
  details: Record<string, any>;
  severity: 'info' | 'warning' | 'error' | 'critical';
}