import React from 'react';
import { KeyRound, Shield, Check, X, Info } from 'lucide-react';
import { PERMISSION_GROUPS, ROLE_PERMISSIONS } from '../../config/permissions';
import { ROLE_DETAILS } from '../../config/roles';
import { useAuth } from '../../components/rbac/AuthContext';

export default function Permissions() {
  const { role: currentActiveRole } = useAuth();
  const roles = Object.values(ROLE_DETAILS);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-may10-primary" />
            <h1 className="text-lg sm:text-xl font-black text-gray-900">
              MA TRẬN PHÂN QUYỀN TRUY CẬP (RBAC MATRIX)
            </h1>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Bảng ma trận đối chiếu quyền hạn chi tiết giữa các vai trò trên 5 phân hệ ERP May 10.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs bg-red-50 px-3 py-2 rounded-xl border border-red-100 text-may10-primary font-medium">
          <Info className="w-4 h-4 flex-shrink-0" />
          <span>Cột có viền đỏ hiển thị vai trò hiện hành của đồng chí.</span>
        </div>
      </div>

      {/* Permissions Matrix Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-600 border-collapse">
            <thead className="bg-gray-50 text-gray-700 uppercase font-bold text-[10px] tracking-wider border-b border-gray-200">
              <tr>
                <th className="py-3 px-4 w-1/3">Quyền hạn & Nghiệp vụ</th>
                {roles.map((r) => {
                  const isCurrent = r.code === currentActiveRole;
                  return (
                    <th
                      key={r.code}
                      className={`py-3 px-3 text-center border-l border-gray-200 ${
                        isCurrent ? 'bg-red-50/80 text-may10-primary' : ''
                      }`}
                    >
                      <div className="truncate">{r.shortName}</div>
                      <div className="text-[9px] font-mono font-normal lowercase text-gray-400">
                        {r.code}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {PERMISSION_GROUPS.map((group) => (
                <React.Fragment key={group.code}>
                  {/* Module Group Separator */}
                  <tr className="bg-gray-100/70">
                    <td
                      colSpan={roles.length + 1}
                      className="py-2 px-4 font-black text-[11px] text-gray-800 tracking-wider uppercase"
                    >
                      {group.name}
                    </td>
                  </tr>

                  {/* Permission Rows */}
                  {group.permissions.map((perm) => (
                    <tr key={perm.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="py-2.5 px-4">
                        <div className="font-bold text-gray-900">{perm.name}</div>
                        <div className="text-[10px] text-gray-400 font-mono mt-0.5">
                          {perm.id} • {perm.description}
                        </div>
                      </td>

                      {roles.map((r) => {
                        const isCurrent = r.code === currentActiveRole;
                        const rolePerms = ROLE_PERMISSIONS[r.code] || [];
                        const hasPerm = r.code === 'admin' || rolePerms.includes(perm.id);

                        return (
                          <td
                            key={r.code}
                            className={`py-2.5 px-3 text-center border-l border-gray-100 ${
                              isCurrent ? 'bg-red-50/30' : ''
                            }`}
                          >
                            {hasPerm ? (
                              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-700">
                                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                              </span>
                            ) : (
                              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-100 text-gray-300">
                                <X className="w-3 h-3 stroke-[1.5]" />
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
