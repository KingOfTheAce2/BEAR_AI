import React from 'react'
import { createPortal } from 'react-dom'
import { cn, animations } from '../../utils/cn'
import { NotificationConfig, NotificationAction } from '../../types'
import { Card, CardContent } from '../ui/Card'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  X,
  Clock
} from 'lucide-react'

export interface NotificationProps extends NotificationConfig {
  id: string
  onClose: (id: string) => void
  onAction?: (action: NotificationAction) => void
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center'
  showProgress?: boolean
}

const Notification: React.FC<NotificationProps> = ({
  id,
  type,
  title,
  message,
  duration = 5000,
  persistent = false,
  actions = [],
  onClose,
  onAction,
  position = 'top-right',
  showProgress = true,
}) => {
  const [progress, setProgress] = React.useState(100)
  const [isVisible, setIsVisible] = React.useState(false)
  const [isExiting, setIsExiting] = React.useState(false)
  const progressRef = React.useRef<number>(100)
  const intervalRef = React.useRef<number>()
  const timeoutRef = React.useRef<number>()

  // Entrance animation
  React.useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 10)
    return () => clearTimeout(timer)
  }, [])

  // Auto-dismiss timer
  React.useEffect(() => {
    if (persistent) return

    const startTime = Date.now()
    
    intervalRef.current = window.setInterval(() => {
      const elapsed = Date.now() - startTime
      const remaining = Math.max(0, duration - elapsed)
      const newProgress = (remaining / duration) * 100
      
      progressRef.current = newProgress
      setProgress(newProgress)
      
      if (remaining <= 0) {
        handleClose()
      }
    }, 50)

    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current)
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current)
    }
  }, [duration, persistent])

  const handleClose = () => {
    setIsExiting(true)
    timeoutRef.current = window.setTimeout(() => {
      onClose(id)
    }, 200)
  }

  const handleAction = (action: NotificationAction) => {
    onAction?.(action)
    action.action()
    handleClose()
  }

  const getIcon = () => {
    const iconProps = { className: 'h-5 w-5' }
    switch (type) {
      case 'success':
        return <CheckCircle {...iconProps} className="h-5 w-5 text-green-500" />
      case 'error':
        return <XCircle {...iconProps} className="h-5 w-5 text-red-500" />
      case 'warning':
        return <AlertTriangle {...iconProps} className="h-5 w-5 text-yellow-500" />
      case 'info':
        return <Info {...iconProps} className="h-5 w-5 text-blue-500" />
    }
  }

  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return 'border-l-green-500 bg-green-50 dark:bg-green-950/20'
      case 'error':
        return 'border-l-red-500 bg-red-50 dark:bg-red-950/20'
      case 'warning':
        return 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950/20'
      case 'info':
        return 'border-l-blue-500 bg-blue-50 dark:bg-blue-950/20'
    }
  }

  const positionStyles = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-center': 'top-4 left-1/2 -translate-x-1/2',
  }

  return (
    <div
      className={cn(
        'fixed z-50 w-96 max-w-[calc(100vw-2rem)] transition-all duration-200',
        positionStyles[position],
        isVisible && !isExiting && animations.slideIn,
        isExiting && animations.slideOut
      )}
    >
      <Card className={cn(
        'border-l-4 shadow-lg',
        getTypeStyles()
      )}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="shrink-0 mt-0.5">
              {getIcon()}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-foreground">{title}</h4>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                    {message}
                  </p>
                </div>
                
                {!persistent && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleClose}
                    className="shrink-0 h-6 w-6 -mt-1 -mr-2"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
              
              {/* Actions */}
              {actions.length > 0 && (
                <div className="flex items-center gap-2 mt-3">
                  {actions.map((action, index) => (
                    <Button
                      key={index}
                      variant={action.variant === 'primary' ? 'default' : 'outline'}
                      size="xs"
                      onClick={() => handleAction(action)}
                    >
                      {action.label}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          {/* Progress bar */}
          {!persistent && showProgress && (
            <div className="mt-3 -mb-1">
              <div className="h-1 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-current opacity-30 transition-all duration-100 ease-linear"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// Notification Manager Hook
type NotificationItem = NotificationProps & { id: string }

interface NotificationManager {
  notifications: NotificationItem[]
  show: (config: Omit<NotificationConfig, 'id'>) => string
  hide: (id: string) => void
  clear: () => void
  success: (title: string, message: string, options?: Partial<NotificationConfig>) => string
  error: (title: string, message: string, options?: Partial<NotificationConfig>) => string
  warning: (title: string, message: string, options?: Partial<NotificationConfig>) => string
  info: (title: string, message: string, options?: Partial<NotificationConfig>) => string
}

const useNotifications = (): NotificationManager => {
  const [notifications, setNotifications] = React.useState<NotificationItem[]>([])

  const show = React.useCallback((config: Omit<NotificationConfig, 'id'>) => {
    const id = Date.now().toString() + Math.random().toString(36)
    const notification: NotificationItem = {
      ...config,
      id,
      onClose: (notificationId: string) => {
        setNotifications(prev => prev.filter(n => n.id !== notificationId))
      }
    }
    
    setNotifications(prev => [...prev, notification])
    return id
  }, [])

  const hide = React.useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }, [])

  const clear = React.useCallback(() => {
    setNotifications([])
  }, [])

  const success = React.useCallback((title: string, message: string, options: Partial<NotificationConfig> = {}) => {
    return show({ type: 'success', title, message, ...options })
  }, [show])

  const error = React.useCallback((title: string, message: string, options: Partial<NotificationConfig> = {}) => {
    return show({ type: 'error', title, message, persistent: true, ...options })
  }, [show])

  const warning = React.useCallback((title: string, message: string, options: Partial<NotificationConfig> = {}) => {
    return show({ type: 'warning', title, message, ...options })
  }, [show])

  const info = React.useCallback((title: string, message: string, options: Partial<NotificationConfig> = {}) => {
    return show({ type: 'info', title, message, ...options })
  }, [show])

  return { notifications, show, hide, clear, success, error, warning, info }
}

// Notification Container Component
const NotificationContainer: React.FC<{
  position?: NotificationProps['position']
}> = ({ position = 'top-right' }) => {
  const { notifications } = useNotifications()
  
  if (notifications.length === 0) return null

  return createPortal(
    <div className="fixed inset-0 pointer-events-none z-50">
      {notifications.map(notification => (
        <Notification
          key={notification.id}
          id={notification.id}
          type={notification.type}
          title={notification.title}
          message={notification.message}
          duration={notification.duration}
          persistent={notification.persistent}
          actions={notification.actions}
          onClose={notification.onClose}
          onAction={notification.onAction}
          position={position}
          showProgress={notification.showProgress}
        />
      ))}
    </div>,
    document.body
  )
}

export { Notification, useNotifications, NotificationContainer }