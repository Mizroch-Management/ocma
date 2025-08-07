import { v4 as uuidv4 } from 'uuid';
import {
  AppError,
  ErrorCategory,
  ErrorSeverity,
  ErrorContext,
  ValidationError,
  NetworkError,
  DatabaseError,
  AIServiceError,
  AuthenticationError,
  AuthorizationError,
  ERROR_CODES,
  ErrorCode
} from './error-types';

/**
 * Factory class for creating structured application errors
 * Provides consistent error creation with proper context and categorization
 */
export class ErrorFactory {
  private static createBaseError(
    code: ErrorCode,
    category: ErrorCategory,
    severity: ErrorSeverity,
    message: string,
    userMessage: string,
    context: Partial<ErrorContext>,
    retryable: boolean = false,
    originalError?: Error
  ): AppError {
    return {
      id: uuidv4(),
      code,
      category,
      severity,
      message,
      userMessage,
      context: {
        timestamp: new Date(),
        ...context
      },
      originalError,
      stack: originalError?.stack || new Error().stack,
      retryable,
      suggestion: this.getSuggestionForError(code)
    };
  }

  // Authentication Errors
  static createAuthenticationError(
    code: ErrorCode,
    message: string,
    userMessage: string,
    context: Partial<ErrorContext> & { attemptedAction?: string },
    originalError?: Error
  ): AuthenticationError {
    return {
      ...this.createBaseError(code, ErrorCategory.AUTHENTICATION, ErrorSeverity.MEDIUM, message, userMessage, context, false, originalError),
      category: ErrorCategory.AUTHENTICATION,
      attemptedAction: context.attemptedAction
    };
  }

  // Authorization Errors
  static createAuthorizationError(
    code: ErrorCode,
    message: string,
    userMessage: string,
    context: Partial<ErrorContext> & { requiredPermission?: string; userRole?: string },
    originalError?: Error
  ): AuthorizationError {
    return {
      ...this.createBaseError(code, ErrorCategory.AUTHORIZATION, ErrorSeverity.MEDIUM, message, userMessage, context, false, originalError),
      category: ErrorCategory.AUTHORIZATION,
      requiredPermission: context.requiredPermission,
      userRole: context.userRole
    };
  }

  // Validation Errors
  static createValidationError(
    code: ErrorCode,
    message: string,
    userMessage: string,
    context: Partial<ErrorContext> & { fields?: Record<string, string[]> },
    originalError?: Error
  ): ValidationError {
    return {
      ...this.createBaseError(code, ErrorCategory.VALIDATION, ErrorSeverity.LOW, message, userMessage, context, false, originalError),
      category: ErrorCategory.VALIDATION,
      fields: context.fields
    };
  }

  // Network Errors
  static createNetworkError(
    code: ErrorCode,
    message: string,
    userMessage: string,
    context: Partial<ErrorContext> & { status?: number; endpoint?: string; method?: string },
    originalError?: Error
  ): NetworkError {
    const isRetryable = this.isNetworkErrorRetryable(context.status);
    return {
      ...this.createBaseError(code, ErrorCategory.NETWORK, ErrorSeverity.MEDIUM, message, userMessage, context, isRetryable, originalError),
      category: ErrorCategory.NETWORK,
      status: context.status,
      endpoint: context.endpoint,
      method: context.method
    };
  }

  // Database Errors
  static createDatabaseError(
    code: ErrorCode,
    message: string,
    userMessage: string,
    context: Partial<ErrorContext> & { query?: string; table?: string; operation?: string },
    originalError?: Error
  ): DatabaseError {
    return {
      ...this.createBaseError(code, ErrorCategory.DATABASE, ErrorSeverity.HIGH, message, userMessage, context, true, originalError),
      category: ErrorCategory.DATABASE,
      query: context.query,
      table: context.table,
      operation: context.operation
    };
  }

  // AI Service Errors
  static createAIServiceError(
    code: ErrorCode,
    message: string,
    userMessage: string,
    context: Partial<ErrorContext> & { provider?: string; model?: string; promptLength?: number; tokensUsed?: number },
    originalError?: Error
  ): AIServiceError {
    const isRetryable = code !== ERROR_CODES.AI_INAPPROPRIATE_CONTENT && code !== ERROR_CODES.AI_INVALID_PROMPT;
    return {
      ...this.createBaseError(code, ErrorCategory.AI_SERVICE, ErrorSeverity.MEDIUM, message, userMessage, context, isRetryable, originalError),
      category: ErrorCategory.AI_SERVICE,
      provider: context.provider,
      model: context.model,
      promptLength: context.promptLength,
      tokensUsed: context.tokensUsed
    };
  }

