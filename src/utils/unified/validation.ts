/**
 * Unified Validation System for BEAR AI
 * Comprehensive validation patterns for forms, data, and configurations
 */

import { BearError, ErrorCategory, ErrorSeverity } from './errorHandler';

// Base validation rule interface
export interface ValidationRule {
  name: string;
  validator: (value: any, context?: ValidationContext) => ValidationResult | Promise<ValidationResult>;
  message?: string;
  severity?: 'error' | 'warning' | 'info';
  optional?: boolean;
}

// Validation context for complex validations
export interface ValidationContext {
  field?: string;
  data?: Record<string, any>;
  user?: any;
  environment?: string;
  [key: string]: any;
}

// Validation result interface
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  value?: any; // Transformed/sanitized value
}

// Validation error interface
export interface ValidationError {
  field: string;
  code: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  value?: any;
  context?: Record<string, any>;
}

// Schema definition for object validation
export interface ValidationSchema {
  [field: string]: ValidationRule | ValidationRule[] | ValidationSchema;
}

// Field validation configuration
export interface FieldValidation {
  rules: ValidationRule[];
  required?: boolean;
  transform?: (value: any) => any;
  sanitize?: (value: any) => any;
}

export class ValidationService {
  private customValidators: Map<string, ValidationRule['validator']> = new Map();
  private schemas: Map<string, ValidationSchema> = new Map();

  constructor() {
    this.registerBuiltinValidators();
  }

