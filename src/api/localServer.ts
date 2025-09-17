// Local WebSocket server for BEAR AI - localhost-only operation
import { WebSocketServer, WebSocket } from 'ws';
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

// Local API types
export interface LocalApiRequest {
  id: string;
  command: string;
  params?: Record<string, any>;
  timestamp: number;
}

export interface LocalApiResponse {
  id: string;
  success: boolean;
  data?: any;
  error?: string;
  timestamp: number;
}

export interface LocalSession {
  id: string;
  clientId: string;
  createdAt: number;
  lastActivity: number;
  authenticated: boolean;
}

export class LocalApiServer extends EventEmitter {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, WebSocket> = new Map();
  private sessions: Map<string, LocalSession> = new Map();
  private rateLimitMap: Map<string, number[]> = new Map();
  private port: number;

  constructor(port: number = 8080) {
    super();
    this.port = port;
  }

  // Start the local WebSocket server
  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.wss = new WebSocketServer({ 
          port: this.port,
          host: '127.0.0.1' // Localhost only
        });

        this.wss.on('connection', (ws: WebSocket, req) => {
          const clientId = uuidv4();
          this.clients.set(clientId, ws);

          // Create session
          const session: LocalSession = {
            id: uuidv4(),
            clientId,
            createdAt: Date.now(),
            lastActivity: Date.now(),
            authenticated: false
          };
          this.sessions.set(clientId, session);

          console.log(`Local client connected: ${clientId}`);

          ws.on('message', async (data: any) => {
            try {
              const request: LocalApiRequest = JSON.parse(data.toString());
              const response = await this.handleRequest(clientId, request);
              ws.send(JSON.stringify(response));
            } catch (error) {
              const errorResponse: LocalApiResponse = {
                id: uuidv4(),
                success: false,
                error: 'Invalid request format',
                timestamp: Date.now()
              };
              ws.send(JSON.stringify(errorResponse));
            }
          });

          ws.on('close', () => {
            this.clients.delete(clientId);
            this.sessions.delete(clientId);
            console.log(`Local client disconnected: ${clientId}`);
          });

          ws.on('error', (error) => {
            console.error(`WebSocket error for client ${clientId}:`, error);
            this.clients.delete(clientId);
            this.sessions.delete(clientId);
          });
        });

        this.wss.on('listening', () => {
          console.log(`Local API server listening on ws://127.0.0.1:${this.port}`);
          resolve();
        });

