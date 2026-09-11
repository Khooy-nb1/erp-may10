import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import pg from 'pg';
import { createApp } from './app.js';
import { setPool, closePool } from './config/database.js';

function getJson(url: string): Promise<{
  status: number;
  headers: http.IncomingHttpHeaders;
  body: unknown;
}> {
  const { promise, resolve, reject } = Promise.withResolvers<{
    status: number;
    headers: http.IncomingHttpHeaders;
    body: unknown;
  }>();

  const req = http.get(url, { agent: false }, (res) => {
    let rawData = '';
    res.setEncoding('utf8');
    res.on('data', (chunk) => {
      rawData += chunk;
    });
    res.on('end', () => {
      try {
        const parsed = rawData ? JSON.parse(rawData) : null;
        resolve({
          status: res.statusCode || 200,
          headers: res.headers,
          body: parsed,
        });
      } catch {
        resolve({
          status: res.statusCode || 200,
          headers: res.headers,
          body: rawData,
        });
      }
    });
  });
  req.on('error', reject);

  return promise;
}

describe('App & Health Check Integration', () => {
  let server: http.Server;
  let baseUrl: string;

  before(async () => {
    const mockPool = {
      query: async () => ({ rows: [{ '?column?': 1 }], rowCount: 1 }),
      end: async () => {},
      on: () => {},
    } as unknown as pg.Pool;
    setPool(mockPool);

    const app = createApp();
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
    try {
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
    } finally {
      await closePool();
    }
  });

  it('GET /api/v1 returns API identity envelope', async () => {
    const response = await getJson(`${baseUrl}/api/v1`);
    assert.equal(response.status, 200);

    const body = response.body as {
      success: boolean;
      data: { service: string; version: string };
      meta: null;
    };

    assert.equal(body.success, true);
    assert.equal(body.data.service, 'ERP Sales & CRM API');
    assert.equal(body.data.version, '1.0.0');
    assert.equal(body.meta, null);

    const requestIdHeader = response.headers['x-request-id'];
    assert.ok(requestIdHeader, 'X-Request-Id header must be present');
  });

  it('GET /api/v1/health returns health structure and status', async () => {
    const response = await getJson(`${baseUrl}/api/v1/health`);
    // Status is either 200 (healthy) or 503 (degraded DB), both returning valid health envelope
    assert.ok(response.status === 200 || response.status === 503);

    const body = response.body as {
      success: boolean;
      data: {
        status: string;
        timestamp: string;
        uptime: number;
        database: {
          healthy: boolean;
          latencyMs: number;
        };
      };
      meta: null;
    };

    assert.ok('success' in body);
    assert.ok('status' in body.data);
    assert.ok('database' in body.data);
    assert.equal(typeof body.data.uptime, 'number');
    assert.equal(typeof body.data.database.healthy, 'boolean');
  });
});
