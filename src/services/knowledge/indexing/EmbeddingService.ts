import { EmbeddingModel } from '../../../types/knowledge/types';

// ONNX.js types (simplified)
declare global {
  interface Window {
    ort?: any;
  }
}

export class EmbeddingService {
  private model: EmbeddingModel;
  private session: any = null;
  private tokenizer: any = null;
  private isInitialized: boolean = false;
  private modelPath: string;
  private tokenizerPath: string;

  constructor(modelName: string = 'all-MiniLM-L6-v2') {
    this.model = {
      name: modelName,
      dimensions: 384, // all-MiniLM-L6-v2 dimensions
      maxTokens: 512,
      loaded: false
    };
    
    // Set model paths (these would be served from your static assets)
    this.modelPath = `/models/${modelName}/model.onnx`;
    this.tokenizerPath = `/models/${modelName}/tokenizer.json`;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('Loading ONNX runtime...');
      await this.loadONNXRuntime();
      
      console.log('Loading embedding model...');
      await this.loadModel();
      
      console.log('Loading tokenizer...');
      await this.loadTokenizer();
      
      this.model.loaded = true;
      this.isInitialized = true;
      console.log(`Embedding service initialized with model: ${this.model.name}`);
    } catch (error) {
      console.error('Failed to initialize embedding service:', error);
      throw new Error(`Failed to initialize embedding service: ${error.message}`);
    }
  }

  private async loadONNXRuntime(): Promise<void> {
    // Check if ONNX runtime is already loaded
    if (window.ort) {
      return;
    }

    // Load ONNX runtime from CDN
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.16.3/dist/ort.min.js';
      script.onload = () => {
        console.log('ONNX runtime loaded successfully');
        resolve();
      };
      script.onerror = () => {
        reject(new Error('Failed to load ONNX runtime'));
      };
      document.head.appendChild(script);
    });
  }

  private async loadModel(): Promise<void> {
    try {
      // Try to load the model from local assets first
      this.session = await window.ort.InferenceSession.create(this.modelPath);
      console.log('Model loaded from local assets');
    } catch (error) {
      console.warn('Local model not found, using fallback...');
      // Fallback: Use a simplified embedding approach
      await this.initializeFallbackEmbedding();
    }
  }

  private async initializeFallbackEmbedding(): Promise<void> {
    // Simple TF-IDF based embedding as fallback
    console.log('Using TF-IDF fallback for embeddings');
    this.session = {
      isFallback: true,
      vocabulary: new Map(),
      idf: new Map()
    };
  }

  private async loadTokenizer(): Promise<void> {
    try {
      const response = await fetch(this.tokenizerPath);
      this.tokenizer = await response.json();
      console.log('Tokenizer loaded successfully');
    } catch (error) {
      console.warn('Tokenizer not found, using simple tokenization');
      this.tokenizer = {
        isSimple: true,
        vocab: this.createSimpleVocab()
      };
    }
  }

  private createSimpleVocab(): Map<string, number> {
    // Create a simple vocabulary for fallback
    const vocab = new Map();
    vocab.set('[PAD]', 0);
    vocab.set('[UNK]', 1);
    vocab.set('[CLS]', 2);
    vocab.set('[SEP]', 3);
    return vocab;
  }

  async generateEmbedding(text: string): Promise<Float32Array> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      if (this.session?.isFallback) {
        return this.generateTFIDFEmbedding(text);
      } else {
        return this.generateONNXEmbedding(text);
      }
    } catch (error) {
      console.error('Error generating embedding:', error);
      // Return a zero embedding as fallback
      return new Float32Array(this.model.dimensions);
    }
  }

  async generateEmbeddings(texts: string[]): Promise<Float32Array[]> {
    const embeddings: Float32Array[] = [];
    
    // Process in batches to avoid memory issues
    const batchSize = 32;
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const batchEmbeddings = await Promise.all(
        batch.map(text => this.generateEmbedding(text))
      );
      embeddings.push(...batchEmbeddings);
    }
    
    return embeddings;
  }

  private async generateONNXEmbedding(text: string): Promise<Float32Array> {
    // Tokenize the text
    const tokens = this.tokenize(text);
    
    // Create input tensor
    const inputIds = new window.ort.Tensor('int64', BigInt64Array.from(tokens.map(t => BigInt(t))), [1, tokens.length]);
    const attentionMask = new window.ort.Tensor('int64', BigInt64Array.from(tokens.map(() => BigInt(1))), [1, tokens.length]);
    
    // Run inference
    const results = await this.session.run({
      input_ids: inputIds,
      attention_mask: attentionMask
    });
    
    // Extract embeddings (usually from last_hidden_state)
    const embeddings = results.last_hidden_state || results.logits;
    
    // Mean pooling
    return this.meanPooling(embeddings.data, tokens.length);
  }

  private generateTFIDFEmbedding(text: string): Float32Array {
    // Simple TF-IDF embedding as fallback
    const words = this.simpleTokenize(text.toLowerCase());
    const embedding = new Float32Array(this.model.dimensions);
    
    // Calculate term frequencies
    const tf = new Map();
    for (const word of words) {
      tf.set(word, (tf.get(word) || 0) + 1);
    }
    
    // Convert to embedding vector using hash-based approach
    let index = 0;
    for (const [word, freq] of tf) {
      const hash = this.simpleHash(word) % this.model.dimensions;
      embedding[hash] += freq / words.length; // Normalize by document length
      index++;
    }
    
    // Normalize the vector
    return this.normalizeVector(embedding);
  }

  private tokenize(text: string): number[] {
    if (this.tokenizer?.isSimple) {
      return this.simpleTokenizeToIds(text);
    }
    
    // Use the loaded tokenizer
    // This is a simplified implementation - in production, use a proper tokenizer
    const tokens = text.toLowerCase().split(/\s+/);
    return tokens.map(token => this.tokenizer.vocab?.[token] || 1); // 1 for [UNK]
  }

  private simpleTokenize(text: string): string[] {
    return text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 0);
  }

  private simpleTokenizeToIds(text: string): number[] {
    const tokens = this.simpleTokenize(text);
    return [2, ...tokens.map(() => Math.floor(Math.random() * 1000) + 4), 3]; // [CLS] + tokens + [SEP]
  }

  private meanPooling(data: Float32Array, sequenceLength: number): Float32Array {
    const hiddenSize = data.length / sequenceLength;
    const result = new Float32Array(hiddenSize);
    
    for (let i = 0; i < hiddenSize; i++) {
      let sum = 0;
      for (let j = 0; j < sequenceLength; j++) {
        sum += data[j * hiddenSize + i];
      }
      result[i] = sum / sequenceLength;
    }
    
    return this.normalizeVector(result);
  }

  private normalizeVector(vector: Float32Array): Float32Array {
    let norm = 0;
    for (let i = 0; i < vector.length; i++) {
      norm += vector[i] * vector[i];
    }
    norm = Math.sqrt(norm);
    
    if (norm > 0) {
      for (let i = 0; i < vector.length; i++) {
        vector[i] /= norm;
      }
    }
    
    return vector;
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  // Similarity calculations
  static cosineSimilarity(a: Float32Array, b: Float32Array): number {
    if (a.length !== b.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  static euclideanDistance(a: Float32Array, b: Float32Array): number {
    if (a.length !== b.length) return Infinity;
    
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      const diff = a[i] - b[i];
      sum += diff * diff;
    }
    
    return Math.sqrt(sum);
  }

  // Model management
  getModelInfo(): EmbeddingModel {
    return { ...this.model };
  }

  async switchModel(modelName: string): Promise<void> {
    this.isInitialized = false;
    this.model.name = modelName;
    this.model.loaded = false;
    this.modelPath = `/models/${modelName}/model.onnx`;
    this.tokenizerPath = `/models/${modelName}/tokenizer.json`;
    
    await this.initialize();
  }

  dispose(): void {
    if (this.session && !this.session.isFallback) {
      this.session.dispose();
    }
    this.session = null;
    this.tokenizer = null;
    this.isInitialized = false;
    this.model.loaded = false;
  }
}

export default EmbeddingService;