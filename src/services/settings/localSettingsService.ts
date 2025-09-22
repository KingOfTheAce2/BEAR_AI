import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import type {
  LocalSettingsConfig,
  SettingsBackup,
  SettingsCategory,
  SettingsValidationError
} from '../../types/settings';

class LocalSettingsService {
  private settingsDir: string;
  private settingsFile: string;
  private backupDir: string;
  private currentSettings: LocalSettingsConfig | null = null;
  private watchers: Map<string, ReturnType<typeof fs.watch>> = new Map();
  private listeners: Map<string, ((settings: LocalSettingsConfig) => void)[]> = new Map();

  constructor() {
    this.settingsDir = this.getSettingsDirectory();
    this.settingsFile = path.join(this.settingsDir, 'settings.json');
    this.backupDir = path.join(this.settingsDir, 'backups');
    this.ensureDirectoriesExist();
  }

  private getSettingsDirectory(): string {
    const platform = os.platform();
    const homeDir = os.homedir();

    switch (platform) {
      case 'win32':
        return path.join(process.env['APPDATA'] || path.join(homeDir, 'AppData', 'Roaming'), 'BearAI', 'Settings');
      case 'darwin':
        return path.join(homeDir, 'Library', 'Application Support', 'BearAI', 'Settings');
      case 'linux':
        return path.join(process.env['XDG_CONFIG_HOME'] || path.join(homeDir, '.config'), 'bear-ai', 'settings');
      default:
        return path.join(homeDir, '.bear-ai', 'settings');
    }
  }

  private ensureDirectoriesExist(): void {
    try {
      if (!fs.existsSync(this.settingsDir)) {
        fs.mkdirSync(this.settingsDir, { recursive: true });
      }
      if (!fs.existsSync(this.backupDir)) {
        fs.mkdirSync(this.backupDir, { recursive: true });
      }
    } catch (error) {
      console.error('Failed to create settings directories:', error);
      throw new Error('Unable to initialize settings storage');
    }
  }

  private getDefaultSettings(): LocalSettingsConfig {
    const now = new Date();
    const hardwareInfo = this.detectHardware();

    return {
      userPreferences: {
        version: '1.0.0',
        lastModified: now,
        schemaVersion: 1,
        language: 'en-US',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        dateFormat: 'MM/dd/yyyy',
        timeFormat: '12h',
        currency: 'USD',
        units: 'metric',
        autoSave: true,
        confirmBeforeExit: true,
        showTooltips: true,
        enableAnimations: true,
        soundEnabled: true,
        notificationsEnabled: true,
      },
      themeSettings: {
        version: '1.0.0',
        lastModified: now,
        schemaVersion: 1,
        activeTheme: 'auto',
        customThemes: [],
        fontSize: 'medium',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        uiScale: 1.0,
        colorBlindnessMode: 'none',
        highContrast: false,
        reduceMotion: false,
        compactMode: false,
        sidebarWidth: 300,
        showStatusBar: true,
        showLineNumbers: true,
        wordWrap: true,
      },
      modelSettings: {
        version: '1.0.0',
        lastModified: now,
        schemaVersion: 1,
        defaultModel: 'claude-3-sonnet',
        modelConfigurations: {},
        chatSettings: {
          temperature: 0.7,
          maxTokens: 4096,
          topP: 0.9,
          topK: 40,
          frequencyPenalty: 0,
          presencePenalty: 0,
          stopSequences: [],
          streamingEnabled: true,
        },
        codeSettings: {
          model: 'claude-3-sonnet',
          temperature: 0.3,
          maxTokens: 8192,
          contextWindow: 32768,
          enableCodeCompletion: true,
          enableRefactoring: true,
          enableDocGeneration: true,
        },
        imageSettings: {
          model: 'dall-e-3',
          quality: 'high',
          size: '1024x1024',
          style: 'natural',
        },
      },
      privacySettings: {
        version: '1.0.0',
        lastModified: now,
        schemaVersion: 1,
        dataCollection: {
          analytics: false,
          crashReporting: true,
          usageStatistics: false,
          performanceMetrics: false,
        },
        storage: {
          localStorageEnabled: true,
          sessionStorageEnabled: true,
          indexedDBEnabled: true,
          cookiesEnabled: false,
          maxStorageSize: 500,
          autoCleanup: true,
          retentionPeriod: 30,
        },
        network: {
          allowExternalRequests: true,
          allowedDomains: [],
          blockedDomains: [],
          proxySettings: {
            enabled: false,
            host: '',
            port: 0,
          },
        },
        content: {
          blockTrackers: true,
          blockAds: true,
          blockScripts: false,
          allowedScriptDomains: [],
          sanitizeInput: true,
          logSensitiveData: false,
        },
        encryption: {
          encryptSettings: false,
          encryptConversations: false,
          encryptFiles: false,
          algorithm: 'aes-256-gcm',
        },
      },
      systemSettings: {
        version: '1.0.0',
        lastModified: now,
        schemaVersion: 1,
        hardware: hardwareInfo,
        performance: {
          maxWorkerThreads: Math.max(2, os.cpus().length - 1),
          memoryLimit: Math.floor(os.totalmem() / 1024 / 1024 * 0.5), // 50% of total RAM
          gcSettings: {
            enabled: true,
            threshold: 0.8,
            frequency: 10000,
          },
          caching: {
            enabled: true,
            maxSize: 100,
            ttl: 3600,
          },
          preloading: {
            enabled: true,
            aggressiveness: 'medium',
          },
        },
        development: {
          debugMode: false,
          verboseLogging: false,
          enableProfiling: false,
          hotReload: true,
          sourceMaps: true,
          devTools: false,
        },
        updates: {
          autoCheck: true,
          autoDownload: false,
          autoInstall: false,
          channel: 'stable',
          checkInterval: 24,
        },
      },
    };
  }

