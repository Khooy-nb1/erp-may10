import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { DeliveryService } from './delivery.service.js';
import { IDeliveryRepository, DeliveryListResult } from '../repositories/delivery.repository.js';
import { DeliveryRecord, DeliveryListFilters, DeliveryStatus } from '../models/delivery.model.js';
import { AppError, NotFoundError } from '../utils/errors.js';

describe('DeliveryService Unit Tests', () => {
  let mockDeliveries: DeliveryRecord[];
  let repo: IDeliveryRepository;
  let service: DeliveryService;

  before(() => {
    mockDeliveries = [
      {
        id: 1,
        ma_giao_hang: 'GH-2026-000001',
        ma_don_ban_hang: 1,
        ma_kho: 1,
        ngay_giao: new Date('2026-09-15'),
        ten_nguoi_nhan: 'Nguyễn Văn Nhận',
        dia_chi_giao: 'Kho Sài Gòn',
        phuong_tien_van_chuyen: 'Xe tải',
        nguoi_giao_hang: 5,
        ghi_chu: null,
        trang_thai: 'cho_giao',
        ngay_tao: new Date(),
        ngay_cap_nhat: new Date(),
        nguoi_tao: 1,
        nguoi_cap_nhat: 1,
      },
    ];

    repo = {
      list: async (filters: DeliveryListFilters): Promise<DeliveryListResult> => ({
        deliveries: mockDeliveries,
        total: mockDeliveries.length,
        page: filters.page || 1,
        pageSize: filters.pageSize || 20,
        totalPages: 1,
      }),
      findById: async (id: number) => mockDeliveries.find((d) => d.id === id) || null,
      findByCode: async (code: string) => mockDeliveries.find((d) => d.ma_giao_hang === code) || null,
      create: async (params) => {
        const d: DeliveryRecord = {
          id: mockDeliveries.length + 1,
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
        mockDeliveries.push(d);
        return d;
      },
      updateStatus: async (id, status, updaterId, extra) => {
        const d = mockDeliveries.find((x) => x.id === id);
        if (!d) return null;
        d.trang_thai = status;
        d.nguoi_cap_nhat = updaterId;
        if (extra?.ghi_chu) d.ghi_chu = extra.ghi_chu;
        return d;
      },
      transitionStatus: async (id, expectedStatus, newStatus, updaterId, extra) => {
        const d = mockDeliveries.find((x) => x.id === id);
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

    service = new DeliveryService(repo);
  });

  it('createDelivery creates header with cho_giao status and unique code', async () => {
    const created = await service.createDelivery(
      {
        ma_don_ban_hang: 1,
        ma_kho: 1,
        ngay_giao: '2026-09-20',
        ten_nguoi_nhan: 'Trần Thủ Kho',
        dia_chi_giao: '100 An Dương Vương, Q.5, TP.HCM',
      },
      1
    );

    assert.ok(created.id);
    assert.ok(created.ma_giao_hang.startsWith('GH-'));
    assert.equal(created.trang_thai, 'cho_giao');
  });

  it('createDelivery rejects deliveredLines with DELIVERY_LINES_UNSUPPORTED per interim scope', async () => {
    await assert.rejects(
      async () => {
        await service.createDelivery(
          {
            ma_don_ban_hang: 1,
            ma_kho: 1,
            ngay_giao: '2026-09-20',
            ten_nguoi_nhan: 'Trần Thủ Kho',
            dia_chi_giao: 'Kho',
            deliveredLines: [{ ma_san_pham: 1, so_luong: 10 }], // Forbidden per Q11 interim rule
          },
          1
        );
      },
      (err: unknown) => {
        assert.ok(err instanceof AppError);
        assert.equal(err.code, 'DELIVERY_LINES_UNSUPPORTED');
        assert.equal(err.statusCode, 422);
        return true;
      }
    );
  });

  it('createDelivery rejects cancelled order with ORDER_INVALID_STATE (422)', async () => {
    await assert.rejects(
      async () => {
        await service.createDelivery(
          {
            ma_don_ban_hang: 99, // Cancelled order
            ma_kho: 1,
            ngay_giao: '2026-09-20',
            ten_nguoi_nhan: 'Người Nhận',
            dia_chi_giao: 'Kho',
          },
          1
        );
      },
      (err: unknown) => {
        assert.ok(err instanceof AppError);
        assert.equal(err.code, 'ORDER_INVALID_STATE');
        return true;
      }
    );
  });

  it('createDelivery rejects inactive warehouse with WAREHOUSE_NOT_FOUND (404)', async () => {
    await assert.rejects(
      async () => {
        await service.createDelivery(
          {
            ma_don_ban_hang: 1,
            ma_kho: 999, // Non-existent warehouse
            ngay_giao: '2026-09-20',
            ten_nguoi_nhan: 'Người Nhận',
            dia_chi_giao: 'Kho',
          },
          1
        );
      },
      (err: unknown) => {
        assert.ok(err instanceof NotFoundError);
        assert.equal(err.code, 'WAREHOUSE_NOT_FOUND');
        return true;
      }
    );
  });

  it('startDelivery transitions cho_giao to dang_giao', async () => {
    const started = await service.startDelivery(1, 1);
    assert.equal(started.trang_thai, 'dang_giao');
  });

  it('completeDelivery rejects completing from cho_giao directly', async () => {
    // Create new delivery in cho_giao
    const created = await service.createDelivery(
      {
        ma_don_ban_hang: 1,
        ma_kho: 1,
        ngay_giao: '2026-09-21',
        ten_nguoi_nhan: 'Người Nhận',
        dia_chi_giao: 'Kho',
      },
      1
    );

    await assert.rejects(
      async () => {
        await service.completeDelivery(created.id, 1);
      },
      (err: unknown) => {
        assert.ok(err instanceof AppError);
        assert.equal(err.code, 'DELIVERY_INVALID_STATE');
        return true;
      }
    );
  });

  it('completeDelivery transitions dang_giao to da_giao', async () => {
    const completed = await service.completeDelivery(1, 1);
    assert.equal(completed.trang_thai, 'da_giao');
  });

  it('completeDelivery rejects completing an already completed delivery with 409', async () => {
    await assert.rejects(
      async () => {
        await service.completeDelivery(1, 1);
      },
      (err: unknown) => {
        assert.ok(err instanceof AppError);
        assert.equal(err.code, 'DELIVERY_INVALID_STATE');
        assert.equal(err.statusCode, 409);
        return true;
      }
    );
  });

  it('failDelivery marks delivery as that_bai and stores failure reason', async () => {
    // 1. Create and start delivery
    const d = await service.createDelivery(
      {
        ma_don_ban_hang: 1,
        ma_kho: 1,
        ngay_giao: '2026-09-22',
        ten_nguoi_nhan: 'Người Nhận',
        dia_chi_giao: 'Kho',
      },
      1
    );
    await service.startDelivery(d.id, 1);

    // 2. Fail delivery
    const failed = await service.failDelivery(d.id, { ly_do: 'Khách hàng không có mặt tại địa chỉ' }, 1);
    assert.equal(failed.trang_thai, 'that_bai');
    assert.ok(failed.ghi_chu?.includes('[THẤT BẠI: Khách hàng không có mặt tại địa chỉ]'));
  });
});
