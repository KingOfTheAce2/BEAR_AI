import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, XCircle, Play, Pause, Square, Download, Settings } from 'lucide-react';
import { advancedAnalyzer, AnalysisProgress } from '../../services/document/AdvancedAnalyzer';
import { documentVersionControl } from '../../services/document/VersionControl';

/**
 * Batch Document Processor Component
 * Handles multiple document processing with progress tracking and error handling
 */

export interface BatchJob {
  id: string;
  files: File[];
  status: 'pending' | 'processing' | 'completed' | 'error' | 'cancelled';
  progress: number;
  startTime?: Date;
  endTime?: Date;
  results: Array<{
    file: File;
    analysis?: any;
    error?: string;
    processingTime?: number;
  }>;
  settings: BatchProcessingSettings;
}

export interface BatchProcessingSettings {
  enableOCR: boolean;
  enableEntityRecognition: boolean;
  enablePatternMatching: boolean;
  enableComplianceChecking: boolean;
  enableVersionTracking: boolean;
  parallelProcessing: boolean;
  maxConcurrentJobs: number;
  outputFormat: 'json' | 'csv' | 'pdf' | 'html';
  saveToDatabase: boolean;
  createBackups: boolean;
}

export interface ProcessingStatistics {
  totalFiles: number;
  processedFiles: number;
  failedFiles: number;
  avgProcessingTime: number;
  totalProcessingTime: number;
  throughput: number; // files per minute
}

const defaultSettings: BatchProcessingSettings = {
  enableOCR: true,
  enableEntityRecognition: true,
  enablePatternMatching: true,
  enableComplianceChecking: true,
  enableVersionTracking: false,
  parallelProcessing: true,
  maxConcurrentJobs: 3,
  outputFormat: 'json',
  saveToDatabase: true,
  createBackups: false
};

