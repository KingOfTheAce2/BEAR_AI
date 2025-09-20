import React, { useState, useEffect } from 'react';

import {
  Settings,
  Shield,
  HardDrive,
  Monitor,
  Cpu,
  MemoryStick,
  Database,
  Lock,
  Eye,
  EyeOff,
  Download,
  Upload,
  Trash2,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Info,
  Folder,
  FileText,
  Bell,
  BellOff,
  Sun,
  Volume2,
  VolumeX,
  Globe,
  Wifi,
  WifiOff,
  Save,
  RotateCcw
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Slider } from '../ui/slider';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Separator } from '../ui/separator';

interface LocalSettings {
  // Privacy & Security
  privacy: {
    encryptionEnabled: boolean;
    encryptionKey: string;
    autoDeleteAfterDays: number;
    requireAuthOnStart: boolean;
    allowTelemetry: boolean;
    anonymizeData: boolean;
  };
  
  // Storage & Performance
  storage: {
    dataDirectory: string;
    maxCacheSize: number; // MB
    autoCleanup: boolean;
    compressionEnabled: boolean;
    backupEnabled: boolean;
    backupLocation: string;
  };
  
  // Model & Inference
  inference: {
    defaultModel: string;
    maxMemoryUsage: number; // MB
    threadCount: number;
    useGPU: boolean;
    quantizationLevel: 'Q4_0' | 'Q4_1' | 'Q5_0' | 'Q5_1' | 'Q8_0' | 'F16';
    contextWindow: number;
    temperature: number;
  };
  
  // Interface & Behavior
  interface: {
    theme: 'light' | 'dark' | 'system';
    fontSize: number;
    autoSave: boolean;
    showLineNumbers: boolean;
    enableSounds: boolean;
    notificationsEnabled: boolean;
    startMinimized: boolean;
    checkUpdates: boolean;
  };
  
  // Network & Updates (all disabled for local-first)
  network: {
    offlineMode: boolean;
    blockExternalRequests: boolean;
    allowModelDownloads: boolean;
    proxyEnabled: boolean;
    proxyUrl: string;
  };
}

interface SystemInfo {
  platform: string;
  arch: string;
  totalMemory: number;
  availableMemory: number;
  cpuCores: number;
  diskSpace: number;
  appVersion: string;
  dataDirectorySize: number;
  cacheSize: number;
  lastBackup?: Date;
}

interface LocalSettingsPanelProps {
  onSettingsChange?: (settings: LocalSettings) => void;
  className?: string;
}

