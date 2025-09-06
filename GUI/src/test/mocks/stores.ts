import { vi } from 'vitest'
import type { ChatState } from '@store/chatStore'
import type { ResearchState } from '@store/researchStore'
import type { HistoryState } from '@store/historyStore'
import type { SettingsState } from '@store/settingsStore'

// Mock Chat Store
export const createMockChatStore = (initialState: Partial<ChatState> = {}): ChatState => ({
  conversations: [],
  currentConversation: null,
  messages: [],
  isLoading: false,
  error: null,
  isTyping: false,
  autocompleteItems: [],
  recentSearches: [],
  
  // Actions
  createConversation: vi.fn().mockReturnValue('test-conv-id'),
  deleteConversation: vi.fn(),
  selectConversation: vi.fn(),
  sendMessage: vi.fn().mockResolvedValue(undefined),
  updateMessage: vi.fn(),
  exportConversation: vi.fn(),
  archiveConversation: vi.fn(),
  searchConversations: vi.fn().mockReturnValue([]),
  getRecentConversations: vi.fn().mockReturnValue([]),
  addAutocompleteItem: vi.fn(),
  getAutocompleteItems: vi.fn().mockReturnValue([]),
  setTyping: vi.fn(),
  clearCurrentConversation: vi.fn(),
  
  ...initialState,
})

// Mock Research Store
export const createMockResearchStore = (initialState: Partial<ResearchState> = {}): ResearchState => ({
  queries: [],
  currentQuery: null,
  results: [],
  isSearching: false,
  searchHistory: [],
  bookmarks: [],
  error: null,
  
  // Actions
  searchCases: vi.fn().mockResolvedValue(undefined),
  searchStatutes: vi.fn().mockResolvedValue(undefined),
  searchRegulations: vi.fn().mockResolvedValue(undefined),
  performAdvancedSearch: vi.fn().mockResolvedValue(undefined),
  saveQuery: vi.fn(),
  deleteQuery: vi.fn(),
  bookmarkResult: vi.fn(),
  removeBookmark: vi.fn(),
  exportResults: vi.fn(),
  clearResults: vi.fn(),
  getSearchSuggestions: vi.fn().mockReturnValue([]),
  
  ...initialState,
})

// Mock History Store
export const createMockHistoryStore = (initialState: Partial<HistoryState> = {}): HistoryState => ({
  items: [],
  filteredItems: [],
  searchQuery: '',
  sortBy: 'date',
  filterBy: 'all',
  isLoading: false,
  error: null,
  
  // Actions
  addItem: vi.fn(),
  removeItem: vi.fn(),
  clearHistory: vi.fn(),
  searchHistory: vi.fn(),
  filterHistory: vi.fn(),
  sortHistory: vi.fn(),
  exportHistory: vi.fn(),
  getItemsByType: vi.fn().mockReturnValue([]),
  getItemsByDateRange: vi.fn().mockReturnValue([]),
  
  ...initialState,
})

// Mock Settings Store
export const createMockSettingsStore = (initialState: Partial<SettingsState> = {}): SettingsState => ({
  theme: 'light',
  language: 'en',
  notifications: {
    email: true,
    push: false,
    sound: true,
  },
  privacy: {
    shareAnalytics: false,
    saveHistory: true,
    enableCookies: true,
  },
  display: {
    fontSize: 'medium',
    density: 'comfortable',
    animations: true,
  },
  aiSettings: {
    model: 'gpt-4',
    temperature: 0.7,
    maxTokens: 2048,
    enableCitations: true,
  },
  shortcuts: {
    newChat: 'Ctrl+N',
    search: 'Ctrl+K',
    export: 'Ctrl+E',
  },
  
  // Actions
  updateTheme: vi.fn(),
  updateLanguage: vi.fn(),
  updateNotifications: vi.fn(),
  updatePrivacy: vi.fn(),
  updateDisplay: vi.fn(),
  updateAISettings: vi.fn(),
  updateShortcuts: vi.fn(),
  resetSettings: vi.fn(),
  exportSettings: vi.fn(),
  importSettings: vi.fn().mockResolvedValue(undefined),
  
  ...initialState,
})

// Store factory with all mocks
export const createMockStores = (overrides: {
  chat?: Partial<ChatState>
  research?: Partial<ResearchState>
  history?: Partial<HistoryState>
  settings?: Partial<SettingsState>
} = {}) => ({
  chat: createMockChatStore(overrides.chat),
  research: createMockResearchStore(overrides.research),
  history: createMockHistoryStore(overrides.history),
  settings: createMockSettingsStore(overrides.settings),
})

// Zustand store mock helper
export const mockZustandStore = <T>(store: T) => {
  const originalUseStore = (store as any).getState
  const mockImplementation = vi.fn(() => store)
  
  ;(store as any).getState = mockImplementation
  ;(store as any).setState = vi.fn((updater: any) => {
    if (typeof updater === 'function') {
      const newState = updater(store)
      Object.assign(store, newState)
    } else {
      Object.assign(store, updater)
    }
  })
  ;(store as any).subscribe = vi.fn()
  ;(store as any).destroy = vi.fn()
  
  return {
    mockImplementation,
    restore: () => {
      ;(store as any).getState = originalUseStore
    },
  }
}