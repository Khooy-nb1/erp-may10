import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DashboardService } from './dashboard.service.js';
import { IDashboardRepository } from '../repositories/dashboard.repository.js';
import {
  DashboardSummary,
  DashboardWindow,
  OrderStatusBreakdown,
  RevenueChart,
  TopCustomers,
  TopProducts,
} from '../models/dashboard.model.js';
import { ForbiddenError, ValidationError } from '../utils/errors.js';

const ICT_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

const ICT_PARTS_FORMATTER = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Ho_Chi_Minh',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Independent re-derivation of the ICT calendar date, used as the test oracle. */
function ictParts(instant: Date): { year: number; month: number; day: number } {
  const parts = ICT_PARTS_FORMATTER.formatToParts(instant);
  const part = (type: 'year' | 'month' | 'day'): number => Number(parts.find((p) => p.type === type)?.value);
  return { year: part('year'), month: part('month'), day: part('day') };
}

/** UTC instant of 00:00 ICT on the given ICT calendar day. */
function ictMidnightUtc(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day) - ICT_OFFSET_MS);
}

/**
 * 5 orders, 1 of them cancelled: the cancelled order (999000.00) is excluded from the sales
 * aggregate while it stays part of the status breakdown.
 */
const REPO_SUMMARY: DashboardSummary = {
  orderCount: 5,
  totalOrderValue: '4000000.00',
  statusCounts: { cho_xac_nhan: 1, da_xac_nhan: 1, dang_san_xuat: 0, da_giao: 2, huy: 1 },
  openReceivable: '400000.00',
  overdueReceivable: '120000.00',
  unpaidInvoiceCount: 7,
  overdueInvoiceCount: 2,
};

const SUMMARY_METRIC_KEYS = [
  'openReceivable',
  'orderCount',
  'overdueInvoiceCount',
  'overdueReceivable',
  'statusCounts',
  'totalOrderValue',
  'unpaidInvoiceCount',
];

function createMockRepo(): { repo: IDashboardRepository; windows: DashboardWindow[] } {
  const windows: DashboardWindow[] = [];

  const repo: IDashboardRepository = {
    getSummary: async (window: DashboardWindow): Promise<DashboardSummary> => {
      windows.push(window);
      return { ...REPO_SUMMARY, statusCounts: { ...REPO_SUMMARY.statusCounts } };
    },
    // Raw strings below are intentionally unformatted: fixed-scale rendering is the service's job.
    getRevenueChart: async (window: DashboardWindow): Promise<RevenueChart> => {
      windows.push(window);
      return {
        source: 'hoa_don_ban_hang.tong_tien_sau_thue',
        label: 'Doanh thu theo hóa đơn',
        series: [{ period: '2026-08', revenue: '5000000', invoiceCount: 3 }],
        total: '5000000',
      };
    },
    getOrderStatus: async (window: DashboardWindow): Promise<OrderStatusBreakdown> => {
      windows.push(window);
      return { total: 5, statuses: [{ status: 'huy', count: 1 }] };
    },
    getTopCustomers: async (window: DashboardWindow): Promise<TopCustomers> => {
      windows.push(window);
      return {
        metric: 'don_ban_hang.tong_thanh_toan',
        items: [{ maKhachHang: 1, maKhachHangCode: 'KH-001', tenKhachHang: 'Khách A', orderCount: 3, totalValue: '9000000' }],
      };
    },
    getTopProducts: async (window: DashboardWindow): Promise<TopProducts> => {
      windows.push(window);
      return {
        metric: 'chi_tiet_don_ban_hang.thanh_tien',
        items: [{ maSanPham: 1, maSanPhamCode: 'SP-001', tenSanPham: 'Sản phẩm A', quantity: '120', totalValue: '7000000.5' }],
      };
    },
  };

  return { repo, windows };
}

function createService(): { service: DashboardService; windows: DashboardWindow[] } {
  const { repo, windows } = createMockRepo();
  return { service: new DashboardService(repo), windows };
}

