# BEAR AI Unified GUI Architecture Specification

## Executive Summary

This document provides a comprehensive architectural specification for BEAR AI's unified GUI system that consolidates all interfaces into a single cohesive application. The architecture leverages modern React patterns, Tauri for native desktop integration, and advanced state management to create a professional-grade legal AI assistant.

## 1. ARCHITECTURAL OVERVIEW

### 1.1 Consolidation Strategy

**Current State Analysis:**
- Multiple separate interfaces scattered across different applications
- Inconsistent theming and user experience
- Fragmented state management
- Complex deployment and maintenance overhead

**Target Unified Architecture:**
```
BEAR AI Unified Application
├── Single Entry Point (React App)
├── Modular Component System
├── Unified State Management (Zustand)
├── Theme/Mode System (Internal Switching)
├── Tauri Native Integration
└── Single Build & Deployment Process
```

### 1.2 Core Design Principles

1. **Single Source of Truth**: One application, one codebase, one deployment
2. **Mode-Based Interfaces**: Theme switching replaces separate applications
3. **Progressive Disclosure**: Advanced features revealed contextually
4. **Native Desktop Experience**: Full Tauri integration for Windows optimization
5. **Legal Professional Focus**: UI patterns optimized for legal workflows

## 2. COMPONENT ARCHITECTURE

### 2.1 Application Structure

```typescript
// Main Application Layout
src/
├── App.tsx                          // Root application component
├── index.tsx                        // Entry point
├── layouts/                         // Layout components
│   ├── MainLayout.tsx              // Primary application layout
│   ├── DocumentLayout.tsx          // Document-focused layout
│   ├── AnalysisLayout.tsx          // Analysis-focused layout
│   └── CompactLayout.tsx           // Compact mode layout
├── views/                           // Main view components
│   ├── Dashboard/                   // Dashboard interface
│   ├── ChatInterface/              // Conversational AI interface
│   ├── DocumentProcessor/          // Document management
│   ├── LegalAnalyzer/             // Legal analysis tools
│   ├── ComplianceChecker/         // Compliance verification
│   ├── Research/                   // Legal research interface
│   └── Settings/                   // Configuration interface
├── components/                      // Reusable UI components
│   ├── common/                     // Common UI elements
│   ├── legal/                      // Legal-specific components
│   ├── ai/                         // AI-related components
│   └── navigation/                 // Navigation components
├── services/                       // Business logic layer
├── state/                          // State management
├── integrations/                   // External integrations
└── assets/                         // Static resources
```

### 2.2 Component Hierarchy

```typescript
// Root Component Structure
<App>
  <GlobalProviders>
    <ThemeProvider>
      <StateProvider>
        <RouterProvider>
          <MainLayout>
            <NavigationSidebar />
            <TopBar />
            <MainContent>
              <ViewRouter>
                {/* Dynamic view rendering based on mode */}
                <Dashboard />
                <ChatInterface />
                <DocumentProcessor />
                <LegalAnalyzer />
                <ComplianceChecker />
                <Research />
                <Settings />
              </ViewRouter>
            </MainContent>
            <StatusBar />
          </MainLayout>
        </RouterProvider>
      </StateProvider>
    </ThemeProvider>
  </GlobalProviders>
</App>
```

### 2.3 Modular Interface Modes

Instead of separate applications, the unified GUI provides switchable interface modes:

#### Mode 1: Professional Dashboard
- **Purpose**: Executive overview and quick access
- **Layout**: Dashboard-centric with widgets
- **Components**: MetricsCards, QuickActions, RecentDocuments
- **Target User**: Partners, senior attorneys

#### Mode 2: Document Processor
- **Purpose**: Document analysis and processing
- **Layout**: Document-centric with preview pane
- **Components**: DocumentViewer, AnalysisPanel, AnnotationTools
- **Target User**: Document review attorneys

#### Mode 3: Conversational AI
- **Purpose**: Interactive AI assistance
- **Layout**: Chat-centric interface
- **Components**: ChatInterface, PromptSuggestions, ConversationHistory
- **Target User**: All legal professionals

#### Mode 4: Research Assistant
- **Purpose**: Legal research and citation management
- **Layout**: Research-focused with search tools
- **Components**: SearchInterface, CitationManager, ResearchNotes
- **Target User**: Research attorneys, law clerks

#### Mode 5: Compliance Center
- **Purpose**: Regulatory compliance checking
- **Layout**: Compliance-focused workflows
- **Components**: ComplianceChecklists, RegulatoryUpdates, AuditTrails
- **Target User**: Compliance officers

## 3. STATE MANAGEMENT ARCHITECTURE

### 3.1 Unified State Structure

