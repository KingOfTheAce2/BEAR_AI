// JavaScript/TypeScript SDK for BEAR AI API
import { 
  ApiResponse, 
  ApiError, 
  AuthTokens, 
  LoginCredentials,
  CreateChatSessionRequest,
  SendMessageRequest,
  UploadDocumentRequest,
  UpdateDocumentRequest,
  SearchRequest,
  AnalysisRequest,
  ClientOptions,
  RequestConfig,
  StreamOptions,
  StreamMessage
} from '../types/api';

export class BearAiApiClient {
  private baseUrl: string;
  private version: string;
  private timeout: number;
  private retries: number;
  private accessToken?: string;
  private refreshToken?: string;
  private onRateLimit?: (retryAfter: number) => void;
  private onError?: (error: ApiError) => void;

  constructor(options: ClientOptions = {}) {
    this.baseUrl = options.baseUrl || 'https://api.bear-ai.com';
    this.version = options.version || 'v1';
    this.timeout = options.timeout || 30000;
    this.retries = options.retries || 3;
    this.onRateLimit = options.onRateLimit;
    this.onError = options.onError;

    if (options.apiKey) {
      this.setApiKey(options.apiKey);
    }
  }

  /**
   * Set API key for authentication
   */
  setApiKey(apiKey: string): void {
    this.accessToken = apiKey;
  }

  /**
   * Set JWT tokens
   */
  setTokens(tokens: AuthTokens): void {
    this.accessToken = tokens.accessToken;
    this.refreshToken = tokens.refreshToken;
  }

