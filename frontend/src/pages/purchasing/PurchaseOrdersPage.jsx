import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShoppingCart,
  Search,
  Plus,
  Eye,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  X,
  RefreshCw,
  Trash2,
  AlertCircle,
} from 'lucide-react';
import {
  getPurchaseOrders,
  createPurchaseOrder,
  approvePurchaseOrder,
  cancelPurchaseOrder,
  getSuppliers,
} from '../../services/purchasingService';
import { getDanhSachVatTu } from '../../services/api';

export default function PurchaseOrdersPage({ showToast }) {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [suppliersList, setSuppliersList] = useState([]);
  const [materialsList, setMaterialsList] = useState([]);

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [selectedPO, setSelectedPO] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState([]);

  // Create PO form state
  const [formData, setFormData] = useState({
    ma_nha_cung_cap: '',
    ngay_giao_hang_yc: '',
    dieu_kien_thanh_toan: 'Thanh toán sau khi nhận hàng và hóa đơn 30 ngày',
    ghi_chu: '',
    chiTiet: [
      { ma_vat_tu: '', so_luong_dat: 100, don_gia: 50000, ghi_chu: '' },
    ],
  });

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await getPurchaseOrders({
        search: searchTerm || undefined,
        trang_thai: statusFilter || undefined,
      });
      setOrders(res.data || []);
    } catch (err) {
      console.error('Lỗi tải danh sách đơn mua hàng:', err);
      if (showToast) {
        showToast({
          type: 'error',
          message: 'Không thể tải danh sách đơn mua hàng.',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const loadMasterData = async () => {
    try {
      const [supRes, vtRes] = await Promise.all([
        getSuppliers({ limit: 100 }),
        getDanhSachVatTu().catch(() => []),
      ]);
      setSuppliersList(supRes.data || []);
      setMaterialsList(vtRes || []);
    } catch (err) {
      console.error('Lỗi tải master data cho form PO:', err);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [statusFilter]);

  useEffect(() => {
    loadMasterData();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchOrders();
  };

  const handleOpenCreateModal = () => {
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 7);
    const dateStr = defaultDate.toISOString().slice(0, 10);

    setFormData({
      ma_nha_cung_cap: suppliersList[0]?.id || '',
      ngay_giao_hang_yc: dateStr,
      dieu_kien_thanh_toan: 'Thanh toán sau khi nhận hàng và hóa đơn 30 ngày',
      ghi_chu: '',
      chiTiet: [
        { ma_vat_tu: materialsList[0]?.id || '', so_luong_dat: 100, don_gia: 65000, ghi_chu: '' },
      ],
    });
    setFormErrors([]);
    setIsCreateModalOpen(true);
  };

  const handleAddItemRow = () => {
    setFormData({
      ...formData,
      chiTiet: [
        ...formData.chiTiet,
        { ma_vat_tu: materialsList[0]?.id || '', so_luong_dat: 50, don_gia: 28000, ghi_chu: '' },
      ],
    });
  };

  const handleRemoveItemRow = (index) => {
    if (formData.chiTiet.length <= 1) return;
    const updated = formData.chiTiet.filter((_, i) => i !== index);
    setFormData({ ...formData, chiTiet: updated });
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...formData.chiTiet];
    updated[index][field] = value;
    setFormData({ ...formData, chiTiet: updated });
  };

  const calculateSubtotal = () => {
    return formData.chiTiet.reduce((sum, item) => {
      const sl = parseFloat(item.so_luong_dat) || 0;
      const dg = parseFloat(item.don_gia) || 0;
      return sum + sl * dg;
    }, 0);
  };

  const handleCreatePO = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormErrors([]);

    // Client-side basic validation
    if (!formData.ma_nha_cung_cap) {
      setFormErrors(['Vui lòng chọn nhà cung cấp.']);
      setSubmitting(false);
      return;
    }
    if (!formData.ngay_giao_hang_yc) {
      setFormErrors(['Vui lòng chọn ngày giao hàng yêu cầu.']);
      setSubmitting(false);
      return;
    }

    try {
      const payload = {
        ...formData,
        ma_nha_cung_cap: parseInt(formData.ma_nha_cung_cap, 10),
        chiTiet: formData.chiTiet.map((item) => ({
          ma_vat_tu: parseInt(item.ma_vat_tu, 10),
          so_luong_dat: parseFloat(item.so_luong_dat),
          don_gia: parseFloat(item.don_gia),
          ghi_chu: item.ghi_chu || null,
        })),
      };

      const res = await createPurchaseOrder(payload);
      setIsCreateModalOpen(false);
      if (showToast) {
        showToast({
          type: 'success',
          message: `Đã tạo thành công đơn mua hàng ${res.data.ma_don_mua}.`,
        });
      }
      fetchOrders();
    } catch (err) {
      const errRes = err.response?.data;
      if (errRes?.errors) {
        setFormErrors(errRes.errors);
      } else {
        setFormErrors([errRes?.message || 'Lỗi tạo đơn mua hàng.']);
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Phê duyệt PO
  const handleApprovePO = async () => {
    if (!selectedPO) return;
    setSubmitting(true);
    try {
      await approvePurchaseOrder(selectedPO.id);
      setIsApproveModalOpen(false);
      if (showToast) {
        showToast({
          type: 'success',
          message: `Đã phê duyệt đơn mua hàng [${selectedPO.ma_don_mua}] thành công. Trạng thái: Đã gửi NCC.`,
        });
      }
      fetchOrders();
    } catch (err) {
      const errRes = err.response?.data;
      if (showToast) {
        showToast({
          type: errRes?.errorCode === 'CONFLICT' ? 'conflict' : 'error',
          errorCode: errRes?.errorCode,
          message: errRes?.message || 'Không thể phê duyệt đơn mua hàng.',
        });
      }
    } finally {
      setSubmitting(false);
      setSelectedPO(null);
    }
  };

  // Hủy PO
  const handleCancelPO = async () => {
    if (!selectedPO) return;
    setSubmitting(true);
    try {
      await cancelPurchaseOrder(selectedPO.id, cancelReason);
      setIsCancelModalOpen(false);
      setCancelReason('');
      if (showToast) {
        showToast({
          type: 'success',
          message: `Đã hủy đơn mua hàng [${selectedPO.ma_don_mua}].`,
        });
      }
      fetchOrders();
    } catch (err) {
      const errRes = err.response?.data;
      if (showToast) {
        showToast({
          type: errRes?.errorCode === 'CONFLICT' ? 'conflict' : 'error',
          errorCode: errRes?.errorCode,
          message: errRes?.message || 'Không thể hủy đơn mua hàng.',
        });
      }
    } finally {
      setSubmitting(false);
      setSelectedPO(null);
    }
  };

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

  const subtotal = calculateSubtotal();
  const tax = Math.round(subtotal * 0.08 * 100) / 100;
  const total = subtotal + tax;

  return (
    <div className="space-y-4">
      {/* Search & Action Bar */}
      <div className="bg-white rounded-2xl border border-[#E2EDF5] p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full sm:w-auto flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm theo mã PO, nhà cung cấp..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#0F5FAF] focus:ring-1 focus:ring-[#0F5FAF]"
            />
          </div>
          <button
            type="submit"
            className="px-3.5 py-2 bg-[#F4FAFE] text-[#0F5FAF] rounded-xl text-xs font-semibold hover:bg-[#EAF5FC] border border-[#DCEAF4] transition-colors"
          >
            Tìm
          </button>
        </form>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs py-2 px-3 rounded-xl border border-slate-200 bg-white text-[#172033] focus:outline-none focus:border-[#0F5FAF]"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="cho_duyet">Chờ duyệt</option>
            <option value="da_gui_ncc">Đã gửi NCC</option>
            <option value="da_xac_nhan">NCC xác nhận</option>
            <option value="dang_giao">Đang giao</option>
            <option value="da_nhap_kho">Đã nhập kho</option>
            <option value="huy">Đã hủy</option>
          </select>

          <button
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#0F5FAF] text-white rounded-xl text-xs font-semibold hover:bg-[#0A2540] transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo đơn mua hàng</span>
          </button>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl border border-[#E2EDF5] shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <RefreshCw className="w-6 h-6 text-[#0F5FAF] animate-spin mx-auto mb-2" />
            <p className="text-xs text-[#5F6F82]">Đang tải danh sách đơn mua hàng...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#5F6F82]">
            <ShoppingCart className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            Chưa có dữ liệu
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-[#F4FAFE] text-[#5F6F82]">
                  <th className="py-3 px-3.5 font-semibold">Mã PO</th>
                  <th className="py-3 px-3.5 font-semibold">Nhà cung cấp</th>
                  <th className="py-3 px-3.5 font-semibold">Ngày đặt</th>
                  <th className="py-3 px-3.5 font-semibold">Hạn giao YC</th>
                  <th className="py-3 px-3.5 font-semibold">Tiến độ nhận</th>
                  <th className="py-3 px-3.5 font-semibold">Tổng thanh toán</th>
                  <th className="py-3 px-3.5 font-semibold">Trạng thái</th>
                  <th className="py-3 px-3.5 font-semibold text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map((po) => {
                  const tongDat = parseFloat(po.tong_so_luong_dat) || 0;
                  const tongDaNhap = parseFloat(po.tong_so_luong_da_nhap) || 0;
                  const percentReceived = tongDat > 0 ? Math.min(100, Math.round((tongDaNhap / tongDat) * 100)) : 0;

                  return (
                    <tr key={po.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-3.5">
                        <Link
                          to={`/purchasing/purchase-orders/${po.id}`}
                          className="font-bold text-[#0F5FAF] hover:underline"
                        >
                          {po.ma_don_mua}
                        </Link>
                      </td>
                      <td className="py-3 px-3.5">
                        <div className="font-bold text-[#172033]">{po.ten_nha_cung_cap}</div>
                        <div className="text-[11px] text-slate-400">{po.ma_nha_cung_cap}</div>
                      </td>
                      <td className="py-3 px-3.5 text-slate-600">
                        {formatDate(po.ngay_dat_hang)}
                      </td>
                      <td className="py-3 px-3.5 text-slate-600">
                        {formatDate(po.ngay_giao_hang_yc)}
                      </td>
                      <td className="py-3 px-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full"
                              style={{ width: `${percentReceived}%` }}
                            />
                          </div>
                          <span className="text-[11px] font-semibold text-slate-600">
                            {percentReceived}%
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {tongDaNhap} / {tongDat}
                        </div>
                      </td>
                      <td className="py-3 px-3.5 font-bold text-[#172033]">
                        {formatCurrency(po.tong_thanh_toan)}
                      </td>
                      <td className="py-3 px-3.5">
                        {getStatusBadge(po.trang_thai)}
                      </td>
                      <td className="py-3 px-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            to={`/purchasing/purchase-orders/${po.id}`}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-[#0F5FAF] hover:bg-[#EAF5FC] transition-colors"
                            title="Xem chi tiết"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>

                          {po.trang_thai === 'cho_duyet' && (
                            <button
                              onClick={() => {
                                setSelectedPO(po);
                                setIsApproveModalOpen(true);
                              }}
                              className="px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold hover:bg-emerald-100 transition-colors text-[11px]"
                              title="Phê duyệt đơn"
                            >
                              Duyệt
                            </button>
                          )}

                          {po.trang_thai !== 'da_nhap_kho' && po.trang_thai !== 'huy' && (
                            <button
                              onClick={() => {
                                setSelectedPO(po);
                                setCancelReason('');
                                setIsCancelModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition-colors"
                              title="Hủy đơn mua"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Tạo mới đơn mua hàng (PO) */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-[#E2EDF5] shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#172033]">
                  Lập Đơn Mua Hàng Mới (Purchase Order)
                </h3>
                <p className="text-xs text-[#5F6F82]">Khởi tạo đơn đặt mua nguyên phụ liệu từ Nhà cung cấp</p>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePO} className="p-5 space-y-4">
              {formErrors.length > 0 && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-rose-600" />
                    <span>Lỗi kiểm tra dữ liệu:</span>
                  </div>
                  <ul className="list-disc list-inside pl-1 space-y-0.5">
                    {formErrors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Top metadata */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nhà cung cấp *</label>
                  <select
                    required
                    value={formData.ma_nha_cung_cap}
                    onChange={(e) => setFormData({ ...formData, ma_nha_cung_cap: e.target.value })}
                    className="w-full p-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-[#0F5FAF]"
                  >
                    <option value="">-- Chọn Nhà cung cấp --</option>
                    {suppliersList.map((sup) => (
                      <option key={sup.id} value={sup.id}>
                        {sup.ten_nha_cung_cap} ({sup.ma_nha_cung_cap})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Ngày giao hàng yêu cầu *</label>
                  <input
                    type="date"
                    required
                    value={formData.ngay_giao_hang_yc}
                    onChange={(e) => setFormData({ ...formData, ngay_giao_hang_yc: e.target.value })}
                    className="w-full p-2 rounded-xl border border-slate-200 focus:outline-none focus:border-[#0F5FAF]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Điều kiện thanh toán</label>
                  <input
                    type="text"
                    value={formData.dieu_kien_thanh_toan}
                    onChange={(e) => setFormData({ ...formData, dieu_kien_thanh_toan: e.target.value })}
                    className="w-full p-2 rounded-xl border border-slate-200 focus:outline-none focus:border-[#0F5FAF]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Ghi chú đơn hàng</label>
                  <input
                    type="text"
                    placeholder="Ghi chú đơn hàng nếu có..."
                    value={formData.ghi_chu}
                    onChange={(e) => setFormData({ ...formData, ghi_chu: e.target.value })}
                    className="w-full p-2 rounded-xl border border-slate-200 focus:outline-none focus:border-[#0F5FAF]"
                  />
                </div>
              </div>

              {/* Items List */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Danh sách vật tư đặt mua ({formData.chiTiet.length} dòng)
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#0F5FAF] hover:underline"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Thêm dòng vật tư</span>
                  </button>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                      <tr>
                        <th className="p-2.5">Vật tư / Nguyên phụ liệu *</th>
                        <th className="p-2.5 w-28">Số lượng *</th>
                        <th className="p-2.5 w-32">Đơn giá (VNĐ) *</th>
                        <th className="p-2.5 w-32 text-right">Thành tiền</th>
                        <th className="p-2.5 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {formData.chiTiet.map((item, idx) => {
                        const lineTotal = (parseFloat(item.so_luong_dat) || 0) * (parseFloat(item.don_gia) || 0);
                        return (
                          <tr key={idx}>
                            <td className="p-2">
                              <select
                                required
                                value={item.ma_vat_tu}
                                onChange={(e) => handleItemChange(idx, 'ma_vat_tu', e.target.value)}
                                className="w-full p-1.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-[#0F5FAF]"
                              >
                                <option value="">-- Chọn vật tư --</option>
                                {materialsList.map((vt) => (
                                  <option key={vt.id} value={vt.id}>
                                    {vt.ten_vat_tu} ({vt.ma_vat_tu})
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="p-2">
                              <input
                                type="number"
                                required
                                min="0.001"
                                step="any"
                                value={item.so_luong_dat}
                                onChange={(e) => handleItemChange(idx, 'so_luong_dat', e.target.value)}
                                className="w-full p-1.5 rounded-lg border border-slate-200 text-right focus:outline-none focus:border-[#0F5FAF]"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="number"
                                required
                                min="0"
                                step="100"
                                value={item.don_gia}
                                onChange={(e) => handleItemChange(idx, 'don_gia', e.target.value)}
                                className="w-full p-1.5 rounded-lg border border-slate-200 text-right focus:outline-none focus:border-[#0F5FAF]"
                              />
                            </td>
                            <td className="p-2 text-right font-bold text-slate-800">
                              {formatCurrency(lineTotal)}
                            </td>
                            <td className="p-2 text-center">
                              {formData.chiTiet.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveItemRow(idx)}
                                  className="text-slate-400 hover:text-rose-600 p-1"
                                  title="Xóa dòng"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Totals Breakdown */}
                <div className="mt-3 bg-slate-50 p-3 rounded-xl flex flex-col items-end gap-1 text-xs">
                  <div className="flex justify-between w-64 text-slate-600">
                    <span>Tổng tiền hàng:</span>
                    <span className="font-semibold">{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between w-64 text-slate-600">
                    <span>Thuế GTGT (VAT 8%):</span>
                    <span className="font-semibold">{formatCurrency(tax)}</span>
                  </div>
                  <div className="flex justify-between w-64 text-sm font-bold text-[#0F5FAF] pt-1 border-t border-slate-200">
                    <span>Tổng thanh toán:</span>
                    <span>{formatCurrency(total)}</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-[#0F5FAF] text-white text-xs font-semibold hover:bg-[#0A2540] transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Đang tạo đơn...' : 'Tạo đơn mua hàng'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Xác nhận Phê duyệt PO */}
      {isApproveModalOpen && selectedPO && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-[#E2EDF5] shadow-2xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-center gap-3 text-emerald-600">
              <div className="p-2 rounded-xl bg-emerald-50">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-[#172033]">
                Xác nhận phê duyệt đơn mua hàng
              </h3>
            </div>

            <p className="text-xs text-[#5F6F82] leading-relaxed">
              Bạn có chắc chắn muốn phê duyệt đơn mua hàng{' '}
              <strong className="text-[#0F5FAF]">{selectedPO.ma_don_mua}</strong> với tổng giá trị{' '}
              <strong>{formatCurrency(selectedPO.tong_thanh_toan)}</strong>?
            </p>
            <p className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200">
              Sau khi phê duyệt, đơn hàng sẽ chuyển trạng thái <strong>Đã gửi NCC</strong> và sẵn sàng tiếp nhận nhập kho.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsApproveModalOpen(false);
                  setSelectedPO(null);
                }}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Đóng
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleApprovePO}
                className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50"
              >
                {submitting ? 'Đang duyệt...' : 'Phê duyệt ngay'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Hủy đơn PO */}
      {isCancelModalOpen && selectedPO && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-[#E2EDF5] shadow-2xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2 rounded-xl bg-rose-50">
                <XCircle className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-[#172033]">
                Hủy đơn mua hàng
              </h3>
            </div>

            <p className="text-xs text-[#5F6F82] leading-relaxed">
              Bạn có chắc chắn muốn hủy đơn mua hàng{' '}
              <strong className="text-rose-600">{selectedPO.ma_don_mua}</strong>? Thao tác này không thể hoàn tác.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Lý do hủy đơn</label>
              <textarea
                rows="3"
                placeholder="Nhập lý do hủy (NCC không cung cấp kịp, đổi kế hoạch...)"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full p-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsCancelModalOpen(false);
                  setSelectedPO(null);
                }}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Bỏ qua
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleCancelPO}
                className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 transition-colors disabled:opacity-50"
              >
                {submitting ? 'Đang hủy...' : 'Xác nhận hủy đơn'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
