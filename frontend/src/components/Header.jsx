import React from 'react';
import { User, ShieldAlert, CheckCircle2, RefreshCw } from 'lucide-react';

const USER_ROLES = [
  { id: '1', role: 'kho', name: 'Nguyễn Văn Kho (Thủ kho)' },
  { id: '2', role: 'admin', name: 'Trần Quản Trị (Admin hệ thống)' },
  { id: '3', role: 'ke_toan', name: 'Lê Kế Toán (Kế toán kho)' },
  { id: '4', role: 'san_xuat', name: 'Phạm Sản Xuất (Quản đốc xưởng)' },
];

export default function Header({ currentTab, onRefresh, role, setRole, userId, setUserId }) {
  const handleUserChange = (e) => {
    const selected = USER_ROLES.find((u) => u.id === e.target.value);
    if (selected) {
      setUserId(selected.id);
      setRole(selected.role);
      localStorage.setItem('erp_user_id', selected.id);
      localStorage.setItem('erp_role', selected.role);
    }
  };

  const getTabTitle = () => {
    switch (currentTab) {
      case 'dashboard':
        return 'Bảng điều khiển & Thống kê Tồn kho';
      case 'ton-kho':
        return 'Tra cứu Tồn kho & Sổ thẻ kho';
      case 'vi-tri':
        return 'Quản lý Vị trí lưu kho (Kệ / Ô / Tầng)';
      case 'lo-vat-tu':
        return 'Quản lý Lô vật tư, Cây vải & Hạn dùng';
      case 'phieu-nhap':
        return 'Quản lý Phiếu Nhập kho (Mua hàng / Sản xuất)';
      case 'phieu-xuat':
        return 'Quản lý Phiếu Xuất kho (Giao khách / Xưởng may)';
      case 'phieu-chuyen':
        return 'Quản lý Phiếu Chuyển kho nội bộ';
      case 'kiem-ke':
        return 'Phiếu Kiểm kê & Điều chỉnh cân đối kho';
      default:
        return 'Hệ thống Quản lý Kho May 10';
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 fixed top-0 right-0 left-64 z-10 flex items-center justify-between px-6 shadow-sm">
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-bold text-slate-800">{getTabTitle()}</h2>
      </div>

      <div className="flex items-center gap-4">
        {/* Refresh Button */}
        {onRefresh && (
          <button
            onClick={onRefresh}
            title="Làm mới dữ liệu"
            className="p-2 rounded-lg text-slate-500 hover:text-may10-600 hover:bg-slate-100 transition"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        )}

        {/* RBAC Role Selector */}
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs">
          <User className="w-3.5 h-3.5 text-may10-600" />
          <span className="text-slate-500 font-medium">Người dùng (RBAC):</span>
          <select
            value={userId}
            onChange={handleUserChange}
            className="bg-transparent font-semibold text-slate-800 outline-none cursor-pointer"
          >
            {USER_ROLES.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>

        {/* Role badge */}
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
          <CheckCircle2 className="w-3 h-3" />
          Role: {role.toUpperCase()}
        </span>
      </div>
    </header>
  );
}
