/**
 * Batch Processor Configuration Management
 * Handles dynamic configuration and optimization settings for the batch processing system
 */

import * as os from 'os';
import * as process from 'process';
import { BatchProcessorConfig } from './batchProcessor';
import { LocalInferenceEngineConfig } from './localInferenceEngine';

export interface OptimizedBatchConfig extends BatchProcessorConfig {
  inference: LocalInferenceEngineConfig;
  performance: PerformanceConfig;
  monitoring: MonitoringConfig;
  resourceLimits: ResourceLimitConfig;
}

export interface PerformanceConfig {
  enableTurboMode: boolean;
  preloadModels: boolean;
  aggressiveCaching: boolean;
  memoryOptimization: boolean;
  gpuAcceleration: boolean;
  cpuOptimization: boolean;
  networkOptimization: boolean;
  diskOptimization: boolean;
}

export interface MonitoringConfig {
  enableMetrics: boolean;
  enableProfiling: boolean;
  enableTracing: boolean;
  metricsInterval: number;
  logLevel: 'error' | 'warn' | 'info' | 'debug' | 'trace';
  exportMetrics: boolean;
  alertThresholds: {
    memoryUsage: number;
    cpuUsage: number;
    errorRate: number;
    latency: number;
  };
}

export interface ResourceLimitConfig {
  maxMemoryUsage: number;
  maxCpuUsage: number;
  maxDiskUsage: number;
  maxNetworkBandwidth: number;
  maxGpuMemory: number;
  maxFileDescriptors: number;
  maxThreads: number;
  gracefulDegradation: boolean;
}

export interface SystemCapabilities {
  cpu: {
    cores: number;
    threads: number;
    architecture: string;
    model: string;
    speed: number;
  };
  memory: {
    total: number;
    available: number;
    free: number;
  };
  gpu: {
    available: boolean;
    memory?: number;
    cores?: number;
    model?: string;
  };
  storage: {
    type: 'SSD' | 'HDD' | 'NVME';
    available: number;
    speed?: number;
  };
}

/**
 * System Capability Detector
 * Automatically detects system capabilities for optimal configuration
 */
export class SystemCapabilityDetector {
  static async detectCapabilities(): Promise<SystemCapabilities> {
    const cpus = os.cpus();
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();

    return {
      cpu: {
        cores: cpus.length,
        threads: cpus.length, // Simplified - actual thread count may vary
        architecture: os.arch(),
        model: cpus[0]?.model || 'Unknown',
        speed: cpus[0]?.speed || 0
      },
      memory: {
        total: totalMemory,
        available: freeMemory,
        free: freeMemory
      },
      gpu: await this.detectGPU(),
      storage: await this.detectStorage()
    };
  }

  private static async detectGPU(): Promise<SystemCapabilities['gpu']> {
    // Simplified GPU detection - in production would use proper GPU detection
    try {
      // Check for NVIDIA GPU
      const hasNvidia = process.platform === 'win32' ? 
        await this.checkCommandExists('nvidia-smi') :
        await this.checkCommandExists('nvidia-ml-py3');

      if (hasNvidia) {
        return {
          available: true,
          memory: 8 * 1024 * 1024 * 1024, // 8GB estimate
          cores: 2048, // Estimate
          model: 'NVIDIA GPU (detected)'
        };
      }

      // Check for AMD GPU
      const hasAMD = await this.checkCommandExists('rocm-smi');
      if (hasAMD) {
        return {
          available: true,
          memory: 6 * 1024 * 1024 * 1024, // 6GB estimate
          cores: 1536, // Estimate
          model: 'AMD GPU (detected)'
        };
      }

      return { available: false };
    } catch {
      return { available: false };
    }
  }

  private static async detectStorage(): Promise<SystemCapabilities['storage']> {
    // Simplified storage detection
    try {
      const stats = await import('fs').then(fs => fs.promises.stat(process.cwd()));
      
      // Estimate storage type based on performance characteristics
      // This is a simplified heuristic - production code would use proper detection
      return {
        type: 'SSD', // Default assumption for modern systems
        available: 100 * 1024 * 1024 * 1024, // 100GB estimate
        speed: 500 * 1024 * 1024 // 500 MB/s estimate
      };
    } catch {
      return {
        type: 'HDD',
        available: 50 * 1024 * 1024 * 1024, // 50GB estimate
        speed: 100 * 1024 * 1024 // 100 MB/s estimate
      };
    }
  }

  private static async checkCommandExists(command: string): Promise<boolean> {
    try {
      const { exec } = await import('child_process');
      return new Promise((resolve) => {
        exec(`${process.platform === 'win32' ? 'where' : 'which'} ${command}`, (error) => {
          resolve(!error);
        });
      });
    } catch {
      return false;
    }
  }
}

/**
 * Configuration Optimizer
 * Automatically optimizes batch processor configuration based on system capabilities
 */
export class BatchConfigurationOptimizer {
  private capabilities: SystemCapabilities;

  constructor(capabilities: SystemCapabilities) {
    this.capabilities = capabilities;
  }

