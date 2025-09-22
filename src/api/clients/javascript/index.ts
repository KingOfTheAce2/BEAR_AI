import { ApiError, AuthTokens, ApiResponse, RequestConfig } from '../../types/api';

export interface ApiClientConfig {
  baseUrl: string;
  version?: string;
  timeout?: number;
  retries?: number;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
  retryAfter?: number;
}

export class ApiClient {
  private baseUrl: string;
  private version: string;
  private timeout: number;
  private retries: number;
  private accessToken?: string;
  private refreshToken?: string;
  
  public onError?: (error: ApiError) => void;
  public onRateLimit?: (retryAfter: number) => void;

  constructor(config: ApiClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, '');
    this.version = config.version || 'v1';
    this.timeout = config.timeout || 30000;
    this.retries = config.retries || 3;
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

    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= this.retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        const requestInit: RequestInit = {
          method: config.method,
          headers,
          signal: controller.signal
        };

        if (typeof config.data !== 'undefined') {
          requestInit.body = JSON.stringify(config.data);
        }

        const response = await fetch(url, requestInit);

        clearTimeout(timeoutId);

        const result = await response.json();
        const rateLimitInfo = this.parseRateLimit(response.headers);
        const requestId =
          response.headers.get('X-Request-ID') ?? response.headers.get('x-request-id') ?? this.generateRequestId();

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
            requestId,
            rateLimit: rateLimitInfo
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

    // Ensure lastError is not null before using it
    const apiError: ApiError = {
      code: 'REQUEST_FAILED',
      message: lastError?.message || 'Request failed after maximum retries',
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
  private parseRateLimit(headers: Headers): RateLimitInfo | undefined {
    const limit = headers.get('x-ratelimit-limit');
    const remaining = headers.get('x-ratelimit-remaining');
    const reset = headers.get('x-ratelimit-reset');
    const retryAfter = headers.get('retry-after');

    if (!limit || !remaining || !reset) {
      return undefined;
    }

    return {
      limit: parseInt(limit, 10),
      remaining: parseInt(remaining, 10),
      reset: parseInt(reset, 10),
      retryAfter: retryAfter ? parseInt(retryAfter, 10) : undefined
    };
  }

  private generateRequestId(): string {
    try {
      const cryptoRef = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
      if (cryptoRef?.randomUUID) {
        return cryptoRef.randomUUID();
      }
    } catch {
      // Ignore errors and fall back to a timestamp-based ID
    }

    return `req-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Refresh access token using refresh token
   */
  private async refreshAccessToken(): Promise<void> {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await fetch(`${this.baseUrl}/api/${this.version}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.refreshToken}`
      }
    });

    if (!response.ok) {
      throw new Error('Token refresh failed');
    }

    const result = await response.json();
    this.accessToken = result.accessToken;
    this.refreshToken = result.refreshToken;
  }

  /**
   * GET request
   */
  async get<T>(url: string, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.makeRequest<T>({ method: 'GET', url, headers: headers || {} });
  }

  /**
   * POST request
   */
  async post<T>(
    url: string,
    data?: any,
    headers?: Record<string, string>
  ): Promise<ApiResponse<T>> {
    const config: RequestConfig = { method: 'POST', url, headers: headers || {} };
    if (typeof data !== 'undefined') {
      config.data = data;
    }
    return this.makeRequest<T>(config);
  }

  /**
   * PUT request
   */
  async put<T>(
    url: string,
    data?: any,
    headers?: Record<string, string>
  ): Promise<ApiResponse<T>> {
    const config: RequestConfig = { method: 'PUT', url, headers: headers || {} };
    if (typeof data !== 'undefined') {
      config.data = data;
    }
    return this.makeRequest<T>(config);
  }

  /**
   * DELETE request
   */
  async delete<T>(url: string, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.makeRequest<T>({ method: 'DELETE', url, headers: headers || {} });
  }

  /**
   * PATCH request
   */
  async patch<T>(
    url: string,
    data?: any,
    headers?: Record<string, string>
  ): Promise<ApiResponse<T>> {
    const config: RequestConfig = { method: 'PATCH', url, headers: headers || {} };
    if (typeof data !== 'undefined') {
      config.data = data;
    }
    return this.makeRequest<T>(config);
  }
}

export default ApiClient;