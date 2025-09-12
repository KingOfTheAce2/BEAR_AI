// Main API routes configuration
import { Router } from 'express';
import { authRoutes } from './auth';
import { chatRoutes } from './chat';
import { documentRoutes } from './documents';
import { researchRoutes } from './research';
import { analysisRoutes } from './analysis';
import { userRoutes } from './users';
import { systemRoutes } from './system';
import { webhookRoutes } from './webhooks';

// Middleware
import { generalRateLimit } from '../middleware/rateLimit';
import { sanitizeInput } from '../middleware/validation';
import { errorHandler, notFoundHandler } from '../middleware/errorHandler';

/**
 * Main API router configuration
 */
export function createApiRouter(): Router {
  const router = Router();

  // Global middleware
  router.use(sanitizeInput);
  router.use(generalRateLimit);

  // API versioning
  const v1Router = Router();

  // Mount route modules
  v1Router.use('/auth', authRoutes);
  v1Router.use('/chat', chatRoutes);
  v1Router.use('/documents', documentRoutes);
  v1Router.use('/research', researchRoutes);
  v1Router.use('/analysis', analysisRoutes);
  v1Router.use('/users', userRoutes);
  v1Router.use('/system', systemRoutes);
  v1Router.use('/webhooks', webhookRoutes);

  // Mount v1 routes
  router.use('/v1', v1Router);

  // Default version redirect
  router.use('/', v1Router);

  // 404 handler for undefined routes
  router.use('*', notFoundHandler);

  // Global error handler
  router.use(errorHandler);

  return router;
}

/**
 * API route documentation
 */
export const API_ROUTES = {
  v1: {
    auth: {
      login: 'POST /auth/login',
      refresh: 'POST /auth/refresh',
      logout: 'POST /auth/logout'
    },
    chat: {
      sessions: 'GET /chat/sessions',
      createSession: 'POST /chat/sessions',
      getSession: 'GET /chat/sessions/:sessionId',
      deleteSession: 'DELETE /chat/sessions/:sessionId',
      sendMessage: 'POST /chat/sessions/:sessionId/messages'
    },
    documents: {
      list: 'GET /documents',
      upload: 'POST /documents',
      get: 'GET /documents/:documentId',
      update: 'PUT /documents/:documentId',
      delete: 'DELETE /documents/:documentId',
      download: 'GET /documents/:documentId/download'
    },
    research: {
      search: 'POST /research/search'
    },
    analysis: {
      analyze: 'POST /analysis/documents/:documentId'
    },
    users: {
      profile: 'GET /users/profile',
      updateProfile: 'PUT /users/profile'
    },
    system: {
      health: 'GET /system/health',
      status: 'GET /system/status'
    },
    webhooks: {
      create: 'POST /webhooks',
      list: 'GET /webhooks',
      update: 'PUT /webhooks/:webhookId',
      delete: 'DELETE /webhooks/:webhookId'
    }
  }
};