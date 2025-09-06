# BEAR AI React + TypeScript GUI Architecture

## Executive Summary

This document outlines a comprehensive architecture plan for the BEAR AI Legal Assistant React + TypeScript GUI application. The architecture builds upon the existing foundation in `/GUI` folder, leveraging modern React patterns with Vite, Zustand state management, and TypeScript for a professional legal workflow application.

## 1. Current Architecture Analysis

### ✅ Existing Strengths

**Technology Stack:**
- **Framework**: React 18 with TypeScript 5.2+
- **Build Tool**: Vite 5.0+ with HMR and optimized builds
- **State Management**: Zustand with devtools and persistence
- **Styling**: Tailwind CSS 3.3+ with professional legal theme
- **Routing**: React Router v6 with protected routes
- **HTTP Client**: Axios with interceptors
- **Icons**: Lucide React for consistent iconography
- **Testing**: Vitest + Testing Library
- **Code Quality**: ESLint + Prettier with TypeScript strict mode

**Project Structure:**
```
/GUI/
├── src/
│   ├── components/           # Reusable UI components
│   │   ├── ui/              # Base components (Button, Input)
│   │   └── layout/          # Layout components (Header, Sidebar)
│   ├── pages/               # Route components
│   ├── hooks/               # Custom React hooks
│   ├── services/            # API services
│   ├── store/               # Zustand state stores
│   ├── types/               # TypeScript definitions
│   ├── utils/               # Utility functions
│   └── styles/              # CSS and styling
├── tests/                   # Test files
├── public/                  # Static assets
└── docs/                    # Documentation
```

### 🎯 Areas for Enhancement

1. **Chat Interface Components** - Need comprehensive AI chat UI
2. **Document Management** - Advanced document viewer and annotation
3. **Research Tools** - Legal research interface components
4. **Real-time Features** - WebSocket integration for live updates
5. **Advanced Security** - Enhanced authentication and PII handling
6. **Performance Optimization** - Code splitting and lazy loading

## 2. Enhanced Component Hierarchy

### 2.1 Core Application Structure

```typescript
App
├── Router (BrowserRouter)
├── GlobalProviders
│   ├── ThemeProvider
│   ├── AuthProvider
│   ├── NotificationProvider
│   └── WebSocketProvider
└── RouteHandler
    ├── PublicRoutes
    │   ├── Login
    │   ├── Register
    │   └── ForgotPassword
    └── ProtectedRoutes (Layout wrapper)
        ├── Dashboard
        ├── AIChat
        ├── CaseManagement
        ├── DocumentLibrary
        ├── ResearchTools
        ├── ClientPortal
        ├── Calendar
        ├── Reports
        └── Settings
```

### 2.2 AI Chat Interface Components

```typescript
AIChat/
├── ChatContainer                    # Main chat interface
│   ├── ChatHeader                  # Chat title, settings, export
│   ├── MessagesList                # Scrollable message container
│   │   ├── MessageBubble          # Individual message component
│   │   │   ├── UserMessage        # User message styling
│   │   │   ├── AssistantMessage   # AI response styling
│   │   │   └── SystemMessage      # System notifications
│   │   ├── TypingIndicator       # Loading/typing animation
│   │   └── CitationCard          # Legal citations display
│   ├── MessageInput               # Message composition area
│   │   ├── TextEditor            # Rich text input
│   │   ├── AttachmentButton      # File upload
│   │   ├── VoiceButton           # Voice input (future)
│   │   └── SendButton            # Submit message
│   └── ChatSidebar               # Chat history, templates
│       ├── ConversationList      # Previous conversations
│       ├── QuickActions          # Common legal queries
│       └── TemplateLibrary       # Saved prompt templates
```

### 2.3 Document Management Components

```typescript
DocumentLibrary/
├── DocumentExplorer              # Main document interface
│   ├── DocumentGrid             # Grid/list view toggle
│   ├── DocumentCard             # Individual document preview
│   ├── DocumentViewer           # PDF/document viewer
│   │   ├── ViewerToolbar        # Zoom, print, download
│   │   ├── ViewerCanvas         # Document display area
│   │   └── AnnotationLayer      # Highlights, notes overlay
│   ├── DocumentUpload           # Drag-and-drop upload
│   ├── DocumentSearch           # Full-text search
│   └── DocumentFilters          # Category, date, type filters
└── DocumentEditor               # Document creation/editing
    ├── EditorToolbar            # Formatting controls
    ├── ContentEditor            # Rich text editor
    └── PreviewPane              # Live preview
```

