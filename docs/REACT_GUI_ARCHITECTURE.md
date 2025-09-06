# BEAR AI Legal Assistant - React GUI Architecture Design

## Executive Summary

This document outlines the comprehensive system architecture for a production-ready React GUI for the BEAR AI legal assistant. The design prioritizes professional legal industry standards, security, performance, and user experience while maintaining the three-click accessibility rule and modern UI patterns.

## 1. Architecture Overview

### 1.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    BEAR AI React Frontend                   │
├─────────────────┬─────────────────┬─────────────────────────┤
│   Presentation  │   Application   │       Infrastructure    │
│     Layer       │     Layer       │         Layer          │
├─────────────────┼─────────────────┼─────────────────────────┤
│ • UI Components │ • State Mgmt    │ • API Client           │
│ • Pages/Routes  │ • Business      │ • Authentication       │
│ • Design System │   Logic         │ • Local Storage        │
│ • Theming      │ • Hooks         │ • File System          │
└─────────────────┴─────────────────┴─────────────────────────┘
```

### 1.2 Technology Stack Decisions

- **Frontend Framework**: React 18.2+ with TypeScript 5.0+
- **State Management**: Zustand (lightweight, performant)
- **Styling**: Tailwind CSS 3.3+ with CSS Modules for components
- **Routing**: React Router v6 (for SPA navigation)
- **HTTP Client**: Axios with interceptors
- **Build Tool**: Vite 4.0+ (fast development, optimized builds)
- **Testing**: Vitest + Testing Library + Playwright (E2E)
- **Icons**: Lucide React (consistent legal-themed icons)
- **Forms**: React Hook Form + Zod validation
- **File Upload**: React Dropzone
- **UI Components**: Custom components built on Radix UI primitives

## 2. Component Architecture

### 2.1 Component Hierarchy

```
src/
├── components/
│   ├── ui/                    # Reusable UI components
│   │   ├── Button/
│   │   ├── Input/
│   │   ├── Card/
│   │   ├── Dialog/
│   │   ├── Dropdown/
│   │   ├── Toast/
│   │   └── index.ts
│   ├── layout/                # Layout components
│   │   ├── AppLayout/
│   │   ├── Sidebar/
│   │   ├── TopBar/
│   │   ├── StatusBar/
│   │   └── ContentArea/
│   ├── chat/                  # Chat-specific components
│   │   ├── ChatBubble/
│   │   ├── MessageList/
│   │   ├── ChatInput/
│   │   ├── QuickActionBar/
│   │   ├── TaskResultCard/
│   │   └── TypingIndicator/
│   ├── documents/             # Document management
│   │   ├── DocumentCard/
│   │   ├── DocumentList/
│   │   ├── DocumentPreview/
│   │   ├── FileUpload/
│   │   ├── AnnotationOverlay/
│   │   └── VersionHistory/
│   ├── research/              # Legal research components
│   │   ├── SearchBar/
│   │   ├── FilterPanel/
│   │   ├── ResultsList/
│   │   ├── CitationCard/
│   │   └── SavedSearches/
│   └── common/                # Shared components
│       ├── LoadingSpinner/
│       ├── ErrorBoundary/
│       ├── ConfirmDialog/
│       └── SecurityBadge/
├── pages/                     # Page components (route components)
├── hooks/                     # Custom React hooks
├── stores/                    # Zustand stores
├── services/                  # API services
├── types/                     # TypeScript type definitions
├── utils/                     # Utility functions
└── constants/                 # App constants
```

### 2.2 Core Page Components

#### 2.2.1 Chat Page
```typescript
interface ChatPageProps {
  conversationId?: string;
}

const ChatPage: React.FC<ChatPageProps> = ({
  conversationId
}) => {
  // Chat functionality with legal context
  // Integration with document preview
  // Quick action buttons for legal queries
  // Message history and search
};
```

#### 2.2.2 Documents Page
```typescript
interface DocumentsPageProps {
  caseId?: string;
  filter?: DocumentFilter;
}

const DocumentsPage: React.FC<DocumentsPageProps> = ({
  caseId,
  filter
}) => {
  // Document grid/list view
  // Upload, preview, annotation
  // Version control and collaboration
  // Advanced search and filtering
};
```

#### 2.2.3 Research Page
```typescript
interface ResearchPageProps {
  query?: string;
}

