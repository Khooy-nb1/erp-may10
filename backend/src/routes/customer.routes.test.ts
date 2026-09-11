import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import express from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { createCustomerRoutes } from './customer.routes.js';
import { CustomerService } from '../services/customer.service.js';
import { ICustomerRepository } from '../repositories/customer.repository.js';
import { CustomerRecord, CustomerSummary, CustomerListFilters, CustomerStatus } from '../models/customer.model.js';
import { createAuthMiddleware } from '../middlewares/auth.middleware.js';
import { IUserRepository } from '../repositories/user.repository.js';
import { UserRecord } from '../models/user.model.js';
import { errorMiddleware } from '../middlewares/error.middleware.js';

function requestJson(
  url: string,
  method = 'GET',
  body?: unknown,
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
  const payload = body !== undefined ? JSON.stringify(body) : null;

  const req = http.request(
    {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname + parsedUrl.search,
      method,
      agent: false,
      headers: {
        Connection: 'close',
        ...(payload
          ? {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(payload),
            }
          : {}),
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
  if (payload) {
    req.write(payload);
  }
  req.end();

  return promise;
}

describe('Customer Routes HTTP Integration & RBAC', () => {
  let server: http.Server;
  let baseUrl: string;

  let tokenSales: string;
  let tokenAdmin: string;
  let tokenWarehouse: string;
  let tokenAccounting: string;

  before(async () => {
    const users: UserRecord[] = [
      { id: 1, ho_ten: 'Bán Hàng', email: 'sales@example.com', mat_khau: 'h', so_dien_thoai: null, vai_tro: 'ban_hang', phong_ban: null, trang_thai: 'hoat_dong' },
      { id: 2, ho_ten: 'Quản Trị', email: 'admin@example.com', mat_khau: 'h', so_dien_thoai: null, vai_tro: 'admin', phong_ban: null, trang_thai: 'hoat_dong' },
      { id: 3, ho_ten: 'Kho Hàng', email: 'kho@example.com', mat_khau: 'h', so_dien_thoai: null, vai_tro: 'kho', phong_ban: null, trang_thai: 'hoat_dong' },
      { id: 4, ho_ten: 'Kế Toán', email: 'ketoan@example.com', mat_khau: 'h', so_dien_thoai: null, vai_tro: 'ke_toan', phong_ban: null, trang_thai: 'hoat_dong' },
    ];

    const mockUserRepo: IUserRepository = {
      findByEmail: async (email) => users.find((u) => u.email === email) || null,
      findById: async (id) => users.find((u) => u.id === id) || null,
    };

    tokenSales = jwt.sign({ id: 1, email: 'sales@example.com', vai_tro: 'ban_hang' }, env.JWT_SECRET);
    tokenAdmin = jwt.sign({ id: 2, email: 'admin@example.com', vai_tro: 'admin' }, env.JWT_SECRET);
    tokenWarehouse = jwt.sign({ id: 3, email: 'kho@example.com', vai_tro: 'kho' }, env.JWT_SECRET);
    tokenAccounting = jwt.sign({ id: 4, email: 'ketoan@example.com', vai_tro: 'ke_toan' }, env.JWT_SECRET);

    const customers: CustomerRecord[] = [
      {
        id: 1,
        ma_khach_hang: 'KH-2026-000001',
        ten_khach_hang: 'Công ty May An Phát',
        loai_khach_hang: 'to_chuc',
        ma_so_thue: null,
        so_dien_thoai: '0243123456',
        email: null,
        dia_chi: 'Hà Nội',
        tinh_thanh_pho: 'Hà Nội',
        nguoi_lien_he: null,
        han_muc_cong_no: 100000000,
        so_ngay_cong_no: 30,
        ghi_chu: null,
        trang_thai: 'hoat_dong',
        ngay_tao: new Date(),
        ngay_cap_nhat: new Date(),
        nguoi_tao: 1,
        nguoi_cap_nhat: 1,
      },
    ];

    const mockCustomerRepo: ICustomerRepository = {
      list: async (_filters: CustomerListFilters) => ({
        customers,
        total: customers.length,
        page: 1,
        pageSize: 20,
        totalPages: 1,
      }),
      findById: async (id: number) => customers.find((c) => c.id === id) || null,
      findByCode: async (code: string) => customers.find((c) => c.ma_khach_hang === code) || null,
      create: async (data) => {
        const c: CustomerRecord = { ...data, id: customers.length + 1, ngay_tao: new Date(), ngay_cap_nhat: new Date() };
        customers.push(c);
        return c;
      },
      update: async (id, data, updaterId) => {
        const c = customers.find((x) => x.id === id);
        if (!c) return null;
        Object.assign(c, data, { nguoi_cap_nhat: updaterId });
        return c;
      },
      updateStatus: async (id, status, updaterId) => {
        const c = customers.find((x) => x.id === id);
        if (!c) return null;
        c.trang_thai = status;
        c.nguoi_cap_nhat = updaterId;
        return c;
      },
      getSummary: async (_id) => ({
        totalOrders: 1,
        totalOrderValue: '10000000.00',
        unpaidInvoicesCount: 0,
        outstandingReceivable: '0.00',
        overdueReceivable: '0.00',
      }),
    };

    const customerService = new CustomerService(mockCustomerRepo);
    const auth = createAuthMiddleware(mockUserRepo);
    const routes = createCustomerRoutes(customerService, auth);

    const app = express();
    app.use(express.json());
    app.use('/api/v1/customers', routes);
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

  it('GET /api/v1/customers returns 401 without Bearer token', async () => {
    const res = await requestJson(`${baseUrl}/api/v1/customers`, 'GET');
    assert.equal(res.status, 401);
  });

  it('GET /api/v1/customers returns 403 Forbidden for warehouse role (kho)', async () => {
    const res = await requestJson(`${baseUrl}/api/v1/customers`, 'GET', undefined, {
      Authorization: `Bearer ${tokenWarehouse}`,
    });
    assert.equal(res.status, 403);
    const body = res.body as { error: { code: string } };
    assert.equal(body.error.code, 'AUTH_FORBIDDEN');
  });

  it('GET /api/v1/customers returns 200 with paginated envelope for sales role (ban_hang)', async () => {
    const res = await requestJson(`${baseUrl}/api/v1/customers`, 'GET', undefined, {
      Authorization: `Bearer ${tokenSales}`,
    });
    assert.equal(res.status, 200);
    const body = res.body as {
      success: boolean;
      data: CustomerRecord[];
      meta: { total: number; page: number };
    };
    assert.equal(body.success, true);
    assert.ok(Array.isArray(body.data));
    assert.equal(body.meta.page, 1);
  });

  it('POST /api/v1/customers returns 403 Forbidden for accounting role (ke_toan)', async () => {
    const res = await requestJson(
      `${baseUrl}/api/v1/customers`,
      'POST',
      {
        ten_khach_hang: 'Khách Test',
        loai_khach_hang: 'ca_nhan',
        so_dien_thoai: '0912345678',
        dia_chi: 'Hà Nội',
        tinh_thanh_pho: 'Hà Nội',
      },
      { Authorization: `Bearer ${tokenAccounting}` }
    );

    assert.equal(res.status, 403);
  });

  it('POST /api/v1/customers returns 201 Created for sales role (ban_hang)', async () => {
    const res = await requestJson(
      `${baseUrl}/api/v1/customers`,
      'POST',
      {
        ten_khach_hang: 'Công ty Cổ phần Thời trang Mới',
        loai_khach_hang: 'to_chuc',
        so_dien_thoai: '0283811223',
        dia_chi: 'Quận 1, TP.HCM',
        tinh_thanh_pho: 'TP. Hồ Chí Minh',
        han_muc_cong_no: 300000000,
        so_ngay_cong_no: 30,
      },
      { Authorization: `Bearer ${tokenSales}` }
    );

    assert.equal(res.status, 201);
    const body = res.body as {
      success: boolean;
      data: CustomerRecord;
      message: string;
    };
    assert.equal(body.success, true);
    assert.ok(body.data.id);
    assert.ok(body.data.ma_khach_hang.startsWith('KH-'));
  });

  it('PATCH /api/v1/customers/:id/status returns 403 Forbidden for sales role (ban_hang)', async () => {
    const res = await requestJson(
      `${baseUrl}/api/v1/customers/1/status`,
      'PATCH',
      { trang_thai: 'tam_khoa' },
      { Authorization: `Bearer ${tokenSales}` }
    );

    assert.equal(res.status, 403);
    const body = res.body as { error: { code: string } };
    assert.equal(body.error.code, 'AUTH_FORBIDDEN');
  });

  it('PATCH /api/v1/customers/:id/status succeeds for admin role', async () => {
    const res = await requestJson(
      `${baseUrl}/api/v1/customers/1/status`,
      'PATCH',
      { trang_thai: 'tam_khoa' },
      { Authorization: `Bearer ${tokenAdmin}` }
    );

    assert.equal(res.status, 200);
    const body = res.body as {
      success: boolean;
      data: CustomerRecord;
    };
    assert.equal(body.success, true);
    assert.equal(body.data.trang_thai, 'tam_khoa');
  });

  it('GET /api/v1/customers/:id/summary returns commercial summary for accounting role', async () => {
    const res = await requestJson(`${baseUrl}/api/v1/customers/1/summary`, 'GET', undefined, {
      Authorization: `Bearer ${tokenAccounting}`,
    });

    assert.equal(res.status, 200);
    const body = res.body as {
      success: boolean;
      data: CustomerSummary;
    };
    assert.equal(body.success, true);
    assert.equal(body.data.totalOrders, 1);
  });
});
