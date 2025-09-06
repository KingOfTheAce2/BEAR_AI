// Global type definitions for BEAR AI Legal Assistant

export interface User {
  id: string
  email: string
  name: string
  role: 'admin' | 'lawyer' | 'paralegal' | 'client'
  avatar?: string
  preferences: UserPreferences
  createdAt: Date
  updatedAt: Date
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system'
  language: string
  notifications: boolean
  autoSave: boolean
  defaultView: 'dashboard' | 'cases' | 'documents'
}

export interface Case {
  id: string
  title: string
  description: string
  status: 'active' | 'closed' | 'pending' | 'archived'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  clientId: string
  lawyerId: string
  documents: Document[]
  notes: Note[]
  deadlines: Deadline[]
  createdAt: Date
  updatedAt: Date
}

export interface Document {
  id: string
  name: string
  type: 'contract' | 'brief' | 'motion' | 'evidence' | 'correspondence' | 'other'
  url: string
  size: number
  mimeType: string
  caseId?: string
  tags: string[]
  uploadedBy: string
  createdAt: Date
  updatedAt: Date
}

export interface Note {
  id: string
  content: string
  caseId?: string
  authorId: string
  isPrivate: boolean
  tags: string[]
  createdAt: Date
  updatedAt: Date
}

export interface Deadline {
  id: string
  title: string
  description?: string
  dueDate: Date
  caseId: string
  assignedTo: string
  completed: boolean
  priority: 'low' | 'medium' | 'high' | 'urgent'
  createdAt: Date
  updatedAt: Date
}

export interface AIResponse {
  id: string
  query: string
  response: string
  confidence: number
  sources: string[]
  timestamp: Date
  userId: string
  caseId?: string
}

export interface ApiError {
  message: string
  code: string
  status: number
  details?: unknown
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  hasNext: boolean
  hasPrev: boolean
}

// Component prop types
export interface BaseComponentProps {
  className?: string
  children?: React.ReactNode
}

export interface LoadingState {
  isLoading: boolean
  error?: string | null
}

// Form types
export interface LoginForm {
  email: string
  password: string
  remember?: boolean
}

export interface RegisterForm {
  name: string
  email: string
  password: string
  confirmPassword: string
  role: 'lawyer' | 'paralegal'
}

export interface CaseForm {
  title: string
  description: string
  clientId: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'active' | 'pending'
}

// Navigation types
export interface NavigationItem {
  id: string
  label: string
  icon: React.ComponentType
  path: string
  children?: NavigationItem[]
  badge?: number
  roles?: User['role'][]
}

// Chat and messaging types
export interface ChatMessage {
  id: string
  content: string
  role: 'user' | 'assistant' | 'system'
  timestamp: Date
  attachments?: ChatAttachment[]
  citations?: Citation[]
  metadata?: {
    confidence?: number
    sources?: string[]
    processingTime?: number
  }
  userId: string
  conversationId: string
}

export interface ChatAttachment {
  id: string
  name: string
  type: 'document' | 'image' | 'file'
  url: string
  size: number
  mimeType: string
}

export interface Conversation {
  id: string
  title: string
  userId: string
  messages: ChatMessage[]
  lastActivity: Date
  tags: string[]
  isArchived: boolean
  metadata: {
    messageCount: number
    legalContext?: string[]
    caseReferences?: string[]
  }
  createdAt: Date
  updatedAt: Date
}

export interface Citation {
  id: string
  title: string
  source: string
  url?: string
  snippet: string
  relevance: number
  type: 'case' | 'statute' | 'regulation' | 'article' | 'other'
}

// Research types
export interface ResearchQuery {
  id: string
  query: string
  filters: ResearchFilters
  results: ResearchResult[]
  savedAt?: Date
  userId: string
}