const ResearchPage: React.FC<ResearchPageProps> = ({
  query
}) => {
  // Legal research interface
  // Advanced search with Boolean operators
  // Results categorization
  // Citation management
};
```

## 3. State Management Architecture

### 3.1 Zustand Store Structure

```typescript
// stores/index.ts
export interface AppState {
  // UI State
  theme: 'light' | 'dark';
  sidebarCollapsed: boolean;
  
  // User & Auth
  user: User | null;
  isAuthenticated: boolean;
  
  // Chat State
  conversations: Conversation[];
  activeConversationId: string | null;
  messages: Message[];
  isTyping: boolean;
  
  // Documents State
  documents: Document[];
  selectedDocuments: Document[];
  documentFilters: DocumentFilter;
  
  // Research State
  searchQuery: string;
  searchResults: SearchResult[];
  savedSearches: SavedSearch[];
  
  // Global Loading/Error
  isLoading: boolean;
  error: string | null;
}

// Separate stores for better modularity
export const useChatStore = create<ChatState>((set, get) => ({...}));
export const useDocumentStore = create<DocumentState>((set, get) => ({...}));
export const useResearchStore = create<ResearchState>((set, get) => ({...}));
export const useUIStore = create<UIState>((set, get) => ({...}));
```

### 3.2 State Persistence Strategy

```typescript
// utils/persistence.ts
import { persist } from 'zustand/middleware';

export const createPersistedStore = <T>(
  name: string,
  store: StateCreator<T>
) => create(
  persist(store, {
    name: `bear-ai-${name}`,
    storage: createJSONStorage(() => localStorage),
    partialize: (state) => ({ 
      // Only persist non-sensitive data
      ...state,
      messages: [], // Don't persist messages for security
    }),
  })
);
```

## 4. API Client Architecture

### 4.1 Service Layer Design

```typescript
// services/api/base.ts
export class ApiClient {
  private axiosInstance: AxiosInstance;
  
  constructor() {
    this.axiosInstance = axios.create({
      baseURL: process.env.VITE_API_BASE_URL,
      timeout: 30000,
    });
    
    this.setupInterceptors();
  }
  
  private setupInterceptors() {
    // Request interceptor for auth tokens
    // Response interceptor for error handling
    // Retry logic for failed requests
  }
}

// services/api/chat.ts
export class ChatService extends ApiClient {
  async sendMessage(conversationId: string, message: string): Promise<ChatResponse> {
    return this.post(`/chat/${conversationId}/messages`, { message });
  }
  
  async getConversations(): Promise<Conversation[]> {
    return this.get('/chat/conversations');
  }
  
  async streamMessage(conversationId: string, message: string): Promise<EventSource> {
    // Server-sent events for real-time responses
  }
}

// services/api/documents.ts
export class DocumentService extends ApiClient {
  async uploadDocument(file: File, metadata: DocumentMetadata): Promise<Document> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('metadata', JSON.stringify(metadata));
    
    return this.post('/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  }
  
  async getDocuments(filter?: DocumentFilter): Promise<Document[]> {
    return this.get('/documents', { params: filter });
  }
  
  async annotateDocument(documentId: string, annotations: Annotation[]): Promise<void> {
    return this.patch(`/documents/${documentId}/annotations`, { annotations });
  }
}

// services/api/research.ts
export class ResearchService extends ApiClient {
  async search(query: string, filters?: SearchFilters): Promise<SearchResults> {
    return this.post('/research/search', { query, filters });
  }
  
