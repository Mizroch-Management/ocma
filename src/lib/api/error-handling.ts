// Advanced Error Handling and Retry Logic
// Production-ready error management for social media APIs

export interface APIError {
  code: string;
  message: string;
  platform?: string;
  statusCode?: number;
  retryAfter?: number;
  isRetryable: boolean;
  context?: Record<string, any>;
}

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableStatusCodes: number[];
  retryableErrors: string[];
}

export class APIErrorHandler {
  private static readonly DEFAULT_RETRY_CONFIG: RetryConfig = {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
    retryableStatusCodes: [429, 500, 502, 503, 504],
    retryableErrors: ['NETWORK_ERROR', 'TIMEOUT', 'RATE_LIMIT']
  };

  static createError(
    code: string,
    message: string,
    options: Partial<APIError> = {}
  ): APIError {
    return {
      code,
      message,
      isRetryable: this.isRetryableError(code, options.statusCode),
      ...options
    };
  }

  static isRetryableError(code: string, statusCode?: number): boolean {
    const retryableCodes = this.DEFAULT_RETRY_CONFIG.retryableErrors;
    const retryableStatus = this.DEFAULT_RETRY_CONFIG.retryableStatusCodes;
    
    return retryableCodes.includes(code) || 
           (statusCode !== undefined && retryableStatus.includes(statusCode));
  }

  static async withRetry<T>(
    operation: () => Promise<T>,
    config: Partial<RetryConfig> = {}
  ): Promise<T> {
    const finalConfig = { ...this.DEFAULT_RETRY_CONFIG, ...config };
    let lastError: APIError | null = null;

    for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = this.normalizeError(error);
        
        if (!lastError.isRetryable || attempt === finalConfig.maxAttempts) {
          throw lastError;
        }

        const delay = this.calculateDelay(attempt, finalConfig, lastError.retryAfter);
        console.warn(`Attempt ${attempt} failed, retrying in ${delay}ms:`, lastError.message);
        
        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  private static normalizeError(error: any): APIError {
    if (error instanceof APIError) {
      return error;
    }

    // Handle HTTP response errors
    if (error.response) {
      const { status, statusText, data } = error.response;
      
      return this.createError(
        this.getErrorCodeFromStatus(status),
        this.getErrorMessage(data) || statusText || 'HTTP Error',
        {
          statusCode: status,
          platform: this.detectPlatform(error.config?.url),
          retryAfter: this.getRetryAfter(error.response.headers),
          context: {
            url: error.config?.url,
            method: error.config?.method,
            data: data
          }
        }
      );
    }

    // Handle network errors
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      return this.createError(
        'TIMEOUT',
        'Request timeout',
        {
          context: { originalError: error.message }
        }
      );
    }

    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return this.createError(
        'NETWORK_ERROR',
        'Network connection failed',
        {
          context: { originalError: error.message }
        }
      );
    }

    // Handle platform-specific errors
    if (error.errors && Array.isArray(error.errors)) {
      // Twitter API v2 error format
      const twitterError = error.errors[0];
      return this.createError(
        `TWITTER_${twitterError.type}`,
        twitterError.detail || twitterError.title,
        {
          platform: 'twitter',
          context: { errors: error.errors }
        }
      );
    }