```typescript
// Enhanced State Management (Building on existing bear-store.ts)
interface UnifiedAppState {
  // Core Application State
  app: {
    currentMode: ApplicationMode
    initialized: boolean
    loading: boolean
    error?: string
  }
  
  // User and Session
  user: {
    profile: UserProfile
    preferences: UserPreferences
    session: SessionState
  }
  
  // UI State (Enhanced)
  ui: {
    theme: ThemeConfig
    layout: LayoutConfig
    navigation: NavigationState
    modals: ModalState[]
    notifications: NotificationState[]
    panels: PanelState
    responsive: ResponsiveState
  }
  
  // Business Logic State (Existing)
  agents: Record<string, Agent>
  documents: Record<string, Document>
  tasks: Record<string, Task>
  models: Record<string, LLMModel>
  
  // Legal-Specific State
  legal: {
    cases: Record<string, Case>
    citations: Record<string, Citation>
    research: ResearchState
    compliance: ComplianceState
  }
  
  // Integration State
  integrations: {
    janusDev: JanusDevState
    gpt4all: GPT4AllState
    localLLM: LocalLLMState
    memory: MemoryState
  }
}

enum ApplicationMode {
  DASHBOARD = 'dashboard',
  DOCUMENT_PROCESSOR = 'document-processor',
  CONVERSATIONAL_AI = 'conversational-ai',
  RESEARCH_ASSISTANT = 'research-assistant',
  COMPLIANCE_CENTER = 'compliance-center'
}
```

### 3.2 State Management Strategy

```typescript
// State Store Implementation
export const useUnifiedStore = create<UnifiedAppState>()(
  subscribeWithSelector(
    persist(
      immer((set, get) => ({
        // Mode Management
        setApplicationMode: (mode: ApplicationMode) => set((state) => {
          state.app.currentMode = mode
          // Automatically adjust UI layout and theme
          state.ui.layout = getLayoutForMode(mode)
          state.ui.theme = getThemeForMode(mode)
        }),
        
        // Dynamic Theme Switching
        applyTheme: (themeConfig: ThemeConfig) => set((state) => {
          state.ui.theme = themeConfig
          // Apply theme to document and trigger CSS variable updates
          updateCSSVariables(themeConfig)
        }),
        
        // Layout Management
        setLayout: (layoutConfig: LayoutConfig) => set((state) => {
          state.ui.layout = layoutConfig
        }),
        
        // Unified Navigation
        navigateToView: (view: string, params?: any) => set((state) => {
          state.ui.navigation.currentView = view
          state.ui.navigation.params = params
          state.ui.navigation.history.push({ view, params, timestamp: Date.now() })
        })
      })),
      {
        name: 'bear-ai-unified-store',
        partialize: (state) => ({
          user: state.user,
          ui: {
            theme: state.ui.theme,
            layout: state.ui.layout
          },
          app: {
            currentMode: state.app.currentMode
          }
        })
      }
    )
  )
)
```

## 4. THEME AND MODE SYSTEM

### 4.1 Dynamic Theme Architecture

```typescript
// Theme System Implementation
interface ThemeConfig {
  id: string
  name: string
  mode: 'light' | 'dark' | 'auto' | 'legal-professional'
  colors: ColorPalette
  typography: TypographyConfig
  spacing: SpacingConfig
  effects: VisualEffects
  components: ComponentThemes
}

interface ColorPalette {
  primary: ColorScale
  secondary: ColorScale
  accent: ColorScale
  neutral: ColorScale
  semantic: SemanticColors
  legal: LegalColors // Legal-specific color meanings
}

interface LegalColors {
  compliance: string
  risk: string
  citation: string
  contract: string
  litigation: string
  corporate: string
}

// Theme Presets
const THEME_PRESETS: Record<string, ThemeConfig> = {
  'legal-professional': {
    id: 'legal-professional',
    name: 'Legal Professional',
    mode: 'light',
    colors: {
      primary: { 500: '#1B365C', 600: '#153052', 700: '#0F2B48' }, // Deep blue
      accent: { 500: '#059669', 600: '#047857', 700: '#065F46' }, // Professional green
      neutral: { 50: '#F9FAFB', 100: '#F3F4F6', 500: '#6B7280' },
      legal: {
        compliance: '#10B981', // Green for compliant
        risk: '#DC2626', // Red for risk
        citation: '#3B82F6', // Blue for citations
        contract: '#7C3AED', // Purple for contracts
        litigation: '#EF4444', // Red for litigation
        corporate: '#059669' // Green for corporate
      }
    }
  },
  'dark-professional': {
    id: 'dark-professional',
    name: 'Dark Professional',
    mode: 'dark',
    colors: {
      primary: { 500: '#3B82F6', 600: '#2563EB', 700: '#1D4ED8' },
      neutral: { 50: '#1F2937', 100: '#111827', 900: '#F9FAFB' },
      // ... dark theme colors
    }
  }
}

// Dynamic Theme Application
class ThemeManager {
  applyTheme(theme: ThemeConfig): void {
    // Update CSS custom properties
    const root = document.documentElement
    Object.entries(theme.colors.primary).forEach(([key, value]) => {
      root.style.setProperty(`--color-primary-${key}`, value)
    })
    
    // Update component themes
    this.updateComponentThemes(theme.components)
    
    // Trigger theme-aware component re-renders
    document.dispatchEvent(new CustomEvent('theme-changed', { detail: theme }))
  }
  
  getThemeForMode(mode: ApplicationMode): ThemeConfig {
    const baseTheme = THEME_PRESETS['legal-professional']
    return {
      ...baseTheme,
      // Mode-specific theme adjustments
      components: this.getModeSpecificComponents(mode)
    }
  }
}
```

