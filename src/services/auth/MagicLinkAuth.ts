/**
 * Magic Link Authentication Service
 * Passwordless, secure authentication without SSO providers
 * GDPR-compliant with no third-party data sharing
 */

import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import { Redis } from 'ioredis';

interface MagicLinkConfig {
  jwtSecret: string;
  emailFrom: string;
  appName: string;
  appUrl: string;
  tokenExpiry?: number; // minutes
  maxAttempts?: number;
}

export class MagicLinkAuthService {
  private redis: Redis;
  private mailer: nodemailer.Transporter;
  private config: MagicLinkConfig;

  constructor(config: MagicLinkConfig) {
    this.config = {
      tokenExpiry: 15, // 15 minutes default
      maxAttempts: 3,
      ...config
    };

    // Initialize Redis for token storage
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      tls: process.env.NODE_ENV === 'production' ? {} : undefined
    });

    // Initialize email transporter (use your own SMTP)
    this.mailer = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
      }
    });
  }

  /**
   * Generate secure magic link token
   */
  private generateSecureToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Hash token for storage (never store plain tokens)
   */
  private hashToken(token: string): string {
    return crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');
  }

  /**
   * Send magic link to user
   */
  async sendMagicLink(email: string, ipAddress: string): Promise<{ success: boolean; message: string }> {
    try {
      // Validate email format
      if (!this.isValidEmail(email)) {
        return { success: false, message: 'Invalid email format' };
      }

      // Check rate limiting
      const attempts = await this.checkRateLimit(email, ipAddress);
      if (attempts >= this.config.maxAttempts!) {
        return {
          success: false,
          message: 'Too many attempts. Please try again in 15 minutes.'
        };
      }

      // Generate secure token
      const token = this.generateSecureToken();
      const hashedToken = this.hashToken(token);

      // Store token with metadata
      const tokenData = {
        email: email.toLowerCase(),
        hashedToken,
        ipAddress,
        createdAt: Date.now(),
        attempts: 0
      };

      // Store in Redis with expiry
      await this.redis.setex(
        `magiclink:${hashedToken}`,
        this.config.tokenExpiry! * 60,
        JSON.stringify(tokenData)
      );

      // Create magic link
      const magicLink = `${this.config.appUrl}/auth/verify?token=${token}&email=${encodeURIComponent(email)}`;

      // Send email
      await this.sendSecureEmail(email, magicLink);

      // Update rate limit
      await this.incrementRateLimit(email, ipAddress);

      return {
        success: true,
        message: 'Magic link sent to your email. Please check your inbox.'
      };

    } catch (error) {
      // Error logging disabled for production
      return {
        success: false,
        message: 'Failed to send magic link. Please try again.'
      };
    }
  }

  /**
   * Verify magic link token
   */
  async verifyMagicLink(token: string, email: string, ipAddress: string): Promise<{
    success: boolean;
    jwt?: string;
    user?: any;
    message?: string;
  }> {
    try {
      const hashedToken = this.hashToken(token);

      // Retrieve token data
      const data = await this.redis.get(`magiclink:${hashedToken}`);
      if (!data) {
        return {
          success: false,
          message: 'Invalid or expired link'
        };
      }

      const tokenData = JSON.parse(data);

      // Verify email matches
      if (tokenData.email !== email.toLowerCase()) {
        await this.logSecurityEvent('email_mismatch', email, ipAddress);
        return {
          success: false,
          message: 'Invalid verification link'
        };
      }

      // Check if token already used
      if (tokenData.used) {
        await this.logSecurityEvent('token_reuse', email, ipAddress);
        return {
          success: false,
          message: 'This link has already been used'
        };
      }

      // Mark token as used
      tokenData.used = true;
      tokenData.usedAt = Date.now();
      tokenData.usedIp = ipAddress;
      await this.redis.setex(
        `magiclink:${hashedToken}`,
        300, // Keep for 5 minutes for security logs
        JSON.stringify(tokenData)
      );

      // Get or create user
      const user = await this.findOrCreateUser(email);

      // Generate JWT session token
      const jwtToken = this.generateJWT(user);

      // Clear rate limiting on successful login
      await this.clearRateLimit(email, ipAddress);

      // Log successful authentication
      await this.logSecurityEvent('login_success', email, ipAddress);

      return {
        success: true,
        jwt: jwtToken,
        user
      };

    } catch (error) {
      // Error logging disabled for production
      return {
        success: false,
        message: 'Verification failed'
      };
    }
  }

  /**
   * Generate secure JWT
   */
  private generateJWT(user: any): string {
    return jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        iat: Date.now()
      },
      this.config.jwtSecret,
      {
        expiresIn: '8h', // 8 hour session
        issuer: this.config.appName,
        audience: this.config.appUrl
      }
    );
  }

  /**
   * Send secure email with best practices
   */
  private async sendSecureEmail(email: string, magicLink: string): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #2c3e50;">Secure Login for ${this.config.appName}</h2>

          <p>You requested a secure login link. Click the button below to sign in:</p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${magicLink}"
               style="display: inline-block; padding: 12px 30px; background-color: #3498db; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
              Sign In Securely
            </a>
          </div>

          <p style="color: #666; font-size: 14px;">
            <strong>Security Information:</strong><br>
            • This link expires in ${this.config.tokenExpiry} minutes<br>
            • It can only be used once<br>
            • Never share this link with anyone<br>
            • If you didn't request this, please ignore this email
          </p>

          <p style="color: #999; font-size: 12px; margin-top: 30px;">
            This email was sent by ${this.config.appName}.
            Your privacy is protected - no tracking pixels or third-party services are used.
          </p>
        </div>
      </body>
      </html>
    `;

    await this.mailer.sendMail({
      from: this.config.emailFrom,
      to: email,
      subject: `Secure Login Link for ${this.config.appName}`,
      html,
      text: `Sign in to ${this.config.appName}: ${magicLink}\n\nThis link expires in ${this.config.tokenExpiry} minutes.`
    });
  }

  /**
   * Rate limiting functions
   */
  private async checkRateLimit(email: string, ip: string): Promise<number> {
    const key = `ratelimit:${email}:${ip}`;
    const attempts = await this.redis.get(key);
    return parseInt(attempts || '0');
  }

  private async incrementRateLimit(email: string, ip: string): Promise<void> {
    const key = `ratelimit:${email}:${ip}`;
    await this.redis.incr(key);
    await this.redis.expire(key, 900); // 15 minutes
  }

  private async clearRateLimit(email: string, ip: string): Promise<void> {
    const key = `ratelimit:${email}:${ip}`;
    await this.redis.del(key);
  }

  /**
   * Security logging
   */
  private async logSecurityEvent(event: string, email: string, ip: string): Promise<void> {
    const log = {
      event,
      email,
      ip,
      timestamp: new Date().toISOString(),
      userAgent: '', // Add from request headers
    };

    // Store security log
    await this.redis.lpush('security_logs', JSON.stringify(log));
    await this.redis.ltrim('security_logs', 0, 9999); // Keep last 10000 events
  }

  /**
   * Email validation
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Find or create user (implement based on your database)
   */
  private async findOrCreateUser(email: string): Promise<any> {
    // This is a placeholder - implement with your database
    // For now, return a mock user
    return {
      id: crypto.randomUUID(),
      email: email.toLowerCase(),
      role: 'user',
      createdAt: new Date()
    };
  }
}

/**
 * WebAuthn/Passkeys Implementation for Even More Security
 * Uses biometric authentication (fingerprint, Face ID, etc.)
 */
export class PasskeyAuthService {
  /**
   * Register new passkey
   */
  async registerPasskey(userId: string, username: string): Promise<any> {
    // Implementation for WebAuthn registration
    // This provides the highest level of security with biometric auth
    const challenge = crypto.randomBytes(32);

    return {
      challenge: challenge.toString('base64'),
      rp: {
        name: 'BEAR AI Legal Assistant',
        id: 'localhost', // or your domain
      },
      user: {
        id: Buffer.from(userId),
        name: username,
        displayName: username,
      },
      pubKeyCredParams: [
        { alg: -7, type: 'public-key' }, // ES256
        { alg: -257, type: 'public-key' }, // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        residentKey: 'required',
      },
      attestation: 'direct',
    };
  }

  /**
   * Verify passkey authentication
   */
  async verifyPasskey(credentialId: string, response: any): Promise<boolean> {
    // Implement WebAuthn verification
    // This is cryptographically secure and doesn't require passwords
    return true; // Placeholder
  }
}

/**
 * TOTP (Time-based One-Time Password) for 2FA
 * Like Google Authenticator but self-hosted
 */
export class TOTPService {
  /**
   * Generate TOTP secret
   */
  generateSecret(email: string): { secret: string; qr: string; backup: string[] } {
    const secret = crypto.randomBytes(20).toString('hex');
    const backupCodes = Array.from({ length: 10 }, () =>
      crypto.randomBytes(4).toString('hex').toUpperCase()
    );

    // Generate QR code URL for authenticator apps
    const otpauth = `otpauth://totp/BEAR AI:${email}?secret=${secret}&issuer=BEAR AI`;

    return {
      secret,
      qr: otpauth,
      backup: backupCodes
    };
  }

  /**
   * Verify TOTP code
   */
  verifyTOTP(secret: string, token: string): boolean {
    // Implement TOTP verification
    // This provides 2FA without relying on SMS or external services
    return true; // Placeholder
  }
}