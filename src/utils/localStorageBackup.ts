/**
 * Local storage backup and restore utilities
 * Provides comprehensive backup management for chat data
 */

import { localChatHistoryService } from '../services/localChatHistory';
import { chatSessionService } from '../services/chatSessions';
import { encryptionService } from '../services/encryption';

export interface BackupMetadata {
  id: string;
  createdAt: Date;
  description: string;
  version: string;
  size: number;
  encrypted: boolean;
  sessionCount: number;
  messageCount: number;
  checksum: string;
  format: 'json' | 'encrypted';
}

export interface BackupData {
  metadata: BackupMetadata;
  sessions: any[];
  settings: any;
  version: string;
  createdAt: string;
}

export interface RestoreOptions {
  overwriteExisting: boolean;
  validateChecksums: boolean;
  importSettings: boolean;
  sessionFilter?: string[];
}

export interface BackupSchedule {
  enabled: boolean;
  frequency: 'daily' | 'weekly' | 'monthly';
  time: string; // HH:MM format
  maxBackups: number;
  autoCleanup: boolean;
}

export class LocalStorageBackupService {
  private static instance: LocalStorageBackupService;
  private readonly BACKUP_KEY_PREFIX = 'bear_ai_backup_';
  private readonly MANIFEST_KEY = 'bear_ai_backup_manifest';
  private readonly SETTINGS_KEY = 'bear_ai_backup_settings';
  
  private backupSchedule: BackupSchedule = {
    enabled: false,
    frequency: 'weekly',
    time: '02:00',
    maxBackups: 10,
    autoCleanup: true
  };

  private constructor() {
    this.loadBackupSettings();
  }

  public static getInstance(): LocalStorageBackupService {
    if (!LocalStorageBackupService.instance) {
      LocalStorageBackupService.instance = new LocalStorageBackupService();
    }
    return LocalStorageBackupService.instance;
  }

