import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import type { AdvancedSettings, KeyboardShortcut, LoadingState } from '@types/index'

interface SettingsState extends LoadingState {
  settings: AdvancedSettings
  keyboardShortcuts: KeyboardShortcut[]
  backupSettings: {
    autoBackup: boolean
    backupFrequency: 'daily' | 'weekly' | 'monthly'
    lastBackup?: Date
    backupLocation: 'local' | 'cloud'
    retentionPeriod: number // days
  }
  syncSettings: {
    enabled: boolean
    lastSync?: Date
    conflicts: Array<{
      id: string
      setting: string
      localValue: any
      remoteValue: any
      timestamp: Date
    }>
  }

  // Actions
  updateSettings: (updates: Partial<AdvancedSettings>) => void
  resetSettings: () => void
  exportSettings: (format: 'json' | 'xml') => void
  importSettings: (data: string, format: 'json' | 'xml') => Promise<void>
  addKeyboardShortcut: (shortcut: Omit<KeyboardShortcut, 'id'>) => void
  updateKeyboardShortcut: (id: string, updates: Partial<KeyboardShortcut>) => void
  removeKeyboardShortcut: (id: string) => void
  resetKeyboardShortcuts: () => void
  createBackup: () => Promise<void>
  restoreBackup: (backupData: string) => Promise<void>
  syncSettings: () => Promise<void>
  resolveConflict: (conflictId: string, resolution: 'local' | 'remote') => void
  validateSettings: () => { isValid: boolean; errors: string[] }
}

const defaultSettings: AdvancedSettings = {
  security: {
    sessionTimeout: 3600, // 1 hour in seconds
    requireReauth: true,
    enableAuditLog: true,
    ipWhitelist: undefined,
  },
  privacy: {
    shareUsageData: false,
    enableTelemetry: false,
    dataRetentionDays: 365,
    exportFormat: 'json',
  },
  chat: {
    maxMessageLength: 4000,
    autoSave: true,
    showConfidence: true,
    enableCitations: true,
    contextWindow: 10,
  },
  documents: {
    defaultView: 'grid',
    thumbnails: true,
    versionHistory: true,
    autoBackup: true,
  },
  research: {
    defaultFilters: {
      relevanceThreshold: 0.7,
      sortBy: 'relevance',
      sortOrder: 'desc',
    },
    saveSearches: true,
    maxResults: 50,
    cacheResults: true,
  },
}

const defaultKeyboardShortcuts: KeyboardShortcut[] = [
  {
    id: '1',
    key: 'Ctrl+N',
    description: 'New conversation',
    action: () => {}, // Will be bound in components
    context: 'chat',
    enabled: true,
  },
  {
    id: '2',
    key: 'Ctrl+K',
    description: 'Quick search',
    action: () => {},
    context: 'global',
    enabled: true,
  },
  {
    id: '3',
    key: 'Ctrl+Shift+F',
    description: 'Advanced search',
    action: () => {},
    context: 'research',
    enabled: true,
  },
  {
    id: '4',
    key: 'Ctrl+E',
    description: 'Export conversation',
    action: () => {},
    context: 'chat',
    enabled: true,
  },
  {
    id: '5',
    key: 'Ctrl+D',
    description: 'Toggle document view',
    action: () => {},
    context: 'documents',
    enabled: true,
  },
  {
    id: '6',
    key: 'Escape',
    description: 'Close modal/dialog',
    action: () => {},
    context: 'global',
    enabled: true,
  },
  {
    id: '7',
    key: 'Ctrl+/',
    description: 'Show keyboard shortcuts',
    action: () => {},
    context: 'global',
    enabled: true,
  },
]

