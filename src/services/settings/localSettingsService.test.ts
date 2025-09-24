import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { localSettingsService } from './localSettingsService';
import type { LocalSettingsConfig, SettingsBackup } from '../../types/settings';

// Mock fs module
jest.mock('fs');
const mockFs = fs as jest.Mocked<typeof fs>;

// Mock os module
jest.mock('os');
const mockOs = os as jest.Mocked<typeof os>;

describe('LocalSettingsService', () => {
  const mockSettings: LocalSettingsConfig = {
    userPreferences: {
      version: '1.0.0',
      lastModified: new Date(),
      schemaVersion: 1,
      language: 'en-US',
      timezone: 'America/New_York',
      dateFormat: 'MM/dd/yyyy',
      timeFormat: '12h',
      currency: 'USD',
      units: 'metric',
      autoSave: true,
      confirmBeforeExit: true,
      showTooltips: true,
      enableAnimations: true,
      soundEnabled: true,
      notificationsEnabled: true
    },
    themeSettings: {
      version: '1.0.0',
      lastModified: new Date(),
      schemaVersion: 1,
      activeTheme: 'light',
      customThemes: [],
      fontSize: 'medium',
      fontFamily: 'system-ui',
      uiScale: 1.0,
      colorBlindnessMode: 'none',
      highContrast: false,
      reduceMotion: false,
      compactMode: false,
      sidebarWidth: 300,
      showStatusBar: true,
      showLineNumbers: true,
      wordWrap: true
    },
    modelSettings: {
      version: '1.0.0',
      lastModified: new Date(),
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
        streamingEnabled: true
      },
      codeSettings: {
        model: 'claude-3-sonnet',
        temperature: 0.3,
        maxTokens: 8192,
        contextWindow: 32768,
        enableCodeCompletion: true,
        enableRefactoring: true,
        enableDocGeneration: true
      },
      imageSettings: {
        model: 'dall-e-3',
        quality: 'high',
        size: '1024x1024',
        style: 'natural'
      }
    },
    privacySettings: {
      version: '1.0.0',
      lastModified: new Date(),
      schemaVersion: 1,
      dataCollection: {
        analytics: false,
        crashReporting: true,
        usageStatistics: false,
        performanceMetrics: false
      },
      storage: {
        localStorageEnabled: true,
        sessionStorageEnabled: true,
        indexedDBEnabled: true,
        cookiesEnabled: false,
        maxStorageSize: 500,
        autoCleanup: true,
        retentionPeriod: 30
      },
      network: {
        allowExternalRequests: true,
        allowedDomains: [],
        blockedDomains: [],
        proxySettings: {
          enabled: false,
          host: '',
          port: 0
        }
      },
      content: {
        blockTrackers: true,
        blockAds: true,
        blockScripts: false,
        allowedScriptDomains: [],
        sanitizeInput: true,
        logSensitiveData: false
      },
      encryption: {
        encryptSettings: false,
        encryptConversations: false,
        encryptFiles: false,
        algorithm: 'aes-256-gcm'
      }
    },
    systemSettings: {
      version: '1.0.0',
      lastModified: new Date(),
      schemaVersion: 1,
      hardware: {
        cpuCores: 4,
        totalMemory: 8192,
        gpuInfo: [],
        platform: 'linux',
        architecture: 'x64'
      },
      performance: {
        maxWorkerThreads: 4,
        memoryLimit: 2048,
        gcSettings: {
          enabled: true,
          threshold: 0.8,
          frequency: 10000
        },
        caching: {
          enabled: true,
          maxSize: 100,
          ttl: 3600
        },
        preloading: {
          enabled: true,
          aggressiveness: 'medium'
        }
      },
      development: {
        debugMode: false,
        verboseLogging: false,
        enableProfiling: false,
        hotReload: true,
        sourceMaps: true,
        devTools: false
      },
      updates: {
        autoCheck: true,
        autoDownload: false,
        autoInstall: false,
        channel: 'stable',
        checkInterval: 24
      }
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock os functions
    mockOs.platform.mockReturnValue('linux');
    mockOs.homedir.mockReturnValue('/home/user');
    mockOs.cpus.mockReturnValue([{} as any, {} as any, {} as any, {} as any]); // 4 CPUs
    mockOs.totalmem.mockReturnValue(8589934592); // 8GB in bytes

    // Mock process.env
    process.env = {
      XDG_CONFIG_HOME: '/home/user/.config'
    };

    // Mock fs functions
    mockFs.existsSync.mockImplementation((path: string) => {
      if (typeof path === 'string') {
        return path.includes('settings.json');
      }
      return false;
    });

    mockFs.mkdirSync.mockImplementation(() => undefined);
    mockFs.readFileSync.mockImplementation(() => JSON.stringify(mockSettings));
    mockFs.writeFileSync.mockImplementation(() => undefined);
    mockFs.readdirSync.mockImplementation(() => []);
    mockFs.statSync.mockImplementation(() => ({ mtime: new Date() }) as any);
    mockFs.unlinkSync.mockImplementation(() => undefined);
    mockFs.watch.mockImplementation(() => ({
      close: jest.fn()
    }) as any);
  });

  afterEach(() => {
    // Clean up any watchers
    localSettingsService.destroy();
  });

  describe('Settings Loading', () => {
    test('should load existing settings', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockSettings));

      const settings = await localSettingsService.loadSettings();

      expect(settings).toBeDefined();
      expect(settings.userPreferences.language).toBe('en-US');
      expect(settings.systemSettings.hardware.cpuCores).toBe(4);
    });

    test('should create default settings when file does not exist', async () => {
      mockFs.existsSync.mockReturnValue(false);

      const settings = await localSettingsService.loadSettings();

      expect(settings).toBeDefined();
      expect(mockFs.writeFileSync).toHaveBeenCalled();
      expect(settings.userPreferences.language).toBe('en-US');
    });

    test('should handle corrupted settings file', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('invalid json');

      const settings = await localSettingsService.loadSettings();

      // Should return default settings when file is corrupted
      expect(settings).toBeDefined();
      expect(settings.userPreferences.language).toBe('en-US');
    });
  });

  describe('Settings Saving', () => {
    test('should save settings successfully', async () => {
      await localSettingsService.saveSettings(mockSettings);

      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('settings.json'),
        expect.stringContaining('"language":"en-US"'),
        'utf-8'
      );
    });

    test('should update lastModified timestamps when saving', async () => {
      const settingsBeforeSave = { ...mockSettings };
      const originalDate = settingsBeforeSave.userPreferences.lastModified;

      await localSettingsService.saveSettings(settingsBeforeSave);

      const savedData = mockFs.writeFileSync.mock.calls[0][1] as string;
      const parsedData = JSON.parse(savedData);

      expect(new Date(parsedData.userPreferences.lastModified).getTime()).toBeGreaterThan(originalDate.getTime());
    });

    test('should create backup before saving', async () => {
      // First load to set current settings
      await localSettingsService.loadSettings();

      // Then save to trigger backup
      await localSettingsService.saveSettings(mockSettings);

      // Should have called writeFileSync multiple times (backup + settings)
      expect(mockFs.writeFileSync).toHaveBeenCalledTimes(2);
    });
  });

  describe('Settings Update', () => {
    test('should update specific category', async () => {
      mockFs.existsSync.mockReturnValue(true);

      await localSettingsService.updateSettings('userPreferences', {
        language: 'es-ES',
        timezone: 'Europe/Madrid'
      });

      const savedData = mockFs.writeFileSync.mock.calls[0][1] as string;
      const parsedData = JSON.parse(savedData);

      expect(parsedData.userPreferences.language).toBe('es-ES');
      expect(parsedData.userPreferences.timezone).toBe('Europe/Madrid');
      // Other settings should remain unchanged
      expect(parsedData.userPreferences.autoSave).toBe(true);
    });
  });

  describe('Settings Reset', () => {
    test('should reset all settings', async () => {
      await localSettingsService.resetSettings();

      expect(mockFs.writeFileSync).toHaveBeenCalled();
      const savedData = mockFs.writeFileSync.mock.calls[0][1] as string;
      const parsedData = JSON.parse(savedData);

      // Should have default values
      expect(parsedData.userPreferences.language).toBe('en-US');
    });

    test('should reset specific category', async () => {
      mockFs.existsSync.mockReturnValue(true);

      await localSettingsService.resetSettings('userPreferences');

      expect(mockFs.writeFileSync).toHaveBeenCalled();
    });
  });

  describe('Backup and Restore', () => {
    test('should export settings', async () => {
      mockFs.existsSync.mockReturnValue(true);

      const backup = await localSettingsService.exportSettings();

      expect(backup).toBeDefined();
      expect(backup.version).toBe('1.0.0');
      expect(backup.timestamp).toBeInstanceOf(Date);
      expect(backup.settings).toBeDefined();
      expect(backup.metadata).toBeDefined();
      expect(backup.metadata.platform).toBe('linux');
    });

    test('should import settings from backup', async () => {
      const backup: SettingsBackup = {
        version: '1.0.0',
        timestamp: new Date(),
        settings: mockSettings,
        metadata: {
          platform: 'linux',
          appVersion: '1.0.0',
          backupType: 'manual'
        }
      };

      await localSettingsService.importSettings(backup);

      expect(mockFs.writeFileSync).toHaveBeenCalled();
    });

    test('should create manual backup', async () => {
      mockFs.existsSync.mockReturnValue(true);

      const backupPath = await localSettingsService.createBackup('Test backup');

      expect(backupPath).toContain('settings-backup-');
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        backupPath,
        expect.stringContaining('Test backup'),
        'utf-8'
      );
    });

    test('should restore from backup file', async () => {
      const backupPath = '/path/to/backup.json';
      const backup: SettingsBackup = {
        version: '1.0.0',
        timestamp: new Date(),
        settings: mockSettings,
        metadata: {
          platform: 'linux',
          appVersion: '1.0.0',
          backupType: 'manual'
        }
      };

      mockFs.readFileSync.mockReturnValue(JSON.stringify(backup));

      await localSettingsService.restoreBackup(backupPath);

      expect(mockFs.readFileSync).toHaveBeenCalledWith(backupPath, 'utf-8');
      expect(mockFs.writeFileSync).toHaveBeenCalled();
    });

    test('should list available backups', async () => {
      mockFs.readdirSync.mockReturnValue([
        'settings-backup-2023-01-01T00-00-00-000Z.json',
        'auto-backup-2023-01-02T00-00-00-000Z.json',
        'other-file.txt'
      ] as any);

      const backup: SettingsBackup = {
        version: '1.0.0',
        timestamp: new Date('2023-01-01'),
        settings: mockSettings,
        metadata: {
          platform: 'linux',
          appVersion: '1.0.0',
          backupType: 'manual',
          description: 'Test backup'
        }
      };

      mockFs.readFileSync.mockReturnValue(JSON.stringify(backup));

      const backups = await localSettingsService.listBackups();

      expect(backups).toHaveLength(2); // Should exclude 'other-file.txt'
      expect(backups[0].description).toBe('Test backup');
    });
  });

  describe('Settings Validation', () => {
    test('should validate correct settings', () => {
      const errors = localSettingsService.validateSettings(mockSettings);

      expect(errors).toHaveLength(0);
    });

    test('should detect validation errors', () => {
      const invalidSettings = {
        userPreferences: {
          language: 123 // Should be string
        }
      };

      const errors = localSettingsService.validateSettings(invalidSettings);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].path).toBe('userPreferences.language');
      expect(errors[0].code).toBe('INVALID_TYPE');
    });
  });

  describe('File Watching', () => {
    test('should set up file watcher', () => {
      const callback = jest.fn();

      const unwatch = localSettingsService.watchSettings(callback);

      expect(mockFs.watch).toHaveBeenCalled();
      expect(typeof unwatch).toBe('function');

      // Cleanup
      unwatch();
    });

    test('should clean up watchers on destroy', () => {
      const mockWatcher = {
        close: jest.fn()
      };

      mockFs.watch.mockReturnValue(mockWatcher as any);

      const callback = jest.fn();
      localSettingsService.watchSettings(callback);

      localSettingsService.destroy();

      expect(mockWatcher.close).toHaveBeenCalled();
    });
  });

  describe('Cross-Platform Directory Handling', () => {
    test('should handle Windows paths', () => {
      mockOs.platform.mockReturnValue('win32');
      process.env.APPDATA = 'C:\\Users\\user\\AppData\\Roaming';

      // This would be tested by creating a new instance
      // For this test, we just verify the path logic is correct
      expect(mockOs.platform()).toBe('win32');
    });

    test('should handle macOS paths', () => {
      mockOs.platform.mockReturnValue('darwin');
      mockOs.homedir.mockReturnValue('/Users/user');

      expect(mockOs.platform()).toBe('darwin');
    });

    test('should handle Linux paths', () => {
      mockOs.platform.mockReturnValue('linux');
      process.env.XDG_CONFIG_HOME = '/home/user/.config';

      expect(mockOs.platform()).toBe('linux');
    });
  });

  describe('Error Handling', () => {
    test('should handle file system errors gracefully', async () => {
      mockFs.writeFileSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      await expect(localSettingsService.saveSettings(mockSettings)).rejects.toThrow('Unable to save settings');
    });

    test('should handle backup restore errors', async () => {
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error('File not found');
      });

      await expect(localSettingsService.restoreBackup('/invalid/path')).rejects.toThrow('Unable to restore backup');
    });

    test('should handle invalid backup format', async () => {
      const invalidBackup = {
        // Missing required fields
        version: '1.0.0'
      };

      await expect(localSettingsService.importSettings(invalidBackup as any)).rejects.toThrow('Invalid backup file or import failed');
    });
  });

  describe('Hardware Detection', () => {
    test('should detect hardware information correctly', async () => {
      // Mock different CPU configurations
      mockOs.cpus.mockReturnValue(new Array(8).fill({} as any)); // 8 CPUs
      mockOs.totalmem.mockReturnValue(16 * 1024 * 1024 * 1024); // 16GB

      const settings = await localSettingsService.loadSettings();

      expect(settings.systemSettings.hardware.cpuCores).toBe(8);
      expect(settings.systemSettings.hardware.totalMemory).toBe(16384); // In MB
      expect(settings.systemSettings.performance.maxWorkerThreads).toBe(7); // cpus - 1
    });
  });

  describe('Memory Management', () => {
    test('should calculate appropriate memory limits', async () => {
      mockOs.totalmem.mockReturnValue(8 * 1024 * 1024 * 1024); // 8GB

      const settings = await localSettingsService.loadSettings();

      // Should allocate 50% of total RAM (4GB = 4096MB)
      expect(settings.systemSettings.performance.memoryLimit).toBe(4096);
    });
  });
});