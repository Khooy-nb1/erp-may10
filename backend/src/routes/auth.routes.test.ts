import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import express from 'express';
import { createAuthRoutes } from './auth.routes.js';
import { AuthService } from '../services/auth.service.js';
import { createAuthMiddleware } from '../middlewares/auth.middleware.js';
import { createRateLimiter } from '../middlewares/rate-limit.middleware.js';
import { errorMiddleware } from '../middlewares/error.middleware.js';
import { IUserRepository } from '../repositories/user.repository.js';
import { UserRecord } from '../models/user.model.js';

function postJson(url: string, body: unknown, headers: Record<string, string> = {}): Promise<{
  status: number;
  headers: http.IncomingHttpHeaders;
  body: unknown;
}> {
  const { promise, resolve, reject } = Promise.withResolvers<{
    status: number;
    headers: http.IncomingHttpHeaders;
    body: unknown;
  }>();

  const payload = JSON.stringify(body);
  const parsedUrl = new URL(url);

  const req = http.request(
    {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname,
      method: 'POST',
      agent: false,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        Connection: 'close',
        ...headers,
      },
    },
    (res) => {
      let rawData = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        rawData += chunk;
      });
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode || 200,
            headers: res.headers,
            body: rawData ? JSON.parse(rawData) : null,
          });
        } catch {
          resolve({
            status: res.statusCode || 200,
            headers: res.headers,
            body: rawData,
          });
        }
      });
    }
  );

  req.on('error', reject);
  req.write(payload);
  req.end();

  return promise;
}

function getJson(url: string, headers: Record<string, string> = {}): Promise<{
  status: number;
  headers: http.IncomingHttpHeaders;
  body: unknown;
}> {
  const { promise, resolve, reject } = Promise.withResolvers<{
    status: number;
    headers: http.IncomingHttpHeaders;
    body: unknown;
  }>();

  const parsedUrl = new URL(url);
  const req = http.request(
    {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname,
      method: 'GET',
      agent: false,
      headers: {
        Connection: 'close',
        ...headers,
      },
    },
    (res) => {
      let rawData = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        rawData += chunk;
      });
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode || 200,
            headers: res.headers,
            body: rawData ? JSON.parse(rawData) : null,
          });
        } catch {
          resolve({
            status: res.statusCode || 200,
            headers: res.headers,
            body: rawData,
          });
        }
      });
    }
  );

  req.on('error', reject);
  req.end();

  return promise;
}

/** Runtime-narrows a response body into the shared error envelope fields. */
function readErrorBody(body: unknown): { code: string; message: string; details: unknown } {
  if (typeof body !== 'object' || body === null || !('error' in body)) {
    assert.fail(`expected an error envelope, received ${JSON.stringify(body)}`);
  }
  const error = body.error;
  if (
    typeof error !== 'object' ||
    error === null ||
    !('code' in error) ||
    !('message' in error) ||
    !('details' in error) ||
    typeof error.code !== 'string' ||
    typeof error.message !== 'string'
  ) {
    assert.fail(`malformed error envelope: ${JSON.stringify(body)}`);
  }
  return { code: error.code, message: error.message, details: error.details };
}

/** Asserts the body is the shared failure envelope carrying the expected error code. */
function assertErrorResponse(body: unknown, expectedCode: string): void {
  if (typeof body !== 'object' || body === null || !('success' in body) || !('data' in body)) {
    assert.fail(`expected a { success, data, error } envelope, received ${JSON.stringify(body)}`);
  }
  assert.equal(body.success, false);
  assert.equal(body.data, null);
  assert.equal(readErrorBody(body).code, expectedCode);
}

/** Runtime-narrows the login token out of a success envelope. */
function readLoginToken(body: unknown): string {
  if (typeof body !== 'object' || body === null || !('data' in body)) {
    assert.fail(`expected a success envelope, received ${JSON.stringify(body)}`);
  }
  const data = body.data;
  if (typeof data !== 'object' || data === null || !('token' in data) || typeof data.token !== 'string') {
    assert.fail(`expected a string token, received ${JSON.stringify(body)}`);
  }
  return data.token;
}

