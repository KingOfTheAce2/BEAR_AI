# BEAR AI Legal Assistant - Component Specifications

## Overview

This document provides detailed specifications for all React components in the BEAR AI legal assistant application. Each component is designed following the professional legal industry standards outlined in the UI Implementation Guide.

## Design Principles

- **Professional Appearance**: Clean, legal-professional styling
- **Three-Click Rule**: Core functions accessible within 3 clicks
- **Accessibility**: WCAG 2.1 AA compliance
- **Security**: Visual security indicators and secure data handling
- **Performance**: Optimized rendering and memory usage

## Color System

```typescript
export const colorSystem = {
  primary: '#1B365C',      // Deep blue - trust and professionalism
  secondary: '#6B7280',    // Warm gray - supporting elements
  accent: '#059669',       // Rich green - positive actions
  error: '#DC2626',        // Refined red - warnings and errors
  background: '#FFFFFF',   // Pure white - content areas
  backgroundSecondary: '#F9FAFB', // Light gray - secondary areas
};
```

## 1. Layout Components

### 1.1 AppLayout

**Purpose**: Main application layout container
**Location**: `src/components/layout/AppLayout/`

```typescript
interface AppLayoutProps {
  children: React.ReactNode;
}

interface AppLayoutState {
  sidebarCollapsed: boolean;
  theme: 'light' | 'dark';
}
```

**Features**:
- Responsive layout grid
- Sidebar collapse/expand functionality
- Theme switching support
- Keyboard navigation (Alt+S for sidebar toggle)
- Focus management between sections

**Accessibility**:
- `role="application"`
- Skip links for main content
- Landmark regions properly labeled

### 1.2 Sidebar

**Purpose**: Primary navigation sidebar
**Location**: `src/components/layout/Sidebar/`

```typescript
interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  activeRoute: string;
}

interface NavigationItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  route: string;
  badge?: number; // For notifications
  shortcut?: string; // Keyboard shortcut
}
```

**Navigation Items**:
1. **Chat/Conversation** (`/chat`) - Ctrl+1
2. **Documents** (`/documents`) - Ctrl+2  
3. **Research** (`/research`) - Ctrl+3
4. **History** (`/history`) - Ctrl+4
5. **Settings** (`/settings`) - Ctrl+,

**Features**:
- Collapsible with icon-only mode
- Active route highlighting
- Notification badges
- Keyboard shortcuts display
- Smooth animations (200ms transition)

### 1.3 TopBar

**Purpose**: Global actions and user controls
**Location**: `src/components/layout/TopBar/`

```typescript
interface TopBarProps {
  user: User;
  onSearch: (query: string) => void;
  onNotificationsClick: () => void;
}
```

**Elements**:
- Global search bar with autocomplete
- User profile dropdown
- Notifications bell with count
- Security status indicator
- System status indicator

### 1.4 StatusBar

**Purpose**: System information and current operation status
**Location**: `src/components/layout/StatusBar/`

```typescript
interface StatusBarProps {
  connectionStatus: 'connected' | 'disconnected' | 'connecting';
  currentOperation?: string;
  progress?: number;
  securityLevel: SecurityLevel;
}
```

**Features**:
- Connection status with visual indicator
- Current operation progress
- Security classification display
- Last sync timestamp
- Quick system shortcuts

## 2. Chat Components

### 2.1 ChatBubble

**Purpose**: Individual message display with legal context
**Location**: `src/components/chat/ChatBubble/`

```typescript
interface ChatBubbleProps {
  message: Message;
  isUser: boolean;
  showAvatar?: boolean;
  showTimestamp?: boolean;
  onCopy?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onCitationClick?: (citation: Citation) => void;
}

interface Message {
  id: string;
  content: string;
  type: 'user' | 'assistant';
  timestamp: string;
  status: 'sending' | 'sent' | 'error';
  metadata?: {
    confidence?: number;
    sources?: string[];
    legalContext?: string[];
    citations?: Citation[];
  };
}
```