### 2.4 Case Management Components

```typescript
CaseManagement/
├── CaseOverview                 # Case dashboard
│   ├── CaseHeader              # Case title, status, progress
│   ├── CaseTimeline            # Chronological case events
│   ├── KeyDates                # Important deadlines
│   └── CaseTeam                # Assigned lawyers, paralegals
├── CaseDocuments               # Case-specific documents
├── CaseNotes                   # Case notes and updates
├── TaskManager                 # Case-related tasks
│   ├── TaskList               # Outstanding tasks
│   ├── TaskCard               # Individual task display
│   └── TaskForm               # Create/edit tasks
└── CaseReports                 # Case analytics and reports
```

### 2.5 Research Tools Components

```typescript
ResearchTools/
├── SearchInterface             # Legal research search
│   ├── SearchBar              # Query input with suggestions
│   ├── FilterPanel            # Jurisdiction, date, type filters
│   └── SearchHistory          # Previous searches
├── ResultsView                 # Search results display
│   ├── ResultCard             # Individual result preview
│   ├── RelevanceScore         # AI-powered relevance scoring
│   └── CitationInfo           # Legal citation format
├── ResearchWorkspace          # Research organization
│   ├── SavedSearches          # Bookmarked searches
│   ├── ResearchNotes          # Annotated findings
│   └── SourceComparison       # Side-by-side comparison
└── LegalDatabase              # Curated legal content
```

## 3. Enhanced State Management Strategy

### 3.1 Zustand Store Architecture

```typescript
// Enhanced store structure with additional domains
stores/
├── authStore.ts                # Authentication state
├── appStore.ts                 # Global app state
├── chatStore.ts                # AI chat conversations
├── documentsStore.ts           # Document management
├── casesStore.ts               # Case management
├── researchStore.ts            # Research tools
├── notificationsStore.ts       # System notifications
├── websocketStore.ts           # Real-time connections
├── settingsStore.ts            # User preferences
└── cacheStore.ts               # API response caching
```

### 3.2 Chat Store Enhancement

```typescript
interface ChatState {
  // Conversations management
  conversations: Conversation[]
  activeConversation: string | null
  isLoading: boolean
  error: string | null
  
  // Message handling
  messages: Record<string, ChatMessage[]>
  isTyping: boolean
  streamingMessage: string | null
  
  // AI features
  suggestions: string[]
  citations: Citation[]
  confidence: number
  
  // Actions
  createConversation: (title: string) => Promise<string>
  sendMessage: (conversationId: string, content: string, attachments?: File[]) => Promise<void>
  streamMessage: (conversationId: string, content: string) => AsyncGenerator<string>
  searchConversations: (query: string) => Conversation[]
  exportConversation: (conversationId: string, format: 'pdf' | 'docx') => Promise<void>
  
  // Template management
  saveTemplate: (name: string, content: string) => void
  useTemplate: (templateId: string) => void
  
  // Real-time features
  subscribeToUpdates: (conversationId: string) => void
  unsubscribeFromUpdates: (conversationId: string) => void
}
```

### 3.3 Document Store Enhancement

```typescript
interface DocumentsState {
  // Document management
  documents: Document[]
  folders: DocumentFolder[]
  selectedDocuments: string[]
  currentFolder: string | null
  
  // Viewer state
  activeDocument: Document | null
  viewerMode: 'single' | 'comparison'
  annotations: DocumentAnnotation[]
  
  // Upload state
  uploadQueue: UploadItem[]
  uploadProgress: Record<string, number>
  
  // Search and filters
  searchQuery: string
  filters: DocumentFilters
  sortBy: 'name' | 'date' | 'size' | 'type'
  
  // Actions
  uploadDocuments: (files: File[], folderId?: string) => Promise<void>
  createFolder: (name: string, parentId?: string) => Promise<string>
  moveDocuments: (documentIds: string[], folderId: string) => Promise<void>
  shareDocument: (documentId: string, permissions: SharePermissions) => Promise<string>
  addAnnotation: (documentId: string, annotation: NewAnnotation) => Promise<void>
  searchDocuments: (query: string, filters?: DocumentFilters) => Promise<Document[]>
  
  // OCR and analysis
  extractText: (documentId: string) => Promise<string>
  analyzeDocument: (documentId: string) => Promise<DocumentAnalysis>
}
```

