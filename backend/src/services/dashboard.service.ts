import {
  DashboardFilters,
  DashboardScope,
  DashboardSummary,
  DashboardWindow,
  OrderStatusBreakdown,
  RevenueChart,
  TopCustomers,
  TopProducts,
  dashboardQuerySchema,
} from '../models/dashboard.model.js';
import { IDashboardRepository, dashboardRepository } from '../repositories/dashboard.repository.js';
import { ForbiddenError, ValidationError } from '../utils/errors.js';

/**
 * P9 dashboard metrics service.
 * Contract: docs/architecture/dashboard-metrics.md (metric definitions, RBAC scoping, response
 * shapes) and docs/security/roles-permissions.md §3.2.
 *
 * Scoping is applied server-side: forbidden metrics are never serialized, regardless of the UI.
 */

const ICT_TIME_ZONE = 'Asia/Ho_Chi_Minh';
// Asia/Ho_Chi_Minh is a fixed UTC+7 offset (no DST), so instants are exact arithmetic.
const ICT_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

const ICT_DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  timeZone: ICT_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

interface IctCalendarDate {
  year: number;
  month: number;
  day: number;
}

/**
 * Role -> data scope (docs/security/roles-permissions.md §3.2).
 * `kho` receives fulfillment counts only; `ke_toan` receives financial metrics only.
 */
const ROLE_SCOPES: Readonly<Record<string, DashboardScope>> = {
  admin: 'full',
  ban_hang: 'full',
  kho: 'fulfillment',
  ke_toan: 'financial',
};

export interface ScopedDashboardSummary {
  scope: DashboardScope;
  metrics: Partial<DashboardSummary>;
}

function ictCalendarDate(instant: Date): IctCalendarDate {
  const parts = ICT_DATE_FORMATTER.formatToParts(instant);
  const part = (type: 'year' | 'month' | 'day'): number => Number(parts.find((p) => p.type === type)?.value);
  return { year: part('year'), month: part('month'), day: part('day') };
}

/** First instant (00:00:00.000 ICT) of the given ICT calendar day, as a UTC instant. */
function ictMidnight({ year, month, day }: IctCalendarDate): Date {
  return new Date(Date.UTC(year, month - 1, day) - ICT_OFFSET_MS);
}

function parseIsoDateInput(value: string, field: string): IctCalendarDate {
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (dateOnly) {
    const date: IctCalendarDate = { year: Number(dateOnly[1]), month: Number(dateOnly[2]), day: Number(dateOnly[3]) };
    // Reject impossible dates (e.g. 2026-02-30) instead of letting Date normalize them.
    const normalized = new Date(Date.UTC(date.year, date.month - 1, date.day));
    if (
      normalized.getUTCFullYear() !== date.year ||
      normalized.getUTCMonth() !== date.month - 1 ||
      normalized.getUTCDate() !== date.day
    ) {
      throw new ValidationError('Validation failed for one or more query parameters.', [
        { field, message: `${field} is not a valid calendar date.` },
      ]);
    }
    return date;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new ValidationError('Validation failed for one or more query parameters.', [
      { field, message: `${field} must be an ISO date (YYYY-MM-DD) or an ISO 8601 timestamp.` },
    ]);
  }
  return ictCalendarDate(parsed);
}

function resolveCustomRange(fromDate?: string, toDate?: string): { from: Date; to: Date } {
  const missing = [
    ...(fromDate ? [] : [{ field: 'fromDate', message: 'fromDate is required when period=custom.' }]),
    ...(toDate ? [] : [{ field: 'toDate', message: 'toDate is required when period=custom.' }]),
  ];
  if (missing.length > 0) {
    throw new ValidationError('Validation failed for one or more query parameters.', missing);
  }

  const from = ictMidnight(parseIsoDateInput(fromDate as string, 'fromDate'));
  const to = ictMidnight(parseIsoDateInput(toDate as string, 'toDate'));
  if (from.getTime() > to.getTime()) {
    throw new ValidationError('Validation failed for one or more query parameters.', [
      { field: 'fromDate', message: 'fromDate must be earlier than or equal to toDate.' },
    ]);
  }

  // Inclusive fromDate, exclusive first instant after toDate.
  return { from, to: new Date(to.getTime() + DAY_MS) };
}

function resolvePresetRange(period: 'month' | 'quarter' | 'year', now: Date): { from: Date; to: Date } {
  const { year, month } = ictCalendarDate(now);

  if (period === 'year') {
    return { from: ictMidnight({ year, month: 1, day: 1 }), to: ictMidnight({ year: year + 1, month: 1, day: 1 }) };
  }

  const startMonth = period === 'quarter' ? Math.floor((month - 1) / 3) * 3 + 1 : month;
  const monthsPerPeriod = period === 'quarter' ? 3 : 1;
  return {
    from: ictMidnight({ year, month: startMonth, day: 1 }),
    // Date.UTC normalizes month overflow into the following year.
    to: ictMidnight({ year, month: startMonth + monthsPerPeriod, day: 1 }),
  };
}

function scopeForRole(role: string): DashboardScope {
  const scope = ROLE_SCOPES[role];
  if (!scope) {
    throw new ForbiddenError();
  }
  return scope;
}

/** Money metrics are limited to `full` and `financial` scopes (§3.2: `kho` is denied). */
function assertMoneyScope(role: string): void {
  if (scopeForRole(role) === 'fulfillment') {
    throw new ForbiddenError();
  }
}

