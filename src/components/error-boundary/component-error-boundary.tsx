import React, { Component, ErrorInfo, ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Eye, EyeOff } from "lucide-react";
import { log } from "@/utils/logger";

interface Props {
  children: ReactNode;
  fallback?: (error: Error, retry: () => void, componentName?: string) => ReactNode;
  componentName?: string;
  isolateErrorToComponent?: boolean;
  showErrorDetails?: boolean;
  resetOnPropsChange?: boolean;
  resetKeys?: Array<string | number>;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorId: string;
  componentName?: string;
  showDetails: boolean;
  prevResetKeys?: Array<string | number>;
}

/**
 * Component-level error boundary that provides granular error handling
 * for individual components without affecting parent components
 */
export class ComponentErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorId: '',
    showDetails: false,
    prevResetKeys: this.props.resetKeys,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    const errorId = `component_error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      hasError: true,
      error,
      errorId,
    };
  }

  public static getDerivedStateFromProps(props: Props, state: State): Partial<State> | null {
    const { resetKeys, resetOnPropsChange } = props;
    const { prevResetKeys, hasError } = state;
    
    // Reset error state if resetKeys have changed and we currently have an error
    if (hasError && resetOnPropsChange && prevResetKeys !== resetKeys && resetKeys) {
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
    const componentName = this.props.componentName || this.extractComponentName(errorInfo);
    
    log.error('Component-level error caught', error, {
      componentStack: errorInfo.componentStack,
      errorBoundary: 'component',
      errorId: this.state.errorId,
      componentName,
      isolateErrorToComponent: this.props.isolateErrorToComponent,
      userAgent: navigator.userAgent,
      url: window.location.href,
      reactStack: errorInfo.componentStack?.split('\n').slice(0, 5), // First 5 components in stack
    }, {
      component: 'ComponentErrorBoundary',
      action: 'catch_error'
    });

    this.setState({ componentName });

    // Send error to external monitoring service in production
    if (process.env.NODE_ENV === 'production') {
      // This would integrate with services like Sentry, LogRocket, etc.
      // window.Sentry?.captureException(error, {
      //   tags: { 
      //     boundary: 'component',
      //     componentName: componentName 
      //   },
      //   extra: { errorInfo, errorId: this.state.errorId }
      // });
    }
  }

  private extractComponentName(errorInfo: ErrorInfo): string {
    // Extract the component name from the component stack
    const stack = errorInfo.componentStack;
    const match = stack?.match(/\s+in (\w+)/);
    return match?.[1] || 'Unknown';
  }

  private handleRetry = () => {
    log.info('User initiated component error recovery', { 
      errorId: this.state.errorId,
      componentName: this.state.componentName 
    }, {
      component: 'ComponentErrorBoundary',
      action: 'retry'
    });

    this.setState({
      hasError: false,
      error: undefined,
      errorId: '',
      showDetails: false,
    });
  };

  private toggleDetails = () => {
    this.setState(prevState => ({
      showDetails: !prevState.showDetails
    }));
  };

  public render() {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback(
          this.state.error, 
          this.handleRetry, 
          this.state.componentName
        );
      }

      // For component-level errors, show a more compact inline error UI
      return (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <CardTitle className="text-sm">
                  Component Error
                  {this.state.componentName && (
                    <span className="text-xs font-normal text-muted-foreground ml-2">
                      in {this.state.componentName}
                    </span>
                  )}
                </CardTitle>
              </div>
              <Button
                onClick={this.handleRetry}
                variant="outline"
                size="sm"
                className="h-6 text-xs"
              >
                <RefreshCw className="mr-1 h-3 w-3" />
                Retry
              </Button>
            </div>
            <CardDescription className="text-xs">
              This component encountered an error and couldn't render properly.
            </CardDescription>
          </CardHeader>
          
          {(this.props.showErrorDetails || process.env.NODE_ENV === 'development') && (
            <CardContent className="pt-0">
              <div className="flex items-center justify-between mb-2">
                <Button
                  onClick={this.toggleDetails}
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs p-0"
                >
                  {this.state.showDetails ? (
                    <>
                      <EyeOff className="mr-1 h-3 w-3" />
                      Hide Details
                    </>
                  ) : (
                    <>
                      <Eye className="mr-1 h-3 w-3" />
                      Show Details
                    </>
                  )}
                </Button>
                
                {this.state.errorId && (
                  <span className="text-xs text-muted-foreground">
                    ID: {this.state.errorId.slice(-8)}
                  </span>
                )}
              </div>
              
              {this.state.showDetails && (
                <details open className="text-xs text-muted-foreground">
                  <summary className="sr-only">Error details</summary>
                  <pre className="whitespace-pre-wrap break-words p-2 bg-muted rounded text-[10px] max-h-32 overflow-y-auto">
                    Component: {this.state.componentName}
                    {'\n'}
                    Error: {this.state.error.message}
                    {'\n'}
                    ID: {this.state.errorId}
                    {this.state.error.stack && (
                      `\n\nStack:\n${this.state.error.stack.split('\n').slice(0, 5).join('\n')}`
                    )}
                  </pre>
                </details>
              )}
            </CardContent>
          )}
        </Card>
      );
    }

    return this.props.children;
  }
}