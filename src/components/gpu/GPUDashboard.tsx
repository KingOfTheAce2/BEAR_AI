import React, { useState, useEffect } from 'react';
import { GPUBackend } from '../../services/gpu';
import { useGPUAcceleration, useGPUPerformance } from './GPUAccelerationProvider';

interface GPUDashboardProps {
  className?: string;
  showDetailed?: boolean;
}

export function GPUDashboard({ className = '', showDetailed = false }: GPUDashboardProps) {
  const {
    service,
    isInitialized,
    isLoading,
    error,
    hardwareInfo,
    currentBackend,
    availableBackends,
    isGPUSupported,
    switchBackend,
    runBenchmark
  } = useGPUAcceleration();

  const { performanceMetrics, realTimeMetrics } = useGPUPerformance();
  const [benchmarkResults, setBenchmarkResults] = useState<any>(null);
  const [isBenchmarking, setIsBenchmarking] = useState(false);

  const handleBackendSwitch = async (backend: GPUBackend) => {
    try {
      await switchBackend(backend);
    } catch (err) {
      // Error logging disabled for production
    }
  };

  const handleRunBenchmark = async () => {
    setIsBenchmarking(true);
    try {
      const results = await runBenchmark();
      setBenchmarkResults(results);
    } catch (err) {
      // Error logging disabled for production
    } finally {
      setIsBenchmarking(false);
    }
  };

  const getBackendColor = (backend: GPUBackend) => {
    switch (backend) {
      case 'webgpu': return 'bg-green-100 text-green-800';
      case 'webgl': return 'bg-blue-100 text-blue-800';
      case 'cpu': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'high': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTime = (ms: number) => {
    if (ms < 1) return `${(ms * 1000).toFixed(1)}μs`;
    if (ms < 1000) return `${ms.toFixed(1)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  if (isLoading) {
    return (
      <div className={`p-6 bg-white rounded-lg shadow-sm border ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-6 bg-red-50 rounded-lg border border-red-200 ${className}`}>
        <div className="flex items-center space-x-2 mb-3">
          <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
            <span className="text-white text-xs">✗</span>
          </div>
          <h3 className="text-lg font-semibold text-red-800">GPU Initialization Failed</h3>
        </div>
        <p className="text-red-600 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className={`p-6 bg-white rounded-lg shadow-sm border ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
            <span className="text-blue-600 font-bold">⚡</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">GPU Acceleration</h2>
            <p className="text-sm text-gray-500">
              {isInitialized ? 'Active' : 'Inactive'} • {isGPUSupported ? 'GPU Supported' : 'CPU Only'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getBackendColor(currentBackend)}`}>
            {currentBackend.toUpperCase()}
          </span>
          {isInitialized && (
            <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
          )}
        </div>
      </div>

      {/* Hardware Information */}
      {hardwareInfo && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Hardware</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">GPU Vendor:</span>
                <span className="text-sm font-medium">{hardwareInfo.gpu.vendor}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Performance Tier:</span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${getTierColor(hardwareInfo.gpu.tier)}`}>
                  {hardwareInfo.gpu.tier.toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Max Texture Size:</span>
                <span className="text-sm font-medium">{hardwareInfo.gpu.maxTextureSize}px</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Compute Support:</span>
                <span className="text-sm font-medium">
                  {hardwareInfo.gpu.supportsCompute ? '✓ Yes' : '✗ No'}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Memory</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Total:</span>
                <span className="text-sm font-medium">{formatBytes(hardwareInfo.memory.totalMemory)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Free:</span>
                <span className="text-sm font-medium">{formatBytes(hardwareInfo.memory.freeMemory)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">GPU Memory:</span>
                <span className="text-sm font-medium">{formatBytes(hardwareInfo.memory.gpuMemory)}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                  style={{ 
                    width: `${Math.min(100, (hardwareInfo.memory.usedMemory / hardwareInfo.memory.totalMemory) * 100)}%` 
                  }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Backend Selection */}
      {availableBackends.length > 1 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Available Backends</h3>
          <div className="flex flex-wrap gap-2">
            {availableBackends.map((backend) => (
              <button
                key={backend}
                onClick={() => handleBackendSwitch(backend)}
                disabled={backend === currentBackend}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  backend === currentBackend
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {backend.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Performance Metrics */}
      {performanceMetrics && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Performance</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{performanceMetrics.totalOperations}</div>
              <div className="text-xs text-gray-500">Total Operations</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {formatTime(performanceMetrics.averagePerformance?.computeTime || 0)}
              </div>
              <div className="text-xs text-gray-500">Avg Compute Time</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {(performanceMetrics.averagePerformance?.throughput || 0).toFixed(1)}
              </div>
              <div className="text-xs text-gray-500">MB/s Throughput</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {((performanceMetrics.averagePerformance?.efficiency || 0) * 100).toFixed(1)}%
              </div>
              <div className="text-xs text-gray-500">Efficiency</div>
            </div>
          </div>
        </div>
      )}

      {/* Benchmark Section */}
      <div className="border-t pt-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-700">Benchmarks</h3>
          <button
            onClick={handleRunBenchmark}
            disabled={!isInitialized || isBenchmarking}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isBenchmarking ? 'Running...' : 'Run Benchmark'}
          </button>
        </div>

        {benchmarkResults && (
          <div className="space-y-3">
            {Object.entries(benchmarkResults).map(([backend, results]: [string, any]) => (
              <div key={backend} className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getBackendColor(backend as GPUBackend)}`}>
                    {backend.toUpperCase()}
                  </span>
                  <span className="text-xs text-gray-500">
                    {results.throughput.toFixed(1)} MB/s
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-gray-600">Matrix Multiply:</span>
                    <span className="ml-2 font-medium">{formatTime(results.matrixMultiplyTime)}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Vector Add:</span>
                    <span className="ml-2 font-medium">{formatTime(results.vectorAddTime)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detailed Information */}
      {showDetailed && realTimeMetrics && (
        <div className="border-t pt-6 mt-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Real-time Metrics</h3>
          <div className="bg-gray-50 rounded-lg p-4 font-mono text-xs">
            <pre className="overflow-auto">
              {JSON.stringify(realTimeMetrics, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}