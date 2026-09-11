import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import express from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { createDeliveryRoutes } from './delivery.routes.js';
import { DeliveryService } from '../services/delivery.service.js';
import { IDeliveryRepository } from '../repositories/delivery.repository.js';
import { DeliveryRecord, DeliveryListFilters, DeliveryStatus } from '../models/delivery.model.js';
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

describe('Delivery Routes HTTP Integration & RBAC', () => {
  let server: http.Server;
  let baseUrl: string;

  let tokenWarehouse: string;
  let tokenSales: string;
  let tokenAccounting: string;
  let tokenAdmin: string;

  before(async () => {
    const users: UserRecord[] = [
      { id: 1, ho_ten: 'Thủ Kho', email: 'kho@example.com', mat_khau: 'h', so_dien_thoai: null, vai_tro: 'kho', phong_ban: null, trang_thai: 'hoat_dong' },
      { id: 2, ho_ten: 'Bán Hàng', email: 'sales@example.com', mat_khau: 'h', so_dien_thoai: null, vai_tro: 'ban_hang', phong_ban: null, trang_thai: 'hoat_dong' },
      { id: 3, ho_ten: 'Kế Toán', email: 'ketoan@example.com', mat_khau: 'h', so_dien_thoai: null, vai_tro: 'ke_toan', phong_ban: null, trang_thai: 'hoat_dong' },
      { id: 4, ho_ten: 'Admin', email: 'admin@example.com', mat_khau: 'h', so_dien_thoai: null, vai_tro: 'admin', phong_ban: null, trang_thai: 'hoat_dong' },
    ];

    const mockUserRepo: IUserRepository = {
      findByEmail: async (email) => users.find((u) => u.email === email) || null,
      findById: async (id) => users.find((u) => u.id === id) || null,
    };

    tokenWarehouse = jwt.sign({ id: 1, email: 'kho@example.com', vai_tro: 'kho' }, env.JWT_SECRET);
    tokenSales = jwt.sign({ id: 2, email: 'sales@example.com', vai_tro: 'ban_hang' }, env.JWT_SECRET);
    tokenAccounting = jwt.sign({ id: 3, email: 'ketoan@example.com', vai_tro: 'ke_toan' }, env.JWT_SECRET);
    tokenAdmin = jwt.sign({ id: 4, email: 'admin@example.com', vai_tro: 'admin' }, env.JWT_SECRET);

    const deliveries: DeliveryRecord[] = [
      {
        id: 1,
        ma_giao_hang: 'GH-2026-000001',
        ma_don_ban_hang: 1,
        ma_don_ban: 'DBH-2026-000001',
        ten_khach_hang: 'Khách A',
        ma_kho: 1,
        ten_kho: 'Kho Thành Phẩm',
        ngay_giao: new Date('2026-09-15'),
        ten_nguoi_nhan: 'Trần Văn Nhận',
        dia_chi_giao: 'Hà Nội',
        phuong_tien_van_chuyen: 'Xe tải',
        nguoi_giao_hang: 1,
        ten_nguoi_giao: 'Thủ Kho',
        ghi_chu: null,
        trang_thai: 'cho_giao',
        ngay_tao: new Date(),
        ngay_cap_nhat: new Date(),
        nguoi_tao: 1,
        nguoi_cap_nhat: 1,
      },
    ];

    const mockDeliveryRepo: IDeliveryRepository = {
      list: async (_filters: DeliveryListFilters) => ({
        deliveries,
        total: deliveries.length,
        page: 1,
        pageSize: 20,
        totalPages: 1,
      }),
      findById: async (id: number) => deliveries.find((d) => d.id === id) || null,
      findByCode: async (code: string) => deliveries.find((d) => d.ma_giao_hang === code) || null,
      create: async (params) => {
        const d: DeliveryRecord = {
          id: deliveries.length + 1,
          ma_giao_hang: params.ma_giao_hang,
          ma_don_ban_hang: params.ma_don_ban_hang,
          ma_kho: params.ma_kho,
          ngay_giao: params.ngay_giao,
          ten_nguoi_nhan: params.ten_nguoi_nhan,
          dia_chi_giao: params.dia_chi_giao,
          phuong_tien_van_chuyen: params.phuong_tien_van_chuyen,
          nguoi_giao_hang: params.nguoi_giao_hang,
          ghi_chu: params.ghi_chu,
          trang_thai: 'cho_giao',
          ngay_tao: new Date(),
          ngay_cap_nhat: new Date(),
          nguoi_tao: params.creatorId,
          nguoi_cap_nhat: params.creatorId,
        };
        deliveries.push(d);
        return d;
      },
      updateStatus: async (id, status, updaterId, extra) => {
        const d = deliveries.find((x) => x.id === id);
        if (!d) return null;
        d.trang_thai = status;
        d.nguoi_cap_nhat = updaterId;
        if (extra?.ghi_chu) d.ghi_chu = extra.ghi_chu;
        return d;
      },
      transitionStatus: async (id, expectedStatus, newStatus, updaterId, extra) => {
        const d = deliveries.find((x) => x.id === id);
        if (!d) return { success: false, currentRecord: null };
        if (d.trang_thai !== expectedStatus) return { success: false, currentRecord: d };
        d.trang_thai = newStatus;
        d.nguoi_cap_nhat = updaterId;
        if (extra?.ghi_chu) d.ghi_chu = extra.ghi_chu;
        return { success: true, currentRecord: d };
      },
      checkWarehouseActive: async (wid) => wid === 1,
      checkOrderForDelivery: async (oid) => {
        if (oid === 1) return { id: 1, trang_thai: 'da_xac_nhan', dia_chi_giao_hang: 'Hà Nội' };
        if (oid === 99) return { id: 99, trang_thai: 'huy', dia_chi_giao_hang: 'Hà Nội' };
        return null;
      },
    };

    const service = new DeliveryService(mockDeliveryRepo);
    const auth = createAuthMiddleware(mockUserRepo);
    const routes = createDeliveryRoutes(service, auth);

    const app = express();
    app.use(express.json());
    app.use('/api/v1/deliveries', routes);
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

  it('GET /api/v1/deliveries returns 401 without Bearer token', async () => {
    const res = await requestJson(`${baseUrl}/api/v1/deliveries`, 'GET');
    assert.equal(res.status, 401);
  });

  it('GET /api/v1/deliveries returns 403 Forbidden for accounting role (ke_toan)', async () => {
    const res = await requestJson(`${baseUrl}/api/v1/deliveries`, 'GET', undefined, {
      Authorization: `Bearer ${tokenAccounting}`,
    });
    assert.equal(res.status, 403);
    const body = res.body as { error: { code: string } };
    assert.equal(body.error.code, 'AUTH_FORBIDDEN');
  });

  it('GET /api/v1/deliveries returns 200 with paginated envelope for warehouse role (kho)', async () => {
    const res = await requestJson(`${baseUrl}/api/v1/deliveries`, 'GET', undefined, {
      Authorization: `Bearer ${tokenWarehouse}`,
    });
    assert.equal(res.status, 200);
    const body = res.body as {
      success: boolean;
      data: DeliveryRecord[];
      meta: { total: number };
    };
    assert.equal(body.success, true);
    assert.equal(body.data.length, 1);
  });

  it('POST /api/v1/deliveries rejects deliveredLines with 422 per interim scope', async () => {
    const res = await requestJson(
      `${baseUrl}/api/v1/deliveries`,
      'POST',
      {
        ma_don_ban_hang: 1,
        ma_kho: 1,
        ngay_giao: '2026-09-15',
        ten_nguoi_nhan: 'Người Nhận',
        dia_chi_giao: 'Hà Nội',
        deliveredLines: [{ ma_san_pham: 1, so_luong: 10 }],
      },
      { Authorization: `Bearer ${tokenWarehouse}` }
    );

    assert.equal(res.status, 422);
    const body = res.body as { error: { code: string } };
    assert.equal(body.error.code, 'DELIVERY_LINES_UNSUPPORTED');
  });

  it('POST /api/v1/deliveries creates header and returns 201 for kho and ban_hang', async () => {
    const res = await requestJson(
      `${baseUrl}/api/v1/deliveries`,
      'POST',
      {
        ma_don_ban_hang: 1,
        ma_kho: 1,
        ngay_giao: '2026-09-18',
        ten_nguoi_nhan: 'Trần Văn B',
        dia_chi_giao: 'Địa chỉ giao hàng',
      },
      { Authorization: `Bearer ${tokenSales}` }
    );

    assert.equal(res.status, 201);
    const body = res.body as { success: boolean; data: DeliveryRecord };
    assert.equal(body.success, true);
    assert.ok(body.data.ma_giao_hang.startsWith('GH-'));
    assert.equal(body.data.trang_thai, 'cho_giao');
  });

  it('POST /api/v1/deliveries/:id/start rejects sales role (ban_hang) with 403 Forbidden', async () => {
    const res = await requestJson(
      `${baseUrl}/api/v1/deliveries/1/start`,
      'POST',
      {},
      { Authorization: `Bearer ${tokenSales}` }
    );

    assert.equal(res.status, 403);
    const body = res.body as { error: { code: string } };
    assert.equal(body.error.code, 'AUTH_FORBIDDEN');
  });

  it('POST /api/v1/deliveries/:id/start succeeds for warehouse role (kho)', async () => {
    const res = await requestJson(
      `${baseUrl}/api/v1/deliveries/1/start`,
      'POST',
      {},
      { Authorization: `Bearer ${tokenWarehouse}` }
    );

    assert.equal(res.status, 200);
    const body = res.body as { success: boolean; data: DeliveryRecord };
    assert.equal(body.success, true);
    assert.equal(body.data.trang_thai, 'dang_giao');
  });

  it('POST /api/v1/deliveries/:id/complete succeeds for warehouse role without mutating inventory', async () => {
    const res = await requestJson(
      `${baseUrl}/api/v1/deliveries/1/complete`,
      'POST',
      {},
      { Authorization: `Bearer ${tokenWarehouse}` }
    );

    assert.equal(res.status, 200);
    const body = res.body as { success: boolean; data: DeliveryRecord };
    assert.equal(body.success, true);
    assert.equal(body.data.trang_thai, 'da_giao');
  });

  it('POST /api/v1/deliveries/:id/complete rejects completing twice with 409 Conflict', async () => {
    const res = await requestJson(
      `${baseUrl}/api/v1/deliveries/1/complete`,
      'POST',
      {},
      { Authorization: `Bearer ${tokenWarehouse}` }
    );

    assert.equal(res.status, 409);
    const body = res.body as { error: { code: string } };
    assert.equal(body.error.code, 'DELIVERY_INVALID_STATE');
  });

  it('POST /api/v1/deliveries accepts contract-level camelCase payload', async () => {
    const res = await requestJson(
      `${baseUrl}/api/v1/deliveries`,
      'POST',
      {
        orderId: 1,
        warehouseId: 1,
        deliveryDate: '2026-09-18',
        receiverName: 'Nguyễn Văn CamelCase',
        deliveryAddress: 'Hải Phòng',
      },
      { Authorization: `Bearer ${tokenWarehouse}` }
    );

    assert.equal(res.status, 201);
    const body = res.body as { success: boolean; data: DeliveryRecord };
    assert.equal(body.success, true);
    assert.equal(body.data.ten_nguoi_nhan, 'Nguyễn Văn CamelCase');
    assert.equal(body.data.dia_chi_giao, 'Hải Phòng');
  });

  it('POST /api/v1/deliveries rejects invalid date format with 422 VALIDATION_ERROR', async () => {
    const res = await requestJson(
      `${baseUrl}/api/v1/deliveries`,
      'POST',
      {
        orderId: 1,
        warehouseId: 1,
        deliveryDate: 'not-a-valid-date',
        receiverName: 'Người Nhận',
        deliveryAddress: 'Hà Nội',
      },
      { Authorization: `Bearer ${tokenWarehouse}` }
    );

    assert.equal(res.status, 422);
    const body = res.body as { error: { code: string } };
    assert.equal(body.error.code, 'VALIDATION_ERROR');
  });

  it('POST /api/v1/deliveries rejects disallowed cancelled order with 422 ORDER_INVALID_STATE', async () => {
    const res = await requestJson(
      `${baseUrl}/api/v1/deliveries`,
      'POST',
      {
        orderId: 99, // Cancelled order
        warehouseId: 1,
        deliveryDate: '2026-09-18',
        receiverName: 'Người Nhận',
        deliveryAddress: 'Hà Nội',
      },
      { Authorization: `Bearer ${tokenWarehouse}` }
    );

    assert.equal(res.status, 422);
    const body = res.body as { error: { code: string } };
    assert.equal(body.error.code, 'ORDER_INVALID_STATE');
  });

  it('POST /api/v1/deliveries/:id/fail rejects sales role (ban_hang) with 403 Forbidden', async () => {
    const res = await requestJson(
      `${baseUrl}/api/v1/deliveries/1/fail`,
      'POST',
      { reason: 'Khách đổi ý' },
      { Authorization: `Bearer ${tokenSales}` }
    );

    assert.equal(res.status, 403);
    const body = res.body as { error: { code: string } };
    assert.equal(body.error.code, 'AUTH_FORBIDDEN');
  });

  it('POST /api/v1/deliveries/:id/fail rejects missing reason with 422 VALIDATION_ERROR', async () => {
    // 1. Create and start fresh delivery to reach dang_giao state
    const createRes = await requestJson(
      `${baseUrl}/api/v1/deliveries`,
      'POST',
      {
        orderId: 1,
        warehouseId: 1,
        deliveryDate: '2026-09-19',
        receiverName: 'Người Nhận Thiếu Lý Do',
        deliveryAddress: 'Hà Nội',
      },
      { Authorization: `Bearer ${tokenWarehouse}` }
    );
    const testId = (createRes.body as { data: { id: number } }).data.id;

    await requestJson(
      `${baseUrl}/api/v1/deliveries/${testId}/start`,
      'POST',
      {},
      { Authorization: `Bearer ${tokenWarehouse}` }
    );

    // 2. Attempt to fail without reason
    const res = await requestJson(
      `${baseUrl}/api/v1/deliveries/${testId}/fail`,
      'POST',
      {},
      { Authorization: `Bearer ${tokenWarehouse}` }
    );

    assert.equal(res.status, 422);
    const body = res.body as { error: { code: string } };
    assert.equal(body.error.code, 'VALIDATION_ERROR');
  });

  it('POST /api/v1/deliveries/:id/fail marks delivery as that_bai with reason', async () => {
    // 1. Create and start delivery
    const createRes = await requestJson(
      `${baseUrl}/api/v1/deliveries`,
      'POST',
      {
        orderId: 1,
        warehouseId: 1,
        deliveryDate: '2026-09-19',
        receiverName: 'Người Thất Bại',
        deliveryAddress: 'Đà Nẵng',
      },
      { Authorization: `Bearer ${tokenWarehouse}` }
    );
    const newId = (createRes.body as { data: { id: number } }).data.id;

    await requestJson(
      `${baseUrl}/api/v1/deliveries/${newId}/start`,
      'POST',
      {},
      { Authorization: `Bearer ${tokenWarehouse}` }
    );

    // 2. Fail delivery with reason
    const failRes = await requestJson(
      `${baseUrl}/api/v1/deliveries/${newId}/fail`,
      'POST',
      { reason: 'Khách hàng dời lịch hẹn sang tuần sau' },
      { Authorization: `Bearer ${tokenWarehouse}` }
    );

    assert.equal(failRes.status, 200);
    const body = failRes.body as { success: boolean; data: DeliveryRecord };
    assert.equal(body.success, true);
    assert.equal(body.data.trang_thai, 'that_bai');
    assert.ok(body.data.ghi_chu?.includes('Khách hàng dời lịch hẹn sang tuần sau'));
  });
});
