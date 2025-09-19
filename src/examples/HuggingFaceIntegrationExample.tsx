/**
 * Example integration of HuggingFace Model Selection System with BEAR AI
 * Demonstrates complete workflow from model discovery to fine-tuning
 */

import React, { useState, useEffect } from 'react';
import {
  HuggingFaceModelSelector,
  FineTuningInterface,
  HuggingFaceService,
  LocalModelManager,
  ModelBenchmarking,
  CompatibilityValidator,
  HuggingFaceModel,
  LegalCategory,
  CompatibilityResult,
  FineTuningConfig
} from '../components/model/huggingface';
import { CoreModelManager } from '../services/modelManager';

interface HuggingFaceIntegrationExampleProps {
  currentModel?: HuggingFaceModel;
  onModelChange: (model: HuggingFaceModel) => void;
}

export const HuggingFaceIntegrationExample: React.FC<HuggingFaceIntegrationExampleProps> = ({
  currentModel,
  onModelChange
}) => {
  const legalOptimizationPreferences = {
    prioritizeLegalModels: true,
    enablePrivacyMode: true,
    requireOpenSource: false,
    filterNonCommercial: false
  } as const;

  const [hfService] = useState(() => new HuggingFaceService({
    apiKey: process.env.REACT_APP_HUGGINGFACE_TOKEN,
    downloadPath: './models',
    localCacheEnabled: true
  }));

  const [modelManager] = useState(() => new CoreModelManager());
  const [localModelManager] = useState(() => new LocalModelManager('./models'));
  const [benchmarking] = useState(() => new ModelBenchmarking());
  const [compatibilityValidator] = useState(() => new CompatibilityValidator());

  const [selectedModel, setSelectedModel] = useState<HuggingFaceModel | null>(currentModel || null);
  const [compatibility, setCompatibility] = useState<CompatibilityResult | null>(null);
  const [activeView, setActiveView] = useState<'browse' | 'finetune' | 'benchmark'>('browse');
  const [downloadProgress, setDownloadProgress] = useState<Map<string, number>>(new Map());

  // Initialize system
  useEffect(() => {
    initializeSystem();
  }, []);

  // Check compatibility when model changes
  useEffect(() => {
    if (selectedModel) {
      checkModelCompatibility(selectedModel);
    }
  }, [selectedModel]);

  const initializeSystem = async () => {
    try {
      // Initialize local model manager with event listeners
      localModelManager.addEventListener('download_progress', (event: any) => {
        const { modelId, progress } = event.detail;
        setDownloadProgress(prev => new Map(prev).set(modelId, progress.progress));
      });

      localModelManager.addEventListener('download_completed', (event: any) => {
        const { modelId } = event.detail;
        setDownloadProgress(prev => {
          const newMap = new Map(prev);
          newMap.delete(modelId);
          return newMap;
        });
        console.log(`Model ${modelId} download completed`);
      });

      // Load any cached models
      const downloadedModels = localModelManager.getDownloadedModels();
      console.log(`Found ${downloadedModels.length} locally cached models`);

    } catch (error) {
      console.error('Failed to initialize HuggingFace system:', error);
    }
  };

  const checkModelCompatibility = async (model: HuggingFaceModel) => {
    try {
      const result = await compatibilityValidator.validateCompatibility(model);
      setCompatibility(result);

      if (!result.compatible) {
        console.warn('Model compatibility issues:', result.issues);
      }
    } catch (error) {
      console.error('Compatibility check failed:', error);
    }
  };

  const handleModelSelect = async (model: HuggingFaceModel) => {
    setSelectedModel(model);
    onModelChange(model);
    
    // Automatically check if model needs to be downloaded
    if (!model.localStatus.downloaded) {
      const shouldDownload = window.confirm(
        `Model ${model.modelId} is not downloaded locally. Download now?`
      );
      if (shouldDownload) {
        handleModelDownload(model);
      }
    }
  };

  const handleModelDownload = async (model: HuggingFaceModel) => {
    try {
      await localModelManager.downloadModel(model, {
        priority: 'high',
        verifyChecksum: true,
        autoOptimize: true
      });
    } catch (error) {
      console.error('Model download failed:', error);
      alert(`Failed to download ${model.modelId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleModelSwitch = async (model: HuggingFaceModel) => {
    if (!model.localStatus.downloaded) {
      alert('Model must be downloaded before switching');
      return;
    }

    try {
      const previousModelId = selectedModel?.id || currentModel?.id || '';
      const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
      const startTime = now();

      await modelManager.switchModel(previousModelId, model.id);

      const switchDuration = Math.round(now() - startTime);
      setSelectedModel(model);
      onModelChange(model);
      console.log('Model switch completed in', switchDuration, 'ms');
    } catch (error) {
      console.error('Model switch failed:', error);
      alert(`Failed to switch to ${model.modelId}`);
    }
  };

  const handleRunBenchmark = async () => {
    if (!selectedModel) return;

    try {
      setActiveView('benchmark');

      const result = await benchmarking.benchmarkModel(selectedModel, progress => {
        console.log(
          `Benchmark progress: ${progress.current}/${progress.total} - ${progress.stage}`
        );
      });

      console.log('Benchmark result:', result);

      const latencyScore = Math.max(0, 100 - result.metrics.latency.mean);
      const throughputScore = Math.min(result.metrics.throughput.tokensPerSecond, 100);
      const accuracyScore = result.metrics.accuracy.score;
      const estimatedOverall = Math.round(
        latencyScore * 0.2 + throughputScore * 0.3 + accuracyScore * 0.5
      );

      alert(
        `Benchmark completed! Estimated overall score: ${estimatedOverall}/100\n` +
          `Latency: ${result.metrics.latency.mean.toFixed(1)} ms • ` +
          `Throughput: ${result.metrics.throughput.tokensPerSecond.toFixed(2)} tokens/s`
      );

    } catch (error) {
      console.error('Benchmark failed:', error);
      alert('Benchmark failed. Check console for details.');
    }
  };

  const handleFineTuningJobCreate = async (config: FineTuningConfig): Promise<string> => {
    if (!selectedModel) throw new Error('No model selected');

    try {
      // In a real implementation, this would start an actual fine-tuning job
      const jobId = `ft-${selectedModel.id}-${Date.now()}`;
      
      console.log('Starting fine-tuning job:', jobId);
      console.log('Configuration:', config);
      
      // Simulate job creation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return jobId;
    } catch (error) {
      console.error('Failed to create fine-tuning job:', error);
      throw error;
    }
  };

  const handleOptimizeCompatibility = async () => {
    if (!selectedModel || !compatibility) return;

    try {
      const automatedOptimizations = compatibility.optimizations
        ? compatibility.optimizations.filter(o => o.automated)
        : [];

      if (automatedOptimizations.length === 0) {
        alert('No automatic optimizations available');
        return;
      }

      alert(
        'Suggested optimizations:\n' +
          automatedOptimizations
            .map(opt => `• ${opt.description}${opt.estimatedImprovement ? ` (≈${opt.estimatedImprovement}% improvement)` : ''}`)
            .join('\n')
      );

      await checkModelCompatibility(selectedModel);

    } catch (error) {
      console.error('Optimization failed:', error);
      alert('Failed to apply optimizations');
    }
  };

  const getRecommendations = async () => {
    try {
      const categories: LegalCategory[] = [
        LegalCategory.CONTRACT_ANALYSIS,
        LegalCategory.DOCUMENT_REVIEW,
        LegalCategory.LEGAL_RESEARCH
      ];

      const recommendationGroups = await Promise.all(
        categories.map(category => hfService.getRecommendations(category, 5))
      );

      const recommendations = recommendationGroups
        .flat()
        .filter(rec => {
          if (legalOptimizationPreferences.requireOpenSource && rec.model.license) {
            return rec.model.license.toLowerCase().includes('apache') ||
              rec.model.license.toLowerCase().includes('mit') ||
              rec.model.license.toLowerCase().includes('open');
          }
          return true;
        });

      console.log('Model recommendations:', recommendations);

      alert(
        `Found ${recommendations.length} recommended models across ${categories.length} legal tasks.`
      );

    } catch (error) {
      console.error('Failed to get recommendations:', error);
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              BEAR AI - HuggingFace Integration
            </h1>
            {selectedModel && (
              <p className="text-gray-600 mt-1">
                Current Model: {selectedModel.modelId} (Legal Score: {selectedModel.legalScore}/100)
              </p>
            )}
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={getRecommendations}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Get Recommendations
            </button>
            
            {selectedModel && (
              <button
                onClick={handleRunBenchmark}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                Run Benchmark
              </button>
            )}
            
            {compatibility && !compatibility.compatible && (
              <button
                onClick={handleOptimizeCompatibility}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
              >
                Optimize Compatibility
              </button>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex space-x-6 mt-4">
          <button
            onClick={() => setActiveView('browse')}
            className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
              activeView === 'browse'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Browse Models
          </button>
          <button
            onClick={() => setActiveView('finetune')}
            disabled={!selectedModel?.localStatus.downloaded}
            className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
              activeView === 'finetune'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed'
            }`}
          >
            Fine-Tune Model
          </button>
        </div>
      </div>

      {/* Compatibility Status */}
      {compatibility && selectedModel && (
        <div className={`px-6 py-3 border-b ${
          compatibility.compatible 
            ? 'bg-green-50 border-green-200' 
            : 'bg-orange-50 border-orange-200'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <span className={`font-medium ${
                compatibility.compatible ? 'text-green-800' : 'text-orange-800'
              }`}>
                {compatibility.compatible ? 'Compatible' : 'Compatibility Issues'}
              </span>
              <span className={`ml-2 text-sm ${
                compatibility.compatible ? 'text-green-600' : 'text-orange-600'
              }`}>
                Score: {compatibility.score}/100 • Confidence: {compatibility.confidence}%
              </span>
            </div>
            
            {!compatibility.compatible && compatibility.optimizations.length > 0 && (
              <span className="text-sm text-orange-600">
                {compatibility.optimizations.filter(o => o.automated).length} automatic fixes available
              </span>
            )}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {activeView === 'browse' && (
          <HuggingFaceModelSelector
            onModelSelect={handleModelSelect}
            onModelDownload={handleModelDownload}
            onModelSwitch={handleModelSwitch}
            currentModel={selectedModel || undefined}
            className="h-full"
          />
        )}

        {activeView === 'finetune' && selectedModel && (
          <FineTuningInterface
            model={selectedModel}
            onJobCreate={handleFineTuningJobCreate}
            onJobCancel={async (jobId) => {
              console.log('Cancelling job:', jobId);
            }}
            onJobPause={async (jobId) => {
              console.log('Pausing job:', jobId);
            }}
            onJobResume={async (jobId) => {
              console.log('Resuming job:', jobId);
            }}
            className="h-full"
          />
        )}

        {activeView === 'benchmark' && (
          <div className="p-6">
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
              <h2 className="text-xl font-semibold mb-4">Benchmark Results</h2>
              <p className="text-gray-600">
                Benchmark results would be displayed here with detailed metrics,
                comparisons, and visualizations.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="bg-white border-t border-gray-200 px-6 py-3">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center space-x-4">
            <span>
              Downloaded Models: {localModelManager.getDownloadedModels().length}
            </span>
            <span>
              Active Downloads: {downloadProgress.size}
            </span>
          </div>
          
          <div className="flex items-center space-x-4">
            {selectedModel && (
              <>
                <span>
                  RAM Required: {selectedModel.resourceRequirements.recommendedRam}MB
                </span>
                <span>
                  Model Size: {(selectedModel.resourceRequirements.modelSizeMB / 1024).toFixed(1)}GB
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HuggingFaceIntegrationExample;