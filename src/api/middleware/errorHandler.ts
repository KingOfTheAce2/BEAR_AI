// Comprehensive error handling middleware
import { Request, Response, NextFunction } from 'express';
import { ApiError } from '@/api/types/api';

/**
 * HTTP status codes mapping
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  PAYLOAD_TOO_LARGE: 413,
  UNSUPPORTED_MEDIA_TYPE: 415,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504
} as const;

/**
 * Error code to HTTP status mapping
 */
const ERROR_STATUS_MAP: Record<string, number> = {
  // Authentication errors
  UNAUTHORIZED: HTTP_STATUS.UNAUTHORIZED,
  INVALID_TOKEN: HTTP_STATUS.UNAUTHORIZED,
  TOKEN_EXPIRED: HTTP_STATUS.UNAUTHORIZED,
  INVALID_CREDENTIALS: HTTP_STATUS.UNAUTHORIZED,
  
  // Authorization errors
  FORBIDDEN: HTTP_STATUS.FORBIDDEN,
  INSUFFICIENT_PERMISSIONS: HTTP_STATUS.FORBIDDEN,
  
  // Validation errors
  VALIDATION_ERROR: HTTP_STATUS.UNPROCESSABLE_ENTITY,
  INVALID_INPUT: HTTP_STATUS.BAD_REQUEST,
  MISSING_REQUIRED_FIELD: HTTP_STATUS.BAD_REQUEST,
  
  // Resource errors
  NOT_FOUND: HTTP_STATUS.NOT_FOUND,
  RESOURCE_NOT_FOUND: HTTP_STATUS.NOT_FOUND,
  USER_NOT_FOUND: HTTP_STATUS.NOT_FOUND,
  DOCUMENT_NOT_FOUND: HTTP_STATUS.NOT_FOUND,
  SESSION_NOT_FOUND: HTTP_STATUS.NOT_FOUND,
  
  // Conflict errors
  CONFLICT: HTTP_STATUS.CONFLICT,
  RESOURCE_EXISTS: HTTP_STATUS.CONFLICT,
  EMAIL_ALREADY_EXISTS: HTTP_STATUS.CONFLICT,
  
  // Rate limiting
  RATE_LIMIT_EXCEEDED: HTTP_STATUS.TOO_MANY_REQUESTS,
  
  // File upload errors
  PAYLOAD_TOO_LARGE: HTTP_STATUS.PAYLOAD_TOO_LARGE,
  FILE_TOO_LARGE: HTTP_STATUS.PAYLOAD_TOO_LARGE,
  UNSUPPORTED_MEDIA_TYPE: HTTP_STATUS.UNSUPPORTED_MEDIA_TYPE,
  INVALID_FILE_TYPE: HTTP_STATUS.UNSUPPORTED_MEDIA_TYPE,
  
  // Business logic errors
  INSUFFICIENT_BALANCE: HTTP_STATUS.BAD_REQUEST,
  OPERATION_NOT_ALLOWED: HTTP_STATUS.BAD_REQUEST,
  QUOTA_EXCEEDED: HTTP_STATUS.BAD_REQUEST,
  
  // System errors
  INTERNAL_ERROR: HTTP_STATUS.INTERNAL_SERVER_ERROR,
  DATABASE_ERROR: HTTP_STATUS.INTERNAL_SERVER_ERROR,
  EXTERNAL_SERVICE_ERROR: HTTP_STATUS.BAD_GATEWAY,
  SERVICE_UNAVAILABLE: HTTP_STATUS.SERVICE_UNAVAILABLE,
  TIMEOUT: HTTP_STATUS.GATEWAY_TIMEOUT,
  
  // Default
  UNKNOWN_ERROR: HTTP_STATUS.INTERNAL_SERVER_ERROR
};

/**
 * Create standardized API error
 */
export function createApiError(
  code: string,
  message: string,
  details?: Record<string, any>,
  path?: string,
  method?: string
): ApiError {
  return {
    code,
    message,
    details,
    timestamp: new Date().toISOString(),
    path,
    method
  };
}