### 4.2 Mode-Specific UI Configurations

```typescript
// Mode Configuration System
interface ModeConfig {
  id: ApplicationMode
  name: string
  description: string
  layout: LayoutConfig
  navigation: NavigationConfig
  features: FeatureConfig[]
  shortcuts: ShortcutConfig[]
}

const MODE_CONFIGURATIONS: Record<ApplicationMode, ModeConfig> = {
  [ApplicationMode.DASHBOARD]: {
    id: ApplicationMode.DASHBOARD,
    name: 'Professional Dashboard',
    description: 'Executive overview with key metrics and quick actions',
    layout: {
      sidebar: { width: 280, collapsible: true },
      header: { height: 64, transparent: false },
      main: { padding: 24, grid: true },
      panels: ['metrics', 'recent-documents', 'notifications']
    },
    navigation: {
      primary: ['overview', 'documents', 'analytics'],
      secondary: ['settings', 'help']
    },
    features: [
      { id: 'quick-analysis', enabled: true },
      { id: 'document-preview', enabled: true },
      { id: 'agent-status', enabled: true }
    ]
  },
  
  [ApplicationMode.DOCUMENT_PROCESSOR]: {
    id: ApplicationMode.DOCUMENT_PROCESSOR,
    name: 'Document Processor',
    description: 'Document analysis and processing workspace',
    layout: {
      sidebar: { width: 320, collapsible: false },
      header: { height: 72, transparent: false },
      main: { padding: 16, split: true },
      panels: ['document-tree', 'preview', 'analysis', 'annotations']
    },
    navigation: {
      primary: ['documents', 'analysis', 'annotations'],
      secondary: ['export', 'share', 'settings']
    },
    features: [
      { id: 'document-upload', enabled: true },
      { id: 'batch-processing', enabled: true },
      { id: 'ai-analysis', enabled: true },
      { id: 'collaboration', enabled: true }
    ]
  }
  // ... other mode configurations
}
```

## 5. UNIFIED ROUTING AND NAVIGATION

### 5.1 Router Architecture

```typescript
// Unified Routing System
import { createBrowserRouter, RouterProvider } from 'react-router-dom'

interface RouteConfig {
  path: string
  element: React.ComponentType
  mode?: ApplicationMode
  requiresAuth?: boolean
  roles?: UserRole[]
  metadata?: RouteMetadata
}

const routes: RouteConfig[] = [
  {
    path: '/',
    element: MainLayout,
    children: [
      // Dashboard Routes
      { path: '/dashboard', element: DashboardView, mode: ApplicationMode.DASHBOARD },
      { path: '/dashboard/metrics', element: MetricsView, mode: ApplicationMode.DASHBOARD },
      
      // Document Processing Routes
      { path: '/documents', element: DocumentListView, mode: ApplicationMode.DOCUMENT_PROCESSOR },
      { path: '/documents/:id', element: DocumentDetailView, mode: ApplicationMode.DOCUMENT_PROCESSOR },
      { path: '/documents/:id/analysis', element: AnalysisView, mode: ApplicationMode.DOCUMENT_PROCESSOR },
      
      // Chat Interface Routes
      { path: '/chat', element: ChatInterfaceView, mode: ApplicationMode.CONVERSATIONAL_AI },
      { path: '/chat/:sessionId', element: ChatSessionView, mode: ApplicationMode.CONVERSATIONAL_AI },
      
      // Research Routes
      { path: '/research', element: ResearchView, mode: ApplicationMode.RESEARCH_ASSISTANT },
      { path: '/research/search', element: SearchView, mode: ApplicationMode.RESEARCH_ASSISTANT },
      
      // Compliance Routes
      { path: '/compliance', element: ComplianceView, mode: ApplicationMode.COMPLIANCE_CENTER },
      { path: '/compliance/audit', element: AuditView, mode: ApplicationMode.COMPLIANCE_CENTER },
      
      // Settings
      { path: '/settings', element: SettingsView },
      { path: '/settings/:category', element: SettingsCategoryView }
    ]
  }
]

// Router with Mode Management
const AppRouter: React.FC = () => {
  const { setApplicationMode } = useUnifiedStore()
  
  return (
    <RouterProvider
      router={createBrowserRouter(routes)}
      future={{ v7_startTransition: true }}
      fallbackElement={<LoadingScreen />}
    />
  )
}

// Navigation Service
class NavigationService {
  navigateToMode(mode: ApplicationMode, initialRoute?: string): void {
    const store = useUnifiedStore.getState()
    store.setApplicationMode(mode)
    
    const defaultRoute = this.getDefaultRouteForMode(mode)
    const targetRoute = initialRoute || defaultRoute
    
    window.history.pushState(null, '', targetRoute)
  }
  
  getDefaultRouteForMode(mode: ApplicationMode): string {
    const routeMap = {
      [ApplicationMode.DASHBOARD]: '/dashboard',
      [ApplicationMode.DOCUMENT_PROCESSOR]: '/documents',
      [ApplicationMode.CONVERSATIONAL_AI]: '/chat',
      [ApplicationMode.RESEARCH_ASSISTANT]: '/research',
      [ApplicationMode.COMPLIANCE_CENTER]: '/compliance'
    }
    return routeMap[mode] || '/dashboard'
  }
}
```

