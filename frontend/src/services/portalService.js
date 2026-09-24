import api from './api';

export const portalService = {
  /**
   * Lấy danh mục 5 phân hệ ERP và trạng thái kết nối
   */
  async getModules() {
    const res = await api.get('/modules');
    return res.data?.data || [];
  },

  /**
   * Lấy dữ liệu KPI tổng hợp toàn hệ thống ERP
   */
  async getDashboardSummary() {
    const res = await api.get('/dashboard/summary');
    return res.data?.data || null;
  },

  /**
   * Lấy dòng thời gian hoạt động chứng từ mới nhất
   */
  async getRecentActivity(limit = 10) {
    const res = await api.get('/dashboard/activity', { params: { limit } });
    return res.data?.data || [];
  },

  /**
   * Lấy danh sách thông báo & cảnh báo vận hành
   */
  async getNotifications() {
    const res = await api.get('/notifications');
    return res.data?.data || [];
  },

  /**
   * Lấy ma trận vai trò & quyền hạn (RBAC)
   */
  async getPermissions() {
    const res = await api.get('/permissions');
    return res.data?.data || {};
  },

  /**
   * Lấy danh sách người dùng hệ thống từ Master Data
   */
  async getUsers() {
    try {
      const res = await api.get('/master-data/nguoi-dung');
      return res.data?.data || [];
    } catch {
      return [];
    }
  },
};

export default portalService;
