import { apiFetch, PaginatedEnvelope } from './api.js';
import { Order, OrderQueryParams, CreateOrderPayload } from '../types/order.js';

export async function getOrders(
  params: OrderQueryParams = {}
): Promise<{ orders: Order[]; meta: PaginatedEnvelope<Order>['meta'] }> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.pageSize) query.set('pageSize', String(params.pageSize));
  if (params.search) query.set('search', params.search);
  if (params.ma_khach_hang) query.set('ma_khach_hang', String(params.ma_khach_hang));
  if (params.trang_thai) query.set('trang_thai', params.trang_thai);
  if (params.nguoi_ban) query.set('nguoi_ban', String(params.nguoi_ban));
  if (params.fromDate) query.set('fromDate', params.fromDate);
  if (params.toDate) query.set('toDate', params.toDate);
  if (params.sortBy) query.set('sortBy', params.sortBy);
  if (params.sortOrder) query.set('sortOrder', params.sortOrder);

  const qs = query.toString();
  const endpoint = `/sales-orders${qs ? `?${qs}` : ''}`;

  const token = localStorage.getItem('auth_token');
  const headers = new Headers({
    Accept: 'application/json',
  });
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(`/api/v1${endpoint}`, { headers });
  const json = (await res.json()) as PaginatedEnvelope<Order>;

  if (!res.ok) {
    throw new Error('Failed to fetch sales orders');
  }

  return {
    orders: json.data || [],
    meta: json.meta || { page: 1, pageSize: 20, total: 0, totalPages: 1 },
  };
}

export async function getOrderById(id: number): Promise<Order> {
  return apiFetch<Order>(`/sales-orders/${id}`);
}

export async function createOrder(data: CreateOrderPayload): Promise<Order> {
  return apiFetch<Order>('/sales-orders', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateOrder(id: number, data: Partial<CreateOrderPayload>): Promise<Order> {
  return apiFetch<Order>(`/sales-orders/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function confirmOrder(id: number, acknowledgeCreditLimit = false): Promise<Order> {
  return apiFetch<Order>(`/sales-orders/${id}/confirm`, {
    method: 'POST',
    body: JSON.stringify({ acknowledgeCreditLimit }),
  });
}

export async function cancelOrder(id: number, reason: string): Promise<Order> {
  return apiFetch<Order>(`/sales-orders/${id}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ ly_do: reason }),
  });
}
