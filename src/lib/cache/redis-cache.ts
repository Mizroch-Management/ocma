import IORedis from 'ioredis';

// Redis cache manager for API responses and data caching
export class RedisCache {
  private redis: IORedis;
  private defaultTTL: number = 3600; // 1 hour default

  constructor() {
    this.redis = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      lazyConnect: true,
      onFailover: (err) => {
        console.warn('Redis failover detected:', err);
      }
    });

    this.redis.on('error', (err) => {
      console.error('Redis connection error:', err);
    });

    this.redis.on('connect', () => {
      console.log('Connected to Redis');
    });
  }

  // Generic cache methods
  async get<T = any>(key: string): Promise<T | null> {
    try {
      const data = await this.redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error(`Redis GET error for key ${key}:`, error);
      return null;
    }
  }

  async set(key: string, value: any, ttl: number = this.defaultTTL): Promise<boolean> {
    try {
      await this.redis.setex(key, ttl, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`Redis SET error for key ${key}:`, error);
      return false;
    }
  }

  async del(key: string): Promise<boolean> {
    try {
      await this.redis.del(key);
      return true;
    } catch (error) {
      console.error(`Redis DEL error for key ${key}:`, error);
      return false;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      console.error(`Redis EXISTS error for key ${key}:`, error);
      return false;
    }
  }

  // Social media analytics caching
  async cacheAnalytics(
    userId: string,
    platform: string,
    timeRange: string,
    data: any,
    ttl: number = 1800 // 30 minutes
  ): Promise<boolean> {
    const key = `analytics:${userId}:${platform}:${timeRange}`;
    return this.set(key, data, ttl);
  }

  async getAnalytics(
    userId: string,
    platform: string,
    timeRange: string
  ): Promise<any | null> {
    const key = `analytics:${userId}:${platform}:${timeRange}`;
    return this.get(key);
  }

  // Social media posts caching
  async cachePosts(
    userId: string,
    platform: string,
    posts: any[],
    ttl: number = 900 // 15 minutes
  ): Promise<boolean> {
    const key = `posts:${userId}:${platform}`;
    return this.set(key, posts, ttl);
  }

  async getPosts(userId: string, platform: string): Promise<any[] | null> {
    const key = `posts:${userId}:${platform}`;
    return this.get(key);
  }

  // AI analysis results caching
  async cacheAIAnalysis(
    content: string,
    platform: string,
    analysis: any,
    ttl: number = 7200 // 2 hours
  ): Promise<boolean> {
    const contentHash = this.hashContent(content);
    const key = `ai-analysis:${contentHash}:${platform}`;
    return this.set(key, analysis, ttl);
  }

  async getAIAnalysis(content: string, platform: string): Promise<any | null> {
    const contentHash = this.hashContent(content);
    const key = `ai-analysis:${contentHash}:${platform}`;
    return this.get(key);
  }

  // Content optimization caching
  async cacheOptimization(
    content: string,
    platform: string,
    optimization: any,
    ttl: number = 3600 // 1 hour
  ): Promise<boolean> {
    const contentHash = this.hashContent(content);
    const key = `optimization:${contentHash}:${platform}`;
    return this.set(key, optimization, ttl);
  }

  async getOptimization(content: string, platform: string): Promise<any | null> {
    const contentHash = this.hashContent(content);
    const key = `optimization:${contentHash}:${platform}`;
    return this.get(key);
  }

  // OAuth tokens caching (short TTL for security)
  async cacheTokens(
    userId: string,
    platform: string,
    tokens: any,
    ttl: number = 300 // 5 minutes
  ): Promise<boolean> {
    const key = `tokens:${userId}:${platform}`;
    return this.set(key, tokens, ttl);
  }

  async getTokens(userId: string, platform: string): Promise<any | null> {
    const key = `tokens:${userId}:${platform}`;
    return this.get(key);
  }

  // Scheduling analysis caching
  async cacheSchedulingAnalysis(
    userId: string,
    platforms: string[],
    analysis: any,
    ttl: number = 1800 // 30 minutes
  ): Promise<boolean> {
    const key = `scheduling:${userId}:${platforms.sort().join(',')}`;
    return this.set(key, analysis, ttl);
  }

  async getSchedulingAnalysis(
    userId: string,
    platforms: string[]
  ): Promise<any | null> {
    const key = `scheduling:${userId}:${platforms.sort().join(',')}`;
    return this.get(key);
  }

  // Rate limiting
  async checkRateLimit(
    key: string,
    limit: number,
    window: number
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    try {
      const current = await this.redis.incr(key);
      
      if (current === 1) {
        // First request in window, set expiration
        await this.redis.expire(key, window);
      }
      
      const ttl = await this.redis.ttl(key);
      const resetTime = Date.now() + (ttl * 1000);
      
      return {
        allowed: current <= limit,
        remaining: Math.max(0, limit - current),
        resetTime
      };
    } catch (error) {
      console.error('Rate limit check error:', error);
      // On error, allow the request
      return {
        allowed: true,
        remaining: limit - 1,
        resetTime: Date.now() + (window * 1000)
      };
    }
  }

  // Session management
  async cacheSession(
    sessionId: string,
    sessionData: any,
    ttl: number = 86400 // 24 hours
  ): Promise<boolean> {
    const key = `session:${sessionId}`;
    return this.set(key, sessionData, ttl);
  }

  async getSession(sessionId: string): Promise<any | null> {
    const key = `session:${sessionId}`;
    return this.get(key);
  }

  async invalidateSession(sessionId: string): Promise<boolean> {
    const key = `session:${sessionId}`;
    return this.del(key);
  }

  // Bulk operations
  async cacheBulk(items: Array<{ key: string; value: any; ttl?: number }>): Promise<boolean> {
    try {
      const pipeline = this.redis.pipeline();
      
      for (const item of items) {
        const ttl = item.ttl || this.defaultTTL;
        pipeline.setex(item.key, ttl, JSON.stringify(item.value));
      }
      
      await pipeline.exec();
      return true;
    } catch (error) {
      console.error('Bulk cache error:', error);
      return false;
    }
  }

  async getBulk(keys: string[]): Promise<Record<string, any>> {
    try {
      if (keys.length === 0) return {};
      
      const values = await this.redis.mget(...keys);
      const result: Record<string, any> = {};
      
      for (let i = 0; i < keys.length; i++) {
        const value = values[i];
        if (value) {
          try {
            result[keys[i]] = JSON.parse(value);
          } catch {
            // Skip invalid JSON
          }
        }
      }
      
      return result;
    } catch (error) {
      console.error('Bulk get error:', error);
      return {};
    }
  }

  // Cache invalidation patterns
  async invalidatePattern(pattern: string): Promise<number> {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length === 0) return 0;
      
      await this.redis.del(...keys);
      return keys.length;
    } catch (error) {
      console.error('Pattern invalidation error:', error);
      return 0;
    }
  }

  // Clear user-specific cache
  async clearUserCache(userId: string): Promise<number> {
    const patterns = [
      `analytics:${userId}:*`,
      `posts:${userId}:*`,
      `tokens:${userId}:*`,
      `scheduling:${userId}:*`
    ];
    
    let totalCleared = 0;
    for (const pattern of patterns) {
      totalCleared += await this.invalidatePattern(pattern);
    }
    
    return totalCleared;
  }

  // Health check
  async ping(): Promise<boolean> {
    try {
      const result = await this.redis.ping();
      return result === 'PONG';
    } catch (error) {
      console.error('Redis ping error:', error);
      return false;
    }
  }

  // Get cache statistics
  async getStats(): Promise<any> {
    try {
      const info = await this.redis.info('memory');
      const keyspace = await this.redis.info('keyspace');
      
      return {
        memory: this.parseRedisInfo(info),
        keyspace: this.parseRedisInfo(keyspace),
        connected: true
      };
    } catch (error) {
      console.error('Redis stats error:', error);
      return {
        memory: {},
        keyspace: {},
        connected: false,
        error: error.message
      };
    }
  }

  // Close connection
  async disconnect(): Promise<void> {
    try {
      await this.redis.quit();
    } catch (error) {
      console.error('Redis disconnect error:', error);
    }
  }

  // Private utility methods
  private hashContent(content: string): string {
    // Simple hash function for content
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  private parseRedisInfo(info: string): Record<string, any> {
    const result: Record<string, any> = {};
    const lines = info.split('\r\n');
    
    for (const line of lines) {
      if (line.includes(':')) {
        const [key, value] = line.split(':');
        result[key] = isNaN(Number(value)) ? value : Number(value);
      }
    }
    
    return result;
  }
}

