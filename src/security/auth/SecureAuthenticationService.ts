/**
 * Secure Authentication Service - Enterprise-grade authentication implementation
 * Replaces weak authentication with industry-standard security practices
 */

import bcrypt from 'bcrypt';
import speakeasy from 'speakeasy';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';

// Types and Interfaces
export interface User {
  id: string;
  email: string;
  passwordHash: string;
  mfaSecret?: string;
  mfaEnabled: boolean;
  role: 'admin' | 'attorney' | 'paralegal' | 'user';
  lastLogin?: Date;
  loginAttempts: number;
  lockoutUntil?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface LoginCredentials {
  email: string;
  password: string;
  mfaToken?: string;
}

export interface AuthResult {
  success: boolean;
  user?: Omit<User, 'passwordHash' | 'mfaSecret'>;
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
  error?: string;
  requiresMFA?: boolean;
}

export interface SecurityEvent {
  type: 'login_attempt' | 'login_success' | 'login_failure' | 'password_change' | 'mfa_setup' | 'account_locked';
  userId?: string;
  email: string;
  ip: string;
  userAgent: string;
  timestamp: Date;
  success: boolean;
  metadata?: Record<string, any>;
}

// Security Configuration
const SECURITY_CONFIG = {
  password: {
    minLength: 12,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    saltRounds: 12
  },
  session: {
    accessTokenExpiry: 30 * 60 * 1000, // 30 minutes
    refreshTokenExpiry: 7 * 24 * 60 * 60 * 1000, // 7 days
    encryptionAlgorithm: 'aes-256-gcm'
  },
  bruteForce: {
    maxAttempts: 5,
    lockoutTime: 15 * 60 * 1000, // 15 minutes
    progressiveLockout: true
  },
  mfa: {
    issuer: 'BEAR AI Legal Assistant',
    windowSize: 2,
    backupCodes: 10
  }
};

/**
 * Secure Password Management
 */
export class PasswordManager {
  private readonly saltRounds = SECURITY_CONFIG.password.saltRounds;

  /**
   * Hash password using bcrypt with secure salt rounds
   */
  async hashPassword(password: string): Promise<string> {
    this.validatePasswordStrength(password);
    return bcrypt.hash(password, this.saltRounds);
  }

  /**
   * Verify password against hash
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Validate password strength according to security policy
   */
  validatePasswordStrength(password: string): void {
    const config = SECURITY_CONFIG.password;
    const errors: string[] = [];

    if (password.length < config.minLength) {
      errors.push(`Password must be at least ${config.minLength} characters long`);
    }

    if (config.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (config.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (config.requireNumbers && !/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (config.requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    // Check against common passwords
    if (this.isCommonPassword(password)) {
      errors.push('Password is too common. Please choose a more unique password');
    }

    if (errors.length > 0) {
      throw new Error(`Password validation failed: ${errors.join(', ')}`);
    }
  }

  /**
   * Check if password is in common password list
   */
  private isCommonPassword(password: string): boolean {
    const commonPasswords = [
      'password', 'password123', '123456', '123456789', 'qwerty',
      'abc123', 'password1', 'admin', 'letmein', 'welcome',
      'monkey', '1234567890', 'admin123', 'root', 'toor'
    ];
    return commonPasswords.includes(password.toLowerCase());
  }

  /**
   * Generate secure random password
   */
  generateSecurePassword(length: number = 16): string {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
    let password = '';

    // Ensure at least one character from each required category
    password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)];
    password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)];
    password += '0123456789'[Math.floor(Math.random() * 10)];
    password += '!@#$%^&*()_+-='[Math.floor(Math.random() * 13)];

    // Fill remaining characters
    for (let i = password.length; i < length; i++) {
      password += charset[Math.floor(Math.random() * charset.length)];
    }

    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }
}

/**
 * Brute Force Protection
 */
export class BruteForceProtection {
  private attempts = new Map<string, { count: number; lastAttempt: Date; lockoutUntil?: Date }>();
  private readonly config = SECURITY_CONFIG.bruteForce;

  /**
   * Check if an identifier (IP or email) is currently blocked
   */
  isBlocked(identifier: string): boolean {
    const record = this.attempts.get(identifier);
    if (!record) return false;

    // Check if lockout period has expired
    if (record.lockoutUntil && Date.now() > record.lockoutUntil.getTime()) {
      this.attempts.delete(identifier);
      return false;
    }

    return record.count >= this.config.maxAttempts;
  }

