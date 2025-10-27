/**
 * In-memory cache implementation that replaces the legacy Redis dependency.
 * The API mirrors the previous RedisCache class so existing imports continue
 * to function, but all values are stored in a process-local Map with TTL
 * metadata. This keeps the frontend build lean and avoids requiring Redis in
 * the browser/runtime.
 */

type CacheEntry<T = unknown> = {
  value: T;
  expiresAt: number;
};

type RateLimitEntry = {
  count: number;
};

function now(): number {
  return Date.now();
}

function secondsToMs(seconds: number): number {
  return seconds * 1000;
}

function sanitizePattern(pattern: string): RegExp {
  const escaped = pattern
    .replace(/[.+^${}()|[\\]\]/g, "\\$&")
    .replace(/\*/g, ".*");
  return new RegExp(`^${escaped}$`);
}

export class MemoryCache {
  private store = new Map<string, CacheEntry>();
  private rateLimitStore = new Map<string, CacheEntry<RateLimitEntry>>();
  private defaultTTL = 3600; // seconds

  private resolveEntry<T>(map: Map<string, CacheEntry<T>>, key: string): CacheEntry<T> | null {
    const entry = map.get(key);
    if (!entry) {
      return null;
    }

    if (entry.expiresAt <= now()) {
      map.delete(key);
      return null;
    }

    return entry;
  }

  async get<T = unknown>(key: string): Promise<T | null> {
    const entry = this.resolveEntry(this.store, key);
    return entry ? (entry.value as T) : null;
  }

  async set(key: string, value: unknown, ttl: number = this.defaultTTL): Promise<boolean> {
    const expiresAt = now() + secondsToMs(ttl);
    this.store.set(key, { value, expiresAt });
    return true;
  }

  async del(key: string): Promise<boolean> {
    return this.store.delete(key);
  }

  async exists(key: string): Promise<boolean> {
    return this.resolveEntry(this.store, key) !== null;
  }

  private hashContent(content: string): string {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      hash = (hash << 5) - hash + content.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(36);
  }

  // Analytics helpers
  async cacheAnalytics(userId: string, platform: string, timeRange: string, data: unknown, ttl = 1800) {
    return this.set(`analytics:${userId}:${platform}:${timeRange}`, data, ttl);
  }

  async getAnalytics<T>(userId: string, platform: string, timeRange: string): Promise<T | null> {
    return this.get<T>(`analytics:${userId}:${platform}:${timeRange}`);
  }

  async cachePosts(userId: string, platform: string, posts: unknown[], ttl = 900) {
    return this.set(`posts:${userId}:${platform}`, posts, ttl);
  }

  async getPosts<T>(userId: string, platform: string): Promise<T | null> {
    return this.get<T>(`posts:${userId}:${platform}`);
  }

  async cacheAIAnalysis(content: string, platform: string, analysis: unknown, ttl = 7200) {
    return this.set(`ai-analysis:${this.hashContent(content)}:${platform}`, analysis, ttl);
  }

  async getAIAnalysis<T>(content: string, platform: string): Promise<T | null> {
    return this.get<T>(`ai-analysis:${this.hashContent(content)}:${platform}`);
  }

  async cacheOptimization(content: string, platform: string, optimization: unknown, ttl = 3600) {
    return this.set(`optimization:${this.hashContent(content)}:${platform}`, optimization, ttl);
  }

  async getOptimization<T>(content: string, platform: string): Promise<T | null> {
    return this.get<T>(`optimization:${this.hashContent(content)}:${platform}`);
  }

  async cacheTokens(userId: string, platform: string, tokens: unknown, ttl = 300) {
    return this.set(`tokens:${userId}:${platform}`, tokens, ttl);
  }

  async getTokens<T>(userId: string, platform: string): Promise<T | null> {
    return this.get<T>(`tokens:${userId}:${platform}`);
  }

  async cacheSchedulingAnalysis(userId: string, platforms: string[], analysis: unknown, ttl = 1800) {
    const key = `scheduling:${userId}:${platforms.slice().sort().join(',')}`;
    return this.set(key, analysis, ttl);
  }