export const useSettingsStore = create<SettingsState>()(
  devtools(
    persist(
      (set, get) => ({
        settings: defaultSettings,
        keyboardShortcuts: defaultKeyboardShortcuts,
        isLoading: false,
        error: null,
        backupSettings: {
          autoBackup: true,
          backupFrequency: 'weekly',
          backupLocation: 'local',
          retentionPeriod: 30,
        },
        syncSettings: {
          enabled: false,
          conflicts: [],
        },

        updateSettings: (updates) => {
          set((state) => ({
            settings: {
              ...state.settings,
              ...Object.keys(updates).reduce((acc, key) => {
                const typedKey = key as keyof AdvancedSettings
                acc[typedKey] = { ...state.settings[typedKey], ...updates[typedKey] }
                return acc
              }, {} as Partial<AdvancedSettings>),
            },
          }))
        },

        resetSettings: () => {
          set({ settings: defaultSettings })
        },

        exportSettings: (format) => {
          const { settings, keyboardShortcuts, backupSettings } = get()
          const exportData = {
            settings,
            keyboardShortcuts,
            backupSettings,
            exportedAt: new Date().toISOString(),
            version: '1.0.0',
          }
          
          const filename = `bear_ai_settings_${new Date().toISOString().split('T')[0]}`
          
          let content: string
          let mimeType: string
          let fileExtension: string
          
          switch (format) {
            case 'json':
              content = JSON.stringify(exportData, null, 2)
              mimeType = 'application/json'
              fileExtension = 'json'
              break
            case 'xml':
              content = convertToXML(exportData)
              mimeType = 'application/xml'
              fileExtension = 'xml'
              break
            default:
              return
          }
          
          const blob = new Blob([content], { type: mimeType })
          const url = URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = url
          link.download = `${filename}.${fileExtension}`
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          URL.revokeObjectURL(url)
        },

        importSettings: async (data, format) => {
          set({ isLoading: true, error: null })
          
          try {
            let parsedData: any
            
            switch (format) {
              case 'json':
                parsedData = JSON.parse(data)
                break
              case 'xml':
                parsedData = convertFromXML(data)
                break
              default:
                throw new Error('Unsupported format')
            }
            
            // Validate imported data structure
            if (!parsedData.settings || !parsedData.version) {
              throw new Error('Invalid settings file format')
            }
            
            // Merge settings with validation
            const validatedSettings = validateImportedSettings(parsedData.settings)
            const validatedShortcuts = validateImportedShortcuts(parsedData.keyboardShortcuts || [])
            
            set({
              settings: { ...defaultSettings, ...validatedSettings },
              keyboardShortcuts: validatedShortcuts.length > 0 ? validatedShortcuts : defaultKeyboardShortcuts,
              isLoading: false,
            })
            
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to import settings',
              isLoading: false,
            })
          }
        },

        addKeyboardShortcut: (shortcut) => {
          const newShortcut: KeyboardShortcut = {
            ...shortcut,
            id: crypto.randomUUID(),
          }
          
          set((state) => ({
            keyboardShortcuts: [...state.keyboardShortcuts, newShortcut],
          }))
        },

        updateKeyboardShortcut: (id, updates) => {
          set((state) => ({
            keyboardShortcuts: state.keyboardShortcuts.map(shortcut =>
              shortcut.id === id ? { ...shortcut, ...updates } : shortcut
            ),
          }))
        },

        removeKeyboardShortcut: (id) => {
          set((state) => ({
            keyboardShortcuts: state.keyboardShortcuts.filter(shortcut => shortcut.id !== id),
          }))
        },

        resetKeyboardShortcuts: () => {
          set({ keyboardShortcuts: defaultKeyboardShortcuts })
        },

        createBackup: async () => {
          set({ isLoading: true, error: null })
          
          try {
            const { settings, keyboardShortcuts } = get()
            const backupData = {
              settings,
              keyboardShortcuts,
              createdAt: new Date().toISOString(),
              version: '1.0.0',
            }
            
            // Simulate backup creation
            await new Promise(resolve => setTimeout(resolve, 1000))
            
            const backupJson = JSON.stringify(backupData, null, 2)
            const filename = `bear_ai_backup_${new Date().toISOString().split('T')[0]}`
            
            const blob = new Blob([backupJson], { type: 'application/json' })
            const url = URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = `${filename}.json`
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            URL.revokeObjectURL(url)
            
            set((state) => ({
              backupSettings: {
                ...state.backupSettings,
                lastBackup: new Date(),
              },
              isLoading: false,
            }))
            
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to create backup',
              isLoading: false,
            })
          }
        },

        restoreBackup: async (backupData) => {
          set({ isLoading: true, error: null })
          
          try {
            await get().importSettings(backupData, 'json')
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to restore backup',
              isLoading: false,
            })
          }
        },

        syncSettings: async () => {
          set({ isLoading: true, error: null })
          
          try {
            // Simulate sync operation
            await new Promise(resolve => setTimeout(resolve, 1500))
            
            set((state) => ({
              syncSettings: {
                ...state.syncSettings,
                lastSync: new Date(),
              },
              isLoading: false,
            }))
            
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to sync settings',
              isLoading: false,
            })
          }
        },

        resolveConflict: (conflictId, resolution) => {
          set((state) => ({
            syncSettings: {
              ...state.syncSettings,
              conflicts: state.syncSettings.conflicts.filter(c => c.id !== conflictId),
            },
          }))
        },

        validateSettings: () => {
          const { settings } = get()
          const errors: string[] = []
          
          // Validate session timeout
          if (settings.security.sessionTimeout < 300 || settings.security.sessionTimeout > 86400) {
            errors.push('Session timeout must be between 5 minutes and 24 hours')
          }
          
          // Validate data retention
          if (settings.privacy.dataRetentionDays < 1 || settings.privacy.dataRetentionDays > 2555) {
            errors.push('Data retention period must be between 1 and 2555 days')
          }
          
          // Validate message length
          if (settings.chat.maxMessageLength < 100 || settings.chat.maxMessageLength > 10000) {
            errors.push('Max message length must be between 100 and 10,000 characters')
          }
          
          // Validate context window
          if (settings.chat.contextWindow < 1 || settings.chat.contextWindow > 50) {
            errors.push('Chat context window must be between 1 and 50 messages')
          }
          
          // Validate max results
          if (settings.research.maxResults < 10 || settings.research.maxResults > 500) {
            errors.push('Max research results must be between 10 and 500')
          }
          
          return {
            isValid: errors.length === 0,
            errors,
          }
        },
      }),
      {
        name: 'settings-storage',
        partialize: (state) => ({
          settings: state.settings,
          keyboardShortcuts: state.keyboardShortcuts,
          backupSettings: state.backupSettings,
          syncSettings: state.syncSettings,
        }),
      }
    ),
    { name: 'settings-store' }
  )
)

