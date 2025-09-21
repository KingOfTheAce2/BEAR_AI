export interface ModelConfig {
  name: string;
  size: string;
  requirements: {
    ram: string;
    vram?: string;
    cpu: string;
  };
  downloadUrl: string;
  format: 'GGUF' | 'ONNX' | 'PyTorch' | 'TensorFlow';
  provider: 'Ollama' | 'Jan' | 'HuggingFace' | 'Custom';
  version: string;
  description?: string;
  tags?: string[];
  license?: string;
  hash?: string;
}

export interface ModelDownloadProgress {
  modelId: string;
  progress: number;
  downloadedBytes: number;
  totalBytes: number;
  speed: number;
  eta: number;
  status: 'downloading' | 'paused' | 'completed' | 'error' | 'verifying';
  error?: string;
}

export interface HardwareCapabilities {
  cpu: {
    cores: number;
    threads: number;
    architecture: string;
    brand: string;
    baseSpeed: number;
    maxSpeed: number;
  };
  memory: {
    total: number;
    available: number;
    type: string;
  };
  gpu?: {
    name: string;
    vendor: string;
    memory: number;
    computeCapability?: string;
    driverVersion?: string;
    supports: {
      cuda?: boolean;
      opencl?: boolean;
      metal?: boolean;
      vulkan?: boolean;
    };
  }[];
}

export interface ModelPerformanceMetrics {
  modelId: string;
  benchmarkDate: string;
  metrics: {
    inferenceSpeed: {
      tokensPerSecond: number;
      firstTokenLatency: number;
      averageTokenLatency: number;
    };
    memoryUsage: {
      peak: number;
      average: number;
      vramUsage?: number;
    };
    qualityMetrics?: {
      bleuScore?: number;
      rougeScore?: number;
      perplexity?: number;
    };
    powerConsumption?: number;
    temperature?: number;
  };
  hardware: HardwareCapabilities;
  configuration: {
    batchSize: number;
    sequenceLength: number;
    precision: 'fp16' | 'fp32' | 'int8' | 'int4';
    quantization?: string;
  };
}

export interface ModelInstance {
  id: string;
  config: ModelConfig;
  status: 'downloaded' | 'downloading' | 'error' | 'loading' | 'ready' | 'running';
  localPath?: string;
  downloadProgress?: ModelDownloadProgress;
  lastUsed?: string;
  metrics?: ModelPerformanceMetrics[];
  isDefault?: boolean;
}

export interface OllamaModel {
  name: string;
  size: number;
  digest: string;
  modified_at: string;
  details: {
    format: string;
    family: string;
    families: string[];
    parameter_size: string;
    quantization_level: string;
  };
}

export interface JanModel {
  id: string;
  name: string;
  version: string;
  description?: string;
  format: string;
  size: number;
  requirements: {
    ram: number;
    disk: number;
  };
  source: {
    url: string;
    filename: string;
  };
}

export interface ModelManagerConfig {
  modelsDirectory: string;
  maxConcurrentDownloads: number;
  enableAutoResume: boolean;
  verifyDownloads: boolean;
  enableBenchmarking: boolean;
  ollamaEndpoint?: string;
  janEndpoint?: string;
  defaultProvider: ModelConfig['provider'];
}