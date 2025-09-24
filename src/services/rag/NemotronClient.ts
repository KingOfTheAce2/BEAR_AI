/**
 * NVIDIA Nemotron API Client
 * Handles communication with NVIDIA's AI services
 */

import { EventEmitter } from 'events';

export interface NemotronClientConfig {
  apiKey: string;
  baseUrl: string;
  timeout: number;
  maxRetries: number;
  enableCaching: boolean;
  cacheSize: number;
}

export interface GenerationRequest {
  prompt: string;
  model: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  topK?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stopSequences?: string[];
  systemPrompt?: string;
  userContext?: Record<string, any>;
}

export interface GenerationResponse {
  text: string;
  finishReason: 'completed' | 'length' | 'stop' | 'content_filter';
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  id: string;
  created: number;
}

export interface EmbeddingRequest {
  text: string | string[];
  model: string;
  normalize?: boolean;
  dimensions?: number;
}

export interface EmbeddingResponse {
  embeddings: number[][];
  model: string;
  usage: {
    totalTokens: number;
  };
}

export interface RerankingRequest {
  query: string;
  documents: string[];
  model: string;
  topK?: number;
  returnDocuments?: boolean;
}

export interface RerankingResponse {
  results: {
    index: number;
    relevanceScore: number;
    document?: string;
  }[];
  model: string;
  usage: {
    totalTokens: number;
  };
}

export interface ChatRequest {
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  model: string;
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
}

export interface ChatResponse {
  message: {
    role: 'assistant';
    content: string;
  };
  finishReason: 'completed' | 'length' | 'stop';
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface ModelInfo {
  id: string;
  name: string;
  description: string;
  type: 'embedding' | 'generation' | 'reranking' | 'chat';
  contextLength: number;
  maxOutputTokens: number;
  inputCostPer1k: number;
  outputCostPer1k: number;
  available: boolean;
}

/**
 * NVIDIA Nemotron API Client
 */
export class NemotronClient extends EventEmitter {
  private config: NemotronClientConfig;
  private cache = new Map<string, any>();
  private rateLimiter: Map<string, number> = new Map();

  constructor(config: NemotronClientConfig) {
    super();
    this.config = config;
  }

  /**
   * Generate text using Nemotron models
   */
  async generate(request: GenerationRequest): Promise<GenerationResponse> {
    const cacheKey = this.getCacheKey('generate', request);

    if (this.config.enableCaching && this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    await this.checkRateLimit('generate');

    try {
      const response = await this.makeRequest('/v1/completions', {
        method: 'POST',
        body: JSON.stringify({
          model: request.model,
          prompt: request.prompt,
          max_tokens: request.maxTokens || 1000,
          temperature: request.temperature || 0.7,
          top_p: request.topP || 0.9,
          top_k: request.topK,
          frequency_penalty: request.frequencyPenalty || 0,
          presence_penalty: request.presencePenalty || 0,
          stop: request.stopSequences,
          system: request.systemPrompt,
          user_context: request.userContext,
        }),
      });

      const result: GenerationResponse = await response.json();

      if (this.config.enableCaching) {
        this.setCache(cacheKey, result);
      }

      this.emit('generation', { request, response: result });
      return result;

    } catch (error) {
      this.emit('error', { operation: 'generate', error });
      throw error;
    }
  }

  /**
   * Generate embeddings using NV-Embed models
   */
  async embed(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    const cacheKey = this.getCacheKey('embed', request);

    if (this.config.enableCaching && this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    await this.checkRateLimit('embed');

    try {
      const response = await this.makeRequest('/v1/embeddings', {
        method: 'POST',
        body: JSON.stringify({
          model: request.model,
          input: Array.isArray(request.text) ? request.text : [request.text],
          normalize: request.normalize !== false,
          dimensions: request.dimensions,
        }),
      });

      const result: EmbeddingResponse = await response.json();

      if (this.config.enableCaching) {
        this.setCache(cacheKey, result);
      }

      this.emit('embedding', { request, response: result });
      return result;

    } catch (error) {
      this.emit('error', { operation: 'embed', error });
      throw error;
    }
  }

  /**
   * Rerank documents using Nemotron reranking models
   */
  async rerank(request: RerankingRequest): Promise<RerankingResponse> {
    const cacheKey = this.getCacheKey('rerank', request);

    if (this.config.enableCaching && this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    await this.checkRateLimit('rerank');

    try {
      const response = await this.makeRequest('/v1/ranking', {
        method: 'POST',
        body: JSON.stringify({
          model: request.model,
          query: request.query,
          passages: request.documents,
          top_k: request.topK || request.documents.length,
          return_passages: request.returnDocuments || false,
        }),
      });

      const result: RerankingResponse = await response.json();

      if (this.config.enableCaching) {
        this.setCache(cacheKey, result);
      }

      this.emit('reranking', { request, response: result });
      return result;

    } catch (error) {
      this.emit('error', { operation: 'rerank', error });
      throw error;
    }
  }

  /**
   * Chat with Nemotron models
   */
  async chat(request: ChatRequest): Promise<ChatResponse> {
    const cacheKey = this.getCacheKey('chat', request);

    if (this.config.enableCaching && this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    await this.checkRateLimit('chat');

    try {
      const response = await this.makeRequest('/v1/chat/completions', {
        method: 'POST',
        body: JSON.stringify({
          model: request.model,
          messages: request.messages,
          max_tokens: request.maxTokens || 1000,
          temperature: request.temperature || 0.7,
          stream: request.stream || false,
        }),
      });

      const result: ChatResponse = await response.json();

      if (this.config.enableCaching) {
        this.setCache(cacheKey, result);
      }

      this.emit('chat', { request, response: result });
      return result;

    } catch (error) {
      this.emit('error', { operation: 'chat', error });
      throw error;
    }
  }

  /**
   * Stream chat responses
   */
  async *streamChat(request: ChatRequest): AsyncGenerator<Partial<ChatResponse>, void, unknown> {
    await this.checkRateLimit('chat');

    try {
      const response = await this.makeRequest('/v1/chat/completions', {
        method: 'POST',
        body: JSON.stringify({
          ...request,
          stream: true,
        }),
      });

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim() === '') continue;
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') return;

            try {
              const parsed = JSON.parse(data);
              yield parsed;
            } catch (error) {
              this.emit('error', { operation: 'streamChat', error });
            }
          }
        }
      }

    } catch (error) {
      this.emit('error', { operation: 'streamChat', error });
      throw error;
    }
  }

