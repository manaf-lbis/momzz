import { Redis } from '@upstash/redis';
import { ENV } from './env';

export const redis = new Redis({
  url: ENV.UPSTASH_REDIS_REST_URL || process.env.UPSTASH_REDIS_REST_URL || '',
  token: ENV.UPSTASH_REDIS_REST_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '',
});

export const testRedisConnection = async (): Promise<boolean> => {
  try {
    if (!ENV.UPSTASH_REDIS_REST_URL || !ENV.UPSTASH_REDIS_REST_TOKEN) {
      console.warn('[REDIS WARNING] Upstash Redis credentials not configured.');
      return false;
    }
    const pong = await redis.ping();
    console.log(`[REDIS] Connected to Upstash Redis successfully. Ping response: ${pong}`);
    return true;
  } catch (error: any) {
    console.warn(`[REDIS WARNING] Could not connect to Upstash Redis: ${error.message}`);
    return false;
  }
};
