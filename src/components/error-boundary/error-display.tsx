import React from 'react';
import { AppError, ErrorSeverity } from '@/lib/error-handling/error-types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, RefreshCw, Home, Copy, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface ErrorDisplayProps {
  error: AppError;
  eventId?: string;
  onRetry?: () => void;
  onReload?: () => void;
  showDetails?: boolean;
}

/**
 * Comprehensive error display component
 * Shows user-friendly error messages with options for recovery
 */
export function ErrorDisplay({ 
  error, 
  eventId, 
  onRetry, 
  onReload,
  showDetails = false 
}: ErrorDisplayProps) {
  const [detailsVisible, setDetailsVisible] = useState(showDetails);

  const getSeverityColor = (severity: ErrorSeverity) => {
    switch (severity) {
      case ErrorSeverity.LOW:
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case ErrorSeverity.MEDIUM:
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case ErrorSeverity.HIGH:
        return 'text-red-600 bg-red-50 border-red-200';
      case ErrorSeverity.CRITICAL:
        return 'text-red-700 bg-red-100 border-red-300';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getSeverityIcon = (severity: ErrorSeverity) => {
    const baseClasses = "h-6 w-6";
    switch (severity) {
      case ErrorSeverity.CRITICAL:
        return <AlertCircle className={`${baseClasses} text-red-700`} />;
      case ErrorSeverity.HIGH:
        return <AlertCircle className={`${baseClasses} text-red-600`} />;
      default:
        return <AlertCircle className={`${baseClasses} text-orange-600`} />;
    }
  };

  const copyErrorDetails = async () => {
    const details = {
      id: error.id,
      code: error.code,
      message: error.message,
      timestamp: error.context.timestamp,
      eventId
    };

    try {
      await navigator.clipboard.writeText(JSON.stringify(details, null, 2));
      toast.success('Error details copied to clipboard');
    } catch {
      toast.error('Failed to copy error details');
    }
  };

  const goToHome = () => {
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <Card className={`w-full max-w-2xl ${getSeverityColor(error.severity)}`}>
        <CardHeader>
          <div className="flex items-center space-x-3">
            {getSeverityIcon(error.severity)}
            <div className="flex-1">
              <CardTitle className="text-xl">
                {error.severity === ErrorSeverity.CRITICAL ? 'Critical Error' : 'Something went wrong'}
              </CardTitle>
              <CardDescription className="text-sm opacity-80 mt-1">
                Error Code: {error.code} {eventId && `• Event ID: ${eventId}`}
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* User-friendly message */}
          <div className="prose prose-sm max-w-none">
            <p className="text-lg font-medium text-gray-900 mb-2">
              {error.userMessage}
            </p>
            
            {error.suggestion && (
              <div className="bg-white/50 p-3 rounded-md border">
                <p className="text-sm text-gray-700">
                  <strong>Suggestion:</strong> {error.suggestion}
                </p>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-3">
            {onRetry && error.retryable && (
              <Button onClick={onRetry} className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                Try Again
              </Button>
            )}

            {onReload && (
              <Button onClick={onReload} variant="outline" className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                Reload Page
              </Button>
            )}

            <Button onClick={goToHome} variant="outline" className="flex items-center gap-2">
              <Home className="h-4 w-4" />
              Go to Home
            </Button>

            <Button onClick={copyErrorDetails} variant="ghost" size="sm" className="flex items-center gap-2">
              <Copy className="h-4 w-4" />
              Copy Details
            </Button>
          </div>

          {/* Technical details (collapsible) */}
          <div className="border-t pt-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDetailsVisible(!detailsVisible)}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
            >
              {detailsVisible ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
              {detailsVisible ? 'Hide' : 'Show'} Technical Details
            </Button>

            {detailsVisible && (
              <div className="mt-3 p-3 bg-gray-100 rounded-md text-xs font-mono space-y-2">
                <div>
                  <strong>Error ID:</strong> {error.id}
                </div>
                <div>
                  <strong>Code:</strong> {error.code}
                </div>
                <div>
                  <strong>Category:</strong> {error.category}
                </div>
                <div>
                  <strong>Severity:</strong> {error.severity}
                </div>
                <div>
                  <strong>Timestamp:</strong> {new Date(error.context.timestamp).toLocaleString()}
                </div>
                {error.context.component && (
                  <div>
                    <strong>Component:</strong> {error.context.component}
                  </div>
                )}
                {error.context.action && (
                  <div>
                    <strong>Action:</strong> {error.context.action}
                  </div>
                )}
                {eventId && (
                  <div>
                    <strong>Event ID:</strong> {eventId}
                  </div>
                )}
                {process.env.NODE_ENV === 'development' && error.stack && (
                  <div className="mt-2">
                    <strong>Stack Trace:</strong>
                    <pre className="text-xs mt-1 whitespace-pre-wrap bg-white p-2 rounded border max-h-32 overflow-auto">
                      {error.stack}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Contact support */}
          <div className="text-center pt-4 border-t">
            <p className="text-sm text-gray-600">
              If this problem continues, please{' '}
              <a 
                href="mailto:support@ocma.app?subject=Error Report&body=Error ID: ${error.id}%0AEvent ID: ${eventId || 'N/A'}"
                className="text-blue-600 hover:text-blue-800 underline"
              >
                contact support
              </a>
              {' '}with the error details above.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Minimal error display for smaller spaces
 */
export function MinimalErrorDisplay({ 
  error, 
  onRetry 
}: { 
  error: AppError; 
  onRetry?: () => void; 
}) {
  return (
    <div className="flex items-center justify-center p-6 bg-red-50 border border-red-200 rounded-lg">
      <div className="text-center max-w-sm">
        <AlertCircle className="h-8 w-8 text-red-600 mx-auto mb-2" />
        <p className="text-sm font-medium text-red-900 mb-2">{error.userMessage}</p>
        {onRetry && error.retryable && (
          <Button onClick={onRetry} size="sm" variant="outline" className="flex items-center gap-2 mx-auto">
            <RefreshCw className="h-3 w-3" />
            Try Again
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * Inline error display for form fields
 */
export function InlineErrorDisplay({ 
  message, 
  className = "" 
}: { 
  message: string; 
  className?: string; 
}) {
  return (
    <div className={`flex items-center gap-2 text-sm text-red-600 ${className}`}>
      <AlertCircle className="h-4 w-4 flex-shrink-0" />
      <span>{message}</span>
    </div>
  );
}