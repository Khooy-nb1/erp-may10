import React, { useEffect, useState } from 'react';
import { getDashboardStats } from '../services/api';
import {
  Boxes,
  DollarSign,
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  Warehouse,
  TrendingUp,
  Package,
  Lock,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../components/rbac/AuthContext';

export default function DashboardPage({ showToast }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const authContext = useAuth ? useAuth() : null;
  const logout = authContext?.logout;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getDashboardStats();
      setStats(data);
    } catch (err) {
      setError(err);
      showToast({ type: 'error', message: err.message || 'Không thể tải số liệu Dashboard' });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);
  };

  const formatNumber = (val) => {
    return new Intl.NumberFormat('vi-VN').format(val || 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0F5FAF]"></div>
      </div>
    );
  }

  if (!stats) {
    const isAuthError =
      error &&
      (error.response?.status === 401 ||
        error.status === 401 ||
        error.message?.includes('401') ||
        error.message?.includes('hết hạn') ||
        error.message?.includes('Phiên đăng nhập'));

    if (isAuthError) {
      return (
        <div className="bg-white rounded-2xl border border-[#E2EDF5] p-8 text-center max-w-md mx-auto my-8 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4 border border-amber-200">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-[#172033] mb-1">
            Phiên đăng nhập đã hết hạn
          </h3>
          <p className="text-xs sm:text-sm text-[#5F6F82] mb-5">
            Vui lòng đăng nhập lại để tiếp tục.
          </p>
          <button
            onClick={() => {
              if (logout) logout();
              window.location.href = '/login';
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0F5FAF] hover:bg-[#0D4E90] text-white text-xs sm:text-sm font-semibold transition-colors shadow-sm"
          >
            <span>Đăng nhập lại</span>
          </button>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-2xl border border-[#E2EDF5] p-8 text-center max-w-md mx-auto my-8 shadow-sm">
        <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4 border border-red-200">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-[#172033] mb-1">
          Không thể tải số liệu Dashboard
        </h3>
        <p className="text-xs sm:text-sm text-[#5F6F82] mb-5">
          {error?.message || 'Đã xảy ra lỗi khi kết nối máy chủ.'}
        </p>
        <button
          onClick={loadData}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0F5FAF] hover:bg-[#0D4E90] text-white text-xs sm:text-sm font-semibold transition-colors shadow-sm"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Tải lại</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 4 Core V2.11 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Tổng giá trị tồn kho */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#E2EDF5] shadow-sm hover:border-[#96C8EB] transition-all flex flex-col justify-between min-h-[140px]">
          <div>
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#EAF5FC] text-[#0F5FAF] flex items-center justify-center flex-shrink-0">
                <DollarSign className="w-4 h-4 text-[#0F5FAF]" />
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                Thời gian thực
              </span>
            </div>
            <div className="text-xs font-medium text-[#5F6F82]">
              Tổng giá trị tồn kho
            </div>
            <div className="text-xl sm:text-2xl font-bold text-[#172033] mt-1 tracking-tight truncate">
              {formatCurrency(stats.tongGiaTriTonKho)}
            </div>
          </div>
          <div className="text-[11px] text-[#8DA0B3] mt-3 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
            <span className="truncate">Toàn bộ hệ thống kho May 10</span>
          </div>
        </div>

        {/* Card 2: Mặt hàng đang tồn */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#E2EDF5] shadow-sm hover:border-[#96C8EB] transition-all flex flex-col justify-between min-h-[140px]">
          <div>
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#EAF5FC] text-[#0F5FAF] flex items-center justify-center flex-shrink-0">
                <Boxes className="w-4 h-4 text-[#0F5FAF]" />
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                Danh mục
              </span>
            </div>
            <div className="text-xs font-medium text-[#5F6F82]">
              Mặt hàng có tồn kho
            </div>
            <div className="text-xl sm:text-2xl font-bold text-[#172033] mt-1 tracking-tight truncate">
              {formatNumber(stats.tongSoMatHangTon)} <span className="text-xs font-normal text-[#5F6F82]">mặt hàng</span>
            </div>
          </div>
          <div className="text-[11px] text-[#8DA0B3] mt-3 truncate">
            Vải chính, vải lót, chỉ may, cúc & phụ liệu
          </div>
        </div>

        {/* Card 3: Cảnh báo dưới định mức */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#E2EDF5] shadow-sm hover:border-[#96C8EB] transition-all flex flex-col justify-between min-h-[140px]">
          <div>
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                Cần bổ sung
              </span>
            </div>
            <div className="text-xs font-medium text-[#5F6F82]">
              Cảnh báo thiếu hụt
            </div>
            <div className="text-xl sm:text-2xl font-bold text-amber-600 mt-1 tracking-tight truncate">
              {formatNumber(stats.soMatHangCanhBao)} <span className="text-xs font-normal text-[#5F6F82]">mặt hàng</span>
            </div>
          </div>
          <div className="text-[11px] text-amber-600 font-medium mt-3 truncate">
            Tồn kho chạm hoặc dưới mức tối thiểu
          </div>
        </div>

        {/* Card 4: Nhập/Xuất trong tháng */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#E2EDF5] shadow-sm hover:border-[#96C8EB] transition-all flex flex-col justify-between min-h-[140px]">
          <div>
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#EAF5FC] text-[#0F5FAF] flex items-center justify-center flex-shrink-0">
                <Package className="w-4 h-4 text-[#0F5FAF]" />
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                Hoạt động
              </span>
            </div>
            <div className="text-xs font-medium text-[#5F6F82]">
              Giao dịch kho tháng này
            </div>
            <div className="mt-1 flex items-center gap-2.5 text-base sm:text-lg font-bold">
              <span className="text-emerald-700 flex items-center gap-1">
                <ArrowDownToLine className="w-3.5 h-3.5" /> {stats.phieuNhapTrongThang?.soLuong || 0} nhập
              </span>
              <span className="text-slate-300">|</span>
              <span className="text-[#0F5FAF] flex items-center gap-1">
                <ArrowUpFromLine className="w-3.5 h-3.5" /> {stats.phieuXuatTrongThang?.soLuong || 0} xuất
              </span>
            </div>
          </div>
          <div className="text-[11px] text-[#8DA0B3] mt-3 truncate">
            Tổng 2 chiều biến động kho hàng
          </div>
        </div>
      </div>

      {/* Grid 2 Columns: Phân bổ theo kho & Top vật tư giá trị lớn */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Phân bổ theo từng kho */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-[#E2EDF5] shadow-sm">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#EBF2F7]">
            <h4 className="text-xs sm:text-sm font-bold text-[#172033] uppercase tracking-wide flex items-center gap-2">
              <Warehouse className="w-4 h-4 text-[#0F5FAF]" />
              <span>Cơ cấu Tồn kho theo Nhà kho May 10</span>
            </h4>
            <span className="text-[11px] text-[#8DA0B3]">
              {stats.phanBoTheoKho?.length || 0} nhà kho
            </span>
          </div>
          <div className="space-y-3">
            {stats.phanBoTheoKho?.map((item, idx) => (
              <div
                key={idx}
                className="border border-[#E2EDF5] rounded-xl p-3.5 bg-[#F9FBFC] hover:bg-[#F4FAFE] transition-colors"
              >
                <div className="flex items-center justify-between text-xs sm:text-sm font-semibold text-[#172033] mb-1">
                  <span>{item.ten_kho}</span>
                  <span className="text-[#0F5FAF] font-bold">{formatCurrency(item.gia_tri_kho)}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-[#5F6F82]">
                  <span>Số loại vật tư lưu kho:</span>
                  <span className="font-semibold text-[#172033]">{item.so_loai_vt} loại</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top 5 vật tư giá trị cao nhất */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-[#E2EDF5] shadow-sm">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#EBF2F7]">
            <h4 className="text-xs sm:text-sm font-bold text-[#172033] uppercase tracking-wide flex items-center gap-2">
              <Boxes className="w-4 h-4 text-[#0F5FAF]" />
              <span>Top Vật tư có Giá trị Tồn kho cao nhất</span>
            </h4>
            <span className="text-[11px] text-[#8DA0B3]">
              Theo giá trị sổ kho
            </span>
          </div>
          <div className="overflow-x-auto rounded-xl border border-[#E2EDF5]">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-[#F7FAFC] text-[#5F6F82] text-[11px] font-semibold uppercase tracking-wider border-b border-[#E2EDF5]">
                <tr>
                  <th className="py-2.5 px-3.5">Vật tư</th>
                  <th className="py-2.5 px-3.5 text-right">Tổng tồn</th>
                  <th className="py-2.5 px-3.5 text-right">Giá trị</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2EDF5]">
                {stats.topVatTuGiaTriCao?.map((vt, idx) => (
                  <tr key={idx} className="hover:bg-[#F9FBFC] transition-colors">
                    <td className="py-3 px-3.5">
                      <p className="font-semibold text-[#172033]">{vt.ten_vat_tu}</p>
                      <p className="text-[11px] text-[#8DA0B3]">{vt.ma_vat_tu}</p>
                    </td>
                    <td className="py-3 px-3.5 text-right font-medium text-[#172033]">
                      {formatNumber(vt.tong_ton)} {vt.ten_dvt}
                    </td>
                    <td className="py-3 px-3.5 text-right font-bold text-[#0F5FAF]">
                      {formatCurrency(vt.tong_gia_tri)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
