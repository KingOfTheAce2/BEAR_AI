/**
 * BEAR AI Local LLM Engine
 * Adapted from jan-dev llamacpp-extension patterns
 * 
 * @file Local LLM inference engine for BEAR AI
 * @version 1.0.0
 */

interface LLMConfig {
  version_backend: string
  auto_update_engine: boolean
  auto_unload: boolean
  llamacpp_env: string
  chat_template: string
  n_gpu_layers: number
  offload_mmproj: boolean
  ctx_size: number
  threads: number
  threads_batch: number
  n_predict: number
  batch_size: number
  ubatch_size: number
  device: string
  split_mode: string
  main_gpu: number
  flash_attn: boolean
  cont_batching: boolean
  no_mmap: boolean
  mlock: boolean
  no_kv_offload: boolean
  cache_type_k: string
  cache_type_v: string
  defrag_thold: number
  rope_scaling: string
  rope_scale: number
  rope_freq_base: number
  rope_freq_scale: number
  ctx_shift: boolean
}

interface ModelConfig {
  model_path: string
  mmproj_path?: string
  name: string
  size_bytes: number
  sha256?: string
  mmproj_sha256?: string
  mmproj_size_bytes?: number
}

interface SessionInfo {
  model_id: string
  pid: number
  port: number
  api_key: string
  status: 'loading' | 'loaded' | 'error'
}

interface ChatRequest {
  model: string
  messages: Array<{ role: string; content: string }>
  stream?: boolean
  temperature?: number
  max_tokens?: number
  top_p?: number
  frequency_penalty?: number
  presence_penalty?: number
}

interface ChatResponse {
  id: string
  object: string
  created: number
  model: string
  choices: Array<{
    index: number
    message: { role: string; content: string }
    finish_reason: string
  }>
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

/**
 * BEAR AI Local LLM Engine
 * Provides local inference capabilities for legal document processing
 */
export class BearLLMEngine {
  private config: LLMConfig
  private providerPath: string
  private loadedModels: Map<string, SessionInfo> = new Map()
  private loadingPromises: Map<string, Promise<SessionInfo>> = new Map()
  
  constructor(config: Partial<LLMConfig> = {}) {
    this.config = {
      version_backend: 'latest/cpu-avx2',
      auto_update_engine: true,
      auto_unload: false,
      llamacpp_env: '',
      chat_template: '',
      n_gpu_layers: -1,
      offload_mmproj: true,
      ctx_size: 4096,
      threads: -1,
      threads_batch: -1,
      n_predict: -1,
      batch_size: 2048,
      ubatch_size: 256,
      device: '',
      split_mode: 'layer',
      main_gpu: 0,
      flash_attn: false,
      cont_batching: false,
      no_mmap: false,
      mlock: false,
      no_kv_offload: false,
      cache_type_k: 'f16',
      cache_type_v: 'f16',
      defrag_thold: 0.1,
      rope_scaling: 'none',
      rope_scale: 1.0,
      rope_freq_base: 0.0,
      rope_freq_scale: 1.0,
      ctx_shift: true,
      ...config
    }
    
    this.providerPath = process.env.BEAR_AI_DATA || './data/models'
  }

  /**
   * Initialize the LLM engine
   */
  async initialize(): Promise<void> {
    try {
      await this.ensureDirectoryStructure()
      await this.configureBackends()
      // console.log('BEAR AI LLM Engine initialized successfully')
    } catch (error) {
      // console.error('Failed to initialize LLM engine:', error)
      throw error
    }
  }

  /**
   * Load a model for inference
   */
  async loadModel(
    modelId: string, 
    overrideSettings?: Partial<LLMConfig>
  ): Promise<SessionInfo> {
    // Check if model is already loaded
    const existingSession = this.loadedModels.get(modelId)
    if (existingSession && existingSession.status === 'loaded') {
      return existingSession
    }

    // Check if model is currently loading
    const loadingPromise = this.loadingPromises.get(modelId)
    if (loadingPromise) {
      return loadingPromise
    }

    // Start loading the model
    const promise = this.performModelLoad(modelId, overrideSettings)
    this.loadingPromises.set(modelId, promise)

    try {
      const session = await promise
      this.loadedModels.set(modelId, session)
      return session
    } finally {
      this.loadingPromises.delete(modelId)
    }
  }

  /**
   * Unload a model from memory
   */
  async unloadModel(modelId: string): Promise<boolean> {
    const session = this.loadedModels.get(modelId)
    if (!session) {
      return false
    }

    try {
      // In a real implementation, this would terminate the model process
      // console.log(`Unloading model ${modelId} (PID: ${session.pid})`)
      this.loadedModels.delete(modelId)
      return true
    } catch (error) {
      // console.error(`Failed to unload model ${modelId}:`, error)
      return false
    }
  }

