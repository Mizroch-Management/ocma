import { useCallback, useState } from 'react';
import { log } from '@/utils/logger';

export interface ErrorState {
  error: Error | null;
  hasError: boolean;
  isLoading: boolean;
  retryCount: number;
}

export interface UseErrorHandlerOptions {
  onError?: (error: Error) => void;
  maxRetries?: number;
  retryDelay?: number;
  logErrors?: boolean;
  component?: string;
}

export interface UseErrorHandlerReturn extends ErrorState {
  setError: (error: Error | null) => void;
  clearError: () => void;
  retry: () => void;
  withErrorHandling: <T extends any[], R>(
    fn: (...args: T) => R | Promise<R>
  ) => (...args: T) => Promise<R>;
  withAsyncErrorHandling: <T extends any[], R>(
    fn: (...args: T) => Promise<R>
  ) => (...args: T) => Promise<R>;
}

/**
 * Hook for handling errors in functional components
 * Provides error state management and automatic retry functionality
 */
export function useErrorHandler(options: UseErrorHandlerOptions = {}): UseErrorHandlerReturn {
  const {
    onError,
    maxRetries = 3,
    retryDelay = 1000,
    logErrors = true,
    component = 'useErrorHandler',
  } = options;

  const [errorState, setErrorState] = useState<ErrorState>({
    error: null,
    hasError: false,
    isLoading: false,
    retryCount: 0,
  });

  const setError = useCallback((error: Error | null) => {
    if (error) {
      if (logErrors) {
        log.error('Error caught by useErrorHandler', error, {
          retryCount: errorState.retryCount,
        }, {
          component,
          action: 'set_error'
        });
      }
      
      setErrorState(prev => ({
        ...prev,
        error,
        hasError: true,
        isLoading: false,
      }));
      
      if (onError) {
        try {
          onError(error);
        } catch (handlerError) {
          if (logErrors) {
            log.error('Error in custom error handler', handlerError as Error, undefined, {
              component,
              action: 'handler_error'
            });
          }
        }
      }
    } else {
      setErrorState(prev => ({
        ...prev,
        error: null,
        hasError: false,
        isLoading: false,
      }));
    }
  }, [errorState.retryCount, logErrors, component, onError]);

  const clearError = useCallback(() => {
    if (logErrors) {
      log.info('Error cleared by user', { retryCount: errorState.retryCount }, {
        component,
        action: 'clear_error'
      });
    }
    
    setErrorState({
      error: null,
      hasError: false,
      isLoading: false,
      retryCount: 0,
    });
  }, [errorState.retryCount, logErrors, component]);

  const retry = useCallback(() => {
    if (errorState.retryCount >= maxRetries) {
      if (logErrors) {
        log.warn('Maximum retries exceeded', { 
          retryCount: errorState.retryCount, 
          maxRetries 
        }, {
          component,
          action: 'max_retries_exceeded'
        });
      }
      return;
    }

    if (logErrors) {
      log.info('Retrying after error', { 
        retryCount: errorState.retryCount + 1,
        maxRetries 
      }, {
        component,
        action: 'retry'
      });
    }

    setErrorState(prev => ({
      ...prev,
      error: null,
      hasError: false,
      isLoading: true,
      retryCount: prev.retryCount + 1,
    }));
  }, [errorState.retryCount, maxRetries, logErrors, component]);

  const withErrorHandling = useCallback(
    <T extends any[], R>(fn: (...args: T) => R | Promise<R>) =>
      async (...args: T): Promise<R> => {
        try {
          setErrorState(prev => ({ ...prev, isLoading: true, error: null, hasError: false }));
          const result = await fn(...args);
          setErrorState(prev => ({ ...prev, isLoading: false }));
          return result;
        } catch (error) {
          setError(error as Error);
          throw error;
        }
      },
    [setError]
  );

  const withAsyncErrorHandling = useCallback(
    <T extends any[], R>(fn: (...args: T) => Promise<R>) =>
      async (...args: T): Promise<R> => {
        try {
          setErrorState(prev => ({ ...prev, isLoading: true, error: null, hasError: false }));
          
          const result = await new Promise<R>((resolve, reject) => {
            const timeoutId = setTimeout(() => {
              reject(new Error('Operation timed out'));
            }, 30000); // 30 second timeout
            
            fn(...args)
              .then(resolve)
              .catch(reject)
              .finally(() => clearTimeout(timeoutId));
          });
          
          setErrorState(prev => ({ ...prev, isLoading: false }));
          return result;
        } catch (error) {
          setError(error as Error);
          
          // Auto-retry for certain types of errors
          const shouldAutoRetry = errorState.retryCount < maxRetries && 
            (error as Error).message.toLowerCase().includes('network');
          
          if (shouldAutoRetry) {
            setTimeout(() => {
              retry();
              return withAsyncErrorHandling(fn)(...args);
            }, retryDelay * Math.pow(2, errorState.retryCount));
          }
          
          throw error;
        }
      },
    [setError, errorState.retryCount, maxRetries, retryDelay, retry]
  );

  return {
    ...errorState,
    setError,
    clearError,
    retry,
    withErrorHandling,
    withAsyncErrorHandling,
  };
}