  async getCitations(documentIds: string[]): Promise<Citation[]> {
    return this.post('/research/citations', { documentIds });
  }
}
```

### 4.2 API Contracts

```typescript
// types/api.ts
export interface ChatResponse {
  id: string;
  message: string;
  timestamp: string;
  metadata: {
    confidence: number;
    sources: string[];
    legalContext: string[];
  };
}

export interface Document {
  id: string;
  title: string;
  type: DocumentType;
  size: number;
  uploadDate: string;
  lastModified: string;
  tags: string[];
  annotations: Annotation[];
  securityClassification: 'public' | 'confidential' | 'privileged';
  caseId?: string;
  clientId?: string;
}

export interface SearchResult {
  id: string;
  title: string;
  snippet: string;
  relevanceScore: number;
  source: 'case_law' | 'statute' | 'regulation' | 'document';
  jurisdiction: string;
  datePublished: string;
  citations: Citation[];
}
```

## 5. UI Component Library Design

### 5.1 Design System Tokens

```typescript
// styles/tokens.ts
export const designTokens = {
  colors: {
    primary: {
      50: '#eff8ff',
      500: '#1B365C', // Deep blue from guide
      900: '#0f1419',
    },
    secondary: {
      50: '#f9fafb',
      500: '#6B7280', // Warm gray from guide
      900: '#111827',
    },
    success: {
      500: '#059669', // Rich green from guide
    },
    error: {
      500: '#DC2626', // Refined red from guide
    },
  },
  typography: {
    fontFamily: {
      sans: ['Inter', 'system-ui', 'sans-serif'],
      mono: ['JetBrains Mono', 'monospace'],
    },
    fontSize: {
      'caption': '12px',     // Caption text
      'body': '14px',        // Body text  
      'subheading': '18px',  // Secondary headers
      'heading': '24px',     // Primary headers
    },
  },
  spacing: {
    unit: 8, // 8px grid system
  },
  borderRadius: {
    sm: '4px',
    md: '8px',
    lg: '12px',
  },
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
    lg: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
  },
};
```

### 5.2 Core Component Specifications

#### 5.2.1 Button Component
```typescript
// components/ui/Button/Button.tsx
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'ghost' | 'danger';
  size: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  icon,
  loading,
  disabled,
  onClick,
  children,
  className,
  ...props
}) => {
  // Implementation with proper accessibility
  // Focus management, keyboard navigation
  // Loading states, disabled states
  // Icon positioning
};
```

#### 5.2.2 ChatBubble Component
```typescript
// components/chat/ChatBubble/ChatBubble.tsx
interface ChatBubbleProps {
  message: Message;
  isUser: boolean;
  showAvatar?: boolean;
  showTimestamp?: boolean;
  onCopy?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({
  message,
  isUser,
  showAvatar = true,
  showTimestamp = true,
  onCopy,
  onEdit,
  onDelete,
}) => {
  // Professional chat bubble design
  // Legal context highlighting
  // Citation links
  // Copy/edit/delete actions
  // Markdown rendering for formatted responses
};
```

## 6. Routing Architecture

### 6.1 Route Structure

```typescript
// routes/index.tsx
export const routes = [
  {
    path: '/',
    element: <AppLayout />,
    children: [
      {
        path: '/',
        element: <Navigate to="/chat" replace />,
      },
      {
        path: '/chat',
        element: <ChatPage />,
        children: [
          {
            path: ':conversationId',
            element: <ChatPage />,
          },
        ],
      },
      {
        path: '/documents',
        element: <DocumentsPage />,
        children: [
          {
            path: ':documentId',
            element: <DocumentDetailPage />,
          },
          {
            path: 'upload',
            element: <DocumentUploadPage />,
          },
        ],
      },
      {
        path: '/research',
        element: <ResearchPage />,
      },
      {
        path: '/history',
        element: <HistoryPage />,
      },
      {
        path: '/settings',
        element: <SettingsPage />,
      },
    ],
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
];
```

### 6.2 Navigation Patterns

```typescript
// hooks/useNavigation.ts
export const useNavigation = () => {
  const navigate = useNavigate();
  
  const navigateToChat = (conversationId?: string) => {
    navigate(conversationId ? `/chat/${conversationId}` : '/chat');
  };
  
  const navigateToDocument = (documentId: string) => {
    navigate(`/documents/${documentId}`);
  };
  
  const navigateWithState = (path: string, state: any) => {
    navigate(path, { state });
  };
  
  return {
    navigateToChat,
    navigateToDocument,
    navigateWithState,
  };
};
```

## 7. TypeScript Data Models

### 7.1 Core Legal Entities

```typescript
// types/legal.ts
export interface Case {
  id: string;
  title: string;
  caseNumber: string;
  client: Client;
  status: CaseStatus;
  practiceArea: PracticeArea;
  assignedAttorney: string;
  createdDate: string;
  lastActivity: string;
  documents: Document[];
  notes: CaseNote[];
  deadlines: Deadline[];
}

export interface Client {
  id: string;
  name: string;
  type: 'individual' | 'corporate';
  contactInfo: ContactInfo;
  retainerStatus: 'active' | 'inactive';
  conflictChecked: boolean;
  cases: string[]; // Case IDs
}

export interface Document {
  id: string;
  title: string;
  type: DocumentType;
  content?: string; // For text documents
  fileUrl?: string; // For uploaded files
  size: number;
  mimeType: string;
  uploadDate: string;
  lastModified: string;
  version: number;
  tags: string[];
  annotations: Annotation[];
  securityClassification: SecurityLevel;
  caseId?: string;
  clientId?: string;
  metadata: DocumentMetadata;
}

export interface Annotation {
  id: string;
  documentId: string;
  userId: string;
  type: 'highlight' | 'note' | 'redaction' | 'bookmark';
  position: {
    page?: number;
    startOffset: number;
    endOffset: number;
  };
  content: string;
  color?: string;
  createdDate: string;
  lastModified: string;
}

export interface Message {
  id: string;
  conversationId: string;
  content: string;
  type: 'user' | 'assistant';
  timestamp: string;
  metadata?: {
    confidence?: number;
    sources?: string[];
    legalContext?: string[];
    relatedCases?: string[];
    citations?: Citation[];
  };
  status: 'sending' | 'sent' | 'error';
}

export interface Citation {
  id: string;
  title: string;
  citation: string; // Proper legal citation format
  url?: string;
  jurisdiction: string;
  court?: string;
  dateDecided?: string;
  relevanceScore: number;
}
```

### 7.2 Application State Types

```typescript
// types/state.ts
export interface ChatState {
  conversations: Conversation[];
  activeConversationId: string | null;
  messages: Message[];
  isTyping: boolean;
  streamingMessage: Partial<Message> | null;
}

export interface DocumentState {
  documents: Document[];
  selectedDocuments: Document[];
  uploadQueue: UploadQueueItem[];
  filters: DocumentFilter;
  sortBy: DocumentSortOption;
  viewMode: 'grid' | 'list';
}

export interface ResearchState {
  query: string;
  results: SearchResult[];
  filters: SearchFilters;
  savedSearches: SavedSearch[];
  isSearching: boolean;
  searchHistory: string[];
}

export interface UIState {
  theme: 'light' | 'dark';
  sidebarCollapsed: boolean;
  activeModal: string | null;
  notifications: Notification[];
  loading: { [key: string]: boolean };
  errors: { [key: string]: string | null };
}
```

## 8. Security Architecture

### 8.1 Client-Side Security Measures

```typescript
// utils/security.ts
export class SecurityManager {
  // Client-side encryption for sensitive data
  static encryptSensitiveData(data: string): string {
    // Implementation for client-side encryption
  }
  
  // Secure token storage
  static storeToken(token: string): void {
    // Secure storage implementation
  }
  
  // Input sanitization
  static sanitizeInput(input: string): string {
    // XSS prevention
  }
  
  // File upload validation
  static validateFileUpload(file: File): ValidationResult {
    // File type, size, content validation
  }
}

// components/common/SecurityBadge.tsx
export const SecurityBadge: React.FC<{ level: SecurityLevel }> = ({ level }) => {
  // Visual security indicator for users
};
```

### 8.2 Data Classification

```typescript
// types/security.ts
export type SecurityLevel = 'public' | 'confidential' | 'privileged' | 'attorney-work-product';

export interface SecurityContext {
  userClearance: SecurityLevel;
  documentClassification: SecurityLevel;
  accessLogging: boolean;
  encryptionRequired: boolean;
}
```

## 9. Performance Optimization Strategy

### 9.1 Code Splitting and Lazy Loading

```typescript
// routes/lazy.ts
import { lazy } from 'react';

export const ChatPage = lazy(() => import('../pages/ChatPage'));
export const DocumentsPage = lazy(() => import('../pages/DocumentsPage'));
export const ResearchPage = lazy(() => import('../pages/ResearchPage'));

// components/common/LazyWrapper.tsx
export const LazyWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Suspense fallback={<LoadingSpinner />}>
    {children}
  </Suspense>
);
```

### 9.2 Virtualization for Large Lists

```typescript
// components/common/VirtualizedList.tsx
import { FixedSizeList as List } from 'react-window';

export const VirtualizedDocumentList: React.FC<{
  documents: Document[];
  height: number;
}> = ({ documents, height }) => {
  // Efficient rendering for large document lists
};
```

## 10. Testing Strategy

### 10.1 Testing Structure

```
src/
├── __tests__/
│   ├── components/
│   ├── hooks/
│   ├── services/
│   └── utils/
├── e2e/
│   ├── chat.spec.ts
│   ├── documents.spec.ts
│   └── research.spec.ts
└── setup/
    ├── test-utils.tsx
    └── mocks/
```

### 10.2 Testing Standards

```typescript
// setup/test-utils.tsx
export const renderWithProviders = (
  ui: React.ReactElement,
  options?: {
    preloadedState?: Partial<AppState>;
    route?: string;
  }
) => {
  // Custom render with all providers
};

// Example component test
// __tests__/components/ChatBubble.test.tsx
describe('ChatBubble', () => {
  it('renders user message correctly', () => {
    const message = createMockMessage({ type: 'user' });
    render(<ChatBubble message={message} isUser={true} />);
    
    expect(screen.getByText(message.content)).toBeInTheDocument();
    expect(screen.getByRole('article')).toHaveClass('user-message');
  });
});
```

## 11. Build and Deployment

### 11.1 Vite Configuration

```typescript
// vite.config.ts
export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  build: {
    target: 'esnext',
    minify: 'terser',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
        },
      },
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
});
```

### 11.2 Environment Configuration

```typescript
// config/environment.ts
export const config = {
  api: {
    baseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
    timeout: Number(import.meta.env.VITE_API_TIMEOUT) || 30000,
  },
  features: {
    documentAnnotation: import.meta.env.VITE_ENABLE_ANNOTATIONS === 'true',
    advancedSearch: import.meta.env.VITE_ENABLE_ADVANCED_SEARCH === 'true',
  },
  security: {
    encryptionEnabled: import.meta.env.VITE_ENCRYPTION_ENABLED === 'true',
    auditLogging: import.meta.env.VITE_AUDIT_LOGGING === 'true',
  },
};
```

## 12. Accessibility Compliance

### 12.1 WCAG 2.1 AA Implementation

```typescript
// utils/accessibility.ts
export const a11yProps = {
  // Semantic HTML usage
  role: 'main' | 'navigation' | 'complementary' | 'article',
  
  // ARIA labels and descriptions
  'aria-label': string,
  'aria-describedby': string,
  'aria-expanded': boolean,
  
  // Keyboard navigation
  tabIndex: number,
  onKeyDown: (e: KeyboardEvent) => void,
};

