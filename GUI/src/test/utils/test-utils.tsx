import React from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import userEvent from '@testing-library/user-event'

// Custom render function with providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialEntries?: string[]
  withRouter?: boolean
}

function customRender(
  ui: React.ReactElement,
  {
    initialEntries = ['/'],
    withRouter = true,
    ...renderOptions
  }: CustomRenderOptions = {}
) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    if (withRouter) {
      return (
        <BrowserRouter>
          {children}
        </BrowserRouter>
      )
    }
    return <>{children}</>
  }

  const user = userEvent.setup()

  return {
    user,
    ...render(ui, {
      wrapper: Wrapper,
      ...renderOptions,
    }),
  }
}

// Wait utilities
export const waitForElementToDisappear = async (
  element: HTMLElement,
  timeout = 1000
) => {
  return new Promise<void>((resolve) => {
    const observer = new MutationObserver(() => {
      if (!document.contains(element)) {
        observer.disconnect()
        resolve()
      }
    })
    
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    })
    
    setTimeout(() => {
      observer.disconnect()
      resolve()
    }, timeout)
  })
}

// Test data generators
export const createMockUser = (overrides = {}) => ({
  id: 'test-user-1',
  email: 'test@example.com',
  name: 'Test User',
  role: 'user',
  preferences: {
    theme: 'light',
    language: 'en',
  },
  ...overrides,
})

export const createMockConversation = (overrides = {}) => ({
  id: 'conv-1',
  title: 'Test Conversation',
  userId: 'test-user-1',
  messages: [],
  lastActivity: new Date(),
  tags: [],
  isArchived: false,
  metadata: {
    messageCount: 0,
    legalContext: [],
    caseReferences: [],
  },
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

export const createMockMessage = (overrides = {}) => ({
  id: 'msg-1',
  content: 'Test message content',
  role: 'user' as const,
  timestamp: new Date(),
  attachments: [],
  userId: 'test-user-1',
  conversationId: 'conv-1',
  ...overrides,
})

export const createMockApiResponse = <T>(data: T, status = 200) => ({
  data,
  status,
  statusText: 'OK',
  headers: {},
  config: {},
})

// Mock localStorage
export const createMockStorage = () => {
  let store: Record<string, string> = {}

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString()
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
    get length() {
      return Object.keys(store).length
    },
    key: (index: number) => Object.keys(store)[index] || null,
  }
}

// Assertion helpers
export const expectElementToHaveAriaLabel = (
  element: HTMLElement,
  label: string
) => {
  expect(element).toHaveAttribute('aria-label', label)
}

export const expectElementToBeAccessible = (element: HTMLElement) => {
  // Check for accessibility attributes
  const hasAriaLabel = element.hasAttribute('aria-label')
  const hasAriaLabelledBy = element.hasAttribute('aria-labelledby')
  const hasRole = element.hasAttribute('role')
  const isFormElement = ['INPUT', 'BUTTON', 'TEXTAREA', 'SELECT'].includes(
    element.tagName
  )

  if (isFormElement) {
    expect(
      hasAriaLabel || hasAriaLabelledBy || element.hasAttribute('id')
    ).toBeTruthy()
  }

  if (hasRole) {
    expect(element.getAttribute('role')).not.toBe('')
  }
}

// Performance testing utilities
export const measureRenderTime = async (renderFn: () => void) => {
  const start = performance.now()
  renderFn()
  await new Promise(resolve => setTimeout(resolve, 0))
  const end = performance.now()
  return end - start
}

export const expectRenderTimeUnder = async (
  renderFn: () => void,
  maxTime: number
) => {
  const renderTime = await measureRenderTime(renderFn)
  expect(renderTime).toBeLessThan(maxTime)
}

// Export everything from testing-library
export * from '@testing-library/react'

// Override render method
export { customRender as render }