/**
 * Model Manager Component
 * Provides comprehensive model management UI similar to Ollama
 */

import React, { useState, useEffect } from 'react';
import { PlayIcon, StopIcon, ArrowPathIcon, CpuChipIcon, ClockIcon, ExclamationCircleIcon, CheckCircleIcon, InformationCircleIcon, Cog6ToothIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import { useModelManager } from '../../hooks/useModelManager';
import { ModelStatus, ModelStatusType, ModelType } from '../../types/modelTypes';
import ModelConfigManager from '../../services/modelConfigManager';

interface ModelManagerProps {
  className?: string;
  discoveryPaths?: string[];
  enableAutoDiscovery?: boolean;
}

export const ModelManager: React.FC<ModelManagerProps> = ({
  className = '',
  discoveryPaths = [],
  enableAutoDiscovery = true
}) => {
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [showMetrics, setShowMetrics] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const configManager = new ModelConfigManager();

  const {
    models,
    loadedModels,
    activeModel,
    isLoading,
    error,
    memoryStats,
    managerStats,
    metrics,
    isStreaming,
    actions
  } = useModelManager({
    autoDiscovery: enableAutoDiscovery,
    discoveryPaths,
    enableMetrics: true,
    enableStreaming: true
  });

  // Auto-refresh stats periodically
  useEffect(() => {
    const interval = setInterval(() => {
      actions.refreshStats();
    }, 30000);
    return () => clearInterval(interval);
  }, [actions]);

  const handleLoadModel = async (modelId: string) => {
    try {
      setSelectedModel(modelId);
      await actions.loadModel(modelId);
    } catch (error) {
      // Error logging disabled for production
    }
  };

  const handleUnloadModel = async (modelId: string) => {
    try {
      await actions.unloadModel(modelId);
      if (selectedModel === modelId) {
        setSelectedModel(null);
      }
    } catch (error) {
      // Error logging disabled for production
    }
  };

  const handleSwitchModel = async (modelId: string) => {
    try {
      await actions.switchModel(modelId);
      setSelectedModel(modelId);
    } catch (error) {
      // Error logging disabled for production
    }
  };

  const getStatusIcon = (status: ModelStatusType) => {
    switch (status) {
      case ModelStatus.LOADED:
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case ModelStatus.LOADING:
        return <ArrowPathIcon className="w-5 h-5 text-blue-500 animate-spin" />;
      case ModelStatus.ERROR:
        return <ExclamationCircleIcon className="w-5 h-5 text-red-500" />;
      case ModelStatus.ACTIVE:
        return <PlayIcon className="w-5 h-5 text-green-600" />;
      default:
        return <StopIcon className="w-5 h-5 text-gray-400" />;
    }
  };

  const getModelTypeColor = (type: ModelType) => {
    switch (type) {
      case ModelType.GPT4ALL:
        return 'bg-blue-100 text-blue-800';
      case ModelType.LLAMA:
        return 'bg-purple-100 text-purple-800';
      case ModelType.MISTRAL:
        return 'bg-orange-100 text-orange-800';
      case ModelType.CODEGEN:
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ${seconds % 60}s`;
  };

  return (
    <div className={`bg-white rounded-lg shadow-lg ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Model Manager</h2>
            <p className="text-sm text-gray-600 mt-1">
              Manage and monitor AI models
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowMetrics(!showMetrics)}
              className={`p-2 rounded-lg transition-colors ${
                showMetrics 
                  ? 'bg-blue-100 text-blue-600' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              title="Toggle Metrics"
            >
              <ChartBarIcon className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowConfig(!showConfig)}
              className={`p-2 rounded-lg transition-colors ${
                showConfig 
                  ? 'bg-blue-100 text-blue-600' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              title="Configuration"
            >
              <Cog6ToothIcon className="w-5 h-5" />
            </button>
            <button
              onClick={actions.refreshStats}
              className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
              title="Refresh"
            >
              <ArrowPathIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* System Stats */}
        {memoryStats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Memory Usage</span>
                <span className={`text-sm px-2 py-1 rounded ${
                  memoryStats.pressure === 'high' ? 'bg-red-100 text-red-800' :
                  memoryStats.pressure === 'moderate' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {memoryStats.pressure}
                </span>
              </div>
              <div className="mt-2">
                <div className="text-lg font-semibold text-gray-900">
                  {formatBytes(memoryStats.used)} / {formatBytes(memoryStats.total)}
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                  <div 
                    className={`h-2 rounded-full ${
                      memoryStats.percentage > 80 ? 'bg-red-500' :
                      memoryStats.percentage > 60 ? 'bg-yellow-500' :
                      'bg-green-500'
                    }`}
                    style={{ width: `${memoryStats.percentage}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-3">
              <span className="text-sm font-medium text-gray-600">Loaded Models</span>
              <div className="text-lg font-semibold text-gray-900 mt-1">
                {loadedModels.length} / {managerStats?.loadedModels || 0}
              </div>
              <div className="text-sm text-gray-500">
                {isStreaming ? 'Streaming active' : 'Ready'}
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-3">
              <span className="text-sm font-medium text-gray-600">Total Inferences</span>
              <div className="text-lg font-semibold text-gray-900 mt-1">
                {managerStats?.totalInferences || 0}
              </div>
              <div className="text-sm text-gray-500">
                Avg: {formatDuration(managerStats?.averageLoadTime || 0)}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-50 border-l-4 border-red-400">
          <div className="flex items-center">
            <ExclamationCircleIcon className="w-5 h-5 text-red-400 mr-2" />
            <span className="text-red-800">{error}</span>
            <button
              onClick={actions.clearError}
              className="ml-auto text-red-600 hover:text-red-800"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Models List */}
      <div className="p-6">
        <div className="space-y-4">
          {models.map((model) => {
            const loadedModel = loadedModels.find(lm => lm.config.id === model.id);
            const isActive = activeModel === model.id;
            const modelMetrics = metrics.find(m => m.modelId === model.id);

            return (
              <div
                key={model.id}
                className={`border rounded-lg p-4 transition-all ${
                  isActive 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(loadedModel?.status || ModelStatus.UNLOADED)}
                    <div>
                      <h3 className="font-medium text-gray-900">{model.name}</h3>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className={`px-2 py-1 text-xs rounded-full ${getModelTypeColor(model.type)}`}>
                          {model.type}
                        </span>
                        <span className="text-sm text-gray-500">
                          {formatBytes(model.size)}
                        </span>
                        {loadedModel && (
                          <span className="text-sm text-gray-500">
                            {loadedModel.inferenceCount} inferences
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {loadedModel?.status === ModelStatus.LOADED && !isActive && (
                      <button
                        onClick={() => handleSwitchModel(model.id)}
                        className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                        disabled={isLoading}
                      >
                        Switch
                      </button>
                    )}
                    
                    {!loadedModel || loadedModel.status === ModelStatus.UNLOADED ? (
                      <button
                        onClick={() => handleLoadModel(model.id)}
                        className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:opacity-50"
                        disabled={isLoading}
                      >
                        Load
                      </button>
                    ) : (
                      <button
                        onClick={() => handleUnloadModel(model.id)}
                        className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors disabled:opacity-50"
                        disabled={isLoading || loadedModel.status === ModelStatus.ACTIVE}
                      >
                        Unload
                      </button>
                    )}
                  </div>
                </div>

                {/* Model Metrics */}
                {showMetrics && modelMetrics && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Memory:</span>
                        <div className="font-medium">{formatBytes(modelMetrics.memoryUsage)}</div>
                      </div>
                      <div>
                        <span className="text-gray-500">Avg Response:</span>
                        <div className="font-medium">{formatDuration(modelMetrics.averageResponseTime)}</div>
                      </div>
                      <div>
                        <span className="text-gray-500">Throughput:</span>
                        <div className="font-medium">{modelMetrics.throughput.toFixed(1)}/min</div>
                      </div>
                      <div>
                        <span className="text-gray-500">Efficiency:</span>
                        <div className="font-medium">{modelMetrics.efficiency.toFixed(1)} t/s</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {models.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <InformationCircleIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">No Models Found</h3>
            <p className="mb-4">Discover models by configuring discovery paths in settings.</p>
            <button
              onClick={() => actions.discoverModels(discoveryPaths)}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              disabled={isLoading}
            >
              Discover Models
            </button>
          </div>
        )}
      </div>

      {/* Configuration Panel */}
      {showConfig && (
        <div className="border-t border-gray-200 p-6 bg-gray-50">
          <h3 className="font-medium text-gray-900 mb-4">Configuration</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Discovery Paths
              </label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                rows={3}
                placeholder="Enter model discovery paths, one per line"
                defaultValue={discoveryPaths.join('\n')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Memory Optimization
              </label>
              <button
                onClick={actions.optimizeMemory}
                className="w-full px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                disabled={isLoading}
              >
                Optimize Memory Usage
              </button>
              <p className="text-xs text-gray-500 mt-1">
                Unload inactive models to free memory
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModelManager;
