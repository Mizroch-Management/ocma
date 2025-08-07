import React, { ComponentType, ReactNode } from 'react';
import { ComponentErrorBoundary } from './component-error-boundary';
import { AsyncErrorBoundary } from './async-error-boundary';
import { RouteErrorBoundary } from './route-error-boundary';

export type ErrorBoundaryType = 'component' | 'async' | 'route';

export interface WithErrorBoundaryOptions {
  type?: ErrorBoundaryType;
  fallback?: (error: Error, retry: () => void, componentName?: string) => ReactNode;
  componentName?: string;
  isolateErrorToComponent?: boolean;
  showErrorDetails?: boolean;
  resetOnPropsChange?: boolean;
  resetKeys?: Array<string | number>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

/**
 * Higher-order component that wraps a component with an appropriate error boundary
 */
export function withErrorBoundary<P extends object>(
  Component: ComponentType<P>,
  options: WithErrorBoundaryOptions = {}
) {
  const {
    type = 'component',
    fallback,
    componentName = Component.displayName || Component.name || 'WrappedComponent',
    isolateErrorToComponent = true,
    showErrorDetails,
    resetOnPropsChange,
    resetKeys,
    onError,
  } = options;

  const WrappedComponent = (props: P) => {
    switch (type) {
      case 'async':
        return (
          <AsyncErrorBoundary
            fallback={fallback}
            isolateErrorToComponent={isolateErrorToComponent}
            onError={onError}
          >
            <Component {...props} />
          </AsyncErrorBoundary>
        );
      
      case 'route':
        return (
          <RouteErrorBoundary
            fallback={fallback}
            resetKeys={resetKeys}
            resetOnPropsChange={resetOnPropsChange}
            isolateErrorToComponent={isolateErrorToComponent}
          >
            <Component {...props} />
          </RouteErrorBoundary>
        );
      
      case 'component':
      default:
        return (
          <ComponentErrorBoundary
            fallback={fallback}
            componentName={componentName}
            isolateErrorToComponent={isolateErrorToComponent}
            showErrorDetails={showErrorDetails}
            resetOnPropsChange={resetOnPropsChange}
            resetKeys={resetKeys}
          >
            <Component {...props} />
          </ComponentErrorBoundary>
        );
    }
  };

  WrappedComponent.displayName = `withErrorBoundary(${componentName})`;
  
  // Copy static properties
  Object.assign(WrappedComponent, Component);
  
  return WrappedComponent;
}

// Convenience functions for specific error boundary types
export const withComponentErrorBoundary = <P extends object>(
  Component: ComponentType<P>,
  options: Omit<WithErrorBoundaryOptions, 'type'> = {}
) => withErrorBoundary(Component, { ...options, type: 'component' });

export const withAsyncErrorBoundary = <P extends object>(
  Component: ComponentType<P>,
  options: Omit<WithErrorBoundaryOptions, 'type'> = {}
) => withErrorBoundary(Component, { ...options, type: 'async' });

export const withRouteErrorBoundary = <P extends object>(
  Component: ComponentType<P>,
  options: Omit<WithErrorBoundaryOptions, 'type'> = {}
) => withErrorBoundary(Component, { ...options, type: 'route' });