  /**
   * Record a failed attempt
   */
  recordFailedAttempt(identifier: string): void {
    const now = new Date();
    const record = this.attempts.get(identifier) || { count: 0, lastAttempt: now };

    // Reset count if enough time has passed since last attempt
    const timeSinceLastAttempt = now.getTime() - record.lastAttempt.getTime();
    if (timeSinceLastAttempt > this.config.lockoutTime) {
      record.count = 0;
    }

    record.count++;
    record.lastAttempt = now;

    // Calculate progressive lockout time
    if (record.count >= this.config.maxAttempts) {
      const lockoutMultiplier = this.config.progressiveLockout ?
        Math.pow(2, record.count - this.config.maxAttempts) : 1;
      record.lockoutUntil = new Date(now.getTime() + (this.config.lockoutTime * lockoutMultiplier));
    }

    this.attempts.set(identifier, record);
  }

  /**
   * Clear attempts for successful login
   */
  clearAttempts(identifier: string): void {
    this.attempts.delete(identifier);
  }

  /**
   * Get remaining lockout time in seconds
   */
  getLockoutTimeRemaining(identifier: string): number {
    const record = this.attempts.get(identifier);
    if (!record?.lockoutUntil) return 0;

    const remaining = record.lockoutUntil.getTime() - Date.now();
    return Math.max(0, Math.ceil(remaining / 1000));
  }
}

/**
 * Multi-Factor Authentication Service
 */
export class MFAService {
  private readonly config = SECURITY_CONFIG.mfa;

  /**
   * Generate MFA secret for user
   */
  generateSecret(userEmail: string): { secret: string; qrCode: string; backupCodes: string[] } {
    const secret = speakeasy.generateSecret({
      name: `${this.config.issuer} (${userEmail})`,
      issuer: this.config.issuer,
      length: 32
    });

    const backupCodes = this.generateBackupCodes();

    return {
      secret: secret.base32!,
      qrCode: secret.otpauth_url!,
      backupCodes
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
      window: this.config.windowSize
    });
  }

  /**
   * Verify backup code
   */
  verifyBackupCode(userBackupCodes: string[], providedCode: string): boolean {
    const hashedCode = crypto.createHash('sha256').update(providedCode).digest('hex');
    return userBackupCodes.includes(hashedCode);
  }

  /**
   * Generate backup codes
   */
  private generateBackupCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < this.config.backupCodes; i++) {
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      codes.push(crypto.createHash('sha256').update(code).digest('hex'));
    }
    return codes;
  }
}

/**
 * Secure Session Management
 */
export class SessionManager {
  private readonly config = SECURITY_CONFIG.session;
  private readonly encryptionKey: string;

  constructor(encryptionKey: string) {
    if (!encryptionKey || encryptionKey.length < 32) {
      throw new Error('Encryption key must be at least 32 characters');
    }
    this.encryptionKey = encryptionKey;
  }

  /**
   * Generate secure session tokens
   */
  generateTokens(userId: string, role: string): { accessToken: string; refreshToken: string } {
    const now = Date.now();

    const accessPayload = {
      userId,
      role,
      type: 'access',
      exp: now + this.config.accessTokenExpiry,
      iat: now,
      jti: crypto.randomUUID()
    };

    const refreshPayload = {
      userId,
      type: 'refresh',
      exp: now + this.config.refreshTokenExpiry,
      iat: now,
      jti: crypto.randomUUID()
    };

    return {
      accessToken: this.encryptPayload(accessPayload),
      refreshToken: this.encryptPayload(refreshPayload)
    };
  }

  /**
   * Validate and decrypt token
   */
  validateToken(token: string): { valid: boolean; payload?: any; error?: string } {
    try {
      const payload = this.decryptPayload(token);

      if (payload.exp < Date.now()) {
        return { valid: false, error: 'Token expired' };
      }

      return { valid: true, payload };
    } catch (error) {
      return { valid: false, error: 'Invalid token' };
    }
  }

  /**
   * Encrypt payload using AES-256-GCM
   */
  private encryptPayload(payload: any): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(this.config.encryptionAlgorithm, this.encryptionKey);
    cipher.setAAD(Buffer.from('BEAR_AI_AUTH'));

    let encrypted = cipher.update(JSON.stringify(payload), 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return `${iv.toString('hex')}.${encrypted}.${authTag.toString('hex')}`;
  }

