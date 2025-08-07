import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AppError, ErrorCategory, ErrorSeverity } from './error-types';
import { ErrorFactory } from './error-factory';
import { ErrorLogger } from './error-logger';
import { ErrorDisplay } from '../../components/error-boundary/error-display';

interface ErrorBoundaryState {
  hasError: boolean;
  error: AppError | null;
  eventId?: string;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: AppError) => ReactNode;
  onError?: (error: AppError, errorInfo: ErrorInfo) => void;
  isolate?: boolean; // Whether to isolate errors to this boundary
  category?: ErrorCategory;
  context?: Record<string, any>;
}

/**
 * Global Error Boundary Component
 * Catches JavaScript errors anywhere in the component tree and displays a fallback UI
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private errorLogger: ErrorLogger;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
    this.errorLogger = new ErrorLogger();
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Convert JavaScript error to AppError
    const appError = ErrorFactory.createGenericError(
      ErrorCategory.UNKNOWN,
      ErrorSeverity.CRITICAL,
      error.message || 'An unexpected error occurred',
      'Something went wrong. Please try refreshing the page.',
      {
        component: 'ErrorBoundary',
        action: 'render'
      },
      true,
      error
    );

    return {
      hasError: true,
      error: appError
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { onError, context, category } = this.props;
    
    // Create structured error with additional context
    const appError = ErrorFactory.createGenericError(
      category || ErrorCategory.UNKNOWN,
      ErrorSeverity.CRITICAL,
      error.message || 'Component render error',
      'Something went wrong. Please try refreshing the page.',
      {
        component: errorInfo.componentStack.split('\n')[1]?.trim() || 'Unknown',
        action: 'render',
        ...context
      },
      true,
      error
    );

    // Log the error
    const eventId = this.errorLogger.logError(appError, {
      componentStack: errorInfo.componentStack,
      errorBoundary: this.constructor.name
    });

    this.setState({ eventId });

    // Call custom error handler if provided
    if (onError) {
      onError(appError, errorInfo);
    }

    // Report to external services in production
    if (process.env.NODE_ENV === 'production') {
      this.reportToErrorService(appError, errorInfo);
    }
  }

  private reportToErrorService(error: AppError, errorInfo: ErrorInfo) {
    // Here you would integrate with services like Sentry, Bugsnag, etc.
    console.error('Error reported to external service:', {
      error,
      errorInfo,
      timestamp: new Date().toISOString()
    });
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null, eventId: undefined });
  };

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    const { hasError, error, eventId } = this.state;
    const { children, fallback } = this.props;

    if (hasError && error) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback(error);
      }

      // Use default error display
      return (
        <ErrorDisplay
          error={error}
          eventId={eventId}
          onRetry={error.retryable ? this.handleRetry : undefined}
          onReload={this.handleReload}
        />
      );
    }

    return children;
  }
}

/**
 * HOC for wrapping components with error boundary
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  errorBoundaryConfig?: Omit<ErrorBoundaryProps, 'children'>
) {
  const ComponentWithErrorBoundary = (props: P) => (
    <ErrorBoundary {...errorBoundaryConfig}>
      <WrappedComponent {...props} />
    </ErrorBoundary>
  );

  ComponentWithErrorBoundary.displayName = `withErrorBoundary(${WrappedComponent.displayName || WrappedComponent.name})`;

  return ComponentWithErrorBoundary;
}

/**
 * Hook for handling errors in functional components
 */
export function useErrorBoundary() {
  const throwError = React.useCallback((error: Error | AppError) => {
    throw error;
  }, []);

  const reportError = React.useCallback((error: Error | AppError, context?: Record<string, any>) => {
    const logger = new ErrorLogger();
    
    const appError = error instanceof Error 
      ? ErrorFactory.createGenericError(
          ErrorCategory.UNKNOWN,
          ErrorSeverity.MEDIUM,
          error.message,
          'An error occurred',
          context || {}
        )
      : error;

    logger.logError(appError, context);
  }, []);

  return { throwError, reportError };
}

/**
 * Specific error boundaries for different parts of the application
 */
export const WorkflowErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary
    category={ErrorCategory.BUSINESS_LOGIC}
    context={{ section: 'workflow' }}
    fallback={(error) => (
      <div className="p-6 text-center">
        <h2 className="text-lg font-semibold text-red-600 mb-2">Workflow Error</h2>
        <p className="text-gray-600 mb-4">{error.userMessage}</p>
        <button 
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Reload Page
        </button>
      </div>
    )}
  >
    {children}
  </ErrorBoundary>
);

export const AIServiceErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary
    category={ErrorCategory.AI_SERVICE}
    context={{ section: 'ai_service' }}
  >
    {children}
  </ErrorBoundary>
);

export const ContentErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary
    category={ErrorCategory.BUSINESS_LOGIC}
    context={{ section: 'content_management' }}
  >
    {children}
  </ErrorBoundary>
);