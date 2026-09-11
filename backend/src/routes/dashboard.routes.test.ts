import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import express from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { createDashboardRoutes } from './dashboard.routes.js';
import { DashboardService } from '../services/dashboard.service.js';
import { IDashboardRepository } from '../repositories/dashboard.repository.js';
import { DashboardSummary, DashboardWindow } from '../models/dashboard.model.js';
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

const ENDPOINTS = ['/summary', '/revenue-chart', '/order-status', '/top-customers', '/top-products'];

const SUMMARY: DashboardSummary = {
  orderCount: 5,
  totalOrderValue: '4000000.00',
  statusCounts: { cho_xac_nhan: 1, da_xac_nhan: 1, dang_san_xuat: 0, da_giao: 2, huy: 1 },
  openReceivable: '400000.00',
  overdueReceivable: '120000.00',
  unpaidInvoiceCount: 7,
  overdueInvoiceCount: 2,
};

describe('Dashboard Routes HTTP Integration & RBAC', () => {
  let server: http.Server;
  let baseUrl: string;

  let tokenAdmin: string;
  let tokenSales: string;
  let tokenAccounting: string;
  let tokenWarehouse: string;

  before(async () => {
    const users: UserRecord[] = [
      { id: 1, ho_ten: 'Quản Trị', email: 'admin@example.com', mat_khau: 'h', so_dien_thoai: null, vai_tro: 'admin', phong_ban: null, trang_thai: 'hoat_dong' },
      { id: 2, ho_ten: 'Bán Hàng', email: 'sales@example.com', mat_khau: 'h', so_dien_thoai: null, vai_tro: 'ban_hang', phong_ban: null, trang_thai: 'hoat_dong' },
      { id: 3, ho_ten: 'Kế Toán', email: 'ketoan@example.com', mat_khau: 'h', so_dien_thoai: null, vai_tro: 'ke_toan', phong_ban: null, trang_thai: 'hoat_dong' },
      { id: 4, ho_ten: 'Kho Hàng', email: 'kho@example.com', mat_khau: 'h', so_dien_thoai: null, vai_tro: 'kho', phong_ban: null, trang_thai: 'hoat_dong' },
    ];

    const mockUserRepo: IUserRepository = {
      findByEmail: async (email) => users.find((u) => u.email === email) || null,
      findById: async (id) => users.find((u) => u.id === id) || null,
    };

    tokenAdmin = jwt.sign({ id: 1, email: 'admin@example.com', vai_tro: 'admin' }, env.JWT_SECRET);
    tokenSales = jwt.sign({ id: 2, email: 'sales@example.com', vai_tro: 'ban_hang' }, env.JWT_SECRET);
    tokenAccounting = jwt.sign({ id: 3, email: 'ketoan@example.com', vai_tro: 'ke_toan' }, env.JWT_SECRET);
    tokenWarehouse = jwt.sign({ id: 4, email: 'kho@example.com', vai_tro: 'kho' }, env.JWT_SECRET);

    // In-memory aggregate source: no database is contacted by these routes.
    const mockRepo: IDashboardRepository = {
      getSummary: async (_window: DashboardWindow): Promise<DashboardSummary> => SUMMARY,
      getRevenueChart: async () => ({
        source: 'hoa_don_ban_hang.tong_tien_sau_thue',
        label: 'Doanh thu theo hóa đơn',
        series: [{ period: '2026-08', revenue: '5000000.00', invoiceCount: 3 }],
        total: '5000000.00',
      }),
      getOrderStatus: async () => ({ total: 5, statuses: [{ status: 'cho_xac_nhan', count: 1 }, { status: 'huy', count: 1 }] }),
      getTopCustomers: async () => ({
        metric: 'don_ban_hang.tong_thanh_toan',
        items: [{ maKhachHang: 1, maKhachHangCode: 'KH-001', tenKhachHang: 'Khách A', orderCount: 3, totalValue: '9000000.00' }],
      }),
      getTopProducts: async () => ({
        metric: 'chi_tiet_don_ban_hang.thanh_tien',
        items: [{ maSanPham: 1, maSanPhamCode: 'SP-001', tenSanPham: 'Sản phẩm A', quantity: '120.000', totalValue: '7000000.00' }],
      }),
    };

    const app = express();
    app.use(express.json());
    app.use('/api/v1/dashboard', createDashboardRoutes(new DashboardService(mockRepo), createAuthMiddleware(mockUserRepo)));
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

  it('returns 401 on every endpoint without a Bearer token', async () => {
    for (const endpoint of ENDPOINTS) {
      const res = await requestJson(`${baseUrl}/api/v1/dashboard${endpoint}`, 'GET');
      assert.equal(res.status, 401, `${endpoint} must require authentication`);
    }
  });

  it('returns 200 on all five endpoints for admin with the full summary scope', async () => {
    for (const endpoint of ENDPOINTS) {
      const res = await requestJson(`${baseUrl}/api/v1/dashboard${endpoint}`, 'GET', {
        Authorization: `Bearer ${tokenAdmin}`,
      });
      assert.equal(res.status, 200, `${endpoint} must be allowed for admin`);
    }

    const summary = await requestJson(`${baseUrl}/api/v1/dashboard/summary`, 'GET', {
      Authorization: `Bearer ${tokenAdmin}`,
    });
    const body = summary.body as { data: { scope: string; metrics: Record<string, unknown> } };
    assert.equal(body.data.scope, 'full');
    assert.equal(body.data.metrics.orderCount, 5);
    assert.equal(body.data.metrics.totalOrderValue, '4000000.00');
    assert.deepEqual(body.data.metrics.statusCounts, SUMMARY.statusCounts);
  });

  it('returns 200 on all five endpoints for ban_hang', async () => {
    for (const endpoint of ENDPOINTS) {
      const res = await requestJson(`${baseUrl}/api/v1/dashboard${endpoint}`, 'GET', {
        Authorization: `Bearer ${tokenSales}`,
      });
      assert.equal(res.status, 200, `${endpoint} must be allowed for ban_hang`);
    }
  });

  it('returns 200 on all five endpoints for ke_toan, with only financial metrics serialized', async () => {
    for (const endpoint of ENDPOINTS) {
      const res = await requestJson(`${baseUrl}/api/v1/dashboard${endpoint}`, 'GET', {
        Authorization: `Bearer ${tokenAccounting}`,
      });
      assert.equal(res.status, 200, `${endpoint} must be allowed for ke_toan`);
    }

    const summary = await requestJson(`${baseUrl}/api/v1/dashboard/summary`, 'GET', {
      Authorization: `Bearer ${tokenAccounting}`,
    });
    const body = summary.body as { data: { scope: string; metrics: Record<string, unknown> } };
    assert.equal(body.data.scope, 'financial');
    assert.deepEqual(Object.keys(body.data.metrics).sort(), [
      'openReceivable',
      'overdueInvoiceCount',
      'overdueReceivable',
      'unpaidInvoiceCount',
    ]);
    assert.equal(body.data.metrics.openReceivable, '400000.00');
  });

  it('returns 200 for kho on /summary and /order-status with no money key serialized', async () => {
    const summary = await requestJson(`${baseUrl}/api/v1/dashboard/summary`, 'GET', {
      Authorization: `Bearer ${tokenWarehouse}`,
    });
    assert.equal(summary.status, 200);
    const body = summary.body as { data: { scope: string; metrics: Record<string, unknown> } };
    assert.equal(body.data.scope, 'fulfillment');
    assert.deepEqual(Object.keys(body.data.metrics).sort(), ['orderCount', 'statusCounts']);
    for (const moneyKey of ['totalOrderValue', 'openReceivable', 'overdueReceivable', 'unpaidInvoiceCount', 'overdueInvoiceCount']) {
      assert.equal(JSON.stringify(summary.body).includes(moneyKey), false, `${moneyKey} must not be serialized for kho`);
    }

    const orderStatus = await requestJson(`${baseUrl}/api/v1/dashboard/order-status`, 'GET', {
      Authorization: `Bearer ${tokenWarehouse}`,
    });
    assert.equal(orderStatus.status, 200);
    const statusBody = orderStatus.body as { data: { statuses: Array<{ status: string; count: number }> } };
    assert.deepEqual(statusBody.data.statuses[1], { status: 'huy', count: 1 });
  });

  it('returns 403 AUTH_FORBIDDEN for kho on /revenue-chart, /top-customers, and /top-products', async () => {
    for (const endpoint of ['/revenue-chart', '/top-customers', '/top-products']) {
      const res = await requestJson(`${baseUrl}/api/v1/dashboard${endpoint}`, 'GET', {
        Authorization: `Bearer ${tokenWarehouse}`,
      });
      assert.equal(res.status, 403, `${endpoint} must be denied for kho`);
      const body = res.body as { error: { code: string } };
      assert.equal(body.error.code, 'AUTH_FORBIDDEN');
    }
  });

  it('rejects period=custom without dates with 422 VALIDATION_ERROR', async () => {
    const res = await requestJson(`${baseUrl}/api/v1/dashboard/summary?period=custom`, 'GET', {
      Authorization: `Bearer ${tokenAdmin}`,
    });
    assert.equal(res.status, 422);
    const body = res.body as { error: { code: string; details: Array<{ field: string; message: string }> } };
    assert.equal(body.error.code, 'VALIDATION_ERROR');
    assert.ok(body.error.details.length > 0);
    assert.ok(body.error.details.some((d) => d.field === 'fromDate'));
  });

  it('rejects period=custom with fromDate after toDate with 422 VALIDATION_ERROR', async () => {
    const res = await requestJson(
      `${baseUrl}/api/v1/dashboard/summary?period=custom&fromDate=2026-09-30&toDate=2026-09-01`,
      'GET',
      { Authorization: `Bearer ${tokenAdmin}` }
    );
    assert.equal(res.status, 422);
    const body = res.body as { error: { code: string } };
    assert.equal(body.error.code, 'VALIDATION_ERROR');
  });

  it('rejects an out-of-range limit with 422 VALIDATION_ERROR', async () => {
    const res = await requestJson(`${baseUrl}/api/v1/dashboard/top-products?limit=999`, 'GET', {
      Authorization: `Bearer ${tokenSales}`,
    });
    assert.equal(res.status, 422);
    const body = res.body as { error: { code: string } };
    assert.equal(body.error.code, 'VALIDATION_ERROR');
  });

  it('accepts a valid custom window and returns the revenue chart for ke_toan', async () => {
    const res = await requestJson(
      `${baseUrl}/api/v1/dashboard/revenue-chart?period=custom&fromDate=2026-09-01&toDate=2026-09-30`,
      'GET',
      { Authorization: `Bearer ${tokenAccounting}` }
    );
    assert.equal(res.status, 200);
    const body = res.body as { data: { source: string; series: Array<{ revenue: string }>; total: string } };
    assert.equal(body.data.source, 'hoa_don_ban_hang.tong_tien_sau_thue');
    assert.equal(body.data.series[0].revenue, '5000000.00');
    assert.equal(body.data.total, '5000000.00');
  });
});
