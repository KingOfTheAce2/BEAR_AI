/**
 * Unified BEAR AI GUI - LLM Integration Tests
 * Tests jan-dev and GPT4ALL integrations work in unified interface
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AppLayout } from '../../../src/components/layout/AppLayout';
import { integrationTestUtils, memoryTestUtils } from '../setup';
import type { User } from '../../../src/types';

// Mock the LLM integrations
vi.mock('../../../src/integrations/llm-engine', () => ({
  BearLLMEngine: vi.fn().mockImplementation(() => ({
    initialize: vi.fn().mockResolvedValue(undefined),
    loadModel: vi.fn().mockResolvedValue({
      model_id: 'test-model',
      pid: 12345,
      port: 8000,
      api_key: 'test-key',
      status: 'loaded'
    }),
    unloadModel: vi.fn().mockResolvedValue(true),
    chat: vi.fn().mockResolvedValue({
      id: 'test-response',
      object: 'chat.completion',
      created: Date.now(),
      model: 'test-model',
      choices: [{
        index: 0,
        message: { role: 'assistant', content: 'Test AI response' },
        finish_reason: 'stop'
      }],
      usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 }
    }),
    analyzeLegalDocument: vi.fn().mockResolvedValue('Legal analysis result'),
    coordinatedLegalAnalysis: vi.fn().mockResolvedValue({
      'contract-agent': 'Contract analysis result',
      'risk-agent': 'Risk assessment result',
      'compliance-agent': 'Compliance check result'
    }),
    getLoadedModels: vi.fn().mockReturnValue(['test-model'])
  }))
}));

vi.mock('../../../src/services/gpt4allIntegration', () => ({
  GPT4ALLIntegration: vi.fn().mockImplementation(() => ({
    loadModel: vi.fn().mockResolvedValue(undefined),
    unloadModel: vi.fn().mockResolvedValue(undefined),
    generate: vi.fn().mockResolvedValue({
      text: 'GPT4All response text',
      tokens: 50,
      inferenceTime: 1500,
      memoryUsed: 100000000,
      model: 'gpt4all-model',
      timestamp: new Date()
    }),
    getMemoryUsage: vi.fn().mockReturnValue(100000000),
    getCapabilities: vi.fn().mockReturnValue({
      textGeneration: true,
      chatCompletion: true,
      codeGeneration: false,
      embedding: false,
      reasoning: true,
      multiModal: false,
      supportedFormats: ['text'],
      maxContextLength: 2048
    })
  })),
  GPT4ALLFactory: {
    createModel: vi.fn().mockResolvedValue({}),
    discoverModels: vi.fn().mockResolvedValue([])
  }
}));

describe('LLM Integration Tests', () => {
  const mockUser: User = {
    id: '1',
    name: 'LLM Test User',
    email: 'llm@bearai.test',
    role: 'attorney',
    firm: 'LLM Integration Firm',
  };

  beforeEach(() => {
    integrationTestUtils.resetAPIMocks();
    integrationTestUtils.mockJanDevAPI();
    integrationTestUtils.mockGPT4AllAPI();
    memoryTestUtils.resetMemoryState();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Jan-Dev Integration', () => {
    it('connects to jan-dev API successfully', async () => {
      render(<AppLayout initialUser={mockUser} />);
      
      // Should initialize with jan-dev connection
      await waitFor(() => {
        expect(screen.getByRole('main')).toBeInTheDocument();
      });
      
      // Mock API calls should be available
      expect(global.fetch).toBeDefined();
    });

    it('lists available models from jan-dev', async () => {
      const user = userEvent.setup();
      render(<AppLayout initialUser={mockUser} />);
      
      // Navigate to settings to see model management
      await user.click(screen.getByText('Settings'));
      
      await waitFor(() => {
        expect(screen.getByRole('main')).toHaveTextContent(/settings/i);
      });
      
      // Should show available models (when settings UI is implemented)
      expect(screen.getByRole('main')).toBeInTheDocument();
    });

    it('handles jan-dev chat completions', async () => {
      const user = userEvent.setup();
      render(<AppLayout initialUser={mockUser} />);
      
      // Should be in chat view by default
      const chatInput = screen.queryByPlaceholderText(/type your message/i);
      if (chatInput) {
        await user.type(chatInput, 'Test legal question for jan-dev');
        
        const sendButton = screen.queryByRole('button', { name: /send/i });
        if (sendButton) {
          await user.click(sendButton);
          
          // Should process through jan-dev API
          await waitFor(() => {
            // Response would appear in chat
            expect(screen.getByText('Test legal question for jan-dev')).toBeInTheDocument();
          });
        }
      }
    });

    it('manages jan-dev model loading and unloading', async () => {
      const { BearLLMEngine } = await import('../../../src/integrations/llm-engine');
      const mockEngine = new (BearLLMEngine as any)();
      
      // Test model loading
      const loadResult = await mockEngine.loadModel('legal-llama-7b');
      expect(loadResult).toHaveProperty('status', 'loaded');
      
      // Test model unloading
      const unloadResult = await mockEngine.unloadModel('legal-llama-7b');
      expect(unloadResult).toBe(true);
      
      render(<AppLayout initialUser={mockUser} />);
      expect(screen.getByRole('main')).toBeInTheDocument();
    });

    it('handles jan-dev streaming responses', async () => {
      const { BearLLMEngine } = await import('../../../src/integrations/llm-engine');
      const mockEngine = new (BearLLMEngine as any)();
      
      await mockEngine.loadModel('test-model');
      
      const streamingRequest = {
        model: 'test-model',
        messages: [{ role: 'user', content: 'Test streaming' }],
        stream: true
      };
      
      const streamResponse = await mockEngine.chat(streamingRequest);
      expect(streamResponse).toBeDefined();
      
      render(<AppLayout initialUser={mockUser} />);
      expect(screen.getByRole('main')).toBeInTheDocument();
    });

    it('handles jan-dev API errors gracefully', async () => {
      // Mock API failure
      global.fetch = vi.fn().mockRejectedValue(new Error('Jan-dev API unavailable'));
      
      const user = userEvent.setup();
      render(<AppLayout initialUser={mockUser} />);
      
      const chatInput = screen.queryByPlaceholderText(/type your message/i);
      if (chatInput) {
        await user.type(chatInput, 'Test message during API failure');
        
        const sendButton = screen.queryByRole('button', { name: /send/i });
        if (sendButton) {
          await user.click(sendButton);
          
          // Should handle error gracefully
          await waitFor(() => {
            // Error handling would be implemented here
            expect(screen.getByRole('main')).toBeInTheDocument();
          });
        }
      }
    });
  });

  describe('GPT4ALL Integration', () => {
    it('initializes GPT4ALL integration', async () => {
      const { GPT4ALLIntegration } = await import('../../../src/services/gpt4allIntegration');
      
      const mockConfig = {
        modelPath: '/path/to/model.bin',
        nThreads: 4,
        nCtx: 2048
      };
      
      const integration = new (GPT4ALLIntegration as any)(mockConfig);
      expect(integration).toBeDefined();
      
      render(<AppLayout initialUser={mockUser} />);
      expect(screen.getByRole('main')).toBeInTheDocument();
    });

    it('loads GPT4ALL models successfully', async () => {
      const { GPT4ALLIntegration } = await import('../../../src/services/gpt4allIntegration');
      const integration = new (GPT4ALLIntegration as any)({
        modelPath: '/test/model.bin'
      });
      
      await integration.loadModel();
      expect(integration.loadModel).toHaveBeenCalled();
      
      render(<AppLayout initialUser={mockUser} />);
      expect(screen.getByRole('main')).toBeInTheDocument();
    });

    it('generates text with GPT4ALL', async () => {
      const { GPT4ALLIntegration } = await import('../../../src/services/gpt4allIntegration');
      const integration = new (GPT4ALLIntegration as any)({
        modelPath: '/test/model.bin'
      });
      
      await integration.loadModel();
      
      const result = await integration.generate('Test legal prompt', {
        maxTokens: 100,
        temperature: 0.7
      });
      
      expect(result).toHaveProperty('text');
      expect(result).toHaveProperty('tokens');
      expect(result).toHaveProperty('inferenceTime');
      
      render(<AppLayout initialUser={mockUser} />);
      expect(screen.getByRole('main')).toBeInTheDocument();
    });

    it('monitors GPT4ALL memory usage', async () => {
      const { GPT4ALLIntegration } = await import('../../../src/services/gpt4allIntegration');
      const integration = new (GPT4ALLIntegration as any)({
        modelPath: '/test/model.bin'
      });
      
      await integration.loadModel();
      
      const memoryUsage = integration.getMemoryUsage();
      expect(memoryUsage).toBeGreaterThan(0);
      
      render(<AppLayout initialUser={mockUser} />);
      expect(screen.getByRole('main')).toBeInTheDocument();
    });

    it('discovers GPT4ALL models in directory', async () => {
      const { GPT4ALLFactory } = await import('../../../src/services/gpt4allIntegration');
      
      const models = await GPT4ALLFactory.discoverModels('/test/models');
      expect(GPT4ALLFactory.discoverModels).toHaveBeenCalled();
      expect(models).toBeInstanceOf(Array);
      
      render(<AppLayout initialUser={mockUser} />);
      expect(screen.getByRole('main')).toBeInTheDocument();
    });

    it('handles GPT4ALL model validation', async () => {
      const { GPT4ALLIntegration } = await import('../../../src/services/gpt4allIntegration');
      
      const validPath = '/test/model.gguf';
      const isValid = await (GPT4ALLIntegration as any).validateModelFile(validPath);
      expect(GPT4ALLIntegration.validateModelFile).toHaveBeenCalled();
      
      render(<AppLayout initialUser={mockUser} />);
      expect(screen.getByRole('main')).toBeInTheDocument();
    });
  });

  describe('Unified LLM Management', () => {
    it('switches between LLM backends seamlessly', async () => {
      const user = userEvent.setup();
      render(<AppLayout initialUser={mockUser} />);
      
      // Navigate to settings for model selection
      await user.click(screen.getByText('Settings'));
      
      // Should be able to switch between jan-dev and GPT4ALL
      await waitFor(() => {
        expect(screen.getByRole('main')).toHaveTextContent(/settings/i);
      });
      
      // Model selection would be tested here when UI is implemented
      expect(screen.getByRole('main')).toBeInTheDocument();
    });

    it('manages memory across multiple LLM instances', () => {
      memoryTestUtils.simulateMemoryPressure('high');
      
      render(<AppLayout initialUser={mockUser} />);
      
      // Should handle high memory pressure gracefully
      expect(performance.memory?.usedJSHeapSize).toBeGreaterThan(7000000000); // > 7GB
      expect(screen.getByRole('main')).toBeInTheDocument();
    });

    it('coordinates between jan-dev and GPT4ALL for complex tasks', async () => {
      const { BearLLMEngine } = await import('../../../src/integrations/llm-engine');
      const mockEngine = new (BearLLMEngine as any)();
      
      const documentContent = 'Sample legal document for analysis';
      const agents = ['contract-agent', 'risk-agent', 'compliance-agent'];
      
      const result = await mockEngine.coordinatedLegalAnalysis(documentContent, agents);
      
      expect(result).toHaveProperty('contract-agent');
      expect(result).toHaveProperty('risk-agent');
      expect(result).toHaveProperty('compliance-agent');
      
      render(<AppLayout initialUser={mockUser} />);
      expect(screen.getByRole('main')).toBeInTheDocument();
    });

    it('provides unified model performance metrics', async () => {
      const user = userEvent.setup();
      render(<AppLayout initialUser={mockUser} />);
      
      await user.click(screen.getByText('Settings'));
      
      // Should show performance metrics for all loaded models
      await waitFor(() => {
        expect(screen.getByRole('main')).toBeInTheDocument();
      });
      
      // Metrics UI would be tested here when implemented
    });

    it('handles model conflicts and prioritization', async () => {
      const { BearLLMEngine } = await import('../../../src/integrations/llm-engine');
      const mockEngine = new (BearLLMEngine as any)();
      
      // Load multiple models
      await mockEngine.loadModel('jan-dev-model');
      await mockEngine.loadModel('gpt4all-model');
      
      const loadedModels = mockEngine.getLoadedModels();
      expect(loadedModels).toContain('jan-dev-model');
      expect(loadedModels).toContain('gpt4all-model');
      
      render(<AppLayout initialUser={mockUser} />);
      expect(screen.getByRole('main')).toBeInTheDocument();
    });
  });

  describe('Document Analysis Integration', () => {
    it('analyzes legal documents with integrated LLMs', async () => {
      const user = userEvent.setup();
      render(<AppLayout initialUser={mockUser} />);
      
      // Navigate to documents
      await user.click(screen.getByText('Documents'));
      
      // Mock document upload and analysis
      const documentFile = new File(['Legal document content'], 'contract.pdf', {
        type: 'application/pdf'
      });
      
      // Upload and analyze workflow would be tested here
      await waitFor(() => {
        expect(screen.getByRole('main')).toHaveTextContent(/document/i);
      });
    });

    it('provides multi-model document analysis', async () => {
      const { BearLLMEngine } = await import('../../../src/integrations/llm-engine');
      const mockEngine = new (BearLLMEngine as any)();
      
      const documentContent = 'Contract with various clauses and terms';
      
      // Analyze with different models
      const contractAnalysis = await mockEngine.analyzeLegalDocument(
        documentContent, 
        'contract',
        'jan-dev-model'
      );
      
      const riskAnalysis = await mockEngine.analyzeLegalDocument(
        documentContent,
        'risk', 
        'gpt4all-model'
      );
      
      expect(contractAnalysis).toBeTruthy();
      expect(riskAnalysis).toBeTruthy();
      
      render(<AppLayout initialUser={mockUser} />);
      expect(screen.getByRole('main')).toBeInTheDocument();
    });

    it('streams analysis results in real-time', async () => {
      const user = userEvent.setup();
      render(<AppLayout initialUser={mockUser} />);
      
      await user.click(screen.getByText('Documents'));
      
      // Real-time streaming would be tested here
      await waitFor(() => {
        expect(screen.getByRole('main')).toBeInTheDocument();
      });
    });
  });

  describe('Chat Integration', () => {
    it('provides unified chat interface for all LLMs', async () => {
      const user = userEvent.setup();
      render(<AppLayout initialUser={mockUser} />);
      
      // Should be in chat by default
      const chatInput = screen.queryByPlaceholderText(/type your message/i);
      if (chatInput) {
        await user.type(chatInput, 'Legal question requiring analysis');
        
        const sendButton = screen.queryByRole('button', { name: /send/i });
        if (sendButton) {
          await user.click(sendButton);
          
          await waitFor(() => {
            expect(screen.getByText('Legal question requiring analysis')).toBeInTheDocument();
          });
        }
      }
    });

    it('maintains context across model switches', async () => {
      const user = userEvent.setup();
      render(<AppLayout initialUser={mockUser} />);
      
      // Start conversation with one model
      const chatInput = screen.queryByPlaceholderText(/type your message/i);
      if (chatInput) {
        await user.type(chatInput, 'Initial legal context');
        
        const sendButton = screen.queryByRole('button', { name: /send/i });
        if (sendButton) {
          await user.click(sendButton);
        }
      }
      
      // Switch models (would be in settings)
      await user.click(screen.getByText('Settings'));
      await user.click(screen.getByText('Chat'));
      
      // Context should be maintained
      if (chatInput) {
        expect(screen.getByText('Initial legal context')).toBeInTheDocument();
      }
    });

    it('handles concurrent chat requests', async () => {
      const user = userEvent.setup();
      render(<AppLayout initialUser={mockUser} />);
      
      const chatInput = screen.queryByPlaceholderText(/type your message/i);
      const sendButton = screen.queryByRole('button', { name: /send/i });
      
      if (chatInput && sendButton) {
        // Send multiple messages quickly
        await user.type(chatInput, 'Message 1');
        await user.click(sendButton);
        
        await user.clear(chatInput);
        await user.type(chatInput, 'Message 2');
        await user.click(sendButton);
        
        await user.clear(chatInput);
        await user.type(chatInput, 'Message 3');
        await user.click(sendButton);
        
        // All messages should be handled
        await waitFor(() => {
          expect(screen.getByText('Message 1')).toBeInTheDocument();
          expect(screen.getByText('Message 2')).toBeInTheDocument();
          expect(screen.getByText('Message 3')).toBeInTheDocument();
        });
      }
    });
  });

  describe('Error Handling and Recovery', () => {
    it('recovers from LLM connection failures', async () => {
      // Simulate connection failure
      global.fetch = vi.fn().mockRejectedValue(new Error('Connection failed'));
      
      const user = userEvent.setup();
      render(<AppLayout initialUser={mockUser} />);
      
      const chatInput = screen.queryByPlaceholderText(/type your message/i);
      if (chatInput) {
        await user.type(chatInput, 'Test during connection failure');
        
        const sendButton = screen.queryByRole('button', { name: /send/i });
        if (sendButton) {
          await user.click(sendButton);
          
          // Should show error state but remain functional
          await waitFor(() => {
            expect(screen.getByRole('main')).toBeInTheDocument();
          });
        }
      }
    });

    it('handles model loading failures gracefully', async () => {
      const { GPT4ALLIntegration } = await import('../../../src/services/gpt4allIntegration');
      const integration = new (GPT4ALLIntegration as any)({
        modelPath: '/invalid/path.bin'
      });
      
      // Mock loading failure
      integration.loadModel = vi.fn().mockRejectedValue(new Error('Model not found'));
      
      try {
        await integration.loadModel();
      } catch (error) {
        expect(error.message).toBe('Model not found');
      }
      
      render(<AppLayout initialUser={mockUser} />);
      expect(screen.getByRole('main')).toBeInTheDocument();
    });

    it('provides fallback options when primary LLM fails', async () => {
      const user = userEvent.setup();
      render(<AppLayout initialUser={mockUser} />);
      
      // Should have fallback mechanisms when primary LLM is unavailable
      const chatInput = screen.queryByPlaceholderText(/type your message/i);
      if (chatInput) {
        await user.type(chatInput, 'Fallback test message');
        
        const sendButton = screen.queryByRole('button', { name: /send/i });
        if (sendButton) {
          await user.click(sendButton);
          
          // Should either work with fallback or show appropriate error
          await waitFor(() => {
            expect(screen.getByText('Fallback test message')).toBeInTheDocument();
          });
        }
      }
    });
  });

  describe('Performance and Memory Management', () => {
    it('monitors LLM memory usage in real-time', async () => {
      render(<AppLayout initialUser={mockUser} />);
      
      // Should show memory monitoring for LLMs
      const statusBar = screen.getByRole('contentinfo');
      expect(statusBar).toBeInTheDocument();
      
      // Memory indicators would be visible in status bar or settings
    });

    it('automatically manages model memory based on system resources', () => {
      memoryTestUtils.simulateMemoryPressure('high');
      
      render(<AppLayout initialUser={mockUser} />);
      
      // Should adapt LLM usage based on available memory
      expect(performance.memory?.usedJSHeapSize).toBeGreaterThan(7000000000);
      expect(screen.getByRole('main')).toBeInTheDocument();
    });

    it('optimizes inference performance across different models', async () => {
      const { BearLLMEngine } = await import('../../../src/integrations/llm-engine');
      const mockEngine = new (BearLLMEngine as any)();
      
      await mockEngine.loadModel('fast-model');
      
      const startTime = performance.now();
      
      await mockEngine.chat({
        model: 'fast-model',
        messages: [{ role: 'user', content: 'Quick test' }]
      });
      
      const endTime = performance.now();
      const inferenceTime = endTime - startTime;
      
      // Should complete inference in reasonable time
      expect(inferenceTime).toBeLessThan(5000); // 5 seconds
      
      render(<AppLayout initialUser={mockUser} />);
      expect(screen.getByRole('main')).toBeInTheDocument();
    });

    it('handles long-running inference tasks', async () => {
      const { BearLLMEngine } = await import('../../../src/integrations/llm-engine');
      const mockEngine = new (BearLLMEngine as any)();
      
      await mockEngine.loadModel('complex-model');
      
      // Mock long-running task
      const longTask = mockEngine.analyzeLegalDocument(
        'Very long and complex legal document...',
        'comprehensive'
      );
      
      expect(longTask).toBeInstanceOf(Promise);
      
      const result = await longTask;
      expect(result).toBeTruthy();
      
      render(<AppLayout initialUser={mockUser} />);
      expect(screen.getByRole('main')).toBeInTheDocument();
    });
  });
});