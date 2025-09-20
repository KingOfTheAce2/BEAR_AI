import React, { useState, useEffect, useMemo } from 'react'
import { 
import { cn } from '../../utils/cn'

  PerformanceMetrics, 
  SystemMetrics, 
  ModelMetrics, 
  Alert, 
  AlertSeverity,
  TimeRange,
  TimeRangePreset 
} from '../../types/modelTypes'
import { Card, CardContent, CardHeader, CardTitle } from './Card'
import { Button } from './Button'
import { Badge } from './Badge'
import { LoadingSpinner } from './LoadingSpinner'
import {
  Activity,
  Cpu,
  HardDrive,
  MemoryStick,
  Thermometer,
  Zap,
  Clock,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle,
  RefreshCw,
  Download,
  Settings,
  Eye,
  EyeOff,
  Maximize2,
  Minimize2,
  Filter,
  ChevronDown,
  ChevronUp,
  Calendar,
  BarChart3,
  PieChart,
  LineChart,
  Monitor,
  Server,
  Gauge,
  Target,
  Users,
  MessageSquare,
  FileText,
  Wifi,
  WifiOff
} from 'lucide-react'

export interface PerformanceDashboardProps {
  metrics: PerformanceMetrics
  timeRange: TimeRange
  onTimeRangeChange: (range: TimeRange) => void
  onRefresh: () => void
  onExportReport: () => void
  autoRefresh?: boolean
  onAutoRefreshToggle?: () => void
  className?: string
}

interface MetricCardProps {
  title: string
  value: string | number
  unit?: string
  change?: number
  changeLabel?: string
  icon: React.ReactNode
  status?: 'normal' | 'warning' | 'critical'
  loading?: boolean
  subtitle?: string
}

interface AlertsPanelProps {
  alerts: Alert[]
  onAlertAcknowledge: (alertId: string) => void
  onAlertResolve: (alertId: string) => void
  maxVisible?: number
}

interface SystemOverviewProps {
  metrics: SystemMetrics
  loading?: boolean
}

interface ModelPerformanceProps {
  models: ModelMetrics[]
  loading?: boolean
}

