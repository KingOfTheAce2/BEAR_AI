import React, { useState, useRef, useEffect, KeyboardEvent } from 'react'
import { 
  Send, 
  Paperclip, 
  Download, 
  Archive, 
  Search, 
  MoreVertical, 
  Copy,
  Bookmark,
  ExternalLink,
  MessageSquare,
  Clock,
  FileText,
  Star,
  Trash2
} from 'lucide-react'
import { useChatStore } from '../store/chatStore'
import { useHistoryStore } from '../store/historyStore'
import { useSettingsStore } from '../store/settingsStore'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import type { ChatMessage, ChatAttachment } from '../types'

const Chat: React.FC = () => {
  const {
    conversations,
    currentConversation,
    messages,
    isTyping,
    isLoading,
    createConversation,
    selectConversation,
    sendMessage,
    exportConversation,
    archiveConversation,
    deleteConversation,
    searchConversations,
    getRecentConversations,
    getAutocompleteItems,
    clearCurrentConversation,
  } = useChatStore()
  
  const { addActivity } = useHistoryStore()
  const { settings } = useSettingsStore()
  
  const [messageInput, setMessageInput] = useState('')
  const [attachments, setAttachments] = useState<File[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [showSidebar, setShowSidebar] = useState(true)
  const [autocompleteItems, setAutocompleteItems] = useState<any[]>([])
  const [showAutocomplete, setShowAutocomplete] = useState(false)
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messageInputRef = useRef<HTMLTextAreaElement>(null)
  
  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])
  
  // Handle autocomplete
  useEffect(() => {
    if (messageInput.length > 2) {
      const items = getAutocompleteItems(messageInput, 'chat')
      setAutocompleteItems(items)
      setShowAutocomplete(items.length > 0)
    } else {
      setShowAutocomplete(false)
    }
  }, [messageInput, getAutocompleteItems])
  
  const handleSendMessage = async () => {
    if (!messageInput.trim() && attachments.length === 0) return
    
    const messageContent = messageInput.trim()
    setMessageInput('')
    setAttachments([])
    setShowAutocomplete(false)
    
    // Add activity tracking
    addActivity({
      type: 'chat_message',
      userId: 'current-user',
      metadata: {
        conversationId: currentConversation?.id,
        messageLength: messageContent.length,
        hasAttachments: attachments.length > 0,
        title: currentConversation?.title,
        lastMessage: messageContent.substring(0, 100),
        messageCount: messages.length + 1,
      },
    })
    
    await sendMessage(messageContent, attachments)
  }
  
  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }
  
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    setAttachments(prev => [...prev, ...files])
  }
  
  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index))
  }
  
  const handleNewConversation = () => {
    const id = createConversation()
    addActivity({
      type: 'chat_message',
      userId: 'current-user',
      metadata: {
        action: 'new_conversation',
        conversationId: id,
      },
    })
  }
  
  const handleSelectConversation = (id: string) => {
    selectConversation(id)
    const conversation = conversations.find(c => c.id === id)
    if (conversation) {
      addActivity({
        type: 'chat_message',
        userId: 'current-user',
        metadata: {
          action: 'select_conversation',
          conversationId: id,
          title: conversation.title,
        },
      })
    }
  }
  
  const handleExport = (format: 'json' | 'pdf' | 'txt') => {
    if (currentConversation) {
      exportConversation(currentConversation.id, format)
      addActivity({
        type: 'chat_message',
        userId: 'current-user',
        metadata: {
          action: 'export_conversation',
          conversationId: currentConversation.id,
          format,
        },
      })
    }
  }
  
  const copyMessageToClipboard = (message: ChatMessage) => {
    navigator.clipboard.writeText(message.content)
    setSelectedMessage(message.id)
    setTimeout(() => setSelectedMessage(null), 2000)
  }
  
  const filteredConversations = searchQuery
    ? searchConversations(searchQuery)
    : getRecentConversations(20)
  
  const formatTime = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    
    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return date.toLocaleDateString()
  }
  
  return (
    <div className="flex h-full bg-gray-50">
      {/* Sidebar - Conversation List */}
      {showSidebar && (
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
          {/* Sidebar Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-800">Conversations</h2>
              <Button 
                onClick={handleNewConversation}
                size="sm"
                className="text-sm"
              >
                <MessageSquare className="w-4 h-4 mr-1" />
                New
              </Button>
            </div>
            
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto">
            {filteredConversations.map((conversation) => (
              <div
                key={conversation.id}
                onClick={() => handleSelectConversation(conversation.id)}
                className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                  currentConversation?.id === conversation.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-medium text-gray-800 truncate flex-1">
                    {conversation.title}
                  </h3>
                  <div className="flex items-center space-x-1 ml-2">
                    {conversation.isArchived && (
                      <Archive className="w-3 h-3 text-gray-400" />
                    )}
                    <button className="text-gray-400 hover:text-gray-600">
                      <MoreVertical className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                
                <p className="text-sm text-gray-600 truncate mb-2">
                  {conversation.messages.length > 0 
                    ? conversation.messages[conversation.messages.length - 1]?.content.substring(0, 100) + '...'
                    : 'No messages yet'
                  }
                </p>
                
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span className="flex items-center">
                    <Clock className="w-3 h-3 mr-1" />
                    {formatTime(conversation.lastActivity)}
                  </span>
                  <span className="flex items-center">
                    <MessageSquare className="w-3 h-3 mr-1" />
                    {conversation.metadata.messageCount}
                  </span>
                </div>
                
                {/* Tags */}
                {conversation.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {conversation.tags.slice(0, 3).map((tag, index) => (
                      <span
                        key={index}
                        className="inline-block px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        {currentConversation && (
          <div className="bg-white border-b border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">
                  {currentConversation.title}
                </h2>
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <span>{currentConversation.messages.length} messages</span>
                  <span>Last activity {formatTime(currentConversation.lastActivity)}</span>
                  {currentConversation.metadata.legalContext && (
                    <span className="flex items-center">
                      <FileText className="w-3 h-3 mr-1" />
                      Legal context
                    </span>
                  )}
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport('json')}
                  title="Export as JSON"
                >
                  <Download className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport('txt')}
                  title="Export as Text"
                >
                  <FileText className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => archiveConversation(currentConversation.id)}
                  title="Archive Conversation"
                >
                  <Archive className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSidebar(!showSidebar)}
                  title="Toggle Sidebar"
                >
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
        
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {!currentConversation ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-600 mb-2">
                  Welcome to BEAR AI Legal Assistant
                </h3>
                <p className="text-gray-500 mb-4">
                  Start a new conversation to get legal assistance and research help.
                </p>
                <Button onClick={handleNewConversation}>
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Start New Conversation
                </Button>
              </div>
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-3xl rounded-lg p-4 relative group ${
                      message.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white border border-gray-200 text-gray-800'
                    }`}
                  >
                    {/* Message Content */}
                    <div className="prose prose-sm max-w-none">
                      <pre className="whitespace-pre-wrap font-sans">
                        {message.content}
                      </pre>
                    </div>
                    
                    {/* Attachments */}
                    {message.attachments && message.attachments.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {message.attachments.map((attachment) => (
                          <div
                            key={attachment.id}
                            className="flex items-center space-x-2 p-2 bg-gray-50 rounded text-sm"
                          >
                            <Paperclip className="w-4 h-4" />
                            <span className="flex-1 truncate">{attachment.name}</span>
                            <span className="text-xs text-gray-500">
                              {(attachment.size / 1024).toFixed(1)} KB
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Citations */}
                    {message.citations && message.citations.length > 0 && (
                      <div className="mt-3 border-t pt-3">
                        <h4 className="text-sm font-medium mb-2 flex items-center">
                          <ExternalLink className="w-3 h-3 mr-1" />
                          Legal Citations
                        </h4>
                        <div className="space-y-2">
                          {message.citations.map((citation) => (
                            <div key={citation.id} className="text-xs">
                              <div className="font-medium">{citation.title}</div>
                              <div className="text-gray-600">{citation.source}</div>
                              <div className="text-gray-500 mt-1">{citation.snippet}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Message Metadata */}
                    <div className="flex items-center justify-between mt-3 text-xs opacity-70">
                      <span>{message.timestamp.toLocaleTimeString()}</span>
                      {message.metadata && settings.chat.showConfidence && (
                        <span className="flex items-center space-x-2">
                          {message.metadata.confidence && (
                            <span>
                              Confidence: {(message.metadata.confidence * 100).toFixed(1)}%
                            </span>
                          )}
                          {message.metadata.processingTime && (
                            <span>
                              {message.metadata.processingTime}ms
                            </span>
                          )}
                        </span>
                      )}
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="absolute top-2 right-2 hidden group-hover:flex items-center space-x-1">
                      <button
                        onClick={() => copyMessageToClipboard(message)}
                        className="p-1 rounded hover:bg-gray-100 transition-colors"
                        title="Copy message"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                      <button
                        className="p-1 rounded hover:bg-gray-100 transition-colors"
                        title="Bookmark message"
                      >
                        <Bookmark className="w-3 h-3" />
                      </button>
                    </div>
                    
                    {selectedMessage === message.id && (
                      <div className="absolute -top-8 right-0 bg-green-600 text-white px-2 py-1 rounded text-xs">
                        Copied!
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {/* Typing Indicator */}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-white border border-gray-200 rounded-lg p-4 text-gray-600">
                    <div className="flex items-center space-x-2">
                      <div className="typing-indicator">
                        <div></div>
                        <div></div>
                        <div></div>
                      </div>
                      <span>BEAR AI is thinking...</span>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </>
          )}
        </div>
        
        {/* Input Area */}
        {currentConversation && (
          <div className="bg-white border-t border-gray-200 p-4">
            {/* Attachments Preview */}
            {attachments.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {attachments.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center space-x-2 bg-gray-100 rounded-lg p-2 text-sm"
                  >
                    <Paperclip className="w-4 h-4 text-gray-500" />
                    <span className="truncate max-w-32">{file.name}</span>
                    <button
                      onClick={() => removeAttachment(index)}
                      className="text-gray-500 hover:text-red-500"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            {/* Autocomplete */}
            {showAutocomplete && (
              <div className="mb-3 bg-white border border-gray-200 rounded-lg shadow-lg max-h-32 overflow-y-auto">
                {autocompleteItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      setMessageInput(messageInput.replace(/\w+$/, item.text))
                      setShowAutocomplete(false)
                    }}
                    className="p-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                  >
                    <div className="font-medium text-sm">{item.text}</div>
                    <div className="text-xs text-gray-500">{item.category}</div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Input Controls */}
            <div className="flex items-end space-x-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
                title="Attach files"
              >
                <Paperclip className="w-5 h-5" />
              </button>
              
              <div className="flex-1 relative">
                <textarea
                  ref={messageInputRef}
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={`Ask BEAR AI anything about law... (${settings.chat.maxMessageLength} chars max)`}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={1}
                  maxLength={settings.chat.maxMessageLength}
                  style={{ 
                    minHeight: '48px',
                    maxHeight: '120px',
                    height: 'auto',
                  }}
                />
                <div className="absolute bottom-2 right-2 text-xs text-gray-400">
                  {messageInput.length}/{settings.chat.maxMessageLength}
                </div>
              </div>
              
              <Button
                onClick={handleSendMessage}
                disabled={!messageInput.trim() && attachments.length === 0}
                className="h-12 px-6"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
            
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileUpload}
              className="hidden"
              accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
            />
            
            {/* Quick Actions */}
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={() => setMessageInput('What are the elements of breach of contract?')}
                className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded-full transition-colors"
              >
                Contract law basics
              </button>
              <button
                onClick={() => setMessageInput('Explain the summary judgment standard')}
                className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded-full transition-colors"
              >
                Summary judgment
              </button>
              <button
                onClick={() => setMessageInput('What is due process in criminal law?')}
                className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded-full transition-colors"
              >
                Due process
              </button>
            </div>
          </div>
        )}
      </div>
      
      <style jsx>{`
        .typing-indicator {
          display: flex;
          space-x: 2px;
        }
        
        .typing-indicator div {
          width: 4px;
          height: 4px;
          background-color: #6b7280;
          border-radius: 50%;
          animation: typing 1.4s infinite ease-in-out;
        }
        
        .typing-indicator div:nth-child(1) {
          animation-delay: -0.32s;
        }
        
        .typing-indicator div:nth-child(2) {
          animation-delay: -0.16s;
        }
        
        @keyframes typing {
          0%, 80%, 100% {
            transform: scale(0);
          }
          40% {
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  )
}

export default Chat