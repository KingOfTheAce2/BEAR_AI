// Request validation middleware
import { Request, Response, NextFunction } from 'express';
import { ApiError } from '@/api/types/api';

interface ValidationRule {
  field: string;
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'email' | 'url' | 'date';
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  enum?: any[];
  custom?: (value: any) => boolean | string;
}

interface ValidationSchema {
  body?: ValidationRule[];
  query?: ValidationRule[];
  params?: ValidationRule[];
  headers?: ValidationRule[];
}

interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

/**
 * Validate a single value against a rule
 */
const validateValue = (value: any, rule: ValidationRule): ValidationError | null => {
  const { field, required, type, minLength, maxLength, min, max, pattern, enum: enumValues, custom } = rule;

  // Check if required
  if (required && (value === undefined || value === null || value === '')) {
    return { field, message: `${field} is required` };
  }

  // Skip further validation if value is not provided and not required
  if (!required && (value === undefined || value === null)) {
    return null;
  }

  // Type validation
  if (type) {
    switch (type) {
      case 'string':
        if (typeof value !== 'string') {
          return { field, message: `${field} must be a string`, value };
        }
        break;
      case 'number':
        if (typeof value !== 'number' && isNaN(Number(value))) {
          return { field, message: `${field} must be a number`, value };
        }
        value = Number(value);
        break;
      case 'boolean':
        if (typeof value !== 'boolean' && value !== 'true' && value !== 'false') {
          return { field, message: `${field} must be a boolean`, value };
        }
        value = value === true || value === 'true';
        break;
      case 'array':
        if (!Array.isArray(value)) {
          return { field, message: `${field} must be an array`, value };
        }
        break;
      case 'object':
        if (typeof value !== 'object' || Array.isArray(value)) {
          return { field, message: `${field} must be an object`, value };
        }
        break;
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          return { field, message: `${field} must be a valid email address`, value };
        }
        break;
      case 'url':
        try {
          new URL(value);
        } catch {
          return { field, message: `${field} must be a valid URL`, value };
        }
        break;
      case 'date':
        if (isNaN(Date.parse(value))) {
          return { field, message: `${field} must be a valid date`, value };
        }
        break;
    }
  }

  // String length validation
  if (typeof value === 'string') {
    if (minLength && value.length < minLength) {
      return { field, message: `${field} must be at least ${minLength} characters long`, value };
    }
    if (maxLength && value.length > maxLength) {
      return { field, message: `${field} must be no more than ${maxLength} characters long`, value };
    }
  }

  // Number range validation
  if (typeof value === 'number') {
    if (min !== undefined && value < min) {
      return { field, message: `${field} must be at least ${min}`, value };
    }
    if (max !== undefined && value > max) {
      return { field, message: `${field} must be no more than ${max}`, value };
    }
  }

  // Array length validation
  if (Array.isArray(value)) {
    if (minLength && value.length < minLength) {
      return { field, message: `${field} must have at least ${minLength} items`, value };
    }
    if (maxLength && value.length > maxLength) {
      return { field, message: `${field} must have no more than ${maxLength} items`, value };
    }
  }

  // Pattern validation
  if (pattern && typeof value === 'string' && !pattern.test(value)) {
    return { field, message: `${field} format is invalid`, value };
  }

  // Enum validation
  if (enumValues && !enumValues.includes(value)) {
    return { field, message: `${field} must be one of: ${enumValues.join(', ')}`, value };
  }

  // Custom validation
  if (custom) {
    const result = custom(value);
    if (result !== true) {
      return { field, message: typeof result === 'string' ? result : `${field} validation failed`, value };
    }
  }

  return null;
};

/**
 * Validate request data against schema
 */
const validateRequest = (req: Request, schema: ValidationSchema): ValidationError[] => {
  const errors: ValidationError[] = [];

  // Validate body
  if (schema.body) {
    for (const rule of schema.body) {
      const value = req.body?.[rule.field];
      const error = validateValue(value, rule);
      if (error) errors.push(error);
    }
  }

  // Validate query parameters
  if (schema.query) {
    for (const rule of schema.query) {
      const value = req.query?.[rule.field];
      const error = validateValue(value, rule);
      if (error) errors.push(error);
    }
  }

  // Validate route parameters
  if (schema.params) {
    for (const rule of schema.params) {
      const value = req.params?.[rule.field];
      const error = validateValue(value, rule);
      if (error) errors.push(error);
    }
  }

  // Validate headers
  if (schema.headers) {
    for (const rule of schema.headers) {
      const value = req.headers[rule.field.toLowerCase()];
      const error = validateValue(value, rule);
      if (error) errors.push(error);
    }
  }

  return errors;
};

/**
 * Create validation middleware
 */
export const validate = (schema: ValidationSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const errors = validateRequest(req, schema);

    if (errors.length > 0) {
      const error: ApiError = {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        timestamp: new Date().toISOString(),
        path: req.path,
        method: req.method,
        details: { fields: errors }
      };
      res.status(422).json({ error });
      return;
    }

    next();
  };
};

/**
 * Pre-defined validation schemas
 */

// Authentication validation
export const loginValidation = validate({
  body: [
    { field: 'email', required: true, type: 'email', maxLength: 254 },
    { field: 'password', required: true, type: 'string', minLength: 8, maxLength: 128 }
  ]
});

