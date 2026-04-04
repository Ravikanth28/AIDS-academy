// Simple in-memory rate limiter
// NOTE: This is per-process. On Vercel/multi-instance deployments, use Redis (e.g. Upstash).
// On a single-process server (Render), this works correctly.

interface RLEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RLEntry>()

// Periodically clean up expired entries to prevent unbounded growth
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of store.entries()) {
    if (now > entry.resetAt) store.delete(key)
  }
}, 5 * 60 * 1000) // every 5 minutes

/**
 * Check whether a request identified by `key` is within the allowed rate.
 * @param key       Identifier (e.g. IP address or phone number)
 * @param max       Maximum requests allowed in the window
 * @param windowMs  Window length in milliseconds (default: 15 minutes)
 */
export function checkRateLimit(
  key: string,
  max: number = 5,
  windowMs: number = 15 * 60 * 1000,
): { allowed: boolean; retryAfter?: number } {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true }
  }

  if (entry.count >= max) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000)
    return { allowed: false, retryAfter }
  }

  entry.count++
  return { allowed: true }
}
