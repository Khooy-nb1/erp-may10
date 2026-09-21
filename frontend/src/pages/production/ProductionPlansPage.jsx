import React, { useState, useEffect } from 'react';
import {
  CalendarDays,
  Plus,
  CheckCircle2,
  PauseCircle,
  XCircle,
  RefreshCw,
  Eye,
  Filter,
} from 'lucide-react';
import {
  getProductionPlans,
  createProductionPlan,
  approveProductionPlan,
  pauseProductionPlan,
  cancelProductionPlan,
  getProducts,
} from '../../services/productionService';

export default function ProductionPlansPage({ showToast }) {
  const [plans, setPlans] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // New Plan form state
  const [formData, setFormData] = useState({
    ma_ke_hoach: '',
    san_pham_id: '',
    so_luong: 1000,
    ngay_bat_dau: new Date().toISOString().split('T')[0],
    ngay_ket_thuc: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    ghi_chu: '',
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter) params.trang_thai = statusFilter;
      const [resPlans, resProducts] = await Promise.all([
        getProductionPlans(params),
        getProducts(),
      ]);
      setPlans(resPlans?.data || []);
      setProducts(resProducts || []);
    } catch (err) {
      console.error('Lỗi tải kế hoạch sản xuất:', err);
      if (showToast) {
        showToast({
          type: 'error',
          message: 'Không thể tải danh sách kế hoạch sản xuất.',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter]);

  const handleCreatePlan = async (e) => {
    e.preventDefault();
    if (!formData.san_pham_id || !formData.so_luong || Number(formData.so_luong) <= 0) {
      if (showToast) showToast({ type: 'error', message: 'Vui lòng chọn sản phẩm và nhập số lượng hợp lệ (> 0).' });
      return;
    }
    try {
      setSubmitting(true);
      await createProductionPlan({
        ma_ke_hoach: formData.ma_ke_hoach?.trim() || undefined,
        ma_san_pham: Number(formData.san_pham_id),
        so_luong_ke_hoach: Number(formData.so_luong),
        ngay_bat_dau: formData.ngay_bat_dau,
        ngay_ket_thuc: formData.ngay_ket_thuc,
        ghi_chu: formData.ghi_chu,
      });
      if (showToast) {
        showToast({ type: 'success', message: 'Tạo kế hoạch sản xuất thành công!' });
      }
      setShowCreateModal(false);
      setFormData({
        ma_ke_hoach: '',
        san_pham_id: '',
        so_luong: 1000,
        ngay_bat_dau: new Date().toISOString().split('T')[0],
        ngay_ket_thuc: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
        ghi_chu: '',
      });
      fetchData();
    } catch (err) {
      console.error('Lỗi tạo kế hoạch:', err);
      if (showToast) {
        showToast({
          type: 'error',
          message: err.response?.data?.message || 'Lỗi khi tạo kế hoạch sản xuất.',
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (plan) => {
    if (!window.confirm(`Xác nhận phê duyệt kế hoạch sản xuất ${plan.ma_ke_hoach}?`)) return;
    try {
      await approveProductionPlan(plan.id);
      if (showToast) showToast({ type: 'success', message: `Đã phê duyệt kế hoạch ${plan.ma_ke_hoach} thành công!` });
      fetchData();
    } catch (err) {
      if (showToast) {
        showToast({
          type: 'error',
          message: err.response?.data?.message || 'Không thể phê duyệt kế hoạch. Vui lòng kiểm tra định mức BOM.',
        });
      }
    }
  };

  const handlePause = async (plan) => {
    const isPaused = plan.trang_thai === 'tam_dung';
    try {
      await pauseProductionPlan(plan.id);
      if (showToast) {
        showToast({
          type: 'info',
          message: isPaused
            ? `Kế hoạch ${plan.ma_ke_hoach} đã được kích hoạt tiếp tục.`
            : `Kế hoạch ${plan.ma_ke_hoach} đã chuyển sang tạm dừng.`,
        });
      }
      fetchData();
    } catch (err) {
      if (showToast) showToast({ type: 'error', message: err.response?.data?.message || 'Lỗi cập nhật trạng thái kế hoạch.' });
    }
  };

  const handleCancel = async (plan) => {
    const reason = window.prompt(`Nhập lý do huỷ kế hoạch ${plan.ma_ke_hoach}:`);
    if (!reason) return;
    try {
      await cancelProductionPlan(plan.id, reason);
      if (showToast) showToast({ type: 'info', message: `Đã huỷ kế hoạch ${plan.ma_ke_hoach}.` });
      fetchData();
    } catch (err) {
      if (showToast) showToast({ type: 'error', message: err.response?.data?.message || 'Lỗi huỷ kế hoạch.' });
    }
  };

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
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">Đang thực hiện</span>;
      case 'hoan_thanh':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">Hoàn thành</span>;
      case 'tam_dung':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-50 text-slate-700 border border-slate-200">Tạm dừng</span>;
      case 'da_huy':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">Đã huỷ</span>;
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">{status}</span>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Action bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-medium text-slate-600">Trạng thái:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0F5FAF]"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="cho_duyet">Chờ duyệt</option>
            <option value="da_duyet">Đã duyệt</option>
            <option value="dang_thuc_hien">Đang thực hiện</option>
            <option value="hoan_thanh">Hoàn thành</option>
            <option value="tam_dung">Tạm dừng</option>
            <option value="da_huy">Đã huỷ</option>
          </select>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0F5FAF] text-white text-xs font-semibold hover:bg-[#0d4f91] transition-all shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Lập kế hoạch mới</span>
        </button>
      </div>

      {/* Plans Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Mã KHSX</th>
                <th className="px-4 py-3">Sản phẩm</th>
                <th className="px-4 py-3 text-right">Số lượng</th>
                <th className="px-4 py-3">Thời gian</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3 text-center">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-slate-500">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto text-[#0F5FAF] mb-2" />
                    Đang tải danh sách kế hoạch...
                  </td>
                </tr>
              ) : plans.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-slate-400">
                    Không tìm thấy kế hoạch sản xuất nào
                  </td>
                </tr>
              ) : (
                plans.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3 font-semibold text-[#0F5FAF]">{p.ma_ke_hoach}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">{p.ten_san_pham}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{p.ma_san_pham}</div>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">
                      {new Intl.NumberFormat('vi-VN').format(p.so_luong_ke_hoach || p.so_luong || 0)} {p.don_vi_tinh || 'SP'}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <div>{formatDate(p.ngay_bat_dau)} → {formatDate(p.ngay_ket_thuc)}</div>
                    </td>
                    <td className="px-4 py-3">{getStatusBadge(p.trang_thai)}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {(p.trang_thai === 'cho_duyet' || p.trang_thai === 'lap_ke_hoach') && (
                          <button
                            onClick={() => handleApprove(p)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-medium transition-colors border border-emerald-200"
                            title="Phê duyệt KHSX (yêu cầu BOM hiệu lực)"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Duyệt</span>
                          </button>
                        )}
                        {p.trang_thai === 'da_duyet' && (
                          <button
                            onClick={() => handlePause(p)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 font-medium transition-colors"
                            title="Tạm dừng KHSX"
                          >
                            <PauseCircle className="w-3.5 h-3.5" />
                            <span>Tạm dừng</span>
                          </button>
                        )}
                        {p.trang_thai === 'tam_dung' && (
                          <button
                            onClick={() => handlePause(p)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium transition-colors border border-blue-200"
                            title="Tiếp tục KHSX"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Tiếp tục</span>
                          </button>
                        )}
                        {(p.trang_thai === 'cho_duyet' || p.trang_thai === 'lap_ke_hoach' || p.trang_thai === 'da_duyet' || p.trang_thai === 'tam_dung') && (
                          <button
                            onClick={() => handleCancel(p)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-red-50 text-red-600 hover:bg-red-100 font-medium transition-colors"
                            title="Huỷ kế hoạch"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Huỷ</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Plan Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-[#0F5FAF]" />
              Lập kế hoạch sản xuất mới
            </h3>
            <form onSubmit={handleCreatePlan} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Mã kế hoạch (tuỳ chọn)</label>
                <input
                  type="text"
                  placeholder="Ví dụ: KHSX-2026-003 (để trống tự sinh)"
                  value={formData.ma_ke_hoach}
                  onChange={(e) => setFormData({ ...formData, ma_ke_hoach: e.target.value })}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0F5FAF]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Sản phẩm may mặc *</label>
                <select
                  required
                  value={formData.san_pham_id}
                  onChange={(e) => setFormData({ ...formData, san_pham_id: e.target.value })}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0F5FAF] bg-white"
                >
                  <option value="">-- Chọn sản phẩm --</option>
                  {products.map((sp) => (
                    <option key={sp.id} value={sp.id}>
                      [{sp.ma_san_pham}] {sp.ten_san_pham} ({sp.don_vi_tinh || 'SP'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Số lượng sản xuất *</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={formData.so_luong}
                  onChange={(e) => setFormData({ ...formData, so_luong: e.target.value })}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0F5FAF]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Ngày bắt đầu</label>
                  <input
                    type="date"
                    required
                    value={formData.ngay_bat_dau}
                    onChange={(e) => setFormData({ ...formData, ngay_bat_dau: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0F5FAF]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Ngày kết thúc</label>
                  <input
                    type="date"
                    required
                    value={formData.ngay_ket_thuc}
                    onChange={(e) => setFormData({ ...formData, ngay_ket_thuc: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0F5FAF]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Ghi chú</label>
                <textarea
                  rows="2"
                  value={formData.ghi_chu}
                  onChange={(e) => setFormData({ ...formData, ghi_chu: e.target.value })}
                  placeholder="Ghi chú đơn hàng xuất khẩu, xưởng gia công..."
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0F5FAF]"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Huỷ
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#0F5FAF] hover:bg-[#0d4f91] rounded-lg transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Đang lưu...' : 'Lưu kế hoạch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
