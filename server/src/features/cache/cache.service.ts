import { redis } from '../../config/redis';

interface CacheEntry<T> {
  value: T;
  expiresAt?: number;
}

const MAX_MEMORY_CACHE_ENTRIES = 2000;

export class CacheService {
  // Bounded L1 In-Memory LRU Cache with TTL support
  private memoryCache = new Map<string, CacheEntry<any>>();

  // In-memory token blacklist Set — 0 Redis commands on every normal request
  private blacklistSet = new Set<string>();

  // In-memory throttled timestamps for background tasks
  private throttleMap = new Map<string, number>();

  /**
   * Check if token is blacklisted. Fast local memory lookup (0 commands).
   */
  async isTokenBlacklisted(token: string): Promise<boolean> {
    return this.blacklistSet.has(token);
  }

  /**
   * Blacklist a token on logout in memory and Redis.
   */
  async blacklistToken(token: string, ttlSeconds: number): Promise<void> {
    this.blacklistSet.add(token);
    setTimeout(() => {
      this.blacklistSet.delete(token);
    }, ttlSeconds * 1000);

    try {
      await redis.set(`jwt:blacklist:${token}`, true, { ex: ttlSeconds });
    } catch (error: any) {
      console.warn(`[CACHE WARNING] Failed to blacklist token in Redis: ${error.message}`);
    }
  }

  /**
   * Get value from cached memory directly (0ms, 0 Redis commands).
   * Falls back to Upstash Redis only on cold server start or memory cache miss.
   */
  async get<T>(key: string): Promise<T | null> {
    // 1. Direct in-memory lookup with LRU refresh and TTL check
    if (this.memoryCache.has(key)) {
      const entry = this.memoryCache.get(key)!;
      if (entry.expiresAt && Date.now() > entry.expiresAt) {
        this.memoryCache.delete(key);
      } else {
        // Refresh LRU order (delete & re-set moves it to the back)
        this.memoryCache.delete(key);
        this.memoryCache.set(key, entry);
        return entry.value as T;
      }
    }

    // 2. Fallback to Upstash Redis on cold start
    try {
      const data = await redis.get<T>(key);
      if (data !== null && data !== undefined) {
        this.setInMemory(key, data);
        return data;
      }
      return null;
    } catch (error: any) {
      console.warn(`[CACHE WARNING] Failed to get key "${key}": ${error.message}`);
      return null;
    }
  }

  /**
   * Helper to set in memory with bounded LRU eviction.
   */
  private setInMemory<T>(key: string, value: T, ttlSeconds?: number): void {
    if (this.memoryCache.has(key)) {
      this.memoryCache.delete(key);
    } else if (this.memoryCache.size >= MAX_MEMORY_CACHE_ENTRIES) {
      // Evict least recently used (first key in map iteration order)
      const oldestKey = this.memoryCache.keys().next().value;
      if (oldestKey) {
        this.memoryCache.delete(oldestKey);
      }
    }

    const expiresAt = ttlSeconds && ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : undefined;
    this.memoryCache.set(key, { value, expiresAt });
  }

  /**
   * Set value in memory and Upstash Redis.
   * If ttlSeconds is not passed, data is stored permanently until explicit invalidation.
   */
  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    // Store in bounded memory cache
    this.setInMemory(key, value, ttlSeconds);

    // Sync to Upstash Redis
    try {
      if (ttlSeconds && ttlSeconds > 0) {
        await redis.set(key, value, { ex: ttlSeconds });
      } else {
        await redis.set(key, value);
      }
    } catch (error: any) {
      console.warn(`[CACHE WARNING] Failed to set key "${key}": ${error.message}`);
    }
  }

  /**
   * Delete one or more keys from memory and Redis (called ONLY on database changes).
   */
  async del(keyOrKeys: string | string[]): Promise<void> {
    const keys = Array.isArray(keyOrKeys) ? keyOrKeys : [keyOrKeys];
    if (keys.length === 0) return;

    for (const key of keys) {
      this.memoryCache.delete(key);
    }

    try {
      await redis.del(...keys);
    } catch (error: any) {
      console.warn(`[CACHE WARNING] Failed to del key(s): ${error.message}`);
    }
  }

  /**
   * Invalidate all keys matching a prefix when related data changes.
   */
  async delByPrefix(prefix: string): Promise<void> {
    const cleanPrefix = prefix.replace(/\*$/, '');

    for (const key of this.memoryCache.keys()) {
      if (key.startsWith(cleanPrefix)) {
        this.memoryCache.delete(key);
      }
    }

    try {
      const pattern = prefix.endsWith('*') ? prefix : `${prefix}*`;
      const matchedKeys = await redis.keys(pattern);
      if (matchedKeys && matchedKeys.length > 0) {
        await redis.del(...matchedKeys);
      }
    } catch (error: any) {
      console.warn(`[CACHE WARNING] Failed to delByPrefix "${prefix}": ${error.message}`);
    }
  }

  /**
   * In-memory throttled execution helper for background updates.
   */
  shouldExecuteThrottled(key: string, intervalSeconds: number): boolean {
    const now = Date.now();
    const lastRun = this.throttleMap.get(key) || 0;
    if (now - lastRun < intervalSeconds * 1000) {
      return false;
    }
    this.throttleMap.set(key, now);
    return true;
  }

  /**
   * Atomic increment with automatic TTL (for rate limiting only).
   */
  async incrWithTTL(key: string, ttlSeconds: number): Promise<number> {
    try {
      const count = await redis.incr(key);
      if (count === 1) {
        await redis.expire(key, ttlSeconds);
      }
      return count;
    } catch (error: any) {
      console.warn(`[CACHE WARNING] Failed to incrWithTTL "${key}": ${error.message}`);
      return 0;
    }
  }

  /**
   * Check TTL of a key in seconds.
   */
  async ttl(key: string): Promise<number> {
    try {
      return await redis.ttl(key);
    } catch (error: any) {
      console.warn(`[CACHE WARNING] Failed to get ttl for "${key}": ${error.message}`);
      return -1;
    }
  }
}

export const cacheService = new CacheService();
