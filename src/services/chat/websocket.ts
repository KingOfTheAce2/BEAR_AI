import type { Message, WebSocketMessage } from '../../types/chat';

class ChatWebSocketService {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private listeners: Map<string, Function[]> = new Map();
  private userId: string;
  private currentThread: string | null = null;

  constructor(url = 'ws://localhost:8080/chat', userId: string) {
    this.url = url;
    this.userId = userId;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);
        
        this.ws.onopen = () => {
          // Logging disabled for production
          this.reconnectAttempts = 0;
          this.sendPresence('online');
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            // Error logging disabled for production
          }
        };

        this.ws.onclose = () => {
          // Logging disabled for production
          this.attemptReconnect();
        };

        this.ws.onerror = (error) => {
          // Error logging disabled for production
          reject(error);
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  disconnect(): void {
    if (this.ws) {
      this.sendPresence('offline');
      this.ws.close();
      this.ws = null;
    }
  }

  sendMessage(message: Partial<Message>): void {
    this.send({
      type: 'message',
      payload: message,
      timestamp: new Date(),
      userId: this.userId
    });
  }

  sendTyping(threadId: string, isTyping: boolean): void {
    this.send({
      type: 'typing',
      payload: { threadId, isTyping },
      timestamp: new Date(),
      userId: this.userId
    });
  }

  sendReaction(messageId: string, emoji: string, action: 'add' | 'remove'): void {
    this.send({
      type: 'reaction',
      payload: { messageId, emoji, action },
      timestamp: new Date(),
      userId: this.userId
    });
  }

  sendMessageEdit(messageId: string, newContent: string): void {
    this.send({
      type: 'edit',
      payload: { messageId, content: newContent },
      timestamp: new Date(),
      userId: this.userId
    });
  }

  sendPresence(status: 'online' | 'away' | 'busy' | 'offline'): void {
    this.send({
      type: 'presence',
      payload: { status },
      timestamp: new Date(),
      userId: this.userId
    });
  }

  joinThread(threadId: string): void {
    this.currentThread = threadId;
    this.send({
      type: 'join_thread',
      payload: { threadId },
      timestamp: new Date(),
      userId: this.userId
    });
  }

  leaveThread(threadId: string): void {
    if (this.currentThread === threadId) {
      this.currentThread = null;
    }
    this.send({
      type: 'leave_thread',
      payload: { threadId },
      timestamp: new Date(),
      userId: this.userId
    });
  }

  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off(event: string, callback: Function): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      const index = eventListeners.indexOf(callback);
      if (index > -1) {
        eventListeners.splice(index, 1);
      }
    }
  }

  private send(message: WebSocketMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      // Warning logging disabled for production
    }
  }

  private handleMessage(message: WebSocketMessage): void {
    const eventListeners = this.listeners.get(message.type);
    if (eventListeners) {
      eventListeners.forEach(callback => callback(message.payload));
    }

    // Handle built-in events
    switch (message.type) {
      case 'message':
        this.emit('message_received', message.payload);
        break;
      case 'typing':
        this.emit('typing_indicator', message.payload);
        break;
      case 'presence':
        this.emit('presence_update', { userId: message.userId, ...message.payload });
        break;
      case 'reaction':
        this.emit('reaction_update', message.payload);
        break;
      case 'edit':
        this.emit('message_edited', message.payload);
        break;
    }
  }

  private emit(event: string, payload: any): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(callback => callback(payload));
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      // Logging disabled for production
      
      setTimeout(() => {
        this.connect().catch(error => {
          // Error logging disabled for production
        });
      }, this.reconnectDelay * this.reconnectAttempts);
    } else {
      // Error logging disabled for production
      this.emit('connection_lost', null);
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  getConnectionState(): string {
    if (!this.ws) return 'disconnected';
    
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING: return 'connecting';
      case WebSocket.OPEN: return 'connected';
      case WebSocket.CLOSING: return 'closing';
      case WebSocket.CLOSED: return 'closed';
      default: return 'unknown';
    }
  }
}

// Simple local WebSocket server simulation for development
export class LocalChatServer {
  private clients: Map<string, any> = new Map();
  private rooms: Map<string, Set<string>> = new Map();

  constructor() {
    this.simulateServer();
  }

  private simulateServer(): void {
    // This would typically be a real WebSocket server
    // For now, we'll simulate it with localStorage and events
    window.addEventListener('storage', (event) => {
      if (event.key?.startsWith('chat_ws_')) {
        const message = JSON.parse(event.newValue || '{}');
        this.broadcastMessage(message);
      }
    });
  }

  private broadcastMessage(message: any): void {
    // Simulate broadcasting to all connected clients
    window.dispatchEvent(new CustomEvent('local_chat_message', {
      detail: message
    }));
  }

  sendMessage(message: any): void {
    localStorage.setItem(`chat_ws_${Date.now()}`, JSON.stringify(message));
    // Clean up old messages
    setTimeout(() => {
      Object.keys(localStorage)
        .filter(key => key.startsWith('chat_ws_'))
        .slice(0, -100) // Keep only last 100 messages
        .forEach(key => localStorage.removeItem(key));
    }, 100);
  }
}

export default ChatWebSocketService;