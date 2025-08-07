import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { AppError, ErrorCategory, ErrorSeverity } from '@/lib/error-handling/error-types';
import { ErrorFactory } from '@/lib/error-handling/error-factory';
import { errorLogger } from '@/lib/error-handling/error-logger';

interface UseErrorHandlerOptions {
  category?: ErrorCategory;
  component?: string;
  showToast?: boolean;
  logError?: boolean;
}

interface ErrorState {
  error: AppError | null;
  isError: boolean;
  hasRetryableError: boolean;
}

/**
 * Hook for handling errors in components and API calls
 * Provides consistent error handling with logging and user feedback
 */
export function useErrorHandler(options: UseErrorHandlerOptions = {}) {
  const {
    category = ErrorCategory.UNKNOWN,
    component,
    showToast = true,
    logError = true
  } = options;

  const [errorState, setErrorState] = useState<ErrorState>({
    error: null,
    isError: false,
    hasRetryableError: false
  });

  // Handle JavaScript errors
  const handleError = useCallback((error: Error | AppError, context?: Record<string, any>) => {
    let appError: AppError;

    if (error instanceof Error) {
      // Convert JavaScript Error to AppError
      appError = ErrorFactory.createGenericError(
        category,
        ErrorSeverity.MEDIUM,
        error.message,
        'An unexpected error occurred. Please try again.',
        {
          component,
          ...context
        },
        true,
        error
      );
    } else {
      // Already an AppError
      appError = error;
    }

    setErrorState({
      error: appError,
      isError: true,
      hasRetryableError: appError.retryable
    });

    // Log error if enabled
    if (logError) {
      errorLogger.logError(appError, context);
    }

    // Show toast notification if enabled
    if (showToast) {
      toast.error(appError.userMessage, {
        description: appError.suggestion,
        duration: appError.severity === ErrorSeverity.CRITICAL ? 10000 : 5000
      });
    }

    return appError;
  }, [category, component, showToast, logError]);

  // Handle API/Network errors
  const handleApiError = useCallback(async (response: Response, context?: Record<string, any>) => {
    const endpoint = response.url;
    const status = response.status;
    const method = context?.method || 'GET';

    let errorMessage = 'API request failed';
    let userMessage = 'Something went wrong. Please try again.';

    // Try to get error details from response
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorMessage;
      userMessage = errorData.userMessage || userMessage;
    } catch {
      // Response is not JSON, use default messages
    }

    // Create appropriate error based on status code
    let appError: AppError;

    if (status === 401) {
      appError = ErrorFactory.createAuthenticationError(
        'AUTH_001',
        'Authentication failed',
        'Please log in again to continue.',
        { component, ...context }
      );
    } else if (status === 403) {
      appError = ErrorFactory.createAuthorizationError(
        'AUTHZ_001',
        'Insufficient permissions',
        'You do not have permission to perform this action.',
        { component, ...context }
      );
    } else if (status === 429) {
      appError = ErrorFactory.createNetworkError(
        'NET_003',
        'Rate limit exceeded',
        'Too many requests. Please wait a moment and try again.',
        { status, endpoint, method, component, ...context }
      );
    } else if (status >= 500) {
      appError = ErrorFactory.createNetworkError(
        'NET_004',
        'Server error',
        'Our servers are experiencing issues. Please try again later.',
        { status, endpoint, method, component, ...context }
      );
    } else {
      appError = ErrorFactory.createNetworkError(
        'NET_001',
        errorMessage,
        userMessage,
        { status, endpoint, method, component, ...context }
      );
    }

    return handleError(appError, context);
  }, [handleError, component]);

  // Handle validation errors
  const handleValidationError = useCallback((fields: Record<string, string[]>, context?: Record<string, any>) => {
    const appError = ErrorFactory.createValidationError(
      'VAL_001',
      'Form validation failed',
      'Please correct the highlighted fields and try again.',
      { component, fields, ...context }
    );

    return handleError(appError, context);
  }, [handleError, component]);

  // Handle AI service errors
  const handleAIError = useCallback((provider: string, model?: string, context?: Record<string, any>) => {
    const appError = ErrorFactory.createAIServiceError(
      'AI_001',
      `AI service error with ${provider}`,
      'AI service is temporarily unavailable. Please try again.',
      { provider, model, component, ...context }
    );

    return handleError(appError, context);
  }, [handleError, component]);

  // Clear error state
  const clearError = useCallback(() => {
    setErrorState({
      error: null,
      isError: false,
      hasRetryableError: false
    });
  }, []);

  // Retry function
  const retry = useCallback((retryFn: () => void | Promise<void>) => {
    clearError();
    
    try {
      const result = retryFn();
      if (result instanceof Promise) {
        return result.catch(handleError);
      }
      return result;
    } catch (error) {
      return handleError(error as Error);
    }
  }, [clearError, handleError]);

  // Async operation wrapper
  const withErrorHandling = useCallback(async <T>(
    operation: () => Promise<T>,
    context?: Record<string, any>
  ): Promise<T | null> => {
    try {
      clearError();
      return await operation();
    } catch (error) {
      handleError(error as Error, context);
      return null;
    }
  }, [clearError, handleError]);

  return {
    // Error state
    error: errorState.error,
    isError: errorState.isError,
    hasRetryableError: errorState.hasRetryableError,
    
    // Error handlers
    handleError,
    handleApiError,
    handleValidationError,
    handleAIError,
    
    // Utility functions
    clearError,
    retry,
    withErrorHandling
  };
}

