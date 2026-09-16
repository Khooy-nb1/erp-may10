import React, { useState, useEffect, useMemo } from 'react';
import {
  Users as UsersIcon,
  UserPlus,
  ShieldCheck,
  Edit,
  Lock,
  Unlock,
  KeyRound,
  RefreshCw,
  Search,
  Building2,
  Phone,
  Mail,
  UserCheck,
  UserX,
  AlertCircle,
  CheckCircle2,
  X,
  Shield,
  Eye,
  EyeOff,
} from 'lucide-react';
import userService from '../../services/userService';
import { ROLE_DETAILS, ROLES } from '../../config/roles';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Toast feedback state
  const [toast, setToast] = useState(null);

  // Current logged in admin ID
  const currentUserId = useMemo(() => {
    try {
      const userStr = localStorage.getItem('erp_user');
      if (userStr) {
        const u = JSON.parse(userStr);
        return String(u.id);
      }
    } catch (_) {}
    return '1';
  }, []);

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [resetPassModalOpen, setResetPassModalOpen] = useState(false);

  // Selected user for actions
  const [selectedUser, setSelectedUser] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    ho_ten: '',
    email: '',
    so_dien_thoai: '',
    phong_ban: '',
    vai_tro: 'ban_hang',
    mat_khau: '',
    trang_thai: 'hoat_dong',
  });

  const [newRole, setNewRole] = useState('ban_hang');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Toast helper
  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Load danh sách người dùng
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await userService.getUsers();
      if (res && res.data) {
        setUsers(res.data);
      }
    } catch (err) {
      console.error('Lỗi khi tải danh sách người dùng:', err);
      showToast('error', err.response?.data?.message || err.message || 'Không thể tải danh sách người dùng');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Lọc danh sách người dùng tại client
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchSearch =
        !search.trim() ||
        u.ho_ten?.toLowerCase().includes(search.toLowerCase()) ||
        u.email?.toLowerCase().includes(search.toLowerCase()) ||
        u.phong_ban?.toLowerCase().includes(search.toLowerCase()) ||
        u.so_dien_thoai?.includes(search) ||
        u.ma_can_bo?.toLowerCase().includes(search.toLowerCase());

      const matchRole = !roleFilter || u.vai_tro === roleFilter;
      const matchStatus = !statusFilter || u.trang_thai === statusFilter;

      return matchSearch && matchRole && matchStatus;
    });
  }, [users, search, roleFilter, statusFilter]);

  // Handler mở Modal Thêm mới
  const handleOpenCreate = () => {
    setFormData({
      ho_ten: '',
      email: '',
      so_dien_thoai: '',
      phong_ban: '',
      vai_tro: 'ban_hang',
      mat_khau: '',
      trang_thai: 'hoat_dong',
    });
    setFormError('');
    setCreateModalOpen(true);
  };

  // Submit Thêm mới
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setActionLoading(true);
    try {
      const res = await userService.createUser(formData);
      showToast('success', res.message || 'Tạo tài khoản người dùng thành công!');
      setCreateModalOpen(false);
      fetchUsers();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Lỗi khi tạo người dùng';
      setFormError(msg);
    } finally {
      setActionLoading(false);
    }
  };

  // Handler mở Modal Sửa
  const handleOpenEdit = (u) => {
    setSelectedUser(u);
    setFormData({
      ho_ten: u.ho_ten || '',
      email: u.email || '',
      so_dien_thoai: u.so_dien_thoai || '',
      phong_ban: u.phong_ban || '',
      vai_tro: u.vai_tro || 'ban_hang',
      trang_thai: u.trang_thai || 'hoat_dong',
    });
    setFormError('');
    setEditModalOpen(true);
  };

  // Submit Sửa
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;
    setFormError('');
    setActionLoading(true);
    try {
      const res = await userService.updateUser(selectedUser.id, formData);
      showToast('success', res.message || 'Cập nhật thông tin thành công!');
      setEditModalOpen(false);
      fetchUsers();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Lỗi khi cập nhật người dùng';
      setFormError(msg);
    } finally {
      setActionLoading(false);
    }
  };

  // Handler mở Modal Đổi vai trò
  const handleOpenRoleModal = (u) => {
    setSelectedUser(u);
    setNewRole(u.vai_tro);
    setFormError('');
    setRoleModalOpen(true);
  };

  // Submit Đổi vai trò
  const handleRoleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;
    setFormError('');
    setActionLoading(true);
    try {
      const res = await userService.changeRole(selectedUser.id, newRole);
      showToast('success', res.message || 'Đổi vai trò thành công!');
      setRoleModalOpen(false);
      fetchUsers();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Lỗi khi đổi vai trò';
      setFormError(msg);
    } finally {
      setActionLoading(false);
    }
  };

  // Handler mở Modal Khóa / Mở khóa
  const handleOpenStatusModal = (u) => {
    setSelectedUser(u);
    setFormError('');
    setStatusModalOpen(true);
  };

  // Submit Khóa / Mở khóa
  const handleStatusSubmit = async () => {
    if (!selectedUser) return;
    const targetStatus = selectedUser.trang_thai === 'hoat_dong' ? 'khoa' : 'hoat_dong';
    setActionLoading(true);
    setFormError('');
    try {
      const res = await userService.toggleUserStatus(selectedUser.id, targetStatus);
      showToast('success', res.message || 'Cập nhật trạng thái thành công!');
      setStatusModalOpen(false);
      fetchUsers();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Lỗi khi thay đổi trạng thái';
      setFormError(msg);
    } finally {
      setActionLoading(false);
    }
  };

  // Handler mở Modal Reset Mật khẩu
  const handleOpenResetPass = (u) => {
    setSelectedUser(u);
    setNewPassword('');
    setFormError('');
    setShowPassword(false);
    setResetPassModalOpen(true);
  };

  // Submit Reset Mật khẩu
  const handleResetPassSubmit = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;
    setFormError('');
    setActionLoading(true);
    try {
      const res = await userService.resetPassword(selectedUser.id, newPassword || undefined);
      showToast('success', res.message || 'Đặt lại mật khẩu thành công!');
      setResetPassModalOpen(false);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Lỗi khi đặt lại mật khẩu';
      setFormError(msg);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border text-xs sm:text-sm animate-in slide-in-from-top-5 duration-200 ${
            toast.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-red-50 text-red-800 border-red-200'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          )}
          <span className="font-medium">{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="ml-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <UsersIcon className="w-5 h-5 text-may10-primary" />
            <h1 className="text-lg sm:text-xl font-black text-gray-900">
              QUẢN TRỊ NGƯỜI DÙNG HỆ THỐNG ERP MAY 10
            </h1>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Quản lý danh sách tài khoản, phân quyền vai trò doanh nghiệp, khóa/mở khóa tài khoản và bảo mật mật khẩu.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={fetchUsers}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 bg-gray-50 hover:bg-gray-100 transition-colors"
            title="Tải lại danh sách"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Làm mới</span>
          </button>

          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-may10-primary hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-all"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Thêm người dùng</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Tìm theo tên, email, SĐT, phòng ban..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-gray-200 rounded-xl outline-none focus:border-may10-primary focus:ring-2 focus:ring-may10-primary/10 transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-1.5 text-xs border border-gray-200 rounded-xl outline-none focus:border-may10-primary bg-white text-gray-700 transition-all"
          >
            <option value="">-- Tất cả vai trò --</option>
            {Object.entries(ROLE_DETAILS).map(([code, r]) => (
              <option key={code} value={code}>
                {r.shortName} ({code})
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-xs border border-gray-200 rounded-xl outline-none focus:border-may10-primary bg-white text-gray-700 transition-all"
          >
            <option value="">-- Tất cả trạng thái --</option>
            <option value="hoat_dong">Đang hoạt động</option>
            <option value="khoa">Đã bị khóa</option>
          </select>

          <span className="text-[11px] font-semibold text-gray-400 ml-auto md:ml-2">
            Hiển thị: <strong>{filteredUsers.length}</strong> / {users.length} tài khoản
          </span>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-600">
            <thead className="bg-gray-50 text-gray-700 uppercase font-semibold text-[10px] tracking-wider border-b border-gray-200">
              <tr>
                <th className="py-3 px-4">Mã cán bộ</th>
                <th className="py-3 px-4">Họ và tên</th>
                <th className="py-3 px-4">Tên đăng nhập / Email</th>
                <th className="py-3 px-4">Phòng ban / Đơn vị</th>
                <th className="py-3 px-4">Vai trò (Role)</th>
                <th className="py-3 px-4 text-center">Trạng thái</th>
                <th className="py-3 px-4 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-may10-primary" />
                    Đang tải danh sách người dùng...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400">
                    Không tìm thấy tài khoản người dùng nào phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const roleInfo = ROLE_DETAILS[u.vai_tro] || ROLE_DETAILS.kho;
                  const isCurrentAdmin = String(u.id) === String(currentUserId);
                  const isLocked = u.trang_thai === 'khoa';

                  return (
                    <tr key={u.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-gray-900">
                        {u.ma_can_bo || `NV-${String(u.id).padStart(4, '0')}`}
                      </td>
                      <td className="py-3 px-4 font-bold text-gray-900">
                        <div className="flex items-center gap-1.5">
                          <span>{u.ho_ten}</span>
                          {isCurrentAdmin && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 bg-blue-100 text-blue-800 rounded">
                              Bạn
                            </span>
                          )}
                        </div>
                        {u.so_dien_thoai && (
                          <div className="flex items-center gap-1 text-[10px] text-gray-400 font-mono mt-0.5">
                            <Phone className="w-2.5 h-2.5" />
                            <span>{u.so_dien_thoai}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        <div className="font-mono text-gray-800">{u.email}</div>
                        <span className="text-[10px] font-mono text-gray-400">
                          user: {u.ten_dang_nhap || u.email?.split('@')[0]}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-700">
                        <span className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                          <span>{u.phong_ban || roleInfo.department}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border ${roleInfo.badgeColor}`}
                        >
                          {roleInfo.shortName} ({u.vai_tro})
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {isLocked ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-700 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                            <UserX className="w-3 h-3" />
                            Đã khóa
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            <UserCheck className="w-3 h-3" />
                            Hoạt động
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {/* Sửa thông tin */}
                          <button
                            onClick={() => handleOpenEdit(u)}
                            title="Chỉnh sửa thông tin"
                            className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>

                          {/* Đổi vai trò */}
                          <button
                            onClick={() => handleOpenRoleModal(u)}
                            title="Thay đổi vai trò (Role)"
                            className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 transition-colors"
                          >
                            <Shield className="w-3.5 h-3.5" />
                          </button>

                          {/* Khóa / Mở khóa */}
                          <button
                            onClick={() => handleOpenStatusModal(u)}
                            disabled={isCurrentAdmin && !isLocked}
                            title={
                              isCurrentAdmin && !isLocked
                                ? 'Không thể tự khóa tài khoản của chính mình'
                                : isLocked
                                ? 'Mở khóa tài khoản'
                                : 'Khóa tài khoản'
                            }
                            className={`p-1.5 rounded-lg transition-colors ${
                              isCurrentAdmin && !isLocked
                                ? 'text-gray-300 cursor-not-allowed'
                                : isLocked
                                ? 'text-emerald-600 hover:bg-emerald-50'
                                : 'text-red-500 hover:bg-red-50'
                            }`}
                          >
                            {isLocked ? (
                              <Unlock className="w-3.5 h-3.5" />
                            ) : (
                              <Lock className="w-3.5 h-3.5" />
                            )}
                          </button>

                          {/* Đặt lại mật khẩu */}
                          <button
                            onClick={() => handleOpenResetPass(u)}
                            title="Đặt lại mật khẩu"
                            className="p-1.5 rounded-lg text-purple-600 hover:bg-purple-50 transition-colors"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: THÊM NGƯỜI DÙNG MỚI */}
      {/* ========================================================================= */}
      {createModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-gray-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-may10-primary" />
                <h3 className="font-bold text-base text-gray-900">Thêm Người Dùng Mới</h3>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-5 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Họ và tên cán bộ <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Trần Quốc Tuấn"
                    value={formData.ho_ten}
                    onChange={(e) => setFormData({ ...formData, ho_ten: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl outline-none focus:border-may10-primary focus:ring-2 focus:ring-may10-primary/10"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Email / Tên đăng nhập <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="tuan.tq@may10.vn"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl outline-none focus:border-may10-primary focus:ring-2 focus:ring-may10-primary/10 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Số điện thoại
                  </label>
                  <input
                    type="text"
                    placeholder="0988xxxxxx"
                    value={formData.so_dien_thoai}
                    onChange={(e) => setFormData({ ...formData, so_dien_thoai: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl outline-none focus:border-may10-primary focus:ring-2 focus:ring-may10-primary/10 font-mono"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Phòng ban / Đơn vị công tác
                  </label>
                  <input
                    type="text"
                    placeholder="VD: Phòng Kế Hoạch Sản Xuất"
                    value={formData.phong_ban}
                    onChange={(e) => setFormData({ ...formData, phong_ban: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl outline-none focus:border-may10-primary focus:ring-2 focus:ring-may10-primary/10"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Vai trò hệ thống (Role) <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.vai_tro}
                    onChange={(e) => setFormData({ ...formData, vai_tro: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl outline-none focus:border-may10-primary bg-white text-gray-800"
                  >
                    {Object.entries(ROLE_DETAILS).map(([code, r]) => (
                      <option key={code} value={code}>
                        {r.shortName} - {r.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Trạng thái ban đầu
                  </label>
                  <select
                    value={formData.trang_thai}
                    onChange={(e) => setFormData({ ...formData, trang_thai: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl outline-none focus:border-may10-primary bg-white text-gray-800"
                  >
                    <option value="hoat_dong">Hoạt động</option>
                    <option value="khoa">Khóa tài khoản</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Mật khẩu ban đầu
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Mặc định May10@123 nếu để trống"
                      value={formData.mat_khau}
                      onChange={(e) => setFormData({ ...formData, mat_khau: e.target.value })}
                      className="w-full pl-3 pr-9 py-2 text-xs border border-gray-200 rounded-xl outline-none focus:border-may10-primary focus:ring-2 focus:ring-may10-primary/10 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">
                    Mật khẩu sẽ được mã hóa an toàn theo tiêu chuẩn PBKDF2.
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl bg-may10-primary hover:bg-blue-700 text-white text-xs font-bold shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                >
                  {actionLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Lưu tài khoản</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: CHỈNH SỬA NGƯỜI DÙNG */}
      {/* ========================================================================= */}
      {editModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-gray-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-2">
                <Edit className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-base text-gray-900">
                  Chỉnh Sửa Cán Bộ [{selectedUser.ma_can_bo || `NV-${selectedUser.id}`}]
                </h3>
              </div>
              <button
                onClick={() => setEditModalOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-5 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Họ và tên <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.ho_ten}
                    onChange={(e) => setFormData({ ...formData, ho_ten: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl outline-none focus:border-may10-primary focus:ring-2 focus:ring-may10-primary/10"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Email đăng nhập <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl outline-none focus:border-may10-primary font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Số điện thoại
                  </label>
                  <input
                    type="text"
                    value={formData.so_dien_thoai}
                    onChange={(e) => setFormData({ ...formData, so_dien_thoai: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl outline-none focus:border-may10-primary font-mono"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Phòng ban / Đơn vị
                  </label>
                  <input
                    type="text"
                    value={formData.phong_ban}
                    onChange={(e) => setFormData({ ...formData, phong_ban: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl outline-none focus:border-may10-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Vai trò (Role)
                  </label>
                  <select
                    value={formData.vai_tro}
                    onChange={(e) => setFormData({ ...formData, vai_tro: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl outline-none focus:border-may10-primary bg-white text-gray-800"
                  >
                    {Object.entries(ROLE_DETAILS).map(([code, r]) => (
                      <option key={code} value={code}>
                        {r.shortName} - {r.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Trạng thái
                  </label>
                  <select
                    value={formData.trang_thai}
                    onChange={(e) => setFormData({ ...formData, trang_thai: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl outline-none focus:border-may10-primary bg-white text-gray-800"
                  >
                    <option value="hoat_dong">Hoạt động</option>
                    <option value="khoa">Khóa tài khoản</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                >
                  {actionLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Lưu thay đổi</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: ĐỔI VAI TRÒ NGƯỜI DÙNG */}
      {/* ========================================================================= */}
      {roleModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-gray-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-base text-gray-900">Thay Đổi Vai Trò Phân Hệ</h3>
              </div>
              <button
                onClick={() => setRoleModalOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRoleSubmit} className="p-5 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                <p className="text-xs font-bold text-gray-900">{selectedUser.ho_ten}</p>
                <p className="text-[11px] text-gray-500 font-mono mt-0.5">{selectedUser.email}</p>
                <p className="text-xs text-gray-600 mt-2">
                  Vai trò hiện tại:{' '}
                  <strong className="text-amber-800 font-semibold">{selectedUser.vai_tro}</strong>
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">
                  Chọn vai trò mới:
                </label>
                <div className="space-y-2">
                  {Object.entries(ROLE_DETAILS).map(([code, r]) => (
                    <label
                      key={code}
                      className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                        newRole === code
                          ? 'border-amber-500 bg-amber-50/50 ring-1 ring-amber-500'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="vai_tro"
                        value={code}
                        checked={newRole === code}
                        onChange={(e) => setNewRole(e.target.value)}
                        className="mt-0.5 text-amber-600 focus:ring-amber-500"
                      />
                      <div>
                        <div className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                          <span>{r.name}</span>
                          <span className={`text-[9px] px-1.5 py-0.2 rounded border font-semibold ${r.badgeColor}`}>
                            {code}
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-500 mt-0.5">{r.department}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRoleModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                >
                  {actionLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Xác nhận đổi vai trò</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: XÁC NHẬN KHÓA / MỞ KHÓA TÀI KHOẢN */}
      {/* ========================================================================= */}
      {statusModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-gray-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-2">
                {selectedUser.trang_thai === 'hoat_dong' ? (
                  <Lock className="w-5 h-5 text-red-600" />
                ) : (
                  <Unlock className="w-5 h-5 text-emerald-600" />
                )}
                <h3 className="font-bold text-base text-gray-900">
                  {selectedUser.trang_thai === 'hoat_dong'
                    ? 'Khóa Tài Khoản Người Dùng'
                    : 'Mở Khóa Tài Khoản Người Dùng'}
                </h3>
              </div>
              <button
                onClick={() => setStatusModalOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <p className="text-xs text-gray-600 leading-relaxed">
                {selectedUser.trang_thai === 'hoat_dong' ? (
                  <>
                    Bạn có chắc chắn muốn <strong>KHÓA</strong> tài khoản của cán bộ{' '}
                    <strong className="text-gray-900">{selectedUser.ho_ten}</strong> (
                    <code>{selectedUser.email}</code>)? Sau khi khóa, người dùng này sẽ lập tức bị
                    thu hồi phiên làm việc và không thể đăng nhập vào ERP May 10.
                  </>
                ) : (
                  <>
                    Bạn có chắc chắn muốn <strong>MỞ KHÓA</strong> cho tài khoản của cán bộ{' '}
                    <strong className="text-gray-900">{selectedUser.ho_ten}</strong> (
                    <code>{selectedUser.email}</code>)? Người dùng sẽ có thể đăng nhập bình thường.
                  </>
                )}
              </p>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setStatusModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={handleStatusSubmit}
                  disabled={actionLoading}
                  className={`px-4 py-2 rounded-xl text-white text-xs font-bold shadow-sm disabled:opacity-50 flex items-center gap-1.5 ${
                    selectedUser.trang_thai === 'hoat_dong'
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  {actionLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>
                    {selectedUser.trang_thai === 'hoat_dong'
                      ? 'Xác nhận khóa tài khoản'
                      : 'Xác nhận mở khóa'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: ĐẶT LẠI MẬT KHẨU */}
      {/* ========================================================================= */}
      {resetPassModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-gray-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-purple-600" />
                <h3 className="font-bold text-base text-gray-900">Đặt Lại Mật Khẩu</h3>
              </div>
              <button
                onClick={() => setResetPassModalOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleResetPassSubmit} className="p-5 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                <p className="text-xs font-bold text-gray-900">{selectedUser.ho_ten}</p>
                <p className="text-[11px] text-gray-500 font-mono mt-0.5">{selectedUser.email}</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Mật khẩu mới
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Để trống sẽ tự đặt về mặc định: May10@123"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full pl-3 pr-9 py-2 text-xs border border-gray-200 rounded-xl outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-600/10 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <p className="text-[10px] text-gray-400 mt-1.5 leading-relaxed">
                  Độ dài tối thiểu 6 ký tự. Mật khẩu được mã hóa an toàn trước khi lưu vào CSDL.
                </p>
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setResetPassModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                >
                  {actionLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Xác nhận đổi mật khẩu</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
