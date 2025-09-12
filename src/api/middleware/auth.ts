// Authentication and authorization middleware
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ApiError } from '../types/api';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: 'attorney' | 'paralegal' | 'admin';
    firm?: string;
  };
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  firm?: string;
  iat: number;
  exp: number;
}

/**
 * JWT Authentication middleware
 * Validates Bearer token and adds user info to request
 */
export const authenticateToken = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    const error: ApiError = {
      code: 'UNAUTHORIZED',
      message: 'Access token required',
      timestamp: new Date().toISOString(),
      path: req.path,
      method: req.method
    };
    res.status(401).json({ error });
    return;
  }

  try {
    const secret = process.env.JWT_SECRET || 'your-secret-key';
    const decoded = jwt.verify(token, secret) as JWTPayload;
    
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role as 'attorney' | 'paralegal' | 'admin',
      firm: decoded.firm
    };
    
    next();
  } catch (error) {
    const apiError: ApiError = {
      code: 'INVALID_TOKEN',
      message: 'Invalid or expired token',
      timestamp: new Date().toISOString(),
      path: req.path,
      method: req.method
    };
    res.status(401).json({ error: apiError });
  }
};

/**
 * Role-based authorization middleware
 * Restricts access based on user role
 */
export const requireRole = (roles: Array<'attorney' | 'paralegal' | 'admin'>) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      const error: ApiError = {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
        timestamp: new Date().toISOString(),
        path: req.path,
        method: req.method
      };
      res.status(401).json({ error });
      return;
    }

    if (!roles.includes(req.user.role)) {
      const error: ApiError = {
        code: 'FORBIDDEN',
        message: `Access denied. Required roles: ${roles.join(', ')}`,
        timestamp: new Date().toISOString(),
        path: req.path,
        method: req.method
      };
      res.status(403).json({ error });
      return;
    }

    next();
  };
};

/**
 * Optional authentication middleware
 * Adds user info if token is present but doesn't require it
 */
export const optionalAuth = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    next();
    return;
  }

  try {
    const secret = process.env.JWT_SECRET || 'your-secret-key';
    const decoded = jwt.verify(token, secret) as JWTPayload;
    
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role as 'attorney' | 'paralegal' | 'admin',
      firm: decoded.firm
    };
  } catch (error) {
    // Continue without user info if token is invalid
  }

  next();
};

/**
 * Generate JWT token
 */
export const generateToken = (payload: Omit<JWTPayload, 'iat' | 'exp'>): string => {
  const secret = process.env.JWT_SECRET || 'your-secret-key';
  const expiresIn = process.env.JWT_EXPIRES_IN || '24h';
  
  return jwt.sign(payload, secret, { expiresIn });
};

/**
 * Generate refresh token
 */
export const generateRefreshToken = (userId: string): string => {
  const secret = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key';
  const expiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
  
  return jwt.sign({ userId }, secret, { expiresIn });
};

/**
 * Verify refresh token
 */
export const verifyRefreshToken = (token: string): { userId: string } => {
  const secret = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key';
  return jwt.verify(token, secret) as { userId: string };
};

/**
 * API Key authentication middleware
 * Alternative authentication method for programmatic access
 */
export const authenticateApiKey = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const apiKey = req.headers['x-api-key'] as string;

  if (!apiKey) {
    const error: ApiError = {
      code: 'UNAUTHORIZED',
      message: 'API key required',
      timestamp: new Date().toISOString(),
      path: req.path,
      method: req.method
    };
    res.status(401).json({ error });
    return;
  }

  // In production, validate against database
  // For demo purposes, using environment variable
  if (apiKey !== process.env.VALID_API_KEY) {
    const error: ApiError = {
      code: 'INVALID_API_KEY',
      message: 'Invalid API key',
      timestamp: new Date().toISOString(),
      path: req.path,
      method: req.method
    };
    res.status(401).json({ error });
    return;
  }

  // Set a default user for API key requests
  req.user = {
    id: 'api-user',
    email: 'api@bear-ai.com',
    role: 'admin' // API keys typically have admin access
  };

  next();
};

/**
 * Permission-based authorization
 * More granular permission checking
 */
export const requirePermission = (permission: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      const error: ApiError = {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
        timestamp: new Date().toISOString(),
        path: req.path,
        method: req.method
      };
      res.status(401).json({ error });
      return;
    }

    // Permission mapping based on role
    const rolePermissions: Record<string, string[]> = {
      admin: ['*'], // Admin has all permissions
      attorney: [
        'documents:read',
        'documents:write',
        'documents:delete',
        'chat:read',
        'chat:write',
        'research:read',
        'analysis:read',
        'analysis:write'
      ],
      paralegal: [
        'documents:read',
        'documents:write',
        'chat:read',
        'chat:write',
        'research:read',
        'analysis:read'
      ]
    };

    const userPermissions = rolePermissions[req.user.role] || [];
    
    if (!userPermissions.includes('*') && !userPermissions.includes(permission)) {
      const error: ApiError = {
        code: 'FORBIDDEN',
        message: `Permission '${permission}' required`,
        timestamp: new Date().toISOString(),
        path: req.path,
        method: req.method
      };
      res.status(403).json({ error });
      return;
    }

    next();
  };
};