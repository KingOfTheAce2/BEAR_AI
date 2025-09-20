import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 

  Send, 
  Paperclip, 
  StopCircle, 
  RotateCcw, 
  Download, 
  Copy, 
  Trash2,
  MessageSquare,
  Clock,
  HardDrive,
  Shield,
  Database,
  FileText,
  Eye,
  EyeOff,
  Settings,
  AlertCircle,
  CheckCircle,
  Zap,
  Brain,
  Lock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Separator } from '../ui/separator';

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    modelUsed?: string;
    tokensUsed?: number;
    responseTime?: number;
    temperature?: number;
    attachments?: string[];
    storedLocally: boolean;
    encrypted: boolean;
  };
  status: 'sending' | 'sent' | 'generating' | 'completed' | 'error';
  error?: string;
  isStreaming?: boolean;
  parentId?: string; // for threaded conversations
}

interface ChatSession {
  id: string;
  name: string;
  createdAt: Date;
  lastModified: Date;
  messageCount: number;
  modelUsed: string;
  isEncrypted: boolean;
  localPath: string;
  size: number; // in bytes
  metadata: {
    tags: string[];
    description?: string;
    archived: boolean;
  };
}

interface LocalChatInterfaceProps {
  currentModel?: string;
  onModelRequired?: () => void;
  onSessionChange?: (session: ChatSession) => void;
  className?: string;
}

