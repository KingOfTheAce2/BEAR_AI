// Local API Registry - Central hub for all localhost-only operations
// This completely replaces HTTP-based API infrastructure

// Import all local services
import { localApiClient } from './localClient';
import { localAuthService, auth as localAuth } from './routes/localAuth';
import { localChatService, chat as localChat } from './routes/localChat';
import { localDocumentService, documents as localDocuments } from './routes/localDocuments';
import { localResearchService, research as localResearch } from './routes/localResearch';
import { localAnalysisService, analysis as localAnalysis } from './routes/localAnalysis';
import { localApiServer } from './localServer';

/**
 * Local API Registry - Centralized management of localhost-only API services
 * 
 * This registry completely replaces traditional HTTP API infrastructure with:
 * - Tauri invoke commands for backend operations
 * - Local WebSocket server for real-time communication
 * - Local authentication without external services
 * - Local data storage and processing
 * - Zero external HTTP dependencies
 */
export class LocalApiRegistry {
  private static instance: LocalApiRegistry;
  private initialized = false;
  private services: Map<string, any> = new Map();

  private constructor() {
    this.registerServices();
  }

  static getInstance(): LocalApiRegistry {
    if (!LocalApiRegistry.instance) {
      LocalApiRegistry.instance = new LocalApiRegistry();
    }
    return LocalApiRegistry.instance;
  }

  /**
   * Initialize the local API system
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('Local API Registry already initialized');
      return;
    }

    try {
      console.log('🚀 Initializing Local API Registry...');

      // Start local WebSocket server for real-time communication
      await localApiServer.start();
      console.log('✅ Local WebSocket server started');

      // Restore any persisted authentication session
      if (localApiClient.loadSessionFromStorage()) {
        const isValid = await localApiClient.validateSession();
        if (isValid) {
          console.log('✅ Restored authentication session');
        } else {
          localApiClient.clearSessionFromStorage();
          console.log('🧹 Cleared invalid session');
        }
      }

      // Mark as initialized
      this.initialized = true;
      console.log('🎉 Local API Registry initialized successfully');

      // Log system status
      await this.logSystemStatus();

    } catch (error) {
      console.error('❌ Failed to initialize Local API Registry:', error);
      throw error;
    }
  }

  /**
   * Register all local services
   */
  private registerServices(): void {
    // Core API client
    this.services.set('client', localApiClient);
    this.services.set('server', localApiServer);

    // Service instances
    this.services.set('authService', localAuthService);
    this.services.set('chatService', localChatService);
    this.services.set('documentService', localDocumentService);
    this.services.set('researchService', localResearchService);
    this.services.set('analysisService', localAnalysisService);

    // Convenience APIs (matches HTTP API interface)
    this.services.set('auth', localAuth);
    this.services.set('chat', localChat);
    this.services.set('documents', localDocuments);
    this.services.set('research', localResearch);
    this.services.set('analysis', localAnalysis);

    console.log(`📋 Registered ${this.services.size} local services`);
  }

  /**
   * Get a registered service
   */
  getService<T = any>(serviceName: string): T {
    const service = this.services.get(serviceName);
    if (!service) {
      throw new Error(`Service '${serviceName}' not found in local registry`);
    }
    return service;
  }

  /**
   * Check if system is ready
   */
  isReady(): boolean {
    return this.initialized;
  }