  /**
   * Make HTTP request with retry logic
   */
  private async makeRequest<T>(config: RequestConfig): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}/api/${this.version}${config.url}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...config.headers
    };

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    let lastError: Error;
    
    for (let attempt = 0; attempt <= this.retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        const response = await fetch(url, {
          method: config.method,
          headers,
          body: config.data ? JSON.stringify(config.data) : undefined,
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        const result = await response.json();

        if (!response.ok) {
          const error: ApiError = result.error || {
            code: 'HTTP_ERROR',
            message: `HTTP ${response.status}`,
            timestamp: new Date().toISOString()
          };

          // Handle rate limiting
          if (response.status === 429) {
            const retryAfter = parseInt(response.headers.get('Retry-After') || '60');
            if (this.onRateLimit) {
              this.onRateLimit(retryAfter);
            }
            
            if (attempt < this.retries) {
              await this.sleep(retryAfter * 1000);
              continue;
            }
          }

          // Handle token refresh for 401 errors
          if (response.status === 401 && this.refreshToken && attempt === 0) {
            try {
              await this.refreshAccessToken();
              continue; // Retry with new token
            } catch (refreshError) {
              // Refresh failed, continue with original error
            }
          }

          if (this.onError) {
            this.onError(error);
          }

          return { error };
        }

        return { 
          data: result.data || result,
          meta: {
            version: this.version,
            timestamp: new Date().toISOString(),
            requestId: response.headers.get('X-Request-ID') || '',
            rateLimit: this.extractRateLimit(response)
          }
        };

      } catch (error) {
        lastError = error as Error;
        
        if (attempt < this.retries) {
          await this.sleep(Math.pow(2, attempt) * 1000); // Exponential backoff
          continue;
        }
      }
    }

    const apiError: ApiError = {
      code: 'REQUEST_FAILED',
      message: lastError.message,
      timestamp: new Date().toISOString()
    };

    if (this.onError) {
      this.onError(apiError);
    }

    return { error: apiError };
  }

  /**
   * Extract rate limit information from response headers
   */
  private extractRateLimit(response: Response) {
    const limit = response.headers.get('X-RateLimit-Limit');
    const remaining = response.headers.get('X-RateLimit-Remaining');
    const reset = response.headers.get('X-RateLimit-Reset');
    const retryAfter = response.headers.get('Retry-After');

    if (limit && remaining && reset) {
      return {
        limit: parseInt(limit),
        remaining: parseInt(remaining),
        reset: parseInt(reset),
        retryAfter: retryAfter ? parseInt(retryAfter) : undefined
      };
    }
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Refresh access token
   */
  private async refreshAccessToken(): Promise<void> {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await this.makeRequest<AuthTokens>({
      url: '/auth/refresh',
      method: 'POST',
      data: { refreshToken: this.refreshToken }
    });

    if (response.error) {
      throw new Error('Failed to refresh token');
    }

    if (response.data) {
      this.setTokens(response.data);
    }
  }

  // Authentication methods
  async login(credentials: LoginCredentials): Promise<ApiResponse<AuthTokens>> {
    const response = await this.makeRequest<AuthTokens>({
      url: '/auth/login',
      method: 'POST',
      data: credentials
    });

    if (response.data) {
      this.setTokens(response.data);
    }

    return response;
  }

  async logout(): Promise<ApiResponse<{ message: string }>> {
    const response = await this.makeRequest<{ message: string }>({
      url: '/auth/logout',
      method: 'POST'
    });

    if (!response.error) {
      this.accessToken = undefined;
      this.refreshToken = undefined;
    }

    return response;
  }

  // Chat methods
  async getChatSessions(params?: {
    limit?: number;
    offset?: number;
    category?: string;
  }): Promise<ApiResponse<any>> {
    return this.makeRequest({
      url: '/chat/sessions',
      method: 'GET',
      params
    });
  }

  async createChatSession(request: CreateChatSessionRequest): Promise<ApiResponse<any>> {
    return this.makeRequest({
      url: '/chat/sessions',
      method: 'POST',
      data: request
    });
  }

  async getChatSession(sessionId: string): Promise<ApiResponse<any>> {
    return this.makeRequest({
      url: `/chat/sessions/${sessionId}`,
      method: 'GET'
    });
  }

  async sendMessage(sessionId: string, request: SendMessageRequest): Promise<ApiResponse<any>> {
    return this.makeRequest({
      url: `/chat/sessions/${sessionId}/messages`,
      method: 'POST',
      data: request
    });
  }

  async deleteChatSession(sessionId: string): Promise<ApiResponse<void>> {
    return this.makeRequest({
      url: `/chat/sessions/${sessionId}`,
      method: 'DELETE'
    });
  }

  // Document methods
  async getDocuments(params?: {
    limit?: number;
    offset?: number;
    category?: string;
    status?: string;
    search?: string;
  }): Promise<ApiResponse<any>> {
    return this.makeRequest({
      url: '/documents',
      method: 'GET',
      params
    });
  }

  async uploadDocument(file: File, metadata: {
    category: string;
    tags?: string[];
  }): Promise<ApiResponse<any>> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', metadata.category);
    
    if (metadata.tags) {
      metadata.tags.forEach(tag => formData.append('tags', tag));
    }

    const url = `${this.baseUrl}/api/${this.version}/documents`;
    const headers: Record<string, string> = {};
    
    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData
    });

    const result = await response.json();

    if (!response.ok) {
      return { error: result.error };
    }

    return { data: result };
  }

  async getDocument(documentId: string): Promise<ApiResponse<any>> {
    return this.makeRequest({
      url: `/documents/${documentId}`,
      method: 'GET'
    });
  }

  async updateDocument(documentId: string, request: UpdateDocumentRequest): Promise<ApiResponse<any>> {
    return this.makeRequest({
      url: `/documents/${documentId}`,
      method: 'PUT',
      data: request
    });
  }

  async deleteDocument(documentId: string): Promise<ApiResponse<void>> {
    return this.makeRequest({
      url: `/documents/${documentId}`,
      method: 'DELETE'
    });
  }

  async downloadDocument(documentId: string): Promise<Blob> {
    const url = `${this.baseUrl}/api/${this.version}/documents/${documentId}/download`;
    const headers: Record<string, string> = {};
    
    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    const response = await fetch(url, { headers });
    
    if (!response.ok) {
      throw new Error(`Download failed: ${response.status}`);
    }

    return response.blob();
  }

  // Search methods
  async search(request: SearchRequest): Promise<ApiResponse<any>> {
    return this.makeRequest({
      url: '/research/search',
      method: 'POST',
      data: request
    });
  }

  // Analysis methods
  async analyzeDocument(documentId: string, request: AnalysisRequest): Promise<ApiResponse<any>> {
    return this.makeRequest({
      url: `/analysis/documents/${documentId}`,
      method: 'POST',
      data: request
    });
  }

  // User methods
  async getUserProfile(): Promise<ApiResponse<any>> {
    return this.makeRequest({
      url: '/users/profile',
      method: 'GET'
    });
  }

  async updateUserProfile(updates: any): Promise<ApiResponse<any>> {
    return this.makeRequest({
      url: '/users/profile',
      method: 'PUT',
      data: updates
    });
  }

  // System methods
  async getSystemHealth(): Promise<ApiResponse<any>> {
    return this.makeRequest({
      url: '/system/health',
      method: 'GET'
    });
  }

  async getSystemStatus(): Promise<ApiResponse<any>> {
    return this.makeRequest({
      url: '/system/status',
      method: 'GET'
    });
  }

  // Streaming methods
  createStreamConnection(endpoint: string, options: StreamOptions = {}): EventSource {
    const url = `${this.baseUrl}/api/${this.version}${endpoint}`;
    const eventSource = new EventSource(url);

    eventSource.onmessage = (event) => {
      try {
        const message: StreamMessage = JSON.parse(event.data);
        this.handleStreamMessage(message);
      } catch (error) {
        console.error('Failed to parse stream message:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('Stream connection error:', error);
      
      if (options.reconnect && options.maxReconnectAttempts) {
        // Implement reconnection logic
        setTimeout(() => {
          if (options.maxReconnectAttempts! > 0) {
            this.createStreamConnection(endpoint, {
              ...options,
              maxReconnectAttempts: options.maxReconnectAttempts! - 1
            });
          }
        }, options.reconnectInterval || 5000);
      }
    };

    return eventSource;
  }

  private handleStreamMessage(message: StreamMessage): void {
    // Handle different types of stream messages
    switch (message.type) {
      case 'data':
        // Process data message
        break;
      case 'error':
        console.error('Stream error:', message.payload);
        break;
      case 'complete':
        console.log('Stream completed');
        break;
    }
  }
}

// Export additional utilities
export { ApiResponse, ApiError, AuthTokens } from '../types/api';

// Default client instance
export const bearAiApi = new BearAiApiClient();

// React hook for client
export function useBearAiApi(options?: ClientOptions): BearAiApiClient {
  return new BearAiApiClient(options);
}