  private detectHardware() {
    const cpus = os.cpus();
    return {
      cpuCores: cpus.length,
      totalMemory: Math.floor(os.totalmem() / 1024 / 1024), // in MB
      gpuInfo: [], // Would need additional detection for GPU info
      platform: os.platform(),
      architecture: os.arch(),
    };
  }

  async loadSettings(): Promise<LocalSettingsConfig> {
    try {
      if (!fs.existsSync(this.settingsFile)) {
        const defaultSettings = this.getDefaultSettings();
        await this.saveSettings(defaultSettings);
        this.currentSettings = defaultSettings;
        return defaultSettings;
      }

      const settingsData = fs.readFileSync(this.settingsFile, 'utf-8');
      const settings = JSON.parse(settingsData) as LocalSettingsConfig;
      
      // Validate and migrate settings if needed
      const validatedSettings = this.validateAndMigrate(settings);
      this.currentSettings = validatedSettings;
      
      return validatedSettings;
    } catch (error) {
      console.error('Failed to load settings:', error);
      const defaultSettings = this.getDefaultSettings();
      this.currentSettings = defaultSettings;
      return defaultSettings;
    }
  }

  async saveSettings(settings: LocalSettingsConfig): Promise<void> {
    try {
      // Update lastModified timestamps
      const now = new Date();
      const updatedSettings: LocalSettingsConfig = {
        ...settings,
        userPreferences: { ...settings.userPreferences, lastModified: now },
        themeSettings: { ...settings.themeSettings, lastModified: now },
        modelSettings: { ...settings.modelSettings, lastModified: now },
        privacySettings: { ...settings.privacySettings, lastModified: now },
        systemSettings: { ...settings.systemSettings, lastModified: now },
      };

      // Create backup before saving
      if (this.currentSettings) {
        await this.createAutoBackup(this.currentSettings);
      }

      const settingsJson = JSON.stringify(updatedSettings, null, 2);
      fs.writeFileSync(this.settingsFile, settingsJson, 'utf-8');
      
      this.currentSettings = updatedSettings;
      this.notifyListeners(updatedSettings);
    } catch (error) {
      console.error('Failed to save settings:', error);
      throw new Error('Unable to save settings');
    }
  }

