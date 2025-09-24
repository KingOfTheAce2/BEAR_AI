/**
 * Tests for License Crypto Functions
 * Validates cryptographic operations used in the licensing system
 */

import { LicenseCrypto } from './license.crypto';

describe('LicenseCrypto', () => {
  describe('Key Generation', () => {
    test('should generate RSA key pair', () => {
      const keyPair = LicenseCrypto.generateKeyPair();

      expect(keyPair).toBeDefined();
      expect(keyPair.publicKey).toContain('-----BEGIN PUBLIC KEY-----');
      expect(keyPair.privateKey).toContain('-----BEGIN PRIVATE KEY-----');
      expect(keyPair.publicKey).toContain('-----END PUBLIC KEY-----');
      expect(keyPair.privateKey).toContain('-----END PRIVATE KEY-----');
    });

    test('should generate different key pairs each time', () => {
      const keyPair1 = LicenseCrypto.generateKeyPair();
      const keyPair2 = LicenseCrypto.generateKeyPair();

      expect(keyPair1.publicKey).not.toBe(keyPair2.publicKey);
      expect(keyPair1.privateKey).not.toBe(keyPair2.privateKey);
    });
  });

  describe('Hardware Fingerprinting', () => {
    test('should create hardware fingerprint', () => {
      const hardwareInfo = {
        cpuId: 'Intel Core i7-9700K',
        motherboardSerial: 'MB12345',
        diskSerial: 'SSD67890',
        macAddress: '00:11:22:33:44:55',
        osInfo: 'Windows 10 Pro'
      };

      const fingerprint = LicenseCrypto.createHardwareFingerprint(hardwareInfo);

      expect(fingerprint).toBeDefined();
      expect(fingerprint).toHaveLength(64); // SHA256 hex string length
      expect(/^[a-f0-9]+$/.test(fingerprint)).toBe(true);
    });

    test('should create same fingerprint for same hardware', () => {
      const hardwareInfo = {
        cpuId: 'Intel Core i7-9700K',
        motherboardSerial: 'MB12345',
        diskSerial: 'SSD67890',
        macAddress: '00:11:22:33:44:55',
        osInfo: 'Windows 10 Pro'
      };

      const fingerprint1 = LicenseCrypto.createHardwareFingerprint(hardwareInfo);
      const fingerprint2 = LicenseCrypto.createHardwareFingerprint(hardwareInfo);

      expect(fingerprint1).toBe(fingerprint2);
    });

    test('should create different fingerprint for different hardware', () => {
      const hardwareInfo1 = {
        cpuId: 'Intel Core i7-9700K',
        motherboardSerial: 'MB12345',
        diskSerial: 'SSD67890',
        macAddress: '00:11:22:33:44:55',
        osInfo: 'Windows 10 Pro'
      };

      const hardwareInfo2 = {
        cpuId: 'AMD Ryzen 7 3700X',
        motherboardSerial: 'MB54321',
        diskSerial: 'SSD09876',
        macAddress: '55:44:33:22:11:00',
        osInfo: 'Ubuntu 20.04 LTS'
      };

      const fingerprint1 = LicenseCrypto.createHardwareFingerprint(hardwareInfo1);
      const fingerprint2 = LicenseCrypto.createHardwareFingerprint(hardwareInfo2);

      expect(fingerprint1).not.toBe(fingerprint2);
    });
  });

  describe('License Signing and Verification', () => {
    let keyPair: { publicKey: string; privateKey: string };
    let licenseData: any;

    beforeEach(() => {
      keyPair = LicenseCrypto.generateKeyPair();
      licenseData = {
        id: 'license-123',
        userId: 'user-456',
        tier: 'professional',
        expiresAt: new Date('2024-12-31').toISOString(),
        features: ['chat', 'analysis', 'api'],
        hardwareBinding: {
          fingerprint: 'abc123def456',
          allowedTransfers: 3
        }
      };
    });

    test('should sign license data', () => {
      const signature = LicenseCrypto.signLicense(licenseData, keyPair.privateKey);

      expect(signature).toBeDefined();
      expect(typeof signature).toBe('string');
      expect(signature.length).toBeGreaterThan(0);
    });

    test('should verify valid license signature', () => {
      const signature = LicenseCrypto.signLicense(licenseData, keyPair.privateKey);
      const isValid = LicenseCrypto.verifyLicense(licenseData, signature, keyPair.publicKey);

      expect(isValid).toBe(true);
    });

    test('should reject invalid signature', () => {
      const signature = LicenseCrypto.signLicense(licenseData, keyPair.privateKey);
      const tampperedData = { ...licenseData, tier: 'enterprise' };

      const isValid = LicenseCrypto.verifyLicense(tampperedData, signature, keyPair.publicKey);

      expect(isValid).toBe(false);
    });

    test('should reject signature from wrong key', () => {
      const otherKeyPair = LicenseCrypto.generateKeyPair();
      const signature = LicenseCrypto.signLicense(licenseData, keyPair.privateKey);

      const isValid = LicenseCrypto.verifyLicense(licenseData, signature, otherKeyPair.publicKey);

      expect(isValid).toBe(false);
    });

    test('should handle license data with signature field', () => {
      const dataWithSignature = {
        ...licenseData,
        signature: 'existing-signature'
      };

      const signature = LicenseCrypto.signLicense(dataWithSignature, keyPair.privateKey);
      const isValid = LicenseCrypto.verifyLicense(dataWithSignature, signature, keyPair.publicKey);

      expect(isValid).toBe(true);
    });
  });

  describe('Encryption and Decryption', () => {
    const testData = 'This is sensitive license information';
    const password = 'secure-password-123';

    test('should encrypt license data', () => {
      const encrypted = LicenseCrypto.encryptLicenseData(testData, password);

      expect(encrypted).toBeDefined();
      expect(encrypted.encrypted).toBeDefined();
      expect(encrypted.iv).toBeDefined();
      expect(encrypted.salt).toBeDefined();
      expect(encrypted.encrypted).not.toBe(testData);
    });

    test('should decrypt license data', () => {
      const encrypted = LicenseCrypto.encryptLicenseData(testData, password);
      const decrypted = LicenseCrypto.decryptLicenseData(encrypted, password);

      expect(decrypted).toBe(testData);
    });

    test('should fail with wrong password', () => {
      const encrypted = LicenseCrypto.encryptLicenseData(testData, password);

      expect(() => {
        LicenseCrypto.decryptLicenseData(encrypted, 'wrong-password');
      }).toThrow('Failed to decrypt license data');
    });

    test('should generate unique encrypted data each time', () => {
      const encrypted1 = LicenseCrypto.encryptLicenseData(testData, password);
      const encrypted2 = LicenseCrypto.encryptLicenseData(testData, password);

      expect(encrypted1.encrypted).not.toBe(encrypted2.encrypted);
      expect(encrypted1.iv).not.toBe(encrypted2.iv);
      expect(encrypted1.salt).not.toBe(encrypted2.salt);
    });
  });

  describe('Activation Code Generation', () => {
    test('should generate activation code', () => {
      const code = LicenseCrypto.generateActivationCode();

      expect(code).toBeDefined();
      expect(code).toMatch(/^[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}$/);
    });

    test('should generate unique codes', () => {
      const codes = new Set();
      for (let i = 0; i < 100; i++) {
        codes.add(LicenseCrypto.generateActivationCode());
      }

      expect(codes.size).toBe(100); // All codes should be unique
    });
  });

  describe('License Hash and Integrity', () => {
    const license = {
      id: 'license-123',
      userId: 'user-456',
      tier: 'professional',
      hardwareBinding: {
        fingerprint: 'abc123def456'
      },
      expiresAt: '2024-12-31T23:59:59Z',
      features: ['chat', 'analysis']
    };

    test('should create license hash', () => {
      const hash = LicenseCrypto.createLicenseHash(license);

      expect(hash).toBeDefined();
      expect(hash).toHaveLength(128); // SHA512 hex string length
      expect(/^[a-f0-9]+$/.test(hash)).toBe(true);
    });

    test('should create same hash for same license', () => {
      const hash1 = LicenseCrypto.createLicenseHash(license);
      const hash2 = LicenseCrypto.createLicenseHash(license);

      expect(hash1).toBe(hash2);
    });

    test('should verify license integrity', () => {
      const hash = LicenseCrypto.createLicenseHash(license);
      const isValid = LicenseCrypto.verifyLicenseIntegrity(license, hash);

      expect(isValid).toBe(true);
    });

    test('should detect tampered license', () => {
      const hash = LicenseCrypto.createLicenseHash(license);
      const tamperedLicense = { ...license, tier: 'enterprise' };

      const isValid = LicenseCrypto.verifyLicenseIntegrity(tamperedLicense, hash);

      expect(isValid).toBe(false);
    });

    test('should handle malformed hash', () => {
      const isValid = LicenseCrypto.verifyLicenseIntegrity(license, 'invalid-hash');

      expect(isValid).toBe(false);
    });
  });

  describe('Utility Functions', () => {
    test('should generate secure ID', () => {
      const id = LicenseCrypto.generateSecureId();

      expect(id).toBeDefined();
      expect(typeof id).toBe('string');
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/); // UUID v4 pattern
    });

    test('should create checksum', () => {
      const data = 'test data for checksum';
      const checksum = LicenseCrypto.createChecksum(data);

      expect(checksum).toBeDefined();
      expect(checksum).toHaveLength(64); // SHA256 hex string length
      expect(/^[a-f0-9]+$/.test(checksum)).toBe(true);
    });

    test('should create consistent checksums', () => {
      const data = 'test data for checksum';
      const checksum1 = LicenseCrypto.createChecksum(data);
      const checksum2 = LicenseCrypto.createChecksum(data);

      expect(checksum1).toBe(checksum2);
    });
  });

  describe('Obfuscation', () => {
    const testData = 'sensitive license information';

    test('should obfuscate data', () => {
      const obfuscated = LicenseCrypto.obfuscateLicenseData(testData);

      expect(obfuscated).toBeDefined();
      expect(obfuscated).not.toBe(testData);
      expect(typeof obfuscated).toBe('string');
    });

    test('should deobfuscate data', () => {
      const obfuscated = LicenseCrypto.obfuscateLicenseData(testData);
      const deobfuscated = LicenseCrypto.deobfuscateLicenseData(obfuscated);

      expect(deobfuscated).toBe(testData);
    });

    test('should fail with invalid obfuscated data', () => {
      expect(() => {
        LicenseCrypto.deobfuscateLicenseData('invalid-data');
      }).toThrow('Failed to deobfuscate license data');
    });
  });

  describe('Security Checks', () => {
    test('should perform security checks', () => {
      const result = LicenseCrypto.performSecurityChecks();

      expect(result).toBeDefined();
      expect(result).toHaveProperty('codeIntegrity');
      expect(result).toHaveProperty('environmentSafe');
      expect(result).toHaveProperty('debuggerDetected');
      expect(result).toHaveProperty('virtualMachineDetected');
      expect(result).toHaveProperty('clockTampering');
      expect(result).toHaveProperty('reasons');

      expect(typeof result.codeIntegrity).toBe('boolean');
      expect(typeof result.environmentSafe).toBe('boolean');
      expect(typeof result.debuggerDetected).toBe('boolean');
      expect(typeof result.virtualMachineDetected).toBe('boolean');
      expect(typeof result.clockTampering).toBe('boolean');
      expect(Array.isArray(result.reasons)).toBe(true);
    });

    test('should validate code integrity', () => {
      const isValid = LicenseCrypto.validateCodeIntegrity();

      expect(typeof isValid).toBe('boolean');
      // In a test environment, this might return false due to different file paths
      // but the function should not throw
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty license data', () => {
      const keyPair = LicenseCrypto.generateKeyPair();
      const emptyData = {};

      const signature = LicenseCrypto.signLicense(emptyData, keyPair.privateKey);
      const isValid = LicenseCrypto.verifyLicense(emptyData, signature, keyPair.publicKey);

      expect(isValid).toBe(true);
    });

    test('should handle null/undefined in verification', () => {
      const keyPair = LicenseCrypto.generateKeyPair();

      const isValid1 = LicenseCrypto.verifyLicense(null, 'signature', keyPair.publicKey);
      const isValid2 = LicenseCrypto.verifyLicense(undefined, 'signature', keyPair.publicKey);

      expect(isValid1).toBe(false);
      expect(isValid2).toBe(false);
    });

    test('should handle malformed keys gracefully', () => {
      const licenseData = { test: 'data' };

      expect(() => {
        LicenseCrypto.signLicense(licenseData, 'invalid-key');
      }).toThrow();

      const signature = 'invalid-signature';
      const isValid = LicenseCrypto.verifyLicense(licenseData, signature, 'invalid-key');
      expect(isValid).toBe(false);
    });
  });

  describe('Performance', () => {
    test('should perform cryptographic operations within reasonable time', () => {
      const startTime = Date.now();

      const keyPair = LicenseCrypto.generateKeyPair();
      const licenseData = { id: 'test', data: 'x'.repeat(1000) }; // 1KB of data
      const signature = LicenseCrypto.signLicense(licenseData, keyPair.privateKey);
      const isValid = LicenseCrypto.verifyLicense(licenseData, signature, keyPair.publicKey);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(isValid).toBe(true);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });
});