/**
 * Chat session management service with offline sync capabilities
 * Handles session lifecycle, state management, and sync coordination
 */

import { localChatHistoryService, ChatSession, ChatMessage } from './localChatHistory';
import { encryptionService } from './encryption';

// Re-export for easier imports
export type { ChatSession, ChatMessage } from './localChatHistory';

export interface SessionState {
  id: string;
  isActive: boolean;
  isDraft: boolean;
  lastActivity: Date;
  unsavedChanges: boolean;
  syncStatus: 'synced' | 'pending' | 'conflict' | 'offline';
}

export interface SessionManager {
  currentSession: ChatSession | null;
  activeSessions: Map<string, SessionState>;
  offlineQueue: PendingOperation[];
}

export interface PendingOperation {
  id: string;
  type: 'create_session' | 'add_message' | 'update_session' | 'delete_session';
  sessionId: string;
  data: any;
  timestamp: Date;
  retryCount: number;
}

export interface SessionBackup {
  sessionId: string;
  timestamp: Date;
  data: string;
  checksum: string;
}

export class ChatSessionService {
  private static instance: ChatSessionService;
  private sessionManager: SessionManager;
  private autoSaveInterval: ReturnType<typeof setInterval> | null = null;
  private syncInterval: ReturnType<typeof setInterval> | null = null;
  private readonly AUTOSAVE_INTERVAL = 30000; // 30 seconds
  private readonly SYNC_INTERVAL = 60000; // 1 minute
  private readonly MAX_RETRY_COUNT = 3;

  private constructor() {
    this.sessionManager = {
      currentSession: null,
      activeSessions: new Map(),
      offlineQueue: []
    };
  }

  public static getInstance(): ChatSessionService {
    if (!ChatSessionService.instance) {
      ChatSessionService.instance = new ChatSessionService();
    }
    return ChatSessionService.instance;
  }

  /**
   * Initialize session management service
   */
  async initialize(): Promise<void> {
    try {
      // Initialize dependencies
      await localChatHistoryService.initialize();
      await encryptionService.initialize();

      // Load active sessions
      await this.loadActiveSessions();

      // Start autosave and sync intervals
      this.startAutoSave();
      this.startOfflineSync();

      // Logging disabled for production
    } catch (error) {
      // Error logging disabled for production
      throw error;
    }
  }

  /**
   * Create a new chat session
   */
  async createSession(title?: string, metadata?: ChatSession['metadata']): Promise<ChatSession> {
    const sessionTitle = title || `Chat ${new Date().toLocaleDateString()}`;
    
    try {
      const session = await localChatHistoryService.createSession(sessionTitle, metadata);
      
      // Add to active sessions
      this.sessionManager.activeSessions.set(session.id, {
        id: session.id,
        isActive: true,
        isDraft: false,
        lastActivity: new Date(),
        unsavedChanges: false,
        syncStatus: 'synced'
      });

      // Set as current session
      this.sessionManager.currentSession = session;

      await this.persistSessionState();
      return session;
    } catch (error) {
      // Add to offline queue if failed
      const operation: PendingOperation = {
        id: this.generateId(),
        type: 'create_session',
        sessionId: this.generateId(),
        data: { title: sessionTitle, metadata },
        timestamp: new Date(),
        retryCount: 0
      };
      
      this.sessionManager.offlineQueue.push(operation);
      throw error;
    }
  }

  /**
   * Switch to a different session
   */
  async switchSession(sessionId: string): Promise<ChatSession | null> {
    try {
      const sessions = await localChatHistoryService.getSessions();
      const session = sessions.find(s => s.id === sessionId);

      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      // Save current session state
      if (this.sessionManager.currentSession) {
        await this.updateSessionActivity(this.sessionManager.currentSession.id, false);
      }

      // Switch to new session
      this.sessionManager.currentSession = session;
      await this.updateSessionActivity(sessionId, true);

      return session;
    } catch (error) {
      // Error logging disabled for production
      return null;
    }
  }

  /**
   * Add message to current session
   */
  async addMessage(content: string, role: 'user' | 'assistant' | 'system', metadata?: ChatMessage['metadata']): Promise<ChatMessage | null> {
    if (!this.sessionManager.currentSession) {
      throw new Error('No active session');
    }

    try {
      const message = await localChatHistoryService.addMessage({
        sessionId: this.sessionManager.currentSession.id,
        timestamp: new Date(),
        role,
        content,
        metadata
      });

      // Update session state
      await this.updateSessionActivity(this.sessionManager.currentSession.id, true);
      
      return message;
    } catch (error) {
      // Error logging disabled for production
      
      // Add to offline queue
      const operation: PendingOperation = {
        id: this.generateId(),
        type: 'add_message',
        sessionId: this.sessionManager.currentSession.id,
        data: { content, role, metadata },
        timestamp: new Date(),
        retryCount: 0
      };
      
      this.sessionManager.offlineQueue.push(operation);
      return null;
    }
  }

