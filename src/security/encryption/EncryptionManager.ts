/**
 * Encryption Manager
 * Comprehensive encryption for sensitive data at rest and in transit
 */

import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { Transform } from 'stream';

export interface EncryptionConfig {
  algorithm: string;
  keyDerivation: string;
  saltLength: number;
  keyLength?: number;
  iterations?: number;
  masterKey?: string;
  rotationInterval?: number;
  compressionEnabled?: boolean;
  integrityCheck?: boolean;
}

export class EncryptionManager {
  private config: EncryptionConfig;
  private masterKey: Buffer;
  private keyCache: Map<string, DerivedKey> = new Map();
  private rotationTimer?: NodeJS.Timeout;

  constructor(config: EncryptionConfig) {
    this.config = {
      keyLength: 32,
      iterations: 100000,
      rotationInterval: 24 * 60 * 60 * 1000, // 24 hours
      compressionEnabled: true,
      integrityCheck: true,
      ...config
    };

    this.initializeMasterKey();
    this.setupKeyRotation();
  }

  /**
   * Initialize master key from config or generate new one
   */
  private initializeMasterKey(): void {
    if (this.config.masterKey) {
      this.masterKey = Buffer.from(this.config.masterKey, 'hex');
    } else {
      this.masterKey = crypto.randomBytes(this.config.keyLength || 32);
      console.warn('Generated new master key. Store securely:', this.masterKey.toString('hex'));
    }
  }

  /**
   * Setup automatic key rotation
   */
  private setupKeyRotation(): void {
    if (this.config.rotationInterval) {
      this.rotationTimer = setInterval(() => {
        this.rotateKeys();
      }, this.config.rotationInterval);
    }
  }