  async updateSettings<K extends SettingsCategory>(
    category: K,
    updates: Partial<LocalSettingsConfig[K]>
  ): Promise<void> {
    const currentSettings = await this.loadSettings();
    const updatedSettings = {
      ...currentSettings,
      [category]: {
        ...currentSettings[category],
        ...updates,
        lastModified: new Date(),
      },
    };

    await this.saveSettings(updatedSettings);
  }

  async resetSettings(category?: SettingsCategory): Promise<void> {
    const defaultSettings = this.getDefaultSettings();
    
    if (category) {
      const currentSettings = await this.loadSettings();
      const resetSettings = {
        ...currentSettings,
        [category]: defaultSettings[category],
      };
      await this.saveSettings(resetSettings);
    } else {
      await this.saveSettings(defaultSettings);
    }
  }

  async exportSettings(): Promise<SettingsBackup> {
    const settings = await this.loadSettings();
    const backup: SettingsBackup = {
      version: '1.0.0',
      timestamp: new Date(),
      settings,
      metadata: {
        platform: os.platform(),
        appVersion: '1.0.0', // Would be injected from package.json
        backupType: 'manual',
      },
    };

    return backup;
  }

  async importSettings(backup: SettingsBackup): Promise<void> {
    try {
      // Validate backup format
      this.validateBackup(backup);
      
      // Migrate settings if from older version
      const migratedSettings = this.validateAndMigrate(backup.settings);
      
      await this.saveSettings(migratedSettings);
    } catch (error) {
      console.error('Failed to import settings:', error);
      throw new Error('Invalid backup file or import failed');
    }
  }

  async createBackup(description?: string): Promise<string> {
    const backup = await this.exportSettings();
    if (description !== undefined) {
      backup.metadata.description = description;
    } else if ('description' in backup.metadata) {
      delete backup.metadata.description;
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `settings-backup-${timestamp}.json`;
    const backupPath = path.join(this.backupDir, backupFileName);
    
    fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2), 'utf-8');
    
    // Clean up old backups (keep last 10)
    await this.cleanupOldBackups();
    
