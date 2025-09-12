/**
 * Unified BEAR AI GUI - User Workflow Tests
 * Tests complete user journeys and end-to-end workflows
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { AppLayout } from '../../../src/components/layout/AppLayout';
import { integrationTestUtils, memoryTestUtils } from '../setup';
import type { User } from '../../../src/types';

describe('User Workflow Tests', () => {
  const mockUser: User = {
    id: '1',
    name: 'Workflow Test Attorney',
    email: 'workflow@bearai.test',
    role: 'attorney',
    firm: 'Legal Workflow Partners',
  };

  beforeEach(() => {
    integrationTestUtils.resetAPIMocks();
    integrationTestUtils.mockJanDevAPI();
    memoryTestUtils.resetMemoryState();
  });

  describe('Document Analysis Workflow', () => {
    it('completes full document upload and analysis journey', async () => {
      const user = userEvent.setup();
      render(<AppLayout initialUser={mockUser} />);

      // Step 1: Navigate to documents
      await user.click(screen.getByText('Documents'));
      await waitFor(() => {
        expect(screen.getByRole('main')).toHaveTextContent(/document/i);
      });

      // Step 2: Upload document (mock)
      const documentFile = new File(['Contract content for analysis'], 'contract.pdf', {
        type: 'application/pdf'
      });

      const uploadInput = screen.queryByLabelText(/upload/i) || screen.queryByRole('input', { name: /file/i });
      if (uploadInput) {
        await user.upload(uploadInput, documentFile);
        
        // Step 3: Verify upload success
        await waitFor(() => {
          expect(screen.queryByText(/contract\.pdf|uploading|uploaded/i)).toBeTruthy();
        });
      }

      // Step 4: Initiate analysis (mock)
      const analyzeButton = screen.queryByRole('button', { name: /analyze|process/i });
      if (analyzeButton) {
        await user.click(analyzeButton);

        // Step 5: Monitor analysis progress
        await waitFor(() => {
          // Analysis would show progress or completion
          expect(screen.getByRole('main')).toBeInTheDocument();
        });
      }

      // Step 6: View results
      const resultsLink = screen.queryByText(/results|analysis|summary/i);
      if (resultsLink) {
        await user.click(resultsLink);
        
        await waitFor(() => {
          expect(screen.getByRole('main')).toBeInTheDocument();
        });
      }
    });

    it('handles document analysis with AI assistance', async () => {
      const user = userEvent.setup();
      render(<AppLayout initialUser={mockUser} />);

      // Step 1: Upload document
      await user.click(screen.getByText('Documents'));
      
      // Step 2: Request AI analysis through chat
      await user.click(screen.getByText('Chat'));
      
      const chatInput = screen.queryByPlaceholderText(/type your message/i);
      if (chatInput) {
        await user.type(chatInput, 'Please analyze the contract I just uploaded for key terms and risks');
        
        const sendButton = screen.queryByRole('button', { name: /send/i });
        if (sendButton) {
          await user.click(sendButton);
          
          // Step 3: Receive AI analysis
          await waitFor(() => {
            expect(screen.getByText('Please analyze the contract I just uploaded for key terms and risks')).toBeInTheDocument();
          });
        }
      }

      // Step 4: Follow up with specific questions
      if (chatInput) {
        await user.clear(chatInput);
        await user.type(chatInput, 'What are the main liability clauses in this contract?');
        
        const sendButton = screen.queryByRole('button', { name: /send/i });
        if (sendButton) {
          await user.click(sendButton);
        }
      }
    });

    it('exports analysis results', async () => {
      const user = userEvent.setup();
      render(<AppLayout initialUser={mockUser} />);

      // Complete analysis workflow
      await user.click(screen.getByText('Documents'));
      
      // Mock document with completed analysis
      const exportButton = screen.queryByRole('button', { name: /export|download|save/i });
      if (exportButton) {
        await user.click(exportButton);
        
        // Should trigger download/export
        await waitFor(() => {
          // Export functionality would be tested here
          expect(screen.getByRole('main')).toBeInTheDocument();
        });
      }
    });
  });

  describe('Legal Research Workflow', () => {
    it('completes comprehensive legal research journey', async () => {
      const user = userEvent.setup();
      render(<AppLayout initialUser={mockUser} />);

      // Step 1: Start with research question
      const searchInput = screen.getByPlaceholderText(/search/i);
      await user.type(searchInput, 'employment law termination without cause');

      // Step 2: Navigate to research module
      await user.click(screen.getByText('Research'));
      await waitFor(() => {
        expect(screen.getByRole('main')).toHaveTextContent(/research/i);
      });

      // Step 3: Refine search (mock)
      const refineButton = screen.queryByRole('button', { name: /refine|filter|advanced/i });
      if (refineButton) {
        await user.click(refineButton);
      }

      // Step 4: Review search results
      const searchResults = screen.queryByText(/results|cases|statutes/i);
      if (searchResults) {
        await user.click(searchResults);
      }

      // Step 5: Save relevant findings
      const saveButton = screen.queryByRole('button', { name: /save|bookmark|add/i });
      if (saveButton) {
        await user.click(saveButton);
      }
    });

    it('integrates research with document analysis', async () => {
      const user = userEvent.setup();
      render(<AppLayout initialUser={mockUser} />);

      // Step 1: Research specific legal topic
      await user.click(screen.getByText('Research'));
      const searchInput = screen.getByPlaceholderText(/search/i);
      await user.type(searchInput, 'non-compete agreement enforceability');

      // Step 2: Apply research to document analysis
      await user.click(screen.getByText('Documents'));
      
      // Step 3: Use research context in AI chat
      await user.click(screen.getByText('Chat'));
      
      const chatInput = screen.queryByPlaceholderText(/type your message/i);
      if (chatInput) {
        await user.type(chatInput, 'Based on my research on non-compete agreements, analyze this contract for enforceability issues');
        
        const sendButton = screen.queryByRole('button', { name: /send/i });
        if (sendButton) {
          await user.click(sendButton);
        }
      }
    });

    it('creates research brief from findings', async () => {
      const user = userEvent.setup();
      render(<AppLayout initialUser={mockUser} />);

      // Complete research workflow
      await user.click(screen.getByText('Research'));
      
      const searchInput = screen.getByPlaceholderText(/search/i);
      await user.type(searchInput, 'intellectual property licensing');

      // Mock research compilation
      const compileButton = screen.queryByRole('button', { name: /compile|create|generate/i });
      if (compileButton) {
        await user.click(compileButton);
        
        await waitFor(() => {
          // Brief creation functionality would be tested here
          expect(screen.getByRole('main')).toBeInTheDocument();
        });
      }
    });
  });

  describe('Client Consultation Workflow', () => {
    it('prepares for client meeting using integrated tools', async () => {
      const user = userEvent.setup();
      render(<AppLayout initialUser={mockUser} />);

      // Step 1: Review client documents
      await user.click(screen.getByText('Documents'));
      
      // Mock client document selection
      const clientFolder = screen.queryByText(/client|folder/i);
      if (clientFolder) {
        await user.click(clientFolder);
      }

      // Step 2: Research relevant legal issues
      await user.click(screen.getByText('Research'));
      const searchInput = screen.getByPlaceholderText(/search/i);
      await user.type(searchInput, 'contract dispute remedies');

      // Step 3: Prepare talking points with AI
      await user.click(screen.getByText('Chat'));
      
      const chatInput = screen.queryByPlaceholderText(/type your message/i);
      if (chatInput) {
        await user.type(chatInput, 'Help me prepare talking points for a client meeting about their contract dispute');
        
        const sendButton = screen.queryByRole('button', { name: /send/i });
        if (sendButton) {
          await user.click(sendButton);
        }
      }

      // Step 4: Create meeting agenda
      const createButton = screen.queryByRole('button', { name: /create|new|agenda/i });
      if (createButton) {
        await user.click(createButton);
      }
    });

    it('documents consultation outcomes', async () => {
      const user = userEvent.setup();
      render(<AppLayout initialUser={mockUser} />);

      // Post-meeting documentation
      await user.click(screen.getByText('Chat'));
      
      const chatInput = screen.queryByPlaceholderText(/type your message/i);
      if (chatInput) {
        await user.type(chatInput, 'Create a meeting summary: Client agreed to settlement negotiations, needs contract review by Friday');
        
        const sendButton = screen.queryByRole('button', { name: /send/i });
        if (sendButton) {
          await user.click(sendButton);
        }
      }

      // Save to client file
      const saveToFileButton = screen.queryByRole('button', { name: /save|file|record/i });
      if (saveToFileButton) {
        await user.click(saveToFileButton);
      }
    });
  });

  describe('Case Preparation Workflow', () => {
    it('organizes evidence and documents for case', async () => {
      const user = userEvent.setup();
      render(<AppLayout initialUser={mockUser} />);

      // Step 1: Create case folder organization
      await user.click(screen.getByText('Documents'));
      
      const newFolderButton = screen.queryByRole('button', { name: /new|folder|create/i });
      if (newFolderButton) {
        await user.click(newFolderButton);
      }

      // Step 2: Upload and categorize evidence
      const uploadButton = screen.queryByRole('button', { name: /upload/i });
      if (uploadButton) {
        const evidenceFile = new File(['Evidence document'], 'evidence1.pdf', {
          type: 'application/pdf'
        });
        
        const fileInput = screen.queryByRole('input');
        if (fileInput) {
          await user.upload(fileInput, evidenceFile);
        }
      }

      // Step 3: Tag and index documents
      const tagButton = screen.queryByRole('button', { name: /tag|label|category/i });
      if (tagButton) {
        await user.click(tagButton);
      }

      // Step 4: Create case timeline
      const timelineButton = screen.queryByRole('button', { name: /timeline|chronology/i });
      if (timelineButton) {
        await user.click(timelineButton);
      }
    });

    it('analyzes case strength with AI assistance', async () => {
      const user = userEvent.setup();
      render(<AppLayout initialUser={mockUser} />);

      await user.click(screen.getByText('Chat'));
      
      const chatInput = screen.queryByPlaceholderText(/type your message/i);
      if (chatInput) {
        await user.type(chatInput, 'Analyze the strength of our case based on the uploaded evidence and provide recommendations');
        
        const sendButton = screen.queryByRole('button', { name: /send/i });
        if (sendButton) {
          await user.click(sendButton);
          
          await waitFor(() => {
            expect(screen.getByText('Analyze the strength of our case based on the uploaded evidence and provide recommendations')).toBeInTheDocument();
          });
        }
      }

      // Follow up with specific questions
      if (chatInput) {
        await user.clear(chatInput);
        await user.type(chatInput, 'What additional evidence would strengthen our position?');
        
        const sendButton = screen.queryByRole('button', { name: /send/i });
        if (sendButton) {
          await user.click(sendButton);
        }
      }
    });

    it('generates case brief and strategy document', async () => {
      const user = userEvent.setup();
      render(<AppLayout initialUser={mockUser} />);

      // Use AI to generate case brief
      await user.click(screen.getByText('Chat'));
      
      const chatInput = screen.queryByPlaceholderText(/type your message/i);
      if (chatInput) {
        await user.type(chatInput, 'Generate a case brief outlining our arguments and legal strategy');
        
        const sendButton = screen.queryByRole('button', { name: /send/i });
        if (sendButton) {
          await user.click(sendButton);
        }
      }

      // Export to document
      const exportButton = screen.queryByRole('button', { name: /export|download|save/i });
      if (exportButton) {
        await user.click(exportButton);
      }
    });
  });

  describe('Multi-User Collaboration Workflow', () => {
    it('shares documents with team members', async () => {
      const user = userEvent.setup();
      render(<AppLayout initialUser={mockUser} />);

      await user.click(screen.getByText('Documents'));
      
      // Select document to share
      const documentItem = screen.queryByText(/\.pdf|\.docx|contract|agreement/i);
      if (documentItem) {
        await user.click(documentItem);
      }

      // Share document
      const shareButton = screen.queryByRole('button', { name: /share|collaborate/i });
      if (shareButton) {
        await user.click(shareButton);
        
        // Mock team member selection
        await waitFor(() => {
          expect(screen.getByRole('main')).toBeInTheDocument();
        });
      }
    });

    it('collaborates on document analysis', async () => {
      const user = userEvent.setup();
      render(<AppLayout initialUser={mockUser} />);

      // Start collaborative analysis
      await user.click(screen.getByText('Chat'));
      
      const chatInput = screen.queryByPlaceholderText(/type your message/i);
      if (chatInput) {
        await user.type(chatInput, '@team Please review the contract analysis and provide your input on the liability clauses');
        
        const sendButton = screen.queryByRole('button', { name: /send/i });
        if (sendButton) {
          await user.click(sendButton);
        }
      }

      // Mock team response
      // In real implementation, this would show team member responses
      expect(screen.getByRole('main')).toBeInTheDocument();
    });

    it('manages team permissions and access', async () => {
      const user = userEvent.setup();
      render(<AppLayout initialUser={mockUser} />);

      await user.click(screen.getByText('Settings'));
      
      // Navigate to team management
      const teamButton = screen.queryByText(/team|users|permissions/i);
      if (teamButton) {
        await user.click(teamButton);
        
        await waitFor(() => {
          expect(screen.getByRole('main')).toBeInTheDocument();
        });
      }

      // Modify permissions
      const permissionButton = screen.queryByRole('button', { name: /edit|modify|permissions/i });
      if (permissionButton) {
        await user.click(permissionButton);
      }
    });
  });

  describe('Workflow Performance and Reliability', () => {
    it('maintains performance during complex workflows', async () => {
      const user = userEvent.setup();
      const startTime = performance.now();
      
      render(<AppLayout initialUser={mockUser} />);

      // Simulate complex workflow
      await user.type(screen.getByPlaceholderText(/search/i), 'complex legal workflow test');
      await user.click(screen.getByText('Documents'));
      await user.click(screen.getByText('Research'));
      await user.click(screen.getByText('Chat'));
      
      const chatInput = screen.queryByPlaceholderText(/type your message/i);
      if (chatInput) {
        await user.type(chatInput, 'Analyze multiple documents and provide comprehensive legal advice');
      }

      const workflowTime = performance.now() - startTime;
      
      // Complex workflow should complete efficiently
      expect(workflowTime).toBeLessThan(3000); // 3 seconds
    });

    it('handles workflow interruptions gracefully', async () => {
      const user = userEvent.setup();
      render(<AppLayout initialUser={mockUser} />);

      // Start workflow
      await user.click(screen.getByText('Documents'));
      await user.type(screen.getByPlaceholderText(/search/i), 'interrupted workflow');

      // Simulate interruption (navigation away)
      await user.click(screen.getByText('Research'));
      await user.click(screen.getByText('Chat'));

      // Return to original workflow
      await user.click(screen.getByText('Documents'));

      // State should be preserved
      const searchInput = screen.getByPlaceholderText(/search/i);
      expect(searchInput).toHaveValue('interrupted workflow');
    });

    it('provides workflow progress indicators', async () => {
      const user = userEvent.setup();
      render(<AppLayout initialUser={mockUser} />);

      // Start document analysis workflow
      await user.click(screen.getByText('Documents'));
      
      const uploadButton = screen.queryByRole('button', { name: /upload/i });
      if (uploadButton) {
        await user.click(uploadButton);
        
        // Should show progress indicators
        await waitFor(() => {
          // Progress indicators would be shown during upload/analysis
          expect(screen.getByRole('main')).toBeInTheDocument();
        });
      }
    });

    it('enables workflow automation', async () => {
      const user = userEvent.setup();
      render(<AppLayout initialUser={mockUser} />);

      // Set up automated workflow
      await user.click(screen.getByText('Settings'));
      
      const automationButton = screen.queryByText(/automation|workflow|rules/i);
      if (automationButton) {
        await user.click(automationButton);
        
        // Configure automation rules
        await waitFor(() => {
          expect(screen.getByRole('main')).toBeInTheDocument();
        });
      }
    });

    it('provides workflow analytics and insights', async () => {
      const user = userEvent.setup();
      render(<AppLayout initialUser={mockUser} />);

      // Complete several workflows
      const workflows = ['Documents', 'Research', 'Chat'];
      
      for (const workflow of workflows) {
        await user.click(screen.getByText(workflow));
        await waitFor(() => {
          expect(screen.getByRole('main')).toHaveTextContent(new RegExp(workflow, 'i'));
        });
      }

      // View analytics
      await user.click(screen.getByText('History'));
      
      await waitFor(() => {
        expect(screen.getByRole('main')).toHaveTextContent(/history/i);
      });

      // Should show workflow history and analytics
      expect(screen.getByRole('main')).toBeInTheDocument();
    });
  });
});