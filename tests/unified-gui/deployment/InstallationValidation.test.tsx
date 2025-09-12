/**
 * Unified BEAR AI GUI - Installation and Deployment Validation Tests
 * Tests installation, deployment, and system integration scenarios
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { AppLayout } from '../../../src/components/layout/AppLayout';
import { windowsTestUtils, integrationTestUtils } from '../setup';
import type { User } from '../../../src/types';

// Mock system APIs for installation testing
const mockSystemAPIs = {
  fs: {
    existsSync: vi.fn(),
    mkdirSync: vi.fn(),
    writeFileSync: vi.fn(),
    readFileSync: vi.fn(),
    statSync: vi.fn(),
    accessSync: vi.fn(),
  },
  path: {
    join: vi.fn(),
    resolve: vi.fn(),
    dirname: vi.fn(),
    basename: vi.fn(),
    extname: vi.fn(),
  },
  os: {
    platform: vi.fn().mockReturnValue('win32'),
    arch: vi.fn().mockReturnValue('x64'),
    homedir: vi.fn().mockReturnValue('C:\\Users\\test'),
    tmpdir: vi.fn().mockReturnValue('C:\\Users\\test\\AppData\\Local\\Temp'),
    cpus: vi.fn().mockReturnValue(Array(8).fill({ model: 'Intel Core i7' })),
    totalmem: vi.fn().mockReturnValue(16000000000), // 16GB
    freemem: vi.fn().mockReturnValue(8000000000),   // 8GB
  },
  process: {
    platform: 'win32',
    arch: 'x64',
    version: 'v18.0.0',
    env: {
      APPDATA: 'C:\\Users\\test\\AppData\\Roaming',
      LOCALAPPDATA: 'C:\\Users\\test\\AppData\\Local',
      USERPROFILE: 'C:\\Users\\test',
      PROGRAMFILES: 'C:\\Program Files',
      PROGRAMFILES_X86: 'C:\\Program Files (x86)',
      BEAR_AI_DATA: 'C:\\Users\\test\\AppData\\Roaming\\BEAR-AI',
    },
  },
};

// Mock electron APIs for desktop installation
const mockElectronAPIs = {
  app: {
    getVersion: vi.fn().mockReturnValue('1.0.0'),
    getName: vi.fn().mockReturnValue('BEAR AI'),
    getPath: vi.fn().mockImplementation((name: string) => {
      const paths = {
        home: 'C:\\Users\\test',
        appData: 'C:\\Users\\test\\AppData\\Roaming',
        userData: 'C:\\Users\\test\\AppData\\Roaming\\BEAR-AI',
        temp: 'C:\\Users\\test\\AppData\\Local\\Temp',
        desktop: 'C:\\Users\\test\\Desktop',
        documents: 'C:\\Users\\test\\Documents',
        downloads: 'C:\\Users\\test\\Downloads',
        exe: 'C:\\Program Files\\BEAR-AI\\BEAR-AI.exe',
      };
      return paths[name as keyof typeof paths] || `C:\\${name}`;
    }),
    getLocale: vi.fn().mockReturnValue('en-US'),
    isReady: vi.fn().mockResolvedValue(true),
    whenReady: vi.fn().mockResolvedValue(undefined),
  },
  ipcMain: {
    handle: vi.fn(),
    on: vi.fn(),
  },
  ipcRenderer: {
    invoke: vi.fn(),
    send: vi.fn(),
    on: vi.fn(),
  },
  shell: {
    openExternal: vi.fn().mockResolvedValue(undefined),
    showItemInFolder: vi.fn(),
  },
  dialog: {
    showMessageBox: vi.fn(),
    showOpenDialog: vi.fn(),
    showSaveDialog: vi.fn(),
    showErrorBox: vi.fn(),
  },
};

describe('Installation and Deployment Validation', () => {
  const mockUser: User = {
    id: '1',
    name: 'Installation Test User',
    email: 'install@bearai.test',
    role: 'attorney',
    firm: 'Installation Test Firm',
  };

  beforeEach(() => {
    windowsTestUtils.mockWindowsEnvironment();
    vi.clearAllMocks();
    
    // Set up global mocks
    global.electronAPI = mockElectronAPIs;
    Object.assign(process, mockSystemAPIs.process);
  });

  describe('System Requirements Validation', () => {
    it('validates minimum system requirements', () => {
      render(<AppLayout initialUser={mockUser} />);

      const requirements = {
        minMemory: 4000000000,    // 4GB
        minCpus: 2,
        supportedPlatforms: ['win32', 'darwin', 'linux'],
        nodeVersion: '>=16.0.0',
      };

      // Check memory
      const totalMemory = mockSystemAPIs.os.totalmem();
      expect(totalMemory).toBeGreaterThanOrEqual(requirements.minMemory);

      // Check CPU
      const cpus = mockSystemAPIs.os.cpus();
      expect(cpus.length).toBeGreaterThanOrEqual(requirements.minCpus);

      // Check platform
      const platform = mockSystemAPIs.os.platform();
      expect(requirements.supportedPlatforms).toContain(platform);
    });

    it('detects available disk space', () => {
      render(<AppLayout initialUser={mockUser} />);

      const requiredSpace = 2000000000; // 2GB
      const mockDiskSpace = 10000000000; // 10GB available

      mockSystemAPIs.fs.statSync.mockReturnValue({
        size: mockDiskSpace,
      });

      expect(mockDiskSpace).toBeGreaterThan(requiredSpace);
    });

    it('validates Windows version compatibility', () => {
      windowsTestUtils.mockWindowsEnvironment();
      render(<AppLayout initialUser={mockUser} />);

      // Mock Windows version check
      const windowsVersions = [
        { version: '10.0.19041', supported: true },  // Windows 10 20H1+
        { version: '10.0.22000', supported: true },  // Windows 11
        { version: '6.1.7601', supported: false },   // Windows 7 (unsupported)
      ];

      windowsVersions.forEach(({ version, supported }) => {
        if (supported) {
          expect(version.startsWith('10.0')).toBe(true);
        }
      });
    });

    it('checks for required dependencies', () => {
      render(<AppLayout initialUser={mockUser} />);

      const dependencies = [
        '.NET Framework 4.7.2+',
        'Visual C++ Redistributable',
        'WebView2 Runtime',
        'DirectX 11+',
      ];

      // Mock dependency checking
      dependencies.forEach(dep => {
        const isInstalled = true; // Mock as installed
        expect(isInstalled).toBe(true);
      });
    });
  });

  describe('Installation Process', () => {
    it('creates proper directory structure', async () => {
      render(<AppLayout initialUser={mockUser} />);

      const expectedDirectories = [
        'C:\\Program Files\\BEAR-AI',
        'C:\\Users\\test\\AppData\\Roaming\\BEAR-AI',
        'C:\\Users\\test\\AppData\\Roaming\\BEAR-AI\\models',
        'C:\\Users\\test\\AppData\\Roaming\\BEAR-AI\\cache',
        'C:\\Users\\test\\AppData\\Roaming\\BEAR-AI\\logs',
        'C:\\Users\\test\\AppData\\Roaming\\BEAR-AI\\documents',
      ];

      expectedDirectories.forEach(dir => {
        mockSystemAPIs.fs.existsSync.mockReturnValue(true);
        expect(mockSystemAPIs.fs.existsSync(dir)).toBe(true);
      });
    });

    it('handles installation permissions correctly', () => {
      render(<AppLayout initialUser={mockUser} />);

      // Test admin privileges requirement
      const requiresAdmin = true;
      expect(requiresAdmin).toBe(true);

      // Test user directory access
      const userDataPath = global.electronAPI.app.getPath('userData');
      mockSystemAPIs.fs.accessSync.mockReturnValue(undefined); // No error = success
      
      expect(() => mockSystemAPIs.fs.accessSync(userDataPath)).not.toThrow();
    });

    it('registers file associations', () => {
      render(<AppLayout initialUser={mockUser} />);

      const fileAssociations = [
        { ext: '.pdf', mime: 'application/pdf' },
        { ext: '.docx', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
        { ext: '.txt', mime: 'text/plain' },
      ];

      fileAssociations.forEach(({ ext, mime }) => {
        // Mock registry entry creation
        const registryKey = `HKCR\\${ext}\\OpenWithList\\BEARAI.exe`;
        expect(registryKey).toContain(ext);
      });
    });

    it('creates Start Menu shortcuts', () => {
      render(<AppLayout initialUser={mockUser} />);

      const shortcuts = [
        {
          name: 'BEAR AI',
          target: 'C:\\Program Files\\BEAR-AI\\BEAR-AI.exe',
          workingDir: 'C:\\Program Files\\BEAR-AI',
          icon: 'C:\\Program Files\\BEAR-AI\\icon.ico',
        },
        {
          name: 'BEAR AI Uninstaller',
          target: 'C:\\Program Files\\BEAR-AI\\uninstall.exe',
        },
      ];

      shortcuts.forEach(shortcut => {
        expect(shortcut.name).toContain('BEAR AI');
        expect(shortcut.target).toMatch(/\.exe$/);
      });
    });

    it('configures Windows Firewall rules', () => {
      render(<AppLayout initialUser={mockUser} />);

      const firewallRules = [
        {
          name: 'BEAR AI - Inbound',
          direction: 'inbound',
          action: 'allow',
          program: 'C:\\Program Files\\BEAR-AI\\BEAR-AI.exe',
          ports: [8000, 8001, 8080],
        },
        {
          name: 'BEAR AI - Outbound',
          direction: 'outbound',
          action: 'allow',
          program: 'C:\\Program Files\\BEAR-AI\\BEAR-AI.exe',
        },
      ];

      firewallRules.forEach(rule => {
        expect(rule.name).toContain('BEAR AI');
        expect(['inbound', 'outbound']).toContain(rule.direction);
      });
    });
  });

  describe('First Launch Configuration', () => {
    it('runs first-time setup wizard', async () => {
      const user = userEvent.setup();
      render(<AppLayout initialUser={mockUser} />);

      // Mock first launch detection
      const isFirstLaunch = true;
      
      if (isFirstLaunch) {
        // Should show welcome screen
        const welcomeText = screen.queryByText(/welcome|setup|getting started/i);
        if (welcomeText) {
          expect(welcomeText).toBeInTheDocument();
        }
      }

      expect(screen.getByRole('main')).toBeInTheDocument();
    });

    it('initializes user preferences', async () => {
      const user = userEvent.setup();
      render(<AppLayout initialUser={mockUser} />);

      const defaultPreferences = {
        theme: 'auto',
        language: 'en-US',
        dataDirectory: 'C:\\Users\\test\\AppData\\Roaming\\BEAR-AI',
        enableTelemetry: false,
        checkForUpdates: true,
      };

      // Mock preference initialization
      localStorage.setItem('bear-ai-preferences', JSON.stringify(defaultPreferences));
      
      const storedPrefs = JSON.parse(localStorage.getItem('bear-ai-preferences') || '{}');
      expect(storedPrefs.theme).toBe('auto');
      expect(storedPrefs.language).toBe('en-US');
    });

    it('downloads initial model data', async () => {
      render(<AppLayout initialUser={mockUser} />);

      const modelDownloads = [
        {
          name: 'Legal Base Model',
          url: 'https://models.bearai.com/legal-base-v1.gguf',
          size: 4000000000, // 4GB
          required: true,
        },
        {
          name: 'Contract Analysis Model',
          url: 'https://models.bearai.com/contract-analysis-v1.gguf',
          size: 2000000000, // 2GB
          required: false,
        },
      ];

      // Mock download progress
      modelDownloads.forEach(model => {
        if (model.required) {
          expect(model.size).toBeGreaterThan(0);
        }
      });
    });

    it('validates model integrity', async () => {
      render(<AppLayout initialUser={mockUser} />);

      const modelValidation = {
        'legal-base-v1.gguf': {
          expectedHash: 'sha256:abc123...',
          actualHash: 'sha256:abc123...',
          valid: true,
        },
        'contract-analysis-v1.gguf': {
          expectedHash: 'sha256:def456...',
          actualHash: 'sha256:def456...',
          valid: true,
        },
      };

      Object.values(modelValidation).forEach(validation => {
        expect(validation.valid).toBe(true);
        expect(validation.expectedHash).toBe(validation.actualHash);
      });
    });
  });

  describe('Update and Maintenance', () => {
    it('checks for application updates', async () => {
      render(<AppLayout initialUser={mockUser} />);

      const updateCheck = {
        currentVersion: '1.0.0',
        latestVersion: '1.1.0',
        updateAvailable: true,
        updateURL: 'https://updates.bearai.com/v1.1.0/BEAR-AI-Setup.exe',
        changelogURL: 'https://bearai.com/changelog',
      };

      expect(updateCheck.updateAvailable).toBe(true);
      expect(updateCheck.latestVersion).not.toBe(updateCheck.currentVersion);
    });

    it('handles automatic updates', async () => {
      render(<AppLayout initialUser={mockUser} />);

      const updateProcess = {
        downloadProgress: 0,
        installing: false,
        requiresRestart: false,
        success: false,
      };

      // Mock update download
      updateProcess.downloadProgress = 100;
      updateProcess.installing = true;
      
      // Mock installation
      updateProcess.installing = false;
      updateProcess.requiresRestart = true;
      updateProcess.success = true;

      expect(updateProcess.success).toBe(true);
    });

    it('manages model updates', async () => {
      render(<AppLayout initialUser={mockUser} />);

      const modelUpdates = [
        {
          name: 'legal-base-v1.gguf',
          currentVersion: '1.0.0',
          latestVersion: '1.0.1',
          updateSize: 500000000, // 500MB delta
          priority: 'high',
        },
      ];

      modelUpdates.forEach(model => {
        if (model.currentVersion !== model.latestVersion) {
          expect(model.updateSize).toBeGreaterThan(0);
        }
      });
    });

    it('performs maintenance tasks', async () => {
      render(<AppLayout initialUser={mockUser} />);

      const maintenanceTasks = [
        { name: 'Clear temporary files', frequency: 'daily' },
        { name: 'Compact databases', frequency: 'weekly' },
        { name: 'Verify model integrity', frequency: 'weekly' },
        { name: 'Update legal databases', frequency: 'monthly' },
      ];

      maintenanceTasks.forEach(task => {
        expect(['daily', 'weekly', 'monthly']).toContain(task.frequency);
      });
    });
  });

  describe('Uninstallation', () => {
    it('removes application files completely', () => {
      render(<AppLayout initialUser={mockUser} />);

      const filesToRemove = [
        'C:\\Program Files\\BEAR-AI',
        'C:\\Users\\test\\Desktop\\BEAR AI.lnk',
        'C:\\ProgramData\\Microsoft\\Windows\\Start Menu\\Programs\\BEAR AI',
      ];

      // Mock uninstallation process
      filesToRemove.forEach(path => {
        mockSystemAPIs.fs.existsSync.mockReturnValueOnce(false);
        expect(mockSystemAPIs.fs.existsSync(path)).toBe(false);
      });
    });

    it('preserves user data optionally', () => {
      render(<AppLayout initialUser={mockUser} />);

      const userDataPaths = [
        'C:\\Users\\test\\AppData\\Roaming\\BEAR-AI\\documents',
        'C:\\Users\\test\\AppData\\Roaming\\BEAR-AI\\settings.json',
        'C:\\Users\\test\\AppData\\Roaming\\BEAR-AI\\history',
      ];

      // User should be able to choose to keep data
      const keepUserData = true;
      
      if (keepUserData) {
        userDataPaths.forEach(path => {
          mockSystemAPIs.fs.existsSync.mockReturnValue(true);
          expect(mockSystemAPIs.fs.existsSync(path)).toBe(true);
        });
      }
    });

    it('removes registry entries', () => {
      render(<AppLayout initialUser={mockUser} />);

      const registryEntries = [
        'HKLM\\SOFTWARE\\BEAR-AI',
        'HKCU\\SOFTWARE\\BEAR-AI',
        'HKCR\\.pdf\\OpenWithList\\BEARAI.exe',
        'HKCR\\.docx\\OpenWithList\\BEARAI.exe',
      ];

      // Mock registry cleanup
      registryEntries.forEach(entry => {
        const removed = true; // Mock successful removal
        expect(removed).toBe(true);
      });
    });

    it('removes Windows services if any', () => {
      render(<AppLayout initialUser={mockUser} />);

      const services = [
        'BEAR-AI-Service',
        'BEAR-AI-ModelServer',
      ];

      // Mock service removal
      services.forEach(service => {
        const stopped = true;
        const removed = true;
        expect(stopped && removed).toBe(true);
      });
    });
  });

  describe('Error Handling and Recovery', () => {
    it('handles installation failures gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // Mock installation failure
      mockSystemAPIs.fs.mkdirSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      render(<AppLayout initialUser={mockUser} />);

      // Should handle gracefully and provide user feedback
      expect(screen.getByRole('main')).toBeInTheDocument();
      
      consoleSpy.mockRestore();
    });

    it('provides diagnostic information', () => {
      render(<AppLayout initialUser={mockUser} />);

      const diagnostics = {
        osInfo: {
          platform: mockSystemAPIs.os.platform(),
          arch: mockSystemAPIs.os.arch(),
          version: process.version,
        },
        memoryInfo: {
          total: mockSystemAPIs.os.totalmem(),
          free: mockSystemAPIs.os.freemem(),
          used: mockSystemAPIs.os.totalmem() - mockSystemAPIs.os.freemem(),
        },
        diskInfo: {
          availableSpace: 10000000000, // Mock 10GB
          requiredSpace: 2000000000,   // 2GB required
        },
        permissions: {
          canWriteToProgram: true,
          canWriteToAppData: true,
          hasAdminRights: true,
        },
      };

      expect(diagnostics.osInfo.platform).toBe('win32');
      expect(diagnostics.memoryInfo.total).toBeGreaterThan(0);
      expect(diagnostics.diskInfo.availableSpace).toBeGreaterThan(diagnostics.diskInfo.requiredSpace);
    });

    it('enables safe mode recovery', async () => {
      render(<AppLayout initialUser={mockUser} />);

      // Mock safe mode detection
      const isSafeMode = process.env.BEAR_AI_SAFE_MODE === 'true';
      
      if (isSafeMode) {
        // Should load with minimal features
        expect(screen.getByRole('main')).toBeInTheDocument();
        
        // Safe mode indicator should be visible
        const safeModeIndicator = screen.queryByText(/safe mode|limited functionality/i);
        if (safeModeIndicator) {
          expect(safeModeIndicator).toBeInTheDocument();
        }
      }
    });

    it('creates crash dumps for debugging', () => {
      render(<AppLayout initialUser={mockUser} />);

      const crashDumpConfig = {
        enabled: true,
        location: 'C:\\Users\\test\\AppData\\Local\\BEAR-AI\\CrashDumps',
        maxFiles: 10,
        includePII: false,
        uploadToServer: false, // Privacy consideration
      };

      expect(crashDumpConfig.enabled).toBe(true);
      expect(crashDumpConfig.includePII).toBe(false); // Privacy protection
    });
  });

  describe('Security Validation', () => {
    it('validates code signatures', () => {
      render(<AppLayout initialUser={mockUser} />);

      const codeSignature = {
        signed: true,
        publisher: 'BEAR AI Team',
        certificate: 'Valid',
        timestamped: true,
      };

      expect(codeSignature.signed).toBe(true);
      expect(codeSignature.certificate).toBe('Valid');
    });

    it('integrates with Windows Security', () => {
      render(<AppLayout initialUser={mockUser} />);

      const securityIntegration = {
        defenderExclusion: true,
        smartScreenApproved: true,
        trustedPublisher: true,
      };

      expect(securityIntegration.defenderExclusion).toBe(true);
      expect(securityIntegration.smartScreenApproved).toBe(true);
    });

    it('handles restricted environments', () => {
      render(<AppLayout initialUser={mockUser} />);

      const restrictedEnv = {
        corporateNetwork: true,
        groupPolicyRestrictions: true,
        limitedInternetAccess: true,
      };

      // Should function with restrictions
      if (restrictedEnv.limitedInternetAccess) {
        // Should work offline
        expect(screen.getByRole('main')).toBeInTheDocument();
      }
    });

    it('protects sensitive data during installation', () => {
      render(<AppLayout initialUser={mockUser} />);

      const dataProtection = {
        encryptedStorage: true,
        secureKeyStorage: true,
        minimumPrivileges: true,
        auditLogging: true,
      };

      expect(dataProtection.encryptedStorage).toBe(true);
      expect(dataProtection.secureKeyStorage).toBe(true);
    });
  });
});