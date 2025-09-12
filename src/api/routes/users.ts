// User management routes
import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { updateProfileValidation } from '../middleware/validation';
import { successResponse, asyncHandler } from '../middleware/errorHandler';

export const userRoutes = Router();

// All user routes require authentication
userRoutes.use(authenticateToken);

/**
 * @swagger
 * /users/profile:
 *   get:
 *     tags: [Users]
 *     summary: Get user profile
 *     description: Get the authenticated user's profile
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
userRoutes.get('/profile',
  asyncHandler(async (req, res) => {
    const user = (req as any).user;
    
    // In production, fetch full user data from database
    const userProfile = {
      id: user.id,
      name: user.email === 'attorney@lawfirm.com' ? 'John Attorney' : 'Jane Paralegal',
      email: user.email,
      role: user.role,
      firm: user.firm,
      avatar: null,
      preferences: {
        theme: 'light',
        notifications: {
          email: true,
          push: false,
          analysis: true
        },
        defaultAnalysisType: 'summary'
      },
      statistics: {
        documentsUploaded: 42,
        analysesPerformed: 87,
        searchesExecuted: 156,
        chatSessions: 23
      },
      createdAt: '2023-01-15T10:30:00Z',
      lastLoginAt: new Date().toISOString()
    };
    
    successResponse(res, userProfile);
  })
);

/**
 * @swagger
 * /users/profile:
 *   put:
 *     tags: [Users]
 *     summary: Update user profile
 *     description: Update the authenticated user's profile
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               avatar:
 *                 type: string
 *                 format: uri
 *               firm:
 *                 type: string
 *               preferences:
 *                 type: object
 *     responses:
 *       200:
 *         description: User profile updated successfully
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       422:
 *         $ref: '#/components/responses/ValidationError'
 */
userRoutes.put('/profile',
  updateProfileValidation,
  asyncHandler(async (req, res) => {
    const user = (req as any).user;
    const updates = req.body;
    
    // In production, update user in database
    const updatedProfile = {
      id: user.id,
      name: updates.name || (user.email === 'attorney@lawfirm.com' ? 'John Attorney' : 'Jane Paralegal'),
      email: user.email,
      role: user.role,
      firm: updates.firm || user.firm,
      avatar: updates.avatar || null,
      preferences: {
        theme: updates.preferences?.theme || 'light',
        notifications: {
          email: updates.preferences?.notifications?.email ?? true,
          push: updates.preferences?.notifications?.push ?? false,
          analysis: updates.preferences?.notifications?.analysis ?? true
        },
        defaultAnalysisType: updates.preferences?.defaultAnalysisType || 'summary'
      },
      updatedAt: new Date().toISOString()
    };
    
    successResponse(res, updatedProfile);
  })
);

export { userRoutes as users };