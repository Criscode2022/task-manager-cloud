/**
 * Best-effort in-memory sliding-window rate limiter.
 * Works per function instance (sufficient to slow PIN brute force).
 */

const buckets = new Map();

function prune(bucket, windowMs, now) {
  while (bucket.length && bucket[0] <= now - windowMs) {
    bucket.shift();
  }
}

/**
 * @param {string} key
 * @param {{ limit: number, windowMs: number }} options
 * @returns {{ allowed: boolean, remaining: number, retryAfterSec: number }}
 */
export function consumeRateLimit(key, { limit, windowMs }) {
  const now = Date.now();
  const bucket = buckets.get(key) || [];
  prune(bucket, windowMs, now);

  if (bucket.length >= limit) {
    const retryAfterMs = Math.max(0, bucket[0] + windowMs - now);
    buckets.set(key, bucket);
    return {
      allowed: false,
      remaining: 0,
      retryAfterSec: Math.ceil(retryAfterMs / 1000) || 1,
    };
  }

  bucket.push(now);
  buckets.set(key, bucket);
  return {
    allowed: true,
    remaining: Math.max(0, limit - bucket.length),
    retryAfterSec: 0,
  };
}

export function clientIp(req) {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.headers.get('x-nf-client-connection-ip') || 'unknown';
}
