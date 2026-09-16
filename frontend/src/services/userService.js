/**
 * User Service - ERP May 10
 * API client cho module Quản trị người dùng (Admin)
 */

import api from './api';

export const userService = {
  /**
   * Lấy danh sách người dùng kèm bộ lọc (tìm kiếm, vai trò, trạng thái)
   */
  async getUsers(params = {}) {
    const res = await api.get('/users', { params });
    return res.data;
  },

  /**
   * Lấy chi tiết một người dùng theo ID
   */
  async getUserById(id) {
    const res = await api.get(`/users/${id}`);
    return res.data;
  },

  /**
   * Tạo tài khoản người dùng mới (Chỉ Admin)
   */
  async createUser(data) {
    const res = await api.post('/users', data);
    return res.data;
  },

  /**
   * Cập nhật thông tin người dùng
   */
  async updateUser(id, data) {
    const res = await api.put(`/users/${id}`, data);
    return res.data;
  },

  /**
   * Thay đổi vai trò (Role) của người dùng
   */
  async changeRole(id, vai_tro) {
    const res = await api.patch(`/users/${id}/role`, { vai_tro });
    return res.data;
  },

  /**
   * Khóa hoặc mở khóa tài khoản
   */
  async toggleUserStatus(id, trang_thai) {
    const res = await api.patch(`/users/${id}/status`, { trang_thai });
    return res.data;
  },

  /**
   * Đặt lại mật khẩu tài khoản
   */
  async resetPassword(id, newPassword) {
    const res = await api.post(`/users/${id}/reset-password`, { newPassword });
    return res.data;
  },
};

export default userService;