// Helper functions
function convertToXML(data: any): string {
  // Simplified XML conversion - in real app, use a proper XML library
  function objectToXML(obj: any, rootName = 'root'): string {
    let xml = `<${rootName}>`
    
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        xml += objectToXML(value, key)
      } else if (Array.isArray(value)) {
        xml += `<${key}>`
        value.forEach(item => {
          xml += objectToXML(item, 'item')
        })
        xml += `</${key}>`
      } else {
        xml += `<${key}>${value}</${key}>`
      }
    }
    
    xml += `</${rootName}>`
    return xml
  }
  
  return `<?xml version="1.0" encoding="UTF-8"?>\n${objectToXML(data, 'settings')}`
}

function convertFromXML(xml: string): any {
  // Simplified XML parsing - in real app, use a proper XML library
  // This is a basic implementation for demonstration
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(xml, 'text/xml')
    
    // Basic XML to JSON conversion
    function xmlNodeToObject(node: Element): any {
      const obj: any = {}
      
      if (node.children.length === 0) {
        return node.textContent
      }
      
      Array.from(node.children).forEach(child => {
        const key = child.tagName
        if (obj[key]) {
          if (!Array.isArray(obj[key])) {
            obj[key] = [obj[key]]
          }
          obj[key].push(xmlNodeToObject(child))
        } else {
          obj[key] = xmlNodeToObject(child)
        }
      })
      
      return obj
    }
    
    return xmlNodeToObject(doc.documentElement)
  } catch (error) {
    throw new Error('Invalid XML format')
  }
}

function validateImportedSettings(importedSettings: any): Partial<AdvancedSettings> {
  // Validate and sanitize imported settings
  const validated: Partial<AdvancedSettings> = {}
  
  if (importedSettings.security) {
    validated.security = {
      sessionTimeout: Math.max(300, Math.min(86400, importedSettings.security.sessionTimeout || defaultSettings.security.sessionTimeout)),
      requireReauth: Boolean(importedSettings.security.requireReauth ?? defaultSettings.security.requireReauth),
      enableAuditLog: Boolean(importedSettings.security.enableAuditLog ?? defaultSettings.security.enableAuditLog),
      ipWhitelist: Array.isArray(importedSettings.security.ipWhitelist) ? importedSettings.security.ipWhitelist : undefined,
    }
  }
  
  if (importedSettings.privacy) {
    validated.privacy = {
      shareUsageData: Boolean(importedSettings.privacy.shareUsageData ?? defaultSettings.privacy.shareUsageData),
      enableTelemetry: Boolean(importedSettings.privacy.enableTelemetry ?? defaultSettings.privacy.enableTelemetry),
      dataRetentionDays: Math.max(1, Math.min(2555, importedSettings.privacy.dataRetentionDays || defaultSettings.privacy.dataRetentionDays)),
      exportFormat: ['json', 'xml', 'csv'].includes(importedSettings.privacy.exportFormat) ? importedSettings.privacy.exportFormat : defaultSettings.privacy.exportFormat,
    }
  }
  
  // Continue validation for other settings sections...
  
  return validated
}

function validateImportedShortcuts(importedShortcuts: any[]): KeyboardShortcut[] {
  if (!Array.isArray(importedShortcuts)) return []
  
  return importedShortcuts
    .filter(shortcut => 
      shortcut && 
      typeof shortcut.key === 'string' && 
      typeof shortcut.description === 'string'
    )
    .map(shortcut => ({
      id: shortcut.id || crypto.randomUUID(),
      key: shortcut.key,
      description: shortcut.description,
      action: () => {}, // Actions need to be rebound
      context: ['global', 'chat', 'documents', 'research'].includes(shortcut.context) ? shortcut.context : 'global',
      enabled: Boolean(shortcut.enabled ?? true),
    }))
}