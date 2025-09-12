/**
 * Unit Tests for Model Manager
 * Testing model lifecycle management and memory-aware loading
 */

import { describe, it, expect, beforeEach, afterEach, vi, beforeAll } from 'vitest'
import { CoreModelManager } from '../../src/services/modelManager'
import { 
  ModelConfig,
  ModelType,
  ModelStatus,
  ModelPriority,
  ModelError,
  ModelErrorCode,
  ModelEventType,
  MemoryPressure
} from '../../src/types/modelTypes'

// Mock MemoryAwareLoader
const mockMemoryAwareLoader = {
  getLoadingStrategy: vi.fn(),
  registerLoadedModel: vi.fn(),
  unregisterModel: vi.fn(),
  optimizeMemory: vi.fn(),
  getMemoryStats: vi.fn(),
  dispose: vi.fn()
}

// Mock GPT4ALL Integration
const mockGPT4ALLInstance = {
  loadModel: vi.fn(),
  unloadModel: vi.fn(),
  generate: vi.fn(),
  getMemoryUsage: vi.fn().mockReturnValue(1024 * 1024 * 1024) // 1GB
}

const mockGPT4ALLFactory = {
  createModel: vi.fn().mockResolvedValue(mockGPT4ALLInstance),
  discoverModels: vi.fn().mockResolvedValue([])
}

vi.mock('../../src/utils/memoryAwareLoader', () => ({
  default: vi.fn().mockImplementation(() => mockMemoryAwareLoader)
}))

vi.mock('../../src/services/gpt4allIntegration', () => ({
  GPT4ALLFactory: mockGPT4ALLFactory
}))

