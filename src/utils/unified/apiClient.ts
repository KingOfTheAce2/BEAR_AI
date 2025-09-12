/**
 * Unified API Client for BEAR AI
 * Consistent API communication patterns across all services
 */

import { BearError, ErrorCategory, ErrorSeverity, errorHandler } from './errorHandler';
import { Logger, createLogger } from './logger';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata?: {
    timestamp: Date;
    requestId: string;
    version: string;
    performance?: {
      duration: number;
      size: number;
    };
  };
}

export interface ApiError {
  code: string;
  message: string;
  status: number;
  details?: any;
  timestamp: Date;
}

export interface RequestOptions {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  cache?: boolean;
  cacheTimeout?: number;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  onUploadProgress?: (progress: number) => void;
  onDownloadProgress?: (progress: number) => void;
}

export interface ApiClientConfig {
  baseUrl: string;
  timeout: number;
  retries: number;
  retryDelay: number;
  headers: Record<string, string>;
  logger?: Logger;
  enableCache: boolean;
  cacheTimeout: number;
  enableMetrics: boolean;
}

export class ApiClient {
  private config: ApiClientConfig;
  private logger: Logger;
  private cache = new Map<string, { data: any; expires: number }>();
  private requestInterceptors: ((config: RequestInit) => RequestInit | Promise<RequestInit>)[] = [];
  private responseInterceptors: ((response: Response) => Response | Promise<Response>)[] = [];
  private requestCounter = 0;

  constructor(config: Partial<ApiClientConfig> = {}) {
    this.config = {
      baseUrl: process.env.REACT_APP_API_URL || 'http://localhost:3001',
      timeout: 30000,
      retries: 3,
      retryDelay: 1000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      enableCache: true,
      cacheTimeout: 300000, // 5 minutes
      enableMetrics: true,
      ...config
    };

    this.logger = config.logger || createLogger('ApiClient');
    this.setupDefaultInterceptors();
  }

  /**
   * GET request
   */
  async get<T = any>(
    endpoint: string, 
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>('GET', endpoint, undefined, options);
  }

  /**
   * POST request
   */
  async post<T = any>(
    endpoint: string, 
    data?: any, 
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>('POST', endpoint, data, options);
  }

  /**
   * PUT request
   */
  async put<T = any>(
    endpoint: string, 
    data?: any, 
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>('PUT', endpoint, data, options);
  }

  /**
   * PATCH request
   */
  async patch<T = any>(
    endpoint: string, 
    data?: any, 
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>('PATCH', endpoint, data, options);
  }

  /**
   * DELETE request
   */
  async delete<T = any>(
    endpoint: string, 
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>('DELETE', endpoint, undefined, options);
  }

