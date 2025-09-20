import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import {
import { cn } from '../../utils/cn'
import type { ChatSession } from '../../types'

  StreamingResponse,
  Model,
  StreamingMetadata
} from '../../types/modelTypes'
import { MessageBubble } from '../chat/MessageBubble'
import { Button } from './Button'
import { Input } from './Input'
import { LoadingSpinner } from './LoadingSpinner'
import { ModelSelector } from './ModelSelector'
import { Card, CardContent, CardHeader, CardTitle } from './Card'
import { Badge } from './Badge'
import {
  Send,
  Square,
  RotateCcw,
  Settings,
  Download,
  Upload,
  Mic,
  MicOff,
  Paperclip,
  Image,
  FileText,
  Copy,
  Share,
  Bookmark,
  MoreHorizontal,
  Zap,
  Clock,
  Activity,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  X,
  Edit,
  Check,
  AlertCircle,
  Gauge
} from 'lucide-react'

export interface StreamingChatInterfaceProps {
  session: ChatSession
  onSendMessage: (message: string, attachments?: File[]) => void
  onStopGeneration: () => void
  onRegenerateResponse: (messageId: string) => void
  onEditMessage: (messageId: string, content: string) => void
  streamingResponse?: StreamingResponse
  models: Model[]
  selectedModel: Model
  onModelChange: (model: Model) => void
  onSessionSave?: () => void
  onSessionExport?: () => void
  className?: string
}

interface ChatInputProps {
  value: string
  onChange: (value: string) => void
  onSend: (message: string, attachments?: File[]) => void
  disabled?: boolean
  placeholder?: string
  attachments: File[]
  onAttachmentsChange: (files: File[]) => void
  isRecording: boolean
  onToggleRecording: () => void
  maxLength?: number
}

interface AttachmentPreviewProps {
  file: File
  onRemove: () => void
  key?: string
}

interface StreamingMetricsProps {
  metadata: StreamingMetadata
  isVisible: boolean
  onToggleVisibility: () => void
}

const AttachmentPreview = ({ file, onRemove }: AttachmentPreviewProps) => {
  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <Image className="h-4 w-4" />
    if (type.startsWith('text/')) return <FileText className="h-4 w-4" />
    return <Paperclip className="h-4 w-4" />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="flex items-center gap-2 p-2 bg-surface rounded-lg border border-border">
      {getFileIcon(file.type)}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{file.name}</div>
        <div className="text-xs text-muted-foreground">{formatFileSize(file.size)}</div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={onRemove}
        className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  )
}

