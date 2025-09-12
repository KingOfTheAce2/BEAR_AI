/**
 * Integration Tests for GPT4ALL Integration
 * Testing GPT4ALL model loading, inference, and memory management
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { 
  GPT4ALLIntegration,
  GPT4ALLFactory,
  GPT4ALLConfig 
} from '../../src/services/gpt4allIntegration'
import { 
  ModelConfig,
  ModelType,
  ModelPriority,
  ModelInferenceOptions
} from '../../src/types/modelTypes'

// Mock GPT4ALL native bindings
const mockGPT4ALLModel = {
  load: vi.fn(),
  dispose: vi.fn(),
  generate: vi.fn(),
  createChatSession: vi.fn(),
  createEmbedding: vi.fn(),
  isLoaded: vi.fn(),
  getLibraryPath: vi.fn(),
  getModelPath: vi.fn(),
  getMemoryInfo: vi.fn()
}

const mockGPT4ALL = {
  loadModel: vi.fn().mockResolvedValue(mockGPT4ALLModel),
  InferenceModel: vi.fn().mockImplementation(() => mockGPT4ALLModel),
  DEFAULT_DIRECTORY: '/default/models',
  DEFAULT_LIBRARIES_DIRECTORY: '/default/libs'
}

// Mock file system operations
const mockFs = {
  existsSync: vi.fn(),
  readdirSync: vi.fn(),
  statSync: vi.fn(),
  readFileSync: vi.fn()
}

const mockPath = {
  join: vi.fn((...paths) => paths.join('/')),
  extname: vi.fn((path) => path.split('.').pop() || ''),
  basename: vi.fn((path) => path.split('/').pop() || ''),
  dirname: vi.fn((path) => path.split('/').slice(0, -1).join('/'))
}

// Mock the native module
vi.mock('gpt4all', () => ({
  default: mockGPT4ALL,
  GPT4All: mockGPT4ALL
}), { virtual: true })

vi.mock('fs', () => mockFs, { virtual: true })
vi.mock('path', () => mockPath, { virtual: true })

describe('GPT4ALLIntegration', () => {
  let integration: GPT4ALLIntegration
  let testConfig: GPT4ALLConfig

  beforeEach(() => {
    vi.clearAllMocks()
    
    testConfig = {
      modelPath: '/models/test-model.gguf',
      libraryPath: '/libs/libllama.so',
      nThreads: 4,
      nPredict: 1024,
      temp: 0.7,
      topK: 40,
      topP: 0.9,
      repeatPenalty: 1.1,
      repeatLastN: 10,
      seed: -1,
      nBatch: 128
    }

    // Setup default mock behaviors
    mockGPT4ALLModel.load.mockResolvedValue(true)
    mockGPT4ALLModel.dispose.mockResolvedValue(undefined)
    mockGPT4ALLModel.isLoaded.mockReturnValue(true)
    mockGPT4ALLModel.getMemoryInfo.mockReturnValue({
      totalMemory: 2 * 1024 * 1024 * 1024, // 2GB
      usedMemory: 1 * 1024 * 1024 * 1024,  // 1GB
      modelMemory: 800 * 1024 * 1024       // 800MB
    })
    
    mockFs.existsSync.mockReturnValue(true)
  })

  afterEach(() => {
    if (integration) {
      integration.dispose()
    }
  })

  describe('Model Loading', () => {
    it('should load GPT4ALL model successfully', async () => {
      integration = new GPT4ALLIntegration(testConfig)
      
      await integration.loadModel()
      
      expect(mockGPT4ALLModel.load).toHaveBeenCalled()
      expect(integration.isLoaded()).toBe(true)
    })

    it('should handle model loading failure', async () => {
      mockGPT4ALLModel.load.mockRejectedValue(new Error('Model loading failed'))
      
      integration = new GPT4ALLIntegration(testConfig)
      
      await expect(integration.loadModel()).rejects.toThrow('Model loading failed')
      expect(integration.isLoaded()).toBe(false)
    })

    it('should validate model file exists', async () => {
      mockFs.existsSync.mockImplementation((path: string) => 
        path !== testConfig.modelPath
      )
      
      integration = new GPT4ALLIntegration(testConfig)
      
      await expect(integration.loadModel()).rejects.toThrow(/Model file not found/)
    })

    it('should use default library path if not specified', async () => {
      const configWithoutLib = { ...testConfig }
      delete configWithoutLib.libraryPath
      
      integration = new GPT4ALLIntegration(configWithoutLib)
      await integration.loadModel()
      
      expect(mockGPT4ALLModel.load).toHaveBeenCalled()
    })

    it('should respect threading configuration', async () => {
      testConfig.nThreads = 8
      
      integration = new GPT4ALLIntegration(testConfig)
      await integration.loadModel()
      
      // Verify threading config is passed to model
      const loadCall = mockGPT4ALLModel.load.mock.calls[0]
      expect(loadCall).toBeDefined()
    })
  })

  describe('Text Generation', () => {
    beforeEach(async () => {
      mockGPT4ALLModel.generate.mockResolvedValue({
        text: 'This is a legal analysis of the contract terms...',
        tokensIngested: 50,
        tokensGenerated: 150,
        generationTime: 2.5
      })
      
      integration = new GPT4ALLIntegration(testConfig)
      await integration.loadModel()
    })

    it('should generate text successfully', async () => {
      const prompt = 'Analyze this contract:'
      const result = await integration.generate(prompt)
      
      expect(result).toBeDefined()
      expect(result.text).toContain('legal analysis')
      expect(result.inferenceTime).toBeGreaterThan(0)
      expect(result.tokens).toBeGreaterThan(0)
      expect(mockGPT4ALLModel.generate).toHaveBeenCalledWith(prompt, expect.any(Object))
    })

    it('should apply inference options correctly', async () => {
      const prompt = 'Test prompt'
      const options: ModelInferenceOptions = {
        maxTokens: 512,
        temperature: 0.8,
        topP: 0.95,
        topK: 50,
        repeatPenalty: 1.2
      }
      
      await integration.generate(prompt, options)
      
      expect(mockGPT4ALLModel.generate).toHaveBeenCalledWith(
        prompt,
        expect.objectContaining({
          nPredict: 512,
          temp: 0.8,
          topP: 0.95,
          topK: 50,
          repeatPenalty: 1.2
        })
      )
    })

    it('should handle generation errors gracefully', async () => {
      mockGPT4ALLModel.generate.mockRejectedValue(new Error('Generation failed'))
      
      await expect(integration.generate('Test prompt'))
        .rejects.toThrow('Generation failed')
    })

    it('should throw error if model not loaded', async () => {
      const unloadedIntegration = new GPT4ALLIntegration(testConfig)
      
      await expect(unloadedIntegration.generate('Test prompt'))
        .rejects.toThrow(/Model not loaded/)
    })

    it('should track generation statistics', async () => {
      const initialStats = integration.getStats()
      
      await integration.generate('Test prompt 1')
      await integration.generate('Test prompt 2')
      
      const updatedStats = integration.getStats()
      
      expect(updatedStats.totalInferences).toBe(initialStats.totalInferences + 2)
      expect(updatedStats.averageInferenceTime).toBeGreaterThan(0)
    })

    it('should handle streaming generation', async () => {
      const mockStreamGenerator = async function* () {
        yield { token: 'This', totalTime: 0.1 }
        yield { token: ' is', totalTime: 0.2 }
        yield { token: ' a', totalTime: 0.3 }
        yield { token: ' test', totalTime: 0.4 }
      }
      
      mockGPT4ALLModel.generate.mockReturnValue(mockStreamGenerator())
      
      const chunks: string[] = []
      const stream = await integration.generateStream('Test prompt')
      
      for await (const chunk of stream) {
        chunks.push(chunk.token)
      }
      
      expect(chunks).toEqual(['This', ' is', ' a', ' test'])
    })
  })

  describe('Memory Management', () => {
    beforeEach(async () => {
      integration = new GPT4ALLIntegration(testConfig)
      await integration.loadModel()
    })

    it('should report memory usage correctly', () => {
      const memoryUsage = integration.getMemoryUsage()
      
      expect(memoryUsage).toBe(1 * 1024 * 1024 * 1024) // 1GB from mock
    })

    it('should provide detailed memory stats', () => {
      const memoryStats = integration.getMemoryStats()
      
      expect(memoryStats.totalMemory).toBe(2 * 1024 * 1024 * 1024)
      expect(memoryStats.usedMemory).toBe(1 * 1024 * 1024 * 1024)
      expect(memoryStats.modelMemory).toBe(800 * 1024 * 1024)
    })

    it('should handle memory pressure by reducing batch size', async () => {
      // Simulate high memory usage
      mockGPT4ALLModel.getMemoryInfo.mockReturnValue({
        totalMemory: 4 * 1024 * 1024 * 1024,
        usedMemory: 3.5 * 1024 * 1024 * 1024, // 87.5% usage
        modelMemory: 2 * 1024 * 1024 * 1024
      })
      
      const memoryPressure = await integration.handleMemoryPressure('high')
      
      expect(memoryPressure.actionTaken).toBe(true)
      expect(memoryPressure.description).toContain('batch size')
    })

    it('should optimize memory usage when requested', async () => {
      const optimization = await integration.optimizeMemory()
      
      expect(optimization.memorySaved).toBeGreaterThan(0)
      expect(optimization.actions).toContain('garbage_collection')
    })
  })

  describe('Model Unloading', () => {
    beforeEach(async () => {
      integration = new GPT4ALLIntegration(testConfig)
      await integration.loadModel()
    })

    it('should unload model successfully', async () => {
      expect(integration.isLoaded()).toBe(true)
      
      await integration.unloadModel()
      
      expect(mockGPT4ALLModel.dispose).toHaveBeenCalled()
      expect(integration.isLoaded()).toBe(false)
    })

    it('should handle unload of non-loaded model gracefully', async () => {
      await integration.unloadModel()
      
      // Should not throw when unloading again
      await integration.unloadModel()
      
      expect(mockGPT4ALLModel.dispose).toHaveBeenCalledTimes(1)
    })

    it('should clean up resources on dispose', async () => {
      await integration.dispose()
      
      expect(mockGPT4ALLModel.dispose).toHaveBeenCalled()
      expect(integration.isLoaded()).toBe(false)
    })
  })

  describe('Chat Sessions', () => {
    beforeEach(async () => {
      mockGPT4ALLModel.createChatSession.mockReturnValue({
        chat: vi.fn().mockResolvedValue('Chat response'),
        end: vi.fn()
      })
      
      integration = new GPT4ALLIntegration(testConfig)
      await integration.loadModel()
    })

    it('should create chat session', async () => {
      const session = await integration.createChatSession()
      
      expect(session).toBeDefined()
      expect(mockGPT4ALLModel.createChatSession).toHaveBeenCalled()
    })

    it('should handle chat conversation', async () => {
      const session = await integration.createChatSession()
      const response = await session.chat('Hello, how are you?')
      
      expect(response).toBe('Chat response')
    })

    it('should end chat session properly', async () => {
      const session = await integration.createChatSession()
      await session.end()
      
      expect(session.end).toHaveBeenCalled()
    })
  })

  describe('Embeddings', () => {
    beforeEach(async () => {
      mockGPT4ALLModel.createEmbedding.mockResolvedValue({
        embeddings: [0.1, -0.2, 0.3, -0.4, 0.5],
        dimensions: 5
      })
      
      integration = new GPT4ALLIntegration(testConfig)
      await integration.loadModel()
    })

    it('should generate embeddings', async () => {
      const text = 'Legal document content for embedding'
      const embedding = await integration.createEmbedding(text)
      
      expect(embedding).toBeDefined()
      expect(embedding.embeddings).toHaveLength(5)
      expect(embedding.dimensions).toBe(5)
      expect(mockGPT4ALLModel.createEmbedding).toHaveBeenCalledWith(text)
    })

    it('should handle embedding errors', async () => {
      mockGPT4ALLModel.createEmbedding.mockRejectedValue(new Error('Embedding failed'))
      
      await expect(integration.createEmbedding('Test text'))
        .rejects.toThrow('Embedding failed')
    })
  })
})

describe('GPT4ALLFactory', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Model Creation', () => {
    it('should create GPT4ALL model from config', async () => {
      const modelConfig: ModelConfig = {
        id: 'test-model',
        name: 'Test Legal Model',
        path: '/models/test.gguf',
        type: ModelType.GPT4ALL,
        size: 4 * 1024 * 1024 * 1024,
        quantization: 'Q4_K_M',
        capabilities: ['legal-analysis'],
        priority: ModelPriority.MEDIUM,
        metadata: {
          nThreads: 4,
          temp: 0.7,
          topP: 0.9
        }
      }
      
      const integration = await GPT4ALLFactory.createModel(modelConfig)
      
      expect(integration).toBeInstanceOf(GPT4ALLIntegration)
    })

    it('should apply metadata as config options', async () => {
      const modelConfig: ModelConfig = {
        id: 'test-model',
        name: 'Test Model',
        path: '/models/test.gguf',
        type: ModelType.GPT4ALL,
        size: 1024,
        quantization: 'Q4_0',
        capabilities: [],
        priority: ModelPriority.MEDIUM,
        metadata: {
          nThreads: 8,
          temp: 0.5,
          topK: 30,
          nBatch: 256
        }
      }
      
      const integration = await GPT4ALLFactory.createModel(modelConfig)
      const config = integration.getConfig()
      
      expect(config.nThreads).toBe(8)
      expect(config.temp).toBe(0.5)
      expect(config.topK).toBe(30)
      expect(config.nBatch).toBe(256)
    })
  })

  describe('Model Discovery', () => {
    beforeEach(() => {
      // Mock file system for model discovery
      mockFs.existsSync.mockReturnValue(true)
      mockFs.readdirSync.mockReturnValue([
        'model1.gguf',
        'model2.bin',
        'model3.gguf',
        'readme.txt',
        'config.json'
      ])
      
      mockFs.statSync.mockImplementation((path: string) => ({
        isFile: () => path.endsWith('.gguf') || path.endsWith('.bin'),
        size: path.includes('model1') ? 4 * 1024 * 1024 * 1024 : 2 * 1024 * 1024 * 1024
      }))
      
      mockPath.extname.mockImplementation((path: string) => {
        const parts = path.split('.')
        return parts.length > 1 ? `.${parts[parts.length - 1]}` : ''
      })
      
      mockPath.basename.mockImplementation((path: string) => 
        path.split('/').pop() || ''
      )
    })

    it('should discover GGUF models in directory', async () => {
      const models = await GPT4ALLFactory.discoverModels('/models')
      
      expect(models).toHaveLength(2) // model1.gguf and model3.gguf
      expect(models.every(m => m.type === ModelType.GPT4ALL)).toBe(true)
      expect(models.every(m => m.path.includes('/models'))).toBe(true)
    })

    it('should handle discovery of non-existent directory', async () => {
      mockFs.existsSync.mockReturnValue(false)
      
      const models = await GPT4ALLFactory.discoverModels('/nonexistent')
      
      expect(models).toEqual([])
    })

    it('should infer model capabilities from filename', async () => {
      mockFs.readdirSync.mockReturnValue([
        'legal-assistant-7b.gguf',
        'code-generator-13b.gguf',
        'general-chat-3b.gguf'
      ])
      
      const models = await GPT4ALLFactory.discoverModels('/models')
      
      const legalModel = models.find(m => m.name.includes('legal'))
      const codeModel = models.find(m => m.name.includes('code'))
      
      expect(legalModel?.capabilities).toContain('legal-analysis')
      expect(codeModel?.capabilities).toContain('code-generation')
    })

    it('should determine model size from file stats', async () => {
      const models = await GPT4ALLFactory.discoverModels('/models')
      
      const largeModel = models.find(m => m.name.includes('model1'))
      const smallModel = models.find(m => m.name.includes('model3'))
      
      expect(largeModel?.size).toBe(4 * 1024 * 1024 * 1024)
      expect(smallModel?.size).toBe(2 * 1024 * 1024 * 1024)
    })

    it('should assign appropriate priorities based on size', async () => {
      const models = await GPT4ALLFactory.discoverModels('/models')
      
      const largeModel = models.find(m => m.size === 4 * 1024 * 1024 * 1024)
      const smallModel = models.find(m => m.size === 2 * 1024 * 1024 * 1024)
      
      expect(largeModel?.priority).toBe(ModelPriority.HIGH) // Large models get high priority
      expect(smallModel?.priority).toBe(ModelPriority.MEDIUM)
    })

    it('should handle discovery errors gracefully', async () => {
      mockFs.readdirSync.mockImplementation(() => {
        throw new Error('Permission denied')
      })
      
      const models = await GPT4ALLFactory.discoverModels('/restricted')
      
      expect(models).toEqual([])
    })
  })

  describe('Model Validation', () => {
    it('should validate supported file formats', async () => {
      mockFs.readdirSync.mockReturnValue([
        'model.gguf',    // Supported
        'model.bin',     // Supported (legacy)
        'model.safetensors', // Not supported
        'model.pt',      // Not supported
        'model.onnx'     // Not supported
      ])
      
      const models = await GPT4ALLFactory.discoverModels('/models')
      
      expect(models).toHaveLength(2) // Only .gguf and .bin files
      expect(models.every(m => 
        m.path.endsWith('.gguf') || m.path.endsWith('.bin')
      )).toBe(true)
    })

    it('should validate model file integrity', async () => {
      const modelConfig: ModelConfig = {
        id: 'test',
        name: 'Test',
        path: '/models/corrupt.gguf',
        type: ModelType.GPT4ALL,
        size: 0,
        quantization: 'Q4_0',
        capabilities: [],
        priority: ModelPriority.LOW,
        metadata: {}
      }
      
      // Mock corrupted file (size = 0)
      mockFs.statSync.mockReturnValue({
        isFile: () => true,
        size: 0
      })
      
      await expect(GPT4ALLFactory.createModel(modelConfig))
        .rejects.toThrow(/Invalid model file/)
    })
  })

  describe('Configuration Defaults', () => {
    it('should apply reasonable defaults for missing config', async () => {
      const minimalConfig: ModelConfig = {
        id: 'minimal',
        name: 'Minimal Model',
        path: '/models/minimal.gguf',
        type: ModelType.GPT4ALL,
        size: 1024,
        quantization: 'Q4_0',
        capabilities: [],
        priority: ModelPriority.LOW,
        metadata: {}
      }
      
      const integration = await GPT4ALLFactory.createModel(minimalConfig)
      const config = integration.getConfig()
      
      expect(config.nThreads).toBeGreaterThan(0)
      expect(config.temp).toBeGreaterThan(0)
      expect(config.temp).toBeLessThan(2)
      expect(config.nPredict).toBeGreaterThan(0)
    })

    it('should respect hardware constraints in defaults', async () => {
      // Mock system with limited cores
      vi.mock('os', () => ({
        cpus: () => new Array(2).fill({}) // 2 cores
      }), { virtual: true })
      
      const modelConfig: ModelConfig = {
        id: 'test',
        name: 'Test',
        path: '/models/test.gguf',
        type: ModelType.GPT4ALL,
        size: 1024,
        quantization: 'Q4_0',
        capabilities: [],
        priority: ModelPriority.LOW,
        metadata: {}
      }
      
      const integration = await GPT4ALLFactory.createModel(modelConfig)
      const config = integration.getConfig()
      
      // Should not exceed available cores
      expect(config.nThreads).toBeLessThanOrEqual(2)
    })
  })
})