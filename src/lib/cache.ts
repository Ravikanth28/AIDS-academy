// Simple in-memory TTL cache for AI-generated responses
// Avoids re-calling the AI API for the same module/request within the TTL window
//
// DEPLOYMENT NOTE: This cache is per-process and will reset on server restarts or
// across multiple instances. On a persistent single-process server (e.g. Render),
// it works correctly. On serverless platforms (e.g. Vercel), consider replacing
// this with a shared KV store such as Upstash Redis.

if (process.env.NODE_ENV === 'production' && !process.env.REDIS_URL) {
  console.warn(
    '[cache] Using in-memory cache. On multi-instance/serverless deployments each instance ' +
    'has its own cache. Set REDIS_URL to enable a shared cache.',
  )
}

interface CacheEntry {
  data: string
  expiresAt: number
}

const store = new Map<string, CacheEntry>()
const MAX_ENTRIES = 500

export function getCached(key: string): string | null {
  const entry = store.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    store.delete(key)
    return null
  }
  return entry.data
}

export function setCached(key: string, data: string, ttlMs = 60 * 60 * 1000): void {
  // Evict oldest entry when at capacity
  if (store.size >= MAX_ENTRIES) {
    const oldestKey = store.keys().next().value
    if (oldestKey) store.delete(oldestKey)
  }
  store.set(key, { data, expiresAt: Date.now() + ttlMs })
}
