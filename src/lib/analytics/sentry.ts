import * as Sentry from '@sentry/react';

export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  
  if (!dsn) {
    console.log('Sentry DSN not configured, skipping initialization');
    return;
  }

  Sentry.init({
    dsn,
    integrations: [
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],
    
    // Performance Monitoring
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
    
    // Session Replay
    replaysSessionSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
    replaysOnErrorSampleRate: 1.0,
    
    // Environment
    environment: import.meta.env.VITE_ENV || 'development',
    
    // Release tracking
    release: import.meta.env.VITE_APP_VERSION,
    
    // Filter out noisy errors
    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
      'Non-Error promise rejection captured',
    ],
    
    beforeSend(event, hint) {
      // Filter out errors from browser extensions
      if (event.exception?.values?.[0]?.stacktrace?.frames?.some(
        frame => frame.filename?.includes('chrome-extension://') ||
                 frame.filename?.includes('moz-extension://')
      )) {
        return null;
      }
      
      // Add user context if available
      const user = getCurrentUser();
      if (user) {
        event.user = {
          id: user.id,
          email: user.email,
        };
      }
      
      return event;
    },
  });
}

export function captureError(error: Error, context?: Record<string, any>) {
  console.error('Captured error:', error);
  
  if (context) {
    Sentry.withScope((scope) => {
      Object.keys(context).forEach(key => {
        scope.setContext(key, context[key]);
      });
      Sentry.captureException(error);
    });
  } else {
    Sentry.captureException(error);
  }
}

export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info') {
  Sentry.captureMessage(message, level);
}

export function setUserContext(user: { id: string; email?: string; username?: string }) {
  Sentry.setUser(user);
}

export function clearUserContext() {
  Sentry.setUser(null);
}

export function addBreadcrumb(breadcrumb: {
  message: string;
  category?: string;
  level?: Sentry.SeverityLevel;
  data?: Record<string, any>;
}) {
  Sentry.addBreadcrumb(breadcrumb);
}

// Helper to get current user from auth context
function getCurrentUser() {
  // This would be implemented to get user from your auth system
  try {
    const authData = localStorage.getItem('sb-auth-token');
    if (authData) {
      const parsed = JSON.parse(authData);
      return parsed.user;
    }
  } catch {
    // Ignore errors
  }
  return null;
}