### 5.2 Navigation Components

```typescript
// Unified Navigation Sidebar
const NavigationSidebar: React.FC = () => {
  const { currentMode, ui } = useUnifiedStore()
  const navigation = new NavigationService()
  
  const modeItems = [
    {
      mode: ApplicationMode.DASHBOARD,
      icon: DashboardIcon,
      label: 'Dashboard',
      shortcut: 'Cmd+1'
    },
    {
      mode: ApplicationMode.DOCUMENT_PROCESSOR,
      icon: DocumentIcon,
      label: 'Documents',
      shortcut: 'Cmd+2'
    },
    {
      mode: ApplicationMode.CONVERSATIONAL_AI,
      icon: ChatIcon,
      label: 'AI Assistant',
      shortcut: 'Cmd+3'
    },
    {
      mode: ApplicationMode.RESEARCH_ASSISTANT,
      icon: SearchIcon,
      label: 'Research',
      shortcut: 'Cmd+4'
    },
    {
      mode: ApplicationMode.COMPLIANCE_CENTER,
      icon: ShieldIcon,
      label: 'Compliance',
      shortcut: 'Cmd+5'
    }
  ]
  
  return (
    <aside className={cn(
      'bg-primary-900 text-white transition-all duration-300',
      ui.isSidebarCollapsed ? 'w-16' : 'w-64'
    )}>
      <nav className="p-4">
        {modeItems.map(item => (
          <NavigationItem
            key={item.mode}
            active={currentMode === item.mode}
            onClick={() => navigation.navigateToMode(item.mode)}
            icon={item.icon}
            label={ui.isSidebarCollapsed ? undefined : item.label}
            tooltip={ui.isSidebarCollapsed ? item.label : undefined}
          />
        ))}
      </nav>
    </aside>
  )
}
```

## 6. TAURI INTEGRATION ARCHITECTURE

### 6.1 Native Desktop Integration

```rust
// Tauri Backend (src-tauri/src/main.rs)
use tauri::{Builder, Context, generate_context, generate_handler};
use bear_ai_core::*;

#[tauri::command]
async fn process_document(path: String) -> Result<DocumentAnalysis, String> {
    // Document processing logic
    bear_ai_core::process_document(&path).await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn load_llm_model(model_id: String) -> Result<ModelInfo, String> {
    // LLM model loading
    bear_ai_core::load_model(&model_id).await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_system_info() -> Result<SystemInfo, String> {
    // System information for optimization
    Ok(bear_ai_core::get_system_info())
}

fn main() {
    tauri::Builder::default()
        .manage(AppState::default())
        .invoke_handler(generate_handler![
            process_document,
            load_llm_model,
            get_system_info,
            // ... other commands
        ])
        .setup(|app| {
            // Initialize BEAR AI core
            bear_ai_core::initialize()?;
            Ok(())
        })
        .run(generate_context!())
        .expect("Failed to run BEAR AI application");
}
```

### 6.2 Tauri Service Layer