  /**
   * Chat with a loaded model
   */
  async chat(
    request: ChatRequest,
    abortController?: AbortController
  ): Promise<ChatResponse | AsyncIterable<any>> {
    const session = this.loadedModels.get(request.model)
    if (!session) {
      throw new Error(`Model ${request.model} is not loaded`)
    }

    const baseUrl = `http://localhost:${session.port}/v1`
    const url = `${baseUrl}/chat/completions`
    
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.api_key}`,
    }

    const body = JSON.stringify(request)

    if (request.stream) {
      return this.handleStreamingResponse(url, headers, body, abortController)
    } else {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body,
        signal: abortController?.signal,
      })

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`)
      }

      return await response.json() as ChatResponse
    }
  }

  /**
   * Get list of loaded models
   */
  getLoadedModels(): string[] {
    return Array.from(this.loadedModels.keys())
  }

  /**
   * Legal document analysis method
   */
  async analyzeLegalDocument(
    documentContent: string,
    analysisType: 'contract' | 'compliance' | 'risk' | 'summary' = 'summary',
    modelId?: string
  ): Promise<string> {
    const model = modelId || 'default-legal-model'
    
    // Ensure model is loaded
    await this.loadModel(model)

    const prompts = {
      contract: `Analyze this legal contract and identify key terms, obligations, and potential issues:\n\n${documentContent}`,
      compliance: `Review this document for compliance issues and regulatory concerns:\n\n${documentContent}`,
      risk: `Identify potential legal risks and liabilities in this document:\n\n${documentContent}`,
      summary: `Provide a concise summary of this legal document:\n\n${documentContent}`
    }

    const request: ChatRequest = {
      model,
      messages: [
        { role: 'system', content: 'You are a legal AI assistant specialized in document analysis.' },
        { role: 'user', content: prompts[analysisType] }
      ],
      temperature: 0.1,
      max_tokens: 2048
    }

    const response = await this.chat(request) as ChatResponse
    return response.choices[0]?.message?.content || 'Analysis failed'
  }

  /**
   * Multi-agent coordination for complex legal analysis
   */
  async coordinatedLegalAnalysis(
    documentContent: string,
    agents: string[] = ['contract-agent', 'risk-agent', 'compliance-agent']
  ): Promise<{ [agentName: string]: string }> {
    const results: { [agentName: string]: string } = {}
    
    // Load all required agents in parallel
    await Promise.all(agents.map(agent => this.loadModel(agent)))
    
    // Run analysis with each agent
    const analysisPromises = agents.map(async (agent) => {
      const agentType = agent.includes('contract') ? 'contract' :
                       agent.includes('risk') ? 'risk' :
                       agent.includes('compliance') ? 'compliance' : 'summary'
      
      const result = await this.analyzeLegalDocument(documentContent, agentType, agent)
      results[agent] = result
    })
    
    await Promise.all(analysisPromises)
    return results
  }

  private async ensureDirectoryStructure(): Promise<void> {
    // Create necessary directories for models and backends
    const dirs = [
      `${this.providerPath}/models`,
      `${this.providerPath}/backends`,
      `${this.providerPath}/lib`,
      `${this.providerPath}/cache`
    ]
    
    // In a real implementation, create these directories
    // console.log('Ensuring directory structure:', dirs)
  }

  private async configureBackends(): Promise<void> {
    // Configure available backends based on system capabilities
    // console.log('Configuring LLM backends...')
    
    // Detect GPU capabilities
    const gpuSupport = await this.detectGPUSupport()
    
    if (gpuSupport.cuda) {
      this.config.version_backend = `latest/cuda-${gpuSupport.cudaVersion}`
      this.config.n_gpu_layers = -1
    } else if (gpuSupport.vulkan) {
      this.config.version_backend = 'latest/vulkan'
      this.config.n_gpu_layers = 0
    } else {
      // CPU fallback with optimal settings
      this.config.version_backend = 'latest/cpu-avx2'
      this.config.n_gpu_layers = 0
    }
  }

  private async detectGPUSupport(): Promise<{
    cuda: boolean
    vulkan: boolean
    cudaVersion?: string
  }> {
    // Mock GPU detection - in real implementation, this would check system
    return {
      cuda: false,
      vulkan: false
    }
  }

  private async performModelLoad(
    modelId: string,
    overrideSettings?: Partial<LLMConfig>
  ): Promise<SessionInfo> {
    
    // Generate a random port for the model server
    const port = 8000 + Math.floor(Math.random() * 1000)
    const pid = Date.now() // Mock PID
    const api_key = this.generateApiKey(modelId, port.toString())
    
    const session: SessionInfo = {
      model_id: modelId,
      pid,
      port,
      api_key,
      status: 'loading'
    }
    
    // Mock model loading process
    // console.log(`Loading model ${modelId} on port ${port}...`)
    
    // Simulate loading time
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    session.status = 'loaded'
    // console.log(`Model ${modelId} loaded successfully`)
    
    return session
  }

  private generateApiKey(modelId: string, port: string): string {
    const rawKey = `${modelId}:${port}:${Date.now()}`
    return this.encodeToBase64(rawKey)
  }

  private encodeToBase64(value: string): string {
    const globalObj = globalThis as typeof globalThis & {
      btoa?: (data: string) => string
      Buffer?: { from(input: string, encoding?: string): { toString(encoding: string): string } }
    }

    if (typeof globalObj.btoa === 'function') {
      try {
        return globalObj.btoa(value)
      } catch {
        // btoa throws for non-Latin1 input; fall through to other strategies
      }
    }

    const bufferCtor = globalObj.Buffer
    if (bufferCtor && typeof bufferCtor.from === 'function') {
      return bufferCtor.from(value, 'utf-8').toString('base64')
    }

    const encoder = typeof TextEncoder !== 'undefined' ? new TextEncoder() : null
    const bytes = encoder ? encoder.encode(value) : this.stringToUtf8Bytes(value)
    return this.bytesToBase64(bytes)
  }

  private stringToUtf8Bytes(value: string): Uint8Array {
    const codePoints: number[] = []

    for (let i = 0; i < value.length; i += 1) {
      const charCode = value.charCodeAt(i)

      if (charCode < 0x80) {
        codePoints.push(charCode)
      } else if (charCode < 0x800) {
        codePoints.push(0xc0 | (charCode >> 6))
        codePoints.push(0x80 | (charCode & 0x3f))
      } else if (charCode < 0xd800 || charCode >= 0xe000) {
        codePoints.push(0xe0 | (charCode >> 12))
        codePoints.push(0x80 | ((charCode >> 6) & 0x3f))
        codePoints.push(0x80 | (charCode & 0x3f))
      } else {
        i += 1
        const nextChar = value.charCodeAt(i)
        const surrogate = 0x10000 + (((charCode & 0x3ff) << 10) | (nextChar & 0x3ff))
        codePoints.push(0xf0 | (surrogate >> 18))
        codePoints.push(0x80 | ((surrogate >> 12) & 0x3f))
        codePoints.push(0x80 | ((surrogate >> 6) & 0x3f))
        codePoints.push(0x80 | (surrogate & 0x3f))
      }
    }

    return new Uint8Array(codePoints)
  }

  private bytesToBase64(bytes: Uint8Array): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
    let output = ''
    let index = 0

    while (index < bytes.length) {
      const byte1 = bytes[index++]
      if (byte1 === undefined) {
        break
      }
      const byte2 = index < bytes.length ? bytes[index++] : undefined
      const byte3 = index < bytes.length ? bytes[index++] : undefined

      const enc1 = byte1 >> 2
      const enc2 = ((byte1 & 0x03) << 4) | ((byte2 ?? 0) >> 4)
      const enc3 = byte2 !== undefined ? ((byte2 & 0x0f) << 2) | ((byte3 ?? 0) >> 6) : -1
      const enc4 = byte3 !== undefined ? byte3 & 0x3f : -1

      output += chars[enc1]
      output += chars[enc2]
      output += enc3 >= 0 ? chars[enc3] : '='
      output += enc4 >= 0 ? chars[enc4] : '='
    }

    return output
  }

  private async *handleStreamingResponse(
    url: string,
    headers: HeadersInit,
    body: string,
    abortController?: AbortController
  ): AsyncIterable<any> {
    const requestInit: RequestInit = {
      method: 'POST',
      headers,
      body
    }

    if (abortController) {
      requestInit.signal = abortController.signal
    }

    const response = await fetch(url, requestInit)

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`)
    }

    if (!response.body) {
      throw new Error('Response body is null')
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder('utf-8')
    let buffer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()

        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmedLine = line.trim()
          if (!trimmedLine || trimmedLine === 'data: [DONE]') {
            continue
          }

          if (trimmedLine.startsWith('data: ')) {
            const jsonStr = trimmedLine.slice(6)
            try {
              const data = JSON.parse(jsonStr)
              yield data
            } catch (e) {
              // console.error('Error parsing JSON from stream:', e)
            }
          }
        }
      }
    } finally {
      reader.releaseLock()
    }
  }
}