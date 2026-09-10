import React, { useState, useEffect } from 'react';
import { BarChart3, ArrowUpRight, ArrowDownLeft, Package, AlertTriangle } from 'lucide-react';
import portalService from '../../services/portalService';

export default function ActivityChart() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await portalService.getDashboardSummary();
        setSummary(data?.inventory || null);
      } catch (err) {
        console.warn('Lỗi tải thống kê giao dịch:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-[#DCEAF4] p-5 shadow-2xs mb-5 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/4 mb-4" />
        <div className="h-20 bg-gray-100 rounded" />
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-2xs mb-5 text-center text-xs text-gray-400">
        Chưa có dữ liệu để hiển thị
      </div>
    );
  }

  const nhap = summary.soPhieuNhap || 0;
  const xuat = summary.soPhieuXuat || 0;
  const matHang = summary.soMatHangTon || 0;
  const canhBao = summary.canhBaoThap || 0;
  const total = nhap + xuat;

  const pctNhap = total > 0 ? ((nhap / total) * 100).toFixed(1) : 0;
  const pctXuat = total > 0 ? ((xuat / total) * 100).toFixed(1) : 0;

  const operations = [
    {
      label: 'Chứng từ Nhập kho (PNK)',
      count: nhap,
      pct: pctNhap,
      color: 'bg-emerald-600',
      textColor: 'text-emerald-700',
      icon: ArrowDownLeft,
    },
    {
      label: 'Chứng từ Xuất kho (PXK)',
      count: xuat,
      pct: pctXuat,
      color: 'bg-blue-600',
      textColor: 'text-blue-700',
      icon: ArrowUpRight,
    },
    {
      label: 'Mặt hàng đang lưu kho',
      count: matHang,
      pct: null,
      color: 'bg-purple-600',
      textColor: 'text-purple-700',
      icon: Package,
    },
    {
      label: 'Vật tư chạm ngưỡng tối thiểu',
      count: canhBao,
      pct: null,
      color: 'bg-amber-600',
      textColor: 'text-amber-700',
      icon: AlertTriangle,
    },
  ];

  return (
    <div className="bg-white rounded-xl border border-[#DCEAF4] p-5 sm:p-6 shadow-2xs mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#DCEAF4] gap-2 mb-3.5">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#172033] flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[#0F5FAF]" />
            <span>Hoạt động vận hành</span>
            <span className="text-[10px] font-normal text-[#6B7785] lowercase">(operations overview)</span>
          </h2>
          <p className="text-xs text-[#6B7785] mt-0.5">
            Cơ cấu luân chuyển chứng từ và hiện trạng vật tư tại hệ thống kho May 10 (Tổng: {total} chứng từ nhập/xuất)
          </p>
        </div>
        <span className="text-[11px] text-[#6B7785] font-mono">
          Dữ liệu ghi nhận thực tế
        </span>
      </div>

      {/* Segmented Bar for Nhap/Xuat */}
      {total > 0 && (
        <div className="w-full h-2.5 bg-[#F4FAFE] rounded-full overflow-hidden flex mb-4 border border-[#DCEAF4]/70">
          <div
            className="bg-[#16A878] h-full transition-all duration-300"
            style={{ width: `${pctNhap}%` }}
            title={`Nhập kho: ${nhap} (${pctNhap}%)`}
          />
          <div
            className="bg-[#0F5FAF] h-full transition-all duration-300"
            style={{ width: `${pctXuat}%` }}
            title={`Xuất kho: ${xuat} (${pctXuat}%)`}
          />
        </div>
      )}

      {/* Grid of details */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {operations.map((op, idx) => {
          const Icon = op.icon;

          return (
            <div key={idx} className="p-3.5 rounded-xl border border-[#DCEAF4] bg-[#F9FBFC] hover:bg-[#F4FAFE] transition-colors">
              <div className="flex items-center gap-1.5 text-xs text-[#6B7785] mb-1">
                <span className={`w-2 h-2 rounded-full ${op.color}`} />
                <span className="truncate text-[11px] font-medium">{op.label}</span>
              </div>
              <div className="text-base font-bold text-[#172033] mt-0.5">
                {op.count} <span className="text-xs font-normal text-[#6B7785]">mục</span>
              </div>
              <div className="text-[10px] text-[#6B7785] mt-0.5">
                {op.pct !== null ? `${op.pct}% tổng chứng từ` : 'Trạng thái hiện hành'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