describe('CoreModelManager', () => {
  let modelManager: CoreModelManager
  let testModelConfig: ModelConfig

  beforeAll(() => {
    // Mock setInterval/clearInterval
    vi.useFakeTimers()
  })

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks()
    
    // Create fresh model manager
    modelManager = new CoreModelManager({
      maxConcurrentModels: 3,
      memoryThreshold: 80,
      autoUnloadTimeout: 5, // 5 minutes for testing
      enableTelemetry: true
    })

    // Test model configuration
    testModelConfig = {
      id: 'test-model-1',
      name: 'Test Legal Model',
      path: '/models/test-model.gguf',
      type: ModelType.GPT4ALL,
      size: 4 * 1024 * 1024 * 1024, // 4GB
      quantization: 'Q4_K_M',
      capabilities: ['legal-analysis', 'contract-review'],
      priority: ModelPriority.MEDIUM,
      metadata: {
        description: 'Test model for legal analysis',
        version: '1.0.0',
        license: 'MIT'
      }
    }

    // Register test model
    modelManager.registerModel(testModelConfig)

    // Setup default loading strategy
    mockMemoryAwareLoader.getLoadingStrategy.mockResolvedValue({
      action: 'load',
      preUnloadModels: [],
      reason: 'Memory available'
    })
  })

  afterEach(async () => {
    if (modelManager) {
      await modelManager.dispose()
    }
    vi.clearAllTimers()
  })

  describe('Initialization', () => {
    it('should initialize with default configuration', () => {
      const defaultManager = new CoreModelManager()
      const stats = defaultManager.getStats()
      
      expect(stats.loadedModels).toBe(0)
      expect(stats.totalMemoryUsed).toBe(0)
      expect(stats.totalInferences).toBe(0)
    })

    it('should initialize with custom configuration', () => {
      const customManager = new CoreModelManager({
        maxConcurrentModels: 5,
        memoryThreshold: 90,
        cacheSize: 4 * 1024 * 1024 * 1024
      })
      
      expect(customManager).toBeDefined()
    })

    it('should setup auto-unload timer', () => {
      // Timer should be created during initialization
      expect(setInterval).toHaveBeenCalled()
    })
  })

  describe('Model Registration', () => {
    it('should register model configuration', () => {
      const newModel: ModelConfig = {
        ...testModelConfig,
        id: 'test-model-2',
        name: 'Second Test Model'
      }
      
      modelManager.registerModel(newModel)
      
      const registeredModels = modelManager.getRegisteredModels()
      expect(registeredModels).toHaveLength(2)
      expect(registeredModels.some(m => m.id === 'test-model-2')).toBe(true)
    })

    it('should unregister model configuration', () => {
      modelManager.unregisterModel(testModelConfig.id)
      
      const registeredModels = modelManager.getRegisteredModels()
      expect(registeredModels.some(m => m.id === testModelConfig.id)).toBe(false)
    })

    it('should allow updating model configuration', () => {
      const updatedConfig = {
        ...testModelConfig,
        priority: ModelPriority.HIGH
      }
      
      modelManager.registerModel(updatedConfig) // Re-register with same ID
      
      const registeredModels = modelManager.getRegisteredModels()
      const foundModel = registeredModels.find(m => m.id === testModelConfig.id)
      expect(foundModel?.priority).toBe(ModelPriority.HIGH)
    })
  })

  describe('Model Loading', () => {
    beforeEach(() => {
      mockGPT4ALLInstance.loadModel.mockResolvedValue(undefined)
    })

    it('should load model successfully', async () => {
      const loadedModel = await modelManager.loadModel(testModelConfig.id)
      
      expect(loadedModel).toBeDefined()
      expect(loadedModel.config.id).toBe(testModelConfig.id)
      expect(loadedModel.status).toBe(ModelStatus.LOADED)
      expect(loadedModel.memoryUsage).toBeGreaterThan(0)
      expect(mockGPT4ALLInstance.loadModel).toHaveBeenCalled()
      expect(mockMemoryAwareLoader.registerLoadedModel).toHaveBeenCalled()
    })

    it('should return existing model if already loaded', async () => {
      // Load model first time
      const firstLoad = await modelManager.loadModel(testModelConfig.id)
      
      // Clear mock calls
      mockGPT4ALLInstance.loadModel.mockClear()
      
      // Load model second time
      const secondLoad = await modelManager.loadModel(testModelConfig.id)
      
      expect(firstLoad).toBe(secondLoad)
      expect(mockGPT4ALLInstance.loadModel).not.toHaveBeenCalled()
      expect(secondLoad.lastUsed.getTime()).toBeGreaterThanOrEqual(firstLoad.lastUsed.getTime())
    })

    it('should respect concurrent model limits', async () => {
      // Set low limit for testing
      const limitedManager = new CoreModelManager({
        maxConcurrentModels: 1
      })
      
      // Register two models
      const model1: ModelConfig = { ...testModelConfig, id: 'model-1' }
      const model2: ModelConfig = { ...testModelConfig, id: 'model-2' }
      
      limitedManager.registerModel(model1)
      limitedManager.registerModel(model2)
      
      // Load first model
      await limitedManager.loadModel('model-1')
      
      // Try to load second model without forceLoad
      await expect(limitedManager.loadModel('model-2'))
        .rejects.toThrow(/Maximum concurrent models limit/)
      
      await limitedManager.dispose()
    })

    it('should respect forceLoad option', async () => {
      const limitedManager = new CoreModelManager({
        maxConcurrentModels: 1
      })
      
      const model1: ModelConfig = { ...testModelConfig, id: 'model-1' }
      const model2: ModelConfig = { ...testModelConfig, id: 'model-2' }
      
      limitedManager.registerModel(model1)
      limitedManager.registerModel(model2)
      
      await limitedManager.loadModel('model-1')
      
      // Force load second model
      const loadedModel = await limitedManager.loadModel('model-2', { 
        forceLoad: true 
      })
      
      expect(loadedModel.config.id).toBe('model-2')
      
      await limitedManager.dispose()
    })

    it('should handle memory pressure during loading', async () => {
      mockMemoryAwareLoader.getLoadingStrategy.mockResolvedValue({
        action: 'defer',
        preUnloadModels: [],
        reason: 'Insufficient memory available'
      })
      
      await expect(modelManager.loadModel(testModelConfig.id))
        .rejects.toThrow(ModelError)
    })

    it('should unload models when strategy requires it', async () => {
      // Setup scenario where existing model needs to be unloaded
      mockMemoryAwareLoader.getLoadingStrategy.mockResolvedValue({
        action: 'load',
        preUnloadModels: ['existing-model'],
        reason: 'Need to free memory'
      })
      
      const unloadSpy = vi.spyOn(modelManager, 'unloadModel')
      
      await modelManager.loadModel(testModelConfig.id)
      
      expect(unloadSpy).toHaveBeenCalledWith('existing-model')
    })

    it('should emit model loaded event', async () => {
      const eventSpy = vi.fn()
      modelManager.addEventListener(ModelEventType.MODEL_LOADED, eventSpy)
      
      await modelManager.loadModel(testModelConfig.id)
      
      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: ModelEventType.MODEL_LOADED,
          modelId: testModelConfig.id
        })
      )
    })

    it('should handle model loading failures', async () => {
      mockGPT4ALLInstance.loadModel.mockRejectedValue(new Error('Loading failed'))
      
      const eventSpy = vi.fn()
      modelManager.addEventListener(ModelEventType.MODEL_ERROR, eventSpy)
      
      await expect(modelManager.loadModel(testModelConfig.id))
        .rejects.toThrow('Loading failed')
      
      // Model should not be in loaded models list
      expect(modelManager.getLoadedModels()).toHaveLength(0)
      expect(eventSpy).toHaveBeenCalled()
    })

    it('should throw error for unknown model', async () => {
      await expect(modelManager.loadModel('unknown-model'))
        .rejects.toThrow(ModelError)
    })
  })

  describe('Model Unloading', () => {
    beforeEach(async () => {
      mockGPT4ALLInstance.loadModel.mockResolvedValue(undefined)
      mockGPT4ALLInstance.unloadModel.mockResolvedValue(undefined)
      
      await modelManager.loadModel(testModelConfig.id)
    })

    it('should unload model successfully', async () => {
      expect(modelManager.getLoadedModels()).toHaveLength(1)
      
      await modelManager.unloadModel(testModelConfig.id)
      
      expect(modelManager.getLoadedModels()).toHaveLength(0)
      expect(mockGPT4ALLInstance.unloadModel).toHaveBeenCalled()
      expect(mockMemoryAwareLoader.unregisterModel).toHaveBeenCalled()
    })

    it('should emit model unloaded event', async () => {
      const eventSpy = vi.fn()
      modelManager.addEventListener(ModelEventType.MODEL_UNLOADED, eventSpy)
      
      await modelManager.unloadModel(testModelConfig.id)
      
      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: ModelEventType.MODEL_UNLOADED,
          modelId: testModelConfig.id
        })
      )
    })

    it('should handle unload failures gracefully', async () => {
      mockGPT4ALLInstance.unloadModel.mockRejectedValue(new Error('Unload failed'))
      
      await modelManager.unloadModel(testModelConfig.id)
      
      // Model should still be removed from tracking
      expect(modelManager.getLoadedModels()).toHaveLength(0)
    })

    it('should handle unload of non-loaded model gracefully', async () => {
      await modelManager.unloadModel('non-loaded-model')
      
      // Should not throw or cause issues
      expect(modelManager.getLoadedModels()).toHaveLength(1) // Original model still loaded
    })

    it('should unload all models', async () => {
      // Load additional model
      const model2: ModelConfig = { ...testModelConfig, id: 'model-2' }
      modelManager.registerModel(model2)
      await modelManager.loadModel('model-2')
      
      expect(modelManager.getLoadedModels()).toHaveLength(2)
      
      await modelManager.unloadAllModels()
      
      expect(modelManager.getLoadedModels()).toHaveLength(0)
    })
  })

  describe('Text Generation', () => {
    beforeEach(async () => {
      mockGPT4ALLInstance.loadModel.mockResolvedValue(undefined)
      mockGPT4ALLInstance.generate.mockResolvedValue({
        text: 'Generated legal analysis...',
        inferenceTime: 1500,
        tokens: 150,
        finishReason: 'stop'
      })
      
      await modelManager.loadModel(testModelConfig.id)
    })

    it('should generate text successfully', async () => {
      const prompt = 'Analyze this contract'
      const result = await modelManager.generateText(testModelConfig.id, prompt)
      
      expect(result).toBeDefined()
      expect(result.text).toBe('Generated legal analysis...')
      expect(result.inferenceTime).toBe(1500)
      expect(result.tokens).toBe(150)
      expect(mockGPT4ALLInstance.generate).toHaveBeenCalledWith(prompt, {})
    })

    it('should auto-load model if not loaded', async () => {
      await modelManager.unloadModel(testModelConfig.id)
      expect(modelManager.getLoadedModels()).toHaveLength(0)
      
      const result = await modelManager.generateText(testModelConfig.id, 'Test prompt')
      
      expect(result).toBeDefined()
      expect(modelManager.getLoadedModels()).toHaveLength(1)
    })

    it('should update model usage statistics', async () => {
      const initialStats = modelManager.getStats()
      const model = modelManager.getModel(testModelConfig.id)!
      const initialInferenceCount = model.inferenceCount
      
      await modelManager.generateText(testModelConfig.id, 'Test prompt')
      
      const updatedStats = modelManager.getStats()
      const updatedModel = modelManager.getModel(testModelConfig.id)!
      
      expect(updatedStats.totalInferences).toBe(initialStats.totalInferences + 1)
      expect(updatedModel.inferenceCount).toBe(initialInferenceCount + 1)
      expect(updatedModel.averageResponseTime).toBeGreaterThan(0)
      expect(updatedModel.lastUsed.getTime()).toBeGreaterThan(model.lastUsed.getTime())
    })

    it('should emit inference completed event', async () => {
      const eventSpy = vi.fn()
      modelManager.addEventListener(ModelEventType.INFERENCE_COMPLETED, eventSpy)
      
      await modelManager.generateText(testModelConfig.id, 'Test prompt')
      
      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: ModelEventType.INFERENCE_COMPLETED,
          modelId: testModelConfig.id,
          data: expect.objectContaining({
            inferenceTime: 1500,
            tokens: 150
          })
        })
      )
    })

    it('should handle generation errors', async () => {
      mockGPT4ALLInstance.generate.mockRejectedValue(new Error('Generation failed'))
      
      await expect(modelManager.generateText(testModelConfig.id, 'Test prompt'))
        .rejects.toThrow('Generation failed')
      
      const model = modelManager.getModel(testModelConfig.id)
      expect(model?.status).toBe(ModelStatus.ERROR)
    })

    it('should pass inference options correctly', async () => {
      const options = {
        maxTokens: 100,
        temperature: 0.7,
        topP: 0.9
      }
      
      await modelManager.generateText(testModelConfig.id, 'Test prompt', options)
      
      expect(mockGPT4ALLInstance.generate).toHaveBeenCalledWith('Test prompt', options)
    })
  })

  describe('Auto-Unload System', () => {
    beforeEach(async () => {
      mockGPT4ALLInstance.loadModel.mockResolvedValue(undefined)
      mockGPT4ALLInstance.unloadModel.mockResolvedValue(undefined)
    })

    it('should auto-unload inactive models', async () => {
      // Load model with low priority
      const lowPriorityModel: ModelConfig = {
        ...testModelConfig,
        priority: ModelPriority.LOW
      }
      modelManager.registerModel(lowPriorityModel)
      
      await modelManager.loadModel(lowPriorityModel.id)
      expect(modelManager.getLoadedModels()).toHaveLength(1)
      
      // Advance time past auto-unload threshold
      await vi.advanceTimersByTimeAsync(6 * 60 * 1000) // 6 minutes
      
      expect(modelManager.getLoadedModels()).toHaveLength(0)
    })

    it('should not auto-unload high priority models', async () => {
      const highPriorityModel: ModelConfig = {
        ...testModelConfig,
        priority: ModelPriority.HIGH
      }
      modelManager.registerModel(highPriorityModel)
      
      await modelManager.loadModel(highPriorityModel.id)
      
      // Advance time past auto-unload threshold
      await vi.advanceTimersByTimeAsync(10 * 60 * 1000) // 10 minutes
      
      expect(modelManager.getLoadedModels()).toHaveLength(1)
    })

    it('should reset last used time on model access', async () => {
      await modelManager.loadModel(testModelConfig.id)
      const initialLastUsed = modelManager.getModel(testModelConfig.id)!.lastUsed
      
      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Access model (simulate generation)
      await modelManager.generateText(testModelConfig.id, 'Test')
      
      const updatedLastUsed = modelManager.getModel(testModelConfig.id)!.lastUsed
      expect(updatedLastUsed.getTime()).toBeGreaterThan(initialLastUsed.getTime())
    })
  })

  describe('Memory Management', () => {
    it('should get memory statistics', async () => {
      const mockMemoryStats = {
        systemTotal: 16 * 1024 * 1024 * 1024,
        systemUsed: 8 * 1024 * 1024 * 1024,
        systemAvailable: 8 * 1024 * 1024 * 1024,
        processUsed: 512 * 1024 * 1024,
        modelsLoaded: 1,
        totalModelMemory: 2 * 1024 * 1024 * 1024
      }
      
      mockMemoryAwareLoader.getMemoryStats.mockResolvedValue(mockMemoryStats)
      
      const stats = await modelManager.getMemoryStats()
      
      expect(stats).toEqual(mockMemoryStats)
    })

    it('should optimize memory usage', async () => {
      const mockOptimizationResult = {
        modelsUnloaded: ['old-model-1'],
        memoryFreed: 1024 * 1024 * 1024
      }
      
      mockMemoryAwareLoader.optimizeMemory.mockResolvedValue(mockOptimizationResult)
      
      const eventSpy = vi.fn()
      modelManager.addEventListener(ModelEventType.MEMORY_PRESSURE, eventSpy)
      
      await modelManager.optimizeMemory()
      
      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: ModelEventType.MEMORY_PRESSURE,
          data: mockOptimizationResult
        })
      )
    })

    it('should clear cache', async () => {
      const eventSpy = vi.fn()
      modelManager.addEventListener(ModelEventType.CACHE_CLEARED, eventSpy)
      
      await modelManager.clearCache()
      
      expect(eventSpy).toHaveBeenCalled()
    })
  })

  describe('GPT4ALL Integration', () => {
    it('should discover GPT4ALL models', async () => {
      const mockDiscoveredModels: ModelConfig[] = [
        {
          id: 'discovered-1',
          name: 'Discovered Model 1',
          path: '/models/discovered-1.gguf',
          type: ModelType.GPT4ALL,
          size: 2 * 1024 * 1024 * 1024,
          quantization: 'Q4_0',
          capabilities: ['general'],
          priority: ModelPriority.MEDIUM,
          metadata: {}
        }
      ]
      
      mockGPT4ALLFactory.discoverModels.mockResolvedValue(mockDiscoveredModels)
      
      const discoveredModels = await modelManager.discoverGPT4ALLModels('/models')
      
      expect(discoveredModels).toEqual(mockDiscoveredModels)
      expect(mockGPT4ALLFactory.discoverModels).toHaveBeenCalledWith('/models')
      
      // Models should be registered
      const registeredModels = modelManager.getRegisteredModels()
      expect(registeredModels.some(m => m.id === 'discovered-1')).toBe(true)
    })

    it('should handle discovery errors gracefully', async () => {
      mockGPT4ALLFactory.discoverModels.mockRejectedValue(new Error('Discovery failed'))
      
      const discoveredModels = await modelManager.discoverGPT4ALLModels('/invalid/path')
      
      expect(discoveredModels).toEqual([])
    })
  })

  describe('Event System', () => {
    it('should add and remove event listeners', () => {
      const listener1 = vi.fn()
      const listener2 = vi.fn()
      
      modelManager.addEventListener(ModelEventType.MODEL_LOADED, listener1)
      modelManager.addEventListener(ModelEventType.MODEL_LOADED, listener2)
      
      // Remove one listener
      modelManager.removeEventListener(ModelEventType.MODEL_LOADED, listener1)
      
      // Trigger event
      modelManager['emitEvent']({
        type: ModelEventType.MODEL_LOADED,
        timestamp: new Date(),
        modelId: 'test'
      })
      
      expect(listener1).not.toHaveBeenCalled()
      expect(listener2).toHaveBeenCalled()
    })

    it('should handle listener errors gracefully', () => {
      const errorListener = vi.fn().mockImplementation(() => {
        throw new Error('Listener error')
      })
      const normalListener = vi.fn()
      
      modelManager.addEventListener(ModelEventType.MODEL_LOADED, errorListener)
      modelManager.addEventListener(ModelEventType.MODEL_LOADED, normalListener)
      
      expect(() => {
        modelManager['emitEvent']({
          type: ModelEventType.MODEL_LOADED,
          timestamp: new Date(),
          modelId: 'test'
        })
      }).not.toThrow()
      
      expect(normalListener).toHaveBeenCalled()
    })
  })

  describe('Statistics and Monitoring', () => {
    it('should track model statistics', async () => {
      mockGPT4ALLInstance.loadModel.mockResolvedValue(undefined)
      
      const initialStats = modelManager.getStats()
      expect(initialStats.loadedModels).toBe(0)
      expect(initialStats.totalMemoryUsed).toBe(0)
      
      await modelManager.loadModel(testModelConfig.id)
      
      const afterLoadStats = modelManager.getStats()
      expect(afterLoadStats.loadedModels).toBe(1)
      expect(afterLoadStats.totalMemoryUsed).toBeGreaterThan(0)
      expect(afterLoadStats.averageLoadTime).toBeGreaterThan(0)
    })

    it('should update statistics on model operations', async () => {
      mockGPT4ALLInstance.loadModel.mockResolvedValue(undefined)
      mockGPT4ALLInstance.generate.mockResolvedValue({
        text: 'Test response',
        inferenceTime: 1000,
        tokens: 100,
        finishReason: 'stop'
      })
      
      await modelManager.loadModel(testModelConfig.id)
      await modelManager.generateText(testModelConfig.id, 'Test prompt')
      
      const stats = modelManager.getStats()
      expect(stats.totalInferences).toBe(1)
      
      const model = modelManager.getModel(testModelConfig.id)!
      expect(model.inferenceCount).toBe(1)
      expect(model.averageResponseTime).toBe(1000)
    })
  })

  describe('Error Handling', () => {
    it('should throw ModelError for unsupported model types', async () => {
      const unsupportedModel: ModelConfig = {
        ...testModelConfig,
        type: 'unsupported' as ModelType
      }
      
      modelManager.registerModel(unsupportedModel)
      
      await expect(modelManager.loadModel(unsupportedModel.id))
        .rejects.toThrow(ModelError)
    })

    it('should provide helpful error messages', async () => {
      try {
        await modelManager.loadModel('non-existent-model')
      } catch (error) {
        expect(error).toBeInstanceOf(ModelError)
        expect((error as ModelError).code).toBe(ModelErrorCode.MODEL_NOT_FOUND)
        expect((error as ModelError).context.recoverable).toBe(false)
      }
    })

    it('should handle memory loader errors gracefully', async () => {
      mockMemoryAwareLoader.getLoadingStrategy.mockRejectedValue(
        new Error('Memory loader failed')
      )
      
      await expect(modelManager.loadModel(testModelConfig.id))
        .rejects.toThrow('Memory loader failed')
    })
  })

  describe('Resource Cleanup', () => {
    it('should dispose resources properly', async () => {
      mockGPT4ALLInstance.loadModel.mockResolvedValue(undefined)
      
      await modelManager.loadModel(testModelConfig.id)
      expect(modelManager.getLoadedModels()).toHaveLength(1)
      
      await modelManager.dispose()
      
      expect(modelManager.getLoadedModels()).toHaveLength(0)
      expect(mockMemoryAwareLoader.dispose).toHaveBeenCalled()
    })

    it('should clear event listeners on dispose', async () => {
      const listener = vi.fn()
      modelManager.addEventListener(ModelEventType.MODEL_LOADED, listener)
      
      await modelManager.dispose()
      
      // Try to emit event after dispose
      modelManager['emitEvent']({
        type: ModelEventType.MODEL_LOADED,
        timestamp: new Date(),
        modelId: 'test'
      })
      
      expect(listener).not.toHaveBeenCalled()
    })
  })
})