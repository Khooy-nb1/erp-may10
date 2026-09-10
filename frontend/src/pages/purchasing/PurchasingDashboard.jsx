import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ShoppingCart,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Building2,
  DollarSign,
  TrendingUp,
  ArrowRight,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { getPurchasingDashboard } from '../../services/purchasingService';

export default function PurchasingDashboard({ showToast, onNavigateTab }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await getPurchasingDashboard();
      setData(res);
    } catch (err) {
      console.error('Lỗi tải dữ liệu Dashboard mua hàng:', err);
      if (showToast) {
        showToast({
          type: 'error',
          message: 'Không thể tải số liệu Dashboard mua hàng.',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const formatCurrency = (num) => {
    if (!num && num !== 0) return '0 ₫';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('vi-VN');
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'cho_duyet':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
            Chờ duyệt
          </span>
        );
      case 'da_gui_ncc':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
            Đã gửi NCC
          </span>
        );
      case 'da_xac_nhan':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
            NCC xác nhận
          </span>
        );
      case 'dang_giao':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
            Đang giao
          </span>
        );
      case 'da_nhap_kho':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            Đã nhập kho
          </span>
        );
      case 'huy':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
            Đã hủy
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-50 text-slate-700 border border-slate-200">
            {status}
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-[#E2EDF5] p-12 text-center shadow-xs">
        <RefreshCw className="w-8 h-8 text-[#0F5FAF] animate-spin mx-auto mb-3" />
        <p className="text-sm font-medium text-[#5F6F82]">Đang tải dữ liệu điều hành Mua hàng...</p>
      </div>
    );
  }

  const summary = data?.summary || {};
  const urgentOrders = data?.urgentOrders || [];
  const recentOrders = data?.recentOrders || [];

  return (
    <div className="space-y-6">
      {/* Top 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Tổng đơn mua */}
        <div className="bg-white rounded-2xl border border-[#E2EDF5] p-5 shadow-xs hover:border-[#0F5FAF]/40 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-[#5F6F82] uppercase tracking-wider">
              Tổng số đơn PO
            </span>
            <div className="w-10 h-10 rounded-xl bg-[#EAF5FC] flex items-center justify-center text-[#0F5FAF]">
              <ShoppingCart className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-[#172033]">
            {summary.totalPOs ?? 0}
          </div>
          <div className="text-xs text-[#5F6F82] mt-2 flex items-center gap-1.5">
            <span className="text-amber-600 font-semibold">{summary.pendingApproval ?? 0}</span> đơn chờ phê duyệt
          </div>
        </div>

        {/* KPI 2: Đơn đang xử lý */}
        <div className="bg-white rounded-2xl border border-[#E2EDF5] p-5 shadow-xs hover:border-[#0F5FAF]/40 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-[#5F6F82] uppercase tracking-wider">
              PO Đang xử lý
            </span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-blue-600">
            {summary.inProgress ?? 0}
          </div>
          <div className="text-xs text-[#5F6F82] mt-2">
            Đang đặt hàng & vận chuyển từ NCC
          </div>
        </div>

        {/* KPI 3: PO Quá hạn */}
        <div className="bg-white rounded-2xl border border-[#E2EDF5] p-5 shadow-xs hover:border-rose-300 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-[#5F6F82] uppercase tracking-wider">
              PO Quá hạn giao
            </span>
            <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-rose-600">
            {summary.overdue ?? 0}
          </div>
          <div className="text-xs text-[#5F6F82] mt-2">
            Cần đôn đốc nhà cung cấp gấp
          </div>
        </div>

        {/* KPI 4: Giá trị đã nhập kho */}
        <div className="bg-white rounded-2xl border border-[#E2EDF5] p-5 shadow-xs hover:border-emerald-300 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-[#5F6F82] uppercase tracking-wider">
              Giá trị đã nhập kho
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-emerald-700 truncate">
            {formatCurrency(summary.totalValueCompleted)}
          </div>
          <div className="text-xs text-[#5F6F82] mt-2">
            {summary.activeSuppliers ?? 0} NCC đang hợp tác
          </div>
        </div>
      </div>

      {/* Row 2: Status Breakdown & Action Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Phân bổ trạng thái đơn mua */}
        <div className="bg-white rounded-2xl border border-[#E2EDF5] p-5 shadow-xs lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-[#172033]">
              Phân bổ trạng thái đơn hàng
            </h2>
            <TrendingUp className="w-4 h-4 text-[#0F5FAF]" />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs py-1 border-b border-slate-100">
              <span className="flex items-center gap-2 text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                Chờ phê duyệt
              </span>
              <span className="font-bold text-[#172033]">{summary.pendingApproval ?? 0} đơn</span>
            </div>

            <div className="flex items-center justify-between text-xs py-1 border-b border-slate-100">
              <span className="flex items-center gap-2 text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                Đang xử lý / Vận chuyển
              </span>
              <span className="font-bold text-[#172033]">{summary.inProgress ?? 0} đơn</span>
            </div>

            <div className="flex items-center justify-between text-xs py-1 border-b border-slate-100">
              <span className="flex items-center gap-2 text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                Đã hoàn tất nhập kho
              </span>
              <span className="font-bold text-[#172033]">{summary.completed ?? 0} đơn</span>
            </div>

            <div className="flex items-center justify-between text-xs py-1 border-b border-slate-100">
              <span className="flex items-center gap-2 text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span>
                Đã hủy
              </span>
              <span className="font-bold text-[#172033]">{summary.cancelled ?? 0} đơn</span>
            </div>

            <div className="pt-2 text-xs text-[#5F6F82] flex justify-between">
              <span>Tổng giá trị đơn đang thực hiện:</span>
              <span className="font-semibold text-blue-700">
                {formatCurrency(summary.totalValueInProgress)}
              </span>
            </div>
          </div>
        </div>

        {/* Việc cần xử lý gấp */}
        <div className="bg-white rounded-2xl border border-[#E2EDF5] p-5 shadow-xs lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-[#172033] flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span>Đơn mua hàng cần xử lý gấp</span>
            </h2>
            <Link
              to="/purchasing/purchase-orders"
              className="text-xs font-semibold text-[#0F5FAF] hover:underline flex items-center gap-1"
            >
              <span>Xem tất cả</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {urgentOrders.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#5F6F82]">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
              Chưa có dữ liệu đơn mua hàng cần xử lý gấp. Tất cả đơn hàng đều đúng tiến độ.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-[#F4FAFE] text-[#5F6F82]">
                    <th className="py-2.5 px-3 font-semibold">Mã PO</th>
                    <th className="py-2.5 px-3 font-semibold">Nhà cung cấp</th>
                    <th className="py-2.5 px-3 font-semibold">Hạn giao</th>
                    <th className="py-2.5 px-3 font-semibold">Tổng tiền</th>
                    <th className="py-2.5 px-3 font-semibold">Trạng thái</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Chi tiết</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {urgentOrders.map((po) => (
                    <tr key={po.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-[#0F5FAF]">
                        {po.ma_don_mua}
                      </td>
                      <td className="py-2.5 px-3 text-[#172033]">
                        {po.ten_nha_cung_cap}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={
                            po.is_overdue
                              ? 'text-rose-600 font-bold flex items-center gap-1'
                              : 'text-slate-600'
                          }
                        >
                          {po.is_overdue && <AlertTriangle className="w-3 h-3" />}
                          {formatDate(po.ngay_giao_hang_yc)}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-medium text-[#172033]">
                        {formatCurrency(po.tong_thanh_toan)}
                      </td>
                      <td className="py-2.5 px-3">{getStatusBadge(po.trang_thai)}</td>
                      <td className="py-2.5 px-3 text-right">
                        <Link
                          to={`/purchasing/purchase-orders/${po.id}`}
                          className="text-[#0F5FAF] hover:text-[#0A2540] font-semibold"
                        >
                          Xem
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Row 3: Recent Purchase Orders Table */}
      <div className="bg-white rounded-2xl border border-[#E2EDF5] p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-[#172033]">
            Đơn mua hàng mới khởi tạo gần đây
          </h2>
          <Link
            to="/purchasing/purchase-orders"
            className="text-xs font-semibold text-[#0F5FAF] hover:underline flex items-center gap-1"
          >
            <span>Tất cả đơn mua</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <div className="py-8 text-center text-xs text-[#5F6F82]">
            Chưa có dữ liệu
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-[#F4FAFE] text-[#5F6F82]">
                  <th className="py-2.5 px-3 font-semibold">Mã PO</th>
                  <th className="py-2.5 px-3 font-semibold">Nhà cung cấp</th>
                  <th className="py-2.5 px-3 font-semibold">Ngày đặt</th>
                  <th className="py-2.5 px-3 font-semibold">Ngày giao YC</th>
                  <th className="py-2.5 px-3 font-semibold">Người lập</th>
                  <th className="py-2.5 px-3 font-semibold">Tổng thanh toán</th>
                  <th className="py-2.5 px-3 font-semibold">Trạng thái</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentOrders.map((po) => (
                  <tr key={po.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-[#0F5FAF]">
                      {po.ma_don_mua}
                    </td>
                    <td className="py-2.5 px-3 text-[#172033]">
                      {po.ten_nha_cung_cap}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      {formatDate(po.ngay_dat_hang)}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      {formatDate(po.ngay_giao_hang_yc)}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      {po.ten_nguoi_dat || '—'}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-[#172033]">
                      {formatCurrency(po.tong_thanh_toan)}
                    </td>
                    <td className="py-2.5 px-3">{getStatusBadge(po.trang_thai)}</td>
                    <td className="py-2.5 px-3 text-right">
                      <Link
                        to={`/purchasing/purchase-orders/${po.id}`}
                        className="px-2.5 py-1 rounded bg-[#EAF5FC] text-[#0F5FAF] font-semibold hover:bg-[#0F5FAF] hover:text-white transition-colors"
                      >
                        Chi tiết
                      </Link>
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
