import React from 'react';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { AppProvider } from '@/contexts/AppContext';

// Mock theme context
export const mockThemeContext = {
  theme: 'light' as const,
  setTheme: jest.fn(),
  toggleTheme: jest.fn(),
  colors: {
    primary: '#007bff',
    secondary: '#6c757d',
    success: '#28a745',
    danger: '#dc3545',
    warning: '#ffc107',
    info: '#17a2b8',
    light: '#f8f9fa',
    dark: '#343a40',
  },
};

export const MockThemeProvider = ({ children }: { children: React.ReactNode }) => 
  React.createElement(ThemeProvider.Provider, { value: mockThemeContext }, children);

// Mock auth context
export const mockAuthContext = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  login: jest.fn(),
  logout: jest.fn(),
  register: jest.fn(),
  refreshToken: jest.fn(),
};

export const MockAuthProvider = ({ children }: { children: React.ReactNode }) => 
  React.createElement(AuthProvider.Provider, { value: mockAuthContext }, children);

// Mock app context
export const mockAppContext = {
  state: {
    models: [],
    currentModel: null,
    chatHistory: [],
    agents: [],
    settings: {
      language: 'en',
      autoSave: true,
      theme: 'light',
    },
    performance: {
      memory: { used: 100, total: 1000 },
      cpu: { usage: 50 },
    },
  },
  dispatch: jest.fn(),
  actions: {
    setCurrentModel: jest.fn(),
    addMessage: jest.fn(),
    clearHistory: jest.fn(),
    updateSettings: jest.fn(),
    addAgent: jest.fn(),
    removeAgent: jest.fn(),
  },
};

export const MockAppProvider = ({ children }: { children: React.ReactNode }) => 
  React.createElement(AppProvider.Provider, { value: mockAppContext }, children);

// Combined mock provider
export const MockProviders = ({ children }: { children: React.ReactNode }) => 
  React.createElement(
    MockThemeProvider,
    {},
    React.createElement(
      MockAuthProvider,
      {},
      React.createElement(MockAppProvider, {}, children)
    )
  );

// Context test utilities
export const withMockContext = (Component: React.ComponentType, contextOverrides = {}) => {
  const contextValue = { ...mockAppContext, ...contextOverrides };
  return (props: any) => 
    React.createElement(
      MockProviders,
      {},
      React.createElement(Component, props)
    );
};

export const createMockContext = (initialValue: any) => {
  const Context = React.createContext(initialValue);
  const MockProvider = ({ children, value = initialValue }: any) => 
    React.createElement(Context.Provider, { value }, children);
  
  return { Context, MockProvider };
};