## 4. API Client Architecture

### 4.1 Enhanced API Service Structure

```typescript
services/
├── api/
│   ├── client.ts               # Base axios client with interceptors
│   ├── auth.ts                 # Authentication endpoints
│   ├── chat.ts                 # AI chat endpoints
│   ├── documents.ts            # Document management endpoints
│   ├── cases.ts                # Case management endpoints
│   ├── research.ts             # Research tools endpoints
│   ├── users.ts                # User management endpoints
│   └── websocket.ts            # WebSocket connection management
├── hooks/
│   ├── useAuth.ts              # Authentication hooks
│   ├── useChat.ts              # Chat-specific hooks
│   ├── useDocuments.ts         # Document management hooks
│   ├── useCases.ts             # Case management hooks
│   ├── useResearch.ts          # Research tools hooks
│   └── useWebSocket.ts         # Real-time connection hooks
└── utils/
    ├── errorHandler.ts         # Centralized error handling
    ├── requestQueue.ts         # Request queuing and retry logic
    └── responseCache.ts        # Intelligent response caching
```

### 4.2 API Client Configuration

```typescript
// Enhanced API client with interceptors and error handling
class BearAIClient {
  private client: AxiosInstance
  private wsConnection: WebSocket | null = null
  
  constructor() {
    this.client = axios.create({
      baseURL: process.env.VITE_API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    this.setupInterceptors()
  }
  
  private setupInterceptors() {
    // Request interceptor for auth tokens
    this.client.interceptors.request.use(
      (config) => {
        const token = useAuthStore.getState().token
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }
        return config
      }
    )
    
    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          await this.handleTokenRefresh()
        }
        return this.handleError(error)
      }
    )
  }
  
  // Chat API methods
  async sendMessage(conversationId: string, message: string): Promise<ChatMessage> {
    const response = await this.client.post(`/chat/${conversationId}/messages`, {
      content: message,
      timestamp: new Date().toISOString(),
    })
    return response.data
  }
  
  async streamMessage(
    conversationId: string, 
    message: string
  ): Promise<ReadableStream<string>> {
    const response = await fetch(`${this.baseURL}/chat/${conversationId}/stream`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ content: message }),
    })
    
    if (!response.ok) throw new Error('Stream request failed')
    return response.body!
  }
  
  // Document API methods
  async uploadDocument(file: File, metadata?: DocumentMetadata): Promise<Document> {
    const formData = new FormData()
    formData.append('file', file)
    if (metadata) {
      formData.append('metadata', JSON.stringify(metadata))
    }
    
    const response = await this.client.post('/documents', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        const progress = (progressEvent.loaded / progressEvent.total!) * 100
        useDocumentsStore.getState().updateUploadProgress(file.name, progress)
      },
    })
    
    return response.data
  }
  
  // WebSocket connection management
  connectWebSocket(): WebSocket {
    const wsUrl = process.env.VITE_WS_URL || 'ws://localhost:8000/ws'
    const token = useAuthStore.getState().token
    
    this.wsConnection = new WebSocket(`${wsUrl}?token=${token}`)
    
    this.wsConnection.onopen = () => {
      console.log('WebSocket connected')
      useWebSocketStore.getState().setConnected(true)
    }
    
    this.wsConnection.onmessage = (event) => {
      const data = JSON.parse(event.data)
      this.handleWebSocketMessage(data)
    }
    
    this.wsConnection.onclose = () => {
      console.log('WebSocket disconnected')
      useWebSocketStore.getState().setConnected(false)
      // Implement reconnection logic
      setTimeout(() => this.connectWebSocket(), 5000)
    }
    
    return this.wsConnection
  }
}
```

## 5. Advanced Routing Strategy

### 5.1 Route Structure

