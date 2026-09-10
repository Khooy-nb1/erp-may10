import api from './api';

// 1. Dashboard & Core KPI
export const getPurchasingDashboard = () =>
  api.get('/purchasing/dashboard').then((res) => res.data.data);

export const getPurchasingCoreKpi = () =>
  api.get('/purchasing/core-kpi').then((res) => res.data.data);

// 2. Nhà cung cấp (Suppliers)
export const getSuppliers = (params) =>
  api.get('/purchasing/suppliers', { params }).then((res) => res.data);

export const getSupplierDetail = (id) =>
  api.get(`/purchasing/suppliers/${id}`).then((res) => res.data.data);

export const createSupplier = (data) =>
  api.post('/purchasing/suppliers', data).then((res) => res.data);

export const updateSupplier = (id, data) =>
  api.put(`/purchasing/suppliers/${id}`, data).then((res) => res.data);

export const getSupplierEvaluations = (id) =>
  api.get(`/purchasing/suppliers/${id}/evaluations`).then((res) => res.data.data);

export const createSupplierEvaluation = (id, data) =>
  api.post(`/purchasing/suppliers/${id}/evaluations`, data).then((res) => res.data);

// 3. Yêu cầu mua sắm (Purchase Requisitions - PR)
export const getPurchaseRequisitions = (params) =>
  api.get('/purchasing/requisitions', { params }).then((res) => res.data);

export const getRequisitionDetail = (id) =>
  api.get(`/purchasing/requisitions/${id}`).then((res) => res.data.data);

export const createPurchaseRequisition = (data) =>
  api.post('/purchasing/requisitions', data).then((res) => res.data);

export const approveRequisition = (id) =>
  api.post(`/purchasing/requisitions/${id}/approve`).then((res) => res.data);

export const rejectRequisition = (id, reason) =>
  api.post(`/purchasing/requisitions/${id}/reject`, { ly_do_tu_choi: reason }).then((res) => res.data);

export const convertPrToPo = (id, data) =>
  api.post(`/purchasing/requisitions/${id}/create-po`, data).then((res) => res.data);

// 4. Yêu cầu báo giá & So sánh NCC (RFQ)
export const getRfqs = () =>
  api.get('/purchasing/rfqs').then((res) => res.data.data);

export const getRfqDetail = (id) =>
  api.get(`/purchasing/rfqs/${id}`).then((res) => res.data.data);

export const createRfq = (data) =>
  api.post('/purchasing/rfqs', data).then((res) => res.data);

export const submitQuote = (rfqId, data) =>
  api.post(`/purchasing/rfqs/${rfqId}/quotes`, data).then((res) => res.data);

export const selectVendorQuote = (rfqId, data) =>
  api.post(`/purchasing/rfqs/${rfqId}/select-vendor`, data).then((res) => res.data);

// 5. Đơn mua hàng (Purchase Orders - PO)
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

// 6. Nhận hàng & Kiểm nghiệm (Receiving & Inspection)
export const getReceivingOrders = () =>
  api.get('/purchasing/receiving').then((res) => res.data.data);

export const updateReceiveStatus = (data) =>
  api.post('/purchasing/receive-status-update', data).then((res) => res.data);

// 7. Báo cáo mua hàng
export const getPurchasingReports = (params) =>
  api.get('/purchasing/reports', { params }).then((res) => res.data.data);