    // Generic error
    return this.createError(
      'UNKNOWN_ERROR',
      error.message || 'An unknown error occurred',
      {
        context: { originalError: error }
      }
    );
  }

  private static getErrorCodeFromStatus(status: number): string {
    switch (status) {
      case 400: return 'BAD_REQUEST';
      case 401: return 'UNAUTHORIZED';
      case 403: return 'FORBIDDEN';
      case 404: return 'NOT_FOUND';
      case 429: return 'RATE_LIMIT';
      case 500: return 'INTERNAL_SERVER_ERROR';
      case 502: return 'BAD_GATEWAY';
      case 503: return 'SERVICE_UNAVAILABLE';
      case 504: return 'GATEWAY_TIMEOUT';
      default: return `HTTP_${status}`;
    }
  }

  private static getErrorMessage(data: any): string | null {
    if (typeof data === 'string') return data;
    if (data?.error?.message) return data.error.message;
    if (data?.error_description) return data.error_description;
    if (data?.message) return data.message;
    if (data?.detail) return data.detail;
    return null;
  }

  private static detectPlatform(url?: string): string | undefined {
    if (!url) return undefined;
    
    if (url.includes('api.twitter.com')) return 'twitter';
    if (url.includes('graph.instagram.com')) return 'instagram';
    if (url.includes('graph.facebook.com')) return 'facebook';
    if (url.includes('api.linkedin.com')) return 'linkedin';
    if (url.includes('api.tiktok.com')) return 'tiktok';
    
    return undefined;
  }

  private static getRetryAfter(headers: any): number | undefined {
    const retryAfter = headers?.['retry-after'] || headers?.['x-rate-limit-reset'];
    if (!retryAfter) return undefined;
    
    const value = parseInt(retryAfter, 10);
    return isNaN(value) ? undefined : value * 1000; // Convert to milliseconds
  }

  private static calculateDelay(
    attempt: number,
    config: RetryConfig,
    retryAfter?: number
  ): number {
    if (retryAfter) {
      return Math.min(retryAfter, config.maxDelay);
    }

    const exponentialDelay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1);
    const jitter = exponentialDelay * 0.1 * Math.random(); // Add 10% jitter
    
    return Math.min(exponentialDelay + jitter, config.maxDelay);
  }

  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Rate Limiting Manager
export class RateLimitManager {
  private static limits = new Map<string, RateLimit>();

  static async checkLimit(platform: string, endpoint: string): Promise<void> {
    const key = `${platform}:${endpoint}`;
    const limit = this.limits.get(key);

    if (limit && limit.remaining <= 0 && Date.now() < limit.resetTime) {
      const waitTime = limit.resetTime - Date.now();
      throw APIErrorHandler.createError(
        'RATE_LIMIT',
        `Rate limit exceeded for ${platform} ${endpoint}. Reset in ${Math.ceil(waitTime / 1000)}s`,
        {
          platform,
          retryAfter: waitTime,
          statusCode: 429
        }
      );
    }
  }

  static updateLimit(
    platform: string,
    endpoint: string,
    remaining: number,
    resetTime: number
  ): void {
    const key = `${platform}:${endpoint}`;
    this.limits.set(key, { remaining, resetTime });
  }

  static getRemainingRequests(platform: string, endpoint: string): number | null {
    const key = `${platform}:${endpoint}`;
    const limit = this.limits.get(key);
    return limit?.remaining ?? null;
  }
}

interface RateLimit {
  remaining: number;
  resetTime: number;
}

// Circuit Breaker Pattern
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(
    private readonly failureThreshold = 5,
    private readonly recoveryTimeout = 60000 // 1 minute
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.recoveryTimeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw APIErrorHandler.createError(
          'CIRCUIT_BREAKER_OPEN',
          'Circuit breaker is open. Service is temporarily unavailable.',
          { isRetryable: false }
        );
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
    }
  }

  getState(): string {
    return this.state;
  }

  getFailureCount(): number {
    return this.failures;
  }
}

// Platform-specific error handlers
export class PlatformErrorHandlers {
  static twitter(error: any): APIError {
    // Twitter-specific error handling
    if (error.errors) {
      const twitterError = error.errors[0];
      
      switch (twitterError.code) {
        case 32:
          return APIErrorHandler.createError(
            'TWITTER_AUTH_ERROR',
            'Twitter authentication failed',
            { platform: 'twitter', isRetryable: false }
          );
        case 88:
          return APIErrorHandler.createError(
            'TWITTER_RATE_LIMIT',
            'Twitter rate limit exceeded',
            { platform: 'twitter', retryAfter: 15 * 60 * 1000 } // 15 minutes
          );
        case 187:
          return APIErrorHandler.createError(
            'TWITTER_DUPLICATE',
            'Duplicate tweet detected',
            { platform: 'twitter', isRetryable: false }
          );
        default:
          return APIErrorHandler.createError(
            `TWITTER_${twitterError.code}`,
            twitterError.message,
            { platform: 'twitter' }
          );
      }
    }

    return APIErrorHandler.createError(
      'TWITTER_ERROR',
      error.message || 'Twitter API error',
      { platform: 'twitter' }
    );
  }