```typescript
// Enhanced routing with lazy loading and route guards
const routeConfig = {
  public: [
    { path: '/login', component: lazy(() => import('@pages/Login')) },
    { path: '/register', component: lazy(() => import('@pages/Register')) },
    { path: '/forgot-password', component: lazy(() => import('@pages/ForgotPassword')) },
    { path: '/reset-password/:token', component: lazy(() => import('@pages/ResetPassword')) },
  ],
  protected: [
    {
      path: '/',
      component: lazy(() => import('@pages/Dashboard')),
      roles: ['admin', 'lawyer', 'paralegal', 'client'],
    },
    {
      path: '/ai-chat',
      component: lazy(() => import('@pages/AIChat')),
      roles: ['admin', 'lawyer', 'paralegal'],
      children: [
        { path: '', component: lazy(() => import('@components/chat/ChatList')) },
        { path: ':conversationId', component: lazy(() => import('@components/chat/ChatInterface')) },
        { path: 'new', component: lazy(() => import('@components/chat/NewChat')) },
      ],
    },
    {
      path: '/cases',
      component: lazy(() => import('@pages/CaseManagement')),
      roles: ['admin', 'lawyer', 'paralegal'],
      children: [
        { path: '', component: lazy(() => import('@components/cases/CaseList')) },
        { path: ':caseId', component: lazy(() => import('@components/cases/CaseDetail')) },
        { path: ':caseId/documents', component: lazy(() => import('@components/cases/CaseDocuments')) },
        { path: ':caseId/timeline', component: lazy(() => import('@components/cases/CaseTimeline')) },
        { path: 'new', component: lazy(() => import('@components/cases/CreateCase')) },
      ],
    },
    {
      path: '/documents',
      component: lazy(() => import('@pages/DocumentLibrary')),
      roles: ['admin', 'lawyer', 'paralegal'],
      children: [
        { path: '', component: lazy(() => import('@components/documents/DocumentGrid')) },
        { path: 'folders/:folderId', component: lazy(() => import('@components/documents/FolderView')) },
        { path: 'viewer/:documentId', component: lazy(() => import('@components/documents/DocumentViewer')) },
        { path: 'upload', component: lazy(() => import('@components/documents/DocumentUpload')) },
      ],
    },
    {
      path: '/research',
      component: lazy(() => import('@pages/ResearchTools')),
      roles: ['admin', 'lawyer', 'paralegal'],
      children: [
        { path: '', component: lazy(() => import('@components/research/SearchInterface')) },
        { path: 'workspace', component: lazy(() => import('@components/research/ResearchWorkspace')) },
        { path: 'saved', component: lazy(() => import('@components/research/SavedSearches')) },
      ],
    },
  ],
}
```

### 5.2 Route Guards and Middleware

```typescript
// Enhanced route protection with role-based access
interface RouteGuardProps {
  children: React.ReactNode
  requiredRoles?: User['role'][]
  requiredPermissions?: string[]
  fallback?: React.ReactNode
}

const RouteGuard: React.FC<RouteGuardProps> = ({
  children,
  requiredRoles,
  requiredPermissions,
  fallback = <Navigate to="/unauthorized" replace />,
}) => {
  const { user, isAuthenticated } = useAuthStore()
  
  // Check authentication
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />
  }
  
  // Check role-based access
  if (requiredRoles && !requiredRoles.includes(user.role)) {
    return fallback
  }
  
  // Check permission-based access
  if (requiredPermissions) {
    const hasPermission = requiredPermissions.every(permission =>
      user.permissions?.includes(permission)
    )
    if (!hasPermission) {
      return fallback
    }
  }
  
  return <>{children}</>
}

// Usage in route configuration
<Route
  path="/admin/*"
  element={
    <RouteGuard requiredRoles={['admin']}>
      <AdminPanel />
    </RouteGuard>
  }
/>
```

## 6. Build and Development Setup Enhancements

### 6.1 Vite Configuration Optimization

