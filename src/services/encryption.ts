/**
 * Client-side encryption service for secure chat data storage
 * Uses Web Crypto API for AES-GCM encryption
 */

export interface EncryptionKeys {
  masterKey: CryptoKey;
  salt: Uint8Array;
}

export interface EncryptedData {
  data: ArrayBuffer;
  iv: Uint8Array;
  salt: Uint8Array;
}

export class EncryptionService {
  private static instance: EncryptionService;
  private masterKey: CryptoKey | null = null;
  private salt: Uint8Array | null = null;

  private constructor() {}

  public static getInstance(): EncryptionService {
    if (!EncryptionService.instance) {
      EncryptionService.instance = new EncryptionService();
    }
    return EncryptionService.instance;
  }

  /**
   * Initialize encryption with user-derived key
   */
  async initialize(userSecret?: string): Promise<void> {
    try {
      // Generate or derive salt
      this.salt = new Uint8Array(16);
      crypto.getRandomValues(this.salt);

      // Create master key from user secret or generate random
      const keyMaterial = await this.deriveKeyMaterial(userSecret);
      this.masterKey = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: this.salt,
          iterations: 100000,
          hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
      );

      // Store encrypted keys in IndexedDB for persistence
      await this.persistKeys();
    } catch (error) {
      console.error('Encryption initialization failed:', error);
      throw new Error('Failed to initialize encryption service');
    }
  }

  /**
   * Encrypt data using AES-GCM
   */
  async encrypt(data: string): Promise<EncryptedData> {
    if (!this.masterKey) {
      throw new Error('Encryption service not initialized');
    }

    const iv = new Uint8Array(12);
    crypto.getRandomValues(iv);

    const encodedData = new TextEncoder().encode(data);
    const encryptedData = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      this.masterKey,
      encodedData
    );

    return {
      data: encryptedData,
      iv,
      salt: this.salt!
    };
  }

  /**
   * Decrypt data using AES-GCM
   */
  async decrypt(encryptedData: EncryptedData): Promise<string> {
    if (!this.masterKey) {
      throw new Error('Encryption service not initialized');
    }

    const decryptedData = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: encryptedData.iv },
      this.masterKey,
      encryptedData.data
    );

    return new TextDecoder().decode(decryptedData);
  }

  /**
   * Generate random encryption key for new installations
   */
  private async deriveKeyMaterial(userSecret?: string): Promise<CryptoKey> {
    const keyData = userSecret 
      ? new TextEncoder().encode(userSecret)
      : crypto.getRandomValues(new Uint8Array(32));

    return crypto.subtle.importKey(
      'raw',
      keyData,
      'PBKDF2',
      false,
      ['deriveKey']
    );
  }

  /**
   * Persist encryption keys to IndexedDB (encrypted)
   */
  private async persistKeys(): Promise<void> {
    // Implementation would store encrypted keys in IndexedDB
    // This is a placeholder for the actual key persistence logic
  }

  /**
   * Load persisted encryption keys
   */
  async loadPersistedKeys(): Promise<boolean> {
    try {
      // Implementation would load encrypted keys from IndexedDB
      // This is a placeholder for the actual key loading logic
      return true;
    } catch (error) {
      console.error('Failed to load persisted keys:', error);
      return false;
    }
  }

  /**
   * Clear all encryption data (for logout/reset)
   */
  async clearEncryptionData(): Promise<void> {
    this.masterKey = null;
    this.salt = null;
    // Clear from IndexedDB as well
  }

  /**
   * Check if encryption service is ready
   */
  isInitialized(): boolean {
    return this.masterKey !== null && this.salt !== null;
  }
}

export const encryptionService = EncryptionService.getInstance();