/**
 * Model Fine-Tuning Interface for BEAR AI
 * Comprehensive interface for fine-tuning HuggingFace models for legal tasks
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  PlayIcon,
  StopIcon,
  PauseIcon,
  DocumentTextIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowUpTrayIcon,
  CloudArrowDownIcon,
  BeakerIcon,
  AcademicCapIcon
} from '@heroicons/react/24/outline';
import {
  HuggingFaceModel,
  FineTuningCapabilities,
  FineTuningJob,
  FineTuningStatus,
  FineTuningMethod,
  FineTuningConfig,
  TrainingMetrics,
  LegalCategory
} from '../../../types/huggingface';

interface FineTuningInterfaceProps {
  model: HuggingFaceModel;
  onJobCreate: (config: FineTuningConfig) => Promise<string>;
  onJobCancel: (jobId: string) => Promise<void>;
  onJobPause: (jobId: string) => Promise<void>;
  onJobResume: (jobId: string) => Promise<void>;
  className?: string;
}

interface DatasetUploadProps {
  onDatasetUpload: (file: File) => Promise<void>;
  onDatasetValidate: (dataset: any) => Promise<{ valid: boolean; issues: string[] }>;
  acceptedFormats: string[];
  maxSize: number; // MB
}

interface TrainingConfigProps {
  config: FineTuningConfig;
  capabilities: FineTuningCapabilities;
  onChange: (config: FineTuningConfig) => void;
}

const DatasetUpload: React.FC<DatasetUploadProps> = ({
  onDatasetUpload,
  onDatasetValidate,
  acceptedFormats,
  maxSize
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [validationResult, setValidationResult] = useState<{ valid: boolean; issues: string[] } | null>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = async (file: File) => {
    if (file.size > maxSize * 1024 * 1024) {
      alert(`File size must be less than ${maxSize}MB`);
      return;
    }

    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (!acceptedFormats.includes(`.${fileExtension}`)) {
      alert(`Unsupported format. Accepted formats: ${acceptedFormats.join(', ')}`);
      return;
    }

    setUploading(true);
    try {
      await onDatasetUpload(file);
      setUploadedFile(file);
      
      // Validate dataset
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = JSON.parse(e.target?.result as string);
          const validation = await onDatasetValidate(data);
          setValidationResult(validation);
        } catch (error) {
          setValidationResult({ valid: false, issues: ['Invalid JSON format'] });
        }
      };
      reader.readAsText(file);
    } catch (error) {
      alert('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold mb-4">Training Dataset</h3>
      
      {!uploadedFile ? (
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <ArrowUpTrayIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-lg font-medium text-gray-900 mb-2">
            Drop your dataset here
          </p>
          <p className="text-gray-600 mb-4">
            or click to browse files
          </p>
          <input
            type="file"
            className="hidden"
            id="dataset-upload"
            accept={acceptedFormats.join(',')}
            onChange={handleFileSelect}
            disabled={uploading}
          />
          <label
            htmlFor="dataset-upload"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer disabled:opacity-50"
          >
            {uploading ? 'Uploading...' : 'Choose File'}
          </label>
          <p className="text-sm text-gray-500 mt-4">
            Supported formats: {acceptedFormats.join(', ')} • Max size: {maxSize}MB
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center space-x-3">
              <CheckCircleIcon className="w-5 h-5 text-green-600" />
              <div>
                <p className="font-medium text-green-900">{uploadedFile.name}</p>
                <p className="text-sm text-green-600">
                  {(uploadedFile.size / (1024 * 1024)).toFixed(2)} MB
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setUploadedFile(null);
                setValidationResult(null);
              }}
              className="text-green-600 hover:text-green-800"
            >
              Remove
            </button>
          </div>

          {validationResult && (
            <div className={`p-4 rounded-lg border ${
              validationResult.valid 
                ? 'bg-green-50 border-green-200' 
                : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center space-x-2 mb-2">
                {validationResult.valid ? (
                  <CheckCircleIcon className="w-5 h-5 text-green-600" />
                ) : (
                  <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
                )}
                <span className={`font-medium ${
                  validationResult.valid ? 'text-green-900' : 'text-red-900'
                }`}>
                  {validationResult.valid ? 'Dataset Valid' : 'Validation Issues'}
                </span>
              </div>
              {!validationResult.valid && (
                <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                  {validationResult.issues.map((issue, index) => (
                    <li key={index}>{issue}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-2">Dataset Requirements</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Minimum 1,000 examples recommended</li>
          <li>• JSON format with 'input' and 'output' fields</li>
          <li>• Legal domain-specific examples preferred</li>
          <li>• Balanced distribution across categories</li>
        </ul>
      </div>
    </div>
  );
};

const TrainingConfig: React.FC<TrainingConfigProps> = ({
  config,
  capabilities,
  onChange
}) => {
  const handleConfigChange = (updates: Partial<FineTuningConfig>) => {
    onChange({ ...config, ...updates });
  };

  const handleLoRAChange = (loraUpdates: Partial<FineTuningConfig['lora']>) => {
    handleConfigChange({
      lora: { ...config.lora, ...loraUpdates }
    });
  };

  const handleLegalChange = (legalUpdates: Partial<FineTuningConfig['legal']>) => {
    handleConfigChange({
      legal: { ...config.legal, ...legalUpdates }
    });
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold mb-4">Training Configuration</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Basic Parameters */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">Basic Parameters</h4>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Learning Rate
            </label>
            <input
              type="number"
              min="0.00001"
              max="0.01"
              step="0.00001"
              value={config.learningRate}
              onChange={(e) => handleConfigChange({ learningRate: parseFloat(e.target.value) })}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
            <p className="text-xs text-gray-500 mt-1">Recommended: 0.00003-0.0001</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Batch Size
            </label>
            <select
              value={config.batchSize}
              onChange={(e) => handleConfigChange({ batchSize: parseInt(e.target.value) })}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value={1}>1</option>
              <option value={2}>2</option>
              <option value={4}>4</option>
              <option value={8}>8</option>
              <option value={16}>16</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Epochs
            </label>
            <input
              type="number"
              min="1"
              max="20"
              value={config.epochs}
              onChange={(e) => handleConfigChange({ epochs: parseInt(e.target.value) })}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Max Sequence Length
            </label>
            <select
              value={config.maxSeqLength}
              onChange={(e) => handleConfigChange({ maxSeqLength: parseInt(e.target.value) })}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value={512}>512</option>
              <option value={1024}>1024</option>
              <option value={2048}>2048</option>
              <option value={4096}>4096</option>
            </select>
          </div>
        </div>

        {/* Advanced Parameters */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">Advanced Parameters</h4>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Weight Decay
            </label>
            <input
              type="number"
              min="0"
              max="0.1"
              step="0.001"
              value={config.weightDecay}
              onChange={(e) => handleConfigChange({ weightDecay: parseFloat(e.target.value) })}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Warmup Steps
            </label>
            <input
              type="number"
              min="0"
              max="1000"
              value={config.warmupSteps}
              onChange={(e) => handleConfigChange({ warmupSteps: parseInt(e.target.value) })}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Gradient Accumulation Steps
            </label>
            <input
              type="number"
              min="1"
              max="32"
              value={config.gradientAccumulationSteps}
              onChange={(e) => handleConfigChange({ gradientAccumulationSteps: parseInt(e.target.value) })}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>
        </div>
      </div>

      {/* LoRA Configuration */}
      {capabilities.methods.includes(FineTuningMethod.LORA) && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h4 className="font-medium text-gray-900 mb-4">LoRA Configuration</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                LoRA Rank (r)
              </label>
              <input
                type="number"
                min="1"
                max="256"
                value={config.lora?.r || 16}
                onChange={(e) => handleLoRAChange({ r: parseInt(e.target.value) })}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                LoRA Alpha
              </label>
              <input
                type="number"
                min="1"
                max="512"
                value={config.lora?.alpha || 32}
                onChange={(e) => handleLoRAChange({ alpha: parseInt(e.target.value) })}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                LoRA Dropout
              </label>
              <input
                type="number"
                min="0"
                max="0.5"
                step="0.01"
                value={config.lora?.dropout || 0.1}
                onChange={(e) => handleLoRAChange({ dropout: parseFloat(e.target.value) })}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
          </div>
        </div>
      )}

      {/* Legal Optimizations */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <h4 className="font-medium text-gray-900 mb-4">Legal Optimizations</h4>
        
        <div className="space-y-3">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={config.legal.enablePrivacyFilters}
              onChange={(e) => handleLegalChange({ enablePrivacyFilters: e.target.checked })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">Enable Privacy Filters</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={config.legal.enableBiasDetection}
              onChange={(e) => handleLegalChange({ enableBiasDetection: e.target.checked })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">Enable Bias Detection</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={config.legal.enableFactChecking}
              onChange={(e) => handleLegalChange({ enableFactChecking: e.target.checked })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">Enable Fact Checking</span>
          </label>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Jurisdiction Focus (optional)
          </label>
          <input
            type="text"
            placeholder="e.g., US, EU, UK (comma-separated)"
            value={config.legal.jurisdictionFocus?.join(', ') || ''}
            onChange={(e) => handleLegalChange({ 
              jurisdictionFocus: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
            })}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
          />
        </div>
      </div>
    </div>
  );
};

const JobProgress: React.FC<{
  job: FineTuningJob;
  onCancel: () => void;
  onPause: () => void;
  onResume: () => void;
}> = ({ job, onCancel, onPause, onResume }) => {
  const getStatusColor = (status: FineTuningStatus) => {
    switch (status) {
      case FineTuningStatus.RUNNING:
        return 'text-blue-600 bg-blue-50';
      case FineTuningStatus.COMPLETED:
        return 'text-green-600 bg-green-50';
      case FineTuningStatus.FAILED:
        return 'text-red-600 bg-red-50';
      case FineTuningStatus.CANCELLED:
        return 'text-gray-600 bg-gray-50';
      case FineTuningStatus.PENDING:
        return 'text-yellow-600 bg-yellow-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const formatDuration = (start?: Date, end?: Date) => {
    if (!start) return 'Not started';
    const endTime = end || new Date();
    const duration = endTime.getTime() - start.getTime();
    const minutes = Math.floor(duration / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes}m`;
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold">Training Job: {job.id}</h3>
          <p className="text-sm text-gray-600">
            Method: {job.method} • Duration: {formatDuration(job.startTime, job.endTime)}
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(job.status)}`}>
            {job.status.replace('_', ' ').toUpperCase()}
          </span>
          
          {job.status === FineTuningStatus.RUNNING && (
            <button
              onClick={onPause}
              className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg"
              title="Pause Training"
            >
              <PauseIcon className="w-5 h-5" />
            </button>
          )}
          
          {job.status === FineTuningStatus.PENDING && (
            <button
              onClick={onResume}
              className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
              title="Resume Training"
            >
              <PlayIcon className="w-5 h-5" />
            </button>
          )}
          
          {(job.status === FineTuningStatus.RUNNING || job.status === FineTuningStatus.PENDING) && (
            <button
              onClick={onCancel}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
              title="Cancel Training"
            >
              <StopIcon className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Progress</span>
          <span>{Math.round(job.progress)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${
              job.status === FineTuningStatus.COMPLETED ? 'bg-green-500' :
              job.status === FineTuningStatus.FAILED ? 'bg-red-500' :
              'bg-blue-500'
            }`}
            style={{ width: `${job.progress}%` }}
          />
        </div>
        {job.estimatedCompletion && job.status === FineTuningStatus.RUNNING && (
          <p className="text-xs text-gray-500 mt-1">
            Estimated completion: {job.estimatedCompletion.toLocaleString()}
          </p>
        )}
      </div>

      {/* Training Metrics */}
      {job.metrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {job.metrics.loss.toFixed(4)}
            </div>
            <div className="text-sm text-gray-600">Training Loss</div>
          </div>
          
          {job.metrics.validationLoss && (
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {job.metrics.validationLoss.toFixed(4)}
              </div>
              <div className="text-sm text-gray-600">Validation Loss</div>
            </div>
          )}
          
          {job.metrics.accuracy && (
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {(job.metrics.accuracy * 100).toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600">Accuracy</div>
            </div>
          )}
          
          {job.metrics.legalMetrics?.legalReasoningScore && (
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {job.metrics.legalMetrics.legalReasoningScore.toFixed(1)}
              </div>
              <div className="text-sm text-gray-600">Legal Score</div>
            </div>
          )}
        </div>
      )}

      {/* Error Message */}
      {job.error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />
            <span className="font-medium text-red-900">Training Failed</span>
          </div>
          <p className="text-sm text-red-700 mt-1">{job.error}</p>
        </div>
      )}

      {/* Completed Job Actions */}
      {job.status === FineTuningStatus.COMPLETED && job.outputModelId && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-2">
                <CheckCircleIcon className="w-5 h-5 text-green-600" />
                <span className="font-medium text-green-900">Training Completed</span>
              </div>
              <p className="text-sm text-green-700 mt-1">
                Fine-tuned model: {job.outputModelId}
              </p>
            </div>
            <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center space-x-2">
              <CloudArrowDownIcon className="w-4 h-4" />
              <span>Download Model</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export const FineTuningInterface: React.FC<FineTuningInterfaceProps> = ({
  model,
  onJobCreate,
  onJobCancel,
  onJobPause,
  onJobResume,
  className = ''
}) => {
  const [capabilities, setCapabilities] = useState<FineTuningCapabilities | null>(null);
  const [config, setConfig] = useState<FineTuningConfig>({
    learningRate: 0.00003,
    batchSize: 4,
    epochs: 3,
    warmupSteps: 100,
    weightDecay: 0.01,
    maxSeqLength: 2048,
    gradientAccumulationSteps: 1,
    lora: {
      r: 16,
      alpha: 32,
      dropout: 0.1,
      targetModules: ['q_proj', 'v_proj']
    },
    validation: {
      split: 0.1,
      metric: 'loss',
      earlyStoppingPatience: 3
    },
    legal: {
      enablePrivacyFilters: true,
      enableBiasDetection: true,
      enableFactChecking: false,
      jurisdictionFocus: []
    }
  });
  const [activeJobs, setActiveJobs] = useState<FineTuningJob[]>([]);
  const [selectedTab, setSelectedTab] = useState<'setup' | 'monitor'>('setup');
  const [datasetUploaded, setDatasetUploaded] = useState(false);

  useEffect(() => {
    // Load fine-tuning capabilities
    const mockCapabilities: FineTuningCapabilities = {
      supported: true,
      methods: [FineTuningMethod.LORA, FineTuningMethod.QLORA, FineTuningMethod.FULL_FINE_TUNING],
      difficulty: 'moderate',
      estimatedTime: 4,
      dataRequirements: {
        minSamples: 1000,
        recommendedSamples: 5000,
        format: ['json', 'jsonl'],
        preprocessing: ['tokenization', 'formatting']
      },
      computeRequirements: {
        minRam: 8192,
        recommendedRam: 16384,
        minStorage: 10240,
        modelSizeMB: model.resourceRequirements.modelSizeMB * 2,
        gpuRequired: true,
        minGpuMemory: 8192,
        cpuCores: 4,
        estimatedInferenceTime: model.resourceRequirements.estimatedInferenceTime,
        powerConsumption: model.resourceRequirements.powerConsumption
      },
      legalDatasetSupport: model.legalScore > 70
    };
    setCapabilities(mockCapabilities);
  }, [model]);

  const handleDatasetUpload = async (file: File) => {
    // Simulate upload
    await new Promise(resolve => setTimeout(resolve, 2000));
    setDatasetUploaded(true);
  };

  const handleDatasetValidate = async (dataset: any) => {
    // Simulate validation
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const issues: string[] = [];
    if (!Array.isArray(dataset)) {
      issues.push('Dataset must be an array of examples');
    } else {
      if (dataset.length < 100) {
        issues.push('Dataset should have at least 100 examples');
      }
      
      const hasRequiredFields = dataset.every((item: any) => 
        item.input && item.output
      );
      
      if (!hasRequiredFields) {
        issues.push('All examples must have "input" and "output" fields');
      }
    }

    return { valid: issues.length === 0, issues };
  };

  const handleStartTraining = async () => {
    if (!datasetUploaded) {
      alert('Please upload a dataset first');
      return;
    }

    try {
      const jobId = await onJobCreate(config);
      
      // Create mock job
      const newJob: FineTuningJob = {
        id: jobId,
        modelId: model.id,
        status: FineTuningStatus.RUNNING,
        method: FineTuningMethod.LORA,
        dataset: 'uploaded-dataset.json',
        config,
        progress: 0,
        startTime: new Date(),
        retryCount: 0,
        maxRetries: 3
      };
      
      setActiveJobs(prev => [...prev, newJob]);
      setSelectedTab('monitor');
      
      // Simulate progress
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 10;
        if (progress >= 100) {
          progress = 100;
          clearInterval(interval);
          
          setActiveJobs(prev => 
            prev.map(job => 
              job.id === jobId 
                ? {
                    ...job,
                    progress: 100,
                    status: FineTuningStatus.COMPLETED,
                    endTime: new Date(),
                    outputModelId: `${model.id}-fine-tuned-${Date.now()}`,
                    metrics: {
                      loss: 0.45,
                      validationLoss: 0.52,
                      accuracy: 0.87,
                      f1Score: 0.84,
                      legalMetrics: {
                        citationAccuracy: 0.89,
                        legalReasoningScore: 92.3,
                        factualConsistency: 0.91,
                        ethicsScore: 88.7
                      }
                    }
                  }
                : job
            )
          );
        } else {
          setActiveJobs(prev => 
            prev.map(job => 
              job.id === jobId ? { ...job, progress } : job
            )
          );
        }
      }, 1000);
      
    } catch (error) {
      alert('Failed to start training');
    }
  };

  if (!capabilities) {
    return <div className="p-6 text-center">Loading fine-tuning capabilities...</div>;
  }

  if (!capabilities.supported) {
    return (
      <div className="p-6 text-center">
        <BeakerIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Fine-tuning not supported
        </h3>
        <p className="text-gray-600">
          This model does not support fine-tuning capabilities.
        </p>
      </div>
    );
  }

  return (
    <div className={`bg-gray-50 ${className}`}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Fine-Tune Model</h1>
            <p className="text-gray-600 mt-1">
              Customize {model.modelId} for your specific legal use cases
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-600">
              <span className="font-medium">Difficulty:</span> {capabilities.difficulty}
            </div>
            <div className="text-sm text-gray-600">
              <span className="font-medium">Est. Time:</span> {capabilities.estimatedTime}h
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-8 mt-4">
          <button
            onClick={() => setSelectedTab('setup')}
            className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
              selectedTab === 'setup'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Setup Training
          </button>
          <button
            onClick={() => setSelectedTab('monitor')}
            className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
              selectedTab === 'monitor'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Monitor Jobs ({activeJobs.length})
          </button>
        </div>
      </div>

      <div className="p-6">
        {selectedTab === 'setup' ? (
          <div className="space-y-6">
            <DatasetUpload
              onDatasetUpload={handleDatasetUpload}
              onDatasetValidate={handleDatasetValidate}
              acceptedFormats={capabilities.dataRequirements.format.map(f => `.${f}`)}
              maxSize={100}
            />

            <TrainingConfig
              config={config}
              capabilities={capabilities}
              onChange={setConfig}
            />

            <div className="flex items-center justify-between pt-6">
              <div className="text-sm text-gray-600">
                <p>
                  <span className="font-medium">Required:</span> {capabilities.computeRequirements.minRam}MB RAM, 
                  {capabilities.computeRequirements.gpuRequired ? ' GPU required' : ' CPU compatible'}
                </p>
                <p>
                  <span className="font-medium">Dataset:</span> {capabilities.dataRequirements.minSamples} samples minimum
                </p>
              </div>
              
              <button
                onClick={handleStartTraining}
                disabled={!datasetUploaded}
                className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <PlayIcon className="w-5 h-5" />
                <span>Start Training</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {activeJobs.length === 0 ? (
              <div className="text-center py-12">
                <AcademicCapIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No training jobs
                </h3>
                <p className="text-gray-600 mb-4">
                  Start your first fine-tuning job from the Setup tab.
                </p>
                <button
                  onClick={() => setSelectedTab('setup')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Setup Training
                </button>
              </div>
            ) : (
              activeJobs.map(job => (
                <JobProgress
                  key={job.id}
                  job={job}
                  onCancel={() => onJobCancel(job.id)}
                  onPause={() => onJobPause(job.id)}
                  onResume={() => onJobResume(job.id)}
                />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default FineTuningInterface;