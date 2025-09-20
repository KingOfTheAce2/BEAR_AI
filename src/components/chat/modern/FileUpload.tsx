import React, { useState, useRef, useCallback } from 'react';
import './FileUpload.css';

interface FileUploadProps {
  onFileUpload: (files: FileList) => void;
  children: React.ReactNode;
  maxFiles?: number;
  maxSize?: number; // in MB
  acceptedTypes?: string[];
  disabled?: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({
  onFileUpload,
  children,
  maxFiles = 10,
  maxSize = 50, // 50MB default
  acceptedTypes = ['image/*', 'text/*', 'application/pdf', 'application/json', '.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.cpp', '.c', '.html', '.css', '.md'],
  disabled = false
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewFiles, setPreviewFiles] = useState<File[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropAreaRef = useRef<HTMLDivElement>(null);

  const validateFile = (file: File): { valid: boolean; error?: string } => {
    // Check file size
    if (file.size > maxSize * 1024 * 1024) {
      return { valid: false, error: `File size must be less than ${maxSize}MB` };
    }

    // Check file type
    const isTypeAccepted = acceptedTypes.some(type => {
      if (type.endsWith('/*')) {
        return file.type.startsWith(type.replace('/*', '/'));
      }
      if (type.startsWith('.')) {
        return file.name.toLowerCase().endsWith(type.toLowerCase());
      }
      return file.type === type;
    });

    if (!isTypeAccepted) {
      return { valid: false, error: 'File type not supported' };
    }

    return { valid: true };
  };

  const processFiles = useCallback(async (files: FileList) => {
    if (disabled) return;

    setIsProcessing(true);
    const validFiles: File[] = [];
    const errors: string[] = [];

    // Check number of files
    if (files.length > maxFiles) {
      errors.push(`Maximum ${maxFiles} files allowed`);
      setIsProcessing(false);
      return;
    }

    // Validate each file
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const validation = validateFile(file);
      
      if (validation.valid) {
        validFiles.push(file);
      } else {
        errors.push(`${file.name}: ${validation.error}`);
      }
    }

    if (errors.length > 0) {
      window.alert('Upload errors:\n' + errors.join('\n'));
    }

    if (validFiles.length > 0) {
      setPreviewFiles(validFiles);
      setShowPreview(true);
    }

    setIsProcessing(false);
  }, [disabled, maxFiles, maxSize, acceptedTypes]);

  const handleDragEnter = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();

    // Only set drag over to false if we're leaving the drop area entirely
    if (dropAreaRef.current && !dropAreaRef.current.contains(event.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  }, []);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);

    const files = event.dataTransfer.files;
    if (files.length > 0) {
      processFiles(files);
    }
  }, [processFiles]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFiles(files);
    }
    // Reset input value to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [processFiles]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [disabled]);

  const confirmUpload = () => {
    if (previewFiles.length > 0) {
      const fileList = new DataTransfer();
      previewFiles.forEach(file => fileList.items.add(file));
      onFileUpload(fileList.files);
      setPreviewFiles([]);
      setShowPreview(false);
    }
  };

  const cancelUpload = () => {
    setPreviewFiles([]);
    setShowPreview(false);
  };

  const removeFile = (index: number) => {
    setPreviewFiles(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (file: File): string => {
    if (file.type.startsWith('image/')) return '🖼️';
    if (file.type.startsWith('video/')) return '🎥';
    if (file.type.startsWith('audio/')) return '🎵';
    if (file.type === 'application/pdf') return '📄';
    if (file.type.includes('text') || file.name.match(/\.(txt|md|json|js|ts|jsx|tsx|py|java|cpp|c|html|css)$/i)) return '📝';
    return '📎';
  };

  const createPreview = (file: File): string | null => {
    if (file.type.startsWith('image/')) {
      return URL.createObjectURL(file);
    }
    return null;
  };

  return (
    <div className="file-upload-wrapper">
      <div
        ref={dropAreaRef}
        className={`file-upload-area ${isDragOver ? 'drag-over' : ''} ${disabled ? 'disabled' : ''}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedTypes.join(',')}
          onChange={handleFileSelect}
          className="file-input-hidden"
          disabled={disabled}
        />

        <div className="file-upload-trigger">
          {children}
        </div>

        {isDragOver && (
          <div className="drag-overlay">
            <div className="drag-content">
              <div className="drag-icon">📁</div>
              <div className="drag-text">Drop files here</div>
            </div>
          </div>
        )}
      </div>

      {isProcessing && (
        <div className="processing-overlay">
          <div className="processing-spinner"></div>
          <span>Processing files...</span>
        </div>
      )}

      {/* File Preview Modal */}
      {showPreview && (
        <div className="file-preview-modal">
          <div className="preview-backdrop" onClick={cancelUpload} />
          <div className="preview-content">
            <div className="preview-header">
              <h3>Upload Files ({previewFiles.length})</h3>
              <button className="close-btn" onClick={cancelUpload}>×</button>
            </div>

            <div className="preview-list">
              {previewFiles.map((file, index) => {
                const previewUrl = createPreview(file);
                return (
                  <div key={index} className="preview-item">
                    <div className="file-preview">
                      {previewUrl ? (
                        <img 
                          src={previewUrl} 
                          alt={file.name}
                          className="image-preview"
                          onLoad={() => URL.revokeObjectURL(previewUrl)}
                        />
                      ) : (
                        <div className="file-icon-large">
                          {getFileIcon(file)}
                        </div>
                      )}
                    </div>

                    <div className="file-details">
                      <div className="file-name">{file.name}</div>
                      <div className="file-meta">
                        <span className="file-size">{formatFileSize(file.size)}</span>
                        <span className="file-type">{file.type || 'Unknown'}</span>
                      </div>
                    </div>

                    <button 
                      className="remove-file-btn"
                      onClick={() => removeFile(index)}
                      title="Remove file"
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="preview-actions">
              <button className="cancel-btn" onClick={cancelUpload}>
                Cancel
              </button>
              <button 
                className="upload-btn"
                onClick={confirmUpload}
                disabled={previewFiles.length === 0}
              >
                Upload {previewFiles.length} file{previewFiles.length !== 1 ? 's' : ''}
              </button>
            </div>

            <div className="upload-info">
              <div className="info-row">
                <span>Max files: {maxFiles}</span>
                <span>Max size per file: {maxSize}MB</span>
              </div>
              <div className="supported-types">
                Supported: Images, Text files, PDFs, Code files
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUpload;