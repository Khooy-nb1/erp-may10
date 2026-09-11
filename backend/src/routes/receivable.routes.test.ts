import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import express from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { createReceivableRoutes } from './receivable.routes.js';
import { createCustomerRoutes } from './customer.routes.js';
import { ReceivableService } from '../services/receivable.service.js';
import { CustomerService } from '../services/customer.service.js';
import { IReceivableRepository } from '../repositories/receivable.repository.js';
import { ICustomerRepository } from '../repositories/customer.repository.js';
import { ReceivableRecord, ReceivableListFilters } from '../models/receivable.model.js';
import { CustomerRecord } from '../models/customer.model.js';
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

describe('Receivable Routes HTTP Integration & RBAC', () => {
  let server: http.Server;
  let baseUrl: string;

  let tokenSales: string;
  let tokenAccounting: string;
  let tokenWarehouse: string;

  before(async () => {
    const users: UserRecord[] = [
      { id: 1, ho_ten: 'Bán Hàng', email: 'sales@example.com', mat_khau: 'h', so_dien_thoai: null, vai_tro: 'ban_hang', phong_ban: null, trang_thai: 'hoat_dong' },
      { id: 2, ho_ten: 'Kế Toán', email: 'ketoan@example.com', mat_khau: 'h', so_dien_thoai: null, vai_tro: 'ke_toan', phong_ban: null, trang_thai: 'hoat_dong' },
      { id: 3, ho_ten: 'Kho Hàng', email: 'kho@example.com', mat_khau: 'h', so_dien_thoai: null, vai_tro: 'kho', phong_ban: null, trang_thai: 'hoat_dong' },
    ];

    const mockUserRepo: IUserRepository = {
      findByEmail: async (email) => users.find((u) => u.email === email) || null,
      findById: async (id) => users.find((u) => u.id === id) || null,
    };

    tokenSales = jwt.sign({ id: 1, email: 'sales@example.com', vai_tro: 'ban_hang' }, env.JWT_SECRET);
    tokenAccounting = jwt.sign({ id: 2, email: 'ketoan@example.com', vai_tro: 'ke_toan' }, env.JWT_SECRET);
    tokenWarehouse = jwt.sign({ id: 3, email: 'kho@example.com', vai_tro: 'kho' }, env.JWT_SECRET);

    const receivables: ReceivableRecord[] = [
      {
        id: 1,
        loai_cong_no: 'phai_thu',
        ma_khach_hang: 1,
        ten_khach_hang: 'Khách A',
        ma_khach_hang_code: 'KH-001',
        ma_hoa_don: 1,
        ma_hoa_don_code: 'HDBH-001',
        bang_hoa_don: 'hoa_don_ban_hang',
        so_tien_phat_sinh: 5000000,
        so_tien_da_thanh_toan: 0,
        so_tien_con_lai: 5000000,
        ngay_dao_han: new Date(),
        daysOverdue: 0,
        trang_thai: 'chua_thanh_toan',
        ngay_tao: new Date(),
        ngay_cap_nhat: new Date(),
      },
    ];

    const mockReceivableRepo: IReceivableRepository = {
      list: async (_filters: ReceivableListFilters) => ({
        receivables,
        total: receivables.length,
        page: 1,
        pageSize: 20,
        totalPages: 1,
      }),
      getSummary: async () => ({
        totalOriginal: '5000000.00',
        totalPaid: '0.00',
        totalOutstanding: '5000000.00',
        totalOverdue: '0.00',
        overdueCount: 0,
      }),
      getAgingReport: async () => ({
        current: { label: 'Trong hạn', minDays: null, maxDays: 0, totalAmount: '5000000.00', count: 1 },
        days1To30: { label: '1 – 30 ngày', minDays: 1, maxDays: 30, totalAmount: '0.00', count: 0 },
        days31To60: { label: '31 – 60 ngày', minDays: 31, maxDays: 60, totalAmount: '0.00', count: 0 },
        days61To90: { label: '61 – 90 ngày', minDays: 61, maxDays: 90, totalAmount: '0.00', count: 0 },
        daysOver90: { label: 'Trên 90 ngày', minDays: 91, maxDays: null, totalAmount: '0.00', count: 0 },
        totalReceivables: '5000000.00',
      }),
    };

    const customers: CustomerRecord[] = [
      {
        id: 1,
        ma_khach_hang: 'KH-001',
        ten_khach_hang: 'Khách A',
        loai_khach_hang: 'to_chuc',
        ma_so_thue: null,
        so_dien_thoai: '0243123456',
        email: null,
        dia_chi: 'Hà Nội',
        tinh_thanh_pho: 'Hà Nội',
        nguoi_lien_he: null,
        han_muc_cong_no: 50000000,
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
      list: async () => ({ customers, total: customers.length, page: 1, pageSize: 20, totalPages: 1 }),
      findById: async (id: number) => customers.find((c) => c.id === id) || null,
      findByCode: async (code: string) => customers.find((c) => c.ma_khach_hang === code) || null,
      create: async () => { throw new Error('not implemented'); },
      update: async () => null,
      updateStatus: async () => null,
      getSummary: async () => ({ totalOrders: 0, totalOrderValue: '0', unpaidInvoicesCount: 0, outstandingReceivable: '0', overdueReceivable: '0' }),
    };

    const receivableService = new ReceivableService(mockReceivableRepo);
    const customerService = new CustomerService(mockCustomerRepo);
    const auth = createAuthMiddleware(mockUserRepo);

    const receivableRoutes = createReceivableRoutes(receivableService, auth);
    const customerRoutes = createCustomerRoutes(customerService, auth, receivableService);

    const app = express();
    app.use(express.json());
    app.use('/api/v1/receivables', receivableRoutes);
    app.use('/api/v1/customers', customerRoutes);
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

  it('GET /api/v1/receivables returns 401 without Bearer token', async () => {
    const res = await requestJson(`${baseUrl}/api/v1/receivables`, 'GET');
    assert.equal(res.status, 401);
  });

  it('GET /api/v1/receivables returns 403 Forbidden for warehouse role (kho)', async () => {
    const res = await requestJson(`${baseUrl}/api/v1/receivables`, 'GET', {
      Authorization: `Bearer ${tokenWarehouse}`,
    });
    assert.equal(res.status, 403);
    const body = res.body as { error: { code: string } };
    assert.equal(body.error.code, 'AUTH_FORBIDDEN');
  });

  it('GET /api/v1/receivables returns 200 with paginated envelope for sales role', async () => {
    const res = await requestJson(`${baseUrl}/api/v1/receivables`, 'GET', {
      Authorization: `Bearer ${tokenSales}`,
    });
    assert.equal(res.status, 200);
    const body = res.body as { success: boolean; data: ReceivableRecord[] };
    assert.equal(body.success, true);
    assert.equal(body.data.length, 1);
    assert.equal(body.data[0].loai_cong_no, 'phai_thu');
  });

  it('GET /api/v1/receivables/summary returns 200 with summary metrics', async () => {
    const res = await requestJson(`${baseUrl}/api/v1/receivables/summary`, 'GET', {
      Authorization: `Bearer ${tokenAccounting}`,
    });
    assert.equal(res.status, 200);
    const body = res.body as { success: boolean; data: { totalOutstanding: string } };
    assert.equal(body.success, true);
    assert.equal(body.data.totalOutstanding, '5000000.00');
  });

  it('GET /api/v1/receivables/summary accepts a valid ma_khach_hang filter', async () => {
    const res = await requestJson(`${baseUrl}/api/v1/receivables/summary?ma_khach_hang=1`, 'GET', {
      Authorization: `Bearer ${tokenAccounting}`,
    });
    assert.equal(res.status, 200);
    const body = res.body as { success: boolean; data: { totalOutstanding: string } };
    assert.equal(body.success, true);
    assert.equal(body.data.totalOutstanding, '5000000.00');
  });

  it('GET /api/v1/receivables/summary rejects an invalid ma_khach_hang with 422', async () => {
    const res = await requestJson(`${baseUrl}/api/v1/receivables/summary?ma_khach_hang=abc`, 'GET', {
      Authorization: `Bearer ${tokenAccounting}`,
    });
    assert.equal(res.status, 422);
    const body = res.body as { error: { code: string } };
    assert.equal(body.error.code, 'VALIDATION_ERROR');
  });

  it('GET /api/v1/receivables/aging rejects sales role with 403 Forbidden', async () => {
    const res = await requestJson(`${baseUrl}/api/v1/receivables/aging`, 'GET', {
      Authorization: `Bearer ${tokenSales}`,
    });
    assert.equal(res.status, 403);
    const body = res.body as { error: { code: string } };
    assert.equal(body.error.code, 'AUTH_FORBIDDEN');
  });

  it('GET /api/v1/receivables/aging returns aging buckets for accounting role', async () => {
    const res = await requestJson(`${baseUrl}/api/v1/receivables/aging`, 'GET', {
      Authorization: `Bearer ${tokenAccounting}`,
    });
    assert.equal(res.status, 200);
    const body = res.body as { success: boolean; data: { totalReceivables: string } };
    assert.equal(body.success, true);
    assert.equal(body.data.totalReceivables, '5000000.00');
  });

  it('GET /api/v1/customers/:id/receivables returns customer receivables', async () => {
    const res = await requestJson(`${baseUrl}/api/v1/customers/1/receivables`, 'GET', {
      Authorization: `Bearer ${tokenSales}`,
    });
    assert.equal(res.status, 200);
    const body = res.body as { success: boolean; data: ReceivableRecord[] };
    assert.equal(body.success, true);
    assert.equal(body.data.length, 1);
  });
});