  async getSchedulingAnalysis<T>(userId: string, platforms: string[]): Promise<T | null> {
    const key = `scheduling:${userId}:${platforms.slice().sort().join(',')}`;
    return this.get<T>(key);
  }

  async checkRateLimit(key: string, limit: number, windowSeconds: number) {
    const entry = this.resolveEntry(this.rateLimitStore, key);
    if (!entry) {
      const expiresAt = now() + secondsToMs(windowSeconds);
      this.rateLimitStore.set(key, { value: { count: 1 }, expiresAt });
      return { allowed: true, remaining: limit - 1, resetTime: expiresAt };
    }

    entry.value.count += 1;
    this.rateLimitStore.set(key, entry);

    return {
      allowed: entry.value.count <= limit,
      remaining: Math.max(0, limit - entry.value.count),
      resetTime: entry.expiresAt,
    };
  }

  async cacheSession(sessionId: string, sessionData: unknown, ttl = 86400) {
    return this.set(`session:${sessionId}`, sessionData, ttl);
  }

  async getSession<T>(sessionId: string): Promise<T | null> {
    return this.get<T>(`session:${sessionId}`);
  }

  async invalidateSession(sessionId: string) {
    return this.del(`session:${sessionId}`);
  }

  async cacheBulk(items: Array<{ key: string; value: unknown; ttl?: number }>) {
    for (const item of items) {
      await this.set(item.key, item.value, item.ttl ?? this.defaultTTL);
    }
    return true;
  }

  async getBulk(keys: string[]) {
    const result: Record<string, unknown> = {};
    for (const key of keys) {
      const value = await this.get(key);
      if (value !== null) {
        result[key] = value;
      }
    }
    return result;
  }

  async invalidatePattern(pattern: string) {
    const regex = sanitizePattern(pattern);
    let removed = 0;
    for (const key of this.store.keys()) {
      if (regex.test(key)) {
        this.store.delete(key);
        removed += 1;
      }
    }
    return removed;
  }

  async clearUserCache(userId: string) {
    const patterns = [
      `analytics:${userId}:.*`,
      `posts:${userId}:.*`,
      `tokens:${userId}:.*`,
      `scheduling:${userId}:.*`,
    ];

    let totalCleared = 0;
    for (const pattern of patterns) {
      totalCleared += await this.invalidatePattern(pattern);
    }
    return totalCleared;
  }

  async ping() {
    return true;
  }

  async getStats() {
    return {
      entries: this.store.size,
      connected: true,
      memory: {},
      keyspace: {},
    };
  }

  async disconnect() {
    this.store.clear();
    this.rateLimitStore.clear();
  }
}

export const cache = new MemoryCache();

export function withCache<T extends unknown[], R>(keyGenerator: (...args: T) => string, ttl = 3600) {
  return function (_target: unknown, _propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: T): Promise<R> {
      const cacheKey = keyGenerator(...args);
      const cached = await cache.get<R>(cacheKey);
      if (cached !== null) {
        return cached;
      }

      const result = await method.apply(this, args);
      await cache.set(cacheKey, result, ttl);
      return result;
    };
  };
}

export async function cachedFetch(
  url: string,
  options: RequestInit = {},
  cacheKey?: string,
  ttl = 600,
): Promise<Response> {
  const key = cacheKey || `fetch:${url}:${JSON.stringify(options)}`;
  const cached = await cache.get<{ body: unknown; status: number; statusText: string; headers: Record<string, string> }>(key);

  if (cached) {
    return new Response(JSON.stringify(cached.body), {
      status: cached.status,
      statusText: cached.statusText,
      headers: cached.headers,
    });
  }

  const response = await fetch(url, options);
  let body: unknown = null;

  try {
    body = await response.clone().json();
  } catch {
    body = await response.clone().text();
  }

  if (response.ok) {
    await cache.set(
      key,
      {
        body,
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
      },
      ttl,
    );
  }

  return response;
}
