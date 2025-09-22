import React, { useState, useCallback, useRef } from 'react';
import { useDocumentPIIScanning } from '../../hooks/usePIIDetection';
import { PIIDetectionResult, PIIMatch, PIIType } from '../../services/pii/PIIDetector';
import './PIIDocumentProcessor.css';

interface ProcessedDocument {
  file: File;
  originalContent: string;
  scanResult: PIIDetectionResult;
  shouldBlock: boolean;
  redactedContent?: string;
  recommendations: string[];
  processedAt: Date;
}

interface PIIDocumentProcessorProps {
  onDocumentProcessed: (document: ProcessedDocument) => void;
  onDocumentBlocked: (document: ProcessedDocument) => void;
  onDocumentApproved: (document: ProcessedDocument) => void;
  maxFileSize?: number;
  allowedTypes?: string[];
  enableAutoRedaction?: boolean;
}

const PIIDocumentProcessor: React.FC<PIIDocumentProcessorProps> = ({
  onDocumentProcessed,
  onDocumentBlocked,
  onDocumentApproved,
  maxFileSize = 10 * 1024 * 1024, // 10MB
  allowedTypes = ['text/plain', 'text/markdown', 'application/pdf', 'text/csv'],
  enableAutoRedaction = true
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingQueue, setProcessingQueue] = useState<File[]>([]);
  const [processedDocuments, setProcessedDocuments] = useState<ProcessedDocument[]>([]);
  const [showResultModal, setShowResultModal] = useState(false);
  const [currentResult, setCurrentResult] = useState<ProcessedDocument | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const documentScanner = useDocumentPIIScanning();

  const handleFileSelect = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const validFiles = fileArray.filter(file => {
      // Check file size
      if (file.size > maxFileSize) {
        console.warn(`File ${file.name} exceeds size limit`);
        return false;
      }

      // Check file type
      if (!allowedTypes.includes(file.type) && !allowedTypes.some(type => file.name.endsWith(type.split('/')[1]))) {
        console.warn(`File ${file.name} has unsupported type`);
        return false;
      }

      return true;
    });

    if (validFiles.length > 0) {
      setProcessingQueue(prev => [...prev, ...validFiles]);
      processFiles(validFiles);
    }
  }, [maxFileSize, allowedTypes]);

  const processFiles = async (files: File[]) => {
    setIsProcessing(true);

    for (const file of files) {
      try {
        const result = await documentScanner.preprocessDocument(file);
        const processedDoc: ProcessedDocument = {
          file,
          ...result,
          processedAt: new Date()
        };

        setProcessedDocuments(prev => [...prev, processedDoc]);
        onDocumentProcessed(processedDoc);

        if (processedDoc.shouldBlock) {
          onDocumentBlocked(processedDoc);
          setCurrentResult(processedDoc);
          setShowResultModal(true);
        } else {
          onDocumentApproved(processedDoc);
        }

      } catch (error) {
        console.error(`Error processing ${file.name}:`, error);
      }
    }

    setIsProcessing(false);
    setProcessingQueue([]);
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelect(e.target.files);
      e.target.value = ''; // Reset input
    }
  }, [handleFileSelect]);

  const handleApproveWithRedaction = () => {
    if (currentResult) {
      onDocumentApproved({
        ...currentResult,
        shouldBlock: false,
        originalContent: currentResult.redactedContent || currentResult.originalContent
      });
      setShowResultModal(false);
      setCurrentResult(null);
    }
  };

  const handleRejectDocument = () => {
    if (currentResult) {
      onDocumentBlocked(currentResult);
      setShowResultModal(false);
      setCurrentResult(null);
    }
  };

  const getRiskIcon = (riskLevel: string) => {
    switch (riskLevel) {
      case 'critical': return '🚨';
      case 'high': return '⚠️';
      case 'medium': return '⚡';
      case 'low': return 'ℹ️';
      default: return '📄';
    }
  };

  const getTypeIcon = (type: PIIType) => {
    switch (type) {
      case PIIType.ATTORNEY_CLIENT_PRIVILEGE: return '🔒';
      case PIIType.SSN: return '🆔';
      case PIIType.CREDIT_CARD: return '💳';
      case PIIType.EMAIL: return '📧';
      case PIIType.PHONE: return '📞';
      case PIIType.BSN: return '🇳🇱';
      case PIIType.CASE_NUMBER: return '⚖️';
      case PIIType.COURT_NAME: return '🏛️';
      default: return '📄';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="pii-document-processor">
      {/* File Drop Zone */}
      <div
        ref={dropZoneRef}
        className={`document-drop-zone ${isProcessing ? 'processing' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="drop-zone-content">
          {isProcessing ? (
            <>
              <div className="processing-spinner">🔄</div>
              <h3>Processing Documents...</h3>
              <p>Scanning for PII and sensitive information</p>
              {processingQueue.length > 0 && (
                <div className="processing-queue">
                  {processingQueue.map((file, index) => (
                    <div key={index} className="processing-file">
                      📄 {file.name}
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="drop-zone-icon">📁</div>
              <h3>Upload Documents for PII Scanning</h3>
              <p>Drop files here or click to browse</p>
              <div className="supported-formats">
                <strong>Supported:</strong> TXT, MD, PDF, CSV (max {formatFileSize(maxFileSize)})
              </div>
            </>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={allowedTypes.join(',')}
          onChange={handleFileInputChange}
          style={{ display: 'none' }}
        />
      </div>

      {/* Processing Status */}
      {documentScanner.isScanning && (
        <div className="processing-status">
          <div className="status-indicator">
            <div className="scanning-animation">🔍</div>
            <span>Scanning for PII...</span>
          </div>
        </div>
      )}

      {/* Processed Documents List */}
      {processedDocuments.length > 0 && (
        <div className="processed-documents">
          <h3>Processed Documents ({processedDocuments.length})</h3>

          <div className="documents-list">
            {processedDocuments.map((doc, index) => (
              <div key={index} className={`document-item ${doc.shouldBlock ? 'blocked' : 'approved'}`}>
                <div className="document-header">
                  <div className="document-info">
                    <span className="document-icon">📄</span>
                    <div className="document-details">
                      <span className="document-name">{doc.file.name}</span>
                      <span className="document-size">{formatFileSize(doc.file.size)}</span>
                    </div>
                  </div>

                  <div className="document-status">
                    <span className={`risk-indicator ${doc.scanResult.riskLevel}`}>
                      {getRiskIcon(doc.scanResult.riskLevel)}
                      {doc.scanResult.riskLevel.toUpperCase()}
                    </span>
                    <span className={`processing-result ${doc.shouldBlock ? 'blocked' : 'approved'}`}>
                      {doc.shouldBlock ? '🚫 BLOCKED' : '✅ APPROVED'}
                    </span>
                  </div>
                </div>

                {doc.scanResult.hasPII && (
                  <div className="pii-summary">
                    <div className="pii-types">
                      {Array.from(new Set(doc.scanResult.matches.map(m => m.type))).map(type => (
                        <span key={type} className="pii-type-badge">
                          {getTypeIcon(type as PIIType)} {type}
                        </span>
                      ))}
                    </div>
                    <div className="pii-count">
                      {doc.scanResult.matches.length} PII element{doc.scanResult.matches.length !== 1 ? 's' : ''} detected
                    </div>
                  </div>
                )}

                <div className="document-actions">
                  <button
                    className="view-details-btn"
                    onClick={() => {
                      setCurrentResult(doc);
                      setShowResultModal(true);
                    }}
                  >
                    View Details
                  </button>

                  {doc.shouldBlock && enableAutoRedaction && doc.redactedContent && (
                    <button
                      className="approve-redacted-btn"
                      onClick={() => {
                        onDocumentApproved({
                          ...doc,
                          shouldBlock: false,
                          originalContent: doc.redactedContent!
                        });
                      }}
                    >
                      Approve Redacted
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Result Modal */}
      {showResultModal && currentResult && (
        <div className="result-modal-overlay">
          <div className="result-modal">
            <div className="modal-header">
              <h2>Document Analysis Results</h2>
              <button
                className="close-btn"
                onClick={() => setShowResultModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="modal-content">
              <div className="document-summary">
                <div className="document-info-detailed">
                  <h3>📄 {currentResult.file.name}</h3>
                  <div className="file-metadata">
                    <span>Size: {formatFileSize(currentResult.file.size)}</span>
                    <span>Type: {currentResult.file.type}</span>
                    <span>Processed: {currentResult.processedAt.toLocaleString()}</span>
                  </div>
                </div>

                <div className={`risk-assessment ${currentResult.scanResult.riskLevel}`}>
                  <div className="risk-header">
                    <span className="risk-icon">{getRiskIcon(currentResult.scanResult.riskLevel)}</span>
                    <span className="risk-text">{currentResult.scanResult.riskLevel.toUpperCase()} RISK</span>
                  </div>
                  <div className="risk-description">
                    {currentResult.shouldBlock ? 'Document blocked due to sensitive content' : 'Document approved for processing'}
                  </div>
                </div>
              </div>

              {currentResult.scanResult.hasPII && (
                <div className="pii-details">
                  <h4>Detected PII Elements ({currentResult.scanResult.matches.length})</h4>

                  <div className="pii-matches-detailed">
                    {currentResult.scanResult.matches.map((match, index) => (
                      <div key={index} className="pii-match-detail">
                        <div className="match-header">
                          <span className="match-type">
                            {getTypeIcon(match.type)} {match.type}
                          </span>
                          <span className="match-confidence">
                            {Math.round(match.confidence * 100)}% confidence
                          </span>
                        </div>
                        <div className="match-text">
                          Position: {match.start}-{match.end}
                        </div>
                        {match.isLegalPrivileged && (
                          <div className="privilege-warning">
                            🔒 Attorney-client privileged content
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {currentResult.recommendations.length > 0 && (
                <div className="recommendations">
                  <h4>Recommendations</h4>
                  <ul>
                    {currentResult.recommendations.map((rec, index) => (
                      <li key={index}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}

              {currentResult.redactedContent && enableAutoRedaction && (
                <div className="redacted-preview">
                  <h4>Redacted Version Available</h4>
                  <p>A version with PII redacted is available for safe processing.</p>
                  <div className="redacted-sample">
                    <pre>{currentResult.redactedContent.substring(0, 200)}...</pre>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => setShowResultModal(false)}>
                Close
              </button>

              {currentResult.shouldBlock ? (
                <>
                  <button className="reject-btn" onClick={handleRejectDocument}>
                    Reject Document
                  </button>
                  {currentResult.redactedContent && enableAutoRedaction && (
                    <button className="approve-redacted-btn" onClick={handleApproveWithRedaction}>
                      Approve Redacted Version
                    </button>
                  )}
                </>
              ) : (
                <button
                  className="approve-btn"
                  onClick={() => {
                    onDocumentApproved(currentResult);
                    setShowResultModal(false);
                  }}
                >
                  Approve Document
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PIIDocumentProcessor;