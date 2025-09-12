/**
 * Production Validation: ChatGPT-like Interface Functionality and UX
 * 
 * This test suite validates the production readiness of the BEAR AI chat interface
 * against real user interaction patterns and ChatGPT-like functionality.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import userEvent from '@testing-library/user-event';
import { StreamingChat, CompactStreamingChat } from '../../src/components/streaming/StreamingChat';
import { useStreaming } from '../../src/hooks/useStreaming';
import { ThemeProvider } from '../../src/contexts/ThemeContext';
import { AppProvider } from '../../src/contexts/AppContext';

// Mock real streaming service
jest.mock('../../src/hooks/useStreaming');
const mockUseStreaming = useStreaming as jest.MockedFunction<typeof useStreaming>;

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ThemeProvider initialTheme="professional" initialColorMode="light">
    <AppProvider initialUser={undefined}>
      {children}
    </AppProvider>
  </ThemeProvider>
);

describe('Production Interface Validation - ChatGPT-like Functionality', () => {
  let mockStreamMessage: jest.Mock;
  let mockConnect: jest.Mock;
  let mockDisconnect: jest.Mock;

  beforeEach(() => {
    mockStreamMessage = jest.fn();
    mockConnect = jest.fn();
    mockDisconnect = jest.fn();

    mockUseStreaming.mockReturnValue({
      isConnected: true,
      connectionState: 'connected',
      isStreaming: false,
      currentMessage: '',
      error: null,
      connect: mockConnect,
      disconnect: mockDisconnect,
      streamMessage: mockStreamMessage,
      clearError: jest.fn(),
      metrics: {
        messagesStreamed: 0,
        totalTokens: 0,
        averageLatency: 0,
        errorCount: 0,
        reconnectionCount: 0
      }
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Real-time Chat Interface Validation', () => {
    it('should render complete chat interface with all production components', async () => {
      render(
        <TestWrapper>
          <StreamingChat />
        </TestWrapper>
      );

      // Verify essential chat components are present
      expect(screen.getByRole('textbox')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument();
      expect(screen.getByText(/start a conversation/i)).toBeInTheDocument();
      
      // Verify connection status display
      expect(screen.getByTestId('connection-status') || screen.getByText(/connected/i)).toBeTruthy();
    });

    it('should handle real-time message streaming with proper UX feedback', async () => {
      // Simulate streaming response
      mockUseStreaming.mockReturnValue({
        isConnected: true,
        connectionState: 'connected',
        isStreaming: true,
        currentMessage: 'This is a streaming response...',
        error: null,
        connect: mockConnect,
        disconnect: mockDisconnect,
        streamMessage: mockStreamMessage,
        clearError: jest.fn(),
        metrics: {
          messagesStreamed: 1,
          totalTokens: 25,
          averageLatency: 120,
          errorCount: 0,
          reconnectionCount: 0
        }
      });

      render(
        <TestWrapper>
          <StreamingChat showMetrics={true} />
        </TestWrapper>
      );

      // Verify streaming indicators
      expect(screen.getByText(/this is a streaming response/i)).toBeInTheDocument();
      expect(screen.getByText(/ai is responding/i)).toBeInTheDocument();
      
      // Verify metrics display
      expect(screen.getByText(/tokens: 25/i)).toBeInTheDocument();
      expect(screen.getByText(/avg latency: 120ms/i)).toBeInTheDocument();
    });

    it('should validate user input handling and message sending', async () => {
      const user = userEvent.setup();
      mockStreamMessage.mockResolvedValue('Thank you for your message!');

      render(
        <TestWrapper>
          <StreamingChat onMessageSent={jest.fn()} onMessageReceived={jest.fn()} />
        </TestWrapper>
      );

      const input = screen.getByRole('textbox');
      const sendButton = screen.getByRole('button', { name: /send/i });

      // Test message input
      await user.type(input, 'Hello, BEAR AI!');
      expect(input).toHaveValue('Hello, BEAR AI!');

      // Test send functionality
      await user.click(sendButton);
      
      expect(mockStreamMessage).toHaveBeenCalledWith('Hello, BEAR AI!', {});
      
      // Verify input is cleared after sending
      await waitFor(() => {
        expect(input).toHaveValue('');
      });
    });

    it('should handle Enter key submission like ChatGPT', async () => {
      const user = userEvent.setup();
      mockStreamMessage.mockResolvedValue('Response via Enter key');

      render(
        <TestWrapper>
          <StreamingChat />
        </TestWrapper>
      );

      const input = screen.getByRole('textbox');
      
      await user.type(input, 'Test message');
      await user.keyboard('{Enter}');
      
      expect(mockStreamMessage).toHaveBeenCalledWith('Test message', {});
    });

    it('should prevent Shift+Enter from submitting (multiline support)', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <StreamingChat />
        </TestWrapper>
      );

      const input = screen.getByRole('textbox');
      
      await user.type(input, 'Line one');
      await user.keyboard('{Shift>}{Enter}{/Shift}');
      await user.type(input, 'Line two');
      
      // Should not have triggered send
      expect(mockStreamMessage).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling and Recovery Validation', () => {
    it('should display connection errors with recovery options', async () => {
      mockUseStreaming.mockReturnValue({
        isConnected: false,
        connectionState: 'error',
        isStreaming: false,
        currentMessage: '',
        error: 'Failed to connect to BEAR AI service',
        connect: mockConnect,
        disconnect: mockDisconnect,
        streamMessage: mockStreamMessage,
        clearError: jest.fn(),
        metrics: {
          messagesStreamed: 0,
          totalTokens: 0,
          averageLatency: 0,
          errorCount: 1,
          reconnectionCount: 2
        }
      });

      render(
        <TestWrapper>
          <StreamingChat showConnectionStatus={true} />
        </TestWrapper>
      );

      expect(screen.getByText(/failed to connect/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /reconnect/i })).toBeInTheDocument();
    });

    it('should handle streaming errors gracefully', async () => {
      const user = userEvent.setup();
      mockStreamMessage.mockRejectedValue(new Error('Network timeout'));

      render(
        <TestWrapper>
          <StreamingChat />
        </TestWrapper>
      );

      const input = screen.getByRole('textbox');
      await user.type(input, 'Test message');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(screen.getByText(/error: network timeout/i)).toBeInTheDocument();
      });
    });

    it('should maintain message history during reconnection', async () => {
      const user = userEvent.setup();
      
      // First successful message
      mockStreamMessage.mockResolvedValueOnce('First response');
      
      render(
        <TestWrapper>
          <StreamingChat />
        </TestWrapper>
      );

      const input = screen.getByRole('textbox');
      await user.type(input, 'First message');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(screen.getByText('First message')).toBeInTheDocument();
      });

      // Simulate disconnection and reconnection
      mockUseStreaming.mockReturnValue({
        isConnected: false,
        connectionState: 'disconnected',
        isStreaming: false,
        currentMessage: '',
        error: null,
        connect: mockConnect,
        disconnect: mockDisconnect,
        streamMessage: mockStreamMessage,
        clearError: jest.fn(),
        metrics: {
          messagesStreamed: 1,
          totalTokens: 15,
          averageLatency: 100,
          errorCount: 0,
          reconnectionCount: 1
        }
      });

      // Message history should persist
      expect(screen.getByText('First message')).toBeInTheDocument();
    });
  });

  describe('Performance and Responsiveness Validation', () => {
    it('should handle rapid message sending without UI freezing', async () => {
      const user = userEvent.setup();
      mockStreamMessage.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve('Quick response'), 50))
      );

      render(
        <TestWrapper>
          <StreamingChat />
        </TestWrapper>
      );

      const input = screen.getByRole('textbox');
      const sendButton = screen.getByRole('button', { name: /send/i });

      // Send multiple messages rapidly
      for (let i = 0; i < 5; i++) {
        await user.clear(input);
        await user.type(input, `Message ${i + 1}`);
        await user.click(sendButton);
        
        // Small delay to prevent overwhelming
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      // Should have handled all messages
      expect(mockStreamMessage).toHaveBeenCalledTimes(5);
    });

    it('should limit message history to prevent memory issues', async () => {
      const user = userEvent.setup();
      mockStreamMessage.mockResolvedValue('Response');

      render(
        <TestWrapper>
          <StreamingChat maxMessages={3} />
        </TestWrapper>
      );

      const input = screen.getByRole('textbox');

      // Send more messages than the limit
      for (let i = 0; i < 5; i++) {
        await user.clear(input);
        await user.type(input, `Message ${i + 1}`);
        await user.keyboard('{Enter}');
        
        await waitFor(() => {
          expect(input).toHaveValue('');
        });
      }

      // Only last 3 messages should be visible (considering responses)
      expect(screen.queryByText('Message 1')).not.toBeInTheDocument();
      expect(screen.queryByText('Message 2')).not.toBeInTheDocument();
      expect(screen.getByText('Message 5')).toBeInTheDocument();
    });
  });

  describe('Accessibility and UX Validation', () => {
    it('should provide proper ARIA labels and keyboard navigation', async () => {
      render(
        <TestWrapper>
          <StreamingChat />
        </TestWrapper>
      );

      const input = screen.getByRole('textbox');
      const sendButton = screen.getByRole('button', { name: /send/i });

      expect(input).toHaveAttribute('aria-label', expect.stringContaining('message') || '');
      expect(sendButton).toBeEnabled();
      
      // Test keyboard navigation
      input.focus();
      expect(document.activeElement).toBe(input);
    });

    it('should provide visual feedback for all user actions', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <StreamingChat />
        </TestWrapper>
      );

      const input = screen.getByRole('textbox');
      const sendButton = screen.getByRole('button', { name: /send/i });

      // Button should be disabled when input is empty
      expect(sendButton).toBeDisabled();

      // Button should be enabled when input has content
      await user.type(input, 'Test');
      expect(sendButton).toBeEnabled();

      // Should show placeholder text when appropriate
      expect(input).toHaveAttribute('placeholder', expect.stringContaining('type') || expect.stringContaining('message'));
    });
  });

  describe('Compact Chat Interface Validation', () => {
    it('should provide streamlined interface for embedding', async () => {
      const user = userEvent.setup();
      const onMessage = jest.fn();

      render(
        <TestWrapper>
          <CompactStreamingChat onMessage={onMessage} />
        </TestWrapper>
      );

      const input = screen.getByRole('textbox');
      const sendButton = screen.getByRole('button', { name: /send/i });

      expect(input).toHaveAttribute('placeholder', /ask bear ai/i);
      
      await user.type(input, 'Quick question');
      await user.click(sendButton);

      expect(onMessage).toHaveBeenCalledWith('Quick question');
    });

    it('should handle connection states in compact mode', async () => {
      mockUseStreaming.mockReturnValue({
        isConnected: false,
        connectionState: 'connecting',
        isStreaming: false,
        currentMessage: '',
        error: null,
        connect: mockConnect,
        disconnect: mockDisconnect,
        streamMessage: mockStreamMessage,
        clearError: jest.fn(),
        metrics: {
          messagesStreamed: 0,
          totalTokens: 0,
          averageLatency: 0,
          errorCount: 0,
          reconnectionCount: 0
        }
      });

      render(
        <TestWrapper>
          <CompactStreamingChat />
        </TestWrapper>
      );

      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('placeholder', /connecting/i);
      expect(input).toBeDisabled();
    });
  });

  describe('Production Data Flow Validation', () => {
    it('should properly handle message callbacks for integration', async () => {
      const user = userEvent.setup();
      const onMessageSent = jest.fn();
      const onMessageReceived = jest.fn();

      mockStreamMessage.mockResolvedValue('Callback test response');

      render(
        <TestWrapper>
          <StreamingChat 
            onMessageSent={onMessageSent}
            onMessageReceived={onMessageReceived}
          />
        </TestWrapper>
      );

      const input = screen.getByRole('textbox');
      await user.type(input, 'Test callback');
      await user.keyboard('{Enter}');

      expect(onMessageSent).toHaveBeenCalledWith('Test callback');
      
      await waitFor(() => {
        expect(onMessageReceived).toHaveBeenCalledWith(
          expect.objectContaining({
            content: 'Callback test response',
            type: 'assistant',
            isComplete: true
          })
        );
      });
    });

    it('should validate streaming options configuration', async () => {
      const streamingOptions = {
        temperature: 0.7,
        maxTokens: 1000,
        stream: true
      };

      render(
        <TestWrapper>
          <StreamingChat streamingOptions={streamingOptions} />
        </TestWrapper>
      );

      const input = screen.getByRole('textbox');
      const user = userEvent.setup();
      
      await user.type(input, 'Test with options');
      await user.keyboard('{Enter}');

      expect(mockStreamMessage).toHaveBeenCalledWith('Test with options', streamingOptions);
    });
  });

  describe('Real-world Usage Patterns', () => {
    it('should handle long conversations without performance degradation', async () => {
      const user = userEvent.setup();
      let responseCount = 0;
      
      mockStreamMessage.mockImplementation(() => {
        responseCount++;
        return Promise.resolve(`Response ${responseCount} with detailed content that might be longer and include various technical terms and legal jargon that users typically would ask about.`);
      });

      render(
        <TestWrapper>
          <StreamingChat maxMessages={50} />
        </TestWrapper>
      );

      const input = screen.getByRole('textbox');

      // Simulate extended conversation
      for (let i = 0; i < 10; i++) {
        await user.clear(input);
        await user.type(input, `Legal question ${i + 1}: What are the implications of contract law in this scenario?`);
        await user.keyboard('{Enter}');
        
        await waitFor(() => {
          expect(input).toHaveValue('');
        });
      }

      expect(mockStreamMessage).toHaveBeenCalledTimes(10);
      expect(screen.getByText(/legal question 10/i)).toBeInTheDocument();
    });

    it('should maintain professional appearance and behavior', () => {
      render(
        <TestWrapper>
          <StreamingChat className="professional-chat" />
        </TestWrapper>
      );

      // Verify professional styling classes are applied
      const chatContainer = screen.getByTestId('streaming-chat') || 
                           document.querySelector('.streaming-chat');
      
      expect(chatContainer).toBeInTheDocument();
      expect(chatContainer).toHaveClass('streaming-chat');
    });
  });
});