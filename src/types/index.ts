// Core TypeScript interfaces for BEAR AI GUI

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'attorney' | 'paralegal' | 'admin';
  avatar?: string;
  firm?: string;
}

export interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  status: 'sending' | 'sent' | 'delivered' | 'error';
  type: 'text' | 'document' | 'analysis' | 'citation';
  metadata?: {
    confidence?: number;
    sources?: string[];
    documentRefs?: string[];
  };
}

export interface Document {
  id: string;
  name: string;
  type: 'pdf' | 'docx' | 'txt' | 'legal';
  size: number;
  uploadDate: Date;
  status: 'uploading' | 'processing' | 'ready' | 'error';
  preview?: string;
  thumbnail?: string;
  tags: string[];
  category: 'contract' | 'brief' | 'research' | 'evidence' | 'correspondence' | 'other';
  versions: DocumentVersion[];
}

export interface DocumentVersion {
  id: string;
  version: number;
  modifiedDate: Date;
  modifiedBy: string;
  changes: string;
}

export interface SearchResult {
  id: string;
  type: 'document' | 'case' | 'statute' | 'regulation' | 'conversation';
  title: string;
  content: string;
  relevance: number;
  source: string;
  date?: Date;
  preview: string;
  category: string;
}

export interface NavigationItem {
  id: string;
  label: string;
  icon: string;
  path: string;
  badge?: string | number;
  children?: NavigationItem[];
}

export interface SystemStatus {
  connection: 'online' | 'offline' | 'connecting';
  security: 'secure' | 'warning' | 'error';
  operations: {
    active: number;
    queued: number;
  };
  version: string;
}

export interface QuickAction {
  id: string;
  label: string;
  description: string;
  icon: string;
  category: 'research' | 'analysis' | 'drafting' | 'review';
  prompt: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
  category: string;
}

export interface AppState {
  user: User | null;
  sidebarCollapsed: boolean;
  currentView: string;
  systemStatus: SystemStatus;
  searchQuery: string;
  activeChat: ChatSession | null;
}