describe('DashboardService — role scoping and serialization', () => {
  it('admin gets scope "full" with every metric as a 2-decimal money string', async () => {
    const { service } = createService();

    const result = await service.getSummary({ period: 'month' }, 'admin');

    assert.equal(result.scope, 'full');
    assert.deepEqual(Object.keys(result.metrics).sort(), SUMMARY_METRIC_KEYS);
    assert.equal(result.metrics.orderCount, 5);
    assert.equal(result.metrics.totalOrderValue, '4000000.00');
    assert.equal(result.metrics.openReceivable, '400000.00');
    assert.equal(result.metrics.overdueReceivable, '120000.00');
    assert.equal(result.metrics.unpaidInvoiceCount, 7);
    assert.equal(result.metrics.overdueInvoiceCount, 2);
    // Status breakdown keeps every status, including cancelled orders.
    assert.equal(result.metrics.statusCounts?.huy, 1);
  });

  it('ban_hang gets the same full scope as admin', async () => {
    const { service } = createService();

    const result = await service.getSummary({ period: 'month' }, 'ban_hang');

    assert.equal(result.scope, 'full');
    assert.deepEqual(Object.keys(result.metrics).sort(), SUMMARY_METRIC_KEYS);
  });

  it('keeps cancelled orders out of the sales value while counting them in the status breakdown', async () => {
    const { service } = createService();

    const result = await service.getSummary({ period: 'month' }, 'admin');

    // 4 non-cancelled orders x 1000000.00; including the cancelled 999000.00 would give 4999000.00.
    assert.equal(result.metrics.totalOrderValue, '4000000.00');
    assert.equal(result.metrics.orderCount, 5);
    assert.equal(result.metrics.statusCounts?.huy, 1);
    // Sales value is the SQL aggregate, never derived from the status counts in Node.
    assert.notEqual(result.metrics.totalOrderValue, '4999000.00');
  });

  it('kho gets scope "fulfillment" and serializes no money key at all', async () => {
    const { service } = createService();

    const result = await service.getSummary({ period: 'month' }, 'kho');

    assert.equal(result.scope, 'fulfillment');
    assert.deepEqual(Object.keys(result.metrics).sort(), ['orderCount', 'statusCounts']);
    assert.equal(result.metrics.orderCount, 5);
    assert.equal(result.metrics.statusCounts?.da_giao, 2);

    const serialized = JSON.stringify(result);
    for (const moneyKey of ['totalOrderValue', 'openReceivable', 'overdueReceivable', 'unpaidInvoiceCount', 'overdueInvoiceCount']) {
      assert.equal(serialized.includes(moneyKey), false, `${moneyKey} must not be serialized for kho`);
      assert.equal(moneyKey in result.metrics, false, `${moneyKey} must not be present for kho`);
    }
  });

  it('ke_toan gets scope "financial" and serializes no order or status key', async () => {
    const { service } = createService();

    const result = await service.getSummary({ period: 'month' }, 'ke_toan');

    assert.equal(result.scope, 'financial');
    assert.deepEqual(Object.keys(result.metrics).sort(), [
      'openReceivable',
      'overdueInvoiceCount',
      'overdueReceivable',
      'unpaidInvoiceCount',
    ]);
    assert.equal(result.metrics.openReceivable, '400000.00');

    const serialized = JSON.stringify(result);
    assert.equal(serialized.includes('orderCount'), false);
    assert.equal(serialized.includes('totalOrderValue'), false);
    assert.equal(serialized.includes('statusCounts'), false);
  });

  it('denies unknown roles instead of falling back to a wider scope', async () => {
    const { service, windows } = createService();

    await assert.rejects(service.getSummary({ period: 'month' }, 'san_xuat'), ForbiddenError);
    assert.equal(windows.length, 0);
  });
});

describe('DashboardService — query filters and validation', () => {
  it('rejects period=custom without fromDate/toDate with a 422 ValidationError', async () => {
    const { service, windows } = createService();

    await assert.rejects(service.getSummary({ period: 'custom' }, 'admin'), (err: unknown) => {
      assert.ok(err instanceof ValidationError);
      assert.equal(err.statusCode, 422);
      assert.equal(err.code, 'VALIDATION_ERROR');
      assert.ok(err.details && err.details.length > 0, 'field details are required for a 422');
      assert.ok(err.details.every((d) => d.message.length > 0));
      return true;
    });
    assert.equal(windows.length, 0);
  });

  it('rejects period=custom when fromDate is after toDate', async () => {
    const { service } = createService();

    await assert.rejects(
      service.getSummary({ period: 'custom', fromDate: '2026-09-30', toDate: '2026-09-01' }, 'admin'),
      (err: unknown) => {
        assert.ok(err instanceof ValidationError);
        assert.ok(err.details?.some((d) => d.field === 'fromDate'), 'fromDate must be reported');
        return true;
      }
    );
  });

  it('rejects a limit outside 1..50 and defaults it to 10', async () => {
    const { service, windows } = createService();

    for (const limit of [0, 51, 2.5]) {
      await assert.rejects(service.getTopCustomers({ limit }, 'admin'), ValidationError);
    }
    assert.equal(windows.length, 0);

    // resolveWindow is public: its guard holds for direct callers too.
    assert.throws(() => service.resolveWindow({ limit: 0 }), ValidationError);
    assert.throws(() => service.resolveWindow({ limit: 51 }), ValidationError);

    await service.getTopCustomers({ period: 'month' }, 'admin');
    assert.equal(windows[0].limit, 10);

    await service.getTopCustomers({ period: 'month', limit: 3 }, 'admin');
    assert.equal(windows[1].limit, 3);
  });

  it('rejects a non-existent calendar date instead of silently shifting it', async () => {
    const { service } = createService();

    await assert.rejects(
      service.getSummary({ period: 'custom', fromDate: '2026-02-30', toDate: '2026-03-31' }, 'admin'),
      ValidationError
    );
  });

  it('forwards the filter window (range, salesperson, customer type, limit) to the repository', async () => {
    const { service, windows } = createService();

    await service.getOrderStatus(
      { period: 'custom', fromDate: '2026-09-01', toDate: '2026-09-30', nguoi_ban: 7, loai_khach_hang: 'to_chuc', limit: 5 },
      'admin'
    );

    assert.equal(windows.length, 1);
    assert.equal(windows[0].from.toISOString(), '2026-08-31T17:00:00.000Z');
    assert.equal(windows[0].to.toISOString(), '2026-09-30T17:00:00.000Z');
    assert.equal(windows[0].nguoi_ban, 7);
    assert.equal(windows[0].loai_khach_hang, 'to_chuc');
    assert.equal(windows[0].limit, 5);
  });
});