/**
 * Get HTTP status code for error code
 */
export function getStatusCode(errorCode: string): number {
  return ERROR_STATUS_MAP[errorCode] || HTTP_STATUS.INTERNAL_SERVER_ERROR;
}

/**
 * Enhanced error handling middleware
 */
export function errorHandler(
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // If response is already sent, delegate to default Express error handler
  if (res.headersSent) {
    return next(error);
  }

  let apiError: ApiError;
  let statusCode: number;

  // Handle different types of errors
  if (error.code && error.message) {
    // Already an ApiError
    apiError = error;
    statusCode = getStatusCode(error.code);
  } else if (error.name === 'ValidationError') {
    // Mongoose validation error
    apiError = createApiError(
      'VALIDATION_ERROR',
      'Validation failed',
      {
        fields: Object.keys(error.errors).map(field => ({
          field,
          message: error.errors[field].message
        }))
      },
      req.path,
      req.method
    );
    statusCode = HTTP_STATUS.UNPROCESSABLE_ENTITY;
  } else if (error.name === 'MongoError' && error.code === 11000) {
    // MongoDB duplicate key error
    const field = Object.keys(error.keyPattern)[0];
    apiError = createApiError(
      'RESOURCE_EXISTS',
      `${field} already exists`,
      { field, value: error.keyValue[field] },
      req.path,
      req.method
    );
    statusCode = HTTP_STATUS.CONFLICT;
  } else if (error.name === 'CastError') {
    // MongoDB cast error (invalid ObjectId)
    apiError = createApiError(
      'INVALID_INPUT',
      `Invalid ${error.path}: ${error.value}`,
      { path: error.path, value: error.value },
      req.path,
      req.method
    );
    statusCode = HTTP_STATUS.BAD_REQUEST;
  } else if (error.name === 'JsonWebTokenError') {
    // JWT errors
    apiError = createApiError(
      'INVALID_TOKEN',
      'Invalid token',
      undefined,
      req.path,
      req.method
    );
    statusCode = HTTP_STATUS.UNAUTHORIZED;
  } else if (error.name === 'TokenExpiredError') {
    // JWT expired
    apiError = createApiError(
      'TOKEN_EXPIRED',
      'Token has expired',
      undefined,
      req.path,
      req.method
    );
    statusCode = HTTP_STATUS.UNAUTHORIZED;
  } else if (error.type === 'entity.too.large') {
    // Body parser payload too large
    apiError = createApiError(
      'PAYLOAD_TOO_LARGE',
      'Request payload too large',
      { limit: error.limit },
      req.path,
      req.method
    );
    statusCode = HTTP_STATUS.PAYLOAD_TOO_LARGE;
  } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
    // Network/connection errors
    apiError = createApiError(
      'EXTERNAL_SERVICE_ERROR',
      'External service unavailable',
      { originalError: error.message },
      req.path,
      req.method
    );
    statusCode = HTTP_STATUS.BAD_GATEWAY;
  } else if (error.code === 'ETIMEDOUT') {
    // Timeout errors
    apiError = createApiError(
      'TIMEOUT',
      'Request timeout',
      { timeout: error.timeout },
      req.path,
      req.method
    );
    statusCode = HTTP_STATUS.GATEWAY_TIMEOUT;
  } else {
    // Unknown error
    apiError = createApiError(
      'INTERNAL_ERROR',
      'An unexpected error occurred',
      process.env.NODE_ENV === 'development' ? { 
        originalError: error.message,
        stack: error.stack 
      } : undefined,
      req.path,
      req.method
    );
    statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR;
  }

  // Log error (in production, use proper logging service)
  logError(error, req, apiError);

  // Send error response
  res.status(statusCode).json({ error: apiError });
}

/**
 * Log error details
 */