  /**
   * Get system health status
   */
  async getHealthStatus(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    services: Record<string, {
      status: 'up' | 'down';
      response_time?: number;
    }>;
    local_only: boolean;
    timestamp: string;
  }> {
    const startTime = Date.now();
    const serviceStatuses: Record<string, { status: 'up' | 'down'; response_time?: number }> = {};

    // Test core services
    try {
      // Test authentication service
      const authStart = Date.now();
      const authStatus = localAuth.isAuthenticated();
      serviceStatuses.auth = {
        status: 'up',
        response_time: Date.now() - authStart
      };
    } catch {
      serviceStatuses.auth = { status: 'down' };
    }

    try {
      // Test system health via Tauri command
      const systemStart = Date.now();
      await localApiClient.getSystemHealth();
      serviceStatuses.system = {
        status: 'up',
        response_time: Date.now() - systemStart
      };
    } catch {
      serviceStatuses.system = { status: 'down' };
    }

    try {
      // Test WebSocket server
      const serverStatus = localApiServer.getStatus();
      serviceStatuses.websocket = {
        status: serverStatus.running ? 'up' : 'down'
      };
    } catch {
      serviceStatuses.websocket = { status: 'down' };
    }

    // Determine overall status
    const downServices = Object.values(serviceStatuses).filter(s => s.status === 'down').length;
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy';
    
    if (downServices === 0) {
      overallStatus = 'healthy';
    } else if (downServices < Object.keys(serviceStatuses).length / 2) {
      overallStatus = 'degraded';
    } else {
      overallStatus = 'unhealthy';
    }

    return {
      status: overallStatus,
      services: serviceStatuses,
      local_only: true,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Log current system status
   */
  private async logSystemStatus(): Promise<void> {
    try {
      const health = await this.getHealthStatus();
      const serverStatus = localApiServer.getStatus();
      
      console.log('📊 Local API System Status:');
      console.log(`   Overall: ${health.status}`);
      console.log(`   WebSocket: ${serverStatus.running ? 'Running' : 'Stopped'} (Port ${serverStatus.port})`);
      console.log(`   Clients: ${serverStatus.clientCount}`);
      console.log(`   Sessions: ${serverStatus.sessionCount}`);
      console.log(`   Services: ${Object.keys(health.services).length} registered`);
      console.log(`   Mode: 100% Local Processing`);
    } catch (error) {
      console.error('Failed to get system status:', error);
    }
  }

  /**
   * Shutdown the local API system
   */
  async shutdown(): Promise<void> {
    try {
      console.log('🔄 Shutting down Local API Registry...');

      // Stop WebSocket server
      await localApiServer.stop();
      console.log('✅ WebSocket server stopped');

      // Clear any active sessions
      if (localApiClient.isAuthenticated()) {
        await localApiClient.logout();
        console.log('✅ Cleared active sessions');
      }

      // Clear services
      this.services.clear();
      this.initialized = false;

      console.log('🏁 Local API Registry shutdown complete');
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
    }
  }

  /**
   * Get API documentation for local services
   */
  getApiDocumentation(): {
    title: string;
    version: string;
    description: string;
    local_only: boolean;
    endpoints: Array<{
      service: string;
      methods: Array<{
        name: string;
        description: string;
        parameters?: Array<{
          name: string;
          type: string;
          required: boolean;
        }>;
        returns: string;
      }>;
    }>;
  } {
    return {
      title: 'BEAR AI Local API',
      version: '1.0.0',
      description: 'Localhost-only API for BEAR AI Legal Assistant - Zero external dependencies',
      local_only: true,
      endpoints: [
        {
          service: 'authentication',
          methods: [
            {
              name: 'login',
              description: 'Authenticate user with local credentials',
              parameters: [
                { name: 'username', type: 'string', required: true },
                { name: 'password', type: 'string', required: true }
              ],
              returns: 'AuthResponse'
            },
            {
              name: 'logout',
              description: 'End user session',
              returns: 'boolean'
            },
            {
              name: 'validateSession',
              description: 'Check if current session is valid',
              returns: 'boolean'
            }
          ]
        },
        {
          service: 'chat',
          methods: [
            {
              name: 'getSessions',
              description: 'Get all chat sessions for user',
              returns: 'LocalChatSession[]'
            },
            {
              name: 'createSession',
              description: 'Create new chat session',
              parameters: [
                { name: 'title', type: 'string', required: true },
                { name: 'category', type: 'string', required: false }
              ],
              returns: 'LocalChatSession'
            },
            {
              name: 'sendMessage',
              description: 'Send message in chat session',
              parameters: [
                { name: 'sessionId', type: 'string', required: true },
                { name: 'content', type: 'string', required: true }
              ],
              returns: 'MessageResponse'
            }
          ]
        },
        {
          service: 'documents',
          methods: [
            {
              name: 'list',
              description: 'Get all documents for user',
              parameters: [
                { name: 'category', type: 'string', required: false },
                { name: 'limit', type: 'number', required: false }
              ],
              returns: 'LocalDocument[]'
            },
            {
              name: 'upload',
              description: 'Upload new document',
              parameters: [
                { name: 'name', type: 'string', required: true },
                { name: 'category', type: 'string', required: true }
              ],
              returns: 'LocalDocument'
            }
          ]
        },
        {
          service: 'research',
          methods: [
            {
              name: 'search',
              description: 'Search local legal database',
              parameters: [
                { name: 'query', type: 'LocalSearchQuery', required: true }
              ],
              returns: 'SearchResults'
            }
          ]
        },
        {
          service: 'analysis',
          methods: [
            {
              name: 'analyze',
              description: 'Analyze document locally',
              parameters: [
                { name: 'request', type: 'LocalAnalysisRequest', required: true }
              ],
              returns: 'AnalysisResult'
            }
          ]
        }
      ]
    };
  }
}

// Export singleton instance
export const localApiRegistry = LocalApiRegistry.getInstance();

// Export all services for easy access
export {
  localApiClient,
  localApiServer,
  localAuthService,
  localChatService,
  localDocumentService,
  localResearchService,
  localAnalysisService,
  // Convenience APIs
  localAuth as auth,
  localChat as chat,
  localDocuments as documents,
  localResearch as research,
  localAnalysis as analysis
};

// Export API interface that matches HTTP API structure
export const api = {
  // System
  health: () => localApiRegistry.getHealthStatus(),
  initialize: () => localApiRegistry.initialize(),
  shutdown: () => localApiRegistry.shutdown(),
  documentation: () => localApiRegistry.getApiDocumentation(),
  
  // Services
  auth: localAuth,
  chat: localChat,
  documents: localDocuments,
  research: localResearch,
  analysis: localAnalysis,
  
  // Client utilities
  client: localApiClient,
  server: localApiServer,
  registry: localApiRegistry
};

// Auto-initialize when imported in browser environment
if (typeof window !== 'undefined') {
  // Initialize after a short delay to allow Tauri to be ready
  setTimeout(() => {
    localApiRegistry.initialize().catch(console.error);
  }, 100);
}

export default localApiRegistry;