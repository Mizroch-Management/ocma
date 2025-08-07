// AI Error Handling and Fallback System - Phase 4 Enhancement
// Robust error handling, retry logic, and fallback strategies

import { log } from '@/utils/logger';

export enum AIErrorType {
  API_KEY_INVALID = 'API_KEY_INVALID',
  RATE_LIMIT = 'RATE_LIMIT',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  MODEL_UNAVAILABLE = 'MODEL_UNAVAILABLE',
  TIMEOUT = 'TIMEOUT',
  NETWORK_ERROR = 'NETWORK_ERROR',
  INVALID_REQUEST = 'INVALID_REQUEST',
  CONTENT_FILTER = 'CONTENT_FILTER',
  CONTEXT_LENGTH_EXCEEDED = 'CONTEXT_LENGTH_EXCEEDED',
  UNKNOWN = 'UNKNOWN'
}

export interface AIError {
  type: AIErrorType;
  message: string;
  provider?: string;
  model?: string;
  statusCode?: number;
  retryable: boolean;
  retryAfter?: number; // seconds
  fallbackSuggestion?: string;
  originalError?: any;
}

export interface RetryConfig {
  maxRetries: number;
  initialDelay: number; // milliseconds
  maxDelay: number; // milliseconds
  backoffMultiplier: number;
  jitter: boolean;
}

export interface FallbackConfig {
  enableFallback: boolean;
  fallbackModels: string[];
  fallbackProviders: string[];
  degradeGracefully: boolean;
  cacheResponses: boolean;
  cacheDuration: number; // seconds
}

// Default configurations
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  jitter: true
};

export const DEFAULT_FALLBACK_CONFIG: FallbackConfig = {
  enableFallback: true,
  fallbackModels: ['gpt-3.5-turbo', 'claude-3-sonnet', 'gemini-pro'],
  fallbackProviders: ['openai', 'anthropic', 'google_ai'],
  degradeGracefully: true,
  cacheResponses: true,
  cacheDuration: 3600 // 1 hour
};

export class AIErrorHandler {
  private retryConfig: RetryConfig;
  private fallbackConfig: FallbackConfig;
  private retryCount: Map<string, number> = new Map();
  private responseCache: Map<string, { response: any; timestamp: number }> = new Map();

  constructor(
    retryConfig: Partial<RetryConfig> = {},
    fallbackConfig: Partial<FallbackConfig> = {}
  ) {
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
    this.fallbackConfig = { ...DEFAULT_FALLBACK_CONFIG, ...fallbackConfig };
  }

  // Classify error type based on error details
  classifyError(error: any): AIError {
    const statusCode = error?.response?.status || error?.status;
    const message = error?.message || error?.response?.data?.error?.message || 'Unknown error';
    const errorCode = error?.response?.data?.error?.code || error?.code;

    let errorType = AIErrorType.UNKNOWN;
    let retryable = false;
    let retryAfter: number | undefined;
    let fallbackSuggestion: string | undefined;

    // API Key errors
    if (statusCode === 401 || errorCode === 'invalid_api_key' || message.includes('API key')) {
      errorType = AIErrorType.API_KEY_INVALID;
      retryable = false;
      fallbackSuggestion = 'Check API key configuration in settings';
    }
    // Rate limiting
    else if (statusCode === 429 || errorCode === 'rate_limit_exceeded') {
      errorType = AIErrorType.RATE_LIMIT;
      retryable = true;
      retryAfter = error?.response?.headers?.['retry-after'] || 60;
      fallbackSuggestion = 'Wait before retrying or use a different provider';
    }
    // Quota exceeded
    else if (errorCode === 'quota_exceeded' || message.includes('quota')) {
      errorType = AIErrorType.QUOTA_EXCEEDED;
      retryable = false;
      fallbackSuggestion = 'Upgrade plan or switch to a different provider';
    }
    // Model unavailable
    else if (statusCode === 503 || errorCode === 'model_unavailable') {
      errorType = AIErrorType.MODEL_UNAVAILABLE;
      retryable = true;
      fallbackSuggestion = 'Try a different model or wait for availability';
    }
    // Timeout
    else if (error?.code === 'ETIMEDOUT' || errorCode === 'timeout') {
      errorType = AIErrorType.TIMEOUT;
      retryable = true;
      fallbackSuggestion = 'Reduce request size or try a faster model';
    }
    // Network errors
    else if (error?.code === 'ECONNREFUSED' || error?.code === 'ENOTFOUND') {
      errorType = AIErrorType.NETWORK_ERROR;
      retryable = true;
      fallbackSuggestion = 'Check network connection';
    }
    // Invalid request
    else if (statusCode === 400 || errorCode === 'invalid_request') {
      errorType = AIErrorType.INVALID_REQUEST;
      retryable = false;
      fallbackSuggestion = 'Review and fix request parameters';
    }
    // Content filter
    else if (errorCode === 'content_filter' || message.includes('content policy')) {
      errorType = AIErrorType.CONTENT_FILTER;
      retryable = false;
      fallbackSuggestion = 'Modify content to comply with policies';
    }
    // Context length exceeded
    else if (errorCode === 'context_length_exceeded' || message.includes('context length')) {
      errorType = AIErrorType.CONTEXT_LENGTH_EXCEEDED;
      retryable = false;
      fallbackSuggestion = 'Reduce input size or use a model with larger context window';
    }
    // Unknown errors
    else {
      retryable = statusCode >= 500 || !statusCode;
    }

    return {
      type: errorType,
      message,
      statusCode,
      retryable,
      retryAfter,
      fallbackSuggestion,
      originalError: error
    };
  }