        this.wss.on('error', (error) => {
          console.error('Local API server error:', error);
          reject(error);
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  // Stop the server
  stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.wss) {
        this.wss.close(() => {
          console.log('Local API server stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  // Handle incoming requests
  private async handleRequest(clientId: string, request: LocalApiRequest): Promise<LocalApiResponse> {
    const session = this.sessions.get(clientId);
    if (!session) {
      return {
        id: request.id,
        success: false,
        error: 'Invalid session',
        timestamp: Date.now()
      };
    }

    // Update session activity
    session.lastActivity = Date.now();

    // Rate limiting
    if (!this.checkRateLimit(clientId)) {
      return {
        id: request.id,
        success: false,
        error: 'Rate limit exceeded',
        timestamp: Date.now()
      };
    }

    try {
      // Route to appropriate handler
      const data = await this.routeCommand(clientId, request.command, request.params);
      return {
        id: request.id,
        success: true,
        data,
        timestamp: Date.now()
      };
    } catch (error) {
      return {
        id: request.id,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now()
      };
    }
  }

  // Route commands to handlers
  private async routeCommand(clientId: string, command: string, params?: Record<string, any>): Promise<any> {
    const session = this.sessions.get(clientId);
    if (!session) {
      throw new Error('Invalid session');
    }

    // Authentication required for most commands
    if (!session.authenticated && !this.isPublicCommand(command)) {
      throw new Error('Authentication required');
    }

    switch (command) {
      case 'auth.login':
        return this.handleLogin(clientId, params);
      case 'auth.logout':
        return this.handleLogout(clientId);
      case 'auth.refresh':
        return this.handleRefresh(clientId, params);
      case 'system.health':
        return this.handleSystemHealth();
      case 'chat.sessions':
        return this.handleChatSessions(clientId, params);
      case 'chat.create':
        return this.handleCreateChat(clientId, params);
      case 'chat.send':
        return this.handleSendMessage(clientId, params);
      case 'documents.list':
        return this.handleDocumentsList(clientId, params);
      case 'documents.upload':
        return this.handleDocumentUpload(clientId, params);
      case 'documents.get':
        return this.handleDocumentGet(clientId, params);
      case 'documents.delete':
        return this.handleDocumentDelete(clientId, params);
      case 'research.search':
        return this.handleResearchSearch(clientId, params);
      case 'analysis.analyze':
        return this.handleAnalysis(clientId, params);
      default:
        throw new Error(`Unknown command: ${command}`);
    }
  }

  // Check if command is public (no auth required)
  private isPublicCommand(command: string): boolean {
    const publicCommands = [
      'auth.login',
      'system.health'
    ];
    return publicCommands.includes(command);
  }

  // Rate limiting check
  private checkRateLimit(clientId: string, limit: number = 100, windowMs: number = 60000): boolean {
    const now = Date.now();
    const requests = this.rateLimitMap.get(clientId) || [];
    
    // Remove old requests outside the window
    const validRequests = requests.filter(time => now - time < windowMs);
    
    if (validRequests.length >= limit) {
      return false;
    }
    
    // Add current request
    validRequests.push(now);
    this.rateLimitMap.set(clientId, validRequests);
    
    return true;
  }

  // Authentication handlers
  private async handleLogin(clientId: string, params?: Record<string, any>): Promise<any> {
    const { username, password } = params || {};
    
    // Local authentication - simple demo implementation
    if (username === 'admin' && password === 'admin') {
      const session = this.sessions.get(clientId);
      if (session) {
        session.authenticated = true;
        return {
          success: true,
          token: `local_${clientId}_${Date.now()}`,
          expiresIn: 3600000 // 1 hour
        };
      }
    }
    
    throw new Error('Invalid credentials');
  }

  private async handleLogout(clientId: string): Promise<any> {
    const session = this.sessions.get(clientId);
    if (session) {
      session.authenticated = false;
      return { success: true };
    }
    throw new Error('No active session');
  }

  private async handleRefresh(clientId: string, params?: Record<string, any>): Promise<any> {
    const session = this.sessions.get(clientId);
    if (session && session.authenticated) {
      return {
        success: true,
        token: `local_${clientId}_${Date.now()}`,
        expiresIn: 3600000
      };
    }
    throw new Error('Invalid session for refresh');
  }

  // System handlers
  private async handleSystemHealth(): Promise<any> {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '1.0.0-local',
      local: true
    };
  }

  // Chat handlers (placeholder implementations)
  private async handleChatSessions(clientId: string, params?: Record<string, any>): Promise<any> {
    return {
      sessions: [],
      total: 0
    };
  }

  private async handleCreateChat(clientId: string, params?: Record<string, any>): Promise<any> {
    const { title, category } = params || {};
    return {
      id: uuidv4(),
      title: title || 'New Chat',
      category: category || 'general',
      createdAt: new Date().toISOString(),
      messages: []
    };
  }

  private async handleSendMessage(clientId: string, params?: Record<string, any>): Promise<any> {
    const { sessionId, content } = params || {};
    return {
      id: uuidv4(),
      sessionId,
      content,
      timestamp: new Date().toISOString(),
      type: 'user'
    };
  }

  // Document handlers (placeholder implementations)
  private async handleDocumentsList(clientId: string, params?: Record<string, any>): Promise<any> {
    return {
      documents: [],
      total: 0,
      page: 1
    };
  }

  private async handleDocumentUpload(clientId: string, params?: Record<string, any>): Promise<any> {
    const { fileName, fileSize, category } = params || {};
    return {
      id: uuidv4(),
      fileName,
      fileSize,
      category,
      uploadedAt: new Date().toISOString(),
      status: 'uploaded'
    };
  }

  private async handleDocumentGet(clientId: string, params?: Record<string, any>): Promise<any> {
    const { documentId } = params || {};
    return {
      id: documentId,
      fileName: 'document.pdf',
      category: 'general',
      createdAt: new Date().toISOString(),
      content: 'Document content placeholder'
    };
  }

  private async handleDocumentDelete(clientId: string, params?: Record<string, any>): Promise<any> {
    const { documentId } = params || {};
    return {
      success: true,
      deletedId: documentId
    };
  }

  // Research handlers (placeholder implementations)
  private async handleResearchSearch(clientId: string, params?: Record<string, any>): Promise<any> {
    const { query, filters } = params || {};
    return {
      query,
      results: [],
      total: 0,
      processingTime: 50
    };
  }

  // Analysis handlers (placeholder implementations)
  private async handleAnalysis(clientId: string, params?: Record<string, any>): Promise<any> {
    const { documentId, type } = params || {};
    return {
      id: uuidv4(),
      documentId,
      type,
      result: {
        summary: 'Analysis result placeholder',
        confidence: 0.95
      },
      createdAt: new Date().toISOString(),
      processingTime: 1200
    };
  }

  // Broadcast message to all connected clients
  broadcast(message: any): void {
    const data = JSON.stringify(message);
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  }

  // Send message to specific client
  sendToClient(clientId: string, message: any): boolean {
    const client = this.clients.get(clientId);
    if (client && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
      return true;
    }
    return false;
  }

  // Get server status
  getStatus() {
    return {
      running: this.wss !== null,
      port: this.port,
      clientCount: this.clients.size,
      sessionCount: this.sessions.size
    };
  }
}

// Singleton instance for the local API server
export const localApiServer = new LocalApiServer(8080);

// Auto-start server when module is imported
if (typeof window === 'undefined') {
  localApiServer.start().catch(console.error);
}