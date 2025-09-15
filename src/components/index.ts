// BEAR AI Component Library Index
// Export all components for easy importing

// UI Components
export { Button } from './ui/Button'
export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './ui/Card'
export { Input } from './ui/Input'
export { Modal, ModalContent, ModalFooter } from './ui/Modal'
export { Badge } from './ui/Badge'
export { Avatar } from './ui/Avatar'

// Layout Components
export { AppLayout } from './layout/AppLayout'
export { Sidebar } from './layout/Sidebar'

// Form Components
export { Form, useForm } from './forms/Form'

// Agent Components
export { AgentCard } from './agent/AgentCard'
export { ConversationInterface } from './agent/ConversationInterface'
export { StatusDashboard } from './agent/StatusDashboard'
export { ConfigurationPanel } from './agent/ConfigurationPanel'

// Common Components
export { Notification, useNotifications, NotificationContainer } from './common/Notification'

// Streaming Components
export {
  StreamingMessage,
  StreamingLoader,
  StreamingProgress,
  TypingIndicator,
  ConnectionStatus,
  CompactConnectionStatus,
  StreamingChat,
  CompactStreamingChat
} from './streaming'

// Types
export type {
  Agent,
  AgentMetrics,
  Conversation,
  Message,
  Task,
  FormField,
  ValidationRule,
  Option,
  NotificationConfig,
  NotificationAction,
  DashboardConfig,
  WidgetConfig,
  ComponentProps,
  ResponsiveBreakpoint
} from '../types'

// Streaming Types
export type {
  IStreamingMessage,
  StreamingChunk,
  StreamingConfig,
  ConnectionState,
  StreamingError,
  StreamingOptions,
  StreamingMetrics,
  StreamingEvent
} from './streaming'

// Hooks
export { useResponsive, useMediaQuery } from '../hooks/useResponsive'
export { useClickOutside } from '../hooks/useClickOutside'

// Streaming Hooks
export { useStreaming, useMultipleStreams } from '../hooks/useStreaming'
export { useStreamingRecovery, useRecoveryMonitor } from '../hooks/useStreamingRecovery'

// Utils
export { cn, responsive, animations, theme } from '../utils/cn'