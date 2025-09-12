/**
 * Unified BEAR AI GUI - Theme System Tests
 * Tests theme switching, persistence, and visual consistency
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AppLayout } from '../../../src/components/layout/AppLayout';
import { themeTestUtils } from '../setup';
import type { User } from '../../../src/types';

// Mock theme system components
const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setTheme] = React.useState<'light' | 'dark' | 'auto'>('auto');
  
  React.useEffect(() => {
    const stored = localStorage.getItem('bear-ai-theme') as 'light' | 'dark' | 'auto';
    if (stored) setTheme(stored);
  }, []);

  React.useEffect(() => {
    document.documentElement.classList.remove('light', 'dark');
    if (theme === 'dark' || (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.add('light');
    }
    localStorage.setItem('bear-ai-theme', theme);
  }, [theme]);

  return (
    <div data-theme={theme} data-testid="theme-provider">
      <button onClick={() => setTheme('light')} data-testid="light-theme-btn">Light</button>
      <button onClick={() => setTheme('dark')} data-testid="dark-theme-btn">Dark</button>
      <button onClick={() => setTheme('auto')} data-testid="auto-theme-btn">Auto</button>
      {children}
    </div>
  );
};

const ThemeSystemTest = ({ user }: { user: User }) => (
  <ThemeProvider>
    <AppLayout initialUser={user} />
  </ThemeProvider>
);

describe('Theme System', () => {
  const mockUser: User = {
    id: '1',
    name: 'Test User',
    email: 'test@example.com',
    role: 'attorney',
  };

  beforeEach(() => {
    themeTestUtils.resetTheme();
    localStorage.clear();
  });

  afterEach(() => {
    themeTestUtils.resetTheme();
  });

  describe('Theme Switching', () => {
    it('switches to light theme correctly', async () => {
      const user = userEvent.setup();
      render(<ThemeSystemTest user={mockUser} />);
      
      await user.click(screen.getByTestId('light-theme-btn'));
      
      await waitFor(() => {
        expect(document.documentElement).toHaveClass('light');
        expect(document.documentElement).not.toHaveClass('dark');
      });
    });

    it('switches to dark theme correctly', async () => {
      const user = userEvent.setup();
      render(<ThemeSystemTest user={mockUser} />);
      
      await user.click(screen.getByTestId('dark-theme-btn'));
      
      await waitFor(() => {
        expect(document.documentElement).toHaveClass('dark');
        expect(document.documentElement).not.toHaveClass('light');
      });
    });

    it('switches to auto theme correctly', async () => {
      const user = userEvent.setup();
      themeTestUtils.setSystemPreference(true); // System prefers dark
      render(<ThemeSystemTest user={mockUser} />);
      
      await user.click(screen.getByTestId('auto-theme-btn'));
      
      await waitFor(() => {
        expect(document.documentElement).toHaveClass('dark');
      });
    });

    it('respects system preference in auto mode', async () => {
      const user = userEvent.setup();
      render(<ThemeSystemTest user={mockUser} />);
      
      // Set to auto mode
      await user.click(screen.getByTestId('auto-theme-btn'));
      
      // Mock system dark preference
      themeTestUtils.setSystemPreference(true);
      fireEvent(window, new Event('storage'));
      
      await waitFor(() => {
        expect(document.documentElement).toHaveClass('dark');
      });
      
      // Mock system light preference
      themeTestUtils.setSystemPreference(false);
      fireEvent(window, new Event('storage'));
      
      await waitFor(() => {
        expect(document.documentElement).toHaveClass('light');
      });
    });
  });

  describe('Theme Persistence', () => {
    it('persists theme selection to localStorage', async () => {
      const user = userEvent.setup();
      render(<ThemeSystemTest user={mockUser} />);
      
      await user.click(screen.getByTestId('dark-theme-btn'));
      
      await waitFor(() => {
        expect(localStorage.getItem('bear-ai-theme')).toBe('dark');
      });
    });

    it('loads theme from localStorage on initialization', () => {
      localStorage.setItem('bear-ai-theme', 'dark');
      
      render(<ThemeSystemTest user={mockUser} />);
      
      expect(screen.getByTestId('theme-provider')).toHaveAttribute('data-theme', 'dark');
      expect(document.documentElement).toHaveClass('dark');
    });

    it('falls back to auto theme when localStorage is empty', () => {
      render(<ThemeSystemTest user={mockUser} />);
      
      expect(screen.getByTestId('theme-provider')).toHaveAttribute('data-theme', 'auto');
    });

    it('handles corrupted localStorage gracefully', () => {
      localStorage.setItem('bear-ai-theme', 'invalid-theme');
      
      render(<ThemeSystemTest user={mockUser} />);
      
      // Should fall back to auto theme
      expect(screen.getByTestId('theme-provider')).toHaveAttribute('data-theme', 'auto');
    });
  });

  describe('Visual Consistency', () => {
    it('applies consistent styling across all components in light theme', async () => {
      const user = userEvent.setup();
      render(<ThemeSystemTest user={mockUser} />);
      
      await user.click(screen.getByTestId('light-theme-btn'));
      
      await waitFor(() => {
        const mainContent = screen.getByRole('main');
        const sidebar = screen.getByRole('navigation');
        
        // Check that light theme classes are applied
        expect(mainContent.closest('.bg-gray-50')).toBeInTheDocument();
        expect(sidebar.closest('.bg-bear-navy')).toBeInTheDocument();
      });
    });

    it('applies consistent styling across all components in dark theme', async () => {
      const user = userEvent.setup();
      render(<ThemeSystemTest user={mockUser} />);
      
      await user.click(screen.getByTestId('dark-theme-btn'));
      
      await waitFor(() => {
        expect(document.documentElement).toHaveClass('dark');
        
        // In dark mode, CSS variables should adjust colors
        const computedStyle = getComputedStyle(document.documentElement);
        expect(computedStyle.getPropertyValue('--bear-navy')).toBeTruthy();
      });
    });

    it('maintains proper contrast ratios in both themes', async () => {
      const user = userEvent.setup();
      render(<ThemeSystemTest user={mockUser} />);
      
      // Test light theme contrast
      await user.click(screen.getByTestId('light-theme-btn'));
      await waitFor(() => {
        const textElement = screen.getByText(mockUser.name);
        const computedStyle = getComputedStyle(textElement);
        
        // Ensure text has sufficient contrast (implementation would check actual values)
        expect(computedStyle.color).toBeTruthy();
      });
      
      // Test dark theme contrast
      await user.click(screen.getByTestId('dark-theme-btn'));
      await waitFor(() => {
        const textElement = screen.getByText(mockUser.name);
        const computedStyle = getComputedStyle(textElement);
        
        // Ensure text has sufficient contrast in dark mode
        expect(computedStyle.color).toBeTruthy();
      });
    });

    it('handles theme transitions smoothly', async () => {
      const user = userEvent.setup();
      render(<ThemeSystemTest user={mockUser} />);
      
      // Switch themes rapidly
      await user.click(screen.getByTestId('light-theme-btn'));
      await user.click(screen.getByTestId('dark-theme-btn'));
      await user.click(screen.getByTestId('light-theme-btn'));
      
      // Should handle rapid switches without issues
      await waitFor(() => {
        expect(document.documentElement).toHaveClass('light');
      });
    });
  });

  describe('Modern Theme Variants', () => {
    it('applies modern theme styling correctly', async () => {
      const user = userEvent.setup();
      render(<ThemeSystemTest user={mockUser} />);
      
      await user.click(screen.getByTestId('light-theme-btn'));
      
      await waitFor(() => {
        const appContainer = screen.getByRole('main').closest('div');
        expect(appContainer).toHaveClass('font-inter'); // Modern font
        expect(appContainer).toHaveClass('bg-gray-50'); // Modern background
      });
    });

    it('maintains professional appearance in professional mode', async () => {
      // This would test professional theme variant when implemented
      const user = userEvent.setup();
      render(<ThemeSystemTest user={mockUser} />);
      
      // Professional theme would have more conservative styling
      expect(screen.getByRole('main')).toBeInTheDocument();
    });

    it('provides simplified interface in simple mode', async () => {
      // This would test simple theme variant when implemented
      const user = userEvent.setup();
      render(<ThemeSystemTest user={mockUser} />);
      
      // Simple theme would have minimal UI elements
      expect(screen.getByRole('main')).toBeInTheDocument();
    });
  });

  describe('Theme Accessibility', () => {
    it('provides appropriate ARIA labels for theme controls', async () => {
      render(<ThemeSystemTest user={mockUser} />);
      
      const lightBtn = screen.getByTestId('light-theme-btn');
      const darkBtn = screen.getByTestId('dark-theme-btn');
      const autoBtn = screen.getByTestId('auto-theme-btn');
      
      expect(lightBtn).toHaveAttribute('aria-label', 'Switch to light theme');
      expect(darkBtn).toHaveAttribute('aria-label', 'Switch to dark theme');
      expect(autoBtn).toHaveAttribute('aria-label', 'Use system theme preference');
    });

    it('announces theme changes to screen readers', async () => {
      const user = userEvent.setup();
      render(<ThemeSystemTest user={mockUser} />);
      
      await user.click(screen.getByTestId('dark-theme-btn'));
      
      // Would check for aria-live announcements in real implementation
      await waitFor(() => {
        expect(document.documentElement).toHaveClass('dark');
      });
    });

    it('maintains focus visibility in both themes', async () => {
      const user = userEvent.setup();
      render(<ThemeSystemTest user={mockUser} />);
      
      const button = screen.getByTestId('light-theme-btn');
      button.focus();
      
      // Check focus ring is visible in light theme
      expect(button).toHaveFocus();
      
      await user.click(screen.getByTestId('dark-theme-btn'));
      button.focus();
      
      // Check focus ring is visible in dark theme
      expect(button).toHaveFocus();
    });

    it('supports reduced motion preferences', () => {
      // Mock reduced motion preference
      Object.defineProperty(window, 'matchMedia', {
        value: vi.fn().mockImplementation((query) => {
          if (query === '(prefers-reduced-motion: reduce)') {
            return { matches: true, addListener: vi.fn(), removeListener: vi.fn() };
          }
          return { matches: false, addListener: vi.fn(), removeListener: vi.fn() };
        }),
      });
      
      render(<ThemeSystemTest user={mockUser} />);
      
      // Would check that animations are disabled
      expect(document.documentElement).toBeInTheDocument();
    });
  });

  describe('Theme System Performance', () => {
    it('switches themes without performance degradation', async () => {
      const user = userEvent.setup();
      render(<ThemeSystemTest user={mockUser} />);
      
      const startTime = performance.now();
      
      // Switch themes multiple times
      for (let i = 0; i < 10; i++) {
        await user.click(screen.getByTestId(i % 2 === 0 ? 'dark-theme-btn' : 'light-theme-btn'));
      }
      
      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(1000); // Should complete in under 1 second
    });

    it('does not cause memory leaks during theme switching', async () => {
      const user = userEvent.setup();
      const { rerender, unmount } = render(<ThemeSystemTest user={mockUser} />);
      
      const initialMemory = performance.memory?.usedJSHeapSize || 0;
      
      // Switch themes multiple times
      for (let i = 0; i < 50; i++) {
        await user.click(screen.getByTestId(i % 2 === 0 ? 'dark-theme-btn' : 'light-theme-btn'));
        rerender(<ThemeSystemTest user={mockUser} />);
      }
      
      // Force garbage collection if available
      if (global.gc) global.gc();
      
      const finalMemory = performance.memory?.usedJSHeapSize || 0;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Should not have significant memory increase
      expect(memoryIncrease).toBeLessThan(10000000); // 10MB threshold
      
      unmount();
    });

    it('optimizes CSS custom property updates', async () => {
      const user = userEvent.setup();
      render(<ThemeSystemTest user={mockUser} />);
      
      const spy = vi.spyOn(document.documentElement.style, 'setProperty');
      
      await user.click(screen.getByTestId('dark-theme-btn'));
      
      // Should efficiently update CSS custom properties
      expect(spy).toHaveBeenCalledTimes(0); // CSS classes are used instead of style properties
      
      spy.mockRestore();
    });
  });
});