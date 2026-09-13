import { apiFetch, PaginatedEnvelope } from './api.js';
import { Invoice, InvoiceQueryParams, CreateInvoicePayload } from '../types/invoice.js';

export async function getInvoices(
  params: InvoiceQueryParams = {}
): Promise<{ invoices: Invoice[]; meta: PaginatedEnvelope<Invoice>['meta'] }> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.pageSize) query.set('pageSize', String(params.pageSize));
  if (params.search) query.set('search', params.search);
  if (params.ma_don_ban_hang) query.set('ma_don_ban_hang', String(params.ma_don_ban_hang));
  if (params.ma_khach_hang) query.set('ma_khach_hang', String(params.ma_khach_hang));
  if (params.trang_thai) query.set('trang_thai', params.trang_thai);
  if (params.fromDate) query.set('fromDate', params.fromDate);
  if (params.toDate) query.set('toDate', params.toDate);
  if (params.sortBy) query.set('sortBy', params.sortBy);
  if (params.sortOrder) query.set('sortOrder', params.sortOrder);

  const qs = query.toString();
  const endpoint = `/invoices${qs ? `?${qs}` : ''}`;

  const token = localStorage.getItem('auth_token');
  const headers = new Headers({
    Accept: 'application/json',
  });
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(`/api/v1${endpoint}`, { headers });
  const json = (await res.json()) as PaginatedEnvelope<Invoice>;

  if (!res.ok) {
    throw new Error('Không thể tải danh sách hóa đơn');
  }

  return {
    invoices: json.data || [],
    meta: json.meta || { page: 1, pageSize: 20, total: 0, totalPages: 1 },
  };
}

export async function getInvoiceById(id: number): Promise<Invoice> {
  return apiFetch<Invoice>(`/invoices/${id}`);
}

export async function createInvoice(data: CreateInvoicePayload): Promise<Invoice> {
  return apiFetch<Invoice>('/invoices', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