  /**
   * Get all sessions with states
   */
  async getSessionsWithStates(): Promise<Array<ChatSession & { state: SessionState | null }>> {
    const sessions = await localChatHistoryService.getSessions();
    
    return sessions.map(session => ({
      ...session,
      state: this.sessionManager.activeSessions.get(session.id) || null
    }));
  }

  /**
   * Get messages for a session
   */
  async getSessionMessages(sessionId: string): Promise<ChatMessage[]> {
    return localChatHistoryService.getSessionMessages(sessionId);
  }

  /**
   * Update session title or metadata
   */
  async updateSession(sessionId: string, updates: Partial<Pick<ChatSession, 'title' | 'metadata'>>): Promise<boolean> {
    try {
      const sessions = await localChatHistoryService.getSessions();
      const session = sessions.find(s => s.id === sessionId);

      if (!session) {
        throw new Error('Session not found');
      }

      const updatedSession = {
        ...session,
        ...updates,
        updatedAt: new Date()
      };

      // This would require implementing an update method in localChatHistoryService
      // For now, we'll mark it as having unsaved changes
      const sessionState = this.sessionManager.activeSessions.get(sessionId);
      if (sessionState) {
        sessionState.unsavedChanges = true;
        sessionState.syncStatus = 'pending';
      }

      return true;
    } catch (error) {
      // Error logging disabled for production
      return false;
    }
  }

  /**
   * Delete a session
   */
  async deleteSession(sessionId: string): Promise<boolean> {
    try {
      // Remove from active sessions
      this.sessionManager.activeSessions.delete(sessionId);

      // If it's the current session, clear it
      if (this.sessionManager.currentSession?.id === sessionId) {
        this.sessionManager.currentSession = null;
      }

      // This would require implementing a delete method in localChatHistoryService
      // For now, we'll add it to the offline queue
      const operation: PendingOperation = {
        id: this.generateId(),
        type: 'delete_session',
        sessionId,
        data: {},
        timestamp: new Date(),
        retryCount: 0
      };
      
      this.sessionManager.offlineQueue.push(operation);

      await this.persistSessionState();
      return true;
    } catch (error) {
      // Error logging disabled for production
      return false;
    }
  }

  /**
   * Create session backup
   */
  async createSessionBackup(sessionId: string): Promise<SessionBackup> {
    const messages = await this.getSessionMessages(sessionId);
    const sessions = await localChatHistoryService.getSessions();
    const session = sessions.find(s => s.id === sessionId);

    if (!session) {
      throw new Error('Session not found');
    }

    const backupData = {
      session,
      messages,
      timestamp: new Date()
    };

    const data = JSON.stringify(backupData);
    const checksum = await this.calculateChecksum(data);

    return {
      sessionId,
      timestamp: new Date(),
      data,
      checksum
    };
  }

  /**
   * Restore session from backup
   */
  async restoreSessionFromBackup(backup: SessionBackup): Promise<boolean> {
    try {
      // Verify checksum
      const calculatedChecksum = await this.calculateChecksum(backup.data);
      if (calculatedChecksum !== backup.checksum) {
        throw new Error('Backup data integrity check failed');
      }

      const backupData = JSON.parse(backup.data);
      
      // Import session data
      await localChatHistoryService.importChatData(JSON.stringify({
        exportedAt: backup.timestamp,
        version: '1.0',
        sessions: [backupData]
      }));

      return true;
    } catch (error) {
      // Error logging disabled for production
      return false;
    }
  }

  /**
   * Get session activity status
   */
  getSessionState(sessionId: string): SessionState | null {
    return this.sessionManager.activeSessions.get(sessionId) || null;
  }

  /**
   * Get offline queue status
   */
  getOfflineQueueStatus(): {
    pendingOperations: number;
    lastSync: Date | null;
    queueSize: number;
  } {
    return {
      pendingOperations: this.sessionManager.offlineQueue.length,
      lastSync: null, // Would track actual sync times
      queueSize: this.sessionManager.offlineQueue.reduce((size, op) => 
        size + JSON.stringify(op).length, 0)
    };
  }

