/**
 * BEAR AI Graceful Degradation System
 * Manages system behavior under memory pressure
 * 
 * @file Graceful degradation strategies for low memory scenarios
 * @version 2.0.0
 */

import { EventEmitter } from 'events'
import { SystemMemoryInfo } from './memory-safety-system'

// ==================== INTERFACES ====================

export interface DegradationLevel {
  name: string
  memoryThreshold: number // Percentage
  description: string
  restrictions: DegradationRestriction[]
  allowedFeatures: string[]
  estimatedMemorySavings: number
}

export interface DegradationRestriction {
  feature: string
  action: 'disable' | 'limit' | 'optimize' | 'defer'
  parameters: Record<string, any>
  description: string
}

export interface PerformanceMode {
  name: string
  description: string
  memoryBudget: number
  processingLimits: {
    maxConcurrentTasks: number
    maxDocumentSize: number
    maxModelSize: number
    enableAdvancedFeatures: boolean
  }
  features: {
    realTimeProcessing: boolean
    backgroundTasks: boolean
    advancedAnalytics: boolean
    multiModelInference: boolean
    largeDocumentProcessing: boolean
  }
}

export interface SystemCapability {
  name: string
  memoryRequirement: number
  cpuRequirement: number
  isEssential: boolean
  fallbackStrategy?: string
}

// ==================== GRACEFUL DEGRADATION MANAGER ====================

export class GracefulDegradationManager extends EventEmitter {
  private currentDegradationLevel: DegradationLevel
  private performanceMode: PerformanceMode
  private systemCapabilities: Map<string, SystemCapability> = new Map()
  private disabledFeatures: Set<string> = new Set()
  private degradationLevels: DegradationLevel[] = []

  constructor() {
    super()
    this.initializeDegradationLevels()
    this.initializePerformanceModes()
    this.initializeSystemCapabilities()
    
    // Start in normal mode
    this.currentDegradationLevel = this.degradationLevels[0]
    this.performanceMode = this.getPerformanceMode('balanced')
  }

  private initializeDegradationLevels(): void {
    this.degradationLevels = [
      {
        name: 'normal',
        memoryThreshold: 70,
        description: 'Full functionality available',
        restrictions: [],
        allowedFeatures: ['*'], // All features
        estimatedMemorySavings: 0
      },
      {
        name: 'conservative',
        memoryThreshold: 75,
        description: 'Reduced memory usage with slight performance impact',
        restrictions: [
          {
            feature: 'document-cache',
            action: 'limit',
            parameters: { maxSize: '512MB', ttl: 300000 },
            description: 'Reduce document cache size'
          },
          {
            feature: 'background-tasks',
            action: 'defer',
            parameters: { maxConcurrent: 2 },
            description: 'Defer non-critical background tasks'
          }
        ],
        allowedFeatures: ['document-processing', 'ai-analysis', 'user-interface'],
        estimatedMemorySavings: 512 * 1024 * 1024
      },
      {
        name: 'efficiency',
        memoryThreshold: 80,
        description: 'Optimized for memory efficiency',
        restrictions: [
          {
            feature: 'advanced-analytics',
            action: 'disable',
            parameters: {},
            description: 'Disable advanced analytics features'
          },
          {
            feature: 'multi-model-inference',
            action: 'limit',
            parameters: { maxConcurrent: 1 },
            description: 'Limit to single model inference'
          },
          {
            feature: 'large-documents',
            action: 'limit',
            parameters: { maxSize: '10MB' },
            description: 'Restrict large document processing'
          }
        ],
        allowedFeatures: ['document-processing', 'basic-ai-analysis', 'user-interface'],
        estimatedMemorySavings: 1024 * 1024 * 1024
      },
      {
        name: 'survival',
        memoryThreshold: 85,
        description: 'Minimal functionality to keep system responsive',
        restrictions: [
          {
            feature: 'real-time-processing',
            action: 'disable',
            parameters: {},
            description: 'Disable real-time processing'
          },
          {
            feature: 'concurrent-tasks',
            action: 'limit',
            parameters: { maxConcurrent: 1 },
            description: 'Process one task at a time'
          },
          {
            feature: 'model-auto-loading',
            action: 'disable',
            parameters: {},
            description: 'Require manual model loading'
          }
        ],
        allowedFeatures: ['basic-document-processing', 'essential-ui'],
        estimatedMemorySavings: 2048 * 1024 * 1024
      },
      {
        name: 'critical',
        memoryThreshold: 90,
        description: 'Emergency mode - core functions only',
        restrictions: [
          {
            feature: 'ai-processing',
            action: 'disable',
            parameters: {},
            description: 'Disable AI processing temporarily'
          },
          {
            feature: 'document-upload',
            action: 'disable',
            parameters: {},
            description: 'Prevent new document uploads'
          },
          {
            feature: 'background-services',
            action: 'disable',
            parameters: {},
            description: 'Stop all background services'
          }
        ],
        allowedFeatures: ['basic-ui', 'system-monitoring', 'memory-management'],
        estimatedMemorySavings: 4096 * 1024 * 1024
      }
    ]
  }