// Focus management hook
export const useFocusManagement = () => {
  // Tab trapping, focus restoration
};
```

## 13. Architecture Decision Records

### ADR-001: State Management Choice - Zustand

**Decision**: Use Zustand instead of Redux Toolkit or Context API

**Rationale**:
- Minimal boilerplate compared to Redux
- Better performance than Context API for frequent updates  
- TypeScript-first design
- Smaller bundle size
- Easier testing and debugging

**Trade-offs**:
- Less ecosystem support than Redux
- Newer library with smaller community

### ADR-002: Styling Approach - Tailwind CSS + CSS Modules

**Decision**: Combine Tailwind CSS for utility classes with CSS Modules for component-specific styles

**Rationale**:
- Rapid development with utility classes
- Component isolation with CSS Modules
- Easy theming with CSS custom properties
- Good performance with purging unused styles

**Trade-offs**:
- Learning curve for team
- Potential for large HTML class strings

### ADR-003: Form Handling - React Hook Form + Zod

**Decision**: Use React Hook Form for form state and Zod for validation

**Rationale**:
- Better performance with uncontrolled components
- Built-in validation support
- TypeScript integration with Zod
- Good developer experience

**Trade-offs**:
- Additional dependency for validation
- Different pattern from Formik

## 14. Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2)
- [ ] Project setup with Vite, TypeScript, Tailwind
- [ ] Core component library (Button, Input, Card, etc.)
- [ ] Layout components (AppLayout, Sidebar, TopBar)
- [ ] Basic routing setup
- [ ] State management structure

### Phase 2: Core Features (Weeks 3-5)
- [ ] Chat interface implementation
- [ ] Document management basic functionality
- [ ] API client architecture
- [ ] Authentication flow
- [ ] Error handling and loading states

### Phase 3: Advanced Features (Weeks 6-8)
- [ ] Legal research interface
- [ ] Document annotation system
- [ ] Advanced search functionality
- [ ] File upload with validation
- [ ] Real-time chat streaming

### Phase 4: Polish & Testing (Weeks 9-10)
- [ ] Comprehensive testing suite
- [ ] Performance optimization
- [ ] Accessibility compliance verification
- [ ] Security audit
- [ ] Documentation completion

## 15. Conclusion

This architecture provides a solid foundation for building a professional, secure, and performant React GUI for the BEAR AI legal assistant. The design emphasizes:

- **Modularity**: Clear separation of concerns with well-defined layers
- **Scalability**: Component architecture that can grow with requirements
- **Performance**: Optimized bundle splitting and virtual rendering
- **Security**: Client-side encryption and secure data handling
- **Accessibility**: WCAG 2.1 AA compliance for professional use
- **Developer Experience**: TypeScript-first approach with good tooling

The architecture follows industry best practices while addressing the specific needs of legal professionals, ensuring the application meets the high standards expected in the legal industry.