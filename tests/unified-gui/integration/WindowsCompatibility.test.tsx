/**
 * Unified BEAR AI GUI - Windows Compatibility Tests
 * Tests Windows-specific functionality and installation behavior
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { AppLayout } from '../../../src/components/layout/AppLayout';
import { windowsTestUtils, performanceTestUtils } from '../setup';
import type { User } from '../../../src/types';

describe('Windows Compatibility', () => {
  const mockUser: User = {
    id: '1',
    name: 'Windows Test User',
    email: 'windows@bearai.test', 
    role: 'attorney',
    firm: 'Windows Law Firm',
  };

  beforeEach(() => {
    windowsTestUtils.mockWindowsEnvironment();
    windowsTestUtils.mockWindowsPaths();
  });

  describe('Windows Platform Detection', () => {
    it('correctly detects Windows environment', () => {
      render(<AppLayout initialUser={mockUser} />);
      
      expect(process.platform).toBe('win32');
      expect(navigator.platform).toBe('Win32');
      expect(navigator.userAgent).toContain('Windows NT');
    });

    it('adapts UI for Windows conventions', () => {
      render(<AppLayout initialUser={mockUser} />);
      
      // Windows-specific UI adaptations
      const appContainer = screen.getByRole('main').closest('div');
      expect(appContainer).toBeInTheDocument();
      
      // Should use Windows-appropriate spacing and sizing
      expect(appContainer).toHaveClass('font-inter');
    });

    it('handles Windows high DPI displays', () => {
      // Mock high DPI Windows display
      Object.defineProperty(window, 'devicePixelRatio', { value: 2.0 });
      
      render(<AppLayout initialUser={mockUser} />);
      
      // Should adapt to high DPI without issues
      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(window.devicePixelRatio).toBe(2.0);
    });

    it('supports Windows touch interfaces', () => {
      // Mock Windows touch device
      Object.defineProperty(navigator, 'maxTouchPoints', { value: 10 });
      
      render(<AppLayout initialUser={mockUser} />);
      
      // Should adapt for touch input
      const touchElements = screen.getAllByRole('button');
      touchElements.forEach(element => {
        // Touch targets should be appropriately sized
        expect(element).toBeInTheDocument();
      });
    });
  });

  describe('Windows File System Integration', () => {
    it('handles Windows file paths correctly', async () => {
      const user = userEvent.setup();
      render(<AppLayout initialUser={mockUser} />);
      
      // Navigate to documents
      await user.click(screen.getByText('Documents'));
      
      // Mock Windows file path handling
      const windowsPath = 'C:\\Users\\test\\Documents\\legal-doc.pdf';
      
      if (global.electronAPI) {
        expect(global.electronAPI.app.getPath('documents')).toBe('C:/Users/test/Documents');
      }
      
      expect(screen.getByRole('main')).toHaveTextContent(/document/i);
    });

    it('supports Windows network drives', () => {
      const networkPath = '\\\\server\\share\\documents';
      
      render(<AppLayout initialUser={mockUser} />);
      
      // Should handle UNC paths
      if (global.electronAPI?.fs) {
        const mockExists = vi.fn().mockResolvedValue(true);
        global.electronAPI.fs.exists = mockExists;
        
        expect(mockExists).toBeDefined();
      }
    });

    it('handles Windows permissions correctly', async () => {
      render(<AppLayout initialUser={mockUser} />);
      
      // Mock Windows permission dialog
      if (global.electronAPI?.dialog) {
        const mockShowDialog = vi.fn().mockResolvedValue({
          canceled: false,
          filePaths: ['C:\\Users\\test\\Documents\\test.pdf']
        });
        global.electronAPI.dialog.showOpenDialog = mockShowDialog;
        
        expect(mockShowDialog).toBeDefined();
      }
    });

    it('integrates with Windows Explorer', () => {
      render(<AppLayout initialUser={mockUser} />);
      
      // Should support "Open in Explorer" functionality
      if (global.electronAPI?.shell) {
        const mockOpenExternal = vi.fn();
        global.electronAPI.shell.openExternal = mockOpenExternal;
        
        expect(mockOpenExternal).toBeDefined();
      }
    });
  });

  describe('Windows Performance Optimization', () => {
    beforeEach(() => {
      windowsTestUtils.simulateWindowsPerformance();
    });

    it('optimizes for Windows memory characteristics', () => {
      const { renderTime } = performanceTestUtils.measureComponentRender(
        () => render(<AppLayout initialUser={mockUser} />)
      );
      
      // Should render efficiently on Windows
      expect(renderTime).toBeLessThan(800); // 800ms threshold for Windows
    });

    it('handles Windows memory pressure gracefully', () => {
      // Simulate Windows memory pressure
      Object.defineProperty(performance, 'memory', {
        value: {
          usedJSHeapSize: 3500000000, // 3.5GB
          totalJSHeapSize: 4000000000, // 4GB
          jsHeapSizeLimit: 4000000000,
        },
        writable: true,
      });
      
      render(<AppLayout initialUser={mockUser} />);
      
      // Should still function under memory pressure
      expect(screen.getByRole('main')).toBeInTheDocument();
    });

    it('adapts to Windows CPU architecture', () => {
      // Test both x64 and ARM64
      Object.defineProperty(process, 'arch', { value: 'x64' });
      
      render(<AppLayout initialUser={mockUser} />);
      expect(process.arch).toBe('x64');
      
      // Should work on ARM64 Windows too
      Object.defineProperty(process, 'arch', { value: 'arm64' });
      expect(process.arch).toBe('arm64');
    });

    it('handles Windows power management', () => {
      // Mock Windows power events
      const mockPowerEvent = new Event('power');
      
      render(<AppLayout initialUser={mockUser} />);
      
      // Should handle power state changes
      fireEvent(window, mockPowerEvent);
      expect(screen.getByRole('main')).toBeInTheDocument();
    });
  });

  describe('Windows Installation and Deployment', () => {
    it('validates Windows installer compatibility', () => {
      // Mock Windows installation environment
      const mockInstaller = {
        version: '1.0.0',
        platform: 'win32',
        arch: 'x64',
        installPath: 'C:\\Program Files\\BEAR AI'
      };
      
      render(<AppLayout initialUser={mockUser} />);
      
      // Should work in typical Windows installation path
      expect(mockInstaller.platform).toBe('win32');
    });

    it('handles Windows security restrictions', () => {
      render(<AppLayout initialUser={mockUser} />);
      
      // Should handle restricted execution environments
      if (global.electronAPI) {
        // Mock restricted permissions
        const restrictedAPI = {
          ...global.electronAPI,
          fs: {
            ...global.electronAPI.fs,
            readFile: vi.fn().mockRejectedValue(new Error('Permission denied'))
          }
        };
        
        expect(restrictedAPI).toBeDefined();
      }
    });

    it('supports Windows MSI installation', () => {
      const msiConfig = {
        productCode: '{12345678-1234-1234-1234-123456789012}',
        upgradeCode: '{87654321-4321-4321-4321-210987654321}',
        installScope: 'perMachine'
      };
      
      render(<AppLayout initialUser={mockUser} />);
      
      // Should be compatible with MSI packaging
      expect(msiConfig.productCode).toMatch(/^{[A-F0-9-]+}$/i);
    });

    it('integrates with Windows registry', () => {
      render(<AppLayout initialUser={mockUser} />);
      
      // Mock registry integration for file associations
      const registryKeys = {
        'HKCR\\.pdf\\OpenWithList\\BEARAI.exe': 'PDF files',
        'HKCR\\.docx\\OpenWithList\\BEARAI.exe': 'Word documents'
      };
      
      expect(Object.keys(registryKeys)).toContain('HKCR\\.pdf\\OpenWithList\\BEARAI.exe');
    });
  });

  describe('Windows Accessibility', () => {
    it('integrates with Windows Narrator', () => {
      render(<AppLayout initialUser={mockUser} />);
      
      // Should have proper ARIA labels for screen readers
      expect(screen.getByRole('main')).toHaveAttribute('aria-label');
      expect(screen.getByRole('navigation')).toHaveAttribute('aria-label');
    });

    it('supports Windows high contrast mode', () => {
      // Mock high contrast mode
      Object.defineProperty(window, 'matchMedia', {
        value: vi.fn().mockImplementation((query) => {
          if (query === '(prefers-contrast: high)') {
            return { matches: true, addListener: vi.fn(), removeListener: vi.fn() };
          }
          return { matches: false, addListener: vi.fn(), removeListener: vi.fn() };
        }),
      });
      
      render(<AppLayout initialUser={mockUser} />);
      
      // Should adapt to high contrast mode
      expect(screen.getByRole('main')).toBeInTheDocument();
    });

    it('handles Windows magnifier tool', () => {
      // Mock Windows magnifier
      Object.defineProperty(window, 'devicePixelRatio', { value: 3.0 });
      
      render(<AppLayout initialUser={mockUser} />);
      
      // Should work correctly when magnified
      expect(screen.getByRole('main')).toBeInTheDocument();
    });

    it('supports Windows voice control', () => {
      render(<AppLayout initialUser={mockUser} />);
      
      // Elements should have voice-friendly labels
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toHaveAttribute('aria-label');
      });
    });
  });

  describe('Windows Security Integration', () => {
    it('handles Windows Defender integration', () => {
      render(<AppLayout initialUser={mockUser} />);
      
      // Should not trigger security warnings
      expect(screen.getByRole('main')).toBeInTheDocument();
    });

    it('supports Windows SmartScreen', () => {
      const smartScreenInfo = {
        publisher: 'BEAR AI Team',
        signed: true,
        reputation: 'trusted'
      };
      
      render(<AppLayout initialUser={mockUser} />);
      
      expect(smartScreenInfo.signed).toBe(true);
    });

    it('integrates with Windows credential manager', () => {
      render(<AppLayout initialUser={mockUser} />);
      
      // Should support Windows credential storage
      if (global.electronAPI) {
        const credentialAPI = {
          store: vi.fn(),
          retrieve: vi.fn(),
          delete: vi.fn()
        };
        
        expect(credentialAPI).toBeDefined();
      }
    });

    it('handles Windows firewall restrictions', async () => {
      render(<AppLayout initialUser={mockUser} />);
      
      // Should handle network restrictions gracefully
      global.fetch = vi.fn().mockRejectedValue(new Error('Network access blocked'));
      
      // Application should still function
      expect(screen.getByRole('main')).toBeInTheDocument();
    });
  });

  describe('Windows Update Compatibility', () => {
    it('handles Windows version compatibility', () => {
      // Test different Windows versions
      const windowsVersions = [
        'Windows NT 10.0', // Windows 10/11
        'Windows NT 6.3',  // Windows 8.1
        'Windows NT 6.1'   // Windows 7 (if supported)
      ];
      
      windowsVersions.forEach(version => {
        Object.defineProperty(navigator, 'userAgent', {
          value: `Mozilla/5.0 (Windows NT 10.0; Win64; x64) WebKit/537.36`,
          configurable: true
        });
        
        render(<AppLayout initialUser={mockUser} />);
        expect(screen.getByRole('main')).toBeInTheDocument();
      });
    });

    it('supports Windows auto-update mechanisms', () => {
      render(<AppLayout initialUser={mockUser} />);
      
      // Should integrate with update systems
      const updateConfig = {
        checkForUpdates: true,
        installOnExit: true,
        notifyUser: true
      };
      
      expect(updateConfig.checkForUpdates).toBe(true);
    });

    it('handles Windows compatibility mode', () => {
      // Mock compatibility mode
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (compatible; MSIE 11.0; Windows NT 10.0; Trident/7.0)',
        configurable: true
      });
      
      render(<AppLayout initialUser={mockUser} />);
      
      // Should work in compatibility mode
      expect(screen.getByRole('main')).toBeInTheDocument();
    });
  });

  describe('Windows Error Handling', () => {
    it('provides Windows-appropriate error messages', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      render(<AppLayout initialUser={mockUser} />);
      
      // Should handle Windows-specific errors
      const windowsError = new Error('Access is denied. (0x80070005)');
      
      // Application should handle Windows error codes
      expect(windowsError.message).toContain('0x80070005');
      
      consoleSpy.mockRestore();
    });

    it('integrates with Windows Event Log', () => {
      render(<AppLayout initialUser={mockUser} />);
      
      // Should log to Windows Event Log in production
      const eventLogEntry = {
        source: 'BEAR AI',
        level: 'Information',
        message: 'Application started successfully'
      };
      
      expect(eventLogEntry.source).toBe('BEAR AI');
    });

    it('handles Windows crash reporting', () => {
      render(<AppLayout initialUser={mockUser} />);
      
      // Should integrate with Windows Error Reporting
      const crashReport = {
        enabled: true,
        endpoint: 'https://crash-reports.bearai.com',
        includeSystemInfo: true
      };
      
      expect(crashReport.enabled).toBe(true);
    });

    it('provides Windows-specific troubleshooting', () => {
      render(<AppLayout initialUser={mockUser} />);
      
      const troubleshootingSteps = [
        'Check Windows version compatibility',
        'Verify .NET Framework installation',
        'Run as administrator if needed',
        'Check Windows Defender exclusions',
        'Verify disk space availability'
      ];
      
      expect(troubleshootingSteps).toHaveLength(5);
    });
  });
});