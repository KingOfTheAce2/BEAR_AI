import React from 'react'
import { cn } from '../../utils/cn'
import { Agent, Task, DashboardConfig, WidgetConfig } from '../../types'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { AgentCard } from './AgentCard'
import {
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  Cpu,
  RefreshCw,
  TrendingUp,
  Users,
  Zap,
  BarChart3,
  PieChart,
  LineChart,
  Grid3X3,
  List,
  LayoutGrid
} from 'lucide-react'

export interface StatusDashboardProps {
  agents: Agent[]
  tasks: Task[]
  config?: DashboardConfig
  onConfigChange?: (config: DashboardConfig) => void
  onRefresh?: () => void
  autoRefresh?: boolean
  refreshInterval?: number
  className?: string
}

const StatusDashboard: React.FC<StatusDashboardProps> = ({
  agents = [],
  tasks = [],
  config,
  onConfigChange,
  onRefresh,
  autoRefresh = false,
  refreshInterval = 30000,
  className,
}) => {
  const [lastUpdate, setLastUpdate] = React.useState(new Date())
  const [isRefreshing, setIsRefreshing] = React.useState(false)

  // Auto-refresh functionality
  React.useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      if (onRefresh) {
        setIsRefreshing(true)
        onRefresh()
        setTimeout(() => {
          setIsRefreshing(false)
          setLastUpdate(new Date())
        }, 1000)
      }
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, onRefresh])

  // Calculate metrics
  const totalAgents = agents.length
  const activeAgents = agents.filter(a => a.status === 'active').length
  const busyAgents = agents.filter(a => a.status === 'busy').length
  const idleAgents = agents.filter(a => a.status === 'idle').length
  const errorAgents = agents.filter(a => a.status === 'error').length

  const totalTasks = tasks.length
  const completedTasks = tasks.filter(t => t.status === 'completed').length
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length
  const pendingTasks = tasks.filter(t => t.status === 'pending').length
  const failedTasks = tasks.filter(t => t.status === 'failed').length

  const avgResponseTime = agents.reduce((acc, agent) => {
    return acc + (agent.metrics?.averageResponseTime || 0)
  }, 0) / (agents.length || 1)

  const totalTasksCompleted = agents.reduce((acc, agent) => {
    return acc + (agent.metrics?.tasksCompleted || 0)
  }, 0)

  const avgSuccessRate = agents.reduce((acc, agent) => {
    return acc + (agent.metrics?.successRate || 0)
  }, 0) / (agents.length || 1)

  const handleRefresh = async () => {
    if (!onRefresh || isRefreshing) return

    setIsRefreshing(true)
    await onRefresh()
    setTimeout(() => {
      setIsRefreshing(false)
      setLastUpdate(new Date())
    }, 1000)
  }

  const MetricCard: React.FC<{
    title: string
    value: string | number
    icon: React.ReactNode
    color?: string
    trend?: number
    subtitle?: string
  }> = ({ title, value, icon, color = 'text-blue-500', trend, subtitle }) => (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-2xl font-bold">{value}</p>
              {trend !== undefined && (
                <Badge 
                  variant={trend >= 0 ? 'success' : 'destructive'} 
                  className="text-xs"
                >
                  {trend >= 0 ? '+' : ''}{trend}%
                </Badge>
              )}
            </div>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>
          <div className={cn('p-2 rounded-lg bg-muted/20', color)}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  )

  const TaskStatusChart: React.FC = () => {
    const total = totalTasks || 1
    const segments = [
      { label: 'Completed', value: completedTasks, color: 'bg-green-500' },
      { label: 'In Progress', value: inProgressTasks, color: 'bg-blue-500' },
      { label: 'Pending', value: pendingTasks, color: 'bg-yellow-500' },
      { label: 'Failed', value: failedTasks, color: 'bg-red-500' },
    ]

    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <PieChart className="h-4 w-4" />
            Task Status Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Simple progress bars */}
          <div className="space-y-3">
            {segments.map(segment => {
              const percentage = (segment.value / total) * 100
              return (
                <div key={segment.label} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>{segment.label}</span>
                    <span>{segment.value} ({Math.round(percentage)}%)</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className={cn('h-2 rounded-full transition-all duration-300', segment.color)}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    )
  }

  const AgentStatusGrid: React.FC = () => (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Agent Status ({totalAgents})
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              <CheckCircle className="h-3 w-3 mr-1 text-green-500" />
              {activeAgents}
            </Badge>
            <Badge variant="outline" className="text-xs">
              <Activity className="h-3 w-3 mr-1 text-blue-500" />
              {busyAgents}
            </Badge>
            <Badge variant="outline" className="text-xs">
              <Clock className="h-3 w-3 mr-1 text-yellow-500" />
              {idleAgents}
            </Badge>
            {errorAgents > 0 && (
              <Badge variant="destructive" className="text-xs">
                <AlertCircle className="h-3 w-3 mr-1" />
                {errorAgents}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {agents.slice(0, 6).map(agent => (
            <AgentCard
              key={agent.id}
              agent={agent}
              compact
              showMetrics={false}
              interactive={false}
            />
          ))}
          {agents.length > 6 && (
            <Card className="flex items-center justify-center p-4 border-2 border-dashed border-muted-foreground/25">
              <div className="text-center text-muted-foreground">
                <Users className="h-6 w-6 mx-auto mb-2" />
                <p className="text-sm">+{agents.length - 6} more agents</p>
              </div>
            </Card>
          )}
        </div>
      </CardContent>
    </Card>
  )

  const RecentTasks: React.FC = () => {
    const recentTasks = tasks
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 5)

    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <List className="h-4 w-4" />
            Recent Tasks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No tasks found
              </p>
            ) : (
              recentTasks.map(task => (
                <div key={task.id} className="flex items-center justify-between p-2 border rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate text-sm">{task.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge 
                        variant={
                          task.status === 'completed' ? 'success' :
                          task.status === 'failed' ? 'destructive' :
                          task.status === 'in_progress' ? 'default' : 'secondary'
                        }
                        className="text-xs"
                      >
                        {task.status.replace('_', ' ')}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {task.priority}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground ml-2">
                    {Math.round(task.progress)}%
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={cn('p-6 space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Agent Dashboard</h1>
          <p className="text-muted-foreground">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={cn('h-4 w-4 mr-2', isRefreshing && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Active Agents"
          value={`${activeAgents}/${totalAgents}`}
          icon={<Users className="h-5 w-5" />}
          color="text-green-500"
          subtitle="Currently processing"
        />
        <MetricCard
          title="Tasks Completed"
          value={totalTasksCompleted}
          icon={<CheckCircle className="h-5 w-5" />}
          color="text-blue-500"
          subtitle="All time total"
        />
        <MetricCard
          title="Success Rate"
          value={`${Math.round(avgSuccessRate * 100)}%`}
          icon={<TrendingUp className="h-5 w-5" />}
          color="text-purple-500"
          subtitle="Average across agents"
        />
        <MetricCard
          title="Response Time"
          value={`${Math.round(avgResponseTime)}ms`}
          icon={<Zap className="h-5 w-5" />}
          color="text-orange-500"
          subtitle="Average response"
        />
      </div>

      {/* Charts and Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <AgentStatusGrid />
        </div>
        <div className="space-y-6">
          <TaskStatusChart />
          <RecentTasks />
        </div>
      </div>
    </div>
  )
}

export { StatusDashboard }"