**Features**:
- Markdown rendering for formatted text
- Citation links with hover previews
- Copy message functionality
- Edit/delete for user messages
- Confidence indicators for AI responses
- Legal context highlighting
- Responsive design (mobile-friendly)

**Styling**:
- User messages: Right-aligned, primary color background
- AI messages: Left-aligned, light gray background
- Maximum width: 70% of container
- Border radius: 12px
- Proper spacing and typography

### 2.2 MessageList

**Purpose**: Scrollable container for chat messages
**Location**: `src/components/chat/MessageList/`

```typescript
interface MessageListProps {
  messages: Message[];
  isLoading?: boolean;
  onLoadMore?: () => void;
  onMessageAction?: (messageId: string, action: MessageAction) => void;
}
```

**Features**:
- Virtual scrolling for performance (1000+ messages)
- Auto-scroll to bottom for new messages
- Infinite scroll for message history
- Typing indicator
- Message timestamps grouping (by day)
- Search within conversation

### 2.3 ChatInput

**Purpose**: Message composition with legal-specific features
**Location**: `src/components/chat/ChatInput/`

```typescript
interface ChatInputProps {
  onSendMessage: (message: string, attachments?: File[]) => void;
  placeholder?: string;
  disabled?: boolean;
  maxLength?: number;
  showAttachments?: boolean;
}
```

**Features**:
- Auto-expanding textarea
- File attachment support (PDF, DOCX, TXT)
- Legal term autocomplete
- Character counter
- Send button (Ctrl+Enter to send)
- Voice input support (optional)
- Draft saving (auto-save every 30s)

**Legal-Specific Features**:
- Template shortcuts (contracts, motions, briefs)
- Citation formatter
- Legal terminology suggestions
- Privilege warnings for sensitive content

### 2.4 QuickActionBar

**Purpose**: Common legal query shortcuts
**Location**: `src/components/chat/QuickActionBar/`

```typescript
interface QuickActionBarProps {
  onActionClick: (action: QuickAction) => void;
  customActions?: QuickAction[];
}

interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  prompt: string;
  category: 'research' | 'drafting' | 'analysis' | 'custom';
}
```

**Default Actions**:
- "Research case law"
- "Draft contract clause"
- "Analyze document"
- "Check citations"
- "Review for compliance"
- "Generate summary"

### 2.5 TaskResultCard

**Purpose**: Display structured AI task results
**Location**: `src/components/chat/TaskResultCard/`

```typescript
interface TaskResultCardProps {
  result: TaskResult;
  onExpand?: () => void;
  onExport?: (format: ExportFormat) => void;
  onSaveToCase?: (caseId: string) => void;
}

interface TaskResult {
  id: string;
  type: 'research' | 'analysis' | 'draft' | 'summary';
  title: string;
  content: string;
  confidence: number;
  sources: Citation[];
  metadata: Record<string, any>;
  createdAt: string;
}
```

**Features**:
- Collapsible/expandable content
- Export options (PDF, DOCX, TXT)
- Save to case file
- Source citations with links
- Confidence rating display
- Share functionality

## 3. Document Components

### 3.1 DocumentCard

**Purpose**: Document preview with metadata
**Location**: `src/components/documents/DocumentCard/`

```typescript
interface DocumentCardProps {
  document: Document;
  viewMode: 'grid' | 'list';
  selected?: boolean;
  onSelect?: (selected: boolean) => void;
  onClick?: () => void;
  onPreview?: () => void;
  onDownload?: () => void;
  onDelete?: () => void;
}
```

**Features**:
- Thumbnail preview for supported formats
- Document metadata display (size, date, type)
- Security classification indicator
- Version number and history
- Tag display
- Quick actions menu
- Checkbox for bulk operations
- Drag handle for reordering

**Grid View**:
- Card layout with thumbnail
- 3-4 cards per row (responsive)
- Hover effects and animations

**List View**:
- Tabular layout
- Sortable columns
- More detailed metadata

### 3.2 DocumentList

**Purpose**: Container for multiple document cards
**Location**: `src/components/documents/DocumentList/`