function selectSummaryMetrics(scope: DashboardScope, summary: DashboardSummary): Partial<DashboardSummary> {
  if (scope === 'fulfillment') {
    return { orderCount: summary.orderCount, statusCounts: summary.statusCounts };
  }
  if (scope === 'financial') {
    return {
      openReceivable: summary.openReceivable,
      overdueReceivable: summary.overdueReceivable,
      unpaidInvoiceCount: summary.unpaidInvoiceCount,
      overdueInvoiceCount: summary.overdueInvoiceCount,
    };
  }
  return { ...summary };
}

/**
 * Renders an exact decimal string at a fixed scale without touching floating point; PostgreSQL
 * numerics arrive as strings (money: 2 decimals, quantities: 3 decimals — metrics doc §4).
 */
function formatDecimal(value: string | number, scale: number): string {
  const text = typeof value === 'number' ? value.toFixed(scale) : value.trim();
  const match = /^(-?)(\d+)(?:\.(\d+))?$/.exec(text);
  if (!match) {
    return Number(text).toFixed(scale);
  }

  const [, sign, integer, fraction = ''] = match;
  if (fraction.length <= scale) {
    return `${sign}${integer}.${fraction.padEnd(scale, '0')}`;
  }

  const kept = fraction.slice(0, scale);
  if (fraction.charCodeAt(scale) < 53 /* '5' */) {
    return `${sign}${integer}.${kept}`;
  }

  const rounded = (BigInt(`${integer}${kept}`) + 1n).toString().padStart(integer.length + scale, '0');
  const cut = rounded.length - scale;
  return `${sign}${rounded.slice(0, cut)}.${rounded.slice(cut)}`;
}

export class DashboardService {
  constructor(private readonly repo: IDashboardRepository = dashboardRepository) {}

  async getSummary(rawFilters: unknown, role: string): Promise<ScopedDashboardSummary> {
    const scope = scopeForRole(role);
    const window = this.resolveWindow(this.parseFilters(rawFilters));
    const summary = await this.repo.getSummary(window);

    // The repository aggregates in SQL (cancelled orders already excluded from sales value);
    // the service only normalizes the serialization of the aggregates.
    const normalized: DashboardSummary = {
      ...summary,
      totalOrderValue: formatDecimal(summary.totalOrderValue, 2),
      openReceivable: formatDecimal(summary.openReceivable, 2),
      overdueReceivable: formatDecimal(summary.overdueReceivable, 2),
    };

    return { scope, metrics: selectSummaryMetrics(scope, normalized) };
  }

  async getRevenueChart(rawFilters: unknown, role: string): Promise<RevenueChart> {
    assertMoneyScope(role);
    const window = this.resolveWindow(this.parseFilters(rawFilters));
    const chart = await this.repo.getRevenueChart(window);

    return {
      ...chart,
      series: chart.series.map((point) => ({ ...point, revenue: formatDecimal(point.revenue, 2) })),
      total: formatDecimal(chart.total, 2),
    };
  }

  async getOrderStatus(rawFilters: unknown, role: string): Promise<OrderStatusBreakdown> {
    scopeForRole(role);
    const window = this.resolveWindow(this.parseFilters(rawFilters));
    return this.repo.getOrderStatus(window);
  }

  async getTopCustomers(rawFilters: unknown, role: string): Promise<TopCustomers> {
    assertMoneyScope(role);
    const window = this.resolveWindow(this.parseFilters(rawFilters));
    const result = await this.repo.getTopCustomers(window);

    return {
      ...result,
      items: result.items.map((item) => ({ ...item, totalValue: formatDecimal(item.totalValue, 2) })),
    };
  }

  async getTopProducts(rawFilters: unknown, role: string): Promise<TopProducts> {
    assertMoneyScope(role);
    const window = this.resolveWindow(this.parseFilters(rawFilters));
    const result = await this.repo.getTopProducts(window);

    return {
      ...result,
      items: result.items.map((item) => ({
        ...item,
        quantity: formatDecimal(item.quantity, 3),
        totalValue: formatDecimal(item.totalValue, 2),
      })),
    };
  }

  /** Resolves the shared query filters into an explicit half-open window in Asia/Ho_Chi_Minh. */
  resolveWindow(filters: DashboardFilters): DashboardWindow {
    const limit = filters.limit;
    if (limit !== undefined && (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT)) {
      throw new ValidationError('Validation failed for one or more query parameters.', [
        { field: 'limit', message: `limit must be an integer between 1 and ${MAX_LIMIT}.` },
      ]);
    }

    const period = filters.period ?? 'month';
    const range =
      period === 'custom' ? resolveCustomRange(filters.fromDate, filters.toDate) : resolvePresetRange(period, new Date());

    const window: DashboardWindow = { from: range.from, to: range.to, limit: limit ?? DEFAULT_LIMIT };
    if (filters.nguoi_ban !== undefined) {
      window.nguoi_ban = filters.nguoi_ban;
    }
    if (filters.loai_khach_hang !== undefined) {
      window.loai_khach_hang = filters.loai_khach_hang;
    }
    return window;
  }

  private parseFilters(rawFilters: unknown): DashboardFilters {
    const parsed = dashboardQuerySchema.safeParse(rawFilters);
    if (!parsed.success) {
      throw new ValidationError(
        'Validation failed for one or more query parameters.',
        parsed.error.errors.map((e) => ({ field: e.path.join('.'), message: e.message }))
      );
    }
    return parsed.data as DashboardFilters;
  }
}

export const dashboardService = new DashboardService();