  /**
   * Get available models
   */
  async getModels(): Promise<ModelInfo[]> {
    try {
      const response = await this.makeRequest('/v1/models', {
        method: 'GET',
      });

      const result = await response.json();
      return result.data || [];

    } catch (error) {
      this.emit('error', { operation: 'getModels', error });
      throw error;
    }
  }

  /**
   * Check model health
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'degraded' | 'down'; latency: number }> {
    const startTime = Date.now();

    try {
      const response = await this.makeRequest('/v1/health', {
        method: 'GET',
      });

      const latency = Date.now() - startTime;
      const status = response.ok ? 'healthy' : 'degraded';

      return { status, latency };

    } catch (error) {
      this.emit('error', { operation: 'healthCheck', error });
      return { status: 'down', latency: Date.now() - startTime };
    }
  }

  /**
   * Legal-specific prompt templates
   */
  createLegalPrompt(type: 'analysis' | 'research' | 'summary' | 'citation', context: any): string {
    const templates = {
      analysis: `You are a legal AI assistant specializing in legal document analysis.

Query: ${context.query}
Jurisdiction: ${context.jurisdiction || 'Not specified'}

Based on the following legal documents and citations, provide a comprehensive legal analysis:

${context.documents?.map((doc: any, i: number) => `Document ${i + 1}: ${doc.content.substring(0, 500)}...`).join('\n\n')}

Please provide:
1. Legal principles that apply
2. Relevant precedents and their significance
3. Potential arguments and counterarguments
4. Jurisdictional considerations
5. Confidence in the analysis

Ensure all statements are supported by the provided sources and cite appropriately.`,

      research: `You are conducting legal research on the following topic:

Research Query: ${context.query}
Focus Areas: ${context.focusAreas?.join(', ') || 'General legal research'}

Retrieved Sources:
${context.sources?.map((source: any, i: number) => `${i + 1}. ${source.title}: ${source.summary}`).join('\n')}

Provide a structured research summary including:
1. Key findings and their legal significance
2. Relevant statutes, cases, and regulations
3. Current state of the law
4. Recent developments or changes
5. Practical implications

Cite all sources using proper legal citation format.`,

      summary: `Summarize the following legal document(s) for ${context.audience || 'legal professionals'}:

${context.document}

Provide:
1. Executive summary (2-3 paragraphs)
2. Key legal points and holdings
3. Practical implications
4. Important dates and deadlines
5. Action items (if applicable)

Maintain legal accuracy while making the content accessible to the intended audience.`,

      citation: `Verify and format the following legal citations according to ${context.citationStyle || 'Bluebook'} format:

Citations to verify:
${context.citations?.join('\n') || context.citation}

For each citation, provide:
1. Properly formatted citation
2. Verification status (valid/invalid/uncertain)
3. Case/statute summary (if applicable)
4. Precedential value
5. Current status (active/overturned/modified)

Include any corrections or additional context needed.`
    };

    return templates[type] || templates.analysis;
  }