/**
 * Hook specifically for form error handling
 */
export function useFormErrorHandler(formName?: string) {
  const errorHandler = useErrorHandler({
    category: ErrorCategory.VALIDATION,
    component: formName,
    showToast: false // Forms typically show inline errors
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const setFieldError = useCallback((field: string, message: string) => {
    setFieldErrors(prev => ({
      ...prev,
      [field]: message
    }));
  }, []);

  const clearFieldError = useCallback((field: string) => {
    setFieldErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  }, []);

  const clearAllFieldErrors = useCallback(() => {
    setFieldErrors({});
  }, []);

  const hasFieldErrors = Object.keys(fieldErrors).length > 0;

  const handleSubmitError = useCallback((error: Error | Record<string, string[]>) => {
    if (error instanceof Error) {
      return errorHandler.handleError(error);
    } else {
      // Handle validation errors
      const flatErrors: Record<string, string> = {};
      Object.entries(error).forEach(([field, messages]) => {
        flatErrors[field] = messages[0] || 'Invalid value';
      });
      setFieldErrors(flatErrors);
      
      return errorHandler.handleValidationError(error);
    }
  }, [errorHandler]);

  return {
    ...errorHandler,
    fieldErrors,
    hasFieldErrors,
    setFieldError,
    clearFieldError,
    clearAllFieldErrors,
    handleSubmitError
  };
}

/**
 * Hook for API call error handling
 */
export function useApiErrorHandler(apiName?: string) {
  const errorHandler = useErrorHandler({
    category: ErrorCategory.NETWORK,
    component: apiName
  });

  const handleApiCall = useCallback(async <T>(
    apiCall: () => Promise<Response>,
    options: {
      successMessage?: string;
      errorContext?: Record<string, any>;
    } = {}
  ): Promise<T | null> => {
    try {
      errorHandler.clearError();
      
      const response = await apiCall();
      
      if (!response.ok) {
        await errorHandler.handleApiError(response, options.errorContext);
        return null;
      }

      const data = await response.json();
      
      if (options.successMessage) {
        toast.success(options.successMessage);
      }
      
      return data;
    } catch (error) {
      errorHandler.handleError(error as Error, options.errorContext);
      return null;
    }
  }, [errorHandler]);

  return {
    ...errorHandler,
    handleApiCall
  };
}