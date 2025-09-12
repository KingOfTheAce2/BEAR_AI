/**
 * File Upload Processor Component
 * Handles batch file upload and processing workflows
 */

import React, { useState, useCallback, useRef } from 'react';
import { localFileSystemService, LocalFile } from '../../services/localFileSystem';
import { documentParserService, ParsedDocument } from '../../services/documentParser';
import { localStorageService, StoredDocument } from '../../services/localStorage';

interface ProcessingJob {
  id: string;
  file: LocalFile;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  error?: string;
  result?: StoredDocument;
}

interface FileUploadProcessorProps {
  onJobComplete?: (job: ProcessingJob) => void;
  onAllJobsComplete?: (jobs: ProcessingJob[]) => void;
  onError?: (error: string) => void;
  autoProcess?: boolean;
  maxConcurrentJobs?: number;
  acceptedTypes?: string[];
}

export const FileUploadProcessor: React.FC<FileUploadProcessorProps> = ({
  onJobComplete,
  onAllJobsComplete,
  onError,
  autoProcess = true,
  maxConcurrentJobs = 3,
  acceptedTypes = ['.txt', '.pdf', '.docx', '.md', '.json', '.html']
}) => {
  const [jobs, setJobs] = useState<ProcessingJob[]>([]);
  const [activeJobs, setActiveJobs] = useState<Set<string>>(new Set());
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);

  const createJob = (file: LocalFile): ProcessingJob => ({
    id: `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    file,
    status: 'pending',
    progress: 0
  });

  const updateJob = useCallback((jobId: string, updates: Partial<ProcessingJob>) => {
    setJobs(prev => prev.map(job => 
      job.id === jobId ? { ...job, ...updates } : job
    ));
  }, []);

  const processJob = useCallback(async (job: ProcessingJob) => {
    try {
      updateJob(job.id, { status: 'processing', progress: 10 });

      // Parse document
      updateJob(job.id, { progress: 30 });
      const parsedDoc = await documentParserService.parseDocument(job.file);

      // Store in local storage
      updateJob(job.id, { progress: 60 });
      await localStorageService.storeDocument(parsedDoc, job.file);

      // Build search index
      updateJob(job.id, { progress: 80 });
      const storedDoc = await localStorageService.getDocument(parsedDoc.id);
      if (storedDoc) {
        await localStorageService.buildSearchIndex(storedDoc);
        updateJob(job.id, { 
          status: 'completed', 
          progress: 100, 
          result: storedDoc 
        });
        onJobComplete?.(job);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      updateJob(job.id, { 
        status: 'failed', 
        progress: 0, 
        error: errorMessage 
      });
      onError?.(`Failed to process ${job.file.name}: ${errorMessage}`);
    }
  }, [updateJob, onJobComplete, onError]);

  const processQueue = useCallback(async () => {
    const pendingJobs = jobs.filter(job => job.status === 'pending');
    const availableSlots = maxConcurrentJobs - activeJobs.size;
    const jobsToProcess = pendingJobs.slice(0, availableSlots);

    for (const job of jobsToProcess) {
      setActiveJobs(prev => new Set(prev).add(job.id));
      
      processJob(job).finally(() => {
        setActiveJobs(prev => {
          const newSet = new Set(prev);
          newSet.delete(job.id);
          return newSet;
        });
      });
    }
  }, [jobs, activeJobs, maxConcurrentJobs, processJob]);

  React.useEffect(() => {
    if (autoProcess && jobs.some(job => job.status === 'pending') && activeJobs.size < maxConcurrentJobs) {
      processQueue();
    }
  }, [jobs, activeJobs, autoProcess, maxConcurrentJobs, processQueue]);

  React.useEffect(() => {
    const completedJobs = jobs.filter(job => job.status === 'completed' || job.status === 'failed');
    if (completedJobs.length > 0 && completedJobs.length === jobs.length) {
      onAllJobsComplete?.(jobs);
    }
  }, [jobs, onAllJobsComplete]);

  const handleFileSelection = useCallback(async (files: File[]) => {
    const validFiles = files.filter(file => {
      const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
      return acceptedTypes.includes(extension);
    });

    if (validFiles.length !== files.length) {
      onError?.(`Some files were filtered out. Accepted types: ${acceptedTypes.join(', ')}`);
    }

    const newJobs: ProcessingJob[] = [];
    for (const file of validFiles) {
      try {
        // Convert File to LocalFile
        const localFile: LocalFile = {
          id: `${file.name}-${file.size}-${file.lastModified}`,
          name: file.name,
          type: file.type,
          size: file.size,
          lastModified: file.lastModified,
          path: file.name,
          content: await getFileContent(file),
          metadata: { webkitRelativePath: (file as any).webkitRelativePath || '' }
        };

        newJobs.push(createJob(localFile));
      } catch (error) {
        onError?.(`Failed to read file ${file.name}`);
      }
    }

    setJobs(prev => [...prev, ...newJobs]);
  }, [acceptedTypes, onError]);

  const getFileContent = async (file: File): Promise<string | ArrayBuffer> => {
    const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    const textTypes = ['.txt', '.md', '.json', '.html', '.js', '.ts', '.jsx', '.tsx', '.css'];
    
    if (textTypes.includes(extension)) {
      return await file.text();
    } else {
      return await file.arrayBuffer();
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    dragCounterRef.current = 0;

    const files = Array.from(e.dataTransfer.files);
    handleFileSelection(files);
  }, [handleFileSelection]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current++;
    if (dragCounterRef.current === 1) {
      setIsDragOver(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragOver(false);
    }
  }, []);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    handleFileSelection(files);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [handleFileSelection]);

  const removeJob = useCallback((jobId: string) => {
    setJobs(prev => prev.filter(job => job.id !== jobId));
  }, []);

  const retryJob = useCallback((jobId: string) => {
    updateJob(jobId, { status: 'pending', progress: 0, error: undefined });
  }, [updateJob]);

  const clearCompleted = useCallback(() => {
    setJobs(prev => prev.filter(job => job.status !== 'completed' && job.status !== 'failed'));
  }, []);

  const getStatusIcon = (status: ProcessingJob['status']): string => {
    switch (status) {
      case 'pending': return '⏳';
      case 'processing': return '⚙️';
      case 'completed': return '✅';
      case 'failed': return '❌';
      default: return '❓';
    }
  };

  const getStatusColor = (status: ProcessingJob['status']): string => {
    switch (status) {
      case 'pending': return '#6c757d';
      case 'processing': return '#007bff';
      case 'completed': return '#28a745';
      case 'failed': return '#dc3545';
      default: return '#6c757d';
    }
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

  const totalJobs = jobs.length;
  const completedJobs = jobs.filter(job => job.status === 'completed').length;
  const failedJobs = jobs.filter(job => job.status === 'failed').length;
  const processingJobs = jobs.filter(job => job.status === 'processing').length;

  return (
    <div className="file-upload-processor">
      <div className="upload-area">
        <div
          className={`drop-zone ${isDragOver ? 'drag-over' : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
        >
          <div className="drop-zone-content">
            <div className="upload-icon">📁</div>
            <h3>Drop files here or click to browse</h3>
            <p>Supported formats: {acceptedTypes.join(', ')}</p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="btn btn-primary"
            >
              Select Files
            </button>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedTypes.join(',')}
          onChange={handleFileInputChange}
          style={{ display: 'none' }}
        />
      </div>

      {totalJobs > 0 && (
        <div className="processing-status">
          <div className="status-header">
            <h4>Processing Status</h4>
            <div className="status-summary">
              <span className="status-item">
                Total: {totalJobs}
              </span>
              <span className="status-item completed">
                Completed: {completedJobs}
              </span>
              <span className="status-item processing">
                Processing: {processingJobs}
              </span>
              <span className="status-item failed">
                Failed: {failedJobs}
              </span>
            </div>
          </div>

          <div className="status-actions">
            {completedJobs > 0 && (
              <button onClick={clearCompleted} className="btn btn-secondary btn-small">
                Clear Completed
              </button>
            )}
          </div>
        </div>
      )}

      {jobs.length > 0 && (
        <div className="jobs-list">
          {jobs.map(job => (
            <div key={job.id} className="job-item">
              <div className="job-header">
                <span className="job-status" style={{ color: getStatusColor(job.status) }}>
                  {getStatusIcon(job.status)}
                </span>
                <div className="job-info">
                  <div className="job-name">{job.file.name}</div>
                  <div className="job-details">
                    {formatFileSize(job.file.size)} • {job.file.type || 'Unknown type'}
                  </div>
                </div>
                <div className="job-actions">
                  {job.status === 'failed' && (
                    <button
                      onClick={() => retryJob(job.id)}
                      className="btn btn-small btn-warning"
                    >
                      Retry
                    </button>
                  )}
                  <button
                    onClick={() => removeJob(job.id)}
                    className="btn btn-small btn-danger"
                  >
                    Remove
                  </button>
                </div>
              </div>

              {(job.status === 'processing' || job.status === 'completed') && (
                <div className="job-progress">
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${job.progress}%`,
                        backgroundColor: getStatusColor(job.status)
                      }}
                    />
                  </div>
                  <span className="progress-text">{job.progress}%</span>
                </div>
              )}

              {job.error && (
                <div className="job-error">
                  ⚠️ {job.error}
                </div>
              )}

              {job.result && (
                <div className="job-result">
                  <div className="result-summary">
                    ✅ Processed: {job.result.metadata.wordCount} words, 
                    {job.result.sections?.length || 0} sections
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        .file-upload-processor {
          padding: 20px;
          background: white;
          border-radius: 8px;
          border: 1px solid #ddd;
        }

        .drop-zone {
          border: 2px dashed #ccc;
          border-radius: 8px;
          padding: 40px;
          text-align: center;
          transition: all 0.3s ease;
          background: #fafafa;
        }

        .drop-zone.drag-over {
          border-color: #007bff;
          background: #e7f3ff;
        }

        .drop-zone-content {
          pointer-events: none;
        }

        .upload-icon {
          font-size: 48px;
          margin-bottom: 16px;
        }

        .drop-zone h3 {
          margin: 0 0 8px 0;
          color: #333;
        }

        .drop-zone p {
          margin: 0 0 16px 0;
          color: #666;
          font-size: 14px;
        }

        .processing-status {
          margin: 20px 0;
          padding: 16px;
          background: #f8f9fa;
          border-radius: 6px;
          border: 1px solid #e9ecef;
        }

        .status-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .status-header h4 {
          margin: 0;
          color: #333;
        }

        .status-summary {
          display: flex;
          gap: 16px;
          font-size: 14px;
        }

        .status-item {
          padding: 4px 8px;
          border-radius: 4px;
          background: white;
          border: 1px solid #ddd;
        }

        .status-item.completed {
          background: #d4edda;
          border-color: #c3e6cb;
          color: #155724;
        }

        .status-item.processing {
          background: #cce7ff;
          border-color: #b3d9ff;
          color: #004085;
        }

        .status-item.failed {
          background: #f8d7da;
          border-color: #f5c6cb;
          color: #721c24;
        }

        .status-actions {
          display: flex;
          gap: 8px;
        }

        .jobs-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .job-item {
          padding: 16px;
          border: 1px solid #eee;
          border-radius: 6px;
          background: white;
        }

        .job-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 8px;
        }

        .job-status {
          font-size: 20px;
        }

        .job-info {
          flex: 1;
        }

        .job-name {
          font-weight: 500;
          color: #333;
          margin-bottom: 2px;
        }

        .job-details {
          font-size: 12px;
          color: #666;
        }

        .job-actions {
          display: flex;
          gap: 6px;
        }

        .job-progress {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 8px 0;
        }

        .progress-bar {
          flex: 1;
          height: 6px;
          background: #e9ecef;
          border-radius: 3px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          transition: width 0.3s ease;
        }

        .progress-text {
          font-size: 12px;
          color: #666;
          min-width: 30px;
        }

        .job-error {
          margin-top: 8px;
          padding: 8px 12px;
          background: #f8d7da;
          border: 1px solid #f5c6cb;
          border-radius: 4px;
          color: #721c24;
          font-size: 12px;
        }

        .job-result {
          margin-top: 8px;
          padding: 8px 12px;
          background: #d4edda;
          border: 1px solid #c3e6cb;
          border-radius: 4px;
          color: #155724;
          font-size: 12px;
        }

        .btn {
          padding: 8px 16px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          transition: background-color 0.2s;
          pointer-events: auto;
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

        .btn-warning {
          background: #ffc107;
          color: #212529;
        }

        .btn-warning:hover {
          background: #e0a800;
        }

        .btn-danger {
          background: #dc3545;
          color: white;
        }

        .btn-danger:hover {
          background: #c82333;
        }
      `}</style>
    </div>
  );
};

export default FileUploadProcessor;