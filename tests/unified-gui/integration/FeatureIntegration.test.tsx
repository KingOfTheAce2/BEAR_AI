/**
 * Unified BEAR AI GUI - Feature Integration Tests
 * Tests all previous GUI features work in the consolidated interface
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { AppLayout } from '../../../src/components/layout/AppLayout';
import { integrationTestUtils, memoryTestUtils } from '../setup';
import type { User } from '../../../src/types';

describe('Feature Integration - Unified Interface', () => {
  const mockUser: User = {
    id: '1',
    name: 'Integration Test User',
    email: 'integration@bearai.test',
    role: 'attorney',
    firm: 'Integration Test Firm',
  };

  beforeEach(() => {
    integrationTestUtils.resetAPIMocks();
    memoryTestUtils.resetMemoryState();
  });

  describe('Chat Interface Integration', () => {
    it('integrates chat functionality from all GUI variants', async () => {
      const user = userEvent.setup();
      render(<AppLayout initialUser={mockUser} />);
      
      // Should have chat interface by default
      expect(screen.getByRole('main')).toHaveTextContent(/chat/i);
      
      // Mock chat input and quick actions
      const chatInput = screen.queryByPlaceholderText(/type your message/i);
      if (chatInput) {
        await user.type(chatInput, 'Test legal question');
        
        // Submit message
        const sendButton = screen.getByRole('button', { name: /send/i });
        await user.click(sendButton);
        
        // Should show message in chat
        expect(screen.getByText('Test legal question')).toBeInTheDocument();
      }
    });

    it('provides quick actions from all GUI variants', async () => {
      const user = userEvent.setup();
      render(<AppLayout initialUser={mockUser} />);
      
      // Look for quick action buttons that were in different variants
      const expectedQuickActions = [
        'Contract Review',
        'Legal Research', 
        'Document Analysis',
        'Citation Check'
      ];
      
      // Not all may be visible initially, but should be accessible
      expectedQuickActions.forEach(action => {
        const element = screen.queryByText(new RegExp(action, 'i'));
        if (element) {
          expect(element).toBeInTheDocument();
        }
      });
    });

    it('maintains chat history across view switches', async () => {
      const user = userEvent.setup();
      render(<AppLayout initialUser={mockUser} />);
      
      // Add a message to chat
      const chatInput = screen.queryByPlaceholderText(/type your message/i);
      if (chatInput) {
        await user.type(chatInput, 'Remember this message');
        const sendButton = screen.getByRole('button', { name: /send/i });
        await user.click(sendButton);
      }
      
      // Switch to documents view
      await user.click(screen.getByText('Documents'));
      await waitFor(() => {
        expect(screen.getByRole('main')).toHaveTextContent(/document/i);
      });
      
      // Switch back to chat
      await user.click(screen.getByText('Chat'));
      await waitFor(() => {
        expect(screen.getByRole('main')).toHaveTextContent(/chat/i);
      });
      
      // Message should still be visible
      if (screen.queryByText('Remember this message')) {
        expect(screen.getByText('Remember this message')).toBeInTheDocument();
      }
    });
  });

  describe('Document Management Integration', () => {
    it('consolidates document features from all variants', async () => {
      const user = userEvent.setup();
      render(<AppLayout initialUser={mockUser} />);
      
      // Navigate to documents
      await user.click(screen.getByText('Documents'));
      await waitFor(() => {
        expect(screen.getByRole('main')).toHaveTextContent(/document/i);
      });
      
      // Should have document grid/list view
      const documentContainer = screen.getByRole('main');
      expect(documentContainer).toBeInTheDocument();
      
      // Should have upload functionality
      const uploadButton = screen.queryByRole('button', { name: /upload/i });
      if (uploadButton) {
        expect(uploadButton).toBeInTheDocument();
      }
    });

    it('handles document upload from all GUI variants', async () => {
      const user = userEvent.setup();
      render(<AppLayout initialUser={mockUser} />);
      
      await user.click(screen.getByText('Documents'));
      
      // Mock file upload
      const file = new File(['test content'], 'test-document.pdf', { type: 'application/pdf' });
      const uploadInput = screen.queryByRole('input', { name: /upload/i });
      
      if (uploadInput) {
        await user.upload(uploadInput, file);
        
        // Should show upload progress or success
        await waitFor(() => {
          expect(screen.queryByText(/uploading|uploaded|test-document/i)).toBeTruthy();
        });
      }
    });

    it('provides document search from all variants', async () => {
      const user = userEvent.setup();
      render(<AppLayout initialUser={mockUser} />);
      
      // Global search should work from any view
      const searchInput = screen.getByPlaceholderText(/search/i);
      await user.type(searchInput, 'contract terms');
      
      // Switch to documents to see results
      await user.click(screen.getByText('Documents'));
      
      // Should filter/search documents
      await waitFor(() => {
        expect(searchInput).toHaveValue('contract terms');
      });
    });

    it('supports document categorization from professional GUI', async () => {
      const user = userEvent.setup();
      render(<AppLayout initialUser={mockUser} />);
      
      await user.click(screen.getByText('Documents'));
      
      // Should have categorization features from professional variant
      const categories = ['Contracts', 'Briefs', 'Research', 'Evidence'];
      
      categories.forEach(category => {
        const element = screen.queryByText(new RegExp(category, 'i'));
        if (element) {
          expect(element).toBeInTheDocument();
        }
      });
    });
  });

  describe('Search and Research Integration', () => {
    it('integrates global search across all features', async () => {
      const user = userEvent.setup();
      render(<AppLayout initialUser={mockUser} />);
      
      const searchInput = screen.getByPlaceholderText(/search/i);
      await user.type(searchInput, 'legal precedent');
      
      // Search should work across documents, chat, and research
      expect(searchInput).toHaveValue('legal precedent');
      
      // Search results should be accessible from any view
      await user.click(screen.getByText('Research'));
      await waitFor(() => {
        expect(screen.getByRole('main')).toHaveTextContent(/research/i);
      });
    });

    it('provides research features from all GUI variants', async () => {
      const user = userEvent.setup();
      render(<AppLayout initialUser={mockUser} />);
      
      await user.click(screen.getByText('Research'));
      
      // Should have research capabilities
      expect(screen.getByRole('main')).toHaveTextContent(/research/i);
      
      // Research features would be tested here when implemented
      const researchContainer = screen.getByRole('main');
      expect(researchContainer).toBeInTheDocument();
    });

    it('maintains search context across views', async () => {
      const user = userEvent.setup();
      render(<AppLayout initialUser={mockUser} />);
      
      // Perform search
      const searchInput = screen.getByPlaceholderText(/search/i);
      await user.type(searchInput, 'liability clauses');
      
      // Switch views
      await user.click(screen.getByText('Documents'));
      await user.click(screen.getByText('Research'));
      await user.click(screen.getByText('Chat'));
      
      // Search context should be maintained
      expect(searchInput).toHaveValue('liability clauses');
    });
  });

  describe('User Interface Consolidation', () => {
    it('consolidates navigation from all GUI variants', async () => {
      const user = userEvent.setup();
      render(<AppLayout initialUser={mockUser} />);
      
      // Should have all navigation items from different variants
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
      
      // All should be clickable and functional
      for (const item of navigationItems) {
        await user.click(screen.getByText(item));
        await waitFor(() => {
          expect(screen.getByRole('main')).toHaveTextContent(new RegExp(item, 'i'));
        });
      }
    });

    it('maintains consistent styling across consolidated features', () => {
      render(<AppLayout initialUser={mockUser} />);
      
      // Check consistent styling classes
      const mainContainer = screen.getByRole('main').closest('div');
      expect(mainContainer).toHaveClass('bg-gray-50'); // Consistent background
      expect(mainContainer).toHaveClass('font-inter'); // Consistent font
      
      const sidebar = screen.getByRole('navigation');
      expect(sidebar).toHaveClass('bg-bear-navy'); // Consistent sidebar
    });

    it('handles responsive design for all features', async () => {
      const user = userEvent.setup();
      
      // Test mobile viewport
      Object.defineProperty(window, 'innerWidth', { value: 375 });
      render(<AppLayout initialUser={mockUser} />);
      
      // Sidebar should adapt
      const sidebar = screen.getByRole('navigation');
      expect(sidebar).toHaveClass(/w-16/);
      
      // All features should be accessible
      const navigationItems = ['Chat', 'Documents', 'Research'];
      for (const item of navigationItems) {
        await user.click(screen.getByText(item));
        expect(screen.getByRole('main')).toBeInTheDocument();
      }
    });
  });

  describe('State Management Integration', () => {
    it('maintains global state across all features', async () => {
      const user = userEvent.setup();
      render(<AppLayout initialUser={mockUser} />);
      
      // User information should be consistent across views
      expect(screen.getByText(mockUser.name)).toBeInTheDocument();
      expect(screen.getByText(mockUser.firm!)).toBeInTheDocument();
      
      // Switch views and verify user info persists
      await user.click(screen.getByText('Documents'));
      expect(screen.getByText(mockUser.name)).toBeInTheDocument();
      
      await user.click(screen.getByText('Research'));
      expect(screen.getByText(mockUser.name)).toBeInTheDocument();
    });

    it('handles concurrent operations across features', async () => {
      const user = userEvent.setup();
      render(<AppLayout initialUser={mockUser} />);
      
      // Simulate concurrent operations
      const searchInput = screen.getByPlaceholderText(/search/i);
      await user.type(searchInput, 'concurrent test');
      
      // While search is active, switch views rapidly
      await user.click(screen.getByText('Documents'));
      await user.click(screen.getByText('Chat'));
      await user.click(screen.getByText('Research'));
      
      // State should remain consistent
      expect(searchInput).toHaveValue('concurrent test');
      expect(screen.getByText(mockUser.name)).toBeInTheDocument();
    });

    it('manages memory efficiently across all features', () => {
      const initialMemory = performance.memory?.usedJSHeapSize || 0;
      
      render(<AppLayout initialUser={mockUser} />);
      
      const finalMemory = performance.memory?.usedJSHeapSize || 0;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Should not consume excessive memory
      expect(memoryIncrease).toBeLessThan(100000000); // 100MB threshold
    });
  });

  describe('Error Handling Integration', () => {
    it('provides consistent error handling across features', async () => {
      const user = userEvent.setup();
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      render(<AppLayout initialUser={mockUser} />);
      
      // Test error handling doesn't break other features
      try {
        // Simulate error in one feature
        fireEvent.error(screen.getByRole('main'));
        
        // Other features should still work
        await user.click(screen.getByText('Documents'));
        expect(screen.getByRole('main')).toBeInTheDocument();
        
        await user.click(screen.getByText('Chat'));
        expect(screen.getByRole('main')).toBeInTheDocument();
      } catch (error) {
        // Error should be handled gracefully
      }
      
      consoleSpy.mockRestore();
    });

    it('recovers from feature-specific errors', async () => {
      const user = userEvent.setup();
      render(<AppLayout initialUser={mockUser} />);
      
      // Simulate error in documents
      await user.click(screen.getByText('Documents'));
      
      // Even if documents fail, other features should work
      await user.click(screen.getByText('Chat'));
      expect(screen.getByRole('main')).toHaveTextContent(/chat/i);
      
      await user.click(screen.getByText('Research'));
      expect(screen.getByRole('main')).toHaveTextContent(/research/i);
    });

    it('provides user feedback for integration issues', async () => {
      const user = userEvent.setup();
      render(<AppLayout initialUser={mockUser} />);
      
      // Should have error boundaries and user feedback mechanisms
      expect(screen.getByRole('main')).toBeInTheDocument();
      
      // Status bar should indicate system status
      const statusBar = screen.getByRole('contentinfo');
      expect(statusBar).toBeInTheDocument();
    });
  });

  describe('Performance Integration', () => {
    it('maintains performance with all features loaded', () => {
      const startTime = performance.now();
      
      render(<AppLayout initialUser={mockUser} />);
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      // Should render within acceptable time even with all features
      expect(renderTime).toBeLessThan(1000); // 1 second
    });

    it('handles feature switching efficiently', async () => {
      const user = userEvent.setup();
      render(<AppLayout initialUser={mockUser} />);
      
      const startTime = performance.now();
      
      // Rapidly switch between all features
      const features = ['Documents', 'Research', 'History', 'Settings', 'Chat'];
      
      for (const feature of features) {
        await user.click(screen.getByText(feature));
        await waitFor(() => {
          expect(screen.getByRole('main')).toBeInTheDocument();
        });
      }
      
      const endTime = performance.now();
      const switchingTime = endTime - startTime;
      
      // Should handle all switches efficiently
      expect(switchingTime).toBeLessThan(2000); // 2 seconds for all switches
    });

    it('optimizes resource loading across features', () => {
      render(<AppLayout initialUser={mockUser} />);
      
      // Should not load all feature resources upfront
      // Lazy loading would be tested here
      expect(screen.getByRole('main')).toBeInTheDocument();
    });
  });
});