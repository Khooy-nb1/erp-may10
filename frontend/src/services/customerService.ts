import { apiFetch, PaginatedEnvelope } from './api.js';
import { Customer, CustomerSummary, CustomerQueryParams } from '../types/customer.js';

export async function getCustomers(
  params: CustomerQueryParams = {}
): Promise<{ customers: Customer[]; meta: PaginatedEnvelope<Customer>['meta'] }> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.pageSize) query.set('pageSize', String(params.pageSize));
  if (params.search) query.set('search', params.search);
  if (params.loai_khach_hang) query.set('loai_khach_hang', params.loai_khach_hang);
  if (params.tinh_thanh_pho) query.set('tinh_thanh_pho', params.tinh_thanh_pho);
  if (params.trang_thai) query.set('trang_thai', params.trang_thai);
  if (params.sortBy) query.set('sortBy', params.sortBy);
  if (params.sortOrder) query.set('sortOrder', params.sortOrder);

  const qs = query.toString();
  const endpoint = `/customers${qs ? `?${qs}` : ''}`;

  const token = localStorage.getItem('auth_token');
  const headers = new Headers({
    Accept: 'application/json',
  });
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(`/api/v1${endpoint}`, { headers });
  const json = (await res.json()) as PaginatedEnvelope<Customer>;

  if (!res.ok) {
    throw new Error('Failed to fetch customers');
  }

  return {
    customers: json.data || [],
    meta: json.meta || { page: 1, pageSize: 20, total: 0, totalPages: 1 },
  };
}

export async function getCustomerById(id: number): Promise<Customer> {
  return apiFetch<Customer>(`/customers/${id}`);
}

export async function getCustomerSummary(id: number): Promise<CustomerSummary> {
  return apiFetch<CustomerSummary>(`/customers/${id}/summary`);
}

export async function createCustomer(data: Record<string, unknown>): Promise<Customer> {
  return apiFetch<Customer>('/customers', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateCustomer(id: number, data: Record<string, unknown>): Promise<Customer> {
  return apiFetch<Customer>(`/customers/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function updateCustomerStatus(id: number, status: string): Promise<Customer> {
  return apiFetch<Customer>(`/customers/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ trang_thai: status }),
  });
}
