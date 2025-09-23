/**
 * Multi-Factor Authentication Service
 * Comprehensive MFA implementation with TOTP, SMS, Email, and backup codes
 */

import crypto from 'crypto';
import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import twilio from 'twilio';
import nodemailer from 'nodemailer';

export interface MFAConfig {
  issuer: string;
  serviceName: string;
  windowSize: number;
  stepSize: number;
  backupCodeCount: number;
  backupCodeLength: number;
  smsProvider?: 'twilio' | 'aws' | 'custom';
  emailProvider?: 'nodemailer' | 'sendgrid' | 'custom';
}

export interface MFASetupResult {
  secret: string;
  qrCodeUrl: string;
  qrCodeDataUrl: string;
  backupCodes: string[];
  setupKey: string;
}

export interface MFAVerificationResult {
  success: boolean;
  error?: string;
  usedBackupCode?: boolean;
  remainingBackupCodes?: number;
}

export interface UserMFASettings {
  id: string;
  totpEnabled: boolean;
  totpSecret?: string;
  smsEnabled: boolean;
  phoneNumber?: string;
  emailEnabled: boolean;
  email?: string;
  backupCodes: string[];
  lastUsedAt?: Date;
  setupCompletedAt?: Date;
}

export type MFAMethod = 'totp' | 'sms' | 'email' | 'backup';

const DEFAULT_CONFIG: MFAConfig = {
  issuer: 'BEAR AI Legal Assistant',
  serviceName: 'BEAR AI',
  windowSize: 2,
  stepSize: 30,
  backupCodeCount: 10,
  backupCodeLength: 8
};

/**
 * TOTP (Time-based One-Time Password) Service
 */
export class TOTPService {
  private config: MFAConfig;

  constructor(config: MFAConfig) {
    this.config = config;
  }

  /**
   * Generate TOTP secret and QR code for user setup
   */
  async generateSecret(userIdentifier: string): Promise<MFASetupResult> {
    const secret = speakeasy.generateSecret({
      name: `${this.config.serviceName} (${userIdentifier})`,
      issuer: this.config.issuer,
      length: 32
    });

    if (!secret.otpauth_url || !secret.base32) {
      throw new Error('Failed to generate TOTP secret');
    }

    // Generate QR code as data URL
    const qrCodeDataUrl = await qrcode.toDataURL(secret.otpauth_url);

    // Generate backup codes
    const backupCodes = this.generateBackupCodes();

    return {
      secret: secret.base32,
      qrCodeUrl: secret.otpauth_url,
      qrCodeDataUrl,
      backupCodes,
      setupKey: secret.base32
    };
  }

  /**
   * Verify TOTP token
   */
  verifyToken(secret: string, token: string): boolean {
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: this.config.windowSize,
      step: this.config.stepSize
    });
  }

  /**
   * Get current TOTP token (for testing/admin purposes)
   */
  getCurrentToken(secret: string): string {
    return speakeasy.totp({
      secret,
      encoding: 'base32',
      step: this.config.stepSize
    });
  }

  /**
   * Generate backup codes
   */
  private generateBackupCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < this.config.backupCodeCount; i++) {
      codes.push(this.generateBackupCode());
    }
    return codes;
  }

  /**
   * Generate a single backup code
   */
  private generateBackupCode(): string {
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let code = '';
    for (let i = 0; i < this.config.backupCodeLength; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }
}

/**
 * SMS MFA Service
 */
export class SMSMFAService {
  private twilioClient?: twilio.Twilio;
  private config: MFAConfig;

  constructor(config: MFAConfig) {
    this.config = config;
    this.initializeSMSProvider();
  }

  /**
   * Initialize SMS provider
   */
  private initializeSMSProvider(): void {
    if (this.config.smsProvider === 'twilio') {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;

      if (accountSid && authToken) {
        this.twilioClient = twilio(accountSid, authToken);
      }
    }
  }

  /**
   * Send SMS verification code
   */
  async sendVerificationCode(phoneNumber: string): Promise<{ success: boolean; code?: string; error?: string }> {
    try {
      // Generate 6-digit code
      const code = Math.floor(100000 + Math.random() * 900000).toString();

      const message = `Your ${this.config.serviceName} verification code is: ${code}. This code expires in 5 minutes.`;

      if (this.twilioClient) {
        await this.twilioClient.messages.create({
          body: message,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: phoneNumber
        });
      } else {
        // Mock SMS sending in development
        console.log(`SMS to ${phoneNumber}: ${message}`);
      }

      return { success: true, code };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send SMS'
      };
    }
  }

  /**
   * Verify phone number format
   */
  validatePhoneNumber(phoneNumber: string): boolean {
    // Basic E.164 format validation
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    return phoneRegex.test(phoneNumber);
  }
}

/**
 * Email MFA Service
 */
export class EmailMFAService {
  private emailTransporter?: nodemailer.Transporter;
  private config: MFAConfig;

