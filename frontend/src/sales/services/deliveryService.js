import { request, requestData, cleanParams } from './client';

const BASE = '/sales/giao-hang';

export async function getDeliveries(params = {}) {
  const payload = await request({ url: BASE, method: 'GET', params: cleanParams(params) });
  return {
    deliveries: payload.data || [],
    meta: payload.meta || { page: 1, pageSize: 20, total: 0, totalPages: 1 },
  };
}

export function getDeliveryById(id) {
  return requestData({ url: BASE + '/' + id, method: 'GET' });
}

export function createDelivery(data) {
  return requestData({ url: BASE, method: 'POST', data });
}

export function startDelivery(id) {
  return requestData({ url: BASE + '/' + id + '/start', method: 'POST' });
}

export function completeDelivery(id) {
  return requestData({ url: BASE + '/' + id + '/complete', method: 'POST' });
}

export function failDelivery(id, reason) {
  return requestData({ url: BASE + '/' + id + '/fail', method: 'POST', data: { ly_do: reason } });
}
