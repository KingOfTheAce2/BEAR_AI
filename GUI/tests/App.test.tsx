import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import App from '../src/App'

// Mock the auth store
vi.mock('@store/index', () => ({
  useAuthStore: vi.fn(() => ({
    isAuthenticated: false,
    user: null,
    login: vi.fn(),
    logout: vi.fn(),
  })),
  useAppStore: vi.fn(() => ({
    sidebarCollapsed: false,
    theme: 'light',
    notifications: [],
    toggleSidebar: vi.fn(),
    setTheme: vi.fn(),
    addNotification: vi.fn(),
    removeNotification: vi.fn(),
  })),
  useCasesStore: vi.fn(() => ({
    cases: [],
    selectedCase: null,
  })),
  useDocumentsStore: vi.fn(() => ({
    documents: [],
  })),
}))

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders login page when not authenticated', () => {
    render(<App />)
    
    expect(screen.getByText('Sign in to BEAR AI')).toBeInTheDocument()
    expect(screen.getByText('Your intelligent legal assistant')).toBeInTheDocument()
  })

  it('renders the application title correctly', () => {
    render(<App />)
    
    expect(document.title).toBe('BEAR AI - Legal Assistant')
  })
})