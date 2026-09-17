import { request, requestData, cleanParams } from './client';

const BASE = '/sales/don-hang';

export async function getOrders(params = {}) {
  const payload = await request({ url: BASE, method: 'GET', params: cleanParams(params) });
  return {
    orders: payload.data || [],
    meta: payload.meta || { page: 1, pageSize: 20, total: 0, totalPages: 1 },
  };
}

export function getOrderById(id) {
  return requestData({ url: BASE + '/' + id, method: 'GET' });
}

export function createOrder(data) {
  return requestData({ url: BASE, method: 'POST', data });
}

export function updateOrder(id, data) {
  return requestData({ url: BASE + '/' + id, method: 'PATCH', data });
}

export function confirmOrder(id, acknowledgeCreditLimit = false) {
  return requestData({ url: BASE + '/' + id + '/confirm', method: 'POST', data: { acknowledgeCreditLimit } });
}

export function cancelOrder(id, reason) {
  return requestData({ url: BASE + '/' + id + '/cancel', method: 'POST', data: { ly_do: reason } });
}
