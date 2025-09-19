/**
 * Document Viewer Component
 * Displays parsed documents with search and navigation capabilities
 */

import type { FC } from 'react';
import type React from 'react';
import { useState, useEffect, useMemo } from 'react';
import { StoredDocument } from '../../services/localStorage';

interface DocumentViewerProps {
  document: StoredDocument | null;
  onClose?: () => void;
  onEdit?: (document: StoredDocument) => void;
  onTagUpdate?: (documentId: string, tags: string[]) => void;
  searchQuery?: string;
}

export const DocumentViewer: FC<DocumentViewerProps> = ({
  document,
  onClose,
  onEdit,
  onTagUpdate,
  searchQuery = ''
}) => {
  const [activeSection, setActiveSection] = useState<number>(0);
  const [newTag, setNewTag] = useState('');
  const [isEditingTags, setIsEditingTags] = useState(false);
  const [localTags, setLocalTags] = useState<string[]>([]);
  const documentSections = document?.metadata.sections ?? [];

  useEffect(() => {
    if (document) {
      setLocalTags(document.tags || []);
      setActiveSection(0);
    }
  }, [document]);

  useEffect(() => {
    if (documentSections.length > 0 && activeSection >= documentSections.length) {
      setActiveSection(0);
    }
  }, [documentSections.length, activeSection]);

  const highlightedContent = useMemo(() => {
    if (!document || !searchQuery) return document?.content || '';
    
    const regex = new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return document.content.replace(regex, '<mark>$1</mark>');
  }, [document?.content, searchQuery]);

  const handleAddTag = () => {
    if (newTag.trim() && !localTags.includes(newTag.trim())) {
      const updatedTags = [...localTags, newTag.trim()];
      setLocalTags(updatedTags);
      onTagUpdate?.(document!.id, updatedTags);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const updatedTags = localTags.filter(tag => tag !== tagToRemove);
    setLocalTags(updatedTags);
    onTagUpdate?.(document!.id, updatedTags);
  };

  const handleKeyPress: React.KeyboardEventHandler<HTMLInputElement> = (event) => {
    if (event.key === 'Enter') {
      handleAddTag();
    }
  };

  const formatDate = (date: Date | string | undefined): string => {
    if (!date) return 'Unknown';
    const d = new Date(date);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
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

  if (!document) {
    return (
      <div className="document-viewer-empty">
        <div className="empty-state">
          <h3>No Document Selected</h3>
          <p>Select a document from the browser to view its content.</p>
        </div>
      </div>
    );
  }

  const hasSections = documentSections.length > 0;
  const safeActiveSection = hasSections
    ? Math.min(activeSection, documentSections.length - 1)
    : 0;
  const currentSection = hasSections ? documentSections[safeActiveSection] : undefined;

  return (
    <div className="document-viewer">
      <div className="document-header">
        <div className="document-title-section">
          <h2>{document.title}</h2>
          <div className="document-metadata">
            <span className="metadata-item">
              📄 {document.metadata.format}
            </span>
            <span className="metadata-item">
              📊 {document.metadata.wordCount} words
            </span>
            <span className="metadata-item">
              💾 {formatFileSize(document.fileInfo.size)}
            </span>
            {document.metadata.author && (
              <span className="metadata-item">
                👤 {document.metadata.author}
              </span>
            )}
          </div>
        </div>
        <div className="document-actions">
          {onEdit && (
            <button
              onClick={() => onEdit(document)}
              className="btn btn-secondary"
            >
              Edit
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="btn btn-primary"
            >
              Close
            </button>
          )}
        </div>
      </div>

      <div className="document-info">
        <div className="info-row">
          <span className="info-label">Created:</span>
          <span className="info-value">{formatDate(document.metadata.createdDate)}</span>
        </div>
        <div className="info-row">
          <span className="info-label">Modified:</span>
          <span className="info-value">{formatDate(document.metadata.modifiedDate)}</span>
        </div>
        <div className="info-row">
          <span className="info-label">Last Accessed:</span>
          <span className="info-value">{formatDate(document.metadata.lastAccessed)}</span>
        </div>
        <div className="info-row">
          <span className="info-label">Path:</span>
          <span className="info-value">{document.fileInfo.path}</span>
        </div>
      </div>

      <div className="document-tags">
        <div className="tags-header">
          <span className="tags-label">Tags:</span>
          <button
            onClick={() => setIsEditingTags(!isEditingTags)}
            className="btn btn-small btn-secondary"
          >
            {isEditingTags ? 'Done' : 'Edit Tags'}
          </button>
        </div>
        <div className="tags-container">
          {localTags.map((tag, index) => (
            <span key={index} className="tag">
              {tag}
              {isEditingTags && (
                <button
                  onClick={() => handleRemoveTag(tag)}
                  className="tag-remove"
                >
                  ×
                </button>
              )}
            </span>
          ))}
          {isEditingTags && (
            <div className="tag-input-container">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Add tag..."
                className="tag-input"
              />
              <button
                onClick={handleAddTag}
                className="btn btn-small btn-success"
              >
                Add
              </button>
            </div>
          )}
        </div>
      </div>

      {hasSections && (
        <div className="document-navigation">
          <h4>Sections</h4>
          <div className="sections-list">
            {documentSections.map((section, index) => (
              <button
                key={index}
                onClick={() => setActiveSection(index)}
                className={`section-button ${activeSection === index ? 'active' : ''}`}
              >
                <span className="section-level">H{section.level}</span>
                <span className="section-title">{section.title}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="document-content">
        {hasSections ? (
          <div className="section-content">
            <h3>{currentSection?.title}</h3>
            <div
              className="content-text"
              dangerouslySetInnerHTML={{
                __html: searchQuery
                  ? (currentSection?.content || '').replace(
                      new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'),
                      '<mark>$1</mark>'
                    )
                  : currentSection?.content || ''
              }}
            />
          </div>
        ) : (
          <div className="full-content">
            <div
              className="content-text"
              dangerouslySetInnerHTML={{
                __html: highlightedContent
              }}
            />
          </div>
        )}
      </div>

      <style>{`
        .document-viewer {
          height: 100%;
          display: flex;
          flex-direction: column;
          background: white;
          border-radius: 8px;
          overflow: hidden;
        }

        .document-viewer-empty {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          background: #f8f9fa;
          border-radius: 8px;
        }

        .empty-state {
          text-align: center;
          color: #6c757d;
        }

        .document-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 20px;
          border-bottom: 1px solid #eee;
          background: #f8f9fa;
        }

        .document-title-section h2 {
          margin: 0 0 8px 0;
          color: #333;
        }

        .document-metadata {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
        }

        .metadata-item {
          font-size: 12px;
          color: #666;
          background: white;
          padding: 4px 8px;
          border-radius: 4px;
          border: 1px solid #ddd;
        }

        .document-actions {
          display: flex;
          gap: 8px;
        }

        .document-info {
          padding: 16px 20px;
          border-bottom: 1px solid #eee;
          background: #fafafa;
        }

        .info-row {
          display: flex;
          margin-bottom: 8px;
        }

        .info-label {
          font-weight: 500;
          width: 120px;
          color: #555;
        }

        .info-value {
          color: #333;
          word-break: break-all;
        }

        .document-tags {
          padding: 16px 20px;
          border-bottom: 1px solid #eee;
        }

        .tags-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .tags-label {
          font-weight: 500;
          color: #555;
        }

        .tags-container {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          align-items: center;
        }

        .tag {
          background: #007bff;
          color: white;
          padding: 4px 8px;
          border-radius: 16px;
          font-size: 12px;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .tag-remove {
          background: none;
          border: none;
          color: white;
          cursor: pointer;
          padding: 0;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .tag-remove:hover {
          background: rgba(255, 255, 255, 0.2);
        }

        .tag-input-container {
          display: flex;
          gap: 4px;
          align-items: center;
        }

        .tag-input {
          padding: 4px 8px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 12px;
          width: 100px;
        }

        .document-navigation {
          padding: 16px 20px;
          border-bottom: 1px solid #eee;
          background: #f8f9fa;
        }

        .document-navigation h4 {
          margin: 0 0 12px 0;
          color: #333;
        }

        .sections-list {
          display: flex;
          flex-direction: column;
          gap: 4px;
          max-height: 200px;
          overflow-y: auto;
        }

        .section-button {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border: 1px solid #ddd;
          background: white;
          border-radius: 4px;
          cursor: pointer;
          text-align: left;
          transition: all 0.2s;
        }

        .section-button:hover {
          background: #e9ecef;
        }

        .section-button.active {
          background: #007bff;
          color: white;
          border-color: #007bff;
        }

        .section-level {
          font-size: 10px;
          background: #6c757d;
          color: white;
          padding: 2px 4px;
          border-radius: 2px;
          min-width: 20px;
          text-align: center;
        }

        .section-button.active .section-level {
          background: rgba(255, 255, 255, 0.3);
        }

        .section-title {
          flex: 1;
          font-size: 12px;
        }

        .document-content {
          flex: 1;
          padding: 20px;
          overflow-y: auto;
        }

        .section-content h3 {
          margin: 0 0 16px 0;
          color: #333;
          border-bottom: 2px solid #007bff;
          padding-bottom: 8px;
        }

        .content-text {
          line-height: 1.6;
          color: #333;
          white-space: pre-wrap;
          word-wrap: break-word;
        }

        .content-text mark {
          background: #fff3cd;
          padding: 2px 4px;
          border-radius: 2px;
        }

        .btn {
          padding: 8px 16px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          transition: background-color 0.2s;
        }

        .btn-small {
          padding: 4px 8px;
          font-size: 12px;
        }

        .btn-primary {
          background: #007bff;
          color: white;
        }

        .btn-primary:hover {
          background: #0056b3;
        }

        .btn-secondary {
          background: #6c757d;
          color: white;
        }

        .btn-secondary:hover {
          background: #545b62;
        }

        .btn-success {
          background: #28a745;
          color: white;
        }

        .btn-success:hover {
          background: #1e7e34;
        }
      `}</style>
    </div>
  );
};

export default DocumentViewer;