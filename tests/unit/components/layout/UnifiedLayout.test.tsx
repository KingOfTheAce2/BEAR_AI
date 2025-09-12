import React from 'react';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../../../utils/testUtils';
import UnifiedLayout from '../../../../src/components/layout/UnifiedLayout';

// Mock child components
jest.mock('../../../../src/components/layout/UnifiedTopBar', () => {
  return function MockUnifiedTopBar() {
    return <div data-testid="unified-topbar">TopBar</div>;
  };
});

jest.mock('../../../../src/components/layout/UnifiedSidebar', () => {
  return function MockUnifiedSidebar({ isCollapsed, onToggle }: any) {
    return (
      <div data-testid="unified-sidebar" data-collapsed={isCollapsed}>
        <button onClick={onToggle} data-testid="sidebar-toggle">
          Toggle
        </button>
      </div>
    );
  };
});

jest.mock('../../../../src/components/layout/UnifiedStatusBar', () => {
  return function MockUnifiedStatusBar() {
    return <div data-testid="unified-statusbar">StatusBar</div>;
  };
});

describe('UnifiedLayout Component', () => {
  const mockChildren = <div data-testid="main-content">Main Content</div>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all layout components', () => {
    renderWithProviders(<UnifiedLayout>{mockChildren}</UnifiedLayout>);

    expect(screen.getByTestId('unified-topbar')).toBeInTheDocument();
    expect(screen.getByTestId('unified-sidebar')).toBeInTheDocument();
    expect(screen.getByTestId('unified-statusbar')).toBeInTheDocument();
    expect(screen.getByTestId('main-content')).toBeInTheDocument();
  });

  it('toggles sidebar collapse state', async () => {
    const user = (await import('@testing-library/user-event')).default.setup();
    renderWithProviders(<UnifiedLayout>{mockChildren}</UnifiedLayout>);

    const sidebar = screen.getByTestId('unified-sidebar');
    const toggleButton = screen.getByTestId('sidebar-toggle');

    // Initially not collapsed
    expect(sidebar).toHaveAttribute('data-collapsed', 'false');

    // Click to collapse
    await user.click(toggleButton);
    expect(sidebar).toHaveAttribute('data-collapsed', 'true');

    // Click to expand
    await user.click(toggleButton);
    expect(sidebar).toHaveAttribute('data-collapsed', 'false');
  });

  it('applies correct CSS classes for layout structure', () => {
    const { container } = renderWithProviders(
      <UnifiedLayout>{mockChildren}</UnifiedLayout>
    );

    const layoutContainer = container.firstChild as HTMLElement;
    expect(layoutContainer).toHaveClass('flex', 'flex-col', 'h-screen');
  });

  it('handles responsive design breakpoints', () => {
    // Mock window resize
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 768,
    });

    renderWithProviders(<UnifiedLayout>{mockChildren}</UnifiedLayout>);

    // Trigger resize event
    fireEvent(window, new Event('resize'));

    expect(screen.getByTestId('unified-sidebar')).toBeInTheDocument();
  });

  it('preserves sidebar state across re-renders', async () => {
    const user = (await import('@testing-library/user-event')).default.setup();
    const { rerender } = renderWithProviders(
      <UnifiedLayout>{mockChildren}</UnifiedLayout>
    );

    const toggleButton = screen.getByTestId('sidebar-toggle');
    
    // Collapse sidebar
    await user.click(toggleButton);
    expect(screen.getByTestId('unified-sidebar')).toHaveAttribute('data-collapsed', 'true');

    // Re-render with new children
    rerender(
      <UnifiedLayout>
        <div data-testid="new-content">New Content</div>
      </UnifiedLayout>
    );

    // Sidebar should remain collapsed
    expect(screen.getByTestId('unified-sidebar')).toHaveAttribute('data-collapsed', 'true');
    expect(screen.getByTestId('new-content')).toBeInTheDocument();
  });

  it('handles keyboard navigation for accessibility', async () => {
    const user = (await import('@testing-library/user-event')).default.setup();
    renderWithProviders(<UnifiedLayout>{mockChildren}</UnifiedLayout>);

    const toggleButton = screen.getByTestId('sidebar-toggle');

    // Focus and activate with keyboard
    toggleButton.focus();
    expect(toggleButton).toHaveFocus();

    await user.keyboard('{Enter}');
    expect(screen.getByTestId('unified-sidebar')).toHaveAttribute('data-collapsed', 'true');
  });

  it('supports theme context integration', () => {
    renderWithProviders(<UnifiedLayout>{mockChildren}</UnifiedLayout>);

    // Verify layout receives theme context
    expect(screen.getByTestId('unified-topbar')).toBeInTheDocument();
    expect(screen.getByTestId('unified-sidebar')).toBeInTheDocument();
    expect(screen.getByTestId('unified-statusbar')).toBeInTheDocument();
  });

  it('handles loading states gracefully', () => {
    const LoadingContent = () => (
      <div data-testid="loading-content">Loading...</div>
    );

    renderWithProviders(<UnifiedLayout><LoadingContent /></UnifiedLayout>);

    expect(screen.getByTestId('loading-content')).toBeInTheDocument();
    expect(screen.getByTestId('unified-layout-container')).toBeInTheDocument();
  });

  it('maintains proper semantic HTML structure', () => {
    const { container } = renderWithProviders(
      <UnifiedLayout>{mockChildren}</UnifiedLayout>
    );

    // Check for proper semantic elements
    expect(container.querySelector('header')).toBeTruthy();
    expect(container.querySelector('aside')).toBeTruthy();
    expect(container.querySelector('main')).toBeTruthy();
    expect(container.querySelector('footer')).toBeTruthy();
  });

  it('handles error states in child components', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    const ErrorComponent = () => {
      throw new Error('Child component error');
    };

    expect(() => {
      renderWithProviders(
        <UnifiedLayout>
          <ErrorComponent />
        </UnifiedLayout>
      );
    }).not.toThrow();

    consoleError.mockRestore();
  });
});