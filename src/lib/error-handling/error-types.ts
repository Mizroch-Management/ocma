/**
 * Comprehensive error type definitions for the OCMA application
 * Provides structured error handling with different categories and severity levels
 */

export enum ErrorCategory {
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  VALIDATION = 'validation',
  NETWORK = 'network',
  DATABASE = 'database',
  AI_SERVICE = 'ai_service',
  FILE_UPLOAD = 'file_upload',
  RATE_LIMIT = 'rate_limit',
  BUSINESS_LOGIC = 'business_logic',
  UNKNOWN = 'unknown'
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface ErrorContext {
  userId?: string;
  organizationId?: string;
  component?: string;
  action?: string;
  timestamp: Date;
  userAgent?: string;
  url?: string;
  additionalData?: Record<string, any>;
}

export interface AppError {
  id: string;
  code: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  message: string;
  userMessage: string;
  context: ErrorContext;
  originalError?: Error;
  stack?: string;
  retryable: boolean;
  suggestion?: string;
}

// Specific error types for different scenarios
export interface ValidationError extends AppError {
  category: ErrorCategory.VALIDATION;
  fields?: Record<string, string[]>;
}

export interface NetworkError extends AppError {
  category: ErrorCategory.NETWORK;
  status?: number;
  endpoint?: string;
  method?: string;
}

export interface DatabaseError extends AppError {
  category: ErrorCategory.DATABASE;
  query?: string;
  table?: string;
  operation?: string;
}

export interface AIServiceError extends AppError {
  category: ErrorCategory.AI_SERVICE;
  provider?: string;
  model?: string;
  promptLength?: number;
  tokensUsed?: number;
}

export interface AuthenticationError extends AppError {
  category: ErrorCategory.AUTHENTICATION;
  attemptedAction?: string;
}

export interface AuthorizationError extends AppError {
  category: ErrorCategory.AUTHORIZATION;
  requiredPermission?: string;
  userRole?: string;
}

// Error codes for consistent error identification
export const ERROR_CODES = {
  // Authentication
  AUTH_INVALID_CREDENTIALS: 'AUTH_001',
  AUTH_TOKEN_EXPIRED: 'AUTH_002',
  AUTH_SESSION_INVALID: 'AUTH_003',
  AUTH_MFA_REQUIRED: 'AUTH_004',
  
  // Authorization
  AUTHZ_INSUFFICIENT_PERMISSIONS: 'AUTHZ_001',
  AUTHZ_RESOURCE_ACCESS_DENIED: 'AUTHZ_002',
  AUTHZ_ORGANIZATION_ACCESS_DENIED: 'AUTHZ_003',
  
  // Validation
  VALIDATION_REQUIRED_FIELD: 'VAL_001',
  VALIDATION_INVALID_FORMAT: 'VAL_002',
  VALIDATION_LENGTH_EXCEEDED: 'VAL_003',
  VALIDATION_INVALID_TYPE: 'VAL_004',
  
  // Network
  NETWORK_CONNECTION_FAILED: 'NET_001',
  NETWORK_TIMEOUT: 'NET_002',
  NETWORK_RATE_LIMITED: 'NET_003',
  NETWORK_SERVICE_UNAVAILABLE: 'NET_004',
  
  // Database
  DB_CONNECTION_FAILED: 'DB_001',
  DB_QUERY_FAILED: 'DB_002',
  DB_CONSTRAINT_VIOLATION: 'DB_003',
  DB_RECORD_NOT_FOUND: 'DB_004',
  
  // AI Service
  AI_SERVICE_UNAVAILABLE: 'AI_001',
  AI_INVALID_PROMPT: 'AI_002',
  AI_TOKEN_LIMIT_EXCEEDED: 'AI_003',
  AI_GENERATION_FAILED: 'AI_004',
  AI_INAPPROPRIATE_CONTENT: 'AI_005',
  
  // File Upload
  FILE_TOO_LARGE: 'FILE_001',
  FILE_INVALID_TYPE: 'FILE_002',
  FILE_UPLOAD_FAILED: 'FILE_003',
  
  // Business Logic
  BL_DUPLICATE_RESOURCE: 'BL_001',
  BL_INVALID_OPERATION: 'BL_002',
  BL_RESOURCE_LIMIT_EXCEEDED: 'BL_003',
  
  // Unknown
  UNKNOWN_ERROR: 'UNK_001'
} as const;

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];