/**
 * Dashboard (P9) metric contract — docs/architecture/dashboard-metrics.md.
 *
 * Money is exposed as a 2-decimal string, quantities as a 3-decimal string.
 * The service layer resolves every date boundary in Asia/Ho_Chi_Minh; the
 * repository only receives the resolved instants (`from` inclusive, `to` exclusive).
 */
import { z } from 'zod';

export type DashboardPeriod = 'month' | 'quarter' | 'year' | 'custom';

export interface DashboardFilters {
  period?: DashboardPeriod;
  fromDate?: string;
  toDate?: string;
  nguoi_ban?: number;
  loai_khach_hang?: string;
  limit?: number;
}

export interface DashboardWindow {
  from: Date;
  to: Date;
  nguoi_ban?: number;
  loai_khach_hang?: string;
  limit: number;
}

export type DashboardScope = 'full' | 'fulfillment' | 'financial';

export interface DashboardSummary {
  orderCount: number;
  totalOrderValue: string;
  statusCounts: Record<string, number>;
  openReceivable: string;
  overdueReceivable: string;
  unpaidInvoiceCount: number;
  overdueInvoiceCount: number;
}

export interface RevenuePoint {
  period: string;
  revenue: string;
  invoiceCount: number;
}

export interface RevenueChart {
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

const DASHBOARD_PERIOD_VALUES = ['month', 'quarter', 'year', 'custom'] as const;

const DASHBOARD_LIMIT_MIN = 1;
const DASHBOARD_LIMIT_MAX = 50;
const DASHBOARD_LIMIT_DEFAULT = 10;

export const dashboardQuerySchema = z
  .object({
    period: z
      .enum(DASHBOARD_PERIOD_VALUES, {
        errorMap: () => ({ message: 'period phải là month, quarter, year hoặc custom' }),
      })
      .default('month'),
    fromDate: z.string().optional(),
    toDate: z.string().optional(),
    nguoi_ban: z.coerce.number().int().positive('nguoi_ban phải là số nguyên dương').optional(),
    loai_khach_hang: z.string().optional(),
    limit: z.coerce
      .number()
      .int()
      .min(DASHBOARD_LIMIT_MIN, `limit phải nằm trong khoảng ${DASHBOARD_LIMIT_MIN}..${DASHBOARD_LIMIT_MAX}`)
      .max(DASHBOARD_LIMIT_MAX, `limit phải nằm trong khoảng ${DASHBOARD_LIMIT_MIN}..${DASHBOARD_LIMIT_MAX}`)
      .default(DASHBOARD_LIMIT_DEFAULT),
  })
  .refine((filters) => filters.period !== 'custom' || Boolean(filters.fromDate && filters.toDate), {
    message: 'fromDate và toDate là bắt buộc khi period=custom',
    path: ['fromDate'],
  })
  .refine((filters) => !filters.fromDate || !filters.toDate || filters.fromDate <= filters.toDate, {
    message: 'fromDate không được lớn hơn toDate',
    path: ['fromDate'],
  });

/**
 * Input shape of {@link dashboardQuerySchema}: optional period/limit (defaults are applied
 * by the schema) so the declared filter type and the validating schema can never drift.
 */
export type DashboardFiltersInput = z.input<typeof dashboardQuerySchema>;