```typescript
// Enhanced vite.config.ts with performance optimizations
export default defineConfig({
  plugins: [
    react(),
    // Add performance and development plugins
    {
      name: 'remove-console',
      transform(code, id) {
        if (process.env.NODE_ENV === 'production') {
          return code.replace(/console\.(log|warn|error|info|debug)/g, '() => {}')
        }
      },
    },
  ],
  
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@components': resolve(__dirname, './src/components'),
      '@pages': resolve(__dirname, './src/pages'),
      '@hooks': resolve(__dirname, './src/hooks'),
      '@services': resolve(__dirname, './src/services'),
      '@store': resolve(__dirname, './src/store'),
      '@types': resolve(__dirname, './src/types'),
      '@utils': resolve(__dirname, './src/utils'),
      '@styles': resolve(__dirname, './src/styles'),
      '@assets': resolve(__dirname, './src/assets'),
    },
  },
  
  build: {
    outDir: 'dist',
    sourcemap: process.env.NODE_ENV !== 'production',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          state: ['zustand'],
          ui: ['lucide-react', 'clsx', 'tailwind-merge'],
          http: ['axios'],
          editor: ['@tiptap/react', '@tiptap/starter-kit'], // Future rich text editor
          pdf: ['react-pdf', 'pdfjs-dist'], // Future PDF viewer
        },
        chunkFileNames: 'assets/[name].[hash].js',
        entryFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]',
      },
    },
    
    // Optimization settings
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    
    // Bundle analysis
    reportCompressedSize: true,
    chunkSizeWarningLimit: 1000,
  },
  
  server: {
    port: 3000,
    open: true,
    cors: true,
    proxy: {
      '/api': {
        target: process.env.VITE_API_BASE_URL || 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/ws': {
        target: process.env.VITE_WS_URL || 'ws://localhost:8000',
        ws: true,
        changeOrigin: true,
      },
    },
  },
  
  // Enhanced testing configuration
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
      ],
    },
  },
  
  // Performance optimizations
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'zustand',
      'axios',
      'lucide-react',
      'clsx',
      'tailwind-merge',
    ],
  },
})
```

### 6.2 Enhanced Package.json Scripts

```json
{
  "scripts": {
    "dev": "vite --host",
    "build": "tsc && vite build",
    "build:analyze": "npm run build && npx vite-bundle-analyzer dist",
    "preview": "vite preview",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "test:e2e": "playwright test",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "lint:fix": "eslint . --ext ts,tsx --fix",
    "format": "prettier --write \"src/**/*.{ts,tsx,js,jsx,json,css,md}\"",
    "format:check": "prettier --check \"src/**/*.{ts,tsx,js,jsx,json,css,md}\"",
    "typecheck": "tsc --noEmit",
    "typecheck:watch": "tsc --noEmit --watch",
    "storybook": "storybook dev -p 6006",
    "build-storybook": "storybook build",
    "clean": "rimraf dist node_modules/.vite",
    "prepare": "husky install",
    "check-all": "npm run typecheck && npm run lint && npm run test && npm run build"
  }
}
```

## 7. Modern React Patterns Implementation

### 7.1 Custom Hooks Pattern

```typescript
// Enhanced custom hooks for common patterns

// Chat management hook
export const useChat = (conversationId?: string) => {
  const {
    conversations,
    messages,
    isLoading,
    error,
    sendMessage,
    streamMessage,
  } = useChatStore()
  
  const [streamingText, setStreamingText] = useState('')
  
  const sendChatMessage = useCallback(async (content: string, attachments?: File[]) => {
    if (!conversationId) return
    
    try {
      await sendMessage(conversationId, content, attachments)
    } catch (error) {
      console.error('Failed to send message:', error)
      // Handle error appropriately
    }
  }, [conversationId, sendMessage])
  
  const streamChatMessage = useCallback(async (content: string) => {
    if (!conversationId) return
    
    try {
      const stream = await streamMessage(conversationId, content)
      const reader = stream.getReader()
      
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        
        setStreamingText(prev => prev + value)
      }
    } catch (error) {
      console.error('Failed to stream message:', error)
    } finally {
      setStreamingText('')
    }
  }, [conversationId, streamMessage])
  
  return {
    conversations,
    messages: conversationId ? messages[conversationId] || [] : [],
    isLoading,
    error,
    streamingText,
    sendMessage: sendChatMessage,
    streamMessage: streamChatMessage,
  }
}

// Document management hook
export const useDocuments = () => {
  const {
    documents,
    uploadProgress,
    selectedDocuments,
    uploadDocuments,
    deleteDocuments,
    shareDocument,
  } = useDocumentsStore()
  
  const uploadFiles = useCallback(async (files: File[], folderId?: string) => {
    try {
      await uploadDocuments(files, folderId)
      // Show success notification
      useAppStore.getState().addNotification({
        type: 'success',
        title: 'Upload Complete',
        message: `Successfully uploaded ${files.length} document(s)`,
      })
    } catch (error) {
      // Handle upload error
      useAppStore.getState().addNotification({
        type: 'error',
        title: 'Upload Failed',
        message: 'Failed to upload documents. Please try again.',
      })
    }
  }, [uploadDocuments])
  
  return {
    documents,
    uploadProgress,
    selectedDocuments,
    uploadFiles,
    deleteDocuments,
    shareDocument,
  }
}

// WebSocket hook for real-time features
export const useWebSocket = () => {
  const { isConnected, connect, disconnect, subscribe, unsubscribe } = useWebSocketStore()
  
  useEffect(() => {
    connect()
    return () => disconnect()
  }, [connect, disconnect])
  
  const subscribeToUpdates = useCallback((channel: string, callback: (data: any) => void) => {
    subscribe(channel, callback)
    return () => unsubscribe(channel, callback)
  }, [subscribe, unsubscribe])
  
  return {
    isConnected,
    subscribeToUpdates,
  }
}
```

