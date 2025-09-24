/**
 * Local chat history service with IndexedDB storage and encryption
 * Provides offline-first chat data management with privacy focus
 */

import { encryptionService, EncryptedData } from './encryption';

export interface ChatMessage {
  id: string;
  sessionId: string;
  timestamp: Date;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: {
    tokens?: number;
    model?: string;
    temperature?: number;
    attachments?: string[];
    error?: boolean;
    offline?: boolean;
  };
  isEncrypted: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  messageCount: number;
  isActive: boolean;
  metadata?: {
    model?: string;
    systemPrompt?: string;
    tags?: string[];
  };
}

export interface ChatSearchResult {
  message: ChatMessage;
  session: ChatSession;
  score: number;
  highlights: string[];
}

export interface DataRetentionPolicy {
  maxAgeInDays: number;
  maxMessages: number;
  autoCleanup: boolean;
  preserveFavorites: boolean;
}

export class LocalChatHistoryService {
  private static instance: LocalChatHistoryService;
  private db: IDBDatabase | null = null;
  private readonly DB_NAME = 'BearAI_ChatHistory';
  private readonly DB_VERSION = 1;
  private retentionPolicy: DataRetentionPolicy = {
    maxAgeInDays: 365,
    maxMessages: 10000,
    autoCleanup: true,
    preserveFavorites: true
  };

  private constructor() {}

  public static getInstance(): LocalChatHistoryService {
    if (!LocalChatHistoryService.instance) {
      LocalChatHistoryService.instance = new LocalChatHistoryService();
    }
    return LocalChatHistoryService.instance;
  }

