import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Request, Response } from 'express';
import { createRateLimiter, loginRateLimiter, RateLimitMiddleware, RateLimitOptions } from './rate-limit.middleware.js';

interface FakeResponse {
  res: Response;
  statusCode: () => number;
  headers: Record<string, string | number>;
  body: () => unknown;
}

function createFakeResponse(): FakeResponse {
  let statusCode = 200;
  let body: unknown = null;
  const headers: Record<string, string | number> = {};
  const res = {
    status(code: number): unknown {
      statusCode = code;
      return res;
    },
    json(payload: unknown): unknown {
      body = payload;
      return res;
    },
    setHeader(name: string, value: string | number): unknown {
      headers[name.toLowerCase()] = value;
      return res;
    },
  } as unknown as Response;
  return { res, statusCode: () => statusCode, headers, body: () => body };
}

function createFakeRequest(ip: string, headers: Record<string, string> = {}): Request {
  return { ip, headers } as unknown as Request;
}

interface CallResult {
  nextCalled: boolean;
  statusCode: number;
  body: unknown;
  headers: Record<string, string | number>;
}

function callLimiter(limiter: RateLimitMiddleware, req: Request): CallResult {
  const fake = createFakeResponse();
  let nextCalled = false;
  limiter(req, fake.res, () => {
    nextCalled = true;
  });
  return {
    nextCalled,
    statusCode: fake.statusCode(),
    body: fake.body(),
    headers: fake.headers,
  };
}

interface ErrorEnvelopeFields {
  code: string;
  message: string;
  details: unknown;
}

/** Runtime-narrows a response body into the shared error envelope fields. */
function readErrorEnvelope(body: unknown): ErrorEnvelopeFields {
  if (typeof body !== 'object' || body === null || !('success' in body) || !('data' in body) || !('error' in body)) {
    assert.fail(`expected a { success, data, error } envelope, received ${JSON.stringify(body)}`);
  }
  if (body.success !== false || body.data !== null) {
    assert.fail(`expected a failure envelope, received ${JSON.stringify(body)}`);
  }
  const error = body.error;
  if (
    typeof error !== 'object' ||
    error === null ||
    !('code' in error) ||
    !('message' in error) ||
    !('details' in error)
  ) {
    assert.fail(`expected a { code, message, details } error, received ${JSON.stringify(body)}`);
  }
  if (typeof error.code !== 'string' || typeof error.message !== 'string') {
    assert.fail(`expected string code and message, received ${JSON.stringify(body)}`);
  }
  return { code: error.code, message: error.message, details: error.details };
}

