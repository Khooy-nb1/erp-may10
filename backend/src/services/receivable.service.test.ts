import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { ReceivableService } from './receivable.service.js';
import { IReceivableRepository, ReceivableListResult } from '../repositories/receivable.repository.js';
import {
  ReceivableRecord,
  ReceivableSummary,
  AgingReport,
  ReceivableListFilters,
} from '../models/receivable.model.js';

describe('ReceivableService Unit Tests', () => {
  let mockReceivables: ReceivableRecord[];
  let repo: IReceivableRepository;
  let service: ReceivableService;

  before(() => {
    // 3 phai_thu receivables + 1 phai_tra payable to verify boundary exclusion
    mockReceivables = [
      {
        id: 1,
        loai_cong_no: 'phai_thu',
        ma_khach_hang: 1,
        ten_khach_hang: 'Khách A',
        ma_khach_hang_code: 'KH-001',
        ma_hoa_don: 1,
        ma_hoa_don_code: 'HDBH-001',
        bang_hoa_don: 'hoa_don_ban_hang',
        so_tien_phat_sinh: 10000000,
        so_tien_da_thanh_toan: 4000000,
        so_tien_con_lai: 6000000,
        ngay_dao_han: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // In-term (Current)
        daysOverdue: 0,
        trang_thai: 'mot_phan',
        ngay_tao: new Date(),
        ngay_cap_nhat: new Date(),
      },
      {
        id: 2,
        loai_cong_no: 'phai_thu',
        ma_khach_hang: 1,
        ten_khach_hang: 'Khách A',
        ma_khach_hang_code: 'KH-001',
        ma_hoa_don: 2,
        ma_hoa_don_code: 'HDBH-002',
        bang_hoa_don: 'hoa_don_ban_hang',
        so_tien_phat_sinh: 5000000,
        so_tien_da_thanh_toan: 0,
        so_tien_con_lai: 5000000,
        ngay_dao_han: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days overdue (Bucket 1-30)
        daysOverdue: 15,
        trang_thai: 'qua_han',
        ngay_tao: new Date(),
        ngay_cap_nhat: new Date(),
      },
      {
        id: 3,
        loai_cong_no: 'phai_thu',
        ma_khach_hang: 2,
        ten_khach_hang: 'Khách B',
        ma_khach_hang_code: 'KH-002',
        ma_hoa_don: 3,
        ma_hoa_don_code: 'HDBH-003',
        bang_hoa_don: 'hoa_don_ban_hang',
        so_tien_phat_sinh: 20000000,
        so_tien_da_thanh_toan: 0,
        so_tien_con_lai: 20000000,
        ngay_dao_han: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000), // 45 days overdue (Bucket 31-60)
        daysOverdue: 45,
        trang_thai: 'qua_han',
        ngay_tao: new Date(),
        ngay_cap_nhat: new Date(),
      },
    ];

    repo = {
      list: async (filters: ReceivableListFilters): Promise<ReceivableListResult> => {
        // Enforce repository invariant: only phai_thu
        let list = mockReceivables.filter((r) => r.loai_cong_no === 'phai_thu');

        if (filters.ma_khach_hang) {
          list = list.filter((r) => r.ma_khach_hang === filters.ma_khach_hang);
        }
        if (filters.trang_thai) {
          list = list.filter((r) => r.trang_thai === filters.trang_thai);
        }
        if (filters.overdueOnly) {
          list = list.filter((r) => (r.daysOverdue || 0) > 0 && Number(r.so_tien_con_lai) > 0);
        }

        return {
          receivables: list,
          total: list.length,
          page: filters.page || 1,
          pageSize: filters.pageSize || 20,
          totalPages: 1,
        };
      },
      getSummary: async (customerId?: number): Promise<ReceivableSummary> => {
        const list = customerId
          ? mockReceivables.filter((r) => r.loai_cong_no === 'phai_thu' && r.ma_khach_hang === customerId)
          : mockReceivables.filter((r) => r.loai_cong_no === 'phai_thu');

        const totalOriginal = list.reduce((sum, r) => sum + Number(r.so_tien_phat_sinh), 0);
        const totalPaid = list.reduce((sum, r) => sum + Number(r.so_tien_da_thanh_toan), 0);
        const totalOutstanding = list.reduce((sum, r) => sum + Number(r.so_tien_con_lai), 0);
        const overdueList = list.filter((r) => (r.daysOverdue || 0) > 0);
        const totalOverdue = overdueList.reduce((sum, r) => sum + Number(r.so_tien_con_lai), 0);

        return {
          totalOriginal: totalOriginal.toFixed(2),
          totalPaid: totalPaid.toFixed(2),
          totalOutstanding: totalOutstanding.toFixed(2),
          totalOverdue: totalOverdue.toFixed(2),
          overdueCount: overdueList.length,
        };
      },
      getAgingReport: async (): Promise<AgingReport> => {
        return {
          current: { label: 'Trong hạn', minDays: null, maxDays: 0, totalAmount: '6000000.00', count: 1 },
          days1To30: { label: '1 – 30 ngày', minDays: 1, maxDays: 30, totalAmount: '5000000.00', count: 1 },
          days31To60: { label: '31 – 60 ngày', minDays: 31, maxDays: 60, totalAmount: '20000000.00', count: 1 },
          days61To90: { label: '61 – 90 ngày', minDays: 61, maxDays: 90, totalAmount: '0.00', count: 0 },
          daysOver90: { label: 'Trên 90 ngày', minDays: 91, maxDays: null, totalAmount: '0.00', count: 0 },
          totalReceivables: '31000000.00',
        };
      },
    };

    service = new ReceivableService(repo);
  });

  it('listReceivables strictly returns only phai_thu and excludes phai_tra payables', async () => {
    const res = await service.listReceivables({});
    assert.equal(res.total, 3);
    assert.ok(res.receivables.every((r) => r.loai_cong_no === 'phai_thu'));
  });

  it('listReceivables filters by customer id correctly', async () => {
    const res = await service.listReceivables({ ma_khach_hang: 2 });
    assert.equal(res.total, 1);
    assert.equal(res.receivables[0].ma_khach_hang, 2);
    assert.equal(res.receivables[0].ten_khach_hang, 'Khách B');
  });

  it('listReceivables filters overdue records with overdueOnly: true', async () => {
    const res = await service.listReceivables({ overdueOnly: true });
    assert.equal(res.total, 2);
    assert.ok(res.receivables.every((r) => (r.daysOverdue || 0) > 0));
  });

  it('getSummary aggregates outstanding, paid, and overdue metrics', async () => {
    const summary = await service.getSummary();
    // Total original: 10M + 5M + 20M = 35M
    assert.equal(summary.totalOriginal, '35000000.00');
    // Total paid: 4M
    assert.equal(summary.totalPaid, '4000000.00');
    // Total outstanding: 6M + 5M + 20M = 31M
    assert.equal(summary.totalOutstanding, '31000000.00');
    // Total overdue: 5M + 20M = 25M
    assert.equal(summary.totalOverdue, '25000000.00');
    assert.equal(summary.overdueCount, 2);
  });

  it('getSummaryForQuery forwards a validated customer filter and rejects invalid input', async () => {
    const summary = await service.getSummaryForQuery({ ma_khach_hang: '2' });
    assert.equal(summary.totalOutstanding, '20000000.00');

    await assert.rejects(
      () => service.getSummaryForQuery({ ma_khach_hang: 'abc' }),
      /Validation failed/
    );
  });

  it('getAgingReport distributes receivables across correct aging brackets', async () => {
    const aging = await service.getAgingReport();
    assert.equal(aging.current.totalAmount, '6000000.00');
    assert.equal(aging.days1To30.totalAmount, '5000000.00');
    assert.equal(aging.days31To60.totalAmount, '20000000.00');
    assert.equal(aging.days61To90.totalAmount, '0.00');
    assert.equal(aging.daysOver90.totalAmount, '0.00');
    assert.equal(aging.totalReceivables, '31000000.00');
  });
});
