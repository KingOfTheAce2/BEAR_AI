import React, { useState } from 'react'
import {
  Settings as SettingsIcon,
  User,
  Shield,
  Bell,
  Palette,
  Keyboard,
  Database,
  Download,
  Upload,
  Trash2,
  Save,
  RefreshCw,
  Lock,
  Eye,
  EyeOff,
  Globe,
  MessageSquare,
  FileText,
  Search,
  Clock,
  HardDrive,
  Cloud,
  Check,
  X,
  AlertTriangle,
  Info
} from 'lucide-react'
import { useSettingsStore } from '../store/settingsStore'
import { useAuthStore } from '../store'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import type { AdvancedSettings, KeyboardShortcut } from '../types'

const Settings: React.FC = () => {
  const {
    settings,
    keyboardShortcuts,
    backupSettings,
    syncSettings,
    isLoading,
    error,
    updateSettings,
    resetSettings,
    exportSettings,
    importSettings,
    addKeyboardShortcut,
    updateKeyboardShortcut,
    removeKeyboardShortcut,
    resetKeyboardShortcuts,
    createBackup,
    restoreBackup,
    syncSettings: performSync,
    validateSettings
  } = useSettingsStore()
  
  const { user, updateUser } = useAuthStore()
  
  const [activeSection, setActiveSection] = useState<string>('general')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [newShortcut, setNewShortcut] = useState<Partial<KeyboardShortcut>>({})
  const [showNewShortcutForm, setShowNewShortcutForm] = useState(false)
  const [importData, setImportData] = useState('')
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [validationResult, setValidationResult] = useState<{ isValid: boolean; errors: string[] } | null>(null)
  
  const sections = [
    { id: 'general', label: 'General', icon: User },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'privacy', label: 'Privacy', icon: Lock },
    { id: 'chat', label: 'Chat', icon: MessageSquare },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'research', label: 'Research', icon: Search },
    { id: 'shortcuts', label: 'Shortcuts', icon: Keyboard },
    { id: 'backup', label: 'Backup & Sync', icon: Database },
    { id: 'advanced', label: 'Advanced', icon: SettingsIcon }
  ]
  
  const handleSettingsUpdate = (section: keyof AdvancedSettings, updates: any) => {
    updateSettings({ [section]: updates })
  }
  
  const handleAddShortcut = () => {
    if (newShortcut.key && newShortcut.description) {
      addKeyboardShortcut({
        key: newShortcut.key,
        description: newShortcut.description,
        action: () => {}, // Will be bound in components
        context: newShortcut.context || 'global',
        enabled: true
      })
      setNewShortcut({})
      setShowNewShortcutForm(false)
    }
  }
  
  const handleImport = async (format: 'json' | 'xml') => {
    try {
      await importSettings(importData, format)
      setShowImportDialog(false)
      setImportData('')
    } catch (err) {
      console.error('Import failed:', err)
    }
  }
  
  const handleValidateSettings = () => {
    const result = validateSettings()
    setValidationResult(result)
    setTimeout(() => setValidationResult(null), 5000)
  }
  
  const renderSection = () => {
    switch (activeSection) {
      case 'general':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">General Preferences</h3>
              
              {/* Theme */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Theme
                  </label>
                  <select
                    value={user?.preferences.theme || 'system'}
                    onChange={(e) => updateUser({ preferences: { ...user?.preferences, theme: e.target.value as any } })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                    <option value="system">System</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Language
                  </label>
                  <select
                    value={user?.preferences.language || 'en'}
                    onChange={(e) => updateUser({ preferences: { ...user?.preferences, language: e.target.value } })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="en">English</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                    <option value="de">German</option>
                  </select>
                </div>
              </div>
              
              {/* Auto-save */}
              <div className="mt-6">
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={user?.preferences.autoSave || false}
                    onChange={(e) => updateUser({ preferences: { ...user?.preferences, autoSave: e.target.checked } })}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Enable auto-save
                  </span>
                </label>
                <p className="text-sm text-gray-500 mt-1">
                  Automatically save your work as you type
                </p>
              </div>
              
              {/* Notifications */}
              <div className="mt-6">
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={user?.preferences.notifications || false}
                    onChange={(e) => updateUser({ preferences: { ...user?.preferences, notifications: e.target.checked } })}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Enable notifications
                  </span>
                </label>
                <p className="text-sm text-gray-500 mt-1">
                  Receive notifications about important updates
                </p>
              </div>
            </div>
          </div>
        )
      
      case 'security':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Security Settings</h3>
              
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Session Timeout (minutes)
                  </label>
                  <Input
                    type="number"
                    min="5"
                    max="1440"
                    value={Math.floor(settings.security.sessionTimeout / 60)}
                    onChange={(e) => handleSettingsUpdate('security', {
                      ...settings.security,
                      sessionTimeout: parseInt(e.target.value) * 60
                    })}
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Automatically log out after this period of inactivity
                  </p>
                </div>
                
                <div>
                  <label className="flex items-center space-x-3 pt-6">
                    <input
                      type="checkbox"
                      checked={settings.security.requireReauth}
                      onChange={(e) => handleSettingsUpdate('security', {
                        ...settings.security,
                        requireReauth: e.target.checked
                      })}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Require re-authentication for sensitive actions
                    </span>
                  </label>
                </div>
              </div>
              
              <div className="mt-6">
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={settings.security.enableAuditLog}
                    onChange={(e) => handleSettingsUpdate('security', {
                      ...settings.security,
                      enableAuditLog: e.target.checked
                    })}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Enable audit logging
                  </span>
                </label>
                <p className="text-sm text-gray-500 mt-1">
                  Track all user activities for security and compliance
                </p>
              </div>
              
              {/* IP Whitelist */}
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  IP Address Whitelist (optional)
                </label>
                <textarea
                  value={settings.security.ipWhitelist?.join('\n') || ''}
                  onChange={(e) => handleSettingsUpdate('security', {
                    ...settings.security,
                    ipWhitelist: e.target.value.split('\n').filter(ip => ip.trim())
                  })}
                  placeholder="Enter IP addresses, one per line"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 h-24"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Only allow access from these IP addresses
                </p>
              </div>
            </div>
          </div>
        )
      
      case 'privacy':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Privacy Controls</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={settings.privacy.shareUsageData}
                      onChange={(e) => handleSettingsUpdate('privacy', {
                        ...settings.privacy,
                        shareUsageData: e.target.checked
                      })}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Share usage data
                    </span>
                  </label>
                  <p className="text-sm text-gray-500 mt-1 ml-6">
                    Help improve the application by sharing anonymous usage statistics
                  </p>
                </div>
                
                <div>
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={settings.privacy.enableTelemetry}
                      onChange={(e) => handleSettingsUpdate('privacy', {
                        ...settings.privacy,
                        enableTelemetry: e.target.checked
                      })}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Enable telemetry
                    </span>
                  </label>
                  <p className="text-sm text-gray-500 mt-1 ml-6">
                    Send diagnostic and performance data to help us improve the service
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-6 mt-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Data Retention Period (days)
                    </label>
                    <Input
                      type="number"
                      min="1"
                      max="2555"
                      value={settings.privacy.dataRetentionDays}
                      onChange={(e) => handleSettingsUpdate('privacy', {
                        ...settings.privacy,
                        dataRetentionDays: parseInt(e.target.value)
                      })}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Export Format
                    </label>
                    <select
                      value={settings.privacy.exportFormat}
                      onChange={(e) => handleSettingsUpdate('privacy', {
                        ...settings.privacy,
                        exportFormat: e.target.value as any
                      })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    >
                      <option value="json">JSON</option>
                      <option value="xml">XML</option>
                      <option value="csv">CSV</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      
      case 'chat':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Chat Settings</h3>
              
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Message Length
                  </label>
                  <Input
                    type="number"
                    min="100"
                    max="10000"
                    value={settings.chat.maxMessageLength}
                    onChange={(e) => handleSettingsUpdate('chat', {
                      ...settings.chat,
                      maxMessageLength: parseInt(e.target.value)
                    })}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Context Window (messages)
                  </label>
                  <Input
                    type="number"
                    min="1"
                    max="50"
                    value={settings.chat.contextWindow}
                    onChange={(e) => handleSettingsUpdate('chat', {
                      ...settings.chat,
                      contextWindow: parseInt(e.target.value)
                    })}
                  />
                </div>
              </div>
              
              <div className="space-y-4 mt-6">
                <div>
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={settings.chat.autoSave}
                      onChange={(e) => handleSettingsUpdate('chat', {
                        ...settings.chat,
                        autoSave: e.target.checked
                      })}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Auto-save conversations
                    </span>
                  </label>
                </div>
                
                <div>
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={settings.chat.showConfidence}
                      onChange={(e) => handleSettingsUpdate('chat', {
                        ...settings.chat,
                        showConfidence: e.target.checked
                      })}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Show AI confidence scores
                    </span>
                  </label>
                </div>
                
                <div>
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={settings.chat.enableCitations}
                      onChange={(e) => handleSettingsUpdate('chat', {
                        ...settings.chat,
                        enableCitations: e.target.checked
                      })}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Enable legal citations
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )
      
      case 'documents':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Document Settings</h3>
              
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Default View
                  </label>
                  <select
                    value={settings.documents.defaultView}
                    onChange={(e) => handleSettingsUpdate('documents', {
                      ...settings.documents,
                      defaultView: e.target.value as any
                    })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="grid">Grid View</option>
                    <option value="list">List View</option>
                  </select>
                </div>
              </div>
              
              <div className="space-y-4 mt-6">
                <div>
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={settings.documents.thumbnails}
                      onChange={(e) => handleSettingsUpdate('documents', {
                        ...settings.documents,
                        thumbnails: e.target.checked
                      })}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Show document thumbnails
                    </span>
                  </label>
                </div>
                
                <div>
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={settings.documents.versionHistory}
                      onChange={(e) => handleSettingsUpdate('documents', {
                        ...settings.documents,
                        versionHistory: e.target.checked
                      })}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Enable version history
                    </span>
                  </label>
                </div>
                
                <div>
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={settings.documents.autoBackup}
                      onChange={(e) => handleSettingsUpdate('documents', {
                        ...settings.documents,
                        autoBackup: e.target.checked
                      })}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Auto-backup documents
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )
      
      case 'research':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Research Settings</h3>
              
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Results
                  </label>
                  <Input
                    type="number"
                    min="10"
                    max="500"
                    value={settings.research.maxResults}
                    onChange={(e) => handleSettingsUpdate('research', {
                      ...settings.research,
                      maxResults: parseInt(e.target.value)
                    })}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Default Sort
                  </label>
                  <select
                    value={`${settings.research.defaultFilters.sortBy}-${settings.research.defaultFilters.sortOrder}`}
                    onChange={(e) => {
                      const [sortBy, sortOrder] = e.target.value.split('-')
                      handleSettingsUpdate('research', {
                        ...settings.research,
                        defaultFilters: {
                          ...settings.research.defaultFilters,
                          sortBy: sortBy as any,
                          sortOrder: sortOrder as any
                        }
                      })
                    }}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="relevance-desc">Relevance (High to Low)</option>
                    <option value="relevance-asc">Relevance (Low to High)</option>
                    <option value="date-desc">Date (Newest First)</option>
                    <option value="date-asc">Date (Oldest First)</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Min Relevance Threshold: {((settings.research.defaultFilters.relevanceThreshold || 0.7) * 100).toFixed(0)}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={settings.research.defaultFilters.relevanceThreshold || 0.7}
                  onChange={(e) => handleSettingsUpdate('research', {
                    ...settings.research,
                    defaultFilters: {
                      ...settings.research.defaultFilters,
                      relevanceThreshold: parseFloat(e.target.value)
                    }
                  })}
                  className="w-full"
                />
              </div>
              
              <div className="space-y-4 mt-6">
                <div>
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={settings.research.saveSearches}
                      onChange={(e) => handleSettingsUpdate('research', {
                        ...settings.research,
                        saveSearches: e.target.checked
                      })}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Save searches automatically
                    </span>
                  </label>
                </div>
                
                <div>
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={settings.research.cacheResults}
                      onChange={(e) => handleSettingsUpdate('research', {
                        ...settings.research,
                        cacheResults: e.target.checked
                      })}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Cache search results
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )
      
      case 'shortcuts':
        return (
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Keyboard Shortcuts</h3>
                <div className="space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowNewShortcutForm(true)}
                  >
                    Add Shortcut
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetKeyboardShortcuts}
                  >
                    Reset to Defaults
                  </Button>
                </div>
              </div>
              
              {/* New Shortcut Form */}
              {showNewShortcutForm && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
                  <div className="grid grid-cols-3 gap-4">
                    <Input
                      placeholder="Key combination (e.g., Ctrl+K)"
                      value={newShortcut.key || ''}
                      onChange={(e) => setNewShortcut({ ...newShortcut, key: e.target.value })}
                    />
                    <Input
                      placeholder="Description"
                      value={newShortcut.description || ''}
                      onChange={(e) => setNewShortcut({ ...newShortcut, description: e.target.value })}
                    />
                    <select
                      value={newShortcut.context || 'global'}
                      onChange={(e) => setNewShortcut({ ...newShortcut, context: e.target.value as any })}
                      className="border border-gray-300 rounded-md px-3 py-2"
                    >
                      <option value="global">Global</option>
                      <option value="chat">Chat</option>
                      <option value="documents">Documents</option>
                      <option value="research">Research</option>
                    </select>
                  </div>
                  <div className="flex justify-end space-x-2 mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowNewShortcutForm(false)
                        setNewShortcut({})
                      }}
                    >
                      Cancel
                    </Button>
                    <Button size="sm" onClick={handleAddShortcut}>
                      Add
                    </Button>
                  </div>
                </div>
              )}
              
              {/* Shortcuts List */}
              <div className="space-y-2">
                {keyboardShortcuts.map((shortcut) => (
                  <div
                    key={shortcut.id}
                    className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg"
                  >
                    <div className="flex items-center space-x-4">
                      <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">
                        {shortcut.key}
                      </code>
                      <span className="text-sm text-gray-900">{shortcut.description}</span>
                      <span className="text-xs text-gray-500 capitalize">
                        {shortcut.context}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={shortcut.enabled}
                          onChange={(e) => updateKeyboardShortcut(shortcut.id, { enabled: e.target.checked })}
                          className="rounded border-gray-300"
                        />
                      </label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeKeyboardShortcut(shortcut.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
      
      case 'backup':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Backup & Sync</h3>
              
              {/* Backup Settings */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="font-medium text-gray-900 mb-4">Backup Settings</h4>
                
                <div className="space-y-4">
                  <div>
                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={backupSettings.autoBackup}
                        onChange={(e) => {
                          // Update backup settings - in real app would call store method
                          console.log('Update backup settings:', { autoBackup: e.target.checked })
                        }}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm font-medium text-gray-700">
                        Enable automatic backups
                      </span>
                    </label>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Backup Frequency
                      </label>
                      <select
                        value={backupSettings.backupFrequency}
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                      >
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Backup Location
                      </label>
                      <select
                        value={backupSettings.backupLocation}
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                      >
                        <option value="local">Local Storage</option>
                        <option value="cloud">Cloud Storage</option>
                      </select>
                    </div>
                  </div>
                  
                  {backupSettings.lastBackup && (
                    <div className="text-sm text-gray-600">
                      Last backup: {backupSettings.lastBackup.toLocaleString()}
                    </div>
                  )}
                  
                  <div className="flex space-x-3">
                    <Button onClick={createBackup} disabled={isLoading}>
                      {isLoading ? (
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4 mr-2" />
                      )}
                      Create Backup
                    </Button>
                    
                    <Button
                      variant="outline"
                      onClick={() => document.getElementById('backup-restore')?.click()}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Restore Backup
                    </Button>
                    <input
                      id="backup-restore"
                      type="file"
                      accept=".json"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          const reader = new FileReader()
                          reader.onload = (e) => {
                            const data = e.target?.result as string
                            restoreBackup(data)
                          }
                          reader.readAsText(file)
                        }
                      }}
                      className="hidden"
                    />
                  </div>
                </div>
              </div>
              
              {/* Sync Settings */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="font-medium text-gray-900 mb-4">Sync Settings</h4>
                
                <div className="space-y-4">
                  <div>
                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={syncSettings.enabled}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm font-medium text-gray-700">
                        Enable settings sync
                      </span>
                    </label>
                    <p className="text-sm text-gray-500 mt-1 ml-6">
                      Sync settings across devices
                    </p>
                  </div>
                  
                  {syncSettings.lastSync && (
                    <div className="text-sm text-gray-600">
                      Last sync: {syncSettings.lastSync.toLocaleString()}
                    </div>
                  )}
                  
                  {syncSettings.conflicts.length > 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <h5 className="font-medium text-yellow-800 mb-2">
                        Sync Conflicts ({syncSettings.conflicts.length})
                      </h5>
                      <div className="space-y-2">
                        {syncSettings.conflicts.map((conflict) => (
                          <div key={conflict.id} className="text-sm">
                            <div className="font-medium text-yellow-900">{conflict.setting}</div>
                            <div className="text-yellow-700">
                              Local: {JSON.stringify(conflict.localValue)} | 
                              Remote: {JSON.stringify(conflict.remoteValue)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <Button onClick={performSync} disabled={isLoading}>
                    {isLoading ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4 mr-2" />
                    )}
                    Sync Now
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )
      
      case 'advanced':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Advanced Settings</h3>
              
              {/* Export/Import */}
              <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
                <h4 className="font-medium text-gray-900 mb-4">Export & Import</h4>
                
                <div className="space-y-4">
                  <div className="flex space-x-3">
                    <Button
                      variant="outline"
                      onClick={() => exportSettings('json')}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Export JSON
                    </Button>
                    
                    <Button
                      variant="outline"
                      onClick={() => exportSettings('xml')}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Export XML
                    </Button>
                    
                    <Button
                      variant="outline"
                      onClick={() => setShowImportDialog(true)}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Import Settings
                    </Button>
                  </div>
                </div>
              </div>
              
              {/* Validation */}
              <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
                <h4 className="font-medium text-gray-900 mb-4">Settings Validation</h4>
                
                <div className="space-y-4">
                  <Button
                    variant="outline"
                    onClick={handleValidateSettings}
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Validate Settings
                  </Button>
                  
                  {validationResult && (
                    <div className={`p-4 rounded-lg ${
                      validationResult.isValid 
                        ? 'bg-green-50 border border-green-200' 
                        : 'bg-red-50 border border-red-200'
                    }`}>
                      <div className="flex items-center space-x-2 mb-2">
                        {validationResult.isValid ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-red-600" />
                        )}
                        <span className={`font-medium ${
                          validationResult.isValid ? 'text-green-800' : 'text-red-800'
                        }`}>
                          {validationResult.isValid ? 'Settings are valid' : 'Settings validation failed'}
                        </span>
                      </div>
                      
                      {!validationResult.isValid && (
                        <ul className="list-disc list-inside space-y-1 text-sm text-red-700">
                          {validationResult.errors.map((error, index) => (
                            <li key={index}>{error}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Reset */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="font-medium text-gray-900 mb-4">Reset Settings</h4>
                
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Reset all settings to their default values. This action cannot be undone.
                  </p>
                  
                  <Button
                    variant="outline"
                    onClick={resetSettings}
                    className="text-red-600 border-red-300 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Reset All Settings
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )
      
      default:
        return null
    }
  }
  
  return (
    <div className="flex h-full bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Settings</h2>
        </div>
        
        <nav className="p-2">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`w-full flex items-center space-x-3 px-3 py-2 text-left text-sm font-medium rounded-md transition-colors ${
                activeSection === section.id
                  ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-600'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <section.icon className="w-4 h-4" />
              <span>{section.label}</span>
            </button>
          ))}
        </nav>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-6">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <span className="text-red-800">{error}</span>
              </div>
            </div>
          )}
          
          {renderSection()}
        </div>
      </div>
      
      {/* Import Dialog */}
      {showImportDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-h-96">
            <h3 className="text-lg font-semibold mb-4">Import Settings</h3>
            
            <textarea
              value={importData}
              onChange={(e) => setImportData(e.target.value)}
              placeholder="Paste your settings data here..."
              className="w-full h-32 border border-gray-300 rounded-md px-3 py-2 mb-4"
            />
            
            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowImportDialog(false)
                  setImportData('')
                }}
              >
                Cancel
              </Button>
              <Button onClick={() => handleImport('json')}>
                Import JSON
              </Button>
              <Button onClick={() => handleImport('xml')}>
                Import XML
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Settings