/**
 * File Search Index Component
 * Provides advanced search capabilities for local documents
 */

import React, { useState, useEffect, useMemo } from 'react';
import { localStorageService, StoredDocument } from '../../services/localStorage';

interface SearchFilters {
  format?: string;
  tags?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  sizeRange?: {
    min: number;
    max: number;
  };
}

interface FileSearchIndexProps {
  onDocumentSelect?: (document: StoredDocument) => void;
  onError?: (error: string) => void;
  initialQuery?: string;
}

export const FileSearchIndex: React.FC<FileSearchIndexProps> = ({
  onDocumentSelect,
  onError,
  initialQuery = ''
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<StoredDocument[]>([]);
  const [allDocuments, setAllDocuments] = useState<StoredDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [stats, setStats] = useState<{
    documentsCount: number;
    totalSize: number;
    formats: Record<string, number>;
  } | null>(null);

  useEffect(() => {
    loadDocuments();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    performSearch();
  }, [query, filters, allDocuments]);

  const updateStatsFromDocuments = async (documents: StoredDocument[]) => {
    try {
      const storageStats = await localStorageService.getStorageStats();
      const formatCounts = documents.reduce<Record<string, number>>((counts, doc) => {
        const format = doc.metadata.format || 'unknown';
        counts[format] = (counts[format] || 0) + 1;
        return counts;
      }, {});

      setStats({
        documentsCount: storageStats.totalDocuments,
        totalSize: storageStats.totalSize,
        formats: formatCounts
      });
    } catch (error) {
      console.error('Failed to load storage stats:', error);
    }
  };

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const docs = await localStorageService.getAllDocuments();
      setAllDocuments(docs);
      setResults(docs);
      await updateStatsFromDocuments(docs);
    } catch (error) {
      console.error('Failed to load documents:', error);
      onError?.('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const performSearch = () => {
    const hasActiveFilters = Boolean(filters.format) ||
      Boolean(filters.tags && filters.tags.length > 0) ||
      Boolean(filters.dateRange) ||
      Boolean(filters.sizeRange);

    if (!query.trim() && !hasActiveFilters) {
      setResults(allDocuments);
      return;
    }

    setLoading(true);

    const normalizedQuery = query.trim().toLowerCase();

    const filtered = allDocuments.filter(doc => {
      const matchesQuery = !normalizedQuery ||
        doc.title.toLowerCase().includes(normalizedQuery) ||
        doc.content.toLowerCase().includes(normalizedQuery) ||
        doc.summary?.toLowerCase().includes(normalizedQuery) ||
        doc.tags.some(tag => tag.toLowerCase().includes(normalizedQuery));

      const matchesFormat = !filters.format || doc.metadata.format === filters.format;

      const matchesTags = !filters.tags || filters.tags.length === 0 ||
        filters.tags.every(tag => doc.tags.includes(tag));

      let matchesDateRange = true;
      if (filters.dateRange) {
        const documentDate = doc.metadata.modifiedDate ||
          doc.metadata.createdDate ||
          doc.fileInfo.lastModified;

        if (!documentDate) {
          matchesDateRange = false;
        } else {
          const documentTime = new Date(documentDate).getTime();
          const startTime = filters.dateRange.start?.getTime();
          const endTime = filters.dateRange.end?.getTime();

          if (startTime && documentTime < startTime) {
            matchesDateRange = false;
          }
          if (endTime && documentTime > endTime) {
            matchesDateRange = false;
          }
        }
      }

      let matchesSizeRange = true;
      if (filters.sizeRange) {
        const { min, max } = filters.sizeRange;
        const fileSize = doc.fileInfo.size;
        if (min !== undefined && fileSize < min) {
          matchesSizeRange = false;
        }
        if (max !== undefined && fileSize > max) {
          matchesSizeRange = false;
        }
      }

      return matchesQuery && matchesFormat && matchesTags && matchesDateRange && matchesSizeRange;
    });

    setResults(filtered);
    setLoading(false);
  };

  const availableFormats = useMemo(() => {
    const formats = new Set<string>();
    allDocuments.forEach(doc => formats.add(doc.metadata.format));
    return Array.from(formats);
  }, [allDocuments]);

  const availableTags = useMemo(() => {
    const tags = new Set<string>();
    allDocuments.forEach(doc => doc.tags.forEach(tag => tags.add(tag)));
    return Array.from(tags);
  }, [allDocuments]);

  const handleFormatFilter = (format: string) => {
    setFilters(prev => ({
      ...prev,
      format: prev.format === format ? undefined : format
    }));
  };

  const handleTagFilter = (tag: string) => {
    setFilters(prev => ({
      ...prev,
      tags: prev.tags?.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...(prev.tags || []), tag]
    }));
  };

  const handleDateRangeFilter = (start: Date | null, end: Date | null) => {
    setFilters(prev => ({
      ...prev,
      dateRange: start && end ? { start, end } : undefined
    }));
  };

  const clearFilters = () => {
    setFilters({});
    setQuery('');
  };

  const formatFileSize = (bytes: number): string => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  const formatDate = (date: Date | string | undefined): string => {
    if (!date) return 'Unknown';
    const d = new Date(date);
    return d.toLocaleDateString();
  };

  const getFileIcon = (format: string): string => {
    switch (format) {
      case 'application/pdf': return '📄';
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': return '📝';
      case 'text/plain': return '📃';
      case 'text/markdown': return '📝';
      case 'application/json': return '🔧';
      case 'text/html': return '🌐';
      default: return '📁';
    }
  };

  const highlightText = (text: string, query: string): React.ReactNode => {
    if (!query) return <span>{text}</span>;

    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);

    return (
      <span>
        {parts.map((part, index) =>
          regex.test(part) ? (
            <mark key={index}>{part}</mark>
          ) : (
            <span key={index}>{part}</span>
          )
        )}
      </span>
    );
  };

  return (
    <div className="file-search-index">
      <div className="search-header">
        <div className="search-input-container">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search documents..."
            className="search-input"
          />
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`btn btn-secondary ${showFilters ? 'active' : ''}`}
          >
            Filters
          </button>
        </div>

        {stats && (
          <div className="search-stats">
            <span>{results.length} of {stats.documentsCount} documents</span>
            <span>Total: {formatFileSize(stats.totalSize)}</span>
          </div>
        )}
      </div>

      {showFilters && (
        <div className="search-filters">
          <div className="filter-section">
            <h4>File Formats</h4>
            <div className="filter-options">
              {availableFormats.map(format => (
                <button
                  key={format}
                  onClick={() => handleFormatFilter(format)}
                  className={`filter-button ${filters.format === format ? 'active' : ''}`}
                >
                  {getFileIcon(format)} {format.split('/').pop()}
                  {stats && ` (${stats.formats[format] || 0})`}
                </button>
              ))}
            </div>
          </div>

          {availableTags.length > 0 && (
            <div className="filter-section">
              <h4>Tags</h4>
              <div className="filter-options">
                {availableTags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => handleTagFilter(tag)}
                    className={`filter-button ${filters.tags?.includes(tag) ? 'active' : ''}`}
                  >
                    🏷️ {tag}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="filter-section">
            <h4>Date Range</h4>
            <div className="date-range-inputs">
              <input
                type="date"
                onChange={(e) => {
                  const start = e.target.value ? new Date(e.target.value) : null;
                  handleDateRangeFilter(start, filters.dateRange?.end || null);
                }}
                className="date-input"
              />
              <span>to</span>
              <input
                type="date"
                onChange={(e) => {
                  const end = e.target.value ? new Date(e.target.value) : null;
                  handleDateRangeFilter(filters.dateRange?.start || null, end);
                }}
                className="date-input"
              />
            </div>
          </div>

          <div className="filter-actions">
            <button onClick={clearFilters} className="btn btn-secondary">
              Clear All Filters
            </button>
          </div>
        </div>
      )}

      <div className="search-results">
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <span>Searching...</span>
          </div>
        ) : results.length === 0 ? (
          <div className="empty-state">
            <h3>No documents found</h3>
            <p>Try adjusting your search query or filters.</p>
          </div>
        ) : (
          <div className="results-list">
            {results.map(doc => (
              <div
                key={doc.id}
                className="result-item"
                onClick={() => onDocumentSelect?.(doc)}
              >
                <div className="result-header">
                  <span className="file-icon">{getFileIcon(doc.metadata.format)}</span>
                  <div className="result-title">
                    {highlightText(doc.title, query)}
                  </div>
                  <div className="result-metadata">
                    <span>{doc.metadata.wordCount} words</span>
                    <span>{formatFileSize(doc.fileInfo.size)}</span>
                    <span>{formatDate(doc.metadata.modifiedDate)}</span>
                  </div>
                </div>

                <div className="result-content">
                  {highlightText(
                    doc.content.substring(0, 200) + (doc.content.length > 200 ? '...' : ''),
                    query
                  )}
                </div>

                {doc.tags.length > 0 && (
                  <div className="result-tags">
                    {doc.tags.map((tag, index) => (
                      <span key={index} className="tag">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                <div className="result-path">
                  📁 {doc.fileInfo.path}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        .file-search-index {
          height: 100%;
          display: flex;
          flex-direction: column;
          background: white;
          border-radius: 8px;
          overflow: hidden;
        }

        .search-header {
          padding: 20px;
          border-bottom: 1px solid #eee;
          background: #f8f9fa;
        }

        .search-input-container {
          display: flex;
          gap: 12px;
          margin-bottom: 12px;
        }

        .search-input {
          flex: 1;
          padding: 12px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 16px;
        }

        .search-input:focus {
          outline: none;
          border-color: #007bff;
          box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
        }

        .search-stats {
          display: flex;
          gap: 16px;
          font-size: 14px;
          color: #666;
        }

        .search-filters {
          padding: 20px;
          border-bottom: 1px solid #eee;
          background: #fafafa;
        }

        .filter-section {
          margin-bottom: 20px;
        }

        .filter-section h4 {
          margin: 0 0 8px 0;
          color: #333;
          font-size: 14px;
        }

        .filter-options {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .filter-button {
          padding: 6px 12px;
          border: 1px solid #ddd;
          background: white;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
          transition: all 0.2s;
        }

        .filter-button:hover {
          background: #e9ecef;
        }

        .filter-button.active {
          background: #007bff;
          color: white;
          border-color: #007bff;
        }

        .date-range-inputs {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .date-input {
          padding: 6px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 12px;
        }

        .filter-actions {
          margin-top: 16px;
        }

        .search-results {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
        }

        .loading-state {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 40px;
          color: #666;
        }

        .spinner {
          width: 20px;
          height: 20px;
          border: 2px solid #e9ecef;
          border-top: 2px solid #007bff;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .empty-state {
          text-align: center;
          padding: 40px;
          color: #666;
        }

        .results-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .result-item {
          padding: 16px;
          border: 1px solid #eee;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
          background: white;
        }

        .result-item:hover {
          border-color: #007bff;
          box-shadow: 0 2px 8px rgba(0, 123, 255, 0.15);
        }

        .result-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 8px;
        }

        .file-icon {
          font-size: 20px;
        }

        .result-title {
          flex: 1;
          font-weight: 500;
          color: #333;
        }

        .result-metadata {
          display: flex;
          gap: 12px;
          font-size: 12px;
          color: #666;
        }

        .result-content {
          margin: 8px 0;
          color: #555;
          line-height: 1.5;
        }

        .result-tags {
          display: flex;
          gap: 6px;
          margin: 8px 0;
          flex-wrap: wrap;
        }

        .tag {
          background: #e9ecef;
          color: #495057;
          padding: 2px 6px;
          border-radius: 12px;
          font-size: 10px;
        }

        .result-path {
          font-size: 11px;
          color: #999;
          margin-top: 8px;
        }

        .btn {
          padding: 8px 16px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          transition: background-color 0.2s;
        }

        .btn-secondary {
          background: #6c757d;
          color: white;
        }

        .btn-secondary:hover {
          background: #545b62;
        }

        .btn-secondary.active {
          background: #495057;
        }

        mark {
          background: #fff3cd;
          padding: 1px 2px;
          border-radius: 2px;
        }
      `}</style>
    </div>
  );
};

export default FileSearchIndex;