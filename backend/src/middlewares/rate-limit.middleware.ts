import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/response.js';

export interface RateLimitOptions {
  /** Fixed window length in milliseconds. */
  windowMs: number;
  /** Requests allowed per key inside a window; the next request is rejected with 429. */
  max: number;
  /** Client identity used for counting; defaults to the request IP. */
  keyGenerator?: (req: Request) => string;
  /** Clock injection so tests are deterministic; defaults to Date.now. */
  now?: () => number;
  /** Client-facing message returned with the 429 response. */
  message?: string;
}

export interface RateLimitMiddleware {
  (req: Request, res: Response, next: NextFunction): void;
  /** Active (non-expired) windows currently tracked; exposed for bounded-memory verification. */
  activeWindowCount(): number;
}

interface RateLimitWindow {
  count: number;
  resetAt: number;
}

/**
 * Dependency-free fixed-window rate limiter.
 *
 * Counters are keyed by `keyGenerator(req)` (client IP by default) and never logged.
 * A breach answers 429 with the shared error envelope and a `Retry-After` header in
 * seconds; it is written directly instead of thrown so unmapped codes never reach the
 * error middleware.
 */
export function createRateLimiter(options: RateLimitOptions): RateLimitMiddleware {
  const {
    windowMs,
    max,
    keyGenerator = (req: Request): string => req.ip ?? 'unknown',
    now = Date.now,
    message = 'Too many requests. Please try again later.',
  } = options;

  const windows = new Map<string, RateLimitWindow>();
  // Earliest resetAt among tracked windows. Keeps the common path O(1): the sweep only
  // scans once the earliest window has elapsed, so expired entries cannot accumulate.
  let nextExpiry = Number.POSITIVE_INFINITY;

  function sweep(current: number): void {
    if (current < nextExpiry) {
      return;
    }
    nextExpiry = Number.POSITIVE_INFINITY;
    for (const [key, entry] of windows) {
      if (entry.resetAt <= current) {
        windows.delete(key);
      } else if (entry.resetAt < nextExpiry) {
        nextExpiry = entry.resetAt;
      }
    }
  }

  const limiter = (req: Request, res: Response, next: NextFunction): void => {
    const current = now();
    sweep(current);

    const key = keyGenerator(req);
    let entry = windows.get(key);

    if (!entry) {
      entry = { count: 0, resetAt: current + windowMs };
      windows.set(key, entry);
      if (entry.resetAt < nextExpiry) {
        nextExpiry = entry.resetAt;
      }
    }

    entry.count += 1;

    if (entry.count > max) {
      // Retry-After carries whole seconds and is never below 1.
      res.setHeader('Retry-After', Math.max(1, Math.ceil((entry.resetAt - current) / 1000)));
      sendError(res, 'RATE_LIMIT_EXCEEDED', message, 429);
      return;
    }

    next();
  };

  return Object.assign(limiter, { activeWindowCount: (): number => windows.size });
}

/**
 * Production limiter for POST /auth/login: 10 attempts per caller per 15 minutes.
 * Counted before the handler runs, so throttled requests never reach credential checks.
 */
export const loginRateLimiter: RateLimitMiddleware = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many login attempts. Please try again later.',
});