describe('Rate Limiter Middleware', () => {
  const WINDOW_MS = 60_000;
  const MAX_REQUESTS = 3;

  function buildLimiter(overrides: Partial<RateLimitOptions> = {}): {
    limiter: RateLimitMiddleware;
    advance: (ms: number) => void;
  } {
    let clock = 1_000_000;
    const limiter = createRateLimiter({
      windowMs: WINDOW_MS,
      max: MAX_REQUESTS,
      now: () => clock,
      ...overrides,
    });
    return {
      limiter,
      advance: (ms: number) => {
        clock += ms;
      },
    };
  }

  it('passes requests through while the caller stays within the limit', () => {
    const { limiter } = buildLimiter();

    for (let attempt = 0; attempt < MAX_REQUESTS; attempt += 1) {
      const result = callLimiter(limiter, createFakeRequest('203.0.113.7'));
      assert.equal(result.nextCalled, true);
      assert.equal(result.body, null);
      assert.equal('retry-after' in result.headers, false);
    }

    assert.equal(limiter.activeWindowCount(), 1);
  });

  it('rejects the request after the limit with a 429 RATE_LIMIT_EXCEEDED envelope', () => {
    const { limiter, advance } = buildLimiter();
    const client = createFakeRequest('203.0.113.7');

    for (let attempt = 0; attempt < MAX_REQUESTS; attempt += 1) {
      assert.equal(callLimiter(limiter, client).nextCalled, true);
    }

    advance(15_000);

    const blocked = callLimiter(limiter, client);
    assert.equal(blocked.nextCalled, false);
    assert.equal(blocked.statusCode, 429);

    const envelope = readErrorEnvelope(blocked.body);
    assert.equal(envelope.code, 'RATE_LIMIT_EXCEEDED');
    assert.equal(envelope.details, null);
    assert.equal(typeof envelope.message, 'string');
    assert.ok(envelope.message.length > 0);

    // 15s into a 60s window the caller must be told to wait 45s.
    assert.equal(Number(blocked.headers['retry-after']), 45);

    // Continued attempts stay blocked and keep the caller informed.
    const stillBlocked = callLimiter(limiter, client);
    assert.equal(stillBlocked.statusCode, 429);
    assert.ok(Number(stillBlocked.headers['retry-after']) >= 1);
  });

  it('starts a fresh window once windowMs has elapsed on the injected clock', () => {
    const { limiter, advance } = buildLimiter();
    const client = createFakeRequest('203.0.113.7');

    for (let attempt = 0; attempt < MAX_REQUESTS; attempt += 1) {
      assert.equal(callLimiter(limiter, client).nextCalled, true);
    }
    assert.equal(callLimiter(limiter, client).statusCode, 429);

    advance(WINDOW_MS - 1);
    assert.equal(callLimiter(limiter, client).statusCode, 429);

    advance(1);
    const afterReset = callLimiter(limiter, client);
    assert.equal(afterReset.nextCalled, true);
    assert.equal(afterReset.statusCode, 200);
    assert.equal(limiter.activeWindowCount(), 1);
  });

  it('counts distinct keys independently', () => {
    const { limiter } = buildLimiter();
    const firstClient = createFakeRequest('203.0.113.7');
    const secondClient = createFakeRequest('198.51.100.9');

    for (let attempt = 0; attempt < MAX_REQUESTS; attempt += 1) {
      assert.equal(callLimiter(limiter, firstClient).nextCalled, true);
    }
    assert.equal(callLimiter(limiter, firstClient).statusCode, 429);

    for (let attempt = 0; attempt < MAX_REQUESTS; attempt += 1) {
      assert.equal(callLimiter(limiter, secondClient).nextCalled, true);
    }
    assert.equal(limiter.activeWindowCount(), 2);
    assert.equal(callLimiter(limiter, secondClient).statusCode, 429);
  });

  it('keys counters through the injected keyGenerator instead of the raw IP', () => {
    const { limiter } = buildLimiter({
      keyGenerator: (req: Request): string => {
        const header = req.headers['x-client'];
        return typeof header === 'string' ? header : 'unknown';
      },
    });

    for (let attempt = 0; attempt < MAX_REQUESTS; attempt += 1) {
      const result = callLimiter(limiter, createFakeRequest(`10.0.0.${attempt}`, { 'x-client': 'shared-caller' }));
      assert.equal(result.nextCalled, true);
    }

    const blocked = callLimiter(limiter, createFakeRequest('10.0.0.99', { 'x-client': 'shared-caller' }));
    assert.equal(blocked.statusCode, 429);

    const otherCaller = callLimiter(limiter, createFakeRequest('10.0.0.100', { 'x-client': 'another-caller' }));
    assert.equal(otherCaller.nextCalled, true);
  });

  it('evicts expired windows so tracked keys stay bounded across many distinct clients', () => {
    const { limiter, advance } = buildLimiter();

    for (let index = 0; index < 100; index += 1) {
      assert.equal(callLimiter(limiter, createFakeRequest(`198.51.100.${index}`)).nextCalled, true);
    }
    assert.equal(limiter.activeWindowCount(), 100);

    advance(WINDOW_MS);
    const afterExpiry = callLimiter(limiter, createFakeRequest('198.51.100.200'));
    assert.equal(afterExpiry.nextCalled, true);
    assert.equal(limiter.activeWindowCount(), 1);

    // Continued distinct-client churn must not make the tracked map grow without limit.
    for (let index = 0; index < 50; index += 1) {
      advance(WINDOW_MS);
      callLimiter(limiter, createFakeRequest(`192.0.2.${index}`));
      assert.equal(limiter.activeWindowCount(), 1);
    }
  });

  it('loginRateLimiter enforces the production 10 attempts per window default', () => {
    const client = createFakeRequest('203.0.113.99');

    for (let attempt = 1; attempt <= 10; attempt += 1) {
      assert.equal(callLimiter(loginRateLimiter, client).nextCalled, true, `attempt ${attempt} must be allowed`);
    }

    const blocked = callLimiter(loginRateLimiter, client);
    assert.equal(blocked.nextCalled, false);
    assert.equal(blocked.statusCode, 429);
    assert.equal(readErrorEnvelope(blocked.body).code, 'RATE_LIMIT_EXCEEDED');

    const retryAfterSeconds = Number(blocked.headers['retry-after']);
    assert.ok(Number.isInteger(retryAfterSeconds), 'Retry-After must be whole seconds');
    assert.ok(retryAfterSeconds >= 1 && retryAfterSeconds <= 900, `unexpected Retry-After: ${retryAfterSeconds}`);
  });
});
