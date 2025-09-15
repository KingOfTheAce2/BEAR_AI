import React from 'react'
import { cn } from '../../utils/cn'
import { Conversation, Message, Agent } from '../../types'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Avatar } from '../ui/Avatar'
import { Badge } from '../ui/Badge'
import {
  Send,
  Paperclip,
  Smile,
  MoreVertical,
  Play,
  Pause,
  Square,
  Settings,
  Users
} from 'lucide-react'

export interface ConversationInterfaceProps {
  conversation: Conversation
  currentUser?: Agent
  onSendMessage: (content: string, type?: Message['type']) => void
  onPauseConversation?: () => void
  onResumeConversation?: () => void
  onEndConversation?: () => void
  onAddParticipant?: () => void
  onConfigureConversation?: () => void
  className?: string
}

const ConversationInterface: React.FC<ConversationInterfaceProps> = ({
  conversation,
  currentUser,
  onSendMessage,
  onPauseConversation,
  onResumeConversation,
  onEndConversation,
  onAddParticipant,
  onConfigureConversation,
  className,
}) => {
  const [message, setMessage] = React.useState('')
  const [isTyping, setIsTyping] = React.useState(false)
  const messagesEndRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)

  // Auto-scroll to bottom when new messages arrive
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [conversation.messages])

  // Focus input on mount
  React.useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSendMessage = () => {
    if (!message.trim()) return

    onSendMessage(message.trim())
    setMessage('')
    setIsTyping(false)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const getParticipantById = (agentId: string): Agent | undefined => {
    return conversation.participants.find(p => p.id === agentId)
  }

  const formatTimestamp = (timestamp: Date): string => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getMessageTypeIcon = (type: Message['type']) => {
    switch (type) {
      case 'code':
        return '💻'
      case 'file':
        return '📎'
      case 'image':
        return '🖼️'
      case 'system':
        return '⚙️'
      default:
        return '💬'
    }
  }

  const renderMessage = (message: Message) => {
    const participant = getParticipantById(message.agentId)
    const isCurrentUser = currentUser && message.agentId === currentUser.id

    return (
      <div
        key={message.id}
        className={cn(
          'flex gap-3 mb-4',
          isCurrentUser && 'flex-row-reverse'
        )}
      >
        <Avatar
          src={participant?.avatar}
          alt={participant?.name}
          fallback={participant?.name?.charAt(0)}
          size="sm"
          showStatus
          status={participant?.status === 'active' ? 'online' : 'offline'}
        />

        <div className={cn(
          'flex-1 min-w-0',
          isCurrentUser && 'text-right'
        )}>
          <div className={cn(
            'flex items-center gap-2 mb-1',
            isCurrentUser && 'justify-end'
          )}>
            <span className="text-sm font-medium text-foreground">
              {participant?.name || 'Unknown Agent'}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatTimestamp(message.timestamp)}
            </span>
            {message.type !== 'text' && (
              <span className="text-xs">
                {getMessageTypeIcon(message.type)}
              </span>
            )}
          </div>

          <div className={cn(
            'inline-block max-w-[80%] p-3 rounded-lg text-sm',
            isCurrentUser
              ? 'bg-primary text-primary-foreground ml-auto'
              : 'bg-muted text-muted-foreground',
            message.type === 'code' && 'font-mono text-xs bg-gray-900 text-green-400',
            message.type === 'system' && 'bg-blue-100 text-blue-900 dark:bg-blue-900 dark:text-blue-100'
          )}>
            {message.type === 'code' ? (
              <pre className="whitespace-pre-wrap">{message.content}</pre>
            ) : (
              <p className="whitespace-pre-wrap">{message.content}</p>
            )}

            {message.metadata && Object.keys(message.metadata).length > 0 && (
              <div className="mt-2 pt-2 border-t border-current/20 text-xs opacity-75">
                {Object.entries(message.metadata).map(([key, value]) => (
                  <div key={key} className="flex justify-between">
                    <span>{key}:</span>
                    <span>{String(value)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <Card className={cn('h-full flex flex-col', className)}>
      {/* Header */}
      <CardHeader className="shrink-0 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Users className="h-5 w-5 text-muted-foreground" />
              <Badge
                variant="outline"
                className="absolute -top-2 -right-2 text-xs px-1 min-w-[20px] h-5"
              >
                {conversation.participants.length}
              </Badge>
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="truncate text-base">
                {conversation.title}
              </CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge
                  variant={conversation.status === 'active' ? 'default' : 'secondary'}
                  className="text-xs"
                >
                  {conversation.status}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {conversation.messages.length} messages
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            {conversation.status === 'active' && onPauseConversation && (
              <Button variant="ghost" size="icon" onClick={onPauseConversation}>
                <Pause className="h-4 w-4" />
              </Button>
            )}
            {conversation.status === 'paused' && onResumeConversation && (
              <Button variant="ghost" size="icon" onClick={onResumeConversation}>
                <Play className="h-4 w-4" />
              </Button>
            )}
            {onEndConversation && (
              <Button variant="ghost" size="icon" onClick={onEndConversation}>
                <Square className="h-4 w-4" />
              </Button>
            )}
            {onAddParticipant && (
              <Button variant="ghost" size="icon" onClick={onAddParticipant}>
                <Users className="h-4 w-4" />
              </Button>
            )}
            {onConfigureConversation && (
              <Button variant="ghost" size="icon" onClick={onConfigureConversation}>
                <Settings className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      {/* Messages */}
      <CardContent className="flex-1 overflow-y-auto p-4">
        {conversation.messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No messages yet. Start the conversation!</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {conversation.messages.map(renderMessage)}
            {isTyping && (
              <div className="flex gap-3 mb-4 opacity-75">
                <Avatar
                  fallback="..."
                  size="sm"
                />
                <div className="flex-1">
                  <div className="inline-block bg-muted p-3 rounded-lg">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-current rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                      <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </CardContent>

      {/* Input */}
      {conversation.status === 'active' && (
        <div className="shrink-0 border-t border-border p-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon">
              <Paperclip className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon">
              <Smile className="h-4 w-4" />
            </Button>

            <Input
              ref={inputRef}
              value={message}
              onChange={(e) => {
                setMessage(e.target.value)
                setIsTyping(e.target.value.length > 0)
              }}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              className="flex-1"
              disabled={conversation.status !== 'active'}
            />

            <Button
              onClick={handleSendMessage}
              disabled={!message.trim() || conversation.status !== 'active'}
              size="icon"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}

export { ConversationInterface }