export const BatchProcessor: React.FC = () => {
  const [jobs, setJobs] = useState<BatchJob[]>([]);
  const [activeJob, setActiveJob] = useState<string | null>(null);
  const [settings, setSettings] = useState<BatchProcessingSettings>(defaultSettings);
  const [showSettings, setShowSettings] = useState(false);
  const [statistics, setStatistics] = useState<ProcessingStatistics>({
    totalFiles: 0,
    processedFiles: 0,
    failedFiles: 0,
    avgProcessingTime: 0,
    totalProcessingTime: 0,
    throughput: 0
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Set up progress monitoring
    if (activeJob) {
      progressIntervalRef.current = setInterval(() => {
        updateJobProgress(activeJob);
      }, 1000);
    }

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [activeJob]);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const newJob: BatchJob = {
      id: generateJobId(),
      files: Array.from(files),
      status: 'pending',
      progress: 0,
      results: [],
      settings: { ...settings }
    };

    setJobs(prev => [...prev, newJob]);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [settings]);

  const startBatchProcessing = useCallback(async (jobId: string) => {
    const job = jobs.find(j => j.id === jobId);
    if (!job || job.status !== 'pending') return;

    setActiveJob(jobId);

    // Update job status
    setJobs(prev => prev.map(j =>
      j.id === jobId
        ? { ...j, status: 'processing', startTime: new Date() }
        : j
    ));

    try {
      await processBatch(job);
    } catch (error) {
      console.error('Batch processing failed:', error);
      setJobs(prev => prev.map(j =>
        j.id === jobId
          ? { ...j, status: 'error', endTime: new Date() }
          : j
      ));
    } finally {
      setActiveJob(null);
    }
  }, [jobs]);

  const processBatch = async (job: BatchJob) => {
    const { files, settings: jobSettings } = job;
    const results: typeof job.results = [];

    if (jobSettings.parallelProcessing) {
      // Process files in parallel with concurrency limit
      const batches = chunkArray(files, jobSettings.maxConcurrentJobs);

      for (const batch of batches) {
        const batchPromises = batch.map(file => processFile(file, jobSettings));
        const batchResults = await Promise.allSettled(batchPromises);

        batchResults.forEach((result, index) => {
          const file = batch[index];
          if (result.status === 'fulfilled') {
            results.push({
              file,
              analysis: result.value.analysis,
              processingTime: result.value.processingTime
            });
          } else {
            results.push({
              file,
              error: result.reason?.message || 'Processing failed'
            });
          }
        });

        // Update progress
        const progress = (results.length / files.length) * 100;
        setJobs(prev => prev.map(j =>
          j.id === job.id
            ? { ...j, progress, results: [...results] }
            : j
        ));
      }
    } else {
      // Process files sequentially
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        try {
          const result = await processFile(file, jobSettings);
          results.push({
            file,
            analysis: result.analysis,
            processingTime: result.processingTime
          });
        } catch (error) {
          results.push({
            file,
            error: error instanceof Error ? error.message : 'Processing failed'
          });
        }

        // Update progress
        const progress = ((i + 1) / files.length) * 100;
        setJobs(prev => prev.map(j =>
          j.id === job.id
            ? { ...j, progress, results: [...results] }
            : j
        ));
      }
    }

    // Finalize job
    setJobs(prev => prev.map(j =>
      j.id === job.id
        ? {
            ...j,
            status: 'completed',
            endTime: new Date(),
            results
          }
        : j
    ));

    // Update statistics
    updateStatistics(results);

    // Save results if requested
    if (jobSettings.saveToDatabase) {
      await saveResults(job.id, results);
    }
  };

  const processFile = async (
    file: File,
    settings: BatchProcessingSettings
  ): Promise<{ analysis: any; processingTime: number }> => {
    const startTime = Date.now();

    // Create temporary file path (in a real implementation, you'd use proper file handling)
    const tempPath = `temp://${file.name}`;

    const { analysis } = await advancedAnalyzer.analyzeDocument(tempPath, {
      enableOCR: settings.enableOCR,
      enableEntityRecognition: settings.enableEntityRecognition,
      enablePatternMatching: settings.enablePatternMatching,
      enableComplianceChecking: settings.enableComplianceChecking,
    });

    // Create version if tracking is enabled
    if (settings.enableVersionTracking && analysis) {
      await documentVersionControl.createVersion(analysis.id, analysis, {
        comment: 'Batch processing result',
        tags: ['batch', 'automated']
      });
    }

    const processingTime = Date.now() - startTime;
    return { analysis, processingTime };
  };

  const updateJobProgress = (jobId: string) => {
    // Get progress from advanced analyzer if available
    const progress = advancedAnalyzer.getProgress(jobId);
    if (progress) {
      setJobs(prev => prev.map(j =>
        j.id === jobId
          ? { ...j, progress: progress.progress }
          : j
      ));
    }
  };

  const cancelJob = useCallback((jobId: string) => {
    setJobs(prev => prev.map(j =>
      j.id === jobId
        ? { ...j, status: 'cancelled', endTime: new Date() }
        : j
    ));

    if (activeJob === jobId) {
      setActiveJob(null);
    }

    // Cancel in advanced analyzer
    advancedAnalyzer.cancelJob(jobId);
  }, [activeJob]);

  const exportResults = useCallback((jobId: string, format: string) => {
    const job = jobs.find(j => j.id === jobId);
    if (!job) return;

    const successfulResults = job.results.filter(r => r.analysis);

    let exportData: string;
    let filename: string;
    let mimeType: string;

    switch (format) {
      case 'json':
        exportData = JSON.stringify(successfulResults, null, 2);
        filename = `batch_results_${jobId}.json`;
        mimeType = 'application/json';
        break;

      case 'csv':
        exportData = convertToCSV(successfulResults);
        filename = `batch_results_${jobId}.csv`;
        mimeType = 'text/csv';
        break;

      case 'html':
        exportData = convertToHTML(successfulResults);
        filename = `batch_results_${jobId}.html`;
        mimeType = 'text/html';
        break;

      default:
        return;
    }

    // Create and download file
    const blob = new Blob([exportData], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, [jobs]);

  const updateStatistics = (results: BatchJob['results']) => {
    const processed = results.filter(r => r.analysis).length;
    const failed = results.filter(r => r.error).length;
    const totalTime = results.reduce((sum, r) => sum + (r.processingTime || 0), 0);
    const avgTime = processed > 0 ? totalTime / processed : 0;

    setStatistics(prev => ({
      totalFiles: prev.totalFiles + results.length,
      processedFiles: prev.processedFiles + processed,
      failedFiles: prev.failedFiles + failed,
      avgProcessingTime: (prev.avgProcessingTime + avgTime) / 2,
      totalProcessingTime: prev.totalProcessingTime + totalTime,
      throughput: prev.processedFiles > 0 ? (prev.processedFiles / (prev.totalProcessingTime / 60000)) : 0
    }));
  };

  const saveResults = async (jobId: string, results: BatchJob['results']) => {
    // In a real implementation, this would save to a database
    console.log(`Saving ${results.length} results for job ${jobId}`);
  };

  const getStatusIcon = (status: BatchJob['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'processing':
        return <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'cancelled':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      default:
        return <FileText className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: BatchJob['status']) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-50';
      case 'processing':
        return 'text-blue-600 bg-blue-50';
      case 'error':
        return 'text-red-600 bg-red-50';
      case 'cancelled':
        return 'text-yellow-600 bg-yellow-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Batch Document Processor</h1>
          <p className="text-gray-600 mt-1">Process multiple legal documents simultaneously</p>
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          <Settings className="w-4 h-4" />
          Settings
        </button>
      </div>

      {/* Statistics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Files</p>
              <p className="text-2xl font-bold text-gray-900">{statistics.totalFiles}</p>
            </div>
            <FileText className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Processed</p>
              <p className="text-2xl font-bold text-green-600">{statistics.processedFiles}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Failed</p>
              <p className="text-2xl font-bold text-red-600">{statistics.failedFiles}</p>
            </div>
            <XCircle className="w-8 h-8 text-red-500" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Time</p>
              <p className="text-2xl font-bold text-gray-900">
                {Math.round(statistics.avgProcessingTime / 1000)}s
              </p>
            </div>
            <div className="w-8 h-8 flex items-center justify-center bg-purple-100 rounded-full">
              <div className="w-4 h-4 bg-purple-500 rounded-full"></div>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Throughput</p>
              <p className="text-2xl font-bold text-gray-900">
                {Math.round(statistics.throughput)}/min
              </p>
            </div>
            <div className="w-8 h-8 flex items-center justify-center bg-indigo-100 rounded-full">
              <div className="w-4 h-4 bg-indigo-500 rounded-full"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Processing Settings</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-4">
              <h4 className="font-medium text-gray-700">Analysis Features</h4>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.enableOCR}
                  onChange={(e) => setSettings(prev => ({ ...prev, enableOCR: e.target.checked }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Enable OCR</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.enableEntityRecognition}
                  onChange={(e) => setSettings(prev => ({ ...prev, enableEntityRecognition: e.target.checked }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Entity Recognition</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.enablePatternMatching}
                  onChange={(e) => setSettings(prev => ({ ...prev, enablePatternMatching: e.target.checked }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Pattern Matching</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.enableComplianceChecking}
                  onChange={(e) => setSettings(prev => ({ ...prev, enableComplianceChecking: e.target.checked }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Compliance Checking</span>
              </label>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium text-gray-700">Processing Options</h4>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.parallelProcessing}
                  onChange={(e) => setSettings(prev => ({ ...prev, parallelProcessing: e.target.checked }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Parallel Processing</span>
              </label>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Concurrent Jobs
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={settings.maxConcurrentJobs}
                  onChange={(e) => setSettings(prev => ({ ...prev, maxConcurrentJobs: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Output Format
                </label>
                <select
                  value={settings.outputFormat}
                  onChange={(e) => setSettings(prev => ({ ...prev, outputFormat: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="json">JSON</option>
                  <option value="csv">CSV</option>
                  <option value="html">HTML</option>
                  <option value="pdf">PDF</option>
                </select>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium text-gray-700">Storage Options</h4>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.saveToDatabase}
                  onChange={(e) => setSettings(prev => ({ ...prev, saveToDatabase: e.target.checked }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Save to Database</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.enableVersionTracking}
                  onChange={(e) => setSettings(prev => ({ ...prev, enableVersionTracking: e.target.checked }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Enable Version Tracking</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.createBackups}
                  onChange={(e) => setSettings(prev => ({ ...prev, createBackups: e.target.checked }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Create Backups</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* File Upload Area */}
      <div className="bg-white p-6 rounded-lg border-2 border-dashed border-gray-300 hover:border-gray-400 transition-colors">
        <div className="text-center">
          <Upload className="mx-auto h-12 w-12 text-gray-400" />
          <div className="mt-4">
            <label htmlFor="file-upload" className="cursor-pointer">
              <span className="mt-2 block text-sm font-medium text-gray-900">
                Select documents to process
              </span>
              <span className="mt-1 block text-sm text-gray-600">
                Supports PDF, DOCX, TXT, RTF, Excel, and image files
              </span>
            </label>
            <input
              ref={fileInputRef}
              id="file-upload"
              name="file-upload"
              type="file"
              multiple
              accept=".pdf,.docx,.txt,.rtf,.xlsx,.xls,.png,.jpg,.jpeg,.tiff,.bmp"
              onChange={handleFileSelect}
              className="sr-only"
            />
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Or drag and drop files here
          </p>
        </div>
      </div>

      {/* Jobs List */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">Processing Jobs</h2>

        {jobs.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No jobs yet</h3>
            <p className="mt-1 text-sm text-gray-500">Upload documents to start batch processing</p>
          </div>
        ) : (
          <div className="space-y-4">
            {jobs.map((job) => (
              <div key={job.id} className="bg-white p-6 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(job.status)}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        Job {job.id.slice(-8)}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {job.files.length} files • {job.status}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(job.status)}`}>
                      {job.status.toUpperCase()}
                    </span>

                    {job.status === 'pending' && (
                      <button
                        onClick={() => startBatchProcessing(job.id)}
                        className="flex items-center gap-2 px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                      >
                        <Play className="w-4 h-4" />
                        Start
                      </button>
                    )}

                    {job.status === 'processing' && (
                      <button
                        onClick={() => cancelJob(job.id)}
                        className="flex items-center gap-2 px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                      >
                        <Square className="w-4 h-4" />
                        Cancel
                      </button>
                    )}

                    {job.status === 'completed' && (
                      <button
                        onClick={() => exportResults(job.id, job.settings.outputFormat)}
                        className="flex items-center gap-2 px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        Export
                      </button>
                    )}
                  </div>
                </div>

                {/* Progress Bar */}
                {(job.status === 'processing' || job.status === 'completed') && (
                  <div className="mb-4">
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                      <span>Progress</span>
                      <span>{Math.round(job.progress)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${job.progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Results Summary */}
                {job.results.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div className="bg-green-50 p-3 rounded-lg">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-500" />
                        <span className="font-medium text-green-700">
                          {job.results.filter(r => r.analysis).length} Successful
                        </span>
                      </div>
                    </div>

                    <div className="bg-red-50 p-3 rounded-lg">
                      <div className="flex items-center gap-2">
                        <XCircle className="w-5 h-5 text-red-500" />
                        <span className="font-medium text-red-700">
                          {job.results.filter(r => r.error).length} Failed
                        </span>
                      </div>
                    </div>

                    <div className="bg-blue-50 p-3 rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 bg-blue-500 rounded-full"></div>
                        <span className="font-medium text-blue-700">
                          {job.endTime && job.startTime
                            ? `${Math.round((job.endTime.getTime() - job.startTime.getTime()) / 1000)}s total`
                            : 'Processing...'
                          }
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* File List */}
                {job.files.length <= 10 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Files:</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {job.files.map((file, index) => {
                        const result = job.results.find(r => r.file === file);
                        return (
                          <div key={index} className="flex items-center gap-2 text-sm">
                            {result?.analysis ? (
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            ) : result?.error ? (
                              <XCircle className="w-4 h-4 text-red-500" />
                            ) : (
                              <div className="w-4 h-4 border border-gray-300 rounded" />
                            )}
                            <span className="truncate text-gray-600">{file.name}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Utility functions
function generateJobId(): string {
  return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

function convertToCSV(results: any[]): string {
  if (results.length === 0) return '';

  const headers = ['File Name', 'Status', 'Processing Time (ms)', 'Entities Found', 'Compliance Issues'];
  const rows = results.map(result => [
    result.file.name,
    result.analysis ? 'Success' : 'Failed',
    result.processingTime || 0,
    result.analysis?.entities?.length || 0,
    result.analysis?.complianceChecks?.length || 0
  ]);

  return [headers, ...rows].map(row => row.join(',')).join('\n');
}

function convertToHTML(results: any[]): string {
  const successfulResults = results.filter(r => r.analysis);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Batch Processing Results</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .success { color: green; }
        .error { color: red; }
      </style>
    </head>
    <body>
      <h1>Batch Processing Results</h1>
      <p>Generated on: ${new Date().toLocaleString()}</p>
      <table>
        <thead>
          <tr>
            <th>File Name</th>
            <th>Status</th>
            <th>Processing Time</th>
            <th>Entities Found</th>
            <th>Compliance Issues</th>
          </tr>
        </thead>
        <tbody>
          ${results.map(result => `
            <tr>
              <td>${result.file.name}</td>
              <td class="${result.analysis ? 'success' : 'error'}">
                ${result.analysis ? 'Success' : 'Failed'}
              </td>
              <td>${result.processingTime || 0}ms</td>
              <td>${result.analysis?.entities?.length || 0}</td>
              <td>${result.analysis?.complianceChecks?.length || 0}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </body>
    </html>
  `;
}