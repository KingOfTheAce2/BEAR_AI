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

      expect(input).toHaveAttribute('aria-label', expect.stringMatching(/message/i) || '');
      expect(sendButton).toBeEnabled();

      // Test keyboard navigation
      input.focus();
      expect(document.activeElement).toBe(input);
    });
  });
});