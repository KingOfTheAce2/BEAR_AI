/**
 * Local File System Integration Component
 * Main component that integrates all file system features
 */

import React, { useState, useEffect, useCallback } from 'react';
import FileBrowser from './FileBrowser';
import DocumentViewer from './DocumentViewer';
import FileSearchIndex from './FileSearchIndex';
import FileUploadProcessor from './FileUploadProcessor';
import { LocalFile } from '../../services/localFileSystem';
import { StoredDocument, localStorageService } from '../../services/localStorage';
import { fileMetadataService } from '../../services/fileMetadata';
import { offlineSyncService, SyncStatus } from '../../services/offlineSync';
import { fileSecurityService, ScanResult } from '../../services/fileSecurity';

interface LocalFileSystemIntegrationProps {
  onError?: (error: string) => void;
  onDocumentSelect?: (document: StoredDocument) => void;
  className?: string;
}

export const LocalFileSystemIntegration: React.FC<LocalFileSystemIntegrationProps> = ({
  onError,
  onDocumentSelect,
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState<'browser' | 'search' | 'processor' | 'viewer'>('browser');
  const [selectedDocument, setSelectedDocument] = useState<StoredDocument | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [securityStats, setSecurityStats] = useState<any>(null);
  const [storageStats, setStorageStats] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // Initialize services
    initializeServices();
    
    // Setup sync status monitoring
    const unsubscribe = offlineSyncService.onStatusChange(setSyncStatus);
    
    // Load initial stats
    loadStats();
    
    return unsubscribe;
  }, []);

  const initializeServices = async () => {
    try {
      await localStorageService.initialize();
      
      // Load initial sync status
      setSyncStatus(offlineSyncService.getSyncStatus());
    } catch (error) {
      console.error('Failed to initialize services:', error);
      onError?.('Failed to initialize file system services');
    }
  };

  const loadStats = async () => {
    try {
      const [storage, security, metadata] = await Promise.all([
        localStorageService.getStorageStats(),
        fileSecurityService.getSecurityStats(),
        fileMetadataService.getStatistics()
      ]);
      
      setStorageStats(storage);
      setSecurityStats(security);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const handleFileSelect = useCallback(async (file: LocalFile) => {
    try {
      // Security scan
      const scanResult = await fileSecurityService.scanFile(
        file.id,
        file.name,
        file.content || '',
        file.size
      );

      if (!scanResult.safe) {
        const threatMessages = scanResult.threats.map(t => t.description).join(', ');
        onError?.(`Security threats detected in ${file.name}: ${threatMessages}`);
        return;
      }

      if (scanResult.warnings.length > 0) {
        const warningMessages = scanResult.warnings.map(w => w.description).join(', ');
        console.warn(`Security warnings for ${file.name}: ${warningMessages}`);
      }

      // Extract metadata
      await fileMetadataService.extractMetadata(file);
      
      // Queue for sync if needed
      await offlineSyncService.queueOperation({
        type: 'create',
        fileId: file.id,
        maxRetries: 3
      });

      loadStats();
    } catch (error) {
      console.error('Failed to process file:', error);
      onError?.(`Failed to process file: ${file.name}`);
    }
  }, [onError]);

  const handleDocumentParse = useCallback(async (document: StoredDocument) => {
    setSelectedDocument(document);
    setActiveTab('viewer');
    
    // Record access
    await fileMetadataService.recordAccess(document.id);
    
    // Notify parent
    onDocumentSelect?.(document);
    
    loadStats();
  }, [onDocumentSelect]);

  const handleDocumentSearch = useCallback((document: StoredDocument) => {
    setSelectedDocument(document);
    setActiveTab('viewer');
    
    // Record search
    fileMetadataService.recordSearch(document.id);
  }, []);

  const handleTagUpdate = useCallback(async (documentId: string, tags: string[]) => {
    try {
      const document = await localStorageService.getDocument(documentId);
      if (document) {
        const updated = { ...document, tags };
        await localStorageService.updateDocument(updated);
        
        // Update metadata
        await fileMetadataService.updateMetadata(documentId, { tags });
        
        // Queue sync
        await offlineSyncService.queueOperation({
          type: 'update',
          fileId: documentId,
          maxRetries: 3
        });
      }
    } catch (error) {
      console.error('Failed to update tags:', error);
      onError?.('Failed to update tags');
    }
  }, [onError]);

  const handleJobComplete = useCallback(async (job: any) => {
    if (job.result) {
      loadStats();
    }
  }, []);

  const handleForceSync = useCallback(async () => {
    try {
      await offlineSyncService.forceSync();
    } catch (error) {
      console.error('Sync failed:', error);
      onError?.('Synchronization failed');
    }
  }, [onError]);

  const handleClearFailedOperations = useCallback(async () => {
    try {
      await offlineSyncService.clearFailedOperations();
    } catch (error) {
      console.error('Failed to clear operations:', error);
      onError?.('Failed to clear failed operations');
    }
  }, [onError]);

  const handleExportData = useCallback(async () => {
    try {
      const data = await offlineSyncService.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `bearai-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      onError?.('Failed to export data');
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

  const getSyncStatusColor = (status: SyncStatus | null): string => {
    if (!status) return '#6c757d';
    if (!status.isOnline) return '#dc3545';
    if (status.syncInProgress) return '#007bff';
    if (status.failedOperations > 0) return '#ffc107';
    return '#28a745';
  };

  const getSyncStatusText = (status: SyncStatus | null): string => {
    if (!status) return 'Unknown';
    if (!status.isOnline) return 'Offline';
    if (status.syncInProgress) return 'Syncing...';
    if (status.failedOperations > 0) return `${status.failedOperations} failed`;
    if (status.pendingOperations > 0) return `${status.pendingOperations} pending`;
    return 'Up to date';
  };

  return (
    <div className={`local-filesystem-integration ${className}`}>
      <div className="integration-header">
        <div className="header-left">
          <h2>Local File System</h2>
          <div className="stats-summary">
            {storageStats && (
              <span className="stat-item">
                📄 {storageStats.documentsCount} documents
              </span>
            )}
            {storageStats && (
              <span className="stat-item">
                💾 {formatFileSize(storageStats.totalSize)}
              </span>
            )}
            {securityStats && (
              <span className="stat-item">
                🛡️ {securityStats.totalScans} scans
              </span>
            )}
          </div>
        </div>
        
        <div className="header-right">
          <div className="sync-status">
            <div 
              className="sync-indicator"
              style={{ backgroundColor: getSyncStatusColor(syncStatus) }}
            />
            <span className="sync-text">{getSyncStatusText(syncStatus)}</span>
            {syncStatus?.isOnline && (
              <button
                onClick={handleForceSync}
                className="btn btn-small btn-primary"
                disabled={syncStatus.syncInProgress}
              >
                Sync
              </button>
            )}
          </div>
          
          <div className="header-actions">
            <button
              onClick={handleExportData}
              className="btn btn-small btn-secondary"
            >
              Export
            </button>
            {syncStatus?.failedOperations && syncStatus.failedOperations > 0 && (
              <button
                onClick={handleClearFailedOperations}
                className="btn btn-small btn-warning"
              >
                Clear Failed
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="integration-tabs">
        <button
          onClick={() => setActiveTab('browser')}
          className={`tab-button ${activeTab === 'browser' ? 'active' : ''}`}
        >
          📁 Browse Files
        </button>
        <button
          onClick={() => setActiveTab('search')}
          className={`tab-button ${activeTab === 'search' ? 'active' : ''}`}
        >
          🔍 Search Documents
        </button>
        <button
          onClick={() => setActiveTab('processor')}
          className={`tab-button ${activeTab === 'processor' ? 'active' : ''}`}
        >
          ⚙️ Batch Process
        </button>
        <button
          onClick={() => setActiveTab('viewer')}
          className={`tab-button ${activeTab === 'viewer' ? 'active' : ''}`}
          disabled={!selectedDocument}
        >
          📖 Document Viewer
        </button>
      </div>

      <div className="integration-content">
        {activeTab === 'browser' && (
          <FileBrowser
            onFileSelect={handleFileSelect}
            onDocumentParse={handleDocumentParse}
            onError={onError}
            multiple={true}
            showParsedDocuments={true}
          />
        )}

        {activeTab === 'search' && (
          <div className="search-container">
            <div className="search-header">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search documents..."
                className="search-input"
              />
            </div>
            <FileSearchIndex
              onDocumentSelect={handleDocumentSearch}
              onError={onError}
              initialQuery={searchQuery}
            />
          </div>
        )}

        {activeTab === 'processor' && (
          <FileUploadProcessor
            onJobComplete={handleJobComplete}
            onAllJobsComplete={(jobs) => {
              console.log('All jobs completed:', jobs);
              loadStats();
            }}
            onError={onError}
            autoProcess={true}
            maxConcurrentJobs={3}
          />
        )}

        {activeTab === 'viewer' && (
          <DocumentViewer
            document={selectedDocument}
            onClose={() => {
              setSelectedDocument(null);
              setActiveTab('search');
            }}
            onTagUpdate={handleTagUpdate}
            searchQuery={searchQuery}
          />
        )}
      </div>

      <style>{`
        .local-filesystem-integration {
          height: 100%;
          display: flex;
          flex-direction: column;
          background: white;
          border-radius: 8px;
          border: 1px solid #ddd;
          overflow: hidden;
        }

        .integration-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          border-bottom: 1px solid #eee;
          background: #f8f9fa;
        }

        .header-left h2 {
          margin: 0 0 8px 0;
          color: #333;
        }

        .stats-summary {
          display: flex;
          gap: 16px;
        }

        .stat-item {
          font-size: 12px;
          color: #666;
          background: white;
          padding: 4px 8px;
          border-radius: 4px;
          border: 1px solid #ddd;
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .sync-status {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 12px;
          background: white;
          border: 1px solid #ddd;
          border-radius: 4px;
        }

        .sync-indicator {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .sync-text {
          font-size: 12px;
          color: #555;
          margin-right: 8px;
        }

        .header-actions {
          display: flex;
          gap: 8px;
        }

        .integration-tabs {
          display: flex;
          background: #f8f9fa;
          border-bottom: 1px solid #eee;
        }

        .tab-button {
          padding: 12px 20px;
          border: none;
          background: none;
          cursor: pointer;
          border-bottom: 3px solid transparent;
          transition: all 0.2s;
          font-size: 14px;
          color: #666;
        }

        .tab-button:hover:not(:disabled) {
          background: #e9ecef;
          color: #333;
        }

        .tab-button.active {
          color: #007bff;
          border-bottom-color: #007bff;
          background: white;
        }

        .tab-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .integration-content {
          flex: 1;
          overflow: hidden;
        }

        .search-container {
          height: 100%;
          display: flex;
          flex-direction: column;
        }

        .search-header {
          padding: 20px;
          border-bottom: 1px solid #eee;
        }

        .search-input {
          width: 100%;
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

        .btn {
          padding: 6px 12px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
          transition: background-color 0.2s;
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-small {
          padding: 4px 8px;
          font-size: 11px;
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

        .btn-warning {
          background: #ffc107;
          color: #212529;
        }

        .btn-warning:hover:not(:disabled) {
          background: #e0a800;
        }
      `}</style>
    </div>
  );
};

export default LocalFileSystemIntegration;