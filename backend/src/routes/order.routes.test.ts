import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import express from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { createOrderRoutes } from './order.routes.js';
import { OrderService } from '../services/order.service.js';
import { IOrderRepository } from '../repositories/order.repository.js';
import { ICustomerRepository } from '../repositories/customer.repository.js';
import { IProductRepository } from '../repositories/product.repository.js';
import { OrderRecord, OrderListFilters } from '../models/order.model.js';
import { CustomerRecord } from '../models/customer.model.js';
import { ProductRecord } from '../models/product.model.js';
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

describe('Order Routes HTTP Integration & RBAC', () => {
  let server: http.Server;
  let baseUrl: string;
  let tokenSales: string;
  let tokenAdmin: string;

  before(async () => {
    const users: UserRecord[] = [
      { id: 1, ho_ten: 'Bán Hàng', email: 'sales@example.com', mat_khau: 'h', so_dien_thoai: null, vai_tro: 'ban_hang', phong_ban: null, trang_thai: 'hoat_dong' },
      { id: 2, ho_ten: 'Admin', email: 'admin@example.com', mat_khau: 'h', so_dien_thoai: null, vai_tro: 'admin', phong_ban: null, trang_thai: 'hoat_dong' },
    ];

    const mockUserRepo: IUserRepository = {
      findByEmail: async (email) => users.find((u) => u.email === email) || null,
      findById: async (id) => users.find((u) => u.id === id) || null,
    };

    tokenSales = jwt.sign({ id: 1, email: 'sales@example.com', vai_tro: 'ban_hang' }, env.JWT_SECRET);
    tokenAdmin = jwt.sign({ id: 2, email: 'admin@example.com', vai_tro: 'admin' }, env.JWT_SECRET);

    const orders: OrderRecord[] = [
      {
        id: 1,
        ma_don_ban: 'DBH-2026-000001',
        ma_khach_hang: 1,
        ngay_dat_hang: new Date('2026-09-11'),
        ngay_giao_hang_yc: new Date('2026-09-20'),
        ngay_giao_thuc_te: null,
        dia_chi_giao_hang: 'Kho Hà Nội',
        tong_tien_hang: 450000,
        tien_thue: 0,
        tien_giam_gia: 0,
        tong_thanh_toan: 450000,
        nguoi_ban: 1,
        trang_thai: 'cho_xac_nhan',
        ghi_chu: null,
        ngay_tao: new Date(),
        ngay_cap_nhat: new Date(),
        nguoi_tao: 1,
        nguoi_cap_nhat: 1,
        lines: [
          {
            id: 1,
            ma_don_ban_hang: 1,
            ma_san_pham: 1,
            so_luong: 1,
            don_gia: 450000,
            ty_le_giam_gia: 0,
            thanh_tien: 450000,
            so_luong_giao: 0,
            ghi_chu: null,
            trang_thai: 'chua_giao',
          },
        ],
      },
    ];

    const customers: CustomerRecord[] = [
      {
        id: 1,
        ma_khach_hang: 'KH-001',
        ten_khach_hang: 'Khách Hàng Chuẩn',
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

    const products: ProductRecord[] = [
      {
        id: 1,
        ma_san_pham: 'SP-001',
        ten_san_pham: 'Áo Sơ Mi Nam',
        mo_ta: null,
        ma_don_vi_tinh: 1,
        gia_ban: 450000,
        size: 'L',
        mau_sac: 'Trắng',
        trang_thai: 'dang_ban',
      },
    ];

    const mockOrderRepo: IOrderRepository = {
      list: async (_filters: OrderListFilters) => ({
        orders,
        total: orders.length,
        page: 1,
        pageSize: 20,
        totalPages: 1,
      }),
      findById: async (id: number) => orders.find((o) => o.id === id) || null,
      findByCode: async (code: string) => orders.find((o) => o.ma_don_ban === code) || null,
      create: async (params) => {
        const o: OrderRecord = {
          id: orders.length + 1,
          ma_don_ban: params.ma_don_ban,
          ma_khach_hang: params.ma_khach_hang,
          ngay_dat_hang: params.ngay_dat_hang,
          ngay_giao_hang_yc: params.ngay_giao_hang_yc,
          ngay_giao_thuc_te: null,
          dia_chi_giao_hang: params.dia_chi_giao_hang,
          tong_tien_hang: params.tong_tien_hang,
          tien_thue: params.tien_thue,
          tien_giam_gia: params.tien_giam_gia,
          tong_thanh_toan: params.tong_thanh_toan,
          nguoi_ban: params.nguoi_ban,
          trang_thai: 'cho_xac_nhan',
          ghi_chu: params.ghi_chu,
          ngay_tao: new Date(),
          ngay_cap_nhat: new Date(),
          nguoi_tao: params.creatorId,
          nguoi_cap_nhat: params.creatorId,
          lines: params.lines.map((l, idx) => ({
            id: idx + 1,
            ma_don_ban_hang: orders.length + 1,
            ma_san_pham: l.ma_san_pham,
            so_luong: l.so_luong,
            don_gia: l.don_gia,
            ty_le_giam_gia: l.ty_le_giam_gia,
            thanh_tien: l.thanh_tien,
            so_luong_giao: 0,
            ghi_chu: l.ghi_chu || null,
            trang_thai: 'chua_giao',
          })),
        };
        orders.push(o);
        return o;
      },
      update: async (id, updates, _lines, updaterId) => {
        const o = orders.find((x) => x.id === id);
        if (!o) return null;
        Object.assign(o, updates, { nguoi_cap_nhat: updaterId });
        return o;
      },
      updateStatus: async (id, status, updaterId) => {
        const o = orders.find((x) => x.id === id);
        if (!o) return null;
        o.trang_thai = status;
        o.nguoi_cap_nhat = updaterId;
        return o;
      },
      getCustomerOutstanding: async () => 0,
    };

    const mockCustomerRepo: ICustomerRepository = {
      list: async () => ({ customers, total: customers.length, page: 1, pageSize: 20, totalPages: 1 }),
      findById: async (id) => customers.find((c) => c.id === id) || null,
      findByCode: async (code) => customers.find((c) => c.ma_khach_hang === code) || null,
      create: async () => { throw new Error('not implemented'); },
      update: async () => null,
      updateStatus: async () => null,
      getSummary: async () => ({ totalOrders: 0, totalOrderValue: '0', unpaidInvoicesCount: 0, outstandingReceivable: '0', overdueReceivable: '0' }),
    };

    const mockProductRepo: IProductRepository = {
      list: async () => ({ products, total: products.length, page: 1, pageSize: 20, totalPages: 1 }),
      findById: async (id) => products.find((p) => p.id === id) || null,
      findByCode: async (code) => products.find((p) => p.ma_san_pham === code) || null,
    };

    const service = new OrderService(mockOrderRepo, mockCustomerRepo, mockProductRepo);
    const auth = createAuthMiddleware(mockUserRepo);
    const routes = createOrderRoutes(service, auth);

    const app = express();
    app.use(express.json());
    app.use('/api/v1/sales-orders', routes);
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

  it('GET /api/v1/sales-orders returns 401 without Bearer token', async () => {
    const res = await requestJson(`${baseUrl}/api/v1/sales-orders`, 'GET');
    assert.equal(res.status, 401);
  });

  it('GET /api/v1/sales-orders returns 200 with paginated envelope for sales role', async () => {
    const res = await requestJson(`${baseUrl}/api/v1/sales-orders`, 'GET', undefined, {
      Authorization: `Bearer ${tokenSales}`,
    });
    assert.equal(res.status, 200);
    const body = res.body as {
      success: boolean;
      data: OrderRecord[];
      meta: { total: number };
    };
    assert.equal(body.success, true);
    assert.equal(body.data.length, 1);
  });

  it('POST /api/v1/sales-orders creates new order atomically and returns 201', async () => {
    const res = await requestJson(
      `${baseUrl}/api/v1/sales-orders`,
      'POST',
      {
        ma_khach_hang: 1,
        ngay_dat_hang: '2026-09-11',
        ngay_giao_hang_yc: '2026-09-25',
        dia_chi_giao_hang: 'Hà Nội',
        lines: [{ ma_san_pham: 1, so_luong: 2, ty_le_giam_gia: 0 }],
      },
      { Authorization: `Bearer ${tokenSales}` }
    );

    assert.equal(res.status, 201);
    const body = res.body as { success: boolean; data: OrderRecord };
    assert.equal(body.success, true);
    assert.ok(body.data.ma_don_ban.startsWith('DBH-'));
  });

  it('POST /api/v1/sales-orders/:id/confirm confirms order', async () => {
    const res = await requestJson(
      `${baseUrl}/api/v1/sales-orders/1/confirm`,
      'POST',
      {},
      { Authorization: `Bearer ${tokenSales}` }
    );

    assert.equal(res.status, 200);
    const body = res.body as { success: boolean; data: OrderRecord };
    assert.equal(body.success, true);
    assert.equal(body.data.trang_thai, 'da_xac_nhan');
  });

  it('POST /api/v1/sales-orders/:id/cancel cancels order with reason', async () => {
    const res = await requestJson(
      `${baseUrl}/api/v1/sales-orders/1/cancel`,
      'POST',
      { ly_do: 'Hủy theo yêu cầu khách' },
      { Authorization: `Bearer ${tokenAdmin}` }
    );

    assert.equal(res.status, 200);
    const body = res.body as { success: boolean; data: OrderRecord };
    assert.equal(body.success, true);
    assert.equal(body.data.trang_thai, 'huy');
  });
});
