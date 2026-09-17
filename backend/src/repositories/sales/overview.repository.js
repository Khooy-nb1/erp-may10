'use strict';

const db = require('../../config/database');

/**
 * Overview / Dashboard aggregation repository (ported from PH1 `repositories/dashboard.repository.ts`).
 *
 * Invariants enforced here:
 *  - every metric is aggregated in PostgreSQL (no rows are shipped to Node for reduction);
 *  - `window.from` is inclusive, `window.to` exclusive; the service already resolved both to UTC
 *    instants in Asia/Ho_Chi_Minh, so this layer never re-resolves timezones;
 *  - `cong_no` is hard-filtered to `loai_cong_no = 'phai_thu'` (payables never appear in Sales/CRM);
 *  - `san_pham.gia_von` is never selected;
 *  - `so_tien_da_thu < tong_tien_sau_thue` derives the unpaid/overdue invoice counts on read, since
 *    the persisted `trang_thai` may be stale.
 */

const SLOW_QUERY_MS = 500;

// Runtime constants inlined from dashboard.model.ts
const DASHBOARD_PERIOD_VALUES = ['month', 'quarter', 'year', 'custom'];
const DASHBOARD_LIMIT_MIN = 1;
const DASHBOARD_LIMIT_MAX = 50;
const DASHBOARD_LIMIT_DEFAULT = 10;

const ORDER_STATUSES = ['cho_xac_nhan', 'da_xac_nhan', 'dang_san_xuat', 'da_giao', 'huy'];

/**
 * Shared filter predicate for order-backed metrics ($1 from, $2 to, $3 nguoi_ban, $4 loai_khach_hang).
 * Passing NULL for a filter disables it, which keeps every statement static and parameterized.
 */
const ORDER_WINDOW_PREDICATE = `
      WHERE d.ngay_dat_hang >= $1
        AND d.ngay_dat_hang < $2
        AND ($3::bigint IS NULL OR d.nguoi_ban = $3)
        AND ($4::text IS NULL OR k.loai_khach_hang = $4)`;

/**
 * Same filters for invoice-backed metrics, reached through the parent order: the window is the
 * invoice issue date and the salesperson lives on `don_ban_hang`.
 */
const INVOICE_WINDOW_PREDICATE = `
      WHERE h.ngay_xuat_hoa_don >= $1
        AND h.ngay_xuat_hoa_don < $2
        AND ($3::bigint IS NULL OR d.nguoi_ban = $3)
        AND ($4::text IS NULL OR k.loai_khach_hang = $4)`;

function windowParams(window) {
  return [window.from, window.to, window.nguoi_ban ?? null, window.loai_khach_hang ?? null];
}

/** Reports a query that exceeded the 500 ms budget from the metric dictionary (§6). */
async function timeDashboardQuery(label, run) {
  const startedAt = Date.now();
  try {
    return await run();
  } finally {
    const durationMs = Date.now() - startedAt;
    if (durationMs > SLOW_QUERY_MS) {
      console.warn('[SLOW_QUERY]', { query: label, durationMs });
    }
  }
}

function toStatusBreakdown(rows) {
  const counted = {};
  for (const row of rows) {
    counted[row.status] = (counted[row.status] ?? 0) + (Number(row.count) || 0);
  }

  const statuses = ORDER_STATUSES.map((status) => ({
    status: status,
    count: counted[status] ?? 0,
  }));
  for (const status of Object.keys(counted)) {
    if (!ORDER_STATUSES.includes(status)) {
      statuses.push({ status, count: counted[status] });
    }
  }
  return { total: statuses.reduce((sum, entry) => sum + entry.count, 0), statuses };
}