export interface ResearchFilters {
  documentTypes?: string[]
  dateRange?: {
    start: Date
    end: Date
  }
  jurisdiction?: string[]
  practiceArea?: string[]
  relevanceThreshold?: number
  sortBy?: 'relevance' | 'date' | 'title'
  sortOrder?: 'asc' | 'desc'
}

export interface ResearchResult {
  id: string
  title: string
  snippet: string
  source: string
  url?: string
  relevance: number
  type: 'case' | 'statute' | 'regulation' | 'article' | 'brief' | 'other'
  jurisdiction: string
  practiceArea: string[]
  publishedDate: Date
  citations: number
  bookmarked: boolean
}

// Document annotation types
export interface DocumentAnnotation {
  id: string
  documentId: string
  userId: string
  type: 'highlight' | 'note' | 'bookmark' | 'tag'
  content: string
  position: {
    page?: number
    start: number
    end: number
    coordinates?: { x: number; y: number }
  }
  color?: string
  tags: string[]
  isPrivate: boolean
  createdAt: Date
  updatedAt: Date
}

// Template types
export interface DocumentTemplate {
  id: string
  name: string
  description: string
  category: string
  content: string
  fields: TemplateField[]
  practiceArea: string[]
  jurisdiction: string[]
  isPublic: boolean
  createdBy: string
  usage: number
  rating: number
  createdAt: Date
  updatedAt: Date
}

export interface TemplateField {
  id: string
  name: string
  type: 'text' | 'number' | 'date' | 'select' | 'multiselect' | 'textarea'
  label: string
  placeholder?: string
  required: boolean
  options?: string[]
  validation?: {
    pattern?: string
    min?: number
    max?: number
  }
}

// Security and audit types
export interface SecurityClassification {
  level: 'public' | 'internal' | 'confidential' | 'restricted'
  reason?: string
  expiresAt?: Date
  grantedBy: string
  grantedAt: Date
}

export interface AuditLog {
  id: string
  userId: string
  action: string
  resource: {
    type: string
    id: string
    name?: string
  }
  metadata: Record<string, any>
  ipAddress: string
  userAgent: string
  timestamp: Date
  outcome: 'success' | 'failure' | 'warning'
}

// Smart autocomplete types
export interface AutocompleteItem {
  id: string
  text: string
  type: 'legal-term' | 'case-name' | 'statute' | 'phrase' | 'template'
  category: string
  description?: string
  usage: number
  context?: string[]
}

// Keyboard shortcut types
export interface KeyboardShortcut {
  id: string
  key: string
  description: string
  action: () => void
  context?: 'global' | 'chat' | 'documents' | 'research'
  enabled: boolean
}

// Settings types
export interface AdvancedSettings {
  security: {
    sessionTimeout: number
    requireReauth: boolean
    enableAuditLog: boolean
    ipWhitelist?: string[]
  }
  privacy: {
    shareUsageData: boolean
    enableTelemetry: boolean
    dataRetentionDays: number
    exportFormat: 'json' | 'xml' | 'csv'
  }
  chat: {
    maxMessageLength: number
    autoSave: boolean
    showConfidence: boolean
    enableCitations: boolean
    contextWindow: number
  }
  documents: {
    defaultView: 'grid' | 'list'
    thumbnails: boolean
    versionHistory: boolean
    autoBackup: boolean
  }
  research: {
    defaultFilters: ResearchFilters
    saveSearches: boolean
    maxResults: number
    cacheResults: boolean
  }
}

// Activity tracking types
export interface ActivityEvent {
  id: string
  type: 'login' | 'logout' | 'document_viewed' | 'search_performed' | 'chat_message' | 'case_updated'
  userId: string
  metadata: Record<string, any>
  timestamp: Date
  duration?: number
}

// Theme types
export interface ThemeConfig {
  colors: {
    primary: string
    secondary: string
    accent: string
    background: string
    surface: string
    text: string
    muted: string
  }
  fonts: {
    sans: string
    serif: string
    mono: string
  }
  spacing: Record<string, string>
  breakpoints: Record<string, string>
}