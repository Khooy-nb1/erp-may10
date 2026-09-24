import React, { useEffect, useState } from 'react';
import {
  CalendarDays,
  Plus,
  CheckCircle2,
  PauseCircle,
  XCircle,
  RefreshCw,
  Eye,
  Edit3,
  Search,
  X,
} from 'lucide-react';
import {
  getProductionPlans,
  getProductionPlanDetail,
  createProductionPlan,
  updateProductionPlan,
  approveProductionPlan,
  pauseProductionPlan,
  cancelProductionPlan,
  calculateMrp,
  getProducts,
} from '../../services/productionService';

const emptyForm = () => ({
  ma_ke_hoach: '',
  san_pham_id: '',
  so_luong: 1000,
  ngay_bat_dau: new Date().toISOString().split('T')[0],
  ngay_ket_thuc: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
  ghi_chu: '',
});

export default function ProductionPlansPage({ showToast }) {
  const [plans, setPlans] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailMrp, setDetailMrp] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState(emptyForm());

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter) params.trang_thai = statusFilter;
      if (search.trim()) params.search = search.trim();
      const [resPlans, resProducts] = await Promise.all([
        getProductionPlans(params),
        getProducts(),
      ]);
      setPlans(resPlans?.data || []);
      setProducts(resProducts || []);
    } catch (err) {
      console.error('Lỗi tải kế hoạch sản xuất:', err);
      showToast?.({ type: 'error', message: 'Không thể tải danh sách kế hoạch sản xuất.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(fetchData, 250);
    return () => clearTimeout(timer);
  }, [statusFilter, search]);

  const openCreate = () => {
    setEditingPlan(null);
    setFormData(emptyForm());
    setShowModal(true);
  };

  const openEdit = (plan) => {
    // Chỉ cho sửa đầy đủ trước khi duyệt; sau khi duyệt MRP đã được ghi nhận.
    if (!['cho_duyet', 'lap_ke_hoach'].includes(plan.trang_thai)) {
      showToast?.({ type: 'info', message: 'Kế hoạch đã duyệt/đang chạy chỉ được xem, tạm dừng hoặc huỷ để tránh lệch MRP.' });
      return;
    }
    setEditingPlan(plan);
    setFormData({
      ma_ke_hoach: plan.ma_ke_hoach || '',
      san_pham_id: String(plan.ma_san_pham || ''),
      so_luong: plan.so_luong_ke_hoach || 1000,
      ngay_bat_dau: plan.ngay_bat_dau ? String(plan.ngay_bat_dau).slice(0, 10) : emptyForm().ngay_bat_dau,
      ngay_ket_thuc: plan.ngay_ket_thuc ? String(plan.ngay_ket_thuc).slice(0, 10) : emptyForm().ngay_ket_thuc,
      ghi_chu: plan.ghi_chu || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.san_pham_id || Number(formData.so_luong) <= 0) {
      showToast?.({ type: 'error', message: 'Vui lòng chọn sản phẩm và nhập số lượng hợp lệ (> 0).' });
      return;
    }
    if (formData.ngay_ket_thuc < formData.ngay_bat_dau) {
      showToast?.({ type: 'error', message: 'Ngày kết thúc phải sau hoặc bằng ngày bắt đầu.' });
      return;
    }
    try {
      setSubmitting(true);
      const payload = {
        ma_ke_hoach: formData.ma_ke_hoach.trim() || undefined,
        ma_san_pham: Number(formData.san_pham_id),
        so_luong_ke_hoach: Number(formData.so_luong),
        ngay_bat_dau: formData.ngay_bat_dau,
        ngay_ket_thuc: formData.ngay_ket_thuc,
        ghi_chu: formData.ghi_chu,
      };
      if (editingPlan) {
        await updateProductionPlan(editingPlan.id, payload);
        showToast?.({ type: 'success', message: `Đã cập nhật kế hoạch ${editingPlan.ma_ke_hoach}.` });
      } else {
        await createProductionPlan(payload);
        showToast?.({ type: 'success', message: 'Tạo kế hoạch sản xuất thành công!' });
      }
      setShowModal(false);
      setEditingPlan(null);
      await fetchData();
    } catch (err) {
      showToast?.({ type: 'error', message: err.response?.data?.message || 'Lỗi khi lưu kế hoạch sản xuất.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (plan) => {
    if (!window.confirm(`Xác nhận phê duyệt kế hoạch sản xuất ${plan.ma_ke_hoach}?`)) return;
    try {
      const res = await approveProductionPlan(plan.id);
      const shortageCount = res?.shortages?.length || 0;
      showToast?.({
        type: 'success',
        message: shortageCount
          ? `Đã phê duyệt ${plan.ma_ke_hoach}. Có ${shortageCount} loại NPL thiếu, chuyển sang MRP.`
          : `Đã phê duyệt kế hoạch ${plan.ma_ke_hoach}; nhu cầu NPL đã được ghi nhận.`,
      });
      fetchData();
    } catch (err) {
      showToast?.({ type: 'error', message: err.response?.data?.message || 'Không thể phê duyệt kế hoạch. Vui lòng kiểm tra BOM.' });
    }
  };

  const handlePause = async (plan) => {
    const isPaused = plan.trang_thai === 'tam_dung';
    try {
      await pauseProductionPlan(plan.id);
      showToast?.({ type: 'info', message: isPaused ? `Đã tiếp tục kế hoạch ${plan.ma_ke_hoach}.` : `Đã tạm dừng kế hoạch ${plan.ma_ke_hoach}.` });
      fetchData();
    } catch (err) {
      showToast?.({ type: 'error', message: err.response?.data?.message || 'Lỗi cập nhật trạng thái kế hoạch.' });
    }
  };

  const handleCancel = async (plan) => {
    const reason = window.prompt(`Nhập lý do huỷ kế hoạch ${plan.ma_ke_hoach}:`);
    if (!reason?.trim()) return;
    try {
      await cancelProductionPlan(plan.id, reason.trim());
      showToast?.({ type: 'info', message: `Đã huỷ kế hoạch ${plan.ma_ke_hoach}.` });
      fetchData();
    } catch (err) {
      showToast?.({ type: 'error', message: err.response?.data?.message || 'Lỗi huỷ kế hoạch.' });
    }
  };

  const openDetail = async (plan) => {
    try {
      setDetailLoading(true);
      const [fullPlan, mrp] = await Promise.all([
        getProductionPlanDetail(plan.id),
        calculateMrp(plan.id),
      ]);
      setDetail(fullPlan);
      setDetailMrp(mrp || []);
    } catch (err) {
      showToast?.({ type: 'error', message: err.response?.data?.message || 'Không thể tải chi tiết kế hoạch.' });
    } finally {
      setDetailLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('vi-VN');
  };

  const badge = (status) => {
    const map = {
      cho_duyet: ['Chờ duyệt', 'bg-amber-50 text-amber-700 border-amber-200'],
      lap_ke_hoach: ['Chờ duyệt', 'bg-amber-50 text-amber-700 border-amber-200'],
      da_duyet: ['Đã duyệt', 'bg-blue-50 text-blue-700 border-blue-200'],
      dang_thuc_hien: ['Đang thực hiện', 'bg-indigo-50 text-indigo-700 border-indigo-200'],
      tam_dung: ['Tạm dừng', 'bg-slate-50 text-slate-700 border-slate-200'],
      hoan_thanh: ['Hoàn thành', 'bg-emerald-50 text-emerald-700 border-emerald-200'],
      huy: ['Đã huỷ', 'bg-red-50 text-red-700 border-red-200'],
    };
    const [label, cls] = map[status] || [status || '—', 'bg-slate-100 text-slate-600 border-slate-200'];
    return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}>{label}</span>;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full lg:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm mã KHSX hoặc sản phẩm..." className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0F5FAF]" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50">
            <option value="">Tất cả trạng thái</option>
            <option value="cho_duyet">Chờ duyệt</option>
            <option value="da_duyet">Đã duyệt</option>
            <option value="dang_thuc_hien">Đang thực hiện</option>
            <option value="tam_dung">Tạm dừng</option>
            <option value="hoan_thanh">Hoàn thành</option>
            <option value="huy">Đã huỷ</option>
          </select>
        </div>
        <button onClick={openCreate} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0F5FAF] text-white text-xs font-semibold hover:bg-[#0d4f91] shadow-xs">
          <Plus className="w-4 h-4" /> Lập kế hoạch mới
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider">
              <tr><th className="px-4 py-3">Mã KHSX</th><th className="px-4 py-3">Sản phẩm</th><th className="px-4 py-3 text-right">Số lượng</th><th className="px-4 py-3">Thời gian</th><th className="px-4 py-3">Trạng thái</th><th className="px-4 py-3 text-center">Hành động</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? <tr><td colSpan="6" className="px-4 py-8 text-center text-slate-500"><RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />Đang tải...</td></tr>
                : plans.length === 0 ? <tr><td colSpan="6" className="px-4 py-8 text-center text-slate-400">Không tìm thấy kế hoạch sản xuất nào</td></tr>
                : plans.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3 font-semibold text-[#0F5FAF]">{p.ma_ke_hoach}</td>
                    <td className="px-4 py-3"><div className="font-medium text-slate-800">{p.ten_san_pham}</div><div className="text-[11px] text-slate-400 font-mono">{p.ma_san_pham}</div></td>
                    <td className="px-4 py-3 text-right font-semibold">{new Intl.NumberFormat('vi-VN').format(p.so_luong_ke_hoach || 0)} {p.don_vi_tinh || 'SP'}</td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(p.ngay_bat_dau)} → {formatDate(p.ngay_ket_thuc)}</td>
                    <td className="px-4 py-3">{badge(p.trang_thai)}</td>
                    <td className="px-4 py-3"><div className="flex items-center justify-center gap-1.5">
                      <button onClick={() => openDetail(p)} className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-50 text-slate-700 border border-slate-200"><Eye className="w-3.5 h-3.5" />Chi tiết</button>
                      {['cho_duyet','lap_ke_hoach'].includes(p.trang_thai) && <button onClick={() => openEdit(p)} className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-200"><Edit3 className="w-3.5 h-3.5" />Sửa</button>}
                      {['cho_duyet','lap_ke_hoach'].includes(p.trang_thai) && <button onClick={() => handleApprove(p)} className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200"><CheckCircle2 className="w-3.5 h-3.5" />Duyệt</button>}
                      {['da_duyet','tam_dung'].includes(p.trang_thai) && <button onClick={() => handlePause(p)} className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-50 text-slate-700 border border-slate-200">{p.trang_thai === 'tam_dung' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <PauseCircle className="w-3.5 h-3.5" />}{p.trang_thai === 'tam_dung' ? 'Tiếp tục' : 'Tạm dừng'}</button>}
                      {['cho_duyet','lap_ke_hoach','da_duyet','tam_dung'].includes(p.trang_thai) && <button onClick={() => handleCancel(p)} className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-red-50 text-red-600 border border-red-200"><XCircle className="w-3.5 h-3.5" />Huỷ</button>}
                    </div></td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
          <div className="flex items-center justify-between mb-4"><h3 className="text-base font-bold flex items-center gap-2"><CalendarDays className="w-5 h-5 text-[#0F5FAF]" />{editingPlan ? 'Cập nhật kế hoạch sản xuất' : 'Lập kế hoạch sản xuất mới'}</h3><button onClick={() => setShowModal(false)}><X className="w-5 h-5" /></button></div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input value={formData.ma_ke_hoach} onChange={(e) => setFormData({ ...formData, ma_ke_hoach: e.target.value })} placeholder="Mã kế hoạch (để trống tự sinh)" className="w-full text-xs px-3 py-2 border rounded-lg" />
            <select required value={formData.san_pham_id} disabled={!!editingPlan} onChange={(e) => setFormData({ ...formData, san_pham_id: e.target.value })} className="w-full text-xs px-3 py-2 border rounded-lg bg-white disabled:bg-slate-100">
              <option value="">-- Chọn sản phẩm --</option>{products.map((sp) => <option key={sp.id} value={sp.id}>[{sp.ma_san_pham}] {sp.ten_san_pham} ({sp.don_vi_tinh || 'SP'})</option>)}
            </select>
            <input type="number" min="1" required value={formData.so_luong} disabled={!!editingPlan} onChange={(e) => setFormData({ ...formData, so_luong: e.target.value })} className="w-full text-xs px-3 py-2 border rounded-lg disabled:bg-slate-100" placeholder="Số lượng sản xuất" />
            <div className="grid grid-cols-2 gap-3"><input type="date" required value={formData.ngay_bat_dau} onChange={(e) => setFormData({ ...formData, ngay_bat_dau: e.target.value })} className="w-full text-xs px-3 py-2 border rounded-lg" /><input type="date" required value={formData.ngay_ket_thuc} onChange={(e) => setFormData({ ...formData, ngay_ket_thuc: e.target.value })} className="w-full text-xs px-3 py-2 border rounded-lg" /></div>
            <textarea rows="2" value={formData.ghi_chu} onChange={(e) => setFormData({ ...formData, ghi_chu: e.target.value })} className="w-full text-xs px-3 py-2 border rounded-lg" placeholder="Ghi chú..." />
            {editingPlan && <p className="text-[11px] text-slate-500">Kế hoạch chỉ được sửa đầy đủ trước khi duyệt để không làm lệch nhu cầu MRP đã ghi nhận.</p>}
            <div className="flex justify-end gap-2 pt-3 border-t"><button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-xs rounded-lg border">Huỷ</button><button type="submit" disabled={submitting} className="px-4 py-2 text-xs font-semibold text-white bg-[#0F5FAF] rounded-lg disabled:opacity-50">{submitting ? 'Đang lưu...' : editingPlan ? 'Lưu thay đổi' : 'Lưu kế hoạch'}</button></div>
          </form>
        </div>
      </div>}

      {detail && <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-xl border border-slate-200">
          <div className="flex items-center justify-between mb-5"><div><h3 className="text-lg font-bold">Chi tiết {detail.ma_ke_hoach}</h3><div className="mt-1">{badge(detail.trang_thai)}</div></div><button onClick={() => setDetail(null)}><X /></button></div>
          {detailLoading ? <div className="py-10 text-center"><RefreshCw className="w-5 h-5 animate-spin mx-auto" /></div> : <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5"><div className="p-3 bg-slate-50 rounded-lg"><span className="text-[11px] text-slate-500">Sản phẩm</span><b className="block text-sm">{detail.ten_san_pham}</b></div><div className="p-3 bg-slate-50 rounded-lg"><span className="text-[11px] text-slate-500">Số lượng</span><b className="block text-sm">{new Intl.NumberFormat('vi-VN').format(detail.so_luong_ke_hoach)}</b></div><div className="p-3 bg-slate-50 rounded-lg"><span className="text-[11px] text-slate-500">Bắt đầu</span><b className="block text-sm">{formatDate(detail.ngay_bat_dau)}</b></div><div className="p-3 bg-slate-50 rounded-lg"><span className="text-[11px] text-slate-500">Kết thúc</span><b className="block text-sm">{formatDate(detail.ngay_ket_thuc)}</b></div></div>
            <h4 className="font-semibold text-sm mb-2">Nhu cầu nguyên phụ liệu của kế hoạch</h4>
            <div className="overflow-x-auto border rounded-lg"><table className="w-full text-xs"><thead className="bg-slate-50"><tr><th className="p-2 text-left">Mã NPL</th><th className="p-2 text-left">Tên NPL</th><th className="p-2 text-right">Nhu cầu</th><th className="p-2 text-right">Tồn kho</th><th className="p-2 text-right">Cần mua</th></tr></thead><tbody>{detailMrp.length ? detailMrp.map((m) => <tr key={m.ma_vat_tu} className="border-t"><td className="p-2 font-mono">{m.ma_vat_tu_code || m.ma_vat_tu}</td><td className="p-2">{m.ten_vat_tu}</td><td className="p-2 text-right">{Number(m.so_luong_can || 0).toLocaleString('vi-VN')}</td><td className="p-2 text-right">{Number(m.so_luong_ton_kho || 0).toLocaleString('vi-VN')}</td><td className={`p-2 text-right font-semibold ${Number(m.so_luong_can_mua) > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{Number(m.so_luong_can_mua || 0).toLocaleString('vi-VN')}</td></tr>) : <tr><td colSpan="5" className="p-6 text-center text-slate-400">Chưa có BOM hoặc chưa có nhu cầu NPL.</td></tr>}</tbody></table></div>
          </>}
        </div>
      </div>}
    </div>
  );
}