```typescript
// Frontend Tauri Services (src/services/tauri/)
import { invoke } from '@tauri-apps/api'
import { open } from '@tauri-apps/plugin-dialog'
import { writeFile } from '@tauri-apps/plugin-fs'

export class TauriDocumentService {
  async openDocument(): Promise<string | null> {
    return await open({
      filters: [
        { name: 'Documents', extensions: ['pdf', 'docx', 'txt'] },
        { name: 'All Files', extensions: ['*'] }
      ],
      multiple: false
    })
  }
  
  async processDocument(path: string): Promise<DocumentAnalysis> {
    return await invoke('process_document', { path })
  }
  
  async saveDocument(path: string, content: string): Promise<void> {
    await writeFile(path, content)
  }
}

export class TauriLLMService {
  async loadModel(modelId: string): Promise<ModelInfo> {
    return await invoke('load_llm_model', { modelId })
  }
  
  async getSystemInfo(): Promise<SystemInfo> {
    return await invoke('get_system_info')
  }
}

export class TauriWindowService {
  async setTitle(title: string): Promise<void> {
    const { getCurrent } = await import('@tauri-apps/api/window')
    await getCurrent().setTitle(title)
  }
  
  async minimize(): Promise<void> {
    const { getCurrent } = await import('@tauri-apps/api/window')
    await getCurrent().minimize()
  }
  
  async toggleMaximize(): Promise<void> {
    const { getCurrent } = await import('@tauri-apps/api/window')
    const window = getCurrent()
    const isMaximized = await window.isMaximized()
    if (isMaximized) {
      await window.unmaximize()
    } else {
      await window.maximize()
    }
  }
}
```

### 6.3 Platform-Specific Optimizations

```typescript
// Platform Detection and Optimization
class PlatformService {
  private platform: Platform
  
  constructor() {
    this.platform = this.detectPlatform()
    this.applyPlatformOptimizations()
  }
  
  private detectPlatform(): Platform {
    if (window.__TAURI__) {
      // Running in Tauri
      return {
        type: 'desktop',
        os: this.getTauriOS(),
        capabilities: ['native-dialogs', 'file-system', 'notifications']
      }
    } else {
      // Running in browser
      return {
        type: 'web',
        os: this.getBrowserOS(),
        capabilities: ['web-apis', 'limited-file-system']
      }
    }
  }
  
  private applyPlatformOptimizations(): void {
    if (this.platform.os === 'windows') {
      // Windows-specific optimizations
      document.body.classList.add('platform-windows')
      this.enableWindowsAccentColors()
    } else if (this.platform.os === 'macos') {
      // macOS-specific optimizations
      document.body.classList.add('platform-macos')
      this.enableMacOSVibrancy()
    }
  }
  
  getOptimalLayout(): LayoutConfig {
    if (this.platform.os === 'windows') {
      return {
        titleBar: { height: 32, showControls: true },
        sidebar: { width: 280, autoHide: false },
        // Windows-optimized layout
      }
    } else if (this.platform.os === 'macos') {
      return {
        titleBar: { height: 28, showControls: false },
        sidebar: { width: 260, autoHide: true },
        // macOS-optimized layout
      }
    }
    return DEFAULT_LAYOUT_CONFIG
  }
}
```

## 7. BUILD AND DEPLOYMENT STRATEGY

### 7.1 Unified Build Configuration

```typescript
// Enhanced Vite Configuration (vite.config.bear.ts)
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig(({ mode, command }) => {
  const isProduction = mode === 'production'
  const isTauri = process.env.IS_TAURI === 'true'
  
  return {
    plugins: [
      react({
        // Production optimizations
        jsxRuntime: 'automatic',
        babel: {
          plugins: isProduction ? [
            ['babel-plugin-react-remove-properties', { properties: ['data-testid'] }]
          ] : []
        }
      })
    ],
    
    define: {
      // Build-time feature flags
      __IS_TAURI__: JSON.stringify(isTauri),
      __IS_PRODUCTION__: JSON.stringify(isProduction),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
      __GIT_COMMIT__: JSON.stringify(process.env.GIT_COMMIT || 'unknown')
    },
    
    build: {
      target: 'es2022',
      outDir: isTauri ? 'dist-tauri' : 'dist',
      sourcemap: !isProduction,
      
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html'),
          // Mode-specific entry points for code splitting
          dashboard: resolve(__dirname, 'src/views/Dashboard/index.tsx'),
          documents: resolve(__dirname, 'src/views/DocumentProcessor/index.tsx'),
          chat: resolve(__dirname, 'src/views/ChatInterface/index.tsx')
        },
        
        output: {
          // Optimize chunk splitting
          manualChunks: {
            vendor: ['react', 'react-dom'],
            'bear-core': ['@/state/bear-store', '@/services'],
            'ui-components': ['@/components'],
            'legal-processing': ['@/integrations/llm-engine'],
            'jan-integration': ['@/integrations/jan-dev']
          }
        }
      },
      
      // Bundle optimization
      minify: isProduction ? 'esbuild' : false,
      chunkSizeWarningLimit: 1500
    },
    
    // Development server
    server: {
      port: 1420,
      strictPort: true,
      host: isTauri ? '127.0.0.1' : 'localhost',
      
      proxy: {
        // Proxy for local LLM services
        '/api/llm': 'http://localhost:1337',
        '/api/jan': 'http://localhost:1337'
      }
    }
  }
})
```