interface TimeRangeSelectorProps {
  timeRange: TimeRange
  onChange: (range: TimeRange) => void
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  unit,
  change,
  changeLabel,
  icon,
  status = 'normal',
  loading = false,
  subtitle
}) => {
  const formatValue = (val: string | number) => {
    if (typeof val === 'number') {
      if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`
      if (val >= 1000) return `${(val / 1000).toFixed(1)}K`
      return val.toFixed(1)
    }
    return val
  }

  const getStatusColor = () => {
    switch (status) {
      case 'warning': return 'border-l-yellow-500'
      case 'critical': return 'border-l-red-500'
      default: return 'border-l-blue-500'
    }
  }

  const getChangeColor = () => {
    if (change === undefined) return 'text-muted-foreground'
    return change >= 0 ? 'text-green-600' : 'text-red-600'
  }

  const getChangeIcon = () => {
    if (change === undefined) return null
    return change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />
  }

  return (
    <Card className={cn('border-l-4', getStatusColor())}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              {icon}
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
              <div className="flex items-baseline gap-1">
                {loading ? (
                  <LoadingSpinner className="h-4 w-4" />
                ) : (
                  <>
                    <span className="text-2xl font-bold">{formatValue(value)}</span>
                    {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
                  </>
                )}
              </div>
              {subtitle && (
                <p className="text-xs text-muted-foreground">{subtitle}</p>
              )}
            </div>
          </div>
          
          {change !== undefined && (
            <div className={cn('flex items-center gap-1 text-sm', getChangeColor())}>
              {getChangeIcon()}
              <span>{Math.abs(change).toFixed(1)}%</span>
              {changeLabel && (
                <span className="text-xs text-muted-foreground">{changeLabel}</span>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

const TimeRangeSelector: React.FC<TimeRangeSelectorProps> = ({ timeRange, onChange }) => {
  const presets: { label: string; preset: TimeRangePreset }[] = [
    { label: 'Last Hour', preset: 'last-hour' },
    { label: 'Last Day', preset: 'last-day' },
    { label: 'Last Week', preset: 'last-week' },
    { label: 'Last Month', preset: 'last-month' },
    { label: 'Custom', preset: 'custom' }
  ]

  const handlePresetChange = (preset: TimeRangePreset) => {
    const now = new Date()
    let start: Date

    switch (preset) {
      case 'last-hour':
        start = new Date(now.getTime() - 60 * 60 * 1000)
        break
      case 'last-day':
        start = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        break
      case 'last-week':
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case 'last-month':
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      default:
        start = timeRange.start
    }

    onChange({ start, end: now, preset })
  }

  return (
    <div className="flex items-center gap-2">
      <Calendar className="h-4 w-4 text-muted-foreground" />
      <select
        value={timeRange.preset || 'last-day'}
        onChange={(e) => handlePresetChange(e.target.value as TimeRangePreset)}
        className="px-3 py-1 border border-input rounded-md bg-background text-sm"
      >
        {presets.map(({ label, preset }) => (
          <option key={preset} value={preset}>
            {label}
          </option>
        ))}
      </select>
    </div>
  )
}

const AlertsPanel: React.FC<AlertsPanelProps> = ({
  alerts,
  onAlertAcknowledge,
  onAlertResolve,
  maxVisible = 5
}) => {
  const [showAll, setShowAll] = useState(false)

  const getSeverityIcon = (severity: AlertSeverity) => {
    switch (severity) {
      case 'critical': return <AlertCircle className="h-4 w-4 text-red-500" />
      case 'error': return <AlertTriangle className="h-4 w-4 text-orange-500" />
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      default: return <Info className="h-4 w-4 text-blue-500" />
    }
  }

  const getSeverityColor = (severity: AlertSeverity) => {
    switch (severity) {
      case 'critical': return 'border-l-red-500 bg-red-50'
      case 'error': return 'border-l-orange-500 bg-orange-50'
      case 'warning': return 'border-l-yellow-500 bg-yellow-50'
      default: return 'border-l-blue-500 bg-blue-50'
    }
  }

  const activeAlerts = alerts.filter(alert => !alert.resolved)
  const visibleAlerts = showAll ? activeAlerts : activeAlerts.slice(0, maxVisible)

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Active Alerts
            {activeAlerts.length > 0 && (
              <Badge variant="destructive" className="text-xs">
                {activeAlerts.length}
              </Badge>
            )}
          </CardTitle>
          {activeAlerts.length > maxVisible && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAll(!showAll)}
            >
              {showAll ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {activeAlerts.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <CheckCircle className="h-6 w-6 mr-2 text-green-500" />
            No active alerts
          </div>
        ) : (
          <div className="space-y-3">
            {visibleAlerts.map(alert => (
              <div
                key={alert.id}
                className={cn(
                  'p-3 border-l-4 rounded-lg',
                  getSeverityColor(alert.severity)
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    {getSeverityIcon(alert.severity)}
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">{alert.title}</h4>
                      <p className="text-sm text-muted-foreground mt-1">{alert.message}</p>
                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{alert.timestamp.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    {!alert.acknowledged && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onAlertAcknowledge(alert.id)}
                        className="h-6 text-xs"
                      >
                        Ack
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onAlertResolve(alert.id)}
                      className="h-6 text-xs"
                    >
                      Resolve
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

const SystemOverview: React.FC<SystemOverviewProps> = ({ metrics, loading }) => {
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / (24 * 3600))
    const hours = Math.floor((seconds % (24 * 3600)) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    
    if (days > 0) return `${days}d ${hours}h`
    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes}m`
  }

  const getStatusFromUsage = (usage: number) => {
    if (usage >= 90) return 'critical'
    if (usage >= 75) return 'warning'
    return 'normal'
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <MetricCard
        title="CPU Usage"
        value={metrics.cpuUsage}
        unit="%"
        icon={<Cpu className="h-4 w-4 text-blue-500" />}
        status={getStatusFromUsage(metrics.cpuUsage)}
        loading={loading}
        subtitle={`Load: ${metrics.loadAverage?.[0]?.toFixed(2) || 'N/A'}`}
      />
      
      <MetricCard
        title="Memory Usage"
        value={((metrics.memoryUsage / metrics.memoryTotal) * 100)}
        unit="%"
        icon={<MemoryStick className="h-4 w-4 text-green-500" />}
        status={getStatusFromUsage((metrics.memoryUsage / metrics.memoryTotal) * 100)}
        loading={loading}
        subtitle={`${formatBytes(metrics.memoryUsage)} / ${formatBytes(metrics.memoryTotal)}`}
      />
      
      <MetricCard
        title="Disk Usage"
        value={((metrics.diskUsage / metrics.diskTotal) * 100)}
        unit="%"
        icon={<HardDrive className="h-4 w-4 text-purple-500" />}
        status={getStatusFromUsage((metrics.diskUsage / metrics.diskTotal) * 100)}
        loading={loading}
        subtitle={`${formatBytes(metrics.diskUsage)} / ${formatBytes(metrics.diskTotal)}`}
      />
      
      <MetricCard
        title="Temperature"
        value={metrics.temperature}
        unit="°C"
        icon={<Thermometer className="h-4 w-4 text-red-500" />}
        status={metrics.temperature > 80 ? 'critical' : metrics.temperature > 70 ? 'warning' : 'normal'}
        loading={loading}
        subtitle={`Uptime: ${formatUptime(metrics.uptime)}`}
      />
    </div>
  )
}

const ModelPerformance: React.FC<ModelPerformanceProps> = ({ models, loading }) => {
  const [sortBy, setSortBy] = useState<'name' | 'tokensPerSecond' | 'memoryFootprint' | 'errorRate'>('tokensPerSecond')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  const sortedModels = useMemo(() => {
    return [...models].sort((a, b) => {
      const aValue = a[sortBy]
      const bValue = b[sortBy]
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortOrder === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue)
      }
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortOrder === 'asc' ? aValue - bValue : bValue - aValue
      }
      
      return 0
    })
  }, [models, sortBy, sortOrder])

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  const getPerformanceStatus = (tokensPerSecond: number) => {
    if (tokensPerSecond >= 50) return 'excellent'
    if (tokensPerSecond >= 25) return 'good'
    if (tokensPerSecond >= 10) return 'fair'
    return 'poor'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'text-green-600'
      case 'good': return 'text-blue-600'
      case 'fair': return 'text-yellow-600'
      case 'poor': return 'text-red-600'
      default: return 'text-gray-400'
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Model Performance
          </CardTitle>
          <div className="flex items-center gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-2 py-1 border border-input rounded text-sm bg-background"
            >
              <option value="tokensPerSecond">Speed</option>
              <option value="memoryFootprint">Memory</option>
              <option value="errorRate">Error Rate</option>
              <option value="name">Name</option>
            </select>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            >
              {sortOrder === 'asc' ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner className="h-6 w-6 mr-2" />
            Loading model metrics...
          </div>
        ) : models.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Server className="h-6 w-6 mr-2" />
            No active models
          </div>
        ) : (
          <div className="space-y-3">
            {sortedModels.map(model => {
              const performanceStatus = getPerformanceStatus(model.tokensPerSecond)
              
              return (
                <div
                  key={model.modelId}
                  className="flex items-center justify-between p-3 border border-border rounded-lg bg-surface/50"
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'w-2 h-2 rounded-full',
                      model.status === 'loaded' ? 'bg-green-500' : 'bg-gray-400'
                    )} />
                    <div>
                      <h4 className="font-medium text-sm">{model.modelId}</h4>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>Last used: {model.lastUsed.toLocaleDateString()}</span>
                        <span>Requests: {model.requestCount}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6 text-sm">
                    <div className="text-center">
                      <div className={cn('font-medium', getStatusColor(performanceStatus))}>
                        {model.tokensPerSecond.toFixed(1)} t/s
                      </div>
                      <div className="text-xs text-muted-foreground">Speed</div>
                    </div>
                    
                    <div className="text-center">
                      <div className="font-medium">{formatBytes(model.memoryFootprint)}</div>
                      <div className="text-xs text-muted-foreground">Memory</div>
                    </div>
                    
                    <div className="text-center">
                      <div className={cn(
                        'font-medium',
                        model.errorRate > 5 ? 'text-red-600' : model.errorRate > 1 ? 'text-yellow-600' : 'text-green-600'
                      )}>
                        {model.errorRate.toFixed(1)}%
                      </div>
                      <div className="text-xs text-muted-foreground">Error Rate</div>
                    </div>
                    
                    <div className="text-center">
                      <div className="font-medium">{model.averageLatency.toFixed(0)}ms</div>
                      <div className="text-xs text-muted-foreground">Latency</div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({
  metrics,
  timeRange,
  onTimeRangeChange,
  onRefresh,
  onExportReport,
  autoRefresh = false,
  onAutoRefreshToggle,
  className
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['overview', 'models']))

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await onRefresh()
    } finally {
      setIsRefreshing(false)
    }
  }

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(section)) {
      newExpanded.delete(section)
    } else {
      newExpanded.add(section)
    }
    setExpandedSections(newExpanded)
  }

  const handleAlertAcknowledge = (alertId: string) => {
    // Implementation would update alert status
    console.log('Acknowledge alert:', alertId)
  }

  const handleAlertResolve = (alertId: string) => {
    // Implementation would resolve alert
    console.log('Resolve alert:', alertId)
  }

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      handleRefresh()
    }, 30000) // Refresh every 30 seconds

    return () => clearInterval(interval)
  }, [autoRefresh])

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Performance Dashboard</h1>
          <p className="text-muted-foreground">
            Real-time system and model performance monitoring
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <TimeRangeSelector
            timeRange={timeRange}
            onChange={onTimeRangeChange}
          />
          
          {onAutoRefreshToggle && (
            <Button
              variant={autoRefresh ? "default" : "outline"}
              size="sm"
              onClick={onAutoRefreshToggle}
            >
              <Activity className="h-4 w-4 mr-2" />
              Auto Refresh
            </Button>
          )}
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", isRefreshing && "animate-spin")} />
            Refresh
          </Button>
          
          <Button variant="outline" size="sm" onClick={onExportReport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* System Overview */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            System Overview
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => toggleSection('overview')}
          >
            {expandedSections.has('overview') ? 
              <ChevronUp className="h-4 w-4" /> : 
              <ChevronDown className="h-4 w-4" />
            }
          </Button>
        </div>
        
        {expandedSections.has('overview') && (
          <SystemOverview metrics={metrics.system} loading={isRefreshing} />
        )}
      </div>

      {/* Alerts Panel */}
      <AlertsPanel
        alerts={metrics.alerts}
        onAlertAcknowledge={handleAlertAcknowledge}
        onAlertResolve={handleAlertResolve}
      />

      {/* Model Performance */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Server className="h-5 w-5" />
            Model Performance
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => toggleSection('models')}
          >
            {expandedSections.has('models') ? 
              <ChevronUp className="h-4 w-4" /> : 
              <ChevronDown className="h-4 w-4" />
            }
          </Button>
        </div>
        
        {expandedSections.has('models') && (
          <ModelPerformance models={metrics.models} loading={isRefreshing} />
        )}
      </div>

      {/* Usage Statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <MetricCard
          title="Active Sessions"
          value={metrics.usage.sessionsToday}
          icon={<Users className="h-4 w-4 text-green-500" />}
          subtitle="Today"
        />
        
        <MetricCard
          title="Total Requests"
          value={metrics.inference.totalRequests}
          icon={<MessageSquare className="h-4 w-4 text-blue-500" />}
          change={5.2}
          changeLabel="vs yesterday"
        />
        
        <MetricCard
          title="Avg Response Time"
          value={metrics.inference.averageResponseTime}
          unit="ms"
          icon={<Clock className="h-4 w-4 text-purple-500" />}
          change={-2.1}
          changeLabel="vs yesterday"
        />
      </div>

      {/* Real-time Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Real-time Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {metrics.realTime.requestsPerMinute}
              </div>
              <div className="text-muted-foreground">Requests/min</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {metrics.realTime.tokensPerMinute}
              </div>
              <div className="text-muted-foreground">Tokens/min</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {metrics.realTime.activeUsers}
              </div>
              <div className="text-muted-foreground">Active Users</div>
            </div>
            
            <div className="text-center">
              <div className={cn(
                "text-2xl font-bold",
                metrics.realTime.errorRate > 5 ? "text-red-600" : "text-green-600"
              )}>
                {metrics.realTime.errorRate.toFixed(1)}%
              </div>
              <div className="text-muted-foreground">Error Rate</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export { PerformanceDashboard }