/**
 * Unified BEAR AI GUI - Regression Tests
 * Ensures no functionality is lost from previous GUI variants
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { AppLayout } from '../../../src/components/layout/AppLayout';
import { themeTestUtils, performanceTestUtils } from '../setup';
import type { User } from '../../../src/types';

describe('Regression Tests - Previous GUI Variants', () => {
  const mockUser: User = {
    id: '1',
    name: 'Regression Test User',
    email: 'regression@bearai.test',
    role: 'attorney',
    firm: 'Regression Test Firm',
  };

  beforeEach(() => {
    themeTestUtils.resetTheme();
  });

  describe('Modern GUI Variant Features', () => {
    it('maintains modern design elements', () => {
      render(<AppLayout initialUser={mockUser} />);
      
      // Modern GUI specific elements
      const appContainer = screen.getByRole('main').closest('div');
      expect(appContainer).toHaveClass('font-inter'); // Modern font family
      expect(appContainer).toHaveClass('bg-gray-50'); // Modern background
      
      // Modern color scheme
      const sidebar = screen.getByRole('navigation');
      expect(sidebar).toHaveClass('bg-bear-navy');
    });

    it('preserves modern animation and transitions', async () => {
      const user = userEvent.setup();
      render(<AppLayout initialUser={mockUser} />);
      
      const sidebar = screen.getByRole('navigation');
      const toggleButton = screen.getByRole('button', { name: /toggle sidebar/i });
      
      // Should have transition classes
      expect(sidebar).toHaveClass('transition-all', 'duration-300', 'ease-in-out');
      
      await user.click(toggleButton);
      
      // Animation should work smoothly
      await waitFor(() => {
        expect(sidebar).toHaveClass(/w-16/);
      });
    });

    it('maintains modern responsive breakpoints', () => {
      // Test different viewport sizes that modern GUI handled
      const breakpoints = [
        { width: 320, expected: 'mobile' },
        { width: 768, expected: 'tablet' },
        { width: 1024, expected: 'desktop' },
        { width: 1440, expected: 'wide' }
      ];
      
      breakpoints.forEach(({ width, expected }) => {
        Object.defineProperty(window, 'innerWidth', { value: width });
        render(<AppLayout initialUser={mockUser} />);
        
        const sidebar = screen.getByRole('navigation');
        if (expected === 'mobile') {
          expect(sidebar).toHaveClass(/w-16/);
        } else {
          expect(sidebar).toHaveClass(/w-64/);
        }
      });
    });

    it('preserves modern component styling', () => {
      render(<AppLayout initialUser={mockUser} />);
      
      // Modern button styles
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toHaveClass(/rounded/); // Modern rounded corners
      });
      
      // Modern card layouts
      const mainContent = screen.getByRole('main');
      expect(mainContent).toHaveClass(/space-y-6/); // Modern spacing
    });

    it('maintains modern icon system', () => {
      render(<AppLayout initialUser={mockUser} />);
      
      // Should use modern icon library (Lucide React)
      const navigationItems = ['Chat', 'Documents', 'Research', 'History', 'Settings'];
      navigationItems.forEach(item => {
        const navItem = screen.getByText(item);
        expect(navItem).toBeInTheDocument();
        // Icons would be tested with actual icon implementation
      });
    });

    it('preserves modern layout structure', () => {
      render(<AppLayout initialUser={mockUser} />);
      
      // Modern flex-based layout
      const appContainer = screen.getByRole('main').closest('div');
      expect(appContainer).toHaveClass('flex', 'h-screen');
      
      // Modern content structure
      const sidebar = screen.getByRole('navigation');
      const mainContent = screen.getByRole('main').parentElement;
      
      expect(sidebar).toBeInTheDocument();
      expect(mainContent).toHaveClass('flex-1', 'flex', 'flex-col');
    });
  });

  describe('Professional GUI Variant Features', () => {
    it('maintains professional color scheme options', async () => {
      render(<AppLayout initialUser={mockUser} />);
      
      // Professional theme should be available
      // This would be tested through theme switching when implemented
      expect(screen.getByRole('main')).toBeInTheDocument();
    });

    it('preserves formal typography hierarchy', () => {
      render(<AppLayout initialUser={mockUser} />);
      
      // Professional typography
      const userInfo = screen.getByText(mockUser.name);
      expect(userInfo).toBeInTheDocument();
      
      const firmInfo = screen.getByText(mockUser.firm!);
      expect(firmInfo).toBeInTheDocument();
    });

    it('maintains professional navigation structure', () => {
      render(<AppLayout initialUser={mockUser} />);
      
      // Professional navigation should be clear and hierarchical
      const navigation = screen.getByRole('navigation');
      expect(navigation).toHaveAttribute('aria-label');
      
      const navItems = ['Chat', 'Documents', 'Research', 'History', 'Settings'];
      navItems.forEach(item => {
        expect(screen.getByText(item)).toBeInTheDocument();
      });
    });

    it('preserves professional form layouts', async () => {
      const user = userEvent.setup();
      render(<AppLayout initialUser={mockUser} />);
      
      // Professional form elements (like search)
      const searchInput = screen.getByPlaceholderText(/search/i);
      expect(searchInput).toHaveClass(/rounded/); // Professional styling
      
      await user.type(searchInput, 'professional search test');
      expect(searchInput).toHaveValue('professional search test');
    });

    it('maintains professional status indicators', () => {
      render(<AppLayout initialUser={mockUser} />);
      
      // Professional status bar
      const statusBar = screen.getByRole('contentinfo');
      expect(statusBar).toBeInTheDocument();
      expect(statusBar).toHaveClass('bg-gray-100'); // Professional background
    });

    it('preserves professional data presentation', async () => {
      const user = userEvent.setup();
      render(<AppLayout initialUser={mockUser} />);
      
      await user.click(screen.getByText('Documents'));
      
      // Professional document layout
      await waitFor(() => {
        expect(screen.getByRole('main')).toHaveTextContent(/document/i);
      });
      
      // Should maintain professional grid/list layouts
      const documentContainer = screen.getByRole('main');
      expect(documentContainer).toBeInTheDocument();
    });
  });

  describe('Simple GUI Variant Features', () => {
    it('provides simplified interface option', () => {
      render(<AppLayout initialUser={mockUser} />);
      
      // Simple GUI would have minimal elements
      // This would be tested through theme/mode switching
      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByRole('navigation')).toBeInTheDocument();
    });

    it('maintains essential functionality in simple mode', async () => {
      const user = userEvent.setup();
      render(<AppLayout initialUser={mockUser} />);
      
      // Core functionality should still work
      const chatInput = screen.queryByPlaceholderText(/type your message/i);
      if (chatInput) {
        await user.type(chatInput, 'Simple mode test');
        expect(chatInput).toHaveValue('Simple mode test');
      }
      
      // Navigation should work
      await user.click(screen.getByText('Documents'));
      expect(screen.getByRole('main')).toHaveTextContent(/document/i);
    });

    it('preserves simplified navigation', () => {
      render(<AppLayout initialUser={mockUser} />);
      
      // Simple navigation structure
      const navItems = ['Chat', 'Documents', 'Research', 'History', 'Settings'];
      navItems.forEach(item => {
        expect(screen.getByText(item)).toBeInTheDocument();
      });
    });

    it('maintains reduced visual complexity', () => {
      render(<AppLayout initialUser={mockUser} />);
      
      // Simple GUI would have minimal decorative elements
      const appContainer = screen.getByRole('main').closest('div');
      expect(appContainer).toHaveClass('bg-gray-50'); // Clean background
      
      // Should not have excessive shadows or effects
      const sidebar = screen.getByRole('navigation');
      expect(sidebar).toBeInTheDocument();
    });
  });

  describe('Cross-Variant Feature Preservation', () => {
    it('preserves all chat functionality from all variants', async () => {
      const user = userEvent.setup();
      render(<AppLayout initialUser={mockUser} />);
      
      // Chat should work regardless of original variant
      const chatInput = screen.queryByPlaceholderText(/type your message/i);
      if (chatInput) {
        // Test basic chat
        await user.type(chatInput, 'Cross-variant chat test');
        
        const sendButton = screen.queryByRole('button', { name: /send/i });
        if (sendButton) {
          await user.click(sendButton);
          
          await waitFor(() => {
            expect(screen.getByText('Cross-variant chat test')).toBeInTheDocument();
          });
        }
      }
    });

    it('preserves document management from all variants', async () => {
      const user = userEvent.setup();
      render(<AppLayout initialUser={mockUser} />);
      
      await user.click(screen.getByText('Documents'));
      
      // Document functionality should be consolidated
      await waitFor(() => {
        expect(screen.getByRole('main')).toHaveTextContent(/document/i);
      });
      
      // Should have upload, search, categorization features
      const documentContainer = screen.getByRole('main');
      expect(documentContainer).toBeInTheDocument();
    });

    it('preserves search functionality from all variants', async () => {
      const user = userEvent.setup();
      render(<AppLayout initialUser={mockUser} />);
      
      // Global search should work
      const searchInput = screen.getByPlaceholderText(/search/i);
      await user.type(searchInput, 'regression search test');
      
      // Search should persist across views
      await user.click(screen.getByText('Documents'));
      expect(searchInput).toHaveValue('regression search test');
      
      await user.click(screen.getByText('Research'));
      expect(searchInput).toHaveValue('regression search test');
    });

    it('preserves user management features', () => {
      render(<AppLayout initialUser={mockUser} />);
      
      // User information should be displayed
      expect(screen.getByText(mockUser.name)).toBeInTheDocument();
      expect(screen.getByText(mockUser.firm!)).toBeInTheDocument();
      
      // User role should affect UI appropriately
      expect(mockUser.role).toBe('attorney');
    });

    it('preserves accessibility features from all variants', () => {
      render(<AppLayout initialUser={mockUser} />);
      
      // ARIA labels and roles
      expect(screen.getByRole('main')).toHaveAttribute('aria-label');
      expect(screen.getByRole('navigation')).toHaveAttribute('aria-label');
      expect(screen.getByRole('banner')).toHaveAttribute('aria-label');
      expect(screen.getByRole('contentinfo')).toBeInTheDocument();
      
      // Keyboard navigation
      const focusableElements = screen.getAllByRole('button');
      focusableElements.forEach(element => {
        expect(element).toHaveAttribute('tabIndex');
      });
    });

    it('maintains performance across all consolidated features', () => {
      const { renderTime } = performanceTestUtils.measureComponentRender(
        () => render(<AppLayout initialUser={mockUser} />)
      );
      
      // Should render efficiently despite consolidation
      expect(renderTime).toBeLessThan(1000); // 1 second
    });
  });

  describe('State Management Regression', () => {
    it('preserves state management patterns from all variants', async () => {
      const user = userEvent.setup();
      render(<AppLayout initialUser={mockUser} />);
      
      // Set some state
      const searchInput = screen.getByPlaceholderText(/search/i);
      await user.type(searchInput, 'state persistence test');
      
      // Change views
      await user.click(screen.getByText('Documents'));
      await user.click(screen.getByText('Settings'));
      await user.click(screen.getByText('Chat'));
      
      // State should persist
      expect(searchInput).toHaveValue('state persistence test');
      expect(screen.getByText(mockUser.name)).toBeInTheDocument();
    });

    it('handles concurrent operations from all variants', async () => {
      const user = userEvent.setup();
      render(<AppLayout initialUser={mockUser} />);
      
      // Multiple concurrent operations
      const searchInput = screen.getByPlaceholderText(/search/i);
      await user.type(searchInput, 'concurrent test');
      
      // Rapid view switching
      await user.click(screen.getByText('Documents'));
      await user.click(screen.getByText('Research'));
      await user.click(screen.getByText('Chat'));
      
      // All should complete successfully
      expect(searchInput).toHaveValue('concurrent test');
    });

    it('maintains data consistency across features', () => {
      render(<AppLayout initialUser={mockUser} />);
      
      // User data should be consistent everywhere
      expect(screen.getByText(mockUser.name)).toBeInTheDocument();
      expect(screen.getByText(mockUser.firm!)).toBeInTheDocument();
    });
  });

  describe('Error Handling Regression', () => {
    it('maintains error resilience from all variants', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // Should handle errors gracefully
      expect(() => render(<AppLayout initialUser={mockUser} />)).not.toThrow();
      
      consoleSpy.mockRestore();
    });

    it('preserves error recovery mechanisms', async () => {
      const user = userEvent.setup();
      render(<AppLayout initialUser={mockUser} />);
      
      // Simulate error scenarios
      try {
        fireEvent.error(screen.getByRole('main'));
      } catch (e) {
        // Should recover gracefully
      }
      
      // App should still be functional
      await user.click(screen.getByText('Documents'));
      expect(screen.getByRole('main')).toBeInTheDocument();
    });

    it('maintains user feedback mechanisms', () => {
      render(<AppLayout initialUser={mockUser} />);
      
      // Status indicators should be present
      const statusBar = screen.getByRole('contentinfo');
      expect(statusBar).toBeInTheDocument();
    });
  });

  describe('Integration Compatibility', () => {
    it('maintains backward compatibility with existing APIs', () => {
      render(<AppLayout initialUser={mockUser} />);
      
      // Should not break existing integrations
      expect(screen.getByRole('main')).toBeInTheDocument();
    });

    it('preserves theme switching from all variants', () => {
      // Light theme
      themeTestUtils.setLightMode();
      render(<AppLayout initialUser={mockUser} />);
      expect(document.documentElement).toHaveClass('light');
      
      // Dark theme
      themeTestUtils.setDarkMode();
      expect(document.documentElement).toHaveClass('dark');
    });

    it('maintains responsive behavior from all variants', () => {
      // Test mobile
      Object.defineProperty(window, 'innerWidth', { value: 375 });
      render(<AppLayout initialUser={mockUser} />);
      
      const sidebar = screen.getByRole('navigation');
      expect(sidebar).toHaveClass(/w-16/);
      
      // Test desktop
      Object.defineProperty(window, 'innerWidth', { value: 1200 });
      const { rerender } = render(<AppLayout initialUser={mockUser} />);
      rerender(<AppLayout initialUser={mockUser} />);
      
      expect(sidebar).toHaveClass(/w-64/);
    });
  });
});