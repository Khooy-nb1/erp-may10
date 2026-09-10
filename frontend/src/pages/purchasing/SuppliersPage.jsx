import React, { useState, useEffect } from 'react';
import {
  Building2,
  Search,
  Plus,
  Edit2,
  Eye,
  Star,
  Phone,
  Mail,
  MapPin,
  X,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import {
  getSuppliers,
  getSupplierDetail,
  createSupplier,
  updateSupplier,
} from '../../services/purchasingService';

export default function SuppliersPage({ showToast }) {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [supplierDetailData, setSupplierDetailData] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState([]);

  // Form state
  const [formData, setFormData] = useState({
    ma_nha_cung_cap: '',
    ten_nha_cung_cap: '',
    ma_so_thue: '',
    dia_chi: '',
    quoc_gia: 'Viet Nam',
    nguoi_lien_he: '',
    so_dien_thoai: '',
    email: '',
    loai_hang_cung_cap: '',
    han_muc_tin_dung: 0,
    so_ngay_gia_han: 30,
    diem_danh_gia: 0,
    trang_thai: 'hoat_dong',
  });

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const res = await getSuppliers({
        search: searchTerm || undefined,
        trang_thai: statusFilter || undefined,
      });
      setSuppliers(res.data || []);
    } catch (err) {
      console.error('Lỗi nạp danh sách nhà cung cấp:', err);
      if (showToast) {
        showToast({
          type: 'error',
          message: 'Không thể tải danh sách nhà cung cấp.',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, [statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchSuppliers();
  };

  const handleOpenCreateModal = () => {
    setFormData({
      ma_nha_cung_cap: '',
      ten_nha_cung_cap: '',
      ma_so_thue: '',
      dia_chi: '',
      quoc_gia: 'Viet Nam',
      nguoi_lien_he: '',
      so_dien_thoai: '',
      email: '',
      loai_hang_cung_cap: '',
      han_muc_tin_dung: 100000000,
      so_ngay_gia_han: 30,
      diem_danh_gia: 8.5,
      trang_thai: 'hoat_dong',
    });
    setFormErrors([]);
    setIsCreateModalOpen(true);
  };

  const handleOpenEditModal = (supplier) => {
    setSelectedSupplier(supplier);
    setFormData({
      ten_nha_cung_cap: supplier.ten_nha_cung_cap || '',
      ma_so_thue: supplier.ma_so_thue || '',
      dia_chi: supplier.dia_chi || '',
      quoc_gia: supplier.quoc_gia || 'Viet Nam',
      nguoi_lien_he: supplier.nguoi_lien_he || '',
      so_dien_thoai: supplier.so_dien_thoai || '',
      email: supplier.email || '',
      loai_hang_cung_cap: supplier.loai_hang_cung_cap || '',
      han_muc_tin_dung: supplier.han_muc_tin_dung || 0,
      so_ngay_gia_han: supplier.so_ngay_gia_han || 30,
      diem_danh_gia: supplier.diem_danh_gia || 0,
      trang_thai: supplier.trang_thai || 'hoat_dong',
    });
    setFormErrors([]);
    setIsEditModalOpen(true);
  };

  const handleOpenDetailModal = async (supplier) => {
    setSelectedSupplier(supplier);
    setIsDetailModalOpen(true);
    try {
      const detail = await getSupplierDetail(supplier.id);
      setSupplierDetailData(detail);
    } catch (err) {
      console.error('Lỗi lấy chi tiết nhà cung cấp:', err);
    }
  };

  const handleCreateSupplier = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormErrors([]);
    try {
      await createSupplier(formData);
      setIsCreateModalOpen(false);
      if (showToast) {
        showToast({
          type: 'success',
          message: `Đã tạo mới nhà cung cấp "${formData.ten_nha_cung_cap}" thành công.`,
        });
      }
      fetchSuppliers();
    } catch (err) {
      const errRes = err.response?.data;
      if (errRes?.errors) {
        setFormErrors(errRes.errors);
      } else {
        setFormErrors([errRes?.message || 'Lỗi tạo nhà cung cấp.']);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateSupplier = async (e) => {
    e.preventDefault();
    if (!selectedSupplier) return;
    setSubmitting(true);
    setFormErrors([]);
    try {
      await updateSupplier(selectedSupplier.id, formData);
      setIsEditModalOpen(false);
      if (showToast) {
        showToast({
          type: 'success',
          message: `Đã cập nhật thông tin nhà cung cấp thành công.`,
        });
      }
      fetchSuppliers();
    } catch (err) {
      const errRes = err.response?.data;
      if (errRes?.errors) {
        setFormErrors(errRes.errors);
      } else {
        setFormErrors([errRes?.message || 'Lỗi cập nhật nhà cung cấp.']);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (num) => {
    if (!num && num !== 0) return '0 ₫';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
  };

  return (
    <div className="space-y-4">
      {/* Search & Action Bar */}
      <div className="bg-white rounded-2xl border border-[#E2EDF5] p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full sm:w-auto flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm theo tên, mã NCC, email, SĐT..."
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
            <option value="hoat_dong">Đang hoạt động</option>
            <option value="tam_ngung">Tạm ngưng</option>
            <option value="ngung_giao_dich">Ngừng giao dịch</option>
          </select>

          <button
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#0F5FAF] text-white rounded-xl text-xs font-semibold hover:bg-[#0A2540] transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm nhà cung cấp</span>
          </button>
        </div>
      </div>

      {/* Table of Suppliers */}
      <div className="bg-white rounded-2xl border border-[#E2EDF5] shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <RefreshCw className="w-6 h-6 text-[#0F5FAF] animate-spin mx-auto mb-2" />
            <p className="text-xs text-[#5F6F82]">Đang tải dữ liệu nhà cung cấp...</p>
          </div>
        ) : suppliers.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#5F6F82]">
            <Building2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            Chưa có dữ liệu
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-[#F4FAFE] text-[#5F6F82]">
                  <th className="py-3 px-3.5 font-semibold">Mã NCC</th>
                  <th className="py-3 px-3.5 font-semibold">Tên công ty</th>
                  <th className="py-3 px-3.5 font-semibold">Liên hệ</th>
                  <th className="py-3 px-3.5 font-semibold">Mặt hàng</th>
                  <th className="py-3 px-3.5 font-semibold">Hạn mức tín dụng</th>
                  <th className="py-3 px-3.5 font-semibold">Đánh giá</th>
                  <th className="py-3 px-3.5 font-semibold">Trạng thái</th>
                  <th className="py-3 px-3.5 font-semibold text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {suppliers.map((ncc) => (
                  <tr key={ncc.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-3.5 font-bold text-[#0F5FAF]">
                      {ncc.ma_nha_cung_cap}
                    </td>
                    <td className="py-3 px-3.5">
                      <div className="font-bold text-[#172033]">{ncc.ten_nha_cung_cap}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" />
                        <span className="truncate max-w-xs">{ncc.dia_chi}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3.5 text-slate-700">
                      <div className="font-medium text-[#172033]">{ncc.nguoi_lien_he}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400" />
                          {ncc.so_dien_thoai}
                        </span>
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3 text-slate-400" />
                          {ncc.email}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3.5 text-slate-600 max-w-[150px] truncate">
                      {ncc.loai_hang_cung_cap || '—'}
                    </td>
                    <td className="py-3 px-3.5 font-medium text-[#172033]">
                      <div>{formatCurrency(ncc.han_muc_tin_dung)}</div>
                      <div className="text-[11px] text-slate-400">{ncc.so_ngay_gia_han} ngày nợ</div>
                    </td>
                    <td className="py-3 px-3.5">
                      <div className="flex items-center gap-1 text-amber-600 font-bold">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span>{parseFloat(ncc.diem_danh_gia || 0).toFixed(1)}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3.5">
                      {ncc.trang_thai === 'hoat_dong' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Hoạt động
                        </span>
                      ) : ncc.trang_thai === 'tam_ngung' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                          Tạm ngưng
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200">
                          Ngừng GD
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenDetailModal(ncc)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-[#0F5FAF] hover:bg-[#EAF5FC] transition-colors"
                          title="Xem chi tiết"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(ncc)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-[#0F5FAF] hover:bg-[#EAF5FC] transition-colors"
                          title="Chỉnh sửa"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Tạo mới / Chỉnh sửa Nhà cung cấp */}
      {(isCreateModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-[#E2EDF5] shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#172033]">
                {isCreateModalOpen ? 'Thêm mới Nhà cung cấp' : 'Chỉnh sửa thông tin Nhà cung cấp'}
              </h3>
              <button
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setIsEditModalOpen(false);
                }}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={isCreateModalOpen ? handleCreateSupplier : handleUpdateSupplier} className="p-5 space-y-4">
              {formErrors.length > 0 && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-rose-600" />
                    <span>Vui lòng kiểm tra lại thông tin:</span>
                  </div>
                  <ul className="list-disc list-inside pl-1 space-y-0.5">
                    {formErrors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {isCreateModalOpen && (
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Mã NCC (tự sinh nếu trống)</label>
                    <input
                      type="text"
                      placeholder="NCC-2026-..."
                      value={formData.ma_nha_cung_cap}
                      onChange={(e) => setFormData({ ...formData, ma_nha_cung_cap: e.target.value })}
                      className="w-full p-2 rounded-xl border border-slate-200 focus:outline-none focus:border-[#0F5FAF]"
                    />
                  </div>
                )}

                <div className={isCreateModalOpen ? '' : 'sm:col-span-2'}>
                  <label className="block font-semibold text-slate-700 mb-1">Tên nhà cung cấp *</label>
                  <input
                    type="text"
                    required
                    placeholder="Công ty Cổ phần..."
                    value={formData.ten_nha_cung_cap}
                    onChange={(e) => setFormData({ ...formData, ten_nha_cung_cap: e.target.value })}
                    className="w-full p-2 rounded-xl border border-slate-200 focus:outline-none focus:border-[#0F5FAF]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Mã số thuế</label>
                  <input
                    type="text"
                    placeholder="0101234567"
                    value={formData.ma_so_thue}
                    onChange={(e) => setFormData({ ...formData, ma_so_thue: e.target.value })}
                    className="w-full p-2 rounded-xl border border-slate-200 focus:outline-none focus:border-[#0F5FAF]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Người đại diện liên hệ *</label>
                  <input
                    type="text"
                    required
                    placeholder="Nguyễn Văn A"
                    value={formData.nguoi_lien_he}
                    onChange={(e) => setFormData({ ...formData, nguoi_lien_he: e.target.value })}
                    className="w-full p-2 rounded-xl border border-slate-200 focus:outline-none focus:border-[#0F5FAF]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Số điện thoại *</label>
                  <input
                    type="text"
                    required
                    placeholder="0912345678"
                    value={formData.so_dien_thoai}
                    onChange={(e) => setFormData({ ...formData, so_dien_thoai: e.target.value })}
                    className="w-full p-2 rounded-xl border border-slate-200 focus:outline-none focus:border-[#0F5FAF]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email giao dịch *</label>
                  <input
                    type="email"
                    required
                    placeholder="contact@supplier.vn"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full p-2 rounded-xl border border-slate-200 focus:outline-none focus:border-[#0F5FAF]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Địa chỉ trụ sở *</label>
                  <input
                    type="text"
                    required
                    placeholder="Số 10, Đường ABC, TP. Hà Nội"
                    value={formData.dia_chi}
                    onChange={(e) => setFormData({ ...formData, dia_chi: e.target.value })}
                    className="w-full p-2 rounded-xl border border-slate-200 focus:outline-none focus:border-[#0F5FAF]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Mặt hàng cung cấp</label>
                  <input
                    type="text"
                    placeholder="Vải kate, chỉ may, cúc nhựa..."
                    value={formData.loai_hang_cung_cap}
                    onChange={(e) => setFormData({ ...formData, loai_hang_cung_cap: e.target.value })}
                    className="w-full p-2 rounded-xl border border-slate-200 focus:outline-none focus:border-[#0F5FAF]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Hạn mức tín dụng (VNĐ)</label>
                  <input
                    type="number"
                    min="0"
                    step="1000000"
                    value={formData.han_muc_tin_dung}
                    onChange={(e) => setFormData({ ...formData, han_muc_tin_dung: e.target.value })}
                    className="w-full p-2 rounded-xl border border-slate-200 focus:outline-none focus:border-[#0F5FAF]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Thời hạn công nợ (ngày)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.so_ngay_gia_han}
                    onChange={(e) => setFormData({ ...formData, so_ngay_gia_han: e.target.value })}
                    className="w-full p-2 rounded-xl border border-slate-200 focus:outline-none focus:border-[#0F5FAF]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Điểm đánh giá (0-10)</label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    step="0.1"
                    value={formData.diem_danh_gia}
                    onChange={(e) => setFormData({ ...formData, diem_danh_gia: e.target.value })}
                    className="w-full p-2 rounded-xl border border-slate-200 focus:outline-none focus:border-[#0F5FAF]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Trạng thái</label>
                  <select
                    value={formData.trang_thai}
                    onChange={(e) => setFormData({ ...formData, trang_thai: e.target.value })}
                    className="w-full p-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-[#0F5FAF]"
                  >
                    <option value="hoat_dong">Hoạt động</option>
                    <option value="tam_ngung">Tạm ngưng</option>
                    <option value="ngung_giao_dich">Ngừng giao dịch</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateModalOpen(false);
                    setIsEditModalOpen(false);
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-[#0F5FAF] text-white text-xs font-semibold hover:bg-[#0A2540] transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Đang lưu...' : isCreateModalOpen ? 'Tạo nhà cung cấp' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Xem chi tiết Nhà cung cấp */}
      {isDetailModalOpen && selectedSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-[#E2EDF5] shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#EAF5FC] text-[#0F5FAF]">
                  {selectedSupplier.ma_nha_cung_cap}
                </span>
                <h3 className="text-base font-bold text-[#172033] mt-1">
                  {selectedSupplier.ten_nha_cung_cap}
                </h3>
              </div>
              <button
                onClick={() => {
                  setIsDetailModalOpen(false);
                  setSupplierDetailData(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-5 text-xs">
              {/* General info */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl">
                <div>
                  <span className="text-slate-500">Mã số thuế:</span>{' '}
                  <span className="font-semibold text-slate-800">{selectedSupplier.ma_so_thue || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-500">Điểm đánh giá:</span>{' '}
                  <span className="font-bold text-amber-600">{selectedSupplier.diem_danh_gia || 0} / 10</span>
                </div>
                <div>
                  <span className="text-slate-500">Đại diện:</span>{' '}
                  <span className="font-semibold text-slate-800">{selectedSupplier.nguoi_lien_he}</span>
                </div>
                <div>
                  <span className="text-slate-500">Điện thoại:</span>{' '}
                  <span className="font-semibold text-slate-800">{selectedSupplier.so_dien_thoai}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-500">Email:</span>{' '}
                  <span className="font-semibold text-slate-800">{selectedSupplier.email}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-500">Địa chỉ:</span>{' '}
                  <span className="font-semibold text-slate-800">{selectedSupplier.dia_chi}</span>
                </div>
                <div>
                  <span className="text-slate-500">Hạn mức công nợ:</span>{' '}
                  <span className="font-bold text-[#0F5FAF]">{formatCurrency(selectedSupplier.han_muc_tin_dung)}</span>
                </div>
                <div>
                  <span className="text-slate-500">Thời hạn gia hạn:</span>{' '}
                  <span className="font-semibold text-slate-800">{selectedSupplier.so_ngay_gia_han} ngày</span>
                </div>
              </div>

              {/* Lịch sử đơn mua hàng */}
              <div>
                <h4 className="font-bold text-[#172033] mb-2">Đơn mua hàng gần nhất từ NCC</h4>
                {!supplierDetailData?.donMuaHang || supplierDetailData.donMuaHang.length === 0 ? (
                  <p className="text-slate-500 italic">Chưa có dữ liệu</p>
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                        <tr>
                          <th className="p-2">Mã PO</th>
                          <th className="p-2">Ngày đặt</th>
                          <th className="p-2">Tổng tiền</th>
                          <th className="p-2">Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {supplierDetailData.donMuaHang.map((po) => (
                          <tr key={po.id}>
                            <td className="p-2 font-bold text-[#0F5FAF]">{po.ma_don_mua}</td>
                            <td className="p-2 text-slate-600">
                              {new Date(po.ngay_dat_hang).toLocaleDateString('vi-VN')}
                            </td>
                            <td className="p-2 font-semibold text-slate-800">{formatCurrency(po.tong_thanh_toan)}</td>
                            <td className="p-2">{po.trang_thai}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
