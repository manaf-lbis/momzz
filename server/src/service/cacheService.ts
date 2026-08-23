import { redis } from '../config/redis';

interface MemoryCacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class CacheService {
  // L1 In-Memory Cache — keeps data until explicit invalidation / change
  private memoryCache = new Map<string, MemoryCacheEntry<any>>();

  // In-memory token blacklist Set — 0 Redis commands on every normal request
  private blacklistSet = new Set<string>();

  /**
   * Check if token is blacklisted. Checks fast local memory Set first (0 commands), then Redis only if needed.
   */
  async isTokenBlacklisted(token: string): Promise<boolean> {
    if (this.blacklistSet.has(token)) {
      return true;
    }
    return false;
  }

  /**
   * Blacklist a token on logout in both memory Set and Redis.
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
   * Get value. Checks in-memory L1 cache first (0 Redis commands).
   * Only queries Upstash Redis on cold cache miss.
   */
  async get<T>(key: string): Promise<T | null> {
    const now = Date.now();

    // 1. Check L1 in-memory cache
    const memoryEntry = this.memoryCache.get(key);
    if (memoryEntry) {
      if (memoryEntry.expiresAt > now) {
        return memoryEntry.value as T;
      }
      this.memoryCache.delete(key);
    }

    // 2. Fallback to L2 Upstash Redis on cold start
    try {
      const data = await redis.get<T>(key);
      if (data !== null && data !== undefined) {
        // Retain in L1 memory for 24 hours (or until explicitly deleted on change)
        this.memoryCache.set(key, {
          value: data,
          expiresAt: now + 24 * 60 * 60 * 1000,
        });
        return data;
      }
      return null;
    } catch (error: any) {
      console.warn(`[CACHE WARNING] Failed to get key "${key}": ${error.message}`);
      return null;
    }
  }

  /**
   * Set value in both L1 memory and Upstash Redis.
   * Uses long retention (24h+) — data is only replaced when a mutation occurs.
   */
  async set<T>(key: string, value: T, ttlSeconds: number = 86400): Promise<void> {
    const now = Date.now();

    // Set in L1 memory
    this.memoryCache.set(key, {
      value,
      expiresAt: now + ttlSeconds * 1000,
    });

    // Set in Upstash Redis
    try {
      await redis.set(key, value, { ex: ttlSeconds });
    } catch (error: any) {
      console.warn(`[CACHE WARNING] Failed to set key "${key}": ${error.message}`);
    }
  }

  /**
   * Delete one or more keys from memory and Redis (called on data changes).
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
   * In-memory throttled execution helper (avoids Redis command consumption for simple intervals).
   */
  shouldExecuteThrottled(key: string, intervalSeconds: number): boolean {
    const now = Date.now();
    const entry = this.memoryCache.get(key);
    if (entry && entry.expiresAt > now) {
      return false;
    }
    this.memoryCache.set(key, { value: true, expiresAt: now + intervalSeconds * 1000 });
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
