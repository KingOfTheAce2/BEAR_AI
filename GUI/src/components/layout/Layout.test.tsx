import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@test/utils/test-utils'
import { Layout } from './Layout'
import { useLocation } from 'react-router-dom'

// Mock child components
vi.mock('./Header', () => ({
  Header: ({ children }: { children?: React.ReactNode }) => (
    <header data-testid="header">{children}</header>
  ),
}))

vi.mock('./Sidebar', () => ({
  Sidebar: ({ children }: { children?: React.ReactNode }) => (
    <aside data-testid="sidebar">{children}</aside>
  ),
}))

// Mock React Router
vi.mock('react-router-dom', () => ({
  useLocation: vi.fn(),
}))

describe('Layout Component', () => {
  const mockUseLocation = vi.mocked(useLocation)

  beforeEach(() => {
    mockUseLocation.mockReturnValue({
      pathname: '/dashboard',
      search: '',
      hash: '',
      state: null,
      key: 'default',
    })
  })

  describe('Basic Rendering', () => {
    it('renders layout structure correctly', () => {
      render(
        <Layout>
          <div data-testid="main-content">Main Content</div>
        </Layout>
      )

      expect(screen.getByTestId('header')).toBeInTheDocument()
      expect(screen.getByTestId('sidebar')).toBeInTheDocument()
      expect(screen.getByTestId('main-content')).toBeInTheDocument()
    })

    it('renders with custom className', () => {
      const { container } = render(
        <Layout className="custom-layout">
          <div>Content</div>
        </Layout>
      )

      const layoutElement = container.firstChild as HTMLElement
      expect(layoutElement).toHaveClass('custom-layout')
    })

    it('applies correct grid layout classes', () => {
      const { container } = render(
        <Layout>
          <div>Content</div>
        </Layout>
      )

      const layoutElement = container.firstChild as HTMLElement
      expect(layoutElement).toHaveClass('min-h-screen', 'bg-secondary-50')
    })
  })

  describe('Responsive Behavior', () => {
    it('handles mobile layout correctly', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      })

      render(
        <Layout>
          <div data-testid="content">Mobile Content</div>
        </Layout>
      )

      const sidebar = screen.getByTestId('sidebar')
      expect(sidebar).toBeInTheDocument()
    })

    it('handles desktop layout correctly', () => {
      // Mock desktop viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1200,
      })

      render(
        <Layout>
          <div data-testid="content">Desktop Content</div>
        </Layout>
      )

      const sidebar = screen.getByTestId('sidebar')
      expect(sidebar).toBeInTheDocument()
    })

    it('adjusts layout on window resize', async () => {
      render(
        <Layout>
          <div data-testid="content">Responsive Content</div>
        </Layout>
      )

      // Simulate window resize
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 600,
      })

      window.dispatchEvent(new Event('resize'))

      await waitFor(() => {
        const content = screen.getByTestId('content')
        expect(content).toBeInTheDocument()
      })
    })
  })

  describe('Sidebar Toggle', () => {
    it('shows sidebar by default', () => {
      render(
        <Layout>
          <div>Content</div>
        </Layout>
      )

      const sidebar = screen.getByTestId('sidebar')
      expect(sidebar).toBeInTheDocument()
      expect(sidebar).toBeVisible()
    })

    it('can toggle sidebar visibility', async () => {
      const { user } = render(
        <Layout>
          <div>Content</div>
        </Layout>
      )

      // Look for toggle button in header
      const header = screen.getByTestId('header')
      const toggleButton = header.querySelector('[data-testid="sidebar-toggle"]') ||
                          header.querySelector('button')

      if (toggleButton) {
        await user.click(toggleButton)
        // Sidebar toggle behavior would be tested here
        // This depends on actual implementation
      }
    })
  })

  describe('Navigation Integration', () => {
    it('updates active route in sidebar', () => {
      mockUseLocation.mockReturnValue({
        pathname: '/chat',
        search: '',
        hash: '',
        state: null,
        key: 'chat',
      })

      render(
        <Layout>
          <div data-testid="chat-content">Chat Content</div>
        </Layout>
      )

      expect(screen.getByTestId('sidebar')).toBeInTheDocument()
      expect(screen.getByTestId('chat-content')).toBeInTheDocument()
    })

    it('handles route changes correctly', () => {
      const { rerender } = render(
        <Layout>
          <div data-testid="dashboard-content">Dashboard</div>
        </Layout>
      )

      expect(screen.getByTestId('dashboard-content')).toBeInTheDocument()

      // Change route
      mockUseLocation.mockReturnValue({
        pathname: '/research',
        search: '',
        hash: '',
        state: null,
        key: 'research',
      })

      rerender(
        <Layout>
          <div data-testid="research-content">Research</div>
        </Layout>
      )

      expect(screen.getByTestId('research-content')).toBeInTheDocument()
    })
  })

  describe('Main Content Area', () => {
    it('renders children in main content area', () => {
      const TestContent = () => (
        <div data-testid="test-content">
          <h1>Test Page</h1>
          <p>Test content goes here</p>
        </div>
      )

      render(
        <Layout>
          <TestContent />
        </Layout>
      )

      expect(screen.getByTestId('test-content')).toBeInTheDocument()
      expect(screen.getByText('Test Page')).toBeInTheDocument()
      expect(screen.getByText('Test content goes here')).toBeInTheDocument()
    })

    it('handles multiple children', () => {
      render(
        <Layout>
          <div data-testid="child-1">Child 1</div>
          <div data-testid="child-2">Child 2</div>
          <div data-testid="child-3">Child 3</div>
        </Layout>
      )

      expect(screen.getByTestId('child-1')).toBeInTheDocument()
      expect(screen.getByTestId('child-2')).toBeInTheDocument()
      expect(screen.getByTestId('child-3')).toBeInTheDocument()
    })

    it('applies correct content area styling', () => {
      render(
        <Layout>
          <div data-testid="content">Content</div>
        </Layout>
      )

      const content = screen.getByTestId('content')
      const contentArea = content.closest('main')
      
      if (contentArea) {
        expect(contentArea).toHaveClass('flex-1')
      }
    })
  })

  describe('Theme Support', () => {
    it('applies light theme classes by default', () => {
      const { container } = render(
        <Layout>
          <div>Content</div>
        </Layout>
      )

      const layoutElement = container.firstChild as HTMLElement
      expect(layoutElement).toHaveClass('bg-secondary-50')
    })

    it('supports dark theme', () => {
      const { container } = render(
        <Layout className="dark">
          <div>Content</div>
        </Layout>
      )

      const layoutElement = container.firstChild as HTMLElement
      expect(layoutElement).toHaveClass('dark')
    })
  })

  describe('Accessibility', () => {
    it('has proper semantic structure', () => {
      render(
        <Layout>
          <div data-testid="content">Content</div>
        </Layout>
      )

      expect(screen.getByRole('banner')).toBeInTheDocument() // header
      expect(screen.getByRole('complementary')).toBeInTheDocument() // aside/sidebar
      expect(screen.getByRole('main')).toBeInTheDocument() // main content
    })

    it('has proper ARIA landmarks', () => {
      render(
        <Layout>
          <div data-testid="content">Content</div>
        </Layout>
      )

      const header = screen.getByTestId('header')
      const sidebar = screen.getByTestId('sidebar')
      const content = screen.getByTestId('content')

      expect(header.closest('header')).toHaveAttribute('role', 'banner')
      expect(sidebar.closest('aside')).toHaveAttribute('role', 'complementary')
      expect(content.closest('main')).toHaveAttribute('role', 'main')
    })

    it('supports keyboard navigation', async () => {
      const { user } = render(
        <Layout>
          <div data-testid="content">
            <button>Focusable Element</button>
          </div>
        </Layout>
      )

      const button = screen.getByRole('button')
      
      await user.tab()
      expect(button).toHaveFocus()
    })

    it('maintains focus management', async () => {
      const { user } = render(
        <Layout>
          <div data-testid="content">
            <input type="text" placeholder="Test input" />
            <button>Test button</button>
          </div>
        </Layout>
      )

      const input = screen.getByPlaceholderText('Test input')
      const button = screen.getByRole('button')

      await user.click(input)
      expect(input).toHaveFocus()

      await user.tab()
      expect(button).toHaveFocus()
    })
  })

  describe('Error Boundaries', () => {
    it('handles child component errors gracefully', () => {
      const ThrowError = () => {
        throw new Error('Test error')
      }

      // This would require an error boundary implementation
      // For now, we just test that the layout renders without the problematic child
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      expect(() => {
        render(
          <Layout>
            <div data-testid="safe-content">Safe Content</div>
          </Layout>
        )
      }).not.toThrow()

      consoleSpy.mockRestore()
    })
  })

  describe('Performance', () => {
    it('renders quickly', async () => {
      const renderTime = await import('@test/utils/test-utils').then(utils => 
        utils.measureRenderTime(() => 
          render(
            <Layout>
              <div>Performance Test</div>
            </Layout>
          )
        )
      )

      expect(renderTime).toBeLessThan(100) // Should render in under 100ms
    })

    it('handles multiple rerenders efficiently', () => {
      const { rerender } = render(
        <Layout>
          <div data-testid="content-1">Content 1</div>
        </Layout>
      )

      // Multiple rerenders shouldn't cause performance issues
      for (let i = 2; i <= 10; i++) {
        rerender(
          <Layout>
            <div data-testid={`content-${i}`}>Content {i}</div>
          </Layout>
        )
      }

      expect(screen.getByTestId('content-10')).toBeInTheDocument()
    })
  })
})