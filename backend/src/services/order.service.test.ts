import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { OrderService } from './order.service.js';
import { IOrderRepository, OrderListResult } from '../repositories/order.repository.js';
import { ICustomerRepository } from '../repositories/customer.repository.js';
import { IProductRepository } from '../repositories/product.repository.js';
import { OrderRecord, OrderListFilters, OrderStatus } from '../models/order.model.js';
import { CustomerRecord } from '../models/customer.model.js';
import { ProductRecord } from '../models/product.model.js';
import { AppError, ValidationError, NotFoundError, ForbiddenError } from '../utils/errors.js';

describe('OrderService Unit Tests', () => {
  let mockOrders: OrderRecord[];
  let mockCustomers: CustomerRecord[];
  let mockProducts: ProductRecord[];

  let orderRepo: IOrderRepository;
  let customerRepo: ICustomerRepository;
  let productRepo: IProductRepository;
  let service: OrderService;

  before(() => {
    mockOrders = [
      {
        id: 1,
        ma_don_ban: 'DBH-2026-000001',
        ma_khach_hang: 1,
        ngay_dat_hang: new Date('2026-09-01'),
        ngay_giao_hang_yc: new Date('2026-09-10'),
        ngay_giao_thuc_te: null,
        dia_chi_giao_hang: '123 Phố Huế, Hà Nội',
        tong_tien_hang: 4500000,
        tien_thue: 0,
        tien_giam_gia: 0,
        tong_thanh_toan: 4500000,
        nguoi_ban: 1,
        trang_thai: 'cho_xac_nhan',
        ghi_chu: 'Đơn hàng thử nghiệm',
        ngay_tao: new Date(),
        ngay_cap_nhat: new Date(),
        nguoi_tao: 1,
        nguoi_cap_nhat: 1,
        lines: [
          {
            id: 1,
            ma_don_ban_hang: 1,
            ma_san_pham: 1,
            so_luong: 10,
            don_gia: 450000,
            ty_le_giam_gia: 0,
            thanh_tien: 4500000,
            so_luong_giao: 0,
            ghi_chu: null,
            trang_thai: 'chua_giao',
          },
        ],
      },
    ];

    mockCustomers = [
      {
        id: 1,
        ma_khach_hang: 'KH-001',
        ten_khach_hang: 'Khách Hoạt Động',
        loai_khach_hang: 'to_chuc',
        ma_so_thue: null,
        so_dien_thoai: '0243123456',
        email: null,
        dia_chi: 'Hà Nội',
        tinh_thanh_pho: 'Hà Nội',
        nguoi_lien_he: null,
        han_muc_cong_no: 10000000, // 10 million limit
        so_ngay_cong_no: 30,
        ghi_chu: null,
        trang_thai: 'hoat_dong',
        ngay_tao: new Date(),
        ngay_cap_nhat: new Date(),
        nguoi_tao: 1,
        nguoi_cap_nhat: 1,
      },
      {
        id: 2,
        ma_khach_hang: 'KH-002',
        ten_khach_hang: 'Khách Bị Khóa',
        loai_khach_hang: 'to_chuc',
        ma_so_thue: null,
        so_dien_thoai: '0243654321',
        email: null,
        dia_chi: 'Hà Nội',
        tinh_thanh_pho: 'Hà Nội',
        nguoi_lien_he: null,
        han_muc_cong_no: 10000000,
        so_ngay_cong_no: 30,
        ghi_chu: null,
        trang_thai: 'tam_khoa',
        ngay_tao: new Date(),
        ngay_cap_nhat: new Date(),
        nguoi_tao: 1,
        nguoi_cap_nhat: 1,
      },
    ];

    mockProducts = [
      {
        id: 1,
        ma_san_pham: 'SP-001',
        ten_san_pham: 'Áo Sơ Mi Nam Trắng',
        mo_ta: null,
        ma_don_vi_tinh: 1,
        gia_ban: 450000,
        size: 'L',
        mau_sac: 'Trắng',
        trang_thai: 'dang_ban',
      },
      {
        id: 2,
        ma_san_pham: 'SP-002',
        ten_san_pham: 'Áo Ngừng Bán',
        mo_ta: null,
        ma_don_vi_tinh: 1,
        gia_ban: 500000,
        size: 'XL',
        mau_sac: 'Đen',
        trang_thai: 'ngung_ban',
      },
    ];

    orderRepo = {
      list: async (filters: OrderListFilters): Promise<OrderListResult> => ({
        orders: mockOrders,
        total: mockOrders.length,
        page: filters.page || 1,
        pageSize: filters.pageSize || 20,
        totalPages: 1,
      }),
      findById: async (id: number) => mockOrders.find((o) => o.id === id) || null,
      findByCode: async (code: string) => mockOrders.find((o) => o.ma_don_ban === code) || null,
      create: async (params) => {
        const order: OrderRecord = {
          id: mockOrders.length + 1,
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
            ma_don_ban_hang: mockOrders.length + 1,
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
        mockOrders.push(order);
        return order;
      },
      update: async (id, headerUpdates, lines, updaterId) => {
        const o = mockOrders.find((x) => x.id === id);
        if (!o) return null;
        Object.assign(o, headerUpdates, { nguoi_cap_nhat: updaterId });
        if (lines) {
          o.lines = lines.map((l, idx) => ({
            id: idx + 1,
            ma_don_ban_hang: id,
            ma_san_pham: l.ma_san_pham,
            so_luong: l.so_luong,
            don_gia: l.don_gia,
            ty_le_giam_gia: l.ty_le_giam_gia,
            thanh_tien: l.thanh_tien,
            so_luong_giao: 0,
            ghi_chu: l.ghi_chu || null,
            trang_thai: 'chua_giao',
          }));
        }
        return o;
      },
      updateStatus: async (id, status, updaterId, extra) => {
        const o = mockOrders.find((x) => x.id === id);
        if (!o) return null;
        o.trang_thai = status;
        o.nguoi_cap_nhat = updaterId;
        if (extra?.ghi_chu) o.ghi_chu = extra.ghi_chu;
        return o;
      },
      getCustomerOutstanding: async (customerId) => (customerId === 1 ? 2000000 : 0),
    };

    customerRepo = {
      list: async () => ({ customers: mockCustomers, total: mockCustomers.length, page: 1, pageSize: 20, totalPages: 1 }),
      findById: async (id) => mockCustomers.find((c) => c.id === id) || null,
      findByCode: async (code) => mockCustomers.find((c) => c.ma_khach_hang === code) || null,
      create: async () => { throw new Error('not implemented'); },
      update: async () => null,
      updateStatus: async () => null,
      getSummary: async () => ({ totalOrders: 0, totalOrderValue: '0', unpaidInvoicesCount: 0, outstandingReceivable: '0', overdueReceivable: '0' }),
    };

    productRepo = {
      list: async () => ({ products: mockProducts, total: mockProducts.length, page: 1, pageSize: 20, totalPages: 1 }),
      findById: async (id) => mockProducts.find((p) => p.id === id) || null,
      findByCode: async (code) => mockProducts.find((p) => p.ma_san_pham === code) || null,
    };

    service = new OrderService(orderRepo, customerRepo, productRepo);
  });

  it('createOrder calculates server-authoritative totals and commits atomically', async () => {
    const created = await service.createOrder(
      {
        ma_khach_hang: 1,
        ngay_dat_hang: '2026-09-11',
        ngay_giao_hang_yc: '2026-09-20',
        dia_chi_giao_hang: 'Kho Hà Nội',
        lines: [
          {
            ma_san_pham: 1,
            so_luong: 2,
            ty_le_giam_gia: 10,
          },
        ],
      },
      1
    );

    assert.ok(created.id);
    assert.ok(created.ma_don_ban.startsWith('DBH-'));
    assert.equal(created.trang_thai, 'cho_xac_nhan');
    // 2 * 450,000 = 900,000. Discount 10% = 90,000. Net = 810,000
    assert.equal(created.tong_tien_hang, 900000);
    assert.equal(created.tien_giam_gia, 90000);
    assert.equal(created.tong_thanh_toan, 810000);
  });

  it('createOrder rejects inactive customer with CUSTOMER_INACTIVE (422)', async () => {
    await assert.rejects(
      async () => {
        await service.createOrder(
          {
            ma_khach_hang: 2, // Customer is tam_khoa
            ngay_dat_hang: '2026-09-11',
            ngay_giao_hang_yc: '2026-09-20',
            dia_chi_giao_hang: 'Kho',
            lines: [{ ma_san_pham: 1, so_luong: 1 }],
          },
          1
        );
      },
      (err: unknown) => {
        assert.ok(err instanceof AppError);
        assert.equal(err.code, 'CUSTOMER_INACTIVE');
        assert.equal(err.statusCode, 422);
        return true;
      }
    );
  });

  it('createOrder rejects discontinued product with PRODUCT_NOT_SELLABLE (422)', async () => {
    await assert.rejects(
      async () => {
        await service.createOrder(
          {
            ma_khach_hang: 1,
            ngay_dat_hang: '2026-09-11',
            ngay_giao_hang_yc: '2026-09-20',
            dia_chi_giao_hang: 'Kho',
            lines: [{ ma_san_pham: 2, so_luong: 1 }], // Product is ngung_ban
          },
          1
        );
      },
      (err: unknown) => {
        assert.ok(err instanceof AppError);
        assert.equal(err.code, 'PRODUCT_NOT_SELLABLE');
        assert.equal(err.statusCode, 422);
        return true;
      }
    );
  });

  it('createOrder throws ValidationError when delivery date is before order date', async () => {
    await assert.rejects(
      async () => {
        await service.createOrder(
          {
            ma_khach_hang: 1,
            ngay_dat_hang: '2026-09-25',
            ngay_giao_hang_yc: '2026-09-20', // Invalid: delivery before order date
            dia_chi_giao_hang: 'Kho',
            lines: [{ ma_san_pham: 1, so_luong: 1 }],
          },
          1
        );
      },
      (err: unknown) => {
        assert.ok(err instanceof ValidationError);
        assert.equal(err.code, 'VALIDATION_ERROR');
        return true;
      }
    );
  });

  it('updateOrder recalculates totals for pending order (cho_xac_nhan)', async () => {
    const updated = await service.updateOrder(
      1,
      {
        lines: [{ ma_san_pham: 1, so_luong: 4, ty_le_giam_gia: 0 }],
      },
      1
    );

    assert.equal(updated.tong_tien_hang, 1800000);
    assert.equal(updated.tong_thanh_toan, 1800000);
  });

  it('confirmOrder transitions status to da_xac_nhan', async () => {
    const confirmed = await service.confirmOrder(1, {}, 1);
    assert.equal(confirmed.trang_thai, 'da_xac_nhan');
  });

  it('cancelOrder blocks non-admin cancellation on confirmed order', async () => {
    await assert.rejects(
      async () => {
        await service.cancelOrder(1, { ly_do: 'Muốn hủy' }, 1, 'ban_hang');
      },
      (err: unknown) => {
        assert.ok(err instanceof ForbiddenError);
        return true;
      }
    );
  });

  it('cancelOrder succeeds for admin on confirmed order, recording reason in notes', async () => {
    const cancelled = await service.cancelOrder(1, { ly_do: 'Khách hàng thay đổi kế hoạch kinh doanh' }, 1, 'admin');
    assert.equal(cancelled.trang_thai, 'huy');
    assert.ok(cancelled.ghi_chu?.includes('[HỦY ĐƠN: Khách hàng thay đổi kế hoạch kinh doanh]'));
  });
});