```typescript
interface DocumentListProps {
  documents: Document[];
  viewMode: 'grid' | 'list';
  sortBy: DocumentSortOption;
  filterBy: DocumentFilter;
  onSelectionChange?: (selectedIds: string[]) => void;
  onSort?: (sortBy: DocumentSortOption) => void;
  onFilter?: (filter: DocumentFilter) => void;
}
```

**Features**:
- Virtual scrolling for large lists
- Bulk selection with checkbox
- Sorting options (name, date, size, type)
- Filtering by type, tags, date range
- Search within documents
- Pagination or infinite scroll
- Empty state handling

### 3.3 DocumentPreview

**Purpose**: Document content preview modal
**Location**: `src/components/documents/DocumentPreview/`

```typescript
interface DocumentPreviewProps {
  document: Document;
  isOpen: boolean;
  onClose: () => void;
  onAnnotate?: (annotation: Annotation) => void;
  onDownload?: () => void;
  onEdit?: () => void;
}
```

**Features**:
- PDF viewer with zoom controls
- Text document viewer with search
- Image preview with zoom
- Navigation between pages/sections
- Annotation tools (highlight, note, redact)
- Full-screen mode
- Print functionality
- Keyboard navigation (arrow keys, Esc)

### 3.4 FileUpload

**Purpose**: Drag-and-drop file upload with validation
**Location**: `src/components/documents/FileUpload/`

```typescript
interface FileUploadProps {
  onUpload: (files: File[], metadata: UploadMetadata) => void;
  acceptedTypes?: string[];
  maxSize?: number; // in bytes
  maxFiles?: number;
  showProgress?: boolean;
}

interface UploadMetadata {
  caseId?: string;
  clientId?: string;
  tags: string[];
  securityClassification: SecurityLevel;
  description?: string;
}
```

**Features**:
- Drag-and-drop area
- File browser button
- Multiple file selection
- File type validation
- Size validation
- Upload progress bars
- Error handling and retry
- Metadata form for uploaded files

### 3.5 AnnotationOverlay

**Purpose**: Document annotation interface
**Location**: `src/components/documents/AnnotationOverlay/`

```typescript
interface AnnotationOverlayProps {
  documentId: string;
  annotations: Annotation[];
  onAddAnnotation: (annotation: CreateAnnotation) => void;
  onEditAnnotation: (id: string, changes: Partial<Annotation>) => void;
  onDeleteAnnotation: (id: string) => void;
  readOnly?: boolean;
}
```

**Features**:
- Text selection for highlights
- Note creation and editing
- Redaction tools
- Color coding for different annotation types
- User attribution for collaborative editing
- Annotation list sidebar
- Export annotations to separate document

## 4. Research Components

### 4.1 SearchBar

**Purpose**: Advanced legal research search interface
**Location**: `src/components/research/SearchBar/`

```typescript
interface SearchBarProps {
  onSearch: (query: string, filters: SearchFilters) => void;
  placeholder?: string;
  showFilters?: boolean;
  savedSearches?: SavedSearch[];
  recentSearches?: string[];
}

interface SearchFilters {
  jurisdiction?: string[];
  dateRange?: DateRange;
  docType?: DocumentType[];
  court?: string[];
  practiceArea?: PracticeArea[];
}
```

**Features**:
- Boolean search operators (AND, OR, NOT)
- Auto-complete for legal terms
- Search history dropdown
- Saved searches
- Advanced filters panel
- Search suggestions
- Voice search (optional)

### 4.2 FilterPanel

**Purpose**: Advanced search filters for legal research
**Location**: `src/components/research/FilterPanel/`

```typescript
interface FilterPanelProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  onClear: () => void;
  onSaveSearch?: (name: string) => void;
}
```

**Filters Available**:
- Jurisdiction (Federal, State, International)
- Date Range (picker or presets)
- Document Type (Case Law, Statutes, Regulations, etc.)
- Court Level (Supreme, Appellate, District)
- Practice Area (Corporate, Litigation, IP, etc.)
- Citation Format preference

### 4.3 ResultsList

