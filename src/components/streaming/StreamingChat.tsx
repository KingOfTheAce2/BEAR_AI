import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ConnectionStatus } from './ConnectionStatus';
import { StreamingMessage } from './StreamingMessage';
import { StreamingMessage as IStreamingMessage, StreamingOptions } from '../../types/streaming';
import { TypingIndicator, StreamingProgress } from './StreamingMessage';
import { useStreaming } from '../../hooks/useStreaming';

interface StreamingChatProps {
  autoConnect?: boolean;
  showConnectionStatus?: boolean;
  showMetrics?: boolean;
  maxMessages?: number;
  streamingOptions?: Partial<StreamingOptions>;
  onMessageSent?: (message: string) => void;
  onMessageReceived?: (message: IStreamingMessage) => void;
  className?: string;
}

export const StreamingChat: React.FC<StreamingChatProps> = ({
  autoConnect = true,
  showConnectionStatus = true,
  showMetrics = false,
  maxMessages = 100,
  streamingOptions = {},
  onMessageSent,
  onMessageReceived,
  className = ''
}) => {
  const [messages, setMessages] = useState<IStreamingMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isInputDisabled, setIsInputDisabled] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [streamingProgress, setStreamingProgress] = useState(0);

  const {
    isConnected,
    connectionState,
    isStreaming,
    currentMessage,
    error,
    connect,
    disconnect,
    streamMessage,
    clearError,
    metrics
  } = useStreaming({ 
    autoConnect,
    onError: (err) => {
      // Error logging disabled for production
    }
  });

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentMessage]);

  // Focus input when connected
  useEffect(() => {
    if (isConnected && !isStreaming) {
      inputRef.current?.focus();
    }
  }, [isConnected, isStreaming]);

  // Handle current streaming message
  useEffect(() => {
    if (currentMessage && isStreaming) {
      const progress = Math.min(100, (currentMessage.length / 1000) * 100); // Rough progress estimation
      setStreamingProgress(progress);
    } else {
      setStreamingProgress(0);
    }
  }, [currentMessage, isStreaming]);

  const handleSendMessage = useCallback(async () => {
    if (!inputValue.trim() || !isConnected || isStreaming) {
      return;
    }

    const userMessage: IStreamingMessage = {
      id: `user_${Date.now()}`,
      content: inputValue.trim(),
      timestamp: new Date(),
      isComplete: true,
      type: 'user'
    };

    // Add user message to chat
    setMessages(prev => [...prev.slice(-maxMessages + 1), userMessage]);
    setInputValue('');
    setIsInputDisabled(true);
    
    onMessageSent?.(userMessage.content);

    try {
      // Start streaming response
      const response = await streamMessage(userMessage.content, streamingOptions);
      
      const assistantMessage: IStreamingMessage = {
        id: `assistant_${Date.now()}`,
        content: response,
        timestamp: new Date(),
        isComplete: true,
        type: 'assistant'
      };

      setMessages(prev => [...prev.slice(-maxMessages + 1), assistantMessage]);
      onMessageReceived?.(assistantMessage);
      
    } catch (err) {
      // Error logging disabled for production
      
      const errorMessage: IStreamingMessage = {
        id: `error_${Date.now()}`,
        content: `Error: ${err instanceof Error ? err.message : 'Failed to send message'}`,
        timestamp: new Date(),
        isComplete: true,
        type: 'system'
      };
      
      setMessages(prev => [...prev.slice(-maxMessages + 1), errorMessage]);
    } finally {
      setIsInputDisabled(false);
    }
  }, [inputValue, isConnected, isStreaming, streamMessage, streamingOptions, maxMessages, onMessageSent, onMessageReceived]);

  const getCurrentStreamingMessage = (): IStreamingMessage | null => {
    if (!isStreaming || !currentMessage) return null;
    
    return {
      id: `streaming_${Date.now()}`,
      content: currentMessage,
      timestamp: new Date(),
      isComplete: false,
      type: 'assistant'
    };
  };

  const streamingMessage = getCurrentStreamingMessage();

  return (
    <div className={`streaming-chat flex flex-col h-full ${className}`}>
      {/* Connection Status */}
      {showConnectionStatus && (
        <div className="border-b border-gray-200 dark:border-gray-700 p-3">
          <ConnectionStatus
            connectionState={connectionState}
            error={error}
            onReconnect={connect}
            onDismissError={clearError}
            showDetails={false}
          />
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && !isStreaming && (
          <div className="text-center text-gray-500 dark:text-gray-400 py-8">
            <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p>Start a conversation by typing a message below.</p>
          </div>
        )}

        {messages.map((message) => (
          <StreamingMessage
            key={message.id}
            message={message}
            showTimestamp={true}
          />
        ))}

        {/* Current streaming message */}
        {streamingMessage && (
          <StreamingMessage
            message={streamingMessage}
            isStreaming={true}
            showTimestamp={false}
          />
        )}

        {/* Typing indicator when starting to stream */}
        {isStreaming && !currentMessage && (
          <TypingIndicator show={true} userName="BEAR AI" />
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Progress bar */}
      <StreamingProgress 
        progress={streamingProgress} 
        show={isStreaming} 
        className="mx-4"
      />

      {/* Input Area */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-4">
        <div className="flex space-x-2">
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  handleSendMessage();
                }
              }}
              disabled={isInputDisabled || !isConnected}
              placeholder={
                !isConnected 
                  ? "Connecting..." 
                  : isStreaming 
                    ? "AI is responding..." 
                    : "Type your message..."
              }
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
          
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || !isConnected || isStreaming}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded-lg transition-colors disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {isStreaming ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Sending</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                <span>Send</span>
              </>
            )}
          </button>
        </div>

        {/* Metrics */}
        {showMetrics && (
          <div className="mt-3 text-xs text-gray-500 dark:text-gray-400 flex space-x-4">
            <span>Messages: {metrics.messagesStreamed}</span>
            <span>Tokens: {metrics.totalTokens}</span>
            <span>Avg Latency: {Math.round(metrics.averageLatency)}ms</span>
            <span>Errors: {metrics.errorCount}</span>
            <span>Reconnects: {metrics.reconnectionCount}</span>
          </div>
        )}
      </div>
    </div>
  );
};

// Lightweight streaming chat for embedding
export const CompactStreamingChat: React.FC<{
  onMessage?: (message: string) => void;
  className?: string;
}> = ({ onMessage, className = '' }) => {
  const [input, setInput] = useState('');
  const { isConnected, streamMessage, isStreaming } = useStreaming({ autoConnect: true });

  const handleSend = async () => {
    if (!input.trim() || !isConnected || isStreaming) return;
    
    try {
      await streamMessage(input);
      onMessage?.(input);
      setInput('');
    } catch (error) {
      // Error logging disabled for production
    }
  };

  return (
    <div className={`compact-streaming-chat flex space-x-2 ${className}`}>
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyPress={(e) => e.key === 'Enter' && handleSend()}
        disabled={!isConnected || isStreaming}
        placeholder={isConnected ? "Ask BEAR AI..." : "Connecting..."}
        className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
      />
      <button
        onClick={handleSend}
        disabled={!input.trim() || !isConnected || isStreaming}
        className="px-3 py-2 text-sm bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded transition-colors"
      >
        {isStreaming ? '...' : 'Send'}
      </button>
    </div>
  );
};