// Local API client that replaces all HTTP calls with Tauri invokes
// Uses conditional imports for hybrid web/desktop compatibility

// Simple fallbacks for removed utilities
const getTauriInvoke = async () => null;
const isTauriEnvironment = () => false;
const environmentLog = {
  info: (message: string, ...args: any[]) => console.log(message, ...args),
  error: (message: string, ...args: any[]) => console.error(message, ...args),
  warn: (message: string, ...args: any[]) => console.warn(message, ...args)
};

// Types for local API
export interface LocalAuthCredentials {
  username: string;
  password: string;
}

export interface LocalAuthResponse {
  success: boolean;
  token?: string;
  expires_in?: number;
  session_id?: string;
  error?: string;
}

export interface LocalChatSession {
  id: string;
  title: string;
  category: string;
  created_at: string;
  message_count: number;
  last_activity: string;
}

export interface LocalChatMessage {
  id: string;
  session_id: string;
  content: string;
  role: string;
  timestamp: string;
  metadata?: Record<string, string>;
}

export interface LocalDocument {
  id: string;
  name: string;
  category: string;
  file_size: number;
  created_at: string;
  tags: string[];
  status: string;
  content_type: string;
}

export interface LocalSearchQuery {
  query: string;
  filters?: Record<string, string>;
  limit?: number;
  offset?: number;
}

export interface LocalAnalysisRequest {
  document_id: string;
  analysis_type: string;
  options?: Record<string, string>;
}

export interface LocalApiClientOptions {
  sessionId?: string;
  onAuthExpired?: () => void;
  onRateLimited?: (retryAfter: number) => void;
  onError?: (error: string) => void;
}

/**
 * Local API client that uses Tauri commands exclusively - no external HTTP calls
 * Now with hybrid web/desktop compatibility
 */
export class LocalApiClient {
  private sessionId: string | null = null;
  private options: LocalApiClientOptions;
  private invokeFunction: ((command: string, payload?: any) => Promise<any>) | null = null;

  constructor(options: LocalApiClientOptions = {}) {
    this.options = options;
    this.sessionId = options.sessionId || null;
    this.initializeInvokeFunction();
  }

  private async initializeInvokeFunction(): Promise<void> {
    try {
      this.invokeFunction = await getTauriInvoke();
      environmentLog.info('LocalApiClient initialized with Tauri invoke');
    } catch (error) {
      environmentLog.error('Failed to initialize Tauri invoke:', error);
      this.invokeFunction = null;
    }
  }

  private async ensureInvokeReady(): Promise<void> {
    if (!this.invokeFunction) {
      await this.initializeInvokeFunction();
    }
    if (!this.invokeFunction) {
      throw new Error('Tauri invoke not available');
    }
  }

