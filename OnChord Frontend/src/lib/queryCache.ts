// src/lib/queryCache.ts
// Caches frequently-accessed Supabase query results to reduce API calls
// Cache only lasts during session and for queries that don't change often

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

const cache = new Map<string, CacheEntry<any>>();

/**
 * Get cached result if fresh, otherwise return null
 */
export function getCachedResult<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;

  const now = Date.now();
  const isExpired = now - entry.timestamp > entry.ttl;

  if (isExpired) {
    cache.delete(key);
    return null;
  }

  return entry.data as T;
}

/**
 * Cache a query result
 */
export function cacheResult<T>(key: string, data: T, ttlMs: number = 5 * 60 * 1000) {
  cache.set(key, {
    data,
    timestamp: Date.now(),
    ttl: ttlMs,
  });
}

/**
 * Invalidate cache for a specific key or pattern
 */
export function invalidateCache(keyOrPattern: string | RegExp) {
  if (typeof keyOrPattern === 'string') {
    cache.delete(keyOrPattern);
  } else {
    // Pattern-based invalidation
    const regex = keyOrPattern;
    const keysToDelete = Array.from(cache.keys()).filter(k => regex.test(k));
    keysToDelete.forEach(k => cache.delete(k));
  }
}

/**
 * Clear all cache
 */
export function clearCache() {
  cache.clear();
}

/**
 * Get cache stats (for debugging)
 */
export function getCacheStats() {
  return {
    size: cache.size,
    keys: Array.from(cache.keys()),
  };
}
