import React, { useState } from 'react';
import { Message } from '../../../types/chat';
import MessageComponent from './MessageComponent';
import './MessageThread.css';

interface MessageThreadProps {
  messages: Message[];
  parentId: string;
  currentUserId: string;
  onReaction: (messageId: string, emoji: string) => void;
  onRemoveReaction: (messageId: string, emoji: string) => void;
  onEdit: (messageId: string, newContent: string) => void;
  onSpeak: (message: Message) => void;
  onReply: (parentId: string, content: string) => void;
  isMobile: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
  isOverlay?: boolean;
  key?: string;
}

const MessageThread: React.FC<MessageThreadProps> = ({
  messages,
  parentId,
  currentUserId,
  onReaction,
  onRemoveReaction,
  onEdit,
  onSpeak,
  onReply,
  isMobile,
  isExpanded,
  onToggleExpand,
  isOverlay = false
}) => {
  const [replyText, setReplyText] = useState('');
  const [showReplyInput, setShowReplyInput] = useState(false);

  const sortedMessages = React.useMemo(() => {
    return [...messages].sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }, [messages]);

  const handleReplySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (replyText.trim()) {
      onReply(parentId, replyText.trim());
      setReplyText('');
      setShowReplyInput(false);
    }
  };

  const previewMessages = isExpanded ? sortedMessages : sortedMessages.slice(0, 2);
  const hasMore = sortedMessages.length > 2;

  return (
    <div className={`message-thread ${isExpanded ? 'expanded' : 'collapsed'} ${isOverlay ? 'overlay' : ''}`}>
      <div className="thread-header">
        <div className="thread-info">
          <span className="thread-icon">🧵</span>
          <span className="thread-count">
            {sortedMessages.length} repl{sortedMessages.length === 1 ? 'y' : 'ies'}
          </span>
        </div>
        
        <div className="thread-actions">
          {!isOverlay && (
            <button 
              className="expand-toggle"
              onClick={onToggleExpand}
              aria-label={isExpanded ? 'Collapse thread' : 'Expand thread'}
            >
              {isExpanded ? '▼' : '▶'}
            </button>
          )}
        </div>
      </div>

      <div className="thread-messages">
        {previewMessages.map((message) => (
          <div key={message.id} className="thread-message">
            <MessageComponent
              message={message}
              isOwn={message.userId === currentUserId}
              isSelected={false}
              onReaction={onReaction}
              onRemoveReaction={onRemoveReaction}
              onEdit={onEdit}
              onSpeak={onSpeak}
              onReply={(content) => onReply(parentId, content)}
              onClick={() => {}}
              isMobile={isMobile}
            />
          </div>
        ))}

        {!isExpanded && hasMore && (
          <button 
            className="show-more-replies"
            onClick={onToggleExpand}
          >
            Show {sortedMessages.length - 2} more repl{sortedMessages.length - 2 === 1 ? 'y' : 'ies'}
          </button>
        )}
      </div>

      {isExpanded && (
        <div className="thread-reply">
          {showReplyInput ? (
            <form onSubmit={handleReplySubmit} className="reply-form">
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Reply to thread..."
                className="reply-input"
                rows={2}
                autoFocus
              />
              <div className="reply-actions">
                <button type="submit" disabled={!replyText.trim()}>
                  Reply
                </button>
                <button 
                  type="button" 
                  onClick={() => {
                    setShowReplyInput(false);
                    setReplyText('');
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button 
              className="reply-trigger"
              onClick={() => setShowReplyInput(true)}
            >
              💬 Reply to thread
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default MessageThread;