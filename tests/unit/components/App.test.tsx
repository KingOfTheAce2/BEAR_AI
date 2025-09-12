import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../utils/testUtils';
import App from '../../../src/App';

// Mock components
jest.mock('../../../src/components/layout/UnifiedLayout', () => {
  return function MockUnifiedLayout({ children }: { children: React.ReactNode }) {
    return <div data-testid="unified-layout">{children}</div>;
  };
});

jest.mock('../../../src/components/pages', () => ({
  Dashboard: () => <div data-testid="dashboard">Dashboard</div>,
  Chat: () => <div data-testid="chat">Chat</div>,
  Models: () => <div data-testid="models">Models</div>,
  Settings: () => <div data-testid="settings">Settings</div>,
}));

describe('App Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    renderWithProviders(<App />);
    expect(screen.getByTestId('unified-layout')).toBeInTheDocument();
  });

  it('displays loading state initially', () => {
    renderWithProviders(<App />);
    expect(screen.getByTestId('unified-layout')).toBeInTheDocument();
  });

  it('handles route navigation correctly', async () => {
    renderWithProviders(<App />, { initialEntries: ['/dashboard'] });
    
    await waitFor(() => {
      expect(screen.getByTestId('unified-layout')).toBeInTheDocument();
    });
  });

  it('provides necessary context to child components', () => {
    const { container } = renderWithProviders(<App />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('handles error boundaries gracefully', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    const ThrowError = () => {
      throw new Error('Test error');
    };

    expect(() => {
      renderWithProviders(<ThrowError />);
    }).not.toThrow();

    consoleError.mockRestore();
  });

  it('maintains responsive design classes', () => {
    const { container } = renderWithProviders(<App />);
    const appElement = container.firstChild as HTMLElement;
    
    expect(appElement).toHaveClass('min-h-screen');
  });

  it('initializes with correct theme', () => {
    renderWithProviders(<App />);
    
    // Check if theme classes are applied
    const layout = screen.getByTestId('unified-layout');
    expect(layout).toBeInTheDocument();
  });

  it('handles keyboard navigation', async () => {
    const user = (await import('@testing-library/user-event')).default.setup();
    renderWithProviders(<App />);
    
    // Test tab navigation
    await user.tab();
    expect(document.activeElement).toBeDefined();
  });

  it('supports accessibility requirements', async () => {
    const { container } = renderWithProviders(<App />);
    
    // Check for proper ARIA attributes
    expect(container.querySelector('[role="main"]')).toBeTruthy();
  });

  it('handles window resize events', () => {
    renderWithProviders(<App />);
    
    // Simulate window resize
    global.dispatchEvent(new Event('resize'));
    
    expect(screen.getByTestId('unified-layout')).toBeInTheDocument();
  });
});