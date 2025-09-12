/**
 * Local Chat History Component
 * Provides comprehensive chat history management with offline support
 */

import React, { useState, useEffect, useCallback } from 'react';
import { chatSessionService, ChatSession } from '../../services/chatSessions';
import { localChatHistoryService, ChatMessage, ChatSearchResult } from '../../services/localChatHistory';
import { LocalChatConfig, ChatExportOptions, LocalSearchOptions, StorageQuota, BackupManifest } from '../../types/localChatTypes';

interface LocalChatHistoryProps {
  onSessionSelect: (session: ChatSession) => void;
  onMessageClick?: (message: ChatMessage) => void;
  className?: string;
}

export const LocalChatHistory: React.FC<LocalChatHistoryProps> = ({
  onSessionSelect,
  onMessageClick,
  className = ''
}) => {
  const [sessions, setSessions] = useState<Array<ChatSession & { state: any }>>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ChatSearchResult[]>([]);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [storageStats, setStorageStats] = useState<any>(null);
  const [view, setView] = useState<'sessions' | 'search' | 'settings' | 'export'>('sessions');
  const [offlineStatus, setOfflineStatus] = useState(navigator.onLine);

  // Initialize component
  useEffect(() => {
    initializeHistoryService();
    
    // Listen for online/offline status
    const handleOnline = () => setOfflineStatus(true);
    const handleOffline = () => setOfflineStatus(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const initializeHistoryService = async () => {
    try {
      setIsLoading(true);
      await chatSessionService.initialize();
      await loadSessions();
      await loadStorageStats();
    } catch (err) {
      setError('Failed to initialize chat history service');
      console.error('Initialization error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSessions = async () => {
    try {
      const sessionsWithStates = await chatSessionService.getSessionsWithStates();
      setSessions(sessionsWithStates);
    } catch (err) {
      setError('Failed to load chat sessions');
      console.error('Load sessions error:', err);
    }
  };

  const loadStorageStats = async () => {
    try {
      const stats = await localChatHistoryService.getStorageStats();
      setStorageStats(stats);
    } catch (err) {
      console.error('Failed to load storage stats:', err);
    }
  };

  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const results = await localChatHistoryService.searchChats(query);
      setSearchResults(results);
      setView('search');
    } catch (err) {
      console.error('Search error:', err);
      setError('Search failed');
    }
  }, []);

  const handleSessionClick = (session: ChatSession) => {
    setSelectedSession(session.id);
    onSessionSelect(session);
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (confirm('Are you sure you want to delete this session? This action cannot be undone.')) {
      try {
        await chatSessionService.deleteSession(sessionId);
        await loadSessions();
      } catch (err) {
        setError('Failed to delete session');
        console.error('Delete session error:', err);
      }
    }
  };

  const handleExportData = async () => {
    try {
      const exportData = await chatSessionService.exportSessions();
      const blob = new Blob([exportData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bear-ai-chat-history-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError('Failed to export chat data');
      console.error('Export error:', err);
    }
  };

  const handleImportData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const result = await chatSessionService.importSessions(text);
      alert(`Import completed: ${result.imported} sessions imported, ${result.errors} errors`);
      await loadSessions();
    } catch (err) {
      setError('Failed to import chat data');
      console.error('Import error:', err);
    }
  };

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return d.toLocaleDateString();
    }
  };

  const formatSize = (bytes: number) => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  if (isLoading) {
    return (
      <div className={`local-chat-history loading ${className}`}>
        <div className="loading-spinner">Loading chat history...</div>
      </div>
    );
  }

  return (
    <div className={`local-chat-history ${className}`}>
      {/* Header */}
      <div className="chat-history-header">
        <div className="header-top">
          <h3>Chat History</h3>
          <div className="header-actions">
            <button 
              className={`status-indicator ${offlineStatus ? 'online' : 'offline'}`}
              title={offlineStatus ? 'Online' : 'Offline'}
            >
              {offlineStatus ? '🟢' : '🔴'}
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="search-container">
          <input
            type="text"
            placeholder="Search chat history..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch(searchQuery)}
            className="search-input"
          />
          <button 
            onClick={() => handleSearch(searchQuery)}
            className="search-button"
            disabled={!searchQuery.trim()}
          >
            🔍
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="nav-tabs">
          <button 
            className={view === 'sessions' ? 'active' : ''}
            onClick={() => setView('sessions')}
          >
            Sessions ({sessions.length})
          </button>
          <button 
            className={view === 'search' ? 'active' : ''}
            onClick={() => setView('search')}
            disabled={searchResults.length === 0}
          >
            Search ({searchResults.length})
          </button>
          <button 
            className={view === 'export' ? 'active' : ''}
            onClick={() => setView('export')}
          >
            Export
          </button>
          <button 
            className={view === 'settings' ? 'active' : ''}
            onClick={() => setView('settings')}
          >
            Settings
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="error-message">
          {error}
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {/* Content Area */}
      <div className="chat-history-content">
        {view === 'sessions' && (
          <div className="sessions-view">
            {sessions.length === 0 ? (
              <div className="empty-state">
                <p>No chat sessions found</p>
                <p className="empty-hint">Start a new conversation to create your first session</p>
              </div>
            ) : (
              <div className="sessions-list">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className={`session-item ${selectedSession === session.id ? 'selected' : ''}`}
                    onClick={() => handleSessionClick(session)}
                  >
                    <div className="session-main">
                      <div className="session-title">{session.title}</div>
                      <div className="session-meta">
                        <span className="message-count">{session.messageCount} messages</span>
                        <span className="session-date">{formatDate(session.updatedAt)}</span>
                      </div>
                    </div>
                    <div className="session-actions">
                      {session.state && (
                        <span className={`session-status ${session.state.syncStatus}`}>
                          {session.state.syncStatus === 'pending' ? '⏳' : '✓'}
                        </span>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSession(session.id);
                        }}
                        className="delete-button"
                        title="Delete session"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {view === 'search' && (
          <div className="search-view">
            {searchResults.length === 0 ? (
              <div className="empty-state">
                <p>No search results found</p>
              </div>
            ) : (
              <div className="search-results">
                {searchResults.map((result, index) => (
                  <div key={index} className="search-result">
                    <div className="result-header">
                      <span className="session-title">{result.session.title}</span>
                      <span className="result-score">Score: {(result.score * 100).toFixed(0)}%</span>
                    </div>
                    <div className="result-message">
                      <div className="message-role">{result.message.role}</div>
                      <div className="message-preview">
                        {result.highlights.length > 0 
                          ? result.highlights[0] 
                          : result.message.content.substring(0, 200) + '...'
                        }
                      </div>
                    </div>
                    <div className="result-meta">
                      {formatDate(result.message.timestamp)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {view === 'export' && (
          <div className="export-view">
            <div className="export-section">
              <h4>Export Data</h4>
              <p>Export your chat history for backup or transfer</p>
              <button onClick={handleExportData} className="export-button">
                📥 Export All Sessions
              </button>
            </div>

            <div className="import-section">
              <h4>Import Data</h4>
              <p>Import previously exported chat history</p>
              <input
                type="file"
                accept=".json"
                onChange={handleImportData}
                className="import-input"
              />
            </div>

            {storageStats && (
              <div className="storage-info">
                <h4>Storage Statistics</h4>
                <div className="stats-grid">
                  <div className="stat-item">
                    <span className="stat-label">Total Sessions:</span>
                    <span className="stat-value">{storageStats.totalSessions}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Total Messages:</span>
                    <span className="stat-value">{storageStats.totalMessages}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Estimated Size:</span>
                    <span className="stat-value">{formatSize(storageStats.estimatedSize)}</span>
                  </div>
                  {storageStats.oldestMessage && (
                    <div className="stat-item">
                      <span className="stat-label">Oldest Message:</span>
                      <span className="stat-value">{formatDate(storageStats.oldestMessage)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {view === 'settings' && (
          <div className="settings-view">
            <div className="settings-section">
              <h4>Privacy & Security</h4>
              <div className="setting-item">
                <label>
                  <input type="checkbox" defaultChecked />
                  Enable encryption for chat data
                </label>
              </div>
              <div className="setting-item">
                <label>
                  <input type="checkbox" defaultChecked />
                  Auto-cleanup old messages
                </label>
              </div>
            </div>

            <div className="settings-section">
              <h4>Data Retention</h4>
              <div className="setting-item">
                <label>
                  Keep messages for:
                  <select defaultValue="365">
                    <option value="30">30 days</option>
                    <option value="90">90 days</option>
                    <option value="365">1 year</option>
                    <option value="-1">Forever</option>
                  </select>
                </label>
              </div>
            </div>

            <div className="settings-section">
              <h4>Dangerous Actions</h4>
              <button 
                onClick={() => {
                  if (confirm('This will permanently delete ALL chat history. This cannot be undone!')) {
                    chatSessionService.clearAllSessions();
                    setSessions([]);
                  }
                }}
                className="danger-button"
              >
                🗑️ Clear All Chat History
              </button>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .local-chat-history {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: #f8f9fa;
          border-radius: 8px;
          overflow: hidden;
        }

        .chat-history-header {
          background: white;
          padding: 1rem;
          border-bottom: 1px solid #e9ecef;
        }

        .header-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .status-indicator {
          border: none;
          background: none;
          cursor: default;
          font-size: 0.8rem;
        }

        .search-container {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }

        .search-input {
          flex: 1;
          padding: 0.5rem;
          border: 1px solid #ddd;
          border-radius: 4px;
        }

        .search-button {
          padding: 0.5rem 1rem;
          background: #007bff;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }

        .search-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .nav-tabs {
          display: flex;
          gap: 1rem;
        }

        .nav-tabs button {
          padding: 0.5rem 1rem;
          background: none;
          border: none;
          cursor: pointer;
          border-bottom: 2px solid transparent;
        }

        .nav-tabs button.active {
          border-bottom-color: #007bff;
          color: #007bff;
        }

        .chat-history-content {
          flex: 1;
          overflow: auto;
          padding: 1rem;
        }

        .sessions-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .session-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          background: white;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .session-item:hover {
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .session-item.selected {
          background: #e7f3ff;
          border-left: 4px solid #007bff;
        }

        .session-title {
          font-weight: 500;
          margin-bottom: 0.25rem;
        }

        .session-meta {
          display: flex;
          gap: 1rem;
          font-size: 0.875rem;
          color: #666;
        }

        .session-actions {
          display: flex;
          gap: 0.5rem;
          align-items: center;
        }

        .delete-button {
          background: none;
          border: none;
          cursor: pointer;
          opacity: 0.6;
          transition: opacity 0.2s;
        }

        .delete-button:hover {
          opacity: 1;
        }

        .search-results {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .search-result {
          background: white;
          padding: 1rem;
          border-radius: 8px;
        }

        .result-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 0.5rem;
        }

        .message-preview {
          background: #f8f9fa;
          padding: 0.5rem;
          border-radius: 4px;
          font-family: monospace;
          font-size: 0.875rem;
        }

        .export-section, .import-section, .settings-section {
          background: white;
          padding: 1rem;
          border-radius: 8px;
          margin-bottom: 1rem;
        }

        .export-button, .danger-button {
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 500;
        }

        .export-button {
          background: #28a745;
          color: white;
        }

        .danger-button {
          background: #dc3545;
          color: white;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
        }

        .stat-item {
          display: flex;
          justify-content: space-between;
          padding: 0.5rem;
          background: #f8f9fa;
          border-radius: 4px;
        }

        .empty-state {
          text-align: center;
          padding: 2rem;
          color: #666;
        }

        .error-message {
          background: #f8d7da;
          color: #721c24;
          padding: 0.75rem;
          border-radius: 4px;
          margin-bottom: 1rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .loading {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 200px;
        }
      `}</style>
    </div>
  );
};

export default LocalChatHistory;