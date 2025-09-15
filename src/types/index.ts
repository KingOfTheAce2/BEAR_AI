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
  agentId: string;
  timestamp: Date;
  status: 'sending' | 'sent' | 'delivered' | 'error';
  type: 'text' | 'document' | 'analysis' | 'citation' | 'code' | 'file' | 'image' | 'system';
  metadata?: {
    confidence?: number;
    sources?: string[];
    documentRefs?: string[];
    [key: string]: any;
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

// Memory monitoring types
export interface MemoryStatus {
  usage: number;
  status: 'normal' | 'warning' | 'critical';
  available: number;
  total: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  lastUpdated: Date;
}

// Component Props interface for consistent prop handling
export interface ComponentProps {
  className?: string;
  children?: React.ReactNode;
  id?: string;
  testId?: string;
}

// Agent and Task Management Types (Required for ConfigurationPanel and StatusDashboard)
export interface Agent {
  id: string;
  name: string;
  type: 'researcher' | 'coder' | 'analyst' | 'optimizer' | 'coordinator' | 'tester' | 'reviewer';
  status: 'active' | 'idle' | 'busy' | 'error';
  capabilities: string[];
  metrics?: {
    averageResponseTime: number;
    tasksCompleted: number;
    successRate: number;
  };
}

export interface Task {
  id: string;
  title: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  priority: 'low' | 'medium' | 'high';
  progress: number;
  updatedAt: string;
  assignedAgent?: string;
  description?: string;
}

export interface DashboardConfig {
  layout: 'grid' | 'list';
  widgets: WidgetConfig[];
  autoRefresh: boolean;
  refreshInterval: number;
  theme?: 'light' | 'dark' | 'auto';
}

export interface WidgetConfig {
  id: string;
  type: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  config: Record<string, any>;
  enabled: boolean;
}

// Notification System Types
export interface NotificationConfig {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  persistent?: boolean;
  actions?: NotificationAction[];
  id?: string;
}

export interface NotificationAction {
  label: string;
  variant: 'primary' | 'secondary';
  action: () => void;
}

// Conversation Management Types
export interface Conversation {
  id: string;
  title: string;
  status: 'active' | 'paused' | 'ended';
  participants: Agent[];
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}