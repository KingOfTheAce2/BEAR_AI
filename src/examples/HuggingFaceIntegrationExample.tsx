/**
 * Example integration of HuggingFace Model Selection System with BEAR AI
 * Demonstrates complete workflow from model discovery to fine-tuning
 */

import React, { useState, useEffect } from 'react';
import {
  HuggingFaceModelSelector,
  FineTuningInterface,
  HuggingFaceService,
  ModelSwitcher,
  LocalModelManager,
  ModelBenchmarking,
  CompatibilityValidator,
  HuggingFaceModel,
  ModelSearchFilters,
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
  const [hfService] = useState(() => new HuggingFaceService({
    apiToken: process.env.REACT_APP_HUGGINGFACE_TOKEN,
    legalOptimizations: {
      prioritizeLegalModels: true,
      enablePrivacyMode: true,
      requireOpenSource: false,
      filterNonCommercial: false
    }
  }));

  const [modelManager] = useState(() => new CoreModelManager());
  const [localModelManager] = useState(() => new LocalModelManager('./models'));
  const [modelSwitcher] = useState(() => new ModelSwitcher(modelManager, hfService));
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
      const result = await compatibilityValidator.validateModel(model);
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
      const result = await modelSwitcher.switchModel(model.id, {
        preload: true,
        validateCompatibility: true,
        backupConfiguration: true,
        customConfiguration: {
          temperature: 0.3,
          maxLength: 2048,
          legalOptimizations: {
            enableCitations: true,
            strictFactChecking: true,
            conservativeAnswers: true,
            jurisdictionAware: true,
            privacyMode: true
          }
        }
      });

      if (result.success) {
        setSelectedModel(model);
        onModelChange(model);
        console.log('Model switch completed in', result.switchTime, 'ms');
      } else {
        alert(`Model switch failed: ${result.errors.join(', ')}`);
      }
    } catch (error) {
      console.error('Model switch failed:', error);
      alert(`Failed to switch to ${model.modelId}`);
    }
  };

  const handleRunBenchmark = async () => {
    if (!selectedModel) return;

    try {
      setActiveView('benchmark');
      
      const results = await benchmarking.benchmarkModel(selectedModel, [
        'contract_analysis_v1',
        'document_review_v1',
        'legal_research_v1'
      ], {
        parallelTasks: true,
        maxDuration: 30,
        includeStress: false
      });

      console.log('Benchmark results:', results);
      
      // Show results in UI (would implement detailed results view)
      alert(`Benchmark completed! Overall score: ${results.reduce((sum, r) => sum + r.overallScore, 0) / results.length}/100`);
      
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
      const optimizations = compatibility.optimizations.filter(o => o.automated);
      
      if (optimizations.length === 0) {
        alert('No automatic optimizations available');
        return;
      }

      const result = await compatibilityValidator.applyOptimizations(
        selectedModel.id,
        optimizations.map(o => o.id)
      );

      if (result.applied.length > 0) {
        alert(`Applied ${result.applied.length} optimizations successfully`);
        // Refresh compatibility check
        await checkModelCompatibility(selectedModel);
      }

      if (result.failed.length > 0) {
        console.warn('Failed optimizations:', result.failed);
      }

    } catch (error) {
      console.error('Optimization failed:', error);
      alert('Failed to apply optimizations');
    }
  };

  const getRecommendations = async () => {
    try {
      const recommendations = await hfService.getModelRecommendations([
        LegalCategory.CONTRACT_ANALYSIS,
        LegalCategory.DOCUMENT_REVIEW,
        LegalCategory.LEGAL_RESEARCH
      ], {
        maxModelSize: 7000, // 7GB
        requiresGpu: false,
        maxInferenceTime: 30000 // 30 seconds
      });

      console.log('Model recommendations:', recommendations);
      
      // In a real implementation, would show recommendations in UI
      alert(`Found ${recommendations.length} recommended models for your use case`);
      
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