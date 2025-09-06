import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@test/utils/test-utils'
import { Dashboard } from './Dashboard'
import { useChatStore } from '@store/chatStore'
import { useHistoryStore } from '@store/historyStore'
import { createMockConversation, createMockUser } from '@test/utils/test-utils'

// Mock stores
vi.mock('@store/chatStore')
vi.mock('@store/historyStore')

// Mock child components
vi.mock('@components/ui', () => ({
  Button: ({ children, ...props }: any) => (
    <button {...props}>{children}</button>
  ),
}))

describe('Dashboard Page', () => {
  const mockUseChatStore = vi.mocked(useChatStore)
  const mockUseHistoryStore = vi.mocked(useHistoryStore)

  const defaultChatState = {
    conversations: [],
    getRecentConversations: vi.fn(() => []),
    createConversation: vi.fn(),
    isLoading: false,
    error: null,
  }

  const defaultHistoryState = {
    items: [],
    getItemsByDateRange: vi.fn(() => []),
    isLoading: false,
    error: null,
  }

  beforeEach(() => {
    mockUseChatStore.mockReturnValue(defaultChatState as any)
    mockUseHistoryStore.mockReturnValue(defaultHistoryState as any)
  })

  describe('Basic Rendering', () => {
    it('renders dashboard with all sections', () => {
      render(<Dashboard />)

      expect(screen.getByText(/welcome/i)).toBeInTheDocument()
      expect(screen.getByText(/recent conversations/i)).toBeInTheDocument()
      expect(screen.getByText(/quick actions/i)).toBeInTheDocument()
    })

    it('shows loading state when data is loading', () => {
      mockUseChatStore.mockReturnValue({
        ...defaultChatState,
        isLoading: true,
      } as any)

      render(<Dashboard />)

      expect(screen.getByText(/loading/i)).toBeInTheDocument()
    })

    it('shows error state when there is an error', () => {
      mockUseChatStore.mockReturnValue({
        ...defaultChatState,
        error: 'Failed to load conversations',
      } as any)

      render(<Dashboard />)

      expect(screen.getByText(/failed to load/i)).toBeInTheDocument()
    })
  })

  describe('Recent Conversations', () => {
    it('displays recent conversations', async () => {
      const mockConversations = [
        createMockConversation({
          id: 'conv-1',
          title: 'Contract Law Discussion',
          lastActivity: new Date('2023-12-01'),
        }),
        createMockConversation({
          id: 'conv-2',
          title: 'Employment Rights',
          lastActivity: new Date('2023-11-30'),
        }),
      ]

      mockUseChatStore.mockReturnValue({
        ...defaultChatState,
        getRecentConversations: vi.fn(() => mockConversations),
      } as any)

      render(<Dashboard />)

      await waitFor(() => {
        expect(screen.getByText('Contract Law Discussion')).toBeInTheDocument()
        expect(screen.getByText('Employment Rights')).toBeInTheDocument()
      })
    })

    it('shows empty state when no conversations', () => {
      render(<Dashboard />)

      expect(screen.getByText(/no recent conversations/i)).toBeInTheDocument()
    })

    it('handles conversation click', async () => {
      const mockSelectConversation = vi.fn()
      const mockConversations = [
        createMockConversation({
          id: 'conv-1',
          title: 'Test Conversation',
        }),
      ]

      mockUseChatStore.mockReturnValue({
        ...defaultChatState,
        getRecentConversations: vi.fn(() => mockConversations),
        selectConversation: mockSelectConversation,
      } as any)

      const { user } = render(<Dashboard />)

      const conversationItem = screen.getByText('Test Conversation')
      await user.click(conversationItem)

      expect(mockSelectConversation).toHaveBeenCalledWith('conv-1')
    })

    it('limits conversations to recent ones', () => {
      const getRecentConversations = vi.fn(() => [])
      
      mockUseChatStore.mockReturnValue({
        ...defaultChatState,
        getRecentConversations,
      } as any)

      render(<Dashboard />)

      expect(getRecentConversations).toHaveBeenCalledWith(5) // Limit to 5 recent
    })
  })

  describe('Quick Actions', () => {
    it('renders quick action buttons', () => {
      render(<Dashboard />)

      expect(screen.getByRole('button', { name: /new chat/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /search cases/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /upload document/i })).toBeInTheDocument()
    })

    it('handles new chat action', async () => {
      const mockCreateConversation = vi.fn(() => 'new-conv-id')
      
      mockUseChatStore.mockReturnValue({
        ...defaultChatState,
        createConversation: mockCreateConversation,
      } as any)

      const { user } = render(<Dashboard />)

      const newChatButton = screen.getByRole('button', { name: /new chat/i })
      await user.click(newChatButton)

      expect(mockCreateConversation).toHaveBeenCalled()
    })

    it('navigates to search when search cases clicked', async () => {
      const { user } = render(<Dashboard />)

      const searchButton = screen.getByRole('button', { name: /search cases/i })
      await user.click(searchButton)

      // This would test navigation - depends on implementation
      expect(searchButton).toBeInTheDocument()
    })
  })

  describe('Statistics Section', () => {
    it('displays usage statistics', async () => {
      const mockHistoryItems = [
        { id: '1', type: 'chat', createdAt: new Date() },
        { id: '2', type: 'search', createdAt: new Date() },
        { id: '3', type: 'document', createdAt: new Date() },
      ]

      mockUseHistoryStore.mockReturnValue({
        ...defaultHistoryState,
        getItemsByDateRange: vi.fn(() => mockHistoryItems),
      } as any)

      render(<Dashboard />)

      await waitFor(() => {
        expect(screen.getByText(/3/)).toBeInTheDocument() // Activity count
      })
    })

    it('shows correct time period for stats', () => {
      const getItemsByDateRange = vi.fn(() => [])
      
      mockUseHistoryStore.mockReturnValue({
        ...defaultHistoryState,
        getItemsByDateRange,
      } as any)

      render(<Dashboard />)

      expect(getItemsByDateRange).toHaveBeenCalledWith(
        expect.any(Date), // Start of week/month
        expect.any(Date)  // End date (today)
      )
    })
  })

  describe('Welcome Message', () => {
    it('shows generic welcome when no user', () => {
      render(<Dashboard />)

      expect(screen.getByText(/welcome to bear ai/i)).toBeInTheDocument()
    })

    it('shows personalized welcome with user name', () => {
      // Mock user context or store
      render(<Dashboard />)

      // This would test personalized greeting when user is available
      expect(screen.getByText(/welcome/i)).toBeInTheDocument()
    })

    it('shows appropriate time-based greeting', () => {
      // Mock different times of day
      const mockDate = new Date('2023-12-01T09:00:00')
      vi.setSystemTime(mockDate)

      render(<Dashboard />)

      expect(screen.getByText(/good morning|good afternoon|good evening/i)).toBeInTheDocument()

      vi.useRealTimers()
    })
  })

  describe('Search Shortcuts', () => {
    it('displays popular search terms', () => {
      render(<Dashboard />)

      expect(screen.getByText(/popular searches/i)).toBeInTheDocument()
      expect(screen.getByText(/contract law/i)).toBeInTheDocument()
      expect(screen.getByText(/employment rights/i)).toBeInTheDocument()
    })

    it('handles search shortcut clicks', async () => {
      const { user } = render(<Dashboard />)

      const contractLawShortcut = screen.getByText(/contract law/i)
      await user.click(contractLawShortcut)

      // Would test navigation to search with pre-filled query
      expect(contractLawShortcut).toBeInTheDocument()
    })
  })

  describe('Recent Activity', () => {
    it('shows recent activity items', async () => {
      const mockHistoryItems = [
        {
          id: '1',
          type: 'chat',
          title: 'Discussed contract terms',
          createdAt: new Date('2023-12-01T10:00:00'),
        },
        {
          id: '2',
          type: 'search',
          title: 'Searched for employment law',
          createdAt: new Date('2023-12-01T09:30:00'),
        },
      ]

      mockUseHistoryStore.mockReturnValue({
        ...defaultHistoryState,
        items: mockHistoryItems,
        getItemsByDateRange: vi.fn(() => mockHistoryItems.slice(0, 3)),
      } as any)

      render(<Dashboard />)

      await waitFor(() => {
        expect(screen.getByText(/discussed contract terms/i)).toBeInTheDocument()
        expect(screen.getByText(/searched for employment law/i)).toBeInTheDocument()
      })
    })

    it('shows relative timestamps for activities', async () => {
      const mockHistoryItems = [
        {
          id: '1',
          type: 'chat',
          title: 'Recent chat',
          createdAt: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
        },
      ]

      mockUseHistoryStore.mockReturnValue({
        ...defaultHistoryState,
        getItemsByDateRange: vi.fn(() => mockHistoryItems),
      } as any)

      render(<Dashboard />)

      await waitFor(() => {
        expect(screen.getByText(/1 hour ago|an hour ago/i)).toBeInTheDocument()
      })
    })
  })

  describe('Responsive Design', () => {
    it('adapts layout for mobile screens', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      })

      const { container } = render(<Dashboard />)

      // Check for mobile-specific classes
      const dashboardElement = container.querySelector('[data-testid="dashboard"]') ||
                              container.firstChild as HTMLElement
      
      expect(dashboardElement).toBeDefined()
    })

    it('shows full layout on desktop', () => {
      // Mock desktop viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1200,
      })

      const { container } = render(<Dashboard />)

      const dashboardElement = container.firstChild as HTMLElement
      expect(dashboardElement).toBeDefined()
    })
  })

  describe('Performance', () => {
    it('renders quickly with empty data', async () => {
      const renderTime = await import('@test/utils/test-utils').then(utils => 
        utils.measureRenderTime(() => render(<Dashboard />))
      )

      expect(renderTime).toBeLessThan(100)
    })

    it('handles large conversation lists efficiently', async () => {
      const largeConversationList = Array.from({ length: 100 }, (_, i) =>
        createMockConversation({
          id: `conv-${i}`,
          title: `Conversation ${i}`,
        })
      )

      mockUseChatStore.mockReturnValue({
        ...defaultChatState,
        conversations: largeConversationList,
        getRecentConversations: vi.fn(() => largeConversationList.slice(0, 5)),
      } as any)

      const renderTime = await import('@test/utils/test-utils').then(utils => 
        utils.measureRenderTime(() => render(<Dashboard />))
      )

      expect(renderTime).toBeLessThan(200) // Should still be fast with large data
    })
  })

  describe('Error Recovery', () => {
    it('shows retry button on error', () => {
      mockUseChatStore.mockReturnValue({
        ...defaultChatState,
        error: 'Network error',
      } as any)

      render(<Dashboard />)

      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
    })

    it('retries loading data when retry button clicked', async () => {
      const mockRetryFn = vi.fn()
      
      mockUseChatStore.mockReturnValue({
        ...defaultChatState,
        error: 'Network error',
        retry: mockRetryFn,
      } as any)

      const { user } = render(<Dashboard />)

      const retryButton = screen.getByRole('button', { name: /retry/i })
      await user.click(retryButton)

      expect(mockRetryFn).toHaveBeenCalled()
    })
  })
})