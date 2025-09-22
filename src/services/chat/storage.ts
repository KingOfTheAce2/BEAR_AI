import type { ChatSettings, Message, Thread } from '../../types/chat';

class ChatStorageService {
  private dbName = 'BearAI_Chat';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;

  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Messages store
        if (!db.objectStoreNames.contains('messages')) {
          const messageStore = db.createObjectStore('messages', { keyPath: 'id' });
          messageStore.createIndex('threadId', 'threadId', { unique: false });
          messageStore.createIndex('userId', 'userId', { unique: false });
          messageStore.createIndex('timestamp', 'timestamp', { unique: false });
          messageStore.createIndex('content', 'content', { unique: false });
        }

        // Threads store
        if (!db.objectStoreNames.contains('threads')) {
          const threadStore = db.createObjectStore('threads', { keyPath: 'id' });
          threadStore.createIndex('updatedAt', 'updatedAt', { unique: false });
          threadStore.createIndex('title', 'title', { unique: false });
        }

        // Users store
        if (!db.objectStoreNames.contains('users')) {
          const userStore = db.createObjectStore('users', { keyPath: 'id' });
          userStore.createIndex('username', 'username', { unique: true });
        }

        // Search index store
        if (!db.objectStoreNames.contains('searchIndex')) {
          const searchStore = db.createObjectStore('searchIndex', { keyPath: ['messageId', 'term'] });
          searchStore.createIndex('term', 'term', { unique: false });
          searchStore.createIndex('messageId', 'messageId', { unique: false });
        }

        // Settings store
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }

        // File attachments store
        if (!db.objectStoreNames.contains('attachments')) {
          const attachmentStore = db.createObjectStore('attachments', { keyPath: 'id' });
          attachmentStore.createIndex('messageId', 'messageId', { unique: false });
        }
      };
    });
  }

  async saveMessage(message: Message): Promise<void> {
    const transaction = this.db!.transaction(['messages', 'searchIndex'], 'readwrite');
    const messageStore = transaction.objectStore('messages');
    const searchStore = transaction.objectStore('searchIndex');

    await messageStore.put(message);

    // Build search index
    const searchTerms = this.extractSearchTerms(message);
    for (const term of searchTerms) {
      await searchStore.put({
        messageId: message.id,
        term: term.toLowerCase(),
        timestamp: message.timestamp
      });
    }
  }

  async getMessages(threadId: string, limit = 50, offset = 0): Promise<Message[]> {
    const transaction = this.db!.transaction('messages', 'readonly');
    const store = transaction.objectStore('messages');
    const index = store.index('threadId');
    const request = index.getAll(threadId);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const messages = request.result
          .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
          .slice(offset, offset + limit);
        resolve(messages);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async saveThread(thread: Thread): Promise<void> {
    const transaction = this.db!.transaction('threads', 'readwrite');
    const store = transaction.objectStore('threads');
    await store.put(thread);
  }

  async getThreads(): Promise<Thread[]> {
    const transaction = this.db!.transaction('threads', 'readonly');
    const store = transaction.objectStore('threads');
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const threads = request.result
          .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        resolve(threads);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async searchMessages(query: string, filters?: any): Promise<Message[]> {
    const transaction = this.db!.transaction(['messages', 'searchIndex'], 'readonly');
    const messageStore = transaction.objectStore('messages');
    const searchStore = transaction.objectStore('searchIndex');

    const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 2);
    const messageIds = new Set<string>();

    for (const term of searchTerms) {
      const index = searchStore.index('term');
      const range = IDBKeyRange.bound(term, term + '\uffff');
      const request = index.openCursor(range);

      await new Promise<void>((resolve) => {
        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result;
          if (cursor) {
            messageIds.add(cursor.value.messageId);
            cursor.continue();
          } else {
            resolve();
          }
        };
      });
    }

    const messages: Message[] = [];
    for (const messageId of messageIds) {
      const request = messageStore.get(messageId);
      const message = await new Promise<Message>((resolve) => {
        request.onsuccess = () => resolve(request.result);
      });
      
      if (message && this.matchesFilters(message, filters)) {
        messages.push(message);
      }
    }

    return messages.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  async saveSettings(settings: ChatSettings): Promise<void> {
    const transaction = this.db!.transaction('settings', 'readwrite');
    const store = transaction.objectStore('settings');
    await store.put({ key: 'chat', value: settings });
  }

  async getSettings(): Promise<ChatSettings | null> {
    const transaction = this.db!.transaction('settings', 'readonly');
    const store = transaction.objectStore('settings');
    const request = store.get('chat');

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        resolve(request.result?.value || null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async exportData(threadIds?: string[]): Promise<any> {
    const threads = await this.getThreads();
    const filteredThreads = threadIds ? 
      threads.filter(t => threadIds.includes(t.id)) : threads;

    const exportData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      threads: []
    };

    for (const thread of filteredThreads) {
      const messages = await this.getMessages(thread.id, 1000);
      exportData.threads.push({
        ...thread,
        messages
      });
    }

    return exportData;
  }

  async importData(data: any): Promise<void> {
    const transaction = this.db!.transaction(['threads', 'messages'], 'readwrite');
    const threadStore = transaction.objectStore('threads');
    const messageStore = transaction.objectStore('messages');

    for (const thread of data.threads) {
      const { messages, ...threadData } = thread;
      await threadStore.put(threadData);

      for (const message of messages) {
        await messageStore.put(message);
      }
    }
  }

  async clearData(): Promise<void> {
    const transaction = this.db!.transaction(
      ['messages', 'threads', 'searchIndex', 'attachments'], 
      'readwrite'
    );

    await Promise.all([
      transaction.objectStore('messages').clear(),
      transaction.objectStore('threads').clear(),
      transaction.objectStore('searchIndex').clear(),
      transaction.objectStore('attachments').clear()
    ]);
  }

  private extractSearchTerms(message: Message): string[] {
    const terms = new Set<string>();
    
    // Extract words from content
    const words = message.content.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2);
    
    words.forEach(word => terms.add(word));
    
    // Add username
    terms.add(message.username.toLowerCase());
    
    // Add metadata terms
    if (message.metadata?.mentions) {
      message.metadata.mentions.forEach(mention => terms.add(mention.toLowerCase()));
    }
    
    if (message.metadata?.hashtags) {
      message.metadata.hashtags.forEach(tag => terms.add(tag.toLowerCase()));
    }

    return Array.from(terms);
  }

  private matchesFilters(message: Message, filters: any): boolean {
    if (!filters) return true;

    if (filters.userId && message.userId !== filters.userId) return false;
    if (filters.threadId && message.threadId !== filters.threadId) return false;
    if (filters.messageType && message.type !== filters.messageType) return false;
    if (filters.hasAttachments && message.attachments.length === 0) return false;

    if (filters.dateFrom && new Date(message.timestamp) < filters.dateFrom) return false;
    if (filters.dateTo && new Date(message.timestamp) > filters.dateTo) return false;

    return true;
  }
}

export const chatStorage = new ChatStorageService();