**Purpose**: Search results display with relevance ranking
**Location**: `src/components/research/ResultsList/`

```typescript
interface ResultsListProps {
  results: SearchResult[];
  isLoading?: boolean;
  onResultClick?: (result: SearchResult) => void;
  onSaveToCitation?: (result: SearchResult) => void;
  onExport?: (results: SearchResult[]) => void;
}

interface SearchResult {
  id: string;
  title: string;
  snippet: string;
  url?: string;
  relevanceScore: number;
  source: 'case_law' | 'statute' | 'regulation' | 'secondary';
  jurisdiction: string;
  court?: string;
  datePublished: string;
  citation: string;
  keyTerms: string[];
}
```

**Features**:
- Relevance score display
- Snippet highlighting of search terms
- Citation formatting
- Save to research folder
- Export selected results
- Infinite scroll loading
- Result preview modal

### 4.4 CitationCard

**Purpose**: Proper legal citation display and management
**Location**: `src/components/research/CitationCard/`

```typescript
interface CitationCardProps {
  citation: Citation;
  format: CitationFormat;
  onFormatChange?: (format: CitationFormat) => void;
  onCopy?: () => void;
  onAddToDocument?: () => void;
}

type CitationFormat = 'bluebook' | 'apa' | 'mla' | 'chicago';
```

**Features**:
- Multiple citation formats
- Copy to clipboard
- Add to current document
- Validation of citation format
- Link to source (if available)
- Citation notes and commentary

## 5. UI Components (Design System)

### 5.1 Button

**Purpose**: Primary interactive element
**Location**: `src/components/ui/Button/`

```typescript
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
  size: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
  'aria-label'?: string;
}
```

