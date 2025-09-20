import { useState, useRef } from 'react';
import type { FC, DragEvent, ChangeEvent } from 'react';

import {
  CloudArrowUpIcon,
  DocumentTextIcon,
  XMarkIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

interface DocumentUploadProps {
  onUpload: (files: FileList) => void;
  maxSize?: number; // in bytes
  acceptedTypes?: string[];
}

export const DocumentUpload: FC<DocumentUploadProps> = ({
  onUpload,
  maxSize = 50 * 1024 * 1024, // 50MB default
  acceptedTypes = ['.pdf', '.doc', '.docx', '.txt', '.rtf']
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<Array<{
    file: File;
    progress: number;
    status: 'uploading' | 'success' | 'error';
    error?: string;
  }>>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > maxSize) {
      return `File size exceeds ${formatFileSize(maxSize)} limit`;
    }

    // Check file type
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!acceptedTypes.includes(fileExtension)) {
      return `File type not supported. Accepted types: ${acceptedTypes.join(', ')}`;
    }

    return null;
  };

  const simulateUpload = (file: File): Promise<void> => {
    return new Promise((resolve, reject) => {
      const uploadItem = {
        file,
        progress: 0,
        status: 'uploading' as const
      };

      setUploadingFiles(prev => [...prev, uploadItem]);

      // Simulate upload progress
      const interval = setInterval(() => {
        setUploadingFiles(prev => 
          prev.map(item => 
            item.file === file && item.progress < 100
              ? { ...item, progress: Math.min(item.progress + 10, 100) }
              : item
          )
        );
      }, 200);

      // Complete upload after 2 seconds
      setTimeout(() => {
        clearInterval(interval);
        
        // Random chance of error for demo
        const hasError = Math.random() < 0.1;
        
        setUploadingFiles(prev => 
          prev.map(item => 
            item.file === file
              ? { 
                  ...item, 
                  progress: 100, 
                  status: hasError ? 'error' : 'success',
                  error: hasError ? 'Upload failed. Please try again.' : undefined
                }
              : item
          )
        );

        if (hasError) {
          reject(new Error('Upload failed'));
        } else {
          resolve();
        }
      }, 2000);
    });
  };

  const handleFiles = async (files: FileList) => {
    const validFiles: File[] = [];
    const errors: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const error = validateFile(file);
      
      if (error) {
        errors.push(`${file.name}: ${error}`);
      } else {
        validFiles.push(file);
      }
    }

    // Show validation errors
    if (errors.length > 0) {
      window.alert(errors.join('\n'));
    }

    // Process valid files
    for (const file of validFiles) {
      try {
        await simulateUpload(file);
      } catch (error) {
        console.error('Upload error:', error);
      }
    }

    // Call parent handler
    if (validFiles.length > 0) {
      const fileList = new DataTransfer();
      validFiles.forEach(file => fileList.items.add(file));
      onUpload(fileList.files);
    }
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);

    const files = event.dataTransfer.files;
    if (files.length > 0) {
      handleFiles(files);
    }
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFiles(files);
    }
    // Reset input value to allow re-uploading the same file
    e.target.value = '';
  };

  const removeUploadingFile = (file: File) => {
    setUploadingFiles(prev => prev.filter(item => item.file !== file));
  };

  const clearCompletedUploads = () => {
    setUploadingFiles(prev => prev.filter(item => item.status === 'uploading'));
  };

  return (
    <div className="space-y-4">
      {/* Upload Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200
          ${isDragOver 
            ? 'border-bear-green bg-green-50 border-solid' 
            : 'border-gray-300 hover:border-bear-green hover:bg-gray-50'
          }
        `}
      >
        <div className="space-y-4">
          <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center ${
            isDragOver ? 'bg-bear-green text-white' : 'bg-gray-100 text-gray-500'
          }`}>
            <CloudArrowUpIcon className="w-6 h-6" />
          </div>
          
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {isDragOver ? 'Drop files here' : 'Upload Legal Documents'}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Drag and drop files here, or{' '}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-bear-green hover:text-bear-green-dark font-medium"
              >
                browse files
              </button>
            </p>
          </div>

          <div className="text-xs text-gray-500 space-y-1">
            <div>Supported formats: {acceptedTypes.join(', ')}</div>
            <div>Maximum file size: {formatFileSize(maxSize)}</div>
          </div>
        </div>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedTypes.join(',')}
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Upload Progress */}
      {uploadingFiles.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-gray-900">Upload Progress</h4>
            <button
              onClick={clearCompletedUploads}
              className="text-sm text-gray-500 hover:text-bear-navy"
            >
              Clear completed
            </button>
          </div>
          
          <div className="space-y-3">
            {uploadingFiles.map((item, index) => (
              <div key={index} className="flex items-center space-x-3">
                <DocumentTextIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900 truncate">
                      {item.file.name}
                    </span>
                    <div className="flex items-center space-x-2">
                      {item.status === 'success' && (
                        <CheckCircleIcon className="w-4 h-4 text-bear-green" />
                      )}
                      {item.status === 'error' && (
                        <span className="text-xs text-bear-red">Failed</span>
                      )}
                      {item.status !== 'uploading' && (
                        <button
                          onClick={() => removeUploadingFile(item.file)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <XMarkIcon className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-2 transition-all duration-300 ${
                          item.status === 'success' ? 'bg-bear-green' :
                          item.status === 'error' ? 'bg-bear-red' :
                          'bg-blue-500'
                        }`}
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 w-12 text-right">
                      {item.progress}%
                    </span>
                  </div>
                  
                  {item.error && (
                    <p className="text-xs text-bear-red mt-1">{item.error}</p>
                  )}
                  
                  <div className="text-xs text-gray-500 mt-1">
                    {formatFileSize(item.file.size)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};