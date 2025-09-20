import React, { useState, useEffect, useCallback, createContext, useContext } from 'react'
import { cn } from '../../utils/cn'

import {
  Notification, 
  NotificationAction, 
  NotificationPosition, 
  NotificationType,
  NotificationStatus 
} from '../../types/modelTypes'
import { Button } from './Button'
import { Card } from './Card'
import { LoadingSpinner } from './LoadingSpinner'
import {
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Info,
  X,
  Clock,
  Download,
  Upload,
  Zap,
  RefreshCw,
  ExternalLink,
  Copy,
  Bell,
  BellOff,
  Settings,
  ChevronRight,
  Pause,
  Play,
  Volume2,
  VolumeX
} from 'lucide-react'

interface NotificationContextType {
  notifications: Notification[]
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => string
  removeNotification: (id: string) => void
  updateNotification: (id: string, updates: Partial<Notification>) => void
  clearAll: () => void
  pauseAll: () => void
  resumeAll: () => void
  settings: NotificationSettings
  updateSettings: (settings: Partial<NotificationSettings>) => void
}

interface NotificationSettings {
  position: NotificationPosition
  maxNotifications: number
  defaultDuration: number
  enableSounds: boolean
  enableAnimations: boolean
  groupSimilar: boolean
  pauseOnHover: boolean
  showProgress: boolean
}

interface NotificationSystemProps {
  position?: NotificationPosition
  maxNotifications?: number
  className?: string
  children?: React.ReactNode
}

interface NotificationItemProps {
  notification: Notification
  onDismiss: (id: string) => void
  onAction: (id: string, action: string) => void
  position: NotificationPosition
  settings: NotificationSettings
}

interface NotificationCenterProps {
  notifications: Notification[]
  settings: NotificationSettings
  onSettingsChange: (settings: Partial<NotificationSettings>) => void
  onClearAll: () => void
  onPauseAll: () => void
  onResumeAll: () => void
  isPaused: boolean
}

const NotificationContext = createContext<NotificationContextType | null>(null)

const defaultSettings: NotificationSettings = {
  position: 'top-right',
  maxNotifications: 5,
  defaultDuration: 5000,
  enableSounds: true,
  enableAnimations: true,
  groupSimilar: true,
  pauseOnHover: true,
  showProgress: true
}

const getNotificationIcon = (type: NotificationType) => {
  switch (type) {
    case 'success':
      return <CheckCircle className="h-5 w-5 text-green-500" />
    case 'warning':
      return <AlertTriangle className="h-5 w-5 text-yellow-500" />
    case 'error':
      return <AlertCircle className="h-5 w-5 text-red-500" />
    case 'info':
      return <Info className="h-5 w-5 text-blue-500" />
    case 'progress':
      return <LoadingSpinner className="h-5 w-5" />
    default:
      return <Info className="h-5 w-5 text-gray-500" />
  }
}

const getNotificationColors = (type: NotificationType) => {
  switch (type) {
    case 'success':
      return 'border-l-green-500 bg-green-50 dark:bg-green-950'
    case 'warning':
      return 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950'
    case 'error':
      return 'border-l-red-500 bg-red-50 dark:bg-red-950'
    case 'info':
      return 'border-l-blue-500 bg-blue-50 dark:bg-blue-950'
    case 'progress':
      return 'border-l-purple-500 bg-purple-50 dark:bg-purple-950'
    default:
      return 'border-l-gray-500 bg-gray-50 dark:bg-gray-950'
  }
}

const getPositionClasses = (position: NotificationPosition) => {
  switch (position) {
    case 'top-left':
      return 'top-4 left-4'
    case 'top-right':
      return 'top-4 right-4'
    case 'bottom-left':
      return 'bottom-4 left-4'
    case 'bottom-right':
      return 'bottom-4 right-4'
    case 'top-center':
      return 'top-4 left-1/2 transform -translate-x-1/2'
    case 'bottom-center':
      return 'bottom-4 left-1/2 transform -translate-x-1/2'
    default:
      return 'top-4 right-4'
  }
}

const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onDismiss,
  onAction,
  position,
  settings
}) => {
  const [isHovered, setIsHovered] = useState(false)
  const [timeLeft, setTimeLeft] = useState(notification.duration || settings.defaultDuration)
  const [isPaused, setIsPaused] = useState(false)

  const isTopPosition = position.includes('top')
  const isRightPosition = position.includes('right')

  // Auto-dismiss timer
  useEffect(() => {
    if (notification.persistent || isPaused || (settings.pauseOnHover && isHovered)) {
      return
    }

    if (timeLeft <= 0) {
      onDismiss(notification.id)
      return
    }

    const timer = setTimeout(() => {
      setTimeLeft(prev => prev - 100)
    }, 100)

    return () => clearTimeout(timer)
  }, [timeLeft, isPaused, isHovered, notification.persistent, settings.pauseOnHover, onDismiss, notification.id])

  // Progress calculation
  const progress = notification.duration 
    ? ((notification.duration - timeLeft) / notification.duration) * 100
    : notification.progress || 0

  const handleAction = (action: NotificationAction) => {
    onAction(notification.id, action.action)
    if (!action.action.startsWith('external:')) {
      onDismiss(notification.id)
    }
  }

  return (
    <Card
      className={cn(
        'w-96 max-w-full border-l-4 shadow-lg transition-all duration-300',
        getNotificationColors(notification.type),
        settings.enableAnimations && (
          isTopPosition 
            ? 'animate-in slide-in-from-top-2 fade-in' 
            : 'animate-in slide-in-from-bottom-2 fade-in'
        ),
        isRightPosition ? 'ml-auto' : 'mr-auto'
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="flex-shrink-0 mt-0.5">
            {getNotificationIcon(notification.type)}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="font-semibold text-sm text-foreground">
                  {notification.title}
                </h4>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                  {notification.message}
                </p>
              </div>

              {/* Dismiss Button */}
              {!notification.persistent && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDismiss(notification.id)}
                  className="h-6 w-6 p-0 ml-2 opacity-60 hover:opacity-100"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Progress Bar */}
            {settings.showProgress && (notification.type === 'progress' || !notification.persistent) && (
              <div className="mt-3">
                <div className="w-full bg-gray-200 rounded-full h-1.5 dark:bg-gray-700">
                  <div 
                    className={cn(
                      'h-1.5 rounded-full transition-all duration-100',
                      notification.type === 'success' && 'bg-green-500',
                      notification.type === 'warning' && 'bg-yellow-500',
                      notification.type === 'error' && 'bg-red-500',
                      notification.type === 'info' && 'bg-blue-500',
                      notification.type === 'progress' && 'bg-purple-500'
                    )}
                    style={{ width: `${Math.min(progress, 100)}%` }}
                  />
                </div>
              </div>
            )}

            {/* Actions */}
            {notification.actions && notification.actions.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {notification.actions.map(action => (
                  <Button
                    key={action.id}
                    variant={action.variant || 'outline'}
                    size="sm"
                    onClick={() => handleAction(action)}
                    className="text-xs"
                  >
                    {action.action.startsWith('external:') && (
                      <ExternalLink className="h-3 w-3 mr-1" />
                    )}
                    {action.label}
                  </Button>
                ))}
              </div>
            )}

            {/* Metadata */}
            {notification.metadata && (
              <div className="mt-2 text-xs text-muted-foreground flex items-center gap-2">
                <Clock className="h-3 w-3" />
                <span>{notification.timestamp.toLocaleTimeString()}</span>
                {notification.metadata.source && (
                  <>
                    <span>•</span>
                    <span>{notification.metadata.source}</span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({
  notifications,
  settings,
  onSettingsChange,
  onClearAll,
  onPauseAll,
  onResumeAll,
  isPaused
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [filter, setFilter] = useState<NotificationType | 'all'>('all')

  const filteredNotifications = notifications.filter(notification => 
    filter === 'all' || notification.type === filter
  )

  const unreadCount = notifications.filter(n => !n.metadata?.read).length

  return (
    <div className="relative">
      {/* Notification Center Toggle */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="relative"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>

      {/* Notification Center Panel */}
      {isOpen && (
        <Card className="absolute top-full right-0 mt-2 w-96 max-h-96 overflow-hidden z-50 shadow-xl border">
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Notifications</h3>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={isPaused ? onResumeAll : onPauseAll}
                >
                  {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                </Button>
                <Button variant="ghost" size="sm" onClick={onClearAll}>
                  Clear All
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Filter */}
            <div className="mt-2">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as NotificationType | 'all')}
                className="w-full px-2 py-1 border border-input rounded text-sm bg-background"
              >
                <option value="all">All ({notifications.length})</option>
                <option value="success">Success</option>
                <option value="warning">Warning</option>
                <option value="error">Error</option>
                <option value="info">Info</option>
                <option value="progress">Progress</option>
              </select>
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-64 overflow-y-auto">
            {filteredNotifications.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                No notifications
              </div>
            ) : (
              <div className="space-y-2 p-2">
                {filteredNotifications.map(notification => (
                  <div
                    key={notification.id}
                    className="p-2 border border-border rounded-lg bg-surface/50 hover:bg-surface transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {getNotificationIcon(notification.type)}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          {notification.title}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {notification.message}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {notification.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  )
}

const NotificationProvider: React.FC<NotificationSystemProps> = ({
  position = 'top-right',
  maxNotifications = 5,
  className,
  children
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [settings, setSettings] = useState<NotificationSettings>({
    ...defaultSettings,
    position,
    maxNotifications
  })
  const [isPaused, setIsPaused] = useState(false)

  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp'>) => {
    const id = Math.random().toString(36).substr(2, 9)
    const newNotification: Notification = {
      ...notification,
      id,
      timestamp: new Date()
    }

    setNotifications(prev => {
      const updated = [newNotification, ...prev]
      return updated.slice(0, settings.maxNotifications)
    })

    // Play sound if enabled
    if (settings.enableSounds && notification.type !== 'progress') {
      // Implementation would play notification sound
    }

    return id
  }, [settings.maxNotifications, settings.enableSounds])

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }, [])

  const updateNotification = useCallback((id: string, updates: Partial<Notification>) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, ...updates } : n)
    )
  }, [])

  const clearAll = useCallback(() => {
    setNotifications([])
  }, [])

  const pauseAll = useCallback(() => {
    setIsPaused(true)
  }, [])

  const resumeAll = useCallback(() => {
    setIsPaused(false)
  }, [])

  const updateSettings = useCallback((newSettings: Partial<NotificationSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }))
  }, [])

  const contextValue: NotificationContextType = {
    notifications,
    addNotification,
    removeNotification,
    updateNotification,
    clearAll,
    pauseAll,
    resumeAll,
    settings,
    updateSettings
  }

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
      
      {/* Notification Container */}
      <div className={cn('fixed z-50 pointer-events-none', getPositionClasses(settings.position), className)}>
        <div className="space-y-2 pointer-events-auto">
          {notifications.slice(0, settings.maxNotifications).map(notification => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onDismiss={removeNotification}
              onAction={(id, action) => {
                // Handle notification actions
                console.log('Notification action:', id, action)
              }}
              position={settings.position}
              settings={settings}
            />
          ))}
        </div>
      </div>
    </NotificationContext.Provider>
  )
}

const useNotifications = () => {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
}

export { 
  NotificationProvider, 
  NotificationCenter, 
  useNotifications,
  NotificationItem
}
export type { 
  NotificationSystemProps, 
  NotificationSettings, 
  NotificationContextType 
}