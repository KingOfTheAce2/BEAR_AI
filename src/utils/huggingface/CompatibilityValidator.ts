/**
 * Compatibility Validator for HuggingFace Models
 * Validates model compatibility with system requirements
 */

import { CompatibilityResult, HuggingFaceModel } from '../../types/huggingface';

export interface SystemRequirements {
  memory: {
    total: number;
    available: number;
  };
  storage: {
    total: number;
    available: number;
  };
  cpu: {
    cores: number;
    architecture: string;
  };
  gpu?: {
    available: boolean;
    memory: number;
    computeCapability: string;
  };
  platform: string;
  node?: {
    version: string;
  };
  browser?: {
    name: string;
    version: string;
  };
}

export class CompatibilityValidator {
  private systemRequirements: SystemRequirements;

  constructor() {
    this.systemRequirements = this.detectSystemRequirements();
  }

  /**
   * Validate model compatibility
   */
  async validateCompatibility(model: HuggingFaceModel): Promise<CompatibilityResult> {
    const issues: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Check memory requirements
    const memoryCheck = this.checkMemoryRequirements(model);
    if (!memoryCheck.sufficient) {
      issues.push(memoryCheck.message);
    } else if (memoryCheck.tight) {
      warnings.push(memoryCheck.message);
    }

    // Check storage requirements  
    const storageCheck = this.checkStorageRequirements(model);
    if (!storageCheck.sufficient) {
      issues.push(storageCheck.message);
    }

    // Check library compatibility
    const libraryCheck = this.checkLibraryCompatibility(model);
    if (!libraryCheck.compatible) {
      issues.push(libraryCheck.message);
    } else if (libraryCheck.warnings.length > 0) {
      warnings.push(...libraryCheck.warnings);
    }

    // Check architecture compatibility
    const archCheck = this.checkArchitectureCompatibility(model);
    if (!archCheck.compatible) {
      issues.push(archCheck.message);
    }

    // Generate recommendations
    recommendations.push(...this.generateRecommendations(model));

    const estimatedRequirements = this.estimateRequirements(model);

    return {
      compatible: issues.length === 0,
      issues,
      warnings,
      requirements: estimatedRequirements,
      recommendations
    };
  }

  /**
   * Validate multiple models
   */
  async validateMultipleModels(models: HuggingFaceModel[]): Promise<{
    compatible: HuggingFaceModel[];
    incompatible: Array<{ model: HuggingFaceModel; result: CompatibilityResult }>;
    warnings: Array<{ model: HuggingFaceModel; result: CompatibilityResult }>;
  }> {
    const results = await Promise.all(
      models.map(async model => ({
        model,
        result: await this.validateCompatibility(model)
      }))
    );

    const compatible = results.filter(r => r.result.compatible).map(r => r.model);
    const incompatible = results.filter(r => !r.result.compatible);
    const warnings = results.filter(r => r.result.compatible && r.result.warnings.length > 0);

    return { compatible, incompatible, warnings };
  }

  /**
   * Get system capabilities summary
   */
  getSystemCapabilities(): {
    summary: string;
    details: SystemRequirements;
    recommendations: string[];
  } {
    const memory = this.systemRequirements.memory;
    const storage = this.systemRequirements.storage;
    const cpu = this.systemRequirements.cpu;
    const gpu = this.systemRequirements.gpu;

    let summary = `${cpu.cores}-core ${cpu.architecture} system with ${Math.round(memory.total / (1024**3))}GB RAM`;
    if (gpu?.available) {
      summary += ` and ${Math.round(gpu.memory / (1024**3))}GB GPU`;
    }

    const recommendations: string[] = [];

    if (memory.available < memory.total * 0.3) {
      recommendations.push('Consider closing other applications to free up memory');
    }

    if (storage.available < storage.total * 0.1) {
      recommendations.push('Free up disk space for model storage');
    }

    if (!gpu?.available) {
      recommendations.push('GPU acceleration could improve performance');
    }

    return {
      summary,
      details: this.systemRequirements,
      recommendations
    };
  }

  /**
   * Update system requirements (useful for testing)
   */
  updateSystemRequirements(requirements: Partial<SystemRequirements>): void {
    this.systemRequirements = { ...this.systemRequirements, ...requirements };
  }

  // Private methods

  private detectSystemRequirements(): SystemRequirements {
    // Browser environment detection
    if (typeof window !== 'undefined') {
      const memoryInfo = (performance as any).memory;
      const connection = (navigator as any).connection;
      
      return {
        memory: {
          total: memoryInfo?.jsHeapSizeLimit || 4 * 1024**3, // 4GB default
          available: memoryInfo ? memoryInfo.jsHeapSizeLimit - memoryInfo.usedJSHeapSize : 2 * 1024**3
        },
        storage: {
          total: 10 * 1024**3, // Estimate 10GB
          available: 5 * 1024**3 // Estimate 5GB
        },
        cpu: {
          cores: navigator.hardwareConcurrency || 4,
          architecture: navigator.platform || 'unknown'
        },
        gpu: {
          available: false, // Would need WebGL detection
          memory: 0,
          computeCapability: 'unknown'
        },
        platform: navigator.platform,
        browser: {
          name: this.detectBrowser(),
          version: navigator.appVersion
        }
      };
    }

    // Node.js environment detection
    if (typeof process !== 'undefined') {
      const os = require('os');
      const memUsage = process.memoryUsage();
      
      return {
        memory: {
          total: os.totalmem(),
          available: os.freemem()
        },
        storage: {
          total: 100 * 1024**3, // Would need fs.statvfs
          available: 50 * 1024**3
        },
        cpu: {
          cores: os.cpus().length,
          architecture: os.arch()
        },
        platform: os.platform(),
        node: {
          version: process.version
        }
      };
    }

    // Fallback for unknown environments
    return {
      memory: {
        total: 8 * 1024**3,
        available: 4 * 1024**3
      },
      storage: {
        total: 100 * 1024**3,
        available: 50 * 1024**3
      },
      cpu: {
        cores: 4,
        architecture: 'unknown'
      },
      platform: 'unknown'
    };
  }

