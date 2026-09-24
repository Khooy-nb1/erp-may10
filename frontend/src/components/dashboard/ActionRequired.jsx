import React from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  AlertTriangle,
  Clock,
  ArrowRight,
  PackageCheck,
  FileCheck,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../rbac/AuthContext';

export default function ActionRequired() {
  const { role } = useAuth();

  // Role-based operational tasks strictly preserved
  const getTasks = () => {
    switch (role) {
      case 'kho':
      case 'admin':
        return [
          {
            id: 'task-low-stock',
            title: 'Vật tư dưới mức tồn tối thiểu',
            desc: '3 mặt hàng (Vải Kate Lụa, Vải Chiffon) cần bổ sung khẩn cấp theo cảnh báo kho.',
            severity: 'Cao',
            badgeColor: 'bg-red-50 text-red-700 border-red-200',
            dotColor: 'bg-red-500',
            actionLabel: 'Xem tồn kho',
            actionLink: '/warehouse?tab=ton-kho',
            icon: AlertTriangle,
          },
          {
            id: 'task-receipt',
            title: 'Phiếu nhập chờ xử lý',
            desc: 'Theo dõi phiếu nhập nguyên phụ liệu và đối soát số lượng thực nhận tại cổng kho.',
            severity: 'Chờ xử lý',
            badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
            dotColor: 'bg-amber-500',
            actionLabel: 'Xem phiếu nhập',
            actionLink: '/warehouse?tab=phieu-nhap',
            icon: PackageCheck,
          },
          {
            id: 'task-stocktake',
            title: 'Kiểm kê cần thực hiện',
            desc: 'Kiểm kê định kỳ tháng đối chiếu số dư sổ sách và tồn thực tế trên thẻ kho May 10.',
            severity: 'Định kỳ',
            badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
            dotColor: 'bg-blue-500',
            actionLabel: 'Xem kiểm kê',
            actionLink: '/warehouse?tab=kiem-ke',
            icon: FileCheck,
          },
        ];

      case 'san_xuat':
        return [
          {
            id: 'task-prod-due',
            title: 'Lệnh sản xuất sắp đến hạn',
            desc: 'Kế hoạch chuyền may đơn hàng áo sơ mi xuất khẩu cần rà soát tiến độ gia công.',
            severity: 'Cao',
            badgeColor: 'bg-red-50 text-red-700 border-red-200',
            dotColor: 'bg-red-500',
            actionLabel: 'Xem sản xuất',
            actionLink: '/production',
            icon: Clock,
          },
          {
            id: 'task-prod-issue',
            title: 'Vật tư cần cấp',
            desc: 'Yêu cầu xuất kho cấp phát nguyên phụ liệu (vải, chỉ, cúc) cho phân xưởng may.',
            severity: 'Chờ cấp',
            badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
            dotColor: 'bg-amber-500',
            actionLabel: 'Xem kho',
            actionLink: '/warehouse?tab=phieu-xuat',
            icon: AlertCircle,
          },
        ];

      case 'mua_hang':
        return [
          {
            id: 'task-po-pending',
            title: 'Đơn mua hàng chờ xử lý',
            desc: 'Đơn mua nguyên phụ liệu từ nhà cung cấp dệt may cần hoàn tất thủ tục giao nhận.',
            severity: 'Chờ duyệt',
            badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
            dotColor: 'bg-amber-500',
            actionLabel: 'Xem mua hàng',
            actionLink: '/purchasing',
            icon: PackageCheck,
          },
        ];

      case 'ke_toan':
        return [
          {
            id: 'task-debt-due',
            title: 'Công nợ đến hạn',
            desc: 'Rà soát công nợ nhà cung cấp và chứng từ kho phát sinh chờ đối soát định khoản.',
            severity: 'Cao',
            badgeColor: 'bg-red-50 text-red-700 border-red-200',
            dotColor: 'bg-red-500',
            actionLabel: 'Xem công nợ',
            actionLink: '/accounting',
            icon: AlertCircle,
          },
        ];

      case 'ban_hang':
        return [
          {
            id: 'task-sales-check',
            title: 'Đơn hàng bán chờ xác nhận khả dụng kho',
            desc: 'Kiểm tra tồn kho thực tế vải và phụ liệu để cam kết tiến độ giao hàng cho khách hàng.',
            severity: 'Cần kiểm tra',
            badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
            dotColor: 'bg-blue-500',
            actionLabel: 'Xem tồn kho',
            actionLink: '/warehouse?tab=ton-kho',
            icon: Clock,
          },
        ];

      default:
        return [];
    }
  };

  const tasks = getTasks();

  return (
    <div className="bg-white rounded-2xl border border-[#E2EDF5] p-4 sm:p-5 shadow-xs">
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#EBF2F7]">
        <div className="flex items-center gap-2.5">
          <h2 className="text-xs sm:text-sm font-bold text-[#172033] uppercase tracking-wide">
            Công việc cần xử lý
          </h2>
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#EAF5FC] text-[#0F5FAF] border border-[#DCEAF4]">
            {tasks.length} việc
          </span>
        </div>
        <span className="text-[11px] text-[#8DA0B3] hidden sm:inline">
          Ưu tiên theo vai trò của bạn
        </span>
      </div>

      {tasks.length === 0 ? (
        <div className="py-6 text-center text-xs text-[#6B7785] flex items-center justify-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[#16A878]" />
          <span>Hiện không có công việc tồn đọng cần xử lý.</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
          {tasks.map((task) => {
            const Icon = task.icon;

            return (
              <div
                key={task.id}
                className="p-3.5 sm:p-4 rounded-xl border border-[#E2EDF5] bg-[#F9FBFC] hover:bg-[#F4FAFE] hover:border-[#96C8EB] transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-white border border-[#DCEAF4] text-[#0F5FAF] flex-shrink-0 shadow-2xs">
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className={`w-2 h-2 rounded-full ${task.dotColor} flex-shrink-0`} />
                    </div>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${task.badgeColor}`}
                    >
                      {task.severity}
                    </span>
                  </div>

                  <h3 className="text-xs font-bold text-[#172033] leading-snug group-hover:text-[#0F5FAF] transition-colors">
                    {task.title}
                  </h3>

                  <p className="text-[11px] text-[#5F6F82] mt-1 leading-normal line-clamp-2">
                    {task.desc}
                  </p>
                </div>

                <div className="mt-3.5 pt-2.5 border-t border-[#DCEAF4]/60">
                  <Link
                    to={task.actionLink}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0F5FAF] hover:text-[#0B4A8F] transition-colors"
                  >
                    <span>{task.actionLabel}</span>
                    <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
