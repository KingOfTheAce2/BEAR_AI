import React, { useState, useMemo } from 'react';
import { Thread, User } from '../../../types/chat';
import './ThreadSidebar.css';

interface ThreadSidebarProps {
  threads: Thread[];
  currentThread: Thread | null;
  users: Map<string, User>;
  onThreadSelect: (threadId: string) => void;
  onNewThread: () => void;
  onSearch: (query: string) => void;
  onExport: () => void;
  isMobile: boolean;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

const ThreadSidebar: React.FC<ThreadSidebarProps> = ({
  threads,
  currentThread,
  users,
  onThreadSelect,
  onNewThread,
  onSearch,
  onExport,
  isMobile,
  isCollapsed,
  onToggleCollapse
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'archived' | 'unread'>('all');
  const [showMenu, setShowMenu] = useState(false);

  const filteredThreads = useMemo(() => {
    let filtered = threads;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(thread =>
        thread.title.toLowerCase().includes(query) ||
        thread.messages.some(message =>
          message.content.toLowerCase().includes(query) ||
          message.username.toLowerCase().includes(query)
        )
      );
    }

    // Apply status filter
    switch (filter) {
      case 'archived':
        filtered = filtered.filter(thread => thread.isArchived);
        break;
      case 'unread':
        // For demo purposes, we'll consider threads with recent messages as unread
        filtered = filtered.filter(thread => {
          const lastMessage = thread.messages[thread.messages.length - 1];
          if (!lastMessage) return false;
          const hoursSinceLastMessage = (Date.now() - new Date(lastMessage.timestamp).getTime()) / (1000 * 60 * 60);
          return hoursSinceLastMessage < 24; // Unread if last message was within 24 hours
        });
        break;
      default:
        filtered = filtered.filter(thread => !thread.isArchived);
    }

    return filtered.sort((a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }, [threads, searchQuery, filter]);

  const getThreadPreview = (thread: Thread): string => {
    const lastMessage = thread.messages[thread.messages.length - 1];
    if (!lastMessage) return 'No messages';
    
    const content = lastMessage.content;
    return content.length > 50 ? content.substring(0, 50) + '...' : content;
  };

  const getTimeAgo = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'now';
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    return `${days}d`;
  };

  const handleThreadClick = (threadId: string) => {
    onThreadSelect(threadId);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onSearch(searchQuery);
    }
  };

  if (isCollapsed) {
    return (
      <div className="thread-sidebar collapsed">
        <button 
          className="expand-button"
          onClick={onToggleCollapse}
          title="Expand sidebar"
        >
          ▶
        </button>
        
        <div className="collapsed-actions">
          <button 
            className="new-thread-btn-collapsed"
            onClick={onNewThread}
            title="New thread"
          >
            +
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="thread-sidebar">
      {/* Header */}
      <div className="sidebar-header">
        <h1>Chat</h1>
        <div className="header-actions">
          <button 
            className="menu-toggle"
            onClick={() => setShowMenu(!showMenu)}
          >
            ⋮
          </button>
          {!isMobile && (
            <button 
              className="collapse-button"
              onClick={onToggleCollapse}
            >
              ◀
            </button>
          )}
        </div>
        
        {showMenu && (
          <div className="dropdown-menu">
            <button onClick={onExport}>Export Chat</button>
            <button onClick={() => {/* Handle import */}}>Import Chat</button>
            <button onClick={() => {/* Handle settings */}}>Settings</button>
          </div>
        )}
      </div>

      {/* Search */}
      <div className="sidebar-search">
        <form onSubmit={handleSearchSubmit}>
          <input
            type="text"
            placeholder="Search threads..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </form>
      </div>

      {/* Filter Tabs */}
      <div className="filter-tabs">
        <button
          className={filter === 'all' ? 'active' : ''}
          onClick={() => setFilter('all')}
        >
          All
        </button>
        <button
          className={filter === 'unread' ? 'active' : ''}
          onClick={() => setFilter('unread')}
        >
          Recent
        </button>
        <button
          className={filter === 'archived' ? 'active' : ''}
          onClick={() => setFilter('archived')}
        >
          Archived
        </button>
      </div>

      {/* New Thread Button */}
      <button className="new-thread-btn" onClick={onNewThread}>
        <span className="btn-icon">+</span>
        <span className="btn-text">New Thread</span>
      </button>

      {/* Thread List */}
      <div className="thread-list">
        {filteredThreads.length === 0 ? (
          <div className="no-threads">
            {searchQuery ? 'No threads found' : 'No threads yet'}
          </div>
        ) : (
          filteredThreads.map((thread) => (
            <div
              key={thread.id}
              className={`thread-item ${currentThread?.id === thread.id ? 'active' : ''}`}
              onClick={() => handleThreadClick(thread.id)}
            >
              <div className="thread-info">
                <div className="thread-title">{thread.title}</div>
                <div className="thread-preview">{getThreadPreview(thread)}</div>
              </div>
              
              <div className="thread-meta">
                <div className="thread-time">{getTimeAgo(thread.updatedAt)}</div>
                <div className="thread-indicators">
                  {thread.messages.length > 0 && (
                    <span className="message-count">{thread.messages.length}</span>
                  )}
                  {thread.isArchived && (
                    <span className="archived-indicator">📁</span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Online Users */}
      <div className="online-users">
        <h3>Online ({Array.from(users.values()).filter(u => u.isOnline).length})</h3>
        <div className="user-list">
          {Array.from(users.values())
            .filter(user => user.isOnline)
            .map((user) => (
              <div key={user.id} className="user-item">
                <div className="user-avatar">
                  {user.avatar ? (
                    <img src={user.avatar} alt={user.username} />
                  ) : (
                    <div className="avatar-placeholder">
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className={`presence-indicator ${user.presence}`} />
                </div>
                <span className="username">{user.username}</span>
                {user.isTyping && (
                  <span className="typing-indicator">✏️</span>
                )}
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );
};

export default ThreadSidebar;