  // Calculate retry delay with exponential backoff and jitter
  calculateRetryDelay(attemptNumber: number): number {
    const { initialDelay, maxDelay, backoffMultiplier, jitter } = this.retryConfig;
    
    let delay = initialDelay * Math.pow(backoffMultiplier, attemptNumber - 1);
    delay = Math.min(delay, maxDelay);
    
    if (jitter) {
      // Add random jitter (±25%)
      const jitterAmount = delay * 0.25;
      delay = delay + (Math.random() * 2 - 1) * jitterAmount;
    }
    
    return Math.floor(delay);
  }

  // Execute with retry logic
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationId: string,
    customRetryConfig?: Partial<RetryConfig>
  ): Promise<T> {
    const config = { ...this.retryConfig, ...customRetryConfig };
    const retryKey = operationId;
    
    let lastError: AIError | null = null;
    let attempts = this.retryCount.get(retryKey) || 0;
    
    while (attempts < config.maxRetries) {
      attempts++;
      this.retryCount.set(retryKey, attempts);
      
      try {
        const result = await operation();
        this.retryCount.delete(retryKey); // Clear on success
        return result;
      } catch (error) {
        lastError = this.classifyError(error);
        
        log.warn(`AI operation failed (attempt ${attempts}/${config.maxRetries})`, {
          errorType: lastError.type,
          message: lastError.message,
          operationId,
          attempt: attempts
        });
        
        if (!lastError.retryable || attempts >= config.maxRetries) {
          break;
        }
        
        const delay = lastError.retryAfter 
          ? lastError.retryAfter * 1000 
          : this.calculateRetryDelay(attempts);
        
        log.info(`Retrying in ${delay}ms...`, { operationId, attempt: attempts });
        await this.sleep(delay);
      }
    }
    
    this.retryCount.delete(retryKey);
    throw lastError || new Error('Operation failed after retries');
  }

  // Execute with fallback options
  async executeWithFallback<T>(
    primaryOperation: () => Promise<T>,
    fallbackOperations: Array<() => Promise<T>>,
    operationId: string
  ): Promise<T> {
    if (!this.fallbackConfig.enableFallback) {
      return this.executeWithRetry(primaryOperation, operationId);
    }

    // Check cache first
    if (this.fallbackConfig.cacheResponses) {
      const cached = this.getCachedResponse(operationId);
      if (cached !== null) {
        log.info('Returning cached AI response', { operationId });
        return cached;
      }
    }

    const operations = [primaryOperation, ...fallbackOperations];
    let lastError: AIError | null = null;

    for (let i = 0; i < operations.length; i++) {
      const operation = operations[i];
      const attemptId = `${operationId}_fallback_${i}`;
      
      try {
        log.info(`Attempting operation ${i + 1}/${operations.length}`, { operationId });
        
        const result = await this.executeWithRetry(operation, attemptId);
        
        // Cache successful response
        if (this.fallbackConfig.cacheResponses) {
          this.cacheResponse(operationId, result);
        }
        
        return result;
      } catch (error) {
        lastError = error as AIError;
        
        log.warn(`Fallback ${i} failed`, {
          errorType: lastError.type,
          message: lastError.message,
          operationId
        });
        
        if (i === operations.length - 1) {
          // All fallbacks exhausted
          break;
        }
      }
    }

    // If degradeGracefully is enabled, return a degraded response
    if (this.fallbackConfig.degradeGracefully) {
      return this.getDegradedResponse<T>(operationId, lastError!);
    }

    throw lastError || new Error('All operations and fallbacks failed');
  }

  // Get cached response if available and not expired
  private getCachedResponse(operationId: string): any | null {
    const cached = this.responseCache.get(operationId);
    if (!cached) return null;

    const age = (Date.now() - cached.timestamp) / 1000;
    if (age > this.fallbackConfig.cacheDuration) {
      this.responseCache.delete(operationId);
      return null;
    }

    return cached.response;
  }

  // Cache a successful response
  private cacheResponse(operationId: string, response: any): void {
    this.responseCache.set(operationId, {
      response,
      timestamp: Date.now()
    });

    // Clean up old cache entries
    this.cleanupCache();
  }

  // Clean up expired cache entries
  private cleanupCache(): void {
    const now = Date.now();
    const maxAge = this.fallbackConfig.cacheDuration * 1000;

    for (const [key, value] of this.responseCache.entries()) {
      if (now - value.timestamp > maxAge) {
        this.responseCache.delete(key);
      }
    }
  }

  // Provide a degraded response when all else fails
  private getDegradedResponse<T>(operationId: string, error: AIError): T {
    log.warn('Returning degraded response', { operationId, error: error.message });

    // Return type-appropriate degraded responses
    const degradedResponses: Record<string, any> = {
      text: 'Service temporarily unavailable. Please try again later.',
      content: {
        text: 'Unable to generate content at this time.',
        fallback: true
      },
      analysis: {
        score: 0,
        insights: [],
        error: 'Analysis unavailable'
      },
      schedule: {
        times: [],
        recommendation: 'Unable to determine optimal times'
      }
    };

    // Try to determine response type from operationId
    for (const [key, value] of Object.entries(degradedResponses)) {
      if (operationId.toLowerCase().includes(key)) {
        return value as T;
      }
    }

    // Generic degraded response
    return { error: error.message, degraded: true } as any;
  }

  // Helper function for delays
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Clear all retry counts
  clearRetryCounters(): void {
    this.retryCount.clear();
  }

  // Clear response cache
  clearCache(): void {
    this.responseCache.clear();
  }

  // Get retry statistics
  getRetryStats(): { operationId: string; retries: number }[] {
    return Array.from(this.retryCount.entries()).map(([operationId, retries]) => ({
      operationId,
      retries
    }));
  }
}