  /**
   * Create a comprehensive backup of all chat data
   */
  async createBackup(
    description: string = `Auto backup ${new Date().toLocaleString()}`,
    encrypt: boolean = true,
    sessionIds?: string[]
  ): Promise<BackupMetadata> {
    try {
      const backupId = this.generateBackupId();
      
      // Get all data to backup
      const sessions = await localChatHistoryService.exportChatData(sessionIds);
      const settings = this.getAppSettings();
      const storageStats = await localChatHistoryService.getStorageStats();

      // Create backup data structure
      const backupData: BackupData = {
        metadata: {
          id: backupId,
          createdAt: new Date(),
          description,
          version: '1.0',
          size: 0, // Will be calculated
          encrypted: encrypt,
          sessionCount: storageStats.totalSessions,
          messageCount: storageStats.totalMessages,
          checksum: '',
          format: encrypt ? 'encrypted' : 'json'
        },
        sessions: JSON.parse(sessions),
        settings,
        version: '1.0',
        createdAt: new Date().toISOString()
      };

      // Serialize data
      let serializedData = JSON.stringify(backupData);
      backupData.metadata.size = serializedData.length;

      // Calculate checksum before encryption
      const checksum = await this.calculateChecksum(serializedData);
      backupData.metadata.checksum = checksum;

      // Re-serialize with updated checksum
      serializedData = JSON.stringify(backupData);

      // Encrypt if requested
      if (encrypt && encryptionService.isInitialized()) {
        try {
          const encryptedData = await encryptionService.encrypt(serializedData);
          const encryptedString = JSON.stringify({
            data: Array.from(new Uint8Array(encryptedData.data)),
            iv: Array.from(encryptedData.iv),
            salt: Array.from(encryptedData.salt)
          });
          serializedData = encryptedString;
        } catch (encryptError) {
          console.warn('Encryption failed, storing unencrypted:', encryptError);
          encrypt = false;
          backupData.metadata.encrypted = false;
          backupData.metadata.format = 'json';
        }
      }

      // Store backup
      const backupKey = `${this.BACKUP_KEY_PREFIX}${backupId}`;
      this.setLocalStorageItem(backupKey, serializedData);

      // Update manifest
      await this.updateBackupManifest(backupData.metadata);

      // Cleanup old backups if auto-cleanup is enabled
      if (this.backupSchedule.autoCleanup) {
        await this.cleanupOldBackups();
      }

      return backupData.metadata;
    } catch (error) {
      console.error('Failed to create backup:', error);
      throw new Error(`Backup creation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Restore data from a backup
   */
  async restoreBackup(
    backupId: string,
    options: RestoreOptions = {
      overwriteExisting: false,
      validateChecksums: true,
      importSettings: false
    }
  ): Promise<{ success: boolean; imported: number; errors: number; warnings: string[] }> {
    try {
      const backupKey = `${this.BACKUP_KEY_PREFIX}${backupId}`;
      const serializedData = this.getLocalStorageItem(backupKey);
      
      if (!serializedData) {
        throw new Error(`Backup ${backupId} not found`);
      }

      let backupData: BackupData;

      // Check if data is encrypted
      try {
        const potentialEncrypted = JSON.parse(serializedData);
        if (potentialEncrypted.data && potentialEncrypted.iv && potentialEncrypted.salt) {
          // Data is encrypted, decrypt it
          if (!encryptionService.isInitialized()) {
            throw new Error('Encryption service not initialized - cannot decrypt backup');
          }

          const decryptedData = await encryptionService.decrypt({
            data: new Uint8Array(potentialEncrypted.data).buffer,
            iv: new Uint8Array(potentialEncrypted.iv),
            salt: new Uint8Array(potentialEncrypted.salt)
          });
          
          backupData = JSON.parse(decryptedData);
        } else {
          // Data is not encrypted
          backupData = potentialEncrypted;
        }
      } catch (parseError) {
        throw new Error('Invalid backup format or decryption failed');
      }

      const warnings: string[] = [];

      // Validate checksum if requested
      if (options.validateChecksums && backupData.metadata.checksum) {
        const currentChecksum = await this.calculateChecksum(
          JSON.stringify({
            ...backupData,
            metadata: { ...backupData.metadata, checksum: '' }
          })
        );

        if (currentChecksum !== backupData.metadata.checksum) {
          if (options.validateChecksums) {
            throw new Error('Backup integrity check failed - checksum mismatch');
          } else {
            warnings.push('Backup checksum validation failed but proceeding');
          }
        }
      }

      // Filter sessions if specified
      let sessionsToImport = backupData.sessions;
      if (options.sessionFilter && options.sessionFilter.length > 0) {
        sessionsToImport = backupData.sessions.filter(sessionData => 
          options.sessionFilter!.includes(sessionData.session.id)
        );
      }

      // Clear existing data if overwrite is requested
      if (options.overwriteExisting) {
        await chatSessionService.clearAllSessions();
      }

      // Import sessions
      const importData = {
        exportedAt: backupData.createdAt,
        version: backupData.version,
        sessions: sessionsToImport
      };

      const result = await localChatHistoryService.importChatData(JSON.stringify(importData));

      // Import settings if requested
      if (options.importSettings && backupData.settings) {
        this.setAppSettings(backupData.settings);
        warnings.push('Settings imported - may require app restart');
      }

      return {
        success: true,
        imported: result.imported,
        errors: result.errors,
        warnings
      };
    } catch (error) {
      console.error('Failed to restore backup:', error);
      const message = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        imported: 0,
        errors: 1,
        warnings: [message]
      };
    }
  }

  /**
   * List all available backups
   */
  async listBackups(): Promise<BackupMetadata[]> {
    try {
      const manifest = this.getBackupManifest();
      return manifest.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (error) {
      console.error('Failed to list backups:', error);
      return [];
    }
  }

  /**
   * Delete a backup
   */
  async deleteBackup(backupId: string): Promise<boolean> {
    try {
      const backupKey = `${this.BACKUP_KEY_PREFIX}${backupId}`;
      localStorage.removeItem(backupKey);

      // Update manifest
      const manifest = this.getBackupManifest();
      const updatedManifest = manifest.filter(backup => backup.id !== backupId);
      this.setLocalStorageItem(this.MANIFEST_KEY, JSON.stringify(updatedManifest));

      return true;
    } catch (error) {
      console.error('Failed to delete backup:', error);
      return false;
    }
  }

  /**
   * Export backup to file for external storage
   */
  async exportBackupToFile(backupId: string): Promise<Blob> {
    const backupKey = `${this.BACKUP_KEY_PREFIX}${backupId}`;
    const serializedData = this.getLocalStorageItem(backupKey);
    
    if (!serializedData) {
      throw new Error(`Backup ${backupId} not found`);
    }

    return new Blob([serializedData], { type: 'application/json' });
  }

  /**
   * Import backup from file
   */
  async importBackupFromFile(file: File): Promise<BackupMetadata> {
    try {
      const content = await file.text();
      
      // Validate it's a backup file
      let backupData: BackupData;
      try {
        // Try to parse as regular JSON first
        backupData = JSON.parse(content);
      } catch {
        // If that fails, it might be encrypted
        const potentialEncrypted = JSON.parse(content);
        if (potentialEncrypted.data && potentialEncrypted.iv && potentialEncrypted.salt) {
          if (!encryptionService.isInitialized()) {
            throw new Error('Cannot import encrypted backup without encryption service');
          }
          
          const decryptedData = await encryptionService.decrypt({
            data: new Uint8Array(potentialEncrypted.data).buffer,
            iv: new Uint8Array(potentialEncrypted.iv),
            salt: new Uint8Array(potentialEncrypted.salt)
          });
          
          backupData = JSON.parse(decryptedData);
        } else {
          throw new Error('Invalid backup file format');
        }
      }

      if (!backupData.metadata || !backupData.sessions) {
        throw new Error('Invalid backup file - missing required data');
      }

      // Generate new backup ID to avoid conflicts
      const newBackupId = this.generateBackupId();
      const updatedMetadata = {
        ...backupData.metadata,
        id: newBackupId,
        description: `Imported: ${backupData.metadata.description}`
      };

      // Store the backup
      const backupKey = `${this.BACKUP_KEY_PREFIX}${newBackupId}`;
      this.setLocalStorageItem(backupKey, content);

      // Update manifest
      await this.updateBackupManifest(updatedMetadata);

      return updatedMetadata;
    } catch (error) {
      console.error('Failed to import backup file:', error);
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Import failed: ${message}`);
    }
  }