export const LocalChatInterface: React.FC<LocalChatInterfaceProps> = ({
  currentModel,
  onModelRequired,
  onSessionChange,
  className = ""
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [showSessionList, setShowSessionList] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [showMetadata, setShowMetadata] = useState(false);
  const [localStorageUsage, setLocalStorageUsage] = useState({ used: 0, total: 0 });
  const [encryptionEnabled, setEncryptionEnabled] = useState(true);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Simulate local storage usage check
  useEffect(() => {
    const checkStorageUsage = async () => {
      // In real implementation, this would check:
      // - localStorage usage
      // - IndexedDB usage  
      // - File system usage for chat history
      // - Tauri's storage APIs
      
      const mockUsage = {
        used: 45 * 1024 * 1024, // 45 MB
        total: 100 * 1024 * 1024 // 100 MB limit
      };
      setLocalStorageUsage(mockUsage);
    };

    checkStorageUsage();
  }, [messages]);

  // Load chat sessions from local storage
  useEffect(() => {
    const loadSessions = async () => {
      try {
        // In real implementation, this would load from:
        // - localStorage/IndexedDB
        // - Local SQLite database
        // - Encrypted file storage
        
        const mockSessions: ChatSession[] = [
          {
            id: 'session-1',
            name: 'Legal Research Discussion',
            createdAt: new Date('2024-01-15T10:00:00'),
            lastModified: new Date('2024-01-15T14:30:00'),
            messageCount: 24,
            modelUsed: 'Llama 2 7B Chat',
            isEncrypted: true,
            localPath: '/home/.bear_ai/sessions/session-1.json',
            size: 156789,
            metadata: {
              tags: ['legal', 'research'],
              description: 'Discussion about contract law precedents',
              archived: false
            }
          },
          {
            id: 'session-2', 
            name: 'Document Analysis',
            createdAt: new Date('2024-01-14T09:15:00'),
            lastModified: new Date('2024-01-14T16:45:00'),
            messageCount: 18,
            modelUsed: 'Mistral 7B Instruct',
            isEncrypted: true,
            localPath: '/home/.bear_ai/sessions/session-2.json',
            size: 98432,
            metadata: {
              tags: ['analysis', 'documents'],
              description: 'Analysis of client contracts',
              archived: false
            }
          }
        ];

        setSessions(mockSessions);
        
        // Load the most recent session
        if (mockSessions.length > 0 && !currentSession) {
          loadSession(mockSessions[0].id);
        }
      } catch (error) {
        console.error('Failed to load sessions:', error);
      }
    };

    loadSessions();
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (autoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, autoScroll]);

  const loadSession = async (sessionId: string) => {
    try {
      const session = sessions.find(s => s.id === sessionId);
      if (!session) return;

      // In real implementation, load messages from local storage
      const mockMessages: ChatMessage[] = [
        {
          id: 'msg-1',
          type: 'user',
          content: 'Can you help me analyze this contract clause regarding liability limitations?',
          timestamp: new Date('2024-01-15T10:01:00'),
          status: 'completed',
          metadata: {
            storedLocally: true,
            encrypted: true
          }
        },
        {
          id: 'msg-2',
          type: 'assistant',
          content: 'I\'d be happy to help you analyze liability limitation clauses. These clauses are designed to restrict or eliminate one party\'s liability for certain types of damages or losses. To provide the most accurate analysis, could you share the specific clause you\'d like me to review?\n\nIn general, liability limitation clauses typically address:\n\n1. **Types of damages excluded** (consequential, incidental, punitive)\n2. **Monetary caps** on liability amounts\n3. **Time limitations** for claims\n4. **Specific exclusions** for certain types of losses\n\nThe enforceability of these clauses depends on several factors including jurisdiction, the nature of the contract, and whether the limitation is reasonable and fair.',
          timestamp: new Date('2024-01-15T10:01:30'),
          status: 'completed',
          metadata: {
            modelUsed: 'Llama 2 7B Chat',
            tokensUsed: 186,
            responseTime: 1250,
            temperature: 0.7,
            storedLocally: true,
            encrypted: true
          }
        }
      ];

      setMessages(mockMessages);
      setCurrentSession(session);
      onSessionChange?.(session);
    } catch (error) {
      console.error('Failed to load session:', error);
    }
  };

  const createNewSession = async () => {
    const newSession: ChatSession = {
      id: `session-${Date.now()}`,
      name: `New Chat ${new Date().toLocaleDateString()}`,
      createdAt: new Date(),
      lastModified: new Date(),
      messageCount: 0,
      modelUsed: currentModel || 'No model selected',
      isEncrypted: encryptionEnabled,
      localPath: `/home/.bear_ai/sessions/session-${Date.now()}.json`,
      size: 0,
      metadata: {
        tags: [],
        archived: false
      }
    };

    setSessions(prev => [newSession, ...prev]);
    setCurrentSession(newSession);
    setMessages([]);
    onSessionChange?.(newSession);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentInput.trim() || isGenerating) return;
    
    if (!currentModel) {
      onModelRequired?.();
      return;
    }

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}-user`,
      type: 'user',
      content: currentInput.trim(),
      timestamp: new Date(),
      status: 'completed',
      metadata: {
        storedLocally: true,
        encrypted: encryptionEnabled
      }
    };

    setMessages(prev => [...prev, userMessage]);
    setCurrentInput('');
    setIsGenerating(true);

    // Create assistant message placeholder
    const assistantMessage: ChatMessage = {
      id: `msg-${Date.now()}-assistant`,
      type: 'assistant',
      content: '',
      timestamp: new Date(),
      status: 'generating',
      isStreaming: true,
      metadata: {
        modelUsed: currentModel,
        storedLocally: true,
        encrypted: encryptionEnabled
      }
    };

    setMessages(prev => [...prev, assistantMessage]);

    try {
      // Create abort controller for this request
      abortControllerRef.current = new AbortController();
      const startTime = Date.now();

      // Simulate streaming response
      await simulateStreamingResponse(assistantMessage.id, userMessage.content, {
        model: currentModel,
        signal: abortControllerRef.current.signal,
        onToken: (token: string) => {
          setMessages(prev => prev.map(msg => 
            msg.id === assistantMessage.id 
              ? { ...msg, content: msg.content + token }
              : msg
          ));
        },
        onComplete: (finalContent: string, tokensUsed: number) => {
          const responseTime = Date.now() - startTime;
          setMessages(prev => prev.map(msg => 
            msg.id === assistantMessage.id 
              ? { 
                  ...msg, 
                  content: finalContent, 
                  status: 'completed',
                  isStreaming: false,
                  metadata: {
                    ...msg.metadata,
                    tokensUsed,
                    responseTime,
                    temperature: 0.7
                  }
                }
              : msg
          ));
        }
      });

      // Save to local storage
      await saveSessionToLocal();

    } catch (error) {
      if (error.name !== 'AbortError') {
        setMessages(prev => prev.map(msg => 
          msg.id === assistantMessage.id 
            ? { 
                ...msg, 
                status: 'error', 
                error: 'Failed to generate response. Check your model and try again.',
                isStreaming: false
              }
            : msg
        ));
        console.error('Generation error:', error);
      }
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  };

  const simulateStreamingResponse = async (
    messageId: string, 
    prompt: string, 
    options: {
      model: string;
      signal: AbortSignal;
      onToken: (token: string) => void;
      onComplete: (content: string, tokens: number) => void;
    }
  ) => {
    // Simulate a realistic legal AI response
    const response = `Based on the contract clause you mentioned, here are the key considerations for liability limitations:

## Legal Analysis

**Enforceability Factors:**
1. **Reasonableness Test** - Courts examine whether the limitation is fair and reasonable given the circumstances
2. **Mutual Benefit** - Both parties should receive some benefit from the limitation
3. **Clear Language** - The limitation must be clearly stated and unambiguous

**Common Issues:**
- Gross negligence exclusions are often unenforceable
- Consumer contracts face stricter scrutiny
- Industry standards may influence interpretation

**Recommendations:**
- Review jurisdictional case law on similar clauses
- Consider reciprocal limitations for fairness
- Ensure adequate insurance coverage for remaining liability

Would you like me to analyze the specific language of your clause in more detail?`;

    const tokens = response.split(' ');
    let fullContent = '';

    for (let i = 0; i < tokens.length; i++) {
      if (options.signal.aborted) throw new Error('AbortError');

      const token = (i === 0 ? '' : ' ') + tokens[i];
      fullContent += token;
      options.onToken(token);

      // Simulate realistic streaming delay
      await new Promise(resolve => setTimeout(resolve, 30 + Math.random() * 50));
    }

    options.onComplete(fullContent, tokens.length);
  };

  const stopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsGenerating(false);
    }
  };

  const saveSessionToLocal = async () => {
    try {
      // In real implementation, this would:
      // - Save to IndexedDB/localStorage
      // - Encrypt sensitive data
      // - Compress large conversations
      // - Update session metadata
      
      if (currentSession) {
        const updatedSession = {
          ...currentSession,
          lastModified: new Date(),
          messageCount: messages.length,
          size: JSON.stringify(messages).length
        };

        setSessions(prev => prev.map(s => s.id === currentSession.id ? updatedSession : s));
        setCurrentSession(updatedSession);
      }
    } catch (error) {
      console.error('Failed to save session:', error);
    }
  };

  const copyMessage = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
    } catch (error) {
      console.error('Failed to copy message:', error);
    }
  };

  const exportSession = async () => {
    if (!currentSession) return;

    try {
      const sessionData = {
        session: currentSession,
        messages: messages,
        exportedAt: new Date().toISOString(),
        version: '1.0'
      };

      const blob = new Blob([JSON.stringify(sessionData, null, 2)], { 
        type: 'application/json' 
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bear-ai-chat-${currentSession.id}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export session:', error);
    }
  };

  const deleteMessage = (messageId: string) => {
    setMessages(prev => prev.filter(msg => msg.id !== messageId));
  };

  const formatBytes = (bytes: number): string => {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatTimestamp = (date: Date): string => {
    return new Intl.DateTimeFormat('default', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(date);
  };

  return (
    <div className={`flex flex-col h-full max-h-[800px] ${className}`}>
      {/* Header */}
      <Card className="flex-none">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              {currentSession?.name || 'New Chat'}
              {encryptionEnabled && <Lock className="w-4 h-4 text-green-500" />}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant={currentModel ? 'default' : 'secondary'}>
                {currentModel || 'No model'}
              </Badge>
              <Button variant="outline" size="sm" onClick={() => setShowSettings(!showSettings)}>
                <Settings className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowSessionList(!showSessionList)}>
                <Database className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={createNewSession}>
                <MessageSquare className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Storage usage indicator */}
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4" />
              <span>Local: {formatBytes(localStorageUsage.used)} / {formatBytes(localStorageUsage.total)}</span>
              <Progress 
                value={(localStorageUsage.used / localStorageUsage.total) * 100} 
                className="w-20 h-2"
              />
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Shield className="w-4 h-4" />
              <span>All data stored locally</span>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Messages */}
      <Card className="flex-1 flex flex-col min-h-0">
        <CardContent className="flex-1 overflow-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <Brain className="w-16 h-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Start a conversation</h3>
              <p className="text-muted-foreground mb-4 max-w-md">
                Ask questions, analyze documents, or get legal research assistance. 
                All conversations are stored locally on your device.
              </p>
              {!currentModel && (
                <Button variant="outline" onClick={onModelRequired}>
                  <AlertCircle className="w-4 h-4 mr-2" />
                  Select a model to begin
                </Button>
              )}
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-4 ${
                      message.type === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    } ${message.status === 'error' ? 'border border-destructive' : ''}`}
                  >
                    {/* Message content */}
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                      {message.content || (message.isStreaming ? 'Thinking...' : '')}
                    </div>

                    {/* Error message */}
                    {message.error && (
                      <div className="mt-2 text-sm text-destructive">
                        <AlertCircle className="w-4 h-4 inline mr-1" />
                        {message.error}
                      </div>
                    )}

                    {/* Metadata */}
                    <div className="flex items-center justify-between mt-3 text-xs opacity-70">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3 h-3" />
                        <span>{formatTimestamp(message.timestamp)}</span>
                        {showMetadata && message.metadata && (
                          <>
                            {message.metadata.tokensUsed && (
                              <Badge variant="outline" className="text-xs">
                                {message.metadata.tokensUsed} tokens
                              </Badge>
                            )}
                            {message.metadata.responseTime && (
                              <Badge variant="outline" className="text-xs">
                                {message.metadata.responseTime}ms
                              </Badge>
                            )}
                          </>
                        )}
                        <div className="flex items-center gap-1">
                          {message.metadata?.storedLocally && <HardDrive className="w-3 h-3" />}
                          {message.metadata?.encrypted && <Lock className="w-3 h-3" />}
                        </div>
                      </div>

                      {/* Message actions */}
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => copyMessage(message.content)}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => deleteMessage(message.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </CardContent>
      </Card>

      {/* Input */}
      <Card className="flex-none">
        <CardContent className="p-4">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <div className="flex-1">
              <Textarea
                ref={textareaRef}
                value={currentInput}
                onChange={(e) => setCurrentInput(e.target.value)}
                placeholder={currentModel ? "Ask a question or request analysis..." : "Please select a model first"}
                disabled={!currentModel || isGenerating}
                rows={3}
                className="resize-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled
                className="h-10"
              >
                <Paperclip className="w-4 h-4" />
              </Button>
              {isGenerating ? (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={stopGeneration}
                  className="h-10"
                >
                  <StopCircle className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={!currentInput.trim() || !currentModel}
                  className="h-10"
                >
                  <Send className="w-4 h-4" />
                </Button>
              )}
            </div>
          </form>

          {/* Quick actions */}
          <div className="flex items-center justify-between mt-3 text-sm">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAutoScroll(!autoScroll)}
              >
                <Zap className={`w-4 h-4 mr-1 ${autoScroll ? 'text-green-500' : ''}`} />
                Auto-scroll: {autoScroll ? 'On' : 'Off'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowMetadata(!showMetadata)}
              >
                {showMetadata ? <EyeOff className="w-4 h-4 mr-1" /> : <Eye className="w-4 h-4 mr-1" />}
                {showMetadata ? 'Hide' : 'Show'} metadata
              </Button>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={exportSession}>
                <Download className="w-4 h-4 mr-1" />
                Export
              </Button>
              <span className="text-muted-foreground">
                {messages.length} messages
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LocalChatInterface;