// Singleton instance
export const cache = new RedisCache();

// Cache decorators and middleware
export function withCache<T extends any[], R>(
  keyGenerator: (...args: T) => string,
  ttl: number = 3600
) {
  return function (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor
  ) {
    const method = descriptor.value;

    descriptor.value = async function (...args: T): Promise<R> {
      const cacheKey = keyGenerator(...args);
      
      // Try to get from cache first
      const cached = await cache.get<R>(cacheKey);
      if (cached !== null) {
        return cached;
      }
      
      // Execute original method
      const result = await method.apply(this, args);
      
      // Cache the result
      await cache.set(cacheKey, result, ttl);
      
      return result;
    };
  };
}

// Cache-aware fetch wrapper
export async function cachedFetch(
  url: string,
  options: RequestInit = {},
  cacheKey?: string,
  ttl: number = 600 // 10 minutes default
): Promise<Response> {
  const key = cacheKey || `fetch:${url}:${JSON.stringify(options)}`;
  
  // Try cache first
  const cached = await cache.get(key);
  if (cached) {
    return new Response(JSON.stringify(cached.body), {
      status: cached.status,
      statusText: cached.statusText,
      headers: cached.headers
    });
  }
  
  // Make actual fetch
  const response = await fetch(url, options);
  const body = await response.clone().json();
  
  // Cache successful responses
  if (response.ok) {
    await cache.set(key, {
      body,
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries())
    }, ttl);
  }
  
  return response;
}