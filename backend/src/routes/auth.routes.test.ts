import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import express from 'express';
import { createAuthRoutes } from './auth.routes.js';
import { AuthService } from '../services/auth.service.js';
import { createAuthMiddleware } from '../middlewares/auth.middleware.js';
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

describe('Auth Routes HTTP Integration', () => {
  let server: http.Server;
  let baseUrl: string;
  const validPassword = 'correct_password_123';

  before(async () => {
    const knownHash = await AuthService.hashPassword(validPassword);
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
    const routes = createAuthRoutes(service, auth);

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
});
