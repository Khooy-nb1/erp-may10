import { apiFetch, PaginatedEnvelope } from './api.js';
import { Product, ProductQueryParams } from '../types/product.js';

export async function getProducts(
  params: ProductQueryParams = {}
): Promise<{ products: Product[]; meta: PaginatedEnvelope<Product>['meta'] }> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.pageSize) query.set('pageSize', String(params.pageSize));
  if (params.search) query.set('search', params.search);
  if (params.size) query.set('size', params.size);
  if (params.mau_sac) query.set('mau_sac', params.mau_sac);
  if (params.trang_thai) query.set('trang_thai', params.trang_thai);
  if (params.sortBy) query.set('sortBy', params.sortBy);
  if (params.sortOrder) query.set('sortOrder', params.sortOrder);

  const qs = query.toString();
  const endpoint = `/products${qs ? `?${qs}` : ''}`;

  const token = localStorage.getItem('auth_token');
  const headers = new Headers({
    Accept: 'application/json',
  });
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(`/api/v1${endpoint}`, { headers });
  const json = (await res.json()) as PaginatedEnvelope<Product>;

  if (!res.ok) {
    throw new Error('Failed to fetch products');
  }

  return {
    products: json.data || [],
    meta: json.meta || { page: 1, pageSize: 20, total: 0, totalPages: 1 },
  };
}

export async function getProductById(id: number): Promise<Product> {
  return apiFetch<Product>(`/products/${id}`);
}
