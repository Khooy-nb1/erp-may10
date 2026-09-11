import { apiFetch, ApiError, ErrorEnvelope, PaginatedEnvelope } from './api.js';
import {
  Receivable,
  ReceivableSummary,
  AgingReport,
  ReceivableQueryParams,
} from '../types/receivable.js';

export type ReceivablePage = {
  receivables: Receivable[];
  meta: PaginatedEnvelope<Receivable>['meta'];
};

async function fetchReceivablePage(endpoint: string): Promise<ReceivablePage> {
  const headers = new Headers({ Accept: 'application/json' });
  const token = localStorage.getItem('auth_token');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(`/api/v1${endpoint}`, { headers });
  const payload = (await res.json()) as PaginatedEnvelope<Receivable> | ErrorEnvelope;

  if (!res.ok || payload.success === false) {
    const error = payload.success === false ? payload.error : null;
    throw new ApiError(
      error?.code || 'HTTP_ERROR',
      error?.message || `Request failed with status ${res.status}`,
      res.status,
      error?.details || null
    );
  }

  return {
    receivables: payload.data || [],
    meta: payload.meta || { page: 1, pageSize: 20, total: 0, totalPages: 1 },
  };
}

export async function getReceivables(params: ReceivableQueryParams = {}): Promise<ReceivablePage> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.pageSize) query.set('pageSize', String(params.pageSize));
  if (params.search) query.set('search', params.search);
  if (params.ma_khach_hang) query.set('ma_khach_hang', String(params.ma_khach_hang));
  if (params.ma_hoa_don) query.set('ma_hoa_don', String(params.ma_hoa_don));
  if (params.trang_thai) query.set('trang_thai', params.trang_thai);
  if (params.dueFromDate) query.set('dueFromDate', params.dueFromDate);
  if (params.dueToDate) query.set('dueToDate', params.dueToDate);
  if (params.overdueOnly) query.set('overdueOnly', 'true');
  if (params.sortBy) query.set('sortBy', params.sortBy);
  if (params.sortOrder) query.set('sortOrder', params.sortOrder);

  const qs = query.toString();
  return fetchReceivablePage(`/receivables${qs ? `?${qs}` : ''}`);
}

export async function getReceivableSummary(customerId?: number): Promise<ReceivableSummary> {
  const qs = customerId ? `?ma_khach_hang=${customerId}` : '';
  return apiFetch<ReceivableSummary>(`/receivables/summary${qs}`);
}

export async function getAgingReport(): Promise<AgingReport> {
  return apiFetch<AgingReport>('/receivables/aging');
}

export async function getCustomerReceivables(
  customerId: number,
  params: Pick<ReceivableQueryParams, 'page' | 'pageSize'> = {}
): Promise<ReceivablePage> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.pageSize) query.set('pageSize', String(params.pageSize));
  const qs = query.toString();
  return fetchReceivablePage(`/customers/${customerId}/receivables${qs ? `?${qs}` : ''}`);
}
