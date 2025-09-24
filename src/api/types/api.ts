// Enhanced API types with versioning support
export interface ApiVersion {
  version: string;
  deprecated?: boolean;
  sunset?: Date;
  supportedUntil?: Date;
}

export interface ApiConfig {
  baseUrl: string;
  version: string;
  timeout: number;
  retries: number;
  rateLimit: {
    requests: number;
    windowMs: number;
  };
}

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: ApiError;
  meta?: {
    version: string;
    timestamp: string;
    requestId: string;
    rateLimit?: RateLimit;
  };
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: string;
  path?: string;
  method?: string;
}

export interface RateLimit {
  limit: number;
  remaining: number;
  reset: number;
  retryAfter?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Authentication types
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

// Chat types
export interface CreateChatSessionRequest {
  title: string;
  category?: 'research' | 'analysis' | 'drafting' | 'review';
  tags?: string[];
}

export interface SendMessageRequest {
  content: string;
  type?: 'text' | 'document' | 'analysis' | 'citation';
  documentRefs?: string[];
  metadata?: Record<string, unknown>;
}

// Document types
export interface UploadDocumentRequest {
  file: File;
  category: 'contract' | 'brief' | 'research' | 'evidence' | 'correspondence' | 'other';
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface UpdateDocumentRequest {
  name?: string;
  tags?: string[];
  category?: 'contract' | 'brief' | 'research' | 'evidence' | 'correspondence' | 'other';
  metadata?: Record<string, unknown>;
}

// Search types
export interface SearchRequest {
  query: string;
  filters?: {
    type?: Array<'document' | 'case' | 'statute' | 'regulation'>;
    jurisdiction?: string;
    dateRange?: {
      from?: string;
      to?: string;
    };
    category?: string[];
  };
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Analysis types
export interface AnalysisRequest {
  type: 'summary' | 'risk_assessment' | 'clause_extraction' | 'compliance_check';
  options?: {
    includeConfidence?: boolean;
    detailLevel?: 'brief' | 'standard' | 'detailed';
    customPrompt?: string;
  };
}

export interface AnalysisResult {
  id: string;
  documentId: string;
  type: string;
  result: Record<string, unknown>;
  confidence?: number;
  createdAt: string;
  processingTime: number;
}

// Webhook types
export interface WebhookEvent {
  id: string;
  type: string;
  data: Record<string, unknown>;
  timestamp: string;
  version: string;
}

export interface WebhookEndpoint {
  id: string;
  url: string;
  events: string[];
  secret: string;
  active: boolean;
  createdAt: string;
}

// Client options
export interface ClientOptions {
  apiKey?: string;
  baseUrl?: string;
  version?: string;
  timeout?: number;
  retries?: number;
  onRateLimit?: (retryAfter: number) => void;
  onError?: (error: ApiError) => void;
}

// Request interceptor types
export interface RequestInterceptor {
  (config: RequestConfig): RequestConfig | Promise<RequestConfig>;
}

export interface ResponseInterceptor {
  (response: ApiResponse): ApiResponse | Promise<ApiResponse>;
}

export interface RequestConfig {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  params?: Record<string, unknown>;
  data?: unknown;
  timeout?: number;
}

// Stream types for real-time features
export interface StreamMessage {
  type: 'data' | 'error' | 'complete';
  payload: unknown;
  timestamp: string;
}

export interface StreamOptions {
  reconnect?: boolean;
  maxReconnectAttempts?: number;
  reconnectInterval?: number;
}