import { ApiResponse, Model } from '@/types';

export const mockApiResponse = <T>(data: T): ApiResponse<T> => ({
  success: true,
  data,
  message: 'Mock API response',
});

export const mockErrorResponse = (message: string): ApiResponse<null> => ({
  success: false,
  data: null,
  message,
  error: new Error(message),
});

export const mockModels: Model[] = [
  {
    id: 'gpt-4',
    name: 'GPT-4',
    provider: 'openai',
    type: 'language',
    capabilities: ['text-generation', 'conversation'],
    parameters: {
      maxTokens: 8192,
      temperature: 0.7,
      topP: 1.0,
    },
    metadata: {
      description: 'Most capable GPT model',
      version: '4.0',
    },
  },
  {
    id: 'claude-3-sonnet',
    name: 'Claude 3 Sonnet',
    provider: 'anthropic',
    type: 'language',
    capabilities: ['text-generation', 'conversation', 'analysis'],
    parameters: {
      maxTokens: 4096,
      temperature: 0.5,
      topP: 0.9,
    },
    metadata: {
      description: 'Balanced performance model',
      version: '3.0',
    },
  },
];

export const mockChatHistory = [
  {
    id: '1',
    role: 'user' as const,
    content: 'Hello, how are you?',
    timestamp: new Date('2024-01-01T10:00:00Z'),
  },
  {
    id: '2',
    role: 'assistant' as const,
    content: 'Hello! I am doing well, thank you for asking. How can I help you today?',
    timestamp: new Date('2024-01-01T10:00:01Z'),
  },
];

export const mockApiService = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  upload: jest.fn(),
};

export const mockModelService = {
  getModels: jest.fn(() => Promise.resolve(mockApiResponse(mockModels))),
  getModel: jest.fn((id: string) => 
    Promise.resolve(mockApiResponse(mockModels.find(m => m.id === id)))
  ),
  updateModel: jest.fn(() => Promise.resolve(mockApiResponse(true))),
  deleteModel: jest.fn(() => Promise.resolve(mockApiResponse(true))),
};

export const mockChatService = {
  sendMessage: jest.fn(),
  getHistory: jest.fn(() => Promise.resolve(mockApiResponse(mockChatHistory))),
  clearHistory: jest.fn(() => Promise.resolve(mockApiResponse(true))),
  exportHistory: jest.fn(),
  importHistory: jest.fn(),
};