  /**
   * Validate a single value against rules
   */
  async validateField(
    value: any,
    rules: ValidationRule | ValidationRule[],
    context?: ValidationContext
  ): Promise<ValidationResult> {
    const ruleArray = Array.isArray(rules) ? rules : [rules];
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    let transformedValue = value;

    for (const rule of ruleArray) {
      try {
        const result = await rule.validator(transformedValue, context);
        
        if (!result.isValid) {
          const errorList = rule.severity === 'warning' ? warnings : errors;
          errorList.push(...result.errors);
        } else if (result.value !== undefined) {
          transformedValue = result.value;
        }

        // Add warnings
        if (result.warnings) {
          warnings.push(...result.warnings);
        }
      } catch (error) {
        errors.push({
          field: context?.field || 'unknown',
          code: 'VALIDATION_ERROR',
          message: `Validation rule "${rule.name}" failed: ${error instanceof Error ? error.message : error}`,
          severity: 'error',
          value
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      value: transformedValue
    };
  }

  /**
   * Validate an object against a schema
   */
  async validateObject(
    data: Record<string, any>,
    schema: ValidationSchema | string,
    context?: ValidationContext
  ): Promise<ValidationResult> {
    const actualSchema = typeof schema === 'string' 
      ? this.schemas.get(schema)
      : schema;

    if (!actualSchema) {
      throw new BearError(
        `Schema not found: ${schema}`,
        'SCHEMA_NOT_FOUND',
        ErrorCategory.VALIDATION,
        ErrorSeverity.HIGH
      );
    }

    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    const validatedData: Record<string, any> = {};

    for (const [field, fieldRules] of Object.entries(actualSchema)) {
      const fieldContext = { ...context, field, data };
      const fieldValue = data[field];

      // Handle nested objects
      if (this.isNestedSchema(fieldRules)) {
        if (fieldValue && typeof fieldValue === 'object') {
          const nestedResult = await this.validateObject(
            fieldValue,
            fieldRules as ValidationSchema,
            fieldContext
          );
          
          if (!nestedResult.isValid) {
            errors.push(...nestedResult.errors);
          }
          warnings.push(...nestedResult.warnings);
          validatedData[field] = nestedResult.value || fieldValue;
        }
        continue;
      }

      // Validate field
      const result = await this.validateField(fieldValue, fieldRules as ValidationRule | ValidationRule[], fieldContext);
      
      if (!result.isValid) {
        errors.push(...result.errors);
      }
      
      warnings.push(...result.warnings);
      validatedData[field] = result.value !== undefined ? result.value : fieldValue;
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      value: validatedData
    };
  }

  /**
   * Register a custom validator
   */
  registerValidator(name: string, validator: ValidationRule['validator']): void {
    this.customValidators.set(name, validator);
  }

  /**
   * Register a schema
   */
  registerSchema(name: string, schema: ValidationSchema): void {
    this.schemas.set(name, schema);
  }

  /**
   * Get registered schema
   */
  getSchema(name: string): ValidationSchema | undefined {
    return this.schemas.get(name);
  }

  // Built-in validators
  private registerBuiltinValidators(): void {
    // Required validator
    this.registerValidator('required', (value) => ({
      isValid: value !== null && value !== undefined && value !== '',
      errors: value === null || value === undefined || value === '' ? [{
        field: '',
        code: 'REQUIRED',
        message: 'This field is required',
        severity: 'error' as const,
        value
      }] : [],
      warnings: []
    }));

    // String validators
    this.registerValidator('string', (value) => ({
      isValid: typeof value === 'string',
      errors: typeof value !== 'string' ? [{
        field: '',
        code: 'INVALID_TYPE',
        message: 'Must be a string',
        severity: 'error' as const,
        value
      }] : [],
      warnings: []
    }));

    this.registerValidator('minLength', (value, context) => {
      const min = (context as any)?.min || 0;
      const isValid = typeof value === 'string' && value.length >= min;
      return {
        isValid,
        errors: !isValid ? [{
          field: '',
          code: 'MIN_LENGTH',
          message: `Must be at least ${min} characters`,
          severity: 'error' as const,
          value
        }] : [],
        warnings: []
      };
    });

    this.registerValidator('maxLength', (value, context) => {
      const max = (context as any)?.max || Infinity;
      const isValid = typeof value === 'string' && value.length <= max;
      return {
        isValid,
        errors: !isValid ? [{
          field: '',
          code: 'MAX_LENGTH',
          message: `Must be no more than ${max} characters`,
          severity: 'error' as const,
          value
        }] : [],
        warnings: []
      };
    });

    // Number validators
    this.registerValidator('number', (value) => ({
      isValid: typeof value === 'number' && !isNaN(value),
      errors: typeof value !== 'number' || isNaN(value) ? [{
        field: '',
        code: 'INVALID_TYPE',
        message: 'Must be a valid number',
        severity: 'error' as const,
        value
      }] : [],
      warnings: []
    }));

    this.registerValidator('integer', (value) => ({
      isValid: Number.isInteger(value),
      errors: !Number.isInteger(value) ? [{
        field: '',
        code: 'INVALID_TYPE',
        message: 'Must be an integer',
        severity: 'error' as const,
        value
      }] : [],
      warnings: []
    }));

    this.registerValidator('positive', (value) => ({
      isValid: typeof value === 'number' && value > 0,
      errors: typeof value !== 'number' || value <= 0 ? [{
        field: '',
        code: 'INVALID_VALUE',
        message: 'Must be a positive number',
        severity: 'error' as const,
        value
      }] : [],
      warnings: []
    }));

    // Email validator
    this.registerValidator('email', (value) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const isValid = typeof value === 'string' && emailRegex.test(value);
      return {
        isValid,
        errors: !isValid ? [{
          field: '',
          code: 'INVALID_EMAIL',
          message: 'Must be a valid email address',
          severity: 'error' as const,
          value
        }] : [],
        warnings: []
      };
    });

    // URL validator
    this.registerValidator('url', (value) => {
      try {
        new URL(value);
        return { isValid: true, errors: [], warnings: [] };
      } catch {
        return {
          isValid: false,
          errors: [{
            field: '',
            code: 'INVALID_URL',
            message: 'Must be a valid URL',
            severity: 'error' as const,
            value
          }],
          warnings: []
        };
      }
    });

    // Pattern validator
    this.registerValidator('pattern', (value, context) => {
      const pattern = (context as any)?.pattern;
      if (!pattern) {
        return { isValid: true, errors: [], warnings: [] };
      }

      const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
      const isValid = typeof value === 'string' && regex.test(value);
      
      return {
        isValid,
        errors: !isValid ? [{
          field: '',
          code: 'INVALID_PATTERN',
          message: (context as any)?.message || 'Invalid format',
          severity: 'error' as const,
          value
        }] : [],
        warnings: []
      };
    });

    // Date validator
    this.registerValidator('date', (value) => {
      const date = new Date(value);
      const isValid = !isNaN(date.getTime());
      return {
        isValid,
        errors: !isValid ? [{
          field: '',
          code: 'INVALID_DATE',
          message: 'Must be a valid date',
          severity: 'error' as const,
          value
        }] : [],
        warnings: [],
        value: isValid ? date : value
      };
    });

    // Array validator
    this.registerValidator('array', (value) => ({
      isValid: Array.isArray(value),
      errors: !Array.isArray(value) ? [{
        field: '',
        code: 'INVALID_TYPE',
        message: 'Must be an array',
        severity: 'error' as const,
        value
      }] : [],
      warnings: []
    }));

    // Enum validator
    this.registerValidator('enum', (value, context) => {
      const options = (context as any)?.options || [];
      const isValid = options.includes(value);
      return {
        isValid,
        errors: !isValid ? [{
          field: '',
          code: 'INVALID_OPTION',
          message: `Must be one of: ${options.join(', ')}`,
          severity: 'error' as const,
          value
        }] : [],
        warnings: []
      };
    });
  }

  private isNestedSchema(rules: any): rules is ValidationSchema {
    return rules && typeof rules === 'object' && !Array.isArray(rules) && !('validator' in rules);
  }
}

// Create singleton instance
export const validationService = new ValidationService();

// Utility functions for creating validators
export const validators = {
  required: (message?: string): ValidationRule => ({
    name: 'required',
    validator: validationService['customValidators'].get('required')!,
    message
  }),

  string: (message?: string): ValidationRule => ({
    name: 'string',
    validator: validationService['customValidators'].get('string')!,
    message
  }),

  minLength: (min: number, message?: string): ValidationRule => ({
    name: 'minLength',
    validator: (value, context) => 
      validationService['customValidators'].get('minLength')!(value, { ...context, min }),
    message
  }),

  maxLength: (max: number, message?: string): ValidationRule => ({
    name: 'maxLength',
    validator: (value, context) => 
      validationService['customValidators'].get('maxLength')!(value, { ...context, max }),
    message
  }),

  email: (message?: string): ValidationRule => ({
    name: 'email',
    validator: validationService['customValidators'].get('email')!,
    message
  }),

  pattern: (pattern: RegExp | string, message?: string): ValidationRule => ({
    name: 'pattern',
    validator: (value, context) => 
      validationService['customValidators'].get('pattern')!(value, { ...context, pattern, message }),
    message
  }),

  number: (message?: string): ValidationRule => ({
    name: 'number',
    validator: validationService['customValidators'].get('number')!,
    message
  }),

  positive: (message?: string): ValidationRule => ({
    name: 'positive',
    validator: validationService['customValidators'].get('positive')!,
    message
  }),

  enum: (options: any[], message?: string): ValidationRule => ({
    name: 'enum',
    validator: (value, context) => 
      validationService['customValidators'].get('enum')!(value, { ...context, options }),
    message
  })
};

// Common validation schemas
export const commonSchemas = {
  user: {
    name: [validators.required(), validators.string(), validators.minLength(2)],
    email: [validators.required(), validators.email()],
    role: validators.enum(['attorney', 'paralegal', 'admin'])
  },

  document: {
    name: [validators.required(), validators.string(), validators.minLength(1)],
    type: validators.enum(['pdf', 'docx', 'txt', 'legal']),
    category: validators.enum(['contract', 'brief', 'research', 'evidence', 'correspondence', 'other'])
  },

  message: {
    content: [validators.required(), validators.string(), validators.minLength(1)],
    sender: validators.enum(['user', 'ai']),
    type: validators.enum(['text', 'document', 'analysis', 'citation'])
  }
};

// Register common schemas
Object.entries(commonSchemas).forEach(([name, schema]) => {
  validationService.registerSchema(name, schema);
});

export default validationService;