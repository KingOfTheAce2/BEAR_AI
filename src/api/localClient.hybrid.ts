// Hybrid Local API client with environment detection and fallbacks
import { getTauriInvoke } from '../utils/conditionalImports';
import { isTauriEnvironment, environmentLog } from '../utils/environmentDetection';

// Re-export all types from the original localClient
export type {
  LocalAuthCredentials,
  LocalAuthResponse,
  LocalChatSession,
  LocalChatMessage,
  LocalDocument,
  LocalSearchQuery,
  LocalAnalysisRequest,
  LocalApiClientOptions
} from './localClient';

/**
 * Hybrid API client that works in both Tauri desktop and web environments
 */
export class HybridLocalApiClient {
  private sessionId: string | null = null;
  private options: import('./localClient').LocalApiClientOptions;
  private invokeFunction: ((command: string, payload?: any) => Promise<any>) | null = null;

  constructor(options: import('./localClient').LocalApiClientOptions = {}) {
    this.options = options;
    this.sessionId = options.sessionId || null;
    
    // Initialize invoke function
    this.initializeInvokeFunction();
  }

  private async initializeInvokeFunction(): Promise<void> {
    try {
      this.invokeFunction = await getTauriInvoke();
      environmentLog.info('Hybrid API client initialized');
    } catch (error) {
      environmentLog.error('Failed to initialize invoke function:', error);
      this.invokeFunction = this.createWebFallbackInvoke();
    }
  }

  /**
   * Create web fallback invoke function using HTTP API
   */
  private createWebFallbackInvoke() {
    return async (command: string, payload: any = {}) => {
      environmentLog.info('Using web fallback for command:', command);
      
      // Map Tauri commands to HTTP endpoints
      const endpointMap: Record<string, { method: string; path: string }> = {
        'local_auth_login': { method: 'POST', path: '/api/auth/login' },
        'local_auth_logout': { method: 'POST', path: '/api/auth/logout' },
        'local_auth_validate': { method: 'GET', path: '/api/auth/validate' },
        'local_auth_refresh': { method: 'POST', path: '/api/auth/refresh' },
        'local_chat_sessions': { method: 'GET', path: '/api/chat/sessions' },
        'local_chat_create': { method: 'POST', path: '/api/chat/sessions' },
        'local_chat_send_message': { method: 'POST', path: '/api/chat/message' },
        'local_chat_get_messages': { method: 'GET', path: '/api/chat/messages' },
        'local_chat_delete_session': { method: 'DELETE', path: '/api/chat/sessions' },
        'local_documents_list': { method: 'GET', path: '/api/documents' },
        'local_document_upload': { method: 'POST', path: '/api/documents' },
        'local_document_get': { method: 'GET', path: '/api/documents' },
        'local_document_delete': { method: 'DELETE', path: '/api/documents' },
        'local_document_update': { method: 'PUT', path: '/api/documents' },
        'local_research_search': { method: 'POST', path: '/api/research/search' },
        'local_analysis_analyze': { method: 'POST', path: '/api/analysis/analyze' },
        'local_system_health': { method: 'GET', path: '/api/system/health' },
        'local_system_stats': { method: 'GET', path: '/api/system/stats' }
      };

      const endpoint = endpointMap[command];
      if (!endpoint) {
        throw new Error(`Unknown command: ${command}`);
      }

      try {
        const url = `http://localhost:3001${endpoint.path}`;
        const options: RequestInit = {
          method: endpoint.method,
          headers: {
            'Content-Type': 'application/json',
            ...(this.sessionId && { 'Authorization': `Bearer ${this.sessionId}` })
          },
          ...(endpoint.method !== 'GET' && { body: JSON.stringify(payload) })
        };

        const response = await fetch(url, options);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
      } catch (error) {
        environmentLog.error(`Web API call failed for ${command}:`, error);
        throw error;
      }
    };
  }

  private async ensureInvokeReady(): Promise<void> {
    if (!this.invokeFunction) {
      await this.initializeInvokeFunction();
    }
    if (!this.invokeFunction) {
      throw new Error('Neither Tauri nor web API is available');
    }
  }

