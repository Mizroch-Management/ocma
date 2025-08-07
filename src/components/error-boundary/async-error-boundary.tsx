import React, { Component, ErrorInfo, ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Clock } from "lucide-react";
import { log } from "@/utils/logger";

interface Props {
  children: ReactNode;
  fallback?: (error: Error, retry: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  isolateErrorToComponent?: boolean;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorId: string;
  retryCount: number;
  isRetrying: boolean;
}

/**
 * Async error boundary specifically designed for handling errors in 
 * async operations, API calls, and data loading scenarios
 */
export class AsyncErrorBoundary extends Component<Props, State> {
  private retryTimeoutId: number | null = null;
  private maxRetries = 3;
  private retryDelay = 1000; // Base delay in ms

  public state: State = {
    hasError: false,
    errorId: '',
    retryCount: 0,
    isRetrying: false,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    const errorId = `async_error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      hasError: true,
      error,
      errorId,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const errorContext = {
      componentStack: errorInfo.componentStack,
      errorBoundary: 'async',
      errorId: this.state.errorId,
      retryCount: this.state.retryCount,
      isolateErrorToComponent: this.props.isolateErrorToComponent,
      errorType: this.categorizeError(error),
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    log.error('Async operation error caught', error, errorContext, {
      component: 'AsyncErrorBoundary',
      action: 'catch_error'
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      try {
        this.props.onError(error, errorInfo);
      } catch (handlerError) {
        log.error('Error in custom error handler', handlerError as Error, undefined, {
          component: 'AsyncErrorBoundary',
          action: 'handler_error'
        });
      }
    }

    // Attempt auto-retry for certain types of errors
    if (this.shouldAutoRetry(error) && this.state.retryCount < this.maxRetries) {
      this.scheduleRetry();
    }
  }

  private categorizeError(error: Error): string {
    const message = error.message.toLowerCase();
    
    if (message.includes('network') || message.includes('fetch')) {
      return 'network';
    }
    if (message.includes('timeout') || message.includes('abort')) {
      return 'timeout';
    }
    if (message.includes('unauthorized') || message.includes('forbidden')) {
      return 'auth';
    }
    if (message.includes('not found') || message.includes('404')) {
      return 'not_found';
    }
    if (message.includes('server') || message.includes('500')) {
      return 'server';
    }
    
    return 'unknown';
  }

  private shouldAutoRetry(error: Error): boolean {
    const errorType = this.categorizeError(error);
    
    // Auto-retry for network and timeout errors, but not auth or client errors
    return ['network', 'timeout', 'server'].includes(errorType);
  }

  private scheduleRetry = () => {
    const delay = this.retryDelay * Math.pow(2, this.state.retryCount); // Exponential backoff
    
    log.info('Scheduling auto-retry', { 
      delay, 
      retryCount: this.state.retryCount,
      errorId: this.state.errorId 
    }, {
      component: 'AsyncErrorBoundary',
      action: 'schedule_retry'
    });

    this.setState({ isRetrying: true });
    
    this.retryTimeoutId = window.setTimeout(() => {
      this.handleRetry();
    }, delay);
  };

  private handleRetry = () => {
    log.info('Retrying after async error', { 
      retryCount: this.state.retryCount + 1,
      errorId: this.state.errorId 
    }, {
      component: 'AsyncErrorBoundary',
      action: 'retry'
    });

    this.setState(prevState => ({
      hasError: false,
      error: undefined,
      errorId: '',
      retryCount: prevState.retryCount + 1,
      isRetrying: false,
    }));
  };

  private handleManualRetry = () => {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
      this.retryTimeoutId = null;
    }
    
    this.handleRetry();
  };

  private handleReset = () => {
    log.info('Manual reset of async error boundary', { errorId: this.state.errorId }, {
      component: 'AsyncErrorBoundary',
      action: 'reset'
    });

    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
      this.retryTimeoutId = null;
    }

    this.setState({
      hasError: false,
      error: undefined,
      errorId: '',
      retryCount: 0,
      isRetrying: false,
    });
  };

  public componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  public render() {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleManualRetry);
      }

      const errorType = this.categorizeError(this.state.error);
      const canRetry = this.state.retryCount < this.maxRetries;

      return (
        <div className="flex items-center justify-center p-4 min-h-[200px]">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <CardTitle className="text-lg">
                {this.getErrorTitle(errorType)}
              </CardTitle>
              <CardDescription>
                {this.getErrorDescription(errorType)}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {this.state.isRetrying && (
                <div className="flex items-center justify-center p-2 bg-blue-50 rounded-lg border border-blue-200">
                  <Clock className="h-4 w-4 text-blue-600 mr-2 animate-pulse" />
                  <span className="text-sm text-blue-700">
                    Retrying automatically...
                  </span>
                </div>
              )}

              {this.state.retryCount > 0 && (
                <div className="text-xs text-muted-foreground text-center">
                  Retry attempt: {this.state.retryCount} of {this.maxRetries}
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={this.handleManualRetry}
                  disabled={this.state.isRetrying || !canRetry}
                  variant="default"
                  size="sm"
                  className="flex-1"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  {this.state.isRetrying ? 'Retrying...' : 'Retry'}
                </Button>
                
                <Button
                  onClick={this.handleReset}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
                  Reset
                </Button>
              </div>

              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="text-xs text-muted-foreground">
                  <summary className="cursor-pointer hover:text-foreground">
                    Error details (development mode)
                  </summary>
                  <pre className="mt-2 whitespace-pre-wrap break-words p-2 bg-muted rounded text-[10px]">
                    Type: {errorType}
                    {'\n'}
                    Message: {this.state.error.message}
                    {'\n'}
                    ID: {this.state.errorId}
                  </pre>
                </details>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }

  private getErrorTitle(errorType: string): string {
    switch (errorType) {
      case 'network':
        return 'Connection Error';
      case 'timeout':
        return 'Request Timeout';
      case 'auth':
        return 'Authentication Required';
      case 'not_found':
        return 'Resource Not Found';
      case 'server':
        return 'Server Error';
      default:
        return 'Something Went Wrong';
    }
  }

  private getErrorDescription(errorType: string): string {
    switch (errorType) {
      case 'network':
        return 'Unable to connect to the server. Please check your internet connection.';
      case 'timeout':
        return 'The request took too long to complete. Please try again.';
      case 'auth':
        return 'You need to be logged in to access this resource.';
      case 'not_found':
        return 'The requested resource could not be found.';
      case 'server':
        return 'The server encountered an error. Please try again later.';
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  }
}