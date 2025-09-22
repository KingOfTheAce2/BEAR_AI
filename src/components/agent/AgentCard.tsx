import type { FC } from 'react'
import { Agent } from '../../types'
import { Avatar } from '../ui/avatar'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { cn } from '../../utils/cn'
import { Activity, Clock, Cpu, MessageCircle, Settings, Zap, CheckCircle, AlertCircle, XCircle, Pause } from 'lucide-react'

export interface AgentCardProps {
  agent: Agent
  onSelect?: (agent: Agent) => void
  onConfigure?: (agent: Agent) => void
  onStart?: (agent: Agent) => void
  onStop?: (agent: Agent) => void
  onPause?: (agent: Agent) => void
  interactive?: boolean
  showMetrics?: boolean
  compact?: boolean
  className?: string
  key?: string
}

const AgentCard: FC<AgentCardProps> = ({
  agent,
  onSelect,
  onConfigure,
  onStart,
  onStop,
  onPause,
  interactive = true,
  showMetrics = true,
  compact = false,
  className,
}) => {
  const getStatusIcon = () => {
    switch (agent.status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'busy':
        return <Activity className="h-4 w-4 text-blue-500" />
      case 'idle':
        return <Pause className="h-4 w-4 text-yellow-500" />
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusColor = () => {
    switch (agent.status) {
      case 'active':
        return 'bg-green-500'
      case 'busy':
        return 'bg-blue-500'
      case 'idle':
        return 'bg-yellow-500'
      case 'error':
        return 'bg-red-500'
      default:
        return 'bg-gray-500'
    }
  }

  const getTypeIcon = () => {
    switch (agent.type) {
      case 'researcher':
        return <MessageCircle className="h-4 w-4" />
      case 'coder':
        return <Cpu className="h-4 w-4" />
      case 'analyst':
        return <Activity className="h-4 w-4" />
      case 'optimizer':
        return <Zap className="h-4 w-4" />
      case 'coordinator':
        return <Settings className="h-4 w-4" />
      default:
        return <Activity className="h-4 w-4" />
    }
  }

  return (
    <Card 
      className={cn(
        'transition-all duration-200',
        interactive && 'hover:shadow-md cursor-pointer',
        compact && 'p-3',
        className
      )}
      interactive={interactive}
      onClick={() => interactive && onSelect?.(agent)}
    >
      <CardHeader className={cn('pb-2', compact && 'pb-1')}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar
                src={agent.avatar ?? undefined}
                alt={agent.name}
                fallback={agent.name.charAt(0)}
                size={compact ? 'sm' : 'md'}
              />
              <div className={cn(
                'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background',
                getStatusColor()
              )} />
            </div>
            
            <div className="flex-1 min-w-0">
              <CardTitle className={cn(
                'truncate',
                compact ? 'text-sm' : 'text-base'
              )}>
                {agent.name}
              </CardTitle>
              <div className="flex items-center gap-2 mt-1">
                {getTypeIcon()}
                <span className="text-xs text-muted-foreground capitalize">
                  {agent.type}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            {getStatusIcon()}
            {!compact && (
              <Badge 
                variant={agent.status === 'active' ? 'default' : 'secondary'}
                className="text-xs"
              >
                {agent.status}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className={cn('pt-0', compact && 'pt-1')}>
        {/* Capabilities */}
        <div className="flex flex-wrap gap-1 mb-3">
          {agent.capabilities.slice(0, compact ? 2 : 4).map(capability => (
            <Badge key={capability} variant="outline" className="text-xs">
              {capability}
            </Badge>
          ))}
          {agent.capabilities.length > (compact ? 2 : 4) && (
            <Badge variant="outline" className="text-xs">
              +{agent.capabilities.length - (compact ? 2 : 4)}
            </Badge>
          )}
        </div>

        {/* Metrics */}
        {showMetrics && agent.metrics && !compact && (
          <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
            <div className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3 text-green-500" />
              <span>{agent.metrics.tasksCompleted}</span>
            </div>
            <div className="flex items-center gap-1">
              <Activity className="h-3 w-3 text-blue-500" />
              <span>{Math.round(agent.metrics.successRate * 100)}%</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3 text-yellow-500" />
              <span>{agent.metrics.averageResponseTime}ms</span>
            </div>
            <div className="flex items-center gap-1">
              <Cpu className="h-3 w-3 text-purple-500" />
              <span>{agent.metrics.memoryUsage}MB</span>
            </div>
          </div>
        )}

        {/* Actions */}
        {interactive && !compact && (
          <div className="flex items-center gap-2">
            {agent.status === 'idle' && onStart && (
              <Button 
                size="xs" 
                variant="default"
                onClick={(e) => {
                  e.stopPropagation()
                  onStart(agent)
                }}
              >
                Start
              </Button>
            )}
            {(agent.status === 'active' || agent.status === 'busy') && onPause && (
              <Button 
                size="xs" 
                variant="secondary"
                onClick={(e) => {
                  e.stopPropagation()
                  onPause(agent)
                }}
              >
                Pause
              </Button>
            )}
            {agent.status !== 'idle' && onStop && (
              <Button 
                size="xs" 
                variant="destructive"
                onClick={(e) => {
                  e.stopPropagation()
                  onStop(agent)
                }}
              >
                Stop
              </Button>
            )}
            {onConfigure && (
              <Button 
                size="xs" 
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation()
                  onConfigure(agent)
                }}
              >
                <Settings className="h-3 w-3" />
              </Button>
            )}
          </div>
        )}

        {/* Last Activity */}
        {agent.lastActivity && (
          <p className="text-xs text-muted-foreground mt-2">
            Last active: {new Date(agent.lastActivity).toLocaleString()}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

export { AgentCard }