  /**
   * Force sync offline queue
   */
  async forceSyncOfflineQueue(): Promise<{ succeeded: number; failed: number }> {
    let succeeded = 0;
    let failed = 0;

    const queue = [...this.sessionManager.offlineQueue];
    this.sessionManager.offlineQueue = [];

    for (const operation of queue) {
      try {
        await this.processOfflineOperation(operation);
        succeeded++;
      } catch (error) {
        // Error logging disabled for production
        
        // Retry logic
        if (operation.retryCount < this.MAX_RETRY_COUNT) {
          operation.retryCount++;
          this.sessionManager.offlineQueue.push(operation);
        } else {
          failed++;
        }
      }
    }

    return { succeeded, failed };
  }

  /**
   * Clear all session data
   */
  async clearAllSessions(): Promise<void> {
    try {
      await localChatHistoryService.clearAllData();
      this.sessionManager.currentSession = null;
      this.sessionManager.activeSessions.clear();
      this.sessionManager.offlineQueue = [];
      await this.clearPersistedState();
    } catch (error) {
      // Error logging disabled for production
      throw error;
    }
  }

  /**
   * Get current session
   */
  getCurrentSession(): ChatSession | null {
    return this.sessionManager.currentSession;
  }

  /**
   * Export session data
   */
  async exportSessions(sessionIds?: string[]): Promise<string> {
    return localChatHistoryService.exportChatData(sessionIds);
  }

  /**
   * Import session data
   */
  async importSessions(jsonData: string): Promise<{ imported: number; errors: number }> {
    const result = await localChatHistoryService.importChatData(jsonData);
    
    // Reload active sessions after import
    await this.loadActiveSessions();
    
    return result;
  }

  // Private methods

  private async loadActiveSessions(): Promise<void> {
    try {
      const sessions = await localChatHistoryService.getSessions();
      
      // Load the most recent session as active
      if (sessions.length > 0) {
        const mostRecent = sessions[0]; // Already sorted by updatedAt desc
        this.sessionManager.currentSession = mostRecent;
        
        this.sessionManager.activeSessions.set(mostRecent.id, {
          id: mostRecent.id,
          isActive: true,
          isDraft: false,
          lastActivity: mostRecent.updatedAt,
          unsavedChanges: false,
          syncStatus: 'synced'
        });
      }
    } catch (error) {
      // Error logging disabled for production
    }
  }

  private async updateSessionActivity(sessionId: string, isActive: boolean): Promise<void> {
    const state = this.sessionManager.activeSessions.get(sessionId);
    if (state) {
      state.isActive = isActive;
      state.lastActivity = new Date();
      state.syncStatus = 'pending';
    } else if (isActive) {
      this.sessionManager.activeSessions.set(sessionId, {
        id: sessionId,
        isActive: true,
        isDraft: false,
        lastActivity: new Date(),
        unsavedChanges: false,
        syncStatus: 'pending'
      });
    }

    await this.persistSessionState();
  }

  private startAutoSave(): void {
    if (this.autoSaveInterval !== null) {
      clearInterval(this.autoSaveInterval);
    }

    this.autoSaveInterval = setInterval(async () => {
      await this.persistSessionState();
    }, this.AUTOSAVE_INTERVAL);
  }

  private startOfflineSync(): void {
    if (this.syncInterval !== null) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = setInterval(async () => {
      if (navigator.onLine && this.sessionManager.offlineQueue.length > 0) {
        await this.forceSyncOfflineQueue();
      }
    }, this.SYNC_INTERVAL);
  }

  private async persistSessionState(): Promise<void> {
    try {
      const stateData = {
        currentSessionId: this.sessionManager.currentSession?.id || null,
        activeSessions: Array.from(this.sessionManager.activeSessions.entries()),
        offlineQueue: this.sessionManager.offlineQueue,
        lastPersisted: new Date()
      };

      localStorage.setItem('bear_ai_session_state', JSON.stringify(stateData));
    } catch (error) {
      // Error logging disabled for production
    }
  }

  private async clearPersistedState(): Promise<void> {
    localStorage.removeItem('bear_ai_session_state');
  }

  private async processOfflineOperation(operation: PendingOperation): Promise<void> {
    switch (operation.type) {
      case 'create_session':
        await localChatHistoryService.createSession(
          operation.data.title,
          operation.data.metadata
        );
        break;
      
      case 'add_message':
        await localChatHistoryService.addMessage({
          sessionId: operation.sessionId,
          timestamp: operation.timestamp,
          role: operation.data.role,
          content: operation.data.content,
          metadata: operation.data.metadata
        });
        break;
      
      case 'update_session':
        // Would implement session update logic
        break;
      
      case 'delete_session':
        // Would implement session deletion logic
        break;
    }
  }

  private async calculateChecksum(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Cleanup method to stop intervals
   */
  destroy(): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }

    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }
}

export const chatSessionService = ChatSessionService.getInstance();