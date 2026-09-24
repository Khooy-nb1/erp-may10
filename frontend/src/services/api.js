import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Gắn interceptor để luôn gửi kèm Authorization token, vai trò và user ID
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('erp_token');
  const currentRole = localStorage.getItem('erp_role') || 'kho';
  const currentUserId = localStorage.getItem('erp_user_id') || '1';

  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  config.headers['x-role'] = currentRole;
  config.headers['x-user-id'] = currentUserId;
  return config;
});

// Master Data APIs
export const getDanhSachKho = () => api.get('/master-data/kho').then((res) => res.data.data);
export const getDanhSachVatTu = () => api.get('/master-data/vat-tu').then((res) => res.data.data);
export const getDanhSachDVT = () => api.get('/master-data/don-vi-tinh').then((res) => res.data.data);
export const getDanhSachNCC = () => api.get('/master-data/nha-cung-cap').then((res) => res.data.data);
export const getCrossModule = () => api.get('/master-data/cross-module').then((res) => res.data.data);

// Vị trí kho APIs
export const getViTriKho = (params) => api.get('/vi-tri-kho', { params }).then((res) => res.data.data);
export const createViTriKho = (data) => api.post('/vi-tri-kho', data).then((res) => res.data);
export const updateViTriKho = (id, data) => api.put(`/vi-tri-kho/${id}`, data).then((res) => res.data);
export const deleteViTriKho = (id) => api.delete(`/vi-tri-kho/${id}`).then((res) => res.data);

// Lô vật tư APIs
export const getLoVatTu = (params) => api.get('/lo-vat-tu', { params }).then((res) => res.data.data);
export const createLoVatTu = (data) => api.post('/lo-vat-tu', data).then((res) => res.data);
export const updateLoVatTu = (id, data) => api.put(`/lo-vat-tu/${id}`, data).then((res) => res.data);

// Tồn kho & Dashboard APIs
export const getTonKho = (params) => api.get('/ton-kho', { params }).then((res) => res.data.data);
export const getDashboardStats = () => api.get('/ton-kho/dashboard').then((res) => res.data.data);
export const getTheKho = (maKho, maVatTu) =>
  api.get('/ton-kho/the-kho', { params: { ma_kho: maKho, ma_vat_tu: maVatTu } }).then((res) => res.data.data);

// Phiếu Nhập kho APIs
export const getPhieuNhap = (params) => api.get('/phieu-nhap', { params }).then((res) => res.data.data);
export const getChiTietPhieuNhap = (id) => api.get(`/phieu-nhap/${id}`).then((res) => res.data.data);
export const createPhieuNhap = (data) => api.post('/phieu-nhap', data).then((res) => res.data);

// Phiếu Xuất kho APIs
export const getPhieuXuat = (params) => api.get('/phieu-xuat', { params }).then((res) => res.data.data);
export const getChiTietPhieuXuat = (id) => api.get(`/phieu-xuat/${id}`).then((res) => res.data.data);
export const createPhieuXuat = (data) => api.post('/phieu-xuat', data).then((res) => res.data);

// Phiếu Chuyển kho APIs
export const getPhieuChuyen = (params) => api.get('/phieu-chuyen', { params }).then((res) => res.data.data);
export const getChiTietPhieuChuyen = (id) => api.get(`/phieu-chuyen/${id}`).then((res) => res.data.data);
export const createPhieuChuyen = (data) => api.post('/phieu-chuyen', data).then((res) => res.data);

// Phiếu Kiểm kê APIs
export const getPhieuKiemKe = (params) => api.get('/phieu-kiem-ke', { params }).then((res) => res.data.data);
export const getChiTietPhieuKiemKe = (id) => api.get(`/phieu-kiem-ke/${id}`).then((res) => res.data.data);
export const createPhieuKiemKe = (data) => api.post('/phieu-kiem-ke', data).then((res) => res.data);
export const dieuChinhTonKho = (id) => api.post(`/phieu-kiem-ke/${id}/dieu-chinh`).then((res) => res.data);

export default api;