  // Authentication methods
  async login(credentials: import('./localClient').LocalAuthCredentials): Promise<import('./localClient').LocalAuthResponse> {
    await this.ensureInvokeReady();
    
    try {
      const response = await this.invokeFunction!('local_auth_login', { credentials });

      if (response.success && response.session_id) {
        this.sessionId = response.session_id;
      } else if (response.error) {
        this.handleError(response.error);
      }

      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
      this.handleError(errorMessage);
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  async logout(): Promise<boolean> {
    if (!this.sessionId) return false;

    await this.ensureInvokeReady();
    
    try {
      const result = await this.invokeFunction!('local_auth_logout', {
        sessionId: this.sessionId
      });

      if (result) {
        this.sessionId = null;
      }

      return result;
    } catch (error) {
      this.handleError(error instanceof Error ? error.message : 'Logout failed');
      return false;
    }
  }

  async validateSession(): Promise<boolean> {
    if (!this.sessionId) return false;

    await this.ensureInvokeReady();
    
    try {
      const isValid = await this.invokeFunction!('local_auth_validate', {
        sessionId: this.sessionId
      });

      if (!isValid) {
        this.sessionId = null;
        if (this.options.onAuthExpired) {
          this.options.onAuthExpired();
        }
      }

      return isValid;
    } catch (error) {
      this.handleError(error instanceof Error ? error.message : 'Session validation failed');
      return false;
    }
  }

  // System methods
  async getSystemHealth(): Promise<Record<string, any>> {
    await this.ensureInvokeReady();
    
    try {
      return await this.invokeFunction!('local_system_health');
    } catch (error) {
      this.handleError(error instanceof Error ? error.message : 'Failed to get system health');
      throw error;
    }
  }

  // Utility methods
  isAuthenticated(): boolean {
    return this.sessionId !== null;
  }

  getSessionId(): string | null {
    return this.sessionId;
  }

  setSessionId(sessionId: string | null): void {
    this.sessionId = sessionId;
  }

  // Error handling
  private handleError(error: string): void {
    environmentLog.error('HybridLocalApiClient error:', error);

    // Check for rate limiting
    if (error.includes('Rate limit exceeded')) {
      if (this.options.onRateLimited) {
        this.options.onRateLimited(60);
      }
    }

    // Check for authentication errors
    if (error.includes('Unauthorized') || error.includes('Invalid session')) {
      this.sessionId = null;
      if (this.options.onAuthExpired) {
        this.options.onAuthExpired();
      }
    }

    // General error callback
    if (this.options.onError) {
      this.options.onError(error);
    }
  }

  // Session persistence helpers
  saveSessionToStorage(): void {
    if (this.sessionId && typeof window !== 'undefined') {
      localStorage.setItem('bear_ai_session_id', this.sessionId);
    }
  }

  loadSessionFromStorage(): boolean {
    if (typeof window !== 'undefined') {
      const storedSessionId = localStorage.getItem('bear_ai_session_id');
      if (storedSessionId) {
        this.sessionId = storedSessionId;
        return true;
      }
    }
    return false;
  }

  clearSessionFromStorage(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('bear_ai_session_id');
    }
  }

  /**
   * Get information about the current environment and API mode
   */
  getEnvironmentInfo(): {
    environment: 'tauri' | 'web';
    apiMode: 'desktop' | 'http';
    available: boolean;
  } {
    return {
      environment: isTauriEnvironment() ? 'tauri' : 'web',
      apiMode: isTauriEnvironment() ? 'desktop' : 'http',
      available: this.invokeFunction !== null
    };
  }
}

// Create hybrid singleton instance
export const hybridLocalApiClient = new HybridLocalApiClient({
  onAuthExpired: () => {
    environmentLog.warn('Session expired, please log in again');
    hybridLocalApiClient.clearSessionFromStorage();
  },
  onRateLimited: (retryAfter) => {
    environmentLog.warn(`Rate limited, retry after ${retryAfter} seconds`);
  },
  onError: (error) => {
    environmentLog.error('API Error:', error);
  }
});

// Auto-restore session on module load
if (typeof window !== 'undefined') {
  hybridLocalApiClient.loadSessionFromStorage();
}

// Export convenience methods
export const auth = {
  login: (credentials: import('./localClient').LocalAuthCredentials) => hybridLocalApiClient.login(credentials),
  logout: () => hybridLocalApiClient.logout(),
  validate: () => hybridLocalApiClient.validateSession(),
  isAuthenticated: () => hybridLocalApiClient.isAuthenticated()
};

export const system = {
  health: () => hybridLocalApiClient.getSystemHealth()
};

export default hybridLocalApiClient;