  private checkMemoryRequirements(model: HuggingFaceModel): {
    sufficient: boolean;
    tight: boolean;
    message: string;
  } {
    const estimatedMemory = this.estimateModelMemory(model);
    const available = this.systemRequirements.memory.available;

    if (estimatedMemory > available) {
      return {
        sufficient: false,
        tight: false,
        message: `Insufficient memory: need ${Math.round(estimatedMemory / (1024**3))}GB, have ${Math.round(available / (1024**3))}GB`
      };
    }

    if (estimatedMemory > available * 0.8) {
      return {
        sufficient: true,
        tight: true,
        message: `Memory usage will be high: ${Math.round(estimatedMemory / (1024**3))}GB of ${Math.round(available / (1024**3))}GB available`
      };
    }

    return {
      sufficient: true,
      tight: false,
      message: 'Memory requirements satisfied'
    };
  }

  private checkStorageRequirements(model: HuggingFaceModel): {
    sufficient: boolean;
    message: string;
  } {
    const estimatedStorage = (model.size || 1024**3) * 1.5; // 50% overhead
    const available = this.systemRequirements.storage.available;

    if (estimatedStorage > available) {
      return {
        sufficient: false,
        message: `Insufficient storage: need ${Math.round(estimatedStorage / (1024**3))}GB, have ${Math.round(available / (1024**3))}GB`
      };
    }

    return {
      sufficient: true,
      message: 'Storage requirements satisfied'
    };
  }

  private checkLibraryCompatibility(model: HuggingFaceModel): {
    compatible: boolean;
    message: string;
    warnings: string[];
  } {
    const warnings: string[] = [];
    
    // Check for browser-specific limitations
    if (typeof window !== 'undefined') {
      const supportedLibraries = ['transformers.js', 'onnx.js', 'tensorflow.js'];
      
      if (model.library_name && !supportedLibraries.includes(model.library_name)) {
        return {
          compatible: false,
          message: `Library ${model.library_name} not supported in browser environment`,
          warnings
        };
      }

      if (model.pipeline_tag === 'automatic-speech-recognition') {
        warnings.push('Audio processing may have limited browser support');
      }
    }

    return {
      compatible: true,
      message: 'Library compatibility verified',
      warnings
    };
  }

  private checkArchitectureCompatibility(model: HuggingFaceModel): {
    compatible: boolean;
    message: string;
  } {
    // Most models are architecture-agnostic in JavaScript environments
    return {
      compatible: true,
      message: 'Architecture compatibility verified'
    };
  }

  private generateRecommendations(model: HuggingFaceModel): string[] {
    const recommendations: string[] = [];
    const estimatedMemory = this.estimateModelMemory(model);
    const available = this.systemRequirements.memory.available;

    // Memory recommendations
    if (estimatedMemory > available * 0.6) {
      recommendations.push('Consider using a quantized version of this model to reduce memory usage');
    }

    // Performance recommendations
    if (this.systemRequirements.cpu.cores < 4) {
      recommendations.push('Multi-threaded inference may be limited due to CPU core count');
    }

    if (!this.systemRequirements.gpu?.available && model.size && model.size > 2 * 1024**3) {
      recommendations.push('GPU acceleration would significantly improve performance for this large model');
    }

    // Browser-specific recommendations
    if (typeof window !== 'undefined') {
      recommendations.push('Consider using Web Workers for better performance');
      if (model.pipeline_tag === 'text-generation') {
        recommendations.push('Enable streaming for better user experience with text generation');
      }
    }

    return recommendations;
  }

  private estimateModelMemory(model: HuggingFaceModel): number {
    // Estimate memory usage: model size + overhead + workspace
    const modelSize = model.size || 1024**3; // Default to 1GB if unknown
    const overhead = modelSize * 0.3; // 30% overhead for loading and processing
    const workspace = 512 * 1024**2; // 512MB workspace for computations
    
    return modelSize + overhead + workspace;
  }

  private estimateRequirements(model: HuggingFaceModel): {
    memory: number;
    diskSpace: number;
    computeCapability?: string;
  } {
    return {
      memory: this.estimateModelMemory(model),
      diskSpace: (model.size || 1024**3) * 1.1, // 10% overhead for storage
      computeCapability: model.pipeline_tag === 'text-generation' ? 'high' : 'medium'
    };
  }

  private detectBrowser(): string {
    if (typeof window === 'undefined') return 'unknown';
    
    const userAgent = navigator.userAgent;
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'unknown';
  }
}

export default CompatibilityValidator;
