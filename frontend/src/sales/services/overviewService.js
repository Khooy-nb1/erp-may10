import { requestData, cleanParams } from './client';

const BASE = '/sales/tong-quan';

/**
 * Sales overview endpoints.
 *
 * RBAC: \`kho\` is denied \`/revenue-chart\`, \`/top-customers\` and \`/top-products\`.
 * Callers must gate on role/permission BEFORE invoking those three - the module
 * deliberately does not swallow the 403, because hiding a server rejection would
 * mask a permissions regression.
 */
export function getOverviewSummary(params = {}) {
  return requestData({ url: BASE + '/summary', method: 'GET', params: cleanParams(params) });
}

export function getRevenueChart(params = {}) {
  return requestData({ url: BASE + '/revenue-chart', method: 'GET', params: cleanParams(params) });
}

export function getOrderStatus(params = {}) {
  return requestData({ url: BASE + '/order-status', method: 'GET', params: cleanParams(params) });
}

export function getTopCustomers(params = {}) {
  return requestData({ url: BASE + '/top-customers', method: 'GET', params: cleanParams(params) });
}

export function getTopProducts(params = {}) {
  return requestData({ url: BASE + '/top-products', method: 'GET', params: cleanParams(params) });
}