describe('DashboardService.resolveWindow — Asia/Ho_Chi_Minh boundaries', () => {
  it('resolves the current month, quarter, and year to ICT midnights', () => {
    const { service } = createService();
    const now = new Date();
    const current = ictParts(now);

    const month = service.resolveWindow({ period: 'month' });
    assert.equal(month.from.getTime(), ictMidnightUtc(current.year, current.month, 1).getTime());
    assert.equal(month.to.getTime(), ictMidnightUtc(current.year, current.month + 1, 1).getTime());

    const quarter = service.resolveWindow({ period: 'quarter' });
    const quarterStartMonth = Math.floor((current.month - 1) / 3) * 3 + 1;
    assert.equal(quarter.from.getTime(), ictMidnightUtc(current.year, quarterStartMonth, 1).getTime());
    assert.equal(quarter.to.getTime(), ictMidnightUtc(current.year, quarterStartMonth + 3, 1).getTime());

    const year = service.resolveWindow({ period: 'year' });
    assert.equal(year.from.getTime(), ictMidnightUtc(current.year, 1, 1).getTime());
    assert.equal(year.to.getTime(), ictMidnightUtc(current.year + 1, 1, 1).getTime());

    for (const window of [month, quarter, year]) {
      // Midnight ICT is exactly 17:00 UTC of the previous calendar day.
      assert.equal((window.from.getTime() + ICT_OFFSET_MS) % DAY_MS, 0);
      assert.equal((window.to.getTime() + ICT_OFFSET_MS) % DAY_MS, 0);
      assert.ok(window.from.getTime() <= now.getTime());
      assert.ok(window.to.getTime() > now.getTime());
    }

    // The current month window spans exactly the ICT days of that month.
    const daysInMonth = ictMidnightUtc(current.year, current.month + 1, 1).getTime() - ictMidnightUtc(current.year, current.month, 1).getTime();
    assert.equal(month.to.getTime() - month.from.getTime(), daysInMonth);
  });

  it('resolves period=custom inclusively from 00:00 ICT and exclusively after toDate', () => {
    const { service } = createService();

    const window = service.resolveWindow({ period: 'custom', fromDate: '2026-09-01', toDate: '2026-09-30' });

    assert.equal(window.from.toISOString(), '2026-08-31T17:00:00.000Z');
    assert.equal(window.to.toISOString(), '2026-09-30T17:00:00.000Z');
    assert.equal((window.to.getTime() - window.from.getTime()) / DAY_MS, 30);
  });
});

describe('DashboardService — revenue, order status, and top lists', () => {
  it('renders invoice revenue and top-list money with 2 decimals and quantities with 3', async () => {
    const { service } = createService();

    const chart = await service.getRevenueChart({ period: 'month' }, 'ke_toan');
    assert.equal(chart.source, 'hoa_don_ban_hang.tong_tien_sau_thue');
    assert.equal(chart.series[0].revenue, '5000000.00');
    assert.equal(chart.total, '5000000.00');

    const customers = await service.getTopCustomers({ period: 'month' }, 'ban_hang');
    assert.equal(customers.metric, 'don_ban_hang.tong_thanh_toan');
    assert.equal(customers.items[0].totalValue, '9000000.00');

    const products = await service.getTopProducts({ period: 'month' }, 'ban_hang');
    assert.equal(products.items[0].quantity, '120.000');
    assert.equal(products.items[0].totalValue, '7000000.50');

    const statuses = await service.getOrderStatus({ period: 'month' }, 'kho');
    assert.equal(statuses.total, 5);
    assert.deepEqual(statuses.statuses, [{ status: 'huy', count: 1 }]);
  });

  it('denies kho on the money-backed endpoints at the service layer', async () => {
    const { service } = createService();

    await assert.rejects(service.getRevenueChart({ period: 'month' }, 'kho'), ForbiddenError);
    await assert.rejects(service.getTopCustomers({ period: 'month' }, 'kho'), ForbiddenError);
    await assert.rejects(service.getTopProducts({ period: 'month' }, 'kho'), ForbiddenError);
  });
});
