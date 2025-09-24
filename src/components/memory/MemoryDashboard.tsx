/**
 * BEAR AI Memory Dashboard
 * Visual memory monitoring and management interface
 * 
 * @file Memory usage dashboard component
 * @version 2.0.0
 */

import React, { useState, useEffect, useCallback } from 'react'
import { SystemMemoryInfo, MemoryAlert, ModelMemoryInfo, memorySafetySystem } from '../../integrations/memory-safety-system'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'

interface MemoryDashboardProps {
  className?: string
}

interface MemoryStats {
  systemMemory: SystemMemoryInfo | null
  alerts: MemoryAlert[]
  modelSummary: {
    totalUsed: number
    totalBudget: number
    utilizationPercentage: number
    loadedModels: number
    modelsCanUnload: number
  } | null
}

export const MemoryDashboard: React.FC<MemoryDashboardProps> = ({ className = '' }) => {
  const [memoryStats, setMemoryStats] = useState<MemoryStats>({
    systemMemory: null,
    alerts: [],
    modelSummary: null
  })
  const [isLoading, setIsLoading] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(true)

  // Fetch memory statistics
  const fetchMemoryStats = useCallback(async () => {
    try {
      const [systemMemory, alerts, modelSummary] = await Promise.all([
        memorySafetySystem.getCurrentMemoryStatus(),
        Promise.resolve(memorySafetySystem.getActiveAlerts()),
        Promise.resolve(memorySafetySystem.getModelMemoryStatus())
      ])

      setMemoryStats({
        systemMemory,
        alerts,
        modelSummary
      })
    } catch (error) {
      // console.error('Failed to fetch memory stats:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Set up auto-refresh
  useEffect(() => {
    fetchMemoryStats()

    let interval: NodeJS.Timeout | null = null
    if (autoRefresh) {
      interval = setInterval(fetchMemoryStats, 2000) // Update every 2 seconds
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [autoRefresh, fetchMemoryStats])

  // Format bytes to human readable
  const formatBytes = (bytes: number): string => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    if (bytes === 0) return '0 Bytes'
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
  }

  // Get memory level color
  const getMemoryLevelColor = (percentage: number): string => {
    if (percentage < 70) return 'bg-green-500'
    if (percentage < 80) return 'bg-yellow-500'
    if (percentage < 90) return 'bg-orange-500'
    return 'bg-red-500'
  }

  // Get alert level badge variant
  const getAlertBadgeVariant = (level: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (level) {
      case 'info': return 'default'
      case 'warning': return 'secondary'
      case 'critical': return 'destructive'
      case 'emergency': return 'destructive'
      default: return 'outline'
    }
  }

  // Handle alert acknowledgment
  const handleAcknowledgeAlert = (alertId: string) => {
    memorySafetySystem.acknowledgeAlert(alertId)
    fetchMemoryStats() // Refresh data
  }

  if (isLoading) {
    return (
      <div className={`${className}`}>
        <Card className="p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-8 bg-gray-200 rounded mb-4"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        </Card>
      </div>
    )
  }

  const { systemMemory, alerts, modelSummary } = memoryStats

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-gray-900">Memory Monitor</h2>
        <div className="flex items-center space-x-2">
          <Button
            variant={autoRefresh ? 'default' : 'outline'}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            {autoRefresh ? 'Auto-Refresh On' : 'Auto-Refresh Off'}
          </Button>
          <Button variant="outline" size="sm" onClick={fetchMemoryStats}>
            Refresh
          </Button>
        </div>
      </div>

      {/* System Memory Overview */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium">System Memory</h3>
          {systemMemory && (
            <Badge variant={systemMemory.usagePercentage > 80 ? 'destructive' : 'default'}>
              {systemMemory.usagePercentage.toFixed(1)}% Used
            </Badge>
          )}
        </div>

        {systemMemory && (
          <div className="space-y-4">
            {/* Memory Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Memory Usage</span>
                <span>{formatBytes(systemMemory.used)} / {formatBytes(systemMemory.total)}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all duration-300 ${getMemoryLevelColor(systemMemory.usagePercentage)}`}
                  style={{ width: `${Math.min(systemMemory.usagePercentage, 100)}%` }}
                ></div>
              </div>
            </div>

            {/* Memory Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">{formatBytes(systemMemory.total)}</div>
                <div className="text-sm text-gray-600">Total RAM</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">{formatBytes(systemMemory.used)}</div>
                <div className="text-sm text-gray-600">Used</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">{formatBytes(systemMemory.available)}</div>
                <div className="text-sm text-gray-600">Available</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">{systemMemory.platform}</div>
                <div className="text-sm text-gray-600">Platform</div>
              </div>
            </div>

            {/* GPU Memory if available */}
            {systemMemory.gpu && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium mb-2">GPU Memory</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>GPU Usage</span>
                    <span>{formatBytes(systemMemory.gpu.used)} / {formatBytes(systemMemory.gpu.total)}</span>
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-2">
                    <div
                      className="h-2 bg-blue-500 rounded-full transition-all duration-300"
                      style={{ width: `${(systemMemory.gpu.used / systemMemory.gpu.total) * 100}%` }}
                    ></div>
                  </div>
                  {systemMemory.gpu.devices.map((device, index) => (
                    <div key={index} className="text-sm text-gray-600">
                      {device.name}: {device.utilization.toFixed(1)}% utilization
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Model Memory Usage */}
      <Card className="p-6">
        <h3 className="text-lg font-medium mb-4">AI Model Memory</h3>
        {modelSummary && (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Model Memory Usage</span>
                <span>{formatBytes(modelSummary.totalUsed)} / {formatBytes(modelSummary.totalBudget)}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all duration-300 ${getMemoryLevelColor(modelSummary.utilizationPercentage)}`}
                  style={{ width: `${Math.min(modelSummary.utilizationPercentage, 100)}%` }}
                ></div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">{modelSummary.loadedModels}</div>
                <div className="text-sm text-gray-600">Loaded Models</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">{modelSummary.modelsCanUnload}</div>
                <div className="text-sm text-gray-600">Can Unload</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">{modelSummary.utilizationPercentage.toFixed(1)}%</div>
                <div className="text-sm text-gray-600">Budget Used</div>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Active Alerts */}
      {alerts.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-medium mb-4">Memory Alerts ({alerts.length})</h3>
          <div className="space-y-3">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-4 rounded-lg border-l-4 ${
                  alert.level === 'emergency' ? 'border-red-500 bg-red-50' :
                  alert.level === 'critical' ? 'border-orange-500 bg-orange-50' :
                  alert.level === 'warning' ? 'border-yellow-500 bg-yellow-50' :
                  'border-blue-500 bg-blue-50'
                } ${alert.acknowledged ? 'opacity-60' : ''}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={getAlertBadgeVariant(alert.level)}>
                        {alert.level.toUpperCase()}
                      </Badge>
                      <h4 className="font-medium">{alert.title}</h4>
                      {alert.acknowledged && (
                        <Badge variant="outline" className="text-xs">
                          Acknowledged
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-700 mb-2">{alert.message}</p>
                    <div className="text-xs text-gray-500">
                      {alert.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    {alert.actions && alert.actions.length > 0 && (
                      <div className="flex gap-1">
                        {alert.actions.map((action, index) => (
                          <Button
                            key={index}
                            size="sm"
                            variant="outline"
                            onClick={action.action}
                            className="text-xs"
                          >
                            {action.label}
                          </Button>
                        ))}
                      </div>
                    )}
                    {!alert.acknowledged && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleAcknowledgeAlert(alert.id)}
                        className="text-xs"
                      >
                        Acknowledge
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Memory Health Indicators */}
      <Card className="p-6">
        <h3 className="text-lg font-medium mb-4">Memory Health Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center space-x-3 p-3 rounded-lg bg-gray-50">
            <div className={`w-3 h-3 rounded-full ${
              systemMemory && systemMemory.usagePercentage < 70 ? 'bg-green-500' :
              systemMemory && systemMemory.usagePercentage < 85 ? 'bg-yellow-500' : 'bg-red-500'
            }`}></div>
            <div>
              <div className="font-medium text-sm">System Status</div>
              <div className="text-xs text-gray-600">
                {systemMemory && systemMemory.usagePercentage < 70 ? 'Healthy' :
                 systemMemory && systemMemory.usagePercentage < 85 ? 'Warning' : 'Critical'}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-3 p-3 rounded-lg bg-gray-50">
            <div className={`w-3 h-3 rounded-full ${
              modelSummary && modelSummary.utilizationPercentage < 80 ? 'bg-green-500' :
              modelSummary && modelSummary.utilizationPercentage < 95 ? 'bg-yellow-500' : 'bg-red-500'
            }`}></div>
            <div>
              <div className="font-medium text-sm">Model Memory</div>
              <div className="text-xs text-gray-600">
                {modelSummary && modelSummary.utilizationPercentage < 80 ? 'Optimal' :
                 modelSummary && modelSummary.utilizationPercentage < 95 ? 'High Usage' : 'Over Budget'}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-3 p-3 rounded-lg bg-gray-50">
            <div className={`w-3 h-3 rounded-full ${
              alerts.filter(a => !a.acknowledged).length === 0 ? 'bg-green-500' :
              alerts.filter(a => a.level === 'emergency' || a.level === 'critical').length === 0 ? 'bg-yellow-500' : 'bg-red-500'
            }`}></div>
            <div>
              <div className="font-medium text-sm">Alert Status</div>
              <div className="text-xs text-gray-600">
                {alerts.filter(a => !a.acknowledged).length === 0 ? 'No Issues' :
                 `${alerts.filter(a => !a.acknowledged).length} Active`}
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}

export default MemoryDashboard