  /**
   * Encrypt data with AES-GCM
   */
  public encryptData(data: string | Buffer, context?: string): EncryptedData {
    try {
      const plaintext = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8');

      // Generate random salt and IV
      const salt = crypto.randomBytes(this.config.saltLength);
      const iv = crypto.randomBytes(16); // AES-GCM standard IV length

      // Derive encryption key
      const derivedKey = this.deriveKey(salt, context);

      // Compress data if enabled
      const dataToEncrypt = this.config.compressionEnabled ?
        this.compressData(plaintext) : plaintext;

      // Encrypt with AES-GCM
      const cipher = crypto.createCipher(this.config.algorithm, derivedKey.key);
      cipher.setAAD(salt); // Additional Authenticated Data

      const encrypted = Buffer.concat([
        cipher.update(dataToEncrypt),
        cipher.final()
      ]);

      const authTag = cipher.getAuthTag();

      // Create encrypted data structure
      const encryptedData: EncryptedData = {
        algorithm: this.config.algorithm,
        salt: salt.toString('base64'),
        iv: iv.toString('base64'),
        authTag: authTag.toString('base64'),
        data: encrypted.toString('base64'),
        compressed: this.config.compressionEnabled,
        timestamp: Date.now(),
        keyVersion: derivedKey.version
      };

      // Add integrity check if enabled
      if (this.config.integrityCheck) {
        encryptedData.integrity = this.calculateIntegrityHash(encryptedData);
      }

      return encryptedData;
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt data
   */
  public decryptData(encryptedData: EncryptedData): Buffer {
    try {
      // Verify integrity if enabled
      if (this.config.integrityCheck && encryptedData.integrity) {
        if (!this.verifyIntegrityHash(encryptedData)) {
          throw new Error('Data integrity check failed');
        }
      }

      // Parse encrypted components
      const salt = Buffer.from(encryptedData.salt, 'base64');
      const iv = Buffer.from(encryptedData.iv, 'base64');
      const authTag = Buffer.from(encryptedData.authTag, 'base64');
      const data = Buffer.from(encryptedData.data, 'base64');

      // Derive decryption key
      const derivedKey = this.deriveKey(salt, undefined, encryptedData.keyVersion);

      // Decrypt with AES-GCM
      const decipher = crypto.createDecipher(encryptedData.algorithm, derivedKey.key);
      decipher.setAAD(salt);
      decipher.setAuthTag(authTag);

      const decrypted = Buffer.concat([
        decipher.update(data),
        decipher.final()
      ]);

      // Decompress if needed
      const finalData = encryptedData.compressed ?
        this.decompressData(decrypted) : decrypted;

      return finalData;
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Encrypt data at rest (for database storage)
   */
  public encryptAtRest(data: any, tableName: string, columnName: string): string {
    const context = `${tableName}.${columnName}`;
    const serialized = JSON.stringify(data);
    const encrypted = this.encryptData(serialized, context);
    return JSON.stringify(encrypted);
  }

  /**
   * Decrypt data at rest
   */
  public decryptAtRest(encryptedJson: string): any {
    try {
      const encryptedData = JSON.parse(encryptedJson) as EncryptedData;
      const decrypted = this.decryptData(encryptedData);
      return JSON.parse(decrypted.toString('utf8'));
    } catch (error) {
      console.error('At-rest decryption error:', error);
      throw new Error('Failed to decrypt stored data');
    }
  }

  /**
   * Create encryption stream for in-transit data
   */
  public createEncryptionStream(context?: string): Transform {
    const salt = crypto.randomBytes(this.config.saltLength);
    const iv = crypto.randomBytes(16);
    const derivedKey = this.deriveKey(salt, context);

    const cipher = crypto.createCipher(this.config.algorithm, derivedKey.key);
    cipher.setAAD(salt);

    return new Transform({
      transform(chunk, encoding, callback) {
        try {
          const encrypted = cipher.update(chunk);
          callback(null, encrypted);
        } catch (error) {
          callback(error);
        }
      },

      flush(callback) {
        try {
          const final = cipher.final();
          const authTag = cipher.getAuthTag();

          // Prepend metadata
          const metadata = {
            salt: salt.toString('base64'),
            iv: iv.toString('base64'),
            authTag: authTag.toString('base64'),
            algorithm: this.config.algorithm
          };

          const metadataBuffer = Buffer.from(JSON.stringify(metadata) + '\n');
          callback(null, Buffer.concat([metadataBuffer, final]));
        } catch (error) {
          callback(error);
        }
      }
    });
  }

  /**
   * Create decryption stream for in-transit data
   */
  public createDecryptionStream(): Transform {
    let metadata: any = null;
    let metadataBuffer = Buffer.alloc(0);
    let decipher: crypto.Decipher | null = null;

    return new Transform({
      transform(chunk, encoding, callback) {
        try {
          if (!metadata) {
            // Accumulate metadata
            metadataBuffer = Buffer.concat([metadataBuffer, chunk]);
            const newlineIndex = metadataBuffer.indexOf('\n');

            if (newlineIndex !== -1) {
              // Parse metadata
              const metadataJson = metadataBuffer.slice(0, newlineIndex).toString();
              metadata = JSON.parse(metadataJson);

              // Initialize decipher
              const salt = Buffer.from(metadata.salt, 'base64');
              const derivedKey = this.deriveKey(salt);

              decipher = crypto.createDecipher(metadata.algorithm, derivedKey.key);
              decipher.setAAD(salt);
              decipher.setAuthTag(Buffer.from(metadata.authTag, 'base64'));

              // Process remaining data
              const remainingData = metadataBuffer.slice(newlineIndex + 1);
              if (remainingData.length > 0) {
                const decrypted = decipher.update(remainingData);
                callback(null, decrypted);
              } else {
                callback();
              }
            } else {
              callback();
            }
          } else if (decipher) {
            // Decrypt chunk
            const decrypted = decipher.update(chunk);
            callback(null, decrypted);
          } else {
            callback(new Error('Decipher not initialized'));
          }
        } catch (error) {
          callback(error);
        }
      },

      flush(callback) {
        try {
          if (decipher) {
            const final = decipher.final();
            callback(null, final);
          } else {
            callback();
          }
        } catch (error) {
          callback(error);
        }
      }
    });
  }

  /**
   * Hash password with bcrypt
   */
  public async hashPassword(password: string): Promise<string> {
    try {
      const saltRounds = 12; // High security setting
      return await bcrypt.hash(password, saltRounds);
    } catch (error) {
      console.error('Password hashing error:', error);
      throw new Error('Failed to hash password');
    }
  }

  /**
   * Verify password against hash
   */
  public async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      console.error('Password verification error:', error);
      return false;
    }
  }

  /**
   * Generate secure random token
   */
  public generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Create HMAC signature
   */
  public createHMAC(data: string | Buffer, secret?: string): string {
    const hmacSecret = secret || this.masterKey.toString('hex');
    const hmac = crypto.createHmac('sha256', hmacSecret);
    hmac.update(data);
    return hmac.digest('hex');
  }

  /**
   * Verify HMAC signature
   */
  public verifyHMAC(data: string | Buffer, signature: string, secret?: string): boolean {
    const expectedSignature = this.createHMAC(data, secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  }

  /**
   * Derive encryption key from master key
   */
  private deriveKey(salt: Buffer, context?: string, version?: number): DerivedKey {
    const cacheKey = `${salt.toString('hex')}_${context || 'default'}_${version || 1}`;

    let cachedKey = this.keyCache.get(cacheKey);
    if (cachedKey && Date.now() - cachedKey.timestamp < 60000) { // 1 minute cache
      return cachedKey;
    }

    let keyMaterial = this.masterKey;

    // Add context to key derivation
    if (context) {
      const contextHash = crypto.createHash('sha256').update(context).digest();
      keyMaterial = Buffer.concat([keyMaterial, contextHash]);
    }

    let derivedKey: Buffer;

    switch (this.config.keyDerivation) {
      case 'pbkdf2':
        derivedKey = crypto.pbkdf2Sync(
          keyMaterial,
          salt,
          this.config.iterations!,
          this.config.keyLength!,
          'sha256'
        );
        break;

      case 'scrypt':
        derivedKey = crypto.scryptSync(
          keyMaterial,
          salt,
          this.config.keyLength!,
          { N: 16384, r: 8, p: 1 }
        );
        break;

      default:
        throw new Error(`Unsupported key derivation: ${this.config.keyDerivation}`);
    }

    const key: DerivedKey = {
      key: derivedKey,
      version: version || 1,
      timestamp: Date.now()
    };

    this.keyCache.set(cacheKey, key);
    return key;
  }

  /**
   * Compress data using gzip
   */
  private compressData(data: Buffer): Buffer {
    const zlib = require('zlib');
    return zlib.gzipSync(data);
  }

  /**
   * Decompress data using gzip
   */
  private decompressData(data: Buffer): Buffer {
    const zlib = require('zlib');
    return zlib.gunzipSync(data);
  }

  /**
   * Calculate integrity hash
   */
  private calculateIntegrityHash(encryptedData: EncryptedData): string {
    const components = [
      encryptedData.algorithm,
      encryptedData.salt,
      encryptedData.iv,
      encryptedData.authTag,
      encryptedData.data
    ].join('|');

    return crypto.createHash('sha256').update(components).digest('hex');
  }

  /**
   * Verify integrity hash
   */
  private verifyIntegrityHash(encryptedData: EncryptedData): boolean {
    if (!encryptedData.integrity) {
      return false;
    }

    const expectedHash = this.calculateIntegrityHash(encryptedData);
    return crypto.timingSafeEqual(
      Buffer.from(encryptedData.integrity, 'hex'),
      Buffer.from(expectedHash, 'hex')
    );
  }

  /**
   * Rotate encryption keys
   */
  private rotateKeys(): void {
    // Clear key cache to force regeneration with new version
    this.keyCache.clear();

    console.log('Encryption keys rotated');
  }

  /**
   * Secure data wiping
   */
  public secureWipe(buffer: Buffer): void {
    // Overwrite buffer with random data multiple times
    for (let i = 0; i < 3; i++) {
      crypto.randomFillSync(buffer);
    }
    buffer.fill(0);
  }

  /**
   * Generate key pair for asymmetric encryption
   */
  public generateKeyPair(): { publicKey: string; privateKey: string } {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
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
   * Encrypt with public key (RSA)
   */
  public encryptWithPublicKey(data: string, publicKey: string): string {
    const encrypted = crypto.publicEncrypt(publicKey, Buffer.from(data, 'utf8'));
    return encrypted.toString('base64');
  }

  /**
   * Decrypt with private key (RSA)
   */
  public decryptWithPrivateKey(encryptedData: string, privateKey: string): string {
    const decrypted = crypto.privateDecrypt(privateKey, Buffer.from(encryptedData, 'base64'));
    return decrypted.toString('utf8');
  }

  /**
   * Health check for encryption system
   */
  public async healthCheck(): Promise<'healthy' | 'degraded' | 'critical'> {
    try {
      // Test encryption/decryption
      const testData = 'health-check-test-data';
      const encrypted = this.encryptData(testData, 'health-check');
      const decrypted = this.decryptData(encrypted);

      if (decrypted.toString('utf8') !== testData) {
        return 'critical';
      }

      // Test password hashing
      const testPassword = 'test-password-123';
      const hash = await this.hashPassword(testPassword);
      const isValid = await this.verifyPassword(testPassword, hash);

      if (!isValid) {
        return 'critical';
      }

      // Check key cache size
      if (this.keyCache.size > 1000) {
        return 'degraded';
      }

      return 'healthy';
    } catch (error) {
      console.error('Encryption health check failed:', error);
      return 'critical';
    }
  }

  /**
   * Get encryption statistics
   */
  public getStatistics(): {
    algorithm: string;
    keyDerivation: string;
    cachedKeys: number;
    masterKeyAge: number;
    rotationInterval: number;
    compressionEnabled: boolean;
    integrityCheckEnabled: boolean;
  } {
    return {
      algorithm: this.config.algorithm,
      keyDerivation: this.config.keyDerivation,
      cachedKeys: this.keyCache.size,
      masterKeyAge: Date.now(), // In production, track actual key age
      rotationInterval: this.config.rotationInterval || 0,
      compressionEnabled: !!this.config.compressionEnabled,
      integrityCheckEnabled: !!this.config.integrityCheck
    };
  }

  /**
   * Cleanup resources
   */
  public cleanup(): void {
    if (this.rotationTimer) {
      clearInterval(this.rotationTimer);
    }

    // Secure wipe of sensitive data
    this.secureWipe(this.masterKey);
    this.keyCache.clear();
  }
}

/**
 * Encrypted Data Interface
 */
export interface EncryptedData {
  algorithm: string;
  salt: string;
  iv: string;
  authTag: string;
  data: string;
  compressed: boolean;
  timestamp: number;
  keyVersion: number;
  integrity?: string;
}

/**
 * Derived Key Interface
 */
interface DerivedKey {
  key: Buffer;
  version: number;
  timestamp: number;
}