### 7.2 Tauri Configuration Enhancement

```json
// Enhanced Tauri Configuration (src-tauri/tauri.conf.json)
{
  "$schema": "https://schema.tauri.app/config/2",
  "productName": "BEAR AI - Legal Assistant",
  "version": "1.0.0",
  "identifier": "com.bear-ai.legal-assistant",
  
  "build": {
    "frontendDist": "../dist-tauri",
    "devUrl": "http://127.0.0.1:1420",
    "beforeDevCommand": "npm run dev:unified",
    "beforeBuildCommand": "npm run build:unified"
  },
  
  "app": {
    "macOSPrivateApi": true,
    "windows": [
      {
        "label": "main",
        "title": "BEAR AI - Legal Assistant",
        "width": 1400,
        "minWidth": 1000,
        "minHeight": 700,
        "height": 1000,
        "resizable": true,
        "center": true,
        "titleBarStyle": "Overlay",
        "hiddenTitle": true,
        "transparent": true,
        "decorations": true,
        "windowEffects": {
          "effects": ["acrylic", "blur"],
          "state": "active",
          "radius": 12
        },
        "dragDropEnabled": true,
        "theme": "Auto"
      },
      {
        "label": "document-viewer",
        "title": "Document Viewer - BEAR AI",
        "width": 1200,
        "height": 800,
        "resizable": true,
        "visible": false,
        "parent": "main"
      }
    ],
    
    "security": {
      "csp": {
        "default-src": "'self' customprotocol: asset: http://localhost:* http://127.0.0.1:* ws://localhost:*",
        "connect-src": "ipc: http://ipc.localhost http://127.0.0.1:* ws://localhost:* https: http:",
        "font-src": "'self' https://fonts.gstatic.com blob: data:",
        "img-src": "'self' asset: http://asset.localhost blob: data: https:",
        "style-src": "'unsafe-inline' 'self' https://fonts.googleapis.com",
        "script-src": "'self' 'unsafe-eval' asset:"
      }
    }
  },
  
  "plugins": {
    // File system access for document processing
    "fs": {
      "scope": {
        "allow": [
          "$APPDATA/bear-ai/**",
          "$DOCUMENT/**",
          "$DOWNLOAD/**",
          "$HOME/Documents/**",
          "$TEMP/**"
        ]
      }
    },
    
    // Dialog for file selection
    "dialog": {},
    
    // Shell for external tool integration
    "shell": {
      "scope": {
        "allow": [
          {
            "name": "python",
            "cmd": "python",
            "args": ["-m", "bear_ai.processor"]
          }
        ]
      }
    },
    
    // HTTP for API calls
    "http": {
      "scope": {
        "allow": [
          "https://api.bear-ai.com/**",
          "https://huggingface.co/**",
          "http://localhost:**",
          "http://127.0.0.1:**"
        ]
      }
    },
    
    // System notifications
    "notification": {},
    
    // Single instance
    "single-instance": {},
    
    // Deep linking
    "deep-link": {
      "schemes": ["bear-ai"]
    },
    
    // Auto-updater
    "updater": {
      "pubkey": "UPDATE_PUBKEY_PLACEHOLDER",
      "endpoints": [
        "https://api.bear-ai.com/updates/{{target}}/{{arch}}/{{current_version}}"
      ],
      "dialog": true,
      "windows": {
        "installMode": "passive"
      }
    }
  },
  
  "bundle": {
    "active": true,
    "createUpdaterArtifacts": true,
    "category": "Productivity",
    "shortDescription": "AI-powered legal assistant",
    "longDescription": "BEAR AI is a privacy-first, local AI assistant designed specifically for legal professionals. It provides secure document analysis, contract review, legal research, and compliance checking without sending sensitive data to external servers.",
    
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ],
    
    "resources": [
      "resources/**/*",
      "models/default/**/*",
      "legal-data/**/*"
    ],
    
    "targets": ["msi", "nsis", "app", "dmg", "deb", "rpm"],
    
    "windows": {
      "certificateThumbprint": null,
      "digestAlgorithm": "sha256",
      "timestampUrl": "",
      "wix": {
        "language": ["en-US"],
        "template": "bear-ai-installer.wxs",
        "fragmentPaths": ["./installer-fragments/**/*.wxs"],
        "componentGroupRefs": ["BearAIFiles"]
      },
      "nsis": {
        "template": "bear-ai-nsis.nsi",
        "displayLanguageSelector": false,
        "languages": ["English"],
        "customLanguageFiles": {
          "English": "./installer/english.nsh"
        }
      }
    },
    
    "macOS": {
      "frameworks": [],
      "minimumSystemVersion": "11.0",
      "license": "LICENSE.txt",
      "signingIdentity": null,
      "entitlements": "entitlements.plist"
    },
    
    "linux": {
      "deb": {
        "depends": ["python3", "python3-pip", "libssl3", "libwebkit2gtk-4.0-37"],
        "section": "utils",
        "priority": "optional",
        "files": {
          "/usr/share/applications/bear-ai.desktop": "resources/bear-ai.desktop",
          "/usr/share/pixmaps/bear-ai.png": "resources/icon.png"
        }
      },
      "appimage": {
        "bundleMediaFramework": false
      }
    }
  }
}
```

