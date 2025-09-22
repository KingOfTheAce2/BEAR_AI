import { useEffect, useRef, useState } from 'react';

import { chatStorage } from '../../services/chat/storage';
import ChatWebSocketService from '../../services/chat/websocket';
import CodeExecutionService from '../../utils/chat/codeExecution';
import VoiceService, { VoiceCommand } from '../../services/chat/voice';
import type {
  ChatSettings,
  Message,
  Thread,
  TypingIndicator,
  User
} from '../../types/chat';

interface UseChatOptions {
  userId: string;
  username: string;
  initialSettings?: Partial<ChatSettings>;
}

export const useChat = ({ userId, username, initialSettings }: UseChatOptions) => {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [currentThread, setCurrentThread] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [users, setUsers] = useState<Map<string, User>>(new Map());
  const [typingIndicators, setTypingIndicators] = useState<TypingIndicator[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [settings, setSettings] = useState<ChatSettings | null>(null);
  const [searchResults, setSearchResults] = useState<Message[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const wsService = useRef<ChatWebSocketService | null>(null);
  const voiceService = useRef<VoiceService | null>(null);
  const codeService = useRef<CodeExecutionService | null>(null);
  const typingTimeout = useRef<NodeJS.Timeout | null>(null);

  // Initialize services
  useEffect(() => {
    const initializeServices = async () => {
      try {
        // Initialize storage
        await chatStorage.initialize();
        
        // Load settings
        let savedSettings = await chatStorage.getSettings();
        if (!savedSettings) {
          savedSettings = {
            theme: 'auto',
            fontSize: 'medium',
            soundEnabled: true,
            notificationsEnabled: true,
            voiceSettings: {
              enabled: false,
              language: 'en-US',
              rate: 1,
              pitch: 1,
              volume: 1
            },
            autoSave: true,
            messageHistory: 30
          };
          await chatStorage.saveSettings(savedSettings);
        }
        
        // Merge with initial settings
        const finalSettings = { ...savedSettings, ...initialSettings };
        setSettings(finalSettings);

        // Initialize WebSocket
        wsService.current = new ChatWebSocketService('ws://localhost:8080/chat', userId);
        setupWebSocketListeners();
        
        try {
          await wsService.current.connect();
        } catch (error) {
          console.warn('WebSocket connection failed, using local mode:', error);
        }

        // Initialize voice service
        voiceService.current = new VoiceService(finalSettings.voiceSettings);
        setupVoiceListeners();

        // Initialize code execution service
        codeService.current = new CodeExecutionService();

        // Load data
        await loadThreads();
        
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to initialize chat services:', error);
        setIsLoading(false);
      }
    };

    initializeServices();

    return () => {
      wsService.current?.disconnect();
      voiceService.current?.stopListening();
      codeService.current?.dispose();
    };
  }, [userId, initialSettings]);

  const setupWebSocketListeners = () => {
    if (!wsService.current) return;

    wsService.current.on('message_received', (message: Message) => {
      addMessage(message);
    });

    wsService.current.on('typing_indicator', (indicator: TypingIndicator) => {
      setTypingIndicators(prev => {
        const filtered = prev.filter(t => t.userId !== indicator.userId || t.threadId !== indicator.threadId);
        return [...filtered, indicator];
      });
      
      // Remove typing indicator after 3 seconds
      setTimeout(() => {
        setTypingIndicators(prev => 
          prev.filter(t => !(t.userId === indicator.userId && t.threadId === indicator.threadId))
        );
      }, 3000);
    });

    wsService.current.on('presence_update', (update: { userId: string; status: string }) => {
      setUsers(prev => {
        const newUsers = new Map(prev);
        const user = newUsers.get(update.userId);
        if (user) {
          newUsers.set(update.userId, {
            ...user,
            presence: update.status as any,
            isOnline: update.status === 'online',
            lastSeen: new Date()
          });
        }
        return newUsers;
      });
    });

    wsService.current.on('reaction_update', (update: any) => {
      updateMessageReaction(update.messageId, update.emoji, update.action === 'add');
    });

    wsService.current.on('message_edited', (update: { messageId: string; content: string }) => {
      editMessage(update.messageId, update.content);
    });
  };

  const setupVoiceListeners = () => {
    if (!voiceService.current) return;

    voiceService.current.onTranscript = (finalTranscript: string, interimTranscript: string) => {
      if (finalTranscript) {
        const command = voiceService.current?.processVoiceCommand(finalTranscript);
        if (command) {
          handleVoiceCommand(command);
        } else {
          // Treat as message content
          handleVoiceMessage(finalTranscript);
        }
      }
    };

    voiceService.current.onError = (error: string) => {
      console.error('Voice recognition error:', error);
      // Show user-friendly error message
    };
  };

  const loadThreads = async () => {
    try {
      const loadedThreads = await chatStorage.getThreads();
      setThreads(loadedThreads);
      
      if (loadedThreads.length > 0 && !currentThread) {
        await switchThread(loadedThreads[0].id);
      }
    } catch (error) {
      console.error('Failed to load threads:', error);
    }
  };

  const switchThread = async (threadId: string) => {
    try {
      const thread = threads.find(t => t.id === threadId);
      if (!thread) return;

      setCurrentThread(thread);
      
      const threadMessages = await chatStorage.getMessages(threadId);
      setMessages(threadMessages);
      
      wsService.current?.joinThread(threadId);
      
      // Update thread as current
      await chatStorage.saveThread({
        ...thread,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Failed to switch thread:', error);
    }
  };

  const createThread = async (title: string): Promise<string> => {
    const newThread: Thread = {
      id: generateId(),
      title,
      messages: [],
      participants: [{ 
        id: userId, 
        username, 
        isOnline: true, 
        lastSeen: new Date(),
        presence: 'online',
        isTyping: false 
      }],
      createdAt: new Date(),
      updatedAt: new Date(),
      isArchived: false,
      tags: []
    };

    await chatStorage.saveThread(newThread);
    setThreads(prev => [newThread, ...prev]);
    await switchThread(newThread.id);
    
    return newThread.id;
  };

  const sendMessage = async (content: string, type: Message['type'] = 'text', attachments: any[] = []) => {
    if (!currentThread || !content.trim()) return;

    const message: Message = {
      id: generateId(),
      content: content.trim(),
      userId,
      username,
      timestamp: new Date(),
      threadId: currentThread.id,
      reactions: [],
      attachments,
      isEdited: false,
      editHistory: [],
      type,
      metadata: extractMetadata(content)
    };

    try {
      // Save locally first
      await chatStorage.saveMessage(message);
      addMessage(message);

      // Update thread
      const updatedThread = {
        ...currentThread,
        updatedAt: new Date()
      };
      await chatStorage.saveThread(updatedThread);
      setCurrentThread(updatedThread);

      // Send via WebSocket if connected
      wsService.current?.sendMessage(message);

      // Execute code if it's a code message
      if (type === 'code' && codeService.current) {
        const codeBlocks = message.metadata?.codeBlocks;
        if (codeBlocks && codeBlocks.length > 0) {
          for (const block of codeBlocks) {
            try {
              const result = await codeService.current.executeCode(block.code, block.language);
              
              // Send result as system message
              const resultMessage: Message = {
                id: generateId(),
                content: `**Code execution result:**\n\`\`\`\n${result.output}\`\`\``,
                userId: 'system',
                username: 'System',
                timestamp: new Date(),
                threadId: currentThread.id,
                reactions: [],
                attachments: [],
                isEdited: false,
                editHistory: [],
                type: 'system'
              };

              await chatStorage.saveMessage(resultMessage);
              addMessage(resultMessage);
            } catch (error) {
              console.error('Code execution failed:', error);
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const addMessage = (message: Message) => {
    setMessages(prev => {
      const exists = prev.find(m => m.id === message.id);
      if (exists) return prev;
      return [...prev, message].sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
    });
  };

  const editMessage = async (messageId: string, newContent: string) => {
    const message = messages.find(m => m.id === messageId);
    if (!message || message.userId !== userId) return;

    const updatedMessage: Message = {
      ...message,
      content: newContent,
      isEdited: true,
      editHistory: [
        ...message.editHistory,
        { content: message.content, timestamp: new Date() }
      ]
    };

    try {
      await chatStorage.saveMessage(updatedMessage);
      setMessages(prev => prev.map(m => m.id === messageId ? updatedMessage : m));
      wsService.current?.sendMessageEdit(messageId, newContent);
    } catch (error) {
      console.error('Failed to edit message:', error);
    }
  };

  const addReaction = async (messageId: string, emoji: string) => {
    await updateMessageReaction(messageId, emoji, true);
    wsService.current?.sendReaction(messageId, emoji, 'add');
  };

  const removeReaction = async (messageId: string, emoji: string) => {
    await updateMessageReaction(messageId, emoji, false);
    wsService.current?.sendReaction(messageId, emoji, 'remove');
  };

  const updateMessageReaction = async (messageId: string, emoji: string, add: boolean) => {
    const message = messages.find(m => m.id === messageId);
    if (!message) return;

    let updatedReactions = [...message.reactions];
    const existingReaction = updatedReactions.find(r => r.emoji === emoji && r.userId === userId);

    if (add && !existingReaction) {
      updatedReactions.push({
        id: generateId(),
        emoji,
        userId,
        username,
        timestamp: new Date()
      });
    } else if (!add && existingReaction) {
      updatedReactions = updatedReactions.filter(r => r.id !== existingReaction.id);
    }

    const updatedMessage = {
      ...message,
      reactions: updatedReactions
    };

    try {
      await chatStorage.saveMessage(updatedMessage);
      setMessages(prev => prev.map(m => m.id === messageId ? updatedMessage : m));
    } catch (error) {
      console.error('Failed to update reaction:', error);
    }
  };

  const searchMessages = async (query: string, filters?: any) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const results = await chatStorage.searchMessages(query, filters);
      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const startTyping = () => {
    if (!currentThread) return;

    wsService.current?.sendTyping(currentThread.id, true);
    
    if (typingTimeout.current) {
      clearTimeout(typingTimeout.current);
    }
    
    typingTimeout.current = setTimeout(() => {
      wsService.current?.sendTyping(currentThread.id, false);
    }, 2000);
  };

  const stopTyping = () => {
    if (!currentThread) return;
    
    if (typingTimeout.current) {
      clearTimeout(typingTimeout.current);
      typingTimeout.current = null;
    }
    
    wsService.current?.sendTyping(currentThread.id, false);
  };

  const startVoiceInput = () => {
    voiceService.current?.startListening();
  };

  const stopVoiceInput = () => {
    voiceService.current?.stopListening();
  };

  const speakMessage = (message: Message) => {
    if (!settings?.voiceSettings.enabled) return;
    voiceService.current?.speak(message.content);
  };

  const handleVoiceCommand = async (command: VoiceCommand) => {
    switch (command.action) {
      case 'send_message':
        if (command.originalText) {
          const content = command.originalText.replace(/^send message/i, '').trim();
          if (content) {
            await sendMessage(content);
          }
        }
        break;
      case 'new_thread':
        await createThread('New Thread');
        break;
      case 'search':
        if (command.parameter) {
          await searchMessages(command.parameter);
        }
        break;
      // Add more voice commands as needed
    }
  };

  const handleVoiceMessage = async (transcript: string) => {
    await sendMessage(transcript, 'text');
  };

  const exportChat = async (format: 'json' | 'csv' | 'html' | 'markdown' = 'json', threadIds?: string[]) => {
    try {
      const data = await chatStorage.exportData(threadIds);
      
      let exportContent: string;
      let mimeType: string;
      let extension: string;

      switch (format) {
        case 'json':
          exportContent = JSON.stringify(data, null, 2);
          mimeType = 'application/json';
          extension = 'json';
          break;
        case 'csv':
          exportContent = convertToCsv(data);
          mimeType = 'text/csv';
          extension = 'csv';
          break;
        case 'html':
          exportContent = convertToHtml(data);
          mimeType = 'text/html';
          extension = 'html';
          break;
        case 'markdown':
          exportContent = convertToMarkdown(data);
          mimeType = 'text/markdown';
          extension = 'md';
          break;
        default:
          throw new Error('Unsupported export format');
      }

      const blob = new Blob([exportContent], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chat_export_${new Date().toISOString().split('T')[0]}.${extension}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const importChat = async (file: File) => {
    try {
      const content = await file.text();
      const data = JSON.parse(content);
      
      await chatStorage.importData(data);
      await loadThreads();
    } catch (error) {
      console.error('Import failed:', error);
    }
  };

  // Helper functions
  const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

  const extractMetadata = (content: string) => {
    const metadata: any = {};
    
    // Extract mentions
    const mentions = content.match(/@(\w+)/g)?.map(m => m.slice(1));
    if (mentions) metadata.mentions = mentions;
    
    // Extract hashtags
    const hashtags = content.match(/#(\w+)/g)?.map(h => h.slice(1));
    if (hashtags) metadata.hashtags = hashtags;
    
    // Extract links
    const links = content.match(/https?:\/\/[^\s]+/g);
    if (links) metadata.links = links;
    
    // Extract code blocks
    const codeBlocks = [];
    const codeRegex = /```(\w+)?\n([\s\S]*?)```/g;
    let match;
    while ((match = codeRegex.exec(content)) !== null) {
      codeBlocks.push({
        language: match[1] || 'text',
        code: match[2]
      });
    }
    if (codeBlocks.length > 0) metadata.codeBlocks = codeBlocks;
    
    return metadata;
  };

  const convertToCsv = (data: any): string => {
    const headers = ['Thread', 'User', 'Message', 'Timestamp', 'Type'];
    const rows = [headers.join(',')];
    
    for (const thread of data.threads) {
      for (const message of thread.messages) {
        const row = [
          thread.title,
          message.username,
          `"${message.content.replace(/"/g, '""')}"`,
          message.timestamp,
          message.type
        ];
        rows.push(row.join(','));
      }
    }
    
    return rows.join('\n');
  };

  const convertToHtml = (data: any): string => {
    let html = `
<!DOCTYPE html>
<html>
<head>
  <title>Chat Export</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    .thread { border: 1px solid #ddd; margin-bottom: 20px; padding: 15px; }
    .message { margin: 10px 0; padding: 10px; background: #f9f9f9; }
    .user { font-weight: bold; color: #2196F3; }
    .timestamp { font-size: 0.8em; color: #666; }
    .system { font-style: italic; background: #e3f2fd; }
  </style>
</head>
<body>
  <h1>Chat Export</h1>
`;

    for (const thread of data.threads) {
      html += `<div class="thread">`;
      html += `<h2>${thread.title}</h2>`;
      
      for (const message of thread.messages) {
        html += `<div class="message ${message.type === 'system' ? 'system' : ''}">`;
        html += `<span class="user">${message.username}:</span> `;
        html += `<span class="content">${message.content.replace(/\n/g, '<br>')}</span><br>`;
        html += `<span class="timestamp">${new Date(message.timestamp).toLocaleString()}</span>`;
        html += `</div>`;
      }
      
      html += `</div>`;
    }

    html += `</body></html>`;
    return html;
  };

  const convertToMarkdown = (data: any): string => {
    let markdown = '# Chat Export\n\n';
    
    for (const thread of data.threads) {
      markdown += `## ${thread.title}\n\n`;
      
      for (const message of thread.messages) {
        markdown += `**${message.username}** (${new Date(message.timestamp).toLocaleString()}):\n`;
        markdown += `${message.content}\n\n`;
      }
      
      markdown += '---\n\n';
    }
    
    return markdown;
  };

  return {
    // State
    threads,
    currentThread,
    messages,
    users,
    typingIndicators,
    isLoading,
    settings,
    searchResults,
    isSearching,

    // Actions
    switchThread,
    createThread,
    sendMessage,
    editMessage,
    addReaction,
    removeReaction,
    searchMessages,
    startTyping,
    stopTyping,
    startVoiceInput,
    stopVoiceInput,
    speakMessage,
    exportChat,
    importChat,

    // Services
    wsService: wsService.current,
    voiceService: voiceService.current,
    codeService: codeService.current
  };
};

export default useChat;