  private initializePerformanceModes(): void {
    // Performance modes will be defined based on system capabilities
  }

  private initializeSystemCapabilities(): void {
    const capabilities: SystemCapability[] = [
      {
        name: 'document-processing',
        memoryRequirement: 256 * 1024 * 1024, // 256MB
        cpuRequirement: 20, // 20% CPU
        isEssential: true,
        fallbackStrategy: 'reduce-batch-size'
      },
      {
        name: 'ai-inference',
        memoryRequirement: 2048 * 1024 * 1024, // 2GB
        cpuRequirement: 60, // 60% CPU
        isEssential: true,
        fallbackStrategy: 'use-smaller-model'
      },
      {
        name: 'real-time-analysis',
        memoryRequirement: 512 * 1024 * 1024, // 512MB
        cpuRequirement: 30, // 30% CPU
        isEssential: false,
        fallbackStrategy: 'batch-processing'
      },
      {
        name: 'advanced-analytics',
        memoryRequirement: 1024 * 1024 * 1024, // 1GB
        cpuRequirement: 40, // 40% CPU
        isEssential: false,
        fallbackStrategy: 'disable'
      },
      {
        name: 'background-tasks',
        memoryRequirement: 128 * 1024 * 1024, // 128MB
        cpuRequirement: 10, // 10% CPU
        isEssential: false,
        fallbackStrategy: 'defer'
      }
    ]

    capabilities.forEach(cap => {
      this.systemCapabilities.set(cap.name, cap)
    })
  }

  /**
   * Evaluate system state and apply appropriate degradation level
   */
  async evaluateAndApplyDegradation(memoryInfo: SystemMemoryInfo): Promise<{
    previousLevel: string
    currentLevel: string
    changes: string[]
    memorySaved: number
  }> {
    const previousLevel = this.currentDegradationLevel.name
    const newLevel = this.determineDegradationLevel(memoryInfo.usagePercentage)
    const changes: string[] = []

    if (newLevel.name !== previousLevel) {
      // console.log(`Degradation level changing from ${previousLevel} to ${newLevel.name}`)
      
      // Apply new restrictions
      const memorySaved = await this.applyDegradationLevel(newLevel)
      
      // Track changes
      changes.push(`Switched to ${newLevel.name} mode`)
      changes.push(`Estimated memory savings: ${this.formatBytes(memorySaved)}`)
      
      // Add specific restriction changes
      newLevel.restrictions.forEach(restriction => {
        changes.push(restriction.description)
      })

      this.currentDegradationLevel = newLevel
      
      this.emit('degradationLevelChanged', {
        from: previousLevel,
        to: newLevel.name,
        restrictions: newLevel.restrictions,
        changes
      })

      return {
        previousLevel,
        currentLevel: newLevel.name,
        changes,
        memorySaved
      }
    }

    return {
      previousLevel,
      currentLevel: newLevel.name,
      changes: [],
      memorySaved: 0
    }
  }

  /**
   * Force a specific degradation level
   */
  async forceDegradationLevel(levelName: string): Promise<boolean> {
    const level = this.degradationLevels.find(l => l.name === levelName)
    if (!level) {
      // console.error(`Degradation level ${levelName} not found`)
      return false
    }

    const previousLevel = this.currentDegradationLevel.name
    await this.applyDegradationLevel(level)
    this.currentDegradationLevel = level
    
    this.emit('degradationLevelForced', {
      from: previousLevel,
      to: levelName,
      restrictions: level.restrictions
    })

    return true
  }

