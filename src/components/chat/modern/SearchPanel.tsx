import React, { useState, useEffect, useRef } from 'react';
import { Message, SearchFilter } from '../../../types/chat';
import './SearchPanel.css';

interface SearchPanelProps {
  searchResults: Message[];
  isSearching: boolean;
  onSearch: (query: string, filters?: SearchFilter) => void;
  onClose: () => void;
  onMessageClick: (messageId: string) => void;
}

const SearchPanel: React.FC<SearchPanelProps> = ({
  searchResults,
  isSearching,
  onSearch,
  onClose,
  onMessageClick
}) => {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<Partial<SearchFilter>>({});
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedResult, setSelectedResult] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Focus search input when panel opens
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  useEffect(() => {
    // Debounced search
    const timeoutId = setTimeout(() => {
      if (query.trim()) {
        performSearch();
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query, filters]);

  const performSearch = () => {
    const searchFilters: SearchFilter = {
      query: query.trim(),
      ...filters
    };
    onSearch(query, searchFilters);
  };

  const handleFilterChange = (key: keyof SearchFilter, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const clearFilters = () => {
    setFilters({});
    setQuery('');
    onSearch('');
  };

  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const highlightText = (text: string, searchQuery: string): string => {
    if (!searchQuery.trim()) return text;

    const regex = new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  };

  const getPreviewText = (message: Message): string => {
    const maxLength = 100;
    if (message.content.length <= maxLength) {
      return message.content;
    }

    // Try to center the preview around the search term
    const lowerContent = message.content.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const index = lowerContent.indexOf(lowerQuery);
    
    if (index === -1) {
      return message.content.substring(0, maxLength) + '...';
    }

    const start = Math.max(0, index - 30);
    const end = Math.min(message.content.length, start + maxLength);
    
    let preview = message.content.substring(start, end);
    if (start > 0) preview = '...' + preview;
    if (end < message.content.length) preview += '...';
    
    return preview;
  };

  return (
    <div className="search-panel">
      <div className="search-header">
        <h3>Search Messages</h3>
        <button className="close-btn" onClick={onClose}>×</button>
      </div>

      <div className="search-form">
        <div className="search-input-group">
          <input
            ref={searchInputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search messages..."
            className="search-input"
          />
          <button 
            className="advanced-toggle"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            ⚙️
          </button>
        </div>

        {showAdvanced && (
          <div className="advanced-filters">
            <div className="filter-row">
              <label>From User:</label>
              <input
                type="text"
                value={filters.userId || ''}
                onChange={(e) => handleFilterChange('userId', e.target.value)}
                placeholder="Username"
              />
            </div>

            <div className="filter-row">
              <label>Date From:</label>
              <input
                type="date"
                value={filters.dateFrom ? filters.dateFrom.toISOString().split('T')[0] : ''}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value ? new Date(e.target.value) : undefined)}
              />
            </div>

            <div className="filter-row">
              <label>Date To:</label>
              <input
                type="date"
                value={filters.dateTo ? filters.dateTo.toISOString().split('T')[0] : ''}
                onChange={(e) => handleFilterChange('dateTo', e.target.value ? new Date(e.target.value) : undefined)}
              />
            </div>

            <div className="filter-row">
              <label>Message Type:</label>
              <select
                value={filters.messageType || ''}
                onChange={(e) => handleFilterChange('messageType', e.target.value || undefined)}
              >
                <option value="">All types</option>
                <option value="text">Text</option>
                <option value="code">Code</option>
                <option value="file">File</option>
                <option value="system">System</option>
              </select>
            </div>

            <div className="filter-row">
              <label>
                <input
                  type="checkbox"
                  checked={filters.hasAttachments || false}
                  onChange={(e) => handleFilterChange('hasAttachments', e.target.checked)}
                />
                Has attachments
              </label>
            </div>

            <div className="filter-actions">
              <button onClick={clearFilters} className="clear-filters-btn">
                Clear Filters
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="search-results">
        {isSearching ? (
          <div className="search-loading">
            <div className="loading-spinner"></div>
            <span>Searching...</span>
          </div>
        ) : (
          <>
            <div className="results-header">
              {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} found
            </div>

            <div className="results-list">
              {searchResults.length === 0 ? (
                <div className="no-results">
                  {query.trim() ? 'No messages found' : 'Enter a search term'}
                </div>
              ) : (
                searchResults.map((message) => (
                  <div
                    key={message.id}
                    className={`result-item ${selectedResult === message.id ? 'selected' : ''}`}
                    onClick={() => {
                      setSelectedResult(message.id);
                      onMessageClick(message.id);
                    }}
                  >
                    <div className="result-header">
                      <span className="result-user">{message.username}</span>
                      <span className="result-date">{formatDate(message.timestamp)}</span>
                      {message.type !== 'text' && (
                        <span className={`result-type ${message.type}`}>
                          {message.type}
                        </span>
                      )}
                    </div>
                    
                    <div 
                      className="result-content"
                      dangerouslySetInnerHTML={{
                        __html: highlightText(getPreviewText(message), query)
                      }}
                    />

                    {message.attachments.length > 0 && (
                      <div className="result-attachments">
                        📎 {message.attachments.length} attachment{message.attachments.length > 1 ? 's' : ''}
                      </div>
                    )}

                    {message.reactions.length > 0 && (
                      <div className="result-reactions">
                        {message.reactions.slice(0, 3).map((reaction, index) => (
                          <span key={index} className="result-reaction">
                            {reaction.emoji}
                          </span>
                        ))}
                        {message.reactions.length > 3 && (
                          <span className="more-reactions">+{message.reactions.length - 3}</span>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>

      <div className="search-footer">
        <div className="search-tips">
          <strong>Tips:</strong> Use quotes for exact phrases, * for wildcards
        </div>
      </div>
    </div>
  );
};

export default SearchPanel;