  /**
   * Decrypt payload
   */
  private decryptPayload(token: string): any {
    const [ivHex, encrypted, authTagHex] = token.split('.');

    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipher(this.config.encryptionAlgorithm, this.encryptionKey);
    decipher.setAAD(Buffer.from('BEAR_AI_AUTH'));
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return JSON.parse(decrypted);
  }
}

/**
 * Security Event Logger
 */
export class SecurityLogger {
  private events: SecurityEvent[] = [];

  /**
   * Log security event
   */
  async logEvent(event: SecurityEvent): Promise<void> {
    this.events.push(event);

    // In production, send to secure logging service
    console.log('Security Event:', {
      type: event.type,
      email: event.email,
      ip: event.ip,
      timestamp: event.timestamp,
      success: event.success
    });

    // Alert on suspicious activity
    if (this.isSuspiciousActivity(event)) {
      await this.sendSecurityAlert(event);
    }
  }

  /**
   * Check for suspicious activity patterns
   */
  private isSuspiciousActivity(event: SecurityEvent): boolean {
    const recentEvents = this.events.filter(e =>
      Date.now() - e.timestamp.getTime() < 60000 && // Last minute
      e.email === event.email
    );

    return recentEvents.filter(e => e.type === 'login_failure').length >= 3;
  }

  /**
   * Send security alert
   */
  private async sendSecurityAlert(event: SecurityEvent): Promise<void> {
    // Implementation would send alert to security team
    console.warn('SECURITY ALERT:', {
      message: 'Suspicious login activity detected',
      email: event.email,
      ip: event.ip,
      timestamp: event.timestamp
    });
  }
}

/**
 * Main Secure Authentication Service
 */
export class SecureAuthenticationService {
  private passwordManager: PasswordManager;
  private bruteForceProtection: BruteForceProtection;
  private mfaService: MFAService;
  private sessionManager: SessionManager;
  private securityLogger: SecurityLogger;

  constructor(encryptionKey: string) {
    this.passwordManager = new PasswordManager();
    this.bruteForceProtection = new BruteForceProtection();
    this.mfaService = new MFAService();
    this.sessionManager = new SessionManager(encryptionKey);
    this.securityLogger = new SecurityLogger();
  }

  /**
   * Authenticate user with credentials
   */
  async authenticate(
    credentials: LoginCredentials,
    clientInfo: { ip: string; userAgent: string }
  ): Promise<AuthResult> {
    const { email, password, mfaToken } = credentials;
    const identifier = `${email}:${clientInfo.ip}`;

    // Check brute force protection
    if (this.bruteForceProtection.isBlocked(identifier)) {
      const remainingTime = this.bruteForceProtection.getLockoutTimeRemaining(identifier);
      await this.securityLogger.logEvent({
        type: 'login_attempt',
        email,
        ip: clientInfo.ip,
        userAgent: clientInfo.userAgent,
        timestamp: new Date(),
        success: false,
        metadata: { reason: 'account_locked', remainingTime }
      });

      return {
        success: false,
        error: `Account temporarily locked. Try again in ${remainingTime} seconds.`
      };
    }

    try {
      // Get user from database (mock implementation)
      const user = await this.getUserByEmail(email);
      if (!user) {
        this.bruteForceProtection.recordFailedAttempt(identifier);
        await this.securityLogger.logEvent({
          type: 'login_failure',
          email,
          ip: clientInfo.ip,
          userAgent: clientInfo.userAgent,
          timestamp: new Date(),
          success: false,
          metadata: { reason: 'user_not_found' }
        });

        return { success: false, error: 'Invalid credentials' };
      }

      // Verify password
      const isValidPassword = await this.passwordManager.verifyPassword(password, user.passwordHash);
      if (!isValidPassword) {
        this.bruteForceProtection.recordFailedAttempt(identifier);
        await this.securityLogger.logEvent({
          type: 'login_failure',
          userId: user.id,
          email,
          ip: clientInfo.ip,
          userAgent: clientInfo.userAgent,
          timestamp: new Date(),
          success: false,
          metadata: { reason: 'invalid_password' }
        });

        return { success: false, error: 'Invalid credentials' };
      }

      // Check MFA if enabled
      if (user.mfaEnabled) {
        if (!mfaToken) {
          return {
            success: false,
            requiresMFA: true,
            error: 'MFA token required'
          };
        }

        if (!this.mfaService.verifyToken(user.mfaSecret!, mfaToken)) {
          this.bruteForceProtection.recordFailedAttempt(identifier);
          await this.securityLogger.logEvent({
            type: 'login_failure',
            userId: user.id,
            email,
            ip: clientInfo.ip,
            userAgent: clientInfo.userAgent,
            timestamp: new Date(),
            success: false,
            metadata: { reason: 'invalid_mfa' }
          });

          return { success: false, error: 'Invalid MFA token' };
        }
      }

      // Clear failed attempts on successful login
      this.bruteForceProtection.clearAttempts(identifier);

      // Generate secure session tokens
      const tokens = this.sessionManager.generateTokens(user.id, user.role);

      // Update last login
      await this.updateLastLogin(user.id);

      // Log successful login
      await this.securityLogger.logEvent({
        type: 'login_success',
        userId: user.id,
        email,
        ip: clientInfo.ip,
        userAgent: clientInfo.userAgent,
        timestamp: new Date(),
        success: true
      });

      return {
        success: true,
        user: this.sanitizeUser(user),
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: SECURITY_CONFIG.session.accessTokenExpiry
      };

    } catch (error) {
      this.bruteForceProtection.recordFailedAttempt(identifier);
      await this.securityLogger.logEvent({
        type: 'login_failure',
        email,
        ip: clientInfo.ip,
        userAgent: clientInfo.userAgent,
        timestamp: new Date(),
        success: false,
        metadata: { reason: 'system_error', error: String(error) }
      });

      return { success: false, error: 'Authentication failed' };
    }
  }