  static instagram(error: any): APIError {
    // Instagram-specific error handling
    if (error.error) {
      const instagramError = error.error;
      
      switch (instagramError.code) {
        case 100:
          return APIErrorHandler.createError(
            'INSTAGRAM_INVALID_PARAM',
            'Invalid parameter provided',
            { platform: 'instagram', isRetryable: false }
          );
        case 190:
          return APIErrorHandler.createError(
            'INSTAGRAM_AUTH_ERROR',
            'Instagram access token invalid',
            { platform: 'instagram', isRetryable: false }
          );
        default:
          return APIErrorHandler.createError(
            `INSTAGRAM_${instagramError.code}`,
            instagramError.message,
            { platform: 'instagram' }
          );
      }
    }

    return APIErrorHandler.createError(
      'INSTAGRAM_ERROR',
      error.message || 'Instagram API error',
      { platform: 'instagram' }
    );
  }

  static linkedin(error: any): APIError {
    // LinkedIn-specific error handling
    if (error.serviceErrorCode) {
      switch (error.serviceErrorCode) {
        case 65600:
          return APIErrorHandler.createError(
            'LINKEDIN_RATE_LIMIT',
            'LinkedIn rate limit exceeded',
            { platform: 'linkedin', retryAfter: 24 * 60 * 60 * 1000 } // 24 hours
          );
        case 65601:
          return APIErrorHandler.createError(
            'LINKEDIN_AUTH_ERROR',
            'LinkedIn authentication failed',
            { platform: 'linkedin', isRetryable: false }
          );
        default:
          return APIErrorHandler.createError(
            `LINKEDIN_${error.serviceErrorCode}`,
            error.message,
            { platform: 'linkedin' }
          );
      }
    }

    return APIErrorHandler.createError(
      'LINKEDIN_ERROR',
      error.message || 'LinkedIn API error',
      { platform: 'linkedin' }
    );
  }
}

// Error reporting and monitoring
export class ErrorReporter {
  static async reportError(error: APIError, context?: Record<string, any>): Promise<void> {
    const errorReport = {
      code: error.code,
      message: error.message,
      platform: error.platform,
      statusCode: error.statusCode,
      timestamp: new Date().toISOString(),
      context: { ...error.context, ...context },
      stack: new Error().stack
    };

    try {
      // Send to logging service (e.g., Sentry, LogRocket, etc.)
      console.error('API Error Report:', errorReport);
      
      // In production, you might send this to an external service
      // await sendToErrorTrackingService(errorReport);
      
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError);
    }
  }

  static async reportMetrics(platform: string, endpoint: string, duration: number, success: boolean): Promise<void> {
    const metrics = {
      platform,
      endpoint,
      duration,
      success,
      timestamp: new Date().toISOString()
    };

    try {
      // Send to metrics service
      console.log('API Metrics:', metrics);
      
      // In production, you might send this to a metrics service
      // await sendToMetricsService(metrics);
      
    } catch (error) {
      console.error('Failed to report metrics:', error);
    }
  }
}

// Export utility functions
export const withErrorHandling = APIErrorHandler.withRetry;
export const handlePlatformError = (platform: string, error: any): APIError => {
  switch (platform) {
    case 'twitter':
      return PlatformErrorHandlers.twitter(error);
    case 'instagram':
      return PlatformErrorHandlers.instagram(error);
    case 'linkedin':
      return PlatformErrorHandlers.linkedin(error);
    default:
      return APIErrorHandler.normalizeError(error);
  }
};