  /**
   * Upload file
   */
  async upload<T = any>(
    endpoint: string,
    file: File,
    additionalData?: Record<string, any>,
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const formData = new FormData();
    formData.append('file', file);
    
    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, typeof value === 'string' ? value : JSON.stringify(value));
      });
    }

    const uploadOptions = {
      ...options,
      headers: {
        ...options.headers,
        // Remove Content-Type to let browser set boundary
      }
    };

    // Remove Content-Type for FormData
    delete uploadOptions.headers?.['Content-Type'];

    return this.request<T>('POST', endpoint, formData, uploadOptions);
  }

  /**
   * Download file
   */
  async download(
    endpoint: string,
    filename?: string,
    options: RequestOptions = {}
  ): Promise<void> {
    const response = await this.request<Blob>('GET', endpoint, undefined, {
      ...options,
      cache: false // Don't cache downloads
    });

    if (response.success && response.data) {
      const blob = response.data;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = filename || 'download';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    }
  }

  /**
   * Core request method
   */
  private async request<T>(
    method: string,
    endpoint: string,
    data?: any,
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const requestId = this.generateRequestId();
    const startTime = performance.now();

    // Build URL
    const url = this.buildUrl(endpoint);
    
    // Check cache for GET requests
    if (method === 'GET' && options.cache !== false && this.config.enableCache) {
      const cached = this.getFromCache(url);
      if (cached) {
        this.logger.debug(`Cache hit for ${method} ${url}`, { requestId });
        return {
          success: true,
          data: cached,
          metadata: {
            timestamp: new Date(),
            requestId,
            version: '1.0.0',
            performance: {
              duration: performance.now() - startTime,
              size: JSON.stringify(cached).length
            }
          }
        };
      }
    }

    // Build request configuration
    let requestConfig: RequestInit = {
      method,
      headers: {
        ...this.config.headers,
        ...options.headers,
        'X-Request-ID': requestId
      },
      signal: options.signal
    };

    // Add body for non-GET requests
    if (data && method !== 'GET') {
      if (data instanceof FormData) {
        requestConfig.body = data;
        // Remove Content-Type for FormData
        delete (requestConfig.headers as any)['Content-Type'];
      } else {
        requestConfig.body = JSON.stringify(data);
      }
    }

    // Apply request interceptors
    for (const interceptor of this.requestInterceptors) {
      requestConfig = await interceptor(requestConfig);
    }

    let attempt = 0;
    const maxAttempts = (options.retries ?? this.config.retries) + 1;

    while (attempt < maxAttempts) {
      try {
        this.logger.debug(`API Request ${method} ${url}`, {
          requestId,
          attempt: attempt + 1,
          data: this.sanitizeLogData(data)
        });

        // Create timeout controller
        const timeoutController = new AbortController();
        const timeout = options.timeout ?? this.config.timeout;
        const timeoutId = setTimeout(() => timeoutController.abort(), timeout);

        // Combine signals
        const combinedSignal = this.combineAbortSignals([
          options.signal,
          timeoutController.signal
        ]);

        const response = await fetch(url, {
          ...requestConfig,
          signal: combinedSignal
        });

        clearTimeout(timeoutId);

        // Apply response interceptors
        let processedResponse = response;
        for (const interceptor of this.responseInterceptors) {
          processedResponse = await interceptor(processedResponse);
        }

        const duration = performance.now() - startTime;
        
        // Handle response
        const result = await this.handleResponse<T>(
          processedResponse, 
          requestId, 
          duration,
          method,
          url
        );

        // Cache successful GET responses
        if (method === 'GET' && result.success && this.config.enableCache) {
          this.setCache(url, result.data, options.cacheTimeout);
        }

        this.logger.httpRequest(method, url, response.status, duration, {
          requestId,
          success: result.success,
          attempt: attempt + 1
        });

        return result;

      } catch (error) {
        attempt++;
        const duration = performance.now() - startTime;

        if (attempt >= maxAttempts) {
          const bearError = await this.handleError(error, method, url, requestId, duration);
          
          return {
            success: false,
            error: {
              code: bearError.code,
              message: bearError.message,
              details: bearError.context
            },
            metadata: {
              timestamp: new Date(),
              requestId,
              version: '1.0.0',
              performance: {
                duration,
                size: 0
              }
            }
          };
        }

        // Wait before retry
        const retryDelay = options.retryDelay ?? this.config.retryDelay;
        await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attempt - 1)));
        
        this.logger.warn(`API Request retry ${attempt}/${maxAttempts - 1}`, {
          requestId,
          error: error instanceof Error ? error.message : error
        });
      }
    }

    // This should never be reached
    throw new Error('Unexpected end of request loop');
  }

  /**
   * Handle response processing
   */
  private async handleResponse<T>(
    response: Response,
    requestId: string,
    duration: number,
    method: string,
    url: string
  ): Promise<ApiResponse<T>> {
    const contentType = response.headers.get('content-type') || '';
    let data: any;
    let size = 0;

    try {
      if (contentType.includes('application/json')) {
        const text = await response.text();
        size = text.length;
        data = text ? JSON.parse(text) : null;
      } else if (contentType.includes('text/')) {
        data = await response.text();
        size = data.length;
      } else {
        data = await response.blob();
        size = data.size;
      }
    } catch (parseError) {
      throw new Error(`Failed to parse response: ${parseError}`);
    }

    if (!response.ok) {
      const error = data?.error || {
        code: `HTTP_${response.status}`,
        message: response.statusText || 'Request failed'
      };

      throw new BearError(
        error.message,
        error.code,
        this.getErrorCategory(response.status),
        this.getErrorSeverity(response.status),
        {
          status: response.status,
          statusText: response.statusText,
          url,
          method,
          requestId,
          responseData: data
        }
      );
    }

    return {
      success: true,
      data,
      metadata: {
        timestamp: new Date(),
        requestId,
        version: '1.0.0',
        performance: {
          duration,
          size
        }
      }
    };
  }

  /**
   * Handle and categorize errors
   */
  private async handleError(
    error: any,
    method: string,
    url: string,
    requestId: string,
    duration: number
  ): Promise<BearError> {
    if (error instanceof BearError) {
      return error;
    }

    let bearError: BearError;

    if (error.name === 'AbortError') {
      bearError = new BearError(
        'Request was cancelled or timed out',
        'REQUEST_TIMEOUT',
        ErrorCategory.NETWORK,
        ErrorSeverity.MEDIUM,
        { method, url, requestId, duration }
      );
    } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
      bearError = new BearError(
        'Network connection failed',
        'NETWORK_ERROR',
        ErrorCategory.NETWORK,
        ErrorSeverity.HIGH,
        { method, url, requestId, duration }
      );
    } else {
      bearError = new BearError(
        error.message || 'Unknown API error',
        'API_ERROR',
        ErrorCategory.API,
        ErrorSeverity.MEDIUM,
        { method, url, requestId, duration, originalError: error }
      );
    }

    return errorHandler.handle(bearError);
  }

  /**
   * Request and response interceptors
   */
  addRequestInterceptor(
    interceptor: (config: RequestInit) => RequestInit | Promise<RequestInit>
  ): void {
    this.requestInterceptors.push(interceptor);
  }

  addResponseInterceptor(
    interceptor: (response: Response) => Response | Promise<Response>
  ): void {
    this.responseInterceptors.push(interceptor);
  }

  /**
   * Cache management
   */
  private getFromCache(key: string): any | null {
    const cached = this.cache.get(key);
    if (cached && cached.expires > Date.now()) {
      return cached.data;
    }
    if (cached) {
      this.cache.delete(key);
    }
    return null;
  }

  private setCache(key: string, data: any, timeout?: number): void {
    const cacheTimeout = timeout ?? this.config.cacheTimeout;
    this.cache.set(key, {
      data,
      expires: Date.now() + cacheTimeout
    });
  }

  clearCache(): void {
    this.cache.clear();
  }

  // Utility methods
  private buildUrl(endpoint: string): string {
    if (endpoint.startsWith('http')) {
      return endpoint;
    }
    const baseUrl = this.config.baseUrl.replace(/\/$/, '');
    const cleanEndpoint = endpoint.replace(/^\//, '');
    return `${baseUrl}/${cleanEndpoint}`;
  }

  private generateRequestId(): string {
    return `req_${++this.requestCounter}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private combineAbortSignals(signals: (AbortSignal | undefined)[]): AbortSignal {
    const controller = new AbortController();
    const validSignals = signals.filter(Boolean) as AbortSignal[];
    
    validSignals.forEach(signal => {
      if (signal.aborted) {
        controller.abort();
      } else {
        signal.addEventListener('abort', () => controller.abort());
      }
    });

    return controller.signal;
  }

  private getErrorCategory(status: number): ErrorCategory {
    if (status === 401) return ErrorCategory.AUTH;
    if (status === 403) return ErrorCategory.PERMISSION;
    if (status >= 400 && status < 500) return ErrorCategory.VALIDATION;
    if (status >= 500) return ErrorCategory.SYSTEM;
    return ErrorCategory.API;
  }

  private getErrorSeverity(status: number): ErrorSeverity {
    if (status >= 500) return ErrorSeverity.HIGH;
    if (status === 401 || status === 403) return ErrorSeverity.HIGH;
    if (status >= 400) return ErrorSeverity.MEDIUM;
    return ErrorSeverity.LOW;
  }

  private sanitizeLogData(data: any): any {
    if (!data || typeof data !== 'object') return data;
    
    const sanitized = { ...data };
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'authorization'];
    
    Object.keys(sanitized).forEach(key => {
      if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
        sanitized[key] = '[REDACTED]';
      }
    });
    
    return sanitized;
  }

  private setupDefaultInterceptors(): void {
    // Add authentication header if token exists
    this.addRequestInterceptor((config) => {
      const token = localStorage.getItem('auth_token');
      if (token) {
        config.headers = {
          ...config.headers,
          'Authorization': `Bearer ${token}`
        };
      }
      return config;
    });

    // Handle authentication errors
    this.addResponseInterceptor(async (response) => {
      if (response.status === 401) {
        // Clear invalid token
        localStorage.removeItem('auth_token');
        // Redirect to login if not already there
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
      }
      return response;
    });
  }
}

// Create default API client
export const apiClient = new ApiClient();

// Export utility functions
export function createApiClient(config: Partial<ApiClientConfig>): ApiClient {
  return new ApiClient(config);
}

export function isApiError(error: any): error is ApiError {
  return error && typeof error === 'object' && 'code' in error && 'status' in error;
}