  /**
   * Get current degradation status
   */
  getDegradationStatus(): {
    currentLevel: string
    description: string
    activeRestrictions: DegradationRestriction[]
    disabledFeatures: string[]
    allowedFeatures: string[]
    estimatedSavings: number
  } {
    return {
      currentLevel: this.currentDegradationLevel.name,
      description: this.currentDegradationLevel.description,
      activeRestrictions: this.currentDegradationLevel.restrictions,
      disabledFeatures: Array.from(this.disabledFeatures),
      allowedFeatures: this.currentDegradationLevel.allowedFeatures,
      estimatedSavings: this.currentDegradationLevel.estimatedMemorySavings
    }
  }

  /**
   * Check if a feature is available
   */
  isFeatureAvailable(featureName: string): boolean {
    if (this.disabledFeatures.has(featureName)) {
      return false
    }

    const allowedFeatures = this.currentDegradationLevel.allowedFeatures
    if (allowedFeatures.includes('*')) {
      return true
    }

    return allowedFeatures.includes(featureName)
  }

  /**
   * Get feature limitations for current degradation level
   */
  getFeatureLimitations(featureName: string): Record<string, any> | null {
    const restriction = this.currentDegradationLevel.restrictions.find(
      r => r.feature === featureName
    )

    if (restriction && restriction.action === 'limit') {
      return restriction.parameters
    }

    return null
  }

  /**
   * Request feature restoration when memory allows
   */
  requestFeatureRestoration(featureName: string): void {
    this.emit('featureRestorationRequested', {
      feature: featureName,
      currentLevel: this.currentDegradationLevel.name
    })
  }

  /**
   * Get performance recommendations for current memory state
   */
  getPerformanceRecommendations(memoryInfo: SystemMemoryInfo): Array<{
    action: string
    description: string
    estimatedSavings: number
    priority: number
  }> {
    const recommendations: Array<{
      action: string
      description: string
      estimatedSavings: number
      priority: number
    }> = []

    if (memoryInfo.usagePercentage > 75) {
      recommendations.push({
        action: 'enable-conservative-mode',
        description: 'Switch to conservative processing mode',
        estimatedSavings: 512 * 1024 * 1024,
        priority: 1
      })
    }

    if (memoryInfo.usagePercentage > 80) {
      recommendations.push({
        action: 'disable-advanced-features',
        description: 'Temporarily disable advanced analytics',
        estimatedSavings: 1024 * 1024 * 1024,
        priority: 2
      })
    }

    if (memoryInfo.usagePercentage > 85) {
      recommendations.push({
        action: 'limit-concurrent-processing',
        description: 'Process documents one at a time',
        estimatedSavings: 2048 * 1024 * 1024,
        priority: 3
      })
    }

    return recommendations.sort((a, b) => a.priority - b.priority)
  }

  private determineDegradationLevel(memoryUsagePercentage: number): DegradationLevel {
    // Find the most restrictive level that applies
    for (let i = this.degradationLevels.length - 1; i >= 0; i--) {
      const level = this.degradationLevels[i]
      if (memoryUsagePercentage >= level.memoryThreshold) {
        return level
      }
    }

    // Default to normal level
    return this.degradationLevels[0]
  }

  private async applyDegradationLevel(level: DegradationLevel): Promise<number> {
    let totalMemorySaved = 0

    // Clear previous restrictions
    this.disabledFeatures.clear()

    // Apply new restrictions
    for (const restriction of level.restrictions) {
      const savings = await this.applyRestriction(restriction)
      totalMemorySaved += savings
    }

    // console.log(`Applied degradation level: ${level.name}`)
    // console.log(`Estimated memory savings: ${this.formatBytes(totalMemorySaved)}`)

    return totalMemorySaved
  }

