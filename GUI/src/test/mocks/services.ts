import { vi } from 'vitest'
import type { ApiService } from '@services/api'
import type { AuthService } from '@services/auth'

// Mock API Service
export const createMockApiService = (): jest.Mocked<ApiService> => ({
  // Chat endpoints
  sendMessage: vi.fn().mockResolvedValue({
    data: {
      id: 'msg-123',
      content: 'Mock AI response',
      role: 'assistant',
      timestamp: new Date(),
      citations: [],
    }
  }),
  
  getConversations: vi.fn().mockResolvedValue({
    data: {
      conversations: [],
      total: 0,
      page: 1,
      limit: 10,
    }
  }),
  
  getConversation: vi.fn().mockResolvedValue({
    data: {
      id: 'conv-123',
      title: 'Mock Conversation',
      messages: [],
      createdAt: new Date(),
    }
  }),
  
  createConversation: vi.fn().mockResolvedValue({
    data: {
      id: 'conv-123',
      title: 'New Conversation',
      messages: [],
      createdAt: new Date(),
    }
  }),
  
  deleteConversation: vi.fn().mockResolvedValue({ data: { success: true } }),
  
  // Research endpoints
  searchCases: vi.fn().mockResolvedValue({
    data: {
      results: [
        {
          id: 'case-1',
          title: 'Mock Case v. Test',
          citation: '123 F.3d 456',
          snippet: 'Mock case snippet...',
          relevance: 0.95,
          court: 'Supreme Court',
          date: '2023-01-01',
        }
      ],
      total: 1,
      searchTime: 250,
    }
  }),
  
  searchStatutes: vi.fn().mockResolvedValue({
    data: {
      results: [
        {
          id: 'statute-1',
          title: 'Mock Statute',
          citation: '42 U.S.C. § 1983',
          snippet: 'Mock statute text...',
          relevance: 0.92,
          jurisdiction: 'Federal',
        }
      ],
      total: 1,
      searchTime: 180,
    }
  }),
  
  searchRegulations: vi.fn().mockResolvedValue({
    data: {
      results: [
        {
          id: 'reg-1',
          title: 'Mock Regulation',
          citation: '29 C.F.R. § 825.100',
          snippet: 'Mock regulation text...',
          relevance: 0.88,
          agency: 'DOL',
        }
      ],
      total: 1,
      searchTime: 200,
    }
  }),
  
  // Document endpoints
  uploadDocument: vi.fn().mockResolvedValue({
    data: {
      id: 'doc-123',
      name: 'test-document.pdf',
      size: 1024000,
      type: 'application/pdf',
      uploadedAt: new Date(),
      processedAt: new Date(),
    }
  }),
  
  getDocuments: vi.fn().mockResolvedValue({
    data: {
      documents: [],
      total: 0,
      page: 1,
      limit: 10,
    }
  }),
  
  deleteDocument: vi.fn().mockResolvedValue({ data: { success: true } }),
  
  // User endpoints
  getCurrentUser: vi.fn().mockResolvedValue({
    data: {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      role: 'user',
      preferences: {
        theme: 'light',
        language: 'en',
      },
    }
  }),
  
  updateUserProfile: vi.fn().mockResolvedValue({
    data: {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Updated User',
      role: 'user',
    }
  }),
  
  // Utility methods
  setAuthToken: vi.fn(),
  clearAuthToken: vi.fn(),
  isAuthenticated: vi.fn().mockReturnValue(true),
})

// Mock Auth Service
export const createMockAuthService = (): jest.Mocked<AuthService> => ({
  login: vi.fn().mockResolvedValue({
    user: {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      role: 'user',
    },
    token: 'mock-jwt-token',
    expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
  }),
  
  register: vi.fn().mockResolvedValue({
    user: {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      role: 'user',
    },
    token: 'mock-jwt-token',
    expiresAt: new Date(Date.now() + 3600000),
  }),
  
  logout: vi.fn().mockResolvedValue(undefined),
  
  refreshToken: vi.fn().mockResolvedValue({
    token: 'new-mock-jwt-token',
    expiresAt: new Date(Date.now() + 3600000),
  }),
  
  getCurrentUser: vi.fn().mockResolvedValue({
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    role: 'user',
    preferences: {
      theme: 'light',
      language: 'en',
    },
  }),
  
  updateProfile: vi.fn().mockResolvedValue({
    id: 'user-123',
    email: 'test@example.com',
    name: 'Updated User',
    role: 'user',
  }),
  
  changePassword: vi.fn().mockResolvedValue({ success: true }),
  
  requestPasswordReset: vi.fn().mockResolvedValue({ success: true }),
  
  resetPassword: vi.fn().mockResolvedValue({ success: true }),
  
  verifyEmail: vi.fn().mockResolvedValue({ success: true }),
  
  isAuthenticated: vi.fn().mockReturnValue(true),
  
  getToken: vi.fn().mockReturnValue('mock-jwt-token'),
  
  setToken: vi.fn(),
  
  removeToken: vi.fn(),
})

// Service factory
export const createMockServices = () => ({
  api: createMockApiService(),
  auth: createMockAuthService(),
})

// HTTP client mocks
export const createMockAxiosResponse = <T>(data: T, status = 200) => ({
  data,
  status,
  statusText: 'OK',
  headers: {},
  config: {},
})

export const createMockAxiosError = (
  message: string,
  status = 500,
  code = 'INTERNAL_ERROR'
) => ({
  message,
  name: 'AxiosError',
  code,
  isAxiosError: true,
  response: {
    data: { error: message },
    status,
    statusText: 'Internal Server Error',
    headers: {},
    config: {},
  },
  config: {},
  toJSON: () => ({ message, name: 'AxiosError', code }),
})

// WebSocket mock
export const createMockWebSocket = () => {
  const mockWs = {
    send: vi.fn(),
    close: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    readyState: WebSocket.OPEN,
    CONNECTING: WebSocket.CONNECTING,
    OPEN: WebSocket.OPEN,
    CLOSING: WebSocket.CLOSING,
    CLOSED: WebSocket.CLOSED,
    onopen: null,
    onclose: null,
    onmessage: null,
    onerror: null,
  }

  // Simulate connection events
  const simulateOpen = () => {
    if (mockWs.onopen) mockWs.onopen({} as Event)
  }

  const simulateMessage = (data: any) => {
    if (mockWs.onmessage) {
      mockWs.onmessage({ data: JSON.stringify(data) } as MessageEvent)
    }
  }

  const simulateError = (error: Error) => {
    if (mockWs.onerror) mockWs.onerror(error as Event)
  }

  const simulateClose = (code = 1000, reason = 'Normal closure') => {
    mockWs.readyState = WebSocket.CLOSED
    if (mockWs.onclose) {
      mockWs.onclose({ code, reason } as CloseEvent)
    }
  }

  return {
    mockWs,
    simulateOpen,
    simulateMessage,
    simulateError,
    simulateClose,
  }
}