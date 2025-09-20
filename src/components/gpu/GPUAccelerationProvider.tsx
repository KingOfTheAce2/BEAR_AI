import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

import { GPUAccelerationService, GPUServiceConfig, HardwareInfo, GPUBackend, quickStartGPU, isGPUAvailable } from '../../services/gpu';

interface GPUContextType {
  service: GPUAccelerationService | null;
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  hardwareInfo: HardwareInfo | null;
  currentBackend: GPUBackend;
  availableBackends: GPUBackend[];
  performanceMetrics: any;
  isGPUSupported: boolean;
  
  // Methods
  initialize: (config?: Partial<GPUServiceConfig>) => Promise<boolean>;
  switchBackend: (backend: GPUBackend) => Promise<boolean>;
  runBenchmark: () => Promise<any>;
  cleanup: () => Promise<void>;
}

const GPUContext = createContext<GPUContextType | undefined>(undefined);

interface GPUAccelerationProviderProps {
  children: ReactNode;
  autoInitialize?: boolean;
  config?: Partial<GPUServiceConfig>;
}

export function GPUAccelerationProvider({ 
  children, 
  autoInitialize = true, 
  config 
}: GPUAccelerationProviderProps) {
  const [service, setService] = useState<GPUAccelerationService | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hardwareInfo, setHardwareInfo] = useState<HardwareInfo | null>(null);
  const [currentBackend, setCurrentBackend] = useState<GPUBackend>('cpu');
  const [availableBackends, setAvailableBackends] = useState<GPUBackend[]>(['cpu']);
  const [performanceMetrics, setPerformanceMetrics] = useState(null);
  const [isGPUSupported, setIsGPUSupported] = useState(false);

  const initialize = async (initConfig?: Partial<GPUServiceConfig>): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('🚀 Initializing GPU Acceleration...');
      
      // Check GPU availability first
      const gpuAvailable = await isGPUAvailable();
      setIsGPUSupported(gpuAvailable);
      
      const gpuService = await quickStartGPU({
        ...config,
        ...initConfig
      });
      
      setService(gpuService);
      setIsInitialized(true);
      
      // Update state with hardware info
      const hwInfo = gpuService.getHardwareInfo();
      setHardwareInfo(hwInfo);
      setCurrentBackend(gpuService.getCurrentBackend());
      setAvailableBackends(gpuService.getAvailableBackends());
      setPerformanceMetrics(gpuService.getPerformanceMetrics());
      
      console.log('✅ GPU Acceleration initialized successfully');
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('❌ GPU Acceleration initialization failed:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const switchBackend = async (backend: GPUBackend): Promise<boolean> => {
    if (!service) {
      setError('GPU service not initialized');
      return false;
    }

    try {
      const success = await service.switchBackend(backend);
      if (success) {
        setCurrentBackend(backend);
        setPerformanceMetrics(service.getPerformanceMetrics());
        console.log(`🔄 Switched to ${backend} backend`);
      }
      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Backend switch failed';
      setError(errorMessage);
      console.error('❌ Backend switch failed:', err);
      return false;
    }
  };

  const runBenchmark = async () => {
    if (!service) {
      throw new Error('GPU service not initialized');
    }

    try {
      setIsLoading(true);
      console.log('🏃‍♂️ Running GPU benchmark...');
      
      const results = await service.benchmark();
      setPerformanceMetrics(service.getPerformanceMetrics());
      
      console.log('📊 Benchmark completed:', results);
      return results;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Benchmark failed';
      setError(errorMessage);
      console.error('❌ Benchmark failed:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const cleanup = async () => {
    if (service) {
      try {
        await service.cleanup();
        setService(null);
        setIsInitialized(false);
        console.log('🧹 GPU service cleaned up');
      } catch (err) {
        console.error('❌ Cleanup failed:', err);
      }
    }
  };

  // Auto-initialize on mount if enabled
  useEffect(() => {
    if (autoInitialize && !isInitialized && !isLoading) {
      initialize();
    }

    // Cleanup on unmount
    return () => {
      if (service) {
        cleanup();
      }
    };
  }, [autoInitialize]);

  // Update performance metrics periodically
  useEffect(() => {
    if (!service || !isInitialized) return;

    const interval = setInterval(() => {
      const metrics = service.getPerformanceMetrics();
      setPerformanceMetrics(metrics);
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, [service, isInitialized]);

  const contextValue: GPUContextType = {
    service,
    isInitialized,
    isLoading,
    error,
    hardwareInfo,
    currentBackend,
    availableBackends,
    performanceMetrics,
    isGPUSupported,
    initialize,
    switchBackend,
    runBenchmark,
    cleanup
  };

  return (
    <GPUContext.Provider value={contextValue}>
      {children}
    </GPUContext.Provider>
  );
}

export function useGPUAcceleration() {
  const context = useContext(GPUContext);
  if (context === undefined) {
    throw new Error('useGPUAcceleration must be used within a GPUAccelerationProvider');
  }
  return context;
}

// Hook for basic GPU operations
export function useGPUOperations() {
  const { service, isInitialized } = useGPUAcceleration();

  const matrixMultiply = async (
    a: Float32Array,
    b: Float32Array,
    rows: number,
    cols: number,
    inner: number
  ) => {
    if (!service || !isInitialized) {
      throw new Error('GPU service not ready');
    }
    return service.matrixMultiply(a, b, rows, cols, inner);
  };

  const vectorAdd = async (a: Float32Array, b: Float32Array) => {
    if (!service || !isInitialized) {
      throw new Error('GPU service not ready');
    }
    return service.vectorAdd(a, b);
  };

  const accelerate = async (request: import('../../services/gpu').AccelerationRequest) => {
    if (!service || !isInitialized) {
      throw new Error('GPU service not ready');
    }
    return service.accelerate(request);
  };

  return {
    matrixMultiply,
    vectorAdd,
    accelerate,
    isReady: isInitialized && !!service
  };
}

// Hook for GPU performance monitoring
export function useGPUPerformance() {
  const { service, performanceMetrics, isInitialized } = useGPUAcceleration();
  const [realTimeMetrics, setRealTimeMetrics] = useState(null);

  useEffect(() => {
    if (!service || !isInitialized) return;

    // Update metrics more frequently for performance monitoring
    const interval = setInterval(() => {
      const metrics = service.getPerformanceMetrics();
      const memoryStats = service.getMemoryStats();
      setRealTimeMetrics({ ...metrics, memory: memoryStats });
    }, 1000); // Every second

    return () => clearInterval(interval);
  }, [service, isInitialized]);

  return {
    performanceMetrics,
    realTimeMetrics,
    isMonitoring: isInitialized
  };
}