  private async applyRestriction(restriction: DegradationRestriction): Promise<number> {
    // console.log(`Applying restriction: ${restriction.description}`)
    
    switch (restriction.action) {
      case 'disable':
        this.disabledFeatures.add(restriction.feature)
        this.emit('featureDisabled', {
          feature: restriction.feature,
          reason: restriction.description
        })
        break

      case 'limit':
        this.emit('featureLimited', {
          feature: restriction.feature,
          parameters: restriction.parameters,
          reason: restriction.description
        })
        break

      case 'optimize':
        this.emit('featureOptimized', {
          feature: restriction.feature,
          parameters: restriction.parameters,
          reason: restriction.description
        })
        break

      case 'defer':
        this.emit('featureDeferred', {
          feature: restriction.feature,
          parameters: restriction.parameters,
          reason: restriction.description
        })
        break
    }

    // Return estimated memory savings (in practice, this would be measured)
    return this.estimateRestrictionSavings(restriction)
  }

  private estimateRestrictionSavings(restriction: DegradationRestriction): number {
    // Rough estimates based on restriction type and feature
    const baseSavings: Record<string, number> = {
      'document-cache': 512 * 1024 * 1024,
      'advanced-analytics': 1024 * 1024 * 1024,
      'multi-model-inference': 2048 * 1024 * 1024,
      'real-time-processing': 256 * 1024 * 1024,
      'background-tasks': 128 * 1024 * 1024,
      'ai-processing': 3072 * 1024 * 1024
    }

    const base = baseSavings[restriction.feature] || 128 * 1024 * 1024
    
    switch (restriction.action) {
      case 'disable': return base
      case 'limit': return base * 0.6
      case 'optimize': return base * 0.3
      case 'defer': return base * 0.1
      default: return 0
    }
  }

  private getPerformanceMode(modeName: string): PerformanceMode {
    // Default performance modes
    const modes: Record<string, PerformanceMode> = {
      'balanced': {
        name: 'balanced',
        description: 'Balanced performance and memory usage',
        memoryBudget: 6 * 1024 * 1024 * 1024, // 6GB
        processingLimits: {
          maxConcurrentTasks: 3,
          maxDocumentSize: 50 * 1024 * 1024, // 50MB
          maxModelSize: 8 * 1024 * 1024 * 1024, // 8GB
          enableAdvancedFeatures: true
        },
        features: {
          realTimeProcessing: true,
          backgroundTasks: true,
          advancedAnalytics: true,
          multiModelInference: true,
          largeDocumentProcessing: true
        }
      },
      'performance': {
        name: 'performance',
        description: 'Maximum performance with higher memory usage',
        memoryBudget: 12 * 1024 * 1024 * 1024, // 12GB
        processingLimits: {
          maxConcurrentTasks: 5,
          maxDocumentSize: 100 * 1024 * 1024, // 100MB
          maxModelSize: 16 * 1024 * 1024 * 1024, // 16GB
          enableAdvancedFeatures: true
        },
        features: {
          realTimeProcessing: true,
          backgroundTasks: true,
          advancedAnalytics: true,
          multiModelInference: true,
          largeDocumentProcessing: true
        }
      },
      'efficiency': {
        name: 'efficiency',
        description: 'Memory efficient with reduced performance',
        memoryBudget: 3 * 1024 * 1024 * 1024, // 3GB
        processingLimits: {
          maxConcurrentTasks: 1,
          maxDocumentSize: 20 * 1024 * 1024, // 20MB
          maxModelSize: 4 * 1024 * 1024 * 1024, // 4GB
          enableAdvancedFeatures: false
        },
        features: {
          realTimeProcessing: false,
          backgroundTasks: false,
          advancedAnalytics: false,
          multiModelInference: false,
          largeDocumentProcessing: false
        }
      }
    }

    return modes[modeName] || modes['balanced']
  }

  private formatBytes(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    if (bytes === 0) return '0 Bytes'
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
  }
}

// Export singleton instance
export const gracefulDegradationManager = new GracefulDegradationManager()

// Utility functions for components
export const checkFeatureAvailability = (featureName: string): boolean => {
  return gracefulDegradationManager.isFeatureAvailable(featureName)
}

export const getFeatureLimitations = (featureName: string): Record<string, any> | null => {
  return gracefulDegradationManager.getFeatureLimitations(featureName)
}

export const getCurrentDegradationStatus = () => {
  return gracefulDegradationManager.getDegradationStatus()
}