  // Generic Error
  static createGenericError(
    category: ErrorCategory,
    severity: ErrorSeverity,
    message: string,
    userMessage: string,
    context: Partial<ErrorContext>,
    retryable: boolean = false,
    originalError?: Error
  ): AppError {
    return this.createBaseError(
      ERROR_CODES.UNKNOWN_ERROR,
      category,
      severity,
      message,
      userMessage,
      context,
      retryable,
      originalError
    );
  }

  // Specific common error creators
  static invalidCredentials(context: Partial<ErrorContext>): AuthenticationError {
    return this.createAuthenticationError(
      ERROR_CODES.AUTH_INVALID_CREDENTIALS,
      'Invalid email or password provided',
      'The email or password you entered is incorrect. Please try again.',
      context
    );
  }

  static tokenExpired(context: Partial<ErrorContext>): AuthenticationError {
    return this.createAuthenticationError(
      ERROR_CODES.AUTH_TOKEN_EXPIRED,
      'Authentication token has expired',
      'Your session has expired. Please log in again.',
      context
    );
  }

  static insufficientPermissions(requiredPermission: string, userRole: string, context: Partial<ErrorContext>): AuthorizationError {
    return this.createAuthorizationError(
      ERROR_CODES.AUTHZ_INSUFFICIENT_PERMISSIONS,
      `User with role ${userRole} does not have permission: ${requiredPermission}`,
      'You do not have permission to perform this action. Please contact your administrator.',
      { ...context, requiredPermission, userRole }
    );
  }

  static validationFailed(fields: Record<string, string[]>, context: Partial<ErrorContext>): ValidationError {
    return this.createValidationError(
      ERROR_CODES.VALIDATION_REQUIRED_FIELD,
      'Form validation failed',
      'Please correct the highlighted fields and try again.',
      { ...context, fields }
    );
  }

  static networkTimeout(endpoint: string, context: Partial<ErrorContext>): NetworkError {
    return this.createNetworkError(
      ERROR_CODES.NETWORK_TIMEOUT,
      `Request to ${endpoint} timed out`,
      'The request is taking longer than expected. Please try again.',
      { ...context, endpoint }
    );
  }

  static aiServiceUnavailable(provider: string, context: Partial<ErrorContext>): AIServiceError {
    return this.createAIServiceError(
      ERROR_CODES.AI_SERVICE_UNAVAILABLE,
      `AI service ${provider} is currently unavailable`,
      'AI service is temporarily unavailable. Please try again in a few minutes.',
      { ...context, provider }
    );
  }

  static recordNotFound(table: string, context: Partial<ErrorContext>): DatabaseError {
    return this.createDatabaseError(
      ERROR_CODES.DB_RECORD_NOT_FOUND,
      `Record not found in table: ${table}`,
      'The requested item could not be found.',
      { ...context, table }
    );
  }

  // Helper methods
  private static isNetworkErrorRetryable(status?: number): boolean {
    if (!status) return true;
    // Retry on 5xx errors and specific 4xx errors
    return status >= 500 || status === 408 || status === 429;
  }

  private static getSuggestionForError(code: ErrorCode): string | undefined {
    const suggestions: Record<string, string> = {
      [ERROR_CODES.AUTH_INVALID_CREDENTIALS]: 'Double-check your email and password, or use the forgot password option.',
      [ERROR_CODES.AUTH_TOKEN_EXPIRED]: 'Log in again to continue using the application.',
      [ERROR_CODES.NETWORK_CONNECTION_FAILED]: 'Check your internet connection and try again.',
      [ERROR_CODES.NETWORK_TIMEOUT]: 'Check your connection or try again later.',
      [ERROR_CODES.AI_SERVICE_UNAVAILABLE]: 'Try using a different AI provider or wait a few minutes.',
      [ERROR_CODES.FILE_TOO_LARGE]: 'Try compressing your file or selecting a smaller file.',
      [ERROR_CODES.VALIDATION_REQUIRED_FIELD]: 'Fill in all required fields before submitting.',
      [ERROR_CODES.DB_CONNECTION_FAILED]: 'Please try again. If the problem persists, contact support.'
    };

    return suggestions[code];
  }
}