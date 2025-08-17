import { cache } from '@/lib/cache/redis-cache';

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
  retryableStatuses: number[];
  retryableErrors: string[];
}

export interface APIError extends Error {
  status?: number;
  code?: string;
  platform?: string;
  retryable?: boolean;
  context?: Record<string, any>;
}

export class APIErrorHandler {
  private static defaultRetryConfig: RetryConfig = {
    maxAttempts: 3,
    baseDelay: 1000, // 1 second
    maxDelay: 30000, // 30 seconds
    backoffFactor: 2,
    retryableStatuses: [408, 429, 500, 502, 503, 504],
    retryableErrors: [
      'ECONNRESET',
      'ETIMEDOUT',
      'ENOTFOUND',
      'ECONNREFUSED',
      'NETWORK_ERROR',
      'TIMEOUT'
    ]
  };

  // Main retry wrapper function
  static async withRetry<T>(
    operation: () => Promise<T>,
    config: Partial<RetryConfig> = {},
    context?: Record<string, any>
  ): Promise<T> {
    const finalConfig = { ...this.defaultRetryConfig, ...config };
    let lastError: APIError;
    
    for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = this.normalizeError(error, context);
        
        // Don't retry if it's the last attempt or error is not retryable
        if (attempt === finalConfig.maxAttempts || !this.isRetryable(lastError, finalConfig)) {
          break;
        }
        
        // Calculate delay with exponential backoff
        const delay = Math.min(
          finalConfig.baseDelay * Math.pow(finalConfig.backoffFactor, attempt - 1),
          finalConfig.maxDelay
        );
        
        console.warn(`Attempt ${attempt} failed, retrying in ${delay}ms:`, {
          error: lastError.message,
          status: lastError.status,
          platform: lastError.platform,
          context: lastError.context
        });
        
        await this.delay(delay);
      }
    }
    
    // Log final failure
    console.error('All retry attempts failed:', {
      error: lastError.message,
      attempts: finalConfig.maxAttempts,
      context: lastError.context
    });
    
    throw lastError;
  }

  // Social media API specific retry wrapper
  static async withSocialMediaRetry<T>(
    platform: string,
    operation: () => Promise<T>,
    context?: Record<string, any>
  ): Promise<T> {
    const platformConfig = this.getPlatformRetryConfig(platform);
    const enhancedContext = { ...context, platform };
    
    return this.withRetry(operation, platformConfig, enhancedContext);
  }

  // AI API specific retry wrapper
  static async withAIRetry<T>(
    operation: () => Promise<T>,
    context?: Record<string, any>
  ): Promise<T> {
    const aiConfig = {
      maxAttempts: 2, // AI APIs are expensive, limit retries
      baseDelay: 2000,
      maxDelay: 10000,
      retryableStatuses: [429, 500, 502, 503, 504], // Don't retry 4xx except rate limit
      retryableErrors: ['TIMEOUT', 'ECONNRESET']
    };
    
    const enhancedContext = { ...context, service: 'ai' };
    
    return this.withRetry(operation, aiConfig, enhancedContext);
  }

  // Rate limit aware retry
  static async withRateLimitRetry<T>(
    key: string,
    limit: number,
    windowSeconds: number,
    operation: () => Promise<T>,
    context?: Record<string, any>
  ): Promise<T> {
    // Check rate limit
    const rateLimitResult = await cache.checkRateLimit(key, limit, windowSeconds);
    
    if (!rateLimitResult.allowed) {
      const waitTime = rateLimitResult.resetTime - Date.now();
      
      if (waitTime > 0 && waitTime < 60000) { // Only wait if less than 1 minute
        console.warn(`Rate limit exceeded, waiting ${waitTime}ms`, { key, limit, remaining: rateLimitResult.remaining });
        await this.delay(waitTime);
      } else {
        throw this.createError('Rate limit exceeded', 429, 'RATE_LIMIT_EXCEEDED', context);
      }
    }
    
    return operation();
  }

  // Circuit breaker pattern
  private static circuitBreakers = new Map<string, {
    failures: number;
    lastFailure: number;
    state: 'closed' | 'open' | 'half-open';
  }>();

  static async withCircuitBreaker<T>(
    key: string,
    operation: () => Promise<T>,
    failureThreshold: number = 5,
    timeoutMs: number = 60000,
    context?: Record<string, any>
  ): Promise<T> {
    const breaker = this.circuitBreakers.get(key) || {
      failures: 0,
      lastFailure: 0,
      state: 'closed' as const
    };

    const now = Date.now();

    // Check if circuit should be reset
    if (breaker.state === 'open' && now - breaker.lastFailure > timeoutMs) {
      breaker.state = 'half-open';
      breaker.failures = 0;
    }

    // Reject if circuit is open
    if (breaker.state === 'open') {
      throw this.createError(
        `Circuit breaker is open for ${key}`,
        503,
        'CIRCUIT_BREAKER_OPEN',
        { ...context, key, state: breaker.state }
      );
    }

    try {
      const result = await operation();
      
      // Success - reset circuit breaker
      if (breaker.state === 'half-open') {
        breaker.state = 'closed';
        breaker.failures = 0;
      }
      
      this.circuitBreakers.set(key, breaker);
      return result;
    } catch (error) {
      breaker.failures++;
      breaker.lastFailure = now;
      
      // Open circuit if threshold reached
      if (breaker.failures >= failureThreshold) {
        breaker.state = 'open';
        console.error(`Circuit breaker opened for ${key}`, {
          failures: breaker.failures,
          threshold: failureThreshold
        });
      }
      
      this.circuitBreakers.set(key, breaker);
      throw error;
    }
  }

  // Error normalization
  private static normalizeError(error: any, context?: Record<string, any>): APIError {
    if (error instanceof APIError) {
      return error;
    }

    const apiError = new Error(error.message || 'Unknown error') as APIError;
    apiError.name = 'APIError';
    apiError.context = context;

    // Handle fetch/network errors
    if (error.code) {
      apiError.code = error.code;
      apiError.retryable = this.defaultRetryConfig.retryableErrors.includes(error.code);
    }

    // Handle HTTP response errors
    if (error.status || error.response?.status) {
      apiError.status = error.status || error.response.status;
      apiError.retryable = this.defaultRetryConfig.retryableStatuses.includes(apiError.status);
    }

    // Handle platform-specific errors
    if (context?.platform) {
      apiError.platform = context.platform;
      apiError.retryable = this.isPlatformErrorRetryable(context.platform, apiError);
    }

    return apiError;
  }

  // Check if error is retryable
  private static isRetryable(error: APIError, config: RetryConfig): boolean {
    // Explicit retry flag
    if (error.retryable !== undefined) {
      return error.retryable;
    }

    // Check status codes
    if (error.status && config.retryableStatuses.includes(error.status)) {
      return true;
    }

    // Check error codes
    if (error.code && config.retryableErrors.includes(error.code)) {
      return true;
    }

    return false;
  }

  // Platform-specific retry configurations
  private static getPlatformRetryConfig(platform: string): Partial<RetryConfig> {
    const configs: Record<string, Partial<RetryConfig>> = {
      twitter: {
        maxAttempts: 3,
        baseDelay: 1000,
        retryableStatuses: [429, 500, 502, 503, 504], // Twitter rate limits
      },
      instagram: {
        maxAttempts: 2,
        baseDelay: 2000,
        retryableStatuses: [429, 500, 502, 503, 504],
      },
      linkedin: {
        maxAttempts: 3,
        baseDelay: 1500,
        retryableStatuses: [429, 500, 502, 503, 504],
      },
      facebook: {
        maxAttempts: 3,
        baseDelay: 1000,
        retryableStatuses: [429, 500, 502, 503, 504],
      },
      openai: {
        maxAttempts: 2,
        baseDelay: 2000,
        maxDelay: 10000,
        retryableStatuses: [429, 500, 502, 503, 504],
      }
    };

    return configs[platform.toLowerCase()] || {};
  }

  // Platform-specific error handling
  private static isPlatformErrorRetryable(platform: string, error: APIError): boolean {
    const platformRules: Record<string, (error: APIError) => boolean> = {
      twitter: (err) => {
        // Twitter specific error codes
        if (err.status === 429) return true; // Rate limit
        if (err.status === 503) return true; // Over capacity
        return false;
      },
      openai: (err) => {
        // OpenAI specific handling
        if (err.status === 429) return true; // Rate limit
        if (err.status === 500) return true; // Server error
        if (err.message?.includes('timeout')) return true;
        return false;
      },
      instagram: (err) => {
        // Instagram specific handling
        if (err.status === 429) return true; // Rate limit
        if (err.status >= 500) return true; // Server errors
        return false;
      }
    };

    const rule = platformRules[platform.toLowerCase()];
    return rule ? rule(error) : false;
  }

  // Utility methods
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private static createError(
    message: string,
    status?: number,
    code?: string,
    context?: Record<string, any>
  ): APIError {
    const error = new Error(message) as APIError;
    error.name = 'APIError';
    error.status = status;
    error.code = code;
    error.context = context;
    return error;
  }

  // Graceful degradation helpers
  static async withFallback<T>(
    primary: () => Promise<T>,
    fallback: () => Promise<T>,
    condition?: (error: APIError) => boolean
  ): Promise<T> {
    try {
      return await primary();
    } catch (error) {
      const apiError = this.normalizeError(error);
      
      // Use fallback if condition is met or no condition provided
      if (!condition || condition(apiError)) {
        console.warn('Primary operation failed, using fallback:', apiError.message);
        return await fallback();
      }
      
      throw apiError;
    }
  }

  // Timeout wrapper
  static async withTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number,
    timeoutMessage: string = 'Operation timed out'
  ): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(this.createError(timeoutMessage, 408, 'TIMEOUT'));
      }, timeoutMs);
    });

    return Promise.race([operation(), timeoutPromise]);
  }

  // Bulk operation with partial failure handling
  static async processBulk<T, R>(
    items: T[],
    processor: (item: T) => Promise<R>,
    options: {
      maxConcurrent?: number;
      failFast?: boolean;
      retryConfig?: Partial<RetryConfig>;
    } = {}
  ): Promise<{ results: R[]; errors: { item: T; error: APIError }[] }> {
    const { maxConcurrent = 5, failFast = false, retryConfig } = options;
    const results: R[] = [];
    const errors: { item: T; error: APIError }[] = [];

    // Process in chunks to control concurrency
    for (let i = 0; i < items.length; i += maxConcurrent) {
      const chunk = items.slice(i, i + maxConcurrent);
      
      const chunkPromises = chunk.map(async (item) => {
        try {
          const operation = () => processor(item);
          const result = retryConfig 
            ? await this.withRetry(operation, retryConfig, { item })
            : await operation();
          
          return { success: true, result, item };
        } catch (error) {
          const apiError = this.normalizeError(error, { item });
          
          if (failFast) {
            throw apiError;
          }
          
          return { success: false, error: apiError, item };
        }
      });

      const chunkResults = await Promise.all(chunkPromises);
      
      for (const chunkResult of chunkResults) {
        if (chunkResult.success) {
          results.push(chunkResult.result);
        } else {
          errors.push({ item: chunkResult.item, error: chunkResult.error });
        }
      }
    }

    return { results, errors };
  }

  // Health check for external services
  static async healthCheck(
    name: string,
    checkFn: () => Promise<boolean>,
    cacheKey?: string,
    cacheTTL: number = 60
  ): Promise<{ healthy: boolean; cached: boolean; timestamp: number }> {
    const key = cacheKey || `health:${name}`;
    const timestamp = Date.now();
    
    // Try cache first
    const cached = await cache.get<boolean>(key);
    if (cached !== null) {
      return { healthy: cached, cached: true, timestamp };
    }
    
    try {
      const healthy = await this.withTimeout(checkFn, 5000, 'Health check timeout');
      await cache.set(key, healthy, cacheTTL);
      return { healthy, cached: false, timestamp };
    } catch (error) {
      console.error(`Health check failed for ${name}:`, error);
      await cache.set(key, false, cacheTTL);
      return { healthy: false, cached: false, timestamp };
    }
  }
}

// Export convenience functions
export const {
  withRetry,
  withSocialMediaRetry,
  withAIRetry,
  withRateLimitRetry,
  withCircuitBreaker,
  withFallback,
  withTimeout,
  processBulk,
  healthCheck
} = APIErrorHandler;