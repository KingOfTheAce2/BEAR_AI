/**
 * Offline-first Chat Interface Component
 * Provides seamless chat experience with local storage and offline capabilities
 */

import React, { useState, useEffect, useRef } from 'react';
import { chatSessionService, ChatSession } from '../../services/chatSessions';
import { ChatMessage } from '../../services/localChatHistory';
import LocalChatHistory from './LocalChatHistory';

interface OfflineChatInterfaceProps {
  className?: string;
  onMessageSend?: (message: string) => Promise<string>;
  systemPrompt?: string;
}

export const OfflineChatInterface: React.FC<OfflineChatInterfaceProps> = ({
  className = '',
  onMessageSend,
  systemPrompt
}) => {
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showHistory, setShowHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Initialize service and load current session
  useEffect(() => {
    initializeChatInterface();

    // Listen for online/offline status
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-focus input
  useEffect(() => {
    if (!isLoading && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isLoading]);

  const initializeChatInterface = async () => {
    try {
      await chatSessionService.initialize();
      
      // Load current session or create new one
      const current = chatSessionService.getCurrentSession();
      if (current) {
        await loadSession(current);
      } else {
        await createNewSession();
      }
    } catch (err) {
      // Error logging disabled for production
      setError('Failed to initialize chat. Some features may not work.');
    }
  };

  const createNewSession = async () => {
    try {
      const session = await chatSessionService.createSession(
        `Chat ${new Date().toLocaleString()}`,
        { systemPrompt }
      );
      setCurrentSession(session);
      setMessages([]);

      // Add system message if provided
      if (systemPrompt) {
        await chatSessionService.addMessage(systemPrompt, 'system');
        const updatedMessages = await chatSessionService.getSessionMessages(session.id);
        setMessages(updatedMessages);
      }
    } catch (err) {
      // Error logging disabled for production
      setError('Failed to create new chat session');
    }
  };

  const loadSession = async (session: ChatSession) => {
    try {
      setCurrentSession(session);
      const sessionMessages = await chatSessionService.getSessionMessages(session.id);
      setMessages(sessionMessages);
      await chatSessionService.switchSession(session.id);
    } catch (err) {
      // Error logging disabled for production
      setError('Failed to load chat session');
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !currentSession || isLoading) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    setIsLoading(true);
    setError(null);

    try {
      // Add user message to local storage immediately
      const addedMessage = await chatSessionService.addMessage(userMessage, 'user');
      if (addedMessage) {
        setMessages(prev => [...prev, addedMessage]);
      }

      // Get AI response if handler is provided and online
      if (onMessageSend && !isOffline) {
        try {
          const response = await onMessageSend(userMessage);
          
          // Add AI response to local storage
          const responseMessage = await chatSessionService.addMessage(response, 'assistant');
          if (responseMessage) {
            setMessages(prev => [...prev, responseMessage]);
          }
        } catch (aiError) {
          // Error logging disabled for production
          
          // Add error message locally
          const errorMessage = await chatSessionService.addMessage(
            'Sorry, I encountered an error processing your request. Please try again.',
            'assistant',
            { error: true }
          );
          if (errorMessage) {
            setMessages(prev => [...prev, errorMessage]);
          }
        }
      } else if (isOffline) {
        // Add offline notice
        const offlineMessage = await chatSessionService.addMessage(
          'You are currently offline. This message has been saved locally and will be processed when you reconnect.',
          'system',
          { offline: true }
        );
        if (offlineMessage) {
          setMessages(prev => [...prev, offlineMessage]);
        }
      }
    } catch (err) {
      // Error logging disabled for production
      setError('Failed to send message. It may have been saved locally.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement> = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatMessageTime = (timestamp: Date | string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getMessageIcon = (role: ChatMessage['role'], metadata?: ChatMessage['metadata']) => {
    if (metadata?.error) return '❌';
    if (metadata?.offline) return '📱';
    
    switch (role) {
      case 'user': return '👤';
      case 'assistant': return '🤖';
      case 'system': return 'ℹ️';
      default: return '💬';
    }
  };

  return (
    <div className={`offline-chat-interface ${className}`}>
      {/* Header */}
      <div className="chat-header">
        <div className="session-info">
          <h3>{currentSession?.title || 'New Chat'}</h3>
          <div className="connection-status">
            <span className={`status-dot ${isOffline ? 'offline' : 'online'}`}></span>
            <span className="status-text">
              {isOffline ? 'Offline Mode' : 'Online'}
            </span>
          </div>
        </div>
        <div className="header-actions">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="history-toggle"
            title="Toggle chat history"
          >
            📚
          </button>
          <button
            onClick={createNewSession}
            className="new-chat-button"
            title="Start new chat"
          >
            ➕
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="chat-main">
        {/* Chat History Sidebar */}
        {showHistory && (
          <div className="history-sidebar">
            <LocalChatHistory
              onSessionSelect={loadSession}
              className="embedded-history"
            />
          </div>
        )}

        {/* Chat Area */}
        <div className="chat-area">
          {/* Error Display */}
          {error && (
            <div className="error-banner">
              <span>{error}</span>
              <button onClick={() => setError(null)}>✕</button>
            </div>
          )}

          {/* Messages */}
          <div className="messages-container">
            {messages.length === 0 ? (
              <div className="welcome-message">
                <div className="welcome-icon">🐻</div>
                <h4>Welcome to Bear AI</h4>
                <p>Start a conversation! Your messages are automatically saved locally for privacy and offline access.</p>
                {isOffline && (
                  <div className="offline-notice">
                    <span className="offline-icon">📱</span>
                    You're currently offline. Messages will be saved locally.
                  </div>
                )}
              </div>
            ) : (
              <div className="messages-list">
                {messages.map((message, index) => (
                  <div
                    key={message.id || index}
                    className={`message ${message.role} ${message.metadata?.error ? 'error' : ''} ${message.metadata?.offline ? 'offline' : ''}`}
                  >
                    <div className="message-icon">
                      {getMessageIcon(message.role, message.metadata)}
                    </div>
                    <div className="message-content">
                      <div className="message-text">
                        {message.content}
                      </div>
                      <div className="message-meta">
                        <span className="message-time">
                          {formatMessageTime(message.timestamp)}
                        </span>
                        {message.metadata?.model && (
                          <span className="message-model">
                            Model: {message.metadata.model}
                          </span>
                        )}
                        {message.metadata?.tokens && (
                          <span className="message-tokens">
                            Tokens: {message.metadata.tokens}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="message assistant loading">
                    <div className="message-icon">🤖</div>
                    <div className="message-content">
                      <div className="typing-indicator">
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="input-area">
            <div className="input-container">
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isOffline ? "Type your message (offline mode)..." : "Type your message..."}
                className="message-input"
                rows={3}
                disabled={isLoading}
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isLoading}
                className="send-button"
                title="Send message (Enter)"
              >
                {isLoading ? '⏳' : '📤'}
              </button>
            </div>
            <div className="input-footer">
              <div className="message-info">
                {isOffline && (
                  <span className="offline-indicator">
                    📱 Offline - messages saved locally
                  </span>
                )}
                {currentSession && (
                  <span className="session-indicator">
                    💾 Auto-saved to: {currentSession.title}
                  </span>
                )}
              </div>
              <div className="input-hints">
                <span>Press Enter to send, Shift+Enter for new line</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .offline-chat-interface {
          display: flex;
          flex-direction: column;
          height: 100vh;
          background: #f5f5f5;
        }

        .chat-header {
          background: white;
          padding: 1rem;
          border-bottom: 1px solid #e0e0e0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .session-info h3 {
          margin: 0 0 0.25rem 0;
          font-size: 1.125rem;
        }

        .connection-status {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #28a745;
        }

        .status-dot.offline {
          background: #dc3545;
        }

        .header-actions {
          display: flex;
          gap: 0.5rem;
        }

        .header-actions button {
          padding: 0.5rem;
          background: #f8f9fa;
          border: 1px solid #e0e0e0;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .header-actions button:hover {
          background: #e9ecef;
        }

        .chat-main {
          display: flex;
          flex: 1;
          overflow: hidden;
        }

        .history-sidebar {
          width: 300px;
          border-right: 1px solid #e0e0e0;
          background: white;
        }

        .chat-area {
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .error-banner {
          background: #f8d7da;
          color: #721c24;
          padding: 0.75rem 1rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .messages-container {
          flex: 1;
          overflow-y: auto;
          padding: 1rem;
        }

        .welcome-message {
          text-align: center;
          padding: 3rem 2rem;
          color: #666;
        }

        .welcome-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
        }

        .offline-notice {
          background: #fff3cd;
          color: #856404;
          padding: 1rem;
          border-radius: 8px;
          margin-top: 1rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .messages-list {
          max-width: 800px;
          margin: 0 auto;
        }

        .message {
          display: flex;
          gap: 0.75rem;
          margin-bottom: 1.5rem;
          align-items: flex-start;
        }

        .message.user {
          flex-direction: row-reverse;
        }

        .message.user .message-content {
          background: #007bff;
          color: white;
        }

        .message.assistant .message-content {
          background: white;
          border: 1px solid #e0e0e0;
        }

        .message.system .message-content {
          background: #f8f9fa;
          border: 1px solid #e0e0e0;
          font-style: italic;
        }

        .message.error .message-content {
          background: #f8d7da;
          color: #721c24;
          border: 1px solid #f5c6cb;
        }

        .message.offline .message-content {
          background: #fff3cd;
          color: #856404;
          border: 1px solid #ffeaa7;
        }

        .message-icon {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #f8f9fa;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.875rem;
          flex-shrink: 0;
        }

        .message-content {
          max-width: 70%;
          padding: 0.75rem 1rem;
          border-radius: 12px;
          word-wrap: break-word;
        }

        .message-text {
          white-space: pre-wrap;
          line-height: 1.4;
        }

        .message-meta {
          font-size: 0.75rem;
          opacity: 0.7;
          margin-top: 0.5rem;
          display: flex;
          gap: 1rem;
        }

        .loading .typing-indicator {
          display: flex;
          gap: 4px;
          align-items: center;
        }

        .typing-indicator span {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #999;
          animation: typing 1.4s infinite;
        }

        .typing-indicator span:nth-child(2) {
          animation-delay: 0.2s;
        }

        .typing-indicator span:nth-child(3) {
          animation-delay: 0.4s;
        }

        @keyframes typing {
          0%, 60%, 100% {
            transform: scale(1);
            opacity: 0.5;
          }
          30% {
            transform: scale(1.2);
            opacity: 1;
          }
        }

        .input-area {
          background: white;
          border-top: 1px solid #e0e0e0;
          padding: 1rem;
        }

        .input-container {
          display: flex;
          gap: 0.75rem;
          max-width: 800px;
          margin: 0 auto;
        }

        .message-input {
          flex: 1;
          padding: 0.75rem;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          resize: vertical;
          min-height: 80px;
          font-family: inherit;
          font-size: 1rem;
        }

        .message-input:focus {
          outline: none;
          border-color: #007bff;
        }

        .message-input:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .send-button {
          padding: 0.75rem 1rem;
          background: #007bff;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 1rem;
          align-self: flex-end;
        }

        .send-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .send-button:not(:disabled):hover {
          background: #0056b3;
        }

        .input-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 0.5rem;
          max-width: 800px;
          margin-left: auto;
          margin-right: auto;
          font-size: 0.75rem;
          color: #666;
        }

        .offline-indicator {
          color: #856404;
          font-weight: 500;
        }

        .session-indicator {
          color: #28a745;
        }

        .input-hints {
          font-style: italic;
        }

        @media (max-width: 768px) {
          .history-sidebar {
            position: fixed;
            left: 0;
            top: 0;
            height: 100vh;
            z-index: 1000;
            transform: translateX(-100%);
            transition: transform 0.3s ease;
          }

          .history-sidebar.show {
            transform: translateX(0);
          }

          .message-content {
            max-width: 85%;
          }

          .input-footer {
            flex-direction: column;
            gap: 0.25rem;
            align-items: flex-start;
          }
        }
      `}</style>
    </div>
  );
};

export default OfflineChatInterface;