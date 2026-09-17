import { request, requestData, cleanParams } from './client';

const BASE = '/sales/khach-hang';

export async function getCustomers(params = {}) {
  const payload = await request({ url: BASE, method: 'GET', params: cleanParams(params) });
  return {
    customers: payload.data || [],
    meta: payload.meta || { page: 1, pageSize: 20, total: 0, totalPages: 1 },
  };
}

export function getCustomerById(id) {
  return requestData({ url: BASE + '/' + id, method: 'GET' });
}

export function getCustomerSummary(id) {
  return requestData({ url: BASE + '/' + id + '/summary', method: 'GET' });
}

export function createCustomer(data) {
  return requestData({ url: BASE, method: 'POST', data });
}

export function updateCustomer(id, data) {
  return requestData({ url: BASE + '/' + id, method: 'PATCH', data });
}

export function updateCustomerStatus(id, status) {
  return requestData({ url: BASE + '/' + id + '/status', method: 'PATCH', data: { trang_thai: status } });
}

export async function getCustomerReceivables(customerId, params = {}) {
  const payload = await request({
    url: BASE + '/' + customerId + '/receivables',
    method: 'GET',
    params: cleanParams(params),
  });
  return {
    receivables: payload.data || [],
    meta: payload.meta || { page: 1, pageSize: 20, total: 0, totalPages: 1 },
  };
}
