import { apiFetch } from './api.js';
import {
  DashboardQueryParams,
  DashboardSummary,
  OrderStatusBreakdown,
  RevenueChart,
  TopCustomers,
  TopProducts,
} from '../types/dashboard.js';

/**
 * P9 dashboard endpoints.
 *
 * RBAC (docs/security/roles-permissions.md §3.2): `kho` is denied
 * `/revenue-chart`, `/top-customers` and `/top-products`. Callers must gate on
 * role BEFORE invoking those three — this module deliberately does not swallow
 * a 403, because silently hiding a server rejection would mask a permissions
 * regression instead of surfacing it.
 */

function buildQuery(params: DashboardQueryParams = {}): string {
  const query = new URLSearchParams();
  if (params.period) query.set('period', params.period);
  if (params.fromDate) query.set('fromDate', params.fromDate);
  if (params.toDate) query.set('toDate', params.toDate);
  if (params.nguoi_ban) query.set('nguoi_ban', String(params.nguoi_ban));
  if (params.loai_khach_hang) query.set('loai_khach_hang', params.loai_khach_hang);
  if (params.limit) query.set('limit', String(params.limit));
  const qs = query.toString();
  return qs ? `?${qs}` : '';
}

export async function getDashboardSummary(params: DashboardQueryParams = {}): Promise<DashboardSummary> {
  return apiFetch<DashboardSummary>(`/dashboard/summary${buildQuery(params)}`);
}

export async function getRevenueChart(params: DashboardQueryParams = {}): Promise<RevenueChart> {
  return apiFetch<RevenueChart>(`/dashboard/revenue-chart${buildQuery(params)}`);
}

export async function getOrderStatus(params: DashboardQueryParams = {}): Promise<OrderStatusBreakdown> {
  return apiFetch<OrderStatusBreakdown>(`/dashboard/order-status${buildQuery(params)}`);
}

export async function getTopCustomers(params: DashboardQueryParams = {}): Promise<TopCustomers> {
  return apiFetch<TopCustomers>(`/dashboard/top-customers${buildQuery(params)}`);
}

export async function getTopProducts(params: DashboardQueryParams = {}): Promise<TopProducts> {
  return apiFetch<TopProducts>(`/dashboard/top-products${buildQuery(params)}`);
}
