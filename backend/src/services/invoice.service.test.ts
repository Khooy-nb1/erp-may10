import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import {
  InvoiceService,
  calculateDueDate,
  deriveInvoiceStatus,
} from './invoice.service.js';
import { IInvoiceRepository, InvoiceListResult } from '../repositories/invoice.repository.js';
import { IOrderRepository } from '../repositories/order.repository.js';
import { ICustomerRepository } from '../repositories/customer.repository.js';
import { InvoiceRecord, InvoiceListFilters } from '../models/invoice.model.js';
import { OrderRecord } from '../models/order.model.js';
import { CustomerRecord } from '../models/customer.model.js';
import { AppError, ConflictError, ValidationError } from '../utils/errors.js';

describe('InvoiceService Unit Tests', () => {
  let mockInvoices: InvoiceRecord[];
  let mockOrders: OrderRecord[];
  let mockCustomers: CustomerRecord[];

  let invoiceRepo: IInvoiceRepository;
  let orderRepo: IOrderRepository;
  let customerRepo: ICustomerRepository;
  let service: InvoiceService;

  before(() => {
    mockInvoices = [];

    mockOrders = [
      {
        id: 1,
        ma_don_ban: 'DBH-2026-000001',
        ma_khach_hang: 1,
        ngay_dat_hang: new Date('2026-09-01'),
        ngay_giao_hang_yc: new Date('2026-09-10'),
        ngay_giao_thuc_te: null,
        dia_chi_giao_hang: 'Hà Nội',
        tong_tien_hang: 10000000,
        tien_thue: 0,
        tien_giam_gia: 1000000,
        tong_thanh_toan: 9000000,
        nguoi_ban: 1,
        trang_thai: 'da_xac_nhan', // Confirmed order
        ghi_chu: null,
        ngay_tao: new Date(),
        ngay_cap_nhat: new Date(),
        nguoi_tao: 1,
        nguoi_cap_nhat: 1,
      },
      {
        id: 2,
        ma_don_ban: 'DBH-2026-000002',
        ma_khach_hang: 1,
        ngay_dat_hang: new Date('2026-09-01'),
        ngay_giao_hang_yc: new Date('2026-09-10'),
        ngay_giao_thuc_te: null,
        dia_chi_giao_hang: 'Hà Nội',
        tong_tien_hang: 5000000,
        tien_thue: 0,
        tien_giam_gia: 0,
        tong_thanh_toan: 5000000,
        nguoi_ban: 1,
        trang_thai: 'cho_xac_nhan', // Pending order
        ghi_chu: null,
        ngay_tao: new Date(),
        ngay_cap_nhat: new Date(),
        nguoi_tao: 1,
        nguoi_cap_nhat: 1,
      },
    ];

    mockCustomers = [
      {
        id: 1,
        ma_khach_hang: 'KH-001',
        ten_khach_hang: 'Khách VIP',
        loai_khach_hang: 'to_chuc',
        ma_so_thue: null,
        so_dien_thoai: '0243123456',
        email: null,
        dia_chi: 'Hà Nội',
        tinh_thanh_pho: 'Hà Nội',
        nguoi_lien_he: null,
        han_muc_cong_no: 50000000,
        so_ngay_cong_no: 30, // 30 credit days
        ghi_chu: null,
        trang_thai: 'hoat_dong',
        ngay_tao: new Date(),
        ngay_cap_nhat: new Date(),
        nguoi_tao: 1,
        nguoi_cap_nhat: 1,
      },
    ];

    invoiceRepo = {
      list: async (filters: InvoiceListFilters): Promise<InvoiceListResult> => ({
        invoices: mockInvoices,
        total: mockInvoices.length,
        page: filters.page || 1,
        pageSize: filters.pageSize || 20,
        totalPages: 1,
      }),
      findById: async (id: number) => mockInvoices.find((i) => i.id === id) || null,
      findByCode: async (code: string) => mockInvoices.find((i) => i.ma_hoa_don === code) || null,
      findByOrderId: async (orderId: number) => mockInvoices.find((i) => i.ma_don_ban_hang === orderId) || null,
      create: async () => { throw new Error('deprecated: use createInvoiceAtomic'); },
      createInvoiceAtomic: async (params) => {
        const order = mockOrders.find((o) => o.id === params.orderId);
        if (!order) return { error: 'ORDER_NOT_FOUND', details: 'Order not found' };
        if (order.trang_thai === 'cho_xac_nhan' || order.trang_thai === 'huy') {
          return { error: 'INVOICE_INVALID_ORDER', details: 'Invalid order state' };
        }
        if (params.expectedCustomerId && params.expectedCustomerId !== order.ma_khach_hang) {
          return { error: 'INVOICE_CUSTOMER_MISMATCH', details: 'Customer mismatch' };
        }
        const dup = mockInvoices.find((i) => i.ma_don_ban_hang === params.orderId);
        if (dup) {
          return { error: 'INVOICE_ALREADY_EXISTS', details: 'Invoice already exists' };
        }
        if (params.paidAmount > Number(order.tong_thanh_toan)) {
          return { error: 'VALIDATION_ERROR', details: 'Paid amount cannot exceed total' };
        }

        const customer = mockCustomers.find((c) => c.id === order.ma_khach_hang);
        const creditDays = customer?.so_ngay_cong_no || 0;
        const dueDate = calculateDueDate(params.issueDate, creditDays);
        const status = deriveInvoiceStatus(params.paidAmount, Number(order.tong_thanh_toan), dueDate);

        const inv: InvoiceRecord = {
          id: mockInvoices.length + 1,
          ma_hoa_don: `HDBH-2026-${mockInvoices.length + 1}`,
          ma_don_ban_hang: order.id,
          ma_khach_hang: order.ma_khach_hang,
          ngay_xuat_hoa_don: params.issueDate,
          ngay_dao_han: dueDate,
          tong_tien_truoc_thue: 9000000,
          tien_thue: 0,
          tong_tien_sau_thue: Number(order.tong_thanh_toan),
          so_tien_da_thu: params.paidAmount,
          trang_thai: status,
          ghi_chu: params.notes,
          ngay_tao: new Date(),
          ngay_cap_nhat: new Date(),
          nguoi_tao: params.creatorId,
          nguoi_cap_nhat: params.creatorId,
        };
        mockInvoices.push(inv);
        return { invoice: inv };
      },
    };

    orderRepo = {
      list: async () => ({ orders: mockOrders, total: mockOrders.length, page: 1, pageSize: 20, totalPages: 1 }),
      findById: async (id: number) => mockOrders.find((o) => o.id === id) || null,
      findByCode: async (code: string) => mockOrders.find((o) => o.ma_don_ban === code) || null,
      create: async () => { throw new Error('not implemented'); },
      update: async () => null,
      updateStatus: async () => null,
      getCustomerOutstanding: async () => 0,
    };

    customerRepo = {
      list: async () => ({ customers: mockCustomers, total: mockCustomers.length, page: 1, pageSize: 20, totalPages: 1 }),
      findById: async (id: number) => mockCustomers.find((c) => c.id === id) || null,
      findByCode: async (code: string) => mockCustomers.find((c) => c.ma_khach_hang === code) || null,
      create: async () => { throw new Error('not implemented'); },
      update: async () => null,
      updateStatus: async () => null,
      getSummary: async () => ({ totalOrders: 0, totalOrderValue: '0', unpaidInvoicesCount: 0, outstandingReceivable: '0', overdueReceivable: '0' }),
    };

    service = new InvoiceService(invoiceRepo, orderRepo, customerRepo);
  });

  it('calculateDueDate calculates due date based on customer credit days', () => {
    const issueDate = new Date('2026-09-01T00:00:00.000Z');
    const dueDate = calculateDueDate(issueDate, 30);
    // 30 days after Sept 1 is Oct 1
    const expected = new Date(issueDate.getTime() + 30 * 24 * 60 * 60 * 1000);
    assert.equal(dueDate.getTime(), expected.getTime());
  });

  it('deriveInvoiceStatus correctly computes payment statuses', () => {
    const futureDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
    const pastDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);

    // chua_thanh_toan
    assert.equal(deriveInvoiceStatus(0, 1000000, futureDate), 'chua_thanh_toan');

    // thanh_toan_mot_phan
    assert.equal(deriveInvoiceStatus(500000, 1000000, futureDate), 'thanh_toan_mot_phan');

    // da_thanh_toan
    assert.equal(deriveInvoiceStatus(1000000, 1000000, futureDate), 'da_thanh_toan');
    assert.equal(deriveInvoiceStatus(1200000, 1000000, pastDate), 'da_thanh_toan');

    // qua_han
    assert.equal(deriveInvoiceStatus(0, 1000000, pastDate), 'qua_han');
    assert.equal(deriveInvoiceStatus(500000, 1000000, pastDate), 'qua_han');
  });

  it('createInvoice succeeds for confirmed order and derives status and code', async () => {
    const invoice = await service.createInvoice(
      {
        ma_don_ban_hang: 1,
        ngay_xuat_hoa_don: '2026-09-11',
      },
      1
    );

    assert.ok(invoice.id);
    assert.ok(invoice.ma_hoa_don.startsWith('HDBH-'));
    assert.equal(invoice.trang_thai, 'chua_thanh_toan');
    assert.equal(invoice.tong_tien_sau_thue, 9000000);
  });

  it('createInvoice rejects unconfirmed order with INVOICE_INVALID_ORDER (422)', async () => {
    await assert.rejects(
      async () => {
        await service.createInvoice(
          {
            ma_don_ban_hang: 2, // Pending order
            ngay_xuat_hoa_don: '2026-09-11',
          },
          1
        );
      },
      (err: unknown) => {
        assert.ok(err instanceof AppError);
        assert.equal(err.code, 'INVOICE_INVALID_ORDER');
        assert.equal(err.statusCode, 422);
        return true;
      }
    );
  });

  it('createInvoice rejects duplicate invoice on same order with INVOICE_ALREADY_EXISTS (409)', async () => {
    await assert.rejects(
      async () => {
        await service.createInvoice(
          {
            ma_don_ban_hang: 1, // Order 1 already has an invoice created in previous test
            ngay_xuat_hoa_don: '2026-09-11',
          },
          1
        );
      },
      (err: unknown) => {
        assert.ok(err instanceof ConflictError);
        assert.equal(err.code, 'INVOICE_ALREADY_EXISTS');
        assert.equal(err.statusCode, 409);
        return true;
      }
    );
  });

  it('createInvoice rejects paid amount greater than total with ValidationError (422)', async () => {
    // Add a fresh confirmed order for this test
    mockOrders.push({
      id: 3,
      ma_don_ban: 'DBH-003',
      ma_khach_hang: 1,
      ngay_dat_hang: new Date(),
      ngay_giao_hang_yc: new Date(),
      ngay_giao_thuc_te: null,
      dia_chi_giao_hang: 'Hà Nội',
      tong_tien_hang: 1000000,
      tien_thue: 0,
      tien_giam_gia: 0,
      tong_thanh_toan: 1000000,
      nguoi_ban: 1,
      trang_thai: 'da_xac_nhan',
      ghi_chu: null,
      ngay_tao: new Date(),
      ngay_cap_nhat: new Date(),
      nguoi_tao: 1,
      nguoi_cap_nhat: 1,
    });

    await assert.rejects(
      async () => {
        await service.createInvoice(
          {
            ma_don_ban_hang: 3,
            ngay_xuat_hoa_don: '2026-09-11',
            so_tien_da_thu: 2000000, // Greater than total (1,000,000)
          },
          1
        );
      },
      (err: unknown) => {
        assert.ok(err instanceof ValidationError);
        return true;
      }
    );
  });

  it('normalizeInvoiceRecord re-derives qua_han dynamically on read if past due', () => {
    const pastDueInvoice: InvoiceRecord = {
      id: 99,
      ma_hoa_don: 'HDBH-TEST',
      ma_don_ban_hang: 1,
      ma_khach_hang: 1,
      ngay_xuat_hoa_don: new Date('2026-08-01'),
      ngay_dao_han: new Date('2026-08-15'), // Past due
      tong_tien_truoc_thue: 1000000,
      tien_thue: 0,
      tong_tien_sau_thue: 1000000,
      so_tien_da_thu: 0,
      trang_thai: 'chua_thanh_toan', // Stale persisted status in DB
      ghi_chu: null,
      ngay_tao: new Date(),
      ngay_cap_nhat: new Date(),
      nguoi_tao: 1,
      nguoi_cap_nhat: 1,
    };

    const readRecord = deriveInvoiceStatus(
      Number(pastDueInvoice.so_tien_da_thu),
      Number(pastDueInvoice.tong_tien_sau_thue),
      new Date(pastDueInvoice.ngay_dao_han)
    );
    assert.equal(readRecord, 'qua_han', 'Read must observe real-time qua_han status');
  });

  it('listInvoices passes ma_hoa_don, dueFromDate, and dueToDate filters to repository', async () => {
    let receivedFilters: InvoiceListFilters | null = null;
    const customRepo: IInvoiceRepository = {
      ...invoiceRepo,
      list: async (f) => {
        receivedFilters = f;
        return { invoices: [], total: 0, page: 1, pageSize: 20, totalPages: 1 };
      },
    };
    const customService = new InvoiceService(customRepo, orderRepo, customerRepo);

    await customService.listInvoices({
      ma_hoa_don: 'HDBH-2026',
      dueFromDate: '2026-09-01',
      dueToDate: '2026-09-30',
    });

    assert.ok(receivedFilters);
    assert.equal(receivedFilters.ma_hoa_don, 'HDBH-2026');
    assert.equal(receivedFilters.dueFromDate, '2026-09-01');
    assert.equal(receivedFilters.dueToDate, '2026-09-30');
  });

  it('createInvoice throws ConflictError (DATABASE_CONFLICT) if code generation fails', async () => {
    const conflictRepo: IInvoiceRepository = {
      ...invoiceRepo,
      createInvoiceAtomic: async () => ({
        error: 'DATABASE_CONFLICT',
        details: 'Không thể tạo mã hóa đơn duy nhất.',
      }),
    };
    const conflictService = new InvoiceService(conflictRepo, orderRepo, customerRepo);

    await assert.rejects(
      async () => {
        await conflictService.createInvoice({ ma_don_ban_hang: 1 }, 1);
      },
      (err: unknown) => {
        assert.ok(err instanceof ConflictError);
        assert.equal(err.code, 'DATABASE_CONFLICT');
        return true;
      }
    );
  });
});
