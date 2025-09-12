/**
 * HuggingFace Model Selection Interface for BEAR AI
 * User-friendly model browser with legal optimization and comprehensive features
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  StarIcon,
  ArrowDownTrayIcon,
  PlayIcon,
  StopIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  CpuChipIcon,
  CloudIcon,
  BookmarkIcon,
  AdjustmentsHorizontalIcon
} from '@heroicons/react/24/outline';
import {
  HuggingFaceModel,
  ModelSearchFilters,
  LegalCategory,
  ModelSortOption,
  CompatibilityResult,
  ModelRecommendation,
  FineTuningCapabilities
} from '../../../types/huggingface';

interface HuggingFaceModelSelectorProps {
  onModelSelect: (model: HuggingFaceModel) => void;
  onModelDownload: (model: HuggingFaceModel) => void;
  onModelSwitch: (model: HuggingFaceModel) => void;
  currentModel?: HuggingFaceModel;
  className?: string;
}

interface ModelCardProps {
  model: HuggingFaceModel;
  compatibility?: CompatibilityResult;
  isSelected: boolean;
  isDownloading: boolean;
  downloadProgress?: number;
  onSelect: () => void;
  onDownload: () => void;
  onSwitch: () => void;
  onViewDetails: () => void;
}

const ModelCard: React.FC<ModelCardProps> = ({
  model,
  compatibility,
  isSelected,
  isDownloading,
  downloadProgress,
  onSelect,
  onDownload,
  onSwitch,
  onViewDetails
}) => {
  const formatSize = (mb: number) => {
    if (mb < 1024) return `${mb}MB`;
    return `${(mb / 1024).toFixed(1)}GB`;
  };

  const getCompatibilityColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50';
    if (score >= 60) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getLegalScoreColor = (score: number) => {
    if (score >= 80) return 'bg-blue-500';
    if (score >= 60) return 'bg-blue-400';
    if (score >= 40) return 'bg-blue-300';
    return 'bg-gray-300';
  };

  return (
    <div 
      className={`border rounded-lg p-4 transition-all hover:shadow-md cursor-pointer ${
        isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
      }`}
      onClick={onSelect}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 truncate">
            {model.modelId}
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            by {model.author} • {model.downloads.toLocaleString()} downloads
          </p>
        </div>
        <div className="flex items-center space-x-1 ml-4">
          <StarIcon className="w-4 h-4 text-yellow-400" />
          <span className="text-sm text-gray-600">{model.likes}</span>
        </div>
      </div>

      {/* Legal Score */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="text-gray-600">Legal Relevance</span>
          <span className="font-medium">{model.legalScore}/100</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full ${getLegalScoreColor(model.legalScore)}`}
            style={{ width: `${model.legalScore}%` }}
          />
        </div>
      </div>

      {/* Tags and Use Cases */}
      <div className="mb-3">
        <div className="flex flex-wrap gap-1 mb-2">
          {model.legalUseCases.slice(0, 2).map((useCase) => (
            <span 
              key={useCase.id}
              className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full"
            >
              {useCase.name}
            </span>
          ))}
          {model.tags.slice(0, 3).map((tag) => (
            <span 
              key={tag}
              className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Model Info */}
      <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
        <div className="flex items-center space-x-1">
          <CpuChipIcon className="w-4 h-4 text-gray-400" />
          <span className="text-gray-600">
            {formatSize(model.resourceRequirements.modelSizeMB)}
          </span>
        </div>
        <div className="flex items-center space-x-1">
          <ClockIcon className="w-4 h-4 text-gray-400" />
          <span className="text-gray-600">
            {model.resourceRequirements.estimatedInferenceTime.cpu}ms
          </span>
        </div>
        <div className="flex items-center space-x-1">
          <span className="text-gray-600">RAM:</span>
          <span className="text-gray-900">
            {formatSize(model.resourceRequirements.recommendedRam)}
          </span>
        </div>
        <div className="flex items-center space-x-1">
          {model.resourceRequirements.gpuRequired ? (
            <>
              <span className="w-2 h-2 bg-orange-400 rounded-full" />
              <span className="text-gray-600 text-xs">GPU Required</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 bg-green-400 rounded-full" />
              <span className="text-gray-600 text-xs">CPU Compatible</span>
            </>
          )}
        </div>
      </div>

      {/* Compatibility Status */}
      {compatibility && (
        <div className="mb-3">
          <div className={`flex items-center space-x-2 px-2 py-1 rounded text-xs ${
            getCompatibilityColor(compatibility.score)
          }`}>
            {compatibility.compatible ? (
              <CheckCircleIcon className="w-4 h-4" />
            ) : (
              <ExclamationTriangleIcon className="w-4 h-4" />
            )}
            <span>
              {compatibility.compatible ? 'Compatible' : 'Issues Found'} ({compatibility.score}/100)
            </span>
          </div>
        </div>
      )}

      {/* Download Progress */}
      {isDownloading && downloadProgress !== undefined && (
        <div className="mb-3">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-blue-600">Downloading...</span>
            <span className="text-blue-600">{Math.round(downloadProgress)}%</span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2">
            <div 
              className="h-2 bg-blue-500 rounded-full transition-all duration-300"
              style={{ width: `${downloadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-200">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onViewDetails();
          }}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          View Details
        </button>
        
        <div className="flex items-center space-x-2">
          {model.localStatus.downloaded ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSwitch();
              }}
              className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 flex items-center space-x-1"
              disabled={isDownloading}
            >
              <PlayIcon className="w-4 h-4" />
              <span>Switch</span>
            </button>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDownload();
              }}
              className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 flex items-center space-x-1"
              disabled={isDownloading}
            >
              <ArrowDownTrayIcon className="w-4 h-4" />
              <span>Download</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const FilterPanel: React.FC<{
  filters: ModelSearchFilters;
  onFiltersChange: (filters: ModelSearchFilters) => void;
  onClose: () => void;
}> = ({ filters, onFiltersChange, onClose }) => {
  const legalCategories = Object.values(LegalCategory);
  
  return (
    <div className="bg-white border-l border-gray-200 w-80 p-6 overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Filters</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
        >
          ×
        </button>
      </div>

      {/* Legal Categories */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Legal Use Cases
        </label>
        <div className="space-y-2">
          {legalCategories.slice(0, 6).map((category) => (
            <label key={category} className="flex items-center">
              <input
                type="checkbox"
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                checked={filters.legalCategories?.includes(category) || false}
                onChange={(e) => {
                  const current = filters.legalCategories || [];
                  const updated = e.target.checked
                    ? [...current, category]
                    : current.filter(c => c !== category);
                  onFiltersChange({ ...filters, legalCategories: updated });
                }}
              />
              <span className="ml-2 text-sm text-gray-700">
                {category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Legal Score */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Minimum Legal Score
        </label>
        <input
          type="range"
          min="0"
          max="100"
          value={filters.minLegalScore || 0}
          onChange={(e) => onFiltersChange({
            ...filters,
            minLegalScore: parseInt(e.target.value)
          })}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>0</span>
          <span>{filters.minLegalScore || 0}</span>
          <span>100</span>
        </div>
      </div>

      {/* Model Size */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Maximum Model Size (GB)
        </label>
        <select
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          value={filters.maxModelSize ? Math.round(filters.maxModelSize / 1024) : ''}
          onChange={(e) => onFiltersChange({
            ...filters,
            maxModelSize: e.target.value ? parseInt(e.target.value) * 1024 : undefined
          })}
        >
          <option value="">Any Size</option>
          <option value="1">1 GB</option>
          <option value="3">3 GB</option>
          <option value="7">7 GB</option>
          <option value="13">13 GB</option>
          <option value="30">30 GB</option>
        </select>
      </div>

      {/* GPU Requirement */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Hardware Requirements
        </label>
        <div className="space-y-2">
          <label className="flex items-center">
            <input
              type="checkbox"
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              checked={filters.requiresGpu === false}
              onChange={(e) => onFiltersChange({
                ...filters,
                requiresGpu: e.target.checked ? false : undefined
              })}
            />
            <span className="ml-2 text-sm text-gray-700">CPU Only</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              checked={filters.requiresGpu === true}
              onChange={(e) => onFiltersChange({
                ...filters,
                requiresGpu: e.target.checked ? true : undefined
              })}
            />
            <span className="ml-2 text-sm text-gray-700">GPU Required</span>
          </label>
        </div>
      </div>

      {/* Licenses */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          License Type
        </label>
        <div className="space-y-2">
          {['apache-2.0', 'mit', 'bsd-3-clause', 'cc-by-4.0'].map((license) => (
            <label key={license} className="flex items-center">
              <input
                type="checkbox"
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                checked={filters.licenses?.includes(license) || false}
                onChange={(e) => {
                  const current = filters.licenses || [];
                  const updated = e.target.checked
                    ? [...current, license]
                    : current.filter(l => l !== license);
                  onFiltersChange({ ...filters, licenses: updated });
                }}
              />
              <span className="ml-2 text-sm text-gray-700">
                {license.toUpperCase()}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Sort By */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Sort By
        </label>
        <select
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          value={filters.sortBy || ModelSortOption.RELEVANCE}
          onChange={(e) => onFiltersChange({
            ...filters,
            sortBy: e.target.value as ModelSortOption
          })}
        >
          <option value={ModelSortOption.RELEVANCE}>Relevance</option>
          <option value={ModelSortOption.LEGAL_SCORE}>Legal Score</option>
          <option value={ModelSortOption.DOWNLOADS}>Downloads</option>
          <option value={ModelSortOption.LIKES}>Likes</option>
          <option value={ModelSortOption.LAST_MODIFIED}>Recently Updated</option>
          <option value={ModelSortOption.MODEL_SIZE}>Model Size</option>
        </select>
      </div>

      {/* Clear Filters */}
      <button
        onClick={() => onFiltersChange({})}
        className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        Clear All Filters
      </button>
    </div>
  );
};

export const HuggingFaceModelSelector: React.FC<HuggingFaceModelSelectorProps> = ({
  onModelSelect,
  onModelDownload,
  onModelSwitch,
  currentModel,
  className = ''
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<ModelSearchFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [models, setModels] = useState<HuggingFaceModel[]>([]);
  const [recommendations, setRecommendations] = useState<ModelRecommendation[]>([]);
  const [selectedModel, setSelectedModel] = useState<HuggingFaceModel | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadingModels, setDownloadingModels] = useState<Set<string>>(new Set());
  const [downloadProgress, setDownloadProgress] = useState<Map<string, number>>(new Map());
  const [viewMode, setViewMode] = useState<'browse' | 'recommendations' | 'downloaded'>('browse');

  // Simulated data - in real implementation, this would come from HuggingFaceService
  const sampleModels: HuggingFaceModel[] = useMemo(() => [
    {
      id: 'legal-bert-base-uncased',
      modelId: 'nlpaueb/legal-bert-base-uncased',
      author: 'nlpaueb',
      sha: 'abc123',
      createdAt: new Date('2023-01-15'),
      lastModified: new Date('2023-06-20'),
      downloads: 15420,
      likes: 287,
      tags: ['legal', 'bert', 'english'],
      pipeline_tag: 'fill-mask',
      library_name: 'transformers',
      disabled: false,
      gated: false,
      private: false,
      legalScore: 95,
      legalUseCases: [
        {
          id: 'contract_analysis',
          name: 'Contract Analysis',
          description: 'Analyze contracts for key terms and clauses',
          category: LegalCategory.CONTRACT_ANALYSIS,
          suitabilityScore: 92,
          examples: ['Contract review', 'Clause extraction'],
          requirements: ['Named Entity Recognition'],
          limitations: ['Domain-specific training needed']
        }
      ],
      performanceBenchmarks: [],
      resourceRequirements: {
        minRam: 2048,
        recommendedRam: 4096,
        minStorage: 512,
        modelSizeMB: 512,
        gpuRequired: false,
        cpuCores: 2,
        estimatedInferenceTime: {
          cpu: 150
        },
        powerConsumption: {
          idle: 10,
          load: 45
        }
      },
      compatibilityInfo: {
        frameworks: ['transformers', 'pytorch'],
        pythonVersions: ['3.8', '3.9', '3.10'],
        transformersVersion: '4.20.0',
        onnxSupport: true,
        quantizationSupport: {
          int8: true,
          int4: false,
          fp16: true,
          bfloat16: true
        },
        platforms: ['linux', 'windows', 'macos'],
        architectures: ['x86_64', 'arm64']
      },
      localStatus: {
        downloaded: false,
        usage: {
          totalInferences: 0,
          totalTokens: 0,
          averageResponseTime: 0,
          errorCount: 0,
          successRate: 0
        }
      },
      bearaiTags: ['legal-optimized', 'contract-analysis']
    }
    // Add more sample models here...
  ], []);

  const filteredModels = useMemo(() => {
    let result = [...sampleModels];

    // Apply search query
    if (searchQuery) {
      result = result.filter(model =>
        model.modelId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        model.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())) ||
        model.legalUseCases.some(uc => uc.name.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Apply legal category filters
    if (filters.legalCategories?.length) {
      result = result.filter(model =>
        model.legalUseCases.some(uc => filters.legalCategories!.includes(uc.category))
      );
    }

    // Apply legal score filter
    if (filters.minLegalScore) {
      result = result.filter(model => model.legalScore >= filters.minLegalScore!);
    }

    // Apply model size filter
    if (filters.maxModelSize) {
      result = result.filter(model => model.resourceRequirements.modelSizeMB <= filters.maxModelSize!);
    }

    // Apply GPU requirement filter
    if (filters.requiresGpu !== undefined) {
      result = result.filter(model => model.resourceRequirements.gpuRequired === filters.requiresGpu);
    }

    // Apply sorting
    switch (filters.sortBy) {
      case ModelSortOption.LEGAL_SCORE:
        result.sort((a, b) => b.legalScore - a.legalScore);
        break;
      case ModelSortOption.DOWNLOADS:
        result.sort((a, b) => b.downloads - a.downloads);
        break;
      case ModelSortOption.LIKES:
        result.sort((a, b) => b.likes - a.likes);
        break;
      case ModelSortOption.LAST_MODIFIED:
        result.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());
        break;
      case ModelSortOption.MODEL_SIZE:
        result.sort((a, b) => a.resourceRequirements.modelSizeMB - b.resourceRequirements.modelSizeMB);
        break;
      default:
        // Keep original order for relevance
        break;
    }

    return result;
  }, [sampleModels, searchQuery, filters]);

  const handleModelSelect = useCallback((model: HuggingFaceModel) => {
    setSelectedModel(model);
    onModelSelect(model);
  }, [onModelSelect]);

  const handleModelDownload = useCallback(async (model: HuggingFaceModel) => {
    setDownloadingModels(prev => new Set(prev).add(model.id));
    setDownloadProgress(prev => new Map(prev).set(model.id, 0));

    try {
      // Simulate download progress
      for (let progress = 0; progress <= 100; progress += 10) {
        await new Promise(resolve => setTimeout(resolve, 200));
        setDownloadProgress(prev => new Map(prev).set(model.id, progress));
      }

      // Update model status
      model.localStatus.downloaded = true;
      onModelDownload(model);
    } catch (error) {
      setError(`Failed to download ${model.modelId}`);
    } finally {
      setDownloadingModels(prev => {
        const newSet = new Set(prev);
        newSet.delete(model.id);
        return newSet;
      });
      setDownloadProgress(prev => {
        const newMap = new Map(prev);
        newMap.delete(model.id);
        return newMap;
      });
    }
  }, [onModelDownload]);

  const handleModelSwitch = useCallback((model: HuggingFaceModel) => {
    onModelSwitch(model);
  }, [onModelSwitch]);

  const handleViewDetails = useCallback((model: HuggingFaceModel) => {
    // Open model details modal/panel
    console.log('View details for:', model.modelId);
  }, []);

  return (
    <div className={`flex flex-col h-full bg-gray-50 ${className}`}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">
            HuggingFace Model Selection
          </h1>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewMode('browse')}
              className={`px-3 py-2 text-sm font-medium rounded-md ${
                viewMode === 'browse' 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Browse
            </button>
            <button
              onClick={() => setViewMode('recommendations')}
              className={`px-3 py-2 text-sm font-medium rounded-md ${
                viewMode === 'recommendations' 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Recommendations
            </button>
            <button
              onClick={() => setViewMode('downloaded')}
              className={`px-3 py-2 text-sm font-medium rounded-md ${
                viewMode === 'downloaded' 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Downloaded
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex items-center space-x-4 mt-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search legal models..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center space-x-2 px-4 py-2 border rounded-lg font-medium transition-colors ${
              showFilters 
                ? 'border-blue-500 bg-blue-50 text-blue-700' 
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <FunnelIcon className="w-5 h-5" />
            <span>Filters</span>
          </button>
        </div>

        {/* Active Filters */}
        {(filters.legalCategories?.length || filters.minLegalScore || filters.maxModelSize) && (
          <div className="flex flex-wrap gap-2 mt-3">
            {filters.legalCategories?.map(category => (
              <span 
                key={category}
                className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
              >
                {category.replace(/_/g, ' ')}
                <button
                  onClick={() => setFilters(prev => ({
                    ...prev,
                    legalCategories: prev.legalCategories?.filter(c => c !== category)
                  }))}
                  className="ml-1 text-blue-600 hover:text-blue-800"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center">
                <ExclamationTriangleIcon className="w-5 h-5 text-red-400 mr-2" />
                <span className="text-red-800">{error}</span>
                <button
                  onClick={() => setError(null)}
                  className="ml-auto text-red-600 hover:text-red-800"
                >
                  ×
                </button>
              </div>
            </div>
          )}

          {/* Results Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">
              {viewMode === 'browse' && `${filteredModels.length} Models Found`}
              {viewMode === 'recommendations' && 'Recommended for Your Use Case'}
              {viewMode === 'downloaded' && 'Downloaded Models'}
            </h2>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">Sort by:</span>
              <select
                value={filters.sortBy || ModelSortOption.RELEVANCE}
                onChange={(e) => setFilters(prev => ({ 
                  ...prev, 
                  sortBy: e.target.value as ModelSortOption 
                }))}
                className="text-sm border border-gray-300 rounded px-2 py-1"
              >
                <option value={ModelSortOption.RELEVANCE}>Relevance</option>
                <option value={ModelSortOption.LEGAL_SCORE}>Legal Score</option>
                <option value={ModelSortOption.DOWNLOADS}>Downloads</option>
                <option value={ModelSortOption.LIKES}>Likes</option>
              </select>
            </div>
          </div>

          {/* Models Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredModels.map((model) => (
              <ModelCard
                key={model.id}
                model={model}
                isSelected={selectedModel?.id === model.id}
                isDownloading={downloadingModels.has(model.id)}
                downloadProgress={downloadProgress.get(model.id)}
                onSelect={() => handleModelSelect(model)}
                onDownload={() => handleModelDownload(model)}
                onSwitch={() => handleModelSwitch(model)}
                onViewDetails={() => handleViewDetails(model)}
              />
            ))}
          </div>

          {filteredModels.length === 0 && (
            <div className="text-center py-12">
              <MagnifyingGlassIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No models found</h3>
              <p className="text-gray-600 mb-4">
                Try adjusting your search terms or filters to find more models.
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setFilters({});
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Clear Search
              </button>
            </div>
          )}
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <FilterPanel
            filters={filters}
            onFiltersChange={setFilters}
            onClose={() => setShowFilters(false)}
          />
        )}
      </div>
    </div>
  );
};

export default HuggingFaceModelSelector;