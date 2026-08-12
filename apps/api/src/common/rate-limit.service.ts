import { Injectable } from '@nestjs/common';

interface BucketResult {
  allowed: boolean;
  remaining: number;
  retryAfterSec: number;
}

@Injectable()
export class RateLimitService {
  private readonly buckets = new Map<string, number[]>();

  consume(
    key: string,
    { limit, windowMs }: { limit: number; windowMs: number },
  ): BucketResult {
    const now = Date.now();
    const bucket = this.buckets.get(key) || [];
    while (bucket.length && bucket[0]! <= now - windowMs) {
      bucket.shift();
    }

    if (bucket.length >= limit) {
      const retryAfterMs = Math.max(0, bucket[0]! + windowMs - now);
      this.buckets.set(key, bucket);
      return {
        allowed: false,
        remaining: 0,
        retryAfterSec: Math.ceil(retryAfterMs / 1000) || 1,
      };
    }

    bucket.push(now);
    this.buckets.set(key, bucket);
    return {
      allowed: true,
      remaining: Math.max(0, limit - bucket.length),
      retryAfterSec: 0,
    };
  }

  clientIp(req: { headers: Record<string, string | string[] | undefined>; ip?: string }): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.length) {
      return forwarded.split(',')[0]!.trim();
    }
    if (Array.isArray(forwarded) && forwarded[0]) {
      return forwarded[0].split(',')[0]!.trim();
    }
    return req.ip || 'unknown';
  }
}
