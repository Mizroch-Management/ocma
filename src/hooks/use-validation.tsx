import { useState, useCallback } from 'react';
import { z } from 'zod';
import { toast } from 'sonner';

interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: Record<string, string[]>;
  fieldErrors?: Record<string, string>;
}

/**
 * Custom hook for form validation using Zod schemas
 * Provides real-time validation with user-friendly error messages
 */
export function useValidation<T extends z.ZodType>(schema: T) {
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [isValidating, setIsValidating] = useState(false);

  const validate = useCallback(async (data: unknown): Promise<ValidationResult<z.infer<T>>> => {
    setIsValidating(true);
    setErrors({});

    try {
      const result = await schema.parseAsync(data);
      setIsValidating(false);
      return {
        success: true,
        data: result,
        errors: {},
        fieldErrors: {}
      };
    } catch (error) {
      setIsValidating(false);
      
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string[]> = {};
        const flatErrors: Record<string, string> = {};
        
        error.errors.forEach(err => {
          const path = err.path.join('.');
          if (!fieldErrors[path]) {
            fieldErrors[path] = [];
          }
          fieldErrors[path].push(err.message);
          flatErrors[path] = err.message; // Take first error for simple display
        });
        
        setErrors(fieldErrors);
        
        return {
          success: false,
          errors: fieldErrors,
          fieldErrors: flatErrors
        };
      }
      
      // Unexpected error
      console.error('Validation error:', error);
      toast.error('An unexpected validation error occurred');
      
      return {
        success: false,
        errors: { general: ['An unexpected error occurred'] },
        fieldErrors: { general: 'An unexpected error occurred' }
      };
    }
  }, [schema]);

  const validateField = useCallback(async (fieldName: string, value: unknown): Promise<string[]> => {
    try {
      // Create a partial schema for single field validation
      const fieldSchema = schema.pick({ [fieldName]: true } as any);
      await fieldSchema.parseAsync({ [fieldName]: value });
      
      // Clear errors for this field if validation passes
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
      
      return [];
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors = error.errors
          .filter(err => err.path.join('.') === fieldName)
          .map(err => err.message);
        
        setErrors(prev => ({
          ...prev,
          [fieldName]: fieldErrors
        }));
        
        return fieldErrors;
      }
      
      return ['Invalid value'];
    }
  }, [schema]);

  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  const clearFieldError = useCallback((fieldName: string) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
  }, []);

  const hasErrors = Object.keys(errors).length > 0;
  const getFieldError = useCallback((fieldName: string) => {
    return errors[fieldName]?.[0] || null;
  }, [errors]);

  return {
    validate,
    validateField,
    errors,
    fieldErrors: errors,
    hasErrors,
    isValidating,
    clearErrors,
    clearFieldError,
    getFieldError
  };
}

/**
 * Hook for sanitizing input values
 */
export function useSanitization() {
  const sanitizeInput = useCallback((value: string, options?: {
    allowHtml?: boolean;
    maxLength?: number;
    allowNewlines?: boolean;
  }) => {
    // Basic sanitization - remove potential XSS
    let sanitized = value.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    
    if (!options?.allowHtml) {
      sanitized = sanitized.replace(/<[^>]*>/g, '');
    }
    
    if (!options?.allowNewlines) {
      sanitized = sanitized.replace(/\n/g, ' ').replace(/\s+/g, ' ');
    }
    
    if (options?.maxLength && sanitized.length > options.maxLength) {
      sanitized = sanitized.substring(0, options.maxLength);
    }
    
    return sanitized.trim();
  }, []);

  return { sanitizeInput };
}

/**
 * Combined validation and sanitization hook
 */
export function useFormValidation<T extends z.ZodType>(schema: T) {
  const validation = useValidation(schema);
  const { sanitizeInput } = useSanitization();

  const validateAndSanitize = useCallback(async (data: Record<string, any>) => {
    // Sanitize all string fields first
    const sanitizedData: Record<string, any> = {};
    
    Object.entries(data).forEach(([key, value]) => {
      if (typeof value === 'string') {
        sanitizedData[key] = sanitizeInput(value);
      } else {
        sanitizedData[key] = value;
      }
    });

    // Then validate
    return validation.validate(sanitizedData);
  }, [validation, sanitizeInput]);

  return {
    ...validation,
    validateAndSanitize,
    sanitizeInput
  };
}

/**
 * Password strength validation hook
 */
export function usePasswordValidation() {
  const getPasswordStrength = useCallback((password: string): {
    score: number;
    feedback: string[];
    isStrong: boolean;
  } => {
    if (!password) {
      return { score: 0, feedback: ['Enter a password'], isStrong: false };
    }

    let score = 0;
    const feedback: string[] = [];

    // Length check
    if (password.length >= 8) {
      score += 1;
    } else {
      feedback.push('Use at least 8 characters');
    }

    // Character variety checks
    if (/[a-z]/.test(password)) {
      score += 1;
    } else {
      feedback.push('Include lowercase letters');
    }

    if (/[A-Z]/.test(password)) {
      score += 1;
    } else {
      feedback.push('Include uppercase letters');
    }

    if (/[0-9]/.test(password)) {
      score += 1;
    } else {
      feedback.push('Include numbers');
    }

    if (/[^a-zA-Z0-9]/.test(password)) {
      score += 1;
    } else {
      feedback.push('Include special characters');
    }

    // Bonus points for longer passwords
    if (password.length >= 12) score += 1;
    if (password.length >= 16) score += 1;

    const isStrong = score >= 4;
    
    return { score, feedback, isStrong };
  }, []);

  return { getPasswordStrength };
}