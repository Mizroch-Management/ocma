import { AppError, ErrorSeverity } from './error-types';

export interface LogContext {
  [key: string]: unknown;
}

/**
 * Centralized error logging service
 * Provides structured logging with different levels and external service integration
 */
export class ErrorLogger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private isProduction = process.env.NODE_ENV === 'production';

  /**
   * Log an application error
   */
  logError(error: AppError, additionalContext?: LogContext): string {
    const logEntry = this.createLogEntry(error, additionalContext);

    // Console logging (always in development, errors+ in production)
    if (this.isDevelopment || error.severity === ErrorSeverity.CRITICAL) {
      console.group(`🚨 ${error.severity.toUpperCase()} ERROR`);
      console.error('Error Details:', {
        id: error.id,
        code: error.code,
        category: error.category,
        message: error.message,
        userMessage: error.userMessage
      });
      console.error('Context:', error.context);
      if (additionalContext) {
        console.error('Additional Context:', additionalContext);
      }
      if (error.originalError) {
        console.error('Original Error:', error.originalError);
      }
      if (error.stack) {
        console.error('Stack Trace:', error.stack);
      }
      console.groupEnd();
    }

    // Send to external logging service in production
    if (this.isProduction) {
      this.sendToExternalService(logEntry);
    }

    // Store in local storage for debugging (development only)
    if (this.isDevelopment) {
      this.storeLocalLog(logEntry);
    }

    return error.id;
  }

  /**
   * Log a warning
   */
  logWarning(message: string, context?: LogContext): void {
    const logEntry = {
      level: 'warning',
      message,
      context,
      timestamp: new Date().toISOString()
    };

    if (this.isDevelopment) {
      console.warn('⚠️ WARNING:', message, context);
      this.storeLocalLog(logEntry);
    }

    if (this.isProduction) {
      this.sendToExternalService(logEntry);
    }
  }

  /**
   * Log general information
   */
  logInfo(message: string, context?: LogContext): void {
    const logEntry = {
      level: 'info',
      message,
      context,
      timestamp: new Date().toISOString()
    };

    if (this.isDevelopment) {
      console.info('ℹ️ INFO:', message, context);
      this.storeLocalLog(logEntry);
    }
  }

  /**
   * Log user actions for audit trail
   */
  logUserAction(action: string, userId: string, context?: LogContext): void {
    const logEntry = {
      level: 'audit',
      action,
      userId,
      context,
      timestamp: new Date().toISOString()
    };

    if (this.isDevelopment) {
      console.log('👤 USER ACTION:', action, { userId, ...context });
    }

    // Always send user actions to external service for audit trail
    this.sendToExternalService(logEntry);
  }

  /**
   * Log performance metrics
   */
  logPerformance(metric: string, duration: number, context?: LogContext): void {
    const logEntry = {
      level: 'performance',
      metric,
      duration,
      context,
      timestamp: new Date().toISOString()
    };

    if (this.isDevelopment) {
      console.log(`⏱️ PERFORMANCE: ${metric} took ${duration}ms`, context);
      this.storeLocalLog(logEntry);
    }

    // Send performance data to monitoring service
    if (this.isProduction) {
      this.sendToExternalService(logEntry);
    }
  }

  private createLogEntry(error: AppError, additionalContext?: LogContext) {
    return {
      level: 'error',
      error: {
        id: error.id,
        code: error.code,
        category: error.category,
        severity: error.severity,
        message: error.message,
        userMessage: error.userMessage,
        retryable: error.retryable,
        suggestion: error.suggestion
      },
      context: {
        ...error.context,
        ...additionalContext
      },
      originalError: error.originalError?.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };
  }

  private storeLocalLog(logEntry: Record<string, unknown>): void {
    try {
      const logs = this.getLocalLogs();
      logs.push(logEntry);
      
      // Keep only last 100 logs to prevent storage overflow
      const recentLogs = logs.slice(-100);
      
      localStorage.setItem('ocma_logs', JSON.stringify(recentLogs));
    } catch (error) {
      console.warn('Failed to store log locally:', error);
    }
  }

  private getLocalLogs(): Record<string, unknown>[] {
    try {
      const stored = localStorage.getItem('ocma_logs');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  private sendToExternalService(logEntry: Record<string, unknown>): void {
    // In a real application, you would send logs to services like:
    // - Sentry
    // - LogRocket
    // - DataDog
    // - CloudWatch
    // - Your custom logging endpoint

    if (this.isProduction) {
      // Example: Send to custom logging endpoint
      fetch('/api/logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(logEntry)
      }).catch(error => {
        console.error('Failed to send log to external service:', error);
      });
    } else {
      // In development, just log that we would send it
      console.log('📤 Would send to external service:', logEntry);
    }
  }

  /**
   * Get recent logs for debugging (development only)
   */
  getRecentLogs(): Record<string, unknown>[] {
    if (!this.isDevelopment) {
      return [];
    }
    return this.getLocalLogs();
  }

  /**
   * Clear local logs
   */
  clearLogs(): void {
    if (this.isDevelopment) {
      localStorage.removeItem('ocma_logs');
      console.log('🧹 Local logs cleared');
    }
  }

  /**
   * Export logs for debugging
   */
  exportLogs(): string {
    if (!this.isDevelopment) {
      return '';
    }
    
    const logs = this.getLocalLogs();
    return JSON.stringify(logs, null, 2);
  }
}

// Singleton instance
export const errorLogger = new ErrorLogger();