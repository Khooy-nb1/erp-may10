import React from 'react';
import { ShieldCheck, Users, KeyRound, CheckCircle2 } from 'lucide-react';
import { ROLE_DETAILS } from '../../config/roles';
import { ROLE_PERMISSIONS } from '../../config/permissions';

export default function Roles() {
  const rolesList = Object.values(ROLE_DETAILS);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-may10-primary" />
          <h1 className="text-lg sm:text-xl font-black text-gray-900">
            DANH MỤC VAI TRÒ DOANH NGHIỆP (ENTERPRISE ROLES)
          </h1>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Hệ thống 6 nhóm vai trò nghiệp vụ được thiết lập chuẩn theo cơ cấu tổ chức Tổng Công ty May 10.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {rolesList.map((r) => {
          const perms = ROLE_PERMISSIONS[r.code] || [];
          return (
            <div
              key={r.code}
              className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${r.badgeColor}`}>
                    {r.shortName}
                  </span>
                  <span className="text-[10px] font-mono text-gray-400 font-semibold">
                    code: {r.code}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-gray-900 leading-snug">
                  {r.name}
                </h3>
                <p className="text-xs text-may10-primary font-medium mt-0.5">
                  {r.department}
                </p>

                <p className="text-xs text-gray-500 mt-3 leading-relaxed">
                  {r.description}
                </p>
              </div>

              <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <KeyRound className="w-3.5 h-3.5 text-gray-400" />
                  <strong>{perms.length}</strong> quyền hạn
                </span>
                <span className="text-[11px] font-mono text-gray-400">
                  User mặc định: #{r.defaultUserId}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
