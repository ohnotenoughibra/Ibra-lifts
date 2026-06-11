// Simple in-memory rate limiter for auth endpoints
// No external dependencies required — uses a sliding window counter

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes to prevent memory leaks
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  store.forEach((entry, key) => {
    if (now > entry.resetAt) store.delete(key);
  });
}

/**
 * Check if a request should be rate-limited.
 *
 * @param key    Unique identifier (e.g., IP address or IP+route)
 * @param limit  Max requests allowed in the window
 * @param windowMs  Time window in milliseconds
 * @returns { limited, remaining, resetAt }
 */
export function rateLimit(
  key: string,
  limit: number = 10,
  windowMs: number = 60 * 1000
): { limited: boolean; remaining: number; resetAt: number } {
  cleanup();

  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    // First request or window expired — start fresh
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { limited: false, remaining: limit - 1, resetAt: now + windowMs };
  }

  entry.count++;
  store.set(key, entry);

  if (entry.count > limit) {
    return { limited: true, remaining: 0, resetAt: entry.resetAt };
  }

  return { limited: false, remaining: limit - entry.count, resetAt: entry.resetAt };
}

/**
 * Postgres-backed daily rate limit — GLOBAL across serverless instances.
 *
 * The in-memory limiter above lives in one Lambda's heap, so a request landing
 * on a fresh instance gets a fresh counter. Tolerable for cheap routes (auth,
 * sync) but not for ones that cost money per call (the Claude AI coach), where
 * fanning across instances defeats the 3/day cap entirely.
 *
 * Counts by (key, UTC day). Fails OPEN on DB error — a metering outage must not
 * take down the feature. sql imported lazily so this module stays usable in the
 * edge/test contexts that never call it.
 */
export async function rateLimitDaily(
  key: string,
  limit: number,
): Promise<{ limited: boolean; remaining: number }> {
  try {
    const { sql } = await import('@vercel/postgres');
    await sql`
      CREATE TABLE IF NOT EXISTS rate_limit_daily (
        bucket_key TEXT NOT NULL,
        day DATE NOT NULL,
        count INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (bucket_key, day)
      )
    `;
    // Atomic increment-and-read: the post-increment count is authoritative even
    // under concurrent requests (no check-then-set race).
    const { rows } = await sql`
      INSERT INTO rate_limit_daily (bucket_key, day, count)
      VALUES (${key}, CURRENT_DATE, 1)
      ON CONFLICT (bucket_key, day) DO UPDATE
        SET count = rate_limit_daily.count + 1
      RETURNING count
    `;
    const count = Number(rows[0]?.count ?? 1);
    return { limited: count > limit, remaining: Math.max(0, limit - count) };
  } catch (err) {
    // Fail open — never let a metering failure block the user
    console.error('[rate-limit] daily limiter unavailable, allowing request:', err);
    return { limited: false, remaining: limit };
  }
}

/**
 * Extract a rate-limit key from a request.
 * Uses X-Forwarded-For (Vercel/proxied) or falls back to a generic key.
 */
export function getClientIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  const real = request.headers.get('x-real-ip');
  if (real) return real;
  return 'unknown';
}