    return backupPath;
  }

  async restoreBackup(backupPath: string): Promise<void> {
    try {
      const backupData = fs.readFileSync(backupPath, 'utf-8');
      const backup = JSON.parse(backupData) as SettingsBackup;
      await this.importSettings(backup);
    } catch (error) {
      console.error('Failed to restore backup:', error);
      throw new Error('Unable to restore backup');
    }
  }

  async listBackups(): Promise<Array<{ path: string; timestamp: Date; description?: string }>> {
    try {
      const files = fs.readdirSync(this.backupDir);
      const backupFiles = files.filter(file => file.startsWith('settings-backup-') && file.endsWith('.json'));
      
      const backups = await Promise.all(
        backupFiles.map(async (file) => {
          const filePath = path.join(this.backupDir, file);
          const stats = fs.statSync(filePath);
          
          try {
            const backupData = fs.readFileSync(filePath, 'utf-8');
            const backup = JSON.parse(backupData) as SettingsBackup;
            return {
              path: filePath,
              timestamp: new Date(backup.timestamp),
              description: backup.metadata.description,
            };
          } catch {
            return {
              path: filePath,
              timestamp: stats.mtime,
            };
          }
        })
      );

      return backups.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    } catch (error) {
      console.error('Failed to list backups:', error);
      return [];
    }
  }

  private async createAutoBackup(settings: LocalSettingsConfig): Promise<void> {
    try {
      const backup: SettingsBackup = {
        version: '1.0.0',
        timestamp: new Date(),
        settings,
        metadata: {
          platform: os.platform(),
          appVersion: '1.0.0',
          backupType: 'automatic',
        },
      };

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFileName = `auto-backup-${timestamp}.json`;
      const backupPath = path.join(this.backupDir, backupFileName);
      
      fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2), 'utf-8');
    } catch (error) {
      console.error('Failed to create auto backup:', error);
      // Don't throw - auto backup failure shouldn't prevent settings save
    }
  }

  private async cleanupOldBackups(): Promise<void> {
    try {
      const backups = await this.listBackups();
      const autoBackups = backups.filter(b => path.basename(b.path).startsWith('auto-backup-'));
      const manualBackups = backups.filter(b => path.basename(b.path).startsWith('settings-backup-'));
      
      // Keep last 5 auto backups
      if (autoBackups.length > 5) {
        const toDelete = autoBackups.slice(5);
        toDelete.forEach(backup => {
          try {
            fs.unlinkSync(backup.path);
          } catch (error) {
            console.error('Failed to delete old backup:', error);
          }
        });
      }
      
      // Keep last 10 manual backups
      if (manualBackups.length > 10) {
        const toDelete = manualBackups.slice(10);
        toDelete.forEach(backup => {
          try {
            fs.unlinkSync(backup.path);
          } catch (error) {
            console.error('Failed to delete old backup:', error);
          }
        });
      }
    } catch (error) {
      console.error('Failed to cleanup old backups:', error);
    }
  }

  private validateAndMigrate(settings: LocalSettingsConfig): LocalSettingsConfig {
    // This would contain migration logic for different schema versions
    // For now, we'll just ensure all required fields are present
    const defaultSettings = this.getDefaultSettings();
    
    const migratedSettings: LocalSettingsConfig = {
      userPreferences: { ...defaultSettings.userPreferences, ...settings.userPreferences },
      themeSettings: { ...defaultSettings.themeSettings, ...settings.themeSettings },
      modelSettings: { ...defaultSettings.modelSettings, ...settings.modelSettings },
      privacySettings: { ...defaultSettings.privacySettings, ...settings.privacySettings },
      systemSettings: { ...defaultSettings.systemSettings, ...settings.systemSettings },
    };

    return migratedSettings;
  }

  private validateBackup(backup: SettingsBackup): void {
    if (!backup.version || !backup.timestamp || !backup.settings || !backup.metadata) {
      throw new Error('Invalid backup format');
    }
  }

  validateSettings(settings: Partial<LocalSettingsConfig>): SettingsValidationError[] {
    const errors: SettingsValidationError[] = [];
    
    // Add validation rules here
    // This is a simplified example
    if (settings.userPreferences) {
      const prefs = settings.userPreferences;
      if (prefs.language && typeof prefs.language !== 'string') {
        errors.push({
          path: 'userPreferences.language',
          message: 'Language must be a string',
          code: 'INVALID_TYPE',
          value: prefs.language,
        });
      }
    }
    
    return errors;
  }

  watchSettings(callback: (settings: LocalSettingsConfig) => void): () => void {
    if (!this.listeners.has('settings')) {
      this.listeners.set('settings', []);
    }
    this.listeners.get('settings')!.push(callback);
    
    // Set up file watcher if not already watching
    if (!this.watchers.has(this.settingsFile)) {
      const watcher = fs.watch(this.settingsFile, async (eventType) => {
        if (eventType === 'change') {
          try {
            const updatedSettings = await this.loadSettings();
            this.notifyListeners(updatedSettings);
          } catch (error) {
            console.error('Failed to reload settings after file change:', error);
          }
        }
      });
      this.watchers.set(this.settingsFile, watcher);
    }
    
    // Return cleanup function
    return () => {
      const listeners = this.listeners.get('settings') || [];
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
      
      if (listeners.length === 0) {
        const watcher = this.watchers.get(this.settingsFile);
        if (watcher) {
          watcher.close();
          this.watchers.delete(this.settingsFile);
        }
      }
    };
  }

  private notifyListeners(settings: LocalSettingsConfig): void {
    const listeners = this.listeners.get('settings') || [];
    listeners.forEach(callback => {
      try {
        callback(settings);
      } catch (error) {
        console.error('Error in settings listener:', error);
      }
    });
  }

  destroy(): void {
    this.watchers.forEach(watcher => watcher.close());
    this.watchers.clear();
    this.listeners.clear();
  }
}

export const localSettingsService = new LocalSettingsService();
export default localSettingsService;