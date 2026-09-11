import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { CustomerService } from './customer.service.js';
import { ICustomerRepository, CustomerListResult } from '../repositories/customer.repository.js';
import { CustomerRecord, CustomerSummary, CustomerListFilters, CustomerStatus } from '../models/customer.model.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';

describe('CustomerService Unit Tests', () => {
  let mockCustomers: CustomerRecord[];
  let mockRepo: ICustomerRepository;
  let service: CustomerService;

  before(() => {
    mockCustomers = [
      {
        id: 1,
        ma_khach_hang: 'KH-2026-000001',
        ten_khach_hang: 'Công ty May An Phát',
        loai_khach_hang: 'to_chuc',
        ma_so_thue: '0101234567',
        so_dien_thoai: '0243123456',
        email: 'contact@anphat.vn',
        dia_chi: '123 Phố Huế, Hai Bà Trưng',
        tinh_thanh_pho: 'Hà Nội',
        nguoi_lien_he: 'Nguyễn Văn An',
        han_muc_cong_no: 500000000,
        so_ngay_cong_no: 30,
        ghi_chu: 'Khách hàng may mặc truyền thống',
        trang_thai: 'hoat_dong',
        ngay_tao: new Date(),
        ngay_cap_nhat: new Date(),
        nguoi_tao: 1,
        nguoi_cap_nhat: 1,
      },
      {
        id: 2,
        ma_khach_hang: 'KH-2026-000002',
        ten_khach_hang: 'Đại lý Thời trang Miền Bắc',
        loai_khach_hang: 'dai_ly',
        ma_so_thue: '0107654321',
        so_dien_thoai: '0243987654',
        email: 'sales@thoitrangmb.vn',
        dia_chi: '45 Tràng Thi, Hoàn Kiếm',
        tinh_thanh_pho: 'Hà Nội',
        nguoi_lien_he: 'Trần Thị Bắc',
        han_muc_cong_no: 200000000,
        so_ngay_cong_no: 15,
        ghi_chu: null,
        trang_thai: 'tam_khoa',
        ngay_tao: new Date(),
        ngay_cap_nhat: new Date(),
        nguoi_tao: 1,
        nguoi_cap_nhat: 1,
      },
    ];

    mockRepo = {
      list: async (filters: CustomerListFilters): Promise<CustomerListResult> => {
        let list = [...mockCustomers];
        if (filters.search) {
          const q = filters.search.toLowerCase();
          list = list.filter(
            (c) =>
              c.ma_khach_hang.toLowerCase().includes(q) ||
              c.ten_khach_hang.toLowerCase().includes(q) ||
              c.so_dien_thoai.includes(q)
          );
        }
        if (filters.loai_khach_hang) {
          list = list.filter((c) => c.loai_khach_hang === filters.loai_khach_hang);
        }
        if (filters.trang_thai) {
          list = list.filter((c) => c.trang_thai === filters.trang_thai);
        }
        return {
          customers: list,
          total: list.length,
          page: filters.page || 1,
          pageSize: filters.pageSize || 20,
          totalPages: 1,
        };
      },
      findById: async (id: number) => mockCustomers.find((c) => c.id === id) || null,
      findByCode: async (code: string) => mockCustomers.find((c) => c.ma_khach_hang === code) || null,
      create: async (data): Promise<CustomerRecord> => {
        const created: CustomerRecord = {
          ...data,
          id: mockCustomers.length + 1,
          ngay_tao: new Date(),
          ngay_cap_nhat: new Date(),
        };
        mockCustomers.push(created);
        return created;
      },
      update: async (id: number, data: Partial<CustomerRecord>, updaterId: number): Promise<CustomerRecord | null> => {
        const idx = mockCustomers.findIndex((c) => c.id === id);
        if (idx === -1) return null;
        mockCustomers[idx] = {
          ...mockCustomers[idx],
          ...data,
          nguoi_cap_nhat: updaterId,
          ngay_cap_nhat: new Date(),
        };
        return mockCustomers[idx];
      },
      updateStatus: async (id: number, status: CustomerStatus, updaterId: number): Promise<CustomerRecord | null> => {
        const idx = mockCustomers.findIndex((c) => c.id === id);
        if (idx === -1) return null;
        mockCustomers[idx] = {
          ...mockCustomers[idx],
          trang_thai: status,
          nguoi_cap_nhat: updaterId,
          ngay_cap_nhat: new Date(),
        };
        return mockCustomers[idx];
      },
      getSummary: async (id: number): Promise<CustomerSummary> => {
        return {
          totalOrders: id === 1 ? 5 : 0,
          totalOrderValue: id === 1 ? '1250000000.00' : '0.00',
          unpaidInvoicesCount: id === 1 ? 1 : 0,
          outstandingReceivable: id === 1 ? '150000000.00' : '0.00',
          overdueReceivable: '0.00',
        };
      },
    };

    service = new CustomerService(mockRepo);
  });

  it('listCustomers returns paginated list with total metadata', async () => {
    const result = await service.listCustomers({ page: 1, pageSize: 10 });
    assert.equal(result.total, 2);
    assert.equal(result.customers.length, 2);
    assert.equal(result.page, 1);
    assert.equal(result.pageSize, 10);
  });

  it('listCustomers filters by status correctly', async () => {
    const result = await service.listCustomers({ trang_thai: 'tam_khoa' });
    assert.equal(result.total, 1);
    assert.equal(result.customers[0].ma_khach_hang, 'KH-2026-000002');
  });

  it('createCustomer generates code, sets hoat_dong and records creator audit', async () => {
    const created = await service.createCustomer(
      {
        ten_khach_hang: 'Công ty Cổ phần May Xuất Khẩu Sài Gòn',
        loai_khach_hang: 'xuat_khau',
        so_dien_thoai: '0283899999',
        dia_chi: '789 Xa lộ Hà Nội, TP. Thủ Đức',
        tinh_thanh_pho: 'TP. Hồ Chí Minh',
        han_muc_cong_no: 1000000000,
        so_ngay_cong_no: 45,
      },
      99
    );

    assert.ok(created.id);
    assert.ok(created.ma_khach_hang.startsWith('KH-'));
    assert.equal(created.trang_thai, 'hoat_dong');
    assert.equal(created.nguoi_tao, 99);
  });

  it('createCustomer throws ValidationError on missing required fields or negative credit', async () => {
    await assert.rejects(
      async () => {
        await service.createCustomer(
          {
            ten_khach_hang: '',
            loai_khach_hang: 'ca_nhan',
            so_dien_thoai: '123',
            dia_chi: '',
            tinh_thanh_pho: '',
            han_muc_cong_no: -500,
          },
          1
        );
      },
      (err: unknown) => {
        assert.ok(err instanceof ValidationError);
        assert.equal(err.code, 'VALIDATION_ERROR');
        assert.equal(err.statusCode, 422);
        return true;
      }
    );
  });

  it('getCustomerById throws NotFoundError for non-existent customer', async () => {
    await assert.rejects(
      async () => {
        await service.getCustomerById(9999);
      },
      (err: unknown) => {
        assert.ok(err instanceof NotFoundError);
        assert.equal(err.code, 'CUSTOMER_NOT_FOUND');
        assert.equal(err.statusCode, 404);
        return true;
      }
    );
  });

  it('updateCustomer updates whitelisted fields and sets updater audit', async () => {
    const updated = await service.updateCustomer(
      1,
      {
        ten_khach_hang: 'Công ty May An Phát (Cập nhật)',
        so_dien_thoai: '0243999888',
      },
      42
    );

    assert.equal(updated.ten_khach_hang, 'Công ty May An Phát (Cập nhật)');
    assert.equal(updated.so_dien_thoai, '0243999888');
    assert.equal(updated.nguoi_cap_nhat, 42);
    // Preserves original code and status
    assert.equal(updated.ma_khach_hang, 'KH-2026-000001');
    assert.equal(updated.trang_thai, 'hoat_dong');
  });

  it('updateCustomerStatus updates customer status', async () => {
    const updated = await service.updateCustomerStatus(1, { trang_thai: 'ngung_giao_dich' }, 99);
    assert.equal(updated.trang_thai, 'ngung_giao_dich');
    assert.equal(updated.nguoi_cap_nhat, 99);
  });

  it('getCustomerSummary returns commercial aggregates', async () => {
    const summary = await service.getCustomerSummary(1);
    assert.equal(summary.totalOrders, 5);
    assert.equal(summary.totalOrderValue, '1250000000.00');
    assert.equal(summary.unpaidInvoicesCount, 1);
    assert.equal(summary.outstandingReceivable, '150000000.00');
  });
});