### 7.3 Deployment Pipeline

```yaml
# GitHub Actions Workflow (.github/workflows/build-deploy.yml)
name: Build and Deploy BEAR AI

on:
  push:
    branches: [main, develop]
    tags: ['v*']
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      - run: npm ci
      - run: npm run test
      - run: npm run lint
      - run: npm run typecheck

  build-web:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      - run: npm ci
      - run: npm run build:web
      - uses: actions/upload-artifact@v3
        with:
          name: web-build
          path: dist/

  build-desktop:
    needs: test
    strategy:
      matrix:
        platform: [ubuntu-latest, windows-latest, macos-latest]
    runs-on: ${{ matrix.platform }}
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      - name: Install Rust
        uses: actions-rs/toolchain@v1
        with:
          toolchain: stable
      - name: Install system dependencies (Ubuntu)
        if: matrix.platform == 'ubuntu-latest'
        run: |
          sudo apt-get update
          sudo apt-get install -y libgtk-3-dev libwebkit2gtk-4.0-dev libayatana-appindicator3-dev librsvg2-dev
      - run: npm ci
      - run: npm run build:desktop
      - uses: actions/upload-artifact@v3
        with:
          name: desktop-${{ matrix.platform }}
          path: src-tauri/target/release/bundle/

  release:
    if: startsWith(github.ref, 'refs/tags/v')
    needs: [build-web, build-desktop]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@v3
      - name: Create Release
        uses: softprops/action-gh-release@v1
        with:
          files: |
            desktop-*/**/*
          draft: true
          prerelease: false
```

## 8. INTEGRATION PATTERNS

### 8.1 Jan-Dev Integration

```typescript
// Jan-Dev Integration Service
export class JanDevIntegrationService {
  private baseUrl = 'http://localhost:1337'
  private authService: JanAuthService
  
  async initializeIntegration(): Promise<void> {
    // Initialize Jan-dev connection
    this.authService = new JanAuthService()
    await this.authService.initialize()
  }
  
  async loadLegalModel(modelId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/v1/models`, {
      method: 'POST',
      headers: await this.authService.getAuthHeader(),
      body: JSON.stringify({
        id: modelId,
        // Legal-specific model configuration
        settings: {
          temperature: 0.1, // Low temperature for legal accuracy
          max_tokens: 4096,
          legal_specialization: true
        }
      })
    })
    
    if (!response.ok) {
      throw new Error('Failed to load legal model')
    }
  }
  
  async analyzeDocument(documentPath: string): Promise<DocumentAnalysis> {
    // Use Jan-dev's document processing capabilities
    const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: await this.authService.getAuthHeader(),
      body: JSON.stringify({
        model: 'legal-llama-7b',
        messages: [
          {
            role: 'system',
            content: 'You are a legal document analysis AI. Provide comprehensive analysis including risks, compliance issues, and recommendations.'
          },
          {
            role: 'user',
            content: `Analyze this legal document: ${documentPath}`
          }
        ],
        stream: true
      })
    })
    
    return this.parseStreamingResponse(response)
  }
  
  private async parseStreamingResponse(response: Response): Promise<DocumentAnalysis> {
    // Parse streaming response from Jan-dev
    const reader = response.body?.getReader()
    const decoder = new TextDecoder()
    let analysisText = ''
    
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      
      const chunk = decoder.decode(value)
      const lines = chunk.split('\n')
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6)
          if (data === '[DONE]') break
          
          try {
            const parsed = JSON.parse(data)
            const content = parsed.choices[0]?.delta?.content
            if (content) {
              analysisText += content
            }
          } catch (e) {
            // Handle parsing errors
          }
        }
      }
    }
    
    return this.parseAnalysisText(analysisText)
  }
}
```

### 8.2 GPT4ALL Integration

```typescript
// GPT4ALL Integration Service
export class GPT4AllIntegrationService {
  private gpt4all: any
  private currentModel: string | null = null
  
