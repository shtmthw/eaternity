export interface RateLimiter {
  /** Returns false once the key has used up its attempts in the current window. */
  allow(key: string): boolean;
  /** Counts a failed attempt against the key. */
  fail(key: string): void;
}

/**
 * Counts failed attempts per key in memory. Used for sign-in, where a single
 * process and a reset on restart are both fine.
 */
export function createRateLimiter({ limit, windowMs }: { limit: number; windowMs: number }): RateLimiter {
  const attempts = new Map<string, { count: number; resetAt: number }>();

  const sweep = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of attempts) if (entry.resetAt <= now) attempts.delete(key);
  }, windowMs);
  sweep.unref();

  return {
    allow(key) {
      const entry = attempts.get(key);
      return !entry || entry.resetAt <= Date.now() || entry.count < limit;
    },
    fail(key) {
      const now = Date.now();
      const entry = attempts.get(key);
      if (!entry || entry.resetAt <= now) attempts.set(key, { count: 1, resetAt: now + windowMs });
      else entry.count++;
    },
  };
}