async function getSummary(window) {
  const params = windowParams(window);

  const [statusTotals, invoiceCounts, receivables] = await Promise.all([
    // One statement, one snapshot: the status breakdown AND the sales value are
    // derived together, so `SUM(statusCounts) == orderCount` is structural
    // rather than a coincidence that a concurrent order write could break.
    // (Two separate pooled queries would each get their own read-committed
    // snapshot and could disagree mid-write.)
    timeDashboardQuery('dashboard.summary.status-totals', () =>
      db.query(
        `SELECT
             d.trang_thai AS status,
             COUNT(*)::int AS count,
             COALESCE(SUM(CASE WHEN d.trang_thai <> 'huy' THEN d.tong_thanh_toan ELSE 0 END), 0)::numeric(18,2)::text AS order_value,
             -- Window over the grouped rows: the grand total lands on every row in the
             -- same snapshot, so the sum needs no second query and no JS decimal math.
             COALESCE(SUM(SUM(CASE WHEN d.trang_thai <> 'huy' THEN d.tong_thanh_toan ELSE 0 END)) OVER (), 0)::numeric(18,2)::text AS total_order_value
           FROM don_ban_hang d
           JOIN khach_hang k ON k.id = d.ma_khach_hang
           ${ORDER_WINDOW_PREDICATE}
           GROUP BY d.trang_thai`,
        params
      )
    ),
    timeDashboardQuery('dashboard.summary.invoices', () =>
      db.query(
        `SELECT
             COUNT(*) FILTER (WHERE h.so_tien_da_thu < h.tong_tien_sau_thue)::int AS unpaid_count,
             COUNT(*) FILTER (WHERE h.so_tien_da_thu < h.tong_tien_sau_thue AND h.ngay_dao_han < NOW())::int AS overdue_count
           FROM hoa_don_ban_hang h
           JOIN don_ban_hang d ON d.id = h.ma_don_ban_hang
           JOIN khach_hang k ON k.id = h.ma_khach_hang
           ${INVOICE_WINDOW_PREDICATE}`,
        params
      )
    ),
    // Deliberately point-in-time snapshots over the whole ledger, NOT windowed by the date filter:
    // this is what keeps openReceivable / overdueReceivable identical to P8 /receivables/summary
    // (totalOutstanding / totalOverdue) for any window. Do not "fix" this by adding $1/$2.
    timeDashboardQuery('dashboard.summary.receivables', () =>
      db.query(
        `SELECT
             COALESCE(SUM(cn.so_tien_con_lai), 0)::numeric(18,2)::text AS open_receivable,
             COALESCE(SUM(CASE WHEN cn.ngay_dao_han < NOW() AND cn.so_tien_con_lai > 0 THEN cn.so_tien_con_lai ELSE 0 END), 0)::numeric(18,2)::text AS overdue_receivable
           FROM cong_no cn
           WHERE cn.loai_cong_no = 'phai_thu'`
      )
    ),
  ]);

  const invoices = invoiceCounts.rows[0];
  const receivable = receivables.rows[0];
  const breakdown = toStatusBreakdown(statusTotals.rows);

  return {
    // Population metric: cancelled orders stay in the count and in the status breakdown.
    orderCount: breakdown.total,
    // Sales metric: cancelled orders are excluded from every money value. The grand
    // total rides along on each grouped row, so it shares the snapshot above.
    totalOrderValue: String(statusTotals.rows[0]?.total_order_value ?? '0.00'),
    statusCounts: Object.fromEntries(breakdown.statuses.map((entry) => [entry.status, entry.count])),
    openReceivable: String(receivable?.open_receivable ?? '0.00'),
    overdueReceivable: String(receivable?.overdue_receivable ?? '0.00'),
    unpaidInvoiceCount: Number(invoices?.unpaid_count ?? 0),
    overdueInvoiceCount: Number(invoices?.overdue_count ?? 0),
  };
}

async function getRevenueChart(window) {
  const params = windowParams(window);

  const result = await timeDashboardQuery('dashboard.revenue-chart', () =>
    db.query(
      `SELECT
           to_char(date_trunc('month', h.ngay_xuat_hoa_don AT TIME ZONE 'Asia/Ho_Chi_Minh'), 'YYYY-MM') AS period,
           COALESCE(SUM(h.tong_tien_sau_thue), 0)::numeric(18,2)::text AS revenue,
           COUNT(*)::int AS invoice_count
         FROM hoa_don_ban_hang h
         JOIN don_ban_hang d ON d.id = h.ma_don_ban_hang
         JOIN khach_hang k ON k.id = h.ma_khach_hang
         ${INVOICE_WINDOW_PREDICATE}
         GROUP BY 1
         ORDER BY 1 ASC`,
      params
    )
  );

  const series = result.rows.map((row) => ({
    period: row.period,
    revenue: String(row.revenue),
    invoiceCount: Number(row.invoice_count) || 0,
  }));

  return {
    // "Revenue" is reserved for the invoice-based metric; the source column is named explicitly.
    source: 'hoa_don_ban_hang.tong_tien_sau_thue',
    label: 'Doanh thu theo hóa đơn',
    series,
    total: series.reduce((sum, point) => sum + Number(point.revenue), 0).toFixed(2),
  };
}

