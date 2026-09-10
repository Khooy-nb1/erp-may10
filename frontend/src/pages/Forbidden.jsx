import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Home, KeyRound, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../components/rbac/AuthContext';
import { DEMO_ACCOUNTS } from '../config/roles';

export default function Forbidden() {
  const { role, roleMeta, switchRole } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const requiredPermission = location.state?.requiredPermission || 'Quyền hạn phân hệ đặc thù';
  const moduleName = location.state?.moduleName || 'Phân hệ yêu cầu';

  const handleRoleSwitch = (newRoleCode) => {
    switchRole(newRoleCode);
    navigate('/');
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center py-12 px-4">
      <div className="max-w-lg w-full bg-white rounded-2xl shadow-xl border border-gray-200 p-6 sm:p-8 text-center">
        {/* Icon */}
        <div className="mx-auto w-16 h-16 bg-red-100 text-may10-primary rounded-full flex items-center justify-center mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>

        {/* Status Code */}
        <span className="text-xs font-mono font-black text-red-600 bg-red-50 px-2.5 py-1 rounded-full border border-red-200 uppercase">
          MÃ LỖI 403 — TRUY CẬP BỊ TỪ CHỐI
        </span>

        {/* Title & Message */}
        <h1 className="text-xl sm:text-2xl font-black text-gray-900 mt-3">
          Không Đủ Quyền Hạn Truy Cập
        </h1>
        <p className="text-xs sm:text-sm text-gray-600 mt-2 leading-relaxed">
          Tài khoản của đồng chí đang đăng nhập với vai trò{' '}
          <strong className="text-gray-900">{roleMeta?.name || 'Người dùng'} ({role || 'chưa xác định'})</strong>, không có đặc quyền{' '}
          <code className="bg-gray-100 px-1.5 py-0.5 rounded text-red-700 font-bold">{requiredPermission}</code>{' '}
          để thực hiện thao tác trên <strong>{moduleName}</strong>.
        </p>

        {/* Resolution Options */}
        <div className="mt-6 p-4 rounded-xl bg-gray-50 border border-gray-200 text-left text-xs text-gray-600 space-y-2">
          <div className="font-bold text-gray-800 flex items-center gap-1.5">
            <KeyRound className="w-3.5 h-3.5 text-may10-primary" />
            <span>Phương án xử lý:</span>
          </div>
          <ul className="list-disc list-inside space-y-1 text-gray-500 pl-1">
            <li>Liên hệ Phòng CNTT May 10 để được cấp quyền theo chức danh.</li>
            <li>Hoặc chuyển đổi nhanh sang vai trò được cấp quyền dưới đây để kiểm thử:</li>
          </ul>

          {/* Quick switch to Admin or other roles */}
          <div className="pt-2 flex flex-wrap gap-1.5">
            {DEMO_ACCOUNTS.map((acc) => (
              <button
                key={acc.code}
                onClick={() => handleRoleSwitch(acc.code)}
                className={`px-2 py-1 rounded text-[11px] font-medium border transition-colors ${
                  acc.code === 'admin'
                    ? 'bg-red-600 text-white border-red-700 font-bold hover:bg-red-700'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                }`}
              >
                Đổi sang {acc.shortName}
              </button>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quay lại trang trước</span>
          </button>

          <Link
            to="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-5 py-2 rounded-xl bg-may10-primary text-white text-xs font-bold hover:bg-may10-600 transition-colors shadow-sm"
          >
            <Home className="w-4 h-4" />
            <span>Về Trang Chủ Portal</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