  /**
   * Setup MFA for user
   */
  async setupMFA(userId: string, userEmail: string): Promise<{ secret: string; qrCode: string; backupCodes: string[] }> {
    return this.mfaService.generateSecret(userEmail);
  }

  /**
   * Change user password
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    try {
      const user = await this.getUserById(userId);
      if (!user) {
        return { success: false, error: 'User not found' };
      }

      // Verify current password
      const isValidCurrentPassword = await this.passwordManager.verifyPassword(currentPassword, user.passwordHash);
      if (!isValidCurrentPassword) {
        return { success: false, error: 'Current password is incorrect' };
      }

      // Hash new password
      const newPasswordHash = await this.passwordManager.hashPassword(newPassword);

      // Update password in database
      await this.updateUserPassword(userId, newPasswordHash);

      await this.securityLogger.logEvent({
        type: 'password_change',
        userId,
        email: user.email,
        ip: '127.0.0.1', // Would get from request context
        userAgent: 'Internal',
        timestamp: new Date(),
        success: true
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  /**
   * Validate session token
   */
  validateSessionToken(token: string): { valid: boolean; userId?: string; role?: string; error?: string } {
    const result = this.sessionManager.validateToken(token);
    if (!result.valid) {
      return { valid: false, error: result.error };
    }

    return {
      valid: true,
      userId: result.payload.userId,
      role: result.payload.role
    };
  }

  /**
   * Express.js middleware for protecting routes
   */
  createAuthMiddleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const token = authHeader.substring(7);
      const validation = this.validateSessionToken(token);

      if (!validation.valid) {
        return res.status(401).json({ error: validation.error });
      }

      // Add user info to request
      (req as any).user = {
        id: validation.userId,
        role: validation.role
      };

      next();
    };
  }

  /**
   * Rate limiting middleware
   */
  createRateLimitMiddleware() {
    return rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // Limit each IP to 100 requests per windowMs
      message: 'Too many requests from this IP, please try again later',
      standardHeaders: true,
      legacyHeaders: false
    });
  }

  // Mock database methods (replace with actual database implementation)
  private async getUserByEmail(email: string): Promise<User | null> {
    // Mock implementation - replace with actual database query
    return null;
  }

  private async getUserById(id: string): Promise<User | null> {
    // Mock implementation - replace with actual database query
    return null;
  }

  private async updateLastLogin(userId: string): Promise<void> {
    // Mock implementation - replace with actual database update
  }

  private async updateUserPassword(userId: string, passwordHash: string): Promise<void> {
    // Mock implementation - replace with actual database update
  }

  private sanitizeUser(user: User): Omit<User, 'passwordHash' | 'mfaSecret'> {
    const { passwordHash, mfaSecret, ...sanitized } = user;
    return sanitized;
  }
}

// Export singleton instance
let authService: SecureAuthenticationService;

export function getAuthService(): SecureAuthenticationService {
  if (!authService) {
    const encryptionKey = process.env.SESSION_ENCRYPTION_KEY ||
      crypto.randomBytes(32).toString('hex');
    authService = new SecureAuthenticationService(encryptionKey);
  }
  return authService;
}

export default SecureAuthenticationService;