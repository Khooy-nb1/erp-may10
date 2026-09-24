import React, { useState, useEffect } from 'react';
import { Users as UsersIcon, ShieldCheck, Mail, Building2, UserCheck, RefreshCw } from 'lucide-react';
import portalService from '../../services/portalService';
import { ROLE_DETAILS } from '../../config/roles';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await portalService.getUsers();
      setUsers(data);
    } catch (err) {
      console.warn('Lỗi lấy danh sách người dùng:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <UsersIcon className="w-5 h-5 text-may10-primary" />
            <h1 className="text-lg sm:text-xl font-black text-gray-900">
              QUẢN TRỊ NGƯỜI DÙNG HỆ THỐNG ERP MAY 10
            </h1>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Danh sách cán bộ công nhân viên được cấp tài khoản truy cập hệ thống (PostgreSQL: <code>nguoi_dung</code>).
          </p>
        </div>

        <button
          onClick={fetchUsers}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 bg-gray-50 hover:bg-gray-100 transition-colors self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Làm mới danh sách</span>
        </button>
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
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-400">
                    Đang tải dữ liệu người dùng...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-400">
                    Không có tài khoản nào được tìm thấy.
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const roleInfo = ROLE_DETAILS[u.vai_tro] || ROLE_DETAILS.kho;
                  return (
                    <tr key={u.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-gray-900">
                        NV-{String(u.id).padStart(4, '0')}
                      </td>
                      <td className="py-3 px-4 font-bold text-gray-900">
                        {u.ho_ten}
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        <div>{u.email || `${u.ten_dang_nhap}@may10.com.vn`}</div>
                        <span className="text-[10px] font-mono text-gray-400">
                          user: {u.ten_dang_nhap}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-700">
                        <span className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-gray-400" />
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
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <UserCheck className="w-3 h-3" />
                          Hoạt động
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
