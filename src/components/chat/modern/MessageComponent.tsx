import React, { useState, forwardRef, useRef, useEffect } from 'react';
import { Message } from '../../../types/chat';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';
import './MessageComponent.css';

interface MessageComponentProps {
  message: Message;
  isOwn: boolean;
  isSelected: boolean;
  onReaction: (messageId: string, emoji: string) => void;
  onRemoveReaction: (messageId: string, emoji: string) => void;
  onEdit: (messageId: string, newContent: string) => void;
  onSpeak: (message: Message) => void;
  onReply: (content: string) => void;
  onClick: () => void;
  isMobile: boolean;
}

const MessageComponent = forwardRef<HTMLDivElement, MessageComponentProps>(({
  message,
  isOwn,
  isSelected,
  onReaction,
  onRemoveReaction,
  onEdit,
  onSpeak,
  onReply,
  onClick,
  isMobile
}, ref) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [showReactions, setShowReactions] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showAttachments, setShowAttachments] = useState(false);
  const editInputRef = useRef<HTMLTextAreaElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const commonEmojis = ['👍', '👎', '❤️', '😂', '😮', '😢', '😡', '🔥', '💯', '👀'];

  useEffect(() => {
    if (isEditing && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.setSelectionRange(editContent.length, editContent.length);
    }
  }, [isEditing, editContent.length]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleEdit = () => {
    if (!isOwn) return;
    setIsEditing(true);
    setShowMenu(false);
  };

  const handleSaveEdit = () => {
    if (editContent.trim() !== message.content) {
      onEdit(message.id, editContent.trim());
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditContent(message.content);
    setIsEditing(false);
  };

  const handleReactionClick = (emoji: string) => {
    const existingReaction = message.reactions.find(r => r.emoji === emoji && r.userId === message.userId);
    if (existingReaction) {
      onRemoveReaction(message.id, emoji);
    } else {
      onReaction(message.id, emoji);
    }
    setShowReactions(false);
  };

  const formatTime = (date: Date): string => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  const renderContent = () => {
    if (isEditing) {
      return (
        <div className="edit-container">
          <textarea
            ref={editInputRef}
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            onKeyDown={handleKeyDown}
            className="edit-input"
            rows={Math.min(Math.max(editContent.split('\n').length, 2), 10)}
          />
          <div className="edit-actions">
            <button onClick={handleSaveEdit} className="save-btn">Save</button>
            <button onClick={handleCancelEdit} className="cancel-btn">Cancel</button>
          </div>
        </div>
      );
    }

    switch (message.type) {
      case 'code':
        return (
          <div className="code-message">
            {message.metadata?.codeBlocks?.map((block, index) => (
              <div key={index} className="code-block">
                <div className="code-header">
                  <span className="language">{block.language}</span>
                  <button 
                    onClick={() => navigator.clipboard.writeText(block.code)}
                    className="copy-btn"
                  >
                    📋 Copy
                  </button>
                </div>
                <SyntaxHighlighter
                  language={block.language}
                  style={tomorrow}
                  customStyle={{ margin: 0, borderRadius: '4px' }}
                >
                  {block.code}
                </SyntaxHighlighter>
              </div>
            )) || (
              <SyntaxHighlighter
                language="text"
                style={tomorrow}
                customStyle={{ margin: 0, borderRadius: '4px' }}
              >
                {message.content}
              </SyntaxHighlighter>
            )}
          </div>
        );

      case 'file':
        return (
          <div className="file-message">
            <div className="file-content">
              <ReactMarkdown
                components={{
                  code({ node, inline, className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || '');
                    return !inline && match ? (
                      <SyntaxHighlighter
                        style={tomorrow}
                        language={match[1]}
                        PreTag="div"
                        {...props}
                      >
                        {String(children).replace(/\n$/, '')}
                      </SyntaxHighlighter>
                    ) : (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    );
                  }
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
            
            {message.attachments.length > 0 && (
              <div className="attachments">
                <button 
                  onClick={() => setShowAttachments(!showAttachments)}
                  className="attachments-toggle"
                >
                  📎 {message.attachments.length} attachment{message.attachments.length > 1 ? 's' : ''}
                </button>
                
                {showAttachments && (
                  <div className="attachment-list">
                    {message.attachments.map((attachment) => (
                      <div key={attachment.id} className="attachment-item">
                        {attachment.type === 'image' ? (
                          <img 
                            src={attachment.url} 
                            alt={attachment.name}
                            className="attachment-preview"
                            loading="lazy"
                          />
                        ) : (
                          <div className="file-attachment">
                            <span className="file-icon">📄</span>
                            <div className="file-info">
                              <div className="file-name">{attachment.name}</div>
                              <div className="file-size">
                                {(attachment.size / 1024).toFixed(1)} KB
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );

      case 'system':
        return (
          <div className="system-message-content">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        );

      default:
        return (
          <div className="text-message">
            <ReactMarkdown
              components={{
                code({ node, inline, className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || '');
                  return !inline && match ? (
                    <SyntaxHighlighter
                      style={tomorrow}
                      language={match[1]}
                      PreTag="div"
                      {...props}
                    >
                      {String(children).replace(/\n$/, '')}
                    </SyntaxHighlighter>
                  ) : (
                    <code className={className} {...props}>
                      {children}
                    </code>
                  );
                }
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        );
    }
  };

  const reactionGroups = React.useMemo(() => {
    const groups = new Map<string, typeof message.reactions>();
    
    message.reactions.forEach(reaction => {
      if (!groups.has(reaction.emoji)) {
        groups.set(reaction.emoji, []);
      }
      groups.get(reaction.emoji)!.push(reaction);
    });
    
    return Array.from(groups.entries()).map(([emoji, reactions]) => ({
      emoji,
      count: reactions.length,
      users: reactions.map(r => r.username),
      hasCurrentUser: reactions.some(r => r.userId === message.userId)
    }));
  }, [message.reactions, message.userId]);

  return (
    <div
      ref={ref}
      id={`message-${message.id}`}
      className={`message ${isOwn ? 'own' : 'other'} ${message.type} ${isSelected ? 'selected' : ''}`}
      onClick={onClick}
    >
      <div className="message-header">
        {!isOwn && (
          <div className="user-info">
            <div className="avatar">
              {message.username.charAt(0).toUpperCase()}
            </div>
            <span className="username">{message.username}</span>
          </div>
        )}
        
        <div className="message-time">
          {formatTime(message.timestamp)}
          {message.isEdited && <span className="edited-indicator">(edited)</span>}
        </div>
        
        <div className="message-actions" ref={menuRef}>
          <button 
            className="menu-trigger"
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
          >
            ⋮
          </button>
          
          {showMenu && (
            <div className="message-menu">
              <button onClick={() => onSpeak(message)}>🔊 Speak</button>
              <button onClick={() => navigator.clipboard.writeText(message.content)}>
                📋 Copy
              </button>
              <button onClick={() => onReply(message.content)}>↩️ Reply</button>
              {isOwn && (
                <>
                  <button onClick={handleEdit}>✏️ Edit</button>
                  <button onClick={() => {/* Handle delete */}}>🗑️ Delete</button>
                </>
              )}
              <button onClick={() => setShowReactions(!showReactions)}>
                😊 React
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="message-content">
        {renderContent()}
      </div>

      {/* Reactions */}
      {reactionGroups.length > 0 && (
        <div className="message-reactions">
          {reactionGroups.map(({ emoji, count, users, hasCurrentUser }) => (
            <button
              key={emoji}
              className={`reaction ${hasCurrentUser ? 'own-reaction' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                handleReactionClick(emoji);
              }}
              title={users.join(', ')}
            >
              {emoji} {count}
            </button>
          ))}
          
          <button 
            className="add-reaction"
            onClick={(e) => {
              e.stopPropagation();
              setShowReactions(!showReactions);
            }}
          >
            +
          </button>
        </div>
      )}

      {/* Reaction Picker */}
      {showReactions && (
        <div className="reaction-picker">
          {commonEmojis.map(emoji => (
            <button
              key={emoji}
              className="reaction-option"
              onClick={() => handleReactionClick(emoji)}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Thread indicator */}
      {message.parentMessageId && (
        <div className="thread-indicator">
          ↳ Reply to thread
        </div>
      )}
    </div>
  );
});

MessageComponent.displayName = 'MessageComponent';

export default MessageComponent;