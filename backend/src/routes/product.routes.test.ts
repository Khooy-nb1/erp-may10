import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import express from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { createProductRoutes } from './product.routes.js';
import { ProductService } from '../services/product.service.js';
import { IProductRepository } from '../repositories/product.repository.js';
import { ProductRecord, ProductListFilters } from '../models/product.model.js';
import { createAuthMiddleware } from '../middlewares/auth.middleware.js';
import { IUserRepository } from '../repositories/user.repository.js';
import { UserRecord } from '../models/user.model.js';
import { errorMiddleware } from '../middlewares/error.middleware.js';

function requestJson(
  url: string,
  method = 'GET',
  headers: Record<string, string> = {}
): Promise<{
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
      path: parsedUrl.pathname + parsedUrl.search,
      method,
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

describe('Product Routes HTTP Integration & RBAC', () => {
  let server: http.Server;
  let baseUrl: string;
  let tokenSales: string;

  before(async () => {
    const users: UserRecord[] = [
      { id: 1, ho_ten: 'Bán Hàng', email: 'sales@example.com', mat_khau: 'h', so_dien_thoai: null, vai_tro: 'ban_hang', phong_ban: null, trang_thai: 'hoat_dong' },
    ];

    const mockUserRepo: IUserRepository = {
      findByEmail: async (email) => users.find((u) => u.email === email) || null,
      findById: async (id) => users.find((u) => u.id === id) || null,
    };

    tokenSales = jwt.sign({ id: 1, email: 'sales@example.com', vai_tro: 'ban_hang' }, env.JWT_SECRET);

    const products: ProductRecord[] = [
      {
        id: 1,
        ma_san_pham: 'SP-AO-NAM-01',
        ten_san_pham: 'Áo Sơ Mi Nam',
        mo_ta: null,
        ma_don_vi_tinh: 1,
        ten_don_vi: 'Cái',
        gia_ban: 450000,
        size: 'L',
        mau_sac: 'Trắng',
        trang_thai: 'dang_ban',
      },
    ];

    const mockProductRepo: IProductRepository = {
      list: async (_filters: ProductListFilters) => ({
        products,
        total: products.length,
        page: 1,
        pageSize: 20,
        totalPages: 1,
      }),
      findById: async (id: number) => products.find((p) => p.id === id) || null,
      findByCode: async (code: string) => products.find((p) => p.ma_san_pham === code) || null,
    };

    const productService = new ProductService(mockProductRepo);
    const auth = createAuthMiddleware(mockUserRepo);
    const routes = createProductRoutes(productService, auth);

    const app = express();
    app.use(express.json());
    app.use('/api/v1/products', routes);
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

  it('GET /api/v1/products returns 401 without Bearer token', async () => {
    const res = await requestJson(`${baseUrl}/api/v1/products`, 'GET');
    assert.equal(res.status, 401);
  });

  it('GET /api/v1/products returns 200 with paginated envelope for authenticated sales role', async () => {
    const res = await requestJson(`${baseUrl}/api/v1/products`, 'GET', {
      Authorization: `Bearer ${tokenSales}`,
    });
    assert.equal(res.status, 200);
    const body = res.body as {
      success: boolean;
      data: ProductRecord[];
      meta: { total: number; page: number };
    };
    assert.equal(body.success, true);
    assert.equal(body.data.length, 1);
    assert.equal(body.data[0].ma_san_pham, 'SP-AO-NAM-01');
  });

  it('GET /api/v1/products/:id returns product details', async () => {
    const res = await requestJson(`${baseUrl}/api/v1/products/1`, 'GET', {
      Authorization: `Bearer ${tokenSales}`,
    });
    assert.equal(res.status, 200);
    const body = res.body as { success: boolean; data: ProductRecord };
    assert.equal(body.success, true);
    assert.equal(body.data.id, 1);
  });

  it('GET /api/v1/products/:id returns 404 for non-existent product', async () => {
    const res = await requestJson(`${baseUrl}/api/v1/products/999`, 'GET', {
      Authorization: `Bearer ${tokenSales}`,
    });
    assert.equal(res.status, 404);
    const body = res.body as { error: { code: string } };
    assert.equal(body.error.code, 'PRODUCT_NOT_FOUND');
  });
});
