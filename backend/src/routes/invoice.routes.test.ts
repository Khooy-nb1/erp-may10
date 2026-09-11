import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import express from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { createInvoiceRoutes } from './invoice.routes.js';
import { InvoiceService } from '../services/invoice.service.js';
import { IInvoiceRepository } from '../repositories/invoice.repository.js';
import { IOrderRepository } from '../repositories/order.repository.js';
import { ICustomerRepository } from '../repositories/customer.repository.js';
import { InvoiceRecord, InvoiceListFilters } from '../models/invoice.model.js';
import { OrderRecord } from '../models/order.model.js';
import { CustomerRecord } from '../models/customer.model.js';
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

describe('Invoice Routes HTTP Integration & RBAC', () => {
  let server: http.Server;
  let baseUrl: string;

  let tokenAccounting: string;
  let tokenSales: string;

  before(async () => {
    const users: UserRecord[] = [
      { id: 1, ho_ten: 'Kế Toán', email: 'ketoan@example.com', mat_khau: 'h', so_dien_thoai: null, vai_tro: 'ke_toan', phong_ban: null, trang_thai: 'hoat_dong' },
      { id: 2, ho_ten: 'Bán Hàng', email: 'sales@example.com', mat_khau: 'h', so_dien_thoai: null, vai_tro: 'ban_hang', phong_ban: null, trang_thai: 'hoat_dong' },
    ];

    const mockUserRepo: IUserRepository = {
      findByEmail: async (email) => users.find((u) => u.email === email) || null,
      findById: async (id) => users.find((u) => u.id === id) || null,
    };

    tokenAccounting = jwt.sign({ id: 1, email: 'ketoan@example.com', vai_tro: 'ke_toan' }, env.JWT_SECRET);
    tokenSales = jwt.sign({ id: 2, email: 'sales@example.com', vai_tro: 'ban_hang' }, env.JWT_SECRET);

    const invoices: InvoiceRecord[] = [];

    const orders: OrderRecord[] = [
      {
        id: 1,
        ma_don_ban: 'DBH-2026-000001',
        ma_khach_hang: 1,
        ngay_dat_hang: new Date(),
        ngay_giao_hang_yc: new Date(),
        ngay_giao_thuc_te: null,
        dia_chi_giao_hang: 'Hà Nội',
        tong_tien_hang: 5000000,
        tien_thue: 0,
        tien_giam_gia: 0,
        tong_thanh_toan: 5000000,
        nguoi_ban: 2,
        trang_thai: 'da_xac_nhan', // Confirmed
        ghi_chu: null,
        ngay_tao: new Date(),
        ngay_cap_nhat: new Date(),
        nguoi_tao: 2,
        nguoi_cap_nhat: 2,
      },
      {
        id: 2,
        ma_don_ban: 'DBH-2026-000002',
        ma_khach_hang: 1,
        ngay_dat_hang: new Date(),
        ngay_giao_hang_yc: new Date(),
        ngay_giao_thuc_te: null,
        dia_chi_giao_hang: 'Hà Nội',
        tong_tien_hang: 3000000,
        tien_thue: 0,
        tien_giam_gia: 0,
        tong_thanh_toan: 3000000,
        nguoi_ban: 2,
        trang_thai: 'cho_xac_nhan', // Pending
        ghi_chu: null,
        ngay_tao: new Date(),
        ngay_cap_nhat: new Date(),
        nguoi_tao: 2,
        nguoi_cap_nhat: 2,
      },
    ];

    const customers: CustomerRecord[] = [
      {
        id: 1,
        ma_khach_hang: 'KH-001',
        ten_khach_hang: 'Công ty Alpha',
        loai_khach_hang: 'to_chuc',
        ma_so_thue: null,
        so_dien_thoai: '0243111222',
        email: null,
        dia_chi: 'Hà Nội',
        tinh_thanh_pho: 'Hà Nội',
        nguoi_lien_he: null,
        han_muc_cong_no: 20000000,
        so_ngay_cong_no: 30,
        ghi_chu: null,
        trang_thai: 'hoat_dong',
        ngay_tao: new Date(),
        ngay_cap_nhat: new Date(),
        nguoi_tao: 1,
        nguoi_cap_nhat: 1,
      },
    ];

    const mockInvoiceRepo: IInvoiceRepository = {
      list: async (_filters: InvoiceListFilters) => ({
        invoices,
        total: invoices.length,
        page: 1,
        pageSize: 20,
        totalPages: 1,
      }),
      findById: async (id: number) => invoices.find((i) => i.id === id) || null,
      findByCode: async (code: string) => invoices.find((i) => i.ma_hoa_don === code) || null,
      findByOrderId: async (orderId: number) => invoices.find((i) => i.ma_don_ban_hang === orderId) || null,
      create: async () => { throw new Error('deprecated'); },
      createInvoiceAtomic: async (params) => {
        const order = orders.find((o) => o.id === params.orderId);
        if (!order) return { error: 'ORDER_NOT_FOUND', details: 'Order not found' };
        if (order.trang_thai === 'cho_xac_nhan' || order.trang_thai === 'huy') {
          return { error: 'INVOICE_INVALID_ORDER', details: 'Invalid order state' };
        }
        const dup = invoices.find((i) => i.ma_don_ban_hang === params.orderId);
        if (dup) {
          return { error: 'INVOICE_ALREADY_EXISTS', details: 'Invoice already exists' };
        }

        const inv: InvoiceRecord = {
          id: invoices.length + 1,
          ma_hoa_don: `HDBH-2026-000${invoices.length + 1}`,
          ma_don_ban_hang: order.id,
          ma_khach_hang: order.ma_khach_hang,
          ngay_xuat_hoa_don: params.issueDate,
          ngay_dao_han: new Date(params.issueDate.getTime() + 30 * 24 * 60 * 60 * 1000),
          tong_tien_truoc_thue: 5000000,
          tien_thue: 0,
          tong_tien_sau_thue: 5000000,
          so_tien_da_thu: params.paidAmount,
          trang_thai: 'chua_thanh_toan',
          ghi_chu: params.notes,
          ngay_tao: new Date(),
          ngay_cap_nhat: new Date(),
          nguoi_tao: params.creatorId,
          nguoi_cap_nhat: params.creatorId,
        };
        invoices.push(inv);
        return { invoice: inv };
      },
    };

    const mockOrderRepo: IOrderRepository = {
      list: async () => ({ orders, total: orders.length, page: 1, pageSize: 20, totalPages: 1 }),
      findById: async (id: number) => orders.find((o) => o.id === id) || null,
      findByCode: async (code: string) => orders.find((o) => o.ma_don_ban === code) || null,
      create: async () => { throw new Error('not implemented'); },
      update: async () => null,
      updateStatus: async () => null,
      getCustomerOutstanding: async () => 0,
    };

    const mockCustomerRepo: ICustomerRepository = {
      list: async () => ({ customers, total: customers.length, page: 1, pageSize: 20, totalPages: 1 }),
      findById: async (id: number) => customers.find((c) => c.id === id) || null,
      findByCode: async (code: string) => customers.find((c) => c.ma_khach_hang === code) || null,
      create: async () => { throw new Error('not implemented'); },
      update: async () => null,
      updateStatus: async () => null,
      getSummary: async () => ({ totalOrders: 0, totalOrderValue: '0', unpaidInvoicesCount: 0, outstandingReceivable: '0', overdueReceivable: '0' }),
    };

    const service = new InvoiceService(mockInvoiceRepo, mockOrderRepo, mockCustomerRepo);
    const auth = createAuthMiddleware(mockUserRepo);
    const routes = createInvoiceRoutes(service, auth);

    const app = express();
    app.use(express.json());
    app.use('/api/v1/invoices', routes);
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

  it('GET /api/v1/invoices returns 401 without Bearer token', async () => {
    const res = await requestJson(`${baseUrl}/api/v1/invoices`, 'GET');
    assert.equal(res.status, 401);
  });

  it('GET /api/v1/invoices returns 200 with paginated envelope for accounting role', async () => {
    const res = await requestJson(`${baseUrl}/api/v1/invoices`, 'GET', undefined, {
      Authorization: `Bearer ${tokenAccounting}`,
    });
    assert.equal(res.status, 200);
    const body = res.body as { success: boolean; data: InvoiceRecord[] };
    assert.equal(body.success, true);
    assert.ok(Array.isArray(body.data));
  });

  it('POST /api/v1/invoices rejects sales role (ban_hang) with 403 Forbidden', async () => {
    const res = await requestJson(
      `${baseUrl}/api/v1/invoices`,
      'POST',
      {
        orderId: 1,
        issueDate: '2026-09-11',
      },
      { Authorization: `Bearer ${tokenSales}` }
    );

    assert.equal(res.status, 403);
    const body = res.body as { error: { code: string } };
    assert.equal(body.error.code, 'AUTH_FORBIDDEN');
  });

  it('POST /api/v1/invoices creates invoice atomically and returns 201 for accounting role', async () => {
    const res = await requestJson(
      `${baseUrl}/api/v1/invoices`,
      'POST',
      {
        orderId: 1,
        issueDate: '2026-09-11',
      },
      { Authorization: `Bearer ${tokenAccounting}` }
    );

    assert.equal(res.status, 201);
    const body = res.body as { success: boolean; data: InvoiceRecord };
    assert.equal(body.success, true);
    assert.ok(body.data.id);
    assert.equal(body.data.trang_thai, 'chua_thanh_toan');
  });

  it('POST /api/v1/invoices rejects duplicate invoice on same order with 409 Conflict', async () => {
    const res = await requestJson(
      `${baseUrl}/api/v1/invoices`,
      'POST',
      {
        orderId: 1, // Order 1 already has an invoice created in previous test
        issueDate: '2026-09-11',
      },
      { Authorization: `Bearer ${tokenAccounting}` }
    );

    assert.equal(res.status, 409);
    const body = res.body as { error: { code: string } };
    assert.equal(body.error.code, 'INVOICE_ALREADY_EXISTS');
  });

  it('POST /api/v1/invoices rejects unconfirmed order with 422 INVOICE_INVALID_ORDER', async () => {
    const res = await requestJson(
      `${baseUrl}/api/v1/invoices`,
      'POST',
      {
        orderId: 2, // Order 2 is cho_xac_nhan
        issueDate: '2026-09-11',
      },
      { Authorization: `Bearer ${tokenAccounting}` }
    );

    assert.equal(res.status, 422);
    const body = res.body as { error: { code: string } };
    assert.equal(body.error.code, 'INVOICE_INVALID_ORDER');
  });

  it('GET /api/v1/invoices/:id returns invoice details', async () => {
    const res = await requestJson(`${baseUrl}/api/v1/invoices/1`, 'GET', undefined, {
      Authorization: `Bearer ${tokenAccounting}`,
    });

    assert.equal(res.status, 200);
    const body = res.body as { success: boolean; data: InvoiceRecord };
    assert.equal(body.success, true);
    assert.equal(body.data.id, 1);
  });
});
