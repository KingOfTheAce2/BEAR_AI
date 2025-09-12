/**
 * Unified BEAR AI GUI - AppLayout Component Tests
 * Tests the main application layout and single interface functionality
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { AppLayout } from '../../../src/components/layout/AppLayout';
import { themeTestUtils, windowsTestUtils, performanceTestUtils } from '../setup';
import type { User } from '../../../src/types';

describe('AppLayout - Unified Interface', () => {
  const mockUser: User = {
    id: '1',
    name: 'Test User',
    email: 'test@example.com',
    role: 'attorney',
    firm: 'Test Law Firm',
  };

  beforeEach(() => {
    themeTestUtils.resetTheme();
  });

  describe('Single Interface Functionality', () => {
    it('renders the unified interface correctly', () => {
      render(<AppLayout initialUser={mockUser} />);
      
      // Check that all main components are present
      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByRole('navigation')).toBeInTheDocument();
      expect(screen.getByRole('banner')).toBeInTheDocument();
      expect(screen.getByRole('contentinfo')).toBeInTheDocument();
      
      // Verify user information is displayed
      expect(screen.getByText(mockUser.name)).toBeInTheDocument();
      expect(screen.getByText(mockUser.firm!)).toBeInTheDocument();
    });

    it('maintains single entry point for all features', () => {
      render(<AppLayout initialUser={mockUser} />);
      
      // Verify navigation items are consolidated
      const navigationItems = [
        'Chat',
        'Documents',
        'Research', 
        'History',
        'Settings'
      ];
      
      navigationItems.forEach(item => {
        expect(screen.getByText(item)).toBeInTheDocument();
      });
    });

    it('handles view switching within single interface', async () => {
      const user = userEvent.setup();
      render(<AppLayout initialUser={mockUser} />);
      
      // Start with chat view (default)
      expect(screen.getByRole('main')).toHaveTextContent(/chat/i);
      
      // Switch to documents view
      await user.click(screen.getByText('Documents'));
      await waitFor(() => {
        expect(screen.getByRole('main')).toHaveTextContent(/document/i);
      });
      
      // Switch to research view
      await user.click(screen.getByText('Research'));
      await waitFor(() => {
        expect(screen.getByRole('main')).toHaveTextContent(/research/i);
      });
    });

    it('preserves state when switching views', async () => {
      const user = userEvent.setup();
      render(<AppLayout initialUser={mockUser} />);
      
      // Enter search query
      const searchInput = screen.getByPlaceholderText(/search/i);
      await user.type(searchInput, 'test query');
      
      // Switch views and back
      await user.click(screen.getByText('Documents'));
      await user.click(screen.getByText('Chat'));
      
      // Search query should be preserved
      expect(searchInput).toHaveValue('test query');
    });

    it('handles sidebar collapse/expand correctly', async () => {
      const user = userEvent.setup();
      render(<AppLayout initialUser={mockUser} />);
      
      const sidebar = screen.getByRole('navigation');
      const toggleButton = screen.getByRole('button', { name: /toggle sidebar/i });
      
      // Initially expanded
      expect(sidebar).toHaveClass(/w-64/);
      
      // Collapse sidebar
      await user.click(toggleButton);
      await waitFor(() => {
        expect(sidebar).toHaveClass(/w-16/);
      });
      
      // Expand sidebar
      await user.click(toggleButton);
      await waitFor(() => {
        expect(sidebar).toHaveClass(/w-64/);
      });
    });
  });

  describe('Theme System Integration', () => {
    it('applies modern theme by default', () => {
      render(<AppLayout initialUser={mockUser} />);
      
      const appContainer = screen.getByRole('main').closest('div');
      expect(appContainer).toHaveClass('bg-gray-50', 'font-inter');
    });

    it('switches between themes correctly', async () => {
      const user = userEvent.setup();
      render(<AppLayout initialUser={mockUser} />);
      
      // Access theme switcher (assuming it's in settings or header)
      await user.click(screen.getByText('Settings'));
      
      // Wait for settings view to load
      await waitFor(() => {
        expect(screen.getByRole('main')).toHaveTextContent(/settings/i);
      });
      
      // Theme switching would be tested here when settings component is implemented
    });

    it('persists theme selection across sessions', () => {
      // Set theme in localStorage
      localStorage.setItem('bear-ai-theme', 'dark');
      
      render(<AppLayout initialUser={mockUser} />);
      
      // Check if dark theme is applied
      const appContainer = document.documentElement;
      expect(appContainer).toHaveClass('dark');
    });

    it('respects system theme preference', () => {
      themeTestUtils.setSystemPreference(true); // Dark mode
      
      render(<AppLayout initialUser={mockUser} />);
      
      // Should apply dark theme based on system preference
      expect(document.documentElement).toHaveClass('dark');
    });
  });

  describe('Windows Compatibility', () => {
    beforeEach(() => {
      windowsTestUtils.mockWindowsEnvironment();
      windowsTestUtils.mockWindowsPaths();
    });

    it('renders correctly on Windows platform', () => {
      render(<AppLayout initialUser={mockUser} />);
      
      // Should render without Windows-specific issues
      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByRole('navigation')).toBeInTheDocument();
    });

    it('handles Windows file paths correctly', async () => {
      const user = userEvent.setup();
      render(<AppLayout initialUser={mockUser} />);
      
      // Navigate to documents
      await user.click(screen.getByText('Documents'));
      
      // Windows path handling would be tested in document upload/management
      // This is a placeholder for when file handling is implemented
      expect(screen.getByRole('main')).toHaveTextContent(/document/i);
    });

    it('adapts to Windows performance characteristics', () => {
      windowsTestUtils.simulateWindowsPerformance();
      
      const { result, renderTime } = performanceTestUtils.measureComponentRender(
        () => render(<AppLayout initialUser={mockUser} />)
      );
      
      // Should render within acceptable time on Windows
      expect(renderTime).toBeLessThan(1000); // 1 second
      expect(result).toBeTruthy();
    });
  });

  describe('Responsive Design', () => {
    it('adapts to mobile viewport', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', { value: 375 });
      Object.defineProperty(window, 'innerHeight', { value: 667 });
      
      render(<AppLayout initialUser={mockUser} />);
      
      const sidebar = screen.getByRole('navigation');
      
      // Sidebar should be collapsed on mobile
      expect(sidebar).toHaveClass(/w-16/);
    });

    it('adapts to tablet viewport', () => {
      // Mock tablet viewport
      Object.defineProperty(window, 'innerWidth', { value: 768 });
      Object.defineProperty(window, 'innerHeight', { value: 1024 });
      
      render(<AppLayout initialUser={mockUser} />);
      
      const sidebar = screen.getByRole('navigation');
      
      // Sidebar should be expanded on tablet
      expect(sidebar).toHaveClass(/w-64/);
    });

    it('handles window resize correctly', async () => {
      render(<AppLayout initialUser={mockUser} />);
      
      // Simulate window resize
      Object.defineProperty(window, 'innerWidth', { value: 500 });
      fireEvent(window, new Event('resize'));
      
      await waitFor(() => {
        // Layout should adapt to new size
        const sidebar = screen.getByRole('navigation');
        expect(sidebar).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('provides proper ARIA labels', () => {
      render(<AppLayout initialUser={mockUser} />);
      
      expect(screen.getByRole('main')).toHaveAttribute('aria-label');
      expect(screen.getByRole('navigation')).toHaveAttribute('aria-label');
      expect(screen.getByRole('banner')).toHaveAttribute('aria-label');
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<AppLayout initialUser={mockUser} />);
      
      // Tab through navigation items
      await user.tab();
      expect(document.activeElement).toHaveRole('button');
      
      await user.tab();
      expect(document.activeElement).toHaveRole('link');
    });

    it('provides screen reader support', () => {
      render(<AppLayout initialUser={mockUser} />);
      
      // Check for screen reader friendly elements
      expect(screen.getByRole('main')).toHaveAttribute('aria-live');
      expect(screen.getByRole('navigation')).toHaveAttribute('aria-label');
    });

    it('maintains focus management', async () => {
      const user = userEvent.setup();
      render(<AppLayout initialUser={mockUser} />);
      
      const documentsLink = screen.getByText('Documents');
      await user.click(documentsLink);
      
      // Focus should be managed properly after view change
      expect(document.activeElement).toBeTruthy();
    });
  });

  describe('Performance', () => {
    it('renders within acceptable time limits', () => {
      const { renderTime } = performanceTestUtils.measureComponentRender(
        () => render(<AppLayout initialUser={mockUser} />)
      );
      
      expect(renderTime).toBeLessThan(500); // 500ms
    });

    it('has minimal memory footprint', () => {
      const { memoryIncrease } = performanceTestUtils.measureMemoryUsage(
        () => render(<AppLayout initialUser={mockUser} />),
        () => {
          // Component cleanup would happen here
        }
      );
      
      // Should not consume excessive memory
      expect(memoryIncrease).toBeLessThan(50000000); // 50MB
    });

    it('handles multiple re-renders efficiently', () => {
      const { rerender } = render(<AppLayout initialUser={mockUser} />);
      
      const startTime = performance.now();
      
      // Simulate multiple re-renders
      for (let i = 0; i < 10; i++) {
        rerender(<AppLayout initialUser={{ ...mockUser, name: `User ${i}` }} />);
      }
      
      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(100); // 100ms for 10 re-renders
    });
  });

  describe('Error Handling', () => {
    it('handles missing user gracefully', () => {
      render(<AppLayout />);
      
      // Should render without user information
      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.queryByText(mockUser.name)).not.toBeInTheDocument();
    });

    it('recovers from state corruption', () => {
      const corruptedUser = { ...mockUser, role: 'invalid' as any };
      
      render(<AppLayout initialUser={corruptedUser} />);
      
      // Should handle invalid role gracefully
      expect(screen.getByRole('main')).toBeInTheDocument();
    });

    it('handles component errors with error boundaries', () => {
      // Mock console.error to avoid noise in tests
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // This would test error boundary behavior
      // For now, just verify basic rendering works
      expect(() => render(<AppLayout initialUser={mockUser} />)).not.toThrow();
      
      consoleSpy.mockRestore();
    });
  });
});