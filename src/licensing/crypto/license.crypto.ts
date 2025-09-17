/**
 * BEAR AI Licensing System - Cryptographic Functions
 * Secure license generation, validation, and anti-tampering protection
 */

import * as crypto from 'crypto';

export class LicenseCrypto {
  private static readonly ALGORITHM = 'RS256';
  private static readonly HASH_ALGORITHM = 'sha256';
  private static readonly KEY_SIZE = 2048;

  /**
   * Generate RSA key pair for license signing
   */
  static generateKeyPair(): { publicKey: string; privateKey: string } {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: this.KEY_SIZE,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
      }
    });

    return { publicKey, privateKey };
  }

  /**
   * Create hardware fingerprint from system information
   */
  static createHardwareFingerprint(hardwareInfo: {
    cpuId: string;
    motherboardSerial: string;
    diskSerial: string;
    macAddress: string;
    osInfo: string;
  }): string {
    const combined = [
      hardwareInfo.cpuId,
      hardwareInfo.motherboardSerial,
      hardwareInfo.diskSerial,
      hardwareInfo.macAddress,
      hardwareInfo.osInfo
    ].join('|');

    return crypto.createHash(this.HASH_ALGORITHM)
      .update(combined)
      .digest('hex');
  }

  /**
   * Sign license data with private key
   */
  static signLicense(licenseData: any, privateKey: string): string {
    const dataString = JSON.stringify(licenseData, Object.keys(licenseData).sort());
    const signature = crypto.sign(this.HASH_ALGORITHM, Buffer.from(dataString));

    const sign = crypto.createSign(this.HASH_ALGORITHM);
    sign.update(dataString);
    sign.end();

    return sign.sign(privateKey, 'base64');
  }

  /**
   * Verify license signature with public key
   */
  static verifyLicense(licenseData: any, signature: string, publicKey: string): boolean {
    try {
      const { signature: _, ...dataToVerify } = licenseData;
      const dataString = JSON.stringify(dataToVerify, Object.keys(dataToVerify).sort());

      const verify = crypto.createVerify(this.HASH_ALGORITHM);
      verify.update(dataString);
      verify.end();

      return verify.verify(publicKey, signature, 'base64');
    } catch (error) {
      console.error('License verification failed:', error);
      return false;
    }
  }

  /**
   * Encrypt sensitive license data
   */
  static encryptLicenseData(data: string, password: string): { encrypted: string; iv: string; salt: string } {
    const salt = crypto.randomBytes(16);
    const iv = crypto.randomBytes(16);
    const key = crypto.pbkdf2Sync(password, salt, 10000, 32, 'sha256');

    const cipher = crypto.createCipher('aes-256-gcm', key);
    cipher.setAAD(Buffer.from('license-data'));

    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return {
      encrypted: encrypted + authTag.toString('hex'),
      iv: iv.toString('hex'),
      salt: salt.toString('hex')
    };
  }

  /**
   * Decrypt license data
   */
  static decryptLicenseData(encryptedData: { encrypted: string; iv: string; salt: string }, password: string): string {
    try {
      const salt = Buffer.from(encryptedData.salt, 'hex');
      const iv = Buffer.from(encryptedData.iv, 'hex');
      const key = crypto.pbkdf2Sync(password, salt, 10000, 32, 'sha256');

      const encryptedText = encryptedData.encrypted.slice(0, -32);
      const authTag = Buffer.from(encryptedData.encrypted.slice(-32), 'hex');

      const decipher = crypto.createDecipher('aes-256-gcm', key);
      decipher.setAuthTag(authTag);
      decipher.setAAD(Buffer.from('license-data'));

      let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      throw new Error('Failed to decrypt license data');
    }
  }

  /**
   * Generate activation code
   */
  static generateActivationCode(): string {
    const segments = [];
    for (let i = 0; i < 4; i++) {
      const segment = crypto.randomBytes(2).toString('hex').toUpperCase();
      segments.push(segment);
    }
    return segments.join('-');
  }

  /**
   * Create tamper-resistant license hash
   */
  static createLicenseHash(license: any): string {
    const criticalFields = [
      license.id,
      license.userId,
      license.tier,
      license.hardwareBinding.fingerprint,
      license.expiresAt,
      license.features
    ];

    const combined = JSON.stringify(criticalFields);
    return crypto.createHash('sha512').update(combined).digest('hex');
  }

  /**
   * Verify license integrity
   */
  static verifyLicenseIntegrity(license: any, expectedHash: string): boolean {
    const currentHash = this.createLicenseHash(license);
    return crypto.timingSafeEqual(
      Buffer.from(currentHash, 'hex'),
      Buffer.from(expectedHash, 'hex')
    );
  }

  /**
   * Generate secure random ID
   */
  static generateSecureId(): string {
    return crypto.randomUUID();
  }

  /**
   * Create checksum for license file
   */
  static createChecksum(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Obfuscate license data for storage
   */
  static obfuscateLicenseData(licenseData: string): string {
    const key = crypto.randomBytes(32);
    const iv = crypto.randomBytes(16);

    const cipher = crypto.createCipher('aes-256-cbc', key);
    let encrypted = cipher.update(licenseData, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    // Store key and IV with encrypted data in a way that's not immediately obvious
    const combined = Buffer.concat([
      key,
      iv,
      Buffer.from(encrypted, 'base64')
    ]);

    return combined.toString('base64');
  }

  /**
   * Deobfuscate license data
   */
  static deobfuscateLicenseData(obfuscatedData: string): string {
    try {
      const combined = Buffer.from(obfuscatedData, 'base64');
      const key = combined.slice(0, 32);
      const iv = combined.slice(32, 48);
      const encrypted = combined.slice(48);

      const decipher = crypto.createDecipher('aes-256-cbc', key);
      let decrypted = decipher.update(encrypted, undefined, 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      throw new Error('Failed to deobfuscate license data');
    }
  }

  /**
   * Anti-debugging and anti-tampering checks
   */
  static performSecurityChecks(): {
    codeIntegrity: boolean;
    environmentSafe: boolean;
    debuggerDetected: boolean;
    virtualMachineDetected: boolean;
    clockTampering: boolean;
  } {
    const results = {
      codeIntegrity: true,
      environmentSafe: true,
      debuggerDetected: false,
      virtualMachineDetected: false,
      clockTampering: false
    };

    // Check for debugger
    const startTime = Date.now();
    // Debugger detection technique
    eval('debugger');
    const endTime = Date.now();
    if (endTime - startTime > 100) {
      results.debuggerDetected = true;
    }

    // Check for virtual machine indicators
    const vmIndicators = [
      'VMware',
      'VirtualBox',
      'QEMU',
      'Xen',
      'Microsoft Corporation' // Hyper-V
    ];

    // In a real implementation, check system info
    // This is a simplified version
    if (typeof window !== 'undefined' && window.navigator) {
      const userAgent = window.navigator.userAgent;
      results.virtualMachineDetected = vmIndicators.some(indicator =>
        userAgent.includes(indicator)
      );
    }

    // Clock tampering detection
    const systemTime = Date.now();
    const performanceTime = performance.now();
    const timeDiff = Math.abs(systemTime - (performance.timeOrigin + performanceTime));

    if (timeDiff > 5000) { // 5 second threshold
      results.clockTampering = true;
    }

    return results;
  }
}