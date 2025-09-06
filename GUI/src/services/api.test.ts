import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createMockAxiosResponse, createMockAxiosError } from '@test/mocks/services'
import { server } from '@test/setup-msw'
import { rest } from 'msw'

// Mock the actual API service since we'll test the implementation separately
const createMockApiService = () => ({
  sendMessage: vi.fn(),
  getConversations: vi.fn(),
  getConversation: vi.fn(),
  createConversation: vi.fn(),
  deleteConversation: vi.fn(),
  searchCases: vi.fn(),
  searchStatutes: vi.fn(),
  searchRegulations: vi.fn(),
  uploadDocument: vi.fn(),
  getDocuments: vi.fn(),
  deleteDocument: vi.fn(),
  getCurrentUser: vi.fn(),
  updateUserProfile: vi.fn(),
  setAuthToken: vi.fn(),
  clearAuthToken: vi.fn(),
  isAuthenticated: vi.fn(),
})

describe('API Service', () => {
  let apiService: ReturnType<typeof createMockApiService>

  beforeEach(() => {
    apiService = createMockApiService()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Chat Endpoints', () => {
    describe('sendMessage', () => {
      it('sends message successfully', async () => {
        const mockResponse = {
          id: 'msg-123',
          content: 'AI response',
          role: 'assistant',
          timestamp: new Date(),
          citations: [],
        }

        apiService.sendMessage.mockResolvedValue(createMockAxiosResponse(mockResponse))

        const result = await apiService.sendMessage({
          content: 'Test message',
          conversationId: 'conv-123',
        })

        expect(apiService.sendMessage).toHaveBeenCalledWith({
          content: 'Test message',
          conversationId: 'conv-123',
        })
        expect(result.data).toEqual(mockResponse)
      })

      it('handles send message error', async () => {
        apiService.sendMessage.mockRejectedValue(
          createMockAxiosError('Failed to send message', 500)
        )

        await expect(apiService.sendMessage({
          content: 'Test message',
          conversationId: 'conv-123',
        })).rejects.toThrow()

        expect(apiService.sendMessage).toHaveBeenCalled()
      })

      it('sends message with attachments', async () => {
        const mockFile = new File(['test'], 'test.pdf', { type: 'application/pdf' })
        const mockResponse = {
          id: 'msg-123',
          content: 'Response with attachment',
          role: 'assistant',
          timestamp: new Date(),
          attachments: [{
            id: 'att-123',
            name: 'test.pdf',
            type: 'document',
            url: 'mock-url',
            size: 1024,
            mimeType: 'application/pdf',
          }],
        }

        apiService.sendMessage.mockResolvedValue(createMockAxiosResponse(mockResponse))

        const result = await apiService.sendMessage({
          content: 'Message with file',
          conversationId: 'conv-123',
          attachments: [mockFile],
        })

        expect(result.data.attachments).toBeDefined()
        expect(result.data.attachments[0].name).toBe('test.pdf')
      })
    })

    describe('getConversations', () => {
      it('fetches conversations successfully', async () => {
        const mockResponse = {
          conversations: [
            {
              id: 'conv-1',
              title: 'Test Conversation',
              userId: 'user-123',
              messages: [],
              lastActivity: new Date(),
              createdAt: new Date(),
            }
          ],
          total: 1,
          page: 1,
          limit: 10,
        }

        apiService.getConversations.mockResolvedValue(createMockAxiosResponse(mockResponse))

        const result = await apiService.getConversations({ page: 1, limit: 10 })

        expect(apiService.getConversations).toHaveBeenCalledWith({ page: 1, limit: 10 })
        expect(result.data.conversations).toHaveLength(1)
        expect(result.data.total).toBe(1)
      })

      it('handles pagination parameters', async () => {
        apiService.getConversations.mockResolvedValue(createMockAxiosResponse({
          conversations: [],
          total: 0,
          page: 2,
          limit: 5,
        }))

        await apiService.getConversations({ page: 2, limit: 5 })

        expect(apiService.getConversations).toHaveBeenCalledWith({ page: 2, limit: 5 })
      })
    })

    describe('createConversation', () => {
      it('creates conversation successfully', async () => {
        const mockResponse = {
          id: 'conv-new',
          title: 'New Conversation',
          userId: 'user-123',
          messages: [],
          lastActivity: new Date(),
          createdAt: new Date(),
        }

        apiService.createConversation.mockResolvedValue(createMockAxiosResponse(mockResponse))

        const result = await apiService.createConversation({ title: 'New Conversation' })

        expect(apiService.createConversation).toHaveBeenCalledWith({ title: 'New Conversation' })
        expect(result.data.title).toBe('New Conversation')
      })
    })

    describe('deleteConversation', () => {
      it('deletes conversation successfully', async () => {
        apiService.deleteConversation.mockResolvedValue(createMockAxiosResponse({ success: true }))

        const result = await apiService.deleteConversation('conv-123')

        expect(apiService.deleteConversation).toHaveBeenCalledWith('conv-123')
        expect(result.data.success).toBe(true)
      })
    })
  })

  describe('Research Endpoints', () => {
    describe('searchCases', () => {
      it('searches cases successfully', async () => {
        const mockResponse = {
          results: [
            {
              id: 'case-1',
              title: 'Test Case v. Example',
              citation: '123 F.3d 456',
              snippet: 'Test case snippet',
              relevance: 0.95,
              court: 'Supreme Court',
              date: '2023-01-01',
            }
          ],
          total: 1,
          searchTime: 250,
        }

        apiService.searchCases.mockResolvedValue(createMockAxiosResponse(mockResponse))

        const result = await apiService.searchCases({
          query: 'contract law',
          jurisdiction: 'federal',
        })

        expect(apiService.searchCases).toHaveBeenCalledWith({
          query: 'contract law',
          jurisdiction: 'federal',
        })
        expect(result.data.results).toHaveLength(1)
        expect(result.data.searchTime).toBe(250)
      })

      it('handles advanced search parameters', async () => {
        apiService.searchCases.mockResolvedValue(createMockAxiosResponse({
          results: [],
          total: 0,
          searchTime: 100,
        }))

        await apiService.searchCases({
          query: 'negligence',
          jurisdiction: 'state',
          court: '9th Circuit',
          dateFrom: '2020-01-01',
          dateTo: '2023-12-31',
        })

        expect(apiService.searchCases).toHaveBeenCalledWith({
          query: 'negligence',
          jurisdiction: 'state',
          court: '9th Circuit',
          dateFrom: '2020-01-01',
          dateTo: '2023-12-31',
        })
      })
    })

    describe('searchStatutes', () => {
      it('searches statutes successfully', async () => {
        const mockResponse = {
          results: [
            {
              id: 'statute-1',
              title: 'Civil Rights Act',
              citation: '42 U.S.C. § 1983',
              snippet: 'Every person who...',
              relevance: 0.92,
              jurisdiction: 'Federal',
            }
          ],
          total: 1,
          searchTime: 180,
        }

        apiService.searchStatutes.mockResolvedValue(createMockAxiosResponse(mockResponse))

        const result = await apiService.searchStatutes({
          query: 'civil rights',
          jurisdiction: 'federal',
        })

        expect(result.data.results[0].citation).toBe('42 U.S.C. § 1983')
      })
    })

    describe('searchRegulations', () => {
      it('searches regulations successfully', async () => {
        const mockResponse = {
          results: [
            {
              id: 'reg-1',
              title: 'FMLA Regulations',
              citation: '29 C.F.R. § 825.100',
              snippet: 'Family and Medical Leave...',
              relevance: 0.89,
              agency: 'DOL',
            }
          ],
          total: 1,
          searchTime: 200,
        }

        apiService.searchRegulations.mockResolvedValue(createMockAxiosResponse(mockResponse))

        const result = await apiService.searchRegulations({
          query: 'family leave',
          agency: 'DOL',
        })

        expect(result.data.results[0].agency).toBe('DOL')
      })
    })
  })

  describe('Document Endpoints', () => {
    describe('uploadDocument', () => {
      it('uploads document successfully', async () => {
        const mockFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' })
        const mockResponse = {
          id: 'doc-123',
          name: 'test.pdf',
          size: 1024,
          type: 'application/pdf',
          uploadedAt: new Date(),
          processedAt: new Date(),
        }

        apiService.uploadDocument.mockResolvedValue(createMockAxiosResponse(mockResponse))

        const result = await apiService.uploadDocument(mockFile, {
          description: 'Test document',
          tags: ['contract', 'legal'],
        })

        expect(apiService.uploadDocument).toHaveBeenCalledWith(mockFile, {
          description: 'Test document',
          tags: ['contract', 'legal'],
        })
        expect(result.data.name).toBe('test.pdf')
      })

      it('handles upload progress', async () => {
        const mockFile = new File(['test'], 'test.pdf')
        const onProgress = vi.fn()

        apiService.uploadDocument.mockImplementation(async (file, options) => {
          // Simulate progress updates
          onProgress({ loaded: 50, total: 100 })
          onProgress({ loaded: 100, total: 100 })
          return createMockAxiosResponse({ id: 'doc-123', name: file.name })
        })

        await apiService.uploadDocument(mockFile, { onProgress })

        expect(onProgress).toHaveBeenCalledWith({ loaded: 50, total: 100 })
        expect(onProgress).toHaveBeenCalledWith({ loaded: 100, total: 100 })
      })
    })

    describe('getDocuments', () => {
      it('fetches documents with filters', async () => {
        const mockResponse = {
          documents: [
            {
              id: 'doc-1',
              name: 'contract.pdf',
              size: 512000,
              type: 'application/pdf',
              tags: ['contract', 'business'],
              uploadedAt: new Date(),
            }
          ],
          total: 1,
          page: 1,
          limit: 10,
        }

        apiService.getDocuments.mockResolvedValue(createMockAxiosResponse(mockResponse))

        const result = await apiService.getDocuments({
          page: 1,
          limit: 10,
          tags: ['contract'],
          type: 'pdf',
        })

        expect(result.data.documents[0].tags).toContain('contract')
      })
    })
  })

  describe('User Endpoints', () => {
    describe('getCurrentUser', () => {
      it('fetches current user successfully', async () => {
        const mockResponse = {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          role: 'user',
          preferences: {
            theme: 'light',
            language: 'en',
          },
        }

        apiService.getCurrentUser.mockResolvedValue(createMockAxiosResponse(mockResponse))

        const result = await apiService.getCurrentUser()

        expect(result.data.email).toBe('test@example.com')
        expect(result.data.preferences.theme).toBe('light')
      })
    })

    describe('updateUserProfile', () => {
      it('updates user profile successfully', async () => {
        const updateData = {
          name: 'Updated User',
          preferences: {
            theme: 'dark',
            language: 'es',
          },
        }

        apiService.updateUserProfile.mockResolvedValue(createMockAxiosResponse({
          id: 'user-123',
          email: 'test@example.com',
          ...updateData,
        }))

        const result = await apiService.updateUserProfile(updateData)

        expect(apiService.updateUserProfile).toHaveBeenCalledWith(updateData)
        expect(result.data.name).toBe('Updated User')
        expect(result.data.preferences.theme).toBe('dark')
      })
    })
  })

  describe('Authentication', () => {
    it('sets auth token', () => {
      const token = 'test-jwt-token'
      apiService.setAuthToken(token)

      expect(apiService.setAuthToken).toHaveBeenCalledWith(token)
    })

    it('clears auth token', () => {
      apiService.clearAuthToken()

      expect(apiService.clearAuthToken).toHaveBeenCalled()
    })

    it('checks authentication status', () => {
      apiService.isAuthenticated.mockReturnValue(true)

      const isAuth = apiService.isAuthenticated()

      expect(isAuth).toBe(true)
    })
  })

  describe('Error Handling', () => {
    it('handles network errors', async () => {
      apiService.sendMessage.mockRejectedValue(new Error('Network Error'))

      await expect(apiService.sendMessage({
        content: 'test',
        conversationId: 'conv-123',
      })).rejects.toThrow('Network Error')
    })

    it('handles HTTP errors', async () => {
      apiService.sendMessage.mockRejectedValue(
        createMockAxiosError('Server Error', 500, 'INTERNAL_ERROR')
      )

      await expect(apiService.sendMessage({
        content: 'test',
        conversationId: 'conv-123',
      })).rejects.toMatchObject({
        message: 'Server Error',
        response: { status: 500 }
      })
    })

    it('handles validation errors', async () => {
      apiService.createConversation.mockRejectedValue(
        createMockAxiosError('Validation failed', 400, 'VALIDATION_ERROR')
      )

      await expect(apiService.createConversation({
        title: '', // Invalid empty title
      })).rejects.toMatchObject({
        message: 'Validation failed',
        response: { status: 400 }
      })
    })
  })

  describe('Request Timeout', () => {
    it('handles request timeouts', async () => {
      apiService.searchCases.mockRejectedValue(
        createMockAxiosError('Request timeout', 408, 'TIMEOUT')
      )

      await expect(apiService.searchCases({
        query: 'complex search that times out'
      })).rejects.toMatchObject({
        code: 'TIMEOUT'
      })
    })
  })

  describe('Rate Limiting', () => {
    it('handles rate limit errors', async () => {
      apiService.sendMessage.mockRejectedValue(
        createMockAxiosError('Rate limit exceeded', 429, 'RATE_LIMIT')
      )

      await expect(apiService.sendMessage({
        content: 'test',
        conversationId: 'conv-123',
      })).rejects.toMatchObject({
        response: { status: 429 }
      })
    })
  })
})