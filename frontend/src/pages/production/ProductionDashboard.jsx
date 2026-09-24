import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarDays,
  Factory,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  ArrowRight,
  RefreshCw,
  Percent,
} from 'lucide-react';
import { getProductionDashboard } from '../../services/productionService';

export default function ProductionDashboard({ showToast }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await getProductionDashboard();
      setData(res);
    } catch (err) {
      console.error('Lỗi tải Dashboard sản xuất:', err);
      if (showToast) {
        showToast({
          type: 'error',
          message: 'Không thể tải số liệu Dashboard sản xuất.',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('vi-VN');
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'cho_duyet':
      case 'lap_ke_hoach':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">Chờ duyệt</span>;
      case 'da_duyet':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">Đã duyệt</span>;
      case 'dang_thuc_hien':
      case 'dang_san_xuat':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">Đang may/SX</span>;
      case 'hoan_thanh':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">Hoàn thành</span>;
      case 'tam_dung':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-50 text-slate-700 border border-slate-200">Tạm dừng</span>;
      case 'da_huy':
      case 'huy':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">Đã huỷ</span>;
      case 'chua_bat_dau':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">Chưa bắt đầu</span>;
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">{status}</span>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 bg-white rounded-xl border border-slate-200">
        <RefreshCw className="w-6 h-6 text-[#0F5FAF] animate-spin" />
        <span className="ml-3 text-sm font-medium text-slate-600">Đang tải số liệu tổng quan sản xuất...</span>
      </div>
    );
  }

  const pendingPlans = data?.pendingPlans || 0;
  const activeOrders = data?.activeOrders || 0;
  const completionRate = data?.completionRate || 0;
  const shortageCount = data?.shortageCount || 0;
  const recentPlans = data?.recentPlans || [];
  const recentOrders = data?.recentOrders || [];

  return (
    <div className="space-y-6">
      {/* 4 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Kế hoạch chờ duyệt</span>
            <div className="p-2 rounded-lg bg-blue-50 text-[#0F5FAF]">
              <CalendarDays className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{pendingPlans}</span>
            <span className="text-xs text-slate-500 font-medium">kế hoạch</span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
            <span className="text-blue-600 font-medium">Kế hoạch sản xuất cần duyệt</span>
          </div>
        </div>

        {/* Card 2 */}
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Lệnh SX đang điều hành</span>
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
              <Factory className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{activeOrders}</span>
            <span className="text-xs text-slate-500 font-medium">lệnh đang chạy</span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
            <span className="text-indigo-600 font-medium">Chuyền may & hoàn thiện</span>
          </div>
        </div>

        {/* Card 3 */}
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Tỷ lệ hoàn thành SX</span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <Percent className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{completionRate}%</span>
            <span className="text-xs text-slate-500 font-medium">trung bình</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className="bg-emerald-500 h-1.5 rounded-full"
              style={{ width: `${Math.min(100, completionRate)}%` }}
            ></div>
          </div>
        </div>

        {/* Card 4 */}
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Cảnh báo thiếu NPL</span>
            <div className={`p-2 rounded-lg ${shortageCount > 0 ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
              {shortageCount > 0 ? <AlertTriangle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={`text-2xl font-bold ${shortageCount > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
              {shortageCount}
            </span>
            <span className="text-xs text-slate-500 font-medium">loại vật tư</span>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            {shortageCount > 0 ? 'Cần phát hành PR sang PH3' : 'Tồn kho đáp ứng đủ KHSX'}
          </p>
        </div>
      </div>

      {/* Two Data Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Plans */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800">Kế hoạch sản xuất gần đây</h3>
            <Link to="/production/plans" className="text-xs font-semibold text-[#0F5FAF] hover:underline flex items-center gap-1">
              Xem tất cả <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                <tr>
                  <th className="px-4 py-2.5">Mã KH</th>
                  <th className="px-4 py-2.5">Sản phẩm</th>
                  <th className="px-4 py-2.5 text-right">Số lượng</th>
                  <th className="px-4 py-2.5">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentPlans.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-4 py-6 text-center text-slate-400">Chưa có kế hoạch nào</td>
                  </tr>
                ) : (
                  recentPlans.map((plan) => (
                    <tr key={plan.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-2.5 font-medium text-[#0F5FAF]">{plan.ma_ke_hoach}</td>
                      <td className="px-4 py-2.5 text-slate-700">{plan.ten_san_pham || plan.ma_san_pham}</td>
                      <td className="px-4 py-2.5 text-right font-medium text-slate-900">
                        {new Intl.NumberFormat('vi-VN').format(plan.so_luong_ke_hoach || plan.so_luong || 0)} {plan.don_vi_tinh || 'SP'}
                      </td>
                      <td className="px-4 py-2.5">{getStatusBadge(plan.trang_thai)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Orders */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800">Lệnh sản xuất (LSX) gần đây</h3>
            <Link to="/production/orders" className="text-xs font-semibold text-[#0F5FAF] hover:underline flex items-center gap-1">
              Xem tất cả <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                <tr>
                  <th className="px-4 py-2.5">Mã LSX</th>
                  <th className="px-4 py-2.5">Sản phẩm</th>
                  <th className="px-4 py-2.5 text-right">Tiến độ</th>
                  <th className="px-4 py-2.5">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentOrders.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-4 py-6 text-center text-slate-400">Chưa có lệnh sản xuất nào</td>
                  </tr>
                ) : (
                  recentOrders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-2.5 font-medium text-indigo-600">{ord.ma_lenh_san_xuat || ord.ma_lenh}</td>
                      <td className="px-4 py-2.5 text-slate-700">{ord.ten_san_pham || ord.ma_san_pham}</td>
                      <td className="px-4 py-2.5 text-right font-medium text-slate-900">
                        {ord.so_luong_hoan_thanh || 0} / {ord.so_luong_yeu_cau || ord.so_luong || 0}
                      </td>
                      <td className="px-4 py-2.5">{getStatusBadge(ord.trang_thai)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