const StreamingMetrics: React.FC<StreamingMetricsProps> = ({
  metadata,
  isVisible,
  onToggleVisibility
}) => {
  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  const formatTokens = (tokens: number) => {
    if (tokens < 1000) return tokens.toString()
    return `${(tokens / 1000).toFixed(1)}k`
  }

  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Generation Metrics</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleVisibility}
            className="h-6 w-6 p-0"
          >
            {isVisible ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </Button>
        </div>
      </CardHeader>
      
      {isVisible && (
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="flex items-center gap-1">
              <Zap className="h-3 w-3 text-yellow-500" />
              <span className="font-medium">{metadata.tokensPerSecond.toFixed(1)} t/s</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3 text-blue-500" />
              <span className="font-medium">{formatDuration(metadata.timeElapsed)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Activity className="h-3 w-3 text-green-500" />
              <span className="font-medium">{formatTokens(metadata.generatedTokens)} tokens</span>
            </div>
            <div className="flex items-center gap-1">
              <Gauge className="h-3 w-3 text-purple-500" />
              <span className="font-medium">
                {metadata.confidence ? `${(metadata.confidence * 100).toFixed(0)}%` : 'N/A'}
              </span>
            </div>
          </div>
          
          {metadata.finishReason && (
            <div className="mt-2 pt-2 border-t border-border">
              <Badge variant="outline" className="text-xs">
                Finish: {metadata.finishReason}
              </Badge>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}

const ChatInput: React.FC<ChatInputProps> = ({
  value,
  onChange,
  onSend,
  disabled,
  placeholder = "Type your message...",
  attachments,
  onAttachmentsChange,
  isRecording,
  onToggleRecording,
  maxLength = 4000
}) => {
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  type DropHandler = NonNullable<JSX.IntrinsicElements['div']['onDrop']>
  type DragOverHandler = NonNullable<JSX.IntrinsicElements['div']['onDragOver']>
  type DragLeaveHandler = NonNullable<JSX.IntrinsicElements['div']['onDragLeave']>
  type TextareaKeyHandler = NonNullable<JSX.IntrinsicElements['textarea']['onKeyDown']>

  const handleKeyDown: TextareaKeyHandler = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      if (value.trim() && !disabled) {
        onSend(value, attachments)
      }
    }
  }

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return
    const newFiles = Array.from(files).filter(file => {
      // Basic validation
      const maxSize = 10 * 1024 * 1024 // 10MB
      return file.size <= maxSize
    })
    onAttachmentsChange([...attachments, ...newFiles])
  }

  const handleDrop: DropHandler = (event) => {
    event.preventDefault()
    setIsDragOver(false)
    handleFileSelect(event.dataTransfer.files)
  }

  const handleDragOver: DragOverHandler = (event) => {
    event.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave: DragLeaveHandler = (event) => {
    event.preventDefault()
    setIsDragOver(false)
  }

  const removeAttachment = (index: number) => {
    onAttachmentsChange(attachments.filter((_, i) => i !== index))
  }

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [value])

  const isOverLimit = value.length > maxLength
  const remaining = maxLength - value.length

  return (
    <div className="space-y-3">
      {/* Attachments */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {attachments.map((file, index) => (
            <AttachmentPreview
              key={`${file.name}-${index}`}
              file={file}
              onRemove={() => removeAttachment(index)}
            />
          ))}
        </div>
      )}

      {/* Input Area */}
      <div
        className={cn(
          'relative border border-border rounded-lg bg-background transition-colors',
          isDragOver && 'border-primary bg-primary/5',
          isOverLimit && 'border-destructive',
          disabled && 'opacity-50'
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isDragOver ? "Drop files here..." : placeholder}
          disabled={disabled}
          className="w-full px-4 py-3 pr-24 bg-transparent border-0 resize-none outline-none placeholder:text-muted-foreground min-h-[44px] max-h-32"
          rows={1}
        />

        {/* Input Actions */}
        <div className="absolute right-2 bottom-2 flex items-center gap-1">
          {/* Voice Recording */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleRecording}
            className={cn(
              "h-8 w-8 p-0",
              isRecording && "text-red-500 bg-red-50"
            )}
          >
            {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </Button>

          {/* File Attachment */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="h-8 w-8 p-0"
          >
            <Paperclip className="h-4 w-4" />
          </Button>

          {/* Send Button */}
          <Button
            onClick={() => value.trim() && !disabled && onSend(value, attachments)}
            disabled={!value.trim() || disabled || isOverLimit}
            size="sm"
            className="h-8 w-8 p-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          accept="image/*,text/*,.pdf,.doc,.docx"
          onChange={(e) => handleFileSelect(e.target.files)}
        />
      </div>

      {/* Character Count */}
      <div className="flex justify-between items-center text-xs text-muted-foreground">
        <div>
          {attachments.length > 0 && (
            <span>{attachments.length} file{attachments.length !== 1 ? 's' : ''} attached</span>
          )}
        </div>
        <div className={cn(isOverLimit && "text-destructive")}>
          {remaining} characters remaining
        </div>
      </div>
    </div>
  )
}

const StreamingChatInterface: React.FC<StreamingChatInterfaceProps> = ({
  session,
  onSendMessage,
  onStopGeneration,
  onRegenerateResponse,
  onEditMessage,
  streamingResponse,
  models,
  selectedModel,
  onModelChange,
  onSessionSave,
  onSessionExport,
  className
}) => {
  const [inputValue, setInputValue] = useState('')
  const [attachments, setAttachments] = useState<File[]>([])
  const [isRecording, setIsRecording] = useState(false)
  const [showModelSelector, setShowModelSelector] = useState(false)
  const [showMetrics, setShowMetrics] = useState(false)
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [session.messages, streamingResponse, scrollToBottom])

  // Handle message sending
  const handleSendMessage = useCallback((message: string, files?: File[]) => {
    if (message.trim()) {
      onSendMessage(message, files)
      setInputValue('')
      setAttachments([])
    }
  }, [onSendMessage])

  // Handle message editing
  const handleEditMessage = (messageId: string) => {
    const message = session.messages.find(m => m.id === messageId)
    if (message) {
      setEditingMessageId(messageId)
      setEditContent(message.content)
    }
  }

  const handleSaveEdit = () => {
    if (editingMessageId && editContent.trim()) {
      onEditMessage(editingMessageId, editContent)
      setEditingMessageId(null)
      setEditContent('')
    }
  }

  const handleCancelEdit = () => {
    setEditingMessageId(null)
    setEditContent('')
  }

  // Calculate streaming metrics
  const streamingMetrics = useMemo(() => {
    if (!streamingResponse) return null
    
    return {
      ...streamingResponse.metadata,
      efficiency: streamingResponse.metadata.timeElapsed > 0 
        ? streamingResponse.metadata.generatedTokens / (streamingResponse.metadata.timeElapsed / 1000)
        : 0
    }
  }, [streamingResponse])

  const isStreaming = streamingResponse && !streamingResponse.isComplete

  return (
    <div className={cn('flex flex-col h-full bg-background', className)}>
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-border bg-surface/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <h2 className="text-lg font-semibold">{session.title}</h2>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Model: {selectedModel.name}</span>
                <Badge variant="outline" className="text-xs">
                  {selectedModel.status === 'loaded' ? 'Active' : selectedModel.status}
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Session Actions */}
            {onSessionSave && (
              <Button variant="ghost" size="sm" onClick={onSessionSave}>
                <Bookmark className="h-4 w-4" />
              </Button>
            )}
            {onSessionExport && (
              <Button variant="ghost" size="sm" onClick={onSessionExport}>
                <Share className="h-4 w-4" />
              </Button>
            )}
            
            {/* Model Selector Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowModelSelector(!showModelSelector)}
            >
              <Settings className="h-4 w-4" />
            </Button>

            {/* Metrics Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowMetrics(!showMetrics)}
            >
              <Activity className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Streaming Metrics */}
        {streamingMetrics && showMetrics && (
          <div className="mt-3">
            <StreamingMetrics
              metadata={streamingMetrics}
              isVisible={true}
              onToggleVisibility={() => setShowMetrics(!showMetrics)}
            />
          </div>
        )}
      </div>

      {/* Model Selector Panel */}
      {showModelSelector && (
        <div className="flex-shrink-0 border-b border-border bg-surface/30 p-4">
          <div className="max-h-60 overflow-y-auto">
            <ModelSelector
              models={models}
              selectedModel={selectedModel}
              onModelSelect={onModelChange}
              onModelInstall={() => {}}
              onModelUninstall={() => {}}
              onModelLoad={() => {}}
              onModelUnload={() => {}}
              onModelFavorite={() => {}}
            />
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {session.messages.map((message) => (
          <div key={message.id} className="relative group">
            {editingMessageId === message.id ? (
              <Card className="p-4">
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full p-2 border border-border rounded resize-none min-h-[60px]"
                  autoFocus
                />
                <div className="flex justify-end gap-2 mt-2">
                  <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleSaveEdit}>
                    <Check className="h-4 w-4 mr-1" />
                    Save
                  </Button>
                </div>
              </Card>
            ) : (
              <>
                <MessageBubble message={message} />
                {/* Message Actions */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="flex items-center gap-1 bg-background border border-border rounded-lg p-1 shadow-sm">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigator.clipboard.writeText(message.content)}
                      className="h-6 w-6 p-0"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                    {message.sender === 'user' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditMessage(message.id)}
                        className="h-6 w-6 p-0"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                    )}
                    {message.sender === 'ai' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onRegenerateResponse(message.id)}
                        className="h-6 w-6 p-0"
                      >
                        <RotateCcw className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        ))}

        {/* Streaming Response */}
        {streamingResponse && (
          <div className="relative">
            <MessageBubble
              message={{
                id: streamingResponse.messageId,
                content: streamingResponse.content,
                sender: 'ai',
                timestamp: new Date(),
                status: 'delivered',
                type: 'text',
                metadata: {
                  confidence: streamingResponse.metadata.confidence
                }
              }}
            />
            
            {/* Streaming Indicator */}
            {!streamingResponse.isComplete && (
              <div className="absolute -bottom-2 left-12">
                <div className="flex items-center gap-2 bg-background border border-border rounded-lg px-2 py-1 text-xs">
                  <LoadingSpinner className="h-3 w-3" />
                  <span>Generating...</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onStopGeneration}
                    className="h-4 w-4 p-0 ml-2"
                  >
                    <Square className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}

            {/* Error Display */}
            {streamingResponse.error && (
              <div className="mt-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <div className="flex items-center gap-2 text-destructive text-sm">
                  <AlertCircle className="h-4 w-4" />
                  <span>{streamingResponse.error.message}</span>
                </div>
                {streamingResponse.error.suggestion && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {streamingResponse.error.suggestion}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="flex-shrink-0 p-4 border-t border-border bg-surface/50">
        <ChatInput
          value={inputValue}
          onChange={setInputValue}
          onSend={handleSendMessage}
          disabled={isStreaming}
          attachments={attachments}
          onAttachmentsChange={setAttachments}
          isRecording={isRecording}
          onToggleRecording={() => setIsRecording(!isRecording)}
          placeholder={
            isStreaming 
              ? "AI is responding..." 
              : "Type your message... (Shift+Enter for new line)"
          }
        />
      </div>
    </div>
  )
}

export { StreamingChatInterface }