### 7.2 Error Boundary Pattern

```typescript
// Enhanced error boundary with recovery options
interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
  errorInfo?: React.ErrorInfo
}

export class ErrorBoundary extends React.Component<
  React.PropsWithChildren<{ fallback?: React.ComponentType<any> }>,
  ErrorBoundaryState
> {
  constructor(props: React.PropsWithChildren<{ fallback?: React.ComponentType<any> }>) {
    super(props)
    this.state = { hasError: false }
  }
  
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }
  
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ error, errorInfo })
    
    // Log error to monitoring service
    console.error('Error caught by boundary:', error, errorInfo)
    
    // Report to error tracking service
    // reportError(error, errorInfo)
  }
  
  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined })
  }
  
  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback
      return (
        <FallbackComponent
          error={this.state.error}
          onRetry={this.handleRetry}
        />
      )
    }
    
    return this.props.children
  }
}

// Default error fallback component
const DefaultErrorFallback: React.FC<{
  error?: Error
  onRetry: () => void
}> = ({ error, onRetry }) => (
  <div className="flex flex-col items-center justify-center min-h-screen p-4">
    <div className="text-center max-w-md">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">
        Something went wrong
      </h2>
      <p className="text-gray-600 mb-6">
        We apologize for the inconvenience. Please try again or contact support if the problem persists.
      </p>
      {error && (
        <details className="mb-6 text-left bg-gray-50 p-4 rounded">
          <summary className="cursor-pointer text-sm font-medium">
            Error Details
          </summary>
          <pre className="mt-2 text-xs text-gray-800 overflow-auto">
            {error.message}
          </pre>
        </details>
      )}
      <div className="space-x-4">
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Try Again
        </button>
        <button
          onClick={() => window.location.href = '/'}
          className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
        >
          Go Home
        </button>
      </div>
    </div>
  </div>
)
```

## 8. Security and Performance Considerations

### 8.1 Security Enhancements

```typescript
// PII detection and redaction hook
export const usePIIProtection = () => {
  const redactPII = useCallback((text: string): string => {
    // Implement PII detection and redaction logic
    return text
      .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '***-**-****') // SSN
      .replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, '****-****-****-****') // Credit card
      .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '***@***.***') // Email
  }, [])
  
  const detectPII = useCallback((text: string): boolean => {
    const piiPatterns = [
      /\b\d{3}-\d{2}-\d{4}\b/, // SSN
      /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/, // Credit card
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email
    ]
    
    return piiPatterns.some(pattern => pattern.test(text))
  }, [])
  
  return { redactPII, detectPII }
}

// Content Security Policy configuration
const cspConfig = {
  'default-src': ["'self'"],
  'script-src': ["'self'", "'unsafe-inline'", process.env.VITE_CDN_URL],
  'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
  'font-src': ["'self'", 'https://fonts.gstatic.com'],
  'img-src': ["'self'", 'data:', 'https:'],
  'connect-src': ["'self'", process.env.VITE_API_BASE_URL, process.env.VITE_WS_URL],
  'frame-src': ["'none'"],
  'object-src': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
}
```

