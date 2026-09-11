/**
 * P9 dashboard types — mirrors the frozen contract in
 * docs/architecture/dashboard-metrics.md §4.
 *
 * Every money value arrives as a 2-decimal string and every quantity as a
 * 3-decimal string, so nothing is parsed to a float on the way in.
 */

export type DashboardPeriod = 'month' | 'quarter' | 'year' | 'custom';

/** Server-assigned data scope: `kho` receives fulfillment metrics only, `ke_toan` financial only. */
export type DashboardScope = 'full' | 'fulfillment' | 'financial';

export interface DashboardQueryParams {
  period?: DashboardPeriod;
  fromDate?: string;
  toDate?: string;
  nguoi_ban?: number;
  loai_khach_hang?: string;
  limit?: number;
}

/**
 * Metrics are optional because the server strips whatever the caller's role may
 * not see: a `kho` summary carries only `orderCount` + `statusCounts`, a
 * `ke_toan` summary omits both. The UI must tolerate their absence rather than
 * assume the full set.
 */
export interface DashboardSummaryMetrics {
  orderCount?: number;
  totalOrderValue?: string;
  statusCounts?: Record<string, number>;
  openReceivable?: string;
  overdueReceivable?: string;
  unpaidInvoiceCount?: number;
  overdueInvoiceCount?: number;
}

export interface DashboardSummary {
  scope: DashboardScope;
  metrics: DashboardSummaryMetrics;
}

export interface RevenuePoint {
  period: string;
  revenue: string;
  invoiceCount: number;
}

export interface RevenueChart {
  /** Exact table.column the series aggregates; displayed so the source is never ambiguous. */
  source: string;
  label: string;
  series: RevenuePoint[];
  total: string;
}

export interface OrderStatusBreakdown {
  total: number;
  statuses: Array<{ status: string; count: number }>;
}

export interface TopCustomer {
  maKhachHang: number;
  maKhachHangCode: string;
  tenKhachHang: string;
  orderCount: number;
  totalValue: string;
}

export interface TopCustomers {
  metric: string;
  items: TopCustomer[];
}

export interface TopProduct {
  maSanPham: number;
  maSanPhamCode: string;
  tenSanPham: string;
  quantity: string;
  totalValue: string;
}

export interface TopProducts {
  metric: string;
  items: TopProduct[];
}