async function getOrderStatus(window) {
  const params = windowParams(window);

  const result = await timeDashboardQuery('dashboard.order-status', () =>
    db.query(
      `SELECT d.trang_thai AS status, COUNT(*)::int AS count
         FROM don_ban_hang d
         JOIN khach_hang k ON k.id = d.ma_khach_hang
         ${ORDER_WINDOW_PREDICATE}
         GROUP BY d.trang_thai`,
      params
    )
  );

  return toStatusBreakdown(result.rows);
}

async function getTopCustomers(window) {
  const params = [...windowParams(window), window.limit];

  const result = await timeDashboardQuery('dashboard.top-customers', () =>
    db.query(
      `SELECT
           d.ma_khach_hang,
           k.ma_khach_hang AS customer_code,
           k.ten_khach_hang,
           COUNT(*)::int AS order_count,
           COALESCE(SUM(d.tong_thanh_toan), 0)::numeric(18,2)::text AS total_value
         FROM don_ban_hang d
         JOIN khach_hang k ON k.id = d.ma_khach_hang
         ${ORDER_WINDOW_PREDICATE}
           AND d.trang_thai <> 'huy'
         GROUP BY d.ma_khach_hang, k.ma_khach_hang, k.ten_khach_hang
         ORDER BY COALESCE(SUM(d.tong_thanh_toan), 0) DESC, d.ma_khach_hang ASC
         LIMIT $5`,
      params
    )
  );

  return {
    metric: 'don_ban_hang.tong_thanh_toan',
    items: result.rows.map((row) => ({
      maKhachHang: Number(row.ma_khach_hang),
      maKhachHangCode: String(row.customer_code),
      tenKhachHang: String(row.ten_khach_hang),
      orderCount: Number(row.order_count) || 0,
      totalValue: String(row.total_value),
    })),
  };
}

async function getTopProducts(window) {
  const params = [...windowParams(window), window.limit];

  const result = await timeDashboardQuery('dashboard.top-products', () =>
    db.query(
      `SELECT
           s.id AS ma_san_pham,
           s.ma_san_pham AS product_code,
           s.ten_san_pham,
           COALESCE(SUM(ct.so_luong), 0)::numeric(18,3)::text AS quantity,
           COALESCE(SUM(ct.thanh_tien), 0)::numeric(18,2)::text AS total_value
         FROM chi_tiet_don_ban_hang ct
         JOIN don_ban_hang d ON d.id = ct.ma_don_ban_hang
         JOIN khach_hang k ON k.id = d.ma_khach_hang
         JOIN san_pham s ON s.id = ct.ma_san_pham
         ${ORDER_WINDOW_PREDICATE}
           AND d.trang_thai <> 'huy'
         GROUP BY s.id, s.ma_san_pham, s.ten_san_pham
         ORDER BY COALESCE(SUM(ct.thanh_tien), 0) DESC, s.id ASC
         LIMIT $5`,
      params
    )
  );

  return {
    metric: 'chi_tiet_don_ban_hang.thanh_tien',
    items: result.rows.map((row) => ({
      maSanPham: Number(row.ma_san_pham),
      maSanPhamCode: String(row.product_code),
      tenSanPham: String(row.ten_san_pham),
      quantity: String(row.quantity),
      totalValue: String(row.total_value),
    })),
  };
}

module.exports = {
  getSummary,
  getRevenueChart,
  getOrderStatus,
  getTopCustomers,
  getTopProducts,
  ORDER_STATUSES,
  DASHBOARD_PERIOD_VALUES,
  DASHBOARD_LIMIT_MIN,
  DASHBOARD_LIMIT_MAX,
  DASHBOARD_LIMIT_DEFAULT,
};
