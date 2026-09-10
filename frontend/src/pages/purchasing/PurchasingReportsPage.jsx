import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Calendar,
  Building2,
  Package,
  TrendingUp,
  RefreshCw,
  Search,
} from 'lucide-react';
import { getPurchasingReports } from '../../services/purchasingService';

export default function PurchasingReportsPage({ showToast }) {
  const [reportsData, setReportsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const fetchReports = async () => {
    try {
      setLoading(true);
      const res = await getPurchasingReports({
        tu_ngay: fromDate || undefined,
        den_ngay: toDate || undefined,
      });
      setReportsData(res);
    } catch (err) {
      console.error('Lỗi tải báo cáo mua hàng:', err);
      if (showToast) {
        showToast({
          type: 'error',
          message: 'Không thể tải báo cáo phân tích mua hàng.',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    fetchReports();
  };

  const formatCurrency = (num) => {
    if (!num && num !== 0) return '0 ₫';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
  };

  const getMaterialTypeName = (type) => {
    switch (type) {
      case 'vai_chinh':
        return 'Vải chính dệt thoi / dệt kim';
      case 'vai_lot':
        return 'Vải lót cao cấp';
      case 'chi_may':
        return 'Chỉ may công nghiệp';
      case 'cuc_kep':
        return 'Cúc áo & phụ liệu kẹp';
      case 'khoa_keo':
        return 'Khóa kéo';
      case 'phu_lieu':
        return 'Phụ liệu may mặc khác';
      default:
        return type || 'Khác';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-[#E2EDF5] p-12 text-center shadow-xs">
        <RefreshCw className="w-8 h-8 text-[#0F5FAF] animate-spin mx-auto mb-3" />
        <p className="text-sm text-[#5F6F82]">Đang xử lý và tổng hợp báo cáo chi phí...</p>
      </div>
    );
  }

  const bySupplier = reportsData?.bySupplier || [];
  const byMaterialType = reportsData?.byMaterialType || [];
  const monthlyTrend = reportsData?.monthlyTrend || [];

  return (
    <div className="space-y-6">
      {/* Filter Bar */}
      <div className="bg-white rounded-2xl border border-[#E2EDF5] p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <form onSubmit={handleFilterSubmit} className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 font-semibold">Từ ngày:</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="p-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-[#0F5FAF]"
            />
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 font-semibold">Đến ngày:</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="p-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-[#0F5FAF]"
            />
          </div>

          <button
            type="submit"
            className="px-4 py-2 bg-[#0F5FAF] text-white rounded-xl text-xs font-semibold hover:bg-[#0A2540] transition-colors shadow-xs"
          >
            Lọc báo cáo
          </button>
        </form>

        <button
          onClick={() => {
            setFromDate('');
            setToDate('');
            fetchReports();
          }}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-slate-200 bg-white rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 self-end sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Đặt lại</span>
        </button>
      </div>

      {/* Section 1: Chi phí theo Nhà cung cấp */}
      <div className="bg-white rounded-2xl border border-[#E2EDF5] p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-sm font-bold text-[#172033]">
            <Building2 className="w-4 h-4 text-[#0F5FAF]" />
            <span>1. Báo cáo Chi phí Mua hàng theo Nhà Cung Cấp</span>
          </div>
        </div>

        {bySupplier.length === 0 ? (
          <div className="py-8 text-center text-xs text-[#5F6F82]">
            Chưa có dữ liệu
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-[#F4FAFE] text-[#5F6F82]">
                  <th className="py-2.5 px-3 font-semibold">Mã NCC</th>
                  <th className="py-2.5 px-3 font-semibold">Tên Nhà Cung Cấp</th>
                  <th className="py-2.5 px-3 text-right font-semibold">Số đơn mua</th>
                  <th className="py-2.5 px-3 text-right font-semibold">Tổng chi phí đặt</th>
                  <th className="py-2.5 px-3 text-right font-semibold">Đã nhập kho</th>
                  <th className="py-2.5 px-3 text-center font-semibold">Tỷ lệ hoàn tất</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bySupplier.map((item) => {
                  const tongChiPhi = parseFloat(item.tong_chi_phi) || 0;
                  const chiPhiDaNhap = parseFloat(item.chi_phi_da_nhap) || 0;
                  const percent = tongChiPhi > 0 ? Math.min(100, Math.round((chiPhiDaNhap / tongChiPhi) * 100)) : 0;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3 font-bold text-[#0F5FAF]">
                        {item.ma_nha_cung_cap}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-[#172033]">
                        {item.ten_nha_cung_cap}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-[#172033]">
                        {item.so_don_mua}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-[#172033]">
                        {formatCurrency(tongChiPhi)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-emerald-700">
                        {formatCurrency(chiPhiDaNhap)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {percent}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Section 2: Chi phí theo Nhóm Vật Tư */}
      <div className="bg-white rounded-2xl border border-[#E2EDF5] p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-sm font-bold text-[#172033]">
            <Package className="w-4 h-4 text-[#0F5FAF]" />
            <span>2. Báo cáo Cơ cấu Mua hàng theo Loại Vật Tư May Mặc</span>
          </div>
        </div>

        {byMaterialType.length === 0 ? (
          <div className="py-8 text-center text-xs text-[#5F6F82]">
            Chưa có dữ liệu
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-[#F4FAFE] text-[#5F6F82]">
                  <th className="py-2.5 px-3 font-semibold">Loại vật tư</th>
                  <th className="py-2.5 px-3 text-right font-semibold">Số đơn phát sinh</th>
                  <th className="py-2.5 px-3 text-right font-semibold">Tổng khối lượng đặt</th>
                  <th className="py-2.5 px-3 text-right font-semibold">Tổng giá trị mua</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {byMaterialType.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-[#172033]">
                      {getMaterialTypeName(item.loai_vat_tu)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-700">
                      {item.so_don_mua} đơn
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold text-slate-800">
                      {parseFloat(item.tong_so_luong || 0).toLocaleString('vi-VN')}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-[#0F5FAF]">
                      {formatCurrency(item.tong_tien)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Section 3: Xu hướng thực hiện theo tháng */}
      <div className="bg-white rounded-2xl border border-[#E2EDF5] p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-sm font-bold text-[#172033]">
            <TrendingUp className="w-4 h-4 text-[#0F5FAF]" />
            <span>3. Xu hướng Mua hàng theo Tháng (6 tháng gần nhất)</span>
          </div>
        </div>

        {monthlyTrend.length === 0 ? (
          <div className="py-8 text-center text-xs text-[#5F6F82]">
            Chưa có dữ liệu
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-[#F4FAFE] text-[#5F6F82]">
                  <th className="py-2.5 px-3 font-semibold">Kỳ (Năm - Tháng)</th>
                  <th className="py-2.5 px-3 text-right font-semibold">Số lượng đơn mua</th>
                  <th className="py-2.5 px-3 text-right font-semibold">Tổng giá trị mua sắm</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {monthlyTrend.map((m, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-[#0F5FAF]">
                      Tháng {m.thang}
                    </td>
                    <td className="py-2.5 px-3 text-right font-medium text-slate-700">
                      {m.so_don} đơn
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-[#172033]">
                      {formatCurrency(m.gia_tri)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