  // Authentication methods
  async login(credentials: LocalAuthCredentials): Promise<LocalAuthResponse> {
    await this.ensureInvokeReady();
    
    try {
      const response = await this.invokeFunction!('local_auth_login', {
        credentials
      });

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
    if (!this.sessionId) {
      return false;
    }

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
    if (!this.sessionId) {
      return false;
    }

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

  async refreshSession(): Promise<LocalAuthResponse> {
    if (!this.sessionId) {
      return {
        success: false,
        error: 'No active session to refresh'
      };
    }

    await this.ensureInvokeReady();
    
    try {
      const response = await this.invokeFunction!('local_auth_refresh', {
        sessionId: this.sessionId
      });

      if (!response.success) {
        this.sessionId = null;
        if (this.options.onAuthExpired) {
          this.options.onAuthExpired();
        }
      }

      return response;
    } catch (error) {
      this.handleError(error instanceof Error ? error.message : 'Session refresh failed');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Session refresh failed'
      };
    }
  }

  // Chat methods
  async getChatSessions(): Promise<LocalChatSession[]> {
    if (!this.sessionId) {
      throw new Error('Not authenticated');
    }

    await this.ensureInvokeReady();
    
    try {
      return await this.invokeFunction!('local_chat_sessions', {
        sessionId: this.sessionId
      });
    } catch (error) {
      this.handleError(error instanceof Error ? error.message : 'Failed to get chat sessions');
      throw error;
    }
  }

  async createChatSession(title: string, category?: string): Promise<LocalChatSession> {
    if (!this.sessionId) {
      throw new Error('Not authenticated');
    }

    await this.ensureInvokeReady();
    
    try {
      return await this.invokeFunction!('local_chat_create', {
        sessionId: this.sessionId,
        title,
        category
      });
    } catch (error) {
      this.handleError(error instanceof Error ? error.message : 'Failed to create chat session');
      throw error;
    }
  }

  async sendMessage(chatSessionId: string, content: string, role?: string): Promise<LocalChatMessage> {
    if (!this.sessionId) {
      throw new Error('Not authenticated');
    }

    await this.ensureInvokeReady();
    
    try {
      return await this.invokeFunction!('local_chat_send_message', {
        sessionId: this.sessionId,
        chatSessionId,
        content,
        role
      });
    } catch (error) {
      this.handleError(error instanceof Error ? error.message : 'Failed to send message');
      throw error;
    }
  }

  async getChatMessages(
    chatSessionId: string, 
    limit?: number, 
    offset?: number
  ): Promise<LocalChatMessage[]> {
    if (!this.sessionId) {
      throw new Error('Not authenticated');
    }

    await this.ensureInvokeReady();
    
    try {
      return await this.invokeFunction!('local_chat_get_messages', {
        sessionId: this.sessionId,
        chatSessionId,
        limit,
        offset
      });
    } catch (error) {
      this.handleError(error instanceof Error ? error.message : 'Failed to get chat messages');
      throw error;
    }
  }

  async deleteChatSession(chatSessionId: string): Promise<boolean> {
    if (!this.sessionId) {
      throw new Error('Not authenticated');
    }

    await this.ensureInvokeReady();
    
    try {
      return await this.invokeFunction!('local_chat_delete_session', {
        sessionId: this.sessionId,
        chatSessionId
      });
    } catch (error) {
      this.handleError(error instanceof Error ? error.message : 'Failed to delete chat session');
      throw error;
    }
  }

  // Document methods
  async getDocuments(
    category?: string, 
    limit?: number, 
    offset?: number
  ): Promise<LocalDocument[]> {
    if (!this.sessionId) {
      throw new Error('Not authenticated');
    }

    await this.ensureInvokeReady();
    
    try {
      return await this.invokeFunction!('local_documents_list', {
        sessionId: this.sessionId,
        category,
        limit,
        offset
      });
    } catch (error) {
      this.handleError(error instanceof Error ? error.message : 'Failed to get documents');
      throw error;
    }
  }

  async uploadDocument(
    name: string,
    category: string,
    fileSize: number,
    contentType: string,
    tags: string[] = []
  ): Promise<LocalDocument> {
    if (!this.sessionId) {
      throw new Error('Not authenticated');
    }

    await this.ensureInvokeReady();
    
    try {
      return await this.invokeFunction!('local_document_upload', {
        sessionId: this.sessionId,
        name,
        category,
        fileSize,
        contentType,
        tags
      });
    } catch (error) {
      this.handleError(error instanceof Error ? error.message : 'Failed to upload document');
      throw error;
    }
  }

  async getDocument(documentId: string): Promise<LocalDocument | null> {
    if (!this.sessionId) {
      throw new Error('Not authenticated');
    }

    await this.ensureInvokeReady();
    
    try {
      return await this.invokeFunction!('local_document_get', {
        sessionId: this.sessionId,
        documentId
      });
    } catch (error) {
      this.handleError(error instanceof Error ? error.message : 'Failed to get document');
      throw error;
    }
  }

  async deleteDocument(documentId: string): Promise<boolean> {
    if (!this.sessionId) {
      throw new Error('Not authenticated');
    }

    await this.ensureInvokeReady();
    
    try {
      return await this.invokeFunction!('local_document_delete', {
        sessionId: this.sessionId,
        documentId
      });
    } catch (error) {
      this.handleError(error instanceof Error ? error.message : 'Failed to delete document');
      throw error;
    }
  }

  async updateDocument(
    documentId: string,
    updates: {
      name?: string;
      category?: string;
      tags?: string[];
    }
  ): Promise<LocalDocument | null> {
    if (!this.sessionId) {
      throw new Error('Not authenticated');
    }

    await this.ensureInvokeReady();
    
    try {
      return await this.invokeFunction!('local_document_update', {
        sessionId: this.sessionId,
        documentId,
        name: updates.name,
        category: updates.category,
        tags: updates.tags
      });
    } catch (error) {
      this.handleError(error instanceof Error ? error.message : 'Failed to update document');
      throw error;
    }
  }

  // Research methods
  async searchResearch(query: LocalSearchQuery): Promise<Record<string, any>> {
    if (!this.sessionId) {
      throw new Error('Not authenticated');
    }

    await this.ensureInvokeReady();
    
    try {
      return await this.invokeFunction!('local_research_search', {
        sessionId: this.sessionId,
        query
      });
    } catch (error) {
      this.handleError(error instanceof Error ? error.message : 'Research search failed');
      throw error;
    }
  }

  // Analysis methods
  async analyzeDocument(request: LocalAnalysisRequest): Promise<Record<string, any>> {
    if (!this.sessionId) {
      throw new Error('Not authenticated');
    }

    await this.ensureInvokeReady();
    
    try {
      return await this.invokeFunction!('local_analysis_analyze', {
        sessionId: this.sessionId,
        request
      });
    } catch (error) {
      this.handleError(error instanceof Error ? error.message : 'Document analysis failed');
      throw error;
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

  async getSystemStats(): Promise<Record<string, any>> {
    if (!this.sessionId) {
      throw new Error('Not authenticated');
    }

    await this.ensureInvokeReady();
    
    try {
      return await this.invokeFunction!('local_system_stats', {
        sessionId: this.sessionId
      });
    } catch (error) {
      this.handleError(error instanceof Error ? error.message : 'Failed to get system stats');
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
    console.error('LocalApiClient error:', error);

    // Check for rate limiting
    if (error.includes('Rate limit exceeded')) {
      if (this.options.onRateLimited) {
        this.options.onRateLimited(60); // Default 60 seconds
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
}

// Singleton instance
export const localApiClient = new LocalApiClient({
  onAuthExpired: () => {
    console.log('Session expired, please log in again');
    localApiClient.clearSessionFromStorage();
  },
  onRateLimited: (retryAfter) => {
    console.warn(`Rate limited, retry after ${retryAfter} seconds`);
  },
  onError: (error) => {
    console.error('API Error:', error);
  }
});

// Auto-restore session on module load
if (typeof window !== 'undefined') {
  localApiClient.loadSessionFromStorage();
}

// Export convenience methods
export const auth = {
  login: (credentials: LocalAuthCredentials) => localApiClient.login(credentials),
  logout: () => localApiClient.logout(),
  validate: () => localApiClient.validateSession(),
  refresh: () => localApiClient.refreshSession(),
  isAuthenticated: () => localApiClient.isAuthenticated()
};

export const chat = {
  getSessions: () => localApiClient.getChatSessions(),
  create: (title: string, category?: string) => localApiClient.createChatSession(title, category),
  sendMessage: (sessionId: string, content: string, role?: string) => 
    localApiClient.sendMessage(sessionId, content, role),
  getMessages: (sessionId: string, limit?: number, offset?: number) => 
    localApiClient.getChatMessages(sessionId, limit, offset),
  deleteSession: (sessionId: string) => localApiClient.deleteChatSession(sessionId)
};

export const documents = {
  list: (category?: string, limit?: number, offset?: number) => 
    localApiClient.getDocuments(category, limit, offset),
  upload: (name: string, category: string, fileSize: number, contentType: string, tags?: string[]) => 
    localApiClient.uploadDocument(name, category, fileSize, contentType, tags),
  get: (id: string) => localApiClient.getDocument(id),
  delete: (id: string) => localApiClient.deleteDocument(id),
  update: (id: string, updates: any) => localApiClient.updateDocument(id, updates)
};

export const research = {
  search: (query: LocalSearchQuery) => localApiClient.searchResearch(query)
};

export const analysis = {
  analyze: (request: LocalAnalysisRequest) => localApiClient.analyzeDocument(request)
};

export const system = {
  health: () => localApiClient.getSystemHealth(),
  stats: () => localApiClient.getSystemStats()
};

export default localApiClient;