/** Collects every object key of a nested JSON payload. */
function collectKeys(value: unknown, keys: string[] = []): string[] {
  if (Array.isArray(value)) {
    for (const item of value) {
      collectKeys(item, keys);
    }
  } else if (value !== null && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      keys.push(key);
      collectKeys(child, keys);
    }
  }
  return keys;
}

/** Collects every string leaf of a nested JSON payload. */
function collectStrings(value: unknown, strings: string[] = []): string[] {
  if (typeof value === 'string') {
    strings.push(value);
  } else if (Array.isArray(value)) {
    for (const item of value) {
      collectStrings(item, strings);
    }
  } else if (value !== null && typeof value === 'object') {
    for (const child of Object.values(value)) {
      collectStrings(child, strings);
    }
  }
  return strings;
}

describe('Auth Routes HTTP Integration', () => {
  let server: http.Server;
  let baseUrl: string;
  let knownHash: string;
  const validPassword = 'correct_password_123';

  // Fixed limit for the injected login limiter; the fixed clock plus a per-case caller
  // header keeps every case deterministic and independent of wall-clock timing.
  const RATE_LIMIT_MAX = 5;
  const loginLimiter = createRateLimiter({
    windowMs: 60_000,
    max: RATE_LIMIT_MAX,
    now: () => 0,
    keyGenerator: (req) => {
      const header = req.headers['x-test-client'];
      return typeof header === 'string' ? header : 'default-caller';
    },
  });

  before(async () => {
    knownHash = await AuthService.hashPassword(validPassword);
    const users: UserRecord[] = [
      {
        id: 1,
        ho_ten: 'Nguyễn Văn Bán',
        email: 'sales@example.com',
        mat_khau: knownHash,
        so_dien_thoai: '0912345678',
        vai_tro: 'ban_hang',
        phong_ban: 'Phòng Bán Hàng',
        trang_thai: 'hoat_dong',
      },
    ];

    const mockRepo: IUserRepository = {
      findByEmail: async (email: string) => users.find((u) => u.email === email) || null,
      findById: async (id: number) => users.find((u) => u.id === id) || null,
    };

    const service = new AuthService(mockRepo);
    const auth = createAuthMiddleware(mockRepo);
    const routes = createAuthRoutes(service, auth, loginLimiter);

    const app = express();
    app.use(express.json());
    app.use('/api/v1/auth', routes);
    app.use(errorMiddleware);

    const { promise, resolve } = Promise.withResolvers<void>();
    server = app.listen(0, () => {
      const address = server.address();
      if (address && typeof address === 'object') {
        baseUrl = `http://localhost:${address.port}`;
      }
      resolve();
    });
    await promise;
  });

  after(async () => {
    if (server) {
      if (typeof server.closeAllConnections === 'function') {
        server.closeAllConnections();
      }
      if (typeof server.closeIdleConnections === 'function') {
        server.closeIdleConnections();
      }
      server.unref();
      const { promise, resolve } = Promise.withResolvers<void>();
      server.close(() => resolve());
      await promise;
    }
  });

  it('POST /api/v1/auth/login succeeds with valid credentials', async () => {
    const res = await postJson(`${baseUrl}/api/v1/auth/login`, {
      email: 'sales@example.com',
      password: validPassword,
    });

    assert.equal(res.status, 200);
    const body = res.body as {
      success: boolean;
      data: { token: string; user: { id: number; email: string } };
    };
    assert.equal(body.success, true);
    assert.ok(body.data.token);
    assert.equal(body.data.user.email, 'sales@example.com');
  });

  it('POST /api/v1/auth/login fails with invalid credentials returning 401', async () => {
    const res = await postJson(`${baseUrl}/api/v1/auth/login`, {
      email: 'sales@example.com',
      password: 'wrong_password',
    });

    assert.equal(res.status, 401);
    const body = res.body as {
      success: boolean;
      error: { code: string; message: string };
    };
    assert.equal(body.success, false);
    assert.equal(body.error.code, 'AUTH_INVALID_CREDENTIALS');
  });

  it('GET /api/v1/auth/me returns 401 without Bearer token', async () => {
    const res = await getJson(`${baseUrl}/api/v1/auth/me`);
    assert.equal(res.status, 401);
    const body = res.body as { success: boolean; error: { code: string } };
    assert.equal(body.success, false);
    assert.equal(body.error.code, 'AUTH_UNAUTHORIZED');
  });

  it('GET /api/v1/auth/me returns user profile with valid Bearer token', async () => {
    // 1. Log in to get token
    const loginRes = await postJson(`${baseUrl}/api/v1/auth/login`, {
      email: 'sales@example.com',
      password: validPassword,
    });
    const loginBody = loginRes.body as { data: { token: string } };
    const token = loginBody.data.token;

    // 2. Call /me with token
    const meRes = await getJson(`${baseUrl}/api/v1/auth/me`, {
      Authorization: `Bearer ${token}`,
    });

    assert.equal(meRes.status, 200);
    const meBody = meRes.body as {
      success: boolean;
      data: { id: number; email: string; vai_tro: string };
    };
    assert.equal(meBody.success, true);
    assert.equal(meBody.data.email, 'sales@example.com');
    assert.equal(meBody.data.vai_tro, 'ban_hang');
  });

  it('POST /api/v1/auth/logout succeeds with valid Bearer token', async () => {
    const loginRes = await postJson(`${baseUrl}/api/v1/auth/login`, {
      email: 'sales@example.com',
      password: validPassword,
    });
    const loginBody = loginRes.body as { data: { token: string } };
    const token = loginBody.data.token;

    const logoutRes = await postJson(
      `${baseUrl}/api/v1/auth/logout`,
      {},
      { Authorization: `Bearer ${token}` }
    );

    assert.equal(logoutRes.status, 200);
    const body = logoutRes.body as { success: boolean; message: string };
    assert.equal(body.success, true);
  });

  it('rate limits repeated failed logins from one caller with 429 RATE_LIMIT_EXCEEDED', async () => {
    const caller = { 'x-test-client': 'brute-force-caller' };

    for (let attempt = 1; attempt <= RATE_LIMIT_MAX; attempt += 1) {
      const res = await postJson(
        `${baseUrl}/api/v1/auth/login`,
        { email: 'nobody@example.com', password: 'whatever_password' },
        caller
      );
      assert.equal(res.status, 401, `attempt ${attempt} must still reach the handler`);
      assertErrorResponse(res.body, 'AUTH_INVALID_CREDENTIALS');
    }

    const blocked = await postJson(
      `${baseUrl}/api/v1/auth/login`,
      { email: 'nobody@example.com', password: 'whatever_password' },
      caller
    );

    assert.equal(blocked.status, 429);
    assertErrorResponse(blocked.body, 'RATE_LIMIT_EXCEEDED');
    assert.equal(readErrorBody(blocked.body).details, null);

    // Fixed clock at 0 with a 60s window means the caller waits the full window.
    assert.equal(Number(blocked.headers['retry-after']), 60);

    // Throttled requests must never reach credential checks.
    const stillBlocked = await postJson(
      `${baseUrl}/api/v1/auth/login`,
      { email: 'sales@example.com', password: validPassword },
      caller
    );
    assert.equal(stillBlocked.status, 429);
    assertErrorResponse(stillBlocked.body, 'RATE_LIMIT_EXCEEDED');
  });

  it('rate limits are scoped per caller so a throttled caller does not affect others', async () => {
    const throttledCaller = { 'x-test-client': 'throttled-service-account' };

    for (let attempt = 1; attempt <= RATE_LIMIT_MAX; attempt += 1) {
      const res = await postJson(
        `${baseUrl}/api/v1/auth/login`,
        { email: 'nobody@example.com', password: 'whatever_password' },
        throttledCaller
      );
      assert.equal(res.status, 401);
    }

    const blocked = await postJson(
      `${baseUrl}/api/v1/auth/login`,
      { email: 'sales@example.com', password: validPassword },
      throttledCaller
    );
    assert.equal(blocked.status, 429);

    const unaffected = await postJson(
      `${baseUrl}/api/v1/auth/login`,
      { email: 'sales@example.com', password: validPassword },
      { 'x-test-client': 'innocent-bystander' }
    );
    assert.equal(unaffected.status, 200);
    assert.ok(readLoginToken(unaffected.body));
  });

  it('login failures do not disclose whether an account exists (unknown email vs wrong password)', async () => {
    const unknownEmail = await postJson(
      `${baseUrl}/api/v1/auth/login`,
      { email: 'ghost@example.com', password: 'whatever_password' },
      { 'x-test-client': 'enumeration-unknown' }
    );
    const wrongPassword = await postJson(
      `${baseUrl}/api/v1/auth/login`,
      { email: 'sales@example.com', password: 'definitely_not_the_password' },
      { 'x-test-client': 'enumeration-wrong-password' }
    );

    assert.equal(unknownEmail.status, wrongPassword.status);
    assert.equal(unknownEmail.status, 401);

    const unknownError = readErrorBody(unknownEmail.body);
    const wrongPasswordError = readErrorBody(wrongPassword.body);

    assert.equal(unknownError.code, 'AUTH_INVALID_CREDENTIALS');
    assert.equal(wrongPasswordError.code, 'AUTH_INVALID_CREDENTIALS');
    assert.equal(
      unknownError.message,
      wrongPasswordError.message,
      'failure message must be byte-identical to prevent user enumeration'
    );
  });

  it('no auth endpoint response body echoes a password hash or an unexpected token field', async () => {
    const caller = { 'x-test-client': 'response-safety' };
    const forbiddenKeys = new Set(['mat_khau', 'password', 'password_hash', 'hash', 'passwordhash']);
    const bcryptHashPattern = /^\$(2[aby]|argon2|scrypt)\$/i;

    const assertNoSensitiveEcho = (body: unknown, label: string): void => {
      const serialized = JSON.stringify(body);
      assert.equal(serialized.includes('mat_khau'), false, `${label} must not mention mat_khau`);
      assert.equal(serialized.includes(knownHash), false, `${label} must not echo the stored bcrypt hash`);

      for (const key of collectKeys(body)) {
        const lower = key.toLowerCase();
        assert.equal(forbiddenKeys.has(lower), false, `${label} leaked field "${key}"`);
        if (lower.includes('token') || lower.includes('hash')) {
          assert.equal(key, 'token', `${label} returned unexpected credential field "${key}"`);
        }
      }

      for (const value of collectStrings(body)) {
        assert.equal(bcryptHashPattern.test(value), false, `${label} returned a hash-like value`);
      }
    };

    const loginRes = await postJson(
      `${baseUrl}/api/v1/auth/login`,
      { email: 'sales@example.com', password: validPassword },
      caller
    );
    assert.equal(loginRes.status, 200);
    assertNoSensitiveEcho(loginRes.body, 'login success response');

    const token = readLoginToken(loginRes.body);

    const meRes = await getJson(`${baseUrl}/api/v1/auth/me`, {
      ...caller,
      Authorization: `Bearer ${token}`,
    });
    assert.equal(meRes.status, 200);
    assertNoSensitiveEcho(meRes.body, 'profile response');

    const logoutRes = await postJson(`${baseUrl}/api/v1/auth/logout`, {}, {
      ...caller,
      Authorization: `Bearer ${token}`,
    });
    assert.equal(logoutRes.status, 200);
    assertNoSensitiveEcho(logoutRes.body, 'logout response');

    const unauthorizedRes = await getJson(`${baseUrl}/api/v1/auth/me`, caller);
    assert.equal(unauthorizedRes.status, 401);
    assertNoSensitiveEcho(unauthorizedRes.body, 'unauthenticated response');
  });
});
