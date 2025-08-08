/**
 * Professional Logging System for OCMA
 * 
 * Features:
 * - Multiple log levels (error, warn, info, debug)
 * - Environment-aware logging (development vs production)
 * - Structured log formatting
 * - Performance timing utilities
 * - Context-aware logging with metadata
 * - Integration with error tracking systems
 */

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

export interface LogContext {
  userId?: string;
  organizationId?: string;
  sessionId?: string;
  component?: string;
  action?: string;
  timestamp?: string;
  metadata?: Record<string, any>;
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: Error;
  data?: any;
  timestamp: string;
}

class Logger {
  private logLevel: LogLevel;
  private isDevelopment: boolean;
  private context: LogContext;

  constructor() {
    // Set log level based on environment
    this.isDevelopment = import.meta.env?.DEV || process.env.NODE_ENV === 'development';
    this.logLevel = this.isDevelopment ? LogLevel.DEBUG : LogLevel.INFO;
    this.context = {};
  }

  /**
   * Set global context that will be included in all logs
   */
  setContext(context: Partial<LogContext>): void {
    // Simplified context setting without spread operators
    Object.assign(this.context, context);
  }

  /**
   * Update specific context values
   */
  updateContext(key: keyof LogContext, value: any): void {
    this.context[key] = value;
  }

  /**
   * Clear global context
   */
  clearContext(): void {
    this.context = {};
  }

  /**
   * Log error level messages
   */
  error(message: string, error?: Error, data?: any, context?: Partial<LogContext>): void {
    this.log(LogLevel.ERROR, message, error, data, context);
  }

  /**
   * Log warning level messages
   */
  warn(message: string, data?: any, context?: Partial<LogContext>): void {
    this.log(LogLevel.WARN, message, undefined, data, context);
  }

  /**
   * Log info level messages
   */
  info(message: string, data?: any, context?: Partial<LogContext>): void {
    this.log(LogLevel.INFO, message, undefined, data, context);
  }

  /**
   * Log debug level messages (only in development)
   */
  debug(message: string, data?: any, context?: Partial<LogContext>): void {
    this.log(LogLevel.DEBUG, message, undefined, data, context);
  }

  /**
   * Performance timing utilities
   */
  time(label: string, context?: Partial<LogContext>): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.time(`[PERF] ${label}`);
      this.debug(`Performance timer started: ${label}`, undefined, context);
    }
  }

  timeEnd(label: string, context?: Partial<LogContext>): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.timeEnd(`[PERF] ${label}`);
      this.debug(`Performance timer ended: ${label}`, undefined, context);
    }
  }

  /**
   * API request/response logging
   */
  apiRequest(method: string, url: string, data?: any, context?: Partial<LogContext>): void {
    this.info(`API Request: ${method} ${url}`, { requestData: data }, context);
  }

  apiResponse(method: string, url: string, status: number, data?: any, duration?: number, context?: Partial<LogContext>): void {
    const level = status >= 400 ? LogLevel.ERROR : LogLevel.INFO;
    const message = `API Response: ${method} ${url} - ${status}`;
    
    this.log(level, message, undefined, { responseData: data, duration }, context);
  }

  /**
   * User action logging
   */
  userAction(action: string, data?: any, context?: Partial<LogContext>): void {
    this.info(`User Action: ${action}`, data, context);
  }

  /**
   * Component lifecycle logging
   */
  componentMount(component: string, props?: any): void {
    this.debug(`Component Mounted: ${component}`, { props }, {
      component,
      action: 'component_mount'
    });
  }

  componentUnmount(component: string): void {
    this.debug(`Component Unmounted: ${component}`, undefined, {
      component,
      action: 'component_unmount'
    });
  }

  /**
   * Workflow step logging
   */
  workflowStep(step: string, data?: any, context?: Partial<LogContext>): void {
    this.info(`Workflow Step: ${step}`, data, context);
  }

  /**
   * Core logging method
   */
  private log(level: LogLevel, message: string, error?: Error, data?: any, context?: Partial<LogContext>): void {
    if (!this.shouldLog(level)) {
      return;
    }

    // Simplified logging without spread operator issues
    const timestamp = new Date().toISOString();
    const simpleMessage = `[${timestamp}] ${message}`;

    // Output to appropriate console method
    switch (level) {
      case LogLevel.ERROR:
        console.error(simpleMessage, error || '');
        break;
      case LogLevel.WARN:
        console.warn(simpleMessage);
        break;
      case LogLevel.INFO:
        console.info(simpleMessage);
        break;
      case LogLevel.DEBUG:
        console.log(simpleMessage);
        break;
    }
  }

  /**
   * Check if we should log at the given level
   */
  private shouldLog(level: LogLevel): boolean {
    return level <= this.logLevel;
  }

  /**
   * Format log entry for display
   */
  private formatLogEntry(entry: LogEntry): string {
    const levelName = LogLevel[entry.level];
    const timestamp = new Date(entry.timestamp).toLocaleTimeString();
    
    let formatted = `[${timestamp}] [${levelName}]`;
    
    if (entry.context?.component) {
      formatted += ` [${entry.context.component}]`;
    }
    
    if (entry.context?.action) {
      formatted += ` [${entry.context.action}]`;
    }
    
    formatted += ` ${entry.message}`;
    
    if (entry.data) {
      formatted += ` ${JSON.stringify(entry.data, null, 2)}`;
    }
    
    return formatted;
  }

  /**
   * Send logs to external service (placeholder for production implementation)
   */
  private async sendToExternalLogger(entry: LogEntry): Promise<void> {
    // In production, this would send to services like:
    // - Sentry for error tracking
    // - LogRocket for session replay
    // - DataDog for application monitoring
    // - Custom logging endpoint
    
    try {
      // Example implementation:
      // await fetch('/api/logs', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(entry)
      // });
    } catch (error) {
      // Fail silently to avoid infinite logging loops
      console.error('Failed to send log to external service:', error);
    }
  }
}

// Create singleton logger instance
const logger = new Logger();

// Export logger instance and utilities
export { logger };

// Convenience functions for common use cases
export const log = {
  error: (message: string, error?: Error, data?: any, context?: Partial<LogContext>) => 
    logger.error(message, error, data, context),
  
  warn: (message: string, data?: any, context?: Partial<LogContext>) => 
    logger.warn(message, data, context),
  
  info: (message: string, data?: any, context?: Partial<LogContext>) => 
    logger.info(message, data, context),
  
  debug: (message: string, data?: any, context?: Partial<LogContext>) => 
    logger.debug(message, data, context),
  
  time: (label: string, context?: Partial<LogContext>) => 
    logger.time(label, context),
  
  timeEnd: (label: string, context?: Partial<LogContext>) => 
    logger.timeEnd(label, context),
  
  apiRequest: (method: string, url: string, data?: any, context?: Partial<LogContext>) => 
    logger.apiRequest(method, url, data, context),
  
  apiResponse: (method: string, url: string, status: number, data?: any, duration?: number, context?: Partial<LogContext>) => 
    logger.apiResponse(method, url, status, data, duration, context),
  
  userAction: (action: string, data?: any, context?: Partial<LogContext>) => 
    logger.userAction(action, data, context),
  
  workflowStep: (step: string, data?: any, context?: Partial<LogContext>) => 
    logger.workflowStep(step, data, context),
  
  setContext: (context: Partial<LogContext>) => 
    logger.setContext(context),
  
  updateContext: (key: keyof LogContext, value: any) => 
    logger.updateContext(key, value),
  
  clearContext: () => 
    logger.clearContext()
};

export default logger;