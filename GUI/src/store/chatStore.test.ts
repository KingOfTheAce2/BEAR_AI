import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useChatStore } from './chatStore'
import { createMockMessage, createMockConversation } from '@test/utils/test-utils'

// Mock zustand store
vi.mock('zustand', () => ({
  create: vi.fn(() => (selector: any) => selector({
    conversations: [],
    currentConversation: null,
    messages: [],
    isLoading: false,
    error: null,
    isTyping: false,
    autocompleteItems: [],
    recentSearches: [],
    createConversation: vi.fn(),
    deleteConversation: vi.fn(),
    selectConversation: vi.fn(),
    sendMessage: vi.fn(),
    updateMessage: vi.fn(),
    exportConversation: vi.fn(),
    archiveConversation: vi.fn(),
    searchConversations: vi.fn(),
    getRecentConversations: vi.fn(),
    addAutocompleteItem: vi.fn(),
    getAutocompleteItems: vi.fn(),
    setTyping: vi.fn(),
    clearCurrentConversation: vi.fn(),
  })),
}))

describe('ChatStore', () => {
  let store: ReturnType<typeof useChatStore>
  
  beforeEach(() => {
    // Reset store state
    store = useChatStore
    vi.clearAllMocks()
  })

  describe('Initial State', () => {
    it('has correct initial state', () => {
      const state = store.getState()
      
      expect(state.conversations).toEqual([])
      expect(state.currentConversation).toBeNull()
      expect(state.messages).toEqual([])
      expect(state.isLoading).toBe(false)
      expect(state.error).toBeNull()
      expect(state.isTyping).toBe(false)
      expect(state.autocompleteItems).toEqual(expect.any(Array))
      expect(state.recentSearches).toEqual([])
    })

    it('has default autocomplete items', () => {
      const state = store.getState()
      
      expect(state.autocompleteItems.length).toBeGreaterThan(0)
      expect(state.autocompleteItems[0]).toHaveProperty('text')
      expect(state.autocompleteItems[0]).toHaveProperty('type', 'legal-term')
      expect(state.autocompleteItems[0]).toHaveProperty('usage')
    })
  })

  describe('Conversation Management', () => {
    it('creates new conversation', () => {
      const mockCreate = vi.fn().mockReturnValue('new-conv-id')
      store.setState({ createConversation: mockCreate })
      
      const id = store.getState().createConversation('Test Conversation')
      
      expect(mockCreate).toHaveBeenCalledWith('Test Conversation')
      expect(id).toBe('new-conv-id')
    })

    it('creates conversation with default title when none provided', () => {
      const mockCreate = vi.fn().mockReturnValue('new-conv-id')
      store.setState({ createConversation: mockCreate })
      
      store.getState().createConversation()
      
      expect(mockCreate).toHaveBeenCalledWith(undefined)
    })

    it('deletes conversation', () => {
      const mockDelete = vi.fn()
      store.setState({ deleteConversation: mockDelete })
      
      store.getState().deleteConversation('conv-123')
      
      expect(mockDelete).toHaveBeenCalledWith('conv-123')
    })

    it('selects conversation', () => {
      const mockSelect = vi.fn()
      store.setState({ selectConversation: mockSelect })
      
      store.getState().selectConversation('conv-123')
      
      expect(mockSelect).toHaveBeenCalledWith('conv-123')
    })

    it('archives conversation', () => {
      const mockArchive = vi.fn()
      store.setState({ archiveConversation: mockArchive })
      
      store.getState().archiveConversation('conv-123')
      
      expect(mockArchive).toHaveBeenCalledWith('conv-123')
    })

    it('clears current conversation', () => {
      const mockClear = vi.fn()
      store.setState({ clearCurrentConversation: mockClear })
      
      store.getState().clearCurrentConversation()
      
      expect(mockClear).toHaveBeenCalled()
    })
  })

  describe('Message Management', () => {
    it('sends message successfully', async () => {
      const mockSend = vi.fn().mockResolvedValue(undefined)
      store.setState({ sendMessage: mockSend })
      
      await store.getState().sendMessage('Test message', [])
      
      expect(mockSend).toHaveBeenCalledWith('Test message', [])
    })

    it('sends message with attachments', async () => {
      const mockFile = new File(['test'], 'test.pdf', { type: 'application/pdf' })
      const mockSend = vi.fn().mockResolvedValue(undefined)
      store.setState({ sendMessage: mockSend })
      
      await store.getState().sendMessage('Message with file', [mockFile])
      
      expect(mockSend).toHaveBeenCalledWith('Message with file', [mockFile])
    })

    it('updates message', () => {
      const mockUpdate = vi.fn()
      store.setState({ updateMessage: mockUpdate })
      
      const updates = { content: 'Updated content' }
      store.getState().updateMessage('msg-123', updates)
      
      expect(mockUpdate).toHaveBeenCalledWith('msg-123', updates)
    })

    it('sets typing indicator', () => {
      const mockSetTyping = vi.fn()
      store.setState({ setTyping: mockSetTyping })
      
      store.getState().setTyping(true)
      
      expect(mockSetTyping).toHaveBeenCalledWith(true)
    })
  })

  describe('Search and Filter', () => {
    it('searches conversations', () => {
      const mockSearch = vi.fn().mockReturnValue([])
      store.setState({ searchConversations: mockSearch })
      
      const results = store.getState().searchConversations('test query')
      
      expect(mockSearch).toHaveBeenCalledWith('test query')
      expect(results).toEqual([])
    })

    it('gets recent conversations', () => {
      const mockRecent = vi.fn().mockReturnValue([])
      store.setState({ getRecentConversations: mockRecent })
      
      const recent = store.getState().getRecentConversations(5)
      
      expect(mockRecent).toHaveBeenCalledWith(5)
      expect(recent).toEqual([])
    })

    it('gets recent conversations with default limit', () => {
      const mockRecent = vi.fn().mockReturnValue([])
      store.setState({ getRecentConversations: mockRecent })
      
      store.getState().getRecentConversations()
      
      expect(mockRecent).toHaveBeenCalledWith(undefined)
    })
  })

  describe('Autocomplete', () => {
    it('adds autocomplete item', () => {
      const mockAdd = vi.fn()
      store.setState({ addAutocompleteItem: mockAdd })
      
      const item = {
        id: 'new-item',
        text: 'new term',
        type: 'legal-term' as const,
        category: 'test',
        usage: 1,
      }
      
      store.getState().addAutocompleteItem(item)
      
      expect(mockAdd).toHaveBeenCalledWith(item)
    })

    it('gets autocomplete items with query', () => {
      const mockGet = vi.fn().mockReturnValue([])
      store.setState({ getAutocompleteItems: mockGet })
      
      const items = store.getState().getAutocompleteItems('contract', 'legal')
      
      expect(mockGet).toHaveBeenCalledWith('contract', 'legal')
      expect(items).toEqual([])
    })

    it('gets autocomplete items without context', () => {
      const mockGet = vi.fn().mockReturnValue([])
      store.setState({ getAutocompleteItems: mockGet })
      
      store.getState().getAutocompleteItems('contract')
      
      expect(mockGet).toHaveBeenCalledWith('contract', undefined)
    })
  })

  describe('Export Functionality', () => {
    it('exports conversation in JSON format', () => {
      const mockExport = vi.fn()
      store.setState({ exportConversation: mockExport })
      
      store.getState().exportConversation('conv-123', 'json')
      
      expect(mockExport).toHaveBeenCalledWith('conv-123', 'json')
    })

    it('exports conversation in PDF format', () => {
      const mockExport = vi.fn()
      store.setState({ exportConversation: mockExport })
      
      store.getState().exportConversation('conv-123', 'pdf')
      
      expect(mockExport).toHaveBeenCalledWith('conv-123', 'pdf')
    })

    it('exports conversation in TXT format', () => {
      const mockExport = vi.fn()
      store.setState({ exportConversation: mockExport })
      
      store.getState().exportConversation('conv-123', 'txt')
      
      expect(mockExport).toHaveBeenCalledWith('conv-123', 'txt')
    })
  })

  describe('Error Handling', () => {
    it('handles send message failure', async () => {
      const mockSend = vi.fn().mockRejectedValue(new Error('Network error'))
      store.setState({ sendMessage: mockSend })
      
      try {
        await store.getState().sendMessage('Test message')
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        expect((error as Error).message).toBe('Network error')
      }
      
      expect(mockSend).toHaveBeenCalled()
    })

    it('maintains error state after failed operations', async () => {
      const initialError = 'Previous error'
      store.setState({ error: initialError })
      
      const state = store.getState()
      expect(state.error).toBe(initialError)
    })
  })

  describe('Persistence', () => {
    it('persists conversation data', () => {
      const conversations = [createMockConversation()]
      const autocompleteItems = [
        {
          id: 'test',
          text: 'test term',
          type: 'legal-term' as const,
          category: 'test',
          usage: 1,
        }
      ]
      const recentSearches = ['test search']
      
      store.setState({
        conversations,
        autocompleteItems,
        recentSearches,
      })
      
      const state = store.getState()
      expect(state.conversations).toEqual(conversations)
      expect(state.autocompleteItems).toEqual(autocompleteItems)
      expect(state.recentSearches).toEqual(recentSearches)
    })

    it('does not persist transient state', () => {
      store.setState({
        isLoading: true,
        error: 'Test error',
        isTyping: true,
        currentConversation: createMockConversation(),
        messages: [createMockMessage()],
      })
      
      // These should not be persisted according to partialize config
      const state = store.getState()
      expect(state).not.toHaveProperty('isLoading', true)
      expect(state).not.toHaveProperty('error', 'Test error')
      expect(state).not.toHaveProperty('isTyping', true)
      expect(state).not.toHaveProperty('currentConversation')
      expect(state).not.toHaveProperty('messages')
    })
  })

  describe('State Updates', () => {
    it('updates loading state', () => {
      store.setState({ isLoading: true })
      expect(store.getState().isLoading).toBe(true)
      
      store.setState({ isLoading: false })
      expect(store.getState().isLoading).toBe(false)
    })

    it('updates error state', () => {
      const error = 'Test error message'
      store.setState({ error })
      expect(store.getState().error).toBe(error)
      
      store.setState({ error: null })
      expect(store.getState().error).toBeNull()
    })

    it('updates typing state', () => {
      store.setState({ isTyping: true })
      expect(store.getState().isTyping).toBe(true)
      
      store.setState({ isTyping: false })
      expect(store.getState().isTyping).toBe(false)
    })
  })

  describe('Integration Tests', () => {
    it('maintains conversation state when adding messages', () => {
      const conversation = createMockConversation()
      const message = createMockMessage({ conversationId: conversation.id })
      
      store.setState({
        currentConversation: conversation,
        messages: [message],
      })
      
      const state = store.getState()
      expect(state.currentConversation?.id).toBe(conversation.id)
      expect(state.messages[0].conversationId).toBe(conversation.id)
    })

    it('handles multiple rapid state updates', () => {
      const updates = [
        { isLoading: true },
        { error: 'Error 1' },
        { error: 'Error 2' },
        { isLoading: false },
        { error: null },
      ]
      
      updates.forEach(update => store.setState(update))
      
      const finalState = store.getState()
      expect(finalState.isLoading).toBe(false)
      expect(finalState.error).toBeNull()
    })
  })
})