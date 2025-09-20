import React, { useState, useRef, useEffect } from 'react';
import './MessageList.css';
import { Message } from '../../../types/chat';
import MessageComponent from './MessageComponent';
import MessageThread from './MessageThread';

interface MessageListProps {
  messages: Message[];
  currentUserId: string;
  onReaction: (messageId: string, emoji: string) => void;
  onRemoveReaction: (messageId: string, emoji: string) => void;
  onEdit: (messageId: string, newContent: string) => void;
  onSpeak: (message: Message) => void;
  isMobile: boolean;
}

const MessageList: React.FC<MessageListProps> = ({
  messages,
  currentUserId,
  onReaction,
  onRemoveReaction,
  onEdit,
  onSpeak,
  isMobile
}) => {
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null);
  const [threadView, setThreadView] = useState<string | null>(null);
  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);

  // Group messages by threads and date
  const processedMessages = React.useMemo(() => {
    const groups: Array<{
      type: 'date' | 'messages' | 'thread';
      content: string | Message[];
      threadId?: string;
    }> = [];
    
    let currentDate = '';
    const messagesByThread = new Map<string, Message[]>();
    const mainMessages: Message[] = [];

    // Separate threaded and main messages
    messages.forEach(message => {
      if (message.parentMessageId) {
        const threadId = message.parentMessageId;
        if (!messagesByThread.has(threadId)) {
          messagesByThread.set(threadId, []);
        }
        messagesByThread.get(threadId)!.push(message);
      } else {
        mainMessages.push(message);
      }
    });

    // Process main messages and insert threads
    mainMessages.forEach((message, index) => {
      const messageDate = new Date(message.timestamp).toDateString();
      
      // Add date separator if needed
      if (messageDate !== currentDate) {
        currentDate = messageDate;
        groups.push({
          type: 'date',
          content: messageDate
        });
      }

      // Add the main message
      groups.push({
        type: 'messages',
        content: [message]
      });

      // Add thread if this message has replies
      const threadMessages = messagesByThread.get(message.id);
      if (threadMessages && threadMessages.length > 0) {
        groups.push({
          type: 'thread',
          content: threadMessages,
          threadId: message.id
        });
      }
    });

    return groups;
  }, [messages]);

  const handleMessageClick = (messageId: string) => {
    if (selectedMessage === messageId) {
      setSelectedMessage(null);
    } else {
      setSelectedMessage(messageId);
    }
  };

  const handleReply = (messageId: string, content: string) => {
    // This would create a threaded reply
    const replyMessage: Partial<Message> = {
      content,
      parentMessageId: messageId,
      type: 'text'
    };
    
    // In a real implementation, this would call a parent component method
    console.log('Reply to message:', messageId, replyMessage);
  };

  const scrollToMessage = (messageId: string) => {
    const element = messageRefs.current.get(messageId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      // Highlight the message briefly
      element.classList.add('highlighted');
      setTimeout(() => {
        element.classList.remove('highlighted');
      }, 2000);
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
  };

  // Virtual scrolling for performance with large message lists
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 50 });
  
  useEffect(() => {
    if (!containerRef.current) return;

    const handleScroll = () => {
      const container = containerRef.current!;
      const scrollTop = container.scrollTop;
      const containerHeight = container.clientHeight;
      const messageHeight = 100; // Approximate message height
      
      const start = Math.max(0, Math.floor(scrollTop / messageHeight) - 10);
      const end = Math.min(
        processedMessages.length,
        Math.ceil((scrollTop + containerHeight) / messageHeight) + 10
      );
      
      setVisibleRange({ start, end });
    };

    const container = containerRef.current;
    container.addEventListener('scroll', handleScroll);
    handleScroll(); // Initial calculation

    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [processedMessages.length]);

  return (
    <div ref={containerRef} className="message-list">
      {processedMessages.map((group, index) => {
        // Virtual scrolling optimization
        if (index < visibleRange.start || index > visibleRange.end) {
          return <div key={index} style={{ height: '100px' }} />; // Placeholder
        }

        if (group.type === 'date') {
          return (
            <div key={`date-${index}`} className="date-separator">
              <div className="date-line">
                <span className="date-text">{formatDate(group.content as string)}</span>
              </div>
            </div>
          );
        }

        if (group.type === 'thread') {
          return (
            <MessageThread
              key={`thread-${group.threadId}`}
              messages={group.content as Message[]}
              parentId={group.threadId!}
              currentUserId={currentUserId}
              onReaction={onReaction}
              onRemoveReaction={onRemoveReaction}
              onEdit={onEdit}
              onSpeak={onSpeak}
              onReply={handleReply}
              isMobile={isMobile}
              isExpanded={threadView === group.threadId}
              onToggleExpand={() => 
                setThreadView(threadView === group.threadId ? null : group.threadId!)
              }
            />
          );
        }

        // Regular messages
        const messageGroup = group.content as Message[];
        return messageGroup.map((message) => (
          <MessageComponent
            key={message.id}
            message={message}
            isOwn={message.userId === currentUserId}
            isSelected={selectedMessage === message.id}
            onReaction={onReaction}
            onRemoveReaction={onRemoveReaction}
            onEdit={onEdit}
            onSpeak={onSpeak}
            onReply={(content) => handleReply(message.id, content)}
            onClick={() => handleMessageClick(message.id)}
            isMobile={isMobile}
            ref={(el) => {
              if (el) {
                messageRefs.current.set(message.id, el);
              } else {
                messageRefs.current.delete(message.id);
              }
            }}
          />
        ));
      })}

      {/* Scroll to bottom button */}
      {messages.length > 0 && (
        <button
          className="scroll-to-bottom"
          onClick={() => {
            if (containerRef.current) {
              containerRef.current.scrollTop = containerRef.current.scrollHeight;
            }
          }}
        >
          ↓
        </button>
      )}

      {/* Thread view overlay for mobile */}
      {threadView && isMobile && (
        <div className="thread-overlay">
          <div className="thread-overlay-header">
            <button onClick={() => setThreadView(null)}>← Back</button>
            <span>Thread</span>
          </div>
          <MessageThread
            messages={messages.filter(m => m.parentMessageId === threadView)}
            parentId={threadView}
            currentUserId={currentUserId}
            onReaction={onReaction}
            onRemoveReaction={onRemoveReaction}
            onEdit={onEdit}
            onSpeak={onSpeak}
            onReply={handleReply}
            isMobile={isMobile}
            isExpanded={true}
            onToggleExpand={() => {}}
            isOverlay={true}
          />
        </div>
      )}
    </div>
  );
};

export default MessageList;