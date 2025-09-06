import { rest } from 'msw'

const API_BASE_URL = process.env.VITE_API_BASE_URL || 'http://localhost:8000'

export const handlers = [
  // Auth endpoints
  rest.post(`${API_BASE_URL}/auth/login`, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        user: {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          role: 'user',
        },
        token: 'mock-jwt-token',
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
      })
    )
  }),

  rest.post(`${API_BASE_URL}/auth/register`, (req, res, ctx) => {
    return res(
      ctx.status(201),
      ctx.json({
        user: {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          role: 'user',
        },
        token: 'mock-jwt-token',
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
      })
    )
  }),

  rest.post(`${API_BASE_URL}/auth/logout`, (req, res, ctx) => {
    return res(ctx.status(200), ctx.json({ success: true }))
  }),

  rest.get(`${API_BASE_URL}/auth/me`, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'user',
        preferences: {
          theme: 'light',
          language: 'en',
        },
      })
    )
  }),

  // Chat endpoints
  rest.post(`${API_BASE_URL}/chat/messages`, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        id: 'msg-123',
        content: 'Mock AI response based on your query.',
        role: 'assistant',
        timestamp: new Date().toISOString(),
        citations: [
          {
            id: '1',
            title: 'Mock Case v. Example',
            source: '123 F.3d 456 (9th Cir. 2023)',
            snippet: 'This case demonstrates the legal principle...',
            relevance: 0.95,
            type: 'case',
          },
        ],
      })
    )
  }),

  rest.get(`${API_BASE_URL}/chat/conversations`, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        conversations: [
          {
            id: 'conv-1',
            title: 'Contract Law Discussion',
            userId: 'user-123',
            messages: [],
            lastActivity: new Date().toISOString(),
            tags: ['contracts', 'business'],
            isArchived: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        total: 1,
        page: 1,
        limit: 10,
      })
    )
  }),

  rest.get(`${API_BASE_URL}/chat/conversations/:id`, (req, res, ctx) => {
    const { id } = req.params
    return res(
      ctx.status(200),
      ctx.json({
        id,
        title: 'Contract Law Discussion',
        userId: 'user-123',
        messages: [
          {
            id: 'msg-1',
            content: 'What are the elements of a valid contract?',
            role: 'user',
            timestamp: new Date().toISOString(),
            userId: 'user-123',
            conversationId: id,
          },
        ],
        lastActivity: new Date().toISOString(),
        tags: ['contracts'],
        isArchived: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
    )
  }),

  rest.post(`${API_BASE_URL}/chat/conversations`, (req, res, ctx) => {
    return res(
      ctx.status(201),
      ctx.json({
        id: 'conv-new',
        title: 'New Conversation',
        userId: 'user-123',
        messages: [],
        lastActivity: new Date().toISOString(),
        tags: [],
        isArchived: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
    )
  }),

  rest.delete(`${API_BASE_URL}/chat/conversations/:id`, (req, res, ctx) => {
    return res(ctx.status(200), ctx.json({ success: true }))
  }),

  // Research endpoints
  rest.post(`${API_BASE_URL}/research/search/cases`, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        results: [
          {
            id: 'case-1',
            title: 'Landmark Case v. Important Decision',
            citation: '123 F.3d 456 (Supreme Court 2023)',
            snippet: 'This landmark decision established that...',
            relevance: 0.95,
            court: 'Supreme Court',
            date: '2023-01-15',
            jurisdiction: 'Federal',
          },
          {
            id: 'case-2',
            title: 'Recent Case v. Similar Facts',
            citation: '456 F.3d 789 (9th Cir. 2023)',
            snippet: 'In this recent decision, the court held...',
            relevance: 0.88,
            court: '9th Circuit',
            date: '2023-03-20',
            jurisdiction: 'Federal',
          },
        ],
        total: 2,
        searchTime: 245,
        query: req.body,
      })
    )
  }),

  rest.post(`${API_BASE_URL}/research/search/statutes`, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        results: [
          {
            id: 'statute-1',
            title: 'Civil Rights Act',
            citation: '42 U.S.C. § 1983',
            snippet: 'Every person who, under color of any statute...',
            relevance: 0.92,
            jurisdiction: 'Federal',
            effectiveDate: '1871-04-20',
          },
        ],
        total: 1,
        searchTime: 180,
        query: req.body,
      })
    )
  }),

  rest.post(`${API_BASE_URL}/research/search/regulations`, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        results: [
          {
            id: 'reg-1',
            title: 'Family and Medical Leave Act Regulations',
            citation: '29 C.F.R. § 825.100',
            snippet: 'The Family and Medical Leave Act entitles...',
            relevance: 0.89,
            agency: 'Department of Labor',
            effectiveDate: '1993-02-05',
          },
        ],
        total: 1,
        searchTime: 200,
        query: req.body,
      })
    )
  }),

  // Document endpoints
  rest.post(`${API_BASE_URL}/documents/upload`, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        id: 'doc-123',
        name: 'uploaded-document.pdf',
        size: 1024000,
        type: 'application/pdf',
        uploadedAt: new Date().toISOString(),
        processedAt: new Date().toISOString(),
        status: 'processed',
      })
    )
  }),

  rest.get(`${API_BASE_URL}/documents`, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        documents: [
          {
            id: 'doc-1',
            name: 'contract.pdf',
            size: 512000,
            type: 'application/pdf',
            uploadedAt: new Date().toISOString(),
            processedAt: new Date().toISOString(),
            status: 'processed',
          },
        ],
        total: 1,
        page: 1,
        limit: 10,
      })
    )
  }),

  rest.delete(`${API_BASE_URL}/documents/:id`, (req, res, ctx) => {
    return res(ctx.status(200), ctx.json({ success: true }))
  }),

  // Error cases
  rest.get(`${API_BASE_URL}/error/500`, (req, res, ctx) => {
    return res(
      ctx.status(500),
      ctx.json({
        error: 'Internal Server Error',
        message: 'Something went wrong on our end.',
      })
    )
  }),

  rest.get(`${API_BASE_URL}/error/404`, (req, res, ctx) => {
    return res(
      ctx.status(404),
      ctx.json({
        error: 'Not Found',
        message: 'The requested resource was not found.',
      })
    )
  }),

  rest.post(`${API_BASE_URL}/auth/login-error`, (req, res, ctx) => {
    return res(
      ctx.status(401),
      ctx.json({
        error: 'Unauthorized',
        message: 'Invalid credentials provided.',
      })
    )
  }),
]

// Network error simulation
export const networkErrorHandlers = [
  rest.get(`${API_BASE_URL}/network-error`, (req, res) => {
    return res.networkError('Network connection failed')
  }),
]