export const LocalSettingsPanel: React.FC<LocalSettingsPanelProps> = ({
  onSettingsChange,
  className = ""
}) => {
  const [settings, setSettings] = useState<LocalSettings>({
    privacy: {
      encryptionEnabled: true,
      encryptionKey: '',
      autoDeleteAfterDays: 365,
      requireAuthOnStart: true,
      allowTelemetry: false,
      anonymizeData: true
    },
    storage: {
      dataDirectory: '/home/.bear_ai',
      maxCacheSize: 1024,
      autoCleanup: true,
      compressionEnabled: true,
      backupEnabled: true,
      backupLocation: '/home/.bear_ai/backups'
    },
    inference: {
      defaultModel: '',
      maxMemoryUsage: 4096,
      threadCount: 4,
      useGPU: true,
      quantizationLevel: 'Q4_0',
      contextWindow: 4096,
      temperature: 0.7
    },
    interface: {
      theme: 'system',
      fontSize: 14,
      autoSave: true,
      showLineNumbers: true,
      enableSounds: false,
      notificationsEnabled: true,
      startMinimized: false,
      checkUpdates: false
    },
    network: {
      offlineMode: true,
      blockExternalRequests: true,
      allowModelDownloads: false,
      proxyEnabled: false,
      proxyUrl: ''
    }
  });

  const [systemInfo, setSystemInfo] = useState<SystemInfo>({
    platform: 'win32',
    arch: 'x64',
    totalMemory: 16384,
    availableMemory: 8192,
    cpuCores: 8,
    diskSpace: 512000,
    appVersion: '2.0.0',
    dataDirectorySize: 156,
    cacheSize: 45,
    lastBackup: new Date('2024-01-15T14:30:00')
  });

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [activeTab, setActiveTab] = useState('privacy');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Load settings from local storage
  useEffect(() => {
    const loadSettings = async () => {
      try {
        // In real implementation, load from:
        // - Tauri's fs plugin
        // - localStorage/IndexedDB
        // - Configuration files
        
        const savedSettings = localStorage.getItem('bear-ai-settings');
        if (savedSettings) {
          const parsed = JSON.parse(savedSettings);
          setSettings({ ...settings, ...parsed });
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    };

    loadSettings();
  }, []);

  // Get system information
  useEffect(() => {
    const getSystemInfo = async () => {
      try {
        // In real implementation, use:
        // - Tauri's system info APIs
        // - navigator.hardwareConcurrency
        // - Performance API
        
        // Mock system info is already set in state
      } catch (error) {
        console.error('Failed to get system info:', error);
      }
    };

    getSystemInfo();
  }, []);

  const updateSetting = <K extends keyof LocalSettings>(
    category: K,
    key: keyof LocalSettings[K],
    value: any
  ) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value
      }
    }));
    setHasUnsavedChanges(true);
  };

  const saveSettings = async () => {
    try {
      // In real implementation, save to:
      // - Configuration files
      // - Registry/System preferences
      // - Encrypted storage
      
      localStorage.setItem('bear-ai-settings', JSON.stringify(settings));
      setHasUnsavedChanges(false);
      onSettingsChange?.(settings);
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  };

  const resetToDefaults = () => {
    const defaultSettings: LocalSettings = {
      privacy: {
        encryptionEnabled: true,
        encryptionKey: '',
        autoDeleteAfterDays: 365,
        requireAuthOnStart: true,
        allowTelemetry: false,
        anonymizeData: true
      },
      storage: {
        dataDirectory: '/home/.bear_ai',
        maxCacheSize: 1024,
        autoCleanup: true,
        compressionEnabled: true,
        backupEnabled: true,
        backupLocation: '/home/.bear_ai/backups'
      },
      inference: {
        defaultModel: '',
        maxMemoryUsage: Math.min(4096, systemInfo.availableMemory),
        threadCount: Math.min(4, systemInfo.cpuCores),
        useGPU: true,
        quantizationLevel: 'Q4_0',
        contextWindow: 4096,
        temperature: 0.7
      },
      interface: {
        theme: 'system',
        fontSize: 14,
        autoSave: true,
        showLineNumbers: true,
        enableSounds: false,
        notificationsEnabled: true,
        startMinimized: false,
        checkUpdates: false
      },
      network: {
        offlineMode: true,
        blockExternalRequests: true,
        allowModelDownloads: false,
        proxyEnabled: false,
        proxyUrl: ''
      }
    };

    setSettings(defaultSettings);
    setHasUnsavedChanges(true);
  };

  const clearCache = async () => {
    try {
      // In real implementation, clear:
      // - Model cache
      // - Chat history cache
      // - Temporary files
      console.log('Cache cleared');
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  };

  const createBackup = async () => {
    try {
      // In real implementation:
      // - Export all settings and data
      // - Create encrypted backup
      // - Save to chosen location
      console.log('Backup created');
    } catch (error) {
      console.error('Failed to create backup:', error);
    }
  };

  const formatBytes = (bytes: number): string => {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <Card className={`w-full max-w-4xl ${className}`}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Local Settings
            <Badge variant="outline" className="ml-2">
              <Shield className="w-3 h-3 mr-1" />
              Local Only
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              <Info className="w-4 h-4 mr-1" />
              {showAdvanced ? 'Basic' : 'Advanced'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={resetToDefaults}
            >
              <RotateCcw className="w-4 h-4 mr-1" />
              Reset
            </Button>
            <Button
              onClick={saveSettings}
              disabled={!hasUnsavedChanges}
            >
              <Save className="w-4 h-4 mr-1" />
              Save Changes
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="privacy" className="flex items-center gap-1">
              <Shield className="w-4 h-4" />
              Privacy
            </TabsTrigger>
            <TabsTrigger value="storage" className="flex items-center gap-1">
              <HardDrive className="w-4 h-4" />
              Storage
            </TabsTrigger>
            <TabsTrigger value="inference" className="flex items-center gap-1">
              <Cpu className="w-4 h-4" />
              Models
            </TabsTrigger>
            <TabsTrigger value="interface" className="flex items-center gap-1">
              <Monitor className="w-4 h-4" />
              Interface
            </TabsTrigger>
            <TabsTrigger value="system" className="flex items-center gap-1">
              <Info className="w-4 h-4" />
              System
            </TabsTrigger>
          </TabsList>

          {/* Privacy & Security Tab */}
          <TabsContent value="privacy" className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Lock className="w-5 h-5" />
                Data Protection
              </h3>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="font-medium">Enable Encryption</Label>
                    <p className="text-sm text-muted-foreground">
                      Encrypt all stored data and conversations
                    </p>
                  </div>
                  <Switch
                    checked={settings.privacy.encryptionEnabled}
                    onCheckedChange={(checked) => 
                      updateSetting('privacy', 'encryptionEnabled', checked)
                    }
                  />
                </div>

                {settings.privacy.encryptionEnabled && (
                  <div className="space-y-2">
                    <Label>Encryption Key</Label>
                    <div className="flex gap-2">
                      <Input
                        type="password"
                        value={settings.privacy.encryptionKey}
                        onChange={(e) => 
                          updateSetting('privacy', 'encryptionKey', e.target.value)
                        }
                        placeholder="Enter a strong encryption key"
                      />
                      <Button variant="outline" size="sm">
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="font-medium">Auto-delete Old Data</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically delete conversations older than specified days
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={settings.privacy.autoDeleteAfterDays}
                      onChange={(e) => 
                        updateSetting('privacy', 'autoDeleteAfterDays', parseInt(e.target.value))
                      }
                      className="w-20"
                    />
                    <span className="text-sm text-muted-foreground">days</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="font-medium">Require Authentication</Label>
                    <p className="text-sm text-muted-foreground">
                      Require password when starting the application
                    </p>
                  </div>
                  <Switch
                    checked={settings.privacy.requireAuthOnStart}
                    onCheckedChange={(checked) => 
                      updateSetting('privacy', 'requireAuthOnStart', checked)
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="font-medium">Anonymize Data</Label>
                    <p className="text-sm text-muted-foreground">
                      Remove personally identifiable information from logs
                    </p>
                  </div>
                  <Switch
                    checked={settings.privacy.anonymizeData}
                    onCheckedChange={(checked) => 
                      updateSetting('privacy', 'anonymizeData', checked)
                    }
                  />
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <WifiOff className="w-5 h-5" />
                Network Security
              </h3>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="font-medium">Offline Mode</Label>
                    <p className="text-sm text-muted-foreground">
                      Block all network connections (recommended)
                    </p>
                  </div>
                  <Switch
                    checked={settings.network.offlineMode}
                    onCheckedChange={(checked) => 
                      updateSetting('network', 'offlineMode', checked)
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="font-medium">Block External Requests</Label>
                    <p className="text-sm text-muted-foreground">
                      Prevent any outbound network requests
                    </p>
                  </div>
                  <Switch
                    checked={settings.network.blockExternalRequests}
                    onCheckedChange={(checked) => 
                      updateSetting('network', 'blockExternalRequests', checked)
                    }
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Storage Tab */}
          <TabsContent value="storage" className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Folder className="w-5 h-5" />
                Storage Locations
              </h3>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Data Directory</Label>
                  <div className="flex gap-2">
                    <Input
                      value={settings.storage.dataDirectory}
                      onChange={(e) => 
                        updateSetting('storage', 'dataDirectory', e.target.value)
                      }
                      readOnly
                    />
                    <Button variant="outline" size="sm">
                      <Folder className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Current size: {formatBytes(systemInfo.dataDirectorySize * 1024 * 1024)}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Cache Size Limit</Label>
                  <div className="flex items-center gap-4">
                    <Slider
                      value={settings.storage.maxCacheSize}
                      onValueChange={(value) =>
                        updateSetting('storage', 'maxCacheSize', value)
                      }
                      max={8192}
                      min={256}
                      step={256}
                      className="flex-1"
                    />
                    <span className="text-sm font-medium min-w-20">
                      {formatBytes(settings.storage.maxCacheSize * 1024 * 1024)}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Current cache: {formatBytes(systemInfo.cacheSize * 1024 * 1024)}
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Database className="w-5 h-5" />
                Data Management
              </h3>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="font-medium">Auto Cleanup</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically clean temporary files and old cache
                    </p>
                  </div>
                  <Switch
                    checked={settings.storage.autoCleanup}
                    onCheckedChange={(checked) => 
                      updateSetting('storage', 'autoCleanup', checked)
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="font-medium">Compress Data</Label>
                    <p className="text-sm text-muted-foreground">
                      Use compression to save storage space
                    </p>
                  </div>
                  <Switch
                    checked={settings.storage.compressionEnabled}
                    onCheckedChange={(checked) => 
                      updateSetting('storage', 'compressionEnabled', checked)
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="font-medium">Enable Backups</Label>
                    <p className="text-sm text-muted-foreground">
                      Create regular backups of your data
                    </p>
                  </div>
                  <Switch
                    checked={settings.storage.backupEnabled}
                    onCheckedChange={(checked) => 
                      updateSetting('storage', 'backupEnabled', checked)
                    }
                  />
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={clearCache}>
                    <Trash2 className="w-4 h-4 mr-1" />
                    Clear Cache
                  </Button>
                  <Button variant="outline" onClick={createBackup}>
                    <Download className="w-4 h-4 mr-1" />
                    Create Backup
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Inference/Models Tab */}
          <TabsContent value="inference" className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <MemoryStick className="w-5 h-5" />
                Performance Settings
              </h3>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Maximum Memory Usage</Label>
                  <div className="flex items-center gap-4">
                    <Slider
                      value={settings.inference.maxMemoryUsage}
                      onValueChange={(value) =>
                        updateSetting('inference', 'maxMemoryUsage', value)
                      }
                      max={systemInfo.totalMemory}
                      min={1024}
                      step={512}
                      className="flex-1"
                    />
                    <span className="text-sm font-medium min-w-20">
                      {formatBytes(settings.inference.maxMemoryUsage * 1024 * 1024)}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Available: {formatBytes(systemInfo.availableMemory * 1024 * 1024)}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>CPU Threads</Label>
                  <div className="flex items-center gap-4">
                    <Slider
                      value={settings.inference.threadCount}
                      onValueChange={(value) =>
                        updateSetting('inference', 'threadCount', value)
                      }
                      max={systemInfo.cpuCores}
                      min={1}
                      step={1}
                      className="flex-1"
                    />
                    <span className="text-sm font-medium min-w-20">
                      {settings.inference.threadCount} / {systemInfo.cpuCores}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="font-medium">Use GPU Acceleration</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable GPU acceleration if available
                    </p>
                  </div>
                  <Switch
                    checked={settings.inference.useGPU}
                    onCheckedChange={(checked) => 
                      updateSetting('inference', 'useGPU', checked)
                    }
                  />
                </div>

                {showAdvanced && (
                  <>
                    <div className="space-y-2">
                      <Label>Context Window Size</Label>
                      <Input
                        type="number"
                        value={settings.inference.contextWindow}
                        onChange={(e) => 
                          updateSetting('inference', 'contextWindow', parseInt(e.target.value))
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Temperature</Label>
                      <div className="flex items-center gap-4">
                        <Slider
                          value={settings.inference.temperature}
                          onValueChange={(value) =>
                            updateSetting('inference', 'temperature', value)
                          }
                          max={2}
                          min={0}
                          step={0.1}
                          className="flex-1"
                        />
                        <span className="text-sm font-medium min-w-20">
                          {settings.inference.temperature.toFixed(1)}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Interface Tab */}
          <TabsContent value="interface" className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Sun className="w-5 h-5" />
                Appearance
              </h3>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Theme</Label>
                  <select
                    className="w-full px-3 py-2 border rounded-md"
                    value={settings.interface.theme}
                    onChange={(e) => 
                      updateSetting('interface', 'theme', e.target.value)
                    }
                  >
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                    <option value="system">System</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label>Font Size</Label>
                  <div className="flex items-center gap-4">
                    <Slider
                      value={settings.interface.fontSize}
                      onValueChange={(value) =>
                        updateSetting('interface', 'fontSize', value)
                      }
                      max={24}
                      min={10}
                      step={1}
                      className="flex-1"
                    />
                    <span className="text-sm font-medium min-w-20">
                      {settings.interface.fontSize}px
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Behavior
              </h3>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="font-medium">Auto Save</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically save conversations
                    </p>
                  </div>
                  <Switch
                    checked={settings.interface.autoSave}
                    onCheckedChange={(checked) => 
                      updateSetting('interface', 'autoSave', checked)
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="font-medium">Enable Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Show desktop notifications
                    </p>
                  </div>
                  <Switch
                    checked={settings.interface.notificationsEnabled}
                    onCheckedChange={(checked) => 
                      updateSetting('interface', 'notificationsEnabled', checked)
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="font-medium">Enable Sounds</Label>
                    <p className="text-sm text-muted-foreground">
                      Play notification sounds
                    </p>
                  </div>
                  <Switch
                    checked={settings.interface.enableSounds}
                    onCheckedChange={(checked) => 
                      updateSetting('interface', 'enableSounds', checked)
                    }
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          {/* System Info Tab */}
          <TabsContent value="system" className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">System Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Platform:</span>
                        <span className="text-sm font-medium">{systemInfo.platform}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Architecture:</span>
                        <span className="text-sm font-medium">{systemInfo.arch}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">App Version:</span>
                        <span className="text-sm font-medium">{systemInfo.appVersion}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Total RAM:</span>
                        <span className="text-sm font-medium">
                          {formatBytes(systemInfo.totalMemory * 1024 * 1024)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Available RAM:</span>
                        <span className="text-sm font-medium">
                          {formatBytes(systemInfo.availableMemory * 1024 * 1024)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">CPU Cores:</span>
                        <span className="text-sm font-medium">{systemInfo.cpuCores}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">Storage Usage</h3>
              
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm">Data Directory</span>
                    <span className="text-sm font-medium">
                      {formatBytes(systemInfo.dataDirectorySize * 1024 * 1024)}
                    </span>
                  </div>
                  <Progress 
                    value={(systemInfo.dataDirectorySize / 1000) * 100} 
                    className="h-2"
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm">Cache</span>
                    <span className="text-sm font-medium">
                      {formatBytes(systemInfo.cacheSize * 1024 * 1024)}
                    </span>
                  </div>
                  <Progress 
                    value={(systemInfo.cacheSize / settings.storage.maxCacheSize) * 100} 
                    className="h-2"
                  />
                </div>

                {systemInfo.lastBackup && (
                  <div className="text-sm text-muted-foreground">
                    Last backup: {systemInfo.lastBackup.toLocaleDateString()}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Bottom actions */}
        <div className="flex items-center justify-between pt-6 border-t">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Shield className="w-4 h-4" />
            <span>All settings are stored locally and never shared</span>
          </div>
          
          {hasUnsavedChanges && (
            <Badge variant="outline" className="text-amber-600">
              <AlertTriangle className="w-3 h-3 mr-1" />
              Unsaved changes
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default LocalSettingsPanel;