  /**
   * Specialized legal generation
   */
  async generateLegalResponse(
    type: 'analysis' | 'research' | 'summary' | 'citation',
    context: any,
    options: Partial<GenerationRequest> = {}
  ): Promise<GenerationResponse> {
    const prompt = this.createLegalPrompt(type, context);

    return this.generate({
      prompt,
      model: options.model || 'nemotron-4-340b-instruct',
      maxTokens: options.maxTokens || 2000,
      temperature: options.temperature || 0.2, // Lower temperature for legal accuracy
      topP: options.topP || 0.9,
      systemPrompt: `You are a specialized legal AI assistant. Always prioritize accuracy over completeness.
                     If you're uncertain about any legal statement, explicitly state your uncertainty.
                     Always cite sources and distinguish between binding and persuasive authority.
                     Never provide legal advice, only legal information and analysis.`,
      ...options,
    });
  }

  /**
   * Batch operations for efficiency
   */
  async batchEmbed(texts: string[], model: string): Promise<EmbeddingResponse> {
    const batchSize = 100; // Adjust based on API limits
    const results: number[][] = [];
    let totalTokens = 0;

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const response = await this.embed({
        text: batch,
        model,
      });

      results.push(...response.embeddings);
      totalTokens += response.usage.totalTokens;
    }

    return {
      embeddings: results,
      model,
      usage: { totalTokens },
    };
  }

  /**
   * Advanced reranking with legal context
   */
  async rerankWithLegalContext(
    query: string,
    documents: string[],
    jurisdiction?: string,
    documentTypes?: string[]
  ): Promise<RerankingResponse> {
    // Enhance query with legal context
    let enhancedQuery = query;
    if (jurisdiction) {
      enhancedQuery += ` jurisdiction:${jurisdiction}`;
    }
    if (documentTypes?.length) {
      enhancedQuery += ` types:${documentTypes.join(',')}`;
    }

    return this.rerank({
      query: enhancedQuery,
      documents,
      model: 'nemotron-rerank',
      topK: Math.min(documents.length, 50),
      returnDocuments: true,
    });
  }

  // Private helper methods

  private async makeRequest(endpoint: string, options: RequestInit): Promise<Response> {
    const url = `${this.config.baseUrl}${endpoint}`;

    const headers = {
      'Authorization': `Bearer ${this.config.apiKey}`,
      'Content-Type': 'application/json',
      'User-Agent': 'BEAR-AI-Nemotron-Client/1.0',
      ...((options.headers as Record<string, string>) || {}),
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      return response;

    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${this.config.timeout}ms`);
      }

      // Implement retry logic
      if (this.shouldRetry(error)) {
        return this.retryRequest(endpoint, options);
      }

      throw error;
    }
  }

  private shouldRetry(error: any): boolean {
    // Retry on network errors, 5xx errors, and rate limits
    return error.message?.includes('fetch') ||
           error.message?.includes('5') ||
           error.message?.includes('rate limit');
  }

  private async retryRequest(endpoint: string, options: RequestInit, attempt = 1): Promise<Response> {
    if (attempt > this.config.maxRetries) {
      throw new Error(`Max retries (${this.config.maxRetries}) exceeded`);
    }

    // Exponential backoff
    const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
    await new Promise(resolve => setTimeout(resolve, delay));

    try {
      return await this.makeRequest(endpoint, options);
    } catch (error) {
      return this.retryRequest(endpoint, options, attempt + 1);
    }
  }

  private async checkRateLimit(operation: string): Promise<void> {
    const now = Date.now();
    const lastCall = this.rateLimiter.get(operation) || 0;
    const minInterval = 100; // Minimum 100ms between calls

    if (now - lastCall < minInterval) {
      await new Promise(resolve => setTimeout(resolve, minInterval - (now - lastCall)));
    }

    this.rateLimiter.set(operation, Date.now());
  }

  private getCacheKey(operation: string, request: any): string {
    return `${operation}:${JSON.stringify(request)}`;
  }

  private setCache(key: string, value: any): void {
    if (this.cache.size >= this.config.cacheSize) {
      // Remove oldest entry
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; maxSize: number; hitRate: number } {
    return {
      size: this.cache.size,
      maxSize: this.config.cacheSize,
      hitRate: 0, // Would need to track hits/misses
    };
  }
}

export default NemotronClient;