export const refreshTokenValidation = validate({
  body: [
    { field: 'refreshToken', required: true, type: 'string' }
  ]
});

// Chat validation
export const createChatValidation = validate({
  body: [
    { field: 'title', required: true, type: 'string', minLength: 1, maxLength: 100 },
    { field: 'category', required: false, type: 'string', enum: ['research', 'analysis', 'drafting', 'review'] },
    { field: 'tags', required: false, type: 'array', maxLength: 10 }
  ]
});

export const sendMessageValidation = validate({
  params: [
    { field: 'sessionId', required: true, type: 'string' }
  ],
  body: [
    { field: 'content', required: true, type: 'string', minLength: 1, maxLength: 10000 },
    { field: 'type', required: false, type: 'string', enum: ['text', 'document', 'analysis', 'citation'] },
    { field: 'documentRefs', required: false, type: 'array', maxLength: 10 }
  ]
});

// Document validation
export const updateDocumentValidation = validate({
  params: [
    { field: 'documentId', required: true, type: 'string' }
  ],
  body: [
    { field: 'name', required: false, type: 'string', minLength: 1, maxLength: 255 },
    { field: 'tags', required: false, type: 'array', maxLength: 20 },
    { field: 'category', required: false, type: 'string', enum: ['contract', 'brief', 'research', 'evidence', 'correspondence', 'other'] }
  ]
});

// Search validation
export const searchValidation = validate({
  body: [
    { field: 'query', required: true, type: 'string', minLength: 1, maxLength: 500 },
    { field: 'limit', required: false, type: 'number', min: 1, max: 100 },
    { field: 'offset', required: false, type: 'number', min: 0 }
  ]
});

// Analysis validation
export const analysisValidation = validate({
  params: [
    { field: 'documentId', required: true, type: 'string' }
  ],
  body: [
    { field: 'type', required: true, type: 'string', enum: ['summary', 'risk_assessment', 'clause_extraction', 'compliance_check'] },
    { field: 'options', required: false, type: 'object' }
  ]
});

// User profile validation
export const updateProfileValidation = validate({
  body: [
    { field: 'name', required: false, type: 'string', minLength: 1, maxLength: 100 },
    { field: 'avatar', required: false, type: 'url' },
    { field: 'firm', required: false, type: 'string', maxLength: 200 }
  ]
});

// Query parameter validation
export const paginationValidation = validate({
  query: [
    { field: 'limit', required: false, type: 'number', min: 1, max: 100 },
    { field: 'offset', required: false, type: 'number', min: 0 },
    { field: 'page', required: false, type: 'number', min: 1 }
  ]
});

export const listDocumentsValidation = validate({
  query: [
    { field: 'limit', required: false, type: 'number', min: 1, max: 100 },
    { field: 'offset', required: false, type: 'number', min: 0 },
    { field: 'category', required: false, type: 'string', enum: ['contract', 'brief', 'research', 'evidence', 'correspondence', 'other'] },
    { field: 'status', required: false, type: 'string', enum: ['uploading', 'processing', 'ready', 'error'] },
    { field: 'search', required: false, type: 'string', maxLength: 100 }
  ]
});

/**
 * File upload validation
 */
export const validateFileUpload = (options: {
  maxSize?: number;
  allowedTypes?: string[];
  required?: boolean;
}) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { maxSize = 50 * 1024 * 1024, allowedTypes = ['pdf', 'docx', 'txt'], required = true } = options;

    if (!req.file && required) {
      const error: ApiError = {
        code: 'VALIDATION_ERROR',
        message: 'File is required',
        timestamp: new Date().toISOString(),
        path: req.path,
        method: req.method
      };
      res.status(422).json({ error });
      return;
    }

    if (req.file) {
      // Check file size
      if (req.file.size > maxSize) {
        const error: ApiError = {
          code: 'PAYLOAD_TOO_LARGE',
          message: `File size exceeds maximum limit of ${maxSize / (1024 * 1024)}MB`,
          timestamp: new Date().toISOString(),
          path: req.path,
          method: req.method
        };
        res.status(413).json({ error });
        return;
      }

      // Check file type
      const fileExtension = req.file.originalname.split('.').pop()?.toLowerCase();
      if (fileExtension && !allowedTypes.includes(fileExtension)) {
        const error: ApiError = {
          code: 'UNSUPPORTED_MEDIA_TYPE',
          message: `File type not supported. Allowed types: ${allowedTypes.join(', ')}`,
          timestamp: new Date().toISOString(),
          path: req.path,
          method: req.method
        };
        res.status(415).json({ error });
        return;
      }
    }

    next();
  };
};

/**
 * Sanitization middleware
 */
export const sanitizeInput = (req: Request, res: Response, next: NextFunction): void => {
  // Recursively sanitize strings in the request
  const sanitizeObject = (obj: any): any => {
    if (typeof obj === 'string') {
      // Remove potential XSS attacks
      return obj
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '');
    }
    
    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }
    
    if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const key in obj) {
        sanitized[key] = sanitizeObject(obj[key]);
      }
      return sanitized;
    }
    
    return obj;
  };

  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }

  next();
};