import { request, requestData, cleanParams } from './client';

const BASE = '/sales/hoa-don';

export async function getInvoices(params = {}) {
  const payload = await request({ url: BASE, method: 'GET', params: cleanParams(params) });
  return {
    invoices: payload.data || [],
    meta: payload.meta || { page: 1, pageSize: 20, total: 0, totalPages: 1 },
  };
}

export function getInvoiceById(id) {
  return requestData({ url: BASE + '/' + id, method: 'GET' });
}

export function createInvoice(data) {
  return requestData({ url: BASE, method: 'POST', data });
}
