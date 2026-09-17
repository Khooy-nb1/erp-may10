import { request, requestData, cleanParams } from './client';

const BASE = '/sales/san-pham';

export async function getProducts(params = {}) {
  const payload = await request({ url: BASE, method: 'GET', params: cleanParams(params) });
  return {
    products: payload.data || [],
    meta: payload.meta || { page: 1, pageSize: 20, total: 0, totalPages: 1 },
  };
}

export function getProductById(id) {
  return requestData({ url: BASE + '/' + id, method: 'GET' });
}
