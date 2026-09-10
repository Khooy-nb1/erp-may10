import api from './api';

export const getPurchasingDashboard = () =>
  api.get('/purchasing/dashboard').then((res) => res.data.data);

export const getPurchasingCoreKpi = () =>
  api.get('/purchasing/core-kpi').then((res) => res.data.data);

export const getSuppliers = (params) =>
  api.get('/purchasing/suppliers', { params }).then((res) => res.data);

export const getSupplierDetail = (id) =>
  api.get(`/purchasing/suppliers/${id}`).then((res) => res.data.data);

export const createSupplier = (data) =>
  api.post('/purchasing/suppliers', data).then((res) => res.data);

export const updateSupplier = (id, data) =>
  api.put(`/purchasing/suppliers/${id}`, data).then((res) => res.data);

export const getPurchaseOrders = (params) =>
  api.get('/purchasing/purchase-orders', { params }).then((res) => res.data);

export const getPurchaseOrderDetail = (id) =>
  api.get(`/purchasing/purchase-orders/${id}`).then((res) => res.data.data);

export const createPurchaseOrder = (data) =>
  api.post('/purchasing/purchase-orders', data).then((res) => res.data);

export const approvePurchaseOrder = (id) =>
  api.post(`/purchasing/purchase-orders/${id}/approve`).then((res) => res.data);

export const cancelPurchaseOrder = (id, reason) =>
  api.post(`/purchasing/purchase-orders/${id}/cancel`, { ly_do_huy: reason }).then((res) => res.data);

export const updatePOStatus = (id, newStatus, note) =>
  api.post(`/purchasing/purchase-orders/${id}/status`, {
    trang_thai_moi: newStatus,
    ghi_chu: note,
  }).then((res) => res.data);

export const getReceivingOrders = () =>
  api.get('/purchasing/receiving').then((res) => res.data.data);

export const updateReceiveStatus = (data) =>
  api.post('/purchasing/receive-status-update', data).then((res) => res.data);

export const getPurchasingReports = (params) =>
  api.get('/purchasing/reports', { params }).then((res) => res.data.data);
