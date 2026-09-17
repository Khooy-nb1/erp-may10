import { request, requestData, cleanParams } from './client';

const BASE = '/sales/cong-no';

export async function getReceivables(params = {}) {
  const payload = await request({ url: BASE, method: 'GET', params: cleanParams(params) });
  return {
    receivables: payload.data || [],
    meta: payload.meta || { page: 1, pageSize: 20, total: 0, totalPages: 1 },
  };
}

export function getReceivableSummary(customerId) {
  return requestData({
    url: BASE + '/summary',
    method: 'GET',
    params: cleanParams({ ma_khach_hang: customerId }),
  });
}

export function getAgingReport() {
  return requestData({ url: BASE + '/aging', method: 'GET' });
}