  /**
   * Initialize the IndexedDB database
   */
  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onerror = () => {
        // Error logging disabled for production
        reject(new Error('Failed to initialize chat history database'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        // Logging disabled for production
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        this.createSchema(db);
      };
    });
  }

  /**
   * Create database schema
   */
  private createSchema(db: IDBDatabase): void {
    // Chat sessions store
    const sessionsStore = db.createObjectStore('sessions', { keyPath: 'id' });
    sessionsStore.createIndex('createdAt', 'createdAt');
    sessionsStore.createIndex('updatedAt', 'updatedAt');
    sessionsStore.createIndex('isActive', 'isActive');

    // Chat messages store
    const messagesStore = db.createObjectStore('messages', { keyPath: 'id' });
    messagesStore.createIndex('sessionId', 'sessionId');
    messagesStore.createIndex('timestamp', 'timestamp');
    messagesStore.createIndex('role', 'role');

    // Search index for full-text search
    const searchStore = db.createObjectStore('searchIndex', { keyPath: 'messageId' });
    searchStore.createIndex('sessionId', 'sessionId');
    searchStore.createIndex('terms', 'terms', { multiEntry: true });

    // Metadata store for app settings
    db.createObjectStore('metadata', { keyPath: 'key' });
  }

  /**
   * Create a new chat session
   */
  async createSession(title: string, metadata?: ChatSession['metadata']): Promise<ChatSession> {
    if (!this.db) throw new Error('Database not initialized');

    const session: ChatSession = {
      id: this.generateId(),
      title,
      createdAt: new Date(),
      updatedAt: new Date(),
      messageCount: 0,
      isActive: true,
      metadata
    };

    const transaction = this.db.transaction(['sessions'], 'readwrite');
    const store = transaction.objectStore('sessions');
    
    await new Promise<void>((resolve, reject) => {
      const request = store.add(session);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    return session;
  }

  /**
   * Add a message to a session with encryption
   */
  async addMessage(message: Omit<ChatMessage, 'id' | 'isEncrypted'>): Promise<ChatMessage> {
    if (!this.db) throw new Error('Database not initialized');

    let content = message.content;
    let isEncrypted = false;

    // Encrypt sensitive content
    if (encryptionService.isInitialized() && message.role !== 'system') {
      try {
        const encryptedData = await encryptionService.encrypt(message.content);
        content = JSON.stringify({
          data: Array.from(new Uint8Array(encryptedData.data)),
          iv: Array.from(encryptedData.iv),
          salt: Array.from(encryptedData.salt)
        });
        isEncrypted = true;
      } catch (error) {
        // Warning logging disabled for production
      }
    }

    const chatMessage: ChatMessage = {
      id: this.generateId(),
      ...message,
      content,
      isEncrypted
    };

    const transaction = this.db.transaction(['messages', 'sessions', 'searchIndex'], 'readwrite');
    
    // Store message
    const messagesStore = transaction.objectStore('messages');
    await new Promise<void>((resolve, reject) => {
      const request = messagesStore.add(chatMessage);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    // Update session
    await this.updateSessionMessageCount(message.sessionId, transaction);

    // Add to search index
    await this.addToSearchIndex(chatMessage, transaction);

    return chatMessage;
  }

  /**
   * Retrieve messages for a session with decryption
   */
  async getSessionMessages(sessionId: string): Promise<ChatMessage[]> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['messages'], 'readonly');
    const store = transaction.objectStore('messages');
    const index = store.index('sessionId');

    const messages = await new Promise<ChatMessage[]>((resolve, reject) => {
      const request = index.getAll(sessionId);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    // Decrypt encrypted messages
    for (const message of messages) {
      if (message.isEncrypted && encryptionService.isInitialized()) {
        try {
          const encryptedData = JSON.parse(message.content);
          const decryptedContent = await encryptionService.decrypt({
            data: new Uint8Array(encryptedData.data).buffer,
            iv: new Uint8Array(encryptedData.iv),
            salt: new Uint8Array(encryptedData.salt)
          });
          message.content = decryptedContent;
        } catch (error) {
          // Error logging disabled for production
          message.content = '[Encrypted content - decryption failed]';
        }
      }
    }

    return messages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  /**
   * Get all chat sessions
   */
  async getSessions(): Promise<ChatSession[]> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['sessions'], 'readonly');
    const store = transaction.objectStore('sessions');

    return new Promise<ChatSession[]>((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const sessions = request.result.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
        resolve(sessions);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Search chat history locally
   */
  async searchChats(query: string, sessionId?: string): Promise<ChatSearchResult[]> {
    if (!this.db) throw new Error('Database not initialized');

    const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 2);
    const transaction = this.db.transaction(['searchIndex', 'messages', 'sessions'], 'readonly');
    const searchStore = transaction.objectStore('searchIndex');
    const messagesStore = transaction.objectStore('messages');
    const sessionsStore = transaction.objectStore('sessions');

    const results: ChatSearchResult[] = [];
    const termsIndex = searchStore.index('terms');

    for (const term of searchTerms) {
      const request = termsIndex.getAll(term);
      const searchResults = await new Promise<any[]>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      for (const searchResult of searchResults) {
        if (sessionId && searchResult.sessionId !== sessionId) continue;

        const message = await new Promise<ChatMessage>((resolve, reject) => {
          const msgRequest = messagesStore.get(searchResult.messageId);
          msgRequest.onsuccess = () => resolve(msgRequest.result);
          msgRequest.onerror = () => reject(msgRequest.error);
        });

        const session = await new Promise<ChatSession>((resolve, reject) => {
          const sessRequest = sessionsStore.get(message.sessionId);
          sessRequest.onsuccess = () => resolve(sessRequest.result);
          sessRequest.onerror = () => reject(sessRequest.error);
        });

        // Decrypt message if encrypted
        if (message.isEncrypted && encryptionService.isInitialized()) {
          try {
            const encryptedData = JSON.parse(message.content);
            message.content = await encryptionService.decrypt({
              data: new Uint8Array(encryptedData.data).buffer,
              iv: new Uint8Array(encryptedData.iv),
              salt: new Uint8Array(encryptedData.salt)
            });
          } catch (error) {
            // Error logging disabled for production
            continue;
          }
        }

        const score = this.calculateSearchScore(message.content, query);
        const highlights = this.generateHighlights(message.content, query);

        results.push({
          message,
          session,
          score,
          highlights
        });
      }
    }

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, 50); // Limit results
  }

  /**
   * Export chat data for backup/portability
   */
  async exportChatData(sessionIds?: string[]): Promise<string> {
    if (!this.db) throw new Error('Database not initialized');

    const sessions = await this.getSessions();
    const filteredSessions = sessionIds 
      ? sessions.filter(s => sessionIds.includes(s.id))
      : sessions;

    const exportData = {
      exportedAt: new Date().toISOString(),
      version: '1.0',
      sessions: [],
      retentionPolicy: this.retentionPolicy
    };

    for (const session of filteredSessions) {
      const messages = await this.getSessionMessages(session.id);
      (exportData.sessions as any[]).push({
        session,
        messages
      });
    }

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Import chat data from backup
   */
  async importChatData(jsonData: string): Promise<{ imported: number, errors: number }> {
    if (!this.db) throw new Error('Database not initialized');

    const importData = JSON.parse(jsonData);
    let imported = 0;
    let errors = 0;

    for (const sessionData of importData.sessions) {
      try {
        // Create session
        const transaction = this.db.transaction(['sessions', 'messages', 'searchIndex'], 'readwrite');
        const sessionsStore = transaction.objectStore('sessions');
        await new Promise<void>((resolve, reject) => {
          const request = sessionsStore.add(sessionData.session);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });

        // Add messages
        const messagesStore = transaction.objectStore('messages');
        for (const message of sessionData.messages) {
          await new Promise<void>((resolve, reject) => {
            const request = messagesStore.add(message);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
          });
          
          await this.addToSearchIndex(message, transaction);
        }

        imported++;
      } catch (error) {
        // Error logging disabled for production
        errors++;
      }
    }

    return { imported, errors };
  }

  /**
   * Apply data retention policies
   */
  async applyRetentionPolicies(): Promise<void> {
    if (!this.db || !this.retentionPolicy.autoCleanup) return;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.retentionPolicy.maxAgeInDays);

    const transaction = this.db.transaction(['messages', 'sessions', 'searchIndex'], 'readwrite');
    const messagesStore = transaction.objectStore('messages');
    const sessionsStore = transaction.objectStore('sessions');
    const searchStore = transaction.objectStore('searchIndex');

    // Get old messages
    const messagesIndex = messagesStore.index('timestamp');
    const oldMessages = await new Promise<ChatMessage[]>((resolve, reject) => {
      const request = messagesIndex.getAll(IDBKeyRange.upperBound(cutoffDate));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    // Delete old messages and search index entries
    for (const message of oldMessages) {
      messagesStore.delete(message.id);
      searchStore.delete(message.id);
    }

    // Update session message counts or delete empty sessions
    const sessions = await this.getSessions();
    for (const session of sessions) {
      const remainingMessages = await this.getSessionMessages(session.id);
      if (remainingMessages.length === 0) {
        sessionsStore.delete(session.id);
      } else {
        session.messageCount = remainingMessages.length;
        session.updatedAt = new Date();
        sessionsStore.put(session);
      }
    }
  }

  /**
   * Clear all chat data
   */
  async clearAllData(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['messages', 'sessions', 'searchIndex', 'metadata'], 'readwrite');
    
    const stores = ['messages', 'sessions', 'searchIndex', 'metadata'];
    for (const storeName of stores) {
      const store = transaction.objectStore(storeName);
      store.clear();
    }

    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<{
    totalSessions: number;
    totalMessages: number;
    oldestMessage: Date | null;
    newestMessage: Date | null;
    estimatedSize: number;
  }> {
    if (!this.db) throw new Error('Database not initialized');

    const sessions = await this.getSessions();
    let totalMessages = 0;
    let oldestMessage: Date | null = null;
    let newestMessage: Date | null = null;

    const transaction = this.db.transaction(['messages'], 'readonly');
    const store = transaction.objectStore('messages');
    const allMessages = await new Promise<ChatMessage[]>((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    totalMessages = allMessages.length;

    if (allMessages.length > 0) {
      const dates = allMessages.map(m => m.timestamp).sort((a, b) => a.getTime() - b.getTime());
      oldestMessage = dates[0];
      newestMessage = dates[dates.length - 1];
    }

    // Rough size estimation
    const estimatedSize = JSON.stringify({ sessions, messages: allMessages }).length;

    return {
      totalSessions: sessions.length,
      totalMessages,
      oldestMessage,
      newestMessage,
      estimatedSize
    };
  }

  // Helper methods

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private async updateSessionMessageCount(sessionId: string, transaction: IDBTransaction): Promise<void> {
    const sessionsStore = transaction.objectStore('sessions');
    const session = await new Promise<ChatSession>((resolve, reject) => {
      const request = sessionsStore.get(sessionId);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    if (session) {
      session.messageCount++;
      session.updatedAt = new Date();
      sessionsStore.put(session);
    }
  }

  private async addToSearchIndex(message: ChatMessage, transaction: IDBTransaction): Promise<void> {
    if (message.role === 'system' || message.isEncrypted) return;

    const searchStore = transaction.objectStore('searchIndex');
    const terms = this.extractSearchTerms(message.content);

    const searchEntry = {
      messageId: message.id,
      sessionId: message.sessionId,
      terms
    };

    searchStore.put(searchEntry);
  }

  private extractSearchTerms(content: string): string[] {
    return content
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(term => term.length > 2)
      .slice(0, 50); // Limit terms per message
  }

  private calculateSearchScore(content: string, query: string): number {
    const contentLower = content.toLowerCase();
    const queryLower = query.toLowerCase();
    
    // Exact match gets highest score
    if (contentLower.includes(queryLower)) {
      return 1.0;
    }

    // Word matching
    const queryWords = queryLower.split(' ');
    const matchedWords = queryWords.filter(word => contentLower.includes(word));
    
    return matchedWords.length / queryWords.length;
  }

  private generateHighlights(content: string, query: string): string[] {
    const queryWords = query.toLowerCase().split(' ');
    const highlights: string[] = [];
    
    for (const word of queryWords) {
      const regex = new RegExp(`(.{0,30})(${word})(.{0,30})`, 'gi');
      const matches = content.match(regex);
      if (matches) {
        highlights.push(...matches.slice(0, 3)); // Limit highlights
      }
    }
    
    return highlights;
  }

  /**
   * Set data retention policy
   */
  setRetentionPolicy(policy: Partial<DataRetentionPolicy>): void {
    this.retentionPolicy = { ...this.retentionPolicy, ...policy };
  }

  /**
   * Get current retention policy
   */
  getRetentionPolicy(): DataRetentionPolicy {
    return { ...this.retentionPolicy };
  }
}

export const localChatHistoryService = LocalChatHistoryService.getInstance();