  /**
   * Generate optimized configuration based on system capabilities
   */
  generateOptimizedConfig(): OptimizedBatchConfig {
    const baseConfig = this.generateBaseConfig();
    const inferenceConfig = this.generateInferenceConfig();
    const performanceConfig = this.generatePerformanceConfig();
    const monitoringConfig = this.generateMonitoringConfig();
    const resourceLimitConfig = this.generateResourceLimitConfig();

    return {
      ...baseConfig,
      inference: inferenceConfig,
      performance: performanceConfig,
      monitoring: monitoringConfig,
      resourceLimits: resourceLimitConfig
    };
  }

  /**
   * Generate configuration optimized for maximum throughput
   */
  generateThroughputOptimizedConfig(): OptimizedBatchConfig {
    const baseConfig = this.generateOptimizedConfig();
    
    // Optimize for throughput
    baseConfig.maxConcurrentBatches = Math.max(4, this.capabilities.cpu.cores);
    baseConfig.maxBatchSize = 64;
    baseConfig.batchTimeout = 1000; // Shorter timeout for faster processing
    baseConfig.adaptiveBatching = true;
    baseConfig.loadBalancing = true;

    baseConfig.inference.maxConcurrentInferences = this.capabilities.cpu.cores * 2;
    baseConfig.inference.modelCacheSize = Math.max(3, Math.floor(this.capabilities.memory.total / (2 * 1024 * 1024 * 1024)));

    baseConfig.performance.enableTurboMode = true;
    baseConfig.performance.aggressiveCaching = true;
    baseConfig.performance.preloadModels = true;

    return baseConfig;
  }

  /**
   * Generate configuration optimized for memory efficiency
   */
  generateMemoryOptimizedConfig(): OptimizedBatchConfig {
    const baseConfig = this.generateOptimizedConfig();
    
    // Optimize for memory efficiency
    baseConfig.maxBatchSize = Math.min(16, Math.floor(this.capabilities.memory.available / (500 * 1024 * 1024)));
    baseConfig.memoryThreshold = 0.6; // More conservative memory usage
    
    baseConfig.inference.modelCacheSize = 1; // Minimal caching
    baseConfig.inference.memoryThreshold = 0.6;
    
    baseConfig.performance.memoryOptimization = true;
    baseConfig.performance.aggressiveCaching = false;

    return baseConfig;
  }

  /**
   * Generate configuration optimized for low latency
   */
  generateLowLatencyConfig(): OptimizedBatchConfig {
    const baseConfig = this.generateOptimizedConfig();
    
    // Optimize for low latency
    baseConfig.maxBatchSize = 8; // Smaller batches for faster processing
    baseConfig.minBatchSize = 1;
    baseConfig.batchTimeout = 100; // Very short timeout
    baseConfig.workerPoolSize = this.capabilities.cpu.cores;
    
    baseConfig.inference.warmupRequests = 10; // More warmup for consistent performance
    baseConfig.inference.enablePrefetching = true;
    
    baseConfig.performance.preloadModels = true;
    baseConfig.performance.cpuOptimization = true;

    return baseConfig;
  }

  private generateBaseConfig(): BatchProcessorConfig {
    const cpuCores = this.capabilities.cpu.cores;
    const memoryGB = this.capabilities.memory.total / (1024 * 1024 * 1024);
    
    return {
      maxConcurrentBatches: Math.max(2, Math.min(cpuCores - 1, 8)),
      maxBatchSize: Math.min(32, Math.floor(memoryGB * 4)), // 4 requests per GB
      minBatchSize: 1,
      batchTimeout: 2000,
      workerPoolSize: Math.max(2, cpuCores),
      memoryThreshold: 0.8,
      cpuThreshold: 0.9,
      adaptiveBatching: true,
      priorityScheduling: true,
      loadBalancing: true
    };
  }

  private generateInferenceConfig(): LocalInferenceEngineConfig {
    const cpuCores = this.capabilities.cpu.cores;
    const memoryGB = this.capabilities.memory.total / (1024 * 1024 * 1024);
    
    return {
      workerPoolSize: Math.max(2, cpuCores - 1),
      maxConcurrentInferences: cpuCores * 2,
      modelCacheSize: Math.max(2, Math.min(5, Math.floor(memoryGB / 4))),
      memoryThreshold: 0.8,
      gpuMemoryThreshold: this.capabilities.gpu.available ? 0.9 : 1.0,
      warmupRequests: 3,
      enablePrefetching: memoryGB >= 8, // Only enable if sufficient memory
      enableCaching: true
    };
  }

  private generatePerformanceConfig(): PerformanceConfig {
    const hasGPU = this.capabilities.gpu.available;
    const isSSD = this.capabilities.storage.type !== 'HDD';
    const memoryGB = this.capabilities.memory.total / (1024 * 1024 * 1024);
    
    return {
      enableTurboMode: memoryGB >= 16 && this.capabilities.cpu.cores >= 8,
      preloadModels: memoryGB >= 8,
      aggressiveCaching: memoryGB >= 16,
      memoryOptimization: memoryGB < 8,
      gpuAcceleration: hasGPU,
      cpuOptimization: true,
      networkOptimization: true,
      diskOptimization: isSSD
    };
  }