// Circuit breaker for AI services
export class AICircuitBreaker {
  private failures: Map<string, number> = new Map();
  private lastFailureTime: Map<string, number> = new Map();
  private circuitState: Map<string, 'closed' | 'open' | 'half-open'> = new Map();
  
  constructor(
    private threshold: number = 5, // failures before opening
    private timeout: number = 60000, // ms before trying again
    private successThreshold: number = 2 // successes to close circuit
  ) {}

  async execute<T>(
    serviceId: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const state = this.getState(serviceId);
    
    if (state === 'open') {
      const lastFailure = this.lastFailureTime.get(serviceId) || 0;
      if (Date.now() - lastFailure < this.timeout) {
        throw new Error(`Circuit breaker is open for ${serviceId}`);
      }
      // Try half-open
      this.circuitState.set(serviceId, 'half-open');
    }
    
    try {
      const result = await operation();
      this.onSuccess(serviceId);
      return result;
    } catch (error) {
      this.onFailure(serviceId);
      throw error;
    }
  }

  private getState(serviceId: string): 'closed' | 'open' | 'half-open' {
    return this.circuitState.get(serviceId) || 'closed';
  }

  private onSuccess(serviceId: string): void {
    const state = this.getState(serviceId);
    
    if (state === 'half-open') {
      const failures = this.failures.get(serviceId) || 0;
      if (failures <= this.successThreshold) {
        this.circuitState.set(serviceId, 'closed');
        this.failures.delete(serviceId);
        this.lastFailureTime.delete(serviceId);
      } else {
        this.failures.set(serviceId, failures - 1);
      }
    }
  }

  private onFailure(serviceId: string): void {
    const failures = (this.failures.get(serviceId) || 0) + 1;
    this.failures.set(serviceId, failures);
    this.lastFailureTime.set(serviceId, Date.now());
    
    if (failures >= this.threshold) {
      this.circuitState.set(serviceId, 'open');
      log.error(`Circuit breaker opened for ${serviceId}`, { failures });
    }
  }

  reset(serviceId?: string): void {
    if (serviceId) {
      this.failures.delete(serviceId);
      this.lastFailureTime.delete(serviceId);
      this.circuitState.delete(serviceId);
    } else {
      this.failures.clear();
      this.lastFailureTime.clear();
      this.circuitState.clear();
    }
  }

  getStatus(serviceId: string): {
    state: string;
    failures: number;
    lastFailure: Date | null;
  } {
    return {
      state: this.getState(serviceId),
      failures: this.failures.get(serviceId) || 0,
      lastFailure: this.lastFailureTime.has(serviceId) 
        ? new Date(this.lastFailureTime.get(serviceId)!) 
        : null
    };
  }
}

// Export singleton instances
export const aiErrorHandler = new AIErrorHandler();
export const aiCircuitBreaker = new AICircuitBreaker();