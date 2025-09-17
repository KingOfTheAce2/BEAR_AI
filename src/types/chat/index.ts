export interface Message {
  id: string;
  content: string;
  userId: string;
  username: string;
  avatar?: string;
  timestamp: Date;
  threadId?: string;
  parentMessageId?: string;
  reactions: Reaction[];
  attachments: Attachment[];
  isEdited: boolean;
  editHistory: EditHistory[];
  type: MessageType;
  metadata?: MessageMetadata;
}

export interface Thread {
  id: string;
  title: string;
  messages: Message[];
  participants: User[];
  createdAt: Date;
  updatedAt: Date;
  isArchived: boolean;
  tags: string[];
}

export interface Reaction {
  id: string;
  emoji: string;
  userId: string;
  username: string;
  timestamp: Date;
}

export interface Attachment {
  id: string;
  name: string;
  type: AttachmentType;
  size: number;
  url: string;
  thumbnailUrl?: string;
  mimeType: string;
  metadata?: AttachmentMetadata;
}

export interface EditHistory {
  content: string;
  timestamp: Date;
  reason?: string;
}

export interface User {
  id: string;
  username: string;
  avatar?: string;
  isOnline: boolean;
  lastSeen: Date;
  presence: PresenceStatus;
  isTyping: boolean;
}

export interface TypingIndicator {
  userId: string;
  username: string;
  threadId: string;
  timestamp: Date;
}

export interface SearchFilter {
  query: string;
  userId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  threadId?: string;
  hasAttachments?: boolean;
  messageType?: MessageType;
  tags?: string[];
}

export interface VoiceSettings {
  enabled: boolean;
  language: string;
  rate: number;
  pitch: number;
  volume: number;
  voice?: SpeechSynthesisVoice;
}

export interface ChatSettings {
  theme: 'light' | 'dark' | 'auto';
  fontSize: 'small' | 'medium' | 'large';
  soundEnabled: boolean;
  notificationsEnabled: boolean;
  voiceSettings: VoiceSettings;
  autoSave: boolean;
  messageHistory: number; // days to keep
}

export interface WebSocketMessage {
  type: WebSocketMessageType;
  payload: any;
  timestamp: Date;
  userId?: string;
}

export interface CodeExecutionResult {
  output: string;
  error?: string;
  duration: number;
  language: string;
}

export interface ExportOptions {
  format: ExportFormat;
  includeAttachments: boolean;
  dateFrom?: Date;
  dateTo?: Date;
  threadIds?: string[];
}

export type MessageType = 'text' | 'code' | 'file' | 'image' | 'voice' | 'system';
export type AttachmentType = 'image' | 'file' | 'video' | 'audio' | 'code';
export type PresenceStatus = 'online' | 'away' | 'busy' | 'offline';
export type WebSocketMessageType = 'message' | 'typing' | 'presence' | 'reaction' | 'edit' | 'delete' | 'join_thread' | 'leave_thread';
export type ExportFormat = 'json' | 'csv' | 'html' | 'markdown' | 'pdf';

export interface AttachmentMetadata {
  dimensions?: { width: number; height: number };
  duration?: number;
  language?: string;
  encoding?: string;
}

export interface MessageMetadata {
  mentions?: string[];
  hashtags?: string[];
  links?: string[];
  codeBlocks?: { language: string; code: string }[];
}