  private generateMonitoringConfig(): MonitoringConfig {
    return {
      enableMetrics: true,
      enableProfiling: false, // Disabled by default for performance
      enableTracing: false, // Disabled by default for performance
      metricsInterval: 5000, // 5 seconds
      logLevel: 'info',
      exportMetrics: false,
      alertThresholds: {
        memoryUsage: 0.85,
        cpuUsage: 0.9,
        errorRate: 0.05, // 5%
        latency: 5000 // 5 seconds
      }
    };
  }

  private generateResourceLimitConfig(): ResourceLimitConfig {
    const memoryBytes = this.capabilities.memory.total;
    const cpuCores = this.capabilities.cpu.cores;
    
    return {
      maxMemoryUsage: memoryBytes * 0.8, // 80% of total memory
      maxCpuUsage: 0.9, // 90% CPU utilization
      maxDiskUsage: this.capabilities.storage.available * 0.7, // 70% of available storage
      maxNetworkBandwidth: 1024 * 1024 * 100, // 100 MB/s
      maxGpuMemory: this.capabilities.gpu.memory ? this.capabilities.gpu.memory * 0.9 : 0,
      maxFileDescriptors: 10000,
      maxThreads: cpuCores * 4,
      gracefulDegradation: true
    };
  }
}

/**
 * Configuration Validator
 * Validates and sanitizes configuration settings
 */
export class BatchConfigurationValidator {
  static validateConfig(config: Partial<OptimizedBatchConfig>): OptimizedBatchConfig {
    const validated = { ...config } as OptimizedBatchConfig;

    // Validate batch processor config
    validated.maxConcurrentBatches = Math.max(1, validated.maxConcurrentBatches || 2);
    validated.maxBatchSize = Math.max(1, Math.min(1000, validated.maxBatchSize || 32));
    validated.minBatchSize = Math.max(1, Math.min(validated.maxBatchSize, validated.minBatchSize || 1));
    validated.batchTimeout = Math.max(100, validated.batchTimeout || 2000);
    validated.workerPoolSize = Math.max(1, validated.workerPoolSize || os.cpus().length);
    validated.memoryThreshold = Math.max(0.1, Math.min(1.0, validated.memoryThreshold || 0.8));
    validated.cpuThreshold = Math.max(0.1, Math.min(1.0, validated.cpuThreshold || 0.9));

    // Set defaults for boolean flags
    validated.adaptiveBatching = validated.adaptiveBatching !== false;
    validated.priorityScheduling = validated.priorityScheduling !== false;
    validated.loadBalancing = validated.loadBalancing !== false;

    return validated;
  }

  static validateResourceLimits(config: ResourceLimitConfig, capabilities: SystemCapabilities): ResourceLimitConfig {
    return {
      maxMemoryUsage: Math.min(config.maxMemoryUsage, capabilities.memory.total * 0.95),
      maxCpuUsage: Math.min(1.0, Math.max(0.1, config.maxCpuUsage)),
      maxDiskUsage: Math.min(config.maxDiskUsage, capabilities.storage.available * 0.9),
      maxNetworkBandwidth: Math.max(1024, config.maxNetworkBandwidth),
      maxGpuMemory: capabilities.gpu.available ? 
        Math.min(config.maxGpuMemory, capabilities.gpu.memory! * 0.95) : 0,
      maxFileDescriptors: Math.max(100, Math.min(100000, config.maxFileDescriptors)),
      maxThreads: Math.max(1, Math.min(capabilities.cpu.cores * 8, config.maxThreads)),
      gracefulDegradation: config.gracefulDegradation
    };
  }
}

/**
 * Default configuration factory
 */
export class BatchConfigurationFactory {
  static async createDefaultConfig(): Promise<OptimizedBatchConfig> {
    const capabilities = await SystemCapabilityDetector.detectCapabilities();
    const optimizer = new BatchConfigurationOptimizer(capabilities);
    return optimizer.generateOptimizedConfig();
  }

  static async createThroughputConfig(): Promise<OptimizedBatchConfig> {
    const capabilities = await SystemCapabilityDetector.detectCapabilities();
    const optimizer = new BatchConfigurationOptimizer(capabilities);
    return optimizer.generateThroughputOptimizedConfig();
  }

  static async createMemoryEfficientConfig(): Promise<OptimizedBatchConfig> {
    const capabilities = await SystemCapabilityDetector.detectCapabilities();
    const optimizer = new BatchConfigurationOptimizer(capabilities);
    return optimizer.generateMemoryOptimizedConfig();
  }

  static async createLowLatencyConfig(): Promise<OptimizedBatchConfig> {
    const capabilities = await SystemCapabilityDetector.detectCapabilities();
    const optimizer = new BatchConfigurationOptimizer(capabilities);
    return optimizer.generateLowLatencyConfig();
  }
}

export {
  SystemCapabilityDetector,
  BatchConfigurationOptimizer,
  BatchConfigurationValidator
};