### 8.2 Performance Optimization

```typescript
// Virtualization for large lists
import { FixedSizeList as List } from 'react-window'

const VirtualizedDocumentList: React.FC<{
  documents: Document[]
  onDocumentClick: (document: Document) => void
}> = ({ documents, onDocumentClick }) => {
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => (
    <div style={style}>
      <DocumentCard
        document={documents[index]}
        onClick={() => onDocumentClick(documents[index])}
      />
    </div>
  )
  
  return (
    <List
      height={600}
      itemCount={documents.length}
      itemSize={120}
      width="100%"
    >
      {Row}
    </List>
  )
}

// Debounced search hook
export const useDebouncedSearch = (searchTerm: string, delay: number = 300) => {
  const [debouncedTerm, setDebouncedTerm] = useState(searchTerm)
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedTerm(searchTerm)
    }, delay)
    
    return () => {
      clearTimeout(handler)
    }
  }, [searchTerm, delay])
  
  return debouncedTerm
}

// Memoized component patterns
const MemoizedChatMessage = React.memo<ChatMessageProps>(({ message, onEdit, onDelete }) => {
  return (
    <div className="message">
      {/* Message content */}
    </div>
  )
}, (prevProps, nextProps) => {
  return (
    prevProps.message.id === nextProps.message.id &&
    prevProps.message.content === nextProps.message.content &&
    prevProps.message.timestamp === nextProps.message.timestamp
  )
})
```

## 9. Implementation Roadmap

### Phase 1: Foundation Enhancement (Weeks 1-2)
- ✅ Current architecture analysis complete
- 🔄 Enhance existing stores with advanced features
- 🔄 Implement comprehensive error boundaries
- 🔄 Add performance monitoring hooks
- 🔄 Set up advanced routing with guards

### Phase 2: AI Chat Interface (Weeks 3-4)
- 🔄 Build chat component hierarchy
- 🔄 Implement streaming message support
- 🔄 Add citation and source display
- 🔄 Create template system
- 🔄 Integrate WebSocket for real-time updates

### Phase 3: Document Management (Weeks 5-6)
- 🔄 Advanced document viewer with annotations
- 🔄 Bulk upload with progress tracking
- 🔄 Document search and filtering
- 🔄 OCR and text extraction
- 🔄 Share and collaboration features

### Phase 4: Case Management (Weeks 7-8)
- 🔄 Case timeline and milestones
- 🔄 Task management integration
- 🔄 Calendar integration
- 🔄 Team collaboration features
- 🔄 Automated deadline tracking

### Phase 5: Research Tools (Weeks 9-10)
- 🔄 Legal research interface
- 🔄 Citation management
- 🔄 Research workspace organization
- 🔄 AI-powered relevance scoring
- 🔄 Export and sharing capabilities

### Phase 6: Advanced Features (Weeks 11-12)
- 🔄 Advanced security features
- 🔄 Performance optimizations
- 🔄 Accessibility improvements
- 🔄 Mobile responsiveness
- 🔄 Integration testing

## 10. Success Metrics

### Performance Targets
- **First Contentful Paint**: < 1.5s
- **Time to Interactive**: < 3s
- **Bundle Size**: < 500KB gzipped
- **Core Web Vitals**: All green scores
- **Accessibility Score**: > 95% (WCAG 2.1 AA)

### User Experience Targets
- **Chat Response Time**: < 2s for initial response
- **Document Upload**: Support files up to 100MB
- **Search Response**: < 500ms for document search
- **Offline Capability**: Basic functionality without internet
- **Error Recovery**: Graceful error handling with recovery options

### Technical Targets
- **Test Coverage**: > 90% for critical paths
- **TypeScript Coverage**: 100% strict mode compliance
- **Code Quality**: ESLint score > 9.5/10
- **Security**: Zero high-severity vulnerabilities
- **Documentation**: 100% API documentation coverage

## Conclusion

This comprehensive architecture plan builds upon the existing solid foundation in the `/GUI` folder, enhancing it with modern React patterns, advanced state management, and professional legal workflow features. The modular approach ensures maintainability and scalability while the performance optimizations and security considerations make it production-ready for legal professionals.

The implementation roadmap provides a clear path forward with measurable milestones, ensuring successful delivery of a world-class legal AI assistant interface.