function logError(originalError: any, req: Request, apiError: ApiError): void {
  const logData = {
    timestamp: apiError.timestamp,
    method: req.method,
    path: req.path,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    userId: (req as any).user?.id,
    error: {
      code: apiError.code,
      message: apiError.message,
      details: apiError.details
    },
    originalError: {
      name: originalError.name,
      message: originalError.message,
      stack: originalError.stack
    }
  };

  // In production, send to logging service (e.g., Winston, Sentry)
  if (process.env.NODE_ENV === 'production') {
    console.error('API Error:', JSON.stringify(logData, null, 2));
    // Example: sentry.captureException(originalError, { extra: logData });
  } else {
    console.error('API Error:', logData);
  }
}

/**
 * Not found handler for undefined routes
 */
export function notFoundHandler(req: Request, res: Response): void {
  const error = createApiError(
    'NOT_FOUND',
    `Route ${req.method} ${req.path} not found`,
    {
      availableRoutes: [
        'GET /api/v1/system/health',
        'POST /api/v1/auth/login',
        'GET /api/v1/chat/sessions',
        'GET /api/v1/documents',
        'POST /api/v1/research/search'
      ]
    },
    req.path,
    req.method
  );

  res.status(HTTP_STATUS.NOT_FOUND).json({ error });
}

/**
 * Async error wrapper for route handlers
 */
export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Custom error classes for specific scenarios
 */
export class ValidationError extends Error {
  code = 'VALIDATION_ERROR';
  fields: Array<{ field: string; message: string }>;

  constructor(fields: Array<{ field: string; message: string }>) {
    super('Validation failed');
    this.name = 'ValidationError';
    this.fields = fields;
  }
}

export class NotFoundError extends Error {
  code = 'NOT_FOUND';
  resource: string;

  constructor(resource: string, id?: string) {
    super(`${resource}${id ? ` with id ${id}` : ''} not found`);
    this.name = 'NotFoundError';
    this.resource = resource;
  }
}

export class UnauthorizedError extends Error {
  code = 'UNAUTHORIZED';

  constructor(message = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends Error {
  code = 'FORBIDDEN';

  constructor(message = 'Forbidden') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class ConflictError extends Error {
  code = 'CONFLICT';
  resource: string;

  constructor(resource: string, message?: string) {
    super(message || `${resource} already exists`);
    this.name = 'ConflictError';
    this.resource = resource;
  }
}

export class RateLimitError extends Error {
  code = 'RATE_LIMIT_EXCEEDED';
  retryAfter: number;

  constructor(retryAfter: number, message = 'Rate limit exceeded') {
    super(message);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

/**
 * Success response helper
 */
export function successResponse<T>(
  res: Response,
  data: T,
  statusCode: number = HTTP_STATUS.OK,
  meta?: Record<string, any>
): void {
  const response: any = { data };
  
  if (meta) {
    response.meta = {
      timestamp: new Date().toISOString(),
      version: 'v1',
      ...meta
    };
  }

  res.status(statusCode).json(response);
}

/**
 * Created response helper
 */
export function createdResponse<T>(
  res: Response,
  data: T,
  meta?: Record<string, any>
): void {
  successResponse(res, data, HTTP_STATUS.CREATED, meta);
}

/**
 * No content response helper
 */
export function noContentResponse(res: Response): void {
  res.status(HTTP_STATUS.NO_CONTENT).send();
}

/**
 * Paginated response helper
 */
export function paginatedResponse<T>(
  res: Response,
  data: T[],
  total: number,
  page: number,
  limit: number,
  meta?: Record<string, any>
): void {
  const hasNext = (page * limit) < total;
  const hasPrev = page > 1;

  successResponse(res, data, HTTP_STATUS.OK, {
    pagination: {
      page,
      limit,
      total,
      hasNext,
      hasPrev,
      totalPages: Math.ceil(total / limit)
    },
    ...meta
  });
}

/**
 * Health check response helper
 */
export function healthResponse(
  res: Response,
  status: 'healthy' | 'unhealthy' | 'degraded',
  services: Record<string, string>,
  version: string
): void {
  const statusCode = status === 'healthy' ? HTTP_STATUS.OK : HTTP_STATUS.SERVICE_UNAVAILABLE;
  
  res.status(statusCode).json({
    status,
    timestamp: new Date().toISOString(),
    services,
    version
  });
}