'use strict';

const { v } = require('../../utils/sales/validate');
const { ValidationError, ForbiddenError } = require('../../utils/sales/errors');
const { INVALID_QUERY_MESSAGE, fieldIssues } = require('../../utils/sales/request');
const { customerTypeEnum } = require('./customer.service');
const overviewRepository = require('../../repositories/sales/overview.repository');

/**
 * P9 dashboard metrics service (ported from PH1 `services/dashboard.service.ts`).
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

const DASHBOARD_PERIOD_VALUES = ['month', 'quarter', 'year', 'custom'];
const DASHBOARD_LIMIT_MIN = 1;
const DASHBOARD_LIMIT_MAX = 50;
const DASHBOARD_LIMIT_DEFAULT = 10;

const ICT_DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  timeZone: ICT_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/**
 * Role -> data scope (docs/security/roles-permissions.md §3.2).
 * `kho` receives fulfillment counts only; `ke_toan` receives financial metrics only.
 */
const ROLE_SCOPES = {
  admin: 'full',
  ban_hang: 'full',
  kho: 'fulfillment',
  ke_toan: 'financial',
};

const dashboardQuerySchema = v
  .object({
    period: v.enum(DASHBOARD_PERIOD_VALUES, 'Khoảng thời gian không hợp lệ').default('month'),
    fromDate: v.string().trim().optional(),
    toDate: v.string().trim().optional(),
    nguoi_ban: v.coerce.number().int('nguoi_ban phải là số nguyên dương').positive('nguoi_ban phải là số nguyên dương').optional(),
    loai_khach_hang: customerTypeEnum.optional(),
    limit: v.coerce
      .number()
      .int('limit phải là số nguyên')
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

function ictCalendarDate(instant) {
  const parts = ICT_DATE_FORMATTER.formatToParts(instant);
  const part = (type) => Number(parts.find((p) => p.type === type)?.value);
  return { year: part('year'), month: part('month'), day: part('day') };
}

/** First instant (00:00:00.000 ICT) of the given ICT calendar day, as a UTC instant. */
function ictMidnight({ year, month, day }) {
  return new Date(Date.UTC(year, month - 1, day) - ICT_OFFSET_MS);
}

function parseIsoDateInput(value, field) {
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (dateOnly) {
    const date = { year: Number(dateOnly[1]), month: Number(dateOnly[2]), day: Number(dateOnly[3]) };
    // Reject impossible dates (e.g. 2026-02-30) instead of letting Date normalize them.
    const normalized = new Date(Date.UTC(date.year, date.month - 1, date.day));
    if (
      normalized.getUTCFullYear() !== date.year ||
      normalized.getUTCMonth() !== date.month - 1 ||
      normalized.getUTCDate() !== date.day
    ) {
      throw new ValidationError(INVALID_QUERY_MESSAGE, [
        { field, message: `${field} không phải là một ngày hợp lệ.` },
      ]);
    }
    return date;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new ValidationError(INVALID_QUERY_MESSAGE, [
      { field, message: `${field} phải là ngày ISO (YYYY-MM-DD) hoặc timestamp ISO 8601.` },
    ]);
  }
  return ictCalendarDate(parsed);
}

function resolveCustomRange(fromDate, toDate) {
  const missing = [
    ...(fromDate ? [] : [{ field: 'fromDate', message: 'fromDate là bắt buộc khi period=custom.' }]),
    ...(toDate ? [] : [{ field: 'toDate', message: 'toDate là bắt buộc khi period=custom.' }]),
  ];
  if (missing.length > 0) {
    throw new ValidationError(INVALID_QUERY_MESSAGE, missing);
  }

  const from = ictMidnight(parseIsoDateInput(fromDate, 'fromDate'));
  const to = ictMidnight(parseIsoDateInput(toDate, 'toDate'));
  if (from.getTime() > to.getTime()) {
    throw new ValidationError(INVALID_QUERY_MESSAGE, [
      { field: 'fromDate', message: 'fromDate phải nhỏ hơn hoặc bằng toDate.' },
    ]);
  }

  // Inclusive fromDate, exclusive first instant after toDate.
  return { from, to: new Date(to.getTime() + DAY_MS) };
}

function resolvePresetRange(period, now) {
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

function scopeForRole(role) {
  const scope = ROLE_SCOPES[role];
  if (!scope) {
    throw new ForbiddenError();
  }
  return scope;
}

/** Money metrics are limited to `full` and `financial` scopes (§3.2: `kho` is denied). */
function assertMoneyScope(role) {
  if (scopeForRole(role) === 'fulfillment') {
    throw new ForbiddenError();
  }
}

function selectSummaryMetrics(scope, summary) {
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
 * numerics arrive as strings (money: 2 decimals, quantities: 3 decimals - metrics doc §4).
 */
function formatDecimal(value, scale) {
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

function parseFilters(rawFilters) {
  const parsed = dashboardQuerySchema.safeParse(rawFilters);
  if (!parsed.success) {
    throw new ValidationError(INVALID_QUERY_MESSAGE, fieldIssues(parsed.error.errors));
  }
  return parsed.data;
}

/** Resolves the shared query filters into an explicit half-open window in Asia/Ho_Chi_Minh. */
function resolveWindow(filters) {
  const limit = filters.limit;
  if (limit !== undefined && (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT)) {
    throw new ValidationError(INVALID_QUERY_MESSAGE, [
      { field: 'limit', message: `limit phải là số nguyên trong khoảng 1..${MAX_LIMIT}.` },
    ]);
  }

  const period = filters.period ?? 'month';
  const range =
    period === 'custom' ? resolveCustomRange(filters.fromDate, filters.toDate) : resolvePresetRange(period, new Date());

  const window = { from: range.from, to: range.to, limit: limit ?? DEFAULT_LIMIT };
  if (filters.nguoi_ban !== undefined) {
    window.nguoi_ban = filters.nguoi_ban;
  }
  if (filters.loai_khach_hang !== undefined) {
    window.loai_khach_hang = filters.loai_khach_hang;
  }
  return window;
}

async function getSummary(rawFilters, role) {
  const scope = scopeForRole(role);
  const window = resolveWindow(parseFilters(rawFilters));
  const summary = await overviewRepository.getSummary(window);

  // The repository aggregates in SQL (cancelled orders already excluded from sales value);
  // the service only normalizes the serialization of the aggregates.
  const normalized = {
    ...summary,
    totalOrderValue: formatDecimal(summary.totalOrderValue, 2),
    openReceivable: formatDecimal(summary.openReceivable, 2),
    overdueReceivable: formatDecimal(summary.overdueReceivable, 2),
  };

  return { scope, metrics: selectSummaryMetrics(scope, normalized) };
}

async function getRevenueChart(rawFilters, role) {
  assertMoneyScope(role);
  const window = resolveWindow(parseFilters(rawFilters));
  const chart = await overviewRepository.getRevenueChart(window);

  return {
    ...chart,
    series: chart.series.map((point) => ({ ...point, revenue: formatDecimal(point.revenue, 2) })),
    total: formatDecimal(chart.total, 2),
  };
}

async function getOrderStatus(rawFilters, role) {
  scopeForRole(role);
  const window = resolveWindow(parseFilters(rawFilters));
  return overviewRepository.getOrderStatus(window);
}

async function getTopCustomers(rawFilters, role) {
  assertMoneyScope(role);
  const window = resolveWindow(parseFilters(rawFilters));
  const result = await overviewRepository.getTopCustomers(window);

  return {
    ...result,
    items: result.items.map((item) => ({ ...item, totalValue: formatDecimal(item.totalValue, 2) })),
  };
}

async function getTopProducts(rawFilters, role) {
  assertMoneyScope(role);
  const window = resolveWindow(parseFilters(rawFilters));
  const result = await overviewRepository.getTopProducts(window);

  return {
    ...result,
    items: result.items.map((item) => ({
      ...item,
      quantity: formatDecimal(item.quantity, 3),
      totalValue: formatDecimal(item.totalValue, 2),
    })),
  };
}

module.exports = {
  ICT_TIME_ZONE,
  ROLE_SCOPES,
  dashboardQuerySchema,
  resolveWindow,
  getSummary,
  getRevenueChart,
  getOrderStatus,
  getTopCustomers,
  getTopProducts,
  overviewService: {
    getSummary,
    getRevenueChart,
    getOrderStatus,
    getTopCustomers,
    getTopProducts,
    resolveWindow,
  },
};