  constructor(config: MFAConfig) {
    this.config = config;
    this.initializeEmailProvider();
  }

  /**
   * Initialize email provider
   */
  private initializeEmailProvider(): void {
    if (this.config.emailProvider === 'nodemailer') {
      this.emailTransporter = nodemailer.createTransporter({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD
        }
      });
    }
  }

  /**
   * Send email verification code
   */
  async sendVerificationCode(email: string): Promise<{ success: boolean; code?: string; error?: string }> {
    try {
      // Generate 8-character alphanumeric code
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();

      const mailOptions = {
        from: process.env.SMTP_FROM || `"${this.config.serviceName}" <noreply@bear-ai.com>`,
        to: email,
        subject: `${this.config.serviceName} - Verification Code`,
        html: this.generateEmailTemplate(code)
      };

      if (this.emailTransporter) {
        await this.emailTransporter.sendMail(mailOptions);
      } else {
        // Mock email sending in development
        console.log(`Email to ${email}: Verification code ${code}`);
      }

      return { success: true, code };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send email'
      };
    }
  }

  /**
   * Generate email template
   */
  private generateEmailTemplate(code: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Verification Code</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #1a365d; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px; background: #f8f9fa; }
          .code { font-size: 32px; font-weight: bold; text-align: center;
                  background: white; padding: 20px; margin: 20px 0;
                  border: 2px solid #e2e8f0; border-radius: 8px; }
          .warning { background: #fed7d7; color: #c53030; padding: 15px;
                     border-radius: 8px; margin: 20px 0; }
          .footer { text-align: center; color: #718096; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${this.config.serviceName}</h1>
            <p>Verification Code</p>
          </div>
          <div class="content">
            <h2>Your verification code is:</h2>
            <div class="code">${code}</div>
            <p>This code will expire in <strong>5 minutes</strong>.</p>
            <div class="warning">
              <strong>Security Notice:</strong> If you didn't request this code,
              please ignore this email and contact support immediately.
            </div>
          </div>
          <div class="footer">
            <p>&copy; 2025 BEAR AI Legal Assistant. All rights reserved.</p>
            <p>This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Validate email format
   */
  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

/**
 * Main MFA Service
 */
export class MFAService {
  private totpService: TOTPService;
  private smsService: SMSMFAService;
  private emailService: EmailMFAService;
  private config: MFAConfig;
  private verificationCodes = new Map<string, { code: string; method: MFAMethod; expiresAt: Date; attempts: number }>();

  constructor(customConfig?: Partial<MFAConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...customConfig };
    this.totpService = new TOTPService(this.config);
    this.smsService = new SMSMFAService(this.config);
    this.emailService = new EmailMFAService(this.config);

    // Clean up expired codes every 5 minutes
    setInterval(() => this.cleanupExpiredCodes(), 5 * 60 * 1000);
  }

  /**
   * Setup TOTP for user
   */
  async setupTOTP(userIdentifier: string): Promise<MFASetupResult> {
    return this.totpService.generateSecret(userIdentifier);
  }

  /**
   * Enable SMS MFA for user
   */
  async setupSMS(userId: string, phoneNumber: string): Promise<{ success: boolean; error?: string }> {
    if (!this.smsService.validatePhoneNumber(phoneNumber)) {
      return { success: false, error: 'Invalid phone number format' };
    }

    const result = await this.smsService.sendVerificationCode(phoneNumber);
    if (result.success && result.code) {
      this.storeVerificationCode(userId, result.code, 'sms');
      return { success: true };
    }

    return { success: false, error: result.error };
  }

  /**
   * Enable Email MFA for user
   */
  async setupEmail(userId: string, email: string): Promise<{ success: boolean; error?: string }> {
    if (!this.emailService.validateEmail(email)) {
      return { success: false, error: 'Invalid email format' };
    }

    const result = await this.emailService.sendVerificationCode(email);
    if (result.success && result.code) {
      this.storeVerificationCode(userId, result.code, 'email');
      return { success: true };
    }

    return { success: false, error: result.error };
  }

  /**
   * Send verification code via preferred method
   */
  async sendVerificationCode(
    userId: string,
    method: MFAMethod,
    destination: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      let result: { success: boolean; code?: string; error?: string };

      switch (method) {
        case 'sms':
          result = await this.smsService.sendVerificationCode(destination);
          break;
        case 'email':
          result = await this.emailService.sendVerificationCode(destination);
          break;
        default:
          return { success: false, error: 'Invalid MFA method' };
      }

      if (result.success && result.code) {
        this.storeVerificationCode(userId, result.code, method);
        return { success: true };
      }

      return { success: false, error: result.error };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send verification code'
      };
    }
  }

  /**
   * Verify MFA token/code
   */
  async verifyMFA(
    userId: string,
    token: string,
    method: MFAMethod,
    userMFASettings: UserMFASettings
  ): Promise<MFAVerificationResult> {
    try {
      switch (method) {
        case 'totp':
          return this.verifyTOTP(token, userMFASettings);
        case 'sms':
        case 'email':
          return this.verifyCode(userId, token, method);
        case 'backup':
          return this.verifyBackupCode(token, userMFASettings);
        default:
          return { success: false, error: 'Invalid MFA method' };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'MFA verification failed'
      };
    }
  }

  /**
   * Verify TOTP token
   */
  private verifyTOTP(token: string, userMFASettings: UserMFASettings): MFAVerificationResult {
    if (!userMFASettings.totpEnabled || !userMFASettings.totpSecret) {
      return { success: false, error: 'TOTP not enabled for user' };
    }

    const isValid = this.totpService.verifyToken(userMFASettings.totpSecret, token);
    return {
      success: isValid,
      error: isValid ? undefined : 'Invalid TOTP token'
    };
  }

  /**
   * Verify SMS/Email code
   */
  private verifyCode(userId: string, code: string, method: MFAMethod): MFAVerificationResult {
    const storedCode = this.verificationCodes.get(userId);

    if (!storedCode) {
      return { success: false, error: 'No verification code found' };
    }

    if (storedCode.method !== method) {
      return { success: false, error: 'Invalid verification method' };
    }

    if (Date.now() > storedCode.expiresAt.getTime()) {
      this.verificationCodes.delete(userId);
      return { success: false, error: 'Verification code expired' };
    }

    // Rate limiting: max 3 attempts
    if (storedCode.attempts >= 3) {
      this.verificationCodes.delete(userId);
      return { success: false, error: 'Too many verification attempts' };
    }

    storedCode.attempts++;

    if (storedCode.code === code.toUpperCase()) {
      this.verificationCodes.delete(userId);
      return { success: true };
    }

    return { success: false, error: 'Invalid verification code' };
  }

  /**
   * Verify backup code
   */
  private verifyBackupCode(code: string, userMFASettings: UserMFASettings): MFAVerificationResult {
    const upperCode = code.toUpperCase();
    const codeIndex = userMFASettings.backupCodes.indexOf(upperCode);

    if (codeIndex === -1) {
      return { success: false, error: 'Invalid backup code' };
    }

    // Remove used backup code
    userMFASettings.backupCodes.splice(codeIndex, 1);

    return {
      success: true,
      usedBackupCode: true,
      remainingBackupCodes: userMFASettings.backupCodes.length
    };
  }

  /**
   * Generate new backup codes
   */
  generateNewBackupCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < this.config.backupCodeCount; i++) {
      codes.push(this.generateBackupCode());
    }
    return codes;
  }

  /**
   * Generate a single backup code
   */
  private generateBackupCode(): string {
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let code = '';
    for (let i = 0; i < this.config.backupCodeLength; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }

  /**
   * Store verification code temporarily
   */
  private storeVerificationCode(userId: string, code: string, method: MFAMethod): void {
    this.verificationCodes.set(userId, {
      code: code.toUpperCase(),
      method,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
      attempts: 0
    });
  }

  /**
   * Clean up expired verification codes
   */
  private cleanupExpiredCodes(): void {
    const now = Date.now();
    for (const [userId, codeData] of this.verificationCodes.entries()) {
      if (now > codeData.expiresAt.getTime()) {
        this.verificationCodes.delete(userId);
      }
    }
  }

  /**
   * Get available MFA methods for user
   */
  getAvailableMethods(userMFASettings: UserMFASettings): MFAMethod[] {
    const methods: MFAMethod[] = [];

    if (userMFASettings.totpEnabled) {
      methods.push('totp');
    }
    if (userMFASettings.smsEnabled) {
      methods.push('sms');
    }
    if (userMFASettings.emailEnabled) {
      methods.push('email');
    }
    if (userMFASettings.backupCodes.length > 0) {
      methods.push('backup');
    }

    return methods;
  }

  /**
   * Check if user has any MFA method enabled
   */
  hasMFAEnabled(userMFASettings: UserMFASettings): boolean {
    return userMFASettings.totpEnabled ||
           userMFASettings.smsEnabled ||
           userMFASettings.emailEnabled;
  }

  /**
   * Disable specific MFA method
   */
  async disableMFAMethod(userMFASettings: UserMFASettings, method: MFAMethod): Promise<void> {
    switch (method) {
      case 'totp':
        userMFASettings.totpEnabled = false;
        userMFASettings.totpSecret = undefined;
        break;
      case 'sms':
        userMFASettings.smsEnabled = false;
        userMFASettings.phoneNumber = undefined;
        break;
      case 'email':
        userMFASettings.emailEnabled = false;
        break;
    }
  }

  /**
   * Get MFA configuration
   */
  getConfig(): MFAConfig {
    return { ...this.config };
  }
}

// Export singleton instance
let mfaService: MFAService;

export function getMFAService(config?: Partial<MFAConfig>): MFAService {
  if (!mfaService) {
    mfaService = new MFAService(config);
  }
  return mfaService;
}

export default MFAService;