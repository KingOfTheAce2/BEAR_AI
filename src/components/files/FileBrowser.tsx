/**
 * File Browser Component
 * Provides interface for browsing and selecting local files
 */

import React, { useState, useCallback, useEffect } from 'react';
import { localFileSystemService, LocalFile } from '../../services/localFileSystem';
import { documentParserService } from '../../services/documentParser';
import { localStorageService, StoredDocument } from '../../services/localStorage';

interface FileBrowserProps {
  onFileSelect?: (file: LocalFile) => void;
  onDocumentParse?: (document: StoredDocument) => void;
  onError?: (error: string) => void;
  acceptedTypes?: Record<string, string[]>;
  multiple?: boolean;
  showParsedDocuments?: boolean;
}

export const FileBrowser: React.FC<FileBrowserProps> = ({
  onFileSelect,
  onDocumentParse,
  onError,
  acceptedTypes,
  multiple = false,
  showParsedDocuments = true
}) => {
  const [selectedFiles, setSelectedFiles] = useState<LocalFile[]>([]);
  const [parsedDocuments, setParsedDocuments] = useState<StoredDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingFile, setProcessingFile] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    setIsSupported(localFileSystemService.isSupported());
    if (showParsedDocuments) {
      loadParsedDocuments();
    }
  }, [showParsedDocuments]);

  const loadParsedDocuments = async () => {
    try {
      const docs = await localStorageService.getAllDocuments();
      setParsedDocuments(docs);
    } catch (error) {
      // Error logging disabled for production
    }
  };

  const handleFileSelection = useCallback(async () => {
    if (!isSupported) {
      onError?.('File System Access API is not supported in this browser');
      return;
    }

    try {
      setLoading(true);
      const fileHandles = await localFileSystemService.pickFiles({
        multiple,
        accept: acceptedTypes,
        excludeAcceptAllOption: false
      });

      const files: LocalFile[] = [];
      for (const handle of fileHandles) {
        try {
          const file = await localFileSystemService.readFile(handle);
          files.push(file);
          onFileSelect?.(file);
        } catch (error) {
          // Error logging disabled for production
          onError?.(`Failed to read file ${handle.name}`);
        }
      }

      setSelectedFiles(prev => [...prev, ...files]);
    } catch (error) {
      if (error instanceof Error && error.message === 'File selection cancelled') {
        // User cancelled, don't show error
        return;
      }
      // Error logging disabled for production
      onError?.('Failed to select files');
    } finally {
      setLoading(false);
    }
  }, [isSupported, multiple, acceptedTypes, onFileSelect, onError]);

  const handleDirectorySelection = useCallback(async () => {
    if (!isSupported) {
      onError?.('File System Access API is not supported in this browser');
      return;
    }

    try {
      setLoading(true);
      const dirHandle = await localFileSystemService.pickDirectory();
      const files = await localFileSystemService.readDirectory(dirHandle, true);

      for (const file of files) {
        onFileSelect?.(file);
      }

      setSelectedFiles(prev => [...prev, ...files]);
    } catch (error) {
      if (error instanceof Error && error.message === 'Directory selection cancelled') {
        return;
      }
      // Error logging disabled for production
      onError?.('Failed to select directory');
    } finally {
      setLoading(false);
    }
  }, [isSupported, onFileSelect, onError]);

  const handleParseDocument = useCallback(async (file: LocalFile) => {
    try {
      setProcessingFile(file.id);
      const parsedDoc = await documentParserService.parseDocument(file);
      await localStorageService.storeDocument(parsedDoc, file);
      
      const storedDoc = await localStorageService.getDocument(parsedDoc.id);
      if (storedDoc) {
        setParsedDocuments(prev => [...prev.filter(d => d.id !== storedDoc.id), storedDoc]);
        onDocumentParse?.(storedDoc);
      }
    } catch (error) {
      // Error logging disabled for production
      onError?.(`Failed to parse document: ${file.name}`);
    } finally {
      setProcessingFile(null);
    }
  }, [onDocumentParse, onError]);

  const handleRemoveFile = useCallback((fileId: string) => {
    setSelectedFiles(prev => prev.filter(f => f.id !== fileId));
  }, []);

  const handleRemoveDocument = useCallback(async (docId: string) => {
    try {
      await localStorageService.deleteDocument(docId);
      setParsedDocuments(prev => prev.filter(d => d.id !== docId));
    } catch (error) {
      // Error logging disabled for production
      onError?.('Failed to remove document');
    }
  }, [onError]);

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

  const getFileIcon = (fileName: string): string => {
    const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
    
    switch (extension) {
      case '.pdf': return '📄';
      case '.docx':
      case '.doc': return '📝';
      case '.txt': return '📃';
      case '.md': return '📝';
      case '.json': return '🔧';
      case '.html': return '🌐';
      case '.jpg':
      case '.jpeg':
      case '.png':
      case '.gif': return '🖼️';
      default: return '📁';
    }
  };

  if (!isSupported) {
    return (
      <div className="file-browser-unsupported">
        <h3>File System Access Not Supported</h3>
        <p>
          Your browser doesn't support the File System Access API. 
          Please use a modern browser like Chrome, Edge, or Opera.
        </p>
        <div className="fallback-upload">
          <input
            type="file"
            multiple={multiple}
            onChange={(e) => {
              // Fallback file input handling
              const files = Array.from(e.target.files || []);
              // Convert to LocalFile format for compatibility
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="file-browser">
      <div className="file-browser-header">
        <h3>Local File Browser</h3>
        <div className="file-browser-actions">
          <button
            onClick={handleFileSelection}
            disabled={loading}
            className="btn btn-primary"
          >
            {loading ? 'Loading...' : 'Select Files'}
          </button>
          <button
            onClick={handleDirectorySelection}
            disabled={loading}
            className="btn btn-secondary"
          >
            Select Folder
          </button>
        </div>
      </div>

      {selectedFiles.length > 0 && (
        <div className="selected-files">
          <h4>Selected Files ({selectedFiles.length})</h4>
          <div className="file-list">
            {selectedFiles.map(file => (
              <div key={file.id} className="file-item">
                <div className="file-info">
                  <span className="file-icon">{getFileIcon(file.name)}</span>
                  <div className="file-details">
                    <div className="file-name">{file.name}</div>
                    <div className="file-meta">
                      {formatFileSize(file.size)} • {new Date(file.lastModified).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className="file-actions">
                  <button
                    onClick={() => handleParseDocument(file)}
                    disabled={processingFile === file.id}
                    className="btn btn-small btn-success"
                  >
                    {processingFile === file.id ? 'Processing...' : 'Parse'}
                  </button>
                  <button
                    onClick={() => handleRemoveFile(file.id)}
                    className="btn btn-small btn-danger"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showParsedDocuments && parsedDocuments.length > 0 && (
        <div className="parsed-documents">
          <h4>Stored Documents ({parsedDocuments.length})</h4>
          <div className="document-list">
            {parsedDocuments.map(doc => (
              <div key={doc.id} className="document-item">
                <div className="document-info">
                  <span className="file-icon">{getFileIcon(doc.fileInfo.name)}</span>
                  <div className="document-details">
                    <div className="document-title">{doc.title}</div>
                    <div className="document-meta">
                      {doc.metadata.wordCount} words • {doc.metadata.format} • 
                      {doc.tags.length > 0 && ` Tags: ${doc.tags.join(', ')}`}
                    </div>
                  </div>
                </div>
                <div className="document-actions">
                  <button
                    onClick={() => onDocumentParse?.(doc)}
                    className="btn btn-small btn-primary"
                  >
                    Open
                  </button>
                  <button
                    onClick={() => handleRemoveDocument(doc.id)}
                    className="btn btn-small btn-danger"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        .file-browser {
          padding: 20px;
          border: 1px solid #ddd;
          border-radius: 8px;
          background: white;
        }

        .file-browser-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .file-browser-actions {
          display: flex;
          gap: 10px;
        }

        .file-browser-unsupported {
          padding: 20px;
          text-align: center;
          border: 2px dashed #ccc;
          border-radius: 8px;
          background: #f9f9f9;
        }

        .file-list, .document-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .file-item, .document-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px;
          border: 1px solid #eee;
          border-radius: 6px;
          background: #fafafa;
        }

        .file-info, .document-info {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1;
        }

        .file-icon {
          font-size: 24px;
        }

        .file-details, .document-details {
          flex: 1;
        }

        .file-name, .document-title {
          font-weight: 500;
          margin-bottom: 4px;
        }

        .file-meta, .document-meta {
          font-size: 12px;
          color: #666;
        }

        .file-actions, .document-actions {
          display: flex;
          gap: 8px;
        }

        .btn {
          padding: 8px 16px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          transition: background-color 0.2s;
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-primary {
          background: #007bff;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: #0056b3;
        }

        .btn-secondary {
          background: #6c757d;
          color: white;
        }

        .btn-secondary:hover:not(:disabled) {
          background: #545b62;
        }

        .btn-success {
          background: #28a745;
          color: white;
        }

        .btn-success:hover:not(:disabled) {
          background: #1e7e34;
        }

        .btn-danger {
          background: #dc3545;
          color: white;
        }

        .btn-danger:hover:not(:disabled) {
          background: #c82333;
        }

        .btn-small {
          padding: 4px 8px;
          font-size: 12px;
        }

        .selected-files, .parsed-documents {
          margin-top: 20px;
        }

        h4 {
          margin-bottom: 12px;
          color: #333;
        }
      `}</style>
    </div>
  );
};

export default FileBrowser;