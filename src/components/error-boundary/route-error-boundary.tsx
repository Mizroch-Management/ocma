import React, { Component, ErrorInfo, ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Home, ArrowLeft } from "lucide-react";
import { log } from "@/utils/logger";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  resetKeys?: Array<string | number>;
  resetOnPropsChange?: boolean;
  isolateErrorToComponent?: boolean;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorId: string;
  prevResetKeys?: Array<string | number>;
}

/**
 * Route-level error boundary that provides sophisticated error handling
 * for individual route components without affecting the entire app
 */
export class RouteErrorBoundary extends Component<Props, State> {
  private resetTimeoutId: number | null = null;

  public state: State = {
    hasError: false,
    errorId: '',
    prevResetKeys: this.props.resetKeys,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    const errorId = `route_error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      hasError: true,
      error,
      errorId,
    };
  }

  public static getDerivedStateFromProps(props: Props, state: State): Partial<State> | null {
    const { resetKeys } = props;
    const { prevResetKeys, hasError } = state;
    
    // Reset error state if resetKeys have changed and we currently have an error
    if (hasError && prevResetKeys !== resetKeys && resetKeys) {
      const hasResetKeyChanged = prevResetKeys === undefined ||
        resetKeys.length !== prevResetKeys.length ||
        resetKeys.some((key, idx) => key !== prevResetKeys[idx]);
        
      if (hasResetKeyChanged) {
        return {
          hasError: false,
          error: undefined,
          prevResetKeys: resetKeys,
        };
      }
    }
    
    return { prevResetKeys: resetKeys };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    log.error('Route-level error caught', error, {
      componentStack: errorInfo.componentStack,
      errorBoundary: 'route',
      errorId: this.state.errorId,
      isolateErrorToComponent: this.props.isolateErrorToComponent,
      userAgent: navigator.userAgent,
      url: window.location.href,
    }, {
      component: 'RouteErrorBoundary',
      action: 'catch_error'
    });

    // Send error to external monitoring service in production
    if (process.env.NODE_ENV === 'production') {
      // This would integrate with services like Sentry, LogRocket, etc.
      // window.Sentry?.captureException(error, {
      //   tags: { boundary: 'route' },
      //   extra: { errorInfo, errorId: this.state.errorId }
      // });
    }
  }

  private handleRetry = () => {
    log.info('User initiated error recovery', { errorId: this.state.errorId }, {
      component: 'RouteErrorBoundary',
      action: 'retry'
    });

    this.setState({
      hasError: false,
      error: undefined,
      errorId: '',
    });
  };

  private handleRefresh = () => {
    log.info('User initiated page refresh', { errorId: this.state.errorId }, {
      component: 'RouteErrorBoundary',
      action: 'refresh'
    });
    
    window.location.reload();
  };

  private handleGoHome = () => {
    log.info('User navigated to home from error', { errorId: this.state.errorId }, {
      component: 'RouteErrorBoundary',
      action: 'go_home'
    });
    
    window.location.href = '/';
  };

  private handleGoBack = () => {
    log.info('User navigated back from error', { errorId: this.state.errorId }, {
      component: 'RouteErrorBoundary',
      action: 'go_back'
    });
    
    window.history.back();
  };

  public componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
  }

  public render() {
    if (this.state.hasError) {
      // If a custom fallback is provided, use it
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[400px] flex items-center justify-center p-4">
          <Card className="w-full max-w-lg">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <CardTitle className="text-xl">Something went wrong</CardTitle>
              <CardDescription>
                This section encountered an unexpected error. Try refreshing or navigating to a different page.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {this.state.error && process.env.NODE_ENV === 'development' && (
                <details className="text-xs text-muted-foreground">
                  <summary className="cursor-pointer hover:text-foreground">
                    Error details (development mode)
                  </summary>
                  <pre className="mt-2 whitespace-pre-wrap break-words p-2 bg-muted rounded text-[10px]">
                    {this.state.error.message}
                    {'\n\n'}
                    {this.state.error.stack}
                  </pre>
                </details>
              )}
              
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={this.handleRetry}
                  variant="default"
                  size="sm"
                  className="w-full"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Try Again
                </Button>
                
                <Button
                  onClick={this.handleRefresh}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh Page
                </Button>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={this.handleGoBack}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Go Back
                </Button>
                
                <Button
                  onClick={this.handleGoHome}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  <Home className="mr-2 h-4 w-4" />
                  Home
                </Button>
              </div>
              
              {this.state.errorId && process.env.NODE_ENV === 'development' && (
                <div className="text-xs text-muted-foreground text-center pt-2 border-t">
                  Error ID: {this.state.errorId}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}