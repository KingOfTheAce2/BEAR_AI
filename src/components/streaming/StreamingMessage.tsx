import React, { useEffect, useState, useRef } from 'react';
import { StreamingMessage as IStreamingMessage } from '../../types/streaming';

interface StreamingMessageProps {
  message: IStreamingMessage;
  isStreaming?: boolean;
  showTimestamp?: boolean;
  className?: string;
  onComplete?: () => void;
}

export const StreamingMessage: React.FC<StreamingMessageProps> = ({
  message,
  isStreaming = false,
  showTimestamp = false,
  className = '',
  onComplete
}) => {
  const [displayedContent, setDisplayedContent] = useState('');
  const [showCursor, setShowCursor] = useState(true);
  const contentRef = useRef<HTMLDivElement>(null);
  const cursorIntervalRef = useRef<NodeJS.Timeout>();

  // Type-writer effect for streaming content
  useEffect(() => {
    if (!isStreaming) {
      setDisplayedContent(message.content);
      setShowCursor(false);
      onComplete?.();
      return;
    }

    const targetContent = message.content;
    const currentLength = displayedContent.length;
    
    if (currentLength < targetContent.length) {
      const timer = setTimeout(() => {
        setDisplayedContent(targetContent.slice(0, currentLength + 1));
      }, 30); // Typing speed

      return () => clearTimeout(timer);
    }
  }, [message.content, displayedContent, isStreaming, onComplete]);

  // Cursor blinking effect
  useEffect(() => {
    if (isStreaming) {
      cursorIntervalRef.current = setInterval(() => {
        setShowCursor(prev => !prev);
      }, 500);
    } else {
      setShowCursor(false);
      if (cursorIntervalRef.current) {
        clearInterval(cursorIntervalRef.current);
      }
    }

    return () => {
      if (cursorIntervalRef.current) {
        clearInterval(cursorIntervalRef.current);
      }
    };
  }, [isStreaming]);

  // Auto-scroll to bottom when content updates
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [displayedContent]);

  const getMessageTypeClass = () => {
    switch (message.type) {
      case 'user':
        return 'bg-blue-500 text-white ml-12';
      case 'assistant':
        return 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 mr-12';
      case 'system':
        return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 mx-8';
      default:
        return 'bg-gray-100 dark:bg-gray-800';
    }
  };

  const formatTimestamp = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(date);
  };

  return (
    <div className={`streaming-message ${className}`}>
      <div className={`rounded-lg p-4 mb-4 ${getMessageTypeClass()}`}>
        <div 
          ref={contentRef}
          className="streaming-content whitespace-pre-wrap break-words"
        >
          {displayedContent}
          {showCursor && (
            <span className="inline-block w-2 h-5 ml-1 bg-current animate-pulse">
              |
            </span>
          )}
        </div>
        
        {showTimestamp && (
          <div className="mt-2 text-xs opacity-60">
            {formatTimestamp(message.timestamp)}
            {message.metadata?.tokenCount && (
              <span className="ml-2">
                • {message.metadata.tokenCount} tokens
              </span>
            )}
            {message.metadata?.latency && (
              <span className="ml-2">
                • {message.metadata.latency}ms
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Loading dots component for when streaming starts
export const StreamingLoader: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`flex space-x-1 items-center ${className}`}>
      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
    </div>
  );
};

// Progress bar for streaming progress
interface StreamingProgressProps {
  progress: number; // 0-100
  show: boolean;
  className?: string;
}

export const StreamingProgress: React.FC<StreamingProgressProps> = ({
  progress,
  show,
  className = ''
}) => {
  if (!show) return null;

  return (
    <div className={`streaming-progress w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1 ${className}`}>
      <div
        className="bg-blue-500 h-1 rounded-full transition-all duration-300 ease-out"
        style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
      />
    </div>
  );
};

// Typing indicator component
export const TypingIndicator: React.FC<{ 
  show: boolean;
  userName?: string;
  className?: string;
}> = ({ show, userName = 'AI', className = '' }) => {
  if (!show) return null;

  return (
    <div className={`typing-indicator flex items-center space-x-2 p-3 text-gray-500 ${className}`}>
      <StreamingLoader />
      <span className="text-sm">{userName} is typing...</span>
    </div>
  );
};