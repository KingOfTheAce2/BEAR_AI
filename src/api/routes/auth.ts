// Authentication routes
import { Router } from 'express';
import { 
  authenticateToken, 
  generateToken, 
  generateRefreshToken,
  verifyRefreshToken 
} from '../middleware/auth';
import { 
  loginValidation, 
  refreshTokenValidation 
} from '../middleware/validation';
import { authRateLimit } from '../middleware/rateLimit';
import { 
  successResponse, 
  asyncHandler,
  UnauthorizedError,
  ValidationError
} from '../middleware/errorHandler';

export const authRoutes = Router();

/**
 * @swagger
 * /auth/login:
 *   post:
 *     tags: [Authentication]
 *     summary: User login
 *     description: Authenticate user and return JWT tokens
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *           example:
 *             email: attorney@lawfirm.com
 *             password: securePassword123
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     token:
 *                       type: string
 *                     refreshToken:
 *                       type: string
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *                     expiresIn:
 *                       type: integer
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       422:
 *         $ref: '#/components/responses/ValidationError'
 */
authRoutes.post('/login', 
  authRateLimit,
  loginValidation,
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    // In production, validate against database
    // This is a demo implementation
    const validUsers = [
      {
        id: 'user_1',
        email: 'attorney@lawfirm.com',
        password: 'securePassword123',
        name: 'John Attorney',
        role: 'attorney',
        firm: 'Smith & Associates'
      },
      {
        id: 'user_2',
        email: 'paralegal@lawfirm.com',
        password: 'paralegalPass456',
        name: 'Jane Paralegal',
        role: 'paralegal',
        firm: 'Smith & Associates'
      }
    ];

    const user = validUsers.find(u => u.email === email && u.password === password);
    
    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Generate tokens
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      firm: user.firm
    });

    const refreshToken = generateRefreshToken(user.id);

    // Return user info without password
    const { password: _, ...userInfo } = user;

    successResponse(res, {
      token,
      refreshToken,
      user: userInfo,
      expiresIn: 24 * 60 * 60 // 24 hours in seconds
    });
  })
);

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     tags: [Authentication]
 *     summary: Refresh JWT token
 *     description: Get a new JWT token using refresh token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
authRoutes.post('/refresh',
  refreshTokenValidation,
  asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;

    try {
      const { userId } = verifyRefreshToken(refreshToken);

      // In production, fetch user from database
      const user = {
        id: userId,
        email: 'attorney@lawfirm.com',
        role: 'attorney',
        firm: 'Smith & Associates'
      };

      // Generate new tokens
      const newToken = generateToken({
        userId: user.id,
        email: user.email,
        role: user.role,
        firm: user.firm
      });

      const newRefreshToken = generateRefreshToken(user.id);

      successResponse(res, {
        token: newToken,
        refreshToken: newRefreshToken,
        expiresIn: 24 * 60 * 60
      });

    } catch (error) {
      throw new UnauthorizedError('Invalid refresh token');
    }
  })
);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     tags: [Authentication]
 *     summary: User logout
 *     description: Invalidate current JWT token
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
authRoutes.post('/logout',
  authenticateToken,
  asyncHandler(async (req, res) => {
    // In production, add token to blacklist
    // For demo, just return success message
    
    successResponse(res, {
      message: 'Logged out successfully'
    });
  })
);

/**
 * @swagger
 * /auth/verify:
 *   get:
 *     tags: [Authentication]
 *     summary: Verify token
 *     description: Verify if the current token is valid
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Token is valid
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
authRoutes.get('/verify',
  authenticateToken,
  asyncHandler(async (req, res) => {
    // If we reach here, token is valid
    successResponse(res, {
      valid: true,
      user: (req as any).user
    });
  })
);