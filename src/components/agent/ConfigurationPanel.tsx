import React from 'react'
import { Agent } from '../../types'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card'
import { cn } from '../../utils/cn'
import { Form, useForm } from '../forms/Form'
import { Input } from '../ui/Input'

import {
  Settings,
  Save,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Trash2,
  Plus,
  Minus,
  Copy,
  Download,
  Upload,
  Eye,
  EyeOff
} from 'lucide-react'

export interface ConfigurationPanelProps {
  agent?: Agent
  onSave: (config: AgentConfiguration) => void
  onReset?: () => void
  onDelete?: () => void
  onDuplicate?: () => void
  onImport?: (config: AgentConfiguration) => void
  onExport?: (config: AgentConfiguration) => void
  className?: string
}

interface AgentConfiguration {
  name: string
  type: Agent['type']
  capabilities: string[]
  settings: {
    maxConcurrency: number
    timeout: number
    retryAttempts: number
    memoryLimit: number
    priority: 'low' | 'medium' | 'high'
    autoStart: boolean
    enableLogging: boolean
    enableMetrics: boolean
  }
  advanced: {
    customPrompt?: string
    environment: Record<string, string>
    permissions: string[]
    dependencies: string[]
  }
}

const ConfigurationPanel: React.FC<ConfigurationPanelProps> = ({
  agent,
  onSave,
  onReset,
  onDelete,
  onDuplicate,
  onImport,
  onExport,
  className,
}) => {
  const [activeTab, setActiveTab] = React.useState<'basic' | 'settings' | 'advanced'>('basic')
  const [showAdvanced, setShowAdvanced] = React.useState(false)
  const [hasChanges, setHasChanges] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(false)
  const [config, setConfig] = React.useState<AgentConfiguration>({
    name: agent?.name || '',
    type: agent?.type || 'researcher',
    capabilities: agent?.capabilities || [],
    settings: {
      maxConcurrency: 5,
      timeout: 30000,
      retryAttempts: 3,
      memoryLimit: 512,
      priority: 'medium',
      autoStart: false,
      enableLogging: true,
      enableMetrics: true,
    },
    advanced: {
      customPrompt: '',
      environment: {},
      permissions: ['read', 'write'],
      dependencies: [],
    }
  })

  const [newCapability, setNewCapability] = React.useState('')
  const [newEnvVar, setNewEnvVar] = React.useState({ key: '', value: '' })
  const [newPermission, setNewPermission] = React.useState('')
  const [newDependency, setNewDependency] = React.useState('')

  const handleConfigChange = (field: string, value: any) => {
    setConfig(prev => {
      const keys = field.split('.')
      const updated = { ...prev }
      let current: any = updated
      
      for (let i = 0; i < keys.length - 1; i++) {
        current[keys[i]] = { ...current[keys[i]] }
        current = current[keys[i]]
      }
      
      current[keys[keys.length - 1]] = value
      return updated
    })
    setHasChanges(true)
  }

  const handleSave = async () => {
    setIsLoading(true)
    try {
      await onSave(config)
      setHasChanges(false)
    } catch (error) {
      console.error('Failed to save configuration:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleReset = () => {
    if (onReset) {
      onReset()
    }
    setHasChanges(false)
  }

  const addCapability = () => {
    if (newCapability.trim() && !config.capabilities.includes(newCapability.trim())) {
      handleConfigChange('capabilities', [...config.capabilities, newCapability.trim()])
      setNewCapability('')
    }
  }

  const removeCapability = (capability: string) => {
    handleConfigChange('capabilities', config.capabilities.filter(c => c !== capability))
  }

  const addEnvironmentVariable = () => {
    if (newEnvVar.key.trim() && newEnvVar.value.trim()) {
      handleConfigChange('advanced.environment', {
        ...config.advanced.environment,
        [newEnvVar.key]: newEnvVar.value
      })
      setNewEnvVar({ key: '', value: '' })
    }
  }

  const removeEnvironmentVariable = (key: string) => {
    const { [key]: _, ...rest } = config.advanced.environment
    handleConfigChange('advanced.environment', rest)
  }

  const tabs = [
    { id: 'basic', label: 'Basic', icon: Settings },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'advanced', label: 'Advanced', icon: AlertCircle },
  ] as const

  const BasicTab: React.FC = () => (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium mb-2 block">Agent Name</label>
        <Input
          value={config.name}
          onChange={(e) => handleConfigChange('name', e.target.value)}
          placeholder="Enter agent name"
        />
      </div>
      
      <div>
        <label className="text-sm font-medium mb-2 block">Agent Type</label>
        <select
          value={config.type}
          onChange={(e) => handleConfigChange('type', e.target.value as Agent['type'])}
          className="w-full px-3 py-2 border border-input rounded-md bg-background"
        >
          <option value="researcher">Researcher</option>
          <option value="coder">Coder</option>
          <option value="analyst">Analyst</option>
          <option value="optimizer">Optimizer</option>
          <option value="coordinator">Coordinator</option>
        </select>
      </div>
      
      <div>
        <label className="text-sm font-medium mb-2 block">Capabilities</label>
        <div className="flex gap-2 mb-2">
          <Input
            value={newCapability}
            onChange={(e) => setNewCapability(e.target.value)}
            placeholder="Add capability"
            onKeyPress={(e) => e.key === 'Enter' && addCapability()}
          />
          <Button onClick={addCapability} size="icon">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {config.capabilities.map(capability => (
            <Badge key={capability} variant="outline" className="gap-1">
              {capability}
              <button
                onClick={() => removeCapability(capability)}
                className="ml-1 hover:text-destructive"
              >
                <Minus className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      </div>
    </div>
  )

  const SettingsTab: React.FC = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium mb-2 block">Max Concurrency</label>
          <Input
            type="number"
            value={config.settings.maxConcurrency}
            onChange={(e) => handleConfigChange('settings.maxConcurrency', parseInt(e.target.value))}
            min="1"
            max="20"
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-2 block">Timeout (ms)</label>
          <Input
            type="number"
            value={config.settings.timeout}
            onChange={(e) => handleConfigChange('settings.timeout', parseInt(e.target.value))}
            min="1000"
            step="1000"
          />
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium mb-2 block">Retry Attempts</label>
          <Input
            type="number"
            value={config.settings.retryAttempts}
            onChange={(e) => handleConfigChange('settings.retryAttempts', parseInt(e.target.value))}
            min="0"
            max="10"
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-2 block">Memory Limit (MB)</label>
          <Input
            type="number"
            value={config.settings.memoryLimit}
            onChange={(e) => handleConfigChange('settings.memoryLimit', parseInt(e.target.value))}
            min="64"
            step="64"
          />
        </div>
      </div>
      
      <div>
        <label className="text-sm font-medium mb-2 block">Priority</label>
        <select
          value={config.settings.priority}
          onChange={(e) => handleConfigChange('settings.priority', e.target.value as 'low' | 'medium' | 'high')}
          className="w-full px-3 py-2 border border-input rounded-md bg-background"
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="autoStart"
            checked={config.settings.autoStart}
            onChange={(e) => handleConfigChange('settings.autoStart', e.target.checked)}
            className="rounded"
          />
          <label htmlFor="autoStart" className="text-sm font-medium">Auto Start</label>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="enableLogging"
            checked={config.settings.enableLogging}
            onChange={(e) => handleConfigChange('settings.enableLogging', e.target.checked)}
            className="rounded"
          />
          <label htmlFor="enableLogging" className="text-sm font-medium">Enable Logging</label>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="enableMetrics"
            checked={config.settings.enableMetrics}
            onChange={(e) => handleConfigChange('settings.enableMetrics', e.target.checked)}
            className="rounded"
          />
          <label htmlFor="enableMetrics" className="text-sm font-medium">Enable Metrics</label>
        </div>
      </div>
    </div>
  )

  const AdvancedTab: React.FC = () => (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium mb-2 block">Custom Prompt</label>
        <textarea
          value={config.advanced.customPrompt || ''}
          onChange={(e) => handleConfigChange('advanced.customPrompt', e.target.value)}
          placeholder="Enter custom prompt instructions..."
          className="w-full px-3 py-2 border border-input rounded-md bg-background min-h-[100px]"
        />
      </div>
      
      <div>
        <label className="text-sm font-medium mb-2 block">Environment Variables</label>
        <div className="flex gap-2 mb-2">
          <Input
            value={newEnvVar.key}
            onChange={(e) => setNewEnvVar(prev => ({ ...prev, key: e.target.value }))}
            placeholder="Key"
          />
          <Input
            value={newEnvVar.value}
            onChange={(e) => setNewEnvVar(prev => ({ ...prev, value: e.target.value }))}
            placeholder="Value"
          />
          <Button onClick={addEnvironmentVariable} size="icon">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="space-y-2">
          {Object.entries(config.advanced.environment).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between p-2 border rounded">
              <span className="text-sm font-mono">{key}={value}</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeEnvironmentVariable(key)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  return (
    <Card className={cn('h-full flex flex-col', className)}>
      <CardHeader className="shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Agent Configuration
            {hasChanges && (
              <Badge variant="warning" className="text-xs">
                Unsaved
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-1">
            {onDuplicate && (
              <Button variant="ghost" size="icon" onClick={onDuplicate}>
                <Copy className="h-4 w-4" />
              </Button>
            )}
            {onExport && (
              <Button variant="ghost" size="icon" onClick={() => onExport(config)}>
                <Download className="h-4 w-4" />
              </Button>
            )}
            {onImport && (
              <Button variant="ghost" size="icon">
                <Upload className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        
        {/* Tab Navigation */}
        <div className="flex border-b border-border">
          {tabs.map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors',
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            )
          })}
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 overflow-y-auto p-4">
        {activeTab === 'basic' && <BasicTab />}
        {activeTab === 'settings' && <SettingsTab />}
        {activeTab === 'advanced' && <AdvancedTab />}
      </CardContent>
      
      {/* Footer Actions */}
      <div className="shrink-0 flex items-center justify-between p-4 border-t border-border">
        <div className="flex items-center gap-2">
          {onDelete && (
            <Button variant="destructive" size="sm" onClick={onDelete}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          )}
          {onReset && (
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Reset
            </Button>
          )}
        </div>
        
        <Button 
          onClick={handleSave} 
          disabled={!hasChanges || isLoading}
          loading={isLoading}
        >
          <Save className="h-4 w-4 mr-2" />
          Save Configuration
        </Button>
      </div>
    </Card>
  )
}

export { ConfigurationPanel }
export default ConfigurationPanel