  async initializeGPT4All(): Promise<void> {
    // Dynamic import of GPT4ALL
    const { GPT4All } = await import('gpt4all')
    this.gpt4all = new GPT4All()
  }
  
  async loadModel(modelName: string): Promise<void> {
    if (this.currentModel === modelName) return
    
    await this.gpt4all.init()
    await this.gpt4all.open(modelName)
    this.currentModel = modelName
  }
  
  async processLegalQuery(query: string): Promise<string> {
    if (!this.currentModel) {
      throw new Error('No model loaded')
    }
    
    const legalPrompt = `
    You are a legal AI assistant. Provide accurate, well-researched responses 
    to legal queries. Always include relevant citations and disclaimers.
    
    Query: ${query}
    
    Response:`
    
    return await this.gpt4all.createCompletion(legalPrompt, {
      temperature: 0.2,
      maxTokens: 1024
    })
  }
  
  async batchProcessDocuments(documents: string[]): Promise<DocumentAnalysis[]> {
    const results: DocumentAnalysis[] = []
    
    for (const doc of documents) {
      const analysis = await this.analyzeDocument(doc)
      results.push(analysis)
    }
    
    return results
  }
}
```

## 9. ARCHITECTURE DECISION RECORDS

### ADR-001: Single Application Architecture

**Status**: Accepted
**Date**: 2025-01-09

**Context**: BEAR AI currently has multiple separate interfaces leading to fragmented user experience and maintenance overhead.

**Decision**: Implement a unified single application architecture with mode-based interface switching instead of separate applications.

**Consequences**:
- **Positive**: Simplified deployment, consistent UX, shared state management, easier maintenance
- **Negative**: Larger initial bundle size, more complex routing logic
- **Mitigation**: Implement code splitting and lazy loading for mode-specific features

### ADR-002: Tauri for Desktop Integration

**Status**: Accepted
**Date**: 2025-01-09

**Context**: Need for native desktop integration with better Windows compatibility and reduced dependency issues.

**Decision**: Use Tauri framework for native desktop application with React frontend.

**Consequences**:
- **Positive**: Native performance, better OS integration, smaller bundle size than Electron, Rust security benefits
- **Negative**: Learning curve for Rust, smaller ecosystem than Electron
- **Mitigation**: Gradual migration, extensive documentation, community support

### ADR-003: Zustand for State Management

**Status**: Accepted
**Date**: 2025-01-09

**Context**: Need for unified state management across all application modes and components.

**Decision**: Use Zustand with immer middleware for state management, extending existing bear-store implementation.

**Consequences**:
- **Positive**: Lightweight, TypeScript-friendly, minimal boilerplate, excellent DevTools
- **Negative**: Less established than Redux, smaller community
- **Mitigation**: Comprehensive documentation, migration guides from existing state

### ADR-004: Mode-Based Theme System

**Status**: Accepted
**Date**: 2025-01-09

**Context**: Different user types and workflows require different interface optimizations.

**Decision**: Implement dynamic theme and layout system based on application modes rather than separate applications.

**Consequences**:
- **Positive**: Consistent branding, easier customization, better accessibility
- **Negative**: Complex theme management, potential performance impact
- **Mitigation**: Efficient CSS variable updates, theme caching, performance monitoring

## 10. IMPLEMENTATION ROADMAP

<function_calls>
<invoke name="TodoWrite">
<parameter name="todos">[{"content": "Design unified GUI architecture with consolidation strategy", "status": "completed", "activeForm": "Designing unified GUI architecture with consolidation strategy"}, {"content": "Create component hierarchy and modular architecture specification", "status": "completed", "activeForm": "Creating component hierarchy and modular architecture specification"}, {"content": "Design state management approach with theme/mode system", "status": "completed", "activeForm": "Designing state management approach with theme/mode system"}, {"content": "Plan unified routing system and navigation structure", "status": "completed", "activeForm": "Planning unified routing system and navigation structure"}, {"content": "Specify Tauri integration for desktop deployment", "status": "completed", "activeForm": "Specifying Tauri integration for desktop deployment"}, {"content": "Define build configuration and deployment strategy", "status": "completed", "activeForm": "Defining build configuration and deployment strategy"}, {"content": "Create Architecture Decision Records (ADRs)", "status": "completed", "activeForm": "Creating Architecture Decision Records (ADRs)"}, {"content": "Document integration patterns from Jan-dev and GPT4ALL", "status": "completed", "activeForm": "Documenting integration patterns from Jan-dev and GPT4ALL"}, {"content": "Finalize implementation roadmap and next steps", "status": "in_progress", "activeForm": "Finalizing implementation roadmap and next steps"}]