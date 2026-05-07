import Redis from 'ioredis';

type CacheEntry = {
  value: string;
  expiresAt: number;
};

const isCacheEnabled = process.env.CACHE_ENABLED !== 'false';
const defaultTtlSeconds = (() => {
  const parsed = Number.parseInt(process.env.CACHE_TTL_SECONDS || '120', 10);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }
  return 120;
})();

const redisUrl = process.env.REDIS_URL;
const redisClient = isCacheEnabled && redisUrl ? new Redis(redisUrl, { lazyConnect: true }) : null;
const memoryStore = new Map<string, CacheEntry>();

if (redisClient) {
  redisClient.on('error', (err) => {
    console.error('Redis cache error:', err);
  });
}

const purgeExpiredEntries = () => {
  const now = Date.now();
  for (const [key, entry] of memoryStore.entries()) {
    if (entry.expiresAt <= now) {
      memoryStore.delete(key);
    }
  }
};

export const getCache = async <T>(key: string): Promise<T | null> => {
  if (!isCacheEnabled) {
    return null;
  }

  try {
    if (redisClient) {
      const value = await redisClient.get(key);
      return value ? (JSON.parse(value) as T) : null;
    }

    purgeExpiredEntries();
    const entry = memoryStore.get(key);
    if (!entry || entry.expiresAt <= Date.now()) {
      if (entry) {
        memoryStore.delete(key);
      }
      return null;
    }
    return JSON.parse(entry.value) as T;
  } catch (error) {
    console.error(`Cache get failed for key ${key}:`, error);
    return null;
  }
};

export const setCache = async <T>(key: string, value: T, ttlSeconds = defaultTtlSeconds): Promise<void> => {
  if (!isCacheEnabled) {
    return;
  }

  const payload = JSON.stringify(value);
  const ttl = ttlSeconds > 0 ? ttlSeconds : defaultTtlSeconds;
  try {
    if (redisClient) {
      await redisClient.set(key, payload, 'EX', ttl);
      return;
    }

    memoryStore.set(key, {
      value: payload,
      expiresAt: Date.now() + ttl * 1000,
    });
  } catch (error) {
    console.error(`Cache set failed for key ${key}:`, error);
  }
};

export const deleteCacheKey = async (key: string): Promise<void> => {
  if (!isCacheEnabled) {
    return;
  }

  try {
    if (redisClient) {
      await redisClient.del(key);
      return;
    }

    memoryStore.delete(key);
  } catch (error) {
    console.error(`Cache delete failed for key ${key}:`, error);
  }
};

export const invalidateCacheByPrefix = async (prefix: string): Promise<void> => {
  if (!isCacheEnabled) {
    return;
  }

  try {
    if (redisClient) {
      const keys = await redisClient.keys(`${prefix}*`);
      if (keys.length) {
        await redisClient.del(keys);
      }
      return;
    }

    for (const key of memoryStore.keys()) {
      if (key.startsWith(prefix)) {
        memoryStore.delete(key);
      }
    }
  } catch (error) {
    console.error(`Cache invalidation failed for prefix ${prefix}:`, error);
  }
};

export const cacheConfig = {
  enabled: isCacheEnabled,
  defaultTtlSeconds,
  redis: Boolean(redisClient),
};
