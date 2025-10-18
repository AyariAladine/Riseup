const g = globalThis;
if (!g.__RATE_LIMIT__) g.__RATE_LIMIT__ = new Map();
const buckets = g.__RATE_LIMIT__;

export function rateLimit(key, limit, windowMs) {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    const resetAt = now + windowMs;
    buckets.set(key, { count: 1, resetAt });
    return { ok: true, remaining: limit - 1, resetAt };
  }
  if (b.count < limit) {
    b.count += 1;
    return { ok: true, remaining: limit - b.count, resetAt: b.resetAt };
  }
  return { ok: false, remaining: 0, resetAt: b.resetAt };
}
