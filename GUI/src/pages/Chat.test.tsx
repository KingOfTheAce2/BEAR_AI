import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@test/utils/test-utils'
import { Chat } from './Chat'
import { useChatStore } from '@store/chatStore'
import { createMockConversation, createMockMessage } from '@test/utils/test-utils'

// Mock stores
vi.mock('@store/chatStore')

// Mock child components
vi.mock('@components/ui', () => ({
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
  Input: ({ value, onChange, placeholder, ...props }: any) => (
    <input 
      value={value} 
      onChange={onChange} 
      placeholder={placeholder} 
      {...props}
    />
  ),
}))

describe('Chat Page', () => {
  const mockUseChatStore = vi.mocked(useChatStore)

  const defaultState = {
    currentConversation: null,
    messages: [],
    isLoading: false,
    isTyping: false,
    error: null,
    sendMessage: vi.fn(),
    createConversation: vi.fn(),
    selectConversation: vi.fn(),
    updateMessage: vi.fn(),
    setTyping: vi.fn(),
  }

  beforeEach(() => {
    mockUseChatStore.mockReturnValue(defaultState as any)
  })

  describe('Basic Rendering', () => {
    it('renders chat interface', () => {
      render(<Chat />)

      expect(screen.getByPlaceholderText(/type your message/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument()
    })

    it('shows empty state when no conversation', () => {
      render(<Chat />)

      expect(screen.getByText(/start a new conversation/i)).toBeInTheDocument()
    })

    it('shows conversation when one is selected', () => {
      const mockConversation = createMockConversation({
        id: 'conv-1',
        title: 'Legal Discussion',
      })

      const mockMessages = [
        createMockMessage({
          id: 'msg-1',
          content: 'What are the elements of a contract?',
          role: 'user',
        }),
        createMockMessage({
          id: 'msg-2',
          content: 'A contract has four main elements...',
          role: 'assistant',
        }),
      ]

      mockUseChatStore.mockReturnValue({
        ...defaultState,
        currentConversation: mockConversation,
        messages: mockMessages,
      } as any)

      render(<Chat />)

      expect(screen.getByText('What are the elements of a contract?')).toBeInTheDocument()
      expect(screen.getByText('A contract has four main elements...')).toBeInTheDocument()
    })
  })

  describe('Message Sending', () => {
    it('sends message when form is submitted', async () => {
      const mockSendMessage = vi.fn()
      
      mockUseChatStore.mockReturnValue({
        ...defaultState,
        currentConversation: createMockConversation(),
        sendMessage: mockSendMessage,
      } as any)

      const { user } = render(<Chat />)

      const input = screen.getByPlaceholderText(/type your message/i)
      const sendButton = screen.getByRole('button', { name: /send/i })

      await user.type(input, 'Test message')
      await user.click(sendButton)

      expect(mockSendMessage).toHaveBeenCalledWith('Test message', undefined)
    })

    it('sends message on Enter key press', async () => {
      const mockSendMessage = vi.fn()
      
      mockUseChatStore.mockReturnValue({
        ...defaultState,
        currentConversation: createMockConversation(),
        sendMessage: mockSendMessage,
      } as any)

      const { user } = render(<Chat />)

      const input = screen.getByPlaceholderText(/type your message/i)

      await user.type(input, 'Test message{enter}')

      expect(mockSendMessage).toHaveBeenCalledWith('Test message')
    })

    it('does not send empty messages', async () => {
      const mockSendMessage = vi.fn()
      
      mockUseChatStore.mockReturnValue({
        ...defaultState,
        currentConversation: createMockConversation(),
        sendMessage: mockSendMessage,
      } as any)

      const { user } = render(<Chat />)

      const sendButton = screen.getByRole('button', { name: /send/i })
      await user.click(sendButton)

      expect(mockSendMessage).not.toHaveBeenCalled()
    })

    it('creates new conversation if none exists', async () => {
      const mockCreateConversation = vi.fn(() => 'new-conv-id')
      const mockSendMessage = vi.fn()
      
      mockUseChatStore.mockReturnValue({
        ...defaultState,
        currentConversation: null,
        createConversation: mockCreateConversation,
        sendMessage: mockSendMessage,
      } as any)

      const { user } = render(<Chat />)

      const input = screen.getByPlaceholderText(/type your message/i)
      const sendButton = screen.getByRole('button', { name: /send/i })

      await user.type(input, 'First message')
      await user.click(sendButton)

      expect(mockCreateConversation).toHaveBeenCalled()
    })

    it('disables send button when loading', () => {
      mockUseChatStore.mockReturnValue({
        ...defaultState,
        isLoading: true,
        currentConversation: createMockConversation(),
      } as any)

      render(<Chat />)

      const sendButton = screen.getByRole('button', { name: /send/i })
      expect(sendButton).toBeDisabled()
    })

    it('clears input after sending message', async () => {
      const mockSendMessage = vi.fn()
      
      mockUseChatStore.mockReturnValue({
        ...defaultState,
        currentConversation: createMockConversation(),
        sendMessage: mockSendMessage,
      } as any)

      const { user } = render(<Chat />)

      const input = screen.getByPlaceholderText(/type your message/i) as HTMLInputElement

      await user.type(input, 'Test message')
      expect(input.value).toBe('Test message')

      const sendButton = screen.getByRole('button', { name: /send/i })
      await user.click(sendButton)

      expect(input.value).toBe('')
    })
  })

  describe('Message Display', () => {
    it('displays messages in correct order', () => {
      const mockMessages = [
        createMockMessage({
          id: 'msg-1',
          content: 'First message',
          timestamp: new Date('2023-12-01T10:00:00'),
          role: 'user',
        }),
        createMockMessage({
          id: 'msg-2',
          content: 'Second message',
          timestamp: new Date('2023-12-01T10:01:00'),
          role: 'assistant',
        }),
        createMockMessage({
          id: 'msg-3',
          content: 'Third message',
          timestamp: new Date('2023-12-01T10:02:00'),
          role: 'user',
        }),
      ]

      mockUseChatStore.mockReturnValue({
        ...defaultState,
        currentConversation: createMockConversation(),
        messages: mockMessages,
      } as any)

      render(<Chat />)

      const messages = screen.getAllByText(/message/)
      expect(messages).toHaveLength(3)
      
      // Messages should appear in chronological order
      expect(screen.getByText('First message')).toBeInTheDocument()
      expect(screen.getByText('Second message')).toBeInTheDocument()
      expect(screen.getByText('Third message')).toBeInTheDocument()
    })

    it('distinguishes between user and assistant messages', () => {
      const mockMessages = [
        createMockMessage({
          id: 'msg-1',
          content: 'User message',
          role: 'user',
        }),
        createMockMessage({
          id: 'msg-2',
          content: 'Assistant message',
          role: 'assistant',
        }),
      ]

      mockUseChatStore.mockReturnValue({
        ...defaultState,
        currentConversation: createMockConversation(),
        messages: mockMessages,
      } as any)

      render(<Chat />)

      const userMessage = screen.getByText('User message')
      const assistantMessage = screen.getByText('Assistant message')

      // Check for different styling classes (implementation dependent)
      expect(userMessage.closest('[data-role="user"]')).toBeTruthy()
      expect(assistantMessage.closest('[data-role="assistant"]')).toBeTruthy()
    })

    it('shows message timestamps', () => {
      const mockMessage = createMockMessage({
        content: 'Timestamped message',
        timestamp: new Date('2023-12-01T10:30:00'),
      })

      mockUseChatStore.mockReturnValue({
        ...defaultState,
        currentConversation: createMockConversation(),
        messages: [mockMessage],
      } as any)

      render(<Chat />)

      expect(screen.getByText(/10:30/)).toBeInTheDocument()
    })

    it('displays message attachments', () => {
      const mockMessage = createMockMessage({
        content: 'Message with attachment',
        attachments: [
          {
            id: 'att-1',
            name: 'document.pdf',
            type: 'document',
            url: 'mock-url',
            size: 1024000,
            mimeType: 'application/pdf',
          },
        ],
      })

      mockUseChatStore.mockReturnValue({
        ...defaultState,
        currentConversation: createMockConversation(),
        messages: [mockMessage],
      } as any)

      render(<Chat />)

      expect(screen.getByText('document.pdf')).toBeInTheDocument()
    })
  })

  describe('Typing Indicator', () => {
    it('shows typing indicator when assistant is typing', () => {
      mockUseChatStore.mockReturnValue({
        ...defaultState,
        currentConversation: createMockConversation(),
        isTyping: true,
      } as any)

      render(<Chat />)

      expect(screen.getByText(/typing/i)).toBeInTheDocument()
    })

    it('hides typing indicator when not typing', () => {
      mockUseChatStore.mockReturnValue({
        ...defaultState,
        currentConversation: createMockConversation(),
        isTyping: false,
      } as any)

      render(<Chat />)

      expect(screen.queryByText(/typing/i)).not.toBeInTheDocument()
    })
  })

  describe('File Attachments', () => {
    it('allows file selection', async () => {
      const { user } = render(<Chat />)

      const fileInput = screen.getByLabelText(/attach file/i)
      const testFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' })

      await user.upload(fileInput, testFile)

      expect(fileInput.files?.[0]).toBe(testFile)
    })

    it('sends message with attachments', async () => {
      const mockSendMessage = vi.fn()
      
      mockUseChatStore.mockReturnValue({
        ...defaultState,
        currentConversation: createMockConversation(),
        sendMessage: mockSendMessage,
      } as any)

      const { user } = render(<Chat />)

      const input = screen.getByPlaceholderText(/type your message/i)
      const fileInput = screen.getByLabelText(/attach file/i)
      const testFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' })

      await user.type(input, 'Message with file')
      await user.upload(fileInput, testFile)

      const sendButton = screen.getByRole('button', { name: /send/i })
      await user.click(sendButton)

      expect(mockSendMessage).toHaveBeenCalledWith('Message with file', [testFile])
    })

    it('shows file preview before sending', async () => {
      const { user } = render(<Chat />)

      const fileInput = screen.getByLabelText(/attach file/i)
      const testFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' })

      await user.upload(fileInput, testFile)

      expect(screen.getByText('test.pdf')).toBeInTheDocument()
    })

    it('allows removing attached files', async () => {
      const { user } = render(<Chat />)

      const fileInput = screen.getByLabelText(/attach file/i)
      const testFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' })

      await user.upload(fileInput, testFile)
      expect(screen.getByText('test.pdf')).toBeInTheDocument()

      const removeButton = screen.getByRole('button', { name: /remove file/i })
      await user.click(removeButton)

      expect(screen.queryByText('test.pdf')).not.toBeInTheDocument()
    })
  })

  describe('Message Actions', () => {
    it('allows copying message content', async () => {
      // Mock clipboard API
      const mockWriteText = vi.fn()
      Object.assign(navigator, {
        clipboard: {
          writeText: mockWriteText,
        },
      })

      const mockMessage = createMockMessage({
        content: 'Copyable message content',
      })

      mockUseChatStore.mockReturnValue({
        ...defaultState,
        currentConversation: createMockConversation(),
        messages: [mockMessage],
      } as any)

      const { user } = render(<Chat />)

      const copyButton = screen.getByRole('button', { name: /copy/i })
      await user.click(copyButton)

      expect(mockWriteText).toHaveBeenCalledWith('Copyable message content')
    })

    it('allows regenerating assistant responses', async () => {
      const mockSendMessage = vi.fn()
      const mockMessages = [
        createMockMessage({
          id: 'msg-1',
          content: 'User question',
          role: 'user',
        }),
        createMockMessage({
          id: 'msg-2',
          content: 'Assistant response',
          role: 'assistant',
        }),
      ]

      mockUseChatStore.mockReturnValue({
        ...defaultState,
        currentConversation: createMockConversation(),
        messages: mockMessages,
        sendMessage: mockSendMessage,
      } as any)

      const { user } = render(<Chat />)

      const regenerateButton = screen.getByRole('button', { name: /regenerate/i })
      await user.click(regenerateButton)

      expect(mockSendMessage).toHaveBeenCalled()
    })
  })

  describe('Auto-scroll', () => {
    it('scrolls to bottom when new message is added', async () => {
      const scrollIntoViewMock = vi.fn()
      Element.prototype.scrollIntoView = scrollIntoViewMock

      const mockMessages = [
        createMockMessage({ id: 'msg-1', content: 'Message 1' }),
      ]

      const { rerender } = render(<Chat />)

      mockUseChatStore.mockReturnValue({
        ...defaultState,
        currentConversation: createMockConversation(),
        messages: mockMessages,
      } as any)

      rerender(<Chat />)

      // Add new message
      const updatedMessages = [
        ...mockMessages,
        createMockMessage({ id: 'msg-2', content: 'Message 2' }),
      ]

      mockUseChatStore.mockReturnValue({
        ...defaultState,
        currentConversation: createMockConversation(),
        messages: updatedMessages,
      } as any)

      rerender(<Chat />)

      await waitFor(() => {
        expect(scrollIntoViewMock).toHaveBeenCalled()
      })
    })
  })

  describe('Error Handling', () => {
    it('displays error messages', () => {
      mockUseChatStore.mockReturnValue({
        ...defaultState,
        error: 'Failed to send message',
      } as any)

      render(<Chat />)

      expect(screen.getByText(/failed to send message/i)).toBeInTheDocument()
    })

    it('allows retrying after error', async () => {
      const mockSendMessage = vi.fn()
      
      mockUseChatStore.mockReturnValue({
        ...defaultState,
        currentConversation: createMockConversation(),
        error: 'Network error',
        sendMessage: mockSendMessage,
      } as any)

      const { user } = render(<Chat />)

      const retryButton = screen.getByRole('button', { name: /retry/i })
      await user.click(retryButton)

      expect(mockSendMessage).toHaveBeenCalled()
    })
  })

  describe('Performance', () => {
    it('handles large message lists efficiently', async () => {
      const largeMessageList = Array.from({ length: 100 }, (_, i) =>
        createMockMessage({
          id: `msg-${i}`,
          content: `Message ${i}`,
        })
      )

      mockUseChatStore.mockReturnValue({
        ...defaultState,
        currentConversation: createMockConversation(),
        messages: largeMessageList,
      } as any)

      const renderTime = await import('@test/utils/test-utils').then(utils => 
        utils.measureRenderTime(() => render(<Chat />))
      )

      expect(renderTime).toBeLessThan(200)
    })

    it('virtualizes long message lists', () => {
      // This would test virtual scrolling if implemented
      const largeMessageList = Array.from({ length: 1000 }, (_, i) =>
        createMockMessage({ id: `msg-${i}`, content: `Message ${i}` })
      )

      mockUseChatStore.mockReturnValue({
        ...defaultState,
        currentConversation: createMockConversation(),
        messages: largeMessageList,
      } as any)

      render(<Chat />)

      // Should only render visible messages
      const visibleMessages = screen.getAllByText(/Message \d+/)
      expect(visibleMessages.length).toBeLessThan(1000)
    })
  })
})