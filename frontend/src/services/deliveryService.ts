import { apiFetch, PaginatedEnvelope } from './api.js';
import { Delivery, DeliveryQueryParams, CreateDeliveryPayload } from '../types/delivery.js';

export async function getDeliveries(
  params: DeliveryQueryParams = {}
): Promise<{ deliveries: Delivery[]; meta: PaginatedEnvelope<Delivery>['meta'] }> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.pageSize) query.set('pageSize', String(params.pageSize));
  if (params.search) query.set('search', params.search);
  if (params.ma_don_ban_hang) query.set('ma_don_ban_hang', String(params.ma_don_ban_hang));
  if (params.ma_kho) query.set('ma_kho', String(params.ma_kho));
  if (params.trang_thai) query.set('trang_thai', params.trang_thai);
  if (params.sortBy) query.set('sortBy', params.sortBy);
  if (params.sortOrder) query.set('sortOrder', params.sortOrder);

  const qs = query.toString();
  const endpoint = `/deliveries${qs ? `?${qs}` : ''}`;

  const token = localStorage.getItem('auth_token');
  const headers = new Headers({
    Accept: 'application/json',
  });
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(`/api/v1${endpoint}`, { headers });
  const json = (await res.json()) as PaginatedEnvelope<Delivery>;

  if (!res.ok) {
    throw new Error('Failed to fetch deliveries');
  }

  return {
    deliveries: json.data || [],
    meta: json.meta || { page: 1, pageSize: 20, total: 0, totalPages: 1 },
  };
}

export async function getDeliveryById(id: number): Promise<Delivery> {
  return apiFetch<Delivery>(`/deliveries/${id}`);
}

export async function createDelivery(data: CreateDeliveryPayload): Promise<Delivery> {
  return apiFetch<Delivery>('/deliveries', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function startDelivery(id: number): Promise<Delivery> {
  return apiFetch<Delivery>(`/deliveries/${id}/start`, {
    method: 'POST',
  });
}

export async function completeDelivery(id: number): Promise<Delivery> {
  return apiFetch<Delivery>(`/deliveries/${id}/complete`, {
    method: 'POST',
  });
}

export async function failDelivery(id: number, reason: string): Promise<Delivery> {
  return apiFetch<Delivery>(`/deliveries/${id}/fail`, {
    method: 'POST',
    body: JSON.stringify({ ly_do: reason }),
  });
}