  /**
   * Get storage usage statistics for backups
   */
  getBackupStorageStats(): {
    totalBackups: number;
    totalSize: number;
    averageSize: number;
    oldestBackup: Date | null;
    newestBackup: Date | null;
  } {
    try {
      const manifest = this.getBackupManifest();
      
      if (manifest.length === 0) {
        return {
          totalBackups: 0,
          totalSize: 0,
          averageSize: 0,
          oldestBackup: null,
          newestBackup: null
        };
      }

      const totalSize = manifest.reduce((sum, backup) => sum + backup.size, 0);
      const dates = manifest.map(b => new Date(b.createdAt)).sort((a, b) => a.getTime() - b.getTime());

      return {
        totalBackups: manifest.length,
        totalSize,
        averageSize: totalSize / manifest.length,
        oldestBackup: dates[0] ?? null,
        newestBackup: dates[dates.length - 1] ?? null
      };
    } catch (error) {
      console.error('Failed to get backup storage stats:', error);
      return {
        totalBackups: 0,
        totalSize: 0,
        averageSize: 0,
        oldestBackup: null,
        newestBackup: null
      };
    }
  }

  /**
   * Configure automatic backup schedule
   */
  setBackupSchedule(schedule: Partial<BackupSchedule>): void {
    this.backupSchedule = { ...this.backupSchedule, ...schedule };
    this.saveBackupSettings();
    
    if (schedule.enabled) {
      this.scheduleNextBackup();
    }
  }

  /**
   * Get current backup schedule
   */
  getBackupSchedule(): BackupSchedule {
    return { ...this.backupSchedule };
  }

  // Private methods

  private generateBackupId(): string {
    return `backup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async calculateChecksum(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
  }

  private getBackupManifest(): BackupMetadata[] {
    try {
      const manifestData = this.getLocalStorageItem(this.MANIFEST_KEY);
      return manifestData ? JSON.parse(manifestData) : [];
    } catch (error) {
      console.error('Failed to load backup manifest:', error);
      return [];
    }
  }

  private async updateBackupManifest(metadata: BackupMetadata): Promise<void> {
    const manifest = this.getBackupManifest();
    manifest.push(metadata);
    this.setLocalStorageItem(this.MANIFEST_KEY, JSON.stringify(manifest));
  }

  private async cleanupOldBackups(): Promise<void> {
    try {
      const manifest = this.getBackupManifest();
      
      if (manifest.length <= this.backupSchedule.maxBackups) {
        return;
      }

      // Sort by creation date (oldest first)
      const sortedBackups = manifest.sort((a, b) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

      // Delete oldest backups
      const backupsToDelete = sortedBackups.slice(0, manifest.length - this.backupSchedule.maxBackups);
      
      for (const backup of backupsToDelete) {
        await this.deleteBackup(backup.id);
      }
    } catch (error) {
      console.error('Failed to cleanup old backups:', error);
    }
  }

  private getAppSettings(): any {
    return {
      retentionPolicy: localChatHistoryService.getRetentionPolicy(),
      backupSchedule: this.backupSchedule,
      // Add other app settings as needed
    };
  }

  private setAppSettings(settings: any): void {
    if (settings.retentionPolicy) {
      localChatHistoryService.setRetentionPolicy(settings.retentionPolicy);
    }
    if (settings.backupSchedule) {
      this.setBackupSchedule(settings.backupSchedule);
    }
  }

  private loadBackupSettings(): void {
    try {
      const settings = this.getLocalStorageItem(this.SETTINGS_KEY);
      if (settings) {
        this.backupSchedule = { ...this.backupSchedule, ...JSON.parse(settings) };
      }
    } catch (error) {
      console.error('Failed to load backup settings:', error);
    }
  }

  private saveBackupSettings(): void {
    try {
      this.setLocalStorageItem(this.SETTINGS_KEY, JSON.stringify(this.backupSchedule));
    } catch (error) {
      console.error('Failed to save backup settings:', error);
    }
  }

  private scheduleNextBackup(): void {
    // Implementation for automatic backup scheduling
    // This would use setTimeout/setInterval based on the schedule
    console.log('Automatic backup scheduling not yet implemented');
  }

  private getLocalStorageItem(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.error('Failed to get localStorage item:', key, error);
      return null;
    }
  }

  private setLocalStorageItem(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.error('Failed to set localStorage item:', key, error);
      throw error;
    }
  }
}

export const localStorageBackupService = LocalStorageBackupService.getInstance();