**Variants**:
- **Primary**: Deep blue (#1B365C), white text
- **Secondary**: Gray border, dark text
- **Ghost**: Transparent background, hover effects
- **Danger**: Red background for destructive actions
- **Success**: Green background for confirmations

**States**:
- Default, Hover, Focus, Active, Disabled, Loading
- Minimum touch target: 44px height
- Focus indicator: 2px outline

### 5.2 Input

**Purpose**: Text input with validation support
**Location**: `src/components/ui/Input/`

```typescript
interface InputProps {
  type?: 'text' | 'email' | 'password' | 'search' | 'number';
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  label?: string;
  helpText?: string;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  maxLength?: number;
  autoComplete?: string;
}
```

**Features**:
- Floating label animation
- Error state styling
- Character counter (when maxLength set)
- Clear button (for search inputs)
- Password visibility toggle
- Auto-resize for textarea variant

### 5.3 Card

**Purpose**: Content container with consistent styling
**Location**: `src/components/ui/Card/`

```typescript
interface CardProps {
  children: React.ReactNode;
  padding?: 'sm' | 'md' | 'lg';
  shadow?: 'none' | 'sm' | 'md' | 'lg';
  border?: boolean;
  hoverable?: boolean;
  className?: string;
}
```

**Features**:
- Consistent padding and margins
- Shadow variants for depth
- Hover effects (when hoverable)
- Responsive design
- Optional border

### 5.4 Dialog/Modal

**Purpose**: Modal dialogs and overlays
**Location**: `src/components/ui/Dialog/`

```typescript
interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  children: React.ReactNode;
}
```

**Features**:
- Focus trapping within modal
- Escape key to close
- Overlay click to close (optional)
- Smooth animations (fade + scale)
- Responsive sizing
- Scroll lock on body
- Auto-focus management

### 5.5 Dropdown

**Purpose**: Select menus and dropdown lists
**Location**: `src/components/ui/Dropdown/`

```typescript
interface DropdownProps {
  trigger: React.ReactNode;
  items: DropdownItem[];
  onSelect: (item: DropdownItem) => void;
  placement?: 'bottom' | 'top' | 'left' | 'right';
  disabled?: boolean;
  maxHeight?: number;
}

interface DropdownItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  separator?: boolean;
  shortcut?: string;
}
```

**Features**:
- Keyboard navigation (arrow keys, Enter, Escape)
- Search/filter within items
- Grouped items with separators
- Keyboard shortcuts display
- Positioning logic to stay in viewport
- Multi-select variant

### 5.6 Toast/Notification

**Purpose**: Temporary notifications and alerts
**Location**: `src/components/ui/Toast/`

```typescript
interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number; // ms, 0 for persistent
  action?: {
    label: string;
    onClick: () => void;
  };
  onDismiss: () => void;
}
```

**Features**:
- Auto-dismiss timer
- Manual dismiss button
- Action button (optional)
- Stacking behavior
- Entry/exit animations
- Accessibility announcements

## 6. Common/Utility Components

### 6.1 LoadingSpinner

**Purpose**: Loading state indicator
**Location**: `src/components/common/LoadingSpinner/`

```typescript
interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  message?: string;
  overlay?: boolean; // For full-page loading
}
```

### 6.2 ErrorBoundary

**Purpose**: Error handling and graceful degradation
**Location**: `src/components/common/ErrorBoundary/`

```typescript
interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}
```

**Features**:
- Error reporting to logging service
- User-friendly error messages
- Retry functionality
- Development vs production error display

### 6.3 SecurityBadge

**Purpose**: Visual security classification indicator
**Location**: `src/components/common/SecurityBadge/`

```typescript
interface SecurityBadgeProps {
  level: SecurityLevel;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

type SecurityLevel = 'public' | 'confidential' | 'privileged' | 'attorney-work-product';
```

**Features**:
- Color-coded by security level
- Tooltip with classification details
- Consistent sizing and placement
- Accessibility support

## 7. Performance Considerations

### 7.1 Virtualization

For components handling large lists (DocumentList, MessageList, ResultsList):
- Use react-window for virtual scrolling
- Implement item size estimation
- Lazy loading for complex items

### 7.2 Memoization

```typescript
// Example for expensive components
export const ChatBubble = React.memo<ChatBubbleProps>(
  ({ message, isUser, ...props }) => {
    // Component implementation
  },
  (prevProps, nextProps) => {
    // Custom comparison for shallow equality
    return prevProps.message.id === nextProps.message.id &&
           prevProps.message.content === nextProps.message.content;
  }
);
```

### 7.3 Code Splitting

```typescript
// Lazy load heavy components
const DocumentPreview = lazy(() => import('./DocumentPreview'));
const AnnotationOverlay = lazy(() => import('./AnnotationOverlay'));
```

## 8. Testing Strategy

### 8.1 Component Testing

Each component should have:
- Unit tests for all props and variants
- Accessibility tests (screen reader, keyboard navigation)
- Interaction tests (clicking, typing, etc.)
- Error state tests
- Performance tests for complex components

### 8.2 Integration Testing

- Components working together in realistic scenarios
- API integration tests
- File upload/download workflows
- Search and filter combinations

### 8.3 Visual Testing

- Storybook stories for all components
- Visual regression testing
- Cross-browser compatibility
- Responsive design testing

## 9. Documentation Requirements

Each component should include:

1. **README.md** - Component overview and usage
2. **Component.stories.tsx** - Storybook stories
3. **Component.test.tsx** - Test suite
4. **types.ts** - TypeScript interfaces
5. **styles.module.css** - Component-specific styles

## 10. Implementation Priority

### High Priority (Core Functionality)
1. AppLayout, Sidebar, TopBar
2. Button, Input, Card
3. ChatBubble, MessageList, ChatInput
4. DocumentCard, DocumentList
5. SearchBar, ResultsList

### Medium Priority (Enhanced Features)
1. DocumentPreview, FileUpload
2. AnnotationOverlay
3. FilterPanel, CitationCard
4. Dialog, Dropdown, Toast
5. QuickActionBar, TaskResultCard

### Low Priority (Polish & Advanced)
1. SecurityBadge
2. Advanced animations
3. Voice input features
4. Collaborative editing features
5. Advanced accessibility enhancements

This component specification provides a comprehensive foundation for building a professional legal assistant interface that meets industry standards and user expectations.