import { redis } from '../config/redis';

export class CacheService {
  /**
   * Get parsed JSON value from Redis by key.
   * Gracefully returns null on Redis network failure.
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await redis.get<T>(key);
      return data ?? null;
    } catch (error: any) {
      console.warn(`[CACHE WARNING] Failed to get key "${key}": ${error.message}`);
      return null;
    }
  }

  /**
   * Set JSON value in Redis with optional TTL (in seconds).
   */
  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
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
   * Delete one or more keys from Redis.
   */
  async del(keyOrKeys: string | string[]): Promise<void> {
    try {
      const keys = Array.isArray(keyOrKeys) ? keyOrKeys : [keyOrKeys];
      if (keys.length === 0) return;
      await redis.del(...keys);
    } catch (error: any) {
      console.warn(`[CACHE WARNING] Failed to del key(s): ${error.message}`);
    }
  }

  /**
   * Delete all keys matching a specific prefix pattern using scan or direct delete.
   */
  async delByPrefix(prefix: string): Promise<void> {
    try {
      // In Upstash Redis REST, keys can be fetched via keys()
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
   * Set a key if it does not exist (useful for distributed locks / heartbeats).
   * Returns true if key was set, false if it already existed.
   */
  async setNX(key: string, value: string | number, ttlSeconds: number): Promise<boolean> {
    try {
      const res = await redis.set(key, value, { nx: true, ex: ttlSeconds });
      return res === 'OK';
    } catch (error: any) {

      console.warn(`[CACHE WARNING] Failed to setNX "${key}": ${error.message}`);
      return false;
    }